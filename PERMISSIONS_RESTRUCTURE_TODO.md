# PERMISSIONS_RESTRUCTURE_TODO.md

Restructure the RBAC system so permission checks are REAL and enforced **everywhere they matter** — backend route gates, frontend page/route guards, sidebar nav filtering, button/title-level visibility, and settings-page tab hiding — on top of the already-seeded per-company Spatie roles (`owner` / `manager` / `cashier` / `viewer`), PLUS full control to the owner to assign/unassign the permission of ANY thing in the system to ANY user, including granular "view anything / any title / any button" permissions.

**Status**: ALL PHASES **✅ COMPLETE** (Sep 2026). No remaining work.

---

## Phase 1 — NEW permission keys + propagation (backend seeds) ✅ DONE

6 global `Permission` rows materialized via `GlobalRolesAndPermissionsSeeder`; profiles applied in `CompanyRoleService::getRolePermissionsMap()`; propagated with `php artisan company:upgrade-roles 1`. Keys: `manage_portal_orders`, `view_print_templates`, `manage_print_templates`, `view_settings`, `manage_backup`, `manage_printer`.

---

## Phase 2 — Backend route gates (`routes/api.php`) ✅ DONE

15+ `can:` groups verified and wired: `view_audit_log`, `view_any_user`, `manage_company_members`, `manage_fiscal_year`, `create_sales_document`, `manage_portal_orders`, `view_settings`/`manage_settings`, `manage_print_templates`, `manage_roles`, `view_inventory_report`/`view_financial_report`. Settings/group + print-template reads stay public to all members.

---

## Phase 3 — Frontend guards (routes + nav + 403) ✅ DONE

`lib/permissions.ts` (PERMISSION constants, `usePermissions()` with effective union set + `can()`, super-admin bypass, `NAV_PATH_PERMISSION` + `permissionForNavPath`), `RequirePermission`, `ForbiddenPage`, route guards per table, sidebar `navGroups` memo filtering. Verified: tsc clean · vitest 405/405 · build 0 errors · SW MATCH.

---

## Phase 4 — Settings page gating (`SettingsPage.tsx`) ✅ DONE

Tab gates use `view_any_user` (users), `manage_backup` (backup), `manage_printer` (printers), `view_settings` (settings index). Verified: tsc clean · vitest 405/405 · build 0 errors · SW MATCH.

---

## Phase 5 — Test coverage (pest) ✅ DONE

`tests/Feature/RolePermissionGateTest.php` — **26 tests, 494 lines**: settings PATCH/GET gates, portal-orders convert gate, reports open access, roles read + `manage_roles` write gate, print-templates read + write gate, users CRUD gates (`view_any_user`, `create_user`, `update_user`, `manage_company_members`), `/me` + `/me/permissions` + `/me/roles` all 200, direct grant without role test (grant → 200, revoke → 403), owner bypass, `permission_ids` CRUD via `PUT users/{id}` (grant/clear/re-grant/role-perms-survive/cross-company-filtered).

---

## Phase 6 — Owner full control: assign/unassign ANY permission to ANY user + effective-set fix ✅ DONE

### 6a. Backend `/me/roles` returns the EFFECTIVE (role ∪ direct) set ✅
`PermissionController::myRoles()` → `UserPermissionsMethods` trait returns `{roles, permissions}` using `getAllPermissions()` = role ∪ direct. Confirmed by test 16 (direct grant visible in `/me/permissions`, opens `/settings`, revoke restores 403).

### 6b. Frontend effective set = the `permissions` array from `/me/roles` ✅
`lib/permissions.ts` `usePermissions()` reads `useMyRolesAndPermissions()` and builds `new Set(data?.permissions ?? [])`. Every route guard, nav item, and `can()` gate honors direct per-user grants.

