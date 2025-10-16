# Configuração Claude Code - Beecripto

Este diretório contém customizações para o Claude Code específicas do projeto Beecripto.

## Estrutura

```
.claude/
├── commands/          # Slash commands personalizados (34 comandos)
│   ├── agent-cto-validate.md      # Validação CTO
│   ├── backtest-run.md            # Executar backtest
│   ├── dev-analyze-dependencies.md # Análise de dependências
│   ├── dev-code-review.md         # Code review profundo
│   ├── exchange-test.md           # Testar CCXT
│   ├── project-health-check.md    # Health check
│   ├── project-init.md            # Inicializar módulo
│   ├── strategy-validate.md       # Validar estratégia
│   └── ... (26 comandos SuperClaude Framework)
├── agents/            # Agentes especializados (9 specialists)
├── mcp/              # Servidores MCP
└── hooks/            # Hooks de eventos (pré/pós ações)
```

## Comandos Disponíveis

### Gerenciamento de Projeto

#### `/project-init`
Inicializa novo módulo/feature seguindo protocolos do AGENTS.md.
- Cria estrutura de pastas
- Gera workflows Mermaid
- Valida padrões de código

#### `/project-health-check`
Verifica saúde completa do projeto (código, testes, segurança, docs).
- TypeScript check
- Lint & format
- Test coverage
- Security audit

### Desenvolvimento

#### `/dev-code-review`
Code review profundo seguindo as 53 Regras de Ouro.
- Qualidade de código
- Segurança
- Performance
- Testes

#### `/dev-analyze-dependencies`
Analisa dependências antes de modificar arquivo (Regra 53).
- Identifica arquivos linkados
- Mapeia impacto
- Planeja cascata

### Trading & CCXT

#### `/strategy-validate`
Valida estratégia de trading antes de produção.
- Código da estratégia
- Indicadores técnicos
- Risk management
- Backtesting results

#### `/backtest-run`
Executa backtest de estratégia contra dados históricos.
- Carrega dados históricos
- Calcula indicadores
- Simula trades
- Gera métricas

#### `/exchange-test`
Testa conexão e funcionalidades de exchange via CCXT.
- Connection test
- Market data
- Account info
- Error handling

### Governança & Protocolos

#### `/agent-cto-validate`
Validação completa do Agente-CTO antes de iniciar desenvolvimento.
- Checa todas as 53 Regras
- Valida protocolos
- Aprova ou rejeita tarefa

#### Protocolos Obrigatórios
- **Auto-Validação**: 3 Perguntas Críticas antes de completar tarefa
  → [AGENT_SELF_VALIDATION_PROTOCOL.md](./AGENT_SELF_VALIDATION_PROTOCOL.md)

- **Documentação Oficial**: 5 Momentos obrigatórios de consulta
  → [DOCUMENTATION_CONSULTATION_PROTOCOL.md](./DOCUMENTATION_CONSULTATION_PROTOCOL.md)

- **Resolução de Problemas**: Sistema L1-L4 com agentes paralelos
  → [PROBLEM_SOLVING_WORKFLOW.md](./PROBLEM_SOLVING_WORKFLOW.md)


## Como Usar Slash Commands

1. Digite `/` no terminal Claude Code
2. Selecione o comando desejado
3. O comando será expandido para um prompt completo
4. Claude executará a tarefa descrita

## Adicionando Novos Comandos

Crie um arquivo `.md` na pasta `commands/` com:

```markdown
---
description: Breve descrição do comando
---

Instruções detalhadas do que o Claude deve fazer...
```

## Plugins Recomendados

Veja `PLUGINS_RECOMENDADOS.md` na raiz do projeto para lista completa de plugins úteis.

## Próximos Passos

1. Teste os comandos personalizados
2. Instale plugins dos marketplaces
3. Adicione mais comandos conforme necessário
4. Configure hooks para automações
5. Compartilhe com a equipe

## Recursos

- [Documentação Claude Code](https://docs.claude.com/claude-code)
- [Criando Slash Commands](https://docs.claude.com/claude-code/slash-commands)
- [Plugin System](https://www.anthropic.com/news/claude-code-plugins)
