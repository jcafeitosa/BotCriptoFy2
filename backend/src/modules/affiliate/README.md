# Affiliate System Module

Complete affiliate marketing system with tracking, commissions, and payouts.

## Features

- **Affiliate Registration**: Complete profile management with KYC
- **Referral Tracking**: Track clicks, signups, and conversions
- **Commission Calculation**: Automatic commission calculation with tier bonuses
- **Payout Management**: Stripe Connect integration for payments
- **Tier System**: Bronze, Silver, Gold, Platinum with progressive benefits
- **Analytics Dashboard**: Real-time performance metrics
- **Goal Tracking**: Set and track affiliate goals

## Database Tables

- `affiliate_profiles` - Affiliate account information
- `affiliate_referrals` - Referral tracking
- `affiliate_clicks` - Click tracking with UTM parameters
- `affiliate_conversions` - Conversion tracking
- `affiliate_commissions` - Commission records
- `affiliate_payouts` - Payout transactions
- `affiliate_tiers` - Tier configuration
- `affiliate_goals` - Goal tracking

## Services

### AffiliateProfileService
Manages affiliate profiles and registration.

```typescript
import { AffiliateProfileService } from '@/modules/affiliate';

// Create affiliate profile
const profile = await AffiliateProfileService.createProfile({
  userId: 'user-123',
  tenantId: 'tenant-456',
  company: 'Crypto Influencers Inc',
  niche: 'crypto',
  audienceSize: 50000,
});

// Approve affiliate
await AffiliateProfileService.approveAffiliate(profile.id, tenantId, approvedBy);
```

### AffiliateReferralService
Tracks referrals and clicks.

```typescript
import { AffiliateReferralService } from '@/modules/affiliate';

// Track click
const click = await AffiliateReferralService.trackClick({
  affiliateCode: 'AFF-ABC12345',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  utmSource: 'instagram',
  utmCampaign: 'summer-promo',
});

// Create referral
const referral = await AffiliateReferralService.createReferral({
  affiliateCode: 'AFF-ABC12345',
  referredUserId: 'user-789',
});
```

### AffiliateCommissionService
Calculates and manages commissions.

```typescript
import { AffiliateCommissionService } from '@/modules/affiliate';

// Create conversion with commission
const { conversion, commission } = await AffiliateCommissionService.createConversion({
  affiliateId: 'aff-123',
  referralId: 'ref-456',
  userId: 'user-789',
  conversionType: 'first_payment',
  orderValue: 299.99,
  commissionRate: 20, // 20%
});
```

### AffiliatePayoutService
Manages payouts to affiliates.

```typescript
import { AffiliatePayoutService } from '@/modules/affiliate';

// Request payout
const payout = await AffiliatePayoutService.requestPayout(affiliateId, {
  amount: 500.00,
  method: 'stripe',
  notes: 'Monthly payout request',
});

// Process payout (admin)
await AffiliatePayoutService.processPayout(payout.id);
await AffiliatePayoutService.completePayout(payout.id, stripeTransferId);
```

## Commission Calculation

The system supports multiple commission types:

### Percentage Commission
```typescript
import { calculateCommission } from '@/modules/affiliate';

const result = calculateCommission(
  1000, // orderValue
  15,   // 15% commission rate
  tier  // Optional tier for bonuses
);
// Returns: { commissionAmount: 150, type: 'percentage', totalAmount: 150 }
```

### Tier Bonuses
Affiliates in higher tiers receive bonus commissions:

- **Bronze**: 15% base rate
- **Silver**: 18% base rate + 2% bonus
- **Gold**: 22% base rate + 3% bonus
- **Platinum**: 25% base rate + 5% bonus

### Holding Period
Commissions are held for anti-fraud protection:

- Standard orders: 30 days
- High-value (>$5,000): 45 days
- High-value (>$10,000): 60 days
- Returning customers: 50% reduced holding

## Tier System

Affiliates progress through tiers based on performance:

| Tier | Min Conversions | Min Revenue | Commission Rate | Bonus |
|------|----------------|-------------|-----------------|-------|
| Bronze | 0 | $0 | 15% | 0% |
| Silver | 10 | $1,000 | 18% | 2% |
| Gold | 50 | $10,000 | 22% | 3% |
| Platinum | 200 | $50,000 | 25% | 5% |

## Referral Links

### Standard Referral Link
```
https://app.botcriptofy.com?ref=AFF-ABC12345
```

### With UTM Parameters
```
https://app.botcriptofy.com?ref=AFF-ABC12345&utm_source=instagram&utm_campaign=summer
```

## Analytics

The system provides comprehensive analytics:

- **Performance Metrics**: Clicks, signups, conversions, revenue
- **Conversion Rates**: Click-to-signup, signup-to-conversion
- **Top Referrals**: Best performing referred users
- **Source Analysis**: Performance by traffic source
- **Device Breakdown**: Mobile vs desktop performance
- **Time Series**: Trends over time

## Integration with Subscriptions

The affiliate system integrates seamlessly with the subscription module:

1. User clicks affiliate link → Click tracked
2. User signs up → Referral created
3. User subscribes to paid plan → Conversion created
4. Commission calculated based on tier
5. Commission enters holding period
6. After holding period → Available for payout

## Security

- **Fraud Detection**: Holding periods for new customers
- **IP Tracking**: Detect suspicious click patterns
- **KYC Integration**: Tax ID validation
- **Stripe Connect**: Secure payouts via Stripe

## Performance

- **Redis Caching**: Stats and metrics cached for 10 minutes
- **Indexed Queries**: All queries use appropriate indexes
- **Batch Processing**: Payouts processed in batches
- **Async Operations**: Non-blocking commission calculations

## Future Enhancements

- [ ] Multi-level affiliate system (MLM)
- [ ] Custom commission rules per affiliate
- [ ] Automated fraud detection
- [ ] Real-time notifications
- [ ] Affiliate onboarding wizard
- [ ] Performance leaderboards
- [ ] Referral contests

## License

Proprietary - BotCriptoFy2
