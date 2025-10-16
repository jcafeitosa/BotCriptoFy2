/**
 * Tickets Service
 * Support ticket management and CRUD operations
 */

import { db } from '@/db';
import { eq, and, desc, asc, sql, or, like, isNull, gte, lte, inArray } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { tickets, ticketMessages, slaPolices } from '../schema';
import type {
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
  TicketFilters,
  CreateMessageInput,
  TicketMessage,
  TicketTimeline,
  TimelineEvent,
  TicketStatus,
} from '../types';
import { generateTicketNumber } from '../utils/ticket-numbering';
import { calculateSLADueDate, calculateFirstResponseTime, calculateResolutionTime } from '../utils/sla-calculator';
import { AutomationsService } from './automations.service';

export class TicketsService {
  private static readonly CACHE_TTL = 120; // 2 minutes

  /**
   * Create a new ticket
   */
  static async createTicket(
    data: CreateTicketInput,
    userId: string | null,
    tenantId: string
  ): Promise<Ticket> {
    logger.info('Creating ticket', { subject: data.subject, tenantId });

    // Generate unique ticket number
    const ticketNumber = await generateTicketNumber(tenantId);

    // Get SLA policy for priority
    let slaId: string | undefined;
    let dueDate: Date | undefined;

    const [slaPolicy] = await db
      .select()
      .from(slaPolices)
      .where(
        and(
          eq(slaPolices.tenantId, tenantId),
          eq(slaPolices.priority, data.priority),
          eq(slaPolices.isActive, true)
        )
      )
      .limit(1);

    if (slaPolicy) {
      slaId = slaPolicy.id;
      dueDate = calculateSLADueDate(new Date(), slaPolicy as any, false);
    }

    // Create ticket
    const [ticket] = await db
      .insert(tickets)
      .values({
        tenantId,
        ticketNumber,
        contactId: data.contactId,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        status: 'new',
        category: data.category,
        source: data.source,
        assignedTo: data.assignedTo,
        slaId,
        dueDate,
        tags: data.tags || [],
        customFields: data.customFields || {},
        createdBy: userId || undefined,
      })
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId);

    // Execute automations
    try {
      await AutomationsService.executeAutomation(ticket as any, 'on_create');
    } catch (error) {
      logger.error('Error executing automation on ticket creation', { error, ticketId: ticket.id });
    }

