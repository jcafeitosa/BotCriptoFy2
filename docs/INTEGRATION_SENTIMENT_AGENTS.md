# Integração: Módulo Sentiment + Módulo Agents

## 📋 Análise de Viabilidade

### ✅ **SIM, É TOTALMENTE VIÁVEL E RECOMENDADO!**

O módulo **Sentiment** já está mapeado para o agente **Marketing (CMO)** conforme definido em `agents.types.ts`:

```typescript
// ModuleToAgentMapping
'sentiment': 'marketing',

// AgentSystemPrompts
marketing: `You are the Marketing Agent (CMO) of BotCriptoFy2.

You manage 2 modules: Marketing, Sentiment

Your responsibilities include:
- Marketing campaign management and optimization
- Social media sentiment analysis and brand monitoring
- Content strategy and planning
- Marketing analytics and ROI tracking
```

---

## 🎯 Proposta de Integração

### 1. **Agent Actions para Sentiment**

Criar ações que o agente Marketing pode executar automaticamente:

#### **Ações Propostas:**

```typescript
export const SentimentAgentActions = {
  // Análise de Sentimento
  'sentiment:analyze_text': {
    handler: async (input: { text: string; context?: any }) => {
      return await hybridSentimentService.analyze(input.text, input.context);
    },
  },

  'sentiment:analyze_batch': {
    handler: async (input: { texts: Array<{id: string; text: string}> }) => {
      return await hybridSentimentService.analyzeBatch({ texts: input.texts });
    },
  },

  // Agregação e Análise
  'sentiment:get_aggregated': {
    handler: async (input: { symbol?: string; timeWindow?: number }) => {
      // Buscar dados do banco e agregar
      return await sentimentAggregator.aggregateFromAll(news, social, input.symbol);
    },
  },

  'sentiment:calculate_fear_greed': {
    handler: async (input: { symbol: string }) => {
      // Calcular Fear & Greed Index
      const sentiment = await getSentimentForSymbol(input.symbol);
      const volume = await getSocialVolumeForSymbol(input.symbol);
      const volatility = await getPriceVolatility(input.symbol);
      const momentum = await getPriceMomentum(input.symbol);

      return await sentimentAggregator.calculateFearGreedIndex(
        sentiment,
        volume,
        volatility,
        momentum
      );
    },
  },

  // Trending Topics
  'sentiment:get_trending': {
    handler: async (input: { symbol?: string; limit?: number }) => {
      return input.symbol
        ? trendingTopicsService.getTrendingForSymbol(input.symbol)
        : trendingTopicsService.getTrendingTopics();
    },
  },

  'sentiment:analyze_trending': {
    handler: async (input: { symbol: string }) => {
      const trending = trendingTopicsService.getTrendingForSymbol(input.symbol);

      // Usar AI para analisar tendências
      const analysis = await hybridSentimentService.analyze(
        `Analyze these trending topics for ${input.symbol}: ${trending.map(t => t.topic).join(', ')}`,
        { forceAI: true }
      );

      return { trending, analysis };
    },
  },

  // Correlação de Preço
  'sentiment:get_correlation': {
    handler: async (input: { symbol: string; timeframe?: number }) => {
      const sentimentData = await getSentimentHistory(input.symbol, input.timeframe);
      const priceData = await getPriceHistory(input.symbol, input.timeframe);

      return await priceCorrelationService.calculateCorrelation(
        sentimentData,
        priceData,
        input.symbol
      );
    },
  },

  'sentiment:detect_divergences': {
    handler: async (input: { symbol: string }) => {
      const sentimentData = await getSentimentHistory(input.symbol);
      const priceData = await getPriceHistory(input.symbol);

      return await priceCorrelationService.detectDivergences(
        sentimentData,
        priceData
      );
    },
  },

  'sentiment:generate_signals': {
    handler: async (input: { symbol: string }) => {
      const sentiment = await getAggregatedSentiment(input.symbol);
      const priceData = await getPriceHistory(input.symbol);
      const correlation = await getCorrelation(input.symbol);

      return await priceCorrelationService.generateSignals(
        sentiment,
        priceData,
        correlation
      );
    },
  },

  // Monitoramento de Fontes
  'sentiment:monitor_social': {
    handler: async (input: { symbol: string; platform: 'twitter' | 'reddit' }) => {
      if (input.platform === 'twitter' && twitterService) {
        return await twitterService.searchCryptoTweets(input.symbol);
      } else if (input.platform === 'reddit' && redditService) {
        return await redditService.searchCrypto(input.symbol);
      }
      return [];
    },
  },

  'sentiment:fetch_news': {
    handler: async (input: { symbol?: string; source?: string }) => {
      if (input.source === 'cryptopanic' && cryptoPanicService) {
        return input.symbol
          ? await cryptoPanicService.fetchForCurrency(input.symbol)
          : await cryptoPanicService.fetchRecent();
      } else if (rssFeedsService) {
        const articles = await rssFeedsService.fetchAllFeeds();
        return input.symbol
          ? articles.filter(a => a.symbols.includes(input.symbol))
          : articles;
      }
      return [];
    },
  },

  // Alertas e Notificações
  'sentiment:check_alerts': {
    handler: async (input: { symbol: string }) => {
      const sentiment = await getAggregatedSentiment(input.symbol);
      const alerts = [];

      // Sentimento extremo
      if (sentiment.score > 80) {
        alerts.push({
          type: 'extreme_bullish',
          severity: 'high',
          message: `Extreme bullish sentiment for ${input.symbol}: ${sentiment.score}`,
        });
      } else if (sentiment.score < -80) {
        alerts.push({
          type: 'extreme_bearish',
          severity: 'high',
          message: `Extreme bearish sentiment for ${input.symbol}: ${sentiment.score}`,
        });
      }

      // Mudança rápida
      if (Math.abs(sentiment.change) > 30) {
        alerts.push({
          type: 'rapid_change',
          severity: 'medium',
          message: `Rapid sentiment change for ${input.symbol}: ${sentiment.change}`,
        });
      }

      return alerts;
    },
  },

  // Relatórios
  'sentiment:generate_report': {
    handler: async (input: { symbol?: string; period: 'daily' | 'weekly' | 'monthly' }) => {
      const symbols = input.symbol ? [input.symbol] : ['BTC', 'ETH', 'BNB'];
      const reports = [];

      for (const symbol of symbols) {
        const sentiment = await getAggregatedSentiment(symbol);
        const trending = trendingTopicsService.getTrendingForSymbol(symbol);
        const correlation = await getCorrelation(symbol);
        const signals = await generateSignals(symbol);

        reports.push({
          symbol,
          sentiment,
          trending: trending.slice(0, 5),
          correlation,
          signals,
          generatedAt: new Date(),
        });
      }

      return {
        period: input.period,
        reports,
        summary: generateSummary(reports),
      };
    },
  },
};
```

---

### 2. **Workflows Autônomos**

Criar workflows que o agente Marketing executa automaticamente:

#### **Workflow 1: Monitoramento Contínuo de Sentimento**

```typescript
export const SentimentMonitoringWorkflow = {
  name: 'Sentiment Monitoring',
  description: 'Continuously monitor sentiment for key symbols',
  schedule: '*/15 * * * *', // A cada 15 minutos

  async execute(agentId: string, tenantId: string) {
    const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'];
    const alerts = [];

    for (const symbol of symbols) {
      // Obter sentimento agregado
      const sentiment = await AgentService.executeAction(agentId, tenantId, {
        actionType: 'sentiment',
        actionName: 'sentiment:get_aggregated',
        input: { symbol },
      });

      // Verificar alertas
      const symbolAlerts = await AgentService.executeAction(agentId, tenantId, {
        actionType: 'sentiment',
        actionName: 'sentiment:check_alerts',
        input: { symbol },
      });

      if (symbolAlerts.output.length > 0) {
        alerts.push(...symbolAlerts.output);
      }
    }

    // Se houver alertas críticos, notificar CEO
    if (alerts.some(a => a.severity === 'high')) {
      await AgentService.sendCommunication(tenantId, {
        fromAgentId: agentId,
        toAgentId: ceoAgentId,
        message: `ALERT: ${alerts.length} sentiment alerts detected`,
        priority: 'high',
        metadata: { alerts },
      });
    }

    return { alertsCount: alerts.length, alerts };
  },
};
```

#### **Workflow 2: Relatório Diário de Sentimento**

```typescript
export const DailySentimentReportWorkflow = {
  name: 'Daily Sentiment Report',
  description: 'Generate daily sentiment report and send to CEO',
  schedule: '0 9 * * *', // Todo dia às 9h

  async execute(agentId: string, tenantId: string) {
    // Gerar relatório
    const report = await AgentService.executeAction(agentId, tenantId, {
      actionType: 'sentiment',
      actionName: 'sentiment:generate_report',
      input: { period: 'daily' },
    });

    // Criar análise com AI
    const prompt = `Analyze this daily sentiment report and provide strategic insights:

${JSON.stringify(report.output, null, 2)}

Provide:
1. Key market sentiment trends
2. Opportunities based on sentiment
3. Risks and warnings
4. Recommended actions for trading team`;

    const analysis = await AgentService.query(agentId, tenantId, {
      prompt,
      includeHistory: false,
    });

    // Enviar para CEO
    await AgentService.sendCommunication(tenantId, {
      fromAgentId: agentId,
      toAgentId: ceoAgentId,
      message: `Daily Sentiment Report`,
      priority: 'normal',
      metadata: {
        report: report.output,
        analysis: analysis.response,
      },
    });

    return { report: report.output, analysis: analysis.response };
  },
};
```

#### **Workflow 3: Detecção de Oportunidades de Trading**

```typescript
export const TradingOpportunitiesWorkflow = {
  name: 'Trading Opportunities Detection',
  description: 'Detect trading opportunities based on sentiment + price correlation',
  schedule: '*/30 * * * *', // A cada 30 minutos

  async execute(agentId: string, tenantId: string) {
    const symbols = ['BTC', 'ETH', 'BNB', 'SOL'];
    const opportunities = [];

    for (const symbol of symbols) {
      // Obter sinais de trading
      const signals = await AgentService.executeAction(agentId, tenantId, {
        actionType: 'sentiment',
        actionName: 'sentiment:generate_signals',
        input: { symbol },
      });

      // Detectar divergências
      const divergences = await AgentService.executeAction(agentId, tenantId, {
        actionType: 'sentiment',
        actionName: 'sentiment:detect_divergences',
        input: { symbol },
      });

      // Se houver sinal forte ou divergência, adicionar oportunidade
      if (signals.output.signal === 'strong_buy' || signals.output.signal === 'strong_sell') {
        opportunities.push({
          symbol,
          signal: signals.output,
          divergences: divergences.output,
        });
      }
    }

    // Se houver oportunidades, notificar Trading Ops Agent
    if (opportunities.length > 0) {
      await AgentService.sendCommunication(tenantId, {
        fromAgentId: agentId,
        toAgentId: tradingOpsAgentId,
        message: `Found ${opportunities.length} trading opportunities based on sentiment analysis`,
        priority: 'high',
        metadata: { opportunities },
      });
    }

    return { opportunitiesCount: opportunities.length, opportunities };
  },
};
```

#### **Workflow 4: Análise de Trending Topics**

```typescript
export const TrendingAnalysisWorkflow = {
  name: 'Trending Topics Analysis',
  description: 'Analyze trending topics and identify emerging narratives',
  schedule: '0 */2 * * *', // A cada 2 horas

  async execute(agentId: string, tenantId: string) {
    // Obter trending topics
    const trending = await AgentService.executeAction(agentId, tenantId, {
      actionType: 'sentiment',
      actionName: 'sentiment:get_trending',
      input: { limit: 20 },
    });

    // Agrupar por tipo de trend (emerging, peak, declining)
    const emergingTrends = trending.output.filter(t => t.trendType === 'emerging');
    const peakTrends = trending.output.filter(t => t.trendType === 'peak');
    const decliningTrends = trending.output.filter(t => t.trendType === 'declining');

    // Analisar com AI
    const prompt = `Analyze these trending topics in crypto social media:

EMERGING TRENDS (New & Growing):
${emergingTrends.map(t => `- ${t.topic} (${t.mentions} mentions, velocity: ${t.velocity})`).join('\n')}

PEAK TRENDS (High Activity):
${peakTrends.map(t => `- ${t.topic} (${t.mentions} mentions)`).join('\n')}

DECLINING TRENDS (Fading):
${decliningTrends.map(t => `- ${t.topic} (${t.mentions} mentions)`).join('\n')}

Provide:
1. What narratives are emerging?
2. Which trends are most likely to impact prices?
3. Any red flags or warnings?
4. Recommended content strategy`;

    const analysis = await AgentService.query(agentId, tenantId, {
      prompt,
      includeHistory: false,
    });

    // Enviar análise para CEO e Sales (para social trading)
    await AgentService.sendCommunication(tenantId, {
      fromAgentId: agentId,
      toAgentId: ceoAgentId,
      message: 'Trending Topics Analysis',
      priority: 'normal',
      metadata: {
        emergingCount: emergingTrends.length,
        peakCount: peakTrends.length,
        decliningCount: decliningTrends.length,
        analysis: analysis.response,
      },
    });

    return {
      trending: trending.output,
      analysis: analysis.response,
    };
  },
};
```

---

### 3. **Service de Integração**

Criar um serviço dedicado para integração:

```typescript
// src/modules/sentiment/services/integration/sentiment-agent.integration.ts

