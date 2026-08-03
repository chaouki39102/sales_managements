# Session Report — 2026-08-04: Portal Login Fix + Clients Share-Portal

## Summary

Two tasks were completed in this session, both on top of the committed per-tenant
customer-portal work (`ac17e12`):

1. **Portal login 404 fix** — `POST /api/v1/{company}/portal/auth/login` (and every
   portal route) returned `No query results for model [App\Models\Company]` (HTTP 404)
   whenever the URL segment was a **portal_slug** rather than the internal company slug.
2. **Clients list share-portal action** — a new share icon in the clients actions
   column that verifies the party has a portal account and then offers WhatsApp /
   email sharing of the tenant portal link.

Both were verified (typecheck, unit tests, build, live HTTP smoke) and committed.
A git push was attempted but the machine cannot reach `github.com:443` (network
issue, not a git problem).

---

## Task 1 — Portal Login 404: `No query results for model [App\Models\Company]`

### Symptom (user report)

At login in the portal the request failed with:
`No query results for model [App\Models\Company]`.

Browser console confirmed both public portal calls 404:

```
GET  /api/v1/el-houda-emballage/portal/info          -> 404
POST /api/v1/el-houda-emballage/portal/auth/login    -> 404
```

### Investigation

- `php artisan route:list --path=portal` showed all 13 `{company}/portal/*` routes
  registered (plus `companies/{company}/portal-qr` and the admin `portal-access` CRUD).
- DB probe: company id 1 has `slug = el-houda-emballage-6a5e589dc1cfe` and
  `portal_slug = el-houda-emballage`. The portal URL segment `el-houda-emballage`
  is the **portal_slug**, not the internal slug.
- Direct query probe (tinker):
  - `portal_slug OR slug` lookup for `el-houda-emballage` → **company 1** (would succeed)
  - `slug`-only lookup for `el-houda-emballage` → **NULL** (fails)
  - `(new Company)->getRouteKeyName()` → **`slug`**
- Portal controllers do **not** type-hint `Company` in any method signature, so implicit
  binding alone would not have been the culprit — but there is an explicit **global**
  binding in `app/Providers/AppServiceProvider.php`:

  ```php
  Route::bind('company', function (string $value) {
      return Company::where('slug', $value)->firstOrFail();
  });
  ```

### Root cause

`Route::bind('company', …)` is a **global** route-model binding keyed on the parameter
name `company`. It applies to **every** route with a `{company}` parameter, including
the customer-portal group. It runs inside the `SubstituteBindings` middleware of the
`api` group, which is **before** the route-level `portal.company`
(`SetPortalCompanyContext`) middleware.

So for `/api/v1/el-houda-emballage/portal/auth/login`:

1. Route matches, `{company} = 'el-houda-emballage'`.
2. `SubstituteBindings` runs the global binder → `Company::where('slug', …)->firstOrFail()`
   → **throws `ModelNotFoundException`** (rendered as 404).
3. `SetPortalCompanyContext` (which resolves `portal_slug OR slug`) **never runs**.

The portal worked with the internal slug (`el-houda-emballage-6a5e589dc1cfe`) only
because that happened to equal a real `slug` — the customized `portal_slug` was broken
end-to-end.

### Fix

`routes/api.php` — the portal group now opts out of `SubstituteBindings`, leaving the
`{company}` parameter unresolved so `SetPortalCompanyContext` owns the resolution:

```php
Route::prefix('{company}/portal')
    ->middleware('portal.company')
    ->withoutMiddleware(\Illuminate\Routing\Middleware\SubstituteBindings::class)
    ->group(function () { … });
```

This is safe for the portal routes: no portal controller type-hints a model in its
method signature (auth/portal/access controllers all resolve via
`CompanyContextService` / explicit `find()`), so no other implicit bindings are lost.

### Verification (live, against the running dev server)

| Request | Before | After |
|---|---|---|
| `GET /api/v1/el-houda-emballage/portal/info` | 404 | 200 `{status:"success", data:{id:1,…}}` |
| `POST /api/v1/el-houda-emballage/portal/auth/login` (empty body) | 404 | 422 validation `email/password required` |
| `GET /api/v1/el-houda-emballage-6a5e589dc1cfe/portal/info` (internal slug, backward compat) | — | 200 |

### Key architectural rule

The global `Route::bind('company', slug-firstOrFail)` in `AppServiceProvider` is the
SSOT for the **admin** `{company}` parameter. Any route family where `{company}` means
something else (the portal accepts `portal_slug` **or** `slug`) must exclude
`SubstituteBindings` and do its own resolution — never register a second `{company}`
binder, and never add `Company $company` params to those controllers (LSP).

