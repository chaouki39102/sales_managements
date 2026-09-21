import { Page } from '@playwright/test';
import { SETTINGS_REGISTRY } from '../../services/SettingsRegistry';

export function getRegistryKeys(): string[] {
  return Object.keys(SETTINGS_REGISTRY).filter(k =>
    !['id', 'name', 'doc_type_code', 'paper_size', 'template_version', 'created_at', 'updated_at'].includes(k)
  );
}

export function getToggleKeys(): string[] {
  return Object.entries(SETTINGS_REGISTRY)
    .filter(([, m]) => m.component === 'toggle')
    .map(([k]) => k);
}

export function getInputKeys(): string[] {
  return Object.entries(SETTINGS_REGISTRY)
    .filter(([, m]) => ['input', 'textarea', 'color'].includes(m.component))
    .map(([k]) => k);
}

// ─── Mock shapes ────────────────────────────────────────────────────────────

export interface MockTemplate {
  id: number;
  name: string;
  doc_type_code: string;
  paper_size: string;
  is_default?: boolean;
  is_active?: boolean;
  config?: Record<string, unknown>;
}

const ANY_TPL: MockTemplate = {
  id: 999,
  name: 'Template',
  doc_type_code: 'POS',
  paper_size: '80mm',
  is_active: true,
};

const ME_BODY = {
  data: {
    id: 1,
    name: 'E2E User',
    email: 'e2e@example.com',
    active: true,
    roles: [{ id: 2, name: 'manager' }],
  },
};

// /me/roles → { roles, permissions: string[] } (top-level effective set).
// Listed explicitly (NOT `super-admin`) so RequireCompany (routes/index.tsx:195)
// keeps tenant pages reachable; mirrors the PERMISSION object in lib/permissions.ts.
const MY_ROLES_BODY = {
  data: {
    roles: [{ id: 2, name: 'manager' }],
    permissions: [
      'view_dashboard',
      'view_any_party',
      'view_any_product',
      'view_any_commercial_document',
      'view_any_payment',
      'view_any_user',
      'view_roles',
      'view_audit_log',
      'manage_settings',
      'manage_portal_orders',
      'manage_backup',
      'manage_printer',
      'create_sales_document',
      'view_sales_report',
      'view_purchase_report',
      'view_inventory_report',
      'view_financial_report',
      'view_cost_price',
      'change_price_commercial_document',
      'apply_discount_commercial_document',
      'override_stock_commercial_document',
      'view_print_templates',
      'manage_print_templates',
      'view_settings',
      'manage_roles',
      'manage_company_members',
      'update_company',
    ],
  },
};

const FISCAL_YEARS_BODY = {
  data: [
    { id: 1, name: '2026', starts_at: '2026-01-01', ends_at: '2026-12-31', is_current: true, is_closed: false },
  ],
  meta: { current_page: 1, from: 1, to: 1, last_page: 1, per_page: 50, total: 1 },
  links: { first: null, last: null, prev: null, next: null },
};

function templateResponse(tpl?: MockTemplate): string {
  return JSON.stringify({
    data: tpl ? {
      id:              tpl.id,
      name:            tpl.name,
      doc_type_code:   tpl.doc_type_code,
      paper_size:      tpl.paper_size,
      is_default:      tpl.is_default ?? false,
      is_active:       tpl.is_active ?? true,
      template_version: 2,
      created_at:      '2026-01-01T00:00:00Z',
      updated_at:      '2026-01-01T00:00:00Z',
      config:          tpl.config ?? {},
    } : null,
  });
}

/**
 * Boot the SPA in an authenticated, company-scoped state so the print-settings
 * page can render without the real backend.
 *
 * 1. Seeds, via init script (runs before app scripts):
 *    - localStorage `auth_token`   (tokenStorage / useCurrentUser gate)
 *    - sessionStorage `app-store`  (zustand persist: activeCompany + selectedYearId)
 *
 * 2. Mocks the network (the axios interceptor prepends `/{slug}` to tenant URLs,
 *    so all tenant routes live under the slug-prefixed API base):
 *    - catch-all API route -> `{ data: [] }` / `{ data: null }` so NO request
 *      reaches the real backend (a 401 would trigger forcedLogout -> /login)
 *    - /auth/me                -> authenticated user (RequireCompany gate)
 *    - /{slug}/fiscal-years    -> paginated list with a current year
 *    - /{slug}/print-templates -> echoes the doc_type_code query param so
 *      switching doc type in the sidebar resolves a template for that doc
 *
 * Playwright checks route handlers in REVERSE registration order, so mocks
 * registered by a test AFTER calling this helper take precedence.
 */
export async function bootstrapApp(page: Page, templates: MockTemplate[] = []) {
  await page.addInitScript(() => {
    window.localStorage.setItem('auth_token', 'e2e-token');
    window.sessionStorage.setItem('app-store', JSON.stringify({
      state: {
        activeCompany: {
          id: 1, name: 'E2E Co', slug: 'demo',
          commercial_name: '', address: '', phone: '', mobile: '', fax: '',
          email: '', nif: '', nis: '', rc: '', ai: '', capital_amount: '',
          bank_name: '', rib: '', activity: '', avatar: null,
        },
        selectedYearId: 1,
        sidebarCollapsed: false,
        theme: 'light',
      },
      version: 0,
    }));
  });

  await page.route('**/api/v1/**', (route) => {
    const method = route.request().method();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(method === 'GET' ? { data: [] } : { data: null }),
    });
  });

  await page.route('**/api/v1/auth/me', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ME_BODY) });
  });

  await page.route('**/api/v1/*/me/roles', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MY_ROLES_BODY) });
  });

  await page.route('**/api/v1/*/fiscal-years*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FISCAL_YEARS_BODY) });
  });

  await page.route('**/api/v1/*/print-templates*', (route) => {
    const req  = route.request();
    const code = new URL(req.url()).searchParams.get('doc_type_code');
    const matched = code ? templates.filter(t => t.doc_type_code === code) : templates;
    if (req.method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: matched }) });
    } else if (req.method() === 'PUT' || req.method() === 'POST') {
      route.fulfill({ status: 200, contentType: 'application/json', body: templateResponse(matched[0] ?? templates[0] ?? ANY_TPL) });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
    }
  });
}

export async function navigateToPrintSettings(page: Page) {
  await page.goto('/settings/print');
}
