# Protocolo de Visualização Dinâmica de Mermaids

## Visão Geral

Protocolo **OBRIGATÓRIO** que agentes devem seguir para exibir, manter e atualizar diagramas Mermaid durante todo o desenvolvimento, mostrando situação atual e futura do projeto.

---

## 🎯 Objetivo

Garantir que **TODOS os agentes**:
- ✅ Exibam Mermaids relevantes durante desenvolvimento
- ✅ Mantenham diagramas atualizados em tempo real
- ✅ Mostrem situação atual do projeto
- ✅ Mostrem situação futura planejada
- ✅ Documentem decisões arquiteturais visualmente
- ✅ Facilitem compreensão e colaboração

---

## 🚨 Trigger do Protocolo

### **Quando Ativar o Protocolo**

```typescript
interface MermaidTrigger {
  // Durante desenvolvimento
  developmentPhases: [
    'Início de nova funcionalidade',
    'Modificação de arquitetura',
    'Integração de componentes',
    'Refatoração de código',
    'Otimização de performance'
  ];
  
  // Durante revisão
  reviewPhases: [
    'Code review iniciado',
    'Mudanças arquiteturais detectadas',
    'Novos padrões identificados',
    'Dependências alteradas',
    'Fluxos modificados'
  ];
  
  // Durante QA
  qaPhases: [
    'Testes de integração',
    'Validação de fluxos',
    'Verificação de cenários',
    'Análise de performance',
    'Testes de segurança'
  ];
  
  // Durante documentação
  documentationPhases: [
    'Atualização de documentação',
    'Criação de guias',
    'Documentação de APIs',
    'Criação de tutoriais',
    'Atualização de README'
  ];
}
```

---

## 📋 Tipos de Mermaids Obrigatórios

### **1. Diagramas de Arquitetura**

```typescript
interface ArchitectureMermaid {
  // Arquitetura atual
  current: {
    systemOverview: MermaidDiagram;
    componentDiagram: MermaidDiagram;
    dataFlow: MermaidDiagram;
    deploymentDiagram: MermaidDiagram;
  };
  
  // Arquitetura futura
  future: {
    plannedArchitecture: MermaidDiagram;
    migrationPath: MermaidDiagram;
    newComponents: MermaidDiagram;
    updatedDataFlow: MermaidDiagram;
  };
}
```

### **2. Diagramas de Fluxo**

```typescript
interface FlowMermaid {
  // Fluxos atuais
  current: {
    userJourney: MermaidDiagram;
    businessProcess: MermaidDiagram;
    dataProcessing: MermaidDiagram;
    errorHandling: MermaidDiagram;
  };
  
  // Fluxos futuros
  future: {
    plannedUserJourney: MermaidDiagram;
    newBusinessProcess: MermaidDiagram;
    updatedDataProcessing: MermaidDiagram;
    improvedErrorHandling: MermaidDiagram;
  };
}
```

### **3. Diagramas de Estado**

```typescript
interface StateMermaid {
  // Estados atuais
  current: {
    entityStates: MermaidDiagram;
    processStates: MermaidDiagram;
    systemStates: MermaidDiagram;
    userStates: MermaidDiagram;
  };
  
  // Estados futuros
  future: {
    plannedEntityStates: MermaidDiagram;
    newProcessStates: MermaidDiagram;
    updatedSystemStates: MermaidDiagram;
    enhancedUserStates: MermaidDiagram;
  };
}
```

### **4. Diagramas de Sequência**

```typescript
interface SequenceMermaid {
  // Sequências atuais
  current: {
    apiCalls: MermaidDiagram;
    userInteractions: MermaidDiagram;
    systemInteractions: MermaidDiagram;
    errorScenarios: MermaidDiagram;
  };
  
  // Sequências futuras
  future: {
    plannedApiCalls: MermaidDiagram;
    newUserInteractions: MermaidDiagram;
    updatedSystemInteractions: MermaidDiagram;
    improvedErrorScenarios: MermaidDiagram;
  };
}
```

