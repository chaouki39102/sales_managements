{{--
┌─────────────────────────────────────────────────────────────────────┐
│  Security Rules — NEVER VIOLATE                                    │
│  File: .ai/guidelines/security.blade.php                           │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
ABSOLUTE RULES
═══════════════════════════════════════════════════════════

1. NEVER expose .env values in API responses or logs
2. NEVER write a query without company_id scope (tenant isolation)
3. ALWAYS use $fillable — never use $guarded = [] on any model
4. NEVER bypass BaseService::beforeCreate() mass assignment protection
5. NIF/email uniqueness is PER company — validate with company_id scope, never globally
6. NEVER use Gate::deny() for Super Admin checks — only Gate::before() in AppServiceProvider
7. NEVER store plain-text passwords — always Hash::make()
8. Rate limiting on sensitive routes: login/register (5/15min), password change (3/60min)


═══════════════════════════════════════════════════════════
SUPER ADMIN ARCHITECTURE
═══════════════════════════════════════════════════════════

Super Admin:
  - Identified by: user has 'super-admin' role OR is_super_admin flag
  - Bypasses ALL tenant policies via Gate::before() in AppServiceProvider
  - Accesses /api/v1/admin/* routes (protected by SuperAdminOnly middleware)
  - Can impersonate any company user (AdminImpersonateController)
  - Can re-seed any company data (AdminSeedController)

Admin controllers (app/Http/Controllers/Api/V1/Admin/):
  AdminCompanyController, AdminUserController, AdminDashboardController,
  AdminActivityController, AdminPlanController, AdminImpersonateController,
  AdminSystemSettingsController, AdminMaintenanceController,
  AdminSystemBootController, AdminSeedController, GlobalSeedController

Admin frontend (resources/js/pages/admin/):
  AdminDashboardPage, AdminCompaniesPage, AdminUsersPage,
  AdminActivityPage, AdminPlansPage, AdminReportsPage,
  AdminSettingsPage, AdminBootPage
  + components/admin/: CompanyDrawer, UserDrawer, shared.tsx
  + lib/api/admin/: client.ts, companies.ts, users.ts, system.ts, index.ts
  + hooks/admin/: useAdminCompanies.ts, useAdminUsers.ts, useAdminSystem.ts


═══════════════════════════════════════════════════════════
CROSS-TENANT INJECTION PREVENTION
═══════════════════════════════════════════════════════════

ValidatesTenantRelations (app/Core/Services/Concerns/ValidatesTenantRelations.php):
  Use in Services to validate that all FK references belong to the same company_id.
  Called in BaseService before create/update operations.

Example of what it prevents:
  User from company A submits warehouse_id that belongs to company B
  → ValidatesTenantRelations throws UnauthorizedException before any DB write


═══════════════════════════════════════════════════════════
SLUG SECURITY
═══════════════════════════════════════════════════════════

HasTenantSlug trait (app/Models/Traits/HasTenantSlug.php):
  Uses bootHasTenantSlug() — registered in model's boot() via static::creating()
  Applied to: Brand, Family
  Generates unique slug scoped to company_id

HasTenantRouteBinding (app/Models/Traits/HasTenantRouteBinding.php):
  Overrides resolveRouteBinding() to scope lookups by company_id
  Prevents accessing another tenant's resource via URL manipulation


═══════════════════════════════════════════════════════════
SOFT DELETES SAFETY
═══════════════════════════════════════════════════════════

SoftDeletesEnhanced trait — extends Laravel soft deletes.
CompanyScope global scope may not apply to withTrashed() / onlyTrashed() queries.

RULE: Always add manual ->where('company_id', $companyId) when using:
  - withTrashed()
  - onlyTrashed()
  - Any raw query on soft-deleted models


═══════════════════════════════════════════════════════════
CACHE ISOLATION
═══════════════════════════════════════════════════════════

Cache keys MUST include company_id to prevent data leakage between tenants.
Pattern: "company:{company_id}:{resource_name}:{optional_id}"

ModelCacheObserver (app/Core/Observers/ModelCacheObserver.php) — auto-invalidates on model events.
CacheWarmupCommand — pre-warms cache for active companies.
InvalidateModelCacheJob — async cache invalidation via queue.

❌ Never use generic cache keys without company_id: Cache::put('products', ...)
✅ Always: Cache::put("company:{$companyId}:products", ...)
--}}
