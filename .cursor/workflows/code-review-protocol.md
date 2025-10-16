# Protocolo de Revisão de Código Estruturada

## Visão Geral

Protocolo **obrigatório** para revisão de código que garante qualidade, consistência e conformidade com padrões. Aplicado após Gate 1 (Código Completo) e antes de Gate 2 (Revisão Aprovada).

---

## 🎯 Objetivo

Garantir que **TODO código** seja revisado rigorosamente antes de prosseguir para QA, assegurando:
- ✅ Qualidade de código consistente
- ✅ Conformidade com padrões
- ✅ Performance otimizada
- ✅ Segurança validada
- ✅ Manutenibilidade garantida

---

## 👥 Papéis e Responsabilidades

### **Agente-Revisor (Obrigatório)**
- **Responsabilidade**: Revisar código de outros agentes
- **Qualificação**: Experiência em tecnologias utilizadas
- **Independência**: Não pode revisar próprio código
- **Autoridade**: Pode aprovar, rejeitar ou solicitar mudanças

### **Agente-Desenvolvedor**
- **Responsabilidade**: Implementar código e responder feedback
- **Obrigação**: Corrigir TODOS os issues identificados
- **Comunicação**: Explicar decisões técnicas complexas
- **Iteração**: Refatorar até aprovação

### **Agente-CTO (Escalação)**
- **Responsabilidade**: Resolver conflitos entre revisor e desenvolvedor
- **Autoridade**: Decisão final em casos de discordância
- **Critério**: Baseado em arquitetura e padrões da organização

---

## 📋 Checklist de Revisão Padronizado

### **CATEGORIA 1: QUALIDADE DE CÓDIGO**

```typescript
interface CodeQualityChecklist {
  readability: {
    q1: "O código é fácil de ler e entender?";
    q2: "Os nomes de variáveis/funções são descritivos?";
    q3: "Há comentários adequados onde necessário?";
    q4: "A indentação e formatação estão consistentes?";
    q5: "O código segue convenções do projeto?";
  };
  
  structure: {
    q6: "As funções têm responsabilidade única?";
    q7: "O código está bem organizado em módulos?";
    q8: "Há duplicação de código desnecessária?";
    q9: "A complexidade ciclomática é aceitável?";
    q10: "Há dependências circulares?";
  };
  
  maintainability: {
    q11: "O código é fácil de modificar?";
    q12: "Há acoplamento excessivo?";
    q13: "A coesão está adequada?";
    q14: "Há abstrações desnecessárias?";
    q15: "O código é testável?";
  };
}
```

### **CATEGORIA 2: PERFORMANCE E OTIMIZAÇÃO**

```typescript
interface PerformanceChecklist {
  efficiency: {
    q1: "O algoritmo é eficiente?";
    q2: "Há operações desnecessárias?";
    q3: "Há loops aninhados desnecessários?";
    q4: "As consultas de banco são otimizadas?";
    q5: "Há vazamentos de memória?";
  };
  
  scalability: {
    q6: "O código escala com volume de dados?";
    q7: "Há gargalos de performance?";
    q8: "As operações são assíncronas quando apropriado?";
    q9: "Há cache implementado onde necessário?";
    q10: "O código é stateless quando possível?";
  };
  
  resource: {
    q11: "O uso de CPU é otimizado?";
    q12: "O uso de memória é otimizado?";
    q13: "O uso de rede é otimizado?";
    q14: "Há timeouts apropriados?";
    q15: "Há rate limiting implementado?";
  };
}
```

### **CATEGORIA 3: SEGURANÇA**

```typescript
interface SecurityChecklist {
  input: {
    q1: "Todos os inputs são validados?";
    q2: "Há sanitização de dados?";
    q3: "Há proteção contra SQL injection?";
    q4: "Há proteção contra XSS?";
    q5: "Há proteção contra CSRF?";
  };
  
  authentication: {
    q6: "A autenticação está implementada corretamente?";
    q7: "As senhas são hasheadas adequadamente?";
    q8: "Há proteção contra brute force?";
    q9: "Os tokens são seguros?";
    q10: "Há expiração de sessões?";
  };
  
  authorization: {
    q11: "A autorização está implementada?";
    q12: "Há verificação de permissões?";
    q13: "Há princípio do menor privilégio?";
    q14: "Há logs de auditoria?";
    q15: "Há proteção de dados sensíveis?";
  };
}
```

