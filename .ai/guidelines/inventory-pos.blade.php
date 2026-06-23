{{--
┌─────────────────────────────────────────────────────────────────────┐
│  Inventory & POS                                                    │
│  File: .ai/guidelines/inventory-pos.blade.php                      │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
INVENTORY
═══════════════════════════════════════════════════════════

KEY MODELS
  StockMovement     — every stock in/out movement, scoped by company_id + fiscal_year_id
  StockMovementType — seeded types (purchase, sale, adjustment, return, transfer...)
  ProductLot        — batch/lot tracking per product
  OpeningBalanceStock — opening stock for a fiscal year
  ProductPackaging  — pack sizes per product/unit combo

KEY SERVICES
  InventoryStockService   — current stock queries, stock by warehouse
  InventoryReportService  — report generation (all raw queries MUST scope company_id)
  InventoryValuationService — FIFO/LIFO/WMAC valuation methods

CURRENT STOCK CACHED
  Column: products.current_stock_cached — maintained by DB trigger
  Trigger: Migration_CurrentStockCached.php + 2026_06_14_000004_fix_current_stock_cached_triggers.php
  MySQL/MariaDB only — NOT compatible with SQLite
  ❌ Never update current_stock_cached manually — let trigger handle it

OPENING BALANCE — CRITICAL BUG TO AVOID
  seedCurrentStock() MUST filter by is_current = 1 on fiscal_years table
  ❌ Never aggregate opening_quantity across ALL fiscal years
  ✅ Always: FiscalYear::where('company_id', $id)->where('is_current', 1)->first()

INVENTORY PAGE (Frontend)
  Location: pages/inventory/
  Files: InventoryPage.tsx (tabbed), StockTab.tsx, OpeningBalanceTab.tsx,
         InventoryShared.tsx, inventoryTypes.ts
  Tabs: stock movement tab + opening balance tab
  Uses apiGet<T[]> with explicit generics for envelope unwrapping


═══════════════════════════════════════════════════════════
POS MODULE
═══════════════════════════════════════════════════════════

KEY FILES
  pages/pos/POSPage.tsx          — main POS interface
  pages/pos/POSKioskPage.tsx     — kiosk/fullscreen mode
  pos/components/                — CartRow, CategoryTabs, ProductCard, ProductGrid,
                                   ProductSearchBar, ProfessionalCart, ProfessionalPaymentModal,
                                   ProfessionalReceipt, QuickItemsBar, CustomerSearchModal,
                                   HeldCartsModal, FilterPanel, ManualProductModal,
                                   KeyboardHelpModal, MobileTabs, POSTopBar,
                                   SessionStatsModal, ReturnsModal
  pos/hooks/usePOS.ts            — main POS orchestration hook
  pos/hooks/usePOSStore.ts       — Zustand store for POS state
  pos/hooks/useCartStore.ts      — cart state management
  pos/utils/calculations.ts      — price/tax calculation functions (tested)
  pos/utils/posHelpers.ts        — POS utility functions (tested)
  pos/utils/printService.ts      — receipt printing

KNOWN POS BUGS (reference — may already be fixed):
  1. loadedPageRef declaration order — must be declared before use in useEffect
  2. Price lookup uses price_ht field — NEVER use price_ttc as computation base
  3. quickItems persistence — use localStorage key 'pos_quick_items' for persistence

PRICE COMPUTATION IN POS
  ✅ Always use price_ht as base
  ✅ Apply quantity discounts from QuantityDiscount model
  ✅ Apply TVA on top of HT price
  ✅ Apply Timbre Fiscal if applicable (non-electronic payment)
  ❌ Never use price_ttc for discount or margin calculations

LAYOUTS
  POSLayout (components/layouts/POSLayout.tsx) — wraps all POS pages
  Separate from DashboardLayout — POS is fullscreen, no sidebar
--}}
