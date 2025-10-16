# 📋 Migrations - Ordem e Estrutura

## ✅ Estrutura Organizada

**Localização**: `backend/drizzle/` (única e oficial)

**Total de Migrations**: 16

---

## 🔢 Ordem de Execução

### Migrations Geradas pelo Drizzle Kit (0000-0010)

Estas migrations foram geradas automaticamente pelo `drizzle-kit generate`.

| # | Arquivo | Descrição | Data |
|---|---------|-----------|------|
| 0000 | `burly_la_nuit.sql` | Initial schema | 2024-12-15 |
| 0001 | `graceful_tigra.sql` | Schema updates | 2024-12-15 |
| 0002 | `naive_inertia.sql` | Additional tables | 2024-12-15 |
| 0003 | `easy_abomination.sql` | Schema refinements | 2024-12-16 |
| 0004 | `complete_ghost_rider.sql` | Core modules | 2024-12-16 |
| 0005 | `brief_fixer.sql` | Fixes and adjustments | 2024-12-16 |
| 0006 | `third_talkback.sql` | Extended schema | 2024-12-16 |
| 0007 | `marvelous_captain_flint.sql` | Additional features | 2024-12-16 |
| 0008 | `huge_hemingway.sql` | Major schema update | 2024-12-16 |
| 0009 | `living_bloodscream.sql` | Type corrections (text for FK) | 2024-12-16 |
| 0010 | `migrate_subscription_plans_to_multi_period.sql` | Multi-period support | 2024-12-16 |

### Migrations Manuais Organizadas (0011-0016)

Estas migrations foram criadas manualmente e reorganizadas para manter ordem cronológica.

| # | Arquivo | Descrição | Origem | Data |
|---|---------|-----------|--------|------|
| 0011 | `documents_manager.sql` | Documents module (folders, documents, shares) | `drizzle/migrations/0003` | 2024-10-16 |
| 0012 | `payment_gateway_system.sql` | Payment gateways schema | `drizzle/migrations/0004` | 2024-10-16 |
| 0013 | `create_marketing_tables.sql` | Marketing module (leads, campaigns, templates) | `migrations/0008` | 2024-10-16 |
| 0014 | `create_tax_jurisdiction_tables.sql` | Tax jurisdiction tables | `migrations/001` | 2024-10-16 |
| 0015 | `create_subscriptions_corrected.sql` | Subscriptions complete (manual correction) | Manual | 2024-10-16 |
| 0016 | `sales_crm.sql` | Sales CRM (contacts, deals, pipeline, forecasts) | `migrations/008` | 2024-10-16 |

---

## 📚 Módulos por Migration

### Core System (0000-0010)
- Tenants, Users, Departments
- Authentication & Authorization
- Audit & Security
- Configurations
- Notifications
- Rate Limiting
- Financial (base)
- Subscriptions (base)

### Documents Module (0011)
**Tabelas**: 3
- `folders` - Hierarchical folder structure
- `documents` - Document management with versioning
- `document_shares` - Sharing and permissions

### Payment Gateway (0012)
**Tabelas**: 5
- `payment_gateways` - Gateway configurations
- `payment_transactions` - Transaction records
- `payment_refunds` - Refund tracking
- `payment_webhooks` - Webhook events
- `payment_dunning` - Retry logic

### Marketing Module (0013)
**Tabelas**: 7
- `leads` - Lead management
- `campaigns` - Marketing campaigns
- `email_templates` - Email templates
- `campaign_sends` - Send tracking
- `lead_activities` - Activity timeline
- `campaign_analytics` - Campaign metrics
- `lead_segments` - Segmentation

### Tax System (0014)
**Tabelas**: 4
- `tax_jurisdictions` - Tax configuration by region
- `tax_rates` - Tax rates history
- `tax_rules` - Calculation rules
- `tax_reports` - Generated reports

### Subscriptions Extended (0015)
**Tabelas**: 8 (complete rewrite)
- `subscription_plans` - Plan definitions
- `subscription_features` - Feature catalog
- `subscription_plan_features` - Plan-feature mapping
- `subscriptions` - Active subscriptions
- `subscription_history` - Change history
- `subscription_invoices` - Billing records
- `subscription_notifications` - Notifications
- `subscription_usage` - Usage tracking

### Sales CRM Module (0016)
**Tabelas**: 7
- `contacts` - Contact management (people & companies)
- `deals` - Sales deals tracking
- `pipeline_stages` - Sales pipeline stages
- `activities` - Sales activities (calls, meetings, emails)
- `notes` - Contact and deal notes
- `sales_targets` - Sales targets and quotas
- `sales_forecasts` - Revenue forecasting

---

## 🔧 Como Executar Migrations

### Usando Drizzle Kit (Recomendado)

```bash
# Gerar nova migration
bun drizzle-kit generate

# Aplicar migrations pendentes
bun drizzle-kit push

# Ver status
bun drizzle-kit status
```

### Manualmente (SQL direto)

```bash
# Conectar ao banco
psql $DATABASE_URL

# Executar migration específica
\i drizzle/0011_documents_manager.sql
```

### Via Código (Runtime)

```typescript
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db';

await migrate(db, { migrationsFolder: './drizzle' });
```

---

## ⚠️ Regras Importantes

### 1. **Localização Única**
✅ SEMPRE: `backend/drizzle/*.sql`  
❌ NUNCA: `backend/drizzle/migrations/`, `backend/migrations/`

### 2. **Numeração Sequencial**
- Drizzle Kit gera automaticamente com nomes aleatórios
- Migrations manuais devem seguir próximo número disponível
- Nunca reutilizar números

### 3. **Não Modificar Migrations Aplicadas**
- Migrations já aplicadas em produção são **IMUTÁVEIS**
- Para correções, criar nova migration

### 4. **Sempre Documentar**
- Comentar migrations manuais
- Explicar motivo de cada mudança
- Manter este README atualizado

### 5. **Backup Antes de Aplicar**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🔍 Verificação de Integridade

### Checar Status das Migrations

```sql
-- Ver migrations aplicadas
SELECT * FROM drizzle_migrations ORDER BY idx;

-- Verificar última migration
SELECT MAX(idx) as last_migration, tag 
FROM drizzle_migrations 
GROUP BY tag 
ORDER BY MAX(idx) DESC 
LIMIT 1;
```

### Validar Estrutura

```bash
# Comparar schema do banco com código
bun drizzle-kit check
```

---

## 📊 Estatísticas

**Total de Tabelas**: ~60+  
**Total de Migrations**: 17  
**Última Migration**: 0016_sales_crm  
**Status**: ✅ Organizado e Sequencial  

---

## 🚀 Próximas Migrations

Quando criar novas migrations:

1. Usar Drizzle Kit para gerar:
   ```bash
   bun drizzle-kit generate
   ```

2. Ou criar manualmente com próximo número (0017+):
   ```bash
   touch drizzle/0017_my_feature.sql
   ```

3. Atualizar este README

4. Testar em development primeiro

5. Fazer backup antes de aplicar em production

---

**Última Atualização**: 2024-10-16  
**Organizado por**: Claude (Agente-CTO)  
**Status**: ✅ Estrutura Limpa e Organizada

