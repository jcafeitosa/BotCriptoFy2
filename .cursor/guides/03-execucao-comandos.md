# Execução de Comandos

## Visão Geral

O Cursor Agent pode executar comandos no terminal através da ferramenta `run_terminal_cmd`, operando em um **sandbox seguro** por padrão com sistema de permissões granulares.

---

## run_terminal_cmd

### Descrição
Executa comandos shell com controle de permissões e persistência de ambiente.

### Parâmetros

```typescript
{
  command: string,                // Comando a executar
  is_background: boolean,         // Executar em background
  explanation?: string,           // Por que executar este comando
  required_permissions?: string[] // ['network', 'git_write', 'all']
}
```

### Sandbox Padrão

Por padrão, comandos executam em **sandbox** que permite:

✅ **Operações Permitidas:**
- Leitura de arquivos no workspace
- Escrita na maioria dos arquivos
- Comandos git readonly (`git status`, `git log`)
- Builds locais
- Comandos de análise

❌ **Operações Restritas:**
- Instalação de pacotes (requer `network`)
- Commits git (requer `git_write`)
- Modificações em `.git` (requer `git_write`)
- Acesso a rede/APIs (requer `network`)
- Arquivos ignorados (requer `all`)

---

## Sistema de Permissões

### 1. Sem Permissões (Padrão)

Sandbox completo, operações locais e seguras.

```typescript
{
  command: "ls -la src/",
  is_background: false
}
// Sem required_permissions = sandbox padrão
```

### 2. network

Necessário para:
- Instalação de pacotes (`npm install`, `pip install`)
- Chamadas de API
- Hospedar servidores
- Fetch de dependências
- Download de recursos

```typescript
{
  command: "npm install axios",
  is_background: false,
  required_permissions: ["network"]
}
```

### 3. git_write

Necessário para:
- `git commit`
- `git checkout`
- `git branch`
- `git merge`
- Qualquer modificação em `.git/`

```typescript
{
  command: "git add . && git commit -m 'feat: add auth'",
  is_background: false,
  required_permissions: ["git_write"]
}
```

### 4. all

Desabilita sandbox completamente. Use com EXTREMA cautela.

Necessário para:
- Acesso a arquivos ignorados
- Operações de sistema específicas
- Acesso a dispositivos USB (bloqueado de qualquer forma)

```typescript
{
  command: "some-restricted-operation",
  is_background: false,
  required_permissions: ["all"]
}
```

⚠️ **Cuidado**: `all` remove todas as proteções do sandbox.

---

## Exemplos

### Exemplo 1: Listar Arquivos

```typescript
{
  command: "ls -la src/components",
  is_background: false,
  explanation: "Listar componentes disponíveis"
}
```

### Exemplo 2: Instalar Pacotes

```typescript
{
  command: "npm install --save zod",
  is_background: false,
  required_permissions: ["network"],
  explanation: "Instalar biblioteca de validação Zod"
}
```

### Exemplo 3: Executar Testes

```typescript
{
  command: "npm test",
  is_background: false,
  explanation: "Executar suite de testes"
}
```

### Exemplo 4: Build do Projeto

```typescript
{
  command: "npm run build",
  is_background: false,
  explanation: "Compilar projeto para produção"
}
```

### Exemplo 5: Servidor em Background

```typescript
{
  command: "npm run dev",
  is_background: true,  // ← Background!
  required_permissions: ["network"],
  explanation: "Iniciar servidor de desenvolvimento"
}
```

### Exemplo 6: Commit (Git Write)

```typescript
{
  command: "git add . && git commit -m 'feat: implement user auth'",
  is_background: false,
  required_permissions: ["git_write"],
  explanation: "Commitar implementação de autenticação"
}
```

### Exemplo 7: Criar Branch

```typescript
{
  command: "git checkout -b feature/payment-integration",
  is_background: false,
  required_permissions: ["git_write"],
  explanation: "Criar branch para feature de pagamentos"
}
```

### Exemplo 8: Análise de Código

```typescript
{
  command: "eslint src/ --format json",
  is_background: false,
  explanation: "Analisar qualidade do código"
}
```

---

## Persistência de Ambiente

### Shell Persistente

Quando você está na **mesma shell**, o ambiente persiste:

