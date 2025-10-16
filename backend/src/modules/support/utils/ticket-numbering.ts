/**
 * Ticket Numbering Utility
 * Auto-generates unique ticket numbers per tenant
 */

import { db } from '@/db';
import { tickets } from '../schema/tickets.schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Generate unique ticket number for tenant
 * Format: TICK-YYYY-NNNN
 *
 * @param tenantId - Tenant ID
 * @returns Unique ticket number
 *
 * @example
 * const ticketNumber = await generateTicketNumber('tenant-123');
 * // Returns: "TICK-2024-0001"
 */
export async function generateTicketNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();

  // Get count of tickets for this tenant in current year
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tickets)
    .where(
      and(
        eq(tickets.tenantId, tenantId),
        sql`${tickets.createdAt} >= ${yearStart}`,
        sql`${tickets.createdAt} <= ${yearEnd}`
      )
    )
    .execute();

  const count = Number(result[0]?.count || 0);
  const nextNumber = count + 1;

  // Format: TICK-2024-0001
  const paddedNumber = String(nextNumber).padStart(4, '0');
  return `TICK-${year}-${paddedNumber}`;
}

/**
 * Validate ticket number format
 *
 * @param ticketNumber - Ticket number to validate
 * @returns True if valid format
 */
export function isValidTicketNumber(ticketNumber: string): boolean {
  const pattern = /^TICK-\d{4}-\d{4}$/;
  return pattern.test(ticketNumber);
}

/**
 * Extract year from ticket number
 *
 * @param ticketNumber - Ticket number
 * @returns Year or null if invalid
 */
export function getTicketYear(ticketNumber: string): number | null {
  if (!isValidTicketNumber(ticketNumber)) {
    return null;
  }

  const parts = ticketNumber.split('-');
  return parseInt(parts[1], 10);
}

/**
 * Extract sequence number from ticket number
 *
 * @param ticketNumber - Ticket number
 * @returns Sequence number or null if invalid
 */
export function getTicketSequence(ticketNumber: string): number | null {
  if (!isValidTicketNumber(ticketNumber)) {
    return null;
  }

  const parts = ticketNumber.split('-');
  return parseInt(parts[2], 10);
}
