# Protocolo de Quebra de Tarefas em Sub-tarefas com TODOs

## Visão Geral

Protocolo **OBRIGATÓRIO** que agentes devem seguir para quebrar qualquer tarefa em **mínimo 5 sub-tarefas** específicas, criando TODOs particulares para cada uma, garantindo rastreabilidade e execução organizada.

---

## 🎯 Objetivo

Garantir que **TODAS as tarefas** sejam:
- ✅ Quebradas em **mínimo 5 sub-tarefas** específicas
- ✅ Cada sub-tarefa tenha **TODO particular** com critérios claros
- ✅ Sub-tarefas tenham **dependências explícitas**
- ✅ Sub-tarefas tenham **critérios de aceitação** definidos
- ✅ Sub-tarefas tenham **estimativa de tempo** realista
- ✅ Sub-tarefas tenham **prioridade** definida
- ✅ Sub-tarefas sejam **rastreáveis** individualmente

---

## 🚨 Trigger do Protocolo

### **Quando Ativar o Protocolo**

```typescript
interface TaskBreakdownTrigger {
  // Tarefas que DEVEM ser quebradas
  mandatoryBreakdown: [
    'Nova funcionalidade',
    'Refatoração de código',
    'Integração de sistema',
    'Otimização de performance',
    'Correção de bug complexo',
    'Implementação de segurança',
    'Migração de dados',
    'Atualização de dependências',
    'Criação de documentação',
    'Implementação de testes'
  ];
  
  // Tarefas que PODEM ser quebradas
  optionalBreakdown: [
    'Correção de bug simples',
    'Atualização de documentação',
    'Pequena melhoria de UI',
    'Ajuste de configuração',
    'Atualização de README'
  ];
  
  // Tarefas que NÃO precisam ser quebradas
  noBreakdown: [
    'Consulta de informação',
    'Verificação de status',
    'Execução de comando simples',
    'Leitura de arquivo',
    'Listagem de diretório'
  ];
}
```

---

## 📋 Estrutura de Sub-tarefas

### **Template de Sub-tarefa**

```typescript
interface SubTask {
  id: string;                    // ID único da sub-tarefa
  parentTaskId: string;          // ID da tarefa pai
  title: string;                 // Título descritivo
  description: string;           // Descrição detalhada
  type: SubTaskType;            // Tipo da sub-tarefa
  priority: Priority;           // Prioridade (HIGH, MEDIUM, LOW)
  estimatedTime: number;        // Tempo estimado em horas
  dependencies: string[];       // IDs das sub-tarefas dependentes
  acceptanceCriteria: string[]; // Critérios de aceitação
  deliverables: string[];       // Entregáveis específicos
  status: SubTaskStatus;        // Status atual
  assignedTo?: string;          // Agente responsável
  createdAt: string;            // Data de criação
  updatedAt: string;            // Data de atualização
  completedAt?: string;         // Data de conclusão
  notes: string[];              // Notas e observações
  tags: string[];               // Tags para categorização
}
```

### **Tipos de Sub-tarefas**

```typescript
interface SubTaskType {
  // Análise e Planejamento
  ANALYSIS: "ANALYSIS";
  PLANNING: "PLANNING";
  DESIGN: "DESIGN";
  ARCHITECTURE: "ARCHITECTURE";
  
  // Desenvolvimento
  DEVELOPMENT: "DEVELOPMENT";
  IMPLEMENTATION: "IMPLEMENTATION";
  INTEGRATION: "INTEGRATION";
  CONFIGURATION: "CONFIGURATION";
  
  // Testes e Qualidade
  TESTING: "TESTING";
  QA: "QA";
  VALIDATION: "VALIDATION";
  DEBUGGING: "DEBUGGING";
  
  // Documentação e Deploy
  DOCUMENTATION: "DOCUMENTATION";
  DEPLOYMENT: "DEPLOYMENT";
  MONITORING: "MONITORING";
  MAINTENANCE: "MAINTENANCE";
}
```

---

## 🔄 Fases do Protocolo

