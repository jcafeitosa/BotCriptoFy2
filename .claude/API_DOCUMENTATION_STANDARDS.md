# API Documentation Standards (OpenAPI/Swagger)

> **Padrões de documentação para endpoints da API BotCriptoFy**

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Template de Módulo](#template-de-módulo)
4. [Schemas e Validação](#schemas-e-validação)
5. [Documentação de Rotas](#documentação-de-rotas)
6. [Tags e Organização](#tags-e-organização)
7. [Exemplos Práticos](#exemplos-práticos)

---

## 🎯 Visão Geral

Cada módulo de rotas deve:
- ✅ Definir seus próprios schemas (Elysia TypeBox)
- ✅ Documentar cada endpoint com `.detail()`
- ✅ Usar tags consistentes para organização
- ✅ Incluir exemplos de requisição/resposta
- ✅ Documentar todos os códigos de status possíveis
- ✅ Ser auto-contido e modular

---

## 📁 Estrutura de Arquivos

```
backend/src/routes/
├── health.ts           # ✅ Exemplo implementado
├── auth.ts             # 🔜 Sprint 2
├── bots.ts             # 🔜 Sprint 2
├── strategies.ts       # 🔜 Sprint 2
├── market.ts           # 🔜 Sprint 2
└── admin/              # 🔜 Sprint 2
    ├── users.ts
    ├── tenants.ts
    └── subscriptions.ts
```

**Regra:** Cada arquivo de rota deve ter sua própria documentação OpenAPI integrada.

---

## 📝 Template de Módulo

### Estrutura Padrão

```typescript
/**
 * @fileoverview [Nome do Módulo] Routes
 * @description [Descrição breve do módulo]
 * @module routes/[nome]
 * @version 1.0.0
 */

import { Elysia, t } from "elysia";

// ============================================================================
// SCHEMAS (Elysia TypeBox)
// ============================================================================

/**
 * [Nome] Request Schema
 * @description [Descrição do request]
 */
const [Nome]RequestSchema = t.Object({
  field1: t.String({ minLength: 1, description: "Field description" }),
  field2: t.Number({ minimum: 0 }),
  field3: t.Optional(t.Boolean()),
});

/**
 * [Nome] Response Schema
 * @description [Descrição da response]
 */
const [Nome]ResponseSchema = t.Object({
  success: t.Boolean(),
  data: t.Object({
    id: t.String(),
    name: t.String(),
    createdAt: t.String({ format: "date-time" }),
  }),
});

/**
 * Error Response Schema
 * @description Standard error response
 */
const ErrorSchema = t.Object({
  success: t.Literal(false),
  error: t.Object({
    code: t.String(),
    message: t.String(),
    details: t.Optional(t.Any()),
  }),
});

// ============================================================================
// TYPES
// ============================================================================

type [Nome]Request = typeof [Nome]RequestSchema.static;
type [Nome]Response = typeof [Nome]ResponseSchema.static;

// ============================================================================
// [NOME DO MÓDULO] ROUTER
// ============================================================================

/**
 * [Nome] Router
 * @description [Descrição do router]
 */
export const [nome]Router = new Elysia({
  prefix: "/api/[nome]",
  tags: ["[Tag]"]
})
  // GET /api/[nome] - List all
  .get(
    "/",
    async (): Promise<[Nome]Response[]> => {
      // Implementation
      return [];
    },
    {
      detail: {
        summary: "List All [Nome]",
        description: "Returns a paginated list of [nome]",
        tags: ["[Tag]"],
        responses: {
          200: {
            description: "List of [nome]",
            content: {
              "application/json": {
                schema: t.Array([Nome]ResponseSchema),
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: ErrorSchema,
              },
            },
          },
        },
      },
    }
  )

  // POST /api/[nome] - Create
  .post(
    "/",
    async ({ body }): Promise<[Nome]Response> => {
      // Implementation
      return {} as [Nome]Response;
    },
    {
      body: [Nome]RequestSchema,
      detail: {
        summary: "Create [Nome]",
        description: "Creates a new [nome]",
        tags: ["[Tag]"],
        requestBody: {
          description: "Request body",
          content: {
            "application/json": {
              schema: [Nome]RequestSchema,
            },
          },
        },
        responses: {
          201: {
            description: "[Nome] created successfully",
            content: {
              "application/json": {
                schema: [Nome]ResponseSchema,
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: ErrorSchema,
              },
            },
          },
          401: {
            description: "Unauthorized",
          },
        },
      },
    }
  );
```

---

## 🔍 Schemas e Validação

### Tipos Suportados (Elysia TypeBox)

```typescript
// Primitivos
t.String()              // string
t.Number()              // number
t.Boolean()             // boolean
t.Null()                // null

// Compostos
t.Object({ ... })       // objeto
t.Array(t.String())     // array
t.Tuple([t.String(), t.Number()])  // tuple
t.Union([t.String(), t.Number()])  // union
t.Literal("value")      // literal

// Modificadores
t.Optional(t.String())  // opcional
t.Nullable(t.String())  // nullable

// Validações
t.String({
  minLength: 1,
  maxLength: 100,
  pattern: "^[a-z]+$",
  format: "email" | "date-time" | "uuid"
})

t.Number({
  minimum: 0,
  maximum: 100,
  multipleOf: 5
})

t.Array(t.String(), {
  minItems: 1,
  maxItems: 10,
  uniqueItems: true
})
```

### Schema Reutilizável

```typescript
// schemas/common.ts
export const PaginationSchema = t.Object({
  page: t.Number({ minimum: 1, default: 1 }),
  limit: t.Number({ minimum: 1, maximum: 100, default: 20 }),
  total: t.Number({ minimum: 0 }),
  pages: t.Number({ minimum: 0 }),
});

export const TimestampsSchema = t.Object({
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

export const ErrorSchema = t.Object({
  success: t.Literal(false),
  error: t.Object({
    code: t.String(),
    message: t.String(),
    details: t.Optional(t.Any()),
  }),
  timestamp: t.String({ format: "date-time" }),
});
```

---

## 📖 Documentação de Rotas

### Metadados `.detail()`

Cada rota deve incluir:

```typescript
{
  detail: {
    // OBRIGATÓRIOS
    summary: "Resumo curto (50 chars)",
    description: "Descrição detalhada do endpoint",
    tags: ["Tag"],

    // OPCIONAIS (mas recomendados)
    operationId: "listBots",  // ID único para o endpoint
    deprecated: false,         // Se o endpoint está deprecado

    // REQUEST BODY (POST/PUT/PATCH)
    requestBody: {
      description: "Request body description",
      required: true,
      content: {
        "application/json": {
          schema: RequestSchema,
          examples: {
            example1: {
              summary: "Example 1",
              value: {
                name: "Grid Bot",
                strategy: "grid",
              },
            },
          },
        },
      },
    },

    // PARAMETERS (GET/DELETE)
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
        description: "Bot ID",
      },
      {
        name: "page",
        in: "query",
        required: false,
        schema: { type: "number", minimum: 1, default: 1 },
        description: "Page number",
      },
    ],

    // RESPONSES
    responses: {
      200: {
        description: "Success response",
        content: {
          "application/json": {
            schema: ResponseSchema,
            examples: {
              success: {
                summary: "Successful response",
                value: {
                  success: true,
                  data: { id: "123", name: "Bot 1" },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Bad Request",
        content: {
          "application/json": {
            schema: ErrorSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - Token missing or invalid",
      },
      403: {
        description: "Forbidden - Insufficient permissions",
      },
      404: {
        description: "Not Found",
      },
      500: {
        description: "Internal Server Error",
      },
    },

    // SECURITY (autenticação)
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
}
```

---

## 🏷️ Tags e Organização

### Tags Padrão do Projeto

```typescript
// Definidas em src/index.ts - openapi.documentation.tags

const API_TAGS = [
  { name: "Health", description: "Health check endpoints" },
  { name: "Auth", description: "Authentication & authorization" },
  { name: "Admin", description: "Admin endpoints (Company admins only)" },
  { name: "Trader", description: "Trader endpoints" },
  { name: "Influencer", description: "Influencer endpoints" },
  { name: "Bots", description: "Trading bot management" },
  { name: "Strategies", description: "Trading strategies" },
  { name: "Market", description: "Market data & analysis" },
  { name: "Portfolio", description: "Portfolio management" },
  { name: "Exchanges", description: "Exchange API keys & connections" },
];
```

### Como Usar Tags

```typescript
// No router
export const botsRouter = new Elysia({
  prefix: "/api/bots",
  tags: ["Bots"]  // ✅ Tag no nível do router
})
  .get("/", async () => { ... }, {
    detail: {
      tags: ["Bots"],  // ✅ Tag no nível da rota (opcional, herda do router)
      summary: "List Bots",
    },
  });
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Health Check (Implementado)

Ver: `backend/src/routes/health.ts`

```typescript
export const healthRouter = new Elysia({ prefix: "/health", tags: ["Health"] })
  .get("/", async (): Promise<HealthCheckResponse> => { ... }, {
    detail: {
      summary: "Full Health Check",
      description: "Returns comprehensive health status including database and Redis connectivity",
      tags: ["Health"],
      responses: {
        200: {
          description: "System health status",
          content: {
            "application/json": {
              schema: HealthCheckSchema,
            },
          },
        },
      },
    },
  });
```

### Exemplo 2: CRUD Completo (Template)

```typescript
// src/routes/bots.ts
export const botsRouter = new Elysia({ prefix: "/api/bots", tags: ["Bots"] })
  // LIST
  .get("/", async ({ query }) => { ... }, {
    detail: {
      summary: "List Bots",
      description: "Returns paginated list of trading bots",
      responses: { ... },
    },
  })

  // GET BY ID
  .get("/:id", async ({ params }) => { ... }, {
    detail: {
      summary: "Get Bot by ID",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: { ... },
    },
  })

  // CREATE
  .post("/", async ({ body }) => { ... }, {
    body: CreateBotSchema,
    detail: {
      summary: "Create Bot",
      requestBody: {
        content: {
          "application/json": {
            schema: CreateBotSchema,
          },
        },
      },
      responses: { ... },
    },
  })

  // UPDATE
  .patch("/:id", async ({ params, body }) => { ... }, {
    body: UpdateBotSchema,
    detail: {
      summary: "Update Bot",
      responses: { ... },
    },
  })

  // DELETE
  .delete("/:id", async ({ params }) => { ... }, {
    detail: {
      summary: "Delete Bot",
      responses: {
        204: { description: "Bot deleted successfully" },
        404: { description: "Bot not found" },
      },
    },
  });
```

### Exemplo 3: Autenticação Requerida

```typescript
// src/routes/portfolio.ts
export const portfolioRouter = new Elysia({
  prefix: "/api/portfolio",
  tags: ["Portfolio"]
})
  .get("/balance", async ({ headers }) => {
    // Validate JWT from headers.authorization
    // ...
  }, {
    detail: {
      summary: "Get Portfolio Balance",
      security: [
        {
          bearerAuth: [],  // ✅ Requer Bearer Token
        },
      ],
      responses: {
        200: { description: "Portfolio balance" },
        401: { description: "Unauthorized - Missing or invalid token" },
      },
    },
  });
```

---

## ✅ Checklist de Documentação

Antes de fazer commit, verifique:

- [ ] Schemas definidos com TypeBox (`t.Object({ ... })`)
- [ ] Tipos TypeScript gerados (`typeof Schema.static`)
- [ ] Tag correta no router
- [ ] `.detail()` em TODAS as rotas
- [ ] `summary` e `description` claros
- [ ] Todos os códigos de status documentados (200, 400, 401, 404, 500)
- [ ] Request body documentado (POST/PUT/PATCH)
- [ ] Parameters documentados (path/query)
- [ ] Exemplos incluídos (opcional, mas recomendado)
- [ ] Security definida (se autenticação necessária)

---

## 🚀 Próximos Passos

1. **Sprint 2**: Implementar rotas de Bots seguindo este padrão
2. **Sprint 3**: Implementar rotas de Strategies
3. **Sprint 4**: Implementar rotas de Admin

**Referências:**
- [Elysia OpenAPI Plugin](https://elysiajs.com/plugins/openapi.html)
- [Elysia TypeBox Validation](https://elysiajs.com/validation/overview.html)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)

---

**Última atualização:** 2025-01-12
**Versão:** 1.0.0
