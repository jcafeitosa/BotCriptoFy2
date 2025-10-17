# MMN (Marketing Multi-Nível) Module

Complete binary tree MMN system with spillover, multi-level commissions, and rank advancement.

## Features

- **Binary Tree Structure**: Left/right binary tree with automatic spillover
- **Spillover Algorithm**: Automatic placement using weaker leg or balanced strategy
- **Multi-Level Commissions**: Up to 10 levels of unilevel commissions
- **Binary Commissions**: Weekly/monthly binary calculations with carry-forward
- **Rank Advancement**: 10 rank levels (Distributor → Diamond)
- **Genealogy Tracking**: Complete upline/downline relationships
- **Volume Management**: Personal, left leg, and right leg volume tracking
- **Compression**: Dynamic tree compression for inactive members
- **Payouts**: Automated payout processing

## Database Tables

- `mmn_tree` - Binary tree structure with parent-child relationships
- `mmn_genealogy` - Complete genealogy for fast upline/downline queries
- `mmn_positions` - Available positions tracker for spillover
- `mmn_volumes` - Volume tracking by leg and period
- `mmn_commissions` - Multi-level commission records
- `mmn_ranks` - Rank achievements and history
- `mmn_payouts` - Payout transactions
- `mmn_config` - System configuration per tenant

## Binary Tree Structure

### Tree Layout

```
                    Root (Level 1)
                   /              \
            Left Child          Right Child
           (Level 2)             (Level 2)
          /        \            /        \
       L-L        L-R        R-L        R-R
    (Level 3)  (Level 3)  (Level 3)  (Level 3)
```

### Path Notation

- Root: `1`
- Left child: `1.1`
- Right child: `1.2`
- Left-Left: `1.1.1`
- Left-Right: `1.1.2`
- Right-Left: `1.2.1`
- Right-Right: `1.2.2`

## Spillover Strategies

### 1. Weaker Leg (Default)
Places new member under sponsor's weaker leg (leg with lower volume).

```typescript
// Sponsor has:
// - Left leg: $10,000
// - Right leg: $15,000
// New member → Placed on LEFT leg (weaker)
```

### 2. Balanced
Maintains tree balance by placing on leg with fewer members.

```typescript
// Sponsor has:
// - Left leg: 25 members
// - Right leg: 30 members
// New member → Placed on LEFT leg (fewer members)
```

### 3. Manual
Admin manually specifies placement position.

## Commission Types

### Binary Commission

Calculated based on weaker leg volume:

```typescript
// Weekly calculation:
// Left leg volume: $50,000
// Right leg volume: $35,000
// Weaker leg: $35,000
// Commission rate: 10%
// Commission: $3,500

// Carry forward: $15,000 (stronger leg excess)
```

### Unilevel Commission

Multi-level percentages on personal sales:

```typescript
const unilevelRates = [
  5,  // Level 1: 5%
  4,  // Level 2: 4%
  3,  // Level 3: 3%
  2,  // Level 4: 2%
  2,  // Level 5: 2%
  1,  // Level 6: 1%
  1,  // Level 7: 1%
  1,  // Level 8: 1%
  1,  // Level 9: 1%
  1,  // Level 10: 1%
];
```

### Matching Bonus

Leadership bonus on team commissions:

- Bronze: 5% matching
- Silver: 10% matching
- Gold: 15% matching
- Diamond: 25% matching

## Rank System

| Rank | Level | Personal Sales | Team Sales | Active Downline | Achievement Bonus |
|------|-------|----------------|------------|-----------------|-------------------|
| Distributor | 1 | $0 | $0 | 0 | - |
| Bronze | 2 | $500 | $2,000 | 3 | $100 |
| Silver | 3 | $1,000 | $10,000 | 5 | $500 |
| Gold | 4 | $2,500 | $50,000 | 10 | $2,500 |
| Platinum | 5 | $5,000 | $150,000 | 20 | $10,000 |
| Ruby | 6 | $10,000 | $500,000 | 50 | $25,000 |
| Emerald | 7 | $25,000 | $1,500,000 | 100 | $75,000 |
| Sapphire | 8 | $50,000 | $5,000,000 | 250 | $250,000 |
| Diamond | 9 | $100,000 | $15,000,000 | 500 | $750,000 |
| Blue Diamond | 10 | $250,000 | $50,000,000 | 1000 | $2,500,000 |

## Usage Examples

### Join MMN

```typescript
import { MmnTreeService } from '@/modules/mmn';

const member = await MmnTreeService.joinMmn({
  userId: 'user-123',
  tenantId: 'tenant-456',
  sponsorId: 'sponsor-789',
  preferredPosition: 'left', // optional
});

// Returns:
// {
//   id: 'mmn-abc',
//   parentId: 'sponsor-789',
//   position: 'left',
//   level: 2,
//   path: '1.1',
//   sponsorId: 'sponsor-789',
// }
```

