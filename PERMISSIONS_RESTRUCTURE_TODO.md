# PERMISSIONS_RESTRUCTURE_TODO.md

Restructure the RBAC system so permission checks are REAL and enforced **everywhere they matter** — backend route gates, frontend page/route guards, sidebar nav filtering, button/title-level visibility, and settings-page tab hiding — on top of the already-seeded per-company Spatie roles (`owner` / `manager` / `cashier` / `viewer`), PLUS the new user request: **full control to the owner to assign/unassign the permission of ANY thing in the system to ANY user, including granular "view anything / any title / any button" permissions — make it like a professional (pro) permission system.**

**Status of this plan**: REVAMPED Sep 2026 — Context corrected to the verified 15-gate reality; Phases 1–4 **✅ DONE**; **Phase 5, 6, 7, 8 & the G-fix batch are the remaining work**. Work task-by-task below; **commit + push after EACH task**.

---

## Context — verified current state (Sep 2026)

- Roles/permissions are per-company Spatie (`Role`, `Permission`), seeded idempotently by `App\Services\CompanyRoleService::seedRoles()`, wired through:
  1. `CompanyObserver::created`
  2. `RolesAndPermissionsSeeder`
  3. `php artisan company:upgrade-roles {company_id}` (propagates to existing companies — REQUIRED after any key change)
- Canonical permission records live in the global tables, seeded by `database/seeders/GlobalRolesAndPermissionsSeeder.php` and mirrored per-company in `database/seeders/RolesAndPermissionsSeeder.php`. Verified keys: `manage_settings`/`view_audit_log`/`manage_company_members` present at r308/311/324 in `RolesAndPermissionsSeeder.php`; `manage_roles`/`view_roles` at r235–236 (`GlobalRolesAndPermissionsSeeder.php`) and r317–318 (`RolesAndPermissionsSeeder.php`).
- `App\Services\CompanyRoleService.php` = **502 lines** (not 492). `getRolePermissionsMap()` holds the 4 profiles (CURRENT ranges):
  - `owner`     → **r295–384** — FULL (incl. `view_roles`+`manage_roles` r360, `manage_settings`, `manage_company_members`, `transfer_ownership`, `update_company`, `manage_portal_orders`, `view_print_templates`+`manage_print_templates`, `view_settings`, `manage_backup`, `manage_printer`)
  - `manager`   → **r389–445** — ops, NO settings/roles/company mgmt; HAS `view_settings` r433, `view_print_templates` r433, `manage_portal_orders` r435, **`manage_company_members` r437** (user decision — not owner-only), `view_roles` r437; NO `manage_roles`, NO `manage_print_templates`, NO backups/printer
  - `cashier`   → **r450–478** — sales + parties + payments create + sales/PoR reports; `view_print_templates` r472 ONLY of the new keys (NO `view_settings`, NO `view_roles`)
  - `viewer`    → **r483–499** — read-only, all report read keys, `view_roles` r497, NO new keys
