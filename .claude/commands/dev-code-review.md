---
description: Realiza code review completo seguindo as 53 Regras de Ouro do AGENTS.md
---

# Code Review Profundo

**Siga as Regras 21-30 do AGENTS.md rigorosamente.**

## 1. Análise Inicial

### Contexto do PR
- [ ] Título descritivo (≤72 caracteres)
- [ ] Descrição completa do que foi feito e por quê
- [ ] Issue/ticket linkado
- [ ] Labels apropriadas
- [ ] Milestone definido

### Escopo
```bash
# Analisar arquivos modificados
git diff --name-only origin/main...HEAD

# Ver estatísticas
git diff --stat origin/main...HEAD
```

## 2. Validação de Protocolo (Regra 53)

### Análise de Dependências

```bash
# Para cada arquivo modificado, verificar dependências
for file in $(git diff --name-only origin/main...HEAD); do
  echo "Analisando: $file"
  grep -r "$(basename $file)" . --exclude-dir=node_modules
done
```

**Checklist:**
- [ ] Todos os arquivos dependentes foram atualizados?
- [ ] Imports/exports estão corretos?
- [ ] Links de documentação funcionam?
- [ ] Referências estão atualizadas?

## 3. Qualidade de Código (Regras 11-20)

### TypeScript/JavaScript

**Boas Práticas:**
- [ ] TypeScript strict mode respeitado
- [ ] Sem `any` types (use `unknown`)
- [ ] Imports organizados (external → internal → types)
- [ ] Named exports (não default)
- [ ] Funções com JSDoc completo
- [ ] Nomes autoexplicativos (sem abreviações)
- [ ] Early returns (evitar nested conditionals)
- [ ] Single responsibility principle
- [ ] DRY (código não duplicado)

**Código Ruim vs Bom:**

```typescript
// ❌ Ruim
function processData(d: any) {
  if (d) {
    if (d.type === 'user') {
      if (d.active) {
        // nested hell
      }
    }
  }
}

// ✅ Bom
/**
 * Processa dados de usuário ativo
 * @param data - Dados do usuário
 * @returns Resultado processado
 * @throws {Error} Se dados inválidos
 */
function processUserData(data: UserData): ProcessedResult {
  if (!data) {
    throw new Error('Data is required');
  }
  
  if (data.type !== 'user') {
    throw new Error('Invalid user type');
  }
  
  if (!data.active) {
    throw new Error('User is not active');
  }
  
  return processActiveUser(data);
}
```

### Solidity/Smart Contracts

**Boas Práticas:**
- [ ] Pragma version específica (não floating)
- [ ] NatSpec completo (@title, @notice, @dev, @param, @return)
- [ ] Events para todas mudanças de estado
- [ ] ReentrancyGuard onde necessário
- [ ] Access control implementado
- [ ] Pausable para funções críticas
- [ ] Validações com require/revert
- [ ] Gas optimization aplicado
- [ ] OpenZeppelin como base

**Código Ruim vs Bom:**

```solidity
// ❌ Ruim
contract Bad {
    uint public balance;
    
    function withdraw(uint amount) public {
        balance -= amount;
        payable(msg.sender).transfer(amount);
    }
}

// ✅ Bom
/**
 * @title GoodContract
 * @notice Gerencia saques com segurança
 * @dev Implementa ReentrancyGuard e validações
 */
contract Good is ReentrancyGuard, Ownable {
    uint256 private _balance;
    
    /// @notice Emitido quando saque é realizado
    event Withdrawal(address indexed user, uint256 amount);
    
    /**
     * @notice Realiza saque seguro
     * @param amount Valor a sacar
     * @dev Usa checks-effects-interactions pattern
     */
    function withdraw(uint256 amount) 
        external 
        nonReentrant 
    {
        require(amount > 0, "Amount must be positive");
        require(_balance >= amount, "Insufficient balance");
        require(msg.sender != address(0), "Invalid address");
        
        // Effects
        _balance -= amount;
        
        // Interactions
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
}
```

## 4. Segurança (Crítico para Web3)

### Checklist de Segurança Backend

- [ ] Validação com Zod em TODOS os endpoints
- [ ] Input sanitization implementada
- [ ] Rate limiting configurado
- [ ] Authentication/Authorization verificados
- [ ] CORS configurado corretamente
- [ ] SQL injection prevenido (ORM parameterizado)
- [ ] XSS protection implementada
- [ ] CSRF tokens para mutations
- [ ] Secrets NUNCA no código
- [ ] Environment variables validadas
- [ ] Logging seguro (sem dados sensíveis)
- [ ] Error messages não revelam internals

### Checklist de Segurança Smart Contracts

**Crítico:**
- [ ] Sem reentrancy vulnerabilities
- [ ] Sem integer overflow/underflow (Solidity 0.8+)
- [ ] Sem uso de `tx.origin` para auth
- [ ] Sem `call` sem gas limit
- [ ] Validação de `address(0)`
- [ ] Front-running considerado
- [ ] Gas griefing prevenido
- [ ] Access control correto
- [ ] Emergency pause implementado
- [ ] Upgrade path seguro (se aplicável)

**Ferramentas:**
```bash
# Slither
slither contracts/

# Mythril
myth analyze contracts/Contract.sol

# Echidna (fuzzing)
echidna-test contracts/Contract.sol
```

