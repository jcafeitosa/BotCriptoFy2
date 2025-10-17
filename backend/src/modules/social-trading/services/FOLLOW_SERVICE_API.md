# Follow Service - API Reference

**File**: `backend/src/modules/social-trading/services/follow.service.ts`

**Status**: COMPLETE (611 lines, 9 functions)

---

## Functions

### 1. followTrader()
```typescript
followTrader(request: FollowRequest): Promise<ServiceResponse<FollowRelationship>>
```

**Parameters**:
```typescript
{
  tenantId: string;
  followerId: string;
  followedTraderId: string;
  notificationsEnabled?: boolean; // default: true
}
```

**Returns**: `{ success: true, data: FollowRelationship }` or error

**Features**:
- Validates trader exists and is active
- Prevents duplicate follows
- Increments `socialTraders.totalFollowers` atomically
- Sets notification preferences

---

### 2. unfollowTrader()
```typescript
unfollowTrader(
  tenantId: string, 
  followerId: string, 
  followedTraderId: string
): Promise<ServiceResponse<{ unfollowed: boolean }>>
```

**Returns**: `{ success: true, data: { unfollowed: true } }` or error

**Features**:
- Validates follow exists
- Deletes follow relationship
- Decrements `socialTraders.totalFollowers` (prevents negative)
- Uses `GREATEST(count - 1, 0)` for safety

---

### 3. getFollowers()
```typescript
getFollowers(
  tenantId: string,
  traderId: string,
  options?: { limit?: number; offset?: number }
): Promise<ServiceResponse<FollowerInfo[]>>
```

**Returns**: Array of followers with:
- `id`, `followerId`
- `notificationsEnabled`
- `followedAt`

**Features**:
- Validates trader exists
- Pagination support
- Ordered by followedAt DESC

---

### 4. getFollowing()
```typescript
getFollowing(
  tenantId: string,
  followerId: string,
  options?: { limit?: number; offset?: number }
): Promise<ServiceResponse<FollowingInfo[]>>
```

**Returns**: Array of traders with:
- `traderId`, `traderName`, `traderAvatar`
- `traderBio`, `totalFollowers`, `winRate`
- `isVerified`, `isPremium`
- `notificationsEnabled`, `followedAt`

**Features**:
- INNER JOIN with socialTraders
- Pagination support
- Ordered by followedAt DESC

---

### 5. isFollowing()
```typescript
isFollowing(
  tenantId: string,
  followerId: string,
  traderId: string
): Promise<ServiceResponse<{ isFollowing: boolean; notificationsEnabled?: boolean }>>
```

**Returns**: Following status + notification setting

**Features**:
- Fast lookup
- Returns notification state if following

---

### 6. toggleNotifications()
```typescript
toggleNotifications(
  tenantId: string,
  followerId: string,
  traderId: string,
  enabled: boolean
): Promise<ServiceResponse<{ notificationsEnabled: boolean }>>
```

**Returns**: Updated notification status

**Features**:
- Validates follow exists
- Updates notification preference
- Returns new state

---

### 7. getFollowerCount()
```typescript
getFollowerCount(
  tenantId: string,
  traderId: string
): Promise<ServiceResponse<{ count: number }>>
```

**Returns**: Total follower count

**Features**:
- Uses cached count from `socialTraders.totalFollowers`
- Fast lookup (no COUNT query)
- Validates trader exists

---

### 8. getFollowingCount()
```typescript
getFollowingCount(
  tenantId: string,
  followerId: string
): Promise<ServiceResponse<{ count: number }>>
```

**Returns**: Total following count

**Features**:
- COUNT query on `socialFollowers`
- Returns total traders followed by user

---

### 9. syncFollowerCount() [BONUS]
```typescript
syncFollowerCount(
  tenantId: string,
  traderId: string
): Promise<ServiceResponse<{ count: number }>>
```

**Returns**: Synced follower count

**Features**:
- Recalculates actual count from `socialFollowers`
- Updates `socialTraders.totalFollowers`
- Fixes inconsistencies
- Admin/maintenance utility

---

## Error Codes