- **Backend gates in `routes/api.php` — 15 `can:` groups verified** (routes/api.php is 852 lines):

  | Line | Gate | What it guards |
  |---|---|---|
  | r347 | `can:view_inventory_report` | inventory report family |
  | r357 | `can:view_financial_report` | financial report family |
  | r486 | `can:view_audit_log` | audit-log reads (488–491) |
  | r504 | `can:view_any_user` | user READ routes (506–510) |
  | r514 | `can:update_company` (#1) | ref-table writes (517–536), products/parties writes (539–543), user writes (548–553), **roles/permissions CRUD (556–557)** [→ G1], employees (560–561), numbering-series (569–574), imports (580–585) |
  | r589 | `can:manage_company_members` | member mgmt ONLY (590–592: `assign-role`, `toggle-active`, DELETE user) — split OUT of the umbrella ✅ |
  | r596 | `can:manage_fiscal_year` | fiscal-year managed routes (597–604) |
  | r608 | `can:create_sales_document` | POS/create-sale routes |
  | r732 | `can:update_company` (#2, system) | system routes group — **still wraps backups + printers** (see polish note) |
  | r755 | `can:manage_backup` | backups routes (NESTED inside r732 → currently also require `update_company`) |
  | r768 | `can:manage_printer` | system/printers routes (NESTED inside r732 → currently also require `update_company`) |
  | r778 | `can:manage_portal_orders` | portal-orders admin (top-level sibling ✅) |
  | r810 | `can:view_settings` | `GET /settings` full dictionary (index only) |
  | r813 | `can:manage_settings` | `PATCH|PUT /settings` |
  | r826 | `can:manage_print_templates` | print-templates WRITES (metadata/CRUD) |

- **Still-ungated reads (any authenticated member)** — intended per the file comments in most cases, verify each during the G-batch:
  - roles catalog READ r476–477, permissions catalog READ r478–480 (candidates for `view_roles` — but the frontend RolesPage already gates itself; keep ungated unless decided otherwise)
  - `settings/group/{group}` r806 + `settings/{key}` r807 (USER DECISION: stay public to all members)
  - print-templates READS r819–823 (index/library/show) — user decision: reads stay ungated ("reading for all members")
  - report reads other than inventory/financial families (user decision: frontend guards enforce granular keys)
- Frontend hooks (source `resources/js/lib/api/endpoints/roles.ts`):
  - `myPermissions` → `GET /me/permissions` returns `string[]` (r75)
  - `myRoles` → `GET /me/roles` returns `{ roles: Role[]; permissions: string[] }` (r78–79) — **the top-level `permissions` array is the effective set candidate (role ∪ direct)** — VERIFY the backend returns the union, see Phase 6.
  - **CRITICAL CURRENT GAP**: `lib/permissions.ts` `usePermissions()` and `components/auth/RequirePermission.tsx` derive the set ONLY from roles (`roles.flatMap(r => r.permissions.map(p => p.name))`) — a directly-assigned per-user permission has NO frontend effect today. This is the root blocker for the new owner-control feature.
- `app/Services/UserService.php` ALREADY supports direct per-user permission assignment:
  - `afterCreate` r94–96: `if (isset($data['permission_ids']) && is_array(...)) $item->syncPermissions($data['permission_ids']);`
  - `update` r35–45: extracts `permission_ids` before `parent::update`, then `$item->syncPermissions($permissionIds)` — **`permission_ids` present = set (a `[]` clears); absent (null) = no change**. So "owner assigns any permission to any user" is mostly FRONTEND + gating, NO schema change (Spatie uses the existing `model_has_permissions` pivot; `User` uses `HasRoles` → `HasPermissions`).
- Users write routes (548–553: `store`, `PUT/PATCH users/{id}`, `restore`, `force-delete`, `change-password`) are under `can:update_company` — owner-only, so the per-user permission editor can ride the existing `PUT/PATCH users/{id}` (optionally re-gate with `manage_roles` → G1).
- Sidebar nav: `resources/js/components/layouts/DashboardLayout.tsx` — nav already permission-filtered (Phase 3: `navGroups` memo + `permissionForNavPath`, keeps `superAdminOnly` drop).
- TS permission catalog `resources/js/lib/permissions.ts` = **18 keys**: `view_dashboard, view_any_party, view_any_product, view_any_commercial_document, view_any_payment, view_any_user, view_roles, view_audit_log, manage_settings, manage_portal_orders, manage_backup, manage_printer, create_sales_document, view_sales_report, view_purchase_report, view_inventory_report, view_financial_report, view_cost_price` (`VIEW_ROLES`@file-line ~22). **Seeded-but-missing constants**: `view_print_templates`, `manage_print_templates`, `view_settings`, `manage_roles`, `manage_company_members`, `update_company` → Phase 7 adds them.
- `App\Policies\RolePolicy.php` (46 lines) references ONLY non-existent keys (`view_any_role`, `view_role`, `create_role`, …) → the policy can never authorize (locks ALL role actions) unless it ends in `true` — G2 rewrites it to `view_roles`/`manage_roles`.
- `RoleController`/`PermissionController` are read-only by design (BaseApiController CRUD trap), but r556–557 still register WRITE routes under `can:update_company` — G1 moves these into a `can:manage_roles` group.
- **Decisions already made by the user** (Sep 2026):
  - Phase 1+2 now; DB-backed custom roles LATER (see Phase 8 + ROADMAP).
  - Gate settings writes with `manage_settings` + `view_settings` for the full `GET /settings` (keep `GET /settings/group/{group}` + `GET /settings/{key}` readable by ALL).
  - Gate reports by family route groups (`view_inventory_report`, `view_financial_report` only); per-report keys stay frontend-enforced.
  - Split the `can:update_company` umbrella (done: portal-orders/manage-company-members setting gates).
  - `manage_company_members` granted to `manager` TOO.
  - **NEW (this revamp): per-user direct permission assignment is a first-class feature** — owner assigns/unassigns ANY permission to ANY user independently of their role; the frontend effective-set must be role ∪ direct; granular "view anything / any title / any button" permissions and a pro-style permission admin UI are wanted.

---

## Phase 1 — NEW permission keys + propagation (backend seeds) ✅ DONE

> **Executed Sep 2026.** 6 global `Permission` rows materialized via `GlobalRolesAndPermissionsSeeder`; profiles applied in `CompanyRoleService::getRolePermissionsMap()` (see updated Context ranges: owner r295–384, manager r389–445, cashier r450–478, viewer r483–499); propagated with `php artisan company:upgrade-roles 1`. Keys: `manage_portal_orders`, `view_print_templates`, `manage_print_templates`, `view_settings`, `manage_backup`, `manage_printer`.

---

## Phase 2 — Backend route gates (`routes/api.php`) ✅ DONE (core)

> **Executed.** Verified 15 `can:` groups (see Context table). Converted: audits → `view_audit_log` (486); `view_any_user` (504); users writes kept on `update_company` (514); **member-mgmt split into `can:manage_company_members` (589–592)**; `manage_fiscal_year` (596); `create_sales_document` (608); `manage_portal_orders` as a top-level group (778); `view_settings` (810) / `manage_settings` (813); `manage_print_templates` writes (826); report families `view_inventory_report` (347) / `view_financial_report` (357).

**Phase 2-polish (remaining, small)**: backups (`manage_backup` r755) and printers (`manage_printer` r768) are still NESTED inside the r732 `can:update_company` system group — they currently require BOTH `update_company` AND the new key. Decide: decode them into top-level sibling groups (true owner-key-only gating) or leave the double-gate. Recommended: fully decode to match `manage_portal_orders` (778) — owners only, key-only.

**Rule (unchanged)**: `settings/group/{group}` + `settings/{key}` (r806–807) and all print-template READS (r819–823) stay public to any authenticated member — never gate them.

---

## Phase 3 — Frontend guards (routes + nav + 403) ✅ DONE

> **Executed** (commits `8e30fd1`, `dab6072`, + Phase 3 commit): `lib/permissions.ts` (PERMISSION constants, `usePermissions()` — roles-scoped set + `can()`, super-admin bypass, `NAV_PATH_PERMISSION` + `permissionForNavPath`), `RequirePermission` (named export), `ForbiddenPage`, route wrap per table (`/` → `view_dashboard`; `/pos*` → `create_sales_document`; `/documents/*` → `view_any_commercial_document`; `/parties`,`/clients`,`/suppliers` → `view_any_party`; `/products`,`/inventory/*` → `view_any_product`; `/finance/*` → `view_any_payment`; `/users` → `view_any_user`, `/roles` → `view_roles`; `/audit-log` → `view_audit_log`; `/settings*` → `manage_settings`; `/portal-orders` → `manage_portal_orders`), sidebar `navGroups` memo filtering. Verified: tsc clean · vitest 405/405 · build 0 errors · SW MATCH.

**Phase 3-note (revisited in Phase 6)**: the roles-scoped set derivation must change to **role ∪ direct** once direct per-user assignment ships — see Phase 6.

---

## Phase 4 — Settings page gating (`SettingsPage.tsx`) ✅ DONE

> **Executed**: tab gates use `view_any_user` (users), `manage_backup` (backup), `manage_printer` (printers); added the `MANAGE_BACKUP`/`MANAGE_PRINTER` constants. Verified: tsc clean · vitest 405/405 · build 0 errors · SW MATCH.

---

## Phase 5 — Test coverage (pest) — PENDING

Add to `tests/Feature/` (in-memory sqlite; sanitize fixtures). Add helper `actingAsRole($user, $role, $companyId)` in `tests/Pest.php` (build the company-hop role pivot):

1. As `manager`: `GET /settings` → 403; `GET /settings/group/general` → 200; `PATCH /settings` → 403; `POST /portal-orders/{id}/convert` → 403; `GET /reports/sales` → 200; `GET /roles` → 200 (view_roles), `PUT /roles/{id}` → 403 (no manage_roles).
2. As `owner`: all of the above → 2xx (owner has full).
3. As `viewer`: `POST /print-templates` → 403; `GET /print-templates` → 200.
4. **NEW (Phase 6 blocker tests)**: give a `cashier` user a DIRECT `view_settings` permission (`$user->givePermissionTo('view_settings')`) → `GET /settings` → 200 while the role itself has no `view_settings`; then `$user->revokePermissionTo('view_settings')` → 403. Assert `GET /me/roles` returns `permissions` containing the direct grant.

**Verify**: `vendor\bin\pest.bat` green.

---

## Phase 6 — USER REQUEST: owner full control — assign/unassign ANY permission to ANY user + effective-set fix

**Goal**: the owner can open any user and grant/revoke ANY permission directly (independent of the user's role) — like Clone/ACL-override in pro systems. Direct grant in → route gates AND frontend nav/buttons/route guards ALL respond immediately.

### 6a. Backend `/me/roles` returns the EFFECTIVE (role ∪ direct) set
- Verify `PermissionController::myRoles()` currently returns the union. The cleanest implementation: `$user->getAllPermissions()->pluck('name')` for the `permissions` array (Spatie `getAllPermissions()` already merges role + direct per-user perms). If it currently returns only role-derived names, change it.
- Confirm `\App\Models\User` uses `HasRoles` (gives the `model_has_permissions` pivot + `getAllPermissions()`).
- **Files**: `app/Http/Controllers/Api/V1/PermissionController.php` (myRoles), `app/Models/User.php` (check trait).
- **Verify**: `php artisan tinker --execute="dump(\App\Models\User::find(1)->getAllPermissions()->pluck('name'));"` includes both role + direct names.

### 6b. Frontend effective set = the `permissions` array from `/me/roles`
- `lib/permissions.ts` `usePermissions()` and `components/auth/RequirePermission.tsx`: replace the role-derived derivation with `data.permissions` (the union from `/me/roles`). Keep the super-admin bypass + empty-while-loading behavior.
- **This is the single highest-leverage line**: once the FE set reads the union, EVERY route guard, nav item, and `can()` gate instantly honors direct per-user grants.
- **Files**: `resources/js/lib/permissions.ts`, `resources/js/components/auth/RequirePermission.tsx`.
- **Verify**: `npx tsc --noEmit`; vitest (permission tests if present) + build.

### 6c. Owner per-user permission editor (UI)
- In `resources/js/pages/users/UsersPage.tsx` (edit drawer/modal): add a «الصلاحيات» section listing ALL permissions grouped by `group` (use `permissionsApi.byGroup()` → `usePermissionsGrouped` already exists, disabled key: `[...,'permissions','grouped']`).
- Each permission row = a checkbox (checked = direct grant). Load the user's CURRENT DIRECT perms only (not role-derived) — e.g. `GET /users/{id}` must expose `direct_permissions: Permission[]` (add a `with('permissions')`/accessor in `UserController`/`UserResource` — verify the resource; if it already sends `permissions`, use it), OR read the same effective-set and subtract role perms.
- Save via the existing `PUT/PATCH users/{id}` with `permission_ids: [ids…]` — **send an EXPLICIT `[]` to clear all direct perms** (absent `permission_ids` = no change; nullable `null` = no change — per `UserService::update` r35–37, do NOT send the field when unused).
- Roles stay untouched when editing direct perms — direct perms are ADDITIVE (∪). Show a hint: «الصلاحيات المباشرة تُضاف إلى صلاحيات الدور».
- Gate the editor behind `can('update_company')` (current group) or, per G1, `manage_roles` — owner-only either way.
- After save, invalidate the `my-roles`/`my-permissions` query keys (`roleKeys.all(slug)`) so the user's OWN nav updates on next load; for OTHER users the effect lands at their next `/me/roles` refetch (5 min staleTime — acceptable; lower staleTime for the affected user if needed).
- **Files**: `resources/js/pages/users/UsersPage.tsx`, possibly `resources/js/lib/api/endpoints/users.ts` + `UserController`/`UserResource`.
- **Verify**: tsc · build · manual smoke.

### 6d. Clear + give semantics tested
- Empty `[]` clears; re-add works; role perms never removed by direct-edit; a direct grant shows in `/me/roles`.

**Verify (all)**: pest Phase 5 items + `npx tsc --noEmit` + `npm test` + `npm run build` + SW MATCH. Commit + push.

---

## Phase 7 — USER REQUEST: granular "view anything / any title / any button" + TS catalog parity

**Goal**: an owner can grant *see-only* style permissions down to specific titles/buttons ("make it like pro"). Focused, money/visibility-safe scope; correlate BEFORE proposing a giant key list.

### 7a. TS catalog parity (do FIRST — pure hygiene)
- Add the 6 missing constants to `lib/permissions.ts`: `VIEW_PRINT_TEMPLATES`, `MANAGE_PRINT_TEMPLATES`, `VIEW_SETTINGS`, `MANAGE_ROLES`, `MANAGE_COMPANY_MEMBERS`, `UPDATE_COMPANY` (names follow the existing lowercase-snake convention; add to `PERMISSION`, `NAV_PATH_PERMISSION` if a nav/route maps to them — e.g. print-templates designer page, roles management).
- Grep all consumers of `usePermissions().can(...)` and switch hardcoded string literals to the constants.
- **Verify**: tsc + build.

### 7b. New granular "view/action" keys (pro-style, backend-seeded)
- With the USER, pick the concrete titles/buttons that need per-role/per-user visibility. Starter set (align with existing schema's `group` column):
  - **View/see-only**: `view_any_warehouse`, `view_any_employee`, `view_any_purchase_document`, `view_any_asset` (only if such pages exist — verify page inventory first).
  - **Action/button-level**: `export_reports_excel`, `print_documents`, `convert_documents`, `manage_price_levels`, `manage_numbering_series`, `manage_imports`, `edit_documents`, `delete_documents`, `manage_payments`, `delete_payments`.
  - Each key needs: seeding in BOTH `GlobalRolesAndPermissionsSeeder.php` + `RolesAndPermissionsSeeder.php`, wiring into `getRolePermissionsMap()` (owner = ALL; manager/cashier/viewer per a decided matrix — enter those decisions in `# Resolved decisions`), then `php artisan company:upgrade-roles {company_id}` for each company.
- **Frontend mapping**: a `BUTTON_PERMISSION`/`TITLE_PERMISSION` registry (mirror of `NAV_PATH_PERMISSION`) so any button/title can gate with `can(key)` — the pro "any title any btn" mechanism. Add tests that every key in the registry exists in the seeder canon (anti-drift).
- **Files**: 2 seeder files, `CompanyRoleService.php`, `lib/permissions.ts`, `lib/permissions.ts`-family registry, target pages/buttons, plus a regression test.
- **Verify**: pest (seeder canon + gate), tsc, build, SW MATCH, `company:upgrade-roles` run. Commit + push.

**Rule**: every new granular key must be SEEDED + PROFILE-WIRED + TS-CONSTANT + frontend-gated in the SAME commit — no half-shipped keys (dead DB rows rot like the old `manage_roles`-in-DB-but-not-in-TS situation).

---

## Phase 8 — Pro permission admin intelligence (after 6+7)

- **Roles × permissions matrix** UI in `RolesPage.tsx` (owner): checkbox grid role×permission grouped by `group`, saving via the existing `roles/{id}` PUT (`permission_ids`) — this is the backend RBAC "pro" surface.
- **User × permission matrix** view: reuse the Phase 6c editor but page-wide (table: users × permission groups; click a cell toggles that user's direct grant).
- **Copy / baseline**: «نسخ صلاحيات هذا المستخدم إلى مستخدم آخر» and «نسخ من دور» (copies the role's set as direct grants).
- **Search + group filter** across the matrices (reuse `usePermissionsGrouped`).
- **Audit trail** of permission changes (who granted/revoked what to whom, when) — the `DataAuditSubscriber` already audits model writes; verify `model_has_permissions`/`role_has_permissions` syncs surface there, else add a small `PermissionChangeLog`.
- **ROADMAP gate**: DB-backed CUSTOM roles (name/perms editable per company) remains LATER — per-user direct assignment is the complement now, not the replacement. Revisit ROADMAP after this phase.

---

## G-fix batch (gate correctness — small, do before/with Phase 6)

### G1 — roles/permissions CRUD routes → `can:manage_roles`
- Move r556–557 (`apiResource('roles')` + `apiResource('permissions')` writes) OUT of the r514 `can:update_company` group into a new `Route::middleware('can:manage_roles')->group(...)` (mirror the r589–592 pattern). Optionally gate the catalog reads (r476–480) with `view_roles` — manager has `view_roles`, cashier does NOT, so reads-for-manager/viewer + writes-for-owner is the clean matrix.
- **Verify**: `php artisan route:list --path=roles` shows `manage_roles` middleware; pest: manager `PUT /roles/{id}` → 403, owner → 200.

### G2 — `RolePolicy` dead keys → real keys
- Rewrite `app/Policies/RolePolicy.php` (46 lines): `viewAny`/`view` → `view_roles`; `create`/`update`/`delete`/`restore`/`forceDelete` → `manage_roles`. Register the policy if not already (check `AppServiceProvider`/`AuthServiceProvider` Gate::policy mapping for `Role::class`).
- **Verify**: `php -l`, tinker `Gate::allows` smoke, `npx tsc` (no FE change).

### G3 — `UsersPage` edit-form must not initialize `permission_ids` from role-derived perms
- Ensure the edit form's `permission_ids` initializes from DIRECT perms only (role-derived perms shown as read-only chips). Without G3, a save would "flatten" role perms into direct grants or drop them. This is the correctness precondition for Phase 6c.

### Package B notes
- `can()` gate sweep across all pages landed in Phase 3; extend with the Phase 7 buttons/titles registry; keep `usePermissions()` as the single gating hook (no ad-hoc `useMyPermissions` in new code).

---

## Phase 6/7/8 verification harness (per task)

```
php -l <touched php files>
vendor\bin\pest.bat
php artisan company:upgrade-roles 1   (whenever a key/profile changed)
npx tsc --noEmit
npm test
npm run build   (0 errors; precache entries change only if FE touched)
(Get-FileHash public/sw.js) -eq (Get-FileHash public/build/sw.js)   # SW MATCH when FE touched
git add -A && git commit -m "chore(rbac): <task summary>" && git push
```

---

## ROADMAP (LATER — DB-backed custom roles)

Not now. Planned shape (do NOT execute yet): eliminate the hardcoded profile arrays in `getRolePermissionsMap()`, make roles user-editable (name/perms) per company via the existing `/roles` API, add a `SettingsSeeder`-style permission-grouped UI for `manage_roles`, and a migration to snapshot the current standard profiles as seed data for existing companies. Document in new `docs/ROADMAP_PERMISSIONS_CUSTOM_ROLES.md` when started. Phase 8's matrix/copy/audit work builds the UI surface this roadmap needs.

## Resolved decisions (confirmed by user — Sep 2026)
1. **`manage_company_members` is granted to the `manager` role** (invite/revoke members + assign-role/toggle-active/delete user) — NOT owner-only anymore. Owner stays the only role with `update_company`.
2. **Reports gating = per-family route groups** (`financial` → `view_financial_report`, `inventory` → `view_inventory_report`). Granular per-report keys stay frontend-enforced.
3. **Per-user direct permission assignment is a first-class feature** (owner assigns/unassigns ANY permission to ANY user; effective = role ∪ direct). This is the Phase 6/7 request — do NOT revert to role-only.
4. **Granular "view anything / any title / any button" permissions** are wanted (Phase 7) — concrete key list and per-role matrix to be confirmed with the user before seeding.
5. **`settings/group/{group}` + `settings/{key}` + print-template reads stay public** to any authenticated member.