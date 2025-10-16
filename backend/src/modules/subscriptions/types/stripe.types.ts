import type Stripe from 'stripe';

/**
 * Billing period types
 */
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';

/**
 * Stripe checkout session creation data
 */
export interface StripeCheckoutSessionData {
  planId: string;
  tenantId: string;
  billingPeriod: BillingPeriod;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  trialDays?: number;
}

/**
 * Stripe customer portal session data
 */
export interface StripePortalSessionData {
  customerId: string;
  returnUrl?: string;
}

/**
 * Stripe subscription sync data
 */
export interface StripeSubscriptionSync {
  stripeSubscriptionId: string;
  status: Stripe.Subscription.Status;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
}

/**
 * Webhook event types we handle
 */
export type StripeWebhookEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed';

/**
 * Webhook handler result
 */
export interface WebhookHandlerResult {
  success: boolean;
  message: string;
  data?: unknown;
}
