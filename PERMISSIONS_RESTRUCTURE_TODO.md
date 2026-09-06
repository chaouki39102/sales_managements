# PERMISSIONS_RESTRUCTURE_TODO.md

Restructure the RBAC system so permission checks are REAL and enforced **everywhere they matter** — backend route gates, frontend page/route guards, sidebar nav filtering, and settings-page tab hiding — on top of the already-seeded per-company Spatie roles (`owner` / `manager` / `cashier` / `viewer`).

**Status of this plan**: awaiting execution by another session. Work task-by-task below; **commit + push after EACH task**.

---

## Context — verified current state (Sep 6, 2026)

- Roles/permissions are per-company Spatie (`Role`, `Permission`), seeded idempotently by `App\Services\CompanyRoleService::seedRoles()`, wired through:
  1. `CompanyObserver::created`
  2. `RolesAndPermissionsSeeder`
  3. `php artisan company:upgrade-roles {company_id}` (propagates to existing companies — REQUIRED after any key change)
- Canonical permission records live in the global tables, seeded by `database/seeders/GlobalRolesAndPermissionsSeeder.php` and mirrored per-company in `database/seeders/RolesAndPermissionsSeeder.php` (canon confirmed: `manage_settings`/`view_audit_log`/`manage_company_members` present at r308/311/324 in `RolesAndPermissionsSeeder.php`).
- `App\Services\CompanyRoleService.php` (492 lines) `getRolePermissionsMap()` holds the 4 profiles:
  - `owner`      → r295–378 (FULL, incl. `manage_settings`, `manage_roles`, `manage_company_members`, `transfer_ownership`, `update_company`)
  - `manager`    → r383–435 (ops, NO settings/roles/company mgmt, `view_roles` ONLY, HAS `view_any_commercial_document`)
  - `cashier`    → r440–468 (sales + parties + payments create + sales/PoR reports)
  - `viewer`     → r473–489 (read-only, all report read keys)
- **Backend gates in `routes/api.php` — ONLY 4 `can:` groups exist** (everything else rides on `auth:sanctum + 2fa.verified + company`):
  | Line | Gate | What it guards |
  |---|---|---|
  | r491 | `can:view_any_user` | user read routes |
  | r501 | `can:update_company` | user write routes (incl. role assignment) |
  | r578 | `can:manage_fiscal_year` | fiscal-year managed routes |
  | r590 | `can:create_sales_document` | POS/create-sale routes |
  | r714 | `can:update_company` (2nd) | write routes: tax-config, regulated-products, subsidized-sales, g50/ifu, portal-access (731–734), **portal-orders admin (737–742)**, backups (745–753), system printers (756–760) |
- **Ungated sections** (authenticated any member):
  - `reports/*` r334–364 (all report GETs)
  - roles/permissions catalog READ r467–471
  - audits READ r476–479
  - `GET /settings` index r786 + `PATCH|PUT /settings` r787–788
  - `print-templates` CRUD r791–801 (comment on r790: "reading AND writing for all members")
- Frontend hooks (source `resources/js/lib/api/endpoints/roles.ts`):
  - `useMyPermissions()`  r169 — `permissionsApi.myPermissions`, key `[...,'my-permissions']`
  - `useMyRolesAndPermissions()` r183 — `permissionsApi.myRoles`, key `[...,'my-roles']`
  - Consumers ALREADY gating UI on these: `SettingsPage.tsx` (r30/86), `CommercialDocumentPage.tsx` (r9/133), `ProductsReportPage.tsx` (r6/33), `SalesReportPage.tsx` (r6/19), `RolesPage.tsx` (r17/60).
- Sidebar nav: `resources/js/components/layouts/DashboardLayout.tsx` — `NAV_GROUPS` r15, current filter r710 only drops `superAdminOnly` groups.
- Single route table: `resources/js/routes/index.tsx` (guards `RequireAuth` / `RequireCompany` / `RequireSuperAdmin`).
- **Decisions already made by the user**:
  - Phase 1+2 now, Phase 3 (DB-backed custom roles) LATER.
  - Gate settings writes with `manage_settings` + new `view_settings` for the full `GET /settings` dictionary (keep `GET /settings/group/{group}` and `GET /settings/{key}` readable by ALL members).
  - Gate reports by per-report keys.
  - Split the `can:update_company` umbrella.
  - The frontend hides settings tabs via commit `eb98378` (needs rebase onto REAL permissions, NOT removal).
  - **`manage_company_members` is granted to the `manager` role TOO** (managers may invite/revoke company members — no longer owner-only).
  - **Reports gating = per-family route groups** (distinct `can:` middleware per money-sensitive report family only); granular per-report keys stay enforced by the frontend route/nav guards (Phase 3).

