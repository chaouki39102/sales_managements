{{--
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend Conventions                                               │
│  File: .ai/guidelines/frontend.blade.php                           │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
API LAYER
═══════════════════════════════════════════════════════════

All HTTP requests via apiClient (lib/api/core/client.ts) — Axios instance.
Admin requests via separate admin client (lib/api/admin/client.ts).

URL pattern for tenant resources: /{company_slug}/{resource}
  ❌ Never call /{resource} without slug prefix for tenant endpoints
  ✅ Truly-public routes (wilayas, communes, currencies, document-types, tvas)
     are fetched WITHOUT slug prefix — they use a TRULY_PUBLIC list in client.ts

Laravel envelope — always unwrap:
  Response shape: { status, data, meta, links }
  Use apiGet<T[]>() with explicit generic type to unwrap correctly.
  ❌ Never access response.data.data directly without type-checking

Query keys — defined in lib/api/core/queryKeys.ts (tenantKeys object):
  tenantKeys.inventory.movements, tenantKeys.inventory.stock, tenantKeys.inventory.lots
  ✅ invalidateQueries key MUST exactly match the query key used in useQuery
  ❌ Key mismatch = cache not invalidated = stale data after mutations


═══════════════════════════════════════════════════════════
STATE MANAGEMENT
═══════════════════════════════════════════════════════════

Server state: TanStack Query (useQuery, useMutation, useInfiniteQuery)
UI state:     lib/store/ (Zustand stores: appStore, notificationStore, uiStore)
POS state:    pos/hooks/usePOSStore.ts, pos/hooks/useCartStore.ts

AuthContext (context/AuthContext.tsx):
  → provides user, company, token
  → must be inside BrowserRouter (NOT wrapping it)

FiscalYearContext (context/FiscalYearContext.tsx):
  → provides currentFiscalYear, fiscalYears
  → must be inside BrowserRouter


═══════════════════════════════════════════════════════════
ROUTING
═══════════════════════════════════════════════════════════

React Router v6 — routes defined in routes/index.tsx
All app pages nested under DashboardLayout as children
AdminLayout wraps /admin/* pages
POSLayout wraps /pos pages

❌ No /dashboard/ prefix on routes
✅ Routes: /dashboard, /documents, /products, /parties, /inventory,
          /fiscal-years, /tva-rates, /units, /currencies, /brands,
          /categories, /warehouses, /price-levels, /settings, /pos, /reports


═══════════════════════════════════════════════════════════
STYLING — CRITICAL RULES
═══════════════════════════════════════════════════════════

Tailwind CSS v4 — utility-first
theme.css (resources/css/theme/theme.css) — custom component classes

Rule:
  ✅ inline style={{}} ONLY for CSS custom properties: style={{ '--color': value }}
  ✅ All other styling: Tailwind classes or theme.css component classes
  ❌ Never use inline style for layout, spacing, color — use Tailwind
  ❌ Never mix arbitrary inline styles with Tailwind on the same element

CSS files: tokens.css (design tokens), components.css, layout.css,
           pages.css, utilities.css, modern-utilities.css, pos.css, notifications.css

Arabic RTL: all UI is RTL. Use `dir="rtl"` on root. Use `ms-*`/`me-*` (margin-start/end)
            instead of `ml-*`/`mr-*` for RTL-safe spacing.


═══════════════════════════════════════════════════════════
DATATABLE COMPONENT
═══════════════════════════════════════════════════════════

Location: components/ui/DataTable/ (v10+)
Entry:    components/ui/DataTable/index.ts

Features: virtual scrolling, multi-sort, column pinning, drag reorder,
          URL state sync, batch edit, cell validation, saved views,
          Excel export (ExcelJS), useColumnStatePersistence

Usage pattern: see components/ui/DataTable/DataTable.usage.tsx
Patterns file: lib/datatable-patterns.ts

Excel export: excelExportAdvanced.ts — includes:
  numberToArabicWords() with correct Arabic grammar for amounts in words
  Progressive Timbre Fiscal bracket calculation
  Algerian document-specific tab colors
  Negative number formatting

❌ Do NOT use DataTable.old.tsx — it is archived
❌ Do NOT use window.location.reload() for reset — use state resets


═══════════════════════════════════════════════════════════
LOOKUP PATTERN
═══════════════════════════════════════════════════════════

LookupPage (pages/lookups/LookupPage.tsx) — v3, reusable for all lookup entities.
Supports field types: text, number, select, textarea, remote-select, cascade-select
useLookup hook (hooks/useLookup.ts) — generic CRUD for lookup entities

Completed lookup pages:
  UnitsPage, CurrenciesPage, BrandsPage, FamiliesPage,
  WarehousesPage, PriceLevelsPage, TvasPage,
  NumberingSeriesPage, ExpenseCategoriesPage


═══════════════════════════════════════════════════════════
HOOKS — KEY PATTERNS
═══════════════════════════════════════════════════════════

useModal (hooks/useModal.ts) — open/close + entity state for drawers/modals
useDebounce (hooks/useDebounce.ts) — debounce search inputs (300ms default)
useNotification (hooks/useNotification.ts) — toast notifications
useTopbarTitle (hooks/useTopbarTitle.ts) — sets page title in topbar
usePagination (hooks/usePagination.ts) — pagination state for non-DataTable lists
useRemoteLabels (hooks/useRemoteLabels.ts) — fetch display labels for IDs


═══════════════════════════════════════════════════════════
OFFLINE SUPPORT
═══════════════════════════════════════════════════════════

lib/offline/: db.ts (IndexedDB), offlineAwareApi.ts, useOffline.ts
OfflineIndicator component — shows banner when offline
POS module prioritizes offline capability
--}}