---

## 🔄 Fases do Protocolo

### **FASE 1: ANÁLISE E PLANEJAMENTO**

```typescript
/**
 * FASE 1: Análise e Planejamento de Mermaids
 * 
 * Determinar quais diagramas são necessários
 */
async function executeMermaidAnalysisPhase(taskId: string, task: Task): Promise<MermaidAnalysisResult> {
  console.log("\n📊 ========================================");
  console.log("📊  ANÁLISE E PLANEJAMENTO - MERMAIDS");
  console.log("📊 ========================================\n");
  
  const analysis: MermaidAnalysis = {
    taskId,
    task,
    timestamp: new Date().toISOString(),
    requiredDiagrams: [],
    currentState: {},
    futureState: {}
  };
  
  // ==========================================
  // SUBFASE 1.1: ANÁLISE DA TAREFA
  // ==========================================
  console.log("📍 SUBFASE 1.1: Análise da Tarefa\n");
  
  const taskAnalysis = await analyzeTaskForMermaidRequirements(task);
  analysis.requiredDiagrams = taskAnalysis.requiredDiagrams;
  
  // ==========================================
  // SUBFASE 1.2: MAPEAMENTO DO ESTADO ATUAL
  // ==========================================
  console.log("📍 SUBFASE 1.2: Mapeamento do Estado Atual\n");
  
  const currentState = await mapCurrentState(task);
  analysis.currentState = currentState;
  
  // ==========================================
  // SUBFASE 1.3: PLANEJAMENTO DO ESTADO FUTURO
  // ==========================================
  console.log("📍 SUBFASE 1.3: Planejamento do Estado Futuro\n");
  
  const futureState = await planFutureState(task);
  analysis.futureState = futureState;
  
  // ==========================================
  // SUBFASE 1.4: CRIAÇÃO DOS DIAGRAMAS
  // ==========================================
  console.log("📍 SUBFASE 1.4: Criação dos Diagramas\n");
  
  const diagrams = await createMermaidDiagrams(analysis);
  analysis.diagrams = diagrams;
  
  return {
    approved: true,
    analysis,
    diagrams: analysis.diagrams,
    nextPhase: "MERMAID_DISPLAY"
  };
}
```

### **FASE 2: EXIBIÇÃO DINÂMICA**

```typescript
/**
 * FASE 2: Exibição Dinâmica de Mermaids
 * 
 * Exibir diagramas relevantes durante desenvolvimento
 */
async function executeMermaidDisplayPhase(taskId: string, diagrams: MermaidDiagrams): Promise<MermaidDisplayResult> {
  console.log("\n📊 ========================================");
  console.log("📊  EXIBIÇÃO DINÂMICA - MERMAIDS");
  console.log("📊 ========================================\n");
  
  const display: MermaidDisplay = {
    taskId,
    diagrams,
    timestamp: new Date().toISOString(),
    displayHistory: [],
    updates: []
  };
  
  // ==========================================
  // SUBFASE 2.1: EXIBIÇÃO INICIAL
  // ==========================================
  console.log("📍 SUBFASE 2.1: Exibição Inicial\n");
  
  await displayInitialMermaids(diagrams);
  display.displayHistory.push({
    phase: "INITIAL",
    diagrams: Object.keys(diagrams),
    timestamp: new Date().toISOString()
  });
  
  // ==========================================
  // SUBFASE 2.2: MONITORAMENTO DE MUDANÇAS
  // ==========================================
  console.log("📍 SUBFASE 2.2: Monitoramento de Mudanças\n");
  
  const changeMonitor = await startChangeMonitoring(taskId, diagrams);
  display.changeMonitor = changeMonitor;
  
  // ==========================================
  // SUBFASE 2.3: ATUALIZAÇÃO AUTOMÁTICA
  // ==========================================
  console.log("📍 SUBFASE 2.3: Atualização Automática\n");
  
  const autoUpdater = await startAutoUpdater(taskId, diagrams);
  display.autoUpdater = autoUpdater;
  
  return {
    approved: true,
    display,
    nextPhase: "MERMAID_MAINTENANCE"
  };
}
```

