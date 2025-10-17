/**
 * Dispute Resolver
 *
 * Logic for resolving P2P trade disputes
 */

import type { DisputeResponse, TradeResponse, EscrowResponse } from '../types/p2p.types';

/**
 * Dispute Resolution Decision
 */
export interface DisputeResolution {
  decision: 'release_to_buyer' | 'release_to_seller' | 'split' | 'refund' | 'manual_review';
  reason: string;
  confidence: number; // 0-100
  escrowAction: 'release' | 'refund' | 'hold' | 'split';
  splitPercentage?: { buyer: number; seller: number };
  recommendedPenalty?: {
    userId: string;
    type: 'warning' | 'suspension' | 'ban';
    duration?: number; // days
  };
}

/**
 * Evidence Analysis Result
 */
interface EvidenceAnalysis {
  paymentProofProvided: boolean;
  paymentProofValid: boolean;
  sellerResponseProvided: boolean;
  timelineConsistent: boolean;
  contradictions: string[];
  score: number; // 0-100
}

/**
 * Automated dispute resolution
 *
 * Analyzes evidence and suggests resolution
 */
export function analyzeDispute(
  dispute: DisputeResponse,
  trade: TradeResponse,
  escrow: EscrowResponse,
  evidence: {
    buyerEvidence: any[];
    sellerEvidence: any[];
    chatHistory: any[];
    paymentProof?: any;
  }
): DisputeResolution {
  // Analyze evidence from both parties
  const buyerAnalysis = analyzeEvidence(evidence.buyerEvidence, 'buyer');
  const sellerAnalysis = analyzeEvidence(evidence.sellerEvidence, 'seller');

  // Check for clear-cut cases
  const clearCutResolution = checkClearCutCases(
    dispute,
    trade,
    evidence,
    buyerAnalysis,
    sellerAnalysis
  );

  if (clearCutResolution) {
    return clearCutResolution;
  }

  // Score-based resolution
  return resolveByScore(dispute, trade, buyerAnalysis, sellerAnalysis);
}

/**
 * Analyze evidence quality
 */
function analyzeEvidence(evidence: any[], party: 'buyer' | 'seller'): EvidenceAnalysis {
  const hasPaymentProof = evidence.some((e) => e.type === 'payment_proof');
  const hasScreenshots = evidence.some((e) => e.type === 'screenshot');
  const hasTransactionId = evidence.some((e) => e.type === 'transaction_id');

  let score = 0;

  if (hasPaymentProof) score += 40;
  if (hasScreenshots) score += 20;
  if (hasTransactionId) score += 30;
  if (evidence.length > 3) score += 10;

  return {
    paymentProofProvided: hasPaymentProof,
    paymentProofValid: hasPaymentProof && hasTransactionId,
    sellerResponseProvided: party === 'seller' && evidence.length > 0,
    timelineConsistent: true, // Would check timestamps
    contradictions: [],
    score: Math.min(100, score),
  };
}

/**
 * Check for clear-cut cases
 */
function checkClearCutCases(
  dispute: DisputeResponse,
  trade: TradeResponse,
  evidence: any,
  buyerAnalysis: EvidenceAnalysis,
  sellerAnalysis: EvidenceAnalysis
): DisputeResolution | null {
  // Case 1: Buyer provided clear payment proof, seller hasn't responded
  if (
    buyerAnalysis.paymentProofValid &&
    !sellerAnalysis.sellerResponseProvided &&
    dispute.reason === 'payment_not_received'
  ) {
    return {
      decision: 'release_to_buyer',
      reason: 'Buyer provided valid payment proof, seller failed to respond',
      confidence: 95,
      escrowAction: 'refund',
      recommendedPenalty: {
        userId: trade.sellerId,
        type: 'warning',
      },
    };
  }

  // Case 2: Seller claims non-payment, buyer provides no evidence
  if (
    dispute.reason === 'payment_not_received' &&
    !buyerAnalysis.paymentProofProvided &&
    sellerAnalysis.sellerResponseProvided
  ) {
    return {
      decision: 'release_to_seller',
      reason: 'Buyer failed to provide payment proof',
      confidence: 90,
      escrowAction: 'release',
      recommendedPenalty: {
        userId: trade.buyerId,
        type: 'warning',
      },
    };
  }

  // Case 3: Both parties provide strong evidence - needs manual review
  if (buyerAnalysis.score > 80 && sellerAnalysis.score > 80) {
    return {
      decision: 'manual_review',
      reason: 'Both parties provided substantial evidence, requires human review',
      confidence: 50,
      escrowAction: 'hold',
    };
  }

  return null;
}

/**
 * Resolve by evidence score
 */
