/**
 * SLA Calculator Utility
 * Calculate SLA due dates and track breaches
 */

import { addBusinessMinutes } from './business-hours';
import type { SLAPolicy } from '../types/support.types';
import type { Ticket } from '../types/support.types';

/**
 * Calculate due date based on SLA policy
 *
 * @param startDate - Ticket creation or reference date
 * @param policy - SLA policy
 * @param isFirstResponse - If true, use first response time; otherwise resolution time
 * @returns Due date
 */
export function calculateSLADueDate(
  startDate: Date,
  policy: SLAPolicy,
  isFirstResponse: boolean = false
): Date {
  const minutes = isFirstResponse ? policy.firstResponseMinutes : policy.resolutionMinutes;

  if (policy.businessHoursOnly) {
    return addBusinessMinutes(startDate, minutes);
  }

  // Calendar time (24/7)
  const dueDate = new Date(startDate);
  dueDate.setMinutes(dueDate.getMinutes() + minutes);
  return dueDate;
}

/**
 * Check if SLA is breached
 *
 * @param dueDate - SLA due date
 * @param currentDate - Current date (defaults to now)
 * @returns True if SLA is breached
 */
export function isSLABreached(dueDate: Date | null | undefined, currentDate: Date = new Date()): boolean {
  if (!dueDate) {
    return false;
  }

  return currentDate > dueDate;
}

/**
 * Calculate remaining time until SLA breach
 *
 * @param dueDate - SLA due date
 * @param currentDate - Current date (defaults to now)
 * @returns Remaining minutes (negative if breached)
 */
export function calculateRemainingTime(dueDate: Date | null | undefined, currentDate: Date = new Date()): number {
  if (!dueDate) {
    return 0;
  }

  const diff = dueDate.getTime() - currentDate.getTime();
  return Math.floor(diff / 60000); // Convert to minutes
}

/**
 * Calculate time elapsed since creation
 *
 * @param createdAt - Ticket creation date
 * @param currentDate - Current date (defaults to now)
 * @returns Elapsed minutes
 */
export function calculateElapsedTime(createdAt: Date, currentDate: Date = new Date()): number {
  const diff = currentDate.getTime() - createdAt.getTime();
  return Math.floor(diff / 60000); // Convert to minutes
}

/**
 * Calculate SLA compliance percentage
 *
 * @param withinSLA - Number of tickets within SLA
 * @param total - Total number of tickets
 * @returns Compliance percentage (0-100)
 */
export function calculateSLACompliance(withinSLA: number, total: number): number {
  if (total === 0) {
    return 100;
  }

  return Math.round((withinSLA / total) * 100);
}

/**
 * Get SLA status for a ticket
 *
 * @param ticket - Ticket
 * @param policy - SLA policy
 * @returns SLA status
 */
export function getSLAStatus(
  ticket: Ticket,
  policy?: SLAPolicy | null
): {
  status: 'within_sla' | 'at_risk' | 'breached';
  dueDate?: Date;
  remainingMinutes?: number;
  percentageUsed?: number;
} {
  if (!policy || !ticket.dueDate) {
    return { status: 'within_sla' };
  }

  const now = new Date();
  const remainingMinutes = calculateRemainingTime(ticket.dueDate, now);
  const elapsedMinutes = calculateElapsedTime(ticket.createdAt, now);
  const totalMinutes = policy.resolutionMinutes;
  const percentageUsed = Math.min(Math.round((elapsedMinutes / totalMinutes) * 100), 100);

  if (remainingMinutes < 0) {
    return {
      status: 'breached',
      dueDate: ticket.dueDate,
      remainingMinutes,
      percentageUsed,
    };
  }

  // At risk if less than 20% time remaining
  const atRiskThreshold = totalMinutes * 0.2;
  if (remainingMinutes < atRiskThreshold) {
    return {
      status: 'at_risk',
      dueDate: ticket.dueDate,
      remainingMinutes,
      percentageUsed,
    };
  }

  return {
    status: 'within_sla',
    dueDate: ticket.dueDate,
    remainingMinutes,
    percentageUsed,
  };
}

/**
 * Format time duration in human-readable format
 *
 * @param minutes - Duration in minutes
 * @returns Formatted string
 */
export function formatDuration(minutes: number): string {
  const absMinutes = Math.abs(minutes);

  if (absMinutes < 60) {
    return `${absMinutes}m`;
  }

  const hours = Math.floor(absMinutes / 60);
  const remainingMinutes = absMinutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours > 0) {
    return `${days}d ${remainingHours}h`;
  }

  return `${days}d`;
}

/**
 * Calculate first response time
 *
 * @param createdAt - Ticket creation date
 * @param firstResponseAt - First response date
 * @returns Response time in minutes
 */
export function calculateFirstResponseTime(createdAt: Date, firstResponseAt: Date): number {
  const diff = firstResponseAt.getTime() - createdAt.getTime();
  return Math.floor(diff / 60000);
}

/**
 * Calculate resolution time
 *
 * @param createdAt - Ticket creation date
 * @param resolvedAt - Resolution date
 * @returns Resolution time in minutes
 */
export function calculateResolutionTime(createdAt: Date, resolvedAt: Date): number {
  const diff = resolvedAt.getTime() - createdAt.getTime();
  return Math.floor(diff / 60000);
}
