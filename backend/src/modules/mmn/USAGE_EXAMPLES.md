# MMN System - Usage Examples

Complete usage examples for the MMN (Marketing Multi-Nível) module.

## 1. Joining the MMN

### Basic Join with Spillover

```typescript
import { MmnTreeService } from '@/modules/mmn';

// New member joins under sponsor
const member = await MmnTreeService.joinMmn({
  userId: 'user-123',
  tenantId: 'tenant-456',
  sponsorId: 'sponsor-user-789',
  preferredPosition: 'left', // optional - spillover will find best position
});

console.log('Member ID:', member.id);
console.log('Position:', member.position); // 'left' or 'right'
console.log('Level:', member.level); // Tree depth
console.log('Path:', member.path); // e.g., '1.1.2.1'
console.log('Parent ID:', member.parentId);
```

### Join with Manual Placement (Admin)

```typescript
// Admin places member in specific position
const member = await MmnTreeService.joinMmn({
  userId: 'user-123',
  tenantId: 'tenant-456',
  sponsorId: 'sponsor-user-789',
  preferredPosition: 'right',
  // This will be placed exactly under sponsor's right leg
});
```

## 2. Tree Navigation

### Get Member's Tree Position

```typescript
const position = await MmnTreeService.getPosition('member-id');

console.log(position);
// {
//   id: 'member-id',
//   userId: 'user-123',
//   parentId: 'parent-id',
//   sponsorId: 'sponsor-id',
//   position: 'left',
//   level: 3,
//   path: '1.1.2',
//   leftChild: null,
//   rightChild: { id: '...', ... }
// }
```

### Get Complete Downline

```typescript
import { MmnGenealogyService } from '@/modules/mmn';

const downline = await MmnGenealogyService.getDownline(
  'member-id',
  5 // max 5 levels deep
);

console.log(downline);
// [
//   {
//     level: 1,
//     members: [
//       { id: 'child-1', name: 'John Doe', rank: 'Bronze', leg: 'left' },
//       { id: 'child-2', name: 'Jane Smith', rank: 'Silver', leg: 'right' }
//     ]
//   },
//   {
//     level: 2,
//     members: [...]
//   },
//   ...
// ]
```

### Get Upline Path

```typescript
const upline = await MmnGenealogyService.getUpline('member-id');

console.log(upline);
// [
//   { id: 'parent-id', name: 'Parent', level: 1, rank: 'Gold' },
//   { id: 'grandparent-id', name: 'Grandparent', level: 2, rank: 'Diamond' },
//   ...
// ]
```

## 3. Volume Management

### Record Personal Sale

```typescript
import { MmnVolumeService } from '@/modules/mmn';

// Member makes a sale
const volume = await MmnVolumeService.addPersonalVolume({
  memberId: 'member-id',
  personalVolume: 299.99,
  propagateToUpline: true, // Update upline leg volumes
});

console.log('Personal Volume Added:', volume.personalVolume);
console.log('Total Volume:', volume.totalVolume);
```

### Get Member Volumes

```typescript
const volumes = await MmnVolumeService.getMemberVolumes(
  'member-id',
  'weekly'
);

console.log(volumes);
// {
//   personalVolume: 1500.00,
//   leftVolume: 12500.00,
//   rightVolume: 18750.00,
//   totalVolume: 32750.00,
//   leftCarryForward: 0.00,
//   rightCarryForward: 6250.00  // Excess from stronger leg
// }
```

## 4. Commission Calculation

### Calculate Binary Commission

```typescript
import { MmnCommissionService } from '@/modules/mmn';

// Weekly binary commission calculation
const calculation = await MmnCommissionService.calculateBinaryCommission(
  'member-id',
  'weekly'
);

console.log(calculation);
// {
//   leftVolume: 50000,
//   rightVolume: 35000,
//   weakerLeg: 35000,        // Commission based on weaker leg
//   strongerLeg: 50000,
//   commissionableVolume: 35000,
//   commission: 3500,         // 10% of weaker leg
//   leftCarryForward: 15000,  // Excess carries to next week
//   rightCarryForward: 0
// }
```

### Calculate Unilevel Commission

```typescript
// When downline makes a sale
const commissions = await MmnCommissionService.calculateUnilevelCommission({
  sourceId: 'downline-member-id', // Who made the sale
  volume: 500.00,
  maxLevels: 10,
});

console.log(commissions);
// [
//   { memberId: 'parent', level: 1, rate: 5, amount: 25.00 },
//   { memberId: 'grandparent', level: 2, rate: 4, amount: 20.00 },
//   { memberId: 'great-gp', level: 3, rate: 3, amount: 15.00 },
//   ...
// ]
```

### Get Member Commissions

