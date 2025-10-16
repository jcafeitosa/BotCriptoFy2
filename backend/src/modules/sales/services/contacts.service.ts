/**
 * Contacts Service
 * Contact management and CRUD operations
 */

import { db } from '@/db';
import { eq, and, desc, sql, or, like, isNull } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import {
  contacts,
  type Contact,
  type NewContact,
  activities,
  notes,
  deals,
} from '../schema';
import { leads } from '../../marketing/schema/leads.schema';
import type { ContactFilters, ContactTimeline } from '../types';

export class ContactsService {
  private static readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Create a new contact
   */
  static async createContact(
    data: Partial<NewContact>,
    userId: string,
    tenantId: string
  ): Promise<Contact> {
    logger.info('Creating contact', { email: data.email, tenantId });

    // Validate required fields
    if (!data.email) {
      throw new Error('Email is required');
    }

    if (!data.type) {
      throw new Error('Contact type is required');
    }

    // Check if contact already exists
    const existing = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.email, data.email)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Contact with this email already exists');
    }

    // Create contact
    const newContact: NewContact = {
      tenantId,
      ownerId: data.ownerId || userId,
      createdBy: userId,
      type: data.type,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      phone: data.phone,
      mobile: data.mobile,
      jobTitle: data.jobTitle,
      department: data.department,
      linkedinUrl: data.linkedinUrl,
      website: data.website,
      address: data.address,
      tags: data.tags || [],
      customFields: data.customFields || {},
      leadId: data.leadId,
    };

    const [contact] = await db.insert(contacts).values(newContact).returning();

    // Invalidate cache
    await this.invalidateContactsCache(tenantId);

    logger.info('Contact created', { contactId: contact.id, email: contact.email });
    return contact;
  }

  /**
   * Create contact from lead
   * Converts a qualified lead into a contact
   */
  static async createFromLead(
    leadId: string,
    userId: string,
    tenantId: string
  ): Promise<Contact> {
    logger.info('Converting lead to contact', { leadId, tenantId });

    // Get lead
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .limit(1);

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Check if contact already exists
    const existing = await db
      .select()
      .from(contacts)
      .where(
        or(
          and(eq(contacts.tenantId, tenantId), eq(contacts.email, lead.email)),
          and(eq(contacts.tenantId, tenantId), eq(contacts.leadId, leadId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Contact from this lead already exists');
    }

    // Create contact from lead data
    const contactData: Partial<NewContact> = {
      leadId: lead.id,
      type: lead.company ? 'company' : 'person',
      email: lead.email,
      firstName: lead.firstName || undefined,
      lastName: lead.lastName || undefined,
      companyName: lead.company || undefined,
      phone: lead.phone || undefined,
      jobTitle: lead.jobTitle || undefined,
      tags: (lead.tags as string[]) || [],
      customFields: (lead.customFields as Record<string, any>) || {},
    };

    const contact = await this.createContact(contactData, userId, tenantId);

    // Update lead status to converted
    await db
      .update(leads)
      .set({ status: 'converted', convertedAt: new Date() })
      .where(eq(leads.id, leadId));

    logger.info('Lead converted to contact', { leadId, contactId: contact.id });
    return contact;
  }

  /**
   * Get contact by ID
   */
  static async getContactById(id: string, tenantId: string): Promise<Contact | null> {
    const cacheKey = `contact:${id}`;

    // Check cache
    const cached = await cacheManager.get<Contact>(CacheNamespace.USERS, cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId), isNull(contacts.deletedAt)))
      .limit(1);

    if (contact) {
      // Cache result
      await cacheManager.set(CacheNamespace.USERS, cacheKey, contact, this.CACHE_TTL);
    }

    return contact || null;
  }

  /**
   * List contacts with filters and pagination
   */
  static async listContacts(
    filters: ContactFilters,
    tenantId: string
  ): Promise<{ contacts: Contact[]; total: number }> {
    const conditions = [eq(contacts.tenantId, tenantId), isNull(contacts.deletedAt)];

    // Apply filters
    if (filters.type) {
      conditions.push(eq(contacts.type, filters.type));
    }

    if (filters.ownerId) {
      conditions.push(eq(contacts.ownerId, filters.ownerId));
    }

    if (filters.tags && filters.tags.length > 0) {
      // Check if any tag matches (PostgreSQL JSONB contains)
      conditions.push(sql`${contacts.tags} ?| array[${sql.raw(filters.tags.map(t => `'${t}'`).join(','))}]`);
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      const searchCondition = or(
        like(contacts.firstName, searchPattern),
        like(contacts.lastName, searchPattern),
        like(contacts.companyName, searchPattern),
        like(contacts.email, searchPattern)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(...conditions));

    // Get contacts
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const contactsList = await db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      contacts: contactsList,
      total: Number(count),
    };
  }

  /**
   * Update contact
   */
  static async updateContact(
    id: string,
    data: Partial<NewContact>,
    tenantId: string
  ): Promise<Contact> {
    logger.info('Updating contact', { contactId: id, tenantId });

    // Verify contact exists and belongs to tenant
    const existing = await this.getContactById(id, tenantId);
    if (!existing) {
      throw new Error('Contact not found');
    }

    // Update contact
    const [updated] = await db
      .update(contacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateContactsCache(tenantId);
    await cacheManager.invalidate({ namespace: CacheNamespace.USERS, key: `contact:${id}` });

    logger.info('Contact updated', { contactId: id });
    return updated;
  }

  /**
   * Delete contact (soft delete)
   */
  static async deleteContact(id: string, tenantId: string): Promise<void> {
    logger.info('Deleting contact', { contactId: id, tenantId });

    // Check if contact has active deals
    const activeDeals = await db
      .select()
      .from(deals)
      .where(and(eq(deals.contactId, id), eq(deals.status, 'open')))
      .limit(1);

    if (activeDeals.length > 0) {
      throw new Error('Cannot delete contact with active deals');
    }

    // Soft delete
    await db
      .update(contacts)
      .set({ deletedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateContactsCache(tenantId);
    await cacheManager.invalidate({ namespace: CacheNamespace.USERS, key: `contact:${id}` });

    logger.info('Contact deleted', { contactId: id });
  }

  /**
   * Search contacts
   */
  static async searchContacts(query: string, tenantId: string): Promise<Contact[]> {
    const searchPattern = `%${query}%`;

    const searchCondition = or(
      like(contacts.firstName, searchPattern),
      like(contacts.lastName, searchPattern),
      like(contacts.companyName, searchPattern),
      like(contacts.email, searchPattern),
      like(contacts.phone, searchPattern)
    );

    const conditions = [
      eq(contacts.tenantId, tenantId),
      isNull(contacts.deletedAt),
    ];

    if (searchCondition) {
      conditions.push(searchCondition);
    }

    const results = await db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.createdAt))
      .limit(20);

    return results;
  }

  /**
   * Merge contacts (combine duplicates)
   */
  static async mergeContacts(
    sourceId: string,
    targetId: string,
    tenantId: string
  ): Promise<Contact> {
    logger.info('Merging contacts', { sourceId, targetId, tenantId });

    // Get both contacts
    const source = await this.getContactById(sourceId, tenantId);
    const target = await this.getContactById(targetId, tenantId);

    if (!source || !target) {
      throw new Error('One or both contacts not found');
    }

    // Start transaction
    await db.transaction(async (tx) => {
      // Move all deals from source to target
      await tx
        .update(deals)
        .set({ contactId: targetId })
        .where(eq(deals.contactId, sourceId));

      // Move all activities from source to target
      await tx
        .update(activities)
        .set({ contactId: targetId })
        .where(eq(activities.contactId, sourceId));

      // Move all notes from source to target
      await tx.update(notes).set({ contactId: targetId }).where(eq(notes.contactId, sourceId));

      // Merge tags
      const mergedTags = Array.from(
        new Set([...(target.tags || []), ...(source.tags || [])])
      );

      // Merge custom fields (target wins conflicts)
      const mergedCustomFields = {
        ...(source.customFields || {}),
        ...(target.customFields || {}),
      };

      // Update target with merged data
      await tx
        .update(contacts)
        .set({
          tags: mergedTags,
          customFields: mergedCustomFields,
          // Fill in any missing fields from source
          phone: target.phone || source.phone,
          mobile: target.mobile || source.mobile,
          jobTitle: target.jobTitle || source.jobTitle,
          department: target.department || source.department,
          linkedinUrl: target.linkedinUrl || source.linkedinUrl,
          website: target.website || source.website,
        })
        .where(eq(contacts.id, targetId));

      // Soft delete source
      await tx.update(contacts).set({ deletedAt: new Date() }).where(eq(contacts.id, sourceId));
    });

    // Invalidate cache
    await this.invalidateContactsCache(tenantId);

    logger.info('Contacts merged', { sourceId, targetId });

    const mergedContact = await this.getContactById(targetId, tenantId);
    if (!mergedContact) {
      throw new Error('Failed to retrieve merged contact');
    }

    return mergedContact;
  }

  /**
   * Get contact timeline (activities, notes, deals)
   */
  static async getContactTimeline(id: string, tenantId: string): Promise<ContactTimeline> {
    // Verify contact exists
    const contact = await this.getContactById(id, tenantId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    // Get all activities
    const contactActivities = await db
      .select()
      .from(activities)
      .where(and(eq(activities.contactId, id), eq(activities.tenantId, tenantId)))
      .orderBy(desc(activities.createdAt));

    // Get all notes
    const contactNotes = await db
      .select()
      .from(notes)
      .where(and(eq(notes.contactId, id), eq(notes.tenantId, tenantId)))
      .orderBy(desc(notes.createdAt));

    // Get all deals
    const contactDeals = await db
      .select()
      .from(deals)
      .where(and(eq(deals.contactId, id), eq(deals.tenantId, tenantId), isNull(deals.deletedAt)))
      .orderBy(desc(deals.createdAt));

    return {
      activities: contactActivities,
      notes: contactNotes,
      deals: contactDeals,
    };
  }

  /**
   * Invalidate contacts cache for tenant
   */
  private static async invalidateContactsCache(tenantId: string): Promise<void> {
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      pattern: `contacts:${tenantId}:*`,
    });
  }
}
