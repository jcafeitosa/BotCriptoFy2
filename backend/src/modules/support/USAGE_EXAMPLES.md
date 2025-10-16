## Support Module - Usage Examples

### 1. Create a Ticket

```typescript
POST /api/v1/support/tickets
Authorization: Bearer <token>

{
  "contactId": "contact-uuid",
  "subject": "Cannot login to dashboard",
  "description": "I'm getting a 'Session expired' error when trying to login...",
  "priority": "high",
  "category": "technical",
  "source": "email",
  "tags": ["login", "authentication"]
}

Response:
{
  "success": true,
  "data": {
    "id": "tick-uuid",
    "ticketNumber": "TICK-2024-0123",
    "status": "new",
    "priority": "high",
    "dueDate": "2024-10-16T14:00:00Z",
    "slaId": "sla-uuid",
    ...
  }
}
```

### 2. List Tickets with Filters

```typescript
GET /api/v1/support/tickets?status=open&priority=high&limit=20&page=1
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "tickets": [...],
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### 3. Assign Ticket

```typescript
POST /api/v1/support/tickets/:id/assign
Authorization: Bearer <token>

{
  "assignedTo": "user-uuid"
}

Response:
{
  "success": true,
  "data": {
    "id": "tick-uuid",
    "assignedTo": "user-uuid",
    "status": "open",
    ...
  }
}
```

### 4. Add Message to Ticket

```typescript
POST /api/v1/support/tickets/:id/messages
Authorization: Bearer <token>

{
  "message": "I've checked the logs and found the issue...",
  "isInternal": false,
  "attachments": [
    {
      "filename": "screenshot.png",
      "url": "https://...",
      "size": 123456,
      "mimeType": "image/png"
    }
  ]
}
```

### 5. Resolve Ticket

```typescript
POST /api/v1/support/tickets/:id/resolve
Authorization: Bearer <token>

{
  "resolutionNote": "Fixed by clearing browser cache and updating password"
}

Response:
{
  "success": true,
  "data": {
    "id": "tick-uuid",
    "status": "resolved",
    "resolvedAt": "2024-10-16T12:30:00Z",
    "resolutionTime": 150, // minutes
    ...
  }
}
```

### 6. Rate Satisfaction

```typescript
POST /api/v1/support/tickets/:id/satisfaction
Authorization: Bearer <token>

{
  "rating": 5,
  "comment": "Excellent support! Quick and helpful."
}
```

### 7. Create SLA Policy

```typescript
POST /api/v1/support/sla/policies
Authorization: Bearer <token>

{
  "name": "Urgent Priority SLA",
  "description": "SLA for urgent tickets",
  "priority": "urgent",
  "firstResponseMinutes": 30,
  "resolutionMinutes": 120,
  "businessHoursOnly": false
}

Response:
{
  "success": true,
  "data": {
    "id": "sla-uuid",
    "name": "Urgent Priority SLA",
    "priority": "urgent",
    "firstResponseMinutes": 30,
    "resolutionMinutes": 120,
    ...
  }
}
```

### 8. Get SLA Metrics

```typescript
GET /api/v1/support/sla/metrics?from=2024-10-01&to=2024-10-31
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalTickets": 500,
    "withinSLA": 425,
    "breachedSLA": 75,
    "complianceRate": 85,
    "avgFirstResponseTime": 25,
    "avgResolutionTime": 180,
    "byPriority": {
      "urgent": {
        "total": 50,
        "withinSLA": 45,
        "breached": 5,
        "complianceRate": 90
      },
      ...
    }
  }
}
```

### 9. Create Knowledge Base Article

```typescript
POST /api/v1/support/kb/articles
Authorization: Bearer <token>

{
  "title": "How to Reset Your Password",
  "content": "## Steps to Reset Password\n\n1. Click 'Forgot Password'...",
  "category": "Account Management",
  "tags": ["password", "security", "account"]
}
```

### 10. Search Knowledge Base

```typescript
GET /api/v1/support/kb/search?q=password&publishedOnly=true
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "article-uuid",
      "title": "How to Reset Your Password",
      "category": "Account Management",
      "viewsCount": 1250,
      "helpfulCount": 98,
      ...
    }
  ]
}
```

### 11. Create Automation

```typescript
POST /api/v1/support/automations
Authorization: Bearer <token>

