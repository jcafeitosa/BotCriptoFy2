# CEO Dashboard Module

Executive dashboard module with aggregated metrics and KPIs for CEO/admin users.

## Overview

This module provides comprehensive executive-level insights by aggregating data from all other modules (subscriptions, users, financial, etc.). It includes real-time KPIs, customizable dashboards, and intelligent alerting.

## Features

- **Complete Dashboard Data**: Aggregated metrics across all business areas
- **Real-time KPIs**: MRR, ARR, CAC, LTV, churn rate, user growth, etc.
- **Active Alerts**: Critical notifications requiring executive attention
- **Revenue Metrics**: Detailed revenue breakdown by plan, billing period, and trends
- **User Metrics**: User growth, activity, retention, and churn analysis
- **Subscription Metrics**: Plan distribution, upgrades, downgrades, trial conversion
- **Financial Health**: CAC, LTV ratio, margins, cash flow, runway
- **System Health**: Performance, uptime, storage, API usage
- **Personalized Configuration**: Customizable dashboard layout, themes, and alert thresholds

## Database Schema

### Tables

1. **ceo_dashboard_configs** - Dashboard personalization per CEO user
2. **ceo_kpis** - Custom KPI definitions
3. **ceo_alerts** - Critical alerts and notifications

## API Endpoints

All endpoints require authentication and CEO/admin role.

### GET `/api/v1/ceo/dashboard`
Get complete dashboard data with all metrics.

**Query Parameters:**
- `dateRange` (optional): `7d`, `30d` (default), `90d`, `1y`
- `startDate` (optional): Custom start date (ISO format)
- `endDate` (optional): Custom end date (ISO format)
- `includeComparison` (optional): Include previous period comparison

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-09-16T00:00:00Z",
      "end": "2025-10-16T00:00:00Z",
      "days": 30
    },
    "revenue": {
      "mrr": 50000,
      "arr": 600000,
      "mrrGrowth": 15.5,
      "arpu": 250,
      "revenueByPlan": [...]
    },
    "users": {
      "totalUsers": 1500,
      "activeUsers": 1050,
      "userGrowth": 12.3,
      "churnRate": 5.2
    },
    "subscriptions": {
      "activeSubscriptions": 200,
      "subscriptionsByPlan": [...],
      "trialConversionRate": 75
    },
    "financial": {
      "cac": 150,
      "ltv": 1800,
      "ltvCacRatio": 12,
      "grossMargin": 80
    },
    "system": {
      "avgResponseTime": 125,
      "errorRate": 0.5,
      "uptime": 99.9
    },
    "activeAlerts": [...],
    "criticalAlertsCount": 2,
    "generatedAt": "2025-10-16T18:00:00Z",
    "cacheExpiresAt": "2025-10-16T18:05:00Z"
  }
}
```

### GET `/api/v1/ceo/kpis`
Get real-time key performance indicators.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mrr",
      "name": "MRR",
      "displayName": "Monthly Recurring Revenue",
      "category": "revenue",
      "metric": "mrr",
      "value": 50000,
      "previousValue": 43500,
      "changePercent": 14.9,
      "unit": "currency",
      "trend": "up",
      "color": "green",
      "icon": "dollar-sign"
    },
    // ... more KPIs
  ]
}
```

### GET `/api/v1/ceo/alerts`
Get active alerts requiring attention.

