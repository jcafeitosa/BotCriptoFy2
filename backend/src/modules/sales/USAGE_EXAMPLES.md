# Sales CRM - Usage Examples

Complete guide with curl examples for all Sales CRM endpoints.

## 🔐 Authentication

All requests require authentication. Include session token in cookies or headers.

```bash
# Login first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

## 📇 Contacts

### Create Contact (Person)

```bash
curl -X POST http://localhost:3000/api/v1/sales/contacts \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "type": "person",
    "email": "john.smith@company.com",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+1-555-0123",
    "mobile": "+1-555-0124",
    "jobTitle": "CTO",
    "department": "Technology",
    "companyName": "Acme Corp",
    "linkedinUrl": "https://linkedin.com/in/johnsmith",
    "website": "https://acme.com",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "country": "USA",
      "zip": "94105"
    },
    "tags": ["enterprise", "tech", "decision-maker"],
    "customFields": {
      "company_size": "500+",
      "industry": "SaaS"
    }
  }'
```

### Create Contact from Lead

```bash
curl -X POST http://localhost:3000/api/v1/sales/contacts/from-lead/LEAD_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### List Contacts

```bash
# All contacts
curl -X GET http://localhost:3000/api/v1/sales/contacts/list \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by type
curl -X GET "http://localhost:3000/api/v1/sales/contacts/list?type=company&limit=20&offset=0" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by owner
curl -X GET "http://localhost:3000/api/v1/sales/contacts/list?ownerId=USER_UUID" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by tags
curl -X GET "http://localhost:3000/api/v1/sales/contacts/list?tags=enterprise,tech" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Search
curl -X GET "http://localhost:3000/api/v1/sales/contacts/list?search=acme" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Get Contact

```bash
curl -X GET http://localhost:3000/api/v1/sales/contacts/CONTACT_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Update Contact

```bash
curl -X PATCH http://localhost:3000/api/v1/sales/contacts/CONTACT_UUID \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "phone": "+1-555-9999",
    "jobTitle": "VP of Engineering",
    "tags": ["enterprise", "tech", "decision-maker", "champion"]
  }'
```

### Search Contacts

```bash
curl -X GET "http://localhost:3000/api/v1/sales/contacts/search/query?q=john" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Merge Contacts

```bash
curl -X POST http://localhost:3000/api/v1/sales/contacts/merge/SOURCE_UUID/TARGET_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Get Contact Timeline

```bash
curl -X GET http://localhost:3000/api/v1/sales/contacts/CONTACT_UUID/timeline \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Delete Contact

```bash
curl -X DELETE http://localhost:3000/api/v1/sales/contacts/CONTACT_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

## 💼 Deals

### Create Deal

```bash
curl -X POST http://localhost:3000/api/v1/sales/deals \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "contactId": "CONTACT_UUID",
    "stageId": "STAGE_UUID",
    "title": "Enterprise License - 100 users",
    "description": "Annual subscription for enterprise plan",
    "value": 50000,
    "currency": "USD",
    "probability": 75,
    "expectedCloseDate": "2025-12-31T00:00:00Z",
    "products": [
      {
        "id": "prod-1",
        "name": "Enterprise License",
        "quantity": 100,
        "price": 450,
        "total": 45000
      },
      {
        "id": "prod-2",
        "name": "Premium Support",
        "quantity": 1,
        "price": 5000,
        "total": 5000
      }
    ],
    "customFields": {
      "contract_type": "annual",
      "payment_terms": "net-30"
    }
  }'
```

### List Deals

```bash
# All deals
curl -X GET http://localhost:3000/api/v1/sales/deals/list \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by status
curl -X GET "http://localhost:3000/api/v1/sales/deals/list?status=open" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by stage
curl -X GET "http://localhost:3000/api/v1/sales/deals/list?stageId=STAGE_UUID" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by value range
curl -X GET "http://localhost:3000/api/v1/sales/deals/list?minValue=10000&maxValue=100000" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by owner
curl -X GET "http://localhost:3000/api/v1/sales/deals/list?ownerId=USER_UUID" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Get Deal

```bash
curl -X GET http://localhost:3000/api/v1/sales/deals/DEAL_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Update Deal

```bash
curl -X PATCH http://localhost:3000/api/v1/sales/deals/DEAL_UUID \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "probability": 90,
    "expectedCloseDate": "2025-11-30T00:00:00Z"
  }'
```

### Move Deal to Stage

