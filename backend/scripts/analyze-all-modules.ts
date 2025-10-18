#!/usr/bin/env bun
/**
 * Complete Module Analysis Script
 * Analyzes all modules for completeness, TODOs, and test coverage
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ModuleAnalysis {
  name: string;
  totalFiles: number;
  servicesCount: number;
  routesCount: number;
  schemasCount: number;
  testsCount: number;
  todoCount: number;
  linesOfCode: number;
  hasSchema: boolean;
  hasRoutes: boolean;
  hasServices: boolean;
  hasTests: boolean;
  completenessScore: number;
}

function countLinesInFile(filePath: string): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function countTodosInFile(filePath: string): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const matches = content.match(/TODO|FIXME|XXX|HACK/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

function analyzeModule(modulePath: string, moduleName: string): ModuleAnalysis {
  const analysis: ModuleAnalysis = {
    name: moduleName,
    totalFiles: 0,
    servicesCount: 0,
    routesCount: 0,
    schemasCount: 0,
    testsCount: 0,
    todoCount: 0,
    linesOfCode: 0,
    hasSchema: false,
    hasRoutes: false,
    hasServices: false,
    hasTests: false,
    completenessScore: 0,
  };

  function walkDir(dir: string) {
    try {
      const files = readdirSync(dir);

      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (file === 'node_modules' || file === '.git') continue;
          walkDir(fullPath);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
          analysis.totalFiles++;
          analysis.linesOfCode += countLinesInFile(fullPath);
          analysis.todoCount += countTodosInFile(fullPath);

          if (file.includes('.service.')) analysis.servicesCount++;
          if (file.includes('.routes.')) analysis.routesCount++;
          if (file.includes('.schema.')) analysis.schemasCount++;
          if (file.includes('.test.') || file.includes('.spec.')) analysis.testsCount++;
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }

  walkDir(modulePath);

  // Check for key directories
  analysis.hasSchema = existsSync(join(modulePath, 'schema'));
  analysis.hasRoutes = existsSync(join(modulePath, 'routes'));
  analysis.hasServices = existsSync(join(modulePath, 'services'));
  analysis.hasTests = existsSync(join(modulePath, '__tests__')) || analysis.testsCount > 0;

  // Calculate completeness score (0-100)
  let score = 0;
  if (analysis.totalFiles > 0) score += 20;
  if (analysis.servicesCount > 0) score += 25;
  if (analysis.routesCount > 0) score += 20;
  if (analysis.schemasCount > 0) score += 15;
  if (analysis.testsCount > 0) score += 20;
  analysis.completenessScore = score;

  return analysis;
}

function main() {
  const modulesDir = join(process.cwd(), 'src/modules');
  const modules = readdirSync(modulesDir).filter((name) => {
    const fullPath = join(modulesDir, name);
    try {
      return statSync(fullPath).isDirectory();
    } catch {
      return false;
    }
  });

  console.log('📊 BEECRIPTO - COMPLETE MODULE ANALYSIS');
  console.log('=' .repeat(80));
  console.log(`Total Modules: ${modules.length}`);
  console.log('=' .repeat(80));
  console.log('');

  const analyses: ModuleAnalysis[] = [];

  for (const moduleName of modules.sort()) {
    const modulePath = join(modulesDir, moduleName);
    const analysis = analyzeModule(modulePath, moduleName);
    analyses.push(analysis);
  }

  // Sort by completeness score (desc)
  analyses.sort((a, b) => b.completenessScore - a.completenessScore);

  // Group by completeness
  const complete = analyses.filter((a) => a.completenessScore >= 80);
  const partial = analyses.filter((a) => a.completenessScore >= 40 && a.completenessScore < 80);
  const stub = analyses.filter((a) => a.completenessScore < 40);

  // Summary
  console.log('## 📈 SUMMARY\n');
  console.log(`✅ Complete Modules (≥80%): ${complete.length}`);
  console.log(`🟡 Partial Modules (40-79%): ${partial.length}`);
  console.log(`🔴 Stub/Incomplete (<40%): ${stub.length}`);
  console.log('');

  // Complete Modules
  if (complete.length > 0) {
    console.log('## ✅ COMPLETE MODULES (≥80%)\n');
    console.log('| Module | Files | Services | Routes | Schemas | Tests | TODOs | LOC | Score |');
    console.log('|--------|-------|----------|--------|---------|-------|-------|-----|-------|');
    for (const m of complete) {
      console.log(
        `| ${m.name.padEnd(20)} | ${m.totalFiles.toString().padStart(5)} | ${m.servicesCount.toString().padStart(8)} | ${m.routesCount.toString().padStart(6)} | ${m.schemasCount.toString().padStart(7)} | ${m.testsCount.toString().padStart(5)} | ${m.todoCount.toString().padStart(5)} | ${m.linesOfCode.toString().padStart(7)} | ${m.completenessScore}% |`
      );
    }
    console.log('');
  }

  // Partial Modules
  if (partial.length > 0) {
    console.log('## 🟡 PARTIAL MODULES (40-79%)\n');
    console.log('| Module | Files | Services | Routes | Schemas | Tests | TODOs | LOC | Score |');
    console.log('|--------|-------|----------|--------|---------|-------|-------|-----|-------|');
    for (const m of partial) {
      console.log(
        `| ${m.name.padEnd(20)} | ${m.totalFiles.toString().padStart(5)} | ${m.servicesCount.toString().padStart(8)} | ${m.routesCount.toString().padStart(6)} | ${m.schemasCount.toString().padStart(7)} | ${m.testsCount.toString().padStart(5)} | ${m.todoCount.toString().padStart(5)} | ${m.linesOfCode.toString().padStart(7)} | ${m.completenessScore}% |`
      );
    }
    console.log('');
  }

  // Stub Modules
  if (stub.length > 0) {
    console.log('## 🔴 STUB/INCOMPLETE MODULES (<40%)\n');
    console.log('| Module | Files | Services | Routes | Schemas | Tests | TODOs | LOC | Score |');
    console.log('|--------|-------|----------|--------|---------|-------|-------|-----|-------|');
    for (const m of stub) {
      console.log(
        `| ${m.name.padEnd(20)} | ${m.totalFiles.toString().padStart(5)} | ${m.servicesCount.toString().padStart(8)} | ${m.routesCount.toString().padStart(6)} | ${m.schemasCount.toString().padStart(7)} | ${m.testsCount.toString().padStart(5)} | ${m.todoCount.toString().padStart(5)} | ${m.linesOfCode.toString().padStart(7)} | ${m.completenessScore}% |`
      );
    }
    console.log('');
  }

  // Modules with most TODOs
  const modulesWithTodos = analyses.filter((a) => a.todoCount > 0).sort((a, b) => b.todoCount - a.todoCount);
  if (modulesWithTodos.length > 0) {
    console.log('## ⚠️  MODULES WITH TODOs\n');
    console.log('| Module | TODOs | Files | LOC |');
    console.log('|--------|-------|-------|-----|');
    for (const m of modulesWithTodos.slice(0, 10)) {
      console.log(`| ${m.name.padEnd(20)} | ${m.todoCount.toString().padStart(5)} | ${m.totalFiles.toString().padStart(5)} | ${m.linesOfCode.toString().padStart(7)} |`);
    }
    console.log('');
  }

  // Overall Stats
  const totalFiles = analyses.reduce((sum, a) => sum + a.totalFiles, 0);
  const totalLOC = analyses.reduce((sum, a) => sum + a.linesOfCode, 0);
  const totalTodos = analyses.reduce((sum, a) => sum + a.todoCount, 0);
  const avgScore = analyses.reduce((sum, a) => sum + a.completenessScore, 0) / analyses.length;

  console.log('## 📊 OVERALL STATISTICS\n');
  console.log(`Total Modules: ${analyses.length}`);
  console.log(`Total TypeScript Files: ${totalFiles}`);
  console.log(`Total Lines of Code: ${totalLOC.toLocaleString()}`);
  console.log(`Total TODOs/FIXMEs: ${totalTodos}`);
  console.log(`Average Completeness: ${avgScore.toFixed(1)}%`);
  console.log('');
  console.log(`Project Completeness: ${((complete.length / analyses.length) * 100).toFixed(1)}% (${complete.length}/${analyses.length} modules ≥80%)`);
  console.log('');

  // Recommendations
  console.log('## 🎯 RECOMMENDATIONS\n');
  if (stub.length > 0) {
    console.log(`### Priority 1: Complete Stub Modules (${stub.length} modules)`);
    stub.forEach((m, i) => {
      console.log(`${i + 1}. **${m.name}** (${m.completenessScore}% complete)`);
    });
    console.log('');
  }

  const modulesWithManyTodos = modulesWithTodos.filter((m) => m.todoCount > 5);
  if (modulesWithManyTodos.length > 0) {
    console.log(`### Priority 2: Resolve TODOs (${modulesWithManyTodos.length} modules with >5 TODOs)`);
    modulesWithManyTodos.slice(0, 5).forEach((m, i) => {
      console.log(`${i + 1}. **${m.name}** (${m.todoCount} TODOs)`);
    });
    console.log('');
  }

  const modulesWithoutTests = analyses.filter((m) => m.testsCount === 0 && m.completenessScore >= 40);
  if (modulesWithoutTests.length > 0) {
    console.log(`### Priority 3: Add Tests (${modulesWithoutTests.length} modules without tests)`);
    modulesWithoutTests.slice(0, 5).forEach((m, i) => {
      console.log(`${i + 1}. **${m.name}** (${m.totalFiles} files, ${m.linesOfCode} LOC, 0 tests)`);
    });
    console.log('');
  }
}

main();
