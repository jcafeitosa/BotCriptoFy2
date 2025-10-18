#!/usr/bin/env bun

/**
 * Verify Module Initialization
 * Checks if all modules are properly initialized and registered
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const SWAGGER_URL = `${BASE_URL}/swagger/json`;
const MODULES_DIR = join(process.cwd(), 'src', 'modules');

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

interface ModuleInfo {
  name: string;
  hasRoutes: boolean;
  hasServices: boolean;
  hasSchema: boolean;
  routesCount: number;
  servicesCount: number;
  isRegistered: boolean;
  endpoints: number;
}

/**
 * Get all modules from src/modules directory
 */
function getModulesFromDirectory(): string[] {
  const entries = readdirSync(MODULES_DIR);
  return entries.filter((entry) => {
    const fullPath = join(MODULES_DIR, entry);
    const isDir = statSync(fullPath).isDirectory();
    return isDir && entry !== 'README.md';
  }).sort();
}

/**
 * Check if module has specific files
 */
function analyzeModule(moduleName: string): Omit<ModuleInfo, 'isRegistered' | 'endpoints'> {
  const modulePath = join(MODULES_DIR, moduleName);

  let hasRoutes = false;
  let hasServices = false;
  let hasSchema = false;
  let routesCount = 0;
  let servicesCount = 0;

  try {
    // Check for routes directory
    try {
      const routesDir = join(modulePath, 'routes');
      const routeFiles = readdirSync(routesDir).filter(f => f.endsWith('.ts'));
      hasRoutes = routeFiles.length > 0;
      routesCount = routeFiles.length;
    } catch {
      // Routes directory doesn't exist
    }

    // Check for services directory
    try {
      const servicesDir = join(modulePath, 'services');
      const serviceFiles = readdirSync(servicesDir).filter(f => f.endsWith('.ts'));
      hasServices = serviceFiles.length > 0;
      servicesCount = serviceFiles.length;
    } catch {
      // Services directory doesn't exist
    }

    // Check for schema directory or schema file
    try {
      const schemaDir = join(modulePath, 'schema');
      const schemaFiles = readdirSync(schemaDir).filter(f => f.endsWith('.ts'));
      hasSchema = schemaFiles.length > 0;
    } catch {
      // Try single schema file
      try {
        const schemaFile = join(modulePath, 'schema.ts');
        hasSchema = statSync(schemaFile).isFile();
      } catch {
        // No schema
      }
    }
  } catch (error) {
    console.error(`Error analyzing module ${moduleName}:`, error);
  }

  return {
    name: moduleName,
    hasRoutes,
    hasServices,
    hasSchema,
    routesCount,
    servicesCount,
  };
}

/**
 * Get registered routes from Swagger spec
 */