{
  "name": "Auto-assign urgent tickets",
  "description": "Automatically assign urgent tickets to senior support",
  "trigger": "on_create",
  "conditions": {
    "priority": "urgent",
    "category": "technical"
  },
  "actions": {
    "assignTo": "senior-support-user-id",
    "addTag": ["escalated", "urgent"],
    "sendNotification": true
  }
}
```

### 12. Test Automation

```typescript
POST /api/v1/support/automations/:id/test
Authorization: Bearer <token>

{
  "sampleTicket": {
    "priority": "urgent",
    "category": "technical",
    "status": "new"
  }
}

Response:
{
  "success": true,
  "data": {
    "matched": true,
    "actions": [
      "Assign to user: senior-support-user-id",
      "Add tags: escalated, urgent",
      "Send notification"
    ]
  }
}
```

### 13. Create Canned Response

```typescript
POST /api/v1/support/canned-responses
Authorization: Bearer <token>

{
  "title": "Welcome Response",
  "content": "Thank you for contacting support! We've received your request and will respond shortly.",
  "category": "Greetings",
  "isShared": true
}
```

### 14. Get Analytics

```typescript
GET /api/v1/support/analytics/stats?from=2024-10-01&to=2024-10-31
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "total": 500,
    "byStatus": {
      "new": 25,
      "open": 150,
      "pending": 50,
      "on_hold": 20,
      "resolved": 200,
      "closed": 55
    },
    "byPriority": {
      "low": 100,
      "medium": 250,
      "high": 120,
      "urgent": 30
    },
    "byCategory": {
      "technical": 200,
      "billing": 150,
      "general": 150
    },
    "avgResolutionTime": 180,
    "avgFirstResponseTime": 25,
    "satisfactionScore": 4.3
  }
}
```

### 15. Get Satisfaction Metrics

```typescript
GET /api/v1/support/analytics/satisfaction?from=2024-10-01&to=2024-10-31
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalRatings": 450,
    "averageScore": 4.3,
    "distribution": {
      "1": 10,
      "2": 15,
      "3": 50,
      "4": 175,
      "5": 200
    },
    "csatScore": 83 // % of 4-5 stars
  }
}
```

### 16. Get Agent Performance

```typescript
GET /api/v1/support/analytics/agent-performance?userId=user-uuid&from=2024-10-01&to=2024-10-31
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "totalTickets": 120,
    "resolvedTickets": 110,
    "avgResolutionTime": 165,
    "avgFirstResponseTime": 20,
    "satisfactionScore": 4.5,
    "slaCompliance": 92
  }
}
```

### 17. Get Tickets Over Time

```typescript
GET /api/v1/support/analytics/tickets-over-time?from=2024-10-01&to=2024-10-31&interval=day
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    { "date": "2024-10-01", "count": 15 },
    { "date": "2024-10-02", "count": 18 },
    { "date": "2024-10-03", "count": 12 },
    ...
  ]
}
```

## Service Layer Usage

```typescript
import { TicketsService, SLAService } from '@/modules/support';

// Create ticket
const ticket = await TicketsService.createTicket(
  {
    subject: 'Test',
    description: 'Test ticket',
    priority: 'high',
    category: 'technical',
    source: 'web'
  },
  userId,
  tenantId
);

// Get SLA metrics
const metrics = await SLAService.getSLAMetrics(tenantId, {
  from: new Date('2024-10-01'),
  to: new Date('2024-10-31')
});
```

## Automation Examples

### Auto-escalate High Priority
```json
{
  "trigger": "on_create",
  "conditions": {
    "priority": "high"
  },
  "actions": {
    "assignTo": "manager-user-id",
    "addTag": "escalated"
  }
}
```

### Send Notification on SLA Breach
```json
{
  "trigger": "on_sla_breach",
  "conditions": {},
  "actions": {
    "sendNotification": true,
    "addNote": "SLA breached - requires immediate attention"
  }
}
```

### Auto-close Resolved Tickets
```json
{
  "trigger": "on_status_change",
  "conditions": {
    "status": "resolved"
  },
  "actions": {
    "changeStatus": "closed"
  }
}
```
