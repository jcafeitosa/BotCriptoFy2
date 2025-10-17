/**
 * Referral Code Generator
 * Generates unique affiliate referral codes
 */

import { customAlphabet } from 'nanoid';

/**
 * Nanoid alphabet without ambiguous characters
 * Excludes: 0, O, I, l, 1
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate unique referral code generator
 */
const generateId = customAlphabet(ALPHABET, 8);

/**
 * Generate affiliate code
 * Format: AFF-XXXXXXXX
 */
export const generateAffiliateCode = (): string => {
  return `AFF-${generateId()}`;
};

/**
 * Generate referral link
 */
export const generateReferralLink = (baseUrl: string, affiliateCode: string): string => {
  // Remove trailing slash from baseUrl
  const cleanUrl = baseUrl.replace(/\/$/, '');

  // Create referral link with query parameter
  return `${cleanUrl}?ref=${affiliateCode}`;
};

/**
 * Generate tracking link with UTM parameters
 */
export const generateTrackingLink = (
  baseUrl: string,
  affiliateCode: string,
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  }
): string => {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams();

  // Add referral code
  params.append('ref', affiliateCode);

  // Add UTM parameters if provided
  if (utmParams) {
    if (utmParams.source) params.append('utm_source', utmParams.source);
    if (utmParams.medium) params.append('utm_medium', utmParams.medium);
    if (utmParams.campaign) params.append('utm_campaign', utmParams.campaign);
    if (utmParams.content) params.append('utm_content', utmParams.content);
    if (utmParams.term) params.append('utm_term', utmParams.term);
  }

  return `${cleanUrl}?${params.toString()}`;
};

/**
 * Validate affiliate code format
 */
export const validateAffiliateCode = (code: string): boolean => {
  // Format: AFF-XXXXXXXX
  const regex = /^AFF-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
  return regex.test(code);
};

/**
 * Extract affiliate code from URL
 */
export const extractAffiliateCode = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const ref = urlObj.searchParams.get('ref');

    if (ref && validateAffiliateCode(ref)) {
      return ref;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Extract UTM parameters from URL
 */
export const extractUtmParams = (url: string): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
} => {
  try {
    const urlObj = new URL(url);

    return {
      utmSource: urlObj.searchParams.get('utm_source') || undefined,
      utmMedium: urlObj.searchParams.get('utm_medium') || undefined,
      utmCampaign: urlObj.searchParams.get('utm_campaign') || undefined,
      utmContent: urlObj.searchParams.get('utm_content') || undefined,
      utmTerm: urlObj.searchParams.get('utm_term') || undefined,
    };
  } catch {
    return {};
  }
};

/**
 * Slugify text for URL-safe strings
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generate custom vanity code (for premium affiliates)
 */
export const generateVanityCode = (name: string, maxLength: number = 15): string => {
  const slug = slugify(name);
  const truncated = slug.substring(0, maxLength);

  // Add random suffix if needed for uniqueness
  if (truncated.length < 4) {
    const suffix = customAlphabet(ALPHABET, 4)();
    return `${truncated}-${suffix}`;
  }

  return truncated;
};
