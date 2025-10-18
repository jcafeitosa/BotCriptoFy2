# Test Fix Plan - 245 Failures

## Summary
- **Current**: 1038 pass, 245 fail, 6 errors
- **Target**: 1283 pass, 0 fail, 0 errors

## Categorized Failures

### 1. Logger Export Issues (3 modules affected)
**Files with SyntaxError: Export named 'logError' not found**
- `src/modules/backtest/engine/backtest-engine.test.ts`
- `src/modules/users/__tests__/user.routes.integration.test.ts`
- `src/modules/affiliate/__tests__/affiliate.public.routes.smoke.test.ts`

**Fix**: Check logger.ts exports and update imports

### 2. Expense Service Tests (~24 failures)
**File**: `src/modules/financial/services/__tests__/expense.service.test.ts`
**Issue**: Database mock not properly configured
**Tests failing**: All expense service tests

### 3. Sentiment Module Tests (~20 failures)
**Files**:
- `trending-topics.service.test.ts` (~8 failures)
- `sentiment-local.service.test.ts` (~3 failures)
- `price-correlation.service.test.ts` (~3 failures)
- `sentiment-aggregator.service.test.ts` (~10 failures)

### 4. Wallet Service Tests (~5 failures)
**Files**:
- `export-csv.test.ts` (1 failure)
- `wallet.service.integration.test.ts` (4 failures)

**Issue**: Missing methods (exportTransactionsCsv, setWalletLock, createSavingsGoal, createWithdrawal)

### 5. Risk Module Tests (~3 failures)
**Files**:
- `risk.integration.test.ts` (1 failure - onConflictDoNothing issue)
- `risk-lock.integration.test.ts` (2 failures - TTL and stats)

### 6. Market Data Pipeline Tests (~6 failures)
**File**: `src/modules/market-data/websocket/__tests__/pipeline.test.ts`
**Issue**: Mock setup for pipeline initialization

### 7. Tenant Routes Tests (3 failures)
**File**: `src/modules/tenants/__tests__/tenant.routes.integration.test.ts`
**Issue**: Route integration issues

### 8. Two-Factor Auth Test (1 failure)
**File**: `src/modules/auth/services/__tests__/two-factor.service.test.ts`
**Test**: "isTwoFactorEnabled returns false when no record"
**Issue**: Expected false, received true

### 9. Remaining scattered failures (~180 failures)
Need to identify and categorize after fixing major groups

## Execution Order

1. ✅ Fix logger exports (will fix 3 modules)
2. ✅ Fix expense service tests (24 tests)
3. ✅ Fix wallet service tests (5 tests)
4. ✅ Fix two-factor auth test (1 test)
5. ✅ Fix sentiment module tests (20 tests)
6. ✅ Fix risk module tests (3 tests)
7. ✅ Fix market data pipeline tests (6 tests)
8. ✅ Fix tenant routes tests (3 tests)
9. ✅ Fix remaining failures (~180 tests)

## Progress Tracking
- [ ] Phase 1: Logger exports (3 modules)
- [ ] Phase 2: Expense service (24 tests)
- [ ] Phase 3: Wallet service (5 tests)
- [ ] Phase 4: Two-factor auth (1 test)
- [ ] Phase 5: Sentiment module (20 tests)
- [ ] Phase 6: Risk module (3 tests)
- [ ] Phase 7: Market data pipeline (6 tests)
- [ ] Phase 8: Tenant routes (3 tests)
- [ ] Phase 9: Remaining failures (180 tests)
