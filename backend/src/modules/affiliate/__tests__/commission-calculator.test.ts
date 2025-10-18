import { describe, it, expect } from 'bun:test';
import { calculateCommission } from '../utils/commission-calculator';

describe('commission-calculator', () => {
  it('calculates percentage commission correctly', () => {
    const result = calculateCommission(1000, 15, null);
    expect(result.type).toBe('percentage');
    expect(result.commissionRate).toBe(15);
    expect(result.totalAmount).toBe(150);
    expect(result.commissionAmount).toBe(150);
  });
});