### **FASE 3: MANUTENÇÃO CONTÍNUA**

```typescript
/**
 * FASE 3: Manutenção Contínua de Mermaids
 * 
 * Manter diagramas atualizados durante desenvolvimento
 */
async function executeMermaidMaintenancePhase(taskId: string, display: MermaidDisplay): Promise<MermaidMaintenanceResult> {
  console.log("\n📊 ========================================");
  console.log("📊  MANUTENÇÃO CONTÍNUA - MERMAIDS");
  console.log("📊 ========================================\n");
  
  const maintenance: MermaidMaintenance = {
    taskId,
    display,
    timestamp: new Date().toISOString(),
    updates: [],
    validations: []
  };
  
  // ==========================================
  // SUBFASE 3.1: DETECÇÃO DE MUDANÇAS
  // ==========================================
  console.log("📍 SUBFASE 3.1: Detecção de Mudanças\n");
  
  const changeDetector = await detectChanges(taskId);
  maintenance.changeDetector = changeDetector;
  
  // ==========================================
  // SUBFASE 3.2: ATUALIZAÇÃO DE DIAGRAMAS
  // ==========================================
  console.log("📍 SUBFASE 3.2: Atualização de Diagramas\n");
  
  const diagramUpdater = await updateDiagrams(taskId, changeDetector.changes);
  maintenance.updates.push(diagramUpdater);
  
  // ==========================================
  // SUBFASE 3.3: VALIDAÇÃO DE CONSISTÊNCIA
  // ==========================================
  console.log("📍 SUBFASE 3.3: Validação de Consistência\n");
  
  const consistencyValidator = await validateConsistency(taskId, diagramUpdater.updatedDiagrams);
  maintenance.validations.push(consistencyValidator);
  
  // ==========================================
  // SUBFASE 3.4: EXIBIÇÃO DE ATUALIZAÇÕES
  // ==========================================
  console.log("📍 SUBFASE 3.4: Exibição de Atualizações\n");
  
  await displayUpdatedMermaids(diagramUpdater.updatedDiagrams);
  maintenance.displayHistory.push({
    phase: "UPDATED",
    diagrams: Object.keys(diagramUpdater.updatedDiagrams),
    timestamp: new Date().toISOString()
  });
  
  return {
    approved: true,
    maintenance,
    nextPhase: "MERMAID_VALIDATION"
  };
}
```

---

## 🔧 Implementação das Subfases

### **SUBFASE 1.1: Análise da Tarefa para Mermaid**

