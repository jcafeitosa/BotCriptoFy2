# Payment System - Comprehensive Usage Example

Complete end-to-end example demonstrating all payment system features including multi-gateway processing, webhooks, refunds, dunning, and audit logging.

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Basic Payment Flow](#basic-payment-flow)
3. [Advanced Features](#advanced-features)
4. [Webhook Handling](#webhook-handling)
5. [Refund Processing](#refund-processing)
6. [Dunning Management](#dunning-management)
7. [Audit Trail](#audit-trail)
8. [Testing Guide](#testing-guide)

---

## Setup & Configuration

### 1. Environment Variables

```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/botcriptofy2
APP_URL=https://yourdomain.com

# InfinityPay (Brazil)
INFINITYPAY_API_KEY=your_api_key
INFINITYPAY_API_SECRET=your_api_secret
INFINITYPAY_WEBHOOK_SECRET=your_webhook_secret

# Stripe (International)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Banco Interno
BANCO_INTERNAL_API_KEY=internal_key
BANCO_WEBHOOK_SECRET=banco_secret
```

### 2. Database Setup

```bash
# Run migration
psql $DATABASE_URL < drizzle/migrations/0004_payment_gateway_system.sql

# Seed payment gateways
bun run src/db/seeds/payment-gateways.seed.ts

# Activate gateways
psql $DATABASE_URL << EOF
UPDATE payment_gateways SET is_active = true WHERE slug IN ('infinitypay', 'stripe', 'banco');
EOF
```

### 3. Verify Setup

```bash
# Test database connection
curl http://localhost:3000/api/v1/gateways?country=BR&currency=BRL

# Expected response:
{
  "success": true,
  "gateways": [
    {
      "name": "InfinityPay",
      "slug": "infinitypay",
      "supportedMethods": ["pix", "credit_card", "debit_card", "boleto"],
      "fees": { "percentage": 0.99 }
    },
    {
      "name": "Banco Interno",
      "slug": "banco",
      "supportedMethods": ["pix", "bank_transfer", "digital_wallet"],
      "fees": { "percentage": 0 }
    }
  ]
}
```

---

## Basic Payment Flow

### Example 1: PIX Payment (Brazil)

```typescript
// 1. Create PIX payment
const response = await fetch('http://localhost:3000/api/v1/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <user_token>',
    'X-Tenant-Id': '<tenant_id>'
  },
  body: JSON.stringify({
    amount: 100.00,
    currency: 'BRL',
    paymentMethod: 'pix',
    country: 'BR',
    metadata: {
      orderId: 'order_123',
      customerId: 'customer_456'
    }
  })
});

const payment = await response.json();
console.log(payment);

// Response:
{
  "success": true,
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "externalId": "infinitypay_abc123",
    "status": "pending",
    "gateway": "infinitypay",
    "qrCode": "00020101021226850014br.gov.bcb.pix...",
    "qrCodeBase64": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "pixKey": "chave@infinitypay.com"
  }
}

// 2. Display QR Code to user
// User scans QR code and pays via their bank app

// 3. Webhook is received (automatic)
// POST /api/v1/webhooks/infinitypay
{
  "type": "payment.completed",
  "id": "infinitypay_abc123",
  "status": "completed",
  "amount": 100.00
}

// 4. Check payment status
const status = await fetch(
  `http://localhost:3000/api/v1/payments/${payment.data.transactionId}`,
  {
    headers: {
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    }
  }
);

const statusData = await status.json();
console.log(statusData);

// Response:
{
  "success": true,
  "status": "completed",
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": "100.00",
    "currency": "BRL",
    "paymentMethod": "pix",
    "status": "completed",
    "processedAt": "2025-01-16T10:30:00Z"
  }
}
```

### Example 2: Credit Card Payment (International)

```typescript
// 1. Create credit card payment
const response = await fetch('http://localhost:3000/api/v1/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <user_token>',
    'X-Tenant-Id': '<tenant_id>'
  },
  body: JSON.stringify({
    amount: 50.00,
    currency: 'USD',
    paymentMethod: 'credit_card',
    country: 'US',
    installments: 1,
    savePaymentMethod: true,
    metadata: {
      cardToken: 'tok_visa', // Stripe token
      customerId: 'customer_789'
    }
  })
});

const payment = await response.json();

// Response:
{
  "success": true,
  "data": {
    "transactionId": "660e8400-e29b-41d4-a716-446655440001",
    "externalId": "pi_3AbC123xyz",
    "status": "completed",
    "gateway": "stripe",
    "paymentUrl": "https://checkout.stripe.com/pay/..."
  }
}
```

---

## Advanced Features

### Example 3: Gateway Selection with Preferences

```typescript
// Let user choose specific gateways
const response = await fetch('http://localhost:3000/api/v1/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <user_token>',
    'X-Tenant-Id': '<tenant_id>'
  },
  body: JSON.stringify({
    amount: 200.00,
    currency: 'BRL',
    paymentMethod: 'pix',
    country: 'BR',
    gatewayPreferences: ['banco', 'infinitypay'], // Priority order
    metadata: {
      preferZeroFees: true
    }
  })
});

// Sistema seleciona 'banco' (sem taxas) ao invés de 'infinitypay' (0.99%)
```

### Example 4: Installment Payments

```typescript
// Credit card with installments (Brazil only)
const response = await fetch('http://localhost:3000/api/v1/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <user_token>',
    'X-Tenant-Id': '<tenant_id>'
  },
  body: JSON.stringify({
    amount: 1200.00,
    currency: 'BRL',
    paymentMethod: 'credit_card',
    country: 'BR',
    installments: 12, // 12x
    metadata: {
      cardToken: 'card_token_123'
    }
  })
});

