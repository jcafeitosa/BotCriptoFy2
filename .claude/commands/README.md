# Comandos Específicos do Domínio

Esta pasta contém comandos slash personalizados que são **específicos do domínio** do projeto (trading/cryptocurrency).

## ⚠️ Importante

Estes comandos **NÃO fazem parte** do framework genérico de desenvolvimento. Eles foram criados especificamente para o contexto de **trading automatizado** e **cryptocurrency**.

## Comandos Disponíveis

### `/exchange-test`
Testa conexão e funcionalidades de exchanges via CCXT.

**Uso**: Validar integração com exchanges de criptomoedas.

### `/backtest-run`
Executa backtesting de estratégias de trading contra dados históricos.

**Uso**: Testar estratégias antes de deploy em produção.

### `/strategy-validate`
Valida estratégias de trading antes de deploy.

**Uso**: Garantir que estratégias seguem padrões de segurança e risk management.

## Como Usar

Estes comandos não são carregados automaticamente. Para usá-los:

1. **Mova-os de volta** para `.claude/commands/` quando necessário
2. **Ou** acesse diretamente pela documentação
3. **Ou** use como template para criar comandos específicos do seu domínio

## Adaptando para Outros Domínios

Se você está trabalhando em outro tipo de projeto:

- **E-commerce**: Crie comandos para validar checkouts, pagamentos, inventário
- **SaaS**: Crie comandos para validar subscriptions, billing, multi-tenancy
- **FinTech**: Crie comandos para validar compliance, KYC, transações
- **Healthcare**: Crie comandos para validar HIPAA, HL7, FHIR

## Estrutura Recomendada

```
.claude/commands/
├── domain-specific/           # Comandos específicos do domínio
│   ├── README.md             # Este arquivo
│   ├── exchange-test.md      # Exemplo: Trading
│   ├── backtest-run.md       # Exemplo: Trading
│   └── strategy-validate.md  # Exemplo: Trading
└── *.md                      # Comandos genéricos (core)
```

## Comandos Core (Genéricos)

Os comandos na pasta raiz `.claude/commands/` devem ser **agnósticos de domínio** e aplicáveis a qualquer tipo de projeto:

- `/agent-cto-validate` - Validação de protocolo CTO
- `/dev-code-review` - Code review profundo
- `/dev-analyze-dependencies` - Análise de dependências
- `/project-init` - Inicializar módulo
- `/project-health-check` - Health check
- E todos os comandos do SuperClaude Framework

---

**Princípio**: Mantenha comandos genéricos na raiz, comandos de domínio em subpastas.