```bash
curl -X POST http://localhost:3000/api/v1/sales/deals/DEAL_UUID/move \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "stageId": "NEW_STAGE_UUID",
    "probability": 90
  }'
```

### Mark Deal as Won

```bash
curl -X POST http://localhost:3000/api/v1/sales/deals/DEAL_UUID/win \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "closeDate": "2025-10-16T12:00:00Z",
    "actualValue": 48000
  }'
```

### Mark Deal as Lost

```bash
curl -X POST http://localhost:3000/api/v1/sales/deals/DEAL_UUID/lose \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "reason": "Budget constraints - lost to competitor"
  }'
```

### Get Pipeline View (Kanban)

```bash
curl -X GET http://localhost:3000/api/v1/sales/deals/pipeline/view \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Delete Deal

```bash
curl -X DELETE http://localhost:3000/api/v1/sales/deals/DEAL_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

## 🔄 Pipeline Stages

### Create Stage

```bash
curl -X POST http://localhost:3000/api/v1/sales/pipeline/stages \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "Qualification",
    "description": "Initial qualification and discovery",
    "orderIndex": 1,
    "probabilityDefault": 25,
    "color": "#F59E0B",
    "isActive": true
  }'
```

### List Stages

```bash
curl -X GET http://localhost:3000/api/v1/sales/pipeline/stages \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Update Stage

```bash
curl -X PATCH http://localhost:3000/api/v1/sales/pipeline/stages/STAGE_UUID \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "probabilityDefault": 30,
    "color": "#10B981"
  }'
```

### Reorder Stages

```bash
curl -X POST http://localhost:3000/api/v1/sales/pipeline/stages/reorder \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "stageIds": [
      "STAGE_1_UUID",
      "STAGE_2_UUID",
      "STAGE_3_UUID",
      "STAGE_4_UUID"
    ]
  }'
```

### Delete Stage

```bash
curl -X DELETE http://localhost:3000/api/v1/sales/pipeline/stages/STAGE_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

## 📅 Activities

### Create Activity

```bash
curl -X POST http://localhost:3000/api/v1/sales/activities \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "type": "call",
    "subject": "Discovery call with CTO",
    "description": "Initial discovery to understand technical requirements",
    "contactId": "CONTACT_UUID",
    "dealId": "DEAL_UUID",
    "dueDate": "2025-10-20T14:00:00Z"
  }'
```

### List Activities

```bash
# All activities
curl -X GET http://localhost:3000/api/v1/sales/activities/list \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by type
curl -X GET "http://localhost:3000/api/v1/sales/activities/list?type=meeting" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by status
curl -X GET "http://localhost:3000/api/v1/sales/activities/list?status=pending" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Filter by contact
curl -X GET "http://localhost:3000/api/v1/sales/activities/list?contactId=CONTACT_UUID" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Get Activity

```bash
curl -X GET http://localhost:3000/api/v1/sales/activities/ACTIVITY_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Update Activity

```bash
curl -X PATCH http://localhost:3000/api/v1/sales/activities/ACTIVITY_UUID \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "dueDate": "2025-10-21T15:00:00Z",
    "description": "Updated description"
  }'
```

### Complete Activity

```bash
curl -X POST http://localhost:3000/api/v1/sales/activities/ACTIVITY_UUID/complete \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "outcome": "Great call! CTO is interested. Sending proposal next week. Key requirements: SSO, API access, custom reporting."
  }'
```

### Get Upcoming Activities

```bash
curl -X GET http://localhost:3000/api/v1/sales/activities/upcoming/list \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Delete Activity

```bash
curl -X DELETE http://localhost:3000/api/v1/sales/activities/ACTIVITY_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

## 📊 Analytics & Forecasting

### Generate Forecast

```bash
# Monthly forecast with weighted pipeline
curl -X GET "http://localhost:3000/api/v1/sales/forecast?period=monthly&methodology=weighted_pipeline" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Quarterly forecast with linear regression
curl -X GET "http://localhost:3000/api/v1/sales/forecast?period=quarterly&methodology=linear_regression" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Yearly forecast with moving average
curl -X GET "http://localhost:3000/api/v1/sales/forecast?period=yearly&methodology=moving_average" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Get Weighted Pipeline Value

```bash
curl -X GET http://localhost:3000/api/v1/sales/forecast/weighted-pipeline \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Win Rate Analysis