// Fee calculation:
// - Base: 3.99% (InfinityPay credit card)
// - 12x installment: +3.0%
// - Total: 6.99%
```

### Example 5: List Payments with Filters

```typescript
// Get all completed payments in the last 30 days
const payments = await fetch(
  'http://localhost:3000/api/v1/payments?' + new URLSearchParams({
    status: 'completed',
    limit: '50',
    offset: '0'
  }),
  {
    headers: {
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    }
  }
);

const data = await payments.json();

// Response:
{
  "success": true,
  "payments": [
    {
      "id": "...",
      "amount": "100.00",
      "currency": "BRL",
      "status": "completed",
      "gateway": "infinitypay",
      "createdAt": "2025-01-16T10:00:00Z"
    },
    // ... more payments
  ],
  "total": 127,
  "limit": 50,
  "offset": 0
}
```

---

## Webhook Handling

### Example 6: InfinityPay Webhook

```typescript
// Webhook endpoint: POST /api/v1/webhooks/infinitypay
// Automatically handled by the system

// Webhook payload:
{
  "type": "payment.completed",
  "id": "infinitypay_abc123",
  "status": "completed",
  "amount": 100.00,
  "currency": "BRL",
  "metadata": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}

// System actions:
// 1. Verifies HMAC signature
// 2. Saves to payment_webhooks table
// 3. Updates payment_transactions status
// 4. Logs audit event (financial.payment_processed)
// 5. Returns 200 OK to gateway
```

### Example 7: Stripe Webhook

```typescript
// Webhook endpoint: POST /api/v1/webhooks/stripe

// Webhook payload (Stripe format):
{
  "id": "evt_1AbC123xyz",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3AbC123xyz",
      "amount": 5000,
      "currency": "usd",
      "status": "succeeded"
    }
  }
}

// System handles Stripe-specific signature verification
```

### Example 8: Manual Webhook Retry

```bash
# If webhook fails, query failed webhooks
curl http://localhost:3000/api/v1/admin/webhooks/failed \
  -H "Authorization: Bearer <admin_token>"

# Response:
{
  "webhooks": [
    {
      "id": "webhook_123",
      "gatewayId": "...",
      "externalId": "infinitypay_abc123",
      "retryCount": 3,
      "errorMessage": "Gateway timeout",
      "createdAt": "2025-01-16T10:00:00Z"
    }
  ]
}

# Manual retry via database:
psql $DATABASE_URL << EOF
UPDATE payment_webhooks
SET processed = false, retry_count = 0
WHERE id = 'webhook_123';
EOF
```

---

## Refund Processing

### Example 9: Full Refund

```typescript
// Full refund
const refund = await fetch(
  'http://localhost:3000/api/v1/payments/550e8400-e29b-41d4-a716-446655440000/refund',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    },
    body: JSON.stringify({
      reason: 'Customer requested refund'
    })
  }
);

