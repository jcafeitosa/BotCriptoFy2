# Affiliate System - Usage Examples

Complete usage examples for the Affiliate module.

## 1. Affiliate Registration & Approval

### Register as Affiliate

```typescript
import { AffiliateProfileService } from '@/modules/affiliate';

// User registers as affiliate
const profile = await AffiliateProfileService.createProfile({
  userId: 'user-123',
  tenantId: 'tenant-456',
  company: 'Crypto Influencers Inc',
  website: 'https://cryptoinfluencers.com',
  niche: 'cryptocurrency',
  audienceSize: 50000,
  socialMedia: {
    instagram: '@cryptoking',
    youtube: 'CryptoKingChannel',
    twitter: '@cryptoking',
  },
  bio: 'Crypto educator with 50k+ followers',
  payoutMethod: 'stripe',
  payoutEmail: 'payments@cryptoinfluencers.com',
  taxId: '12.345.678/0001-90',
});

console.log('Affiliate Code:', profile.affiliateCode); // AFF-ABC12345
console.log('Referral Link:', profile.referralLink);
// https://app.botcriptofy.com?ref=AFF-ABC12345
```

### Admin Approval

```typescript
// Admin approves affiliate
const approved = await AffiliateProfileService.approveAffiliate(
  profile.id,
  'tenant-456',
  'admin-user-id'
);

console.log('Status:', approved.status); // 'active'
console.log('Approved at:', approved.approvedAt);
```

## 2. Click Tracking

### Track Landing Page Click

```typescript
import { AffiliateReferralService } from '@/modules/affiliate';

// User clicks affiliate link
// https://app.botcriptofy.com?ref=AFF-ABC12345&utm_source=instagram&utm_campaign=summer-promo

const click = await AffiliateReferralService.trackClick({
  affiliateCode: 'AFF-ABC12345',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
  refererUrl: 'https://instagram.com',
  landingPage: 'https://app.botcriptofy.com/pricing',
  country: 'BR',
  city: 'São Paulo',
  utmSource: 'instagram',
  utmMedium: 'social',
  utmCampaign: 'summer-promo',
  deviceType: 'mobile',
  browser: 'Safari',
  os: 'iOS',
});

console.log('Click tracked:', click.id);
```

## 3. Referral Creation

### User Signs Up

```typescript
// User signs up after clicking affiliate link
const referral = await AffiliateReferralService.createReferral({
  affiliateCode: 'AFF-ABC12345',
  referredUserId: 'new-user-789',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  refererUrl: 'https://instagram.com',
  utmSource: 'instagram',
  utmCampaign: 'summer-promo',
});

console.log('Referral Status:', referral.status); // 'signed_up'
console.log('Signed up at:', referral.signedUpAt);
```

## 4. Conversion Tracking

### User Subscribes to Paid Plan

```typescript
import { AffiliateCommissionService } from '@/modules/affiliate';

// User subscribes to Pro plan ($299/month)
const { conversion, commission } = await AffiliateCommissionService.createConversion({
  affiliateId: 'aff-profile-id',
  referralId: 'referral-id',
  userId: 'new-user-789',
  conversionType: 'first_payment',
  subscriptionPlanId: 'pro-plan-id',
  orderValue: 299.99,
  commissionRate: 20, // 20% commission
  stripePaymentId: 'pi_xxxxxxxxxxxxx',
  stripeSubscriptionId: 'sub_xxxxxxxxxxxxx',
});

console.log('Conversion:', conversion);
console.log('Commission Amount:', commission.amount); // $60.00 (20% of $299.99)
console.log('Commission Status:', commission.status); // 'pending'
console.log('Hold Until:', commission.holdUntil); // 30 days from now
```

## 5. Commission Calculation with Tiers

### Bronze Tier (15%)

```typescript
import { calculateCommission } from '@/modules/affiliate';

// Bronze affiliate earns 15%
const bronzeTier = {
  name: 'Bronze',
  level: 1,
  commissionRate: '15.00',
  bonusRate: '0.00',
};

const result = calculateCommission(1000, 15, bronzeTier);

console.log(result);
// {
//   commissionAmount: 150,
//   commissionRate: 15,
//   type: 'percentage',
//   totalAmount: 150
// }
```