### 6c. Owner per-user permission editor (UI) ✅
`UsersPage.tsx` — `PermMatrix` component with checkbox grid of permissions grouped by `group`. Edit form inits `permission_ids` from **direct** perms only (line 848). Role-derived perms shown as read-only chips via `roleDerivedPerms` (lines 889–898). Save via existing `PUT/PATCH users/{id}` with `permission_ids: [ids]`. Hint: "الصلاحيات المباشرة تُضاف إلى صلاحيات الدور".

### 6d. Clear + give semantics ✅
Tested via pest (tests 18a–18e): `[]` clears direct only; re-add works; role perms survive `[]`; cross-company permissions silently filtered. A direct grant shows in `/me/roles`.

---

## Phase 7 — Granular "view anything / any title / any button" + TS catalog parity ✅ DONE

### 7a. TS catalog parity ✅
All 6 missing constants present in `lib/permissions.ts`: `VIEW_PRINT_TEMPLATES`, `MANAGE_PRINT_TEMPLATES`, `VIEW_SETTINGS`, `MANAGE_ROLES`, `MANAGE_COMPANY_MEMBERS`, `UPDATE_COMPANY`.

### 7b. Granular keys — aligned and seeded ✅
Dead keys removed; aligned keys seeded in both `GlobalRolesAndPermissionsSeeder.php` and `RolesAndPermissionsSeeder.php`. Profiles wired in `CompanyRoleService::getRolePermissionsMap()` (owner=ALL, others per decided matrix).

---

## Phase 8 — Pro permission admin intelligence ✅ DONE

- **Roles × permissions matrix** — `RolesPage.tsx` (452 lines): `RoleMatrix` component with checkbox grid role×permission grouped by `group`, locked `owner` role (`LOCKED_ROLES`), check/minus cells, saving via existing `roles/{id}` PUT.
- **My permissions view** — `MyPermissionsSection` in `RolesPage.tsx` using `useMyRolesAndPermissions`.
- Routed at `/roles` (lazy import in `routes/index.tsx:107`).

---

## G-fix batch (gate correctness) ✅ DONE

### G1 — roles/permissions CRUD routes → `can:manage_roles` ✅
Roles & permissions CRUD registered under `can:manage_roles` middleware group.

### G2 — `RolePolicy` dead keys → real keys ✅
`RolePolicy.php` / `PermissionPolicy.php` use `view_roles` (`view`) and `manage_roles` (`create`/`update`/`delete`). Verified by tests 7a/7b (403 → 404 with `manage_roles`).

### G3 — `UsersPage` edit-form permission_ids from DIRECT perms only ✅
`UsersPage.tsx:848` — `permission_ids` init from `user.permissions?.map(...)` (direct only). `roleDerivedPerms` computed for display, never written into `permission_ids`.

---

## ROADMAP (LATER — DB-backed custom roles)

Not now. Planned shape (do NOT execute yet): eliminate the hardcoded profile arrays in `getRolePermissionsMap()`, make roles user-editable (name/perms) per company via the existing `/roles` API, add a `SettingsSeeder`-style permission-grouped UI for `manage_roles`, and a migration to snapshot the current standard profiles as seed data for existing companies. Document in new `docs/ROADMAP_PERMISSIONS_CUSTOM_ROLES.md` when started. Phase 8's matrix/copy/audit work builds the UI surface this roadmap needs.

## Resolved decisions (confirmed by user — Sep 2026)
1. **`manage_company_members` is granted to the `manager` role** (invite/revoke members + assign-role/toggle-active/delete user) — NOT owner-only anymore. Owner stays the only role with `update_company`.
2. **Reports gating = per-family route groups** (`financial` → `view_financial_report`, `inventory` → `view_inventory_report`). Granular per-report keys stay frontend-enforced.
3. **Per-user direct permission assignment is a first-class feature** (owner assigns/unassigns ANY permission to ANY user; effective = role ∪ direct). ✅ Implemented.
4. **Granular "view anything / any title / any button" permissions** are wanted (Phase 7) ✅ Implemented — aligned keys seeded, profiles wired, TS catalog complete.
5. **`settings/group/{group}` + `settings/{key}` + print-template reads stay public** to any authenticated member.