```typescript
/**
 * Analisar tarefa para determinar diagramas necessários
 */
async function analyzeTaskForMermaidRequirements(task: Task): Promise<MermaidRequirements> {
  console.log("🔍 Analisando requisitos de Mermaid para tarefa...\n");
  
  const requirements: MermaidRequirements = {
    task,
    requiredDiagrams: [],
    complexity: "LOW",
    priority: "MEDIUM"
  };
  
  // 1. Análise de complexidade
  if (task.complexity >= 8) {
    requirements.complexity = "HIGH";
    requirements.requiredDiagrams.push(
      "ARCHITECTURE_OVERVIEW",
      "COMPONENT_DIAGRAM",
      "DATA_FLOW",
      "SEQUENCE_DIAGRAM",
      "STATE_DIAGRAM"
    );
  } else if (task.complexity >= 5) {
    requirements.complexity = "MEDIUM";
    requirements.requiredDiagrams.push(
      "COMPONENT_DIAGRAM",
      "DATA_FLOW",
      "SEQUENCE_DIAGRAM"
    );
  } else {
    requirements.complexity = "LOW";
    requirements.requiredDiagrams.push(
      "SIMPLE_FLOW"
    );
  }
  
  // 2. Análise de domínio
  if (task.domain === "FRONTEND") {
    requirements.requiredDiagrams.push("USER_INTERACTION_FLOW");
  } else if (task.domain === "BACKEND") {
    requirements.requiredDiagrams.push("API_SEQUENCE_DIAGRAM");
  } else if (task.domain === "DATABASE") {
    requirements.requiredDiagrams.push("ENTITY_RELATIONSHIP_DIAGRAM");
  }
  
  // 3. Análise de integração
  if (task.integrationPoints.length > 0) {
    requirements.requiredDiagrams.push("INTEGRATION_DIAGRAM");
  }
  
  // 4. Análise de performance
  if (task.performanceCritical) {
    requirements.requiredDiagrams.push("PERFORMANCE_FLOW_DIAGRAM");
  }
  
  // 5. Análise de segurança
  if (task.securityCritical) {
    requirements.requiredDiagrams.push("SECURITY_FLOW_DIAGRAM");
  }
  
  return requirements;
}
```

### **SUBFASE 1.2: Mapeamento do Estado Atual**

```typescript
/**
 * Mapear estado atual do sistema
 */
async function mapCurrentState(task: Task): Promise<CurrentStateMapping> {
  console.log("🗺️ Mapeando estado atual do sistema...\n");
  
  const mapping: CurrentStateMapping = {
    task,
    components: [],
    dataFlows: [],
    userFlows: [],
    systemStates: [],
    integrations: []
  };
  
  // 1. Mapear componentes atuais
  const currentComponents = await getCurrentComponents(task.affectedComponents);
  mapping.components = currentComponents;
  
  // 2. Mapear fluxos de dados atuais
  const currentDataFlows = await getCurrentDataFlows(task.dataEntities);
  mapping.dataFlows = currentDataFlows;
  
  // 3. Mapear fluxos de usuário atuais
  const currentUserFlows = await getCurrentUserFlows(task.userStories);
  mapping.userFlows = currentUserFlows;
  
  // 4. Mapear estados do sistema atuais
  const currentSystemStates = await getCurrentSystemStates(task.systemEntities);
  mapping.systemStates = currentSystemStates;
  
  // 5. Mapear integrações atuais
  const currentIntegrations = await getCurrentIntegrations(task.integrationPoints);
  mapping.integrations = currentIntegrations;
  
  return mapping;
}
```

### **SUBFASE 1.3: Planejamento do Estado Futuro**

```typescript
/**
 * Planejar estado futuro do sistema
 */
async function planFutureState(task: Task): Promise<FutureStatePlanning> {
  console.log("🔮 Planejando estado futuro do sistema...\n");
  
  const planning: FutureStatePlanning = {
    task,
    plannedComponents: [],
    plannedDataFlows: [],
    plannedUserFlows: [],
    plannedSystemStates: [],
    plannedIntegrations: [],
    migrationPath: []
  };
  
  // 1. Planejar novos componentes
  const plannedComponents = await planNewComponents(task.newComponents);
  planning.plannedComponents = plannedComponents;
  
  // 2. Planejar novos fluxos de dados
  const plannedDataFlows = await planNewDataFlows(task.dataChanges);
  planning.plannedDataFlows = plannedDataFlows;
  
  // 3. Planejar novos fluxos de usuário
  const plannedUserFlows = await planNewUserFlows(task.userStoryChanges);
  planning.plannedUserFlows = plannedUserFlows;
  
  // 4. Planejar novos estados do sistema
  const plannedSystemStates = await planNewSystemStates(task.systemChanges);
  planning.plannedSystemStates = plannedSystemStates;
  
  // 5. Planejar novas integrações
  const plannedIntegrations = await planNewIntegrations(task.integrationChanges);
  planning.plannedIntegrations = plannedIntegrations;
  
  // 6. Criar caminho de migração
  const migrationPath = await createMigrationPath(planning);
  planning.migrationPath = migrationPath;
  
  return planning;
}
```

