#!/usr/bin/env bun

/**
 * API Endpoint Testing with Authentication
 *
 * Creates a test user, logs in, and tests protected endpoints
 */

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

interface TestResult {
  module: string;
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  responseTime: number;
  response?: any;
}

const results: TestResult[] = [];
let authCookie: string | null = null;

function getTestCredentials() {
  const email = process.env.TEST_EMAIL || '';
  const password = process.env.TEST_PASSWORD || '';
  return { email, password };
}

async function testEndpoint(
  module: string,
  method: string,
  path: string,
  authenticated = false,
  body?: any
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authenticated && authCookie) {
      headers['Cookie'] = authCookie;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const responseTime = Date.now() - startTime;

    let responseData: any;
    const contentType = response.headers.get('content-type');

    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch {
      responseData = null;
    }

    return {
      module,
      endpoint: path,
      method,
      status: response.status,
      success: response.status >= 200 && response.status < 400,
      responseTime,
      response: responseData,
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
    `  ${statusColor}${icon}${colors.reset} ${result.method.padEnd(6)} ${result.endpoint.padEnd(55)} ` +
      `${statusColor}${result.status}${colors.reset} (${result.responseTime}ms)`
  );

  if (result.error) {
    console.log(`    ${colors.red}Error: ${result.error}${colors.reset}`);
  }
}

async function setupTestUser() {
  console.log(`${colors.cyan}🔧 Setting up test user${colors.reset}\n`);
  const { email, password } = getTestCredentials();
  if (email && password) {
    console.log(`  ${colors.green}✓${colors.reset} Using TEST_EMAIL from env: ${email}`);
    return { email } as any;
  }

  console.log(`  ${colors.yellow}⚠${colors.reset} TEST_EMAIL/TEST_PASSWORD not set. Falling back to dev endpoint...`);
  // Fallback: Try to get existing test user from dev endpoints (development only)
  try {
    const usersResponse = await fetch(`${BASE_URL}/api/dev/auth/users`);
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      if (users && users.length > 0) {
        const testUser = users[0];
        console.log(`  ${colors.green}✓${colors.reset} Found existing user: ${testUser.email}`);
        console.log(`  ${colors.yellow}ℹ${colors.reset} User ID: ${testUser.id}`);
        return testUser;
      }
    }
  } catch {}

  console.log(`  ${colors.yellow}ℹ${colors.reset} No users found. Configure TEST_EMAIL/TEST_PASSWORD or signup via API.\n`);
  return null;
}

async function loginTestUser(email: string, password?: string) {
  console.log(`${colors.cyan}🔐 Attempting login${colors.reset}\n`);

  // Better-Auth sign-in endpoint
  const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: password || process.env.TEST_PASSWORD || 'test123456',
    }),
  });

  if (response.ok) {
    // Extract cookie from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      authCookie = setCookie;
      console.log(`  ${colors.green}✓${colors.reset} Login successful`);
      console.log(`  ${colors.yellow}ℹ${colors.reset} Session cookie acquired\n`);
      return true;
    }
  }

  console.log(`  ${colors.red}✗${colors.reset} Login failed: ${response.status} ${response.statusText}`);
  const error = await response.text();
  console.log(`  ${colors.red}Error:${colors.reset} ${error}\n`);

  return false;
}