```bash
# Team win rate
curl -X GET http://localhost:3000/api/v1/sales/analytics/win-rate \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# User win rate
curl -X GET "http://localhost:3000/api/v1/sales/analytics/win-rate?userId=USER_UUID" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Date range
curl -X GET "http://localhost:3000/api/v1/sales/analytics/win-rate?from=2025-01-01&to=2025-12-31" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Sales Cycle Analysis

```bash
curl -X GET http://localhost:3000/api/v1/sales/analytics/sales-cycle \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

## 🎯 Targets & Performance

### Create Target

```bash
# Individual target
curl -X POST http://localhost:3000/api/v1/sales/targets \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "userId": "USER_UUID",
    "period": "monthly",
    "startDate": "2025-11-01",
    "endDate": "2025-11-30",
    "targetAmount": 100000
  }'

# Team target (no userId)
curl -X POST http://localhost:3000/api/v1/sales/targets \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "period": "quarterly",
    "startDate": "2025-10-01",
    "endDate": "2025-12-31",
    "targetAmount": 500000
  }'
```

### List Targets

```bash
curl -X GET "http://localhost:3000/api/v1/sales/targets?period=monthly" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Update Target Progress

```bash
# Update user's targets
curl -X POST "http://localhost:3000/api/v1/sales/targets/update-progress?userId=USER_UUID" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# Update team targets
curl -X POST http://localhost:3000/api/v1/sales/targets/update-progress \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Get User Performance

```bash
curl -X GET http://localhost:3000/api/v1/sales/targets/USER_UUID/performance \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Get Leaderboard

```bash
curl -X GET http://localhost:3000/api/v1/sales/leaderboard \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

## 🔗 Integration Example: Lead to Close

Complete workflow from lead conversion to deal closure:

```bash
# 1. Convert qualified lead to contact
CONTACT_ID=$(curl -X POST http://localhost:3000/api/v1/sales/contacts/from-lead/LEAD_UUID \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  | jq -r '.data.id')

# 2. Create deal for contact
DEAL_ID=$(curl -X POST http://localhost:3000/api/v1/sales/deals \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d "{
    \"contactId\": \"$CONTACT_ID\",
    \"stageId\": \"QUALIFICATION_STAGE_UUID\",
    \"title\": \"Enterprise License Deal\",
    \"value\": 50000,
    \"probability\": 25
  }" | jq -r '.data.id')

# 3. Log discovery call
curl -X POST http://localhost:3000/api/v1/sales/activities \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d "{
    \"type\": \"call\",
    \"subject\": \"Discovery call\",
    \"contactId\": \"$CONTACT_ID\",
    \"dealId\": \"$DEAL_ID\",
    \"dueDate\": \"2025-10-20T14:00:00Z\"
  }"

# 4. Move to proposal stage
curl -X POST "http://localhost:3000/api/v1/sales/deals/$DEAL_ID/move" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "stageId": "PROPOSAL_STAGE_UUID",
    "probability": 50
  }'

# 5. Move to negotiation
curl -X POST "http://localhost:3000/api/v1/sales/deals/$DEAL_ID/move" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "stageId": "NEGOTIATION_STAGE_UUID",
    "probability": 75
  }'

# 6. Close deal as won
curl -X POST "http://localhost:3000/api/v1/sales/deals/$DEAL_ID/win" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "closeDate": "2025-10-16T12:00:00Z",
    "actualValue": 48000
  }'

# 7. Update sales targets
curl -X POST http://localhost:3000/api/v1/sales/targets/update-progress \
  -H "Cookie: session=YOUR_SESSION_TOKEN"

# 8. Generate forecast
curl -X GET "http://localhost:3000/api/v1/sales/forecast?period=monthly&methodology=weighted_pipeline" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

## 📋 Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Sales CRM API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Contacts",
      "item": [
        {
          "name": "Create Contact",
          "request": {
            "method": "POST",
            "header": [],
            "url": "{{baseUrl}}/api/v1/sales/contacts"
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```

## 🎨 Response Examples

### Successful Contact Creation

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenantId": "tenant-123",
    "type": "person",
    "email": "john.smith@company.com",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+1-555-0123",
    "jobTitle": "CTO",
    "ownerId": "user-456",
    "createdAt": "2025-10-16T12:00:00Z",
    "updatedAt": "2025-10-16T12:00:00Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Contact with this email already exists"
}
```

### Pipeline View Response

```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "id": "stage-1",
        "name": "Qualification",
        "orderIndex": 0,
        "deals": [...],
        "totalValue": 125000,
        "count": 5
      }
    ],
    "totalPipelineValue": 450000,
    "weightedValue": 337500,
    "totalDeals": 18
  }
}
```
