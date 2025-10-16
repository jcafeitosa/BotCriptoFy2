/**
 * Template Engine
 * Parses and processes notification templates with variable substitution
 */

/**
 * Template parser interface
 */
export interface TemplateVariables {
  [key: string]: any;
}

/**
 * Parse template and replace variables with values
 * Supports:
 * - Simple variables: {{name}}
 * - Nested objects: {{user.profile.name}}
 * - Arrays: {{items.0.name}}
 * - Default values: {{name|"Unknown"}}
 * - Conditional: {{#if condition}}content{{/if}}
 * - Loops: {{#each items}}{{name}}{{/each}}
 */
export function parseTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  // Process conditionals first
  result = processConditionals(result, variables);

  // Process loops
  result = processLoops(result, variables);

  // Process simple variable substitution
  result = processVariables(result, variables);

  return result;
}

/**
 * Process {{#if condition}}content{{/if}} blocks
 */
function processConditionals(template: string, variables: TemplateVariables): string {
  const conditionalRegex = /\{\{#if\s+([^\}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

  return template.replace(conditionalRegex, (match, condition, content) => {
    const conditionValue = getNestedValue(variables, condition.trim());

    // Check if condition is truthy
    if (isTruthy(conditionValue)) {
      return content;
    }

    return '';
  });
}

/**
 * Process {{#each collection}}content{{/each}} blocks
 */
function processLoops(template: string, variables: TemplateVariables): string {
  const loopRegex = /\{\{#each\s+([^\}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

  return template.replace(loopRegex, (match, collectionPath, content) => {
    const collection = getNestedValue(variables, collectionPath.trim());

    // If collection is not an array, return empty
    if (!Array.isArray(collection)) {
      return '';
    }

    // Render content for each item
    return collection
      .map((item, index) => {
        // Create scope with item data
        const itemScope = {
          ...variables,
          this: item,
          '@index': index,
          '@first': index === 0,
          '@last': index === collection.length - 1,
        };

        return processVariables(content, itemScope);
      })
      .join('');
  });
}

/**
 * Process {{variable}} and {{variable|"default"}} substitutions
 */
function processVariables(template: string, variables: TemplateVariables): string {
  const variableRegex = /\{\{([^\}]+)\}\}/g;

  return template.replace(variableRegex, (match, expression) => {
    const trimmed = expression.trim();

    // Check for default value syntax: variable|"default"
    const defaultMatch = trimmed.match(/^(.+?)\|(.+)$/);

    if (defaultMatch) {
      const [, variablePath, defaultValue] = defaultMatch;
      const value = getNestedValue(variables, variablePath.trim());

      if (value === undefined || value === null) {
        // Remove quotes from default value
        return defaultValue.trim().replace(/^["']|["']$/g, '');
      }

      return String(value);
    }

    // Simple variable substitution
    const value = getNestedValue(variables, trimmed);

    if (value === undefined || value === null) {
      return '';
    }

    return String(value);
  });
}

/**
 * Get nested value from object using dot notation
 * Examples:
 * - "user.name" → variables.user.name
 * - "items.0.title" → variables.items[0].title
 * - "this.name" → variables.this.name (for loop context)
 */
export function getNestedValue(obj: any, path: string): any {
  if (!path) return obj;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined;
    }

    // Handle array index access
    if (/^\d+$/.test(key)) {
      current = current[parseInt(key, 10)];
    } else {
      current = current[key];
    }
  }

  return current;
}

/**
 * Check if value is truthy for conditional logic
 */
function isTruthy(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;

  return Boolean(value);
}

/**
 * Validate template syntax
 * Returns array of errors if invalid, empty array if valid
 */
export function validateTemplate(template: string): string[] {
  const errors: string[] = [];

  // Check for unclosed tags
  const ifTags = (template.match(/\{\{#if/g) || []).length;
  const endIfTags = (template.match(/\{\{\/if\}\}/g) || []).length;

  if (ifTags !== endIfTags) {
    errors.push(`Unclosed {{#if}} tag: found ${ifTags} opening tags and ${endIfTags} closing tags`);
  }

  const eachTags = (template.match(/\{\{#each/g) || []).length;
  const endEachTags = (template.match(/\{\{\/each\}\}/g) || []).length;

  if (eachTags !== endEachTags) {
    errors.push(
      `Unclosed {{#each}} tag: found ${eachTags} opening tags and ${endEachTags} closing tags`
    );
  }

  // Check for malformed variable syntax
  const malformedVariables = template.match(/\{\{[^\}]*$/g);
  if (malformedVariables) {
    errors.push(`Malformed variable syntax: ${malformedVariables.join(', ')}`);
  }

  return errors;
}

/**
 * Extract all variable names from template
 * Useful for determining required variables
 */
export function extractVariables(template: string): string[] {
  const variables = new Set<string>();
  const variableRegex = /\{\{([^\}]+)\}\}/g;

  let match;
  while ((match = variableRegex.exec(template)) !== null) {
    const expression = match[1].trim();

    // Skip control structures
    if (
      expression.startsWith('#if') ||
      expression.startsWith('/if') ||
      expression.startsWith('#each') ||
      expression.startsWith('/each')
    ) {
      continue;
    }

    // Extract variable name (before pipe for default values)
    const variableName = expression.split('|')[0].trim();

    // Extract root variable name (before first dot)
    const rootVariable = variableName.split('.')[0];

    variables.add(rootVariable);
  }

  return Array.from(variables);
}

/**
 * Render template with error handling
 * Returns rendered template or error message
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): { success: boolean; result: string; errors?: string[] } {
  try {
    // Validate template first
    const validationErrors = validateTemplate(template);

    if (validationErrors.length > 0) {
      return {
        success: false,
        result: '',
        errors: validationErrors,
      };
    }

    // Parse and render
    const result = parseTemplate(template, variables);

    return {
      success: true,
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      result: '',
      errors: [errorMessage],
    };
  }
}

/**
 * Precompile template for better performance
 * (For future optimization - currently just validates)
 */
export function precompileTemplate(template: string): {
  isValid: boolean;
  variables: string[];
  errors?: string[];
} {
  const errors = validateTemplate(template);
  const variables = extractVariables(template);

  return {
    isValid: errors.length === 0,
    variables,
    errors: errors.length > 0 ? errors : undefined,
  };
}