export class SentimentAgentIntegration {
  /**
   * Registrar todas as ações de sentiment no agente Marketing
   */
  static async registerActions(agentId: string, tenantId: string) {
    for (const [actionName, action] of Object.entries(SentimentAgentActions)) {
      await AgentService.registerAction(agentId, tenantId, {
        actionName,
        description: action.description,
        handler: action.handler,
      });
    }
  }

  /**
   * Iniciar workflows autônomos
   */
  static async startWorkflows(agentId: string, tenantId: string) {
    const workflows = [
      SentimentMonitoringWorkflow,
      DailySentimentReportWorkflow,
      TradingOpportunitiesWorkflow,
      TrendingAnalysisWorkflow,
    ];

    for (const workflow of workflows) {
      await WorkflowService.schedule(agentId, tenantId, workflow);
    }
  }

  /**
   * Processar eventos de sentiment em tempo real
   */
  static async handleSentimentEvent(
    agentId: string,
    tenantId: string,
    event: {
      type: 'sentiment_update' | 'trending_update' | 'news_update' | 'signal_update';
      data: any;
    }
  ) {
    // Processar evento com AI
    const prompt = `New ${event.type} received:

${JSON.stringify(event.data, null, 2)}

Should I take any action? Consider:
1. Is this significant enough to alert CEO or Trading Ops?
2. Does this represent a trading opportunity?
3. Should I adjust marketing strategy?
4. Any risks to be aware of?`;

    const analysis = await AgentService.query(agentId, tenantId, {
      prompt,
      includeHistory: true,
      maxHistoryMessages: 5,
    });

    // Se a AI recomendar ação, executar
    if (analysis.response.toLowerCase().includes('yes') ||
        analysis.response.toLowerCase().includes('should')) {
      // Executar ação recomendada
      await this.executeRecommendedAction(agentId, tenantId, analysis.response);
    }

    return analysis;
  }