### **FASE 1: ANÁLISE E QUEBRA**

```typescript
/**
 * FASE 1: Análise e Quebra da Tarefa
 * 
 * Analisar tarefa e quebrar em sub-tarefas
 */
async function executeTaskBreakdownPhase(taskId: string, task: Task): Promise<TaskBreakdownResult> {
  console.log("\n📋 ========================================");
  console.log("📋  ANÁLISE E QUEBRA - SUB-TAREFAS");
  console.log("📋 ========================================\n");
  
  const breakdown: TaskBreakdown = {
    taskId,
    task,
    timestamp: new Date().toISOString(),
    subTasks: [],
    dependencies: [],
    timeline: {},
    resources: {}
  };
  
  // ==========================================
  // SUBFASE 1.1: ANÁLISE DA TAREFA
  // ==========================================
  console.log("📍 SUBFASE 1.1: Análise da Tarefa\n");
  
  const taskAnalysis = await analyzeTaskForBreakdown(task);
  breakdown.analysis = taskAnalysis;
  
  // ==========================================
  // SUBFASE 1.2: IDENTIFICAÇÃO DE COMPONENTES
  // ==========================================
  console.log("📍 SUBFASE 1.2: Identificação de Componentes\n");
  
  const components = await identifyTaskComponents(task);
  breakdown.components = components;
  
  // ==========================================
  // SUBFASE 1.3: CRIAÇÃO DE SUB-TAREFAS
  // ==========================================
  console.log("📍 SUBFASE 1.3: Criação de Sub-tarefas\n");
  
  const subTasks = await createSubTasks(task, components);
  breakdown.subTasks = subTasks;
  
  // ==========================================
  // SUBFASE 1.4: DEFINIÇÃO DE DEPENDÊNCIAS
  // ==========================================
  console.log("📍 SUBFASE 1.4: Definição de Dependências\n");
  
  const dependencies = await defineSubTaskDependencies(subTasks);
  breakdown.dependencies = dependencies;
  
  // ==========================================
  // SUBFASE 1.5: CRIAÇÃO DE TODOs
  // ==========================================
  console.log("📍 SUBFASE 1.5: Criação de TODOs\n");
  
  const todos = await createSubTaskTodos(subTasks);
  breakdown.todos = todos;
  
  // ==========================================
  // SUBFASE 1.6: VALIDAÇÃO DA QUEBRA
  // ==========================================
  console.log("📍 SUBFASE 1.6: Validação da Quebra\n");
  
  const validation = await validateTaskBreakdown(breakdown);
  breakdown.validation = validation;
  
  if (!validation.approved) {
    return {
      approved: false,
      reason: "Quebra de tarefa não aprovada",
      issues: validation.issues,
      nextAction: "Corrigir issues e repetir quebra"
    };
  }
  
  // ==========================================
  // QUEBRA APROVADA
  // ==========================================
  console.log("✅ ========================================");
  console.log("✅  QUEBRA: APROVADA");
  console.log("✅ ========================================");
  console.log(`✅ ${subTasks.length} sub-tarefas criadas\n`);
  
  // Salvar quebra
  await saveTaskBreakdown(breakdown);
  
  return {
    approved: true,
    breakdown,
    subTasks: breakdown.subTasks,
    todos: breakdown.todos,
    nextPhase: "SUBTASK_EXECUTION"
  };
}
```

### **FASE 2: EXECUÇÃO DE SUB-TAREFAS**

