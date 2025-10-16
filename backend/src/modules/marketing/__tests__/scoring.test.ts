/**
 * Lead Scoring Tests
 */

import { describe, it, expect } from 'bun:test';
import { ScoringService } from '../services/scoring.service';
import type { Lead } from '../schema/leads.schema';
import type { LeadActivity } from '../schema/lead-activities.schema';

describe('ScoringService', () => {
  const createMockLead = (overrides?: Partial<Lead>): Lead => ({
    id: '1',
    tenantId: 'tenant1',
    email: 'test@example.com',
    firstName: null,
    lastName: null,
    phone: null,
    company: null,
    jobTitle: null,
    source: 'website',
    status: 'new',
    score: 0,
    tags: null,
    customFields: null,
    lastContactedAt: null,
    convertedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  const createMockActivity = (type: string): LeadActivity => ({
    id: '1',
    leadId: '1',
    tenantId: 'tenant1',
    campaignId: null,
    performedBy: null,
    activityType: type as any,
    metadata: {},
    createdAt: new Date(),
  });

  describe('calculateScore', () => {
    it('should calculate score for minimal lead data', () => {
      const lead = createMockLead();
      const activities: LeadActivity[] = [];

      const result = ScoringService.calculateScore(lead, activities);

      expect(result.leadId).toBe('1');
      expect(result.newScore).toBe(0);
      expect(result.breakdown.dataCompleteness).toBe(0);
      expect(result.breakdown.engagement).toBe(0);
      expect(result.breakdown.actions).toBe(0);
    });

    it('should score data completeness', () => {
      const lead = createMockLead({
        company: 'Acme Inc',
        jobTitle: 'CEO',
        phone: '+1234567890',
      });
      const activities: LeadActivity[] = [];

      const result = ScoringService.calculateScore(lead, activities);

      expect(result.breakdown.dataCompleteness).toBe(30); // 10+10+10
      expect(result.newScore).toBe(30);
    });

    it('should score email opens', () => {
      const lead = createMockLead();
      const activities = [
        createMockActivity('email_opened'),
        createMockActivity('email_opened'),
        createMockActivity('email_opened'),
      ];

      const result = ScoringService.calculateScore(lead, activities);

      expect(result.breakdown.engagement).toBe(15); // 3 * 5 = 15
    });

    it('should cap email opens at 20 points', () => {
      const lead = createMockLead();
      const activities = Array(10).fill(null).map(() => createMockActivity('email_opened'));

      const result = ScoringService.calculateScore(lead, activities);

      expect(result.breakdown.engagement).toBe(20); // capped at 20
    });

    it('should score email clicks', () => {
      const lead = createMockLead();
      const activities = [
        createMockActivity('email_clicked'),
        createMockActivity('email_clicked'),
      ];

      const result = ScoringService.calculateScore(lead, activities);

      expect(result.breakdown.engagement).toBe(20); // 2 * 10 = 20
    });

    it('should score form submissions', () => {
      const lead = createMockLead();
      const activities = [
        createMockActivity('form_submitted'),
        createMockActivity('form_submitted'),
      ];

      const result = ScoringService.calculateScore(lead, activities);

      expect(result.breakdown.actions).toBe(30); // 2 * 15 = 30 (capped)
    });

    it('should combine all scoring factors', () => {
      const lead = createMockLead({
        company: 'Acme Inc',
        jobTitle: 'CEO',
        phone: '+1234567890',
      });
      const activities = [
        createMockActivity('email_opened'),
        createMockActivity('email_opened'),
        createMockActivity('email_clicked'),
        createMockActivity('form_submitted'),
      ];

      const result = ScoringService.calculateScore(lead, activities);

      // Data: 30 (10+10+10)
      // Engagement: 20 (2*5 + 1*10)
      // Actions: 15 (1*15)
      // Total: 65
      expect(result.newScore).toBe(65);
    });

    it('should cap total score at 100', () => {
      const lead = createMockLead({
        company: 'Acme Inc',
        jobTitle: 'CEO',
        phone: '+1234567890',
      });
      const activities = [
        ...Array(10).fill(null).map(() => createMockActivity('email_opened')),
        ...Array(10).fill(null).map(() => createMockActivity('email_clicked')),
        ...Array(10).fill(null).map(() => createMockActivity('form_submitted')),
      ];

      const result = ScoringService.calculateScore(lead, activities);

      expect(result.newScore).toBe(100); // Capped at 100
    });
  });

  describe('getScoreCategory', () => {
    it('should categorize scores correctly', () => {
      expect(ScoringService.getScoreCategory(90)).toBe('qualified');
      expect(ScoringService.getScoreCategory(70)).toBe('hot');
      expect(ScoringService.getScoreCategory(50)).toBe('warm');
      expect(ScoringService.getScoreCategory(30)).toBe('cold');
      expect(ScoringService.getScoreCategory(10)).toBe('unqualified');
    });

    it('should handle boundary values', () => {
      expect(ScoringService.getScoreCategory(80)).toBe('qualified');
      expect(ScoringService.getScoreCategory(60)).toBe('hot');
      expect(ScoringService.getScoreCategory(40)).toBe('warm');
      expect(ScoringService.getScoreCategory(20)).toBe('cold');
    });
  });

  describe('shouldAutoQualify', () => {
    it('should qualify high scores', () => {
      expect(ScoringService.shouldAutoQualify(80)).toBe(true);
      expect(ScoringService.shouldAutoQualify(90)).toBe(true);
      expect(ScoringService.shouldAutoQualify(100)).toBe(true);
    });

    it('should not qualify low scores', () => {
      expect(ScoringService.shouldAutoQualify(79)).toBe(false);
      expect(ScoringService.shouldAutoQualify(50)).toBe(false);
      expect(ScoringService.shouldAutoQualify(0)).toBe(false);
    });

    it('should respect custom threshold', () => {
      expect(ScoringService.shouldAutoQualify(60, 50)).toBe(true);
      expect(ScoringService.shouldAutoQualify(40, 50)).toBe(false);
    });
  });

  describe('calculateAverageScore', () => {
    it('should calculate average score', () => {
      const leads = [
        createMockLead({ score: 100 }),
        createMockLead({ score: 80 }),
        createMockLead({ score: 60 }),
      ];

      const avg = ScoringService.calculateAverageScore(leads);
      expect(avg).toBe(80);
    });

    it('should handle empty array', () => {
      expect(ScoringService.calculateAverageScore([])).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const leads = [
        createMockLead({ score: 33 }),
        createMockLead({ score: 33 }),
        createMockLead({ score: 34 }),
      ];

      const avg = ScoringService.calculateAverageScore(leads);
      expect(avg).toBe(33.33);
    });
  });

  describe('getScoreDistribution', () => {
    it('should distribute scores into categories', () => {
      const leads = [
        createMockLead({ score: 90 }),  // qualified
        createMockLead({ score: 70 }),  // hot
        createMockLead({ score: 50 }),  // warm
        createMockLead({ score: 30 }),  // cold
        createMockLead({ score: 10 }),  // unqualified
      ];

      const distribution = ScoringService.getScoreDistribution(leads);

      expect(distribution.qualified).toBe(1);
      expect(distribution.hot).toBe(1);
      expect(distribution.warm).toBe(1);
      expect(distribution.cold).toBe(1);
      expect(distribution.unqualified).toBe(1);
    });

    it('should handle multiple leads in same category', () => {
      const leads = [
        createMockLead({ score: 85 }),
        createMockLead({ score: 90 }),
        createMockLead({ score: 95 }),
      ];

      const distribution = ScoringService.getScoreDistribution(leads);

      expect(distribution.qualified).toBe(3);
      expect(distribution.hot).toBe(0);
    });
  });
});