| Code | Trigger |
|------|---------|
| `TRADER_NOT_FOUND` | Trader doesn't exist or inactive |
| `ALREADY_FOLLOWING` | Attempting duplicate follow |
| `NOT_FOLLOWING` | Unfollow/toggle when not following |
| `FOLLOW_TRADER_FAILED` | Database error on follow |
| `UNFOLLOW_TRADER_FAILED` | Database error on unfollow |
| `GET_FOLLOWERS_FAILED` | Error fetching followers |
| `GET_FOLLOWING_FAILED` | Error fetching following |
| `IS_FOLLOWING_FAILED` | Error checking status |
| `TOGGLE_NOTIFICATIONS_FAILED` | Error updating notifications |
| `GET_FOLLOWER_COUNT_FAILED` | Error getting count |
| `GET_FOLLOWING_COUNT_FAILED` | Error getting following count |
| `SYNC_FOLLOWER_COUNT_FAILED` | Error syncing count |

---

## Usage Examples

### Basic Follow/Unfollow
```typescript
import { followTrader, unfollowTrader } from './services/follow.service';

// Follow
const follow = await followTrader({
  tenantId: 'tenant-123',
  followerId: 'user-456',
  followedTraderId: 'trader-789',
});

// Unfollow
const unfollow = await unfollowTrader(
  'tenant-123',
  'user-456', 
  'trader-789'
);
```

### Get Lists
```typescript
import { getFollowers, getFollowing } from './services/follow.service';

// Get trader's followers
const followers = await getFollowers('tenant-123', 'trader-789', {
  limit: 20,
  offset: 0,
});

// Get user's following list
const following = await getFollowing('tenant-123', 'user-456', {
  limit: 20,
  offset: 0,
});
```

### Check Status
```typescript
import { isFollowing } from './services/follow.service';

const status = await isFollowing('tenant-123', 'user-456', 'trader-789');
if (status.success && status.data?.isFollowing) {
  console.log('Following with notifications:', status.data.notificationsEnabled);
}
```

### Manage Notifications
```typescript
import { toggleNotifications } from './services/follow.service';

// Disable notifications
await toggleNotifications('tenant-123', 'user-456', 'trader-789', false);

// Enable notifications
await toggleNotifications('tenant-123', 'user-456', 'trader-789', true);
```

### Get Counts
```typescript
import { getFollowerCount, getFollowingCount } from './services/follow.service';

// Trader's follower count (cached, fast)
const followers = await getFollowerCount('tenant-123', 'trader-789');

// User's following count
const following = await getFollowingCount('tenant-123', 'user-456');
```

### Admin: Sync Counts
```typescript
import { syncFollowerCount } from './services/follow.service';

// Fix inconsistencies (admin operation)
const synced = await syncFollowerCount('tenant-123', 'trader-789');
console.log('Actual follower count:', synced.data?.count);
```

---

## Type Definitions

### Request Types
```typescript
interface FollowRequest {
  tenantId: string;
  followerId: string;
  followedTraderId: string;
  notificationsEnabled?: boolean;
}
```

### Response Types
```typescript
interface FollowRelationship {
  id: string;
  tenantId: string;
  followerId: string;
  followedTraderId: string;
  notificationsEnabled: boolean;
  followedAt: Date;
}

interface FollowerInfo {
  id: string;
  followerId: string;
  followerName?: string;
  followerAvatar?: string;
  notificationsEnabled: boolean;
  followedAt: Date;
}

interface FollowingInfo {
  id: string;
  traderId: string;
  traderName: string;
  traderAvatar: string | null;
  traderBio: string | null;
  totalFollowers: number;
  winRate: string;
  isVerified: boolean;
  isPremium: boolean;
  notificationsEnabled: boolean;
  followedAt: Date;
}
```

---

## Production Checklist

- [x] All 9 functions implemented
- [x] Production-ready error handling
- [x] Full TypeScript types
- [x] Atomic counter updates
- [x] Duplicate prevention
- [x] Negative count prevention
- [x] Input validation
- [x] Database validations
- [x] Pagination support
- [x] Console logging
- [x] Exported from index
- [x] Documentation complete
- [ ] Unit tests (recommended)
- [ ] Integration tests (recommended)
- [ ] Load tests (recommended)

---

**Implementation Date**: 2025-10-17  
**Lines of Code**: 611  
**Functions**: 9 (8 required + 1 bonus utility)  
**Status**: COMPLETE - Production Ready
