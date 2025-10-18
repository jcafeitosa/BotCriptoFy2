#!/usr/bin/env bun
/**
 * Find All TODOs Script
 * Lists all TODO/FIXME/XXX/HACK comments with file locations
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

interface TodoItem {
  file: string;
  line: number;
  type: string;
  content: string;
}

function findTodosInFile(filePath: string): TodoItem[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const todos: TodoItem[] = [];

    lines.forEach((line, index) => {
      const match = line.match(/(TODO|FIXME|XXX|HACK)[\s:](.*)/);
      if (match) {
        todos.push({
          file: filePath,
          line: index + 1,
          type: match[1],
          content: match[2].trim() || line.trim(),
        });
      }
    });

    return todos;
  } catch {
    return [];
  }
}

function walkDir(dir: string, todos: TodoItem[]) {
  try {
    const files = readdirSync(dir);

    for (const file of files) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
        walkDir(fullPath, todos);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        const fileTodos = findTodosInFile(fullPath);
        todos.push(...fileTodos);
      }
    }
  } catch (error) {
    // Skip inaccessible directories
  }
}

function main() {
  const modulesDir = join(process.cwd(), 'src/modules');
  const todos: TodoItem[] = [];

  walkDir(modulesDir, todos);

  console.log('📋 TODO/FIXME/XXX/HACK FINDER');
  console.log('='.repeat(80));
  console.log(`Total Found: ${todos.length}`);
  console.log('='.repeat(80));
  console.log('');

  if (todos.length === 0) {
    console.log('✅ No TODOs found! Project is clean!');
    return;
  }

  // Group by module
  const byModule = new Map<string, TodoItem[]>();
  todos.forEach((todo) => {
    const moduleName = todo.file.split('/modules/')[1]?.split('/')[0] || 'unknown';
    if (!byModule.has(moduleName)) {
      byModule.set(moduleName, []);
    }
    byModule.get(moduleName)!.push(todo);
  });

  // Sort by module name
  const sortedModules = Array.from(byModule.keys()).sort();

  sortedModules.forEach((moduleName) => {
    const moduleTodos = byModule.get(moduleName)!;
    console.log(`\n## ${moduleName} (${moduleTodos.length} TODOs)\n`);

    moduleTodos.forEach((todo) => {
      const relativePath = todo.file.split('/modules/')[1];
      console.log(`**[${todo.type}]** \`${relativePath}:${todo.line}\``);
      console.log(`  ${todo.content}`);
      console.log('');
    });
  });

  // Summary
  console.log('\n## Summary by Type\n');
  const byType = new Map<string, number>();
  todos.forEach((todo) => {
    byType.set(todo.type, (byType.get(todo.type) || 0) + 1);
  });

  Array.from(byType.keys())
    .sort()
    .forEach((type) => {
      console.log(`- ${type}: ${byType.get(type)}`);
    });
}

main();
