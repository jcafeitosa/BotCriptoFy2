/**
 * Comprehensive Database Seed
 *
 * Seeds the database with 100+ users and complete test data for ALL implemented modules.
 *
 * ⚠️  IMPORTANT: This seed assumes a FRESH database or will skip existing roles/permissions.
 *
 * Run with: bun src/db/seed-comprehensive.ts
 */

import { db } from './connection';
import { users } from '../modules/auth/schema/auth.schema';
import { tenants, tenantMembers } from '../modules/tenants/schema/tenants.schema';
import { departments } from '../modules/departments/schema/departments.schema';
import {
  subscriptionPlans,
  tenantSubscriptionPlans,
} from '../modules/subscriptions/schema/subscription-plans.schema';
import {
  invoices,
  expenses,
  budgets,
  budgetLines,
} from '../modules/financial/schema';
import {
  taxJurisdictionConfig,
  taxReports,
} from '../modules/financial/schema/tax-jurisdiction.schema';
import { notifications } from '../modules/notifications/schema/notifications.schema';
import { auditLogs } from '../modules/audit/schema/audit.schema';
import {
  ceoDashboardConfigs,
  ceoKpis,
  ceoAlerts,
} from '../modules/ceo/schema/ceo.schema';
import {
  roles,
  permissions,
  rolePermissions,
  rbacUserRoles,
} from '../modules/security/schema/security.schema';
import { eq as _eq } from 'drizzle-orm';

// Helper functions for generating realistic data
function generateId(): string {
  return crypto.randomUUID();
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals: number = 2): string {
  return (Math.random() * (max - min) + min).toFixed(decimals);
}

// Realistic data sets
const firstNames = [
  'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Rafael', 'Fernanda',
  'Lucas', 'Camila', 'Marcelo', 'Patricia', 'Bruno', 'Amanda', 'Felipe',
  'Larissa', 'Gustavo', 'Beatriz', 'Rodrigo', 'Gabriela', 'Thiago', 'Mariana',
  'Diego', 'Carolina', 'Vinicius', 'Isabela', 'Leonardo', 'Leticia', 'André',
  'Natália', 'Ricardo', 'Vanessa', 'Paulo', 'Aline', 'Henrique', 'Renata',
  'Fabio', 'Priscila', 'Leandro', 'Sandra', 'Alex', 'Tatiana', 'Igor', 'Daniela',
  'Eduardo', 'Julia', 'Caio', 'Roberta', 'Daniel', 'Michele',
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
  'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Rocha',
  'Almeida', 'Nascimento', 'Barbosa', 'Araújo', 'Cardoso', 'Monteiro', 'Pinto',
  'Dias', 'Vieira', 'Castro', 'Teixeira', 'Mendes', 'Moreira', 'Freitas', 'Correia',
];

const companyNames = [
  'TechNova Solutions', 'Digital Ventures', 'CloudSync Technologies', 'DataFlow Systems',
  'InnovateCorp', 'FutureTech Holdings', 'SmartBiz Solutions', 'AlphaTrade Group',
  'BetaFinance Corp', 'GammaInvest', 'DeltaCapital', 'EpsilonTech', 'OmegaGroup',
  'QuantumLeap Technologies', 'NexGen Solutions', 'PrimeData Analytics',
  'SyncWave Systems', 'CryptoEdge Trading', 'BlockChain Ventures', 'DeFi Partners',
];

const departmentTypes = [
  'finance', 'marketing', 'sales', 'operations', 'support', 'engineering',
  'hr', 'legal', 'product', 'research',
];

