#!/usr/bin/env bun

/**
 * Comprehensive API Endpoint Testing Script
 *
 * Tests all endpoints by module with proper authentication flow
 */

interface TestResult {
  module: string;
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  responseTime: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  byModule: Map<string, { passed: number; failed: number; skipped: number }>;
}

const BASE_URL = 'http://localhost:3000';
const results: TestResult[] = [];

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function testEndpoint(
  module: string,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const responseTime = Date.now() - startTime;

    return {
      module,
      endpoint: path,
      method,
      status: response.status,
      success: response.status < 400,
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
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    };
  }
}

function printResult(result: TestResult) {
  const statusColor = result.success ? colors.green : colors.red;
  const icon = result.success ? '✓' : '✗';

  console.log(
    `  ${statusColor}${icon}${colors.reset} ${result.method.padEnd(6)} ${result.endpoint.padEnd(50)} ` +
    `${statusColor}${result.status}${colors.reset} (${result.responseTime}ms)` +
    (result.error ? ` - ${colors.red}${result.error}${colors.reset}` : '')
  );
}

function printSummary(summary: TestSummary) {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.cyan}📊 TEST SUMMARY${colors.reset}\n`);

  console.log(`Total Tests: ${summary.total}`);
  console.log(`${colors.green}✓ Passed: ${summary.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${summary.failed}${colors.reset}`);
  console.log(`${colors.yellow}⊘ Skipped: ${summary.skipped}${colors.reset}`);

  const successRate = ((summary.passed / summary.total) * 100).toFixed(2);
  console.log(`\nSuccess Rate: ${successRate}%\n`);

  console.log('By Module:');
  for (const [module, stats] of summary.byModule.entries()) {
    const total = stats.passed + stats.failed + stats.skipped;
    const rate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0.0';
    console.log(
      `  ${module.padEnd(20)} ` +
      `${colors.green}${stats.passed}${colors.reset}/` +
      `${colors.red}${stats.failed}${colors.reset}/` +
      `${colors.yellow}${stats.skipped}${colors.reset} ` +
      `(${rate}%)`
    );
  }

  console.log('='.repeat(80) + '\n');
}

async function main() {
  console.log(`${colors.cyan}🧪 API Endpoint Testing${colors.reset}\n`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // Test 1: Public Endpoints (no auth required)
  console.log(`${colors.blue}━━━ PUBLIC ENDPOINTS ━━━${colors.reset}\n`);

  // Auth status
  results.push(await testEndpoint('auth', 'GET', '/api/auth/status'));
  printResult(results[results.length - 1]);

  // Subscription plans (public)
  results.push(await testEndpoint('subscriptions', 'GET', '/subscriptions/plans/public'));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('subscriptions', 'GET', '/subscriptions/features'));
  printResult(results[results.length - 1]);

  // Rate limiting stats
  results.push(await testEndpoint('rate-limiting', 'GET', '/api/rate-limit/stats'));
  printResult(results[results.length - 1]);

  // Tax jurisdiction (public)
  results.push(await testEndpoint('financial', 'GET', '/api/v1/tax-jurisdiction/available'));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('financial', 'GET', '/api/v1/tax-jurisdiction/current'));
  printResult(results[results.length - 1]);

  // Dev auth endpoints (dev only - should be disabled in production)
  results.push(await testEndpoint('auth', 'GET', '/api/dev/auth/users'));
  printResult(results[results.length - 1]);

  console.log('\n' + '─'.repeat(80) + '\n');

  // Test 2: Protected Endpoints (require auth) - Test without auth first
  console.log(`${colors.blue}━━━ PROTECTED ENDPOINTS (Without Auth) ━━━${colors.reset}\n`);
  console.log(`${colors.yellow}Note: These should return 401 Unauthorized${colors.reset}\n`);

  // CEO Dashboard
  results.push(await testEndpoint('ceo', 'GET', '/api/v1/ceo/dashboard'));
  printResult(results[results.length - 1]);

  // Financial - Invoices
  results.push(await testEndpoint('financial', 'GET', '/api/v1/invoices'));
  printResult(results[results.length - 1]);

  // Financial - Expenses
  results.push(await testEndpoint('financial', 'GET', '/api/v1/expenses'));
  printResult(results[results.length - 1]);

  // Financial - Budgets
  results.push(await testEndpoint('financial', 'GET', '/api/v1/budgets/123'));
  printResult(results[results.length - 1]);

  // Financial - Ledger
  results.push(await testEndpoint('financial', 'GET', '/api/v1/ledger/accounts'));
  printResult(results[results.length - 1]);

  // Financial - Tax
  results.push(await testEndpoint('financial', 'GET', '/api/v1/tax/obligations'));
  printResult(results[results.length - 1]);

  // Financial - Reports
  results.push(await testEndpoint('financial', 'GET', '/api/v1/reports/profit-loss?fiscalPeriod=2025-01'));
  printResult(results[results.length - 1]);

  // Users
  results.push(await testEndpoint('users', 'GET', '/api/user/profile'));
  printResult(results[results.length - 1]);

  // Tenants
  results.push(await testEndpoint('tenants', 'GET', '/api/tenants/me'));
  printResult(results[results.length - 1]);

  // Departments
  results.push(await testEndpoint('departments', 'GET', '/api/departments/'));
  printResult(results[results.length - 1]);

  // Configurations
  results.push(await testEndpoint('configurations', 'GET', '/api/configurations/'));
  printResult(results[results.length - 1]);

  // Notifications
  results.push(await testEndpoint('notifications', 'GET', '/api/notifications/'));
  printResult(results[results.length - 1]);

  // Audit
  results.push(await testEndpoint('audit', 'GET', '/api/audit/logs'));
  printResult(results[results.length - 1]);

  // Security
  results.push(await testEndpoint('security', 'GET', '/api/security/roles'));
  printResult(results[results.length - 1]);

  console.log('\n' + '─'.repeat(80) + '\n');

  // Test 3: POST endpoints (should fail without auth and body)
  console.log(`${colors.blue}━━━ POST ENDPOINTS (Without Auth) ━━━${colors.reset}\n`);
  console.log(`${colors.yellow}Note: These should return 401 Unauthorized or 400 Bad Request${colors.reset}\n`);

  // Financial - Create invoice
  results.push(await testEndpoint('financial', 'POST', '/api/v1/invoices/', {}, {
    invoiceNumber: 'INV-TEST-001',
    type: 'income',
    customerName: 'Test Customer',
    totalAmount: '1000.00',
  }));
  printResult(results[results.length - 1]);

  // Financial - Create expense
  results.push(await testEndpoint('financial', 'POST', '/api/v1/expenses/', {}, {
    expenseNumber: 'EXP-TEST-001',
    title: 'Test Expense',
    amount: '500.00',
  }));
  printResult(results[results.length - 1]);

  // Financial - Calculate tax
  results.push(await testEndpoint('financial', 'POST', '/api/v1/tax/calculate', {}, {
    taxType: 'income',
    taxableAmount: '10000.00',
  }));
  printResult(results[results.length - 1]);

  // Generate tax report
  results.push(await testEndpoint('financial', 'POST', '/api/v1/tax-reports/generate', {}, {
    startDate: '2025-01-01',
    endDate: '2025-01-31',
  }));
  printResult(results[results.length - 1]);

  console.log('\n' + '─'.repeat(80) + '\n');

  // Generate summary
  const summary: TestSummary = {
    total: results.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    byModule: new Map(),
  };

  for (const result of results) {
    if (result.success) {
      summary.passed++;
    } else {
      summary.failed++;
    }

    if (!summary.byModule.has(result.module)) {
      summary.byModule.set(result.module, { passed: 0, failed: 0, skipped: 0 });
    }

    const moduleStats = summary.byModule.get(result.module)!;
    if (result.success) {
      moduleStats.passed++;
    } else {
      moduleStats.failed++;
    }
  }

  printSummary(summary);

  // Save results to file
  const reportPath = './test-results.json';
  await Bun.write(reportPath, JSON.stringify({ summary, results }, null, 2));
  console.log(`${colors.cyan}📄 Detailed results saved to: ${reportPath}${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
