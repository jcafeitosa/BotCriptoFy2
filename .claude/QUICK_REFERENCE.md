# ⚡ Quick Reference - Agentes

## 🔄 Antes de Iniciar Tarefa

```bash
# 1. Validação CTO
/cto

# 2. Análise de dependências
/deps
```

## 🛠️ Durante Desenvolvimento

### 3 Perguntas Críticas (SEMPRE)
1. ❓ Atende ao MAIS ALTO padrão?
2. ❓ Segui TODOS os protocolos?
3. ❓ Considerei TODAS as consequências?

### Consulta Docs Oficiais (5 Momentos)
- ✅ Antes de iniciar
- ✅ Durante planejamento
- ✅ Durante dev (cada método)
- ✅ Quando problemas
- ✅ Após implementação

## 🔍 Resolução de Problemas

| Score | Nível | Agentes | Tempo |
|-------|-------|---------|-------|
| 4-6 | L1 | 1 | <15min |
| 7-9 | L2 | 1-2 | <1h |
| 10-12 | L3 | 2-4 ∥ | <4h |
| 13+ | L4 | 4+ ∥ | <8h |

**Score = Módulos + Domínios + Reprodução + Impacto**

```bash
# L3+ Use paralelo
/task --parallel
```

## ✅ Antes de PR

```bash
/review        # Code review
/health        # Health check
/test          # Tests
```

## 📚 Docs Completos

- [AGENT_SELF_VALIDATION_PROTOCOL.md](./AGENT_SELF_VALIDATION_PROTOCOL.md)
- [DOCUMENTATION_CONSULTATION_PROTOCOL.md](./DOCUMENTATION_CONSULTATION_PROTOCOL.md)
- [PROBLEM_SOLVING_WORKFLOW.md](./PROBLEM_SOLVING_WORKFLOW.md)

---

**Zero Tolerância**: Mocks | Placeholders | Testes falhando | Vulnerabilidades
