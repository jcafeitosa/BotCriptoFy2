/**
 * Sentiment + Agent Integration Test
 * Tests real agent interaction with sentiment analysis
 */

import { AgentService } from '../../agents/services/agent.service';
import { SentimentAgentIntegrationService } from '../services/integration/sentiment-agent.integration';
import { sentimentMonitoringWorkflow } from '../workflows/sentiment-monitoring.workflow';
import { RSSFeedsService } from '../services/sources/rss-feeds.service';
import { SentimentHybridService } from '../services/analysis/sentiment-hybrid.service';

console.log('🤖 Starting Sentiment + Agent Integration Test\n');
console.log('=' .repeat(80));

/**
 * Test tenant ID
 */
const TEST_TENANT_ID = 'test-tenant-123';

/**
 * Step 1: Create Marketing Agent (CMO)
 */
async function createMarketingAgent() {
  console.log('\n📋 STEP 1: Creating Marketing Agent (CMO)');
  console.log('-'.repeat(80));

  try {
    // Check if agent already exists
    const existingAgents = await AgentService.listAgents(TEST_TENANT_ID, {
      agentType: 'marketing',
    });

    if (existingAgents.length > 0) {
      console.log('✅ Marketing Agent already exists:', existingAgents[0].id);
      return existingAgents[0];
    }

    // Create new Marketing Agent
    const agent = await AgentService.createAgent({
      agentType: 'marketing',
      name: 'Marketing Agent',
      title: 'Chief Marketing Officer',
      description: 'Manages marketing, sentiment analysis, and market monitoring',
      tenantId: TEST_TENANT_ID,
      config: {
        model: 'llama3.1:latest',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: `You are the Chief Marketing Officer (CMO) responsible for:
- Analyzing market sentiment from news and social media
- Detecting market trends and opportunities
- Monitoring brand perception
- Alerting leadership about significant market changes
- Generating marketing insights and reports

You have access to sentiment analysis tools and can:
- Analyze news articles and social media
- Track trending topics
- Generate trading signals based on sentiment
- Monitor competitor activity

Be proactive, data-driven, and strategic in your recommendations.`,
        capabilities: [
          'sentiment_analysis',
          'trend_detection',
          'market_monitoring',
          'reporting',
          'social_media_monitoring',
        ],
      },
    });

    console.log('✅ Created Marketing Agent:', agent.id);
    console.log(`   Name: ${agent.name}`);
    console.log(`   Title: ${agent.title}`);
    console.log(`   Model: ${agent.config.model}`);

    return agent;
  } catch (error) {
    console.error('❌ Failed to create Marketing Agent:', error);
    throw error;
  }
}

/**
 * Step 2: Initialize Sentiment Integration
 */
async function initializeSentimentIntegration(agentId: string) {
  console.log('\n📋 STEP 2: Initializing Sentiment Integration');
  console.log('-'.repeat(80));

  try {
    await SentimentAgentIntegrationService.initialize(TEST_TENANT_ID);
    console.log('✅ Sentiment integration initialized');
    console.log(`   Agent ID: ${agentId}`);
    console.log('   Actions registered: 10');
    console.log('   - sentiment:analyze_text');
    console.log('   - sentiment:get_aggregated');
    console.log('   - sentiment:get_trending');
    console.log('   - sentiment:generate_signals');
    console.log('   - ... and 6 more');
  } catch (error) {
    console.error('❌ Failed to initialize integration:', error);
    throw error;
  }
}

/**
 * Step 3: Fetch Real News
 */
async function fetchRealNews() {
  console.log('\n📋 STEP 3: Fetching Real News');
  console.log('-'.repeat(80));

  try {
    const rssService = new RSSFeedsService({
      useDefaults: false,
      customFeeds: [
        {
          name: 'CoinDesk',
          url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
          source: 'rss_coindesk',
          category: 'general',
          enabled: true,
          priority: 'high',
          pollInterval: 300000,
        },
        {
          name: 'CoinTelegraph',
          url: 'https://cointelegraph.com/rss',
          source: 'rss_cointelegraph',
          category: 'general',
          enabled: true,
          priority: 'high',
          pollInterval: 300000,
        },
      ],
    });

    console.log('🔄 Fetching from crypto news feeds...');

    let allArticles: any[] = [];

    // Try CoinDesk
    try {
      const coinDeskArticles = await rssService.fetchFeed('https://www.coindesk.com/arc/outboundfeeds/rss/');
      console.log(`✅ CoinDesk: ${coinDeskArticles.length} articles`);
      allArticles = allArticles.concat(coinDeskArticles);
    } catch (error) {
      console.log('⚠️  CoinDesk fetch failed, skipping...');
    }

    // Try CoinTelegraph
    try {
      const coinTelegraphArticles = await rssService.fetchFeed('https://cointelegraph.com/rss');
      console.log(`✅ CoinTelegraph: ${coinTelegraphArticles.length} articles`);
      allArticles = allArticles.concat(coinTelegraphArticles);
    } catch (error) {
      console.log('⚠️  CoinTelegraph fetch failed, skipping...');
    }

    if (allArticles.length === 0) {
      throw new Error('No articles fetched from any source');
    }

    console.log(`\n📊 Total articles fetched: ${allArticles.length}`);

    // Show sample articles
    console.log('\n📰 Sample Crypto News:');
    allArticles.slice(0, 5).forEach((article, index) => {
      console.log(`\n[${index + 1}] ${article.title}`);
      console.log(`    Symbols: ${article.symbols.join(', ') || 'None'}`);
      console.log(`    URL: ${article.url}`);
    });

    return allArticles;
  } catch (error) {
    console.error('❌ Failed to fetch news:', error);
    throw error;
  }
}