```typescript
const commissions = await MmnCommissionService.getMemberCommissions(
  'member-id',
  {
    type: 'binary',
    period: 'weekly',
    status: ['approved', 'paid'],
  }
);

const totalEarned = commissions.reduce(
  (sum, c) => sum + parseFloat(c.amount),
  0
);

console.log('Total Binary Commissions:', totalEarned);
```

## 5. Rank Advancement

### Check Rank Qualification

```typescript
import { MmnRankService } from '@/modules/mmn';

const qualification = await MmnRankService.checkRankAdvancement('member-id');

if (qualification.qualified) {
  console.log('Congratulations! Rank Advanced!');
  console.log('Previous Rank:', qualification.currentRank); // 'Silver'
  console.log('New Rank:', qualification.newRank); // 'Gold'
  console.log('Achievement Bonus:', qualification.achievementBonus); // $2,500
  console.log('Monthly Bonus:', qualification.monthlyBonus); // $500/month
}
```

### Get Rank History

```typescript
const history = await MmnRankService.getRankHistory('member-id');

console.log(history);
// [
//   {
//     rank: 'Gold',
//     level: 4,
//     achievedAt: '2024-08-15',
//     achievementBonus: 2500,
//     isActive: true
//   },
//   {
//     rank: 'Silver',
//     level: 3,
//     achievedAt: '2024-06-01',
//     achievementBonus: 500,
//     isActive: false
//   },
//   ...
// ]
```

## 6. Tree Visualization

### Get Visual Tree Data

```typescript
import { MmnTreeService } from '@/modules/mmn';

const treeData = await MmnTreeService.getVisualTree('member-id', 3);

console.log(treeData);
// {
//   id: 'member-id',
//   name: 'Member Name',
//   position: 'root',
//   level: 1,
//   rank: 'Gold',
//   personalVolume: 1500,
//   leftVolume: 25000,
//   rightVolume: 30000,
//   children: [
//     {
//       id: 'left-child',
//       name: 'Left Child',
//       position: 'left',
//       level: 2,
//       rank: 'Silver',
//       children: [...]
//     },
//     {
//       id: 'right-child',
//       name: 'Right Child',
//       position: 'right',
//       level: 2,
//       rank: 'Bronze',
//       children: [...]
//     }
//   ]
// }
```

## 7. Spillover Strategies

### Weaker Leg Spillover

```typescript
import { MmnConfig } from '@/modules/mmn';

// Configure weaker leg spillover
await MmnConfig.updateConfig('tenant-id', {
  spilloverEnabled: true,
  spilloverStrategy: 'weaker_leg',
});

// When new member joins:
// - System checks sponsor's leg volumes
// - Places under weaker leg automatically
// - Left: $25,000, Right: $30,000
// - New member → Placed on LEFT leg
```

### Balanced Spillover

```typescript
// Configure balanced spillover
await MmnConfig.updateConfig('tenant-id', {
  spilloverEnabled: true,
  spilloverStrategy: 'balanced',
});

// When new member joins:
// - System checks member counts in each leg
// - Left: 25 members, Right: 30 members
// - New member → Placed on LEFT leg
```

## 8. Genealogy Queries

### Find All Descendants

```typescript
const descendants = await MmnGenealogyService.getAllDescendants(
  'member-id'
);

console.log('Total Downline:', descendants.length);
console.log('Active Members:', descendants.filter(d => d.isActive).length);
```

### Find Members in Specific Leg

```typescript
const leftLeg = await MmnGenealogyService.getLegMembers(
  'member-id',
  'left'
);

console.log('Left Leg Members:', leftLeg.length);

const leftLegVolume = leftLeg.reduce(
  (sum, m) => sum + m.personalVolume,
  0
);

console.log('Left Leg Volume:', leftLegVolume);
```

### Find Direct Referrals

```typescript
const referrals = await MmnGenealogyService.getDirectReferrals('member-id');

console.log('Direct Referrals:', referrals.length);
console.log(referrals);
// [
//   { id: 'ref-1', name: 'John', position: 'left', rank: 'Bronze' },
//   { id: 'ref-2', name: 'Jane', position: 'right', rank: 'Silver' },
//   ...
// ]
```

## 9. Payouts

### Request Payout

```typescript
import { MmnPayoutService } from '@/modules/mmn';

// Member requests payout
const payout = await MmnPayoutService.requestPayout('member-id', {
  amount: 1500.00,
  method: 'stripe',
});

console.log('Payout ID:', payout.id);
console.log('Status:', payout.status); // 'pending'
console.log('Net Amount:', payout.netAmount); // After fees
console.log('Commission IDs:', payout.commissionIds);
```

### List Payouts

