# API Reference - BotCriptoFy2

## 🚀 Visão Geral

A API do BotCriptoFy2 é construída com Elysia e documentada com Scalar, fornecendo endpoints RESTful para todos os módulos administrativos.

## 📋 Base URL

```
Production: https://api.botcriptofy2.com
Staging: https://staging-api.botcriptofy2.com
Development: http://localhost:3000
```

## 🔐 Autenticação

### Better-Auth Integration

Todos os endpoints requerem autenticação via Better-Auth:

```http
Authorization: Bearer <jwt-token>
```

### Headers Obrigatórios

```http
Content-Type: application/json
Authorization: Bearer <jwt-token>
X-Tenant-ID: <tenant-id>
X-Department-ID: <department-id>
```

## 📊 Endpoints Principais

### 1. Autenticação

#### POST /auth/login
Login de usuário

**Request:**
```json
{
  "email": "jcafeitosa@icloud.com",
  "password": "ca1@2S3d4f5ca"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "jcafeitosa@icloud.com",
      "role": "ceo",
      "tenantId": "uuid"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### POST /auth/refresh
Renovar token de acesso

**Request:**
```json
{
  "refreshToken": "refresh-token"
}
```

### 2. CEO Dashboard

#### GET /api/ceo/dashboard
Dashboard executivo completo

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalUsers": 1250,
      "activeSubscriptions": 890,
      "monthlyRevenue": 45600.00,
      "growthRate": 15.5
    },
    "departments": [
      {
        "id": "uuid",
        "name": "Financeiro",
        "status": "active",
        "metrics": { ... }
      }
    ],
    "alerts": [
      {
        "id": "uuid",
        "type": "warning",
        "message": "Alta taxa de churn detectada",
        "timestamp": "2024-12-19T10:30:00Z"
      }
    ]
  }
}
```

### 3. Departamentos

#### GET /api/departments
Listar todos os departamentos

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Financeiro",
      "code": "FIN",
      "description": "Gestão financeira e billing",
      "agentStatus": "active",
      "metrics": {
        "activeUsers": 15,
        "lastActivity": "2024-12-19T10:30:00Z"
      }
    }
  ]
}
```

#### GET /api/departments/{id}/metrics
Métricas específicas do departamento

**Parameters:**
- `id` (string): ID do departamento
- `period` (string): Período (1d, 7d, 30d, 90d)

**Response:**
```json
{
  "success": true,
  "data": {
    "department": {
      "id": "uuid",
      "name": "Financeiro"
    },
    "metrics": {
      "revenue": {
        "current": 45600.00,
        "previous": 38900.00,
        "growth": 17.2
      },
      "subscriptions": {
        "active": 890,
        "cancelled": 45,
        "new": 78
      },
      "billing": {
        "successRate": 98.5,
        "failedPayments": 12,
        "refunds": 8
      }
    },
    "timeline": [
      {
        "timestamp": "2024-12-19T00:00:00Z",
        "revenue": 1200.00,
        "subscriptions": 23
      }
    ]
  }
}
```

### 4. Usuários

#### GET /api/users
Listar usuários com filtros

**Query Parameters:**
- `department` (string): Filtrar por departamento
- `role` (string): Filtrar por role
- `status` (string): Filtrar por status
- `page` (number): Página (default: 1)
- `limit` (number): Limite por página (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "João Silva",
        "role": "funcionario",
        "department": {
          "id": "uuid",
          "name": "Financeiro"
        },
        "status": "active",
        "lastLogin": "2024-12-19T09:15:00Z",
        "createdAt": "2024-12-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### POST /api/users
Criar novo usuário

**Request:**
```json
{
  "email": "novo@example.com",
  "name": "Maria Santos",
  "role": "funcionario",
  "departmentId": "uuid",
  "password": "senha123"
}
```

### 5. Billing e Assinaturas

#### GET /api/billing/subscriptions
Listar assinaturas

**Query Parameters:**
- `status` (string): Filtrar por status
- `plan` (string): Filtrar por plano
- `tenant` (string): Filtrar por tenant

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "plan": {
        "id": "pro",
        "name": "Pro",
        "price": 29.00
      },
      "status": "active",
      "currentPeriodStart": "2024-12-01T00:00:00Z",
      "currentPeriodEnd": "2025-01-01T00:00:00Z",
      "cancelAtPeriodEnd": false,
      "createdAt": "2024-11-01T10:00:00Z"
    }
  ]
}
```