### **SUBFASE 1.4: Criação dos Diagramas**

```typescript
/**
 * Criar diagramas Mermaid baseados na análise
 */
async function createMermaidDiagrams(analysis: MermaidAnalysis): Promise<MermaidDiagrams> {
  console.log("🎨 Criando diagramas Mermaid...\n");
  
  const diagrams: MermaidDiagrams = {
    current: {},
    future: {},
    migration: {}
  };
  
  // 1. Criar diagramas do estado atual
  for (const diagramType of analysis.requiredDiagrams) {
    const currentDiagram = await createCurrentStateDiagram(diagramType, analysis.currentState);
    diagrams.current[diagramType] = currentDiagram;
  }
  
  // 2. Criar diagramas do estado futuro
  for (const diagramType of analysis.requiredDiagrams) {
    const futureDiagram = await createFutureStateDiagram(diagramType, analysis.futureState);
    diagrams.future[diagramType] = futureDiagram;
  }
  
  // 3. Criar diagramas de migração
  const migrationDiagram = await createMigrationDiagram(analysis);
  diagrams.migration = migrationDiagram;
  
  return diagrams;
}
```

---

## 📊 Implementação de Diagramas Específicos

### **Diagrama de Arquitetura Atual**

```typescript
/**
 * Criar diagrama de arquitetura atual
 */
async function createCurrentArchitectureDiagram(mapping: CurrentStateMapping): Promise<MermaidDiagram> {
  const mermaid = `
graph TB
    subgraph "Frontend"
        UI[User Interface]
        COMP[Components]
        STATE[State Management]
    end
    
    subgraph "Backend"
        API[API Layer]
        SERVICE[Business Services]
        DATA[Data Access]
    end
    
    subgraph "Database"
        DB[(Database)]
        CACHE[(Cache)]
    end
    
    subgraph "External"
        EXT[External APIs]
        AUTH[Authentication]
    end
    
    UI --> API
    COMP --> STATE
    API --> SERVICE
    SERVICE --> DATA
    DATA --> DB
    DATA --> CACHE
    API --> AUTH
    SERVICE --> EXT
    
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef database fill:#e8f5e8
    classDef external fill:#fff3e0
    
    class UI,COMP,STATE frontend
    class API,SERVICE,DATA backend
    class DB,CACHE database
    class EXT,AUTH external
  `;
  
  return {
    type: "ARCHITECTURE_CURRENT",
    title: "Arquitetura Atual do Sistema",
    content: mermaid,
    timestamp: new Date().toISOString(),
    version: "1.0"
  };
}
```

### **Diagrama de Arquitetura Futura**

```typescript
/**
 * Criar diagrama de arquitetura futura
 */
async function createFutureArchitectureDiagram(planning: FutureStatePlanning): Promise<MermaidDiagram> {
  const mermaid = `
graph TB
    subgraph "Frontend"
        UI[User Interface]
        COMP[Components]
        STATE[State Management]
        NEW_COMP[New Components]
    end
    
    subgraph "Backend"
        API[API Layer]
        SERVICE[Business Services]
        DATA[Data Access]
        NEW_SERVICE[New Services]
    end
    
    subgraph "Database"
        DB[(Database)]
        CACHE[(Cache)]
        NEW_DB[(New Database)]
    end
    
    subgraph "External"
        EXT[External APIs]
        AUTH[Authentication]
        NEW_EXT[New External APIs]
    end
    
    UI --> API
    COMP --> STATE
    NEW_COMP --> STATE
    API --> SERVICE
    API --> NEW_SERVICE
    SERVICE --> DATA
    NEW_SERVICE --> DATA
    DATA --> DB
    DATA --> NEW_DB
    DATA --> CACHE
    API --> AUTH
    SERVICE --> EXT
    NEW_SERVICE --> NEW_EXT
    
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef database fill:#e8f5e8
    classDef external fill:#fff3e0
    classDef new fill:#ffebee
    
    class UI,COMP,STATE frontend
    class API,SERVICE,DATA backend
    class DB,CACHE database
    class EXT,AUTH external
    class NEW_COMP,NEW_SERVICE,NEW_DB,NEW_EXT new
  `;
  
  return {
    type: "ARCHITECTURE_FUTURE",
    title: "Arquitetura Futura do Sistema",
    content: mermaid,
    timestamp: new Date().toISOString(),
    version: "1.0"
  };
}
```

