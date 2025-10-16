# Marketing System - Usage Examples

## Overview

Complete marketing system with campaigns, leads, templates, and analytics.

## Quick Start

### 1. Create Email Template

```typescript
POST /api/v1/marketing/templates
{
  "name": "Welcome Email",
  "subject": "Welcome {{first_name}}!",
  "htmlContent": "<h1>Hi {{first_name}} {{last_name}}</h1><p>Welcome to our platform!</p><p><a href=\"{{unsubscribe_link}}\">Unsubscribe</a></p>",
  "textContent": "Hi {{first_name}} {{last_name}}\n\nWelcome to our platform!\n\nUnsubscribe: {{unsubscribe_link}}",
  "variables": {
    "allowed": ["first_name", "last_name", "email", "unsubscribe_link"],
    "required": ["first_name"]
  },
  "category": "promotional"
}
```

### 2. Import Leads from CSV

```typescript
POST /api/v1/marketing/leads/import
{
  "csvContent": "email,first_name,last_name,company,phone\ntest@example.com,John,Doe,Acme Inc,+1-555-0100"
}
```

### 3. Create Campaign

```typescript
POST /api/v1/marketing/campaigns
{
  "name": "Welcome Campaign",
  "description": "Welcome new users",
  "type": "email",
  "templateId": "template-uuid-here",
  "targetAudience": {
    "leadStatus": ["new"],
    "minScore": 0
  },
  "scheduleType": "immediate"
}
```

### 4. Launch Campaign

```typescript
POST /api/v1/marketing/campaigns/{campaignId}/launch
```

### 5. View Analytics

```typescript
GET /api/v1/marketing/campaigns/{campaignId}/analytics
```

## Lead Management

### Create Lead

```typescript
POST /api/v1/marketing/leads
{
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Inc",
  "jobTitle": "Marketing Director",
  "phone": "+1-555-0100",
  "source": "website",
  "tags": ["vip", "enterprise"],
  "customFields": {
    "industry": "technology",
    "employees": "100-500"
  }
}
```

### List Leads with Filters

```typescript
GET /api/v1/marketing/leads?status=new&minScore=50&page=1&limit=50
```

### Update Lead

```typescript
PATCH /api/v1/marketing/leads/{leadId}
{
  "status": "qualified",
  "score": 85,
  "tags": ["vip", "enterprise", "hot"]
}
```

### Convert Lead

```typescript
POST /api/v1/marketing/leads/{leadId}/convert
```

### View Lead Activity Timeline

```typescript
GET /api/v1/marketing/leads/{leadId}/activity
```

## Template Management

### List Templates

```typescript
GET /api/v1/marketing/templates?category=promotional
```

### Preview Template

```typescript
POST /api/v1/marketing/templates/{templateId}/preview
{
  "context": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "company": "Acme Inc"
  }
}
```

## Campaign Management

### List Campaigns

```typescript
GET /api/v1/marketing/campaigns?limit=50&offset=0
```

### Update Campaign

```typescript
PATCH /api/v1/marketing/campaigns/{campaignId}
{
  "name": "Updated Campaign Name",
  "description": "New description",
  "targetAudience": {
    "leadStatus": ["new", "contacted"],
    "minScore": 60
  }
}
```

### Pause Campaign

```typescript
POST /api/v1/marketing/campaigns/{campaignId}/pause
```

### Delete Campaign

```typescript
DELETE /api/v1/marketing/campaigns/{campaignId}
```

## Advanced Features

### Scheduled Campaign

```typescript
POST /api/v1/marketing/campaigns
{
  "name": "Weekly Newsletter",
  "type": "email",
  "templateId": "template-uuid",
  "targetAudience": {
    "leadStatus": ["qualified", "converted"]
  },
  "scheduleType": "scheduled",
  "scheduledAt": "2025-10-20T10:00:00Z"
}
```

### Recurring Campaign