```typescript
const payouts = await MmnPayoutService.listPayouts(
  {
    memberId: 'member-id',
    status: ['completed'],
    dateFrom: new Date('2024-01-01'),
  },
  { page: 1, limit: 50 }
);

const totalPaid = payouts.data.reduce(
  (sum, p) => sum + parseFloat(p.amount),
  0
);

console.log('Total Paid Out:', totalPaid);
```

## 10. Admin Operations

### Process Pending Commissions

```typescript
// Calculate all pending binary commissions (weekly cron job)
await MmnCommissionService.processWeeklyBinaryCommissions('tenant-id');

console.log('Weekly commissions calculated and created');
```

### Tree Compression

```typescript
import { MmnTreeService } from '@/modules/mmn';

// Compress tree (remove inactive members)
const result = await MmnTreeService.compressTree('tenant-id', {
  inactiveDays: 90, // Members with no sales for 90+ days
  preserveActive: true, // Keep active downline
});

console.log('Members Removed:', result.removed);
console.log('Members Relocated:', result.relocated);
console.log('Tree Compressed:', result.success);
```

### Get System Stats

```typescript
const stats = await MmnTreeService.getStats('tenant-id');

console.log(stats);
// {
//   totalMembers: 5432,
//   activeMembers: 3891,
//   totalVolume: 1250000,
//   totalCommissions: 125000,
//   averageDepth: 7.2,
//   fillRate: 82.5  // Percentage of tree filled
// }
```

## 11. Configuration Management

### Update MMN Config

```typescript
const config = await MmnConfig.updateConfig('tenant-id', {
  binaryCommissionRate: 12.00, // 12% of weaker leg
  maxPayoutPercentage: 60.00, // Max 60% of personal sales as commission
  weakerLegPercentage: 100.00, // 100% of weaker leg
  unilevelLevels: 10,
  unilevelRates: [5, 4, 3, 2, 2, 1, 1, 1, 1, 1],
  personalSalesRequired: 150.00, // $150 minimum monthly sales
  minimumActiveDownline: 2, // Need 2 active referrals
  spilloverEnabled: true,
  spilloverStrategy: 'weaker_leg',
  minimumPayout: 100.00,
  paymentFrequency: 'weekly',
});

console.log('Config updated:', config);
```

## 12. Real-World Scenario

### Complete Member Journey

```typescript
// 1. Member joins
const member = await MmnTreeService.joinMmn({
  userId: 'user-123',
  tenantId: 'tenant-456',
  sponsorId: 'sponsor-789',
});

// 2. Member makes personal sale
await MmnVolumeService.addPersonalVolume({
  memberId: member.id,
  personalVolume: 500.00,
  propagateToUpline: true,
});

// 3. Member recruits 2 people
const leftChild = await MmnTreeService.joinMmn({
  userId: 'user-456',
  tenantId: 'tenant-456',
  sponsorId: 'user-123',
  preferredPosition: 'left',
});

const rightChild = await MmnTreeService.joinMmn({
  userId: 'user-789',
  tenantId: 'tenant-456',
  sponsorId: 'user-123',
  preferredPosition: 'right',
});

// 4. Children make sales (generates unilevel commissions for member)
await MmnVolumeService.addPersonalVolume({
  memberId: leftChild.id,
  personalVolume: 300.00,
  propagateToUpline: true,
});

await MmnVolumeService.addPersonalVolume({
  memberId: rightChild.id,
  personalVolume: 400.00,
  propagateToUpline: true,
});

// 5. Weekly binary calculation runs
const binary = await MmnCommissionService.calculateBinaryCommission(
  member.id,
  'weekly'
);

console.log('Binary Commission:', binary.commission);
// Based on weaker leg volume

// 6. Check rank qualification
const rank = await MmnRankService.checkRankAdvancement(member.id);

if (rank.qualified) {
  console.log('Rank advanced to:', rank.newRank);
  console.log('Achievement bonus:', rank.achievementBonus);
}

// 7. Request payout
if (binary.commission >= 100) {
  const payout = await MmnPayoutService.requestPayout(member.id, {
    amount: binary.commission,
    method: 'stripe',
  });
  console.log('Payout requested:', payout.id);
}
```

## Integration with Subscription Module

```typescript
// When user subscribes (webhook handler)
import { MmnVolumeService } from '@/modules/mmn';

// Check if user is MMN member
const member = await MmnTreeService.getMemberByUserId(userId);

if (member) {
  // Add subscription value as personal volume
  await MmnVolumeService.addPersonalVolume({
    memberId: member.id,
    personalVolume: subscriptionAmount,
    propagateToUpline: true,
  });

  // This will:
  // 1. Update member's personal volume
  // 2. Update all upline leg volumes
  // 3. Trigger unilevel commission calculations
  // 4. Count towards rank requirements
}
```

## License

Proprietary - BotCriptoFy2