async function seedComprehensive() {
  console.log('🌱 Starting comprehensive database seed...\n');

  const stats = {
    users: 0,
    tenants: 0,
    departments: 0,
    subscriptions: 0,
    invoices: 0,
    expenses: 0,
    budgets: 0,
    notifications: 0,
    auditLogs: 0,
    ceoData: 0,
    roles: 0,
    permissions: 0,
  };

  try {
    // ============================================================================
    // 1. SECURITY: Roles and Permissions (Skip if exist)
    // ============================================================================
    console.log('📋 Seeding Roles and Permissions...');

    const roleIds: Record<string, string> = {};

    // Check if roles already exist
    const existingRoles = await db.select().from(roles);

    if (existingRoles.length > 0) {
      console.log('⚠️  Roles already exist. Using existing roles.');
      for (const role of existingRoles) {
        roleIds[role.name] = role.id;
      }
      stats.roles = existingRoles.length;

      // Debug: show role IDs
      console.log('Role IDs:', roleIds);
    } else {
      // Create roles
      const systemRoles = [
        { name: 'super_admin', description: 'Super Administrator with full system access', level: '0', isSystem: true },
        { name: 'ceo', description: 'Chief Executive Officer', level: '1', isSystem: true },
        { name: 'admin', description: 'Tenant Administrator', level: '2', isSystem: true },
        { name: 'manager', description: 'Department Manager', level: '3', isSystem: true },
        { name: 'financial', description: 'Financial User', level: '4', isSystem: true },
        { name: 'marketing', description: 'Marketing User', level: '4', isSystem: true },
        { name: 'sales', description: 'Sales User', level: '4', isSystem: true },
        { name: 'user', description: 'Regular User', level: '5', isSystem: true },
        { name: 'viewer', description: 'Read-only Viewer', level: '6', isSystem: true },
      ];

      for (const role of systemRoles) {
        const [insertedRole] = await db.insert(roles).values(role).returning();
        roleIds[role.name] = insertedRole.id;
        stats.roles++;
      }
    }

    // Check if permissions already exist
    const existingPermissions = await db.select().from(permissions);

    const permissionIds: string[] = [];

    if (existingPermissions.length > 0) {
      console.log('⚠️  Permissions already exist. Using existing permissions.');
      for (const perm of existingPermissions) {
        permissionIds.push(perm.id);
      }
      stats.permissions = existingPermissions.length;
    } else {
      // Create permissions
      const systemPermissions = [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'write' },
        { resource: 'users', action: 'delete' },
        { resource: 'tenants', action: 'read' },
        { resource: 'tenants', action: 'write' },
        { resource: 'tenants', action: 'manage' },
        { resource: 'financial', action: 'read' },
        { resource: 'financial', action: 'write' },
        { resource: 'financial', action: 'approve' },
        { resource: 'ceo', action: 'read' },
        { resource: 'ceo', action: 'manage' },
        { resource: 'notifications', action: 'read' },
        { resource: 'notifications', action: 'send' },
      ];

      for (const perm of systemPermissions) {
        const [insertedPerm] = await db.insert(permissions).values(perm).returning();
        permissionIds.push(insertedPerm.id);
        stats.permissions++;
      }

      // Assign permissions to roles (only if we created new ones)
      const permissionsMap = {
        super_admin: permissionIds,
        ceo: permissionIds.slice(0, 11),
        admin: permissionIds.slice(0, 9),
        manager: permissionIds.slice(0, 7),
        financial: [permissionIds[0], permissionIds[6], permissionIds[7], permissionIds[8]],
        user: [permissionIds[0], permissionIds[3], permissionIds[6]],
      };

      for (const [roleName, perms] of Object.entries(permissionsMap)) {
        for (const permId of perms) {
          await db.insert(rolePermissions).values({
            roleId: roleIds[roleName],
            permissionId: permId,
          });
        }
      }
    }

    console.log(`✅ ${stats.roles} roles and ${stats.permissions} permissions ready\n`);

    // ============================================================================
    // 2. USERS (100+)
    // ============================================================================
    console.log('👥 Seeding Users...');

    const usersByRole: Record<string, any[]> = {
      ceo: [],
      admin: [],
      manager: [],
      financial: [],
      marketing: [],
      sales: [],
      user: [],
    };

    const roleDistribution = [
      { role: 'ceo', count: 5 },
      { role: 'admin', count: 10 },
      { role: 'manager', count: 15 },
      { role: 'financial', count: 20 },
      { role: 'marketing', count: 15 },
      { role: 'sales', count: 15 },
      { role: 'user', count: 20 },
    ];

    for (const { role, count } of roleDistribution) {
      for (let i = 0; i < count; i++) {
        const firstName = randomElement(firstNames);
        const lastName = randomElement(lastNames);
        const userId = generateId();
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${role}.${i}@beecripto.com`;

        const [user] = await db
          .insert(users)
          .values({
            id: userId,
            name: `${firstName} ${lastName}`,
            email,
            emailVerified: true,
            image: `https://api.dicebear.com/7.x/avatars/svg?seed=${userId}`,
            createdAt: randomDate(new Date('2024-01-01'), new Date('2025-01-01')),
          })
          .returning();

        usersByRole[role].push(user);
        stats.users++;
      }
    }

    console.log(`✅ Created ${stats.users} users\n`);

    // ============================================================================
    // 3. TENANTS (20 total)
    // ============================================================================
    console.log('🏢 Seeding Tenants...');

    const allTenants: any[] = [];

    // 10 Company tenants (1:N)
    for (let i = 0; i < 10; i++) {
      const companyName = companyNames[i];
      const [tenant] = await db
        .insert(tenants)
        .values({
          id: generateId(),
          name: companyName,
          slug: companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          type: 'empresa',
          status: 'active',
          settings: JSON.stringify({ timezone: 'America/Sao_Paulo' }),
          metadata: JSON.stringify({ industry: randomElement(['tech', 'finance', 'retail']) }),
        })
        .returning();

      allTenants.push(tenant);
      stats.tenants++;
    }

    // 10 Individual trader tenants (1:1)
    for (let i = 0; i < 10; i++) {
      const traderName = `${randomElement(firstNames)} ${randomElement(lastNames)} Trading`;
      const [tenant] = await db
        .insert(tenants)
        .values({
          id: generateId(),
          name: traderName,
          slug: `${traderName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${i}`,
          type: 'trader',
          status: 'active',
          settings: JSON.stringify({ timezone: 'America/Sao_Paulo' }),
          metadata: JSON.stringify({ tradingStyle: randomElement(['day', 'swing', 'scalping']) }),
        })
        .returning();

      allTenants.push(tenant);
      stats.tenants++;
    }

    console.log(`✅ Created ${stats.tenants} tenants\n`);

    // ============================================================================
    // 4. TENANT MEMBERSHIPS & RBAC USER ROLES
    // ============================================================================
    console.log('🔗 Seeding Tenant Memberships and RBAC Roles...');

    let memberCount = 0;

    // Assign CEOs to company tenants
    for (let i = 0; i < 5; i++) {
      const tenant = allTenants[i];
      const ceo = usersByRole.ceo[i];

      await db.insert(tenantMembers).values({
        id: generateId(),
        tenantId: tenant.id,
        userId: ceo.id,
        role: 'ceo',
        status: 'active',
      });

      await db.insert(rbacUserRoles).values({
        userId: ceo.id,
        roleId: roleIds.ceo,
        tenantId: tenant.id,
      });

      memberCount++;
    }

    // Assign admins to company tenants
    for (let i = 0; i < 10; i++) {
      const tenant = allTenants[i % 10];
      const admin = usersByRole.admin[i];

      await db.insert(tenantMembers).values({
        id: generateId(),
        tenantId: tenant.id,
        userId: admin.id,
        role: 'admin',
        status: 'active',
      });

      await db.insert(rbacUserRoles).values({
        userId: admin.id,
        roleId: roleIds.admin,
        tenantId: tenant.id,
      });

      memberCount++;
    }

    // Assign managers, financial, marketing, sales users
    const allEmployeeRoles = [
      ...usersByRole.manager,
      ...usersByRole.financial,
      ...usersByRole.marketing,
      ...usersByRole.sales,
      ...usersByRole.user,
    ];

    for (const user of allEmployeeRoles) {
      const tenant = randomElement(allTenants.slice(0, 10)); // Only company tenants

      let userRole = 'user';
      let roleId = roleIds.user;

      if (usersByRole.manager.includes(user)) {
        userRole = 'manager';
        roleId = roleIds.manager;
      } else if (usersByRole.financial.includes(user)) {
        userRole = 'funcionario';
        roleId = roleIds.financial;
      } else if (usersByRole.marketing.includes(user)) {
        userRole = 'funcionario';
        roleId = roleIds.marketing;
      } else if (usersByRole.sales.includes(user)) {
        userRole = 'funcionario';
        roleId = roleIds.sales;
      }

      await db.insert(tenantMembers).values({
        id: generateId(),
        tenantId: tenant.id,
        userId: user.id,
        role: userRole,
        status: 'active',
      });

      await db.insert(rbacUserRoles).values({
        userId: user.id,
        roleId: roleId,
        tenantId: tenant.id,
      });

      memberCount++;
    }

    // Assign traders to trader tenants (1:1)
    for (let i = 10; i < 20; i++) {
      const tenant = allTenants[i];
      const trader = usersByRole.user[i - 10] || usersByRole.user[0];

      await db.insert(tenantMembers).values({
        id: generateId(),
        tenantId: tenant.id,
        userId: trader.id,
        role: 'trader',
        status: 'active',
      });

      await db.insert(rbacUserRoles).values({
        userId: trader.id,
        roleId: roleIds.user,
        tenantId: tenant.id,
      });

      memberCount++;
    }

    console.log(`✅ Created ${memberCount} tenant memberships\n`);

    // ============================================================================
    // 5. DEPARTMENTS (50 total)
    // ============================================================================
    console.log('🏛️ Seeding Departments...');

    const allDepartments: any[] = [];

    for (const tenant of allTenants.slice(0, 10)) {
      // Only company tenants
      const deptCount = randomNumber(3, 7);
      for (let i = 0; i < deptCount; i++) {
        const deptType = randomElement(departmentTypes);
        const [dept] = await db
          .insert(departments)
          .values({
            tenantId: tenant.id,
            name: `${deptType.charAt(0).toUpperCase() + deptType.slice(1)} Department`,
            slug: `${deptType}-${tenant.slug}-${i}`,
            description: `${deptType} department for ${tenant.name}`,
            type: deptType,
            isActive: true,
          })
          .returning();

        allDepartments.push(dept);
        stats.departments++;
      }
    }

    console.log(`✅ Created ${stats.departments} departments\n`);

    // ============================================================================
    // 6. SUBSCRIPTION PLANS (Check if exist first)
    // ============================================================================
    console.log('💳 Seeding Subscription Plans...');

    const planIds: Record<string, string> = {};

    // Check if plans already exist
    const existingPlans = await db.select().from(subscriptionPlans);

    if (existingPlans.length > 0) {
      console.log('⚠️  Subscription plans already exist. Using existing plans.');
      for (const plan of existingPlans) {
        planIds[plan.slug] = plan.id;
      }
    } else {
      const plans = [
        {
          name: 'Starter',
          displayName: 'Starter Plan',
          description: 'Perfect for getting started',
          slug: 'starter',
          priceMonthly: '199.00',
          priceYearly: '1990.00',
          limits: {
            maxBots: 2,
            maxStrategies: 5,
            maxBacktests: 100,
            maxExchanges: 2,
            maxApiCalls: 10000,
            maxWebhooks: 2,
            maxAlerts: 10,
            maxOrders: 100,
            storageGB: 5,
            historicalDataMonths: 6,
            aiModelAccess: false,
            prioritySupport: false,
            customDomain: false,
            whiteLabel: false,
            apiAccess: true,
            webhookAccess: false,
          },
          features: ['basic_trading', 'basic_analytics', 'email_support'],
        },
        {
          name: 'Pro',
          displayName: 'Professional Plan',
          description: 'For serious traders',
          slug: 'pro',
          priceMonthly: '499.00',
          priceYearly: '4990.00',
          limits: {
            maxBots: 10,
            maxStrategies: 20,
            maxBacktests: 500,
            maxExchanges: 5,
            maxApiCalls: 50000,
            maxWebhooks: 10,
            maxAlerts: 50,
            maxOrders: 1000,
            storageGB: 50,
            historicalDataMonths: 24,
            aiModelAccess: true,
            prioritySupport: true,
            customDomain: false,
            whiteLabel: false,
            apiAccess: true,
            webhookAccess: true,
          },
          features: ['advanced_trading', 'ai_analytics', 'priority_support', 'webhooks'],
        },
        {
          name: 'Enterprise',
          displayName: 'Enterprise Plan',
          description: 'Custom solution for enterprises',
          slug: 'enterprise',
          priceMonthly: '2999.00',
          priceYearly: '29990.00',
          limits: {
            maxBots: 100,
            maxStrategies: 100,
            maxBacktests: 10000,
            maxExchanges: 20,
            maxApiCalls: 1000000,
            maxWebhooks: 50,
            maxAlerts: 500,
            maxOrders: 10000,
            storageGB: 500,
            historicalDataMonths: 60,
            aiModelAccess: true,
            prioritySupport: true,
            customDomain: true,
            whiteLabel: true,
            apiAccess: true,
            webhookAccess: true,
          },
          features: [
            'unlimited_trading',
            'custom_ai_models',
            'dedicated_support',
            'white_label',
            'custom_domain',
          ],
        },
        {
          name: 'Internal',
          displayName: 'Internal Plan',
          description: 'For internal team use',
          slug: 'internal',
          priceMonthly: '0.00',
          priceYearly: '0.00',
          isPublic: false,
          limits: {
            maxBots: 1000,
            maxStrategies: 1000,
            maxBacktests: 100000,
            maxExchanges: 100,
            maxApiCalls: 10000000,
            maxWebhooks: 100,
            maxAlerts: 1000,
            maxOrders: 100000,
            storageGB: 1000,
            historicalDataMonths: 120,
            aiModelAccess: true,
            prioritySupport: true,
            customDomain: true,
            whiteLabel: true,
            apiAccess: true,
            webhookAccess: true,
          },
          features: ['all_features'],
        },
      ];

      for (const plan of plans) {
        const [insertedPlan] = await db.insert(subscriptionPlans).values(plan as any).returning();
        planIds[plan.slug] = insertedPlan.id;
      }

      console.log(`✅ Created ${plans.length} subscription plans`);
    }

    console.log('');

    // ============================================================================
    // 7. TENANT SUBSCRIPTIONS (100 total)
    // ============================================================================
    console.log('📊 Seeding Tenant Subscriptions...');

    const subscriptionDistribution = [
      { plan: 'starter', count: 30 },
      { plan: 'pro', count: 50 },
      { plan: 'enterprise', count: 15 },
      { plan: 'internal', count: 5 },
    ];

    const statuses = ['active', 'past_due', 'trialing'] as const;
    const periods = ['monthly', 'yearly'] as const;

    for (const { plan, count } of subscriptionDistribution) {
      for (let i = 0; i < count; i++) {
        const tenant = randomElement(allTenants);
        const status = i < count * 0.8 ? 'active' : randomElement(statuses);
        const billingPeriod = randomElement(periods);
        const startDate = randomDate(new Date('2024-01-01'), new Date('2025-01-01'));
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + (billingPeriod === 'monthly' ? 1 : 12));

        await db.insert(tenantSubscriptionPlans).values({
          tenantId: tenant.id,
          planId: planIds[plan],
          status,
          billingPeriod,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: `sub_${generateId().substring(0, 24)}`,
          stripeCustomerId: `cus_${generateId().substring(0, 24)}`,
        });

        stats.subscriptions++;
      }
    }

    console.log(`✅ Created ${stats.subscriptions} subscriptions\n`);

    // ============================================================================
    // 8. TAX JURISDICTION CONFIG (Skip if exists)
    // ============================================================================
    console.log('🌍 Seeding Tax Jurisdiction Config...');

    const existingTaxConfig = await db.select().from(taxJurisdictionConfig).limit(1);

    if (existingTaxConfig.length === 0) {
      await db.insert(taxJurisdictionConfig).values({
        jurisdiction: 'BR',
        countryName: 'Brazil',
        countryCode: 'BRA',
        flag: '🇧🇷',
        currency: 'BRL',
        currencySymbol: 'R$',
        locale: 'pt-BR',
        taxSystem: {
          vatRates: { standard: 17, reduced: 7, zero: 0 },
          corporateTaxRates: { standard: 24 },
          personalIncomeTax: {
            type: 'progressive',
            brackets: [
              { min: 0, max: 22847.76, rate: 0 },
              { min: 22847.77, max: 33919.8, rate: 7.5 },
              { min: 33919.81, max: 45012.6, rate: 15 },
              { min: 45012.61, max: 55976.16, rate: 22.5 },
              { min: 55976.17, max: 999999999, rate: 27.5 },
            ],
          },
          specialFeatures: ['SPED', 'NF-e', 'NFS-e'],
          complianceRequirements: ['Monthly tax reports', 'Annual declarations'],
        },
        status: 'active',
        isActive: true,
        configuredBy: usersByRole.ceo[0].id,
        configuredByRole: 'CEO',
      });

      console.log('✅ Created tax jurisdiction config');
    } else {
      console.log('⚠️  Tax jurisdiction config already exists');
    }

    console.log('');

    // ============================================================================
    // 9. FINANCIAL DATA
    // ============================================================================
    console.log('💰 Seeding Financial Data...');

    // 9.1 Invoices (200 total)
    const invoiceStatuses = ['paid', 'pending', 'overdue'] as const;
    for (let i = 0; i < 200; i++) {
      const tenant = randomElement(allTenants);
      const issueDate = randomDate(new Date('2024-01-01'), new Date('2025-01-15'));
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const status = randomElement(invoiceStatuses);
      const subtotal = randomDecimal(1000, 50000);
      const taxAmount = (parseFloat(subtotal) * 0.17).toFixed(2);
      const totalAmount = (parseFloat(subtotal) + parseFloat(taxAmount)).toFixed(2);
      const paidAmount = status === 'paid' ? totalAmount : status === 'overdue' ? '0.00' : randomDecimal(0, parseFloat(totalAmount));

      await db.insert(invoices).values({
        tenantId: tenant.id,
        invoiceNumber: `INV-2024-${String(i + 1).padStart(5, '0')}`,
        type: 'income',
        status: status as any,
        customerName: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
        customerEmail: `customer${i}@example.com`,
        currency: 'BRL',
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount,
        remainingAmount: (parseFloat(totalAmount) - parseFloat(paidAmount)).toFixed(2),
        paymentStatus: status === 'paid' ? 'paid' : 'pending',
        paymentMethod: randomElement(['credit_card', 'pix', 'boleto']),
        issueDate,
        dueDate,
        paidDate: status === 'paid' ? randomDate(issueDate, dueDate) : null,
        items: [
          {
            id: generateId(),
            description: 'Trading Platform Subscription',
            quantity: 1,
            unitPrice: subtotal,
            discount: '0.00',
            taxRate: '17.00',
            taxAmount,
            total: totalAmount,
          },
        ],
        createdBy: usersByRole.admin[0]?.id || usersByRole.ceo[0].id,
        updatedBy: usersByRole.admin[0]?.id || usersByRole.ceo[0].id,
      });

      stats.invoices++;
    }

    console.log(`✅ Created ${stats.invoices} invoices`);

    // 9.2 Expenses (150 total)
    const expenseCategories = ['software', 'hardware', 'office', 'marketing', 'salaries'] as const;
    const expenseStatuses = ['approved', 'paid', 'pending_approval'] as const;

    for (let i = 0; i < 150; i++) {
      const tenant = randomElement(allTenants.slice(0, 10));
      const amount = randomDecimal(500, 15000);
      const taxAmount = (parseFloat(amount) * 0.05).toFixed(2);
      const totalAmount = (parseFloat(amount) + parseFloat(taxAmount)).toFixed(2);
      const status = randomElement(expenseStatuses);
      const paymentDate = status === 'paid' ? randomDate(new Date('2024-01-01'), new Date('2025-01-15')) : null;

      await db.insert(expenses).values({
        tenantId: tenant.id,
        expenseNumber: `EXP-2024-${String(i + 1).padStart(5, '0')}`,
        title: `${randomElement(['Monthly', 'Annual', 'Quarterly'])} ${randomElement(expenseCategories)} expense`,
        description: 'Business operational expense',
        category: randomElement(expenseCategories),
        status: status as any,
        currency: 'BRL',
        amount,
        taxAmount,
        totalAmount,
        paymentMethod: randomElement(['credit_card', 'bank_transfer', 'pix']),
        paymentDate,
        supplierName: `${randomElement(companyNames)}`,
        requiresApproval: status !== 'approved',
        approvedBy: status === 'approved' || status === 'paid' ? usersByRole.manager[0]?.id : null,
        approvedAt: status === 'approved' || status === 'paid' ? randomDate(new Date('2024-01-01'), new Date()) : null,
        isTaxDeductible: true,
        createdBy: usersByRole.financial[0]?.id || usersByRole.admin[0].id,
        updatedBy: usersByRole.financial[0]?.id || usersByRole.admin[0].id,
      });

      stats.expenses++;
    }

    console.log(`✅ Created ${stats.expenses} expenses`);

    // 9.3 Budgets (50 total)
    for (let i = 0; i < 50; i++) {
      const tenant = randomElement(allTenants.slice(0, 10));
      const startDate = new Date('2024-01-01');
      startDate.setMonth(i % 12);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const totalBudgeted = randomDecimal(50000, 500000);
      const totalActual = randomDecimal(30000, parseFloat(totalBudgeted));
      const variance = (parseFloat(totalBudgeted) - parseFloat(totalActual)).toFixed(2);

      const [budget] = await db
        .insert(budgets)
        .values({
          tenantId: tenant.id,
          name: `Budget ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          budgetNumber: `BUD-2024-${String(i + 1).padStart(4, '0')}`,
          periodType: 'monthly',
          fiscalYear: '2024',
          fiscalPeriod: `2024-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
          startDate,
          endDate,
          currency: 'BRL',
          totalBudgeted,
          totalActual,
          totalVariance: variance,
          status: 'active',
          ownerId: usersByRole.financial[0]?.id || usersByRole.admin[0].id,
          createdBy: usersByRole.financial[0]?.id || usersByRole.admin[0].id,
          updatedBy: usersByRole.financial[0]?.id || usersByRole.admin[0].id,
        })
        .returning();

      // Budget lines (3-5 per budget)
      const lineCount = randomNumber(3, 5);
      for (let j = 0; j < lineCount; j++) {
        const budgetedAmount = randomDecimal(5000, 50000);
        const actualAmount = randomDecimal(2000, parseFloat(budgetedAmount));

        await db.insert(budgetLines).values({
          tenantId: tenant.id,
          budgetId: budget.id,
          categoryName: randomElement(['Software', 'Marketing', 'Salaries', 'Office', 'Travel']),
          budgetedAmount,
          actualAmount,
          availableAmount: (parseFloat(budgetedAmount) - parseFloat(actualAmount)).toFixed(2),
          variance: (parseFloat(budgetedAmount) - parseFloat(actualAmount)).toFixed(2),
        });
      }

      stats.budgets++;
    }

    console.log(`✅ Created ${stats.budgets} budgets with lines`);

    // 9.4 Tax Reports (10 monthly reports)
    for (let i = 0; i < 10; i++) {
      const tenant = randomElement(allTenants.slice(0, 10));
      const reportDate = new Date('2024-01-01');
      reportDate.setMonth(i);
      const periodEnd = new Date(reportDate);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await db.insert(taxReports).values({
        tenantId: tenant.id,
        reportType: 'monthly',
        reportName: `Monthly Tax Report - ${reportDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        jurisdiction: 'BR',
        fiscalYear: '2024',
        fiscalPeriod: `2024-${String(i + 1).padStart(2, '0')}`,
        periodStartDate: reportDate,
        periodEndDate: periodEnd,
        reportData: {
          summary: {
            totalRevenue: parseFloat(randomDecimal(100000, 500000)),
            totalExpenses: parseFloat(randomDecimal(50000, 200000)),
            totalTaxableAmount: parseFloat(randomDecimal(50000, 300000)),
            totalTaxAmount: parseFloat(randomDecimal(10000, 60000)),
          },
          taxBreakdown: [
            {
              taxType: 'VAT',
              taxableAmount: parseFloat(randomDecimal(50000, 300000)),
              rate: 17,
              taxAmount: parseFloat(randomDecimal(8500, 51000)),
            },
          ],
          deductions: [],
        },
        status: 'ready',
        generatedBy: usersByRole.financial[0]?.id || usersByRole.admin[0].id,
        generationMethod: 'automatic',
      });
    }

    console.log('✅ Created 10 tax reports\n');

    // ============================================================================
    // 10. NOTIFICATIONS (500 total)
    // ============================================================================
    console.log('🔔 Seeding Notifications...');

    const notificationTypes = ['email', 'push', 'telegram', 'in_app'] as const;
    const notificationCategories = ['system', 'financial', 'security', 'trading'] as const;
    const notificationStatuses = ['sent', 'delivered', 'read', 'failed'] as const;
    const priorities = ['low', 'normal', 'high', 'urgent'] as const;

    const allUsers = Object.values(usersByRole).flat();

    for (let i = 0; i < 500; i++) {
      const user = randomElement(allUsers);
      const tenant = randomElement(allTenants);
      const status = randomElement(notificationStatuses);
      const sentAt = randomDate(new Date('2024-01-01'), new Date('2025-01-15'));

      await db.insert(notifications).values({
        userId: user.id,
        tenantId: tenant.id,
        notificationType: randomElement(notificationTypes),
        category: randomElement(notificationCategories),
        priority: randomElement(priorities),
        subject: `Notification ${i + 1}`,
        content: `This is a test notification message for ${user.name}`,
        status: status as any,
        sentAt: status !== 'pending' ? sentAt : null,
        readAt: status === 'read' ? randomDate(sentAt, new Date()) : null,
      });

      stats.notifications++;
    }

    console.log(`✅ Created ${stats.notifications} notifications\n`);

    // ============================================================================
    // 11. AUDIT LOGS (1000 total)
    // ============================================================================
    console.log('📝 Seeding Audit Logs...');

    const eventTypes = [
      'user.created',
      'user.updated',
      'user.login',
      'user.logout',
      'tenant.created',
      'tenant.updated',
      'invoice.created',
      'invoice.paid',
      'expense.approved',
      'budget.created',
    ];
    const severities = ['low', 'medium', 'high', 'critical'] as const;
    const actions = ['create', 'update', 'delete', 'read'] as const;

    for (let i = 0; i < 1000; i++) {
      const user = randomElement(allUsers);
      const tenant = randomElement(allTenants);

      await db.insert(auditLogs).values({
        eventType: randomElement(eventTypes),
        severity: randomElement(severities),
        status: 'success',
        userId: user.id,
        tenantId: tenant.id,
        ipAddress: `192.168.${randomNumber(1, 255)}.${randomNumber(1, 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        resource: randomElement(['users', 'tenants', 'invoices', 'expenses', 'budgets']),
        resourceId: generateId(),
        action: randomElement(actions),
        metadata: { source: 'web', version: '1.0.0' },
        timestamp: randomDate(new Date('2024-01-01'), new Date('2025-01-15')),
      });

      stats.auditLogs++;
    }

    console.log(`✅ Created ${stats.auditLogs} audit logs\n`);

    // ============================================================================
    // 12. CEO DASHBOARD DATA
    // ============================================================================
    console.log('📊 Seeding CEO Dashboard Data...');

    // Dashboard configs for all CEOs
    for (const ceo of usersByRole.ceo) {
      const tenant = allTenants.find((t) =>
        allTenants.slice(0, 5).includes(t)
      ) || allTenants[0];

      await db.insert(ceoDashboardConfigs).values({
        userId: ceo.id,
        tenantId: tenant.id,
        displayName: `${ceo.name}'s Dashboard`,
        theme: randomElement(['light', 'dark']),
        defaultDateRange: '30d',
        refreshInterval: 300,
        currency: 'BRL',
        emailAlerts: true,
        pushAlerts: true,
        alertThresholds: {
          revenueDropPercent: 10,
          churnRatePercent: 5,
          activeUsersDropPercent: 15,
          errorRatePercent: 5,
        },
      });

      stats.ceoData++;
    }

    // KPIs (5 per tenant)
    for (const tenant of allTenants.slice(0, 10)) {
      const kpiTypes = ['MRR', 'ARR', 'CAC', 'LTV', 'Churn Rate'];
      for (const kpiType of kpiTypes) {
        await db.insert(ceoKpis).values({
          tenantId: tenant.id,
          name: kpiType.toLowerCase().replace(/\s+/g, '_'),
          displayName: kpiType,
          description: `${kpiType} metric`,
          category: 'revenue',
          metric: kpiType.toLowerCase().replace(/\s+/g, '_'),
          unit: kpiType.includes('Rate') ? 'percentage' : 'currency',
          target: randomDecimal(10000, 100000),
          isActive: true,
        });

        stats.ceoData++;
      }
    }

    // Alerts (50 total)
    const alertTypes = ['revenue_drop', 'churn_spike', 'system_error', 'payment_failure'] as const;
    const alertSeverities = ['critical', 'warning', 'info'] as const;

    for (let i = 0; i < 50; i++) {
      const tenant = randomElement(allTenants.slice(0, 10));
      const severity = randomElement(alertSeverities);

      await db.insert(ceoAlerts).values({
        tenantId: tenant.id,
        type: randomElement(alertTypes),
        severity,
        title: `Alert ${i + 1}: ${severity.toUpperCase()}`,
        message: `This is a ${severity} alert for ${tenant.name}`,
        category: 'revenue',
        status: randomElement(['active', 'acknowledged', 'resolved']),
        currentValue: randomDecimal(5000, 50000),
        previousValue: randomDecimal(10000, 60000),
        changePercent: randomDecimal(-50, -5),
      });

      stats.ceoData++;
    }

    console.log(`✅ Created CEO dashboard data (configs, KPIs, alerts)\n`);

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ COMPREHENSIVE SEED COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 SUMMARY OF CREATED RECORDS:\n');
    console.log(`👥 Users:                 ${stats.users}`);
    console.log(`🏢 Tenants:               ${stats.tenants}`);
    console.log(`   └─ Company (1:N):      10`);
    console.log(`   └─ Trader (1:1):       10`);
    console.log(`🏛️  Departments:           ${stats.departments}`);
    console.log(`💳 Subscriptions:         ${stats.subscriptions}`);
    console.log(`   └─ Starter:            30`);
    console.log(`   └─ Pro:                50`);
    console.log(`   └─ Enterprise:         15`);
    console.log(`   └─ Internal:           5`);
    console.log(`💰 Financial Records:     ${stats.invoices + stats.expenses + stats.budgets + 10}`);
    console.log(`   └─ Invoices:           ${stats.invoices}`);
    console.log(`   └─ Expenses:           ${stats.expenses}`);
    console.log(`   └─ Budgets:            ${stats.budgets}`);
    console.log(`   └─ Tax Reports:        10`);
    console.log(`🔔 Notifications:         ${stats.notifications}`);
    console.log(`📝 Audit Logs:            ${stats.auditLogs}`);
    console.log(`📊 CEO Dashboard:         ${stats.ceoData} (configs, KPIs, alerts)`);
    console.log(`🔐 Security:              ${stats.roles} roles, ${stats.permissions} permissions`);
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`🎉 TOTAL RECORDS:         ${
      stats.users +
      stats.tenants +
      stats.departments +
      stats.subscriptions +
      stats.invoices +
      stats.expenses +
      stats.budgets +
      stats.notifications +
      stats.auditLogs +
      stats.ceoData +
      stats.roles +
      stats.permissions +
      10 // tax reports
    }`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🚀 Database is ready for testing!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the seed
seedComprehensive().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
