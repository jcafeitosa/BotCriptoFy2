import { db } from '@/db';
import { and, desc, eq } from 'drizzle-orm';
import { emailTemplates } from '../schema/templates.schema';
import type {
  CreateTemplateData,
  UpdateTemplateData,
  TemplateRenderContext,
  EmailTemplate,
} from '../types';
import { TemplateRenderer } from '../utils/template-renderer';
import logger from '@/utils/logger';

export class TemplateService {
  static async createTemplate(
    tenantId: string,
    userId: string,
    data: CreateTemplateData,
  ): Promise<EmailTemplate> {
    const [template] = await db
      .insert(emailTemplates)
      .values({
        tenantId,
        createdBy: userId,
        ...data,
      })
      .returning();

    logger.info('Email template created', { templateId: template.id, tenantId });
    return template;
  }

  static async listTemplates(tenantId: string, category?: string): Promise<EmailTemplate[]> {
    const conditions = [eq(emailTemplates.tenantId, tenantId), eq(emailTemplates.isActive, true)];
    if (category) {
      conditions.push(eq(emailTemplates.category, category));
    }

    return db
      .select()
      .from(emailTemplates)
      .where(and(...conditions))
      .orderBy(desc(emailTemplates.createdAt));
  }

  static async getTemplate(tenantId: string, id: string): Promise<EmailTemplate | null> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId)))
      .limit(1);

    return template ?? null;
  }

  static async updateTemplate(
    tenantId: string,
    id: string,
    data: UpdateTemplateData,
  ): Promise<EmailTemplate | null> {
    const [updated] = await db
      .update(emailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  }

  static async deactivateTemplate(tenantId: string, id: string): Promise<void> {
    await db
      .update(emailTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId)));
  }

  static async previewTemplate(
    template: EmailTemplate,
    context: TemplateRenderContext,
  ): Promise<{ subject: string; html: string; text: string }> {
    return TemplateRenderer.renderEmail(
      template.subject,
      template.htmlContent,
      template.textContent,
      context,
    );
  }
}

export default TemplateService;
