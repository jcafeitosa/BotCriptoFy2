# Protocolo de Resolução de Problemas com Investigação Obrigatória

## Visão Geral

Protocolo **OBRIGATÓRIO** que agentes devem seguir quando identificam qualquer problema, garantindo investigação completa, análise crítica e resolução fundamentada antes de prosseguir.

---

## 🎯 Objetivo

Garantir que **TODOS os problemas** sejam investigados rigorosamente antes da resolução:
- ✅ Investigação completa de documentação oficial
- ✅ Pesquisa em GitHub e internet
- ✅ Análise crítica com 5+ perguntas obrigatórias
- ✅ Validação de conhecimento antes de prosseguir
- ✅ Correção fundamentada seguindo todos os protocolos

---

## 🚨 Trigger do Protocolo

### **Quando Ativar o Protocolo**

```typescript
interface ProblemTrigger {
  // Problemas de código
  codeIssues: [
    'Bug identificado',
    'Erro de compilação',
    'Falha de teste',
    'Performance degradada',
    'Vulnerabilidade de segurança'
  ];
  
  // Problemas de integração
  integrationIssues: [
    'API não responde',
    'Dependência quebrada',
    'Configuração incorreta',
    'Ambiente não funciona',
    'Deploy falha'
  ];
  
  // Problemas de lógica
  logicIssues: [
    'Comportamento inesperado',
    'Dados incorretos',
    'Fluxo quebrado',
    'Validação falha',
    'Cálculo errado'
  ];
  
  // Problemas de qualidade
  qualityIssues: [
    'Código não atende padrões',
    'Testes falham',
    'Documentação desatualizada',
    'Performance abaixo do esperado',
    'Usabilidade comprometida'
  ];
}
```

---

## 📋 Fases do Protocolo

### **FASE 1: INVESTIGAÇÃO OBRIGATÓRIA**

```typescript
/**
 * FASE 1: Investigação Obrigatória
 * 
 * NENHUM agente pode prosseguir sem completar esta fase
 */
async function executeInvestigationPhase(problemId: string, problem: Problem): Promise<InvestigationResult> {
  console.log("\n🔍 ========================================");
  console.log("🔍  INVESTIGAÇÃO OBRIGATÓRIA - PROBLEMA");
  console.log("🔍 ========================================\n");
  
  const investigation: Investigation = {
    problemId,
    problem,
    timestamp: new Date().toISOString(),
    phases: {}
  };
  
  // ==========================================
  // SUBFASE 1.1: DOCUMENTAÇÃO OFICIAL
  // ==========================================
  console.log("📍 SUBFASE 1.1: Investigação de Documentação Oficial\n");
  
  const officialDocs = await investigateOfficialDocumentation(problem);
  investigation.phases.officialDocs = officialDocs;
  
  if (!officialDocs.complete) {
    return {
      approved: false,
      reason: "Documentação oficial não investigada completamente",
      missingDocs: officialDocs.missing,
      nextAction: "Completar investigação de documentação oficial"
    };
  }
  
  // ==========================================
  // SUBFASE 1.2: PESQUISA NO GITHUB
  // ==========================================
  console.log("📍 SUBFASE 1.2: Pesquisa no GitHub\n");
  
  const githubResearch = await investigateGitHub(problem);
  investigation.phases.githubResearch = githubResearch;
  
  if (!githubResearch.complete) {
    return {
      approved: false,
      reason: "Pesquisa no GitHub não completada",
      missingResearch: githubResearch.missing,
      nextAction: "Completar pesquisa no GitHub"
    };
  }
  
  // ==========================================
  // SUBFASE 1.3: PESQUISA NA INTERNET
  // ==========================================
  console.log("📍 SUBFASE 1.3: Pesquisa na Internet\n");
  
  const internetResearch = await investigateInternet(problem);
  investigation.phases.internetResearch = internetResearch;
  
  if (!internetResearch.complete) {
    return {
      approved: false,
      reason: "Pesquisa na internet não completada",
      missingResearch: internetResearch.missing,
      nextAction: "Completar pesquisa na internet"
    };
  }
  
  // ==========================================
  // SUBFASE 1.4: ANÁLISE CRÍTICA
  // ==========================================
  console.log("📍 SUBFASE 1.4: Análise Crítica (5+ Perguntas Obrigatórias)\n");
  
  const criticalAnalysis = await executeCriticalAnalysis(problem, investigation);
  investigation.phases.criticalAnalysis = criticalAnalysis;
  
  if (!criticalAnalysis.approved) {
    return {
      approved: false,
      reason: "Análise crítica não aprovada",
      failedQuestions: criticalAnalysis.failedQuestions,
      nextAction: "Corrigir respostas e repetir análise crítica"
    };
  }
  
  // ==========================================
  // SUBFASE 1.5: VALIDAÇÃO DE CONHECIMENTO
  // ==========================================
  console.log("📍 SUBFASE 1.5: Validação de Conhecimento\n");
  
  const knowledgeValidation = await validateKnowledge(problem, investigation);
  investigation.phases.knowledgeValidation = knowledgeValidation;
  
  if (!knowledgeValidation.approved) {
    return {
      approved: false,
      reason: "Conhecimento insuficiente para resolver problema",
      knowledgeGaps: knowledgeValidation.gaps,
      nextAction: "Preencher lacunas de conhecimento antes de prosseguir"
    };
  }
  
  // ==========================================
  // INVESTIGAÇÃO APROVADA
  // ==========================================
  console.log("✅ ========================================");
  console.log("✅  INVESTIGAÇÃO: APROVADA");
  console.log("✅ ========================================");
  console.log("✅ Agente pode prosseguir para resolução\n");
  
  // Salvar investigação
  await saveInvestigation(investigation);
  
  return {
    approved: true,
    investigation,
    nextPhase: "PROBLEM_RESOLUTION",
    knowledgeBase: investigation.phases
  };
}
```

### **FASE 2: RESOLUÇÃO FUNDAMENTADA**

```typescript
/**
 * FASE 2: Resolução Fundamentada
 * 
 * Usar conhecimento adquirido para resolver o problema
 */
async function executeResolutionPhase(problemId: string, investigation: Investigation): Promise<ResolutionResult> {
  console.log("\n🔧 ========================================");
  console.log("🔧  RESOLUÇÃO FUNDAMENTADA - PROBLEMA");
  console.log("🔧 ========================================\n");
  
  const resolution: ProblemResolution = {
    problemId,
    investigation,
    timestamp: new Date().toISOString(),
    solution: {},
    validation: {}
  };
  
  // ==========================================
  // SUBFASE 2.1: DESENVOLVIMENTO DA SOLUÇÃO
  // ==========================================
  console.log("📍 SUBFASE 2.1: Desenvolvimento da Solução\n");
  
  const solution = await developSolution(problemId, investigation);
  resolution.solution = solution;
  
  // ==========================================
  // SUBFASE 2.2: APLICAÇÃO DOS PROTOCOLOS
  // ==========================================
  console.log("📍 SUBFASE 2.2: Aplicação dos Protocolos\n");
  
  // Aplicar Protocolo de Revisão
  const reviewProtocol = new CodeReviewProtocol();
  const reviewResult = await reviewProtocol.execute(problemId, solution.codeChanges);
  resolution.validation.review = reviewResult;
  
  if (!reviewResult.approved) {
    return {
      approved: false,
      reason: "Solução não aprovada na revisão",
      reviewIssues: reviewResult.issues,
      nextAction: "Corrigir issues de revisão e re-aplicar protocolo"
    };
  }
  
  // Aplicar Protocolo de QA
  const qaProtocol = new QAProtocol();
  const qaResult = await qaProtocol.execute(problemId, solution.codeChanges);
  resolution.validation.qa = qaResult;
  
  if (!qaResult.approved) {
    return {
      approved: false,
      reason: "Solução não aprovada no QA",
      qaIssues: qaResult.issues,
      nextAction: "Corrigir issues de QA e re-aplicar protocolo"
    };
  }
  
  // ==========================================
  // SUBFASE 2.3: VALIDAÇÃO FINAL
  // ==========================================
  console.log("📍 SUBFASE 2.3: Validação Final\n");
  
  const finalValidation = await validateFinalSolution(problemId, resolution);
  resolution.validation.final = finalValidation;
  
  if (!finalValidation.approved) {
    return {
      approved: false,
      reason: "Validação final falhou",
      validationIssues: finalValidation.issues,
      nextAction: "Corrigir issues de validação e repetir processo"
    };
  }
  
  // ==========================================
  // RESOLUÇÃO APROVADA
  // ==========================================
  console.log("✅ ========================================");
  console.log("✅  RESOLUÇÃO: APROVADA");
  console.log("✅ ========================================");
  console.log("✅ Problema resolvido com sucesso\n");
  
  // Salvar resolução
  await saveResolution(resolution);
  
  return {
    approved: true,
    resolution,
    nextPhase: "PROBLEM_CLOSED"
  };
}
```