**Query Parameters:**
- `severity` (optional): `critical`, `warning`, `info`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert-id",
      "type": "churn_spike",
      "severity": "critical",
      "title": "Churn Rate Spike Detected",
      "message": "Churn rate increased to 8.5% (threshold: 5%)",
      "metric": "churn_rate",
      "currentValue": 8.5,
      "previousValue": 4.2,
      "changePercent": 102.4,
      "threshold": 5,
      "category": "users",
      "status": "active",
      "actionUrl": "/dashboard/users/retention",
      "actionLabel": "View Details",
      "createdAt": "2025-10-16T17:30:00Z"
    }
  ],
  "count": 1
}
```

### GET `/api/v1/ceo/revenue`
Get detailed revenue metrics.

**Query Parameters:**
- `dateRange` (optional): `7d`, `30d` (default), `90d`, `1y`

### GET `/api/v1/ceo/users`
Get user metrics and analytics.

**Query Parameters:**
- `dateRange` (optional): `7d`, `30d` (default), `90d`, `1y`

### GET `/api/v1/ceo/subscriptions`
Get subscription metrics.

**Query Parameters:**
- `dateRange` (optional): `7d`, `30d` (default), `90d`, `1y`

### POST `/api/v1/ceo/config`
Save dashboard configuration and preferences.

**Body:**
```json
{
  "displayName": "Executive Dashboard",
  "theme": "dark",
  "defaultDateRange": "30d",
  "refreshInterval": 300,
  "currency": "BRL",
  "emailAlerts": true,
  "pushAlerts": true,
  "alertThresholds": {
    "revenueDropPercent": 10,
    "churnRatePercent": 5,
    "activeUsersDropPercent": 15,
    "errorRatePercent": 5
  }
}
```

## Caching

All metrics are cached for 5 minutes (300 seconds) using Redis to ensure fast response times. Cache keys are namespaced by tenant and date range.

## Testing

### Prerequisites

1. Server running: `bun run dev`
2. Database migrated: `bun run db:push`
3. User authenticated with CEO/admin role
4. Active organization/tenant selected

### Testing with cURL

```bash
# Get complete dashboard (requires authentication token)
curl -X GET "http://localhost:3000/api/v1/ceo/dashboard?dateRange=30d" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get KPIs
curl -X GET "http://localhost:3000/api/v1/ceo/kpis" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get active alerts
curl -X GET "http://localhost:3000/api/v1/ceo/alerts?severity=critical" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Save configuration
curl -X POST "http://localhost:3000/api/v1/ceo/config" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "dark",
    "defaultDateRange": "30d",
    "refreshInterval": 300
  }'
```

### Testing via Swagger UI

1. Open http://localhost:3000/swagger
2. Navigate to "CEO Dashboard" section
3. Click "Authorize" and enter your Bearer token
4. Try each endpoint with different parameters

## Architecture

### Service Layer (`services/ceo.service.ts`)

- Aggregates data from multiple modules
- Implements caching strategy (5-minute TTL)
- Calculates KPIs and metrics
- Manages dashboard configurations
- Generates alerts based on thresholds

### Routes Layer (`routes/ceo.routes.ts`)

- Validates authentication and authorization
- Parses and validates request parameters
- Formats responses
- Handles errors gracefully

### Types Layer (`types/ceo.types.ts`)

- Comprehensive TypeScript types
- Type-safe API contracts
- Shared interfaces across the module

### Schema Layer (`schema/ceo.schema.ts`)

- Drizzle ORM table definitions
- Database schema with proper indexes
- Type inference for database operations

## Performance Considerations

1. **Caching**: 5-minute Redis cache reduces database load
2. **Parallel Queries**: Metrics fetched in parallel using `Promise.all`
3. **Indexed Queries**: Database queries use proper indexes
4. **Aggregation**: Pre-aggregated data where possible
5. **Pagination**: Alerts limited to recent 20-50 items

## Security

- All routes require authentication (session guard)
- CEO/admin role required for all endpoints
- Tenant isolation enforced in all queries
- Input validation using Elysia's type system
- SQL injection prevention via Drizzle ORM

## Future Enhancements

- [ ] Export dashboard data (PDF, Excel)
- [ ] Custom KPI definitions via UI
- [ ] Alert rules engine
- [ ] Scheduled reports via email
- [ ] Comparative analytics (YoY, MoM)
- [ ] Forecasting and predictions
- [ ] Team performance metrics
- [ ] Integration with BI tools

## Files

```
backend/src/modules/ceo/
├── index.ts                 # Module exports (18 lines)
├── schema/
│   └── ceo.schema.ts       # Database schema (181 lines)
├── types/
│   └── ceo.types.ts        # TypeScript types (324 lines)
├── services/
│   └── ceo.service.ts      # Business logic (830 lines)
└── routes/
    └── ceo.routes.ts       # API endpoints (520 lines)

Total: 1,873 lines of code
```

## Dependencies

- `elysia` - Web framework
- `drizzle-orm` - ORM for database operations
- `better-auth` - Authentication
- `redis` - Caching
- `winston` - Logging

## Module Stats

- **Files Created**: 5
- **Total Lines**: 1,873
- **API Endpoints**: 7
- **Database Tables**: 3
- **Cache TTL**: 5 minutes
- **Role Required**: CEO/admin
