import { describe, it, expect } from 'bun:test';
import { generateAffiliateCode, validateAffiliateCode, generateReferralLink, extractAffiliateCode } from '../utils/referral-code';

describe('referral-code utils', () => {
  it('generates valid affiliate codes', () => {
    const code = generateAffiliateCode();
    expect(validateAffiliateCode(code)).toBe(true);
    expect(code.startsWith('AFF-')).toBe(true);
    expect(code.length).toBe(12);
  });

  it('generates a referral link with code', () => {
    const code = 'AFF-ABCDEFGH';
    const link = generateReferralLink('https://app.example.com/', code);
    expect(link).toContain('https://app.example.com');
    expect(link).toContain(`ref=${code}`);
    const extracted = extractAffiliateCode(link)!;
    expect(extracted).toBe(code);
  });
});