---

## 🔍 Implementação das Subfases

### **SUBFASE 1.1: Análise de Engenharia Reversa das Dependências**

```typescript
/**
 * Análise de engenharia reversa das dependências e mapeamento completo
 */
async function executeReverseEngineeringAnalysis(problem: Problem): Promise<ReverseEngineeringResult> {
  console.log("🔍 ========================================");
  console.log("🔍  ANÁLISE DE ENGENHARIA REVERSA");
  console.log("🔍 ========================================\n");
  
  const analysis: ReverseEngineeringAnalysis = {
    problem,
    timestamp: new Date().toISOString(),
    dependencyGraph: {},
    callGraph: {},
    dataFlow: {},
    controlFlow: {},
    rootCauses: [],
    impactAnalysis: {},
    solutions: []
  };
  
  // ==========================================
  // SUBFASE 1.1.1: MAPEAMENTO DE DEPENDÊNCIAS
  // ==========================================
  console.log("📍 SUBFASE 1.1.1: Mapeamento de Dependências\n");
  
  const dependencyMapping = await mapDependencyGraph(problem);
  analysis.dependencyGraph = dependencyMapping;
  
  // ==========================================
  // SUBFASE 1.1.2: MAPEAMENTO DE CHAMADAS
  // ==========================================
  console.log("📍 SUBFASE 1.1.2: Mapeamento de Chamadas\n");
  
  const callMapping = await mapCallGraph(problem);
  analysis.callGraph = callMapping;
  
  // ==========================================
  // SUBFASE 1.1.3: MAPEAMENTO DE FLUXO DE DADOS
  // ==========================================
  console.log("📍 SUBFASE 1.1.3: Mapeamento de Fluxo de Dados\n");
  
  const dataFlowMapping = await mapDataFlow(problem);
  analysis.dataFlow = dataFlowMapping;
  
  // ==========================================
  // SUBFASE 1.1.4: MAPEAMENTO DE FLUXO DE CONTROLE
  // ==========================================
  console.log("📍 SUBFASE 1.1.4: Mapeamento de Fluxo de Controle\n");
  
  const controlFlowMapping = await mapControlFlow(problem);
  analysis.controlFlow = controlFlowMapping;
  
  // ==========================================
  // SUBFASE 1.1.5: IDENTIFICAÇÃO DE CAUSAS RAIZ
  // ==========================================
  console.log("📍 SUBFASE 1.1.5: Identificação de Causas Raiz\n");
  
  const rootCauses = await identifyRootCauses(analysis);
  analysis.rootCauses = rootCauses;
  
  // ==========================================
  // SUBFASE 1.1.6: ANÁLISE DE IMPACTO
  // ==========================================
  console.log("📍 SUBFASE 1.1.6: Análise de Impacto\n");
  
  const impactAnalysis = await analyzeImpact(analysis);
  analysis.impactAnalysis = impactAnalysis;
  
  return {
    complete: analysis.rootCauses.length > 0,
    analysis,
    summary: `Mapeadas ${Object.keys(analysis.dependencyGraph).length} dependências, ${analysis.rootCauses.length} causas raiz identificadas`
  };
}
```

### **SUBFASE 1.2: Mapeamento de Dependências**

```typescript
/**
 * Mapear grafo completo de dependências
 */
async function mapDependencyGraph(problem: Problem): Promise<DependencyGraph> {
  console.log("🔗 Mapeando grafo de dependências...\n");
  
  const graph: DependencyGraph = {
    nodes: [],
    edges: [],
    cycles: [],
    criticalPath: [],
    vulnerabilities: []
  };
  
  // 1. Mapear dependências diretas
  const directDependencies = await mapDirectDependencies(problem);
  graph.nodes.push(...directDependencies);
  
  // 2. Mapear dependências transitivas
  const transitiveDependencies = await mapTransitiveDependencies(directDependencies);
  graph.nodes.push(...transitiveDependencies);
  
  // 3. Mapear dependências de runtime
  const runtimeDependencies = await mapRuntimeDependencies(problem);
  graph.nodes.push(...runtimeDependencies);
  
  // 4. Mapear dependências de build
  const buildDependencies = await mapBuildDependencies(problem);
  graph.nodes.push(...buildDependencies);
  
  // 5. Mapear dependências de desenvolvimento
  const devDependencies = await mapDevDependencies(problem);
  graph.nodes.push(...devDependencies);
  
  // 6. Criar arestas do grafo
  graph.edges = await createDependencyEdges(graph.nodes);
  
  // 7. Detectar ciclos
  graph.cycles = await detectDependencyCycles(graph);
  
  // 8. Identificar caminho crítico
  graph.criticalPath = await identifyCriticalPath(graph);
  
  // 9. Detectar vulnerabilidades
  graph.vulnerabilities = await detectDependencyVulnerabilities(graph);
  
  return graph;
}
```

### **SUBFASE 1.3: Mapeamento de Chamadas**

```typescript
/**
 * Mapear grafo completo de chamadas
 */
async function mapCallGraph(problem: Problem): Promise<CallGraph> {
  console.log("📞 Mapeando grafo de chamadas...\n");
  
  const callGraph: CallGraph = {
    functions: [],
    calls: [],
    callChains: [],
    hotspots: [],
    deadCode: []
  };
  
  // 1. Mapear funções do problema
  const problemFunctions = await mapProblemFunctions(problem);
  callGraph.functions.push(...problemFunctions);
  
  // 2. Mapear chamadas diretas
  const directCalls = await mapDirectCalls(problemFunctions);
  callGraph.calls.push(...directCalls);
  
  // 3. Mapear chamadas indiretas
  const indirectCalls = await mapIndirectCalls(directCalls);
  callGraph.calls.push(...indirectCalls);
  
  // 4. Mapear cadeias de chamadas
  const callChains = await mapCallChains(callGraph.calls);
  callGraph.callChains = callChains;
  
  // 5. Identificar hotspots
  const hotspots = await identifyHotspots(callGraph);
  callGraph.hotspots = hotspots;
  
  // 6. Identificar código morto
  const deadCode = await identifyDeadCode(callGraph);
  callGraph.deadCode = deadCode;
  
  return callGraph;
}
```

### **SUBFASE 1.4: Mapeamento de Fluxo de Dados**

```typescript
/**
 * Mapear fluxo completo de dados
 */
async function mapDataFlow(problem: Problem): Promise<DataFlow> {
  console.log("📊 Mapeando fluxo de dados...\n");
  
  const dataFlow: DataFlow = {
    variables: [],
    assignments: [],
    transformations: [],
    validations: [],
    sanitizations: [],
    dataSources: [],
    dataSinks: [],
    dataLeaks: []
  };
  
  // 1. Mapear variáveis do problema
  const problemVariables = await mapProblemVariables(problem);
  dataFlow.variables.push(...problemVariables);
  
  // 2. Mapear atribuições
  const assignments = await mapVariableAssignments(problemVariables);
  dataFlow.assignments.push(...assignments);
  
  // 3. Mapear transformações
  const transformations = await mapDataTransformations(assignments);
  dataFlow.transformations.push(...transformations);
  
  // 4. Mapear validações
  const validations = await mapDataValidations(transformations);
  dataFlow.validations.push(...validations);
  
  // 5. Mapear sanitizações
  const sanitizations = await mapDataSanitizations(validations);
  dataFlow.sanitizations.push(...sanitizations);
  
  // 6. Mapear fontes de dados
  const dataSources = await mapDataSources(dataFlow);
  dataFlow.dataSources.push(...dataSources);
  
  // 7. Mapear destinos de dados
  const dataSinks = await mapDataSinks(dataFlow);
  dataFlow.dataSinks.push(...dataSinks);
  
  // 8. Detectar vazamentos de dados
  const dataLeaks = await detectDataLeaks(dataFlow);
  dataFlow.dataLeaks.push(...dataLeaks);
  
  return dataFlow;
}
```

### **SUBFASE 1.5: Mapeamento de Fluxo de Controle**

