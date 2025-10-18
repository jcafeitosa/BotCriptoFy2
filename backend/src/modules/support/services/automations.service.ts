/**
 * Automations Service
 * Automated workflows and ticket triggers
 */

import { db } from '@/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { ticketAutomations, tickets } from '../schema';
import type {
  TicketAutomation,
  CreateAutomationInput,
  UpdateAutomationInput,
  Ticket,
  AutomationTrigger,
} from '../types';

export class AutomationsService {
  private static readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Create automation
   */
  static async createAutomation(data: CreateAutomationInput, tenantId: string): Promise<TicketAutomation> {
    logger.info('Creating automation', { name: data.name, tenantId });

    // Validate conditions and actions
    this.validateAutomation(data);

    const [automation] = await db
      .insert(ticketAutomations)
      .values({
        tenantId,
        name: data.name,
        description: data.description,
        trigger: data.trigger,
        conditions: data.conditions,
        actions: data.actions,
        isActive: true,
      })
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info('Automation created', { automationId: automation.id });
    return automation as TicketAutomation;
  }

  /**
   * Get all automations for tenant
   */
  static async getAutomations(tenantId: string): Promise<TicketAutomation[]> {
    const cacheKey = `automations:${tenantId}`;

    // Try cache first
    const cached = await cacheManager.get<TicketAutomation[]>(CacheNamespace.SUPPORT, cacheKey);
    if (cached) {
      return cached;
    }

    const automations = await db
      .select()
      .from(ticketAutomations)
      .where(eq(ticketAutomations.tenantId, tenantId))
      .orderBy(desc(ticketAutomations.createdAt));

    await cacheManager.set(CacheNamespace.SUPPORT, cacheKey, automations as TicketAutomation[], this.CACHE_TTL);

    return automations as TicketAutomation[];
  }

  /**
   * Get automation by ID
   */
  static async getAutomationById(id: string, tenantId: string): Promise<TicketAutomation | null> {
    const [automation] = await db
      .select()
      .from(ticketAutomations)
      .where(and(eq(ticketAutomations.id, id), eq(ticketAutomations.tenantId, tenantId)))
      .limit(1);

    return (automation as TicketAutomation) || null;
  }

