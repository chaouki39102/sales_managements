// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/queryKeys.ts
// مفاتيح React Query — مركزية، آمنة النوع، هرمية
// إبطال الكاش يعمل بشكل تلقائي: invalidate('slug') يبطل كل بياناته
// ════════════════════════════════════════════════════════════════════════════

// ─── Auth (لا تحتاج slug) ────────────────────────────────────────────────────

export const authKeys = {
  all:  ['auth']              as const,
  me:   ['auth', 'me']       as const,
} as const;

// ─── Companies (لا تحتاج slug) ───────────────────────────────────────────────

export const companyKeys = {
  all:    ['companies']                                     as const,
  lists:  ['companies', 'list']                            as const,
  list:   (params?: Record<string, unknown>) =>
            ['companies', 'list', params]                   as const,
  detail: (id: number) => ['companies', id]                as const,
  mine:   ['companies', 'mine']                            as const,
} as const;

// ─── Admin Companies ──────────────────────────────────────────────────────────

export const adminKeys = {
  companies: {
    all:    ['admin', 'companies']                          as const,
    list:   (params?: Record<string, unknown>) =>
              ['admin', 'companies', 'list', params]        as const,
    detail: (id: number) => ['admin', 'companies', id]     as const,
    users:  (id: number) => ['admin', 'companies', id, 'users'] as const,
  },
  users: {
    all:    ['admin', 'users']                              as const,
    list:   (params?: Record<string, unknown>) =>
              ['admin', 'users', 'list', params]            as const,
    detail: (id: number) => ['admin', 'users', id]         as const,
  },
} as const;

// ─── Tenant resources (تحتاج slug — هرمية للإبطال التلقائي) ────────────────

/**
 * الهرمية:
 * [slug] → يُبطل كل بيانات الشركة
 * [slug, 'fiscal-years'] → يُبطل السنوات المالية فقط
 * [slug, 'fiscal-years', 1] → يُبطل سنة بعينها
 */
export const tenantKeys = {
  // ── Fiscal Years ────────────────────────────────────────────────────────
  fiscalYears: {
    all:    (slug: string) => [slug, 'fiscal-years']        as const,
    list:   (slug: string, params?: Record<string, unknown>) =>
              [slug, 'fiscal-years', 'list', params]        as const,
    detail: (slug: string, id: number) =>
              [slug, 'fiscal-years', id]                    as const,
  },

  // ── Dashboard ────────────────────────────────────────────────────────────
  dashboard: {
    all:    (slug: string) => [slug, 'dashboard']           as const,
    stats:  (slug: string, yearId: number) =>
              [slug, 'dashboard', 'stats', yearId]          as const,
  },

  // ── Parties ──────────────────────────────────────────────────────────────
  parties: {
    all:    (slug: string) => [slug, 'parties']             as const,
    list:   (slug: string, params?: Record<string, unknown>) =>
              [slug, 'parties', 'list', params]             as const,
    detail: (slug: string, id: number) =>
              [slug, 'parties', id]                         as const,
  },

  // ── Products ─────────────────────────────────────────────────────────────
  products: {
    all:    (slug: string) => [slug, 'products']            as const,
    list:   (slug: string, params?: Record<string, unknown>) =>
              [slug, 'products', 'list', params]            as const,
    detail: (slug: string, id: number) =>
              [slug, 'products', id]                        as const,
  },

  // ── Invoices / Commercial Documents ──────────────────────────────────────
  documents: {
    all:    (slug: string) => [slug, 'documents']           as const,
    list:   (slug: string, params?: Record<string, unknown>) =>
              [slug, 'documents', 'list', params]           as const,
    detail: (slug: string, id: number) =>
              [slug, 'documents', id]                       as const,
    byType: (slug: string, typeCode: string, params?: Record<string, unknown>) =>
              [slug, 'documents', typeCode, params]         as const,
  },

  // ── Finance / Payments ───────────────────────────────────────────────────
  payments: {
    all:    (slug: string) => [slug, 'payments']            as const,
    list:   (slug: string, params?: Record<string, unknown>) =>
              [slug, 'payments', 'list', params]            as const,
  },

  // ── Expenses ─────────────────────────────────────────────────────────────
  expenses: {
    all:    (slug: string) => [slug, 'expenses']            as const,
    list:   (slug: string, params?: Record<string, unknown>) =>
              [slug, 'expenses', 'list', params]            as const,
  },

  // ── Inventory ────────────────────────────────────────────────────────────
  inventory: {
    all:    (slug: string) => [slug, 'inventory']           as const,
    stock:  (slug: string, params?: Record<string, unknown>) =>
              [slug, 'inventory', 'stock', params]          as const,
    movements: (slug: string, params?: Record<string, unknown>) =>
              [slug, 'inventory', 'movements', params]      as const,
  },

  // ── Tenant Lookups (مرتبطة بالشركة) ─────────────────────────────────────
  lookups: {
    all:       (slug: string) => [slug, 'lookups']                       as const,
    units:     (slug: string) => [slug, 'lookups', 'units']              as const,
    warehouses:(slug: string) => [slug, 'lookups', 'warehouses']         as const,
    priceLevels:(slug: string) => [slug, 'lookups', 'price-levels']      as const,
    paymentModes:(slug: string) => [slug, 'lookups', 'payment-modes']    as const,
    numberingSeries:(slug: string) => [slug, 'lookups', 'numbering-series'] as const,
    treasuryAccounts:(slug: string) => [slug, 'lookups', 'treasury-accounts'] as const,
    expenseCategories:(slug: string) => [slug, 'lookups', 'expense-categories'] as const,
    brands:    (slug: string) => [slug, 'lookups', 'brands']             as const,
    families:  (slug: string) => [slug, 'lookups', 'families']           as const,
    roles:     (slug: string) => [slug, 'lookups', 'roles']              as const,
    users:     (slug: string) => [slug, 'lookups', 'users']              as const,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    all:    (slug: string) => [slug, 'reports']             as const,
    tva:    (slug: string, yearId: number) =>
              [slug, 'reports', 'tva', yearId]              as const,
    debts:  (slug: string) => [slug, 'reports', 'debts']   as const,
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    all:     (slug: string) => [slug, 'settings']           as const,
    current: (slug: string) => [slug, 'settings', 'current'] as const,
  },

  // ── Users & Roles ─────────────────────────────────────────────────────────
  users: {
    all:    (slug: string) => [slug, 'users']               as const,
    list:   (slug: string, params?: Record<string, unknown>) =>
              [slug, 'users', 'list', params]               as const,
  },
} as const;

// ─── Global Lookups (مشتركة — لا تحتاج slug) ─────────────────────────────────

export const globalKeys = {
  currencies:                ['global', 'currencies']                  as const,
  tvas:                      ['global', 'tvas']                        as const,
  legalForms:                ['global', 'legal-forms']                 as const,
  fiscalStamps:              ['global', 'fiscal-stamps']               as const,
  inventoryValuationMethods: ['global', 'inventory-valuation-methods'] as const,
  wilayas:                   ['global', 'wilayas']                     as const,
  communes:  (wilayaId: number) => ['global', 'communes', wilayaId]   as const,
  documentStatuses:          ['global', 'document-statuses']           as const,
  documentBaseOperations:    ['global', 'document-base-operations']    as const,
  documentTypes:             ['global', 'document-types']              as const,
  stockMovementTypes:        ['global', 'stock-movement-types']        as const,
  productTypes:              ['global', 'product-types']               as const,
  partyTypes:                ['global', 'party-types']                 as const,
  treasuryAccountTypes:      ['global', 'treasury-account-types']      as const,
} as const;