#### POST /api/billing/subscriptions/{id}/cancel
Cancelar assinatura

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "uuid",
    "status": "cancelled",
    "cancelledAt": "2024-12-19T10:30:00Z",
    "cancelAtPeriodEnd": true
  }
}
```

### 6. Agentes

#### GET /api/agents
Status dos agentes autônomos

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ceo",
      "name": "CEO Agent",
      "status": "active",
      "lastActivity": "2024-12-19T10:30:00Z",
      "capabilities": ["coordination", "decision_making", "reporting"],
      "metrics": {
        "decisionsMade": 45,
        "actionsExecuted": 120,
        "successRate": 98.5
      }
    }
  ]
}
```

#### POST /api/agents/{id}/command
Enviar comando para agente

**Request:**
```json
{
  "command": "analyze_revenue",
  "parameters": {
    "period": "30d",
    "department": "financeiro"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "commandId": "uuid",
    "status": "processing",
    "estimatedCompletion": "2024-12-19T10:35:00Z"
  }
}
```

### 7. Analytics

#### GET /api/analytics/revenue
Análise de receita

**Query Parameters:**
- `period` (string): Período (1d, 7d, 30d, 90d, 1y)
- `department` (string): Filtrar por departamento
- `granularity` (string): Granularidade (hour, day, week, month)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "totalRevenue": 45600.00,
    "growthRate": 15.5,
    "breakdown": {
      "subscriptions": 38900.00,
      "oneTime": 6700.00
    },
    "timeline": [
      {
        "timestamp": "2024-12-19T00:00:00Z",
        "revenue": 1200.00,
        "subscriptions": 23,
        "churn": 2
      }
    ],
    "predictions": {
      "nextMonth": 52500.00,
      "confidence": 85.5
    }
  }
}
```

## 🔄 Webhooks

### Stripe Webhooks

#### POST /webhooks/stripe
Webhook do Stripe para eventos de billing

**Headers:**
```http
Stripe-Signature: <signature>
```

**Eventos Suportados:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Telegram Webhooks

#### POST /webhooks/telegram
Webhook do Telegram para comunicação com agentes

**Headers:**
```http
X-Telegram-Bot-Api-Secret-Token: <secret>
```

## 📊 Códigos de Status

| Código | Significado | Descrição |
|--------|-------------|-----------|
| 200 | OK | Requisição bem-sucedida |
| 201 | Created | Recurso criado com sucesso |
| 400 | Bad Request | Dados inválidos |
| 401 | Unauthorized | Token inválido ou expirado |
| 403 | Forbidden | Sem permissão para o recurso |
| 404 | Not Found | Recurso não encontrado |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Erro interno do servidor |

## 🚨 Rate Limiting

### Limites por Endpoint

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `/auth/*` | 10 req/min | 1 minuto |
| `/api/ceo/*` | 100 req/min | 1 minuto |
| `/api/departments/*` | 200 req/min | 1 minuto |
| `/api/users/*` | 50 req/min | 1 minuto |
| `/api/billing/*` | 20 req/min | 1 minuto |
| `/api/agents/*` | 30 req/min | 1 minuto |

### Headers de Rate Limit

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## 🔧 SDKs e Bibliotecas

### JavaScript/TypeScript

```bash
npm install @botcriptofy2/sdk
```

```typescript
import { BotCriptoFy2Client } from '@botcriptofy2/sdk';

const client = new BotCriptoFy2Client({
  baseURL: 'https://api.botcriptofy2.com',
  apiKey: 'your-api-key'
});

// Exemplo de uso
const dashboard = await client.ceo.getDashboard();
const users = await client.users.list({ department: 'financeiro' });
```

### Python

```bash
pip install botcriptofy2-sdk
```

```python
from botcriptofy2 import BotCriptoFy2Client

client = BotCriptoFy2Client(
    base_url='https://api.botcriptofy2.com',
    api_key='your-api-key'
)

# Exemplo de uso
dashboard = client.ceo.get_dashboard()
users = client.users.list(department='financeiro')
```

## 📚 Documentação Interativa

Acesse a documentação interativa completa em:
- **Development**: http://localhost:3000/docs
- **Staging**: https://staging-api.botcriptofy2.com/docs
- **Production**: https://api.botcriptofy2.com/docs

---

**Última atualização**: 2024-12-19
**Versão da API**: 1.0.0
**Responsável**: Agente-CTO