---

## Portal Route Inventory (from `php artisan route:list --path=portal -v`)

All 14 portal-related routes, with full middleware chains. The `{company}` segment in
the `/api/v1/{company}/portal/*` group accepts **either** the `portal_slug` **or** the
internal `slug` (after the Task 1 fix); the `{company}` segment in the admin routes
(`companies/{company}/portal-qr`, `{company}/portal-access/*`) is resolved by internal
`slug` only (admin `SetCompanyContext`).

| # | Method(s) | URI | Controller@method | Middleware |
|---|---|---|---|---|
| 1 | `GET` | `api/v1/companies/{company}/portal-qr` | `Api\V1\CompanyController@portalQr` | `api`, `auth:sanctum` |
| 2 | `POST` | `api/v1/{company}/portal-access` | `Portal\PortalAccessController@createPortal` | `api`, `auth:sanctum`, `SetCompanyContext`, `can:update_company` |
| 3 | `GET` | `api/v1/{company}/portal-access/for-party/{partyId}` | `Portal\PortalAccessController@forParty` | `api`, `auth:sanctum`, `SetCompanyContext`, `can:update_company` |
| 4 | `PUT` | `api/v1/{company}/portal-access/{id}` | `Portal\PortalAccessController@update` | `api`, `auth:sanctum`, `SetCompanyContext`, `can:update_company` |
| 5 | `DELETE` | `api/v1/{company}/portal-access/{id}` | `Portal\PortalAccessController@destroy` | `api`, `auth:sanctum`, `SetCompanyContext`, `can:update_company` |
| 6 | `POST` | `api/v1/{company}/portal/auth/login` | `Portal\PortalAuthController@login` | `api`, `SetPortalCompanyContext`, `throttle:5,15` |
| 7 | `POST` | `api/v1/{company}/portal/auth/logout` | `Portal\PortalAuthController@logout` | `api`, `SetPortalCompanyContext`, `PortalAuthenticate` |
| 8 | `GET` | `api/v1/{company}/portal/auth/me` | `Portal\PortalAuthController@me` | `api`, `SetPortalCompanyContext`, `PortalAuthenticate` |
| 9 | `GET` | `api/v1/{company}/portal/dashboard` | `Portal\PortalController@dashboard` | `api`, `SetPortalCompanyContext`, `PortalAuthenticate` |
| 10 | `GET` | `api/v1/{company}/portal/documents` | `Portal\PortalController@documents` | `api`, `SetPortalCompanyContext`, `PortalAuthenticate` |
| 11 | `GET` | `api/v1/{company}/portal/documents/{id}` | `Portal\PortalController@showDocument` | `api`, `SetPortalCompanyContext`, `PortalAuthenticate` |
| 12 | `GET` | `api/v1/{company}/portal/info` | `Portal\PortalController@companyInfo` | `api`, `SetPortalCompanyContext` |
| 13 | `GET` | `api/v1/{company}/portal/payments` | `Portal\PortalController@payments` | `api`, `SetPortalCompanyContext`, `PortalAuthenticate` |
| 14 | `GET` | `api/v1/{company}/portal/statement` | `Portal\PortalController@statement` | `api`, `SetPortalCompanyContext`, `PortalAuthenticate` |

**Route-level notes**:

- **Rows 1–5** are the **admin (tenant)** portal-management routes — they sit inside
  the admin `{company}` (internal slug) namespace, require an authenticated admin user
  with the `update_company` permission, and DO use the normal `SubstituteBindings`
  path (the global `Route::bind('company', …)` applies — correct, they are admin routes).
  - `portal-qr` returns the tenant's portal QR code (SVG data URI).
  - `portal-access/*` manage a party's portal login account (create / check-for-party /
    update / delete) — used by `PortalAccessModal` and the new share verification.
- **Rows 6–14** are the **customer portal** group — now `withoutMiddleware(SubstituteBindings)`,
  so `SetPortalCompanyContext` resolves `{company}` by `portal_slug` first then `slug`.
  All rows except 6 (`login`) and 12 (`info`) require `PortalAuthenticate` (Bearer
  `portal_token`). `login` is throttled to **5 attempts / 15 minutes**.
- **Controllers**: `PortalAuthController` (login/logout/me), `PortalController`
  (info/dashboard/documents/showDocument/payments/statement), `PortalAccessController`
  (createPortal/forParty/update/destroy).
- The frontend admin consumption points: `portalAccessApi` (rows 2–5) and the portal
  app `portalApi`/`portalClient` (rows 6–14). The share action uses row 3 (`forParty`)
  to verify an account exists.