```typescript
/**
 * FASE 2: Execução de Sub-tarefas
 * 
 * Executar sub-tarefas seguindo TODOs
 */
async function executeSubTaskPhase(taskId: string, breakdown: TaskBreakdown): Promise<SubTaskExecutionResult> {
  console.log("\n⚡ ========================================");
  console.log("⚡  EXECUÇÃO - SUB-TAREFAS");
  console.log("⚡ ========================================\n");
  
  const execution: SubTaskExecution = {
    taskId,
    breakdown,
    timestamp: new Date().toISOString(),
    executionPlan: {},
    progress: {},
    results: {}
  };
  
  // ==========================================
  // SUBFASE 2.1: CRIAÇÃO DO PLANO DE EXECUÇÃO
  // ==========================================
  console.log("📍 SUBFASE 2.1: Criação do Plano de Execução\n");
  
  const executionPlan = await createExecutionPlan(breakdown);
  execution.executionPlan = executionPlan;
  
  // ==========================================
  // SUBFASE 2.2: EXECUÇÃO SEQUENCIAL
  // ==========================================
  console.log("📍 SUBFASE 2.2: Execução Sequencial\n");
  
  const sequentialResults = await executeSequentialSubTasks(executionPlan);
  execution.results.sequential = sequentialResults;
  
  // ==========================================
  // SUBFASE 2.3: EXECUÇÃO PARALELA
  // ==========================================
  console.log("📍 SUBFASE 2.3: Execução Paralela\n");
  
  const parallelResults = await executeParallelSubTasks(executionPlan);
  execution.results.parallel = parallelResults;
  
  // ==========================================
  // SUBFASE 2.4: VALIDAÇÃO DE RESULTADOS
  // ==========================================
  console.log("📍 SUBFASE 2.4: Validação de Resultados\n");
  
  const validation = await validateSubTaskResults(execution);
  execution.validation = validation;
  
  if (!validation.approved) {
    return {
      approved: false,
      reason: "Execução de sub-tarefas não aprovada",
      issues: validation.issues,
      nextAction: "Corrigir issues e repetir execução"
    };
  }
  
  // ==========================================
  // EXECUÇÃO APROVADA
  // ==========================================
  console.log("✅ ========================================");
  console.log("✅  EXECUÇÃO: APROVADA");
  console.log("✅ ========================================");
  console.log("✅ Todas as sub-tarefas executadas com sucesso\n");
  
  return {
    approved: true,
    execution,
    results: execution.results,
    nextPhase: "TASK_COMPLETION"
  };
}
```

---

## 🔧 Implementação das Subfases

### **SUBFASE 1.1: Análise da Tarefa para Quebra**

```typescript
/**
 * Analisar tarefa para determinar como quebrar
 */
async function analyzeTaskForBreakdown(task: Task): Promise<TaskBreakdownAnalysis> {
  console.log("🔍 Analisando tarefa para quebra...\n");
  
  const analysis: TaskBreakdownAnalysis = {
    task,
    complexity: "LOW",
    estimatedSubTasks: 5,
    breakdownStrategy: "SEQUENTIAL",
    riskLevel: "LOW",
    resourceRequirements: [],
    timeEstimate: 0
  };
  
  // 1. Análise de complexidade
  if (task.complexity >= 8) {
    analysis.complexity = "HIGH";
    analysis.estimatedSubTasks = 8;
    analysis.breakdownStrategy = "PARALLEL";
    analysis.riskLevel = "HIGH";
  } else if (task.complexity >= 5) {
    analysis.complexity = "MEDIUM";
    analysis.estimatedSubTasks = 6;
    analysis.breakdownStrategy = "MIXED";
    analysis.riskLevel = "MEDIUM";
  } else {
    analysis.complexity = "LOW";
    analysis.estimatedSubTasks = 5;
    analysis.breakdownStrategy = "SEQUENTIAL";
    analysis.riskLevel = "LOW";
  }
  
  // 2. Análise de domínio
  if (task.domain === "FRONTEND") {
    analysis.resourceRequirements.push("UI_DEVELOPER", "DESIGNER");
  } else if (task.domain === "BACKEND") {
    analysis.resourceRequirements.push("BACKEND_DEVELOPER", "DATABASE_ADMIN");
  } else if (task.domain === "FULLSTACK") {
    analysis.resourceRequirements.push("FULLSTACK_DEVELOPER", "UI_DEVELOPER", "BACKEND_DEVELOPER");
  }
  
  // 3. Análise de integração
  if (task.integrationPoints.length > 0) {
    analysis.resourceRequirements.push("INTEGRATION_SPECIALIST");
    analysis.estimatedSubTasks += 2;
  }
  
  // 4. Análise de segurança
  if (task.securityCritical) {
    analysis.resourceRequirements.push("SECURITY_SPECIALIST");
    analysis.estimatedSubTasks += 1;
  }
  
  // 5. Análise de performance
  if (task.performanceCritical) {
    analysis.resourceRequirements.push("PERFORMANCE_SPECIALIST");
    analysis.estimatedSubTasks += 1;
  }
  
  // 6. Estimativa de tempo
  analysis.timeEstimate = analysis.estimatedSubTasks * 2; // 2 horas por sub-tarefa
  
  return analysis;
}
```