```typescript
/**
 * Mapear fluxo completo de controle
 */
async function mapControlFlow(problem: Problem): Promise<ControlFlow> {
  console.log("🎮 Mapeando fluxo de controle...\n");
  
  const controlFlow: ControlFlow = {
    conditions: [],
    loops: [],
    branches: [],
    exceptions: [],
    asyncOperations: [],
    concurrency: [],
    raceConditions: [],
    deadlocks: []
  };
  
  // 1. Mapear condições
  const conditions = await mapConditions(problem);
  controlFlow.conditions.push(...conditions);
  
  // 2. Mapear loops
  const loops = await mapLoops(problem);
  controlFlow.loops.push(...loops);
  
  // 3. Mapear branches
  const branches = await mapBranches(problem);
  controlFlow.branches.push(...branches);
  
  // 4. Mapear exceções
  const exceptions = await mapExceptions(problem);
  controlFlow.exceptions.push(...exceptions);
  
  // 5. Mapear operações assíncronas
  const asyncOperations = await mapAsyncOperations(problem);
  controlFlow.asyncOperations.push(...asyncOperations);
  
  // 6. Mapear concorrência
  const concurrency = await mapConcurrency(problem);
  controlFlow.concurrency.push(...concurrency);
  
  // 7. Detectar race conditions
  const raceConditions = await detectRaceConditions(controlFlow);
  controlFlow.raceConditions.push(...raceConditions);
  
  // 8. Detectar deadlocks
  const deadlocks = await detectDeadlocks(controlFlow);
  controlFlow.deadlocks.push(...deadlocks);
  
  return controlFlow;
}
```

### **SUBFASE 1.6: Identificação de Causas Raiz**

```typescript
/**
 * Identificar causas raiz do problema
 */
async function identifyRootCauses(analysis: ReverseEngineeringAnalysis): Promise<RootCause[]> {
  console.log("🎯 Identificando causas raiz...\n");
  
  const rootCauses: RootCause[] = [];
  
  // 1. Análise de dependências problemáticas
  const dependencyIssues = await analyzeDependencyIssues(analysis.dependencyGraph);
  rootCauses.push(...dependencyIssues);
  
  // 2. Análise de chamadas problemáticas
  const callIssues = await analyzeCallIssues(analysis.callGraph);
  rootCauses.push(...callIssues);
  
  // 3. Análise de fluxo de dados problemático
  const dataFlowIssues = await analyzeDataFlowIssues(analysis.dataFlow);
  rootCauses.push(...dataFlowIssues);
  
  // 4. Análise de fluxo de controle problemático
  const controlFlowIssues = await analyzeControlFlowIssues(analysis.controlFlow);
  rootCauses.push(...controlFlowIssues);
  
  // 5. Análise de vulnerabilidades
  const vulnerabilities = await analyzeVulnerabilities(analysis);
  rootCauses.push(...vulnerabilities);
  
  // 6. Análise de performance
  const performanceIssues = await analyzePerformanceIssues(analysis);
  rootCauses.push(...performanceIssues);
  
  // 7. Análise de segurança
  const securityIssues = await analyzeSecurityIssues(analysis);
  rootCauses.push(...securityIssues);
  
  // 8. Análise de escalabilidade
  const scalabilityIssues = await analyzeScalabilityIssues(analysis);
  rootCauses.push(...scalabilityIssues);
  
  // 9. Priorizar causas raiz
  const prioritizedRootCauses = await prioritizeRootCauses(rootCauses);
  
  return prioritizedRootCauses;
}
```

### **SUBFASE 1.7: Análise de Impacto**

```typescript
/**
 * Analisar impacto das causas raiz
 */
async function analyzeImpact(analysis: ReverseEngineeringAnalysis): Promise<ImpactAnalysis> {
  console.log("💥 Analisando impacto...\n");
  
  const impactAnalysis: ImpactAnalysis = {
    affectedComponents: [],
    affectedUsers: [],
    affectedData: [],
    businessImpact: {},
    technicalImpact: {},
    securityImpact: {},
    performanceImpact: {},
    mitigationStrategies: []
  };
  
  // 1. Analisar componentes afetados
  const affectedComponents = await analyzeAffectedComponents(analysis);
  impactAnalysis.affectedComponents = affectedComponents;
  
  // 2. Analisar usuários afetados
  const affectedUsers = await analyzeAffectedUsers(analysis);
  impactAnalysis.affectedUsers = affectedUsers;
  
  // 3. Analisar dados afetados
  const affectedData = await analyzeAffectedData(analysis);
  impactAnalysis.affectedData = affectedData;
  
  // 4. Analisar impacto de negócio
  const businessImpact = await analyzeBusinessImpact(analysis);
  impactAnalysis.businessImpact = businessImpact;
  
  // 5. Analisar impacto técnico
  const technicalImpact = await analyzeTechnicalImpact(analysis);
  impactAnalysis.technicalImpact = technicalImpact;
  
  // 6. Analisar impacto de segurança
  const securityImpact = await analyzeSecurityImpact(analysis);
  impactAnalysis.securityImpact = securityImpact;
  
  // 7. Analisar impacto de performance
  const performanceImpact = await analyzePerformanceImpact(analysis);
  impactAnalysis.performanceImpact = performanceImpact;
  
  // 8. Desenvolver estratégias de mitigação
  const mitigationStrategies = await developMitigationStrategies(impactAnalysis);
  impactAnalysis.mitigationStrategies = mitigationStrategies;
  
  return impactAnalysis;
}
```

### **Métodos Avançados de Análise**

```typescript
/**
 * Métodos avançados de análise de engenharia reversa
 */
class AdvancedReverseEngineeringMethods {
  
  /**
   * Análise de dependências com algoritmos de grafos
   */
  async analyzeDependencyGraphWithAlgorithms(graph: DependencyGraph): Promise<DependencyAnalysis> {
    // Usar algoritmos de grafos para análise avançada
    const stronglyConnectedComponents = await this.findStronglyConnectedComponents(graph);
    const topologicalSort = await this.performTopologicalSort(graph);
    const shortestPaths = await this.findShortestPaths(graph);
    const criticalNodes = await this.identifyCriticalNodes(graph);
    
    return {
      stronglyConnectedComponents,
      topologicalSort,
      shortestPaths,
      criticalNodes
    };
  }
  
  /**
   * Análise de fluxo de dados com análise estática
   */
  async analyzeDataFlowWithStaticAnalysis(dataFlow: DataFlow): Promise<DataFlowAnalysis> {
    // Usar análise estática para mapear fluxo de dados
    const taintAnalysis = await this.performTaintAnalysis(dataFlow);
    const aliasAnalysis = await this.performAliasAnalysis(dataFlow);
    const pointsToAnalysis = await this.performPointsToAnalysis(dataFlow);
    const dataLeakDetection = await this.detectDataLeaks(dataFlow);
    
    return {
      taintAnalysis,
      aliasAnalysis,
      pointsToAnalysis,
      dataLeakDetection
    };
  }
  
  /**
   * Análise de fluxo de controle com análise de caminhos
   */
  async analyzeControlFlowWithPathAnalysis(controlFlow: ControlFlow): Promise<ControlFlowAnalysis> {
    // Usar análise de caminhos para mapear fluxo de controle
    const pathCoverage = await this.analyzePathCoverage(controlFlow);
    const reachabilityAnalysis = await this.performReachabilityAnalysis(controlFlow);
    const livenessAnalysis = await this.performLivenessAnalysis(controlFlow);
    const deadCodeDetection = await this.detectDeadCode(controlFlow);
    
    return {
      pathCoverage,
      reachabilityAnalysis,
      livenessAnalysis,
      deadCodeDetection
    };
  }
  
  /**
   * Análise de concorrência com model checking
   */
  async analyzeConcurrencyWithModelChecking(concurrency: ConcurrencyAnalysis): Promise<ConcurrencyAnalysis> {
    // Usar model checking para análise de concorrência
    const raceConditionDetection = await this.detectRaceConditions(concurrency);
    const deadlockDetection = await this.detectDeadlocks(concurrency);
    const livelockDetection = await this.detectLivelocks(concurrency);
    const atomicityViolationDetection = await this.detectAtomicityViolations(concurrency);
    
    return {
      raceConditionDetection,
      deadlockDetection,
      livelockDetection,
      atomicityViolationDetection
    };
  }
  
  /**
   * Análise de performance com profiling
   */
  async analyzePerformanceWithProfiling(performance: PerformanceAnalysis): Promise<PerformanceAnalysis> {
    // Usar profiling para análise de performance
    const cpuProfiling = await this.performCPUProfiling(performance);
    const memoryProfiling = await this.performMemoryProfiling(performance);
    const ioProfiling = await this.performIOProfiling(performance);
    const networkProfiling = await this.performNetworkProfiling(performance);
    
    return {
      cpuProfiling,
      memoryProfiling,
      ioProfiling,
      networkProfiling
    };
  }
}
```

