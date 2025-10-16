# Sales CRM Module

Complete sales management system with contacts, deals, pipeline, activities, forecasting, and performance tracking.

## 📊 Overview

The Sales CRM module provides a comprehensive solution for managing the entire sales process, from lead conversion to deal closure and revenue forecasting.

### Key Features

- **Contact Management**: Unified contact database for people and companies
- **Deal Pipeline**: Customizable sales pipeline with drag-and-drop stages
- **Activity Tracking**: Log calls, emails, meetings, tasks, and demos
- **Sales Forecasting**: AI-powered revenue predictions with multiple methodologies
- **Performance Tracking**: Sales targets, win rates, and leaderboards
- **Lead Integration**: Seamless conversion from marketing leads

## 🗄️ Database Schema

### Tables

1. **contacts** - Customer and company contact information
2. **deals** - Sales opportunities in the pipeline
3. **pipeline_stages** - Customizable pipeline stages
4. **activities** - Sales activities (calls, meetings, etc.)
5. **notes** - Quick notes for contacts and deals
6. **sales_targets** - Sales goals and quotas
7. **sales_forecasts** - Revenue predictions

### Key Relationships

```
leads (Marketing) → contacts → deals → pipeline_stages
                              ↓
                         activities + notes
```

## 🚀 Quick Start

### 1. Convert Lead to Contact

```bash
POST /api/v1/sales/contacts/from-lead/:leadId
```

```typescript
import { ContactsService } from '@/modules/sales';

const contact = await ContactsService.createFromLead(leadId, userId, tenantId);
```

### 2. Create a Deal

```bash
POST /api/v1/sales/deals

{
  "contactId": "uuid",
  "stageId": "uuid",
  "title": "Enterprise License Deal",
  "value": 50000,
  "currency": "USD",
  "probability": 75,
  "expectedCloseDate": "2025-12-31"
}
```

### 3. Move Deal Through Pipeline

```bash
POST /api/v1/sales/deals/:id/move

{
  "stageId": "new-stage-id",
  "probability": 90
}
```

### 4. Generate Revenue Forecast

```bash
GET /api/v1/sales/forecast?period=monthly&methodology=weighted_pipeline
```

## 📈 Analytics & Reporting

### Win Rate Analysis

```bash
GET /api/v1/sales/analytics/win-rate?userId=user-id&from=2025-01-01&to=2025-12-31
```

**Response:**
```json
{
  "totalDeals": 45,
  "won": 32,
  "lost": 13,
  "winRate": 71.11,
  "averageDealValue": 28500,
  "averageSalesCycle": 34,
  "averageTimeToClose": 28
}
```

### Sales Cycle Analysis

```bash
GET /api/v1/sales/analytics/sales-cycle
```

**Response:**
```json
{
  "averageDays": 34,
  "medianDays": 28,
  "shortestDeal": 7,
  "longestDeal": 120,
  "byStage": {}
}
```

### Pipeline View (Kanban)

```bash
GET /api/v1/sales/deals/pipeline/view
```

**Response:**
```json
{
  "stages": [
    {
      "id": "stage-1",
      "name": "Qualification",
      "deals": [...],
      "totalValue": 125000,
      "count": 5
    }
  ],
  "totalPipelineValue": 450000,
  "weightedValue": 337500,
  "totalDeals": 18
}
```

## 🎯 Forecasting Methodologies

### 1. Weighted Pipeline (Default)

Uses deal probability to calculate weighted revenue:

```
Weighted Revenue = Σ (deal.value × deal.probability / 100)
```

### 2. Moving Average

Averages the last N periods:

```typescript
const forecast = await ForecastingService.generateForecastForPeriod(
  'monthly',
  tenantId,
  userId,
  'moving_average'
);
```

### 3. Linear Regression

Fits a linear trend to historical data:

```typescript
const forecast = await ForecastingService.generateForecastForPeriod(
  'quarterly',
  tenantId,
  userId,
  'linear_regression'
);
```

### 4. Historical

Uses last period's actual revenue:

```typescript
const forecast = await ForecastingService.generateForecastForPeriod(
  'yearly',
  tenantId,
  userId,
  'historical'
);
```

## 📊 Sales Targets & Performance

### Create Target

```bash
POST /api/v1/sales/targets

{
  "userId": "user-id",
  "period": "monthly",
  "startDate": "2025-11-01",
  "endDate": "2025-11-30",
  "targetAmount": 100000
}
```

### Update Progress

```bash
POST /api/v1/sales/targets/update-progress?userId=user-id
```

### View Leaderboard

```bash
GET /api/v1/sales/leaderboard
```

**Response:**
```json
[
  {
    "userId": "user-1",
    "userName": "John Smith",
    "achieved": 125000,
    "targetAmount": 100000,
    "achievementRate": 125,
    "deals": { "total": 20, "won": 15, "lost": 3, "open": 2 },
    "rank": 1
  }
]
```

## 🔌 API Endpoints

### Contacts (9 endpoints)

- `POST /api/v1/sales/contacts` - Create contact
- `POST /api/v1/sales/contacts/from-lead/:leadId` - Convert lead
- `GET /api/v1/sales/contacts/list` - List contacts
- `GET /api/v1/sales/contacts/:id` - Get contact
- `PATCH /api/v1/sales/contacts/:id` - Update contact
- `DELETE /api/v1/sales/contacts/:id` - Delete contact
- `GET /api/v1/sales/contacts/search/query` - Search contacts
- `POST /api/v1/sales/contacts/merge/:sourceId/:targetId` - Merge duplicates
- `GET /api/v1/sales/contacts/:id/timeline` - Get timeline

### Deals (9 endpoints)