### **SUBFASE 1.2: Identificação de Componentes**

```typescript
/**
 * Identificar componentes da tarefa para quebrar
 */
async function identifyTaskComponents(task: Task): Promise<TaskComponent[]> {
  console.log("🧩 Identificando componentes da tarefa...\n");
  
  const components: TaskComponent[] = [];
  
  // 1. Componentes de análise
  components.push({
    id: "analysis",
    name: "Análise e Planejamento",
    type: "ANALYSIS",
    description: "Analisar requisitos e planejar implementação",
    priority: "HIGH",
    estimatedTime: 2
  });
  
  // 2. Componentes de desenvolvimento
  if (task.domain === "FRONTEND" || task.domain === "FULLSTACK") {
    components.push({
      id: "frontend-dev",
      name: "Desenvolvimento Frontend",
      type: "DEVELOPMENT",
      description: "Implementar interface do usuário",
      priority: "HIGH",
      estimatedTime: 4
    });
  }
  
  if (task.domain === "BACKEND" || task.domain === "FULLSTACK") {
    components.push({
      id: "backend-dev",
      name: "Desenvolvimento Backend",
      type: "DEVELOPMENT",
      description: "Implementar lógica de negócio e APIs",
      priority: "HIGH",
      estimatedTime: 4
    });
  }
  
  // 3. Componentes de integração
  if (task.integrationPoints.length > 0) {
    components.push({
      id: "integration",
      name: "Integração de Sistemas",
      type: "INTEGRATION",
      description: "Integrar com sistemas externos",
      priority: "MEDIUM",
      estimatedTime: 3
    });
  }
  
  // 4. Componentes de testes
  components.push({
    id: "testing",
    name: "Testes e Validação",
    type: "TESTING",
    description: "Criar e executar testes",
    priority: "HIGH",
    estimatedTime: 3
  });
  
  // 5. Componentes de documentação
  components.push({
    id: "documentation",
    name: "Documentação",
    type: "DOCUMENTATION",
    description: "Criar documentação técnica",
    priority: "MEDIUM",
    estimatedTime: 2
  });
  
  // 6. Componentes de deploy
  components.push({
    id: "deployment",
    name: "Deploy e Monitoramento",
    type: "DEPLOYMENT",
    description: "Fazer deploy e configurar monitoramento",
    priority: "MEDIUM",
    estimatedTime: 2
  });
  
  return components;
}
```

### **SUBFASE 1.3: Criação de Sub-tarefas**

```typescript
/**
 * Criar sub-tarefas baseadas nos componentes
 */
async function createSubTasks(task: Task, components: TaskComponent[]): Promise<SubTask[]> {
  console.log("📝 Criando sub-tarefas...\n");
  
  const subTasks: SubTask[] = [];
  
  for (const component of components) {
    const subTask: SubTask = {
      id: `${task.id}-${component.id}`,
      parentTaskId: task.id,
      title: component.name,
      description: component.description,
      type: component.type,
      priority: component.priority,
      estimatedTime: component.estimatedTime,
      dependencies: [],
      acceptanceCriteria: [],
      deliverables: [],
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      tags: [component.type.toLowerCase()]
    };
    
    // Definir critérios de aceitação específicos
    subTask.acceptanceCriteria = await defineAcceptanceCriteria(component);
    
    // Definir entregáveis específicos
    subTask.deliverables = await defineDeliverables(component);
    
    // Definir dependências
    subTask.dependencies = await defineDependencies(component, components);
    
    subTasks.push(subTask);
  }
  
  return subTasks;
}
```

