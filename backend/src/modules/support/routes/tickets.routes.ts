/**
 * Tickets Routes
 * API endpoints for support ticket management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { TicketsService } from '../services';
import logger from '@/utils/logger';

export const ticketsRoutes = new Elysia({ prefix: '/api/v1/support/tickets' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'support_manager', 'support_agent']))

  /**
   * POST /api/v1/support/tickets
   * Create new ticket
   */
  .post(
    '/',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const ticket = await TicketsService.createTicket(body, userId, tenantId);

        logger.info('Ticket created via API', { ticketId: ticket.id, tenantId });
        return { success: true, data: ticket };
      } catch (error) {
        logger.error('Error creating ticket', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        contactId: t.Optional(t.String()),
        subject: t.String({ minLength: 3, maxLength: 255 }),
        description: t.String({ minLength: 10 }),
        priority: t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high'), t.Literal('urgent')]),
        category: t.String({ maxLength: 100 }),
        source: t.Union([
          t.Literal('email'),
          t.Literal('phone'),
          t.Literal('chat'),
          t.Literal('web'),
          t.Literal('api'),
        ]),
        assignedTo: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
        customFields: t.Optional(t.Any()),
      }),
    }
  )

  /**
   * GET /api/v1/support/tickets
   * List tickets with filters
   */
  .get('/', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const filters = {
        status: query.status as any,
        priority: query.priority as any,
        category: query.category,
        assignedTo: query.assignedTo,
        contactId: query.contactId,
        source: query.source as any,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        sortBy: query.sortBy as any,
        sortOrder: query.sortOrder as any,
      };

      const result = await TicketsService.listTickets(filters, tenantId);

      return { success: true, data: result };
    } catch (error) {
      logger.error('Error listing tickets', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/tickets/:id
   * Get ticket by ID
   */
  .get('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const ticket = await TicketsService.getTicketById(params.id, tenantId);

      if (!ticket) {
        set.status = 404;
        return { success: false, error: 'Ticket not found' };
      }

      return { success: true, data: ticket };
    } catch (error) {
      logger.error('Error getting ticket', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/tickets/number/:number
   * Get ticket by number
   */
  .get('/number/:number', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const ticket = await TicketsService.getTicketByNumber(params.number, tenantId);

      if (!ticket) {
        set.status = 404;
        return { success: false, error: 'Ticket not found' };
      }

      return { success: true, data: ticket };
    } catch (error) {
      logger.error('Error getting ticket by number', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * PATCH /api/v1/support/tickets/:id
   * Update ticket
   */
  .patch(
    '/:id',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const ticket = await TicketsService.updateTicket(params.id, body, userId, tenantId);

        return { success: true, data: ticket };
      } catch (error) {
        logger.error('Error updating ticket', { error });
        set.status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        subject: t.Optional(t.String({ minLength: 3, maxLength: 255 })),
        description: t.Optional(t.String({ minLength: 10 })),
        priority: t.Optional(
          t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high'), t.Literal('urgent')])
        ),
        category: t.Optional(t.String({ maxLength: 100 })),
        assignedTo: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
        customFields: t.Optional(t.Any()),
      }),
    }
  )

  /**
   * DELETE /api/v1/support/tickets/:id
   * Delete ticket (soft delete)
   */
  .delete('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      await TicketsService.deleteTicket(params.id, userId, tenantId);

      return { success: true, message: 'Ticket deleted successfully' };
    } catch (error) {
      logger.error('Error deleting ticket', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/support/tickets/:id/assign
   * Assign ticket to user
   */
  .post(
    '/:id/assign',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const ticket = await TicketsService.assignTicket(params.id, body.assignedTo, userId, tenantId);

        return { success: true, data: ticket };
      } catch (error) {
        logger.error('Error assigning ticket', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        assignedTo: t.String(),
      }),
    }
  )

  /**
   * POST /api/v1/support/tickets/:id/status
   * Change ticket status
   */
  .post(
    '/:id/status',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const ticket = await TicketsService.changeStatus(params.id, body.status, userId, tenantId);

        return { success: true, data: ticket };
      } catch (error) {
        logger.error('Error changing ticket status', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal('new'),
          t.Literal('open'),
          t.Literal('pending'),
          t.Literal('on_hold'),
          t.Literal('resolved'),
          t.Literal('closed'),
        ]),
      }),
    }
  )

  /**
   * POST /api/v1/support/tickets/:id/resolve
   * Resolve ticket
   */
  .post(
    '/:id/resolve',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const ticket = await TicketsService.resolveTicket(params.id, body.resolutionNote, userId, tenantId);

        return { success: true, data: ticket };
      } catch (error) {
        logger.error('Error resolving ticket', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        resolutionNote: t.String({ minLength: 10 }),
      }),
    }
  )

  /**
   * POST /api/v1/support/tickets/:id/close
   * Close ticket
   */
  .post('/:id/close', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      const ticket = await TicketsService.closeTicket(params.id, userId, tenantId);

      return { success: true, data: ticket };
    } catch (error) {
      logger.error('Error closing ticket', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/support/tickets/:id/reopen
   * Reopen ticket
   */
  .post('/:id/reopen', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      const ticket = await TicketsService.reopenTicket(params.id, userId, tenantId);

      return { success: true, data: ticket };
    } catch (error) {
      logger.error('Error reopening ticket', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/support/tickets/:id/messages
   * Add message to ticket
   */
  .post(
    '/:id/messages',
    async ({ params, body, set, session }) => {
      try {
        const userId = (session as any)?.userId;

        const message = await TicketsService.addMessage(params.id, body, userId);

        return { success: true, data: message };
      } catch (error) {
        logger.error('Error adding message', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        message: t.String({ minLength: 1 }),
        isInternal: t.Optional(t.Boolean()),
        isFromCustomer: t.Optional(t.Boolean()),
        attachments: t.Optional(t.Array(t.Any())),
      }),
    }
  )

  /**
   * GET /api/v1/support/tickets/:id/messages
   * Get ticket messages
   */
  .get('/:id/messages', async ({ params, set }) => {
    try {
      const messages = await TicketsService.getTicketMessages(params.id);

      return { success: true, data: messages };
    } catch (error) {
      logger.error('Error getting messages', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/support/tickets/:id/satisfaction
   * Rate ticket satisfaction
   */
  .post(
    '/:id/satisfaction',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const ticket = await TicketsService.rateSatisfaction(
          params.id,
          body.rating,
          body.comment,
          tenantId
        );

        return { success: true, data: ticket };
      } catch (error) {
        logger.error('Error rating satisfaction', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        rating: t.Integer({ minimum: 1, maximum: 5 }),
        comment: t.Optional(t.String()),
      }),
    }
  )

  /**
   * GET /api/v1/support/tickets/:id/timeline
   * Get ticket timeline
   */
  .get('/:id/timeline', async ({ params, set }) => {
    try {
      const timeline = await TicketsService.getTicketTimeline(params.id);

      return { success: true, data: timeline };
    } catch (error) {
      logger.error('Error getting timeline', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
