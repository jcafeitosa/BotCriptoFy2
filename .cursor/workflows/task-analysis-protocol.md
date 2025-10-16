# Protocolo de Análise de Tarefas

## Visão Geral

Protocolo **obrigatório** que agentes devem seguir para analisar completamente uma tarefa **ANTES** de iniciar o desenvolvimento. Garante compreensão total, viabilidade técnica e aprovação do Agente-CTO.

---

## 🎯 Objetivo

Garantir que **TODA tarefa** seja analisada rigorosamente antes de iniciar, evitando:
- ❌ Mal-entendidos de requisitos
- ❌ Tarefas tecnicamente inviáveis
- ❌ Estimativas incorretas
- ❌ Dependências não identificadas
- ❌ Conflitos arquiteturais

---

## 📋 Checklist de Análise Obrigatória

### **FASE 1: COMPREENSÃO DE REQUISITOS**

```typescript
interface RequirementsAnalysis {
  functional: {
    q1: "O que exatamente deve ser implementado?";
    q2: "Quais são os inputs e outputs esperados?";
    q3: "Quais são os casos de uso principais?";
    q4: "Quais são os casos de uso edge?";
    q5: "Há ambiguidade nos requisitos?";
  };
  
  nonFunctional: {
    q6: "Quais são os requisitos de performance?";
    q7: "Quais são os requisitos de segurança?";
    q8: "Quais são os requisitos de escalabilidade?";
    q9: "Há requisitos de compatibilidade?";
    q10: "Quais são os requisitos de usabilidade?";
  };
  
  constraints: {
    q11: "Há limitações de tempo?";
    q12: "Há limitações de recursos?";
    q13: "Há limitações técnicas?";
    q14: "Há limitações de orçamento?";
    q15: "Há limitações de compliance?";
  };
}
```

### **FASE 2: ANÁLISE DE VIABILIDADE TÉCNICA**

```typescript
interface TechnicalFeasibility {
  technology: {
    q1: "As tecnologias necessárias estão disponíveis?";
    q2: "A equipe tem expertise nas tecnologias?";
    q3: "Há documentação suficiente?";
    q4: "As versões são compatíveis?";
    q5: "Há alternativas técnicas?";
  };
  
  architecture: {
    q6: "A solução se alinha com a arquitetura atual?";
    q7: "Há conflitos com padrões existentes?";
    q8: "A solução é escalável?";
    q9: "Há dependências externas?";
    q10: "A solução é mantível?";
  };
  
  integration: {
    q11: "Como se integra com sistemas existentes?";
    q12: "Há APIs necessárias?";
    q13: "Há mudanças em schemas de banco?";
    q14: "Há impactos em outros módulos?";
    q15: "Há necessidade de migração de dados?";
  };
}
```

### **FASE 3: ANÁLISE DE DEPENDÊNCIAS**

```typescript
interface DependencyAnalysis {
  internal: {
    q1: "Quais módulos internos são necessários?";
    q2: "Há dependências de outros agentes?";
    q3: "Há dependências de infraestrutura?";
    q4: "Há dependências de dados?";
    q5: "Há dependências de configuração?";
  };
  
  external: {
    q6: "Há dependências de APIs externas?";
    q7: "Há dependências de bibliotecas?";
    q8: "Há dependências de serviços?";
    q9: "Há dependências de ferramentas?";
    q10: "Há dependências de licenças?";
  };
  
  blockers: {
    q11: "Há dependências bloqueadas?";
    q12: "Há dependências com SLA?";
    q13: "Há dependências críticas?";
    q14: "Há dependências opcionais?";
    q15: "Há planos de contingência?";
  };
}
```

### **FASE 4: ESTIMATIVA DE COMPLEXIDADE**

```typescript
interface ComplexityEstimation {
  effort: {
    q1: "Quantas horas de desenvolvimento?";
    q2: "Quantas horas de testes?";
    q3: "Quantas horas de documentação?";
    q4: "Quantas horas de revisão?";
    q5: "Quantas horas de integração?";
  };
  
  risk: {
    q6: "Qual o nível de risco técnico?";
    q7: "Qual o nível de risco de prazo?";
    q8: "Qual o nível de risco de qualidade?";
    q9: "Há riscos de segurança?";
    q10: "Há riscos de performance?";
  };
  
  uncertainty: {
    q11: "Há incertezas técnicas?";
    q12: "Há incertezas de requisitos?";
    q13: "Há incertezas de dependências?";
    q14: "Há incertezas de prazo?";
    q15: "Há incertezas de recursos?";
  };
}
```

---

## 🔧 Implementação do Protocolo

### **Função Principal de Análise**

