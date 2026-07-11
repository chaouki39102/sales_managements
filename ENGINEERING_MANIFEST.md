# ENGINEERING_MANIFEST.md

> **System Constitution** for `sales_managements` — Last updated: 2026-07-11

---

## Table of Contents

1. [System Architecture Blueprint](#1-system-architecture-blueprint)
2. [Strict Coding & Compatibility Standards](#2-strict-coding--compatibility-standards)
3. [Error Handling & Robustness](#3-error-handling--robustness)
4. [Frontend Architecture & Conventions](#4-frontend-architecture--conventions)
5. [Workflow Rules for AI/Human Developers](#5-workflow-rules-for-aihuman-developers)
6. [Quick Reference Tables](#6-quick-reference-tables)

---

## 1. System Architecture Blueprint

### 1.1 The "Company Context" Protocol

Every tenant-scoped request flows through a **3-layer multi-tenancy protocol**. No exceptions.

**Layer 1 — Middleware (`SetCompanyContext`)**

- Resolves the `{company}` route parameter (a slug string) to a `Company` model.
- Verifies user membership via `company_user` pivot (Super Admin bypasses).
- Calls `CompanyContextService::set($company->id)` to establish the request-scoped context.
- Merges `_company` into the request and shares it with views.

**Layer 2 — Global Scope (`CompanyScope`)**

- Every model using `HasCompany` trait automatically receives `WHERE {table}.company_id = ?` on every query.
- The scope reads `CompanyContextService::get()` from the container — never from `request()`, `session()`, or `auth()`.

**Layer 3 — Route Model Binding (`HasTenantRouteBinding`)**

- Overrides `resolveRouteBinding()` to query through the Eloquent builder (which includes `CompanyScope`), preventing cross-tenant data access via direct ID manipulation in URLs.

**Authoritative API for company context:**

```php
// Reading context (services, scopes, controllers):
$companyId = app(CompanyContextService::class)->get();

// Checking context existence:
$hasContext = app(CompanyContextService::class)->has();

// Temporary context switching (jobs, commands, seeders):
app(CompanyContextService::class)->runAs($companyId, function () {
    // All queries inside are scoped to $companyId
});

// NEVER do this in services:
// ❌ request()->input('_company')  — only valid in middleware
// ❌ auth()->user()->company_id    — use CompanyContextService instead
// ❌ session('company_id')         — not available in API context
```

**Critical rule:** `CompanyContextService::get()` returns `?int` (the company ID) or `null`. Methods are named `get()`, `set()`, `has()`, `clear()`, `runAs()` — **not** `getCompanyId()` or similar.

### 1.2 Data Flow Architecture

Every API request follows this standardized lifecycle:

```
HTTP Request
  → Sanctum (cookie auth)
  → SetCompanyContext middleware (sets CompanyContextService)
  → Controller::index/show/store/update/destroy()
    → Authorization: Gate/Policy via $this->authorizeAction()
    → Service method (all business logic lives here)
      → ValidatesTenantRelations (FK injection protection)
      → DB::transaction (mutations)
      → Cache invalidation (post-commit)
      → Event dispatch (post-commit)
    → JSON response (via ApiResponders or response()->json())
  → catch (\Throwable $e) → handleError() → structured JSON error
```

**Controller responsibilities (Thin Controller):**

- Extract and validate request data (via FormRequest or `getValidatedData()`)
- Call service method
- Return response
- Handle errors via `handleError()`

**Service responsibilities (Fat Service):**

- Business rules and validation (`BusinessRuleException`)
- FK relationship validation (`ValidatesTenantRelations` trait)
- Database mutations (wrapped in transactions)
- Cache management (`Cache::tags()` when available, fallback to `Cache::forget()`)
- Event dispatching

### 1.3 Dependency Injection (DI) Policy

| Context | Allowed | Prohibited |
|---------|---------|------------|
| **Services** | Constructor injection, method injection, `app()` container resolution | `request()`, `auth()`, `session()`, `session_*()` global helpers |
| **Controllers** | Method injection (Request, Service via `getService()`), FormRequest classes | Direct DB queries, business logic |
| **Middleware** | Constructor injection, `Auth::user()`, `request()` | Services (except `CompanyContextService`) |
| **Jobs/Commands** | Constructor injection, `CompanyContextService::runAs()` | Assumed request context |
| **Model boot methods** | `app(CompanyContextService::class)` only | `auth()`, `request()` |

---

## 2. Strict Coding & Compatibility Standards

### 2.1 MySQL Database Compliance

**Identifier Length Limit (64 characters)**

All index names, constraint names, and foreign key names **must not exceed 64 characters**. MySQL 5.7+ enforces this strictly. Exceeding it produces:

```
SQLSTATE[HY000]: General error: 1059 Identifier name is too long
```

**Naming convention for indexes:**

```
idx_{table_short}_{purpose}
```

Examples:
```php
$table->index(['company_id', 'active', 'created_at'], 'idx_products_list_sort');
$table->index(['company_id', 'name', 'active']);                                    // auto-named by Laravel
$table->index(['company_id', 'ref', 'barcode'], 'idx_products_lookup');
$table->index(['company_id', 'family_id', 'brand_id', 'active'], 'idx_products_filter');
```

**Composite index rule:** Always lead with `company_id` for tenant scoping.

**Migration Constraints:**

| Rule | Reason |
|------|--------|
| ❌ **Never use `$table->comment()`** | SQLite does not support table comments. The dev environment uses SQLite. |
| ❌ **Never use `$table->after()`** | MariaDB does not support column positioning. `after()` is MySQL-only. |
| ✅ Use `->nullable()` for backward-compatible additions | Prevents NOT NULL failures on existing rows |
| ✅ Use `->default()` explicitly | Prevents ambiguity across DB drivers |
| ✅ Use `foreignId('company_id')->constrained()->cascadeOnDelete()` | Universal tenant FK pattern |

### 2.2 Full-Text Search Abstraction

Search must work on both MySQL (FULLTEXT) and SQLite (LIKE). The abstraction is built into the model layer.

**Model declaration:**

```php
class Product extends Model {
    public static array $searchableFields = ['name', 'ref', 'barcode', 'description'];
    public static array $fulltextFields = ['name', 'description'];  // MySQL FULLTEXT only
}
```

**Engine behavior (`ApiListService::createGlobalSearchFilter`):**

| Database | Fields in `$fulltextFields` | Other fields |
|----------|---------------------------|--------------|
| **MySQL** | `MATCH(name, description) AGAINST(? IN BOOLEAN MODE)` with `*` suffix | `LIKE '%..%'` |
| **SQLite** | `LIKE '%..%'` for all fields | `LIKE '%..%'` for all fields |

**Rules:**

- Never write raw `LIKE '%..%'` in controllers or services — use the model's `$searchableFields` + `$fulltextFields` declarations.
- `ApiListService` handles the driver detection automatically via `DB::getDriverName()`.
- Boolean mode FULLTEXT requires a minimum word length (typically 3 chars) — the frontend search debounce (350ms) accounts for this.

### 2.3 Modern PHP Standards

**PHP version:** `^8.3` (Laravel 13)

**Strict typing:**

```php
declare(strict_types=1);  // Required at the top of every PHP file
```

**DocBlock requirements for all public methods:**

```php
/**
 * Creates a new commercial document with validated lines.
 *
 * @param  array{party_id: int, document_type_id: int, lines: array}  $data
 * @return CommercialDocument
 * @throws BusinessRuleException  If fiscal year is closed or products are inactive.
 * @throws ValidationException    If required fields are missing.
 */
public function createDocument(array $data): CommercialDocument
```

**PHP 8 features actively used:**

- `readonly` properties (PHP 8.1+)
- `match` expressions (PHP 8.0+)
- Named arguments for clarity
- Enums for status codes where applicable
- `#[Attribute]` for model markers (`#[Cacheable]`)

### 2.4 Model Configuration Standard

Every tenant model declares a static configuration block consumed by `HasStandardizedConfiguration` and `ApiListService`:

```php
public static array $searchableFields   = ['name'];
public static array $fulltextFields     = [];            // empty = no FULLTEXT
public static array $filterable         = ['active'];
public static array $sortable           = ['id', 'name', 'created_at'];
public static array $allowedIncludes    = [];
public static array $defaultWith        = [];
public static string $defaultSort       = 'name';
public static string $defaultSortDirection = 'asc';
public static int    $defaultPerPage    = 15;
public static int    $perPageLimit      = 2000;          // safety cap for shared hosting
public static ?int   $cacheTtl          = 300;           // seconds, null = no cache
public static array  $cacheTags         = ['products'];
```

---

## 3. Error Handling & Robustness

### 3.1 Exception Hierarchy

```
\Exception
├── FiscalYearClosedException (403)         — has render() for JSON
├── BusinessRuleException (409 default)     — 66+ throw sites across 13 services
├── ApiQueryBuilderException (400)          — invalid filter/sort/include
└── ApiException (400 default)
    ├── UnauthorizedException (401)
    ├── NotFoundException (404)
    └── ValidationException (422)
```

### 3.2 Error Classification in BaseApiController

Every exception is classified and logged at the appropriate level:

| Exception Type | Error Code | HTTP Status | Log Level |
|---------------|------------|-------------|-----------|
| `ModelNotFoundException` | `NOT_FOUND` | 404 | `info` |
| `BusinessRuleException` | `BUSINESS_RULE_VIOLATION` | 409 (or custom) | `info` |
| `AuthorizationException` | `AUTHORIZATION_ERROR` | 403 | `warning` |
| `UnauthorizedException` | `AUTHORIZATION_ERROR` | 401 | `warning` |
| `ValidationException` | `VALIDATION_ERROR` | 422 | `info` |
| `ApiQueryBuilderException` | `CLIENT_ERROR` | 400 | `info` |
| `HttpException` (< 500) | `CLIENT_ERROR` | original | `info` |
| Everything else | `SERVER_ERROR` | 500 | `error` |

**Standard JSON error response:**

```json
{
  "success": false,
  "message": "القيمة المحددة للحقل [party_id] غير موجودة",
  "code": "BUSINESS_RULE_VIOLATION",
  "timestamp": "2026-07-11T12:00:00Z",
  "errors": { "party_id": ["The selected party_id is invalid."] }
}
```

### 3.3 No Silent Failures

| Principle | Implementation |
|-----------|---------------|
| Every `catch` must log or re-throw | `BaseService::performPostCommitOperations()` catches `\Throwable` and logs at `warning` level — never swallows silently |
| Post-commit failures are non-blocking | Cache clear / event dispatch failures after a successful DB commit are logged but do not fail the request |
| Observer errors propagate | `StockMovementObserver::created()` catches `\Exception`, logs, and re-throws |
| Seeder errors are non-fatal | `CompanyObserver::created()` catches `\Throwable`, logs, but does NOT re-throw (company creation succeeds even if seeding fails) |

### 3.4 The `BusinessRuleException` Contract

This is the primary mechanism for communicating domain logic violations:

```php
throw new BusinessRuleException(
    message: 'المنتجات ذات المعرفات [42, 99] غير نشطة ولا يمكن بيعها.',
    code: 422  // Use 422 for validation-like business rules, 409 for lock/prevent operations
);
```

**Code selection guide:**

| Code | Use When |
|------|----------|
| `409` | Lock/prevent: "cannot edit locked document", "cannot delete party with invoices" |
| `422` | Business validation: "max products reached", "inactive products cannot be sold" |
| `400` | Feature not supported: "this resource does not support soft delete" |
| `403` | Permission within business context: "you don't have permission on this notification" |

---

## 4. Frontend Architecture & Conventions

### 4.1 API Client Architecture

**Request lifecycle:**

```
Component → useTenantQuery/useTenantMutation → apiGet/apiPost
  → Axios request interceptor (slug injection, auth, CSRF, timeout)
  → Server responds
  → Axios response interceptor (error classification)
  → extractData() (strips Laravel {status, message, data} envelope)
  → React Query cache
  → Component re-render
```

**Slug injection:** Every tenant API call automatically prepends `/{slug}/` to the URL. The slug comes from a getter function connected at app startup via `connectSlugToInterceptor()`.

**`extractData<T>()` function — Laravel response unwrapping:**

| Response Shape | Returns |
|---------------|---------|
| `{ data: T[] }` | `T[]` |
| `{ data: { data: T[], meta: {...}, links: {...} } }` | Full paginated object |
| `{ data: { data: T[] } }` | `T[]` (nested, no meta) |
| `{ data: { families: [...], brands: [...] } }` | Inner object as-is |
| `T[]` (direct array) | `T[]` |

### 4.2 Query Key Architecture

All query keys are centralized in `queryKeys.ts`. **Every tenant key takes `slug` as the first argument:**

```typescript
tenantKeys.products.all(slug)    → [slug, 'products']
tenantKeys.products.list(slug, p) → [slug, 'products', 'list', p]
tenantKeys.products.detail(slug, id) → [slug, 'products', id]
```

**Cache invalidation pattern:**

```typescript
qc.invalidateQueries({ queryKey: tenantKeys.products.all(slug) });
// This invalidates ALL product queries (list, detail, etc.) via prefix matching
```

### 4.3 Tenant Wrapper Hooks

**`useTenantQuery(keyFn, queryFn, opts?)`** — wraps `useQuery`:
- Reads `slug` from Zustand store
- Adds slug to query key
- Enforces `enabled: !!slug`

**`useTenantMutation(mutationFn, invalidateKeyFn, opts?)`** — wraps `useMutation`:
- On success, invalidates queries matching `invalidateKeyFn(slug)`

**ESLint enforcement:** The `no-restricted-syntax` rule in `eslint.config.js` warns on raw `useQuery()` / `useMutation()` calls in `resources/js/pages/**`, directing developers to use the wrapper hooks.

### 4.4 Response Shape Normalization

When a backend endpoint returns a non-standard response shape (e.g., aggregated lookups), always add a `select` normalizer in the React Query hook:

```typescript
function normalizeLookups(raw: unknown): ProductAggregatedLookups {
  if (!raw || typeof raw !== 'object') return EMPTY_LOOKUPS;
  const obj = raw as Record<string, unknown>;
  const pick = (k: string) => Array.isArray(obj[k]) ? obj[k] as never[] : [];
  return { families: pick('families'), brands: pick('brands'), /* ... */ };
}

// In the hook:
return useQuery({
  queryKey: tenantKeys.lookups.productsAggregated(slug),
  queryFn: () => apiGet('/lookups/products'),
  select: (raw) => normalizeLookups(raw),  // ← defensive normalization
});
```

This prevents `X.map is not a function` runtime crashes when the backend returns unexpected shapes, 500s, or cached data from a different context.

---

## 5. Workflow Rules for AI/Human Developers

### 5.1 Pre-Commit Checklist

| # | Check | How to Verify |
|---|-------|---------------|
| 1 | **DB index names ≤ 64 chars** | Count characters in every custom index name in new migrations |
| 2 | **No `->comment()` in migrations** | Search for `->comment(` in new migration files |
| 3 | **No `->after()` in migrations** | Search for `->after(` in new migration files |
| 4 | **New services resolve via container** | If the service is a singleton, register it in `AppServiceProvider::register()`. Otherwise, Laravel auto-resolves via constructor injection. |
| 5 | **No bypass of CompanyContextService** | Search for `request()->_company`, `auth()->user()->company_id` in service classes |
| 6 | **Controller signatures match BaseApiController** | `show($id)`, `update(Request $request, $id)`, `destroy($id)` — do NOT add `$company` parameter to these methods |
| 7 | **All mutations use `BusinessRuleException`** | Never return raw `response()->json(['error' => ...])` from services |
| 8 | **Frontend: slug in query keys** | Every `useQuery` in pages/ must include slug from `useActiveSlug()` |
| 9 | **Frontend: `enabled: !!slug`** | Every tenant query must gate on slug availability |
| 10 | **Build passes** | `npm run build` — 0 errors |

### 5.2 Controller Method Signatures — LSP Enforcement

**`BaseApiController` defines these concrete signatures. Overriding controllers MUST keep them identical:**

```php
public function show($id): JsonResponse          // NOT show($company, $id)
public function update(Request $request, $id): JsonResponse  // NOT update($company, Request $request, $id)
public function destroy($id): JsonResponse        // NOT destroy($company, $id)
```

Adding parameters to these overrides violates the Liskov Substitution Principle and causes PHP `FatalError` on class load.

**To safely resolve the ID in multi-tenant routes** where Laravel's `ControllerDispatcher` may splice a Company model into position 0:

```php
// Inside any CRUD method:
$companyId = $this->extractId($id);  // Handles Model instances, raw values, and null fallbacks
```

### 5.3 New Service Registration

```php
// app/Providers/AppServiceProvider.php
public function register(): void
{
    $this->app->singleton(CompanyContextService::class);
    // Register new singletons here

    // Services that need a new instance per call: do NOT register.
    // Laravel auto-resolves them via constructor injection.
}
```

### 5.4 New Model Checklist

When creating a new tenant model:

```php
class NewModel extends Model {
    use HasCompany;                    // 1. Multi-tenancy
    use HasStandardizedConfiguration;  // 2. Config standardization
    use SoftDeletes;                   // 3. Soft deletes (if applicable)
    use Auditable;                     // 4. Audit trail
    use HasTenantSlug;                 // 5. Slug generation (if name-based)
    use HasTenantRouteBinding;         // 6. Secure route model binding

    public static array $searchableFields = ['name'];
    public static array $fulltextFields   = [];
    public static array $filterable       = ['active'];
    public static array $sortable         = ['id', 'name', 'created_at'];
    public static array $allowedIncludes  = [];
    public static string $defaultSort     = 'name';
    public static int    $defaultPerPage  = 15;
    public static int    $perPageLimit    = 2000;
}
```

### 5.5 Migration Checklist

```php
Schema::create('new_models', function (Blueprint $table) {
    $table->id();
    $table->foreignId('company_id')->constrained()->cascadeOnDelete();  // Always first after id
    // ... columns ...
    $table->softDeletes();      // If applicable
    $table->timestamps();

    // Indexes — always lead with company_id, keep names ≤ 64 chars
    $table->index(['company_id', 'name', 'active']);
    // NO ->comment(), NO ->after()
});
```

### 5.6 Frontend New Page Checklist

```typescript
// 1. Use tenant query wrapper (not raw useQuery)
const { data, isLoading } = useTenantQuery(
  (slug) => tenantKeys.newResource.all(slug),
  (slug) => apiGet('/new-resources'),
);

// 2. Use tenant mutation wrapper (not raw useMutation)
const mutate = useTenantMutation(
  (data) => apiPost('/new-resources', data),
  (slug) => tenantKeys.newResource.all(slug),
);

// 3. Invalidate via slug-scoped keys
qc.invalidateQueries({ queryKey: tenantKeys.newResource.all(slug) });

// 4. Never call refetch() after mutation — rely on invalidateQueries
```

---

## 6. Quick Reference Tables

### 6.1 Middleware Stack

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | Sanctum `statefulApi()` | Cookie-based SPA authentication |
| 2 | `HandleCors` | CORS headers |
| 3 | `SetCompanyContext` (`company`) | Resolves `{company}` slug, sets `CompanyContextService` |
| 4 | `ApiAuthenticate` (`api.auth`) | JSON 401 guard (optional, Sanctum handles this) |
| 5 | `SuperAdminOnly` (`super.admin`) | JSON 403 guard for admin routes |

### 6.2 Route Groups

| Prefix | Auth | Middleware | Purpose |
|--------|------|-----------|---------|
| `/api/v1/auth/*` | Optional | throttle | Authentication |
| `/api/v1/companies/*` | `auth:sanctum` | — | User's own companies |
| `/api/v1/admin/*` | `auth:sanctum` | `super.admin` | Super Admin panel |
| `/api/v1/wilayas`, `/communes` | `auth:sanctum` | — | Global lookups (no tenant scope) |
| `/api/v1/{company}/*` | `auth:sanctum` | `company` | All tenant resources |

### 6.3 Package Versions

| Package | Version | Purpose |
|---------|---------|---------|
| PHP | ^8.3 | Runtime |
| Laravel | ^13.0 | Framework |
| Sanctum | ^4.0 | SPA authentication |
| Spatie Query Builder | ^7.2 | Filter/sort/include for API lists |
| Spatie Permission | ^7.3 | Roles and permissions |
| Spatie MediaLibrary | ^11.21 | File attachments |
| Maatwebsite Excel | ^3.1 | CSV/XLSX export |
| Vite + React | — | Frontend build |

### 6.4 Cache Strategy

| Layer | Driver | TTL | Scope |
|-------|--------|-----|-------|
| PHP sessions | `cookie` | Session lifetime | Per-user |
| Application cache | `file` | 15 min (lookups), 5 min (models) | Per-company via key prefix |
| React Query | In-memory | 10 min stale, 30 min GC | Per-tab |
| Product lookups | None (removed) | — | Direct Eloquent queries |

### 6.5 Environment Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `DB_CONNECTION` | `sqlite` | Dev uses SQLite; production uses MySQL/MariaDB |
| `SESSION_DRIVER` | `cookie` | Eliminates PHP session file locking for POS parallel XHR |
| `CACHE_STORE` | `file` | Shared hosting compatible |
| `QUEUE_CONNECTION` | `sync` | Dev runs synchronously |
| `BCRYPT_ROUNDS` | `12` | Default |

---

## Appendix: Files That Define the Architecture

| File | Role |
|------|------|
| `app/Services/CompanyContextService.php` | Tenant context singleton (get/set/has/clear/runAs) |
| `app/Models/Scopes/CompanyScope.php` | Global scope applying `WHERE company_id = ?` |
| `app/Models/Traits/HasCompany.php` | Trait that wires CompanyScope + auto-fill + relationship |
| `app/Models/Traits/HasTenantRouteBinding.php` | Secure route model binding through query builder |
| `app/Core/Http/Controllers/BaseApiController.php` | Abstract CRUD with error handling + extractId |
| `app/Core/Services/BaseService.php` | Abstract CRUD service with hooks + transactions |
| `app/Core/Services/ApiListService.php` | Central list/search/filter engine (Spatie) |
| `app/Core/Services/Concerns/ValidatesTenantRelations.php` | FK cross-tenant injection protection |
| `app/Core/Exceptions/BusinessRuleException.php` | Domain logic violation exception |
| `app/Http/Middleware/SetCompanyContext.php` | Middleware establishing tenant context |
| `bootstrap/app.php` | Middleware pipeline + aliases |
| `routes/api.php` | All API routes with middleware assignments |
| `resources/js/lib/api/core/client.ts` | Axios client with slug injection + extractData |
| `resources/js/hooks/useTenantQuery.ts` | React Query wrappers enforcing slug |
| `resources/js/lib/api/core/queryKeys.ts` | Centralized query key taxonomy |
| `resources/js/lib/api/endpoints/lookups.ts` | Shared endpoint hooks with defensive normalization |
| `eslint.config.js` | `no-restricted-syntax` enforcing tenant wrappers |