### **CATEGORIA 4: TESTES E COBERTURA**

```typescript
interface TestingChecklist {
  coverage: {
    q1: "A cobertura de testes é >= 80%?";
    q2: "Há testes para casos de sucesso?";
    q3: "Há testes para casos de erro?";
    q4: "Há testes para casos edge?";
    q5: "Há testes de integração?";
  };
  
  quality: {
    q6: "Os testes são determinísticos?";
    q7: "Os testes são independentes?";
    q8: "Os testes são rápidos?";
    q9: "Os testes são legíveis?";
    q10: "Há mocks apropriados?";
  };
  
  maintenance: {
    q11: "Os testes são fáceis de manter?";
    q12: "Há testes de regressão?";
    q13: "Os testes cobrem mudanças de API?";
    q14: "Há testes de performance?";
    q15: "Há testes de segurança?";
  };
}
```

### **CATEGORIA 5: CONFORMIDADE E PADRÕES**

```typescript
interface ComplianceChecklist {
  standards: {
    q1: "O código segue padrões do projeto?";
    q2: "Há conformidade com linting?";
    q3: "Há conformidade com type checking?";
    q4: "Há conformidade com formatação?";
    q5: "Há conformidade com nomenclatura?";
  };
  
  documentation: {
    q6: "Há JSDoc em funções públicas?";
    q7: "Há README atualizado?";
    q8: "Há comentários explicativos?";
    q9: "Há diagramas quando necessário?";
    q10: "Há changelog atualizado?";
  };
  
  architecture: {
    q11: "O código segue arquitetura definida?";
    q12: "Há separação de responsabilidades?";
    q13: "Há injeção de dependências?";
    q14: "Há padrões de design aplicados?";
    q15: "Há princípios SOLID seguidos?";
  };
}
```

---

## 🔧 Implementação do Protocolo

### **Função Principal de Revisão**

```typescript
/**
 * Protocolo de Revisão de Código - OBRIGATÓRIO
 * 
 * Executar após Gate 1 (Código Completo) e antes de Gate 2
 */
async function reviewCode(taskId: string, codeChanges: CodeChanges): Promise<ReviewResult> {
  console.log("\n👀 ========================================");
  console.log("👀  REVISÃO DE CÓDIGO - PROTOCOLO OBRIGATÓRIO");
  console.log("👀 ========================================\n");
  
  const review: CodeReview = {
    taskId,
    reviewer: await getCurrentReviewer(),
    timestamp: new Date().toISOString(),
    codeChanges,
    categories: {}
  };
  
  // ==========================================
  // FASE 1: ANÁLISE INICIAL
  // ==========================================
  console.log("📍 FASE 1: Análise Inicial do Código\n");
  
  const initialAnalysis = await performInitialAnalysis(codeChanges);
  review.initialAnalysis = initialAnalysis;
  
  if (initialAnalysis.hasBlockingIssues) {
    return {
      approved: false,
      reason: "Issues bloqueantes encontrados na análise inicial",
      blockingIssues: initialAnalysis.blockingIssues,
      nextAction: "Corrigir issues bloqueantes antes de revisão detalhada"
    };
  }
  
  // ==========================================
  // FASE 2: REVISÃO POR CATEGORIAS
  // ==========================================
  console.log("📍 FASE 2: Revisão Detalhada por Categorias\n");
  
  // Categoria 1: Qualidade de Código
  console.log("🔍 Revisando Qualidade de Código...");
  const qualityReview = await reviewCodeQuality(codeChanges);
  review.categories.quality = qualityReview;
  
  // Categoria 2: Performance
  console.log("🔍 Revisando Performance...");
  const performanceReview = await reviewPerformance(codeChanges);
  review.categories.performance = performanceReview;
  
  // Categoria 3: Segurança
  console.log("🔍 Revisando Segurança...");
  const securityReview = await reviewSecurity(codeChanges);
  review.categories.security = securityReview;
  
  // Categoria 4: Testes
  console.log("🔍 Revisando Testes...");
  const testingReview = await reviewTesting(codeChanges);
  review.categories.testing = testingReview;
  
  // Categoria 5: Conformidade
  console.log("🔍 Revisando Conformidade...");
  const complianceReview = await reviewCompliance(codeChanges);
  review.categories.compliance = complianceReview;
  
  // ==========================================
  // FASE 3: ANÁLISE DE IMPACTO
  // ==========================================
  console.log("📍 FASE 3: Análise de Impacto\n");
  
  const impactAnalysis = await analyzeImpact(codeChanges);
  review.impactAnalysis = impactAnalysis;
  
  // ==========================================
  // FASE 4: DECISÃO DE APROVAÇÃO
  // ==========================================
  console.log("📍 FASE 4: Decisão de Aprovação\n");
  
  const decision = await makeReviewDecision(review);
  review.decision = decision;
  
  // ==========================================
  // FASE 5: GERAÇÃO DE FEEDBACK
  // ==========================================
  console.log("📍 FASE 5: Geração de Feedback\n");
  
  const feedback = await generateFeedback(review);
  review.feedback = feedback;
  
  // Salvar revisão
  await saveCodeReview(review);
  
  // ==========================================
  // RESULTADO FINAL
  // ==========================================
  if (decision.approved) {
    console.log("✅ ========================================");
    console.log("✅  REVISÃO DE CÓDIGO: APROVADA");
    console.log("✅ ========================================");
    console.log("✅ Código pode prosseguir para QA\n");
  } else {
    console.log("❌ ========================================");
    console.log("❌  REVISÃO DE CÓDIGO: REPROVADA");
    console.log("❌ ========================================");
    console.log("❌ Corrigir issues antes de prosseguir\n");
  }
  
  return {
    approved: decision.approved,
    review,
    feedback,
    nextAction: decision.approved ? "Prosseguir para QA" : "Corrigir issues identificados"
  };
}
```