const refundData = await refund.json();

// Response:
{
  "success": true,
  "data": {
    "refundId": "770e8400-e29b-41d4-a716-446655440002",
    "externalId": "re_abc123",
    "status": "completed",
    "amount": 100.00
  }
}

// System actions:
// 1. Creates refund record (pending)
// 2. Calls gateway.processRefund()
// 3. Updates refund status
// 4. Updates transaction status to 'refunded'
// 5. Logs audit event (financial.refund_issued)
```

### Example 10: Partial Refund

```typescript
// Partial refund (50% of original amount)
const refund = await fetch(
  'http://localhost:3000/api/v1/payments/550e8400-e29b-41d4-a716-446655440000/refund',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    },
    body: JSON.stringify({
      amount: 50.00,
      reason: 'Partial service delivery'
    })
  }
);

// Transaction remains 'completed' (not 'refunded')
// Can refund remaining 50.00 later
```

### Example 11: List Refunds

```typescript
// Get all refunds for a transaction
const refunds = await fetch(
  'http://localhost:3000/api/v1/payments/550e8400-e29b-41d4-a716-446655440000/refunds',
  {
    headers: {
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    }
  }
);

const refundsData = await refunds.json();

// Response:
{
  "success": true,
  "refunds": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "amount": "50.00",
      "reason": "Partial service delivery",
      "status": "completed",
      "processedAt": "2025-01-16T11:00:00Z"
    }
  ]
}
```

---

## Dunning Management

### Example 12: Check Dunning Status

```typescript
// Check dunning (retry) status for failed payment
const dunning = await fetch(
  'http://localhost:3000/api/v1/payments/550e8400-e29b-41d4-a716-446655440000/dunning',
  {
    headers: {
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    }
  }
);

const dunningData = await dunning.json();

// Response:
{
  "success": true,
  "dunning": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "attemptCount": 1,
    "maxAttempts": 3,
    "nextAttempt": "2025-01-17T10:30:00Z", // +24h
    "lastAttempt": "2025-01-16T10:30:00Z",
    "status": "active"
  }
}
```

### Example 13: Pause Dunning

```typescript
// Pause automatic retries
const pause = await fetch(
  'http://localhost:3000/api/v1/payments/550e8400-e29b-41d4-a716-446655440000/dunning/pause',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    }
  }
);

// Response:
{
  "success": true,
  "message": "Dunning paused"
}
```

### Example 14: Resume Dunning

```typescript
// Resume automatic retries
const resume = await fetch(
  'http://localhost:3000/api/v1/payments/550e8400-e29b-41d4-a716-446655440000/dunning/resume',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    }
  }
);

// Response:
{
  "success": true,
  "message": "Dunning resumed",
  "nextAttempt": "2025-01-17T10:30:00Z"
}
```

### Example 15: Dunning Statistics

```typescript
// Get dunning statistics for tenant
const stats = await fetch(
  'http://localhost:3000/api/v1/payments/dunning/stats',
  {
    headers: {
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    }
  }
);

const statsData = await stats.json();

// Response:
{
  "success": true,
  "stats": {
    "active": 5,
    "paused": 2,
    "completed": 12,
    "failed": 3,
    "successRate": 80.0,
    "averageAttempts": 1.8
  }
}
```

---

## Audit Trail

### Example 16: Query Payment Audit Logs

```typescript
// Get all audit events for a specific payment
const audit = await fetch(
  'http://localhost:3000/api/v1/audit?' + new URLSearchParams({
    resource: 'payment_transactions',
    resourceId: '550e8400-e29b-41d4-a716-446655440000',
    limit: '100'
  }),
  {
    headers: {
      'Authorization': 'Bearer <user_token>',
      'X-Tenant-Id': '<tenant_id>'
    }
  }
);

const auditData = await audit.json();