```typescript
/**
 * Protocolo de Análise de Tarefas - OBRIGATÓRIO
 * 
 * Executar ANTES de iniciar qualquer desenvolvimento
 */
async function analyzeTask(taskId: string, taskDescription: string): Promise<TaskAnalysisResult> {
  console.log("\n🔍 ========================================");
  console.log("🔍  ANÁLISE DE TAREFA - PROTOCOLO OBRIGATÓRIO");
  console.log("🔍 ========================================\n");
  
  const analysis: TaskAnalysis = {
    taskId,
    description: taskDescription,
    timestamp: new Date().toISOString(),
    phases: {}
  };
  
  // ==========================================
  // FASE 1: COMPREENSÃO DE REQUISITOS
  // ==========================================
  console.log("📍 FASE 1: Análise de Requisitos\n");
  
  const requirements = await analyzeRequirements(taskDescription);
  analysis.phases.requirements = requirements;
  
  if (!requirements.approved) {
    return {
      approved: false,
      reason: "Requisitos não compreendidos completamente",
      mustClarify: requirements.mustClarify,
      nextAction: "Buscar clarificação antes de prosseguir"
    };
  }
  
  // ==========================================
  // FASE 2: VIABILIDADE TÉCNICA
  // ==========================================
  console.log("📍 FASE 2: Análise de Viabilidade Técnica\n");
  
  const feasibility = await analyzeTechnicalFeasibility(taskDescription);
  analysis.phases.feasibility = feasibility;
  
  if (!feasibility.approved) {
    return {
      approved: false,
      reason: "Tarefa tecnicamente inviável",
      technicalIssues: feasibility.issues,
      nextAction: "Revisar abordagem técnica ou rejeitar tarefa"
    };
  }
  
  // ==========================================
  // FASE 3: ANÁLISE DE DEPENDÊNCIAS
  // ==========================================
  console.log("📍 FASE 3: Análise de Dependências\n");
  
  const dependencies = await analyzeDependencies(taskDescription);
  analysis.phases.dependencies = dependencies;
  
  if (!dependencies.approved) {
    return {
      approved: false,
      reason: "Dependências não resolvidas",
      missingDependencies: dependencies.missing,
      nextAction: "Resolver dependências antes de prosseguir"
    };
  }
  
  // ==========================================
  // FASE 4: ESTIMATIVA DE COMPLEXIDADE
  // ==========================================
  console.log("📍 FASE 4: Estimativa de Complexidade\n");
  
  const complexity = await estimateComplexity(taskDescription);
  analysis.phases.complexity = complexity;
  
  if (complexity.riskLevel === "HIGH") {
    return {
      approved: false,
      reason: "Risco muito alto para prosseguir",
      risks: complexity.risks,
      nextAction: "Revisar escopo ou rejeitar tarefa"
    };
  }
  
  // ==========================================
  // FASE 5: APROVAÇÃO DO CTO
  // ==========================================
  console.log("📍 FASE 5: Aprovação do Agente-CTO\n");
  
  const ctoApproval = await requestCTOApproval(analysis);
  
  if (!ctoApproval.approved) {
    return {
      approved: false,
      reason: "Rejeitado pelo Agente-CTO",
      ctoFeedback: ctoApproval.feedback,
      nextAction: "Revisar análise ou rejeitar tarefa"
    };
  }
  
  // ==========================================
  // ANÁLISE APROVADA
  // ==========================================
  console.log("✅ ========================================");
  console.log("✅  ANÁLISE DE TAREFA: APROVADA");
  console.log("✅ ========================================");
  console.log("✅ Tarefa pode prosseguir para desenvolvimento\n");
  
  // Salvar análise
  await saveTaskAnalysis(analysis);
  
  return {
    approved: true,
    analysis,
    nextPhase: "REFLEXÃO_PRÉ",
    estimatedEffort: complexity.estimatedEffort,
    riskLevel: complexity.riskLevel,
    dependencies: dependencies.identified
  };
}
```

### **Funções de Análise Detalhada**