### **Funções de Revisão por Categoria**

```typescript
/**
 * Categoria 1: Revisão de Qualidade de Código
 */
async function reviewCodeQuality(codeChanges: CodeChanges): Promise<QualityReviewResult> {
  const checks = [];
  
  // Verificar legibilidade
  const readability = await checkReadability(codeChanges);
  checks.push({
    category: "Readability",
    passed: readability.score >= 8,
    score: readability.score,
    issues: readability.issues,
    suggestions: readability.suggestions
  });
  
  // Verificar estrutura
  const structure = await checkStructure(codeChanges);
  checks.push({
    category: "Structure", 
    passed: structure.score >= 8,
    score: structure.score,
    issues: structure.issues,
    suggestions: structure.suggestions
  });
  
  // Verificar manutenibilidade
  const maintainability = await checkMaintainability(codeChanges);
  checks.push({
    category: "Maintainability",
    passed: maintainability.score >= 8,
    score: maintainability.score,
    issues: maintainability.issues,
    suggestions: maintainability.suggestions
  });
  
  const overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
  const allPassed = checks.every(check => check.passed);
  
  return {
    overallScore,
    passed: allPassed,
    checks,
    criticalIssues: checks.filter(c => !c.passed).flatMap(c => c.issues),
    recommendations: checks.flatMap(c => c.suggestions)
  };
}

/**
 * Categoria 2: Revisão de Performance
 */
async function reviewPerformance(codeChanges: CodeChanges): Promise<PerformanceReviewResult> {
  const checks = [];
  
  // Verificar eficiência de algoritmos
  const efficiency = await checkAlgorithmEfficiency(codeChanges);
  checks.push({
    category: "Efficiency",
    passed: efficiency.score >= 8,
    score: efficiency.score,
    issues: efficiency.issues,
    suggestions: efficiency.suggestions
  });
  
  // Verificar escalabilidade
  const scalability = await checkScalability(codeChanges);
  checks.push({
    category: "Scalability",
    passed: scalability.score >= 8,
    score: scalability.score,
    issues: scalability.issues,
    suggestions: scalability.suggestions
  });
  
  // Verificar uso de recursos
  const resourceUsage = await checkResourceUsage(codeChanges);
  checks.push({
    category: "Resource Usage",
    passed: resourceUsage.score >= 8,
    score: resourceUsage.score,
    issues: resourceUsage.issues,
    suggestions: resourceUsage.suggestions
  });
  
  const overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
  const allPassed = checks.every(check => check.passed);
  
  return {
    overallScore,
    passed: allPassed,
    checks,
    performanceIssues: checks.filter(c => !c.passed).flatMap(c => c.issues),
    optimizations: checks.flatMap(c => c.suggestions)
  };
}

/**
 * Categoria 3: Revisão de Segurança
 */
async function reviewSecurity(codeChanges: CodeChanges): Promise<SecurityReviewResult> {
  const checks = [];
  
  // Verificar validação de input
  const inputValidation = await checkInputValidation(codeChanges);
  checks.push({
    category: "Input Validation",
    passed: inputValidation.score >= 9, // Segurança tem critério mais rigoroso
    score: inputValidation.score,
    issues: inputValidation.issues,
    suggestions: inputValidation.suggestions
  });
  
  // Verificar autenticação
  const authentication = await checkAuthentication(codeChanges);
  checks.push({
    category: "Authentication",
    passed: authentication.score >= 9,
    score: authentication.score,
    issues: authentication.issues,
    suggestions: authentication.suggestions
  });
  
  // Verificar autorização
  const authorization = await checkAuthorization(codeChanges);
  checks.push({
    category: "Authorization",
    passed: authorization.score >= 9,
    score: authorization.score,
    issues: authorization.issues,
    suggestions: authorization.suggestions
  });
  
  const overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
  const allPassed = checks.every(check => check.passed);
  
  return {
    overallScore,
    passed: allPassed,
    checks,
    securityVulnerabilities: checks.filter(c => !c.passed).flatMap(c => c.issues),
    securityRecommendations: checks.flatMap(c => c.suggestions)
  };
}

/**
 * Categoria 4: Revisão de Testes
 */
async function reviewTesting(codeChanges: CodeChanges): Promise<TestingReviewResult> {
  const checks = [];
  
  // Verificar cobertura
  const coverage = await checkTestCoverage(codeChanges);
  checks.push({
    category: "Coverage",
    passed: coverage.percentage >= 80,
    score: coverage.percentage,
    issues: coverage.issues,
    suggestions: coverage.suggestions
  });
  
  // Verificar qualidade dos testes
  const testQuality = await checkTestQuality(codeChanges);
  checks.push({
    category: "Test Quality",
    passed: testQuality.score >= 8,
    score: testQuality.score,
    issues: testQuality.issues,
    suggestions: testQuality.suggestions
  });
  
  // Verificar manutenibilidade dos testes
  const testMaintainability = await checkTestMaintainability(codeChanges);
  checks.push({
    category: "Test Maintainability",
    passed: testMaintainability.score >= 8,
    score: testMaintainability.score,
    issues: testMaintainability.issues,
    suggestions: testMaintainability.suggestions
  });
  
  const overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
  const allPassed = checks.every(check => check.passed);
  
  return {
    overallScore,
    passed: allPassed,
    checks,
    testingIssues: checks.filter(c => !c.passed).flatMap(c => c.issues),
    testingRecommendations: checks.flatMap(c => c.suggestions)
  };
}

/**
 * Categoria 5: Revisão de Conformidade
 */
async function reviewCompliance(codeChanges: CodeChanges): Promise<ComplianceReviewResult> {
  const checks = [];
  
  // Verificar padrões
  const standards = await checkStandards(codeChanges);
  checks.push({
    category: "Standards",
    passed: standards.score >= 9, // Conformidade tem critério rigoroso
    score: standards.score,
    issues: standards.issues,
    suggestions: standards.suggestions
  });
  
  // Verificar documentação
  const documentation = await checkDocumentation(codeChanges);
  checks.push({
    category: "Documentation",
    passed: documentation.score >= 8,
    score: documentation.score,
    issues: documentation.issues,
    suggestions: documentation.suggestions
  });
  
  // Verificar arquitetura
  const architecture = await checkArchitecture(codeChanges);
  checks.push({
    category: "Architecture",
    passed: architecture.score >= 8,
    score: architecture.score,
    issues: architecture.issues,
    suggestions: architecture.suggestions
  });
  
  const overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
  const allPassed = checks.every(check => check.passed);
  
  return {
    overallScore,
    passed: allPassed,
    checks,
    complianceIssues: checks.filter(c => !c.passed).flatMap(c => c.issues),
    complianceRecommendations: checks.flatMap(c => c.suggestions)
  };
}
```