### **Diagrama de Fluxo de Dados**

```typescript
/**
 * Criar diagrama de fluxo de dados
 */
async function createDataFlowDiagram(mapping: CurrentStateMapping): Promise<MermaidDiagram> {
  const mermaid = `
graph LR
    USER[User] --> UI[User Interface]
    UI --> API[API Gateway]
    API --> AUTH[Authentication]
    AUTH --> SERVICE[Business Service]
    SERVICE --> VALIDATION[Data Validation]
    VALIDATION --> TRANSFORM[Data Transformation]
    TRANSFORM --> STORE[Data Storage]
    STORE --> CACHE[Cache Layer]
    CACHE --> RESPONSE[Response]
    RESPONSE --> API
    API --> UI
    UI --> USER
    
    classDef user fill:#e3f2fd
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef data fill:#e8f5e8
    
    class USER user
    class UI frontend
    class API,AUTH,SERVICE,VALIDATION,TRANSFORM backend
    class STORE,CACHE,RESPONSE data
  `;
  
  return {
    type: "DATA_FLOW",
    title: "Fluxo de Dados do Sistema",
    content: mermaid,
    timestamp: new Date().toISOString(),
    version: "1.0"
  };
}
```

### **Diagrama de Sequência de API**

```typescript
/**
 * Criar diagrama de sequência de API
 */
async function createAPISequenceDiagram(mapping: CurrentStateMapping): Promise<MermaidDiagram> {
  const mermaid = `
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant API as API Gateway
    participant AUTH as Authentication
    participant SVC as Business Service
    participant DB as Database
    
    U->>UI: 1. Request
    UI->>API: 2. API Call
    API->>AUTH: 3. Validate Token
    AUTH-->>API: 4. Token Valid
    API->>SVC: 5. Process Request
    SVC->>DB: 6. Query Data
    DB-->>SVC: 7. Return Data
    SVC-->>API: 8. Processed Response
    API-->>UI: 9. API Response
    UI-->>U: 10. Display Result
    
    Note over U,DB: Complete API Flow
  `;
  
  return {
    type: "API_SEQUENCE",
    title: "Sequência de Chamadas de API",
    content: mermaid,
    timestamp: new Date().toISOString(),
    version: "1.0"
  };
}
```

---

## 🔄 Sistema de Atualização Automática

### **Monitor de Mudanças**