### Gold Tier (22% + 3% Bonus)

```typescript
const goldTier = {
  name: 'Gold',
  level: 3,
  commissionRate: '22.00',
  bonusRate: '3.00',
};

const result = calculateCommission(1000, 22, goldTier);

console.log(result);
// {
//   commissionAmount: 220,
//   commissionRate: 22,
//   type: 'bonus',
//   bonusAmount: 30,
//   tierBonus: 30,
//   totalAmount: 250  // 22% + 3% = 25% total
// }
```

## 6. Payout Request

### Affiliate Requests Payout

```typescript
import { AffiliatePayoutService } from '@/modules/affiliate';

// Affiliate requests payout via Stripe
const payout = await AffiliatePayoutService.requestPayout(
  'aff-profile-id',
  {
    amount: 500.00,
    method: 'stripe',
    notes: 'Monthly payout for August 2024',
  }
);

console.log('Payout ID:', payout.id);
console.log('Status:', payout.status); // 'pending'
console.log('Fee:', payout.fee); // $12.50 (2.5%)
console.log('Net Amount:', payout.netAmount); // $487.50
console.log('Commissions:', payout.commissionIds); // ['comm-1', 'comm-2', ...]
```

### PIX Payout (Brazil)

```typescript
const pixPayout = await AffiliatePayoutService.requestPayout(
  'aff-profile-id',
  {
    amount: 1000.00,
    method: 'pix',
    bankInfo: {
      pixKey: '+5511999999999', // Phone number as PIX key
    },
    notes: 'PIX payout request',
  }
);
```

### Bank Transfer Payout

```typescript
const bankPayout = await AffiliatePayoutService.requestPayout(
  'aff-profile-id',
  {
    amount: 2000.00,
    method: 'bank_transfer',
    bankInfo: {
      bankName: 'Banco do Brasil',
      accountNumber: '12345-6',
      routingNumber: '001',
    },
  }
);
```

## 7. Analytics & Stats

### Get Affiliate Stats

```typescript
import { AffiliateAnalyticsService } from '@/modules/affiliate';

const stats = await AffiliateAnalyticsService.getStats(
  'aff-profile-id',
  'last_30_days'
);

console.log(stats);
// {
//   totalClicks: 1250,
//   totalSignups: 85,
//   totalConversions: 23,
//   conversionRate: 1.84,
//   totalEarned: 6897.50,
//   totalPaid: 5000.00,
//   pendingBalance: 1897.50,
//   averageOrderValue: 299.89,
//   topReferrals: [...],
//   clicksBySource: { instagram: 450, youtube: 320, ... },
//   conversionsByMonth: [...]
// }
```

### Get Click Stats

```typescript
import { AffiliateReferralService } from '@/modules/affiliate';

const clickStats = await AffiliateReferralService.getClickStats(
  'aff-profile-id',
  30 // last 30 days
);

console.log(clickStats);
// {
//   totalClicks: 1250,
//   uniqueClicks: 892,
//   clicksBySource: [
//     { source: 'instagram', count: 450 },
//     { source: 'youtube', count: 320 },
//     { source: 'direct', count: 280 },
//     ...
//   ],
//   clicksByDevice: [
//     { device: 'mobile', count: 750 },
//     { device: 'desktop', count: 400 },
//     { device: 'tablet', count: 100 }
//   ]
// }
```

## 8. Tier Management

### Check Tier Upgrade

```typescript
import { AffiliateTierService } from '@/modules/affiliate';

// System automatically checks tier eligibility
const upgrade = await AffiliateTierService.checkTierUpgrade('aff-profile-id');

if (upgrade) {
  console.log('Tier Upgraded!');
  console.log('Previous:', upgrade.previousTier); // 'Silver'
  console.log('New:', upgrade.newTier); // 'Gold'
  console.log('New Commission Rate:', upgrade.benefits.commissionRate); // 22%
  console.log('Bonus Rate:', upgrade.benefits.bonusRate); // 3%
}
```