---

## Task 2 — Clients List: Share-Portal Action (WhatsApp / Email)

### Request

> In list of party add icon share portal and show option by whatsapp email
> verify if it not added show toast

### Design

- A new `ti-share` icon button in the clients actions column (before the existing
  `حساب البوابة` store button and the edit pencil).
- **Verification first**: on click it calls `portal-access/for-party/{partyId}`.
  - Account **missing** → warning toast: *«حساب البوابة غير مضاف — لم تتم إضافة
    حساب بوابة لهذا الزبون. أضفه أولاً من أيقونة المتجر»* (no menu shown).
  - Account **present** → a small fixed popover (portaled to `document.body`,
    anchored at the button rect, outside-click + Escape to close) offers two actions:
    - **واتساب** → `https://wa.me/<phone>` where `phone = party.mobile || party.phone`
      (digits only) with the portal link as the text. Missing phone → warning toast
      *«لا يوجد رقم هاتف مسجل لهذا الزبون»*.
    - **البريد الإلكتروني** → `mailto:<party.email>?subject=…&body=…` with the portal
      link in the body. Missing email → warning toast *«لا يوجد بريد إلكتروني مسجل
      لهذا الزبون»*.
- The shared portal URL is built once from the active company: `portal_slug || slug`
  → `${window.location.origin}/portal/<segment>` (mirrors the Settings page logic,
  and the backend now resolves both segments thanks to Task 1).
- While the verification request is in flight the button is disabled (`shareCheckingId`),
  preventing double-click spam.

### Files changed

| File | Change |
|---|---|
| `resources/js/pages/clients/ClientsPage.tsx` | imports (`useActiveCompany`, `portalAccessApi`, `useNotification`, `createPortal`); share button in actions column; state + handlers (`openShare`, `shareWhatsApp`, `shareEmail`, `closeShare`); outside-click/Escape effect; popover JSX via `createPortal` |
| `resources/css/theme/components.css` | `.share-menu` and `.share-menu-btn` styles (reuse `--bg2/--b2/--bg3/--t1` tokens + `dropdown-open` animation) |

### Behavior matrix

| Condition | Behavior |
|---|---|
| No portal account | Toast «لم تتم إضافة حساب بوابة…», menu not shown |
| Portal account + phone (`mobile`/`phone`) | `wa.me/<digits>` opens WhatsApp with the portal link |
| Portal account + no phone | Toast «لا يوجد رقم هاتف…» |
| Portal account + email | `mailto:` opens the mail client with the portal link |
| Portal account + no email | Toast «لا يوجد بريد إلكتروني…» |
| Verification request failed | Error toast «تعذر التحقق…» |

---

## Verification (full session)

| Check | Result |
|---|---|
| `php -l routes/api.php` | No syntax errors |
| `npx tsc --noEmit` | Clean (0 errors) |
| `npm test` (vitest) | 222/222 passed (8 files) |
| `npm run build` | 0 errors, 205 precache entries |
| SW hash check (`public/sw.js` vs `public/build/sw.js`) | **SW MATCH** (`True`) |
| Live portal smoke (both slugs) | 200 / 200 / 422 (see Task 1 table) |

> Note on `vendor\bin\pest.bat`: **19 passed, 12 failed** — all 12 failures are in the
> untracked, pre-existing `tests/Feature/DocumentFiltersTest.php`, which inserts rows
> into `commercial_documents` with columns that do not exist in the schema
> (`reference`, `notes`, `payment_terms`, `validated_at`, `validated_by`). This test is
> unrelated to this session's changes and was left untouched (see Outstanding below).

---

## Commits

| Commit | Message | Files |
|---|---|---|
| `1757fb8` | `fix(portal): skip SubstituteBindings on portal routes so portal_slug segments resolve` | `routes/api.php` |
| `fe72ea4` | `feat(clients): share-portal action with WhatsApp/email per party` | `ClientsPage.tsx`, `components.css` |
| `afa613b` | `build(sw): refresh public/sw.js to match new precache (SW MATCH)` | `public/sw.js` |

**Push status**: `git push` fails with `Failed to connect to github.com port 443`
— the machine currently has no route to GitHub. The branch is local-only
(`main...origin/main [ahead 3]`). Retry `git push` once connectivity returns.

---

## Outstanding / Notes

- `tests/Feature/DocumentFiltersTest.php` (untracked) is broken against the current
  schema (`commercial_documents` has no `reference`/`notes`/`payment_terms`/
  `validated_at`/`validated_by` columns). It should either be repaired to match the
  real schema or removed. Not part of this session's scope.
- The pending `git push` is the only unfinished step.
