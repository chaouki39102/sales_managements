// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/queryKeys.ts — FIXED
// أضفنا: document-types-select (كان في الـ console error)
// ════════════════════════════════════════════════════════════════════════════

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authKeys = {
  all: ['auth']        as const,
  me:  ['auth', 'me'] as const,
} as const;

// ─── Companies ────────────────────────────────────────────────────────────────
export const companyKeys = {
  all:    ['companies']                                        as const,
  lists:  ['companies', 'list']                               as const,
  list:   (params?: Record<string, unknown>) => ['companies', 'list', params] as const,
  detail: (id: number)                       => ['companies', id]             as const,
  mine:   ['companies', 'mine']                               as const,
} as const;

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminKeys = {
  companies: {
    all:    ['admin', 'companies']                                       as const,
    list:   (p?: Record<string, unknown>) => ['admin', 'companies', 'list', p] as const,
    detail: (id: number)                  => ['admin', 'companies', id]        as const,
    users:  (id: number)                  => ['admin', 'companies', id, 'users'] as const,
  },
  users: {
    all:    ['admin', 'users']                                     as const,
    list:   (p?: Record<string, unknown>) => ['admin', 'users', 'list', p] as const,
    detail: (id: number)                  => ['admin', 'users', id]        as const,
  },
} as const;

// ─── Tenant keys ──────────────────────────────────────────────────────────────
export const tenantKeys = {

  fiscalYears: {
    all:    (slug: string) => [slug, 'fiscal-years']                           as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'fiscal-years', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'fiscal-years', id]          as const,
  },

  dashboard: {
    all:   (slug: string) => [slug, 'dashboard']                               as const,
    stats: (slug: string, yearId: number) => [slug, 'dashboard', 'stats', yearId] as const,
  },

  parties: {
    all:    (slug: string) => [slug, 'parties']                                as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'parties', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'parties', id]               as const,
  },

  products: {
    all:    (slug: string) => [slug, 'products']                               as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'products', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'products', id]              as const,
  },

  documents: {
    all:    (slug: string) => [slug, 'documents']                              as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'documents', 'list', p] as const,
    detail: (slug: string, id: number) => [slug, 'documents', id]             as const,
    byType: (slug: string, typeCode: string, p?: Record<string, unknown>) => [slug, 'documents', typeCode, p] as const,
  },

  payments: {
    all:  (slug: string) => [slug, 'payments']                                 as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'payments', 'list', p] as const,
  },

  expenses: {
    all:  (slug: string) => [slug, 'expenses']                                 as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'expenses', 'list', p] as const,
  },

  inventory: {
    all:       (slug: string) => [slug, 'inventory']                           as const,
    stock:     (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'stock', p] as const,
    movements: (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'movements', p] as const,
  },

  // ── Tenant Lookups ────────────────────────────────────────────────────────
  lookups: {
    all:              (slug: string) => [slug, 'lookups']                      as const,
    units:            (slug: string) => [slug, 'lookups', 'units']             as const,
    warehouses:       (slug: string) => [slug, 'lookups', 'warehouses']        as const,
    priceLevels:      (slug: string) => [slug, 'lookups', 'price-levels']      as const,
    paymentModes:     (slug: string) => [slug, 'lookups', 'payment-modes']     as const,
    numberingSeries:  (slug: string) => [slug, 'lookups', 'numbering-series']  as const,
    treasuryAccounts: (slug: string) => [slug, 'lookups', 'treasury-accounts'] as const,
    expenseCategories:(slug: string) => [slug, 'lookups', 'expense-categories'] as const,
    brands:           (slug: string) => [slug, 'lookups', 'brands']            as const,
    families:         (slug: string) => [slug, 'lookups', 'families']          as const,
    roles:            (slug: string) => [slug, 'lookups', 'roles']             as const,
    users:            (slug: string) => [slug, 'lookups', 'users']             as const,
  },

  reports: {
    all:   (slug: string) => [slug, 'reports']                                 as const,
    tva:   (slug: string, yearId: number) => [slug, 'reports', 'tva', yearId] as const,
    debts: (slug: string) => [slug, 'reports', 'debts']                       as const,
  },

  settings: {
    all:     (slug: string) => [slug, 'settings']                              as const,
    current: (slug: string) => [slug, 'settings', 'current']                  as const,
  },

  users: {
    all:  (slug: string) => [slug, 'users']                                    as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'users', 'list', p] as const,
  },
} as const;

// ─── Global Lookups (مشتركة — لا تحتاج slug) ─────────────────────────────────
export const globalKeys = {
  currencies:                ['global', 'currencies']                       as const,
  tvas:                      ['global', 'tvas']                             as const,
  legalForms:                ['global', 'legal-forms']                      as const,
  fiscalStamps:              ['global', 'fiscal-stamps']                    as const,
  inventoryValuationMethods: ['global', 'inventory-valuation-methods']      as const,
  wilayas:                   ['global', 'wilayas']                          as const,
  communes:  (wilayaId: number) => ['global', 'communes', wilayaId]        as const,
  documentStatuses:          ['global', 'document-statuses']                as const,
  documentBaseOperations:    ['global', 'document-base-operations']         as const,
  // ✅ FIX: إضافة documentTypes كـ array (كان مفقوداً → undefined warning)
  documentTypes:             ['global', 'document-types']                   as const,
  // ✅ FIX: مفتاح للـ select variant المستخدَم في الصفحات
  documentTypesSelect:       ['global', 'document-types-select']            as const,
  stockMovementTypes:        ['global', 'stock-movement-types']             as const,
  productTypes:              ['global', 'product-types']                    as const,
  partyTypes:                ['global', 'party-types']                      as const,
  treasuryAccountTypes:      ['global', 'treasury-account-types']           as const,
} as const;