### **SUBFASE 1.4: Definição de Dependências**

```typescript
/**
 * Definir dependências entre sub-tarefas
 */
async function defineDependencies(component: TaskComponent, allComponents: TaskComponent[]): Promise<string[]> {
  const dependencies: string[] = [];
  
  // Análise deve ser feita antes de tudo
  if (component.type !== "ANALYSIS") {
    const analysisComponent = allComponents.find(c => c.type === "ANALYSIS");
    if (analysisComponent) {
      dependencies.push(analysisComponent.id);
    }
  }
  
  // Desenvolvimento depende de análise
  if (component.type === "DEVELOPMENT") {
    const analysisComponent = allComponents.find(c => c.type === "ANALYSIS");
    if (analysisComponent) {
      dependencies.push(analysisComponent.id);
    }
  }
  
  // Integração depende de desenvolvimento
  if (component.type === "INTEGRATION") {
    const devComponents = allComponents.filter(c => c.type === "DEVELOPMENT");
    devComponents.forEach(dev => dependencies.push(dev.id));
  }
  
  // Testes dependem de desenvolvimento
  if (component.type === "TESTING") {
    const devComponents = allComponents.filter(c => c.type === "DEVELOPMENT");
    devComponents.forEach(dev => dependencies.push(dev.id));
  }
  
  // Documentação depende de desenvolvimento
  if (component.type === "DOCUMENTATION") {
    const devComponents = allComponents.filter(c => c.type === "DEVELOPMENT");
    devComponents.forEach(dev => dependencies.push(dev.id));
  }
  
  // Deploy depende de testes
  if (component.type === "DEPLOYMENT") {
    const testingComponent = allComponents.find(c => c.type === "TESTING");
    if (testingComponent) {
      dependencies.push(testingComponent.id);
    }
  }
  
  return dependencies;
}
```

### **SUBFASE 1.5: Criação de TODOs**

```typescript
/**
 * Criar TODOs para cada sub-tarefa
 */
async function createSubTaskTodos(subTasks: SubTask[]): Promise<SubTaskTodo[]> {
  console.log("✅ Criando TODOs para sub-tarefas...\n");
  
  const todos: SubTaskTodo[] = [];
  
  for (const subTask of subTasks) {
    const todo: SubTaskTodo = {
      id: `todo-${subTask.id}`,
      subTaskId: subTask.id,
      title: `Completar: ${subTask.title}`,
      description: subTask.description,
      status: "PENDING",
      priority: subTask.priority,
      estimatedTime: subTask.estimatedTime,
      acceptanceCriteria: subTask.acceptanceCriteria,
      deliverables: subTask.deliverables,
      dependencies: subTask.dependencies,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      tags: subTask.tags
    };
    
    todos.push(todo);
  }
  
  return todos;
}
```

---

## 📊 Sistema de Execução de TODOs

### **Executor de TODOs**