async function getRegisteredModules(): Promise<Map<string, number>> {
  try {
    const response = await fetch(SWAGGER_URL);
    const swagger = await response.json();

    const moduleEndpoints = new Map<string, number>();

    for (const path of Object.keys(swagger.paths || {})) {
      // Extract module name from path
      const parts = path.replace(/^\//, '').split('/');
      let moduleName = parts[0];

      if (moduleName === 'api' && parts[1] === 'v1') {
        moduleName = parts[2] || 'root';
      }

      const current = moduleEndpoints.get(moduleName) || 0;
      const methods = Object.keys(swagger.paths[path]);
      moduleEndpoints.set(moduleName, current + methods.length);
    }

    return moduleEndpoints;
  } catch (error) {
    console.error('Error fetching Swagger spec:', error);
    return new Map();
  }
}

/**
 * Map module directory name to route path prefix
 */
function getModulePathPrefix(moduleName: string): string[] {
  // Some modules have different path prefixes
  const mapping: Record<string, string[]> = {
    'market-data': ['market-data'],
    'social-trading': ['social'],
    'order-book': ['orderbook'],
    'p2p-marketplace': ['p2p'],
    'rate-limiting': ['rate-limit'],
  };

  return mapping[moduleName] || [moduleName];
}

/**
 * Main verification function
 */
async function main() {
  console.log(`${colors.blue}============================================================${colors.reset}`);
  console.log(`${colors.blue}  Module Initialization Verification${colors.reset}`);
  console.log(`${colors.blue}============================================================${colors.reset}`);
  console.log();

  // Get all modules from directory
  const moduleNames = getModulesFromDirectory();
  console.log(`Found ${colors.cyan}${moduleNames.length}${colors.reset} modules in src/modules/`);
  console.log();

  // Get registered modules from Swagger
  console.log('Fetching registered endpoints from Swagger...');
  const registeredModules = await getRegisteredModules();
  console.log(`Found ${colors.cyan}${registeredModules.size}${colors.reset} registered modules with endpoints`);
  console.log();

  // Analyze each module
  const modules: ModuleInfo[] = [];
  let totalWithRoutes = 0;
  let totalRegistered = 0;
  let totalEndpoints = 0;

  for (const moduleName of moduleNames) {
    const info = analyzeModule(moduleName);

    // Check if module is registered
    const pathPrefixes = getModulePathPrefix(moduleName);
    let endpoints = 0;
    let isRegistered = false;

    for (const prefix of pathPrefixes) {
      const count = registeredModules.get(prefix) || 0;
      endpoints += count;
      if (count > 0) {
        isRegistered = true;
      }
    }

    const moduleInfo: ModuleInfo = {
      ...info,
      isRegistered,
      endpoints,
    };

    modules.push(moduleInfo);

    if (info.hasRoutes) totalWithRoutes++;
    if (isRegistered) totalRegistered++;
    totalEndpoints += endpoints;
  }

  // Print summary
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}  Summary${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log();
  console.log(`Total Modules:           ${moduleNames.length}`);
  console.log(`Modules with Routes:     ${colors.cyan}${totalWithRoutes}${colors.reset}`);
  console.log(`Registered Modules:      ${colors.green}${totalRegistered}${colors.reset}`);
  console.log(`Total Endpoints:         ${colors.cyan}${totalEndpoints}${colors.reset}`);
  console.log();

  // Print detailed module status
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}  Module Status${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log();
  console.log('Module                    Routes  Services  Schema  Registered  Endpoints');
  console.log('─────────────────────────────────────────────────────────────────────────');

  for (const module of modules) {
    const routesIcon = module.hasRoutes ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const servicesIcon = module.hasServices ? `${colors.green}✓${colors.reset}` : `${colors.yellow}-${colors.reset}`;
    const schemaIcon = module.hasSchema ? `${colors.green}✓${colors.reset}` : `${colors.yellow}-${colors.reset}`;
    const registeredIcon = module.isRegistered ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;

    const endpointsColor = module.endpoints > 0 ? colors.cyan : colors.yellow;
    const endpointsStr = module.endpoints > 0 ? `${endpointsColor}${module.endpoints}${colors.reset}` : '-';

    console.log(
      `${module.name.padEnd(25)} ` +
      `${routesIcon}${module.routesCount > 0 ? `(${module.routesCount})`.padEnd(6) : '     '}  ` +
      `${servicesIcon}${module.servicesCount > 0 ? `(${module.servicesCount})`.padEnd(7) : '      '} ` +
      `${schemaIcon}      ` +
      `${registeredIcon}${module.isRegistered ? '          ' : '           '}` +
      `${endpointsStr}`
    );
  }

  console.log();

  // Check for issues
  const modulesWithRoutesNotRegistered = modules.filter(m => m.hasRoutes && !m.isRegistered);
  const modulesRegisteredNoRoutes = modules.filter(m => !m.hasRoutes && m.isRegistered);

  if (modulesWithRoutesNotRegistered.length > 0) {
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.yellow}  ⚠️  Modules with Routes NOT Registered${colors.reset}`);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
    for (const module of modulesWithRoutesNotRegistered) {
      console.log(`  ${colors.yellow}⚠${colors.reset}  ${module.name} (${module.routesCount} route files)`);
    }
    console.log();
    console.log(`${colors.yellow}These modules have route files but are not registered in index.ts${colors.reset}`);
    console.log();
  }

  if (modulesRegisteredNoRoutes.length > 0) {
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}  ℹ️  Registered Modules without Route Directory${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
    for (const module of modulesRegisteredNoRoutes) {
      console.log(`  ${colors.cyan}ℹ${colors.reset}  ${module.name} (${module.endpoints} endpoints)`);
    }
    console.log();
    console.log(`${colors.cyan}These modules are registered but route files are in a different location${colors.reset}`);
    console.log();
  }

  // Check for modules without any files
  const emptyModules = modules.filter(m => !m.hasRoutes && !m.hasServices && !m.hasSchema);
  if (emptyModules.length > 0) {
    console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.magenta}  📦 Empty Modules (No Routes/Services/Schema)${colors.reset}`);
    console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log();
    for (const module of emptyModules) {
      console.log(`  ${colors.magenta}📦${colors.reset}  ${module.name}`);
    }
    console.log();
  }

  // Final status
  console.log(`${colors.blue}============================================================${colors.reset}`);

  if (modulesWithRoutesNotRegistered.length === 0) {
    console.log();
    console.log(`${colors.green}✅ All modules with routes are properly registered!${colors.reset}`);
    console.log();
  } else {
    console.log();
    console.log(`${colors.yellow}⚠️  ${modulesWithRoutesNotRegistered.length} module(s) need attention${colors.reset}`);
    console.log();
  }

  // Return exit code
  process.exit(modulesWithRoutesNotRegistered.length > 0 ? 1 : 0);
}

// Run verification
main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