// Response:
{
  "success": true,
  "logs": [
    {
      "id": "audit_1",
      "eventType": "financial.transaction_created",
      "severity": "medium",
      "status": "success",
      "timestamp": "2025-01-16T10:00:00Z",
      "metadata": {
        "amount": 100.00,
        "currency": "BRL",
        "paymentMethod": "pix",
        "gateway": "infinitypay"
      },
      "complianceCategory": "pci_dss"
    },
    {
      "id": "audit_2",
      "eventType": "financial.payment_processed",
      "severity": "high",
      "status": "success",
      "timestamp": "2025-01-16T10:30:00Z",
      "metadata": {
        "externalId": "infinitypay_abc123",
        "paymentStatus": "completed"
      },
      "complianceCategory": "pci_dss"
    }
  ]
}
```

### Example 17: Compliance Report

```typescript
// Generate PCI-DSS compliance report
const report = await fetch(
  'http://localhost:3000/api/v1/audit/compliance/pci_dss?' + new URLSearchParams({
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  }),
  {
    headers: {
      'Authorization': 'Bearer <admin_token>',
      'X-Tenant-Id': '<tenant_id>'
    }
  }
);

const reportData = await report.json();

// Response includes:
// - Total payment events
// - Critical events (failures, refunds)
// - Security events
// - Recommendations
```

---

## Testing Guide

### Test 1: PIX Payment Flow

```bash
# 1. Create payment
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant_id>" \
  -d '{
    "amount": 100.00,
    "currency": "BRL",
    "paymentMethod": "pix",
    "country": "BR"
  }'

# 2. Simulate webhook (development only)
curl -X POST http://localhost:3000/api/v1/webhooks/infinitypay \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <signature>" \
  -d '{
    "type": "payment.completed",
    "id": "infinitypay_abc123",
    "status": "completed"
  }'

# 3. Verify payment status
curl http://localhost:3000/api/v1/payments/<transaction_id> \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant_id>"
```

### Test 2: Refund Flow

```bash
# 1. Create completed payment first (see Test 1)

# 2. Request refund
curl -X POST http://localhost:3000/api/v1/payments/<transaction_id>/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant_id>" \
  -d '{
    "amount": 50.00,
    "reason": "Test refund"
  }'

# 3. List refunds
curl http://localhost:3000/api/v1/payments/<transaction_id>/refunds \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant_id>"
```

### Test 3: Dunning System

```bash
# 1. Create failed payment (simulate)
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant_id>" \
  -d '{
    "amount": 100.00,
    "currency": "BRL",
    "paymentMethod": "credit_card",
    "metadata": {
      "simulateFailure": true
    }
  }'

# 2. Check dunning status
curl http://localhost:3000/api/v1/payments/<transaction_id>/dunning \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant_id>"

# 3. Run dunning job (cron simulation)
# In your code:
import { processDunningJob } from '@/modules/financial/services/dunning.service';
await processDunningJob();
```

### Test 4: Audit Logging

```bash
# 1. Perform any payment operation

# 2. Query audit logs
curl 'http://localhost:3000/api/v1/audit?eventType=financial.payment_processed&limit=10' \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: <tenant_id>"

# 3. Check compliance
curl 'http://localhost:3000/api/v1/audit/compliance/pci_dss?startDate=2025-01-01&endDate=2025-01-31' \
  -H "Authorization: Bearer <admin_token>" \
  -H "X-Tenant-Id: <tenant_id>"
```

---

## Production Checklist

- [ ] All environment variables configured
- [ ] Database migration executed
- [ ] Payment gateways seeded and activated
- [ ] Webhook endpoints accessible (HTTPS required)
- [ ] Webhook signatures verified
- [ ] Audit logging enabled
- [ ] Dunning cron job scheduled
- [ ] Error monitoring configured
- [ ] Rate limiting enabled
- [ ] SSL/TLS certificates valid
- [ ] PCI-DSS compliance reviewed
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Documentation reviewed

---

## Support

For issues, questions, or feature requests:

1. Check [PAYMENT_SYSTEM.md](./PAYMENT_SYSTEM.md) for architecture details
2. Review [Troubleshooting](./PAYMENT_SYSTEM.md#troubleshooting) section
3. Query audit logs for debugging: `/api/v1/audit`
4. Check payment webhooks: `SELECT * FROM payment_webhooks WHERE processed = false`

---

**Last Updated**: 2025-01-16
**Version**: 1.0.0
**Status**: Production Ready ✅
