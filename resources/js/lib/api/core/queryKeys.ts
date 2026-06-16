// ════════════════════════════════════════════════════════════════════════════
// lib/api/core/queryKeys.ts
//
// قاعدة التصنيف (مستخرجة من api.php):
//   globalKeys  → wilayas, communes فقط (خارج {company} تماماً)
//   companyKeys → /companies/* (CompanyController — company owner)
//   adminKeys   → /admin/* (AdminCompanyController — super-admin فقط)
//   tenantKeys  → /{slug}/* (كل tenant resources)
// ════════════════════════════════════════════════════════════════════════════

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authKeys = {
  all: ['auth']        as const,
  me:  ['auth', 'me'] as const,
} as const;

// ─── Companies (CompanyController — /api/v1/companies/*) ─────────────────────
export const companyKeys = {
  all:     ['companies']                                              as const,
  list:    (p?: Record<string, unknown>) => ['companies', 'list', p] as const,
  detail:  (id: number)                   => ['companies', id]        as const,
  mine:    ['companies', 'mine']                                      as const,
  // ✅ إضافة: الشركة النشطة الحالية (GET /companies/current)
  current: ['companies', 'current']                                   as const,
  // أعضاء شركة بعينها
  members: (slug: string) => ['companies', slug, 'members']           as const,
} as const;

// ─── Admin (AdminCompanyController — /api/v1/admin/*) ────────────────────────
// super-admin فقط
export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  companies: {
    all:    ['admin', 'companies']                                                      as const,
    list:   (p?: Record<string, unknown>) => ['admin', 'companies', 'list', p]         as const,
    detail: (id: number)                   => ['admin', 'companies', id]                as const,
    users:  (id: number)                   => ['admin', 'companies', id, 'users']       as const,
  },
  users: {
    all:    ['admin', 'users']                                                          as const,
    list:   (p?: Record<string, unknown>) => ['admin', 'users', 'list', p]             as const,
    detail: (id: number)                   => ['admin', 'users', id]                    as const,
    companies: (id: number)                => ['admin', 'users', id, 'companies']       as const,
  },
  plans:    ['admin', 'plans']    as const,
  activity: (p?: Record<string, unknown>) => ['admin', 'activity', p] as const,
  settings: ['admin', 'settings'] as const,
} as const;

// ─── GLOBAL Lookups ───────────────────────────────────────────────────────────
// فقط wilayas و communes — تُرسَل بدون slug (خارج {company} في api.php)
export const globalKeys = {
  wilayas:  ['global', 'wilayas']                                  as const,
  communes: (wilayaId: number) => ['global', 'communes', wilayaId] as const,
} as const;

