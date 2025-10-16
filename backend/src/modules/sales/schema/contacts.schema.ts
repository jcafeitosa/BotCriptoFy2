/**
 * Contacts Schema
 * Customer and company contact management
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
import { leads } from '../../marketing/schema/leads.schema';
import { deals } from './deals.schema';
import { activities } from './activities.schema';
import { notes } from './notes.schema';

/**
 * Contact Type
 */
export type ContactType = 'person' | 'company';

/**
 * Address Structure
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

/**
 * Contacts Table
 * Unified contact management for people and companies
 */
export const contacts = pgTable(
  'contacts',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Contact Type
    type: varchar('type', { length: 20 }).notNull().$type<ContactType>(),

    // Personal Info (for 'person' type)
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),

    // Company Info (for 'company' type)
    companyName: varchar('company_name', { length: 255 }),

    // Communication
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    mobile: varchar('mobile', { length: 20 }),

    // Professional Info
    jobTitle: varchar('job_title', { length: 100 }),
    department: varchar('department', { length: 100 }),

    // Social & Web
    linkedinUrl: text('linkedin_url'),
    website: text('website'),

    // Location
    address: jsonb('address').$type<Address>(),

    // Classification
    tags: jsonb('tags').$type<string[]>().default([]),
    customFields: jsonb('custom_fields').$type<Record<string, any>>().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('contacts_tenant_id_idx').on(table.tenantId),
    emailIdx: index('contacts_email_idx').on(table.email),
    ownerIdIdx: index('contacts_owner_id_idx').on(table.ownerId),
    typeIdx: index('contacts_type_idx').on(table.type),
    leadIdIdx: index('contacts_lead_id_idx').on(table.leadId),
    tenantEmailUnique: unique('contacts_tenant_email_unique').on(table.tenantId, table.email),
  })
);

/**
 * Relations
 */
export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contacts.tenantId],
    references: [tenants.id],
  }),
  lead: one(leads, {
    fields: [contacts.leadId],
    references: [leads.id],
  }),
  owner: one(users, {
    fields: [contacts.ownerId],
    references: [users.id],
    relationName: 'contactOwner',
  }),
  creator: one(users, {
    fields: [contacts.createdBy],
    references: [users.id],
    relationName: 'contactCreator',
  }),
  deals: many(deals),
  activities: many(activities),
  notes: many(notes),
}));

/**
 * Type Exports
 */
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