```typescript
// Comando 1
{ command: "cd backend" }

// Comando 2 (mesma shell)
{ command: "pwd" }  // Retorna: /path/to/backend

// Comando 3 (mesma shell)
{ command: "npm install" }  // Executa em backend/
```

### Nova Shell

Se você está em **nova shell**, precisa reconfigurar:

```typescript
// Nova shell: sempre volte ao diretório correto
{
  command: "cd backend && npm install",
  required_permissions: ["network"]
}
```

### Variáveis de Ambiente

Exports persistem na mesma shell:

```typescript
// Comando 1
{ command: "export NODE_ENV=production" }

// Comando 2 (mesma shell)
{ command: "echo $NODE_ENV" }  // Retorna: production
```

---

## Comandos em Background

### Quando Usar

Use `is_background: true` para:
- Servidores (dev, prod)
- Watchers (`npm run watch`)
- Processos longos
- Comandos que não terminam

### Como Usar

```typescript
{
  command: "npm run dev",
  is_background: true,
  required_permissions: ["network"]
}
```

⚠️ **Não adicione `&` no comando**: Use o parâmetro `is_background`.

```typescript
// ❌ Incorreto
{ command: "npm run dev &" }

// ✅ Correto
{ 
  command: "npm run dev",
  is_background: true
}
```

### Interromper Processos Background

Processos em background podem ser interrompidos pelo usuário ou automaticamente ao fim da sessão.

---

## Flags Não-Interativas

### Regra Importante

⚠️ **SEMPRE use flags não-interativas** para comandos que podem pedir input.

O usuário não está disponível para interagir!

```typescript
// ❌ Incorreto: pode pedir confirmação
{ command: "npx create-react-app my-app" }

// ✅ Correto: flag --yes
{
  command: "npx create-react-app my-app --yes",
  required_permissions: ["network"]
}
```

### Exemplos Comuns

| Comando | Flag Não-Interativa |
|---------|---------------------|
| `npx` | `--yes` |
| `npm install` | `--yes` ou `-y` |
| `apt-get` | `-y` |
| `rm` | `-f` (force) |
| `cp` | `-f` (force overwrite) |

---

## Regras de Git

### Operações Permitidas Sem Permissão

```typescript
// ✅ Readonly - não precisa de permissão
git status
git log
git diff
git show
git branch -v  // Listar branches
```

### Operações que Requerem git_write

```typescript
// ❌ Precisa de git_write
git commit
git checkout
git branch feature/x  // Criar branch
git merge
git rebase
git push
git pull
git add
git rm
```

### Operações Proibidas

```typescript
// ❌ NUNCA faça (a menos que usuário peça explicitamente)
git push --force
git reset --hard HEAD~1
git push origin main --force

// Protocolo CTO: avise o usuário se pedir isso!
```

### Boas Práticas Git

1. **Nunca force push para main/master**
2. **Nunca skip hooks** (`--no-verify`, `--no-gpg-sign`)
3. **Nunca update git config**
4. **Commits apenas quando usuário pede explicitamente**

---

## Workflow de Desenvolvimento

### Setup Inicial do Projeto

```typescript
// 1. Clonar repositório (ou criar)
{
  command: "git init",
  required_permissions: ["git_write"]
}

// 2. Instalar dependências
{
  command: "npm install",
  required_permissions: ["network"]
}

// 3. Verificar setup
{
  command: "npm run build",
  is_background: false
}
```

### Desenvolvimento de Feature

```typescript
// 1. Criar branch
{
  command: "git checkout -b feature/user-profile",
  required_permissions: ["git_write"]
}

// 2. Fazer mudanças (usando outras ferramentas)
// ... edições com search_replace, write, etc ...

// 3. Executar testes
{
  command: "npm test",
  is_background: false
}

// 4. Executar linter
{
  command: "npm run lint",
  is_background: false
}

// 5. Commit (APENAS se usuário pedir)
{
  command: "git add . && git commit -m 'feat: add user profile page'",
  required_permissions: ["git_write"]
}
```

### CI/CD Local

```typescript
// Simular pipeline CI/CD
{
  command: "npm run lint && npm test && npm run build",
  is_background: false,
  explanation: "Validar código antes de push"
}
```