// ─── TENANT keys ──────────────────────────────────────────────────────────────
// كل شيء آخر — يُرسَل مع /{slug}/
export const tenantKeys = {

  // ── Lookups (tenant) ────────────────────────────────────────────────────────
  lookups: {
    all:                  (slug: string) => [slug, 'lookups']                                      as const,
    currencies:           (slug: string) => [slug, 'lookups', 'currencies']                        as const,
    tvas:                 (slug: string) => [slug, 'lookups', 'tvas']                              as const,
    units:                (slug: string) => [slug, 'lookups', 'units']                             as const,
    families:             (slug: string) => [slug, 'lookups', 'families']                          as const,
    brands:               (slug: string) => [slug, 'lookups', 'brands']                            as const,
    priceLevels:          (slug: string) => [slug, 'lookups', 'price-levels']                      as const,
    warehouses:           (slug: string) => [slug, 'lookups', 'warehouses']                        as const,
    paymentModes:         (slug: string) => [slug, 'lookups', 'payment-modes']                     as const,
    exchangeRates:        (slug: string) => [slug, 'lookups', 'exchange-rates']                    as const,
    expenseCategories:    (slug: string) => [slug, 'lookups', 'expense-categories']                as const,
    documentTypes:        (slug: string) => [slug, 'lookups', 'document-types']                    as const,
    documentStatuses:     (slug: string) => [slug, 'lookups', 'document-statuses']                 as const,
    documentBaseOps:      (slug: string) => [slug, 'lookups', 'document-base-operations']          as const,
    fiscalStamps:         (slug: string) => [slug, 'lookups', 'fiscal-stamps']                     as const,
    genders:              (slug: string) => [slug, 'lookups', 'genders']                           as const,
    legalForms:           (slug: string) => [slug, 'lookups', 'legal-forms']                       as const,
    partyTypes:           (slug: string) => [slug, 'lookups', 'party-types']                       as const,
    productTypes:         (slug: string) => [slug, 'lookups', 'product-types']                     as const,
    treasuryAccountTypes: (slug: string) => [slug, 'lookups', 'treasury-account-types']            as const,
    stockMovementTypes:   (slug: string) => [slug, 'lookups', 'stock-movement-types']              as const,
    valuationMethods:     (slug: string) => [slug, 'lookups', 'inventory-valuation-methods']       as const,
    numberingSeries:      (slug: string) => [slug, 'lookups', 'numbering-series']                  as const,
    treasuryAccounts:     (slug: string) => [slug, 'lookups', 'treasury-accounts']                 as const,
    roles:                (slug: string) => [slug, 'lookups', 'roles']                             as const,
  },

  // ── Fiscal Years ──────────────────────────────────────────────────────────
  fiscalYears: {
    all:    (slug: string)                              => [slug, 'fiscal-years']                  as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'fiscal-years', 'list', p]       as const,
    detail: (slug: string, id: number)                  => [slug, 'fiscal-years', id]              as const,
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    all:   (slug: string)                  => [slug, 'dashboard']                                  as const,
    stats: (slug: string, yearId: number)  => [slug, 'dashboard', 'stats', yearId]                as const,
    chart: (slug: string, p: string)       => [slug, 'dashboard', 'chart', p]                     as const,
  },

  // ── Parties ───────────────────────────────────────────────────────────────
  parties: {
    all:    (slug: string)                              => [slug, 'parties']                        as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'parties', 'list', p]            as const,
    detail: (slug: string, id: number)                  => [slug, 'parties', id]                   as const,
  },

  // ── Products ──────────────────────────────────────────────────────────────
  products: {
    all:    (slug: string)                              => [slug, 'products']                       as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'products', 'list', p]           as const,
    detail: (slug: string, id: number)                  => [slug, 'products', id]                  as const,
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  documents: {
    all:    (slug: string)                              => [slug, 'documents']                      as const,
    list:   (slug: string, p?: Record<string, unknown>) => [slug, 'documents', 'list', p]          as const,
    detail: (slug: string, id: number)                  => [slug, 'documents', id]                 as const,
    byType: (slug: string, code: string, p?: Record<string, unknown>) =>
      [slug, 'documents', code, p]                                                                  as const,
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  payments: {
    all:  (slug: string)                              => [slug, 'payments']                         as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'payments', 'list', p]             as const,
  },

  // ── Expenses ──────────────────────────────────────────────────────────────
  expenses: {
    all:  (slug: string)                              => [slug, 'expenses']                         as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'expenses', 'list', p]             as const,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  inventory: {
    all:       (slug: string)                              => [slug, 'inventory']                   as const,
    list:      (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'list', p]       as const,
    movements: (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'movements', p]  as const,
    stock:     (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'stock', p]      as const,
    lots:      (slug: string, p?: Record<string, unknown>) => [slug, 'inventory', 'lots', p]       as const,
  },

  // ── Users & Roles ─────────────────────────────────────────────────────────
  users: {
    all:  (slug: string)                              => [slug, 'users']                            as const,
    list: (slug: string, p?: Record<string, unknown>) => [slug, 'users', 'list', p]               as const,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    tva:   (slug: string, yearId: number) => [slug, 'reports', 'tva', yearId]                      as const,
    debts: (slug: string)                 => [slug, 'reports', 'debts']                            as const,
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    current: (slug: string) => [slug, 'settings']                                                  as const,
  },


  // ── Balances (الأرصدة) ─────────────────────────────────────────────────────
   partyBalances: {
        all:  (slug: string) => [slug, 'party-balances'] as const,
        list: (slug: string, params?: Record<string, unknown>) => [slug, 'party-balances', 'list', params] as const,
        detail: (slug: string, partyId: number, date?: string) => [slug, 'party-balances', partyId, date] as const,
    },
    openingBalances: {
        parties:  (slug: string, yearId: number) => [slug, 'opening-balances', 'parties', yearId] as const,
        treasury: (slug: string, yearId: number) => [slug, 'opening-balances', 'treasury', yearId] as const,
    },
} as const;

