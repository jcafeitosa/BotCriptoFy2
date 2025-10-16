#!/usr/bin/env bun

/**
 * Extract API endpoints from route files
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Endpoint {
  method: string;
  path: string;
  description?: string;
  requiresAuth: boolean;
}

interface ModuleEndpoints {
  module: string;
  file: string;
  prefix: string;
  endpoints: Endpoint[];
}

function extractEndpoints(filePath: string, fileContent: string): ModuleEndpoints {
  const moduleName = filePath.split('/modules/')[1]?.split('/')[0] || 'unknown';
  const fileName = filePath.split('/').pop() || 'unknown';

  // Extract prefix from: new Elysia({ prefix: '/api/v1/...' })
  const prefixMatch = fileContent.match(/prefix:\s*['"`]([^'"`]+)['"`]/);
  const prefix = prefixMatch ? prefixMatch[1] : '/unknown';

  const endpoints: Endpoint[] = [];

  // Extract HTTP methods: .get(), .post(), .put(), .patch(), .delete()
  const methodRegex = /\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = methodRegex.exec(fileContent)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];

    // Check if requires auth by looking for sessionGuard or requireAuth
    const requiresAuth = fileContent.includes('sessionGuard') ||
                         fileContent.includes('requireAuth') ||
                         fileContent.includes('requireTenant');

    // Try to find description in comment above
    const linesBefore = fileContent.substring(0, match.index).split('\n');
    const description = linesBefore
      .slice(-5)
      .reverse()
      .find(line => line.includes('*') && !line.includes('/**') && !line.includes('*/'))
      ?.replace(/\s*\*\s*/, '')
      .trim();

    endpoints.push({
      method,
      path: prefix + path,
      description,
      requiresAuth,
    });
  }

  return {
    module: moduleName,
    file: fileName,
    prefix,
    endpoints,
  };
}

function findRouteFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
        files.push(...findRouteFiles(fullPath));
      } else if (item.endsWith('.routes.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return files;
}

function main() {
  const srcDir = join(process.cwd(), 'src', 'modules');
  const routeFiles = findRouteFiles(srcDir);

  console.log('# 📡 API Endpoints Map\n');
  console.log(`Found ${routeFiles.length} route files\n`);

  const allModules: ModuleEndpoints[] = [];

  for (const file of routeFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      const moduleData = extractEndpoints(file, content);
      allModules.push(moduleData);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  // Group by module
  const moduleGroups = new Map<string, ModuleEndpoints[]>();

  for (const mod of allModules) {
    if (!moduleGroups.has(mod.module)) {
      moduleGroups.set(mod.module, []);
    }
    moduleGroups.get(mod.module)!.push(mod);
  }

  // Output by module
  for (const [moduleName, modules] of Array.from(moduleGroups.entries()).sort()) {
    console.log(`## 📦 Module: ${moduleName.toUpperCase()}\n`);

    for (const mod of modules) {
      console.log(`### ${mod.file}`);
      console.log(`**Base Path:** \`${mod.prefix}\``);
      console.log(`**Endpoints:** ${mod.endpoints.length}`);
      console.log(`**Auth Required:** ${mod.endpoints[0]?.requiresAuth ? '🔒 Yes' : '🔓 No'}\n`);

      if (mod.endpoints.length > 0) {
        console.log('| Method | Path | Description |');
        console.log('|--------|------|-------------|');

        for (const endpoint of mod.endpoints) {
          const desc = endpoint.description || '-';
          console.log(`| ${endpoint.method} | \`${endpoint.path}\` | ${desc} |`);
        }

        console.log('');
      }
    }
  }

  // Summary
  console.log('\n---\n');
  console.log('## 📊 Summary\n');
  console.log(`- **Total Modules:** ${moduleGroups.size}`);
  console.log(`- **Total Route Files:** ${allModules.length}`);
  console.log(`- **Total Endpoints:** ${allModules.reduce((sum, m) => sum + m.endpoints.length, 0)}`);

  const authEndpoints = allModules.reduce((sum, m) =>
    sum + m.endpoints.filter(e => e.requiresAuth).length, 0
  );
  const publicEndpoints = allModules.reduce((sum, m) =>
    sum + m.endpoints.filter(e => !e.requiresAuth).length, 0
  );

  console.log(`- **Protected Endpoints:** 🔒 ${authEndpoints}`);
  console.log(`- **Public Endpoints:** 🔓 ${publicEndpoints}`);
}

main();