async function main() {
  console.log(`${colors.magenta}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.magenta}🧪 API ENDPOINT TESTING WITH AUTHENTICATION${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(80)}${colors.reset}\n`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // Setup
  const testUser = await setupTestUser();

  if (!testUser) {
    console.log(`${colors.yellow}⚠ Cannot proceed with authenticated tests without a user${colors.reset}`);
    console.log(`${colors.yellow}ℹ Creating a test scenario with unauthenticated requests only${colors.reset}\n`);
  } else {
    const creds = getTestCredentials();
    const loggedIn = await loginTestUser(testUser.email, creds.password);

    if (!loggedIn) {
      console.log(`${colors.yellow}⚠ Proceeding with unauthenticated tests only${colors.reset}\n`);
    }
  }

  console.log(`${colors.blue}${'━'.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}📋 TESTING ALL MODULES${colors.reset}`);
  console.log(`${colors.blue}${'━'.repeat(80)}${colors.reset}\n`);

  // ==========================================
  // Test 0: Authenticated identity and Admin Users
  // ==========================================
  if (authCookie) {
    console.log(`${colors.cyan}👤 Module: Auth + Admin Users${colors.reset}\n`);
    // Who am I
    results.push(await testEndpoint('auth', 'GET', '/api/auth/me', true));
    printResult(results[results.length - 1]);

    // Admin list
    results.push(await testEndpoint('users-admin', 'GET', '/api/admin/users', true));
    printResult(results[results.length - 1]);
  }

  // ==========================================
  // Test 1: CEO Dashboard
  // ==========================================
  console.log(`${colors.cyan}📊 Module: CEO Dashboard${colors.reset}\n`);

  results.push(await testEndpoint('ceo', 'GET', '/api/v1/ceo/dashboard', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('ceo', 'GET', '/api/v1/ceo/kpis', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('ceo', 'GET', '/api/v1/ceo/revenue', !!authCookie));
  printResult(results[results.length - 1]);

  console.log();

  // ==========================================
  // Test 2: Financial - Invoices
  // ==========================================
  console.log(`${colors.cyan}💰 Module: Financial - Invoices${colors.reset}\n`);

  results.push(await testEndpoint('financial', 'GET', '/api/v1/invoices', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('financial', 'GET', '/api/v1/invoices/overdue/list', !!authCookie));
  printResult(results[results.length - 1]);

  console.log();

  // ==========================================
  // Test 3: Financial - Expenses
  // ==========================================
  console.log(`${colors.cyan}📝 Module: Financial - Expenses${colors.reset}\n`);

  results.push(await testEndpoint('financial', 'GET', '/api/v1/expenses', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(
    await testEndpoint('financial', 'GET', '/api/v1/expenses/pending-approvals/list', !!authCookie)
  );
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('financial', 'GET', '/api/v1/expenses/categories/list', !!authCookie));
  printResult(results[results.length - 1]);

  console.log();

  // ==========================================
  // Test 4: Financial - Ledger
  // ==========================================
  console.log(`${colors.cyan}📚 Module: Financial - Ledger${colors.reset}\n`);

  results.push(await testEndpoint('financial', 'GET', '/api/v1/ledger/accounts', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(
    await testEndpoint('financial', 'GET', '/api/v1/ledger/trial-balance?fiscalPeriod=2025-01', !!authCookie)
  );
  printResult(results[results.length - 1]);

  console.log();

  // ==========================================
  // Test 5: Financial - Tax
  // ==========================================
  console.log(`${colors.cyan}🏛️  Module: Financial - Tax${colors.reset}\n`);

  results.push(await testEndpoint('financial', 'GET', '/api/v1/tax/obligations', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('financial', 'GET', '/api/v1/tax/rates', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('financial', 'GET', '/api/v1/tax/records?fiscalPeriod=2025-01', !!authCookie));
  printResult(results[results.length - 1]);

  console.log();

  // ==========================================
  // Test 6: Financial - Reports
  // ==========================================
  console.log(`${colors.cyan}📈 Module: Financial - Reports${colors.reset}\n`);

  results.push(
    await testEndpoint('financial', 'GET', '/api/v1/reports/profit-loss?fiscalPeriod=2025-01', !!authCookie)
  );
  printResult(results[results.length - 1]);

  results.push(
    await testEndpoint('financial', 'GET', '/api/v1/reports/balance-sheet?date=2025-01-31', !!authCookie)
  );
  printResult(results[results.length - 1]);

  results.push(
    await testEndpoint('financial', 'GET', '/api/v1/reports/cash-flow?fiscalPeriod=2025-01', !!authCookie)
  );
  printResult(results[results.length - 1]);

  console.log();

  // ==========================================
  // Test 7: Other Modules
  // ==========================================
  console.log(`${colors.cyan}🔧 Module: Other Services${colors.reset}\n`);

  results.push(await testEndpoint('users', 'GET', '/api/user/profile', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('tenants', 'GET', '/api/tenants/me', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('departments', 'GET', '/api/departments/', !!authCookie));
  printResult(results[results.length - 1]);

  results.push(await testEndpoint('notifications', 'GET', '/api/notifications/', !!authCookie));
  printResult(results[results.length - 1]);

  console.log();

  // ==========================================
  // Summary
  // ==========================================
  console.log(`${colors.magenta}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.magenta}📊 TEST SUMMARY${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(80)}${colors.reset}\n`);

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const successRate = ((passed / results.length) * 100).toFixed(2);

  console.log(`Total Tests:      ${results.length}`);
  console.log(`${colors.green}✓ Passed:${colors.reset}        ${passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset}        ${failed}`);
  console.log(`Success Rate:     ${successRate}%`);

  if (!authCookie) {
    console.log(`\n${colors.yellow}⚠ Note: All tests ran without authentication${colors.reset}`);
    console.log(
      `${colors.yellow}ℹ Expected: All protected endpoints should return 401 Unauthorized${colors.reset}`
    );
  }

  console.log(`\n${colors.magenta}${'='.repeat(80)}${colors.reset}\n`);

  // Save results
  const reportPath = './test-results-with-auth.json';
  await Bun.write(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        authenticated: !!authCookie,
        summary: { total: results.length, passed, failed, successRate },
        results,
      },
      null,
      2
    )
  );

  console.log(`${colors.cyan}📄 Detailed results saved to: ${reportPath}${colors.reset}\n`);
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
