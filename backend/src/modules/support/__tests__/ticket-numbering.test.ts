/**
 * Ticket Numbering Tests
 */

import { describe, it, expect } from 'bun:test';
import {
  isValidTicketNumber,
  getTicketYear,
  getTicketSequence,
} from '../utils/ticket-numbering';

describe('Ticket Numbering', () => {
  describe('isValidTicketNumber', () => {
    it('should validate correct ticket numbers', () => {
      expect(isValidTicketNumber('TICK-2024-0001')).toBe(true);
      expect(isValidTicketNumber('TICK-2023-9999')).toBe(true);
      expect(isValidTicketNumber('TICK-2025-0123')).toBe(true);
    });

    it('should reject invalid ticket numbers', () => {
      expect(isValidTicketNumber('TICK-2024-001')).toBe(false); // Wrong sequence format
      expect(isValidTicketNumber('TICK-24-0001')).toBe(false); // Wrong year format
      expect(isValidTicketNumber('TKT-2024-0001')).toBe(false); // Wrong prefix
      expect(isValidTicketNumber('TICK20240001')).toBe(false); // Missing dashes
      expect(isValidTicketNumber('')).toBe(false);
    });
  });

  describe('getTicketYear', () => {
    it('should extract year from valid ticket number', () => {
      expect(getTicketYear('TICK-2024-0001')).toBe(2024);
      expect(getTicketYear('TICK-2023-9999')).toBe(2023);
      expect(getTicketYear('TICK-2025-0123')).toBe(2025);
    });

    it('should return null for invalid ticket number', () => {
      expect(getTicketYear('INVALID')).toBeNull();
      expect(getTicketYear('TICK-24-0001')).toBeNull();
    });
  });

  describe('getTicketSequence', () => {
    it('should extract sequence number from valid ticket number', () => {
      expect(getTicketSequence('TICK-2024-0001')).toBe(1);
      expect(getTicketSequence('TICK-2024-0123')).toBe(123);
      expect(getTicketSequence('TICK-2024-9999')).toBe(9999);
    });

    it('should return null for invalid ticket number', () => {
      expect(getTicketSequence('INVALID')).toBeNull();
      expect(getTicketSequence('TICK-2024-001')).toBeNull();
    });
  });
});
