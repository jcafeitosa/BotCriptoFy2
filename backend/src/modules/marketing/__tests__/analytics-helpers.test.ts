import { describe, test, expect } from 'bun:test';
import { percentage } from '../services/analytics.service';

describe('Marketing analytics helpers', () => {
  test('percentage handles totals correctly', () => {
    expect(percentage(50, 200)).toBeCloseTo(25);
    expect(percentage(0, 100)).toBe(0);
    expect(percentage(10, 0)).toBe(0);
  });
});
