---
description: Inicializa novo módulo/feature no projeto seguindo os padrões do AGENTS.md
---

# Inicialização de Projeto/Módulo

**Siga o protocolo do Agente-CTO (AGENTS.md) rigorosamente.**

## Etapa 1: Planejamento (Regras 1-10)

1. **Defina o contexto técnico:**
   - Qual o objetivo do módulo?
   - Qual problema resolve?
   - Quais são os requisitos?

2. **Crie workflow Mermaid:**
   ```mermaid
   graph TD
       A[Input] --> B{Validação}
       B -->|Válido| C[Processamento]
       B -->|Inválido| D[Erro]
       C --> E[Output]
   ```

3. **Quebre em subtarefas (≤6):**
   - [ ] Subtarefa 1
   - [ ] Subtarefa 2
   - [ ] ...

4. **Análise de Dependências (Regra 53):**
   ```bash
   # Identifique arquivos afetados
   grep -r "nome-modulo" . --exclude-dir=node_modules
   ```

5. **Valide padrões:**
   - TypeScript strict mode ✅
   - Nomenclatura correta ✅
   - Estrutura de diretórios ✅

## Etapa 2: Estrutura do Módulo

Crie a estrutura conforme AGENTS.md:

```typescript
// Para backend (Elysia + Bun)
backend/src/modules/nome-modulo/
├── index.ts              # Exports públicos
├── nome-modulo.service.ts
├── nome-modulo.controller.ts
├── nome-modulo.types.ts
├── nome-modulo.schema.ts  # Zod schemas
├── nome-modulo.test.ts
└── README.md
```

```solidity
// Para smart contracts
contracts/
├── NomeContrato.sol
├── test/
│   └── NomeContrato.test.ts
└── README.md
```

## Etapa 3: Implementação (Regras 11-20)

### Para Backend:

```typescript
// nome-modulo.types.ts
export interface ModuleData {
  id: string;
  // ... tipos explícitos
}

// nome-modulo.schema.ts
import { z } from 'zod';

export const moduleSchema = z.object({
  id: z.string().uuid(),
  // ... validações Zod
});

// nome-modulo.service.ts
/**
 * Service para gerenciar [descrição]
 * @module NomeModulo
 */
export class NomeModuloService {
  /**
   * [Descrição da função]
   * @param {type} param - descrição
   * @returns {type} descrição
   */
  async methodName(param: Type): Promise<Result> {
    // Implementação completa (zero mocks)
    // Early returns
    if (!param) {
      throw new Error('Invalid param');
    }
    
    // Lógica explícita e auditável
    return result;
  }
}

// nome-modulo.test.ts
import { describe, it, expect } from 'bun:test';

describe('NomeModuloService', () => {
  it('should do X when Y', async () => {
    // Arrange
    const service = new NomeModuloService();
    const input = { };
    
    // Act
    const result = await service.methodName(input);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Para Smart Contracts:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title NomeContrato
 * @notice [Descrição do contrato]
 * @dev [Detalhes técnicos]
 */
contract NomeContrato is Ownable, ReentrancyGuard, Pausable {
    /// @notice [Descrição do evento]
    event ActionPerformed(address indexed user, uint256 value);
    
    /// @notice [Descrição da função]
    /// @param param Descrição do parâmetro
    /// @return Descrição do retorno
    function performAction(uint256 param) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (bool) 
    {
        // Validações
        require(param > 0, "Invalid param");
        
        // Lógica
        emit ActionPerformed(msg.sender, param);
        
        return true;
    }
}
```

## Etapa 4: Testes (Regras 31-40)

```bash
# Backend
bun test nome-modulo.test.ts
bun run test:coverage  # ≥ 80%

# Smart Contracts
bun run test:contracts  # ≥ 95%
bun run gas-report
```

## Etapa 5: Documentação (Regras 41-52)

Crie README.md:

```markdown
# Nome do Módulo

## Descrição
[O que faz]

## Uso

\`\`\`typescript
import { NomeModulo } from './nome-modulo';

const modulo = new NomeModulo();
await modulo.method();
\`\`\`

## API

### `methodName(param: Type): Promise<Result>`
[Descrição]

## Testes
\`\`\`bash
bun test nome-modulo.test.ts
\`\`\`

## Dependências
- [Lista de dependências]
```

## Etapa 6: Validação Final

**Checklist antes do PR:**

- [ ] Código 100% completo (zero mocks/placeholders)
- [ ] Testes escritos e passando
- [ ] Coverage ≥ 80% (backend) / ≥ 95% (contratos)
- [ ] TypeScript compila sem erros
- [ ] Lint passa sem erros
- [ ] Documentação completa (JSDoc/NatSpec)
- [ ] Validação com Zod implementada
- [ ] Análise de dependências realizada
- [ ] README.md criado
- [ ] ADR criado (se decisão arquitetural)

**Validação de Dependências:**

```bash
# Re-executar análise
grep -r "nome-modulo" . --exclude-dir=node_modules

# Testes
bun test
bun run lint
bun run typecheck
```

## Etapa 7: ADR (Se Aplicável)

Se houver decisões técnicas importantes, crie um ADR:

```markdown
# ADR-XXX: [Título da Decisão]

**Data**: YYYY-MM-DD  
**Status**: Proposto | Aceito | Rejeitado

## Contexto
[Situação que motivou a decisão]

## Decisão
[O que foi decidido]

## Consequências
**Positivas:**
- [Lista]

**Negativas:**
- [Lista]

**Riscos:**
- [Lista]

## Alternativas Consideradas
1. [Alternativa 1] - Rejeitada por [motivo]
2. [Alternativa 2] - Rejeitada por [motivo]
```

Salve em: `docs/adr/ADR-XXX-titulo.md`

---

## ⚠️ Lembre-se

- **Zero tolerância**: mocks, placeholders, código incompleto
- **Segurança > Conveniência**: código explícito e auditável
- **Regra 53**: Sempre analise dependências antes de modificar
- **No blockchain**: não há "quase certo" — ou está seguro, ou não está

**Autorização do Agente-CTO necessária antes de iniciar desenvolvimento.**

