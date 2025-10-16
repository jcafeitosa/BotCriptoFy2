/**
 * Lead Scoring Service
 * Calculates and updates lead scores based on data and behavior
 */

import logger from '@/utils/logger';
import type { Lead } from '../schema/leads.schema';
import type { LeadActivity } from '../schema/lead-activities.schema';
import type { LeadScoringResult } from '../types';

/**
 * Lead Scoring Service
 */
export class ScoringService {
  /**
   * Calculate lead score based on data completeness and engagement
   *
   * Scoring breakdown:
   * - Data completeness: 0-30 points
   *   - Company: 10 points
   *   - Job title: 10 points
   *   - Phone: 10 points
   * - Engagement: 0-40 points
   *   - Email opens: 5 points each (max 20)
   *   - Email clicks: 10 points each (max 20)
   * - Actions: 0-30 points
   *   - Form submissions: 15 points each (max 30)
   *
   * Total: 0-100 points
   */
  static calculateScore(lead: Lead, activities: LeadActivity[]): LeadScoringResult {
    const oldScore = lead.score;
    let score = 0;

    // 1. Data Completeness (0-30 points)
    const dataCompleteness = this.calculateDataCompletenessScore(lead);
    score += dataCompleteness;

    // 2. Engagement Score (0-40 points)
    const engagement = this.calculateEngagementScore(activities);
    score += engagement;

    // 3. Action Score (0-30 points)
    const actions = this.calculateActionScore(activities);
    score += actions;

    // Cap at 100
    const newScore = Math.min(score, 100);

    logger.debug('Lead score calculated', {
      leadId: lead.id,
      oldScore,
      newScore,
      breakdown: { dataCompleteness, engagement, actions },
    });

    return {
      leadId: lead.id,
      oldScore,
      newScore,
      breakdown: {
        dataCompleteness,
        engagement,
        actions,
      },
    };
  }

  /**
   * Calculate data completeness score (0-30 points)
   */
  private static calculateDataCompletenessScore(lead: Lead): number {
    let score = 0;

    if (lead.company) score += 10;
    if (lead.jobTitle) score += 10;
    if (lead.phone) score += 10;

    return score;
  }

  /**
   * Calculate engagement score from activities (0-40 points)
   */
  private static calculateEngagementScore(activities: LeadActivity[]): number {
    let score = 0;

    // Email opens (5 points each, max 20)
    const emailOpens = activities.filter((a) => a.activityType === 'email_opened').length;
    score += Math.min(emailOpens * 5, 20);

    // Email clicks (10 points each, max 20)
    const emailClicks = activities.filter((a) => a.activityType === 'email_clicked').length;
    score += Math.min(emailClicks * 10, 20);

    return score;
  }

  /**
   * Calculate action score from activities (0-30 points)
   */
  private static calculateActionScore(activities: LeadActivity[]): number {
    let score = 0;

    // Form submissions (15 points each, max 30)
    const formSubmits = activities.filter((a) => a.activityType === 'form_submitted').length;
    score += Math.min(formSubmits * 15, 30);

    return score;
  }

  /**
   * Calculate score change percentage
   */
  static calculateScoreChange(oldScore: number, newScore: number): number {
    if (oldScore === 0) {
      return newScore > 0 ? 100 : 0;
    }

    return ((newScore - oldScore) / oldScore) * 100;
  }

  /**
   * Get score category
   */
  static getScoreCategory(
    score: number
  ): 'cold' | 'warm' | 'hot' | 'qualified' | 'unqualified' {
    if (score >= 80) return 'qualified';
    if (score >= 60) return 'hot';
    if (score >= 40) return 'warm';
    if (score >= 20) return 'cold';
    return 'unqualified';
  }

  /**
   * Check if lead should be auto-qualified based on score
   */
  static shouldAutoQualify(score: number, threshold: number = 80): boolean {
    return score >= threshold;
  }

  /**
   * Calculate average score for multiple leads
   */
  static calculateAverageScore(leads: Lead[]): number {
    if (leads.length === 0) return 0;

    const total = leads.reduce((sum, lead) => sum + lead.score, 0);
    return Math.round((total / leads.length) * 100) / 100;
  }

  /**
   * Get score distribution
   */
  static getScoreDistribution(leads: Lead[]): Record<string, number> {
    const distribution = {
      unqualified: 0, // 0-19
      cold: 0, // 20-39
      warm: 0, // 40-59
      hot: 0, // 60-79
      qualified: 0, // 80-100
    };

    leads.forEach((lead) => {
      const category = this.getScoreCategory(lead.score);
      distribution[category]++;
    });

    return distribution;
  }
}