---

## Phase 1 — NEW permission keys + propagation (backend seeds)

**Status: ✅ DONE (executed Sep 6, 2026).** 6 global `Permission` rows materialized (ids 185–190) via `GlobalRolesAndPermissionsSeeder`; profiles applied in `CompanyRoleService::getRolePermissionsMap()`; propagated with `php artisan company:upgrade-roles 1`. DB verified: owner=all 6, manager=4 (`manage_portal_orders`, `view_print_templates`, `view_settings`, `manage_company_members`), cashier=1 (`view_print_templates`), viewer=none.

Add these keys to the canonical permission canons AND the role profiles. They do **not** exist yet anywhere.

**New keys:**
- `manage_portal_orders` — admin manage/view of `/portal-orders` (manager, owner)
- `view_print_templates` / `manage_print_templates` — template read / template write (owner: both; manager: view; cashier: view)
- `view_settings` — full `GET /settings` dictionary (owner + manager; NOT cashier/viewer)
- `manage_backup` — backups section (owner only)
- `manage_printer` — system printers section (owner only)

**Files + tasks:**
1. `database/seeders/GlobalRolesAndPermissionsSeeder.php` — add the 6 new records to the canonical permission list (find the block around r228–240 where `manage_settings`/`view_audit_log`/`manage_company_members` are declared; add the new ones with matching `group`s: `الإعدادات` for `view_settings`, `الشركة`/`الصيانة` for the rest).
2. `database/seeders/RolesAndPermissionsSeeder.php` — same 6 records around r308–324.
3. `app/Services/CompanyRoleService.php` `getRolePermissionsMap()`:
   - `owner` (r295–378): add `manage_portal_orders`, `view_print_templates`, `manage_print_templates`, `view_settings`, `manage_backup`, `manage_printer`.
   - `manager` (r383–435): add `manage_portal_orders`, `view_print_templates`, `view_settings`, **`manage_company_members`** (user decision — NOT owner-only anymore) (still NOT `manage_print_templates`, NOT backups/printer).
   - `cashier` (r440–468): add `view_print_templates`.
   - `viewer` (r473–489): **NO new keys** (final decision — viewer is strict read-only; `view_settings` exposes the full settings dict).
4. **Propagate** (each company; the command calls `seedRoles()` which is idempotent and refreshes `role_has_permissions` + `forgetCachedPermissions()`):
   ```
   php artisan company:upgrade-roles {company_id}
   ```
   Run for the real company 1 (and any others). Verify: `php artisan tinker --execute="dump(\App\Models\Role::where('name','owner')->first()->permissions->pluck('name')->contains('manage_portal_orders'));"`

**Verify**: `php -l` on the 3 PHP files.

---

## Phase 2 — Backend route gates (`routes/api.php`)

| Route | Current | Change to |
|---|---|---|
| `GET /settings` r786 | none | `can:view_settings` |
| `PATCH /settings`, `PUT /settings` r787–788 | none | `can:manage_settings` |
| `print-templates` WRITES r796–801 (`store`, `update/{id}`, `delete/{id}`, `set-default`, `duplicate`, `upload-logo`) | none | `can:manage_print_templates` |
| `print-templates` READS r791–795 (`index`, `library`, `install`, `show/{id}`) | none | leave ungated (any authenticated member) OR `can:view_print_templates` — **keep the r790 comment's "reading for all members" intent: leave reads ungated** |
| `reports/*` r334–364 | none | per-family route groups: `financial` → `can:view_financial_report`, `inventory` → `can:view_inventory_report`; other families stay ungated (see Phase 2-note below) |
| `audits*` r476–479 | none | `can:view_audit_log` |
| `portal-orders/summary|index|show/{id}` r737–739 | inside r714 `can:update_company` | `can:manage_portal_orders` |
| `portal-orders` WRITES r740–742 (`update`, `updateLines`, `convert`) | `can:update_company` | `can:manage_portal_orders` |
| `backups/*` r745–753 | `can:update_company` | `can:manage_backup` |
| `system/printers*` r756–760 | `can:update_company` | `can:manage_printer` |
| user write routes r501 group | `can:update_company` | member-mgmt endpoints (`assign-role`, `toggle-active`, `delete`) → `can:manage_company_members`; other user writes (`store`, `update` of profile fields, invite) keep `can:update_company` — see umbrella-split note |