### **SUBFASE 1.2: Pesquisa Obrigatória no GitHub Oficial**

```typescript
/**
 * Pesquisa OBRIGATÓRIA no GitHub oficial das stacks e bibliotecas
 */
async function investigateOfficialGitHub(problem: Problem): Promise<OfficialGitHubResearchResult> {
  console.log("🐙 ========================================");
  console.log("🐙  PESQUISA OBRIGATÓRIA - GITHUB OFICIAL");
  console.log("🐙 ========================================\n");
  
  const research: OfficialGitHubResearch = {
    problem,
    officialRepositories: [],
    officialIssues: [],
    officialPullRequests: [],
    officialDiscussions: [],
    officialSolutions: [],
    stackRepositories: [],
    libraryRepositories: [],
    validated: false
  };
  
  // ==========================================
  // SUBFASE 1.2.1: IDENTIFICAR REPOSITÓRIOS OFICIAIS
  // ==========================================
  console.log("📍 SUBFASE 1.2.1: Identificar Repositórios Oficiais\n");
  
  const officialRepos = await identifyOfficialRepositories(problem);
  research.officialRepositories = officialRepos;
  
  // ==========================================
  // SUBFASE 1.2.2: CONSULTAR GITHUB OFICIAL DAS STACKS
  // ==========================================
  console.log("📍 SUBFASE 1.2.2: Consultar GitHub Oficial das Stacks\n");
  
  for (const stack of problem.technologies) {
    const stackRepo = await consultOfficialStackRepository(stack);
    research.stackRepositories.push(stackRepo);
  }
  
  // ==========================================
  // SUBFASE 1.2.3: CONSULTAR GITHUB OFICIAL DAS BIBLIOTECAS
  // ==========================================
  console.log("📍 SUBFASE 1.2.3: Consultar GitHub Oficial das Bibliotecas\n");
  
  for (const library of problem.libraries) {
    const libraryRepo = await consultOfficialLibraryRepository(library);
    research.libraryRepositories.push(libraryRepo);
  }
  
  // ==========================================
  // SUBFASE 1.2.4: BUSCAR ISSUES OFICIAIS
  // ==========================================
  console.log("📍 SUBFASE 1.2.4: Buscar Issues Oficiais\n");
  
  const officialIssues = await searchOfficialIssues(research.officialRepositories, problem);
  research.officialIssues = officialIssues;
  
  // ==========================================
  // SUBFASE 1.2.5: BUSCAR PULL REQUESTS OFICIAIS
  // ==========================================
  console.log("📍 SUBFASE 1.2.5: Buscar Pull Requests Oficiais\n");
  
  const officialPRs = await searchOfficialPullRequests(research.officialRepositories, problem);
  research.officialPullRequests = officialPRs;
  
  // ==========================================
  // SUBFASE 1.2.6: BUSCAR DISCUSSÕES OFICIAIS
  // ==========================================
  console.log("📍 SUBFASE 1.2.6: Buscar Discussões Oficiais\n");
  
  const officialDiscussions = await searchOfficialDiscussions(research.officialRepositories, problem);
  research.officialDiscussions = officialDiscussions;
  
  // ==========================================
  // SUBFASE 1.2.7: EXTRAIR SOLUÇÕES OFICIAIS
  // ==========================================
  console.log("📍 SUBFASE 1.2.7: Extrair Soluções Oficiais\n");
  
  const officialSolutions = await extractOfficialSolutions(research);
  research.officialSolutions = officialSolutions;
  
  // ==========================================
  // SUBFASE 1.2.8: VALIDAR PESQUISA OFICIAL
  // ==========================================
  console.log("📍 SUBFASE 1.2.8: Validar Pesquisa Oficial\n");
  
  research.validated = await validateOfficialResearch(research);
  
  if (!research.validated) {
    throw new Error("Pesquisa obrigatória no GitHub oficial não foi completada");
  }
  
  console.log("✅ Pesquisa obrigatória no GitHub oficial completada com sucesso!\n");
  
  return {
    complete: research.validated,
    research,
    summary: `Consultados ${research.officialRepositories.length} repositórios oficiais, ${research.officialSolutions.length} soluções encontradas`
  };
}
```

### **SUBFASE 1.3: Consulta Obrigatória de Documentação Oficial**

```typescript
/**
 * Consulta OBRIGATÓRIA de documentação oficial das stacks e bibliotecas
 */
async function investigateOfficialDocumentation(problem: Problem): Promise<OfficialDocumentationResult> {
  console.log("📚 ========================================");
  console.log("📚  CONSULTA OBRIGATÓRIA - DOCUMENTAÇÃO OFICIAL");
  console.log("📚 ========================================\n");
  
  const research: OfficialDocumentationResearch = {
    problem,
    stackDocumentation: [],
    libraryDocumentation: [],
    apiDocumentation: [],
    changelogs: [],
    migrationGuides: [],
    bestPractices: [],
    examples: [],
    validated: false
  };
  
  // ==========================================
  // SUBFASE 1.3.1: CONSULTAR DOCUMENTAÇÃO OFICIAL DAS STACKS
  // ==========================================
  console.log("📍 SUBFASE 1.3.1: Consultar Documentação Oficial das Stacks\n");
  
  for (const stack of problem.technologies) {
    const stackDocs = await consultOfficialStackDocumentation(stack);
    research.stackDocumentation.push(stackDocs);
  }
  
  // ==========================================
  // SUBFASE 1.3.2: CONSULTAR DOCUMENTAÇÃO OFICIAL DAS BIBLIOTECAS
  // ==========================================
  console.log("📍 SUBFASE 1.3.2: Consultar Documentação Oficial das Bibliotecas\n");
  
  for (const library of problem.libraries) {
    const libraryDocs = await consultOfficialLibraryDocumentation(library);
    research.libraryDocumentation.push(libraryDocs);
  }
  
  // ==========================================
  // SUBFASE 1.3.3: CONSULTAR DOCUMENTAÇÃO DE APIs
  // ==========================================
  console.log("📍 SUBFASE 1.3.3: Consultar Documentação de APIs\n");
  
  for (const api of problem.apis) {
    const apiDocs = await consultOfficialAPIDocumentation(api);
    research.apiDocumentation.push(apiDocs);
  }
  
  // ==========================================
  // SUBFASE 1.3.4: CONSULTAR CHANGELOGS OFICIAIS
  // ==========================================
  console.log("📍 SUBFASE 1.3.4: Consultar Changelogs Oficiais\n");
  
  const officialChangelogs = await consultOfficialChangelogs(research.stackDocumentation, research.libraryDocumentation);
  research.changelogs = officialChangelogs;
  
  // ==========================================
  // SUBFASE 1.3.5: CONSULTAR MIGRATION GUIDES OFICIAIS
  // ==========================================
  console.log("📍 SUBFASE 1.3.5: Consultar Migration Guides Oficiais\n");
  
  const officialMigrationGuides = await consultOfficialMigrationGuides(research.stackDocumentation, research.libraryDocumentation);
  research.migrationGuides = officialMigrationGuides;
  
  // ==========================================
  // SUBFASE 1.3.6: CONSULTAR BEST PRACTICES OFICIAIS
  // ==========================================
  console.log("📍 SUBFASE 1.3.6: Consultar Best Practices Oficiais\n");
  
  const officialBestPractices = await consultOfficialBestPractices(research.stackDocumentation, research.libraryDocumentation);
  research.bestPractices = officialBestPractices;
  
  // ==========================================
  // SUBFASE 1.3.7: CONSULTAR EXEMPLOS OFICIAIS
  // ==========================================
  console.log("📍 SUBFASE 1.3.7: Consultar Exemplos Oficiais\n");
  
  const officialExamples = await consultOfficialExamples(research.stackDocumentation, research.libraryDocumentation);
  research.examples = officialExamples;
  
  // ==========================================
  // SUBFASE 1.3.8: VALIDAR CONSULTA OFICIAL
  // ==========================================
  console.log("📍 SUBFASE 1.3.8: Validar Consulta Oficial\n");
  
  research.validated = await validateOfficialDocumentationResearch(research);
  
  if (!research.validated) {
    throw new Error("Consulta obrigatória de documentação oficial não foi completada");
  }
  
  console.log("✅ Consulta obrigatória de documentação oficial completada com sucesso!\n");
  
  return {
    complete: research.validated,
    research,
    summary: `Consultadas ${research.stackDocumentation.length + research.libraryDocumentation.length} documentações oficiais`
  };
}
```

