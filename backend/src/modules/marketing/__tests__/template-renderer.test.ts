/**
 * Template Renderer Tests
 */

import { describe, it, expect } from 'bun:test';
import { TemplateRenderer, renderTemplate, extractTemplateVariables } from '../utils/template-renderer';

describe('TemplateRenderer', () => {
  describe('render', () => {
    it('should render simple variables', () => {
      const template = 'Hello {{first_name}}!';
      const context = { first_name: 'John' };
      const result = TemplateRenderer.render(template, context);
      expect(result).toBe('Hello John!');
    });

    it('should render multiple variables', () => {
      const template = 'Hello {{first_name}} {{last_name}}!';
      const context = { first_name: 'John', last_name: 'Doe' };
      const result = TemplateRenderer.render(template, context);
      expect(result).toBe('Hello John Doe!');
    });

    it('should render nested variables', () => {
      const template = 'Email: {{custom.email_field}}';
      const context = { custom: { email_field: 'test@example.com' } };
      const result = TemplateRenderer.render(template, context);
      expect(result).toBe('Email: test@example.com');
    });

    it('should handle missing variables', () => {
      const template = 'Hello {{first_name}}!';
      const context = {};
      const result = TemplateRenderer.render(template, context);
      expect(result).toBe('Hello !');
    });

    it('should handle whitespace in variable names', () => {
      const template = 'Hello {{ first_name }}!';
      const context = { first_name: 'John' };
      const result = TemplateRenderer.render(template, context);
      expect(result).toBe('Hello John!');
    });
  });

  describe('extractVariables', () => {
    it('should extract all variables from template', () => {
      const template = 'Hello {{first_name}} {{last_name}}, your email is {{email}}';
      const variables = TemplateRenderer.extractVariables(template);
      expect(variables).toEqual(['first_name', 'last_name', 'email']);
    });

    it('should extract unique variables only', () => {
      const template = 'Hi {{name}}! Welcome {{name}}.';
      const variables = TemplateRenderer.extractVariables(template);
      expect(variables).toEqual(['name']);
    });

    it('should extract nested variables', () => {
      const template = 'Company: {{custom.company}}';
      const variables = TemplateRenderer.extractVariables(template);
      expect(variables).toEqual(['custom.company']);
    });
  });

  describe('validate', () => {
    it('should validate correct templates', () => {
      const template = 'Hello {{first_name}}!';
      const result = TemplateRenderer.validate(template);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect unclosed variables', () => {
      const template = 'Hello {{first_name}';
      const result = TemplateRenderer.validate(template);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unclosed template variables detected');
    });

    it('should detect empty variables', () => {
      const template = 'Hello {{}}!';
      const result = TemplateRenderer.validate(template);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty template variables detected');
    });
  });

  describe('checkRequiredVariables', () => {
    it('should pass when all required variables present', () => {
      const template = 'Hello {{first_name}}!';
      const context = { first_name: 'John' };
      const result = TemplateRenderer.checkRequiredVariables(template, context, ['first_name']);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should fail when required variables missing', () => {
      const template = 'Hello {{first_name}}!';
      const context = {};
      const result = TemplateRenderer.checkRequiredVariables(template, context, ['first_name']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['first_name']);
    });
  });

  describe('renderEmail', () => {
    it('should render complete email', () => {
      const subject = 'Welcome {{first_name}}!';
      const html = '<h1>Hello {{first_name}} {{last_name}}</h1>';
      const text = 'Hello {{first_name}} {{last_name}}';
      const context = { first_name: 'John', last_name: 'Doe' };

      const result = TemplateRenderer.renderEmail(subject, html, text, context);

      expect(result.subject).toBe('Welcome John!');
      expect(result.htmlContent).toBe('<h1>Hello John Doe</h1>');
      expect(result.textContent).toBe('Hello John Doe');
    });
  });

  describe('createLeadContext', () => {
    it('should create context from lead data', () => {
      const lead = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        jobTitle: 'CEO',
        customFields: { industry: 'tech' },
      };

      const context = TemplateRenderer.createLeadContext(lead);

      expect(context.email).toBe('test@example.com');
      expect(context.first_name).toBe('John');
      expect(context.last_name).toBe('Doe');
      expect(context.company).toBe('Acme Inc');
      expect(context.job_title).toBe('CEO');
      expect(context.custom).toEqual({ industry: 'tech' });
    });

    it('should handle null values', () => {
      const lead = {
        email: 'test@example.com',
        firstName: null,
        lastName: null,
        company: null,
        jobTitle: null,
        customFields: null,
      };

      const context = TemplateRenderer.createLeadContext(lead);

      expect(context.first_name).toBe('');
      expect(context.last_name).toBe('');
      expect(context.custom).toEqual({});
    });
  });

  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      expect(TemplateRenderer.escapeHTML('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
      expect(TemplateRenderer.escapeHTML('A & B')).toBe('A &amp; B');
    });
  });

  describe('convenience functions', () => {
    it('renderTemplate should work', () => {
      expect(renderTemplate('Hello {{name}}', { name: 'John' })).toBe('Hello John');
    });

    it('extractTemplateVariables should work', () => {
      expect(extractTemplateVariables('{{a}} {{b}}')).toEqual(['a', 'b']);
    });
  });
});