**Implementation pattern** — wrap the targeted routes in their own `Route::middleware('can:...')->group(...)` instead of editing each line:
- Move r786–788 (settings index/update) — but r782–783 (`settings/group`, `settings/{key}`) MUST stay OUTSIDE the gated group so members keep byGroup/getValue.
- Move print-template WRITE lines (r796–801) into `can:manage_print_templates`; leave r791–795 reads outside.
- Move audits reads into `can:view_audit_log`.
- Move member-management user writes (`assign-role`, `toggle-active`, DELETE user) into `can:manage_company_members`.
- Move `portal-orders` (r737–742) out of the r714 `can:update_company` group into `can:manage_portal_orders`.
- Move `backups` (r745–753) into `can:manage_backup`; `system/printers` (r756–760) into `can:manage_printer`.
- Reports: add a `can:view_financial_report` group wrapping the `financial` family routes and a `can:view_inventory_report` group wrapping the `inventory` family routes.

**Phase 2-note (reports)**: per-report middleware would need 27 one-line groups. USER DECISION: per-family route groups. Add ONE `Route::middleware('can:…')->group(...)` per money-sensitive report family only — `financial` → `can:view_financial_report`, `inventory` → `can:view_inventory_report` — for the `GET /reports/{family}/*` lines in r334–364. All other report families stay ungated at the route level (granular keys like `view_sales_report` remain enforced by the frontend guards in Phase 3). Read-only report GETs remain permitted for `viewer`+ per the existing profiles in `getRolePermissionsMap()` — do NOT grant every report key to every role.

**Umbrella-split note (r501 + r714 `can:update_company`)**: USER DECISION made — the umbrella is split as follows:
- `r501` group: the member-management endpoints (`users/assign-role`, `users/{id}/toggle-active`, `users/{id}` DELETE) move OUT into their own `Route::middleware('can:manage_company_members')->group(...)` — managers now hold this key, so invite/revoke/role-assign works for managers and stays denied for cashier/viewer. The remaining user writes (`store`, `PATCH /users/{id}` profile updates, `invite`) keep `can:update_company`.
- `r714` group: portal-orders → `can:manage_portal_orders`, backups → `can:manage_backup`, system/printers → `can:manage_printer` (see the Phase 2 table). The leftover routes keep `can:update_company`.
- Do NOT automatically grant `update_company` to managers; owner-only admin areas (backups/printer mirror the superadmin system tools) stay owner-gated via the new keys.

**Verify**: `php artisan route:list --path=settings`, `--path=print-templates`, `--path=portal-orders`, `--path=reports`, `--path=backups`, `--path=system` show the middleware. `php artisan api:cache` NOT available (SPA) — skip. Then smoke: login as a `manager` user → `GET /settings` must 403 while `GET /settings/group/general` returns 200.

**Rule**: `byGroup`/`getValue` (r782–783) stay PUBLIC to any authenticated member per the user decision — never gate them.

---

## Phase 3 — Frontend guards (routes + nav + 403)

**Files:**
1. NEW `resources/js/pages/errors/ForbiddenPage.tsx` (Arabic 403 page: «غير مصرح لك بالوصول», button back to dashboard).
2. NEW `resources/js/components/auth/RequirePermission.tsx` — wrapper reading `useMyRolesAndPermissions` (empty while loading → render skeleton/`null`), derives `permissionsSet = new Set(roles.flatMap(r => r.permissions.map(p => p.name)))`, renders `<ForbiddenPage/>` when the required perm is absent; keeps `Gate::before`-style super-admin bypass (super admin → always allow).
3. `resources/js/lib/api/core/types.ts` OR a new `lib/permissions.ts` — export the PERMISSION key constants + a `useCan(perm): boolean` hook that memoizes the set. **Source of truth for the set**: `useMyRolesAndPermissions` (roles-scoped) — NOT the flat `useMyPermissions` global list (see SettingsPage SSOT comment already in code).
4. `resources/js/routes/index.tsx` — wrap the following routes with `<RequirePermission perm="...">`:
   | Route | perm |
   |---|---|
   | `/` (dashboard) | `view_dashboard` |
   | `/pos`, `/pos/pro`, `/pos/kiosk`, `/pos/sessions`, `/pos/monitor` | `create_sales_document` |
   | `/documents/*` (FV/POS/BL/BCC/CMD/DEV/AV/FA/BCF/BR) | `view_any_commercial_document` |
   | `/parties`, `/clients`, `/suppliers` | `view_any_party` |
   | `/products`, `/inventory/*` | `view_any_product` |
   | `/finance/*` | `view_any_payment` |
   | `/users`, `/roles` | `view_any_user` / `view_roles` |
   | `/audit-log` | `view_audit_log` |
   | `/settings`, `/settings/print` | `manage_settings` |
   | `/portal-orders` | `manage_portal_orders` |
   | super-admin panel | unchanged (`RequireSuperAdmin`) |