```typescript
/**
 * FASE 1: Análise de Requisitos
 */
async function analyzeRequirements(description: string): Promise<RequirementsAnalysisResult> {
  console.log("🤔 Analisando requisitos...\n");
  
  const questions = [
    {
      id: "q1",
      question: "O que exatamente deve ser implementado?",
      criticalThinking: [
        "Posso explicar em 2-3 frases?",
        "Há ambiguidade nos requisitos?",
        "Preciso de clarificação?"
      ]
    },
    {
      id: "q2", 
      question: "Quais são os inputs e outputs esperados?",
      criticalThinking: [
        "Entendo o formato dos dados?",
        "Há validações necessárias?",
        "Há transformações de dados?"
      ]
    },
    {
      id: "q3",
      question: "Quais são os casos de uso principais?",
      criticalThinking: [
        "Identifiquei todos os cenários?",
        "Há casos de uso não óbvios?",
        "Entendo o fluxo completo?"
      ]
    },
    {
      id: "q4",
      question: "Quais são os casos de uso edge?",
      criticalThinking: [
        "E se o usuário fizer X?",
        "E se a API retornar erro?",
        "E se os dados estiverem corrompidos?"
      ]
    },
    {
      id: "q5",
      question: "Há ambiguidade nos requisitos?",
      criticalThinking: [
        "Posso interpretar de forma diferente?",
        "Há conflitos entre requisitos?",
        "Preciso de mais contexto?"
      ]
    }
  ];
  
  const answers = await askCriticalQuestions(questions);
  
  // Verificar se todas as respostas têm confiança alta/média
  const lowConfidence = answers.filter(a => a.confidence === "LOW");
  
  if (lowConfidence.length > 0) {
    return {
      approved: false,
      mustClarify: lowConfidence.map(a => a.question),
      reason: "Requisitos não compreendidos completamente"
    };
  }
  
  return {
    approved: true,
    answers,
    summary: "Requisitos compreendidos completamente"
  };
}

/**
 * FASE 2: Análise de Viabilidade Técnica
 */
async function analyzeTechnicalFeasibility(description: string): Promise<FeasibilityAnalysisResult> {
  console.log("🔧 Analisando viabilidade técnica...\n");
  
  // Verificar tecnologias necessárias
  const requiredTech = await identifyRequiredTechnologies(description);
  const techAvailability = await checkTechnologyAvailability(requiredTech);
  
  // Verificar alinhamento arquitetural
  const archAlignment = await checkArchitecturalAlignment(description);
  
  // Verificar integração
  const integrationPoints = await identifyIntegrationPoints(description);
  const integrationFeasibility = await checkIntegrationFeasibility(integrationPoints);
  
  const issues = [
    ...techAvailability.issues,
    ...archAlignment.issues,
    ...integrationFeasibility.issues
  ];
  
  if (issues.length > 0) {
    return {
      approved: false,
      issues,
      reason: "Tarefa tecnicamente inviável"
    };
  }
  
  return {
    approved: true,
    technologies: techAvailability.available,
    architecture: archAlignment.aligned,
    integration: integrationFeasibility.feasible
  };
}

/**
 * FASE 3: Análise de Dependências
 */
async function analyzeDependencies(description: string): Promise<DependencyAnalysisResult> {
  console.log("🔗 Analisando dependências...\n");
  
  // Identificar dependências internas
  const internalDeps = await identifyInternalDependencies(description);
  const internalStatus = await checkInternalDependencies(internalDeps);
  
  // Identificar dependências externas
  const externalDeps = await identifyExternalDependencies(description);
  const externalStatus = await checkExternalDependencies(externalDeps);
  
  const missing = [
    ...internalStatus.missing,
    ...externalStatus.missing
  ];
  
  if (missing.length > 0) {
    return {
      approved: false,
      missing,
      reason: "Dependências não resolvidas"
    };
  }
  
  return {
    approved: true,
    internal: internalDeps,
    external: externalDeps,
    identified: [...internalDeps, ...externalDeps]
  };
}

/**
 * FASE 4: Estimativa de Complexidade
 */
async function estimateComplexity(description: string): Promise<ComplexityEstimationResult> {
  console.log("📊 Estimando complexidade...\n");
  
  // Análise de esforço
  const effort = await estimateEffort(description);
  
  // Análise de risco
  const risks = await identifyRisks(description);
  const riskLevel = calculateRiskLevel(risks);
  
  // Análise de incerteza
  const uncertainties = await identifyUncertainties(description);
  
  return {
    estimatedEffort: effort,
    risks,
    riskLevel,
    uncertainties,
    confidence: calculateConfidence(risks, uncertainties)
  };
}

/**
 * FASE 5: Aprovação do CTO
 */
async function requestCTOApproval(analysis: TaskAnalysis): Promise<CTOApprovalResult> {
  console.log("👔 Solicitando aprovação do Agente-CTO...\n");
  
  // Gerar relatório para CTO
  const report = await generateCTOReport(analysis);
  
  // Simular aprovação do CTO (em implementação real, seria um agente CTO)
  const ctoDecision = await simulateCTODecision(report);
  
  return ctoDecision;
}
```

---

## 📊 Critérios de Aprovação

### **Aprovação Automática**
- ✅ Todos os requisitos compreendidos (confiança alta/média)
- ✅ Viabilidade técnica confirmada
- ✅ Todas as dependências resolvidas
- ✅ Risco baixo/médio
- ✅ Estimativa de esforço razoável

