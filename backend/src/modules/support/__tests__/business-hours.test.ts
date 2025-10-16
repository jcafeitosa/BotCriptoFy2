/**
 * Business Hours Tests
 */

import { describe, it, expect } from 'bun:test';
import {
  isBusinessHour,
  nextBusinessHour,
  addBusinessMinutes,
  calculateBusinessMinutes,
  getNextBusinessDay,
  isSameBusinessDay,
} from '../utils/business-hours';

describe('Business Hours', () => {
  describe('isBusinessHour', () => {
    it('should return true for business hours (9am-6pm, Mon-Fri)', () => {
      // Monday at 10am
      const monday10am = new Date('2024-01-15T10:00:00');
      expect(isBusinessHour(monday10am)).toBe(true);

      // Friday at 5pm
      const friday5pm = new Date('2024-01-19T17:00:00');
      expect(isBusinessHour(friday5pm)).toBe(true);
    });

    it('should return false for non-business hours', () => {
      // Monday at 8am (before business hours)
      const monday8am = new Date('2024-01-15T08:00:00');
      expect(isBusinessHour(monday8am)).toBe(false);

      // Monday at 6pm (after business hours)
      const monday6pm = new Date('2024-01-15T18:00:00');
      expect(isBusinessHour(monday6pm)).toBe(false);

      // Saturday at 10am
      const saturday10am = new Date('2024-01-20T10:00:00');
      expect(isBusinessHour(saturday10am)).toBe(false);

      // Sunday at 10am
      const sunday10am = new Date('2024-01-21T10:00:00');
      expect(isBusinessHour(sunday10am)).toBe(false);
    });
  });

  describe('nextBusinessHour', () => {
    it('should return next hour if within business day', () => {
      const monday10am = new Date('2024-01-15T10:00:00');
      const result = nextBusinessHour(monday10am);

      expect(result.getHours()).toBe(11);
      expect(result.getDate()).toBe(15);
    });

    it('should skip to next business day if after hours', () => {
      const monday6pm = new Date('2024-01-15T18:00:00');
      const result = nextBusinessHour(monday6pm);

      // Should be Tuesday 9am
      expect(result.getDate()).toBe(16);
      expect(result.getHours()).toBe(9);
    });

    it('should skip weekend', () => {
      const friday6pm = new Date('2024-01-19T18:00:00');
      const result = nextBusinessHour(friday6pm);

      // Should be Monday 9am
      expect(result.getDate()).toBe(22);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getHours()).toBe(9);
    });
  });

  describe('addBusinessMinutes', () => {
    it('should add minutes within same business day', () => {
      const monday10am = new Date('2024-01-15T10:00:00');
      const result = addBusinessMinutes(monday10am, 60); // Add 1 hour

      expect(result.getHours()).toBe(11);
      expect(result.getDate()).toBe(15);
    });

    it('should skip non-business hours', () => {
      const monday5pm = new Date('2024-01-15T17:00:00');
      const result = addBusinessMinutes(monday5pm, 120); // Add 2 hours

      // Should be Tuesday at 10am (1 hour to 6pm Mon + 1 hour Tue 9-10am)
      expect(result.getDate()).toBe(16);
      expect(result.getHours()).toBe(10);
    });
  });

  describe('calculateBusinessMinutes', () => {
    it('should calculate minutes within same business day', () => {
      const start = new Date('2024-01-15T10:00:00');
      const end = new Date('2024-01-15T11:00:00');

      const minutes = calculateBusinessMinutes(start, end);
      expect(minutes).toBe(60);
    });

    it('should only count business hours', () => {
      const start = new Date('2024-01-15T17:00:00'); // 5pm Monday
      const end = new Date('2024-01-16T10:00:00'); // 10am Tuesday

      // Should be 1 hour (5pm-6pm) + 1 hour (9am-10am) = 120 minutes
      const minutes = calculateBusinessMinutes(start, end);
      expect(minutes).toBe(120);
    });
  });

  describe('getNextBusinessDay', () => {
    it('should return next business day', () => {
      const monday = new Date('2024-01-15T10:00:00');
      const result = getNextBusinessDay(monday);

      expect(result.getDate()).toBe(16); // Tuesday
      expect(result.getHours()).toBe(9);
    });

    it('should skip weekend', () => {
      const friday = new Date('2024-01-19T10:00:00');
      const result = getNextBusinessDay(friday);

      expect(result.getDate()).toBe(22); // Monday
      expect(result.getDay()).toBe(1);
      expect(result.getHours()).toBe(9);
    });
  });

  describe('isSameBusinessDay', () => {
    it('should return true for same business day', () => {
      const monday10am = new Date('2024-01-15T10:00:00');
      const monday2pm = new Date('2024-01-15T14:00:00');

      expect(isSameBusinessDay(monday10am, monday2pm)).toBe(true);
    });

    it('should return false for different days', () => {
      const monday = new Date('2024-01-15T10:00:00');
      const tuesday = new Date('2024-01-16T10:00:00');

      expect(isSameBusinessDay(monday, tuesday)).toBe(false);
    });

    it('should return false for weekend', () => {
      const saturday = new Date('2024-01-20T10:00:00');
      const sunday = new Date('2024-01-21T10:00:00');

      expect(isSameBusinessDay(saturday, sunday)).toBe(false);
    });
  });
});