```typescript
/**
 * Monitorar mudanças no código e atualizar diagramas
 */
class MermaidChangeMonitor {
  private taskId: string;
  private diagrams: MermaidDiagrams;
  private updateCallbacks: ((diagrams: MermaidDiagrams) => void)[] = [];
  
  constructor(taskId: string, diagrams: MermaidDiagrams) {
    this.taskId = taskId;
    this.diagrams = diagrams;
  }
  
  async startMonitoring(): Promise<void> {
    console.log("🔍 Iniciando monitoramento de mudanças...\n");
    
    // Monitorar mudanças no código
    this.monitorCodeChanges();
    
    // Monitorar mudanças na arquitetura
    this.monitorArchitectureChanges();
    
    // Monitorar mudanças nos dados
    this.monitorDataChanges();
    
    // Monitorar mudanças nos fluxos
    this.monitorFlowChanges();
  }
  
  private async monitorCodeChanges(): Promise<void> {
    // Implementar monitoramento de mudanças no código
    // Atualizar diagramas quando código muda
  }
  
  private async monitorArchitectureChanges(): Promise<void> {
    // Implementar monitoramento de mudanças na arquitetura
    // Atualizar diagramas de arquitetura
  }
  
  private async monitorDataChanges(): Promise<void> {
    // Implementar monitoramento de mudanças nos dados
    // Atualizar diagramas de fluxo de dados
  }
  
  private async monitorFlowChanges(): Promise<void> {
    // Implementar monitoramento de mudanças nos fluxos
    // Atualizar diagramas de sequência
  }
  
  onUpdate(callback: (diagrams: MermaidDiagrams) => void): void {
    this.updateCallbacks.push(callback);
  }
  
  private async notifyUpdate(updatedDiagrams: MermaidDiagrams): Promise<void> {
    for (const callback of this.updateCallbacks) {
      await callback(updatedDiagrams);
    }
  }
}
```

### **Atualizador Automático**

```typescript
/**
 * Atualizar diagramas automaticamente
 */
class MermaidAutoUpdater {
  private taskId: string;
  private diagrams: MermaidDiagrams;
  private changeMonitor: MermaidChangeMonitor;
  
  constructor(taskId: string, diagrams: MermaidDiagrams, changeMonitor: MermaidChangeMonitor) {
    this.taskId = taskId;
    this.diagrams = diagrams;
    this.changeMonitor = changeMonitor;
  }
  
  async startAutoUpdate(): Promise<void> {
    console.log("🔄 Iniciando atualização automática...\n");
    
    // Configurar callbacks de atualização
    this.changeMonitor.onUpdate(async (updatedDiagrams) => {
      await this.updateDiagrams(updatedDiagrams);
    });
  }
  
  private async updateDiagrams(updatedDiagrams: MermaidDiagrams): Promise<void> {
    console.log("📊 Atualizando diagramas...\n");
    
    // Atualizar diagramas
    this.diagrams = updatedDiagrams;
    
    // Exibir diagramas atualizados
    await this.displayUpdatedDiagrams();
    
    // Salvar versão atualizada
    await this.saveUpdatedDiagrams();
  }
  
  private async displayUpdatedDiagrams(): Promise<void> {
    // Exibir diagramas atualizados no console
    for (const [type, diagram] of Object.entries(this.diagrams.current)) {
      console.log(`\n📊 ${diagram.title} (Atual):`);
      console.log("```mermaid");
      console.log(diagram.content);
      console.log("```\n");
    }
    
    for (const [type, diagram] of Object.entries(this.diagrams.future)) {
      console.log(`\n🔮 ${diagram.title} (Futuro):`);
      console.log("```mermaid");
      console.log(diagram.content);
      console.log("```\n");
    }
  }
  
  private async saveUpdatedDiagrams(): Promise<void> {
    // Salvar diagramas atualizados
    const savePath = `docs/mermaid-diagrams/${this.taskId}/`;
    await this.saveDiagramsToFile(savePath, this.diagrams);
  }
}
```

---

## 🚫 Enforcement Obrigatório

### **Bloqueio Automático**

```typescript
/**
 * NENHUM agente pode desenvolver sem exibir Mermaids
 */
async function developWithMermaidVisualization(taskId: string, task: Task): Promise<DevelopmentResult> {
  // Verificar se Mermaids foram criados
  const mermaidAnalysis = await getMermaidAnalysis(taskId);
  
  if (!mermaidAnalysis || !mermaidAnalysis.approved) {
    throw new BlockedError({
      phase: "MERMAID_ANALYSIS",
      reason: "Análise de Mermaid obrigatória não executada",
      action: "Executar protocolo de visualização de Mermaid antes de desenvolver"
    });
  }
  
  // Verificar se diagramas estão sendo exibidos
  const displayStatus = await getMermaidDisplayStatus(taskId);
  
  if (!displayStatus.active) {
    throw new BlockedError({
      phase: "MERMAID_DISPLAY",
      reason: "Exibição de Mermaid obrigatória não ativa",
      action: "Ativar exibição de diagramas antes de desenvolver"
    });
  }
  
  // Prosseguir com desenvolvimento
  return await executeDevelopmentWithMermaidVisualization(taskId, task, mermaidAnalysis);
}
```

### **Validação Contínua**

```typescript
/**
 * Verificar se Mermaids estão atualizados durante desenvolvimento
 */