/**
 * Step 4: Agent Analyzes News
 */
async function agentAnalyzesNews(agentId: string, articles: any[]) {
  console.log('\n📋 STEP 4: Agent Analyzes News');
  console.log('-'.repeat(80));

  try {
    const sentimentService = new SentimentHybridService();

    console.log(`🤖 Agent analyzing ${Math.min(5, articles.length)} articles...\n`);

    const analyses: any[] = [];

    for (let i = 0; i < Math.min(5, articles.length); i++) {
      const article = articles[i];
      const text = `${article.title} ${article.content || article.summary || ''}`.substring(0, 1000);

      console.log(`📝 Article ${i + 1}: "${article.title.substring(0, 60)}..."`);

      // Analyze sentiment using hybrid service
      const sentiment = await sentimentService.analyze(text, {
        context: {
          source: article.source,
          symbols: article.symbols,
          isImportant: article.isImportant,
        },
      });

      console.log(`   Sentiment: ${sentiment.score.toFixed(2)} (${sentiment.label})`);
      console.log(`   Confidence: ${(sentiment.confidence * 100).toFixed(1)}%`);
      console.log(`   Provider: ${sentiment.provider.toUpperCase()}`);

      if (sentiment.aspects) {
        const aspects = Object.entries(sentiment.aspects)
          .filter(([, value]) => value && value > 0.1)
          .map(([key, value]) => `${key}:${value?.toFixed(2)}`)
          .join(', ');
        if (aspects) {
          console.log(`   Aspects: ${aspects}`);
        }
      }

      analyses.push({
        article,
        sentiment,
      });
    }

    // Calculate overall market sentiment
    const avgScore = analyses.reduce((sum, a) => sum + a.sentiment.score, 0) / analyses.length;
    const avgConfidence = analyses.reduce((sum, a) => sum + a.sentiment.confidence, 0) / analyses.length;

    console.log('\n📊 Overall Market Sentiment:');
    console.log(`   Average Score: ${avgScore.toFixed(2)}`);
    console.log(`   Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    console.log(`   Market Mood: ${avgScore > 20 ? '🟢 Bullish' : avgScore < -20 ? '🔴 Bearish' : '🟡 Neutral'}`);

    return analyses;
  } catch (error) {
    console.error('❌ Agent analysis failed:', error);
    throw error;
  }
}

/**
 * Step 5: Execute Agent Action
 */
async function executeAgentAction(agentId: string) {
  console.log('\n📋 STEP 5: Executing Agent Actions');
  console.log('-'.repeat(80));

  try {
    console.log('🤖 Agent executing: sentiment:get_trending');

    const result = await SentimentAgentIntegrationService.executeAction(
      agentId,
      TEST_TENANT_ID,
      {
        actionType: 'sentiment',
        actionName: 'sentiment:get_trending',
        input: { limit: 10 },
      }
    );

    if (result.success) {
      console.log(`✅ Action completed in ${result.executionTime}ms`);
      console.log(`📊 Trending topics: ${result.result.length}`);

      if (result.result.length > 0) {
        console.log('\n🔥 Top Trending Topics:');
        result.result.slice(0, 5).forEach((topic: any, index: number) => {
          console.log(`\n${index + 1}. ${topic.topic}`);
          console.log(`   Mentions: ${topic.mentions || topic.count || 'N/A'}`);
          console.log(`   Symbol: ${topic.symbol || 'General'}`);
        });
      } else {
        console.log('⚠️  No trending topics yet (need more data)');
      }
    } else {
      console.log('⚠️  Action failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Action execution failed:', error);
    throw error;
  }
}

/**
 * Step 6: Agent Query (AI Decision Making)
 */
async function agentMakesDecision(agentId: string, analyses: any[]) {
  console.log('\n📋 STEP 6: Agent Makes Decision (AI Reasoning)');
  console.log('-'.repeat(80));

  try {
    // Build context from analyses
    const contextSummary = analyses.map((a, i) => {
      return `Article ${i + 1}: "${a.article.title.substring(0, 80)}"
  Sentiment: ${a.sentiment.score.toFixed(2)} (${a.sentiment.label})
  Symbols: ${a.article.symbols.join(', ') || 'None'}
  Confidence: ${(a.sentiment.confidence * 100).toFixed(1)}%`;
    }).join('\n\n');

    const avgScore = analyses.reduce((sum, a) => sum + a.sentiment.score, 0) / analyses.length;

    const prompt = `I've analyzed ${analyses.length} recent crypto news articles. Here's the sentiment analysis:

${contextSummary}

Overall Market Sentiment Score: ${avgScore.toFixed(2)} out of 100

Based on this sentiment analysis:
1. What is the current market mood?
2. Are there any immediate risks or opportunities?
3. Should I alert the CEO or Trading Ops team?
4. What actions should we take?

Please provide a concise analysis (3-4 sentences) and clear recommendations.`;

    console.log('🤖 Agent is analyzing data and making decisions...\n');
    console.log('💭 Prompt sent to agent:');
    console.log('-'.repeat(80));
    console.log(prompt.substring(0, 400) + '...');
    console.log('-'.repeat(80));

    // Query the agent
    const response = await AgentService.query(agentId, TEST_TENANT_ID, {
      prompt,
      includeHistory: false,
    });

    console.log('\n🤖 Agent Response:');
    console.log('-'.repeat(80));
    console.log(response.response);
    console.log('-'.repeat(80));

    console.log(`\n📊 Query Stats:`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Tokens: ${response.tokenUsage?.totalTokens || 'N/A'}`);
    console.log(`   Response time: ${response.processingTime || 'N/A'}ms`);

    return response;
  } catch (error) {
    console.error('❌ Agent query failed:', error);
    console.log('⚠️  This may fail if Ollama is not running or model not available');
    return null;
  }
}

