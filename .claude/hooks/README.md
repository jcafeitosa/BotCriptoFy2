# Hooks do Claude Code

Hooks permitem executar comandos automaticamente em resposta a eventos.

## Tipos de Hooks Disponíveis

- `user-prompt-submit-hook`: Executado quando o usuário submete um prompt
- `tool-use-hook`: Executado antes/depois de usar uma ferramenta
- Outros hooks conforme documentação oficial

## Exemplo de Hook

Crie arquivos de configuração aqui para automatizar tarefas como:

1. **Validação antes de commit**
   - Rodar linters
   - Verificar testes
   - Validar formato de código

2. **Análise de segurança**
   - Scan de vulnerabilidades
   - Verificação de dependências
   - Auditoria de código sensível

3. **Documentação automática**
   - Atualizar README
   - Gerar docs de API
   - Atualizar changelog

## Configuração

Consulte a documentação oficial para sintaxe e configuração de hooks:
https://docs.claude.com/claude-code/hooks

## Exemplos Práticos

```bash
# Hook para validar antes de commit
# Adicione em settings do Claude Code
```

Mantenha hooks leves e rápidos para não impactar o workflow.