### **Aprovação Condicional**
- ⚠️ Risco médio com planos de mitigação
- ⚠️ Dependências com SLA definido
- ⚠️ Estimativa com margem de erro

### **Rejeição Automática**
- ❌ Requisitos ambíguos ou incompreendidos
- ❌ Viabilidade técnica questionável
- ❌ Dependências críticas não resolvidas
- ❌ Risco muito alto
- ❌ Estimativa de esforço irrealista

---

## 🚫 Enforcement

### **Bloqueio Obrigatório**
```typescript
// NENHUM agente pode iniciar desenvolvimento sem análise aprovada
async function startDevelopment(taskId: string) {
  const analysis = await getTaskAnalysis(taskId);
  
  if (!analysis || !analysis.approved) {
    throw new BlockedError({
      phase: "TASK_ANALYSIS",
      reason: "Análise de tarefa não aprovada",
      action: "Executar protocolo de análise completo"
    });
  }
  
  // Prosseguir com desenvolvimento
  return await proceedWithDevelopment(taskId);
}
```

### **Validação Contínua**
```typescript
// Verificar se análise ainda é válida durante desenvolvimento
async function validateAnalysisStillValid(taskId: string) {
  const analysis = await getTaskAnalysis(taskId);
  const currentContext = await getCurrentContext(taskId);
  
  if (hasSignificantChanges(analysis, currentContext)) {
    console.log("⚠️ Contexto mudou significativamente. Re-analisar tarefa...");
    return await reanalyzeTask(taskId);
  }
}
```

---

## 📁 Artifacts Gerados

### **Relatório de Análise**
```
docs/analysis/
├── {taskId}-analysis.md          # Relatório completo
├── {taskId}-requirements.md      # Análise de requisitos
├── {taskId}-feasibility.md       # Análise de viabilidade
├── {taskId}-dependencies.md      # Análise de dependências
├── {taskId}-complexity.md        # Estimativa de complexidade
└── {taskId}-cto-approval.md      # Aprovação do CTO
```

### **Template de Relatório**
```markdown
# Análise de Tarefa: {taskId}

## Resumo Executivo
- **Status**: Aprovada/Rejeitada
- **Risco**: Baixo/Médio/Alto
- **Esforço Estimado**: X horas
- **Dependências**: Y identificadas

## Detalhes por Fase
[Análise detalhada de cada fase]

## Recomendações
[Recomendações específicas para a tarefa]

## Próximos Passos
[Passos específicos para prosseguir]
```

---

## 🔄 Integração com Outros Protocolos

### **Integração com Reflexão PRÉ**
```typescript
// Análise de tarefa deve ser executada ANTES da reflexão PRÉ
async function executeTaskWithAnalysis(taskId: string) {
  // 1. Análise de tarefa (OBRIGATÓRIO)
  const analysis = await analyzeTask(taskId, description);
  if (!analysis.approved) {
    throw new BlockedError("Análise rejeitada");
  }
  
  // 2. Reflexão PRÉ (usando insights da análise)
  const reflection = await preTaskReflection(taskId, analysis);
  
  // 3. Desenvolvimento
  return await proceedWithDevelopment(taskId);
}
```

### **Integração com Gates**
```typescript
// Gate 0: Análise de Tarefa Aprovada
async function validateGate0(taskId: string): Promise<GateResult> {
  const analysis = await getTaskAnalysis(taskId);
  
  if (!analysis || !analysis.approved) {
    return {
      approved: false,
      blockedReason: "Análise de tarefa não aprovada",
      nextAction: "Executar protocolo de análise completo"
    };
  }
  
  return {
    approved: true,
    nextPhase: "REFLEXÃO_PRÉ"
  };
}
```

---

## 📈 Métricas de Qualidade

### **KPIs de Análise**
- **Taxa de aprovação na 1ª tentativa**: >= 80%
- **Tempo médio de análise**: <= 30 minutos
- **Taxa de rejeição por requisitos**: <= 10%
- **Taxa de rejeição por viabilidade**: <= 5%
- **Taxa de rejeição por dependências**: <= 15%

### **Métricas de Impacto**
- **Redução de retrabalho**: >= 70%
- **Redução de bugs por mal-entendido**: >= 80%
- **Melhoria na estimativa de prazo**: >= 60%
- **Redução de dependências não identificadas**: >= 90%

---

**Versão**: 1.0  
**Data**: Dezembro 2024  
**Autor**: Agente-CTO  
**Status**: **OBRIGATÓRIO** para todas as tarefas  
**Integração**: Reflexão PRÉ, Gates, Workflow Completo