```typescript
/**
 * Executar TODOs de sub-tarefas
 */
class SubTaskTodoExecutor {
  private taskId: string;
  private todos: SubTaskTodo[];
  private executionOrder: string[];
  
  constructor(taskId: string, todos: SubTaskTodo[]) {
    this.taskId = taskId;
    this.todos = todos;
    this.executionOrder = this.calculateExecutionOrder();
  }
  
  async executeAllTodos(): Promise<TodoExecutionResult> {
    console.log("⚡ Executando todos os TODOs...\n");
    
    const results: TodoExecutionResult = {
      taskId: this.taskId,
      executed: [],
      failed: [],
      skipped: [],
      totalTime: 0
    };
    
    for (const todoId of this.executionOrder) {
      const todo = this.todos.find(t => t.id === todoId);
      if (!todo) continue;
      
      console.log(`📍 Executando TODO: ${todo.title}\n`);
      
      try {
        const result = await this.executeTodo(todo);
        results.executed.push(result);
        results.totalTime += result.executionTime;
        
        console.log(`✅ TODO concluído: ${todo.title}\n`);
      } catch (error) {
        results.failed.push({
          todoId: todo.id,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        console.log(`❌ TODO falhou: ${todo.title} - ${error.message}\n`);
      }
    }
    
    return results;
  }
  
  private async executeTodo(todo: SubTaskTodo): Promise<TodoExecution> {
    const startTime = Date.now();
    
    // Executar lógica específica da sub-tarefa
    const result = await this.executeSubTaskLogic(todo);
    
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000; // em segundos
    
    return {
      todoId: todo.id,
      status: "COMPLETED",
      executionTime,
      result,
      timestamp: new Date().toISOString()
    };
  }
  
  private async executeSubTaskLogic(todo: SubTaskTodo): Promise<any> {
    // Implementar lógica específica baseada no tipo da sub-tarefa
    switch (todo.tags[0]) {
      case "analysis":
        return await this.executeAnalysisLogic(todo);
      case "development":
        return await this.executeDevelopmentLogic(todo);
      case "testing":
        return await this.executeTestingLogic(todo);
      case "documentation":
        return await this.executeDocumentationLogic(todo);
      case "deployment":
        return await this.executeDeploymentLogic(todo);
      default:
        throw new Error(`Tipo de sub-tarefa não suportado: ${todo.tags[0]}`);
    }
  }
  
  private calculateExecutionOrder(): string[] {
    // Calcular ordem de execução baseada nas dependências
    const order: string[] = [];
    const visited = new Set<string>();
    
    const visit = (todoId: string) => {
      if (visited.has(todoId)) return;
      
      const todo = this.todos.find(t => t.id === todoId);
      if (!todo) return;
      
      // Visitar dependências primeiro
      for (const depId of todo.dependencies) {
        const depTodo = this.todos.find(t => t.subTaskId === depId);
        if (depTodo) {
          visit(depTodo.id);
        }
      }
      
      visited.add(todoId);
      order.push(todoId);
    };
    
    // Visitar todos os TODOs
    for (const todo of this.todos) {
      visit(todo.id);
    }
    
    return order;
  }
}
```

---

## 🚫 Enforcement Obrigatório

### **Bloqueio Automático**

```typescript
/**
 * NENHUM agente pode executar tarefa sem quebrar em sub-tarefas
 */
async function executeTaskWithBreakdown(taskId: string, task: Task): Promise<TaskExecutionResult> {
  // Verificar se tarefa foi quebrada
  const breakdown = await getTaskBreakdown(taskId);
  
  if (!breakdown || !breakdown.approved) {
    throw new BlockedError({
      phase: "TASK_BREAKDOWN",
      reason: "Quebra de tarefa obrigatória não executada",
      action: "Executar protocolo de quebra de tarefas antes de prosseguir"
    });
  }
  
  // Verificar se tem mínimo de 5 sub-tarefas
  if (breakdown.subTasks.length < 5) {
    throw new BlockedError({
      phase: "TASK_BREAKDOWN",
      reason: "Tarefa deve ter mínimo de 5 sub-tarefas",
      action: "Criar mais sub-tarefas para atingir o mínimo de 5"
    });
  }
  
  // Verificar se TODOs foram criados
  if (!breakdown.todos || breakdown.todos.length === 0) {
    throw new BlockedError({
      phase: "TASK_BREAKDOWN",
      reason: "TODOs obrigatórios não criados",
      action: "Criar TODOs para todas as sub-tarefas"
    });
  }
  
  // Prosseguir com execução
  return await executeSubTaskPhase(taskId, breakdown);
}
```

### **Validação Contínua**

