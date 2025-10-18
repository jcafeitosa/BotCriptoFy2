#!/usr/bin/env bun

/**
 * Test All Endpoints by Module Alphabetically
 * Tests each module's endpoints in alphabetical order
 */

const BASE_URL = 'http://localhost:3000';
const SWAGGER_URL = `${BASE_URL}/swagger/json`;

interface TestResult {
  module: string;
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  error?: string;
}

interface ModuleResults {
  module: string;
  total: number;
  passed: number;
  failed: number;
  avgTime: number;
  results: TestResult[];
}

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Extract module name from path
 */
function getModuleFromPath(path: string): string {
  // Remove leading slash and split by /
  const parts = path.replace(/^\//, '').split('/');

  // Handle different path patterns
  if (parts[0] === 'api' && parts[1] === 'v1') {
    return parts[2] || 'root'; // /api/v1/module/...
  }

  return parts[0] || 'root'; // /module/...
}

/**
 * Test a single endpoint
 */
async function testEndpoint(
  path: string,
  method: string,
  module: string
): Promise<TestResult> {
  // Replace path parameters with test values
  const testPath = path
    .replace(/{id}/g, 'test-id-123')
    .replace(/{userId}/g, 'test-user-456')
    .replace(/{tenantId}/g, 'test-tenant-789')
    .replace(/{agentId}/g, 'test-agent-abc')
    .replace(/{symbol}/g, 'BTC')
    .replace(/{exchangeId}/g, 'binance')
    .replace(/{orderId}/g, 'order-123')
    .replace(/{positionId}/g, 'position-456')
    .replace(/{strategyId}/g, 'strategy-789')
    .replace(/{botId}/g, 'bot-abc')
    .replace(/{backtestId}/g, 'backtest-def')
    .replace(/{slug}/g, 'free')
    .replace(/{slug1}/g, 'free')
    .replace(/{slug2}/g, 'pro')
    .replace(/{platform}/g, 'twitter')
    .replace(/{timeframe}/g, '1h')
    .replace(/{planId}/g, 'plan-123')
    .replace(/{planId1}/g, 'plan-123')
    .replace(/{planId2}/g, 'plan-456');

  const url = `${BASE_URL}${testPath}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(method)
        ? JSON.stringify({})
        : undefined,
    });

    const responseTime = Date.now() - startTime;

    // Consider 401 as success (authentication required)
    // Consider 404 as success for test IDs (not found is expected)
    // Consider 422 as success (validation error is expected for empty bodies)
    const success =
      (response.status >= 200 && response.status < 300) ||
      response.status === 401 ||
      response.status === 404 ||
      response.status === 422;

    return {
      module,
      endpoint: path,
      method,
      status: response.status,
      success,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      module,
      endpoint: path,
      method,
      status: 0,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main test function
 */
async function main() {
  console.log(`${colors.blue}============================================================${colors.reset}`);
  console.log(`${colors.blue}  Testing All Endpoints by Module (Alphabetically)${colors.reset}`);
  console.log(`${colors.blue}============================================================${colors.reset}`);
  console.log();

  // Fetch Swagger spec
  console.log('Fetching Swagger specification...');
  const swaggerResponse = await fetch(SWAGGER_URL);
  const swagger = await swaggerResponse.json();

  // Group endpoints by module
  const moduleMap = new Map<string, Array<{ path: string; method: string }>>();

  for (const [path, methods] of Object.entries(swagger.paths || {})) {
    const module = getModuleFromPath(path);

    if (!moduleMap.has(module)) {
      moduleMap.set(module, []);
    }

    for (const method of Object.keys(methods as any)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
        moduleMap.get(module)!.push({ path, method: method.toUpperCase() });
      }
    }
  }

  // Sort modules alphabetically
  const sortedModules = Array.from(moduleMap.keys()).sort();

  console.log(`Found ${sortedModules.length} modules with ${Array.from(moduleMap.values()).reduce((sum, arr) => sum + arr.length, 0)} total endpoints`);
  console.log();

  const allResults: ModuleResults[] = [];
  let totalEndpoints = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTime = 0;

  // Test each module
  for (const module of sortedModules) {
    const endpoints = moduleMap.get(module) || [];

    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}📦 Module: ${module.toUpperCase()} (${endpoints.length} endpoints)${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    const moduleResults: TestResult[] = [];
    let modulePassed = 0;
    let moduleFailed = 0;
    let moduleTime = 0;

    // Sort endpoints by path and method
    endpoints.sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });

    // Test each endpoint
    for (const { path, method } of endpoints) {
      const result = await testEndpoint(path, method, module);
      moduleResults.push(result);

      if (result.success) {
        modulePassed++;
        console.log(
          `${colors.green}✓${colors.reset} ${method.padEnd(7)} ${path.padEnd(60)} ${result.status} (${result.responseTime}ms)`
        );
      } else {
        moduleFailed++;
        console.log(
          `${colors.red}✗${colors.reset} ${method.padEnd(7)} ${path.padEnd(60)} ${result.status} (${result.responseTime}ms)`
        );
        if (result.error) {
          console.log(`  ${colors.red}Error: ${result.error}${colors.reset}`);
        }
      }

      moduleTime += result.responseTime;
      totalTime += result.responseTime;
    }

    const avgTime = endpoints.length > 0 ? Math.round(moduleTime / endpoints.length) : 0;

    allResults.push({
      module,
      total: endpoints.length,
      passed: modulePassed,
      failed: moduleFailed,
      avgTime,
      results: moduleResults,
    });

    totalEndpoints += endpoints.length;
    totalPassed += modulePassed;
    totalFailed += moduleFailed;

    console.log();
    console.log(`  Summary: ${colors.green}${modulePassed} passed${colors.reset}, ${colors.red}${moduleFailed} failed${colors.reset}, Avg: ${avgTime}ms`);
    console.log();
  }

  // Print overall summary
  console.log(`${colors.blue}============================================================${colors.reset}`);
  console.log(`${colors.blue}  Overall Summary${colors.reset}`);
  console.log(`${colors.blue}============================================================${colors.reset}`);
  console.log();
  console.log(`Total Modules: ${sortedModules.length}`);
  console.log(`Total Endpoints: ${totalEndpoints}`);
  console.log(`${colors.green}Passed: ${totalPassed} (${((totalPassed / totalEndpoints) * 100).toFixed(1)}%)${colors.reset}`);
  console.log(`${colors.red}Failed: ${totalFailed} (${((totalFailed / totalEndpoints) * 100).toFixed(1)}%)${colors.reset}`);
  console.log(`Average Response Time: ${Math.round(totalTime / totalEndpoints)}ms`);
  console.log();

  // Print module breakdown
  console.log(`${colors.blue}Module Breakdown:${colors.reset}`);
  console.log();
  console.log('Module                    Total     Passed    Failed    Avg Time');
  console.log('────────────────────────────────────────────────────────────────');

  for (const result of allResults) {
    const passRate = ((result.passed / result.total) * 100).toFixed(1);
    const moduleColor = result.failed === 0 ? colors.green : result.failed > 5 ? colors.red : colors.yellow;

    console.log(
      `${result.module.padEnd(25)} ${result.total.toString().padStart(5)}     ` +
      `${moduleColor}${result.passed.toString().padStart(3)} (${passRate}%)${colors.reset}  ` +
      `${colors.red}${result.failed.toString().padStart(3)}${colors.reset}       ` +
      `${result.avgTime}ms`
    );
  }

  console.log();
  console.log(`${colors.blue}============================================================${colors.reset}`);

  // Exit with error code if there are critical failures (500 errors)
  const criticalErrors = allResults.flatMap(r => r.results).filter(r => r.status === 500);
  if (criticalErrors.length > 0) {
    console.log();
    console.log(`${colors.red}⚠️  ${criticalErrors.length} CRITICAL 500 ERRORS FOUND${colors.reset}`);
    console.log();
    for (const error of criticalErrors) {
      console.log(`${colors.red}✗${colors.reset} ${error.method} ${error.endpoint}`);
    }
    console.log();
    process.exit(1);
  }

  if (totalFailed === 0) {
    console.log();
    console.log(`${colors.green}✅ All endpoints passed!${colors.reset}`);
    console.log();
  } else {
    console.log();
    console.log(`${colors.yellow}⚠️  ${totalFailed} endpoints failed (see details above)${colors.reset}`);
    console.log();
  }
}

// Run tests
main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
