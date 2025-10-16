# Sistema de Logging - Upgrade Profissional

## Melhorias Implementadas

### 1. Formato Padronizado e Profissional

**Formato Console (Development):**
```
[YYYY-MM-DD HH:mm:ss.SSS] [ LEVEL ] [ SOURCE ] - message {metadata}
```

**Exemplo Real:**
```
[2025-10-16 20:15:30.123] [ INFO  ] [ server      ] - Starting server on port 3000 {"environment":"development","version":"1.0.0"}
[2025-10-16 20:15:30.456] [ INFO  ] [ server      ] - Server ready at http://localhost:3000 {"environment":"development"}
[2025-10-16 20:15:30.457] [ INFO  ] [ server      ] - ├─ API Docs: http://localhost:3000/swagger
[2025-10-16 20:15:30.458] [ INFO  ] [ server      ] - └─ Health: http://localhost:3000/
[2025-10-16 20:15:31.234] [ HTTP  ] [ http        ] - ← GET /api/users 200 45ms {"source":"http","correlation_id":"..."}
[2025-10-16 20:15:32.567] [ WARN  ] [ http        ] - ← GET /api/invalid 404 12ms {"source":"http","correlation_id":"..."}
[2025-10-16 20:15:33.890] [ ERROR ] [ http        ] - ✗ GET /api/error 500 123ms - Database error {"source":"http","error_type":"DatabaseError"}
```

### 2. Níveis de Log (RFC 5424)

| Level   | Severity | Color       | Uso                                    |
|---------|----------|-------------|----------------------------------------|
| `FATAL` | 0        | Bold Red    | Erros críticos (process exit)          |
| `ERROR` | 1        | Red         | Erros que permitem continuação         |
| `WARN`  | 2        | Yellow      | Situações potencialmente problemáticas |
| `INFO`  | 3        | Cyan        | Informações de progresso               |
| `HTTP`  | 4        | Magenta     | Requisições HTTP                       |
| `DEBUG` | 5        | Blue        | Informações de debug                   |
| `TRACE` | 6        | Gray        | Informações diagnósticas detalhadas    |

### 3. Estrutura de Mensagens

#### ANTES (Verbose e Confuso):
```
🚀 Starting BotCriptoFy2 API Server... {"port":"3000","environment":"development","nodeVersion":"v24.3.0","bunVersion":"1.3.0"}
✅ Server is ready {"port":3000,"hostname":"localhost","url":"http://localhost:3000","docs":"http://localhost:3000/swagger","environment":"development","runtime":"Bun v1.3.0"}
```

#### DEPOIS (Limpo e Profissional):
```
[2025-10-16 20:15:30.123] [ INFO  ] [ server      ] - Starting server on port 3000 {"environment":"development","version":"1.0.0"}
[2025-10-16 20:15:30.456] [ INFO  ] [ server      ] - Server ready at http://localhost:3000 {"environment":"development"}
[2025-10-16 20:15:30.457] [ INFO  ] [ server      ] - ├─ API Docs: http://localhost:3000/swagger
[2025-10-16 20:15:30.458] [ INFO  ] [ server      ] - └─ Health: http://localhost:3000/
```

### 4. Logs HTTP Otimizados

#### Requisições de Entrada (Debug Level):
```
[2025-10-16 20:15:31.000] [ DEBUG ] [ http        ] - → GET /api/users {"correlation_id":"550e8400-..."}
```

#### Requisições de Saída (HTTP Level):
```
[2025-10-16 20:15:31.045] [ HTTP  ] [ http        ] - ← GET /api/users 200 45ms {"source":"http","correlation_id":"550e8400-..."}
```

#### Erros HTTP:
```
[2025-10-16 20:15:31.123] [ ERROR ] [ http        ] - ✗ GET /api/error 500 123ms - Database connection failed {"source":"http","correlation_id":"550e8400-...","error_type":"DatabaseError"}
```

### 5. Metadata Limpo e Conciso

**Princípios:**
- ✅ Apenas informações essenciais
- ✅ Mensagem principal descritiva (não repetir no metadata)
- ✅ Metadata complementar, não redundante
- ✅ Stack traces apenas para erros 5xx
- ✅ User-agent e IP removidos de logs normais (apenas em erros)

**Exemplo:**

```typescript
// ANTES - Verbose
logger.info('Server started successfully', {
  server: {
    port: 3000,
    hostname: 'localhost',
    url: 'http://localhost:3000',
    docs: 'http://localhost:3000/swagger',
    environment: 'development',
  },
  runtime: {
    node: 'v24.3.0',
    bun: 'v1.3.0',
  },
});

// DEPOIS - Conciso
logger.info('Server ready at http://localhost:3000', {
  source: 'server',
  environment: 'development',
});
```

### 6. Correlation IDs

Cada requisição recebe um `correlation_id` único para rastreamento distribuído:

```
[2025-10-16 20:15:31.000] [ DEBUG ] [ http        ] - → GET /api/users {"correlation_id":"550e8400-e29b-41d4-a716-446655440000"}
[2025-10-16 20:15:31.010] [ DEBUG ] [ database    ] - Query executed {"correlation_id":"550e8400-e29b-41d4-a716-446655440000"}
[2025-10-16 20:15:31.045] [ HTTP  ] [ http        ] - ← GET /api/users 200 45ms {"correlation_id":"550e8400-e29b-41d4-a716-446655440000"}
```