### Get Downline

```typescript
import { MmnGenealogyService } from '@/modules/mmn';

const downline = await MmnGenealogyService.getDownline(
  memberId,
  maxLevels: 5
);

// Returns:
// [
//   { level: 1, members: [{ id, name, rank }] },
//   { level: 2, members: [...] },
//   ...
// ]
```

### Calculate Binary Commission

```typescript
import { MmnVolumeService } from '@/modules/mmn';

const calculation = await MmnVolumeService.calculateBinaryCommission(
  memberId,
  'weekly'
);

// Returns:
// {
//   leftVolume: 50000,
//   rightVolume: 35000,
//   weakerLeg: 35000,
//   commission: 3500,
//   leftCarryForward: 15000,
//   rightCarryForward: 0,
// }
```

### Check Rank Qualification

```typescript
import { MmnRankService } from '@/modules/mmn';

const result = await MmnRankService.checkRankAdvancement(memberId);

// Returns:
// {
//   qualified: true,
//   newRank: 'Gold',
//   currentRank: 'Silver',
//   achievementBonus: 2500,
// }
```

## Volume Calculation

### Personal Volume

Direct sales made by the member.

### Leg Volume

Sum of all downline personal volumes in that leg (left or right).

### Total Volume

`personalVolume + leftVolume + rightVolume`

### Example

```
Member A:
- Personal: $1,000
- Left Leg: $25,000 (sum of all left downline)
- Right Leg: $30,000 (sum of all right downline)
- Total: $56,000
```

## Genealogy System

The genealogy table stores ALL upline relationships for fast queries:

```sql
-- Member at path 1.1.2 has ancestors:
-- 1 (root)
-- 1.1 (parent)

INSERT INTO mmn_genealogy (member_id, ancestor_id, level, leg)
VALUES
  ('member-id', 'ancestor-1', 2, 'left'),
  ('member-id', 'ancestor-1.1', 1, 'right');
```

## Tree Compression

When members become inactive, compress tree:

1. Identify inactive members (no sales for 3+ months)
2. Move active downline up one level
3. Update genealogy relationships
4. Recalculate volumes

## Performance Optimizations

- **Indexed Paths**: Tree traversal using indexed path column
- **Cached Volumes**: Redis cache for volume calculations
- **Batch Processing**: Process commissions in batches
- **Materialized Genealogy**: Pre-calculated upline/downline
- **Async Volume Updates**: Background jobs for volume propagation

## Security & Compliance

- **Anti-Pyramid Scheme**: Requires real product sales
- **Qualification Rules**: Personal sales requirements
- **Audit Trail**: Complete commission history
- **Transparency**: Members see complete downline
- **Compliance Checks**: Automatic FTC compliance validation

## API Endpoints

### Member Management

- `POST /api/v1/mmn/join` - Join MMN
- `GET /api/v1/mmn/tree` - Get member tree
- `GET /api/v1/mmn/position` - Get member position
- `GET /api/v1/mmn/genealogy` - Get genealogy

### Downline/Upline

- `GET /api/v1/mmn/downline` - Get downline members
- `GET /api/v1/mmn/upline` - Get upline members
- `GET /api/v1/mmn/tree/visual` - Visual tree data

### Volumes & Commissions

- `GET /api/v1/mmn/volumes` - Get volume stats
- `GET /api/v1/mmn/commissions` - Get commissions
- `POST /api/v1/mmn/request-payout` - Request payout

### Admin

- `POST /api/v1/mmn/admin/compress` - Compress tree
- `POST /api/v1/mmn/admin/calculate-commissions` - Calculate commissions
- `GET /api/v1/mmn/admin/all` - Get all members

## Testing

```bash
# Run MMN tests
bun test src/modules/mmn

# Test spillover algorithm
bun test src/modules/mmn/utils/spillover-algorithm.test.ts

# Test binary calculations
bun test src/modules/mmn/services/volume.service.test.ts
```

## Migration

The MMN module includes database migrations:

```bash
# Generate migration
bun run drizzle-kit generate

# Run migration
bun run drizzle-kit migrate
```

## Future Enhancements

- [ ] Matrix plan (3x7, 4x7, etc.)
- [ ] Unilevel plan
- [ ] Hybrid binary-unilevel
- [ ] Real-time tree visualization
- [ ] Mobile app integration
- [ ] AI-powered placement recommendations
- [ ] Blockchain integration for transparency

## License

Proprietary - BotCriptoFy2