  /**
   * Update automation
   */
  static async updateAutomation(
    id: string,
    data: UpdateAutomationInput,
    tenantId: string
  ): Promise<TicketAutomation> {
    logger.info('Updating automation', { automationId: id, tenantId });

    // Validate if conditions or actions are being updated
    if (data.conditions || data.actions) {
      this.validateAutomation(data as any);
    }

    const [updated] = await db
      .update(ticketAutomations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(ticketAutomations.id, id), eq(ticketAutomations.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('Automation not found');
    }

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info('Automation updated', { automationId: id });
    return updated as TicketAutomation;
  }

  /**
   * Delete automation
   */
  static async deleteAutomation(id: string, tenantId: string): Promise<void> {
    logger.info('Deleting automation', { automationId: id, tenantId });

    await db
      .delete(ticketAutomations)
      .where(and(eq(ticketAutomations.id, id), eq(ticketAutomations.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info('Automation deleted', { automationId: id });
  }

  /**
   * Execute automations for a ticket
   */
  static async executeAutomation(ticket: Ticket, trigger: AutomationTrigger): Promise<void> {
    logger.info('Executing automations', { ticketId: ticket.id, trigger });

    // Get all active automations for this trigger
    const automations = await db
      .select()
      .from(ticketAutomations)
      .where(
        and(
          eq(ticketAutomations.tenantId, ticket.tenantId),
          eq(ticketAutomations.trigger, trigger),
          eq(ticketAutomations.isActive, true)
        )
      );

    for (const automation of automations) {
      try {
        // Check if ticket matches conditions
        if (this.matchesConditions(ticket, automation.conditions as any)) {
          logger.info('Automation conditions matched', {
            automationId: automation.id,
            ticketId: ticket.id,
          });

          // Execute actions
          await this.executeActions(ticket, automation.actions as any);

          // Increment execution count
          await db
            .update(ticketAutomations)
            .set({
              executionCount: sql`${ticketAutomations.executionCount} + 1`,
            })
            .where(eq(ticketAutomations.id, automation.id));

          logger.info('Automation executed', {
            automationId: automation.id,
            ticketId: ticket.id,
          });
        }
      } catch (error) {
        logger.error('Error executing automation', {
          error,
          automationId: automation.id,
          ticketId: ticket.id,
        });
      }
    }
  }

  /**
   * Test automation (dry run)
   */
  static async testAutomation(id: string, sampleTicket: Ticket, tenantId: string): Promise<{
    matched: boolean;
    actions: string[];
  }> {
    const automation = await this.getAutomationById(id, tenantId);
    if (!automation) {
      throw new Error('Automation not found');
    }

    const matched = this.matchesConditions(sampleTicket, automation.conditions);
    const actions: string[] = [];

    if (matched) {
      const automationActions = automation.actions as any;

      if (automationActions.assignTo) {
        actions.push(`Assign to user: ${automationActions.assignTo}`);
      }

      if (automationActions.changeStatus) {
        actions.push(`Change status to: ${automationActions.changeStatus}`);
      }

      if (automationActions.changePriority) {
        actions.push(`Change priority to: ${automationActions.changePriority}`);
      }

      if (automationActions.addTag) {
        const tags = Array.isArray(automationActions.addTag)
          ? automationActions.addTag
          : [automationActions.addTag];
        actions.push(`Add tags: ${tags.join(', ')}`);
      }

      if (automationActions.sendNotification) {
        actions.push('Send notification');
      }

      if (automationActions.addNote) {
        actions.push(`Add note: ${automationActions.addNote}`);
      }
    }

    return { matched, actions };
  }

  /**
   * Check if ticket matches automation conditions
   */
  private static matchesConditions(ticket: Ticket, conditions: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      const ticketValue = (ticket as any)[key];

      // Array conditions (OR logic)
      if (Array.isArray(value)) {
        if (!value.includes(ticketValue)) {
          return false;
        }
      }
      // Direct match
      else if (ticketValue !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute automation actions
   */
  private static async executeActions(ticket: Ticket, actions: Record<string, any>): Promise<void> {
    const updates: any = {};

    // Assign ticket
    if (actions.assignTo) {
      updates.assignedTo = actions.assignTo;
    }

    // Change status
    if (actions.changeStatus) {
      updates.status = actions.changeStatus;
    }

    // Change priority
    if (actions.changePriority) {
      updates.priority = actions.changePriority;
    }

    // Add/remove tags
    if (actions.addTag || actions.removeTag) {
      const currentTags = ticket.tags || [];
      let newTags = [...currentTags];

      if (actions.addTag) {
        const tagsToAdd = Array.isArray(actions.addTag) ? actions.addTag : [actions.addTag];
        newTags = [...new Set([...newTags, ...tagsToAdd])];
      }

      if (actions.removeTag) {
        const tagsToRemove = Array.isArray(actions.removeTag) ? actions.removeTag : [actions.removeTag];
        newTags = newTags.filter((tag) => !tagsToRemove.includes(tag));
      }

      updates.tags = newTags;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(tickets).set(updates).where(eq(tickets.id, ticket.id));
    }

    // Send notification
    if (actions.sendNotification) {
      logger.info('Notification triggered by automation', { ticketId: ticket.id });

      // Integrate with notification service
      try {
        const { sendNotification } = await import('../../notifications/services/notification.service');

        await sendNotification({
          userId: ticket.assignedTo || 'system',
          tenantId: ticket.tenantId,
          type: 'in_app',
          category: 'support',
          priority: 'normal',
          subject: `Ticket #${ticket.id} - Automation Triggered`,
          content: actions.sendNotification.message || `Automation triggered for ticket #${ticket.id}`,
          metadata: {
            ticketId: ticket.id,
            trigger: 'automation',
            automationAction: true,
          },
        });

        logger.info('Automation notification sent', { ticketId: ticket.id });
      } catch (error) {
        logger.error('Failed to send automation notification', {
          ticketId: ticket.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Validate automation configuration
   */
  private static validateAutomation(data: CreateAutomationInput | UpdateAutomationInput): void {
    // Validate conditions
    if (data.conditions) {
      if (typeof data.conditions !== 'object' || Array.isArray(data.conditions)) {
        throw new Error('Conditions must be an object');
      }

      if (Object.keys(data.conditions).length === 0) {
        throw new Error('At least one condition is required');
      }
    }

    // Validate actions
    if (data.actions) {
      if (typeof data.actions !== 'object' || Array.isArray(data.actions)) {
        throw new Error('Actions must be an object');
      }

      if (Object.keys(data.actions).length === 0) {
        throw new Error('At least one action is required');
      }
    }
  }

  /**
   * Invalidate automations cache
   */
  private static async invalidateCache(tenantId: string): Promise<void> {
    await cacheManager.delete(CacheNamespace.SUPPORT, `automations:${tenantId}`);
  }
}
