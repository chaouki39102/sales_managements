{{--
┌─────────────────────────────────────────────────────────────────────┐
│  Backend Conventions                                                │
│  File: .ai/guidelines/backend.blade.php                            │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
ARCHITECTURE PATTERN
═══════════════════════════════════════════════════════════

Controller → Service → Model (NEVER skip layers)

BaseApiController  (app/Core/Http/Controllers/BaseApiController.php)
  └─ Traits: ApiHelpers, ApiResponders, ApiSearchHelpers,
             HandlesApiExports, HandlesBulkOperations, HasApiList,
             ApiAssetHelpers, HandlesApiUploads

BaseService        (app/Core/Services/BaseService.php)
  └─ Concern: ValidatesTenantRelations

ApiListService     (app/Core/Services/ApiListService.php)
  └─ Uses Spatie QueryBuilder for all list endpoints


═══════════════════════════════════════════════════════════
CONTROLLER RULES
═══════════════════════════════════════════════════════════

✅ Always extend BaseApiController
✅ Delegate ALL business logic to the matching Service
✅ Use $this->getList() from HasApiList for index endpoints
✅ Use ApiResponders methods for all responses
✅ Use extractId() for resolving model IDs safely

❌ Never write queries directly in controllers
❌ Never bypass the Service layer


═══════════════════════════════════════════════════════════
SPATIE QUERYBUILDER — CRITICAL RULES
═══════════════════════════════════════════════════════════

ALWAYS use spread operator on allowedFilters, allowedSorts, allowedIncludes:

  // ✅ CORRECT
  ->allowedFilters([...config('filters'), new RangeFilter('amount')])

  // ❌ WRONG — causes 500 error
  ->allowedFilters([config('filters'), new RangeFilter('amount')])

Cache is DISABLED in getList() — do not re-enable (causes unserialize errors with QueryBuilder).


═══════════════════════════════════════════════════════════
MODEL TRAITS (app/Core/Traits/ + app/Models/Traits/)
═══════════════════════════════════════════════════════════

Core traits (all tenant models use):
  HasStandardizedConfiguration — registers ApiConfiguration attribute, standardizes config
  HasCompany                   — adds company_id, enforces tenant scope
  HasTenantSlug                — bootHasTenantSlug() for Brand, Family (slug generation)
  HasTenantRouteBinding        — scopes route model binding to company_id
  BelongsToFiscalYear          — fiscal_year_id FK + ResolvesFiscalYear

Other traits:
  Auditable / AuditableEnhanced
  SoftDeletesEnhanced          — IMPORTANT: always add manual company_id filter on soft-deleted queries
  HashesId, AdvancedSearchable, QueryOptimization, ValidationRules

Global scope:
  CompanyScope (app/Models/Scopes/CompanyScope.php) — auto-applies company_id on all queries


═══════════════════════════════════════════════════════════
MULTI-TENANCY — CRITICAL SECURITY RULES
═══════════════════════════════════════════════════════════

1. EVERY query must be scoped by company_id (CompanyScope handles models, but raw queries need manual scoping)
2. ValidatesTenantRelations — use in Services to prevent FK cross-tenant injection
3. Soft deletes: CompanyScope may not apply — ALWAYS add ->where('company_id', $companyId) manually
4. Cache keys MUST include company_id: "company:{$id}:resource:{$key}"
5. NIF/email uniqueness is PER company — never global unique constraints in validation
6. Mass assignment: always use $fillable, never $guarded = []
7. BaseService::beforeCreate() enforces mass assignment protection — never bypass

SetCompanyContext middleware (app/Http/Middleware/SetCompanyContext.php):
  Resolves {company:slug} from route → sets company context for the request
  All tenant routes pass through this middleware


═══════════════════════════════════════════════════════════
AUTHORIZATION
═══════════════════════════════════════════════════════════

Super Admin bypass:
  Gate::before() in AppServiceProvider — Super Admin bypasses ALL policy checks
  SuperAdminOnly middleware (app/Http/Middleware/SuperAdminOnly.php) — for /admin/* routes

Tenant permissions use standard Laravel Gates: 'can:{permission}' middleware on routes
Policies: one Policy per Model (app/Policies/) — all registered in PolicyServiceProvider

Spatie Roles/Permissions per company — seeded by CompanyRoleService::seedRoles()
Company lifecycle: CompanyObserver::created() triggers CompanySeeder


═══════════════════════════════════════════════════════════
OBSERVERS
═══════════════════════════════════════════════════════════

CommercialDocumentObserver   — triggers totals recalc, stock movements on status change
CommercialDocumentLineObserver — line-level totals, triggers document totals update
StockMovementObserver        — updates current_stock_cached (via DB trigger also)
CompanyObserver              — created() seeds initial company data via CompanySeeder


═══════════════════════════════════════════════════════════
SEEDING ARCHITECTURE
═══════════════════════════════════════════════════════════

DatabaseSeeder → GlobalSeeder (wilayas/communes, super-admin, global permissions)
CompanyObserver::created() → CompanySeeder (per-tenant data)
CompanyRoleService::seedRoles() — seeds roles per company
AdminSeedController — allows re-seeding a specific company from Super Admin panel

Seeders:
  GlobalSeeder: WilayaCommuneSeeder, GlobalRolesAndPermissionsSeeder, UserSeeder
  CompanySeeder: DocumentTypeSeeder, DocumentStatusSeeder, DocumentBaseOperationSeeder,
                 NumberingSeriesSeeder, PriceLevelSeeder, TvaSeeder, FiscalStampSeeder,
                 TreasuryAccountSeeder, TreasuryAccountTypeSeeder, PaymentModeSeeder,
                 StockMovementTypeSeeder, InventoryValuationMethodSeeder,
                 CurrencySeeder, UnitSeeder, WarehouseSeeder, SettingsSeeder,
                 DocumentTypeConversionSeeder


═══════════════════════════════════════════════════════════
REQUEST CLASSES
═══════════════════════════════════════════════════════════

Convention: Store{Model}Request + Update{Model}Request per resource.
All requests use app/Core/Traits/ValidationRules for shared rule sets.
Algerian-specific validation: NIF (15 digits), NIS, RC, AI fields in PartyService::validateAlgerianFields()


═══════════════════════════════════════════════════════════
API RESOURCES
═══════════════════════════════════════════════════════════

All responses use ApiResponse envelope:
  { "status": "success"|"error", "data": ..., "meta": ..., "links": ... }

Never return raw Model instances — always through Resource classes (app/Http/Resources/).
--}}