---

## 🚫 Critérios de Aprovação/Rejeição

### **Aprovação Automática**
- ✅ Todas as categorias com score >= 8
- ✅ Nenhum issue crítico de segurança
- ✅ Cobertura de testes >= 80%
- ✅ Conformidade com padrões >= 9
- ✅ Nenhum issue de performance crítico

### **Aprovação Condicional**
- ⚠️ Score geral >= 7.5 com issues menores documentados
- ⚠️ Issues de segurança de baixa severidade com plano de correção
- ⚠️ Cobertura de testes >= 75% com plano para atingir 80%

### **Rejeição Automática**
- ❌ Qualquer issue crítico de segurança
- ❌ Score geral < 7.0
- ❌ Cobertura de testes < 75%
- ❌ Conformidade com padrões < 8
- ❌ Issues de performance críticos

---

## 🔄 Processo de Feedback e Iteração

### **Geração de Feedback Estruturado**

```typescript
async function generateFeedback(review: CodeReview): Promise<StructuredFeedback> {
  const feedback: StructuredFeedback = {
    overall: {
      approved: review.decision.approved,
      score: calculateOverallScore(review),
      summary: generateSummary(review)
    },
    categories: {},
    criticalIssues: [],
    recommendations: [],
    nextSteps: []
  };
  
  // Feedback por categoria
  for (const [category, result] of Object.entries(review.categories)) {
    feedback.categories[category] = {
      score: result.overallScore,
      passed: result.passed,
      issues: result.issues || [],
      suggestions: result.suggestions || []
    };
  }
  
  // Issues críticos
  feedback.criticalIssues = [
    ...review.categories.quality?.criticalIssues || [],
    ...review.categories.security?.securityVulnerabilities || [],
    ...review.categories.performance?.performanceIssues || [],
    ...review.categories.testing?.testingIssues || [],
    ...review.categories.compliance?.complianceIssues || []
  ];
  
  // Recomendações
  feedback.recommendations = [
    ...review.categories.quality?.recommendations || [],
    ...review.categories.security?.securityRecommendations || [],
    ...review.categories.performance?.optimizations || [],
    ...review.categories.testing?.testingRecommendations || [],
    ...review.categories.compliance?.complianceRecommendations || []
  ];
  
  // Próximos passos
  if (review.decision.approved) {
    feedback.nextSteps = [
      "Código aprovado para QA",
      "Preparar documentação final",
      "Aguardar Gate 2"
    ];
  } else {
    feedback.nextSteps = [
      "Corrigir issues críticos identificados",
      "Refatorar código conforme sugestões",
      "Re-submeter para revisão"
    ];
  }
  
  return feedback;
}
```

