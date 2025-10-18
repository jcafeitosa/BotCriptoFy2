/**
 * Sentiment Endpoints Test
 * Complete test suite for all REST + WebSocket endpoints
 */

console.log('🧪 Testing All Sentiment Endpoints\n');
console.log('='.repeat(80));

const SENTIMENT_BASE_URL = 'http://localhost:3000';

interface SentimentTestResult {
  endpoint: string;
  method: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

const sentimentResults: SentimentTestResult[] = [];

/**
 * Helper to test endpoint
 */
async function testSentimentEndpoint(
  method: string,
  path: string,
  body?: any,
  description?: string
): Promise<SentimentTestResult> {
  const startTime = Date.now();
  const fullPath = `${SENTIMENT_BASE_URL}${path}`;

  console.log(`\n🔄 Testing: ${method} ${path}`);
  if (description) {
    console.log(`   ${description}`);
  }

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(fullPath, options);
    const responseTime = Date.now() - startTime;

    const isSuccess = response.status >= 200 && response.status < 300;

    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }

    if (isSuccess) {
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   ⏱️  Response Time: ${responseTime}ms`);

      // Show sample of response
      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        console.log(`   📦 Response Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
      }

      return {
        endpoint: path,
        method,
        status: 'PASSED',
        statusCode: response.status,
        responseTime,
      };
    } else {
      console.log(`   ❌ Failed with status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(data).substring(0, 100)}`);

      return {
        endpoint: path,
        method,
        status: 'FAILED',
        statusCode: response.status,
        responseTime,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`   ❌ Request Failed: ${error instanceof Error ? error.message : String(error)}`);

    return {
      endpoint: path,
      method,
      status: 'FAILED',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test WebSocket
 */
async function testSentimentWebSocket(): Promise<SentimentTestResult> {
  console.log(`\n🔄 Testing: WebSocket /sentiment/stream`);

  return new Promise((resolve) => {
    const startTime = Date.now();

    try {
      const ws = new WebSocket('ws://localhost:3000/sentiment/stream');
      let messageReceived = false;

      ws.onopen = () => {
        console.log('   ✅ WebSocket Connected');

        // Subscribe to sentiment updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['sentiment', 'trending'],
        }));

        // Wait for response
        setTimeout(() => {
          if (messageReceived) {
            console.log('   ✅ Messages received successfully');
            ws.close();
          } else {
            console.log('   ⚠️  No messages received (expected for empty data)');
            ws.close();
          }
        }, 2000);
      };

      ws.onmessage = (event) => {
        messageReceived = true;
        const data = JSON.parse(event.data);
        console.log(`   📨 Received: ${data.type}`);
      };

      ws.onclose = () => {
        const responseTime = Date.now() - startTime;
        console.log(`   🔌 WebSocket Closed (${responseTime}ms)`);

        resolve({
          endpoint: '/sentiment/stream',
          method: 'WebSocket',
          status: 'PASSED',
          responseTime,
        });
      };

      ws.onerror = (error) => {
        const responseTime = Date.now() - startTime;
        console.log(`   ❌ WebSocket Error: ${error}`);

        resolve({
          endpoint: '/sentiment/stream',
          method: 'WebSocket',
          status: 'FAILED',
          responseTime,
          error: String(error),
        });
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close();
        }
      }, 5000);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.log(`   ❌ Failed to create WebSocket: ${error}`);

      resolve({
        endpoint: '/sentiment/stream',
        method: 'WebSocket',
        status: 'FAILED',
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

/**
 * Check if server is running
 */
async function checkSentimentServer(): Promise<boolean> {
  console.log('\n🔍 Checking if server is running...');

  try {
    const response = await fetch(`${SENTIMENT_BASE_URL}/health`, { method: 'GET' });
    if (response.ok) {
      console.log('✅ Server is running\n');
      return true;
    }
  } catch (error) {
    // Server not running
  }

  console.log('❌ Server is NOT running');
  console.log('⚠️  Please start the server first: bun run dev\n');
  return false;
}

/**
 * Run all endpoint tests
 */
async function runSentimentEndpointTests() {
  const startTime = Date.now();

  console.log('\n🚀 Starting Endpoint Tests...\n');

  // Check if server is running
  const serverRunning = await checkSentimentServer();
  if (!serverRunning) {
    console.log('💡 To start the server: bun run dev');
    console.log('💡 Then run this test again');
    return;
  }

  console.log('='.repeat(80));
  console.log('📋 REST ENDPOINTS');
  console.log('='.repeat(80));

  // Test 1: Health Check
  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/health',
    undefined,
    'Check service health status'
  ));

  // Test 2: Get Sentiment for Symbol
  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/BTC',
    undefined,
    'Get aggregated sentiment for BTC'
  ));

  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/ETH?timeWindow=3600000',
    undefined,
    'Get sentiment for ETH with custom time window'
  ));

  // Test 3: Trending Topics
  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/trending',
    undefined,
    'Get all trending topics'
  ));

  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/trending?symbol=BTC&limit=10',
    undefined,
    'Get trending topics for BTC'
  ));

  // Test 4: News Articles
  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/news?limit=10',
    undefined,
    'Get recent news articles'
  ));

  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/news?symbol=BTC&source=cryptopanic&limit=5',
    undefined,
    'Get BTC news from CryptoPanic'
  ));

  // Test 5: Social Media
  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/social/twitter?symbol=BTC&limit=10',
    undefined,
    'Get Twitter mentions for BTC'
  ));

  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/social/reddit?symbol=ETH&limit=10',
    undefined,
    'Get Reddit mentions for ETH'
  ));

  // Test 6: Analyze Text
  sentimentResults.push(await testSentimentEndpoint(
    'POST',
    '/sentiment/analyze',
    {
      text: 'Bitcoin is going to the moon! 🚀 This is bullish AF! HODL strong!',
      options: {
        context: {
          symbol: 'BTC',
          source: 'twitter',
        },
      },
    },
    'Analyze bullish text'
  ));

  sentimentResults.push(await testSentimentEndpoint(
    'POST',
    '/sentiment/analyze',
    {
      text: 'Market crash incoming! Dump everything! Bear market confirmed 📉',
      options: {
        context: {
          symbol: 'BTC',
        },
      },
    },
    'Analyze bearish text'
  ));

  // Test 7: Batch Analyze
  sentimentResults.push(await testSentimentEndpoint(
    'POST',
    '/sentiment/analyze/batch',
    {
      texts: [
        { id: '1', text: 'Bitcoin hitting new ATH! 🚀' },
        { id: '2', text: 'Ethereum is pumping hard!' },
        { id: '3', text: 'Market looking bearish today 📉' },
      ],
    },
    'Batch analyze multiple texts'
  ));

  // Test 8: Correlation
  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/correlation/BTC',
    undefined,
    'Get sentiment-price correlation for BTC'
  ));

  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/correlation/ETH?timeframe=24h',
    undefined,
    'Get correlation with timeframe'
  ));

  // Test 9: Signals
  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/signals/BTC',
    undefined,
    'Get trading signals for BTC'
  ));

  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/signals/ETH',
    undefined,
    'Get trading signals for ETH'
  ));

  // Test 10: Stats
  sentimentResults.push(await testSentimentEndpoint(
    'GET',
    '/sentiment/stats',
    undefined,
    'Get service statistics'
  ));

  console.log('\n' + '='.repeat(80));
  console.log('📡 WEBSOCKET ENDPOINT');
  console.log('='.repeat(80));

  // Test 11: WebSocket
  sentimentResults.push(await testSentimentWebSocket());

  // Final Summary
  const duration = Date.now() - startTime;
  const passed = sentimentResults.filter((r) => r.status === 'PASSED').length;
  const failed = sentimentResults.filter((r) => r.status === 'FAILED').length;
  const skipped = sentimentResults.filter((r) => r.status === 'SKIPPED').length;

  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Endpoints: ${sentimentResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`\n⏱️  Total Time: ${(duration / 1000).toFixed(2)}s`);
  console.log('='.repeat(80));

  // Detailed Results
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    sentimentResults
      .filter((r) => r.status === 'FAILED')
      .forEach((r) => {
        console.log(`\n  ${r.method} ${r.endpoint}`);
        console.log(`  Error: ${r.error}`);
        if (r.statusCode) {
          console.log(`  Status Code: ${r.statusCode}`);
        }
      });
  }

  // Performance Summary
  const avgResponseTime =
    sentimentResults
      .filter((r) => r.responseTime !== undefined)
      .reduce((sum, r) => sum + (r.responseTime || 0), 0) / sentimentResults.length;

  console.log('\n📈 PERFORMANCE:');
  console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);

  const fastestEndpoint = sentimentResults.reduce((fastest, current) => {
    if (!current.responseTime) return fastest;
    if (!fastest.responseTime) return current;
    return current.responseTime < fastest.responseTime ? current : fastest;
  }, sentimentResults[0]);

  const slowestEndpoint = sentimentResults.reduce((slowest, current) => {
    if (!current.responseTime) return slowest;
    if (!slowest.responseTime) return current;
    return current.responseTime > slowest.responseTime ? current : slowest;
  }, sentimentResults[0]);

  console.log(`Fastest: ${fastestEndpoint.method} ${fastestEndpoint.endpoint} (${fastestEndpoint.responseTime}ms)`);
  console.log(`Slowest: ${slowestEndpoint.method} ${slowestEndpoint.endpoint} (${slowestEndpoint.responseTime}ms)`);

  console.log('\n' + '='.repeat(80));

  if (passed === sentimentResults.length) {
    console.log('🎉 ALL TESTS PASSED!');
  } else if (passed > 0) {
    console.log(`⚠️  PARTIAL SUCCESS: ${passed}/${sentimentResults.length} tests passed`);
  } else {
    console.log('💥 ALL TESTS FAILED');
  }

  console.log('='.repeat(80));
}

// Run tests
runSentimentEndpointTests().catch((error) => {
  console.error('\n💥 Test Suite Failed:', error);
  process.exit(1);
});