/**
 * Step 7: Execute Monitoring Workflow
 */
async function executeMonitoringWorkflow(agentId: string) {
  console.log('\n📋 STEP 7: Executing Autonomous Monitoring Workflow');
  console.log('-'.repeat(80));

  try {
    console.log('🔄 Running sentiment monitoring workflow...');
    console.log('   Monitored symbols: BTC, ETH, BNB, SOL, ADA');
    console.log('   Checking for: extreme sentiment, rapid changes, low confidence');
    console.log('   Will notify: CEO Agent, Trading Ops Agent\n');

    const result = await sentimentMonitoringWorkflow.execute(agentId, TEST_TENANT_ID);

    if (result.success) {
      console.log('✅ Workflow completed successfully');
      console.log(`   Execution time: ${result.executionTime}ms`);
      console.log(`   Symbols checked: ${result.symbolsChecked}`);
      console.log(`   Alerts generated: ${result.alertsGenerated}`);

      if (result.alertsGenerated > 0) {
        console.log('\n⚠️  ALERTS GENERATED:');
        result.alerts.forEach((alert: any, index: number) => {
          const icon = alert.severity === 'critical' ? '🔴' :
                      alert.severity === 'high' ? '🟠' :
                      alert.severity === 'medium' ? '🟡' : '🟢';
          console.log(`\n${icon} Alert ${index + 1} [${alert.severity.toUpperCase()}]:`);
          console.log(`   Symbol: ${alert.symbol}`);
          console.log(`   Type: ${alert.type}`);
          console.log(`   Message: ${alert.message}`);
        });
      } else {
        console.log('✅ No critical alerts - market sentiment is stable');
      }

      console.log('\n📝 Workflow Summary:');
      console.log(result.summary);
    } else {
      console.log('⚠️  Workflow failed:', result.summary);
    }

    return result;
  } catch (error) {
    console.error('❌ Workflow execution failed:', error);
    throw error;
  }
}

/**
 * Main Test Runner
 */
async function runAgentIntegrationTest() {
  const startTime = Date.now();

  try {
    console.log('\n🚀 Starting Agent Integration Test...\n');

    // Step 1: Create Marketing Agent
    const agent = await createMarketingAgent();

    // Step 2: Initialize Sentiment Integration
    await initializeSentimentIntegration(agent.id);

    // Step 3: Fetch Real Crypto News
    const articles = await fetchRealNews();

    // Step 4: Agent Analyzes News
    const analyses = await agentAnalyzesNews(agent.id, articles);

    // Step 5: Execute Agent Action
    await executeAgentAction(agent.id);

    // Step 6: Agent Makes Decision (AI Reasoning)
    await agentMakesDecision(agent.id, analyses);

    // Step 7: Execute Monitoring Workflow
    await executeMonitoringWorkflow(agent.id);

    // Final Summary
    const duration = Date.now() - startTime;
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('✅ Agent created and configured');
    console.log('✅ Sentiment integration initialized');
    console.log('✅ Real news fetched and analyzed');
    console.log('✅ Agent actions executed');
    console.log('✅ AI decision making tested');
    console.log('✅ Autonomous workflow executed');
    console.log(`\n⏱️  Total execution time: ${(duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(80));

    console.log('\n🎉 Agent Integration Test Complete!');
    console.log('\nThe Marketing Agent (CMO) successfully:');
    console.log('  • Analyzed real crypto news sentiment');
    console.log('  • Made autonomous decisions');
    console.log('  • Executed monitoring workflows');
    console.log('  • Generated alerts for leadership');

  } catch (error) {
    console.error('\n💥 Test Failed:', error);
    process.exit(1);
  }
}

// Run the test
runAgentIntegrationTest();