### **Sistema de Validação Obrigatória**

```typescript
/**
 * Sistema de validação obrigatória de consultas oficiais
 */
class MandatoryOfficialConsultationSystem {
  private problemId: string;
  private requiredConsultations: RequiredConsultation[];
  
  constructor(problemId: string) {
    this.problemId = problemId;
    this.requiredConsultations = [];
  }
  
  /**
   * Validar se todas as consultas obrigatórias foram executadas
   */
  async validateMandatoryConsultations(problem: Problem): Promise<ValidationResult> {
    console.log("🔍 ========================================");
    console.log("🔍  VALIDAÇÃO OBRIGATÓRIA - CONSULTAS OFICIAIS");
    console.log("🔍 ========================================\n");
    
    const validation: ValidationResult = {
      valid: true,
      missingConsultations: [],
      errors: [],
      warnings: []
    };
    
    // ==========================================
    // VALIDAÇÃO 1: DOCUMENTAÇÃO OFICIAL DAS STACKS
    // ==========================================
    console.log("📍 VALIDAÇÃO 1: Documentação Oficial das Stacks\n");
    
    for (const stack of problem.technologies) {
      const stackDocs = await getOfficialStackDocumentation(stack);
      
      if (!stackDocs || !stackDocs.validated) {
        validation.valid = false;
        validation.missingConsultations.push({
          type: "STACK_DOCUMENTATION",
          target: stack,
          reason: "Documentação oficial da stack não consultada",
          required: true
        });
      }
    }
    
    // ==========================================
    // VALIDAÇÃO 2: DOCUMENTAÇÃO OFICIAL DAS BIBLIOTECAS
    // ==========================================
    console.log("📍 VALIDAÇÃO 2: Documentação Oficial das Bibliotecas\n");
    
    for (const library of problem.libraries) {
      const libraryDocs = await getOfficialLibraryDocumentation(library);
      
      if (!libraryDocs || !libraryDocs.validated) {
        validation.valid = false;
        validation.missingConsultations.push({
          type: "LIBRARY_DOCUMENTATION",
          target: library,
          reason: "Documentação oficial da biblioteca não consultada",
          required: true
        });
      }
    }
    
    // ==========================================
    // VALIDAÇÃO 3: GITHUB OFICIAL DAS STACKS
    // ==========================================
    console.log("📍 VALIDAÇÃO 3: GitHub Oficial das Stacks\n");
    
    for (const stack of problem.technologies) {
      const stackGitHub = await getOfficialStackGitHub(stack);
      
      if (!stackGitHub || !stackGitHub.validated) {
        validation.valid = false;
        validation.missingConsultations.push({
          type: "STACK_GITHUB",
          target: stack,
          reason: "GitHub oficial da stack não consultado",
          required: true
        });
      }
    }
    
    // ==========================================
    // VALIDAÇÃO 4: GITHUB OFICIAL DAS BIBLIOTECAS
    // ==========================================
    console.log("📍 VALIDAÇÃO 4: GitHub Oficial das Bibliotecas\n");
    
    for (const library of problem.libraries) {
      const libraryGitHub = await getOfficialLibraryGitHub(library);
      
      if (!libraryGitHub || !libraryGitHub.validated) {
        validation.valid = false;
        validation.missingConsultations.push({
          type: "LIBRARY_GITHUB",
          target: library,
          reason: "GitHub oficial da biblioteca não consultado",
          required: true
        });
      }
    }
    
    // ==========================================
    // VALIDAÇÃO 5: CHANGELOGS OFICIAIS
    // ==========================================
    console.log("📍 VALIDAÇÃO 5: Changelogs Oficiais\n");
    
    const officialChangelogs = await getOfficialChangelogs(problem);
    
    if (!officialChangelogs || !officialChangelogs.validated) {
      validation.valid = false;
      validation.missingConsultations.push({
        type: "OFFICIAL_CHANGELOGS",
        target: "ALL",
        reason: "Changelogs oficiais não consultados",
        required: true
      });
    }
    
    // ==========================================
    // VALIDAÇÃO 6: MIGRATION GUIDES OFICIAIS
    // ==========================================
    console.log("📍 VALIDAÇÃO 6: Migration Guides Oficiais\n");
    
    const officialMigrationGuides = await getOfficialMigrationGuides(problem);
    
    if (!officialMigrationGuides || !officialMigrationGuides.validated) {
      validation.valid = false;
      validation.missingConsultations.push({
        type: "OFFICIAL_MIGRATION_GUIDES",
        target: "ALL",
        reason: "Migration guides oficiais não consultados",
        required: true
      });
    }
    
    if (!validation.valid) {
      console.log("❌ Consultas obrigatórias não foram executadas:");
      for (const missing of validation.missingConsultations) {
        console.log(`❌ - ${missing.type}: ${missing.target} - ${missing.reason}`);
      }
      console.log("");
    } else {
      console.log("✅ Todas as consultas obrigatórias foram executadas com sucesso!\n");
    }
    
    return validation;
  }
  
  /**
   * Bloquear execução se consultas obrigatórias não foram executadas
   */
  async enforceMandatoryConsultations(problem: Problem): Promise<void> {
    const validation = await this.validateMandatoryConsultations(problem);
    
    if (!validation.valid) {
      throw new BlockedError({
        phase: "MANDATORY_OFFICIAL_CONSULTATION",
        reason: "Consultas obrigatórias de documentação oficial e GitHub oficial não foram executadas",
        action: "Executar todas as consultas obrigatórias antes de prosseguir",
        missingConsultations: validation.missingConsultations
      });
    }
  }
}
```

### **SUBFASE 1.3: Pesquisa na Internet**

```typescript
/**
 * Pesquisar na internet
 */
async function investigateInternet(problem: Problem): Promise<InternetResearchResult> {
  console.log("🌐 Pesquisando na internet...\n");
  
  const research: InternetResearch = {
    problem,
    sources: [],
    articles: [],
    tutorials: [],
    stackOverflow: [],
    solutions: []
  };
  
  // 1. Buscar artigos técnicos
  const articles = await searchTechnicalArticles(problem.keywords);
  research.articles = articles.filter(article => article.quality >= 7);
  
  // 2. Buscar tutoriais
  const tutorials = await searchTutorials(problem.description);
  research.tutorials = tutorials.filter(tutorial => tutorial.rating >= 4);
  
  // 3. Buscar no Stack Overflow
  const stackOverflow = await searchStackOverflow(problem.description);
  research.stackOverflow = stackOverflow.filter(so => so.accepted === true);
  
  // 4. Buscar em fóruns especializados
  const forums = await searchSpecializedForums(problem.domain);
  research.sources.push(...forums);
  
  // 5. Buscar em blogs técnicos
  const blogs = await searchTechnicalBlogs(problem.keywords);
  research.sources.push(...blogs);
  
  // 6. Extrair soluções
  research.solutions = await extractInternetSolutions(research);
  
  return {
    complete: research.solutions.length >= 5,
    sources: research.sources,
    articles: research.articles,
    tutorials: research.tutorials,
    stackOverflow: research.stackOverflow,
    solutions: research.solutions,
    summary: `Encontradas ${research.solutions.length} soluções na internet`
  };
}
```

### **SUBFASE 1.4: Análise Crítica (5+ Perguntas Obrigatórias)**

