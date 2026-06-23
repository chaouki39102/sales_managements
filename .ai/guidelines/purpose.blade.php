{{--
┌─────────────────────────────────────────────────────────────────────┐
│  ERP / POS SaaS — تسيير المبيعات للمؤسسات الجزائرية               │
│  File: .ai/guidelines/purpose.blade.php                             │
└─────────────────────────────────────────────────────────────────────┘

PURPOSE
───────
Multi-tenant ERP/POS SaaS targeting Algerian businesses.
Modules: commercial documents, inventory, treasury, HR, fiscal management.
Compliance: Algerian fiscal law (TVA, Timbre Fiscal LF 2025, TAP abolished LF 2024).
Locale: Arabic RTL (ar-DZ), French document terminology (Bon de Livraison, Bon de Commande, Facture).
Administrative conventions: wilayas/communes, NIF/NIS/RC/AI fields.

STACK
─────
Backend : Laravel 11 + Sanctum + Spatie QueryBuilder
Frontend: React + TypeScript + Vite + React Router v6 + TanStack Query

ROUTE STRUCTURE (4 zones)
──────────────────────────
① /api/v1/auth/*                    — public, rate-limited
② /api/v1/companies/*               — auth:sanctum, user's own companies
③ /api/v1/admin/*                   — auth:sanctum + super.admin middleware (api_admin.php)
④ /api/v1/{company:slug}/{resource} — auth:sanctum + SetCompanyContext + tenant permission gates

TENANT MIDDLEWARE STACK (zone ④)
──────────────────────────────────
auth:sanctum → SetCompanyContext → can:{permission}

KEY MODELS (app/Models/)
────────────────────────
CommercialDocument, CommercialDocumentLine, DocumentType, DocumentTypeConversion,
DocumentStatus, DocumentBaseOperation, NumberingSeries,
Party, PartyType, PartyBalance,
Product, ProductPrice, ProductPackaging, ProductLot, ProductVariant,
StockMovement, StockMovementType, OpeningBalanceStock,
TreasuryAccount, TreasuryAccountType, Payment, PaymentMode, Check,
OpeningBalanceTreasury, OpeningBalanceParty, BankReconciliation,
FiscalYear, FiscalStamp, Tva, ExchangeRate,
Company, User, Role, Permission,
Brand, Family, Unit, PriceLevel, Warehouse, Currency,
Wilaya, Commune, Gender, LegalForm, PartyType, ProductType,
Employee, EmploymentContract,
Expense, ExpenseCategory,
Setting, Audit, Attachment, Notification, UserAlert, ApprovalThreshold

KEY SERVICES (app/Services/)
─────────────────────────────
CommercialDocumentService, CommercialDocumentLineService, ComputeLineService,
DocumentConversionService, DocumentReturnService, DocumentStatusService,
DocumentMailService,
PartyService, PartyBalanceService,
ProductService, InventoryStockService, InventoryReportService, InventoryValuationService,
StockMovementService,
PaymentService, CheckService, TreasuryAccountService, TreasuryBalanceService,
BankReconciliationService, AdvancePaymentService,
FiscalYearService, FiscalStampService (Tax/), TaxRuleService (Tax/),
FiscalYearClosureService (Accounting/),
CompanyService, CompanyRoleService, CompanyContextService,
AuthService, UserService, RoleService, PermissionService,
AlertEngine, ApprovalWorkflowService, NotificationService,
InventoryValuationMethodService,
ReportService, DashboardService, ImportService, AuditService,
BarcodeService, QRCodeService, CustomerInsightService, ProductSuggestionService,
NumberingSeriesService, SettingService, ExchangeRateService

FRONTEND STRUCTURE (resources/js/)
────────────────────────────────────
pages/documents/CommercialDocumentModal/ — modal split into sections
pages/documents/hooks/                   — useDocumentForm, useDocumentLookups, etc.
pages/pos/                               — POSPage, POSKioskPage + components/ + hooks/ + utils/
pages/inventory/                         — InventoryPage (tabbed: stock + opening balance)
pages/lookups/                           — LookupPage v3 (reusable for all lookup entities)
components/ui/DataTable/                 — enterprise DataTable v10 (virtual scroll, multi-sort, Excel export)
lib/api/core/                            — apiClient (Axios), queryKeys, queryClient, types
lib/api/endpoints/                       — per-domain endpoint files
lib/api/admin/                           — admin-specific client + endpoints
context/                                 — AuthContext, FiscalYearContext
--}}