- `POST /api/v1/sales/deals` - Create deal
- `GET /api/v1/sales/deals/list` - List deals
- `GET /api/v1/sales/deals/:id` - Get deal
- `PATCH /api/v1/sales/deals/:id` - Update deal
- `DELETE /api/v1/sales/deals/:id` - Delete deal
- `POST /api/v1/sales/deals/:id/move` - Move to stage
- `POST /api/v1/sales/deals/:id/win` - Mark won
- `POST /api/v1/sales/deals/:id/lose` - Mark lost
- `GET /api/v1/sales/deals/pipeline/view` - Pipeline Kanban

### Pipeline (5 endpoints)

- `POST /api/v1/sales/pipeline/stages` - Create stage
- `GET /api/v1/sales/pipeline/stages` - List stages
- `PATCH /api/v1/sales/pipeline/stages/:id` - Update stage
- `DELETE /api/v1/sales/pipeline/stages/:id` - Delete stage
- `POST /api/v1/sales/pipeline/stages/reorder` - Reorder stages

### Activities (7 endpoints)

- `POST /api/v1/sales/activities` - Create activity
- `GET /api/v1/sales/activities/list` - List activities
- `GET /api/v1/sales/activities/:id` - Get activity
- `PATCH /api/v1/sales/activities/:id` - Update activity
- `POST /api/v1/sales/activities/:id/complete` - Complete activity
- `DELETE /api/v1/sales/activities/:id` - Delete activity
- `GET /api/v1/sales/activities/upcoming/list` - Upcoming activities

### Analytics (7 endpoints)

- `GET /api/v1/sales/forecast` - Revenue forecast
- `GET /api/v1/sales/forecast/weighted-pipeline` - Weighted pipeline value
- `GET /api/v1/sales/analytics/win-rate` - Win rate analysis
- `GET /api/v1/sales/analytics/sales-cycle` - Sales cycle analysis
- `POST /api/v1/sales/targets` - Create target
- `GET /api/v1/sales/targets` - List targets
- `POST /api/v1/sales/targets/update-progress` - Update progress
- `GET /api/v1/sales/targets/:userId/performance` - User performance
- `GET /api/v1/sales/leaderboard` - Performance leaderboard

**Total: 37 endpoints**

## 🧪 Testing

Run tests:

```bash
bun test src/modules/sales/__tests__/
```

**Coverage:**
- Functions: 87.97%
- Lines: 54.59%
- Tests: 41 passing

## 🔐 Security & Permissions

### Role-Based Access

- **CEO**: Full access to all sales data
- **Admin**: Full access to all sales data
- **Sales Manager**: Full access, can manage team targets
- **Sales Rep**: Access to own contacts, deals, and activities

### Multi-Tenancy

All data is strictly isolated by `tenant_id`. Users can only access data from their active organization.

### Data Validation

- Email format validation
- Phone number sanitization
- Deal value must be > 0
- Probability must be 0-100
- Date validations

## 📦 Cache Strategy

- **Contacts**: 5min TTL
- **Deals**: 2min TTL (frequent updates)
- **Pipeline**: 2min TTL
- **Activities**: 3min TTL
- **Targets**: 15min TTL
- **Forecasts**: 30min TTL

Cache is invalidated on all write operations.

## 🔗 Integration with Marketing

### Lead Conversion Flow

1. Lead reaches "qualified" status in Marketing module
2. Sales rep calls `POST /api/v1/sales/contacts/from-lead/:leadId`
3. Contact is created with lead data
4. Lead status updated to "converted"
5. Lead history preserved via `lead_id` foreign key

### Data Mapping

```typescript
Lead → Contact
├─ email → email
├─ firstName → firstName
├─ lastName → lastName
├─ company → companyName
├─ phone → phone
├─ jobTitle → jobTitle
├─ tags → tags
└─ customFields → customFields
```

## 📊 CEO Dashboard Integration

Add these metrics to CEO dashboard:

```typescript
import { ForecastingService, TargetsService } from '@/modules/sales';

// Pipeline metrics
const weightedValue = await ForecastingService.getWeightedPipeline(tenantId);

// Win rate
const winRate = await ForecastingService.getWinRateAnalysis(null, tenantId);

// Sales cycle
const cycle = await ForecastingService.getSalesCycle(tenantId);

// Leaderboard
const topPerformers = await TargetsService.getAllUserPerformances(tenantId);
```

## 🛠️ Utilities

### Forecasting Algorithm

```typescript
import { generateForecast, calculateTrend } from '@/modules/sales/utils';

const forecast = generateForecast(openDeals, historicalRevenue, 'weighted_pipeline');
const trend = calculateTrend(currentRevenue, previousRevenue);
```

### Pipeline Calculator

```typescript
import {
  calculatePipelineValue,
  calculateWeightedPipelineValue,
  calculateWinRate,
  calculateSalesCycle,
  identifyStaleDeals,
} from '@/modules/sales/utils';

const totalValue = calculatePipelineValue(deals);
const weightedValue = calculateWeightedPipelineValue(deals);
const winRate = calculateWinRate(allDeals);
const avgCycle = calculateSalesCycle(closedDeals);
const staleDeals = identifyStaleDeals(openDeals, 30);
```

## 📝 Notes

- All timestamps are stored in UTC
- Soft delete implemented for contacts and deals
- Deal value stored as DECIMAL(15,2) for precision
- Currency support (default: USD)
- Custom fields support for extensibility
- Tags support for categorization

## 🚀 Future Enhancements

- [ ] Deal history tracking (stage transitions)
- [ ] Email integration (Gmail, Outlook)
- [ ] Calendar integration
- [ ] Document attachments
- [ ] Task automation
- [ ] Workflow triggers
- [ ] Custom reporting
- [ ] Mobile app support