  /**
   * Executar ação recomendada pela AI
   */
  private static async executeRecommendedAction(
    agentId: string,
    tenantId: string,
    recommendation: string
  ) {
    // Parse recomendação e executar ação apropriada
    // Implementação dependeria do formato da resposta da AI
  }
}
```

---

### 4. **Integração com WebSocket**

Conectar o WebSocket de Sentiment com o agente:

```typescript
// Modificar websocket-streaming.service.ts para notificar o agente

private broadcastToChannel(channel: string, message: WSMessage): void {
  // ... código existente ...

  // Notificar agente Marketing sobre eventos importantes
  if (this.shouldNotifyAgent(message)) {
    this.notifyMarketingAgent(message);
  }
}

private shouldNotifyAgent(message: WSMessage): boolean {
  // Notificar apenas eventos significativos
  return (
    message.type === 'sentiment_update' && Math.abs(message.data.score) > 70 ||
    message.type === 'signal_update' && ['strong_buy', 'strong_sell'].includes(message.data.signal) ||
    message.type === 'trending_update' && message.data.some(t => t.trendType === 'emerging')
  );
}

private async notifyMarketingAgent(message: WSMessage): Promise<void> {
  try {
    const marketingAgent = await AgentService.getMarketingAgent(tenantId);

    if (marketingAgent) {
      await SentimentAgentIntegration.handleSentimentEvent(
        marketingAgent.id,
        tenantId,
        {
          type: message.type,
          data: message.data,
        }
      );
    }
  } catch (error) {
    logger.error('Failed to notify marketing agent:', error);
  }
}
```

---

## 📊 Benefícios da Integração

### **1. Automação Inteligente**
- Agente Marketing monitora sentimento 24/7
- Detecta oportunidades e riscos automaticamente
- Envia alertas para outros agentes (CEO, Trading Ops)

### **2. Análise Contextual**
- AI analisa dados de sentimento com contexto histórico
- Identifica padrões e tendências emergentes
- Fornece insights acionáveis

### **3. Comunicação Inter-Agentes**
- Marketing → CEO: Alertas e relatórios
- Marketing → Trading Ops: Oportunidades de trading
- Marketing → Sales: Insights para social trading

### **4. Decisões Autônomas**
- Agente pode ajustar estratégias de marketing automaticamente
- Responde a mudanças de sentimento em tempo real
- Otimiza campanhas baseado em sentiment

### **5. Escalabilidade**
- Workflows podem ser facilmente adicionados
- Ações customizadas por tenant
- Integração com outros módulos via agentes

---

## 🔧 Implementação Recomendada

### **Fase 1: Ações Básicas (1-2 dias)**
1. Criar `sentiment-agent.actions.ts` com ações básicas
2. Registrar ações no agente Marketing
3. Testar execução manual de ações

### **Fase 2: Workflows Simples (2-3 dias)**
4. Implementar workflow de monitoramento
5. Implementar workflow de relatório diário
6. Testar agendamento automático

### **Fase 3: Workflows Avançados (3-4 dias)**
7. Implementar detecção de oportunidades
8. Implementar análise de trending
9. Integrar com WebSocket para eventos em tempo real

### **Fase 4: Refinamento (2-3 dias)**
10. Otimizar prompts de AI
11. Ajustar limites de alertas
12. Implementar dashboard de agente

---

## 🎯 Próximos Passos

1. **Aprovar proposta de integração**
2. **Priorizar workflows a implementar**
3. **Definir thresholds para alertas**
4. **Configurar agente Marketing para tenant**
5. **Implementar fase 1**

---

## 📝 Conclusão

A integração do **Sentiment Module** com o **Agents Module** é:
- ✅ **Tecnicamente viável** - Arquitetura já preparada
- ✅ **Estrategicamente valiosa** - Automação inteligente de análise
- ✅ **Escalável** - Fácil adicionar novos workflows
- ✅ **Modular** - Não quebra sistemas existentes

**Recomendação**: Implementar integração completa em 4 fases (10-12 dias de desenvolvimento).