    logger.info('Ticket created', { ticketId: ticket.id, ticketNumber: ticket.ticketNumber });
    return ticket as Ticket;
  }

  /**
   * Get ticket by ID
   */
  static async getTicketById(id: string, tenantId: string): Promise<Ticket | null> {
    const cacheKey = `ticket:${id}`;

    // Try cache first
    const cached = await cacheManager.get<Ticket>(CacheNamespace.SUPPORT, cacheKey);
    if (cached) {
      return cached;
    }

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId), isNull(tickets.deletedAt)))
      .limit(1);

    if (ticket) {
      await cacheManager.set(CacheNamespace.SUPPORT, cacheKey, ticket as Ticket, this.CACHE_TTL);
    }

    return (ticket as Ticket) || null;
  }

  /**
   * Get ticket by number
   */
  static async getTicketByNumber(ticketNumber: string, tenantId: string): Promise<Ticket | null> {
    const cacheKey = `ticket:number:${ticketNumber}`;

    // Try cache first
    const cached = await cacheManager.get<Ticket>(CacheNamespace.SUPPORT, cacheKey);
    if (cached) {
      return cached;
    }

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(
        and(eq(tickets.ticketNumber, ticketNumber), eq(tickets.tenantId, tenantId), isNull(tickets.deletedAt))
      )
      .limit(1);

    if (ticket) {
      await cacheManager.set(CacheNamespace.SUPPORT, cacheKey, ticket as Ticket, this.CACHE_TTL);
    }

    return (ticket as Ticket) || null;
  }

  /**
   * List tickets with filters and pagination
   */
  static async listTickets(filters: TicketFilters, tenantId: string): Promise<{
    tickets: Ticket[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(tickets.tenantId, tenantId), isNull(tickets.deletedAt)];

    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(tickets.status, filters.status));
      } else {
        conditions.push(eq(tickets.status, filters.status));
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        conditions.push(inArray(tickets.priority, filters.priority));
      } else {
        conditions.push(eq(tickets.priority, filters.priority));
      }
    }

    if (filters.category) {
      if (Array.isArray(filters.category)) {
        conditions.push(inArray(tickets.category, filters.category));
      } else {
        conditions.push(eq(tickets.category, filters.category));
      }
    }

    if (filters.assignedTo) {
      conditions.push(eq(tickets.assignedTo, filters.assignedTo));
    }

    if (filters.contactId) {
      conditions.push(eq(tickets.contactId, filters.contactId));
    }

    if (filters.source) {
      conditions.push(eq(tickets.source, filters.source));
    }

    if (filters.dateFrom) {
      conditions.push(gte(tickets.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(tickets.createdAt, filters.dateTo));
    }

    if (filters.search) {
      const searchCondition = or(
        like(tickets.subject, `%${filters.search}%`),
        like(tickets.description, `%${filters.search}%`),
        like(tickets.ticketNumber, `%${filters.search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Get tickets
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderByColumn = tickets[sortBy];
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(orderFn(orderByColumn))
      .limit(limit)
      .offset(offset);

    return {
      tickets: results as Ticket[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update ticket
   */
  static async updateTicket(
    id: string,
    data: UpdateTicketInput,
    userId: string,
    tenantId: string
  ): Promise<Ticket> {
    logger.info('Updating ticket', { ticketId: id, tenantId });

    const existingTicket = await this.getTicketById(id, tenantId);
    if (!existingTicket) {
      throw new Error('Ticket not found');
    }

    const [updated] = await db
      .update(tickets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `ticket:${id}`);

    // Execute automations
    try {
      await AutomationsService.executeAutomation(updated as Ticket, 'on_update');
    } catch (error) {
      logger.error('Error executing automation on ticket update', { error, ticketId: id });
    }

    logger.info('Ticket updated', { ticketId: id });
    return updated as Ticket;
  }

  /**
   * Assign ticket to user
   */
  static async assignTicket(id: string, assignedTo: string, userId: string, tenantId: string): Promise<Ticket> {
    logger.info('Assigning ticket', { ticketId: id, assignedTo, tenantId });

    const [updated] = await db
      .update(tickets)
      .set({
        assignedTo,
        status: 'open',
        updatedAt: new Date(),
      })
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('Ticket not found');
    }

    // Add timeline event
    await this.addMessage(
      id,
      {
        message: `Ticket assigned to user ${assignedTo}`,
        isInternal: true,
        isFromCustomer: false,
      },
      userId
    );

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `ticket:${id}`);

    logger.info('Ticket assigned', { ticketId: id, assignedTo });
    return updated as Ticket;
  }

  /**
   * Change ticket status
   */
  static async changeStatus(
    id: string,
    newStatus: TicketStatus,
    userId: string,
    tenantId: string
  ): Promise<Ticket> {
    logger.info('Changing ticket status', { ticketId: id, newStatus, tenantId });

    const existingTicket = await this.getTicketById(id, tenantId);
    if (!existingTicket) {
      throw new Error('Ticket not found');
    }

    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Set resolved/closed dates
    if (newStatus === 'resolved' && !existingTicket.resolvedAt) {
      updateData.resolvedAt = new Date();
      updateData.resolutionTime = calculateResolutionTime(existingTicket.createdAt, updateData.resolvedAt);
    }

    if (newStatus === 'closed' && !existingTicket.closedAt) {
      updateData.closedAt = new Date();
    }

    const [updated] = await db.update(tickets).set(updateData).where(eq(tickets.id, id)).returning();

    // Add timeline event
    await this.addMessage(
      id,
      {
        message: `Status changed from ${existingTicket.status} to ${newStatus}`,
        isInternal: true,
        isFromCustomer: false,
      },
      userId
    );

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `ticket:${id}`);

    // Execute automations
    try {
      await AutomationsService.executeAutomation(updated as Ticket, 'on_status_change');
    } catch (error) {
      logger.error('Error executing automation on status change', { error, ticketId: id });
    }

    logger.info('Ticket status changed', { ticketId: id, newStatus });
    return updated as Ticket;
  }

  /**
   * Resolve ticket
   */
  static async resolveTicket(
    id: string,
    resolutionNote: string,
    userId: string,
    tenantId: string
  ): Promise<Ticket> {
    logger.info('Resolving ticket', { ticketId: id, tenantId });

    // Add resolution note
    await this.addMessage(
      id,
      {
        message: `Ticket resolved: ${resolutionNote}`,
        isInternal: false,
        isFromCustomer: false,
      },
      userId
    );

    // Change status to resolved
    const ticket = await this.changeStatus(id, 'resolved', userId, tenantId);

    logger.info('Ticket resolved', { ticketId: id });
    return ticket;
  }

  /**
   * Close ticket
   */
  static async closeTicket(id: string, userId: string, tenantId: string): Promise<Ticket> {
    return await this.changeStatus(id, 'closed', userId, tenantId);
  }

  /**
   * Reopen ticket
   */
  static async reopenTicket(id: string, userId: string, tenantId: string): Promise<Ticket> {
    logger.info('Reopening ticket', { ticketId: id, tenantId });

    const [updated] = await db
      .update(tickets)
      .set({
        status: 'open',
        resolvedAt: null,
        closedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('Ticket not found');
    }

    // Add timeline event
    await this.addMessage(
      id,
      {
        message: 'Ticket reopened',
        isInternal: true,
        isFromCustomer: false,
      },
      userId
    );

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `ticket:${id}`);

    logger.info('Ticket reopened', { ticketId: id });
    return updated as Ticket;
  }

  /**
   * Delete ticket (soft delete)
   */
  static async deleteTicket(id: string, userId: string, tenantId: string): Promise<void> {
    logger.info('Deleting ticket', { ticketId: id, tenantId });

    await db
      .update(tickets)
      .set({ deletedAt: new Date() })
      .where(and(eq(tickets.id, id), eq(tickets.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `ticket:${id}`);

    logger.info('Ticket deleted', { ticketId: id });
  }

  /**
   * Add message to ticket
   */
  static async addMessage(
    ticketId: string,
    data: CreateMessageInput,
    userId: string | null
  ): Promise<TicketMessage> {
    logger.info('Adding message to ticket', { ticketId });

    // Get ticket to validate and update first response time
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Update first response time if this is the first response and not from customer
    if (!ticket.firstResponseTime && !data.isFromCustomer && userId) {
      const firstResponseTime = calculateFirstResponseTime(ticket.createdAt, new Date());
      await db.update(tickets).set({ firstResponseTime }).where(eq(tickets.id, ticketId));
    }

    const [message] = await db
      .insert(ticketMessages)
      .values({
        ticketId,
        message: data.message,
        isInternal: data.isInternal || false,
        isFromCustomer: data.isFromCustomer || false,
        attachments: data.attachments || [],
        createdBy: userId || undefined,
      })
      .returning();

    // Invalidate cache
    await cacheManager.delete(CacheNamespace.SUPPORT, `ticket:messages:${ticketId}`);

    logger.info('Message added to ticket', { ticketId, messageId: message.id });
    return message as TicketMessage;
  }

  /**
   * Get ticket messages
   */
  static async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    const cacheKey = `ticket:messages:${ticketId}`;

    // Try cache first
    const cached = await cacheManager.get<TicketMessage[]>(CacheNamespace.SUPPORT, cacheKey);
    if (cached) {
      return cached;
    }

    const messages = await db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.createdAt));

    await cacheManager.set(CacheNamespace.SUPPORT, cacheKey, messages as TicketMessage[], this.CACHE_TTL);

    return messages as TicketMessage[];
  }

  /**
   * Rate satisfaction
   */
  static async rateSatisfaction(
    ticketId: string,
    rating: number,
    comment: string | undefined,
    tenantId: string
  ): Promise<Ticket> {
    logger.info('Rating ticket satisfaction', { ticketId, rating });

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const [updated] = await db
      .update(tickets)
      .set({
        satisfactionRating: rating,
        satisfactionComment: comment,
        updatedAt: new Date(),
      })
      .where(and(eq(tickets.id, ticketId), eq(tickets.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('Ticket not found');
    }

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `ticket:${ticketId}`);

    logger.info('Ticket satisfaction rated', { ticketId, rating });
    return updated as Ticket;
  }

  /**
   * Get ticket timeline
   */
  static async getTicketTimeline(ticketId: string): Promise<TicketTimeline> {
    const messages = await this.getTicketMessages(ticketId);

    const events: TimelineEvent[] = messages.map((msg) => ({
      id: msg.id,
      type: msg.isInternal ? 'note' : 'message',
      description: msg.message,
      userId: msg.createdBy,
      timestamp: msg.createdAt,
    }));

    return {
      ticketId,
      events,
    };
  }

  /**
   * Invalidate tickets cache
   */
  private static async invalidateCache(_tenantId: string): Promise<void> {
    await cacheManager.invalidate({ namespace: CacheNamespace.SUPPORT, pattern: `tickets:*` });
  }
}