## 9. Listing & Filtering

### List All Affiliates

```typescript
import { AffiliateProfileService } from '@/modules/affiliate';

const result = await AffiliateProfileService.listAffiliates(
  {
    status: ['active'],
    tierName: ['Gold', 'Platinum'],
    minEarned: 5000,
    minConversions: 20,
  },
  'tenant-456',
  {
    page: 1,
    limit: 50,
    sortBy: 'totalEarned',
    sortOrder: 'desc',
  }
);

console.log('Total:', result.pagination.total);
console.log('Pages:', result.pagination.totalPages);
console.log('Affiliates:', result.data);
```

### List Referrals

```typescript
const referrals = await AffiliateReferralService.listReferrals(
  {
    affiliateId: 'aff-profile-id',
    status: ['converted'],
    dateFrom: new Date('2024-08-01'),
    dateTo: new Date('2024-08-31'),
    utmCampaign: 'summer-promo',
  },
  { page: 1, limit: 50 }
);

console.log('Total Conversions:', referrals.pagination.total);
```

### List Commissions

```typescript
const commissions = await AffiliateCommissionService.listCommissions(
  {
    affiliateId: 'aff-profile-id',
    status: ['approved'],
    dateFrom: new Date('2024-08-01'),
    minAmount: 50,
  },
  { page: 1, limit: 50 }
);

const totalEarned = commissions.data.reduce(
  (sum, c) => sum + parseFloat(c.amount),
  0
);

console.log('Total Earned:', totalEarned);
```

## 10. Custom Tracking Links

### Generate Custom Link

```typescript
import { generateTrackingLink } from '@/modules/affiliate';

const customLink = generateTrackingLink(
  'https://app.botcriptofy.com',
  'AFF-ABC12345',
  {
    source: 'email',
    medium: 'newsletter',
    campaign: 'august-special',
    content: 'button-cta',
  }
);

console.log(customLink);
// https://app.botcriptofy.com?ref=AFF-ABC12345&utm_source=email&utm_medium=newsletter&utm_campaign=august-special&utm_content=button-cta
```

## 11. Admin Operations

### Process Pending Payouts

```typescript
import { AffiliatePayoutService } from '@/modules/affiliate';

// Admin processes payout
const payout = await AffiliatePayoutService.processPayout('payout-id');

console.log('Status:', payout.status); // 'processing'

// After Stripe transfer completes
const completed = await AffiliatePayoutService.completePayout(
  'payout-id',
  'tr_xxxxxxxxxxxxx' // Stripe transfer ID
);

console.log('Status:', completed.status); // 'completed'
console.log('Completed at:', completed.completedAt);
```

### Suspend Affiliate

```typescript
const suspended = await AffiliateProfileService.suspendAffiliate(
  'aff-profile-id',
  'tenant-456',
  'Violation of terms - fraudulent activity detected'
);

console.log('Status:', suspended.status); // 'suspended'
```

## Integration with Subscriptions Module

```typescript
// On subscription creation (webhooks/stripe)
import { AffiliateReferralService, AffiliateCommissionService } from '@/modules/affiliate';

// 1. Check if user has referral
const referral = await AffiliateReferralService.getReferralByUserId(userId);

if (referral && referral.status === 'signed_up') {
  // 2. Mark referral as converted
  await AffiliateReferralService.markAsConverted(
    referral.id,
    subscriptionPlanId,
    firstPaymentAmount
  );

  // 3. Create conversion and commission
  const { conversion, commission } = await AffiliateCommissionService.createConversion({
    affiliateId: referral.affiliateId,
    referralId: referral.id,
    userId,
    conversionType: 'first_payment',
    subscriptionPlanId,
    orderValue: firstPaymentAmount,
    commissionRate: 20, // From affiliate tier
    stripePaymentId,
    stripeSubscriptionId,
  });

  console.log('Commission created:', commission.amount);
}
```

## License

Proprietary - BotCriptoFy2