```typescript
POST /api/v1/marketing/campaigns
{
  "name": "Monthly Update",
  "type": "email",
  "templateId": "template-uuid",
  "targetAudience": {
    "leadStatus": ["converted"]
  },
  "scheduleType": "recurring",
  "recurringPattern": {
    "frequency": "monthly",
    "interval": 1,
    "dayOfMonth": 1
  }
}
```

### Advanced Lead Filtering

```typescript
GET /api/v1/marketing/leads?status=qualified&minScore=70&maxScore=100&source=website&search=acme
```

### Lead Search

```typescript
GET /api/v1/marketing/leads/search?q=john
```

## Lead Scoring

Leads are automatically scored (0-100) based on:

1. **Data Completeness (0-30 points)**
   - Company: 10 points
   - Job title: 10 points
   - Phone: 10 points

2. **Engagement (0-40 points)**
   - Email opens: 5 points each (max 20)
   - Email clicks: 10 points each (max 20)

3. **Actions (0-30 points)**
   - Form submissions: 15 points each (max 30)

### Score Categories

- **Qualified** (80-100): Ready to convert
- **Hot** (60-79): High engagement
- **Warm** (40-59): Moderate engagement
- **Cold** (20-39): Low engagement
- **Unqualified** (0-19): Minimal data/engagement

## Template Variables

Supported variables:
- `{{first_name}}` - Lead's first name
- `{{last_name}}` - Lead's last name
- `{{email}}` - Lead's email
- `{{company}}` - Lead's company
- `{{job_title}}` - Lead's job title
- `{{unsubscribe_link}}` - Auto-generated unsubscribe link
- `{{custom.field_name}}` - Custom field values

Example:
```html
<p>Hi {{first_name}},</p>
<p>We noticed you work at {{company}} as {{job_title}}.</p>
<p>Your custom field: {{custom.industry}}</p>
<p><a href="{{unsubscribe_link}}">Unsubscribe</a></p>
```

## CSV Import Format

```csv
email,first_name,last_name,company,job_title,phone,tags
john@example.com,John,Doe,Acme Inc,CEO,+1-555-0100,"vip,enterprise"
jane@example.com,Jane,Smith,Tech Corp,CTO,+1-555-0200,"vip"
```

Required columns:
- `email` (mandatory)

Optional columns:
- `first_name`
- `last_name`
- `company`
- `job_title`
- `phone`
- `tags` (comma-separated)

## Analytics Response

```json
{
  "success": true,
  "data": {
    "campaign": {
      "id": "uuid",
      "name": "Welcome Campaign",
      "status": "completed",
      "startedAt": "2025-10-16T10:00:00Z",
      "completedAt": "2025-10-16T15:00:00Z"
    },
    "overall": {
      "totalSends": 1000,
      "delivered": 980,
      "opened": 490,
      "clicked": 98,
      "bounced": 20
    },
    "daily": [
      {
        "date": "2025-10-16",
        "totalSends": 1000,
        "delivered": 980,
        "opened": 490,
        "uniqueOpens": 450,
        "clicked": 98,
        "uniqueClicks": 85,
        "bounced": 20,
        "openRate": 50.00,
        "clickRate": 10.00,
        "bounceRate": 2.00
      }
    ]
  }
}
```

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common errors:
- `400` - Bad request (validation failed)
- `404` - Resource not found
- `500` - Server error

## Permissions

All marketing endpoints require:
- Authenticated session
- Role: `ceo`, `admin`, or `manager`

## Rate Limiting

CSV import is rate-limited to:
- Max 10,000 leads per import
- Max 5 imports per hour per tenant

## Best Practices

1. **Always test templates** with preview before using in campaigns
2. **Validate CSV files** before importing large datasets
3. **Monitor campaign analytics** regularly
4. **Use lead scoring** to prioritize follow-ups
5. **Keep unsubscribe links** in all promotional emails
6. **Tag leads** for better segmentation
7. **Clean up old campaigns** to improve performance
8. **Use custom fields** for industry-specific data

## Integration with CEO Dashboard

Marketing metrics are automatically integrated into the CEO dashboard:
- Total leads count
- Conversion rate
- Active campaigns count
- Top performing campaigns