```typescript
/**
 * Executar análise crítica com 5+ perguntas obrigatórias
 */
async function executeCriticalAnalysis(problem: Problem, investigation: Investigation): Promise<CriticalAnalysisResult> {
  console.log("🤔 Executando análise crítica...\n");
  
  const questions = [
    {
      id: "q1",
      question: "Entendo completamente a causa raiz do problema?",
      criticalThinking: [
        "Posso explicar exatamente por que o problema ocorre?",
        "Identifiquei todas as variáveis envolvidas?",
        "Há causas secundárias que preciso considerar?"
      ],
      required: true
    },
    {
      id: "q2",
      question: "A solução proposta resolve o problema sem criar novos problemas?",
      criticalThinking: [
        "A solução é específica para este problema?",
        "Há efeitos colaterais que preciso considerar?",
        "A solução é escalável e mantível?"
      ],
      required: true
    },
    {
      id: "q3",
      question: "Verifiquei se há soluções mais elegantes ou eficientes?",
      criticalThinking: [
        "Há padrões de design que posso aplicar?",
        "Posso usar bibliotecas ou ferramentas existentes?",
        "A solução segue as melhores práticas da tecnologia?"
      ],
      required: true
    },
    {
      id: "q4",
      question: "A solução é compatível com a arquitetura e padrões do projeto?",
      criticalThinking: [
        "A solução se alinha com a arquitetura atual?",
        "Há conflitos com padrões estabelecidos?",
        "A solução é consistente com o código existente?"
      ],
      required: true
    },
    {
      id: "q5",
      question: "Testei e validei a solução adequadamente?",
      criticalThinking: [
        "Criei testes para validar a solução?",
        "Testei cenários de sucesso e falha?",
        "Validei a solução em ambiente similar ao produção?"
      ],
      required: true
    },
    {
      id: "q6",
      question: "Documentei adequadamente a solução e o processo?",
      criticalThinking: [
        "A documentação é clara e completa?",
        "Outros desenvolvedores conseguiriam entender?",
        "Há informações suficientes para manutenção futura?"
      ],
      required: true
    },
    {
      id: "q7",
      question: "Considerei o impacto na performance e segurança?",
      criticalThinking: [
        "A solução não degrada a performance?",
        "Há considerações de segurança?",
        "A solução é eficiente em termos de recursos?"
      ],
      required: true
    }
  ];
  
  const answers = await askCriticalQuestions(questions);
  
  // Verificar se todas as perguntas obrigatórias foram respondidas positivamente
  const requiredQuestions = questions.filter(q => q.required);
  const failedQuestions = answers.filter(a => 
    requiredQuestions.some(q => q.id === a.id) && a.confidence !== "HIGH"
  );
  
  if (failedQuestions.length > 0) {
    return {
      approved: false,
      questions: answers,
      failedQuestions: failedQuestions.map(q => q.question),
      reason: "Análise crítica não aprovada - perguntas obrigatórias falharam"
    };
  }
  
  return {
    approved: true,
    questions: answers,
    summary: "Análise crítica aprovada - todas as perguntas obrigatórias respondidas positivamente"
  };
}
```

### **SUBFASE 1.5: Validação de Conhecimento**

```typescript
/**
 * Validar conhecimento adquirido
 */
async function validateKnowledge(problem: Problem, investigation: Investigation): Promise<KnowledgeValidationResult> {
  console.log("🧠 Validando conhecimento adquirido...\n");
  
  const validation: KnowledgeValidation = {
    problem,
    knowledgeAreas: [],
    gaps: [],
    confidence: 0
  };
  
  // 1. Validar conhecimento técnico
  const technicalKnowledge = await validateTechnicalKnowledge(problem, investigation);
  validation.knowledgeAreas.push(technicalKnowledge);
  
  // 2. Validar conhecimento de domínio
  const domainKnowledge = await validateDomainKnowledge(problem, investigation);
  validation.knowledgeAreas.push(domainKnowledge);
  
  // 3. Validar conhecimento de ferramentas
  const toolsKnowledge = await validateToolsKnowledge(problem, investigation);
  validation.knowledgeAreas.push(toolsKnowledge);
  
  // 4. Validar conhecimento de padrões
  const patternsKnowledge = await validatePatternsKnowledge(problem, investigation);
  validation.knowledgeAreas.push(patternsKnowledge);
  
  // 5. Calcular confiança geral
  validation.confidence = validation.knowledgeAreas.reduce((sum, area) => sum + area.confidence, 0) / validation.knowledgeAreas.length;
  
  // 6. Identificar lacunas
  validation.gaps = validation.knowledgeAreas.filter(area => area.confidence < 8).map(area => area.name);
  
  return {
    approved: validation.confidence >= 8 && validation.gaps.length === 0,
    knowledgeAreas: validation.knowledgeAreas,
    gaps: validation.gaps,
    confidence: validation.confidence,
    reason: validation.gaps.length > 0 ? 
      `Lacunas de conhecimento identificadas: ${validation.gaps.join(', ')}` :
      `Conhecimento validado com confiança ${validation.confidence.toFixed(1)}/10`
  };
}
```

---

## 🚫 Enforcement Obrigatório

### **Bloqueio Automático**

```typescript
/**
 * NENHUM agente pode resolver problema sem análise de engenharia reversa completa
 */
async function resolveProblem(problemId: string, problem: Problem): Promise<ProblemResolution> {
  // Verificar se análise de engenharia reversa foi executada
  const reverseEngineering = await getReverseEngineeringAnalysis(problemId);
  
  if (!reverseEngineering || !reverseEngineering.approved) {
    throw new BlockedError({
      phase: "REVERSE_ENGINEERING_ANALYSIS",
      reason: "Análise de engenharia reversa obrigatória não executada",
      action: "Executar análise de engenharia reversa completa antes de resolver problema"
    });
  }
  
  // Verificar se mapeamento de dependências foi executado
  if (!reverseEngineering.analysis.dependencyGraph || Object.keys(reverseEngineering.analysis.dependencyGraph).length === 0) {
    throw new BlockedError({
      phase: "DEPENDENCY_MAPPING",
      reason: "Mapeamento de dependências obrigatório não executado",
      action: "Executar mapeamento completo de dependências antes de resolver problema"
    });
  }
  
  // Verificar se mapeamento de chamadas foi executado
  if (!reverseEngineering.analysis.callGraph || Object.keys(reverseEngineering.analysis.callGraph).length === 0) {
    throw new BlockedError({
      phase: "CALL_MAPPING",
      reason: "Mapeamento de chamadas obrigatório não executado",
      action: "Executar mapeamento completo de chamadas antes de resolver problema"
    });
  }
  
  // Verificar se mapeamento de fluxo de dados foi executado
  if (!reverseEngineering.analysis.dataFlow || Object.keys(reverseEngineering.analysis.dataFlow).length === 0) {
    throw new BlockedError({
      phase: "DATA_FLOW_MAPPING",
      reason: "Mapeamento de fluxo de dados obrigatório não executado",
      action: "Executar mapeamento completo de fluxo de dados antes de resolver problema"
    });
  }
  
  // Verificar se mapeamento de fluxo de controle foi executado
  if (!reverseEngineering.analysis.controlFlow || Object.keys(reverseEngineering.analysis.controlFlow).length === 0) {
    throw new BlockedError({
      phase: "CONTROL_FLOW_MAPPING",
      reason: "Mapeamento de fluxo de controle obrigatório não executado",
      action: "Executar mapeamento completo de fluxo de controle antes de resolver problema"
    });
  }
  
  // Verificar se causas raiz foram identificadas
  if (!reverseEngineering.analysis.rootCauses || reverseEngineering.analysis.rootCauses.length === 0) {
    throw new BlockedError({
      phase: "ROOT_CAUSE_IDENTIFICATION",
      reason: "Identificação de causas raiz obrigatória não executada",
      action: "Executar identificação completa de causas raiz antes de resolver problema"
    });
  }
  
  // Verificar se análise de impacto foi executada
  if (!reverseEngineering.analysis.impactAnalysis || Object.keys(reverseEngineering.analysis.impactAnalysis).length === 0) {
    throw new BlockedError({
      phase: "IMPACT_ANALYSIS",
      reason: "Análise de impacto obrigatória não executada",
      action: "Executar análise completa de impacto antes de resolver problema"
    });
  }
  
  // ==========================================
  // VALIDAÇÃO OBRIGATÓRIA: CONSULTAS OFICIAIS
  // ==========================================
  console.log("🔍 ========================================");
  console.log("🔍  VALIDAÇÃO OBRIGATÓRIA - CONSULTAS OFICIAIS");
  console.log("🔍 ========================================\n");
  
  const mandatoryConsultationSystem = new MandatoryOfficialConsultationSystem(problemId);
  await mandatoryConsultationSystem.enforceMandatoryConsultations(problem);
  
  console.log("✅ Todas as consultas obrigatórias foram executadas com sucesso!\n");
  
  // Prosseguir com resolução
  return await executeResolutionPhase(problemId, reverseEngineering);
}
```

### **Validação Contínua**