async function validateMermaidUpToDate(taskId: string): Promise<boolean> {
  const lastUpdate = await getLastMermaidUpdate(taskId);
  const lastCodeChange = await getLastCodeChange(taskId);
  
  if (lastUpdate < lastCodeChange) {
    console.log("⚠️ Mermaids desatualizados. Atualizando...");
    await updateMermaidDiagrams(taskId);
    return false;
  }
  
  return true;
}
```

---

## 📊 Métricas de Qualidade

### **KPIs de Visualização**
- **Taxa de exibição de Mermaids**: >= 100%
- **Taxa de atualização automática**: >= 95%
- **Tempo de atualização**: <= 30 segundos
- **Consistência dos diagramas**: >= 90%
- **Cobertura de diagramas**: >= 80%

### **Métricas de Impacto**
- **Melhoria na compreensão**: >= 85%
- **Redução de ambiguidade**: >= 70%
- **Aumento na colaboração**: >= 60%
- **Melhoria na documentação**: >= 80%

---

## 📁 Artifacts Gerados

### **Diagramas Mermaid**
```
docs/mermaid-diagrams/
├── {taskId}/
│   ├── current/
│   │   ├── architecture.md
│   │   ├── data-flow.md
│   │   ├── sequence.md
│   │   └── state.md
│   ├── future/
│   │   ├── planned-architecture.md
│   │   ├── planned-data-flow.md
│   │   ├── planned-sequence.md
│   │   └── planned-state.md
│   ├── migration/
│   │   └── migration-path.md
│   └── updates/
│       ├── update-1.md
│       ├── update-2.md
│       └── ...
```

---

## 🔄 Integração com Outros Protocolos

### **Integração com Desenvolvimento**
```typescript
// Mermaids devem ser exibidos durante todo o desenvolvimento
async function developWithMermaidSupport(taskId: string, task: Task): Promise<void> {
  // Criar e exibir Mermaids
  const mermaidAnalysis = await executeMermaidAnalysisPhase(taskId, task);
  
  if (mermaidAnalysis.approved) {
    // Iniciar exibição dinâmica
    const display = await executeMermaidDisplayPhase(taskId, mermaidAnalysis.diagrams);
    
    if (display.approved) {
      // Iniciar manutenção contínua
      const maintenance = await executeMermaidMaintenancePhase(taskId, display.display);
      
      // Desenvolver com suporte visual
      await developWithVisualSupport(taskId, task, maintenance);
    }
  }
}
```

### **Integração com Revisão**
```typescript
// Mermaids devem ser revisados junto com o código
async function reviewWithMermaidSupport(taskId: string, codeChanges: CodeChanges): Promise<void> {
  // Verificar se Mermaids estão atualizados
  const mermaidStatus = await validateMermaidUpToDate(taskId);
  
  if (!mermaidStatus) {
    console.log("⚠️ Mermaids desatualizados. Atualizando antes da revisão...");
    await updateMermaidDiagrams(taskId);
  }
  
  // Revisar código com suporte visual
  await reviewCodeWithVisualSupport(taskId, codeChanges);
}
```

---

**Versão**: 1.0  
**Data**: Dezembro 2024  
**Autor**: Agente-CTO  
**Status**: **OBRIGATÓRIO** para todo desenvolvimento  
**Integração**: Todos os protocolos e workflows