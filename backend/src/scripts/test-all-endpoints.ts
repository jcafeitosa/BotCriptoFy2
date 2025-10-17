#!/usr/bin/env bun
/**
 * Comprehensive Endpoint Testing Script
 * Tests all endpoints from Agents, Sentiment, and Indicators modules
 */

const BASE_URL = 'http://localhost:3000';
const TENANT_ID = 'test-tenant-endpoints';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

const results: TestResult[] = [];

// Helper function to make requests
async function testEndpoint(
  method: string,
  path: string,
  body?: any,
  skipTest = false
): Promise<TestResult> {
  const endpoint = `${method} ${path}`;

  if (skipTest) {
    return {
      endpoint,
      method,
      status: 'SKIP',
    };
  }

  const startTime = Date.now();

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const responseTime = Date.now() - startTime;

    return {
      endpoint,
      method,
      status: response.ok ? 'PASS' : 'FAIL',
      statusCode: response.status,
      responseTime,
      error: response.ok ? undefined : await response.text(),
    };
  } catch (error) {
    return {
      endpoint,
      method,
      status: 'FAIL',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Print header
console.log('\n🧪 ============================================');
console.log('   COMPREHENSIVE ENDPOINT TESTING');
console.log('   Testing all endpoints from merged PRs');
console.log('============================================\n');

// Test Health Check
console.log('📊 Testing Health Check...');
results.push(await testEndpoint('GET', '/health'));

// ==========================================
// 1. AGENTS MODULE (25+ endpoints)
// ==========================================
console.log('\n🤖 Testing Agents Module (25+ endpoints)...\n');

// 1.1 Ollama Status
console.log('  Testing Ollama integration...');
results.push(await testEndpoint('GET', '/agents/ollama/status'));

// 1.2 Create Agent
console.log('  Creating test agent...');
const createAgentResult = await testEndpoint('POST', '/agents', {
  agentType: 'ceo',
  name: 'Test CEO Agent',
  description: 'Endpoint testing agent',
  title: 'Chief Executive Officer',
  tenantId: TENANT_ID,
  config: {
    model: 'qwen3:0.6b',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: 'You are a CEO agent responsible for strategic decisions.',
    capabilities: ['strategic_planning', 'decision_making'],
  },
});
results.push(createAgentResult);

let agentId: string | undefined;
if (createAgentResult.status === 'PASS') {
  // Parse agent ID from response
  const response = await fetch(`${BASE_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentType: 'ceo',
      name: 'Test CEO Agent',
      description: 'Endpoint testing agent',
      title: 'Chief Executive Officer',
      tenantId: TENANT_ID,
      config: {
        model: 'qwen3:0.6b',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: 'You are a CEO agent.',
        capabilities: ['strategic_planning'],
      },
    }),
  });
  const data = await response.json();
  agentId = data.data?.id;
  console.log(`    ✅ Agent created with ID: ${agentId}`);
}

// 1.3 List Agents
console.log('  Testing agent listing...');
results.push(await testEndpoint('GET', `/agents?tenantId=${TENANT_ID}`));

if (agentId) {
  // 1.4 Get Agent by ID
  console.log('  Testing get agent by ID...');
  results.push(await testEndpoint('GET', `/agents/${agentId}?tenantId=${TENANT_ID}`));

  // 1.5 Update Agent
  console.log('  Testing agent update...');
  results.push(
    await testEndpoint('PATCH', `/agents/${agentId}?tenantId=${TENANT_ID}`, {
      description: 'Updated description',
    })
  );

  // 1.6 Health Check
  console.log('  Testing agent health check...');
  results.push(await testEndpoint('GET', `/agents/${agentId}/health?tenantId=${TENANT_ID}`));

  // 1.7 Query Agent (Chat)
  console.log('  Testing agent chat...');
  results.push(
    await testEndpoint('POST', `/agents/${agentId}/query?tenantId=${TENANT_ID}`, {
      prompt: 'Hello! Please respond with just "Hi" in one word.',
    })
  );

  // 1.8 Execute Action
  console.log('  Testing agent action execution...');
  results.push(
    await testEndpoint('POST', `/agents/${agentId}/action?tenantId=${TENANT_ID}`, {
      actionType: 'analysis',
      actionName: 'test_analysis',
      description: 'Test action',
      input: { test: true },
    })
  );

  // 1.9 Autonomous Task (might be slow)
  console.log('  Testing autonomous task execution (may take 5-10s)...');
  results.push(
    await testEndpoint('POST', `/agents/${agentId}/autonomous-task?tenantId=${TENANT_ID}`, {
      task: 'Say hello in one word.',
    })
  );

  // 1.10 Memory Stats
  console.log('  Testing memory statistics...');
  results.push(await testEndpoint('GET', `/agents/${agentId}/memory-stats?tenantId=${TENANT_ID}`));

  // 1.11 Delete Agent (cleanup)
  console.log('  Cleaning up test agent...');
  results.push(await testEndpoint('DELETE', `/agents/${agentId}?tenantId=${TENANT_ID}`));
}

// ==========================================
// 2. SENTIMENT MODULE (15+ endpoints)
// ==========================================
console.log('\n😊 Testing Sentiment Module (15+ endpoints)...\n');

// Check if sentiment module is active
console.log('  Checking sentiment module availability...');

// 2.1 Analyze Text Sentiment
console.log('  Testing text sentiment analysis...');
results.push(
  await testEndpoint('POST', '/sentiment/analyze', {
    text: 'Bitcoin is going to the moon! Great news for crypto!',
    language: 'en',
  })
);

// 2.2 Get Sentiment for Symbol
console.log('  Testing symbol sentiment retrieval...');
// Note: URL encode the slash in symbol (BTC/USDT -> BTC%2FUSDT)
results.push(await testEndpoint('GET', '/sentiment/BTC%2FUSDT'));

// 2.3 Multi-source Analysis
console.log('  Testing multi-source sentiment analysis...');
results.push(
  await testEndpoint('POST', '/sentiment/multi-source', {
    symbol: 'BTC/USDT',
    sources: ['local'],
    timeframe: '24h',
  })
);

// 2.4 Trending Topics
console.log('  Testing trending topics...');
results.push(
  await testEndpoint('GET', '/sentiment/trending?limit=10&timeframe=24h')
);

// 2.5 Sentiment-Price Correlation
console.log('  Testing sentiment-price correlation...');
results.push(
  await testEndpoint('POST', '/sentiment/correlation', {
    symbol: 'BTC/USDT',
    timeframe: '7d',
  })
);

// 2.6 Aggregate Sentiment
console.log('  Testing sentiment aggregation...');
results.push(
  await testEndpoint('GET', '/sentiment/aggregate?symbols=BTC/USDT,ETH/USDT&timeframe=24h')
);

// 2.7 List Sources
console.log('  Testing list sentiment sources...');
results.push(await testEndpoint('GET', '/sentiment/sources'));

// 2.8 Batch Sentiment Analysis for Multiple Symbols
console.log('  Testing batch sentiment analysis...');
results.push(
  await testEndpoint('POST', '/sentiment/batch', {
    symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],
    options: {
      timeframe: '24h',
    },
  })
);

// ==========================================
// 3. INDICATORS MODULE
// ==========================================
console.log('\n📈 Testing Indicators Module...\n');

// 3.1 List Available Indicators
console.log('  Testing list indicators...');
results.push(await testEndpoint('GET', '/indicators/list'));

// 3.2 Calculate Indicator
console.log('  Testing indicator calculation...');
results.push(
  await testEndpoint('POST', '/indicators/calculate', {
    exchangeId: 'binance',
    symbol: 'BTC/USDT',
    timeframe: '1h',
    indicatorType: 'sma',
    configuration: {
      type: 'sma',
      period: 20,
    },
    limit: 100,
    useCache: true,
  })
);

// 3.3 Batch Calculation
console.log('  Testing batch indicator calculation...');
results.push(
  await testEndpoint('POST', '/indicators/batch', {
    exchangeId: 'binance',
    symbol: 'BTC/USDT',
    timeframe: '1h',
    indicators: [
      {
        type: 'sma',
        period: 20,
      },
      {
        type: 'ema',
        period: 20,
      },
    ],
    limit: 100,
    useCache: true,
  })
);

// ==========================================
// RESULTS SUMMARY
// ==========================================
console.log('\n\n📊 ============================================');
console.log('   TEST RESULTS SUMMARY');
console.log('============================================\n');

const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
const skipped = results.filter((r) => r.status === 'SKIP').length;
const total = results.length;

console.log(`Total Tests: ${total}`);
console.log(`✅ Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
console.log(`❌ Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
console.log(`⏭️  Skipped: ${skipped} (${((skipped / total) * 100).toFixed(1)}%)`);

console.log('\n📋 Detailed Results:\n');

// Group by module
const agentResults = results.filter((r) => r.endpoint.includes('/agents'));
const sentimentResults = results.filter((r) => r.endpoint.includes('/sentiment'));
const indicatorResults = results.filter((r) => r.endpoint.includes('/indicators'));
const otherResults = results.filter(
  (r) =>
    !r.endpoint.includes('/agents') &&
    !r.endpoint.includes('/sentiment') &&
    !r.endpoint.includes('/indicators')
);

// Print by module
if (otherResults.length > 0) {
  console.log('🏥 Health & System:');
  otherResults.forEach((r) => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    const time = r.responseTime ? ` (${r.responseTime}ms)` : '';
    console.log(`  ${icon} ${r.endpoint}${time}`);
    if (r.error) console.log(`     Error: ${r.error.substring(0, 100)}`);
  });
  console.log();
}

if (agentResults.length > 0) {
  const agentPass = agentResults.filter((r) => r.status === 'PASS').length;
  console.log(`🤖 Agents Module (${agentPass}/${agentResults.length} passed):`);
  agentResults.forEach((r) => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    const time = r.responseTime ? ` (${r.responseTime}ms)` : '';
    console.log(`  ${icon} ${r.endpoint}${time}`);
    if (r.error) console.log(`     Error: ${r.error.substring(0, 100)}`);
  });
  console.log();
}

if (sentimentResults.length > 0) {
  const sentimentPass = sentimentResults.filter((r) => r.status === 'PASS').length;
  console.log(`😊 Sentiment Module (${sentimentPass}/${sentimentResults.length} passed):`);
  sentimentResults.forEach((r) => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    const time = r.responseTime ? ` (${r.responseTime}ms)` : '';
    console.log(`  ${icon} ${r.endpoint}${time}`);
    if (r.error) console.log(`     Error: ${r.error.substring(0, 100)}`);
  });
  console.log();
}

if (indicatorResults.length > 0) {
  const indicatorPass = indicatorResults.filter((r) => r.status === 'PASS').length;
  console.log(`📈 Indicators Module (${indicatorPass}/${indicatorResults.length} passed):`);
  indicatorResults.forEach((r) => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    const time = r.responseTime ? ` (${r.responseTime}ms)` : '';
    console.log(`  ${icon} ${r.endpoint}${time}`);
    if (r.error) console.log(`     Error: ${r.error.substring(0, 100)}`);
  });
  console.log();
}

// Performance stats
console.log('⚡ Performance:');
const avgResponseTime =
  results
    .filter((r) => r.responseTime)
    .reduce((sum, r) => sum + (r.responseTime || 0), 0) /
  results.filter((r) => r.responseTime).length;
const maxResponseTime = Math.max(
  ...results.filter((r) => r.responseTime).map((r) => r.responseTime || 0)
);

console.log(`  Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
console.log(`  Max Response Time: ${maxResponseTime}ms`);

console.log('\n============================================\n');

// Exit code based on results
process.exit(failed > 0 ? 1 : 0);
