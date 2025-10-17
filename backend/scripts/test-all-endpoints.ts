#!/usr/bin/env bun
/**
 * Comprehensive Endpoint Testing Script
 * Tests all available endpoints and generates a detailed report
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');
const MODULE_FILTER = process.argv.find(arg => arg.startsWith('--module='))?.split('=')[1];

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  error?: string;
  module: string;
}

interface ModuleStats {
  total: number;
  passed: number;
  failed: number;
  avgResponseTime: number;
}

const results: TestResult[] = [];
const moduleStats: Map<string, ModuleStats> = new Map();

// Color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  gray: '\x1b[90m',
};

function getModuleFromPath(path: string): string {
  if (path === '/') return 'root';
  const parts = path.split('/').filter(Boolean);
  return parts[0] || 'unknown';
}

function shouldSkipEndpoint(path: string, method: string): boolean {
  // Skip these endpoints to avoid side effects
  const skipPatterns = [
    /\/delete$/i,
    /\/remove$/i,
    /\/cancel$/i,
  ];

  // Only test DELETE on safe endpoints
  if (method === 'DELETE') {
    return !path.includes('/test/');
  }

  return skipPatterns.some(pattern => pattern.test(path));
}

async function testEndpoint(path: string, method: string): Promise<TestResult> {
  const module = getModuleFromPath(path);
  const startTime = Date.now();

  try {
    // Replace path parameters with test values
    const testPath = path
      .replace(/{agentId}/g, 'test-agent-1')
      .replace(/{userId}/g, 'test-user-1')
      .replace(/{departmentId}/g, 'test-dept-1')
      .replace(/{managerId}/g, 'test-manager-1')
      .replace(/{traderId}/g, 'test-trader-1')
      .replace(/{symbol}/g, 'BTC/USDT')
      .replace(/{exchange}/g, 'binance')
      .replace(/{strategyId}/g, 'test-strategy-1')
      .replace(/{botId}/g, 'test-bot-1')
      .replace(/{orderId}/g, 'test-order-1')
      .replace(/{positionId}/g, 'test-position-1')
      .replace(/{backtestId}/g, 'test-backtest-1')
      .replace(/{[^}]+}/g, 'test-id');

    const url = `${BASE_URL}${testPath}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify({});
    }

    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;

    // Consider 200-299 and 401 (auth required) as success
    const success = (response.status >= 200 && response.status < 300) || response.status === 401;

    return {
      endpoint: path,
      method,
      status: response.status,
      success,
      responseTime,
      module,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint: path,
      method,
      status: 0,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
      module,
    };
  }
}

async function getSwaggerSpec(): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/swagger/json`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Swagger spec:', error);
    process.exit(1);
  }
}

async function main() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}  Comprehensive Endpoint Testing${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Verbose: ${VERBOSE ? 'Yes' : 'No'}`);
  if (MODULE_FILTER) {
    console.log(`Module Filter: ${MODULE_FILTER}`);
  }
  console.log();

  // Get Swagger spec
  console.log('Fetching API specification...');
  const spec = await getSwaggerSpec();
  const paths = Object.keys(spec.paths || {});

  console.log(`Found ${paths.length} endpoints\n`);

  // Test each endpoint
  let tested = 0;
  for (const path of paths) {
    const pathSpec = spec.paths[path];
    const methods = Object.keys(pathSpec).filter(m =>
      ['get', 'post', 'put', 'patch', 'delete'].includes(m.toLowerCase())
    );

    for (const method of methods) {
      const methodUpper = method.toUpperCase();
      const module = getModuleFromPath(path);

      // Apply module filter
      if (MODULE_FILTER && module !== MODULE_FILTER) {
        continue;
      }

      // Skip dangerous endpoints
      if (shouldSkipEndpoint(path, methodUpper)) {
        if (VERBOSE) {
          console.log(`${colors.gray}SKIP ${methodUpper} ${path}${colors.reset}`);
        }
        continue;
      }

      tested++;

      // Test endpoint
      const result = await testEndpoint(path, methodUpper);
      results.push(result);

      // Update module stats
      const stats = moduleStats.get(module) || {
        total: 0,
        passed: 0,
        failed: 0,
        avgResponseTime: 0,
      };
      stats.total++;
      if (result.success) {
        stats.passed++;
      } else {
        stats.failed++;
      }
      moduleStats.set(module, stats);

      // Print result
      const statusColor = result.success ? colors.green : colors.red;
      const statusSymbol = result.success ? '✓' : '✗';

      if (VERBOSE || !result.success) {
        console.log(
          `${statusColor}${statusSymbol}${colors.reset} ` +
          `${methodUpper.padEnd(7)} ${path.padEnd(50)} ` +
          `${result.status} (${result.responseTime}ms)`
        );

        if (result.error && !VERBOSE) {
          console.log(`  ${colors.red}Error: ${result.error}${colors.reset}`);
        }
      } else {
        // Show progress
        if (tested % 10 === 0) {
          process.stdout.write('.');
        }
      }
    }
  }

  if (!VERBOSE) {
    console.log('\n');
  }

  // Calculate module stats
  moduleStats.forEach((stats, module) => {
    const totalTime = results
      .filter(r => r.module === module)
      .reduce((sum, r) => sum + r.responseTime, 0);
    stats.avgResponseTime = totalTime / stats.total;
  });

  // Print summary
  printSummary();
}

function printSummary() {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}  Test Summary${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  // Overall stats
  const total = results.length;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalTime = results.reduce((sum, r) => sum + r.responseTime, 0);
  const avgTime = totalTime / total;

  console.log(`${colors.blue}Overall Statistics:${colors.reset}`);
  console.log(`  Total Endpoints Tested: ${total}`);
  console.log(`  ${colors.green}Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)${colors.reset}`);
  console.log(`  Average Response Time: ${avgTime.toFixed(2)}ms`);
  console.log();

  // Module breakdown
  console.log(`${colors.blue}Module Breakdown:${colors.reset}\n`);

  const sortedModules = Array.from(moduleStats.entries())
    .sort((a, b) => b[1].total - a[1].total);

  console.log('Module'.padEnd(25) + 'Total'.padEnd(10) + 'Passed'.padEnd(10) + 'Failed'.padEnd(10) + 'Avg Time');
  console.log('─'.repeat(60));

  for (const [module, stats] of sortedModules) {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
    const passColor = stats.failed === 0 ? colors.green : colors.yellow;

    console.log(
      module.padEnd(25) +
      String(stats.total).padEnd(10) +
      `${passColor}${String(stats.passed)} (${passRate}%)${colors.reset}`.padEnd(20) +
      (stats.failed > 0 ? `${colors.red}${stats.failed}${colors.reset}` : '0').padEnd(10) +
      `${stats.avgResponseTime.toFixed(2)}ms`
    );
  }

  console.log();

  // Failed endpoints
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0 && failedResults.length <= 20) {
    console.log(`${colors.red}Failed Endpoints:${colors.reset}\n`);

    for (const result of failedResults) {
      console.log(`${colors.red}✗${colors.reset} ${result.method} ${result.endpoint}`);
      console.log(`  Status: ${result.status}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log();
    }
  } else if (failedResults.length > 20) {
    console.log(`${colors.red}${failedResults.length} endpoints failed.${colors.reset}`);
    console.log(`Run with --verbose to see details.\n`);
  }

  // Performance highlights
  const fastest = results.reduce((min, r) => r.responseTime < min.responseTime ? r : min);
  const slowest = results.reduce((max, r) => r.responseTime > max.responseTime ? r : max);

  console.log(`${colors.blue}Performance Highlights:${colors.reset}`);
  console.log(`  Fastest: ${fastest.method} ${fastest.endpoint} (${fastest.responseTime}ms)`);
  console.log(`  Slowest: ${slowest.method} ${slowest.endpoint} (${slowest.responseTime}ms)`);
  console.log();

  // Final verdict
  const passRate = (passed / total) * 100;
  if (passRate === 100) {
    console.log(`${colors.green}✓ All endpoints passed!${colors.reset}`);
  } else if (passRate >= 90) {
    console.log(`${colors.yellow}⚠ ${passRate.toFixed(1)}% pass rate - some endpoints need attention${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ ${passRate.toFixed(1)}% pass rate - multiple endpoints failing${colors.reset}`);
  }

  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