## 5. Testes (Regras 31-40)

### Coverage

```bash
# Backend
bun run test:coverage

# Verificar coverage mínimo
# Backend: ≥ 80%
# Smart Contracts: ≥ 95% (100% para lógica financeira)
```

### Qualidade dos Testes

**Checklist:**
- [ ] Testes para cenários positivos
- [ ] Testes para cenários negativos
- [ ] Testes para edge cases
- [ ] Testes para ataques conhecidos (contratos)
- [ ] Mocks apropriados (não testes reais)
- [ ] Nomenclatura descritiva
- [ ] Arrange-Act-Assert pattern
- [ ] Testes isolados (não dependem de ordem)
- [ ] Testes determinísticos
- [ ] Testes rápidos (< 100ms unitários)

**Exemplo de Teste Ruim vs Bom:**

```typescript
// ❌ Ruim
it('test', async () => {
  const result = await service.method();
  expect(result).toBeTruthy();
});

// ✅ Bom
describe('WalletService', () => {
  describe('transfer', () => {
    it('should throw error when transferring to invalid address', async () => {
      // Arrange
      const service = new WalletService();
      const invalidAddress = '0xinvalid';
      const amount = parseEther('1.0');
      
      // Act & Assert
      await expect(
        service.transfer(invalidAddress, amount)
      ).rejects.toThrow('Invalid address');
    });
    
    it('should successfully transfer to valid address', async () => {
      // Arrange
      const service = new WalletService();
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const amount = parseEther('1.0');
      
      // Act
      const receipt = await service.transfer(validAddress, amount);
      
      // Assert
      expect(receipt.status).toBe(1);
      expect(receipt.to).toBe(validAddress);
    });
  });
});
```

## 6. Documentação (Regras 41-52)

- [ ] README atualizado (se necessário)
- [ ] CHANGELOG atualizado
- [ ] JSDoc/NatSpec completo
- [ ] Comentários apenas onde necessário (código deve ser auto-explicativo)
- [ ] Diagramas Mermaid para fluxos complexos
- [ ] ADR criado para decisões arquiteturais
- [ ] API documentation atualizada (Swagger/Scalar)
- [ ] Exemplos de uso fornecidos

## 7. Performance & Gas Optimization

### Backend Performance

```typescript
// ❌ Ruim: N+1 queries
for (const user of users) {
  const posts = await db.query.posts.findMany({
    where: eq(posts.userId, user.id)
  });
}

// ✅ Bom: Single query com join
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true
  }
});
```

### Gas Optimization (Contratos)

```solidity
// ❌ Ruim: Múltiplas storage reads
function badFunction() external {
    uint256 total = 0;
    for (uint256 i = 0; i < storageArray.length; i++) {
        total += storageArray[i];  // SLOAD a cada iteração
    }
}

// ✅ Bom: Cache storage em memory
function goodFunction() external {
    uint256[] memory cached = storageArray;  // Single SLOAD
    uint256 total = 0;
    uint256 length = cached.length;
    for (uint256 i = 0; i < length; i++) {
        total += cached[i];  // MLOAD (muito mais barato)
    }
}
```

## 8. Complexidade Ciclomática

**Limite aceitável: ≤ 10**

```bash
# Verificar complexidade
npx complexity-report src/
```

Se > 10, refatore em funções menores.

## 9. Git & Commits

- [ ] Commits atômicos (uma mudança lógica por commit)
- [ ] Mensagens de commit convencionais
- [ ] Sem commits de "WIP" ou "fix" genéricos
- [ ] Sem código commented out
- [ ] Sem console.logs/debuggers
- [ ] Sem arquivos temporários
- [ ] .gitignore atualizado

## 10. CI/CD

- [ ] Pipeline passou (build, lint, test, security)
- [ ] Sem warnings ignorados
- [ ] Deploy bem-sucedido (staging)
- [ ] Rollback plan documentado

## 11. Aprovação (Regras 21-30)

### Checklist Final

- [ ] Qualidade de código: ✅
- [ ] Segurança validada: ✅
- [ ] Testes passando (coverage OK): ✅
- [ ] Documentação completa: ✅
- [ ] Performance aceitável: ✅
- [ ] Gas costs aceitáveis (contratos): ✅
- [ ] Dependências analisadas: ✅
- [ ] CI/CD verde: ✅
- [ ] **2+ aprovações** (contratos): ✅

### Decisão

**Se TUDO checado:**
```
✅ APROVADO

[Comentários construtivos]
```

**Se QUALQUER item falhar:**
```
❌ REQUER MUDANÇAS

**Bloqueadores:**
1. [Item crítico]
2. [Item crítico]

**Sugestões:**
1. [Melhoria]
2. [Melhoria]

**Referências:**
- AGENTS.md Regra X
- [Link para documentação]
```

---

## ⚠️ IMPORTANTE

- **Smart Contracts**: SEMPRE exigem **2+ revisores**
- **Segurança**: Qualquer dúvida = PR rejeitado
- **Zero Tolerância**: Mocks, placeholders, código incompleto
- **No blockchain**: não há "quase certo" — ou está seguro, ou não está

**Agente-CTO pode bloquear o merge se padrões não forem cumpridos.**