### 7. Origem/Source Tag

Cada log identifica sua origem:

- `server` - Eventos do servidor
- `http` - Requisições HTTP
- `process` - Eventos do processo
- `database` - Operações de banco
- `auth` - Autenticação
- `cache` - Cache (Redis)
- Custom sources...

### 8. Símbolos Visuais

- `→` - Requisição de entrada
- `←` - Requisição de saída (sucesso)
- `✗` - Erro
- `├─` - Item da lista (não último)
- `└─` - Item da lista (último)

### 9. Cores ANSI (Development)

Aplicadas diretamente no formato, sem dependência do Winston colorize:

```typescript
const colors = {
  FATAL: '\x1b[1m\x1b[31m', // bold red
  ERROR: '\x1b[31m',         // red
  WARN: '\x1b[33m',          // yellow
  INFO: '\x1b[36m',          // cyan
  HTTP: '\x1b[35m',          // magenta
  DEBUG: '\x1b[34m',         // blue
  TRACE: '\x1b[90m',         // gray
};
```

### 10. JSON Estruturado (Production)

Formato compatível com OpenTelemetry:

```json
{
  "@timestamp": "2025-10-16T20:15:30.123Z",
  "level": "INFO",
  "severity": 3,
  "message": "Server ready at http://localhost:3000",
  "service": {
    "name": "botcriptofy2-api",
    "version": "1.0.0",
    "environment": "production"
  },
  "host": {
    "hostname": "api-server-01",
    "platform": "linux",
    "pid": 12345
  },
  "runtime": {
    "node": "v24.3.0",
    "bun": "1.3.0"
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "context": {
    "environment": "production"
  }
}
```

## Comparação Visual

### ANTES:
```
23:57:03 INFO Server starting {"port":3000,"env":"development"}
23:57:03 HTTP GET /api/users {"req":{"method":"GET","url":"/api/users"},"res":{"statusCode":200},"responseTime":45}
🚀 Starting BotCriptoFy2 API Server... {"port":"3000"}
✅ Server is ready {"port":3000,"hostname":"localhost","url":"http://localhost:3000","docs":"http://localhost:3000/swagger"}
```

### DEPOIS:
```
[2025-10-16 20:15:30.123] [ INFO  ] [ server      ] - Starting server on port 3000 {"environment":"development","version":"1.0.0"}
[2025-10-16 20:15:30.456] [ INFO  ] [ server      ] - Server ready at http://localhost:3000 {"environment":"development"}
[2025-10-16 20:15:30.457] [ INFO  ] [ server      ] - ├─ API Docs: http://localhost:3000/swagger
[2025-10-16 20:15:30.458] [ INFO  ] [ server      ] - └─ Health: http://localhost:3000/
[2025-10-16 20:15:31.045] [ HTTP  ] [ http        ] - ← GET /api/users 200 45ms {"source":"http","correlation_id":"550e8400-..."}
```

## Benefícios

### 1. Legibilidade
- ✅ Formato consistente e alinhado
- ✅ Timestamp preciso (milissegundos)
- ✅ Fonte identificável imediatamente
- ✅ Cores para identificação rápida
- ✅ Mensagens descritivas

### 2. Performance
- ✅ Menos metadata = menor I/O
- ✅ Logs mais compactos
- ✅ Rotação otimizada

### 3. Rastreabilidade
- ✅ Correlation IDs únicos
- ✅ Source tag em cada log
- ✅ Stack traces apenas quando necessário
- ✅ Contexto essencial preservado

### 4. Profissionalismo
- ✅ Sem emojis em logs
- ✅ Formato enterprise-grade
- ✅ Compatível com ferramentas de análise
- ✅ OpenTelemetry-compatible (produção)

### 5. Manutenibilidade
- ✅ Fácil de parsear
- ✅ Fácil de filtrar
- ✅ Fácil de buscar
- ✅ Consistente em todo o sistema

## Arquivos Modificados

1. **`src/utils/logger.ts`**
   - Novo formato de desenvolvimento
   - Cores ANSI customizadas
   - Metadata limpo
   - Helper functions otimizadas

2. **`src/middleware/logger.middleware.ts`**
   - Correlation IDs
   - Logs HTTP otimizados
   - Metadata mínimo essencial
   - Source tags

3. **`src/index.ts`**
   - Logs de startup limpos
   - Shutdown logs concisos
   - Error handlers otimizados
   - Source identification

4. **`LOGGING.md`**
   - Documentação completa atualizada
   - Exemplos práticos
   - Best practices

## Próximos Passos (Opcional)

1. **AsyncLocalStorage** - Context propagation automático
2. **Structured Logging Lib** - Pino ou Bunyan para performance extra
3. **Log Sampling** - Rate limiting para logs de alta frequência
4. **Dynamic Log Levels** - Mudar nível sem restart
5. **Log Shipping** - Integração com ELK, Datadog, etc.

---

**Status:** ✅ Completo e pronto para produção  
**Data:** 2025-10-16  
**Versão:** 2.0.0 (Enterprise-Grade)