function resolveByScore(
  dispute: DisputeResponse,
  trade: TradeResponse,
  buyerAnalysis: EvidenceAnalysis,
  sellerAnalysis: EvidenceAnalysis
): DisputeResolution {
  const scoreDiff = buyerAnalysis.score - sellerAnalysis.score;

  // Strong evidence favoring buyer
  if (scoreDiff > 30) {
    return {
      decision: 'release_to_buyer',
      reason: 'Buyer provided significantly stronger evidence',
      confidence: 80,
      escrowAction: 'refund',
      recommendedPenalty: {
        userId: trade.sellerId,
        type: 'warning',
      },
    };
  }

  // Strong evidence favoring seller
  if (scoreDiff < -30) {
    return {
      decision: 'release_to_seller',
      reason: 'Seller provided significantly stronger evidence',
      confidence: 80,
      escrowAction: 'release',
      recommendedPenalty: {
        userId: trade.buyerId,
        type: 'warning',
      },
    };
  }

  // Close scores - split or manual review
  if (Math.abs(scoreDiff) <= 30) {
    if (buyerAnalysis.score > 50 && sellerAnalysis.score > 50) {
      // Both provided decent evidence - split
      return {
        decision: 'split',
        reason: 'Both parties provided evidence, splitting escrow fairly',
        confidence: 60,
        escrowAction: 'split',
        splitPercentage: { buyer: 50, seller: 50 },
      };
    }

    // Low evidence from both - manual review
    return {
      decision: 'manual_review',
      reason: 'Insufficient evidence from both parties',
      confidence: 40,
      escrowAction: 'hold',
    };
  }

  // Default: manual review
  return {
    decision: 'manual_review',
    reason: 'Case requires human arbitration',
    confidence: 50,
    escrowAction: 'hold',
  };
}

/**
 * Calculate dispute resolution time
 */
export function calculateResolutionTime(
  disputeCreatedAt: Date,
  evidenceCount: number,
  complexity: 'simple' | 'moderate' | 'complex'
): { estimatedHours: number; priority: 'low' | 'medium' | 'high' } {
  let baseHours = 24;

  switch (complexity) {
    case 'simple':
      baseHours = 4;
      break;
    case 'moderate':
      baseHours = 12;
      break;
    case 'complex':
      baseHours = 48;
      break;
  }

  // Add time for evidence review
  const evidenceHours = evidenceCount * 0.5;

  const estimatedHours = baseHours + evidenceHours;

  // Determine priority based on time elapsed
  const hoursElapsed = (Date.now() - disputeCreatedAt.getTime()) / (1000 * 60 * 60);

  let priority: 'low' | 'medium' | 'high' = 'low';

  if (hoursElapsed > 48) {
    priority = 'high';
  } else if (hoursElapsed > 24) {
    priority = 'medium';
  }

  return { estimatedHours, priority };
}

/**
 * Validate dispute resolution
 */
export function validateResolution(resolution: DisputeResolution): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (resolution.confidence < 0 || resolution.confidence > 100) {
    errors.push('Confidence must be between 0 and 100');
  }

  if (resolution.decision === 'split' && !resolution.splitPercentage) {
    errors.push('Split decision requires splitPercentage');
  }

  if (resolution.splitPercentage) {
    const total = resolution.splitPercentage.buyer + resolution.splitPercentage.seller;
    if (Math.abs(total - 100) > 0.01) {
      errors.push('Split percentages must sum to 100');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get dispute complexity
 */
export function getDisputeComplexity(
  dispute: DisputeResponse,
  evidenceCount: number,
  tradeAmount: number
): 'simple' | 'moderate' | 'complex' {
  // High value = complex
  if (tradeAmount > 10000) return 'complex';

  // Lots of evidence = complex
  if (evidenceCount > 10) return 'complex';

  // Fraud claims = complex
  if (dispute.reason === 'fraud') return 'complex';

  // Simple reasons with little evidence
  if (evidenceCount < 3 && dispute.reason === 'payment_not_received') {
    return 'simple';
  }

  return 'moderate';
}

/**
 * Generate dispute report
 */
export function generateDisputeReport(
  dispute: DisputeResponse,
  trade: TradeResponse,
  resolution: DisputeResolution,
  evidence: any
): string {
  const report = `
DISPUTE RESOLUTION REPORT
========================

Dispute ID: ${dispute.id}
Trade ID: ${trade.id}
Amount: ${trade.cryptoAmount} ${trade.cryptocurrency}
Value: ${trade.fiatAmount} ${trade.fiatCurrency}

Reason: ${dispute.reason}
Opened By: ${dispute.openedBy}
Status: ${dispute.status}

ANALYSIS
--------
Decision: ${resolution.decision}
Confidence: ${resolution.confidence}%
Reason: ${resolution.reason}

ESCROW ACTION
-------------
Action: ${resolution.escrowAction}
${resolution.splitPercentage ? `Split: ${resolution.splitPercentage.buyer}% buyer / ${resolution.splitPercentage.seller}% seller` : ''}

${resolution.recommendedPenalty ? `
RECOMMENDED PENALTY
------------------
User: ${resolution.recommendedPenalty.userId}
Type: ${resolution.recommendedPenalty.type}
${resolution.recommendedPenalty.duration ? `Duration: ${resolution.recommendedPenalty.duration} days` : ''}
` : ''}

EVIDENCE SUMMARY
---------------
Total Evidence Items: ${evidence.buyerEvidence.length + evidence.sellerEvidence.length}
Buyer Evidence: ${evidence.buyerEvidence.length}
Seller Evidence: ${evidence.sellerEvidence.length}

Generated: ${new Date().toISOString()}
  `.trim();

  return report;
}