---

## Troubleshooting

### Erro: "Permission Denied"

**Causa**: Operação requer permissão não solicitada.

**Solução**: Adicione `required_permissions`.

```typescript
// Erro em:
{ command: "npm install axios" }

// Corrigir para:
{
  command: "npm install axios",
  required_permissions: ["network"]
}
```

### Erro: "Cannot Access File"

**Causa**: Arquivo está no `.gitignore` ou `.cursorignore`.

**Solução**: 
1. Remova do ignore (se apropriado)
2. Ou solicite permissão `all` (com cautela)

### Comando Trava

**Causa**: Comando está esperando input do usuário.

**Solução**: Use flags não-interativas.

```typescript
// Travava:
{ command: "npx some-tool" }

// Corrigir:
{ command: "npx some-tool --yes" }
```

### Variável de Ambiente Não Persiste

**Causa**: Executando em shells diferentes.

**Solução**: Exporte na mesma linha do comando.

```typescript
{
  command: "NODE_ENV=production npm run build"
}
```

---

## Comandos Úteis por Categoria

### Análise de Código

```bash
# ESLint
eslint src/ --format json

# Prettier
prettier --check "src/**/*.ts"

# TypeScript
tsc --noEmit

# Coverage
npm test -- --coverage
```

### Build e Deploy

```bash
# Build produção
npm run build

# Build com análise
npm run build -- --analyze

# Deploy
npm run deploy
```

### Testes

```bash
# Todos os testes
npm test

# Específico
npm test -- user.test.ts

# Watch mode
npm test -- --watch  # (em background)

# Coverage
npm test -- --coverage
```

### Git

```bash
# Status
git status

# Log
git log --oneline -10

# Diff
git diff

# Branches
git branch -v
```

### Dependências

```bash
# Instalar
npm install

# Atualizar
npm update

# Auditoria
npm audit

# Listar outdated
npm outdated
```

---

## Integração com Protocolo CTO

### Antes de Executar Comando

- [ ] Comando é necessário ou posso usar ferramenta especializada?
- [ ] Comando precisa de permissões? Quais?
- [ ] Comando é interativo? Adicionei flag não-interativa?
- [ ] Comando é destrutivo? Avisei o usuário?

### Durante Execução

- [ ] Estou na shell correta?
- [ ] Variáveis de ambiente estão configuradas?
- [ ] Comando longo está em background?

### Após Execução

- [ ] Verifico output para erros?
- [ ] Preciso executar comandos relacionados?
- [ ] Preciso validar resultado (testes, lints)?

---

## Checklist de Segurança

### ✅ Sempre Seguro

- Comandos readonly
- Análise de código
- Builds locais
- Testes

### ⚠️ Requer Cuidado

- Instalação de pacotes (network)
- Commits (git_write)
- Modificações em branches (git_write)

### ❌ Extremo Cuidado

- `all` permissions
- Comandos destrutivos (`rm -rf`)
- Force push
- Hard reset

---

## Melhores Práticas

### 1. Prefira Ferramentas Especializadas

```typescript
// ❌ Evite
{ command: "cat file.ts" }

// ✅ Use
read_file({ target_file: "file.ts" })

// ❌ Evite
{ command: "echo 'content' > file.ts" }

// ✅ Use
write({ file_path: "file.ts", contents: "content" })
```

### 2. Comandos Compostos

```typescript
// ✅ Bom: validação completa
{
  command: "npm run lint && npm test && npm run build",
  explanation: "Pipeline de validação completo"
}
```

### 3. Error Handling

Comandos retornam exit codes. Encadeie com `&&` para parar em erros:

```typescript
// ✅ Para se houver erro
{ command: "npm install && npm test" }

// ❌ Continua mesmo com erro
{ command: "npm install; npm test" }
```

### 4. Verbosidade

Para debug, use flags verbose:

```typescript
{
  command: "npm install --verbose",
  required_permissions: ["network"]
}
```

---

## Próximos Passos

- [Gerenciamento de Tarefas →](./04-gerenciamento-tarefas.md)
- [Workflows Completos →](../workflows/workflow-completo.md)
- [Referência de Permissões →](../reference/sandbox-permissoes.md)