```typescript
/**
 * Verificar se investigação ainda é válida durante resolução
 */
async function validateInvestigationStillValid(problemId: string): Promise<boolean> {
  const investigation = await getInvestigation(problemId);
  const currentProblem = await getCurrentProblem(problemId);
  
  if (hasProblemChanged(investigation.problem, currentProblem)) {
    console.log("⚠️ Problema mudou significativamente. Re-investigar...");
    return false;
  }
  
  return true;
}
```

---

## 🚫 Regras Críticas de Resolução de Problemas

### **REGRA CRÍTICA: NUNCA SIMPLIFICAR CÓDIGO**

```typescript
/**
 * REGRA CRÍTICA: Agentes NUNCA devem simplificar código
 * 
 * Exceções permitidas:
 * 1. Apenas para testar ou validar algo
 * 2. Depois de testar, SEMPRE voltar ao arquivo original
 * 3. Corrigir o arquivo original com base nos testes
 */
class CodeModificationRules {
  
  /**
   * Verificar se modificação de código é permitida
   */
  async validateCodeModification(agentId: string, filePath: string, modificationType: string): Promise<ValidationResult> {
    console.log("🔍 ========================================");
    console.log("🔍  VALIDAÇÃO DE MODIFICAÇÃO DE CÓDIGO");
    console.log("🔍 ========================================\n");
    
    const validation: ValidationResult = {
      allowed: false,
      reason: "",
      action: ""
    };
    
    // ==========================================
    // REGRA 1: NUNCA SIMPLIFICAR CÓDIGO
    // ==========================================
    if (modificationType === "SIMPLIFY" || modificationType === "SIMPLIFICATION") {
      validation.allowed = false;
      validation.reason = "SIMPLIFICAÇÃO DE CÓDIGO É PROIBIDA";
      validation.action = "NUNCA simplifique código. Use apenas para teste/validação temporária";
      
      console.log("❌ SIMPLIFICAÇÃO DE CÓDIGO DETECTADA - BLOQUEADA");
      console.log("❌ Agente deve usar apenas para teste/validação temporária");
      console.log("❌ Depois de testar, voltar ao arquivo original e corrigir\n");
      
      return validation;
    }
    
    // ==========================================
    // REGRA 2: PERMITIR APENAS TESTE/VALIDAÇÃO TEMPORÁRIA
    // ==========================================
    if (modificationType === "TEST_VALIDATION" || modificationType === "TEMPORARY_TEST") {
      validation.allowed = true;
      validation.reason = "Teste/validação temporária permitida";
      validation.action = "Após teste, voltar ao arquivo original e corrigir";
      
      console.log("✅ Teste/validação temporária permitida");
      console.log("⚠️ LEMBRETE: Após teste, voltar ao arquivo original e corrigir\n");
      
      return validation;
    }
    
    // ==========================================
    // REGRA 3: PERMITIR CORREÇÃO DO ARQUIVO ORIGINAL
    // ==========================================
    if (modificationType === "FIX_ORIGINAL" || modificationType === "CORRECT_ORIGINAL") {
      validation.allowed = true;
      validation.reason = "Correção do arquivo original permitida";
      validation.action = "Corrigir arquivo original com base na análise";
      
      console.log("✅ Correção do arquivo original permitida");
      console.log("✅ Aplicar correção baseada na análise de engenharia reversa\n");
      
      return validation;
    }
    
    // ==========================================
    // REGRA 4: BLOQUEAR OUTRAS MODIFICAÇÕES
    // ==========================================
    validation.allowed = false;
    validation.reason = "Tipo de modificação não permitida";
    validation.action = "Use apenas: TEST_VALIDATION, TEMPORARY_TEST, FIX_ORIGINAL, CORRECT_ORIGINAL";
    
    console.log("❌ Tipo de modificação não permitida");
    console.log("❌ Use apenas: TEST_VALIDATION, TEMPORARY_TEST, FIX_ORIGINAL, CORRECT_ORIGINAL\n");
    
    return validation;
  }
  
  /**
   * Executar teste/validação temporária
   */
  async executeTemporaryTest(agentId: string, filePath: string, testCode: string): Promise<TemporaryTestResult> {
    console.log("🧪 ========================================");
    console.log("🧪  EXECUTANDO TESTE TEMPORÁRIO");
    console.log("🧪 ========================================\n");
    
    // ==========================================
    // SUBFASE 1: CRIAR BACKUP DO ARQUIVO ORIGINAL
    // ==========================================
    console.log("📍 SUBFASE 1: Criar Backup do Arquivo Original\n");
    
    const originalContent = await readFile(filePath);
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await writeFile(backupPath, originalContent);
    
    console.log(`✅ Backup criado: ${backupPath}\n`);
    
    // ==========================================
    // SUBFASE 2: APLICAR CÓDIGO DE TESTE TEMPORÁRIO
    // ==========================================
    console.log("📍 SUBFASE 2: Aplicar Código de Teste Temporário\n");
    
    await writeFile(filePath, testCode);
    
    console.log("✅ Código de teste aplicado temporariamente\n");
    
    // ==========================================
    // SUBFASE 3: EXECUTAR TESTE/VALIDAÇÃO
    // ==========================================
    console.log("📍 SUBFASE 3: Executar Teste/Validação\n");
    
    const testResult = await executeTest(filePath);
    
    console.log(`✅ Teste executado: ${testResult.success ? 'SUCESSO' : 'FALHA'}\n`);
    
    // ==========================================
    // SUBFASE 4: RESTAURAR ARQUIVO ORIGINAL
    // ==========================================
    console.log("📍 SUBFASE 4: Restaurar Arquivo Original\n");
    
    await writeFile(filePath, originalContent);
    
    console.log("✅ Arquivo original restaurado\n");
    
    // ==========================================
    // SUBFASE 5: APLICAR CORREÇÃO BASEADA NO TESTE
    // ==========================================
    console.log("📍 SUBFASE 5: Aplicar Correção Baseada no Teste\n");
    
    const correctedCode = await applyCorrectionBasedOnTest(originalContent, testResult);
    await writeFile(filePath, correctedCode);
    
    console.log("✅ Correção aplicada ao arquivo original\n");
    
    // ==========================================
    // SUBFASE 6: LIMPAR BACKUP
    // ==========================================
    console.log("📍 SUBFASE 6: Limpar Backup\n");
    
    await deleteFile(backupPath);
    
    console.log("✅ Backup removido\n");
    
    return {
      success: true,
      testResult,
      correctedCode,
      originalRestored: true,
      backupCleaned: true
    };
  }
  
  /**
   * Aplicar correção baseada no teste
   */
  private async applyCorrectionBasedOnTest(originalContent: string, testResult: TestResult): Promise<string> {
    console.log("🔧 Aplicando correção baseada no teste...\n");
    
    // Analisar resultado do teste
    const analysis = await analyzeTestResult(testResult);
    
    // Aplicar correção baseada na análise
    const correctedCode = await applyCorrection(originalContent, analysis);
    
    console.log("✅ Correção aplicada com base no teste\n");
    
    return correctedCode;
  }
  
  /**
   * Verificar se agente está seguindo as regras
   */
  async validateAgentCompliance(agentId: string, actions: AgentAction[]): Promise<ComplianceResult> {
    console.log("🔍 ========================================");
    console.log("🔍  VALIDAÇÃO DE COMPLIANCE DO AGENTE");
    console.log("🔍 ========================================\n");
    
    const compliance: ComplianceResult = {
      agentId,
      compliant: true,
      violations: [],
      warnings: [],
      score: 100
    };
    
    for (const action of actions) {
      // Verificar se ação é simplificação
      if (action.type === "SIMPLIFY" || action.type === "SIMPLIFICATION") {
        compliance.compliant = false;
        compliance.violations.push({
          action: action.type,
          reason: "SIMPLIFICAÇÃO DE CÓDIGO PROIBIDA",
          severity: "CRITICAL",
          timestamp: action.timestamp
        });
        compliance.score -= 50;
      }
      
      // Verificar se teste temporário foi seguido de restauração
      if (action.type === "TEMPORARY_TEST") {
        const hasRestoration = actions.some(a => 
          a.type === "RESTORE_ORIGINAL" && 
          a.timestamp > action.timestamp
        );
        
        if (!hasRestoration) {
          compliance.compliant = false;
          compliance.violations.push({
            action: action.type,
            reason: "TESTE TEMPORÁRIO SEM RESTAURAÇÃO DO ORIGINAL",
            severity: "HIGH",
            timestamp: action.timestamp
          });
          compliance.score -= 30;
        }
      }
      
      // Verificar se correção foi aplicada ao original
      if (action.type === "FIX_ORIGINAL") {
        const hasTemporaryTest = actions.some(a => 
          a.type === "TEMPORARY_TEST" && 
          a.timestamp < action.timestamp
        );
        
        if (!hasTemporaryTest) {
          compliance.warnings.push({
            action: action.type,
            reason: "CORREÇÃO SEM TESTE TEMPORÁRIO PRÉVIO",
            severity: "MEDIUM",
            timestamp: action.timestamp
          });
          compliance.score -= 10;
        }
      }
    }
    
    if (compliance.score < 70) {
      compliance.compliant = false;
    }
    
    return compliance;
  }
}
```

