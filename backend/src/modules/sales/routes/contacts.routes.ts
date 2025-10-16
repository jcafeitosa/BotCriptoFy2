/**
 * Contacts Routes
 * API endpoints for contact management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { ContactsService } from '../services';
import logger from '@/utils/logger';

export const contactsRoutes = new Elysia({ prefix: '/api/v1/sales/contacts' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'sales_manager', 'sales_rep']))

  /**
   * POST /api/v1/sales/contacts
   * Create new contact
   */
  .post(
    '/',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const contact = await ContactsService.createContact(body, userId, tenantId);

        logger.info('Contact created', { contactId: contact.id, tenantId });
        return { success: true, data: contact };
      } catch (error) {
        logger.error('Error creating contact', { error });
        set.status = error instanceof Error && error.message.includes('already exists') ? 409 : 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        type: t.Union([t.Literal('person'), t.Literal('company')]),
        email: t.String({ format: 'email' }),
        firstName: t.Optional(t.String({ maxLength: 100 })),
        lastName: t.Optional(t.String({ maxLength: 100 })),
        companyName: t.Optional(t.String({ maxLength: 255 })),
        phone: t.Optional(t.String({ maxLength: 20 })),
        mobile: t.Optional(t.String({ maxLength: 20 })),
        jobTitle: t.Optional(t.String({ maxLength: 100 })),
        department: t.Optional(t.String({ maxLength: 100 })),
        linkedinUrl: t.Optional(t.String()),
        website: t.Optional(t.String()),
        address: t.Optional(t.Any()),
        tags: t.Optional(t.Array(t.String())),
        customFields: t.Optional(t.Any()),
        ownerId: t.Optional(t.String()),
        leadId: t.Optional(t.String()),
      }),
    }
  )

  /**
   * POST /api/v1/sales/contacts/from-lead/:leadId
   * Convert lead to contact
   */
  .post('/from-lead/:leadId', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      const contact = await ContactsService.createFromLead(params.leadId, userId, tenantId);

      logger.info('Lead converted to contact', { contactId: contact.id, leadId: params.leadId });
      return { success: true, data: contact };
    } catch (error) {
      logger.error('Error converting lead', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/sales/contacts
   * List contacts with filters
   */
  .get('/list', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const filters = {
        type: query.type as any,
        ownerId: query.ownerId,
        tags: query.tags ? (query.tags as string).split(',') : undefined,
        search: query.search,
        limit: query.limit ? Number(query.limit) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      };

      const result = await ContactsService.listContacts(filters, tenantId);

      return {
        success: true,
        data: result.contacts,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      };
    } catch (error) {
      logger.error('Error listing contacts', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/sales/contacts/:id
   * Get contact by ID
   */
  .get('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const contact = await ContactsService.getContactById(params.id, tenantId);

      if (!contact) {
        set.status = 404;
        return { success: false, error: 'Contact not found' };
      }

      return { success: true, data: contact };
    } catch (error) {
      logger.error('Error getting contact', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * PATCH /api/v1/sales/contacts/:id
   * Update contact
   */
  .patch(
    '/:id',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const contact = await ContactsService.updateContact(params.id, body, tenantId);

        return { success: true, data: contact };
      } catch (error) {
        logger.error('Error updating contact', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Partial(
        t.Object({
          firstName: t.String({ maxLength: 100 }),
          lastName: t.String({ maxLength: 100 }),
          companyName: t.String({ maxLength: 255 }),
          phone: t.String({ maxLength: 20 }),
          mobile: t.String({ maxLength: 20 }),
          jobTitle: t.String({ maxLength: 100 }),
          department: t.String({ maxLength: 100 }),
          linkedinUrl: t.String(),
          website: t.String(),
          address: t.Any(),
          tags: t.Array(t.String()),
          customFields: t.Any(),
          ownerId: t.String(),
        })
      ),
    }
  )

  /**
   * DELETE /api/v1/sales/contacts/:id
   * Delete contact
   */
  .delete('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      await ContactsService.deleteContact(params.id, tenantId);

      return { success: true, message: 'Contact deleted successfully' };
    } catch (error) {
      logger.error('Error deleting contact', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/sales/contacts/search
   * Search contacts
   */
  .get('/search/query', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      if (!query.q) {
        set.status = 400;
        return { success: false, error: 'Search query is required' };
      }

      const contacts = await ContactsService.searchContacts(query.q, tenantId);

      return { success: true, data: contacts };
    } catch (error) {
      logger.error('Error searching contacts', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/sales/contacts/:id/merge/:targetId
   * Merge duplicate contacts
   */
  .post('/merge/:sourceId/:targetId', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const contact = await ContactsService.mergeContacts(
        params.sourceId,
        params.targetId,
        tenantId
      );

      logger.info('Contacts merged', { sourceId: params.sourceId, targetId: params.targetId });
      return { success: true, data: contact };
    } catch (error) {
      logger.error('Error merging contacts', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/sales/contacts/:id/timeline
   * Get contact timeline (activities, notes, deals)
   */
  .get('/:id/timeline', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const timeline = await ContactsService.getContactTimeline(params.id, tenantId);

      return { success: true, data: timeline };
    } catch (error) {
      logger.error('Error getting contact timeline', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
