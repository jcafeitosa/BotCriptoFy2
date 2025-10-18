# Social Trading Module

Social trading platform with copy trading, leaderboards, performance analytics, and trading signals.

## Features

### Copy Trading
- ✅ Automated trade mirroring
- ✅ Customizable copy ratios
- ✅ Risk management (stop loss, take profit)
- ✅ Daily loss limits
- ✅ Pair filtering
- ✅ Trade size limits
- ✅ Order execution via core trading service

### Leaderboards
- ✅ Multi-period rankings (daily, weekly, monthly, yearly, all-time)
- ✅ Composite scoring algorithm
- ✅ ROI-based rankings
- ✅ Risk-adjusted metrics
- ✅ Volume-weighted scores

### Performance Analytics
- ✅ Sharpe Ratio
- ✅ Sortino Ratio
- ✅ Maximum Drawdown
- ✅ Calmar Ratio
- ✅ Win Rate
- ✅ Profit Factor
- ✅ Volatility
- ✅ ROI tracking

### Social Features
- ✅ Trader profiles
- ✅ Follow/Unfollow system
- ✅ Social feed (posts, insights, analysis)
- ✅ Trading signals
- ✅ Strategy marketplace

## Database Schema

### Tables (9)
- `social_traders` - Trader profiles
- `social_followers` - Follow relationships
- `social_posts` - Social feed posts
- `social_copy_settings` - Copy trading configs
- `social_copied_trades` - Copied trades history
- `social_leaderboard` - Rankings
- `social_strategies` - Shared strategies
- `social_signals` - Trading signals
- `social_performance` - Performance metrics

## API Endpoints

### Traders (~40 endpoints)
```
POST   /api/v1/social/traders              Create trader profile
GET    /api/v1/social/traders              List traders
GET    /api/v1/social/traders/:id          Get trader profile
```

### Copy Trading
```
POST   /api/v1/social/copy/settings        Create copy settings
GET    /api/v1/social/copy/settings        Get copy settings
PATCH  /api/v1/social/copy/settings/:id    Update settings
POST   /api/v1/social/copy/start           Start copying
POST   /api/v1/social/copy/pause           Pause copying
POST   /api/v1/social/copy/stop            Stop copying
```

### Leaderboard
```
GET    /api/v1/social/leaderboard          Get leaderboard
```

### Analytics
```
GET    /api/v1/social/analytics/traders/:id/performance    Get performance
GET    /api/v1/social/analytics/traders/:id/equity-curve  Get equity curve
GET    /api/v1/social/analytics/traders/:id/risk-metrics  Get risk metrics
```

## Algorithms

### Copy Trading Engine
Automated trade mirroring with:
- Copy ratio adjustments
- Amount validation
- Pair filtering
- Risk management
- Daily loss protection

### Leaderboard Ranker
Composite scoring:
- ROI (35%)
- Consistency/Win Rate (25%)
- Risk-adjusted returns (25%)
- Trading volume (15%)

### Risk Calculator
Advanced metrics:
- Sharpe Ratio: Risk-adjusted returns
- Sortino Ratio: Downside risk focus
- Max Drawdown: Peak-to-trough decline
- Calmar Ratio: Return vs drawdown
- Volatility: Return standard deviation

### Performance Tracker
P&L tracking:
- Trade profit calculation
- Win/loss categorization
- Average win/loss
- Profit factor
- Equity curve building

## Usage Examples

### Create Trader Profile
```typescript
POST /api/v1/social/traders
{
  "displayName": "Crypto Master",
  "bio": "10 years of trading experience",
  "specialties": ["crypto", "forex"],
  "strategyType": "day_trading"
}
```

### Start Copy Trading
```typescript
POST /api/v1/social/copy/settings
{
  "traderId": "trader-uuid",
  "copyRatio": 0.5,
  "maxAmountPerTrade": 1000,
  "maxDailyLoss": 500,
  "copiedPairs": ["BTC/USDT", "ETH/USDT"],
  "stopLossPercentage": 2,
  "takeProfitPercentage": 5
}
```

### Get Leaderboard
```typescript
GET /api/v1/social/leaderboard?period=monthly&limit=50

Response:
[
  {
    "rank": 1,
    "traderId": "uuid",
    "traderName": "Crypto Master",
    "totalProfit": "15000.00",
    "roi": "25.50",
    "winRate": "72.50",
    "totalTrades": 150,
    "score": "92.50"
  }
]
```

### Get Performance Analytics
```typescript
GET /api/v1/social/analytics/traders/:id/performance?period=monthly

Response:
{
  "period": "monthly",
  "totalProfit": "5000.00",
  "netProfit": "4500.00",
  "roi": "15.50",
  "winRate": "68.00",
  "sharpeRatio": "2.15",
  "sortinoRatio": "3.20",
  "maxDrawdown": "8.50",
  "totalTrades": 45,
  "winningTrades": 31
}
```

## Risk Metrics Explained

### Sharpe Ratio
- > 1: Good
- > 2: Very Good
- > 3: Excellent
- Formula: (Return - RiskFreeRate) / StdDev

### Sortino Ratio
- Similar to Sharpe but focuses on downside risk
- Higher = better risk-adjusted returns

### Max Drawdown
- Maximum peak-to-trough decline
- Lower = better risk management
- < 10%: Excellent
- < 20%: Good
- > 30%: High risk

### Calmar Ratio
- Annual return / Max drawdown
- Higher = better
- > 3: Excellent
- > 1: Good

## Security

- ✅ Multi-tenant isolation
- ✅ Copy trading limits
- ✅ Risk management controls
- ✅ Performance verification
- ✅ Fraud detection

## License

Proprietary - BotCriptoFy2
