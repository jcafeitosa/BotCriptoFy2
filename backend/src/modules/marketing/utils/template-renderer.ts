/**
 * Template Renderer
 * Renders email templates with variable substitution
 */

import logger from '@/utils/logger';
import type { TemplateRenderContext } from '../types';

/**
 * Template Renderer class
 */
export class TemplateRenderer {
  /**
   * Render template with variables
   * Supports {{variable}} syntax
   */
  static render(template: string, context: TemplateRenderContext): string {
    let rendered = template;

    // Replace all {{variable}} patterns
    const variableRegex = /\{\{([^}]+)\}\}/g;

    rendered = rendered.replace(variableRegex, (match, variableName) => {
      const trimmedName = variableName.trim();

      // Handle nested variables (e.g., {{custom.field_name}})
      const value = this.resolveNestedVariable(trimmedName, context);

      if (value !== undefined && value !== null) {
        return String(value);
      }

      // Variable not found - keep placeholder or return empty
      logger.debug('Template variable not found', { variable: trimmedName });
      return ''; // Return empty string for missing variables
    });

    return rendered;
  }

  /**
   * Resolve nested variable (e.g., custom.field_name)
   */
  private static resolveNestedVariable(path: string, context: TemplateRenderContext): any {
    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Extract variables from template
   * Returns array of variable names
   */
  static extractVariables(template: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variableName = match[1].trim();
      if (!variables.includes(variableName)) {
        variables.push(variableName);
      }
    }

    return variables;
  }

  /**
   * Validate template (check for malformed variables)
   */
  static validate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unclosed variables
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push('Unclosed template variables detected');
    }

    // Check for empty variables
    if (template.includes('{{}}')) {
      errors.push('Empty template variables detected');
    }

    // Check for nested braces (not supported)
    if (/\{\{[^}]*\{\{/.test(template)) {
      errors.push('Nested template variables are not supported');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if all required variables are present in context
   */
  static checkRequiredVariables(
    template: string,
    context: TemplateRenderContext,
    requiredVars?: string[]
  ): { valid: boolean; missing: string[] } {
    const required = requiredVars || [];
    const missing: string[] = [];

    for (const varName of required) {
      const value = this.resolveNestedVariable(varName, context);
      if (value === undefined || value === null || value === '') {
        missing.push(varName);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Render subject line
   */
  static renderSubject(subject: string, context: TemplateRenderContext): string {
    return this.render(subject, context);
  }

  /**
   * Render HTML content
   */
  static renderHTML(htmlContent: string, context: TemplateRenderContext): string {
    return this.render(htmlContent, context);
  }

  /**
   * Render text content
   */
  static renderText(textContent: string, context: TemplateRenderContext): string {
    return this.render(textContent, context);
  }

  /**
   * Render complete email (subject, HTML, text)
   */
  static renderEmail(
    subject: string,
    htmlContent: string,
    textContent: string,
    context: TemplateRenderContext
  ): {
    subject: string;
    htmlContent: string;
    textContent: string;
  } {
    return {
      subject: this.renderSubject(subject, context),
      htmlContent: this.renderHTML(htmlContent, context),
      textContent: this.renderText(textContent, context),
    };
  }

  /**
   * Create standard context from lead data
   */
  static createLeadContext(
    lead: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      company?: string | null;
      jobTitle?: string | null;
      customFields?: Record<string, any> | null;
    },
    additionalContext?: Record<string, any>
  ): TemplateRenderContext {
    return {
      email: lead.email,
      first_name: lead.firstName || '',
      last_name: lead.lastName || '',
      company: lead.company || '',
      job_title: lead.jobTitle || '',
      custom: lead.customFields || {},
      ...additionalContext,
    };
  }

  /**
   * Add unsubscribe link to context
   */
  static addUnsubscribeLink(
    context: TemplateRenderContext,
    tenantId: string,
    email: string
  ): TemplateRenderContext {
    // Generate unsubscribe link
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const unsubscribeLink = `${baseUrl}/api/v1/marketing/unsubscribe?tenant=${tenantId}&email=${encodeURIComponent(email)}`;

    return {
      ...context,
      unsubscribe_link: unsubscribeLink,
    };
  }

  /**
   * Escape HTML in variable values (prevent XSS)
   */
  static escapeHTML(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char);
  }

  /**
   * Render template with HTML escaping
   */
  static renderSafe(template: string, context: TemplateRenderContext): string {
    // Escape all context values
    const safeContext: Record<string, any> = {};

    Object.entries(context).forEach(([key, value]) => {
      if (typeof value === 'string') {
        safeContext[key] = this.escapeHTML(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively escape nested objects
        safeContext[key] = this.escapeContextObject(value);
      } else {
        safeContext[key] = value;
      }
    });

    return this.render(template, safeContext);
  }

  /**
   * Recursively escape object values
   */
  private static escapeContextObject(obj: Record<string, any>): Record<string, any> {
    const escaped: Record<string, any> = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string') {
        escaped[key] = this.escapeHTML(value);
      } else if (typeof value === 'object' && value !== null) {
        escaped[key] = this.escapeContextObject(value);
      } else {
        escaped[key] = value;
      }
    });

    return escaped;
  }
}

/**
 * Convenience function for rendering templates
 */
export function renderTemplate(template: string, context: TemplateRenderContext): string {
  return TemplateRenderer.render(template, context);
}

/**
 * Convenience function for extracting variables
 */
export function extractTemplateVariables(template: string): string[] {
  return TemplateRenderer.extractVariables(template);
}
