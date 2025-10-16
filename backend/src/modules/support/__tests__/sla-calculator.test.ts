/**
 * SLA Calculator Tests
 */

import { describe, it, expect } from 'bun:test';
import {
  calculateSLADueDate,
  isSLABreached,
  calculateRemainingTime,
  calculateElapsedTime,
  calculateSLACompliance,
  formatDuration,
  calculateFirstResponseTime,
  calculateResolutionTime,
} from '../utils/sla-calculator';
import type { SLAPolicy } from '../types/support.types';

describe('SLA Calculator', () => {
  const mockSLAPolicy: SLAPolicy = {
    id: 'sla-1',
    tenantId: 'tenant-1',
    name: 'Standard SLA',
    priority: 'high',
    firstResponseMinutes: 60,
    resolutionMinutes: 240,
    businessHoursOnly: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('calculateSLADueDate', () => {
    it('should calculate due date for 24/7 SLA', () => {
      const startDate = new Date('2024-01-15T10:00:00');
      const dueDate = calculateSLADueDate(startDate, mockSLAPolicy, false);

      // Should be 240 minutes (4 hours) later
      expect(dueDate.getHours()).toBe(14);
    });

    it('should calculate first response due date', () => {
      const startDate = new Date('2024-01-15T10:00:00');
      const dueDate = calculateSLADueDate(startDate, mockSLAPolicy, true);

      // Should be 60 minutes (1 hour) later
      expect(dueDate.getHours()).toBe(11);
    });

    it('should handle business hours only', () => {
      const businessHoursSLA: SLAPolicy = {
        ...mockSLAPolicy,
        businessHoursOnly: true,
      };

      const startDate = new Date('2024-01-15T10:00:00'); // Monday 10am
      const dueDate = calculateSLADueDate(startDate, businessHoursSLA, false);

      // Should add 240 business minutes
      expect(dueDate).toBeDefined();
      expect(dueDate.getTime()).toBeGreaterThan(startDate.getTime());
    });
  });

  describe('isSLABreached', () => {
    it('should return true if current date is past due date', () => {
      const dueDate = new Date('2024-01-15T10:00:00');
      const currentDate = new Date('2024-01-15T11:00:00');

      expect(isSLABreached(dueDate, currentDate)).toBe(true);
    });

    it('should return false if current date is before due date', () => {
      const dueDate = new Date('2024-01-15T11:00:00');
      const currentDate = new Date('2024-01-15T10:00:00');

      expect(isSLABreached(dueDate, currentDate)).toBe(false);
    });

    it('should return false if due date is null', () => {
      expect(isSLABreached(null)).toBe(false);
      expect(isSLABreached(undefined)).toBe(false);
    });
  });

  describe('calculateRemainingTime', () => {
    it('should calculate positive remaining time', () => {
      const dueDate = new Date('2024-01-15T11:00:00');
      const currentDate = new Date('2024-01-15T10:00:00');

      const remaining = calculateRemainingTime(dueDate, currentDate);
      expect(remaining).toBe(60); // 60 minutes
    });

    it('should calculate negative remaining time for breached SLA', () => {
      const dueDate = new Date('2024-01-15T10:00:00');
      const currentDate = new Date('2024-01-15T11:00:00');

      const remaining = calculateRemainingTime(dueDate, currentDate);
      expect(remaining).toBe(-60); // -60 minutes (1 hour late)
    });

    it('should return 0 for null due date', () => {
      expect(calculateRemainingTime(null)).toBe(0);
      expect(calculateRemainingTime(undefined)).toBe(0);
    });
  });

  describe('calculateElapsedTime', () => {
    it('should calculate elapsed time in minutes', () => {
      const createdAt = new Date('2024-01-15T10:00:00');
      const currentDate = new Date('2024-01-15T11:30:00');

      const elapsed = calculateElapsedTime(createdAt, currentDate);
      expect(elapsed).toBe(90); // 90 minutes
    });
  });

  describe('calculateSLACompliance', () => {
    it('should calculate compliance percentage', () => {
      expect(calculateSLACompliance(80, 100)).toBe(80);
      expect(calculateSLACompliance(45, 50)).toBe(90);
      expect(calculateSLACompliance(0, 100)).toBe(0);
    });

    it('should return 100% for zero total', () => {
      expect(calculateSLACompliance(0, 0)).toBe(100);
    });
  });

  describe('formatDuration', () => {
    it('should format minutes', () => {
      expect(formatDuration(30)).toBe('30m');
      expect(formatDuration(59)).toBe('59m');
    });

    it('should format hours', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(120)).toBe('2h');
    });

    it('should format days', () => {
      expect(formatDuration(1440)).toBe('1d'); // 24 hours
      expect(formatDuration(1500)).toBe('1d 1h'); // 25 hours
      expect(formatDuration(2880)).toBe('2d'); // 48 hours
    });

    it('should format negative durations', () => {
      expect(formatDuration(-30)).toBe('30m');
      expect(formatDuration(-90)).toBe('1h 30m');
    });
  });

  describe('calculateFirstResponseTime', () => {
    it('should calculate first response time', () => {
      const createdAt = new Date('2024-01-15T10:00:00');
      const firstResponseAt = new Date('2024-01-15T10:30:00');

      const time = calculateFirstResponseTime(createdAt, firstResponseAt);
      expect(time).toBe(30); // 30 minutes
    });
  });

  describe('calculateResolutionTime', () => {
    it('should calculate resolution time', () => {
      const createdAt = new Date('2024-01-15T10:00:00');
      const resolvedAt = new Date('2024-01-15T14:00:00');

      const time = calculateResolutionTime(createdAt, resolvedAt);
      expect(time).toBe(240); // 4 hours = 240 minutes
    });
  });
});
