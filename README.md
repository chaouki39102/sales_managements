# Sales Management (POS Dz)

Multi-company sales / POS / inventory / finance ERP for Algerian businesses.
Laravel 13 (PHP 8.4) API + React 18 / TypeScript SPA (Vite, Tailwind 4), SQLite by default (MySQL supported).

## Run it locally

```bash
composer install                      # PHP 8.4 (the lockfile requires >= 8.4)
npm install --ignore-scripts
cp .env.example .env && php artisan key:generate
touch database/database.sqlite && php artisan migrate --seed
npm run build                          # or: npm run dev
php artisan serve                      # http://127.0.0.1:8000  (admin@mail.com / password)
```

On the Windows production machine use `start-server.bat` (see `docs/operations/`).

## Checks before committing

```bash
npx tsc --noEmit -p .        # types
npx vitest run               # frontend unit tests
php artisan test             # backend tests
npx eslint resources/js      # 0 errors
npm run build                # also refreshes public/sw.js — commit it
```

Playwright specs live in `resources/js/pages/settings/print-settings/__tests__` (`npm run test:e2e`).

## Where things live

```
app/
  Http/Controllers/Api/V1/   one controller per resource (thin: validate → service → resource)
  Services/                  business logic; big domains get a folder (Services/Reports/*, Services/Fiscal/*)
  Models/  Observers/  Policies/  Http/Resources/
database/migrations/ seeders/
routes/api.php api_admin.php
resources/
  css/app.css                entry — imports theme/* in cascade order (responsive.css LAST)
  css/theme/<area>.css       one file per area; large areas are folders of partials (theme/pos/*.css …)
  js/
    routes/index.tsx         all routes (pages are lazy-loaded)
    lib/                     core: API client, auth, tenancy, offline layer, formatters
    components/ui/           shared UI kit (DataTable, Modal, inputs…)
    components/<domain>/     shared domain widgets (products/product-modal/…)
    pages/<feature>/
      <Feature>Page.tsx      entry: wiring only (state hooks + layout)
      components/            sub-components of the page, one per file
      hooks/                 data + behaviour hooks (useXxx)
      types.ts utils.ts constants.ts
    pos/  pos-pro/           point-of-sale screens and their hooks/utils
docs/
  architecture/              ENGINEERING_MANIFEST, STYLE_GUIDE, DATATABLE, report designer
  operations/                production runbook, public order sharing
  printing/                  print system map and audits
  planning/                  roadmaps, TODOs, historical audits
  reports/                   fix / audit reports
AGENTS.md                    running log + rules for AI agents
```

### Size rule

Keep files small and single-purpose: **aim for < 400 lines (hard stop ~500)**.
When a page grows, move sub-components to `components/`, state/data to `hooks/`,
and pure helpers to `utils.ts` — keep the page file as the wiring layer and keep its
import path and export unchanged.

See `docs/architecture/ENGINEERING_MANIFEST.md` (backend + API rules) and
`docs/architecture/STYLE_GUIDE.md` (CSS, responsive rules, components).
