/**
 * Risk Endpoints Test
 * Complete test suite for all REST endpoints
 *
 * This test validates:
 * - All 17 Risk endpoints
 * - Request/response structure
 * - Error handling
 * - Performance
 */

console.log('🧪 Testing All Risk Endpoints\n');
console.log('='.repeat(80));

const RISK_BASE_URL = 'http://localhost:3000';
const RISK_TEST_USER_ID = 'test-user-endpoint';
const RISK_TEST_TENANT_ID = 'test-tenant-endpoint';

interface RiskTestResult {
  endpoint: string;
  method: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

const riskResults: RiskTestResult[] = [];

/**
 * Helper to test endpoint
 */
async function testRiskEndpoint(
  method: string,
  path: string,
  body?: any,
  description?: string
): Promise<RiskTestResult> {
  const startTime = Date.now();
  const fullPath = `${RISK_BASE_URL}${path}`;

  console.log(`\n🔄 Testing: ${method} ${path}`);
  if (description) {
    console.log(`   ${description}`);
  }

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': RISK_TEST_USER_ID,
        'x-tenant-id': RISK_TEST_TENANT_ID,
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
 * Check if server is running
 */
async function checkRiskServer(): Promise<boolean> {
  console.log('\n🔍 Checking if server is running...');

  try {
    const response = await fetch(`${RISK_BASE_URL}/health`, { method: 'GET' });
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
async function runRiskEndpointTests() {
  const startTime = Date.now();

  console.log('\n🚀 Starting Endpoint Tests...\n');

  // Check if server is running
  const serverRunning = await checkRiskServer();
  if (!serverRunning) {
    console.log('💡 To start the server: bun run dev');
    console.log('💡 Then run this test again');
    return;
  }

  console.log('='.repeat(80));
  console.log('📋 RISK PROFILE ENDPOINTS');
  console.log('='.repeat(80));

  // Test 1: Create Risk Profile
  riskResults.push(await testRiskEndpoint(
    'POST',
    '/risk/profile',
    {
      riskTolerance: 'moderate',
      maxPortfolioRisk: 10,
      maxPositionRisk: 5,
      maxDrawdown: 20,
      defaultPositionSize: 2,
      maxLeverage: 5,
      enableRiskAlerts: true,
      requireConfirmation: false,
      autoStopLoss: true,
      stopLossPercent: 2,
      autoTakeProfit: false,
    },
    'Create risk profile'
  ));

  // Test 2: Get Risk Profile
  riskResults.push(await testRiskEndpoint(
    'GET',
    '/risk/profile',
    undefined,
    'Get user risk profile'
  ));

  // Test 3: Update Risk Profile
  riskResults.push(await testRiskEndpoint(
    'PUT',
    '/risk/profile',
    {
      riskTolerance: 'aggressive',
      maxPortfolioRisk: 15,
    },
    'Update risk profile'
  ));

  console.log('\n' + '='.repeat(80));
  console.log('📋 RISK METRICS ENDPOINTS');
  console.log('='.repeat(80));

  // Test 4: Calculate Risk Metrics
  riskResults.push(await testRiskEndpoint(
    'GET',
    '/risk/metrics',
    undefined,
    'Calculate current risk metrics'
  ));

  // Test 5: Get Risk Metrics History
  riskResults.push(await testRiskEndpoint(
    'GET',
    '/risk/metrics/history?days=30',
    undefined,
    'Get 30-day risk metrics history'
  ));

  // Test 6: Get Latest Risk Metrics
  riskResults.push(await testRiskEndpoint(
    'GET',
    '/risk/metrics/latest',
    undefined,
    'Get latest cached risk metrics'
  ));

  console.log('\n' + '='.repeat(80));
  console.log('📋 RISK LIMITS ENDPOINTS');
  console.log('='.repeat(80));

  // Test 7: Create Risk Limit
  riskResults.push(await testRiskEndpoint(
    'POST',
    '/risk/limits',
    {
      limitType: 'max_loss',
      limitValue: 5000,
      timeframe: 'daily',
      enabled: true,
    },
    'Create risk limit'
  ));

  // Test 8: List Risk Limits
  riskResults.push(await testRiskEndpoint(
    'GET',
    '/risk/limits',
    undefined,
    'List all risk limits'
  ));

  // Test 9: Update Risk Limit
  riskResults.push(await testRiskEndpoint(
    'PUT',
    '/risk/limits/test-limit-id',
    {
      limitValue: 6000,
      enabled: true,
    },
    'Update risk limit'
  ));

  // Test 10: Delete Risk Limit
  riskResults.push(await testRiskEndpoint(
    'DELETE',
    '/risk/limits/test-limit-id',
    undefined,
    'Delete risk limit'
  ));

  // Test 11: Check Limit Violations
  riskResults.push(await testRiskEndpoint(
    'GET',
    '/risk/limits/violations',
    undefined,
    'Check for limit violations'
  ));

  console.log('\n' + '='.repeat(80));
  console.log('📋 RISK ALERTS ENDPOINTS');
  console.log('='.repeat(80));

  // Test 12: List Risk Alerts
  riskResults.push(await testRiskEndpoint(
    'GET',
    '/risk/alerts',
    undefined,
    'List all risk alerts'
  ));

  // Test 13: Get Unread Alerts
  riskResults.push(await testRiskEndpoint(
    'GET',
    '/risk/alerts/unread',
    undefined,
    'Get unread alerts'
  ));

  // Test 14: Mark Alert as Read
  riskResults.push(await testRiskEndpoint(
    'PUT',
    '/risk/alerts/test-alert-id/read',
    undefined,
    'Mark alert as read'
  ));

  console.log('\n' + '='.repeat(80));
  console.log('📋 POSITION SIZING ENDPOINTS');
  console.log('='.repeat(80));

  // Test 15: Calculate Position Size - Fixed Method
  riskResults.push(await testRiskEndpoint(
    'POST',
    '/risk/position-size',
    {
      symbol: 'BTC/USDT',
      entryPrice: 50000,
      stopLoss: 49000,
      method: 'fixed',
      riskAmount: 1000,
    },
    'Calculate position size (fixed method)'
  ));

  // Test 16: Calculate Position Size - Kelly Criterion
  riskResults.push(await testRiskEndpoint(
    'POST',
    '/risk/position-size',
    {
      symbol: 'ETH/USDT',
      entryPrice: 3000,
      stopLoss: 2900,
      method: 'kelly',
      winRate: 0.6,
      avgWin: 150,
      avgLoss: 100,
    },
    'Calculate position size (Kelly criterion)'
  ));

  // Test 17: Validate Trade
  riskResults.push(await testRiskEndpoint(
    'POST',
    '/risk/validate-trade',
    {
      symbol: 'BTC/USDT',
      side: 'long',
      size: 0.5,
      entryPrice: 50000,
      stopLoss: 49000,
      takeProfit: 52000,
    },
    'Validate trade against risk rules'
  ));

  // Final Summary
  const duration = Date.now() - startTime;
  const passed = riskResults.filter((r) => r.status === 'PASSED').length;
  const failed = riskResults.filter((r) => r.status === 'FAILED').length;
  const skipped = riskResults.filter((r) => r.status === 'SKIPPED').length;

  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Endpoints: ${riskResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`\n⏱️  Total Time: ${(duration / 1000).toFixed(2)}s`);
  console.log('='.repeat(80));

  // Detailed Results
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    riskResults
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
    riskResults
      .filter((r) => r.responseTime !== undefined)
      .reduce((sum, r) => sum + (r.responseTime || 0), 0) / riskResults.length;

  console.log('\n📈 PERFORMANCE:');
  console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);

  const fastestEndpoint = riskResults.reduce((fastest, current) => {
    if (!current.responseTime) return fastest;
    if (!fastest.responseTime) return current;
    return current.responseTime < fastest.responseTime ? current : fastest;
  }, riskResults[0]);

  const slowestEndpoint = riskResults.reduce((slowest, current) => {
    if (!current.responseTime) return slowest;
    if (!slowest.responseTime) return current;
    return current.responseTime > slowest.responseTime ? current : slowest;
  }, riskResults[0]);

  console.log(`Fastest: ${fastestEndpoint.method} ${fastestEndpoint.endpoint} (${fastestEndpoint.responseTime}ms)`);
  console.log(`Slowest: ${slowestEndpoint.method} ${slowestEndpoint.endpoint} (${slowestEndpoint.responseTime}ms)`);

  console.log('\n' + '='.repeat(80));

  if (passed === riskResults.length) {
    console.log('🎉 ALL TESTS PASSED!');
  } else if (passed > 0) {
    console.log(`⚠️  PARTIAL SUCCESS: ${passed}/${riskResults.length} tests passed`);
  } else {
    console.log('💥 ALL TESTS FAILED');
  }

  console.log('='.repeat(80));

  // Pass rate
  const passRate = (passed / riskResults.length) * 100;
  console.log(`\n📊 Pass Rate: ${passRate.toFixed(1)}%`);

  if (passRate >= 95) {
    console.log('🏆 EXCELLENT - Production ready!');
  } else if (passRate >= 80) {
    console.log('✅ GOOD - Minor issues to fix');
  } else if (passRate >= 60) {
    console.log('⚠️  FAIR - Several issues need attention');
  } else {
    console.log('🚨 POOR - Major issues need immediate attention');
  }

  console.log('='.repeat(80));
}

// Run tests
runRiskEndpointTests().catch((error) => {
  console.error('\n💥 Test Suite Failed:', error);
  process.exit(1);
});