### **Sistema de Monitoramento de Compliance**

```typescript
/**
 * Sistema de monitoramento de compliance das regras
 */
class ComplianceMonitoringSystem {
  private agents: Map<string, AgentCompliance>;
  private violations: Violation[];
  private warnings: Warning[];
  
  constructor() {
    this.agents = new Map();
    this.violations = [];
    this.warnings = [];
  }
  
  /**
   * Monitorar ações dos agentes
   */
  async monitorAgentActions(agentId: string, action: AgentAction): Promise<void> {
    console.log(`🔍 Monitorando ação do agente ${agentId}: ${action.type}\n`);
    
    // Verificar compliance
    const compliance = await this.checkCompliance(agentId, action);
    
    if (!compliance.compliant) {
      // Registrar violação
      this.violations.push({
        agentId,
        action,
        reason: compliance.reason,
        timestamp: new Date().toISOString(),
        severity: compliance.severity
      });
      
      console.log(`❌ VIOLAÇÃO DETECTADA: ${compliance.reason}\n`);
      
      // Bloquear ação
      throw new BlockedError({
        phase: "COMPLIANCE_VIOLATION",
        reason: compliance.reason,
        action: "Corrigir ação para seguir as regras de compliance"
      });
    }
    
    if (compliance.warning) {
      // Registrar warning
      this.warnings.push({
        agentId,
        action,
        reason: compliance.warning,
        timestamp: new Date().toISOString(),
        severity: "MEDIUM"
      });
      
      console.log(`⚠️ WARNING: ${compliance.warning}\n`);
    }
    
    // Atualizar compliance do agente
    this.updateAgentCompliance(agentId, compliance);
  }
  
  /**
   * Verificar compliance de uma ação
   */
  private async checkCompliance(agentId: string, action: AgentAction): Promise<ComplianceCheck> {
    const compliance: ComplianceCheck = {
      compliant: true,
      reason: "",
      warning: "",
      severity: "LOW"
    };
    
    // Verificar se é simplificação
    if (action.type === "SIMPLIFY" || action.type === "SIMPLIFICATION") {
      compliance.compliant = false;
      compliance.reason = "SIMPLIFICAÇÃO DE CÓDIGO É PROIBIDA";
      compliance.severity = "CRITICAL";
    }
    
    // Verificar se teste temporário tem restauração
    if (action.type === "TEMPORARY_TEST") {
      // Verificar se há restauração subsequente
      const hasRestoration = await this.checkForRestoration(agentId, action);
      
      if (!hasRestoration) {
        compliance.compliant = false;
        compliance.reason = "TESTE TEMPORÁRIO SEM RESTAURAÇÃO DO ORIGINAL";
        compliance.severity = "HIGH";
      }
    }
    
    return compliance;
  }
  
  /**
   * Verificar se há restauração do original
   */
  private async checkForRestoration(agentId: string, testAction: AgentAction): Promise<boolean> {
    // Implementar verificação de restauração
    // Verificar se há ação de restauração após o teste
    return true; // Placeholder
  }
  
  /**
   * Atualizar compliance do agente
   */
  private updateAgentCompliance(agentId: string, compliance: ComplianceCheck): void {
    if (!this.agents.has(agentId)) {
      this.agents.set(agentId, {
        agentId,
        score: 100,
        violations: 0,
        warnings: 0,
        lastAction: new Date().toISOString()
      });
    }
    
    const agentCompliance = this.agents.get(agentId)!;
    
    if (!compliance.compliant) {
      agentCompliance.violations++;
      agentCompliance.score -= 10;
    }
    
    if (compliance.warning) {
      agentCompliance.warnings++;
      agentCompliance.score -= 5;
    }
    
    agentCompliance.lastAction = new Date().toISOString();
  }
}
```

---

## 📊 Métricas de Qualidade

### **KPIs de Investigação**
- **Taxa de investigação completa**: >= 100%
- **Tempo médio de investigação**: <= 2 horas
- **Taxa de aprovação na análise crítica**: >= 90%
- **Taxa de validação de conhecimento**: >= 95%
- **Taxa de resolução bem-sucedida**: >= 85%

### **KPIs de Engenharia Reversa**
- **Taxa de mapeamento de dependências**: >= 100%
- **Taxa de mapeamento de chamadas**: >= 100%
- **Taxa de mapeamento de fluxo de dados**: >= 100%
- **Taxa de mapeamento de fluxo de controle**: >= 100%
- **Taxa de identificação de causas raiz**: >= 95%
- **Taxa de análise de impacto**: >= 90%

### **KPIs de Compliance**
- **Taxa de compliance com regras**: >= 100%
- **Taxa de violações de simplificação**: 0%
- **Taxa de restauração após teste**: >= 100%
- **Taxa de correção do original**: >= 95%
- **Score médio de compliance**: >= 90%

### **KPIs de Consultas Obrigatórias**
- **Taxa de consulta de documentação oficial**: >= 100%
- **Taxa de consulta de GitHub oficial**: >= 100%
- **Taxa de consulta de changelogs oficiais**: >= 100%
- **Taxa de consulta de migration guides oficiais**: >= 100%
- **Taxa de consulta de best practices oficiais**: >= 100%
- **Taxa de consulta de exemplos oficiais**: >= 100%

### **Métricas de Impacto**
- **Redução de soluções incorretas**: >= 80%
- **Melhoria na qualidade das soluções**: >= 70%
- **Redução de retrabalho**: >= 60%
- **Aumento na confiança das soluções**: >= 90%
- **Redução de simplificações desnecessárias**: >= 100%
- **Melhoria na precisão das correções**: >= 85%
- **Melhoria na adoção de padrões oficiais**: >= 90%
- **Redução de bugs por incompatibilidade**: >= 80%

---

## 📁 Artifacts Gerados

### **Relatórios de Investigação**
```
docs/problem-solving/
├── {problemId}/
│   ├── investigation/
│   │   ├── official-docs.md
│   │   ├── github-research.md
│   │   ├── internet-research.md
│   │   ├── critical-analysis.md
│   │   └── knowledge-validation.md
│   ├── resolution/
│   │   ├── solution.md
│   │   ├── code-changes.md
│   │   ├── review-results.md
│   │   └── qa-results.md
│   └── final/
│       ├── problem-summary.md
│       └── resolution-report.md
```

---

## 🔄 Integração com Outros Protocolos

### **Integração com Análise de Tarefas**
```typescript
// Problemas identificados durante análise devem seguir este protocolo
async function handleProblemInTaskAnalysis(taskId: string, problem: Problem): Promise<void> {
  console.log("🚨 Problema identificado durante análise de tarefa");
  
  // Executar investigação obrigatória
  const investigation = await executeInvestigationPhase(problem.id, problem);
  
  if (!investigation.approved) {
    // Bloquear análise de tarefa até problema ser resolvido
    await blockTaskAnalysis(taskId, investigation.reason);
  }
}
```

### **Integração com Desenvolvimento**
```typescript
// Problemas identificados durante desenvolvimento devem seguir este protocolo
async function handleProblemInDevelopment(taskId: string, problem: Problem): Promise<void> {
  console.log("🚨 Problema identificado durante desenvolvimento");
  
  // Pausar desenvolvimento
  await pauseDevelopment(taskId);
  
  // Executar investigação obrigatória
  const investigation = await executeInvestigationPhase(problem.id, problem);
  
  if (investigation.approved) {
    // Resolver problema
    const resolution = await executeResolutionPhase(problem.id, investigation);
    
    if (resolution.approved) {
      // Retomar desenvolvimento
      await resumeDevelopment(taskId);
    }
  }
}
```

---

**Versão**: 1.0  
**Data**: Dezembro 2024  
**Autor**: Agente-CTO  
**Status**: **OBRIGATÓRIO** para todos os problemas  
**Integração**: Todos os protocolos e workflows