5. `resources/js/components/layouts/DashboardLayout.tsx` — new filter at r710: `NAV_GROUPS.map/group filter` dropping groups/items whose href maps to a perm the user lacks. Build a `href→perm` map (same table as #4). Preserve the existing `superAdminOnly` drop. Cache the derived nav in a `useMemo` keyed on the roles set.

**Verify**: `npx tsc --noEmit`. Playwright smoke (if running): as owner see full nav; as cashier no Settings/Users/Reports-extra; direct URL `/settings` as cashier → 403 page.

**Rules**:
- No silent redirect on a denied route — render the 403 page.
- Super-admin (`Gate::before`) bypass is preserved on BOTH backend (`AuthServiceProvider`) and frontend (super admin always allow in `RequirePermission`).
- Nav filtering uses the roles-scoped permission set, not `useMyPermissions`.

---

## Phase 4 — Settings page gating (`SettingsPage.tsx`) — REBASE `eb98378` onto real perms

Current tab-hide (`SettingsPage.tsx` r79–109) hardcodes: `users` tab hidden unless `view_any_user`; `backup`/`printers` tabs hidden unless `update_company`. That commit must be REBASED (not removed):
- `backup` + `printers` tabs → gate on the NEW keys: `manage_backup` and `manage_printer` respectively (replacing the `update_company` check).
- Add tab guards for any NEW settings-adjacent tabs if added later.
- Keep the existing pattern (roles-scoped set, nothing hidden while `myRolesData` is loading).
- Double-check the page's `useMyRolesAndPermissions()` import is still `@/lib/api/endpoints/roles` (confirmed r30).

**Verify**: `npx tsc --noEmit`.

---

## Phase 5 — Test coverage (pest)

Add to `tests/Feature/` (in-memory sqlite; sanitize fixtures):
1. As a `manager` company user: `GET /api/v1/{company}/settings` → 403; `GET /api/v1/{company}/settings/group/general` → 200; `PATCH /api/v1/{company}/settings` → 403; `POST /api/v1/{company}/portal-orders/{id}/convert` → 403; `GET /api/v1/{company}/reports/sales` → 200.
2. As an `owner`: all of the above → 2xx success.
3. As a `viewer`: `POST /api/v1/{company}/print-templates` → 403; `GET /api/v1/{company}/print-templates` → 200.
4. Guard regression: `view_settings` reader (manager) still 403 on ALL settings that reveal sensitive keys.

Use the existing helper conventions from `tests/Pest.php` (`testCompanySlug()`, `actingAsAuthenticatedTenantUser()`), add a `actingAsRole($user, $role, $companyId)` helper that builds the company hop role pivot.

**Verify**: `vendor\bin\pest.bat` (or `php artisan test`) green.

---

## Phase 6 — Final verification + commit/push (per task)

For EVERY task above:
```
php -l <touched php files>
vendor\bin\pest.bat
npx tsc --noEmit
npm test
npm run build   (must be 0 errors; precache entries unchanged unless FE touched)
(Get-FileHash public/sw.js) -eq (Get-FileHash public/build/sw.js)   # SW MATCH when FE touched
git add -A && git commit -m "chore(rbac): <task summary>" && git push
```

---

## ROADMAP (Phase 3 later — DB-backed custom roles)

Not now. Planned shape (do NOT execute yet): eliminate the hardcoded profile arrays in `getRolePermissionsMap()`, make roles user-editable (name/perms) per company via the existing `/roles` API, add `SettingsSeeder`-style permission-grouped UI for `manage_roles`, and a migration to snapshot the current standard profiles as seed data for existing companies. Document in new `docs/ROADMAP_PERMISSIONS_CUSTOM_ROLES.md` when started.

## Resolved decisions (confirmed by user — Sep 6, 2026)
1. **`manage_company_members` is granted to the `manager` role** (invite/revoke members + assign-role/toggle-active/delete user) — NOT owner-only anymore. Owner stays the only role with `update_company`.
2. **Reports gating = per-family route groups** — distinct `can:` middleware for money-sensitive report families only (`financial` → `view_financial_report`, `inventory` → `view_inventory_report`). Granular per-report keys (`view_sales_report`, `view_purchase_report`, …) stay enforced by the frontend route/nav guards (Phase 3), not backend route lines.

Both decisions are already folded into Phase 1 (manager profile += `manage_company_members`) and Phase 2 (r501 member-mgmt split + per-family report groups) above.