### **Processo de Iteração**

```typescript
async function handleReviewIteration(taskId: string, feedback: StructuredFeedback): Promise<IterationResult> {
  console.log("\n🔄 Processando iteração de revisão...\n");
  
  // 1. Desenvolvedor corrige issues
  const corrections = await applyCorrections(taskId, feedback.criticalIssues);
  
  // 2. Re-submeter para revisão
  const reReview = await reviewCode(taskId, corrections);
  
  // 3. Verificar se issues foram resolvidos
  const issuesResolved = await verifyIssuesResolved(feedback.criticalIssues, reReview);
  
  if (issuesResolved.allResolved) {
    return {
      success: true,
      message: "Todos os issues foram resolvidos",
      nextAction: "Prosseguir para QA"
    };
  } else {
    return {
      success: false,
      message: "Ainda há issues pendentes",
      remainingIssues: issuesResolved.remaining,
      nextAction: "Continuar correções"
    };
  }
}
```

---

## 🚫 Enforcement

### **Bloqueio Obrigatório**
```typescript
// NENHUM código pode prosseguir para QA sem revisão aprovada
async function proceedToQA(taskId: string) {
  const review = await getCodeReview(taskId);
  
  if (!review || !review.approved) {
    throw new BlockedError({
      phase: "CODE_REVIEW",
      reason: "Revisão de código não aprovada",
      action: "Corrigir issues identificados na revisão"
    });
  }
  
  // Prosseguir para QA
  return await proceedToQA(taskId);
}
```