```typescript
/**
 * Verificar se sub-tarefas estão sendo executadas corretamente
 */
async function validateSubTaskExecution(taskId: string): Promise<boolean> {
  const breakdown = await getTaskBreakdown(taskId);
  const execution = await getSubTaskExecution(taskId);
  
  // Verificar se todas as sub-tarefas estão sendo executadas
  const pendingSubTasks = breakdown.subTasks.filter(st => st.status === "PENDING");
  
  if (pendingSubTasks.length > 0) {
    console.log(`⚠️ ${pendingSubTasks.length} sub-tarefas pendentes`);
    return false;
  }
  
  // Verificar se TODOs estão sendo seguidos
  const pendingTodos = breakdown.todos.filter(todo => todo.status === "PENDING");
  
  if (pendingTodos.length > 0) {
    console.log(`⚠️ ${pendingTodos.length} TODOs pendentes`);
    return false;
  }
  
  return true;
}
```

---

## 📊 Métricas de Qualidade

### **KPIs de Quebra de Tarefas**
- **Taxa de quebra obrigatória**: >= 100%
- **Mínimo de sub-tarefas**: >= 5
- **Taxa de criação de TODOs**: >= 100%
- **Taxa de execução de sub-tarefas**: >= 95%
- **Tempo médio de execução**: <= 2 horas por sub-tarefa

### **Métricas de Impacto**
- **Melhoria na organização**: >= 85%
- **Redução de complexidade**: >= 70%
- **Aumento na rastreabilidade**: >= 90%
- **Melhoria na qualidade**: >= 80%

---

## 📁 Artifacts Gerados

### **Estrutura de Sub-tarefas**
```
docs/task-breakdown/
├── {taskId}/
│   ├── breakdown-analysis.md
│   ├── sub-tasks/
│   │   ├── {subTaskId}-analysis.md
│   │   ├── {subTaskId}-development.md
│   │   ├── {subTaskId}-testing.md
│   │   ├── {subTaskId}-documentation.md
│   │   └── {subTaskId}-deployment.md
│   ├── todos/
│   │   ├── todo-{subTaskId}-analysis.md
│   │   ├── todo-{subTaskId}-development.md
│   │   ├── todo-{subTaskId}-testing.md
│   │   ├── todo-{subTaskId}-documentation.md
│   │   └── todo-{subTaskId}-deployment.md
│   └── execution/
│       ├── execution-plan.md
│       ├── progress-report.md
│       └── completion-report.md
```

---

## 🔄 Integração com Outros Protocolos

### **Integração com Análise de Tarefas**
```typescript
// Quebra de tarefas deve ser executada após análise
async function analyzeTaskWithBreakdown(taskId: string, task: Task): Promise<void> {
  // Executar análise de tarefa
  const analysis = await executeTaskAnalysisPhase(taskId, task);
  
  if (analysis.approved) {
    // Executar quebra de tarefas
    const breakdown = await executeTaskBreakdownPhase(taskId, task);
    
    if (breakdown.approved) {
      // Prosseguir com desenvolvimento
      await executeSubTaskPhase(taskId, breakdown.breakdown);
    }
  }
}
```

### **Integração com Desenvolvimento**
```typescript
// Desenvolvimento deve seguir sub-tarefas e TODOs
async function developWithSubTasks(taskId: string, breakdown: TaskBreakdown): Promise<void> {
  // Executar cada sub-tarefa sequencialmente
  for (const subTask of breakdown.subTasks) {
    console.log(`📍 Executando sub-tarefa: ${subTask.title}\n`);
    
    // Executar sub-tarefa
    await executeSubTask(subTask);
    
    // Validar critérios de aceitação
    const validation = await validateSubTaskCompletion(subTask);
    
    if (!validation.approved) {
      throw new Error(`Sub-tarefa ${subTask.title} não atendeu aos critérios de aceitação`);
    }
    
    console.log(`✅ Sub-tarefa concluída: ${subTask.title}\n`);
  }
}
```

---

**Versão**: 1.0  
**Data**: Dezembro 2024  
**Autor**: Agente-CTO  
**Status**: **OBRIGATÓRIO** para todas as tarefas  
**Integração**: Todos os protocolos e workflows