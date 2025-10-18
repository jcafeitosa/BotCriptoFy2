/**
 * Leads Service
 * Lead management and CRUD operations
 */

import { db } from '@/db';
import { eq, and, desc, sql, inArray, gte, lte, like, or, isNull } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { leads, type Lead, type NewLead } from '../schema/leads.schema';
import { leadActivities } from '../schema/lead-activities.schema';
import { EmailValidator } from '../utils/email-validator';
import { CSVParser } from '../utils/csv-parser';
import { ScoringService } from './scoring.service';
import type {
  CreateLeadData,
  UpdateLeadData,
  LeadFilters,
  PaginationOptions,
  PaginatedResponse,
  CSVImportResult,
} from '../types';

export class LeadsService {
  private static readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Create a new lead
   */
  static async createLead(data: CreateLeadData, tenantId: string): Promise<Lead> {
    logger.info('Creating lead', { email: data.email, tenantId });

    // Validate email
    const emailValidation = EmailValidator.validate(data.email);
    if (!emailValidation.valid) {
      const errorMsg = emailValidation.errors.join(', ');
      throw new Error('Invalid email: ' + errorMsg);
    }

    // Check if lead already exists
    const existing = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.email, emailValidation.email)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Lead with this email already exists');
    }

    // Create lead
    const newLead: NewLead = {
      tenantId,
      email: emailValidation.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      company: data.company,
      jobTitle: data.jobTitle,
      source: data.source,
      status: 'new',
      score: 0,
      tags: data.tags,
      customFields: data.customFields,
    };

    const [lead] = await db.insert(leads).values(newLead).returning();

    // Calculate initial score
    const scoringResult = ScoringService.calculateScore(lead, []);
    if (scoringResult.newScore > 0) {
      await this.updateLeadScore(lead.id, scoringResult.newScore);
      lead.score = scoringResult.newScore;
    }

    // Invalidate cache
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      pattern: 'leads:' + tenantId + ':*',
    });

    logger.info('Lead created', { leadId: lead.id, email: lead.email });
    return lead;
  }

  /**
   * Soft delete a lead (safety measure)
   */
  static async softDeleteLead(id: string, tenantId: string): Promise<void> {
    await db
      .update(leads)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)));

    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      pattern: 'lead:' + id,
    });
  }

  /**
   * Import leads from CSV
   */
  static async importLeads(csvContent: string, tenantId: string): Promise<CSVImportResult> {
    logger.info('Importing leads from CSV', { tenantId });

    // Parse CSV
    const parseResult = CSVParser.parse(csvContent, 'csv_import');

    if (!parseResult.success && parseResult.data.length === 0) {
      return {
        success: false,
        imported: 0,
        failed: parseResult.errors.length,
        errors: parseResult.errors.map((e) => ({
          row: e.row,
          email: '',
          error: e.error,
        })),
      };
    }

    // Import leads
    let imported = 0;
    const errors: Array<{ row: number; email: string; error: string }> = [];

    for (let i = 0; i < parseResult.data.length; i++) {
      const leadData = parseResult.data[i];
      try {
        await this.createLead(leadData, tenantId);
        imported++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          row: i + 2,
          email: leadData.email,
          error: errorMessage,
        });
      }
    }

    logger.info('CSV import completed', { imported, failed: errors.length });

    return {
      success: errors.length === 0,
      imported,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get lead by ID
   */
  static async getLeadById(id: string, tenantId: string): Promise<Lead | null> {
    const cacheKey = 'lead:' + id;

    // Check cache
    const cached = await cacheManager.get<Lead>(CacheNamespace.USERS, cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId), isNull(leads.deletedAt)))
      .limit(1);

    if (lead) {
      await cacheManager.set(CacheNamespace.USERS, cacheKey, lead, this.CACHE_TTL);
    }

    return lead || null;
  }

  /**
   * List leads with filters and pagination
   */
  static async listLeads(
    filters: LeadFilters,
    tenantId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<Lead>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(leads.tenantId, tenantId), isNull(leads.deletedAt)];

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(leads.status, filters.status));
    }

    if (filters.minScore !== undefined) {
      conditions.push(gte(leads.score, filters.minScore));
    }

    if (filters.maxScore !== undefined) {
      conditions.push(lte(leads.score, filters.maxScore));
    }

    if (filters.source && filters.source.length > 0) {
      conditions.push(inArray(leads.source, filters.source));
    }

    if (filters.dateFrom) {
      conditions.push(gte(leads.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(leads.createdAt, filters.dateTo));
    }

    if (filters.search) {
      const searchPattern = '%' + filters.search + '%';
      const searchCondition = or(
        like(leads.email, searchPattern),
        like(leads.firstName, searchPattern),
        like(leads.lastName, searchPattern),
        like(leads.company, searchPattern)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Query
    const [leadsData, countResult] = await Promise.all([
      db
        .select()
        .from(leads)
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(leads)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count || 0;

    return {
      data: leadsData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update lead
   */
  static async updateLead(id: string, data: UpdateLeadData, tenantId: string): Promise<Lead> {
    const [updated] = await db
      .update(leads)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('Lead not found');
    }

    // Invalidate cache
    await cacheManager.delete(CacheNamespace.USERS, 'lead:' + id);

    logger.info('Lead updated', { leadId: id });
    return updated;
  }

  /**
   * Delete lead (soft delete)
   */
  static async deleteLead(id: string, tenantId: string): Promise<void> {
    await db
      .update(leads)
      .set({ deletedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)));

    await cacheManager.delete(CacheNamespace.USERS, 'lead:' + id);

    logger.info('Lead deleted', { leadId: id });
  }

  /**
   * Update lead score
   */
  static async updateLeadScore(id: string, score: number): Promise<void> {
    await db
      .update(leads)
      .set({ score, updatedAt: new Date() })
      .where(eq(leads.id, id));

    await cacheManager.delete(CacheNamespace.USERS, 'lead:' + id);
  }

  /**
   * Assign tags to lead
   */
  static async assignTags(id: string, tags: string[], tenantId: string): Promise<Lead> {
    const lead = await this.getLeadById(id, tenantId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const existingTags = lead.tags || [];
    const uniqueTags = Array.from(new Set([...existingTags, ...tags]));

    return this.updateLead(id, { tags: uniqueTags }, tenantId);
  }

  /**
   * Convert lead
   */
  static async convertLead(id: string, userId: string, tenantId: string): Promise<Lead> {
    const lead = await this.updateLead(
      id,
      {
        status: 'converted',
      },
      tenantId
    );

    // Record activity
    await db.insert(leadActivities).values({
      leadId: id,
      tenantId,
      activityType: 'note_added',
      performedBy: userId,
      metadata: { note: 'Lead converted to customer' },
    });

    logger.info('Lead converted', { leadId: id, userId });
    return lead;
  }

  /**
   * Get lead activity timeline
   */
  static async getLeadActivity(id: string, tenantId: string) {
    const activities = await db
      .select()
      .from(leadActivities)
      .where(and(eq(leadActivities.leadId, id), eq(leadActivities.tenantId, tenantId)))
      .orderBy(desc(leadActivities.createdAt))
      .limit(100);

    return activities;
  }

  /**
   * Search leads by query
   */
  static async searchLeads(
    query: string,
    tenantId: string,
    limit: number = 20
  ): Promise<Lead[]> {
    const searchPattern = '%' + query + '%';

    const searchCondition = or(
      like(leads.email, searchPattern),
      like(leads.firstName, searchPattern),
      like(leads.lastName, searchPattern),
      like(leads.company, searchPattern)
    );

    const whereConditions = [
      eq(leads.tenantId, tenantId),
      isNull(leads.deletedAt),
    ];

    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    return db
      .select()
      .from(leads)
      .where(and(...whereConditions))
      .limit(limit);
  }
}