### **Validação de Revisor**
```typescript
// Verificar se revisor tem qualificação adequada
async function validateReviewer(reviewerId: string, technologies: string[]): Promise<boolean> {
  const reviewer = await getReviewer(reviewerId);
  
  const hasExperience = technologies.every(tech => 
    reviewer.experience.includes(tech)
  );
  
  const hasRecentActivity = reviewer.lastReview > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return hasExperience && hasRecentActivity;
}
```

---

## 📁 Artifacts Gerados

### **Relatórios de Revisão**
```
docs/reviews/
├── {taskId}-review.md              # Relatório completo
├── {taskId}-quality-review.md      # Revisão de qualidade
├── {taskId}-performance-review.md  # Revisão de performance
├── {taskId}-security-review.md     # Revisão de segurança
├── {taskId}-testing-review.md      # Revisão de testes
├── {taskId}-compliance-review.md   # Revisão de conformidade
└── {taskId}-feedback.md            # Feedback estruturado
```

### **Template de Relatório**
```markdown
# Revisão de Código: {taskId}

## Resumo Executivo
- **Status**: Aprovada/Rejeitada
- **Score Geral**: X/10
- **Revisor**: {reviewer}
- **Data**: {timestamp}

## Análise por Categoria
### Qualidade de Código
- **Score**: X/10
- **Status**: Aprovada/Rejeitada
- **Issues**: [Lista de issues]
- **Sugestões**: [Lista de sugestões]

### Performance
- **Score**: X/10
- **Status**: Aprovada/Rejeitada
- **Issues**: [Lista de issues]
- **Otimizações**: [Lista de otimizações]

### Segurança
- **Score**: X/10
- **Status**: Aprovada/Rejeitada
- **Vulnerabilidades**: [Lista de vulnerabilidades]
- **Recomendações**: [Lista de recomendações]

### Testes
- **Score**: X/10
- **Status**: Aprovada/Rejeitada
- **Cobertura**: X%
- **Issues**: [Lista de issues]

### Conformidade
- **Score**: X/10
- **Status**: Aprovada/Rejeitada
- **Issues**: [Lista de issues]

## Issues Críticos
[Lista de issues que devem ser corrigidos]

## Recomendações
[Lista de recomendações para melhoria]

## Próximos Passos
[Passos específicos para prosseguir]
```

---

## 🔄 Integração com Outros Protocolos

### **Integração com Gates**
```typescript
// Gate 2: Revisão Aprovada → QA
async function validateGate2(taskId: string): Promise<GateResult> {
  const review = await getCodeReview(taskId);
  
  if (!review || !review.approved) {
    return {
      approved: false,
      blockedReason: "Revisão de código não aprovada",
      nextAction: "Corrigir issues identificados na revisão"
    };
  }
  
  return {
    approved: true,
    nextPhase: "QA"
  };
}
```

### **Integração com QA**
```typescript
// Passar informações da revisão para QA
async function prepareQAInput(taskId: string): Promise<QAInput> {
  const review = await getCodeReview(taskId);
  
  return {
    taskId,
    codeChanges: review.codeChanges,
    reviewInsights: review.insights,
    knownIssues: review.resolvedIssues,
    qualityScore: review.overallScore
  };
}
```

---

## 📈 Métricas de Qualidade

### **KPIs de Revisão**
- **Taxa de aprovação na 1ª tentativa**: >= 70%
- **Tempo médio de revisão**: <= 2 horas
- **Taxa de correção de issues**: >= 90%
- **Score médio de qualidade**: >= 8.0
- **Taxa de issues críticos**: <= 5%

### **Métricas de Impacto**
- **Redução de bugs em QA**: >= 60%
- **Melhoria na qualidade de código**: >= 40%
- **Redução de retrabalho**: >= 50%
- **Melhoria na performance**: >= 30%
- **Redução de vulnerabilidades**: >= 80%

---

**Versão**: 1.0  
**Data**: Dezembro 2024  
**Autor**: Agente-CTO  
**Status**: **OBRIGATÓRIO** para todas as revisões  
**Integração**: Gates, QA, Workflow Completo