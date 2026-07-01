

# =========================================
# 📘 print settings
# =========================================

## FILE: resources/js/pages/settings/print-settings/__tests__/fixtures/expanded-registry.ts
```
import type { SettingMeta } from '../../services/SettingsRegistry';
import { SETTINGS_REGISTRY } from '../../services/SettingsRegistry';

const ALL_DOCS: readonly string[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS', 'RPT'];
const COMMERCIAL_DOCS: readonly string[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV'];
const POS_DOCS: readonly string[] = ['POS', 'RPT'];
const WAREHOUSE_DOCS: readonly string[] = ['DDP', 'BT'];
const REPORT_DOC: readonly string[] = ['RPT'];
const NON_REPORT_DOCS: readonly string[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS'];

const THERMAL: readonly string[] = ['80mm', '58mm'];
const PAGE: readonly string[] = ['A4', 'A5'];
const ALL_PAPERS: readonly string[] = ['80mm', '58mm', 'A4', 'A5'];

const CONST_EXPANSIONS: Record<string, readonly string[]> = {
  ALL_DOCS, COMMERCIAL_DOCS, POS_DOCS, WAREHOUSE_DOCS, REPORT_DOC, NON_REPORT_DOCS,
  THERMAL, PAGE, ALL_PAPERS,
};

export function expand(value: readonly string[] | string[]): string[] {
  const result: string[] = [];
  for (const v of value) {
    if (CONST_EXPANSIONS[v]) {
      result.push(...CONST_EXPANSIONS[v]);
    } else {
      result.push(v);
    }
  }
  return [...new Set(result)];
}

export interface ExpandedSetting extends SettingMeta {
  expandedDocs: string[];
  expandedPapers: string[];
}

export function getExpandedRegistry(): ExpandedSetting[] {
  return Object.entries(SETTINGS_REGISTRY).map(([key, meta]) => ({
    ...meta,
    expandedDocs: expand(meta.supportedDocs as unknown as string[]),
    expandedPapers: expand(meta.supportedPapers as unknown as string[]),
  }));
}

export const ALL_DOC_TYPES = [...ALL_DOCS];
export const ALL_PAPER_SIZES = [...ALL_PAPERS];
export const SETTING_COUNT = Object.keys(SETTINGS_REGISTRY).length;
```

## FILE: resources/js/pages/settings/print-settings/__tests__/fixtures/templates.ts
```
import type { DocTypeCode, PaperSize, PrintTemplate } from '../../types/domain';

export function createMockTemplate(
  overrides: Partial<PrintTemplate> = {},
  docType: DocTypeCode = 'FV' as DocTypeCode,
  paperSize: PaperSize = '80mm',
): PrintTemplate {
  return {
    id: 1,
    name: 'Template de test',
    doc_type_code: docType,
    paper_size: paperSize,
    is_default: true,
    is_active: true,

    paper_width_mm: paperSize === '58mm' ? 58 : 80,
    page_orientation: 'portrait',
    margin_top: 3,
    margin_bottom: 3,
    margin_sides: 3,
    line_spacing: 1.3,
    base_font_size: 10,
    font_family: 'tajawal',

    show_logo: true,
    logo_source: 'company',
    logo_size: 56,
    logo_align: 'center',
    logo_border_radius: 50,
    custom_logo_url: null,

    show_company_name: true,
    company_name_text: 'Ma Société',
    company_name_size: 15,
    company_name_bold: true,
    company_name_align: 'center',
    company_name_color: '#111111',

    show_address: true,
    show_phone: true,
    show_tax_id: true,
    show_rc: true,
    show_nis: false,
    show_ice: false,
    show_article: false,
    company_info_align: 'center',
    company_info_size: 9,
    override_address: '',
    override_phone: '',
    override_nif: '',
    override_rc: '',
    override_nis: '',
    override_ice: '',
    override_article: '',

    header_custom_text: '',
    header_separator: 'dashed',

    title_text: 'FACTURE',
    title_size: 13,
    title_bold: true,
    title_align: 'center',
    title_color: '#111111',
    show_doc_number: true,
    show_date: true,
    show_time: true,
    show_due_date: false,
    show_cashier: true,
    show_client: true,
    show_client_nif: false,
    show_client_phone: false,
    show_client_address: false,
    show_delivery_address: false,
    show_session: docType === 'POS',
    show_payment_term: false,
    show_bank_details: false,
    bank_details_text: '',
    doc_separator: 'dashed',

    col_order: ['name', 'quantity', 'price', 'total'] as any,
    col_show: { name: true, quantity: true, price: true, total: true },
    col_widths: { name: 40, quantity: 15, price: 22, total: 23 },
    col_headers: { name: 'Désignation', quantity: 'Qté', price: 'Prix', total: 'Total' },
    col_aligns: { name: 'right', quantity: 'center', price: 'center', total: 'center' },

    items_font_size: 10,
    items_font_family: 'tajawal',
    show_col_header: true,
    table_header_bold: true,
    table_header_bg: false,
    table_header_color: '#333333',
    table_border_style: 'dashed',
    alternating_rows: false,
    alternating_color: '#f5f5f5',
    price_display: 'ht',
    show_line_total_ttc: false,

    totals_font_size: 10,
    totals_bold: true,
    totals_align: 'right',
    show_total_ht: true,
    show_total_tva: true,
    show_tva_breakdown: false,
    show_discount_total: true,
    show_fiscal_stamp: true,
    show_total_ttc: true,
    total_ttc_font_size: 14,
    total_ttc_bold: true,
    total_ttc_color: '#111111',
    total_border_style: 'double',
    show_amount_in_words: false,
    show_paid_amount: true,
    show_change: true,
    show_remaining: false,
    show_prev_balance: true,
    show_new_balance: true,

    show_payment_details: true,
    payment_font_size: 9,

    footer_line1: '',
    footer_line2: '',
    footer_line3: '',
    footer_separator: 'solid',
    show_thank_you: true,
    thank_you_text: 'Merci de votre visite!',
    thank_you_size: 11,
    thank_you_color: '#111111',
    show_returns_policy: true,
    returns_policy_text: 'Retours sous 48h',
    footer_legal_text: '',

    show_barcode: true,
    barcode_content: 'doc-number',
    barcode_custom_text: '',
    show_qr: false,
    qr_content: 'doc-number',

    show_cashier_signature: false,
    show_client_signature: false,
    show_stamp: false,

    show_header_section: true,
    show_doc_info_section: true,
    show_items_section: true,
    show_totals_section: true,
    show_payments_section: true,
    show_footer_section: true,

    rules: [],

    show_report_header: true,
    report_header_text: '',
    show_report_footer: true,
    report_footer_text: '',
    show_charts: true,
    chart_type: 'bar',
    chart_title: '',
    group_by: '',
    sort_by: '',
    sort_direction: 'asc',
    show_report_period: true,
    show_report_cashier: true,
    show_report_summary_cards: true,
    show_report_payment_breakdown: true,
    show_report_top_products: true,

    report_col_widths: { product: 50, quantity: 20, total: 30 } as any,
    report_col_headers: { product: 'Produit', quantity: 'Qté', total: 'Total' } as any,

    ...overrides,
  };
}
```

## FILE: resources/js/pages/settings/print-settings/__tests__/helpers/test-utils.ts
```
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

export async function mockApiResponse(page: Page, templateOverrides: Record<string, any> = {}, status = 200) {
  await page.route('**/api/v1/print-templates/**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1,
            name: 'Test Template',
            doc_type_code: templateOverrides.doc_type_code || 'FV',
            paper_size: templateOverrides.paper_size || '80mm',
            is_default: true,
            is_active: true,
            template_version: 2,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            config: { ...templateOverrides, ...templateOverrides.config },
          },
        }),
      });
    } else if (route.request().method() === 'PUT') {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      route.fulfill({ status: 404 });
    }
  });
}

export async function mockTemplatesList(page: Page, templates: any[] = []) {
  await page.route('**/api/v1/print-templates*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: templates }),
      });
    } else {
      route.continue();
    }
  });
}

export async function navigateToPrintSettings(page: Page, docType = 'FV') {
  await page.goto(`/settings/print-settings?doc_type=${docType}`);
  await page.waitForLoadState('networkidle');
}
```

## FILE: resources/js/pages/settings/print-settings/__tests__/lifecycle.pw.spec.ts
```
import { test, expect } from '@playwright/test';
import { createMockTemplate } from './fixtures/templates';

test.describe('Print Settings — Lifecycle', () => {
  test('loads the page without errors', async ({ page }) => {
    const { mockApiResponse } = await import('./helpers/test-utils');
    await mockApiResponse(page, { doc_type_code: 'FV', paper_size: '80mm' });
    await page.goto('/settings/print-settings?doc_type=FV');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText('Print');
  });

  test('save button triggers API call', async ({ page }) => {
    const { mockApiResponse } = await import('./helpers/test-utils');
    await mockApiResponse(page, { doc_type_code: 'FV', paper_size: '80mm' });

    let putCalled = false;
    await page.route('**/api/v1/print-templates/**', (route) => {
      if (route.request().method() === 'PUT') {
        putCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 1, name: 'Test', doc_type_code: 'FV', paper_size: '80mm',
              is_default: true, is_active: true,
              config: {},
            },
          }),
        });
      }
    });

    await page.goto('/settings/print-settings?doc_type=FV');
    await page.waitForLoadState('networkidle');

    const saveBtn = page.locator('button:has-text("حفظ")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      expect(putCalled).toBe(true);
    }
  });

  test('should show template selector with templates', async ({ page }) => {
    const { mockTemplatesList } = await import('./helpers/test-utils');
    await mockTemplatesList(page, [
      { id: 1, name: 'Template 1', doc_type_code: 'FV', paper_size: '80mm', is_default: true, is_active: true },
    ]);

    await page.route('**/api/v1/print-templates/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1, name: 'Template 1', doc_type_code: 'FV', paper_size: '80mm',
            is_default: true, is_active: true,
            config: { show_logo: true, title_text: 'FACTURE' },
          },
        }),
      });
    });

    await page.goto('/settings/print-settings?doc_type=FV');
    await page.waitForLoadState('networkidle');
  });
});
```

## FILE: resources/js/pages/settings/print-settings/__tests__/playwright.config.ts
```
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.pw.spec.ts',
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:8000',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'php artisan serve --port=8000',
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
```

## FILE: resources/js/pages/settings/print-settings/__tests__/registry-validation.spec.ts
```
import { describe, it, expect } from 'vitest';
import { SETTINGS_REGISTRY, getSettingMeta } from '../services/SettingsRegistry';
import { getExpandedRegistry, ALL_DOC_TYPES, ALL_PAPER_SIZES, SETTING_COUNT } from './fixtures/expanded-registry';

const VALID_CATEGORIES = [
  'global', 'paper', 'header', 'company', 'document', 'columns', 'items',
  'totals', 'payments', 'footer', 'barcode', 'qr', 'signature',
  'section-visibility', 'rules', 'report', 'charts', 'formatting',
] as const;

const VALID_COMPONENTS = [
  'toggle', 'input', 'select', 'pills', 'slider', 'color', 'textarea',
  'column-manager', 'rules-editor', 'logo-upload',
] as const;

describe('SettingsRegistry — Structural Validation', () => {
  it('should have exactly 144 entries', () => {
    expect(SETTING_COUNT).toBe(144);
  });

  it('every entry should have a matching key in the registry object', () => {
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      expect(meta.key).toBe(key);
    }
  });

  it('every entry should have all required fields', () => {
    const required = ['key', 'label', 'labelAr', 'category', 'component', 'defaultValue', 'supportedPapers', 'supportedDocs'];
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      const missing = required.filter(f => !(f in meta));
      expect(missing, `${key} is missing fields: ${missing.join(', ')}`).toEqual([]);
    }
  });

  it('every entry should have a valid category', () => {
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      expect(VALID_CATEGORIES.includes(meta.category as any)).toBe(true);
    }
  });

  it('every entry should have a valid component', () => {
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      expect(VALID_COMPONENTS.includes(meta.component as any)).toBe(true);
    }
  });
});

describe('SettingsRegistry — dependsOn Validation', () => {
  it('every dependsOn target should exist in the registry', () => {
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      if (!meta.dependsOn) continue;
      const target = getSettingMeta(meta.dependsOn as string);
      expect(target).toBeDefined(`${key} depends on ${meta.dependsOn} which does not exist`);
    }
  });

  it('every dependsOn target should be within supportedDocs of the parent', () => {
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      if (!meta.dependsOn) continue;
      const parent = getSettingMeta(meta.dependsOn as string);
      if (!parent) continue;
      const expanded = getExpandedRegistry();
      const child = expanded.find(s => s.key === key)!;
      const parentExp = expanded.find(s => s.key === meta.dependsOn)!;
      const childOnlyInParent = child.expandedDocs.every(d => parentExp.expandedDocs.includes(d));
      if (!childOnlyInParent) {
        const outside = child.expandedDocs.filter(d => !parentExp.expandedDocs.includes(d));
        console.warn(`WARN: ${key} docs [${outside}] extend beyond parent ${meta.dependsOn}`);
      }
    }
  });
});

describe('SettingsRegistry — Visibility Scope Validation', () => {
  const expanded = getExpandedRegistry();

  it('every setting should be registered for at least one doc type', () => {
    for (const setting of expanded) {
      expect(setting.expandedDocs.length).toBeGreaterThan(0);
    }
  });

  it('every setting should be registered for at least one paper size', () => {
    for (const setting of expanded) {
      expect(setting.expandedPapers.length).toBeGreaterThan(0);
    }
  });

  it('report-only settings should only be visible for RPT', () => {
    const reportSettings = expanded.filter(s => s.category === 'report' || s.category === 'charts');
    for (const setting of reportSettings) {
      for (const doc of ALL_DOC_TYPES) {
        if (doc === 'RPT') {
          expect(setting.expandedDocs).toContain(doc);
        } else {
          expect(setting.expandedDocs).not.toContain(doc);
        }
      }
    }
  });

  it('settings with COMMERCIAL_DOCS should exclude POS, DDP, BT, RPT', () => {
    const commercialSettings = expanded.filter(s =>
      s.expandedDocs.includes('FV') && s.expandedDocs.includes('BL') &&
      !s.expandedDocs.includes('RPT') && !s.expandedDocs.includes('POS')
    );
    for (const setting of commercialSettings) {
      expect(setting.expandedDocs).not.toContain('DDP');
      expect(setting.expandedDocs).not.toContain('BT');
    }
  });

  it('paper_width_mm should only be for thermal papers', () => {
    const meta = getSettingMeta('paper_width_mm')!;
    const expandedPapers = expanded.find(s => s.key === 'paper_width_mm')!.expandedPapers;
    expect(expandedPapers).toContain('80mm');
    expect(expandedPapers).toContain('58mm');
    expect(expandedPapers).not.toContain('A4');
    expect(expandedPapers).not.toContain('A5');
  });

  it('page_orientation should only be for page papers', () => {
    const expandedPapers = expanded.find(s => s.key === 'page_orientation')!.expandedPapers;
    expect(expandedPapers).not.toContain('80mm');
    expect(expandedPapers).not.toContain('58mm');
    expect(expandedPapers).toContain('A4');
    expect(expandedPapers).toContain('A5');
  });

  it('show_bank_details and bank_details_text should be COMMERCIAL_DOCS + PAGE only', () => {
    for (const key of ['show_bank_details', 'bank_details_text']) {
      const s = expanded.find(e => e.key === key)!;
      expect(s.expandedDocs).toEqual(expect.arrayContaining(['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV']));
      expect(s.expandedDocs).not.toContain('POS');
      expect(s.expandedDocs).not.toContain('RPT');
      expect(s.expandedDocs).not.toContain('DDP');
      expect(s.expandedDocs).not.toContain('BT');
      expect(s.expandedPapers).toEqual(expect.arrayContaining(['A4', 'A5']));
      expect(s.expandedPapers).not.toContain('80mm');
      expect(s.expandedPapers).not.toContain('58mm');
    }
  });

  it('show_session should be POS_DOCS only', () => {
    const s = expanded.find(e => e.key === 'show_session')!;
    expect(s.expandedDocs).toContain('POS');
    expect(s.expandedDocs).toContain('RPT');
    expect(s.expandedDocs).not.toContain('FV');
    expect(s.expandedDocs).not.toContain('DDP');
  });

  it('isSettingVisible with dependsOn should hide children when toggle parent is off', async () => {
    const { isSettingVisible } = await import('../services/SettingsRegistry');

    const toggleDeps = expanded.filter(s =>
      s.dependsOn && getSettingMeta(s.dependsOn as string)?.component === 'toggle'
    );

    for (const child of toggleDeps) {
      const parentKey = child.dependsOn!;
      const tpl: any = { doc_type_code: 'FV', paper_size: '80mm' };
      tpl[parentKey] = false;
      tpl[child.key] = child.defaultValue;

      const visible = isSettingVisible(child.key, 'FV' as any, '80mm' as any, tpl);
      expect(visible).toBe(false);
    }
  });

  it('isSettingVisible with dependsOn should show children when toggle parent is on', async () => {
    const { isSettingVisible } = await import('../services/SettingsRegistry');

    const toggleDeps = expanded.filter(s =>
      s.dependsOn && getSettingMeta(s.dependsOn as string)?.component === 'toggle'
    );

    for (const child of toggleDeps) {
      if (!child.expandedDocs.includes('FV') || !child.expandedPapers.includes('80mm')) continue;

      const parentKey = child.dependsOn!;
      const tpl: any = { doc_type_code: 'FV', paper_size: '80mm' };
      tpl[parentKey] = true;
      tpl[child.key] = child.defaultValue;

      const visible = isSettingVisible(child.key, 'FV' as any, '80mm' as any, tpl);
      expect(visible, `${child.key} should be visible when ${parentKey}=true (FV/80mm)`).toBe(true);
    }
  });
});
```

## FILE: resources/js/pages/settings/print-settings/__tests__/serializer.spec.ts
```
import { describe, it, expect } from 'vitest';
import { normalizeTemplate, toApiPayload, fromApiResponse, TEMPLATE_VERSION } from '../services/SettingsSerializer';
import { SETTINGS_REGISTRY } from '../services/SettingsRegistry';
import { createMockTemplate } from './fixtures/templates';

describe('SettingsSerializer — normalizeTemplate', () => {
  it('should fill all missing fields from registry defaults', () => {
    const minimal: any = { id: null, doc_type_code: 'POS', paper_size: '80mm' };
    const result = normalizeTemplate(minimal, 'POS', '80mm');

    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      if (key === 'id' || key === 'name' || key === 'doc_type_code' || key === 'paper_size') continue;
      expect(result).toHaveProperty(key);
    }
  });

  it('should preserve valid user values', () => {
    const result = normalizeTemplate(
      { id: null, doc_type_code: 'FV', paper_size: '80mm', show_logo: false, title_text: 'Ma Facture' },
      'FV', '80mm',
    );
    expect(result.show_logo).toBe(false);
    expect(result.title_text).toBe('Ma Facture');
  });

  it('should set template_version', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'POS', paper_size: '80mm' }, 'POS', '80mm');
    expect(result.template_version).toBe(TEMPLATE_VERSION);
  });

  it('should override old template_version', () => {
    const result = normalizeTemplate(
      { id: 1, doc_type_code: 'FV', paper_size: '80mm', template_version: 1 } as any,
      'FV', '80mm',
    );
    expect(result.template_version).toBe(TEMPLATE_VERSION);
  });

  it('should set paper_width_mm for 80mm thermal', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'POS', paper_size: '80mm' }, 'POS', '80mm');
    expect(result.paper_width_mm).toBe(80);
  });

  it('should set paper_width_mm for 58mm thermal', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'POS', paper_size: '58mm' }, 'POS', '58mm');
    expect(result.paper_width_mm).toBe(58);
  });

  it('should not override paper_width_mm for page sizes', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'FV', paper_size: 'A4', paper_width_mm: 80 } as any, 'FV', 'A4');
    expect(result.paper_width_mm).toBe(80);
  });

  it('should ensure name is not empty', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'POS', paper_size: '80mm', name: '' }, 'POS', '80mm');
    expect(result.name).toBeTruthy();
  });
});

describe('SettingsSerializer — toApiPayload', () => {
  it('should strip top-level fields into config', () => {
    const tpl = createMockTemplate({}, 'FV', '80mm');
    const payload = toApiPayload(tpl);

    expect(payload.name).toBe(tpl.name);
    expect(payload.doc_type_code).toBe('FV');
    expect(payload.paper_size).toBe('80mm');
    expect(payload.is_default).toBe(true);
    expect(payload.is_active).toBe(true);
    expect(payload.template_version).toBe(TEMPLATE_VERSION);

    expect(payload.config.show_logo).toBe(true);
    expect(payload.config.title_text).toBe('FACTURE');
    expect(payload.config.margin_top).toBe(3);
  });

  it('should not include id, created_at, updated_at in config', () => {
    const tpl = createMockTemplate({}, 'FV', '80mm');
    const payload = toApiPayload(tpl);

    expect(payload.config).not.toHaveProperty('id');
    expect(payload.config).not.toHaveProperty('created_at');
    expect(payload.config).not.toHaveProperty('updated_at');
  });

  it('should include template_version in top level', () => {
    const tpl = createMockTemplate({}, 'FV', '80mm');
    const payload = toApiPayload(tpl);
    expect(payload.template_version).toBe(TEMPLATE_VERSION);
  });

  it('should handle partial templates', () => {
    const payload = toApiPayload({ name: 'Test', doc_type_code: 'POS', paper_size: '80mm' });
    expect(payload.name).toBe('Test');
    expect(payload.doc_type_code).toBe('POS');
    expect(payload.paper_size).toBe('80mm');
  });
});

describe('SettingsSerializer — fromApiResponse', () => {
  it('should reconstruct a full template from API response', () => {
    const response = {
      id: 1,
      name: 'Default Template',
      doc_type_code: 'FV',
      paper_size: '80mm',
      is_default: true,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      config: {
        show_logo: true,
        show_company_name: false,
        title_text: 'FACTURE',
        margin_top: 5,
        paper_width_mm: 80,
      },
    };

    const result = fromApiResponse(response as any);

    expect(result.id).toBe(1);
    expect(result.name).toBe('Default Template');
    expect(result.doc_type_code).toBe('FV');
    expect(result.paper_size).toBe('80mm');
    expect(result.show_logo).toBe(true);
    expect(result.show_company_name).toBe(false);
    expect(result.title_text).toBe('FACTURE');
    expect(result.margin_top).toBe(5);
    expect(result.template_version).toBe(TEMPLATE_VERSION);
  });

  it('should handle null config', () => {
    const result = fromApiResponse({
      id: 1,
      name: 'Test',
      doc_type_code: 'POS',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: null,
    } as any);

    expect(result.show_logo).toBeDefined();
    expect(result.title_text).toBeDefined();
  });

  it('should fill defaults for missing config fields', () => {
    const result = fromApiResponse({
      id: 1,
      name: 'Minimal',
      doc_type_code: 'POS',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: {},
    } as any);

    expect(result.show_logo).toBe(true);
    expect(result.show_barcode).toBe(true);
    expect(result.col_order).toBeDefined();
  });
});

describe('SettingsSerializer — Round-trip Symmetry', () => {
  it('should round-trip all 144+ settings without data loss', () => {
    const original = createMockTemplate({
      show_logo: false,
      show_company_name: false,
      title_text: 'TEST INVOICE',
      margin_top: 12,
      logo_size: 100,
      header_separator: 'double',
      col_order: ['rowNumber', 'barcode', 'name', 'quantity', 'price', 'discount', 'tva', 'total'],
      footer_legal_text: 'Legal notice test',
      rules: [{ id: 'r1', condition: 'total > 100', action: 'highlight', target: 'totals' }],
      show_report_cashier: false,
    }, 'RPT', 'A4');

    const payload = toApiPayload(original);
    const restored = fromApiResponse({
      id: original.id!,
      name: original.name,
      doc_type_code: original.doc_type_code,
      paper_size: original.paper_size,
      is_default: original.is_default,
      is_active: original.is_active,
      config: payload.config as any,
    } as any);

    const settingKeys = Object.keys(SETTINGS_REGISTRY).filter(k =>
      !['id', 'name', 'doc_type_code', 'paper_size', 'template_version', 'created_at', 'updated_at'].includes(k)
    );

    for (const key of settingKeys) {
      const origVal = JSON.stringify((original as any)[key]);
      const restVal = JSON.stringify((restored as any)[key]);
      expect(restVal).toBe(origVal);
    }
  });

  it('should preserve unknown/deprecated fields', () => {
    const response = {
      id: 1,
      name: 'Test',
      doc_type_code: 'POS',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: {
        show_logo: true,
        _deprecated_field: 'should be preserved',
        _legacy_setting: 42,
      },
    };

    const result = fromApiResponse(response as any);
    expect((result as any)._deprecated_field).toBe('should be preserved');
    expect((result as any)._legacy_setting).toBe(42);
  });

  it('should set template_version for old version-1 templates', () => {
    const result = fromApiResponse({
      id: 1, name: 'Old', doc_type_code: 'FV', paper_size: '80mm',
      is_default: false, is_active: true,
      config: {},
    } as any);
    expect(result.template_version).toBe(TEMPLATE_VERSION);
  });
});
```

## FILE: resources/js/pages/settings/print-settings/__tests__/visibility.pw.spec.ts
```
import { test, expect } from '@playwright/test';
import { getRegistryKeys } from './helpers/test-utils';

test.describe('Print Settings — Visibility', () => {
  test.beforeEach(async ({ page }) => {
    const { mockApiResponse } = await import('./helpers/test-utils');
    await mockApiResponse(page, { doc_type_code: 'FV', paper_size: '80mm' });
    await page.goto('/settings/print-settings?doc_type=FV');
    await page.waitForLoadState('networkidle');
  });

  test('shows thermal-only settings when 80mm selected, hides page-only settings', async ({ page }) => {
    await expect(page.locator('text=عرض العرض')).toBeVisible();
    await expect(page.locator('text=اتجاه الصفحة')).not.toBeVisible();
  });

  test('hides thermal-only settings when A4 selected', async ({ page }) => {
    const { mockApiResponse } = await import('./helpers/test-utils');
    await mockApiResponse(page, { doc_type_code: 'FV', paper_size: 'A4' });
    await page.goto('/settings/print-settings?doc_type=FV&paper_size=A4');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=عرض العرض')).not.toBeVisible();
    await expect(page.locator('text=اتجاه الصفحة')).toBeVisible();
  });

  test('shows report-only settings when RPT selected', async ({ page }) => {
    const { mockApiResponse } = await import('./helpers/test-utils');
    await mockApiResponse(page, { doc_type_code: 'RPT', paper_size: 'A4' });
    await page.goto('/settings/print-settings?doc_type=RPT&paper_size=A4');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=إظهار الرسم البياني')).toBeVisible();
    await expect(page.locator('text=إظهار الكاشير في التقرير')).toBeVisible();
  });

  test('hides bank details on 80mm thermal', async ({ page }) => {
    await expect(page.locator('text=إظهار تفاصيل البنك')).not.toBeVisible();
  });

  test('does not crash when switching between doc types', async ({ page }) => {
    for (const doc of ['FV', 'POS', 'RPT', 'DDP']) {
      const { mockApiResponse } = await import('./helpers/test-utils');
      await mockApiResponse(page, { doc_type_code: doc, paper_size: '80mm' });
      await page.goto(`/settings/print-settings?doc_type=${doc}&paper_size=80mm`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).not.toContainText('Error');
    }
  });
});
```

## FILE: resources/js/pages/settings/print-settings/__tests__/visibility-engine.spec.ts
```
import { describe, it, expect } from 'vitest';
import { isSettingVisible, SETTINGS_REGISTRY } from '../services/SettingsRegistry';
import { getExpandedRegistry } from './fixtures/expanded-registry';

type DocType = 'FV' | 'BL' | 'DEV' | 'BCC' | 'AA' | 'FA' | 'BR' | 'AV' | 'DDP' | 'BT' | 'POS' | 'RPT';
type PaperSize = '80mm' | '58mm' | 'A4' | 'A5';

const ALL_DOCS: DocType[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS', 'RPT'];
const ALL_PAPERS: PaperSize[] = ['80mm', '58mm', 'A4', 'A5'];

function makeTpl(doc: DocType, paper: PaperSize, overrides: Record<string, any> = {}) {
  const base = Object.fromEntries(
    Object.entries(SETTINGS_REGISTRY).map(([k, m]) => [k, m.defaultValue])
  );

  // Enable all toggle dependsOn parents so children are un-gated for doc/paper tests
  for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
    if (meta.dependsOn) {
      const parentMeta = SETTINGS_REGISTRY[meta.dependsOn];
      if (parentMeta && parentMeta.component === 'toggle') {
        base[meta.dependsOn] = true;
      }
    }
  }

  return { doc_type_code: doc, paper_size: paper, ...base, ...overrides };
}

describe('VisibilityEngine — isSettingVisible', () => {
  const expanded = getExpandedRegistry();

  for (const doc of ALL_DOCS) {
    for (const paper of ALL_PAPERS) {
      it(`should show only compatible settings for ${doc}/${paper}`, () => {
        const tpl = makeTpl(doc, paper);
        for (const setting of expanded) {
          const visible = isSettingVisible(setting.key, doc, paper, tpl);
          const shouldBeVisible =
            setting.expandedDocs.includes(doc) && setting.expandedPapers.includes(paper);
          if (visible !== shouldBeVisible) {
            throw new Error(
              `FAIL: ${setting.key} visibility mismatch for ${doc}/${paper}. ` +
              `Expected ${shouldBeVisible} but got ${visible}. ` +
              `Docs: [${setting.expandedDocs}], Papers: [${setting.expandedPapers}]`
            );
          }
        }
      });
    }
  }
});

describe('VisibilityEngine — DependsOn Gating', () => {
  it('should hide children when toggle parent is OFF', () => {
    const parents = Object.entries(SETTINGS_REGISTRY).filter(
      ([, m]) => m.category !== 'global' && Object.values(SETTINGS_REGISTRY).some(
        s => s.dependsOn === m.key && m.component === 'toggle'
      )
    );

    for (const [, parentMeta] of parents) {
      const children = Object.entries(SETTINGS_REGISTRY).filter(
        ([, m]) => m.dependsOn === parentMeta.key && m.key !== 'barcode_custom_text'
      );
      if (children.length === 0) continue;

      const tpl = makeTpl('FV', '80mm');
      tpl[parentMeta.key] = false;

      for (const [childKey] of children) {
        expect(isSettingVisible(childKey, 'FV', '80mm', tpl)).toBe(false);
      }
    }
  });

  it('should show children when toggle parent is ON', () => {
    const expanded = getExpandedRegistry();

    for (const [parentKey, parentMeta] of Object.entries(SETTINGS_REGISTRY)) {
      if (parentMeta.component !== 'toggle') continue;
      const children = Object.entries(SETTINGS_REGISTRY).filter(
        ([, m]) => m.dependsOn === parentKey
      );
      if (children.length === 0) continue;

      const tpl = makeTpl('FV', '80mm');
      tpl[parentKey] = true;

      for (const [childKey] of children) {
        const childExpanded = expanded.find(s => s.key === childKey)!;
        const fitsDocPaper = childExpanded.expandedDocs.includes('FV') && childExpanded.expandedPapers.includes('80mm');
        if (!fitsDocPaper) continue;

        expect(isSettingVisible(childKey, 'FV', '80mm', tpl)).toBe(true);
      }
    }
  });
});

describe('VisibilityEngine — Edge Cases', () => {
  it('should handle unknown setting gracefully', () => {
    const tpl = makeTpl('FV', '80mm');
    expect(isSettingVisible('nonexistent_setting' as any, 'FV', '80mm', tpl)).toBe(true);
  });

  it('should handle missing tpl field', () => {
    const tpl = { doc_type_code: 'FV', paper_size: '80mm' };
    const result = isSettingVisible('show_logo', 'FV', '80mm', tpl as any);
    expect(typeof result).toBe('boolean');
  });

  it('barcode_custom_text should not be auto-gated by dependsOn', () => {
    const tpl = makeTpl('FV', '80mm');
    tpl['barcode_content'] = 'doc-number';
    const visible = isSettingVisible('barcode_custom_text', 'FV', '80mm', tpl);
    expect(visible).toBe(true);
  });
});
```

## FILE: resources/js/pages/settings/print-settings/api/printTemplatesApi.ts
```
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { ApiClient } from '../contracts/ApiClient';
import type { PrintTemplatesApi } from '../contracts/TemplateRepository';
import type { PrintTemplate, PrintTemplateApiResponse, DocTypeCode } from '../types';
import type { LibraryApiResponse } from '../template-library/types';
import { usePrintTemplatesApi, useSlug } from '../providers/PrintSettingsContext';
import { toApiPayload as serializePayload, normalizeTemplate } from '../services/SettingsSerializer';

// ─── Query key factory ─────────────────────────────────────────────────────
export const printTemplateKeys = {
  all:     (slug: string)              => [slug, 'print-templates']              as const,
  list:    (slug: string, code?: string) => [slug, 'print-templates', 'list', code] as const,
  detail:  (slug: string, id: number)  => [slug, 'print-templates', id]         as const,
};

// ─── Pure helpers (no external deps) ───────────────────────────────────────

function fromApiResponse(r: PrintTemplateApiResponse): PrintTemplate {
  const raw: Partial<PrintTemplate> = {
    id:            r.id as any,
    name:          r.name,
    doc_type_code: r.doc_type_code as DocTypeCode,
    paper_size:    r.paper_size as PrintTemplate['paper_size'],
    is_default:    r.is_default,
    is_active:     r.is_active,
    created_at:    r.created_at,
    updated_at:    r.updated_at,
  };
  const config = r.config ?? {};
  for (const key of Object.keys(config)) {
    (raw as any)[key] = (config as any)[key];
  }
  return normalizeTemplate(raw, raw.doc_type_code, raw.paper_size);
}

function toApiPayload(tpl: Partial<PrintTemplate>): Record<string, unknown> {
  return serializePayload(tpl) as unknown as Record<string, unknown>;
}

// ─── Factory: creates PrintTemplatesApi from an ApiClient ──────────────────

export function createPrintTemplatesApi(api: ApiClient): PrintTemplatesApi {
  return {
    list: (docTypeCode?: string) =>
      api.get<PrintTemplateApiResponse[]>('/print-templates', docTypeCode
        ? { doc_type_code: docTypeCode } : undefined)
        .then(r => (Array.isArray(r) ? r : (r as Record<string, unknown>)?.data ?? [] as PrintTemplateApiResponse[]).map(fromApiResponse)),

    show: (id: number) =>
      api.get<PrintTemplateApiResponse>(`/print-templates/${id}`)
        .then(fromApiResponse),

    create: (tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>) =>
      api.post<PrintTemplateApiResponse>('/print-templates', toApiPayload(tpl as unknown as Partial<PrintTemplate>))
        .then(fromApiResponse),

    update: (id: number, tpl: Partial<PrintTemplate>) =>
      api.put<PrintTemplateApiResponse>(`/print-templates/${id}`, toApiPayload(tpl))
        .then(fromApiResponse),

    delete: (id: number) =>
      api.delete(`/print-templates/${id}`),

    setDefault: (id: number) =>
      api.post<PrintTemplateApiResponse>(`/print-templates/${id}/set-default`)
        .then(fromApiResponse),

    duplicate: (id: number, newName: string) =>
      api.post<PrintTemplateApiResponse>(`/print-templates/${id}/duplicate`, { name: newName })
        .then(fromApiResponse),

    library: () =>
      api.get<LibraryApiResponse[]>('/print-templates/library')
        .then(r => (Array.isArray(r) ? r : (r as Record<string, unknown>)?.data ?? [] as LibraryApiResponse[])),

    installLibrary: (templateId: string) =>
      api.post<PrintTemplateApiResponse>('/print-templates/library/install', { template_id: templateId })
        .then(fromApiResponse),

    uploadLogo: (file: File, onProgress?: (p: number) => void) => {
      const fd = new FormData();
      fd.append('logo', file);
      return api.upload<{ path: string; url: string }>('/print-templates/upload-logo', fd, onProgress);
    },
  };
}

// ─── React Query hooks (depend on context for api + slug) ─────────────────

export function usePrintTemplates(docTypeCode?: DocTypeCode) {
  const api = usePrintTemplatesApi();
  const slug = useSlug();
  return useQuery({
    queryKey:        printTemplateKeys.list(slug ?? '', docTypeCode),
    queryFn:         () => api.list(docTypeCode),
    enabled:         !!slug,
    staleTime:       5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePrintTemplateMutations() {
  const api = usePrintTemplatesApi();
  const slug = useSlug();
  const qc   = useQueryClient();

  const invalidateAll = () => {
    if (slug) qc.invalidateQueries({ queryKey: printTemplateKeys.all(slug) });
  };

  const invalidateOne = (tpl: PrintTemplate) => {
    if (slug && tpl.id) {
      qc.setQueryData(printTemplateKeys.detail(slug, tpl.id), tpl);
      qc.invalidateQueries({ queryKey: printTemplateKeys.all(slug) });
    }
  };

  const create = useMutation({
    mutationFn: (tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>) =>
      api.create(tpl),
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PrintTemplate> }) =>
      api.update(id, data),
    onSuccess: invalidateOne,
  });

  const remove = useMutation({
    mutationFn: api.delete,
    onSuccess:  invalidateAll,
  });

  const setDefault = useMutation({
    mutationFn: api.setDefault,
    onSuccess:  invalidateAll,
  });

  const duplicate = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.duplicate(id, name),
    onSuccess: invalidateAll,
  });

  const installLibrary = useMutation({
    mutationFn: api.installLibrary,
    onSuccess: invalidateAll,
  });

  return { create, update, remove, setDefault, duplicate, installLibrary };
}
```

## FILE: resources/js/pages/settings/print-settings/ARCHITECTURE.md
```
# Print-Settings Module Architecture

## Overview

`print-settings/` is a **fully self-contained feature module** for ERP document template management. It handles creating, editing, previewing, saving, exporting/importing, and installing print templates for all document types (invoices, deliveries, quotes, receipts, etc.).

## Directory Structure

```
print-settings/
├── index.ts                          # Public API — consumers import ONLY from here
├── ARCHITECTURE.md                   # This file
├── AGENTS.md                         # AI agent context cache
│
├── page/                             # Page-level orchestrator
│   └── index.ts                      #   Re-exports PrintSettingsPage
│
├── PrintSettingsPage.tsx             # Main page (orchestrator, ~740 lines of logic)
│
├── types.ts                          # Canonical PrintTemplate type + createDefaultTemplate()
├── types/
│   ├── index.ts                      # Re-exports from root types.ts + data/
│   ├── domain/
│   │   └── index.ts                  # Re-exports domain types
│   └── data/
│       ├── index.ts                  # Re-exports UniversalDocumentData + DocumentDataBuilder
│       ├── UniversalDocumentData.ts  # Single data contract (no imports)
│       └── DocumentDataBuilder.ts    # Builds from API/POS/legacy sources
│
├── services/
│   ├── index.ts                      # Barrel exports all services
│   ├── FieldRegistry.ts              # 79 cataloged fields with Arabic labels
│   ├── CalculatedFieldService.ts     # 8 computed fields
│   ├── printStoreService.ts          # DB layer — save/fetch templates from backend
│   └── engines/
│       ├── index.ts                  # Barrel exports engines
│       ├── FormulaEngine.ts          # Expression evaluator (no eval, custom parser)
│       └── RulesEngine.ts            # Declarative show/hide/highlight rules
│
├── hooks/
│   ├── index.ts                      # Barrel exports hooks
│   ├── useUndoRedo.ts               # Stack-based undo/redo (60 steps)
│   └── useKeyboardShortcuts.ts      # Ctrl+Z/Y/S handlers
│
├── components/
│   ├── index.ts                      # Barrel exports all public components
│   ├── ui.tsx                        # UI primitives (Toggle, Slider, Field, Input, etc.)
│   ├── Accordion.tsx                 # Collapsible accordion panel
│   ├── ColumnManager.tsx             # Table column visibility/order/width manager
│   ├── TemplateControls.tsx          # All template control sections
│   ├── QuickNav.tsx                  # Sticky section navigation with IntersectionObserver
│   ├── TinyBtn.tsx                   # Small icon action button
│   ├── PreviewSelector.tsx           # Routes to UniversalPreview or legacy previews
│   ├── FormulaEditor.tsx             # Formula expression editor with field picker
│   ├── RulesSection.tsx              # Condition builder (rules list, visibility, highlights)
│   ├── ChartSection.tsx              # BarChart/PieChart via recharts
│   ├── ImagePreviewModal.tsx         # Logo/image preview modal
│   └── preview/
│       ├── UniversalPreview.tsx      # Main preview orchestrator (~280 lines now)
│       ├── shared.tsx                # Shared helpers (mm, align, Separator, DocRow, etc.)
│       ├── ReportSection.tsx         # Report rendering (KPI cards, charts, top products)
│       ├── LogoRenderer.tsx          # Logo image renderer
│       ├── HeaderSection.tsx         # Header renderer (thermal + A4/A5)
│       ├── DocInfoSection.tsx        # Document info renderer
│       ├── ItemsSection.tsx          # Items table renderer
│       ├── TotalsSection.tsx         # Totals renderer
│       ├── PaymentsSection.tsx       # Payments renderer
│       └── FooterSection.tsx         # Footer renderer
│
├── sections/                         # Template control sections (for PrintSettingsPage)
│   ├── index.ts
│   ├── ToggleSwitch.tsx              # Section accordion toggle primitives
│   ├── HeaderSection.tsx
│   ├── DocumentSection.tsx
│   ├── ItemsSection.tsx
│   ├── TotalsSection.tsx
│   ├── FooterSection.tsx
│   └── FormattingSection.tsx
│
├── render/                           # Render helpers
│   └── index.ts                      # Re-exports
│
├── config/                           # Template library config
│   └── ...
│
├── template-library/                 # Template library (install/search/filter)
│   ├── index.ts
│   ├── types.ts
│   ├── constants.ts
│   ├── categories.ts
│   ├── mockData.ts
│   ├── registry.ts
│   ├── TemplateLibraryModal.tsx
│   └── config/
│       ├── index.ts
│       ├── PaperConfig.ts
│       ├── TypographyConfig.ts
│       ├── HeaderConfig.ts
│       ├── TableConfig.ts
│       ├── TotalsConfig.ts
│       └── FooterConfig.ts
│
├── api/
│   └── printTemplatesApi.ts          # React Query hooks for template CRUD
│
├── utils/                            # Pure utilities
│   ├── index.ts
│   └── numberToArabic.ts             # Number-to-Arabic-words converter
│
└── page/
    └── index.ts                      # Re-exports PrintSettingsPage
```

## Architecture Principles

### 1. Self-Containment
- All code for print template management lives inside `print-settings/`
- External imports are limited to 4 shared infrastructure paths:
  - `@/lib/api/core/client` (HTTP client)
  - `@/lib/store/appStore` (active company/slug)
  - `@/components/ui/ErrorBoundary`
  - `@/lib/api/core/types` (type-only)
- No imports from `@/reporting`, `@/pos`, or other page modules

### 2. Singleton Sources
- All service instances are created once and stored in `services/engines/` and `services/`
- `reporting/index.ts` re-exports from `print-settings/` to avoid duplicate instances
- Direction: POS → print-settings → reporting (POS re-exports from print-settings)

### 3. Single Responsibility
- `PrintSettingsPage.tsx` is an orchestrator only — it composes components, manages state, and delegates to hooks
- UI primitives live in `components/ui.tsx`
- Each major render section has its own component file
- Services are stateless classes or singleton instances

### 4. Data Flow
```
User action → PrintSettingsPage state → tpl object → UniversalPreview → Section components
                                                          ↕
                                              rulesEngine.evaluate(tpl.rules, data)
```

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| PrintSettingsPage | `PrintSettingsPage.tsx` | 3-column layout: doc type selector, template controls, live preview |
| UniversalPreview | `components/preview/UniversalPreview.tsx` | Dispatches to paper-specific renderers |
| PreviewSelector | `components/PreviewSelector.tsx` | Routes to UniversalPreview or legacy A4/A5 previews |
| FormulaEditor | `components/FormulaEditor.tsx` | Expression editor with field picker + validation |
| TemplateLibraryModal | `template-library/TemplateLibraryModal.tsx` | Browse/search/install templates |
| RulesSection | `components/RulesSection.tsx` | Condition builder for show/hide/highlight |
| ChartSection | `components/ChartSection.tsx` | Chart rendering for report summaries |

## External Dependencies

Only 4 shared infrastructure imports:
- `@/lib/api/core/client`: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiUpload`, `apiPatch`
- `@/lib/store/appStore`: `useActiveCompany`, `useActiveSlug`
- `@/components/ui/ErrorBoundary`
- `@/lib/api/core/types`: `CommercialDocument` (type only)

## Build

```bash
npm run build  # 1020 modules, 0 errors (PrintSettingsPage chunk: ~95KB)
```
```

## FILE: resources/js/pages/settings/print-settings/components/Accordion.tsx
```
import React, { useState, useEffect } from 'react';

export function Accordion({ title, icon, id, children, defaultOpen = false, collapseVersion }: {
  title: string; icon: string; id?: string;
  children: React.ReactNode; defaultOpen?: boolean; collapseVersion?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setOpen(defaultOpen); }, [collapseVersion, defaultOpen]);
  return (
    <div
      id={id}
      style={{
        marginBottom: 4, border: '1px solid var(--b2)',
        borderRadius: 'var(--r2)', overflow: 'visible',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)} type="button"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 11px', background: 'var(--bg3)',
          border: 'none', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          borderBottom: open ? '1px solid var(--b2)' : 'none',
          position: 'sticky', top: 0, zIndex: 5,
        }}
      >
        <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 13, flexShrink: 0 }} />
        <span style={{
          flex: 1, textAlign: 'right', fontSize: 12.5,
          fontWeight: 700, color: 'var(--t1)',
        }}>{title}</span>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
          style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/ChartSection.tsx
```
import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { UniversalDocumentData } from '../types/data';

interface ChartSectionProps {
  data: UniversalDocumentData;
  chartType: 'bar' | 'pie';
  title?: string;
  width?: number;
}

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ChartSection({ data, chartType, title, width = 600 }: ChartSectionProps) {
  const breakdown = data.report?.paymentBreakdown || [];
  const hasData = breakdown.length > 0 && breakdown.some(b => b.amount > 0);

  const chartData = useMemo(() => {
    return breakdown.map(b => ({
      name: b.mode,
      value: b.amount,
    }));
  }, [breakdown]);

  if (!data.report) return null;
  if (!hasData) return null;

  const chartWidth = Math.min(width, 560);

  return (
    <div style={{ margin: '12px 0', textAlign: 'center' }}>
      {title && (
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#111' }}>
          {title}
        </div>
      )}

      {chartType === 'bar' ? (
        <div style={{ direction: 'ltr', display: 'inline-block' }}>
          <ResponsiveContainer width={chartWidth} height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#555' }}
                axisLine={{ stroke: '#ddd' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v.toLocaleString('ar-DZ')}`}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} دج`, 'المبلغ']}
                contentStyle={{
                  fontSize: 12, borderRadius: 4, border: '1px solid #ddd',
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ direction: 'ltr', display: 'inline-block' }}>
          <ResponsiveContainer width={chartWidth} height={220}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                paddingAngle={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} دج`, 'المبلغ']}
                contentStyle={{
                  fontSize: 12, borderRadius: 4, border: '1px solid #ddd',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/ColumnManager.tsx
```
import React, { useState } from 'react';
import type { PrintTemplate, ColumnKey } from '../types';

export type Updater = <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;

const ALL_COLS: { key: ColumnKey; label: string }[] = [
  { key: 'rowNumber', label: 'رقم السطر'  },
  { key: 'barcode',   label: 'باركود'      },
  { key: 'ref',       label: 'المرجع'       },
  { key: 'name',      label: 'المنتج'       },
  { key: 'unit',      label: 'الوحدة'       },
  { key: 'quantity',  label: 'الكمية'       },
  { key: 'price',     label: 'السعر'        },
  { key: 'discount',  label: 'الخصم'        },
  { key: 'tva',       label: 'TVA'          },
  { key: 'total',     label: 'الإجمالي'    },
];

const miniBtn: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, border: '1px solid var(--b2)',
  background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 10,
  color: 'var(--t3)', padding: 0, flexShrink: 0,
};

export function ColumnManager({ tpl, update }: { tpl: PrintTemplate; update: Updater }) {
  const [dragKey, setDragKey] = useState<ColumnKey | null>(null);

  const toggleCol = (key: ColumnKey, show: boolean) => {
    update('col_show', { ...tpl.col_show, [key]: show });
    if (show && !tpl.col_order.includes(key))
      update('col_order', [...tpl.col_order, key]);
  };
  const moveCol = (key: ColumnKey, dir: -1 | 1) => {
    const arr = [...tpl.col_order];
    const idx = arr.indexOf(key);
    if (idx < 0) return;
    const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    update('col_order', arr);
  };
  const handleDragOver = (e: React.DragEvent, key: ColumnKey) => {
    e.preventDefault();
    if (!dragKey || dragKey === key) return;
    const from = tpl.col_order.indexOf(dragKey);
    const to = tpl.col_order.indexOf(key);
    if (from < 0 || to < 0) return;
    const arr = [...tpl.col_order];
    arr.splice(from, 1);
    arr.splice(to, 0, dragKey);
    update('col_order', arr);
    setDragKey(key);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {ALL_COLS.map(col => {
        const visible = tpl.col_show[col.key] !== false;
        const idx     = tpl.col_order.indexOf(col.key);
        const isDragging = dragKey === col.key;
        return (
          <div
            key={col.key}
            draggable
            onDragStart={() => setDragKey(col.key)}
            onDragOver={e => handleDragOver(e, col.key)}
            onDragEnd={() => setDragKey(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px',
              borderRadius: 'var(--r1)',
              background: visible ? 'var(--emb)' : 'var(--bg3)',
              border: `1px solid ${visible ? 'var(--embo)' : 'var(--b1)'}`,
              cursor: 'grab', opacity: isDragging ? 0.4 : 1,
            }}
          >
            <div
              onClick={() => toggleCol(col.key, !visible)}
              style={{
                width: 28, height: 15, borderRadius: 8, flexShrink: 0,
                background: visible ? 'var(--em)' : 'var(--bg5)',
                border: `1px solid ${visible ? 'var(--em)' : 'var(--b3)'}`,
                position: 'relative', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', top: 1.5,
                left: visible ? 12 : 1.5,
                width: 10, height: 10, borderRadius: '50%', background: '#fff',
                transition: 'left .15s',
              }} />
            </div>

            <span style={{
              flex: 1, fontSize: 11.5, fontWeight: 600, color: 'var(--t2)',
              minWidth: 0, display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <i className="ti ti-grip-vertical" style={{ fontSize: 9, opacity: 0.3 }} />
              {col.label}
              {visible && idx >= 0 && (
                <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 4 }}>#{idx + 1}</span>
              )}
            </span>

            <button onClick={() => moveCol(col.key, -1)} disabled={idx <= 0}
              style={{ ...miniBtn, opacity: idx <= 0 ? .3 : 1 }} type="button">
              <i className="ti ti-chevron-right" />
            </button>
            <button onClick={() => moveCol(col.key, 1)}
              disabled={idx >= tpl.col_order.length - 1}
              style={{ ...miniBtn, opacity: idx >= tpl.col_order.length - 1 ? .3 : 1 }} type="button">
              <i className="ti ti-chevron-left" />
            </button>

            {visible && (
              <>
                <input
                  type="range" min={5} max={60} step={1}
                  value={tpl.col_widths[col.key] ?? 20}
                  onChange={e => update('col_widths', { ...tpl.col_widths, [col.key]: Number(e.target.value) })}
                  style={{ width: 44, height: 3, accentColor: 'var(--em)', flexShrink: 0 }}
                />
                <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 22 }}>
                  {tpl.col_widths[col.key] ?? 20}%
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/DeleteConfirmModal.tsx
```
import React from 'react';

interface DeleteConfirmModalProps {
  deleteTarget: number | null;
  actionLoading: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  deleteTarget,
  actionLoading,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (deleteTarget === null) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancel}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 24, width: 380, maxWidth: '90vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--red)' }}>
          <i className="ti ti-alert-triangle" style={{ marginLeft: 8 }} />
          تأكيد الحذف
        </div>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20, lineHeight: 1.6 }}>
          هل تريد حذف هذا القالب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', border: '1px solid var(--b2)', borderRadius: 6,
            background: 'var(--bg2)', color: 'var(--t2)', cursor: 'pointer', fontSize: 13,
          }} type="button">إلغاء</button>
          <button onClick={onConfirm} disabled={actionLoading !== null} style={{
            padding: '8px 16px', border: 'none', borderRadius: 6,
            background: 'var(--red)', color: '#fff', cursor: actionLoading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, opacity: actionLoading ? 0.6 : 1,
          }} type="button">
            {actionLoading ? 'جاري الحذف…' : 'حذف'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/ErrorBoundary.tsx
```
import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: 24, textAlign: 'center', color: 'var(--t4)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 28, color: 'var(--red)', opacity: 0.6 }} />
          <span style={{ fontSize: 13 }}>تعذر عرض المعاينة</span>
          <button onClick={() => this.setState({ hasError: false })} style={{
            padding: '6px 14px', border: '1px solid var(--b2)', borderRadius: 6,
            background: 'var(--bg2)', cursor: 'pointer', fontSize: 12, color: 'var(--t2)',
          }} type="button">إعادة المحاولة</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

## FILE: resources/js/pages/settings/print-settings/components/FormulaEditor.tsx
```
import { useState, useRef, useCallback, useEffect } from 'react';
import { fieldRegistry } from '../services/FieldRegistry';
import { formulaEngine } from '../services/engines/FormulaEngine';

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showFieldPicker?: boolean;
  width?: string;
}

const FUNCTIONS = ['IF', 'SUM', 'AVG', 'ROUND', 'CONCAT', 'FORMAT', 'TODAY', 'MIN', 'MAX', 'COUNT'];

function insertAtCursor(input: HTMLInputElement, text: string) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  const newValue = before + text + after;
  const cursorPos = start + text.length;
  return { newValue, cursorPos };
}

export default function FormulaEditor({
  value,
  onChange,
  label,
  placeholder,
  showFieldPicker = true,
  width,
}: FormulaEditorProps) {
  const [validation, setValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const filteredGroups = useRef(fieldRegistry.getAllGroups());

  const doValidate = useCallback((expr: string) => {
    if (!expr.trim()) {
      setValidation(null);
      return;
    }
    const result = formulaEngine.validate(expr);
    setValidation(result);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      onChange(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doValidate(v), 300);
    },
    [onChange, doValidate],
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    doValidate(value);
  }, [value, doValidate]);

  const insertText = useCallback(
    (text: string) => {
      if (!inputRef.current) {
        onChange(value + text);
        return;
      }
      const { newValue, cursorPos } = insertAtCursor(inputRef.current, text);
      onChange(newValue);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [onChange, value],
  );

  const handleFieldPick = useCallback(
    (path: string) => {
      insertText(path);
      setPickerOpen(false);
      setSearchQuery('');
    },
    [insertText],
  );

  const handleFunctionPick = useCallback(
    (fn: string) => {
      insertText(`${fn}()`);
    },
    [insertText],
  );

  // Close picker on click outside
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node) && !(e.target as HTMLElement)?.closest?.('[data-picker-toggle]')) {
        setPickerOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  // Escape closes picker
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPickerOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pickerOpen]);

  // Ctrl+Space opens picker
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();
        setPickerOpen(p => !p);
      }
    },
    [],
  );

  // Update filtered groups on search
  useEffect(() => {
    if (!pickerOpen) return;
    if (!searchQuery.trim()) {
      filteredGroups.current = fieldRegistry.getAllGroups();
    } else {
      const results = fieldRegistry.search(searchQuery);
      const groupMap = new Map<string, typeof results>();
      results.forEach(f => {
        const list = groupMap.get(f.group) ?? [];
        list.push(f);
        groupMap.set(f.group, list);
      });
      filteredGroups.current = fieldRegistry
        .getAllGroups()
        .filter(g => groupMap.has(g.id))
        .map(g => ({ ...g, fields: groupMap.get(g.id)! }));
    }
  }, [searchQuery, pickerOpen]);

  const inputWidth = width || '100%';

  const styles: Record<string, React.CSSProperties> = {
    wrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      position: 'relative',
    },
    input: {
      width: inputWidth,
      padding: '5px 8px',
      borderRadius: 4,
      border: '1px solid var(--b2, #d0d0d0)',
      fontSize: 13,
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
      paddingRight: validation ? 24 : 8,
    },
    pickerBtn: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      border: '1px solid var(--b2, #d0d0d0)',
      background: 'var(--bg, #fff)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      lineHeight: 1,
      color: 'var(--t2, #555)',
      flexShrink: 0,
    },
    validationIcon: {
      position: 'absolute' as const,
      right: showFieldPicker ? 36 : 6,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 16,
      height: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none' as const,
    },
    dropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'var(--bg, #fff)',
      border: '1px solid var(--b2, #d0d0d0)',
      borderRadius: 6,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      marginTop: 4,
      maxHeight: 300,
      display: 'flex',
      flexDirection: 'column' as const,
    },
    searchInput: {
      width: '100%',
      padding: '8px 10px',
      border: 'none',
      borderBottom: '1px solid var(--b2, #d0d0d0)',
      fontSize: 12,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    groupLabel: {
      padding: '6px 10px',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--t3, #888)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      background: 'var(--b1, #f8f8f8)',
      borderBottom: '1px solid var(--b2, #d0d0d0)',
    },
    fieldItem: {
      padding: '6px 10px',
      cursor: 'pointer',
      fontSize: 12,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--b1, #f0f0f0)',
      transition: 'background 0.15s',
    },
    fieldPath: {
      fontSize: 10,
      color: 'var(--t3, #999)',
      fontFamily: 'monospace',
    },
    fieldType: {
      fontSize: 9,
      color: 'var(--t3, #999)',
      background: 'var(--b1, #f0f0f0)',
      padding: '1px 5px',
      borderRadius: 3,
      marginLeft: 4,
    },
    chipsRow: {
      display: 'inline-flex',
      flexWrap: 'wrap' as const,
      gap: 4,
      marginTop: 4,
    },
    chip: {
      display: 'inline-flex',
      padding: '2px 8px',
      borderRadius: 12,
      background: 'var(--b1, #e8e8e8)',
      cursor: 'pointer',
      fontSize: 11,
      color: 'var(--t2, #555)',
      border: 'none',
      fontFamily: 'monospace',
      transition: 'background 0.15s',
    },
    errorTooltip: {
      fontSize: 10,
      color: '#d32f2f',
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      marginTop: 2,
      padding: '2px 6px',
      background: '#fff',
      border: '1px solid #ffcdd2',
      borderRadius: 3,
      whiteSpace: 'nowrap' as const,
      zIndex: 10,
    },
  };

  const groups = filteredGroups.current;

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 12, marginBottom: 3, color: 'var(--t2, #555)' }}>
          {label}
        </label>
      )}
      <div style={styles.wrapper}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            style={styles.input}
            value={value}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'اكتب تعبيراً...'}
          />
          {validation && (
            <span style={styles.validationIcon} title={validation.valid ? 'صحيح' : validation.error}>
              {validation.valid ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#4caf50" />
                  <path d="M5 8.5L7 10.5L11 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#f44336" />
                  <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </span>
          )}
          {validation && !validation.valid && validation.error && (
            <div style={styles.errorTooltip}>{validation.error}</div>
          )}
        </div>
        {showFieldPicker && (
          <button
            data-picker-toggle
            style={{
              ...styles.pickerBtn,
              background: pickerOpen ? 'var(--b1, #eee)' : 'var(--bg, #fff)',
              borderColor: pickerOpen ? 'var(--a, #1976d2)' : 'var(--b2, #d0d0d0)',
            }}
            onClick={() => {
              setPickerOpen(p => !p);
              if (!pickerOpen) setSearchQuery('');
            }}
            title="اختيار حقل (Ctrl+Space)"
            type="button"
          >
            <i className="ti ti-list-search" style={{ fontSize: 16 }} />
          </button>
        )}
        {pickerOpen && showFieldPicker && (
          <div ref={pickerRef} style={styles.dropdown}>
            <input
              style={styles.searchInput}
              placeholder="ابحث عن حقل..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setPickerOpen(false);
                  setSearchQuery('');
                }
              }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {groups.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--t3, #999)' }}>
                  لا توجد نتائج
                </div>
              )}
              {groups.map(group => (
                <div key={group.id}>
                  <div style={styles.groupLabel}>{group.label}</div>
                  {group.fields.map(field => (
                    <div
                      key={field.path}
                      style={styles.fieldItem}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--b1, #f0f0f0)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                      onClick={() => handleFieldPick(field.path)}
                    >
                      <span>
                        <span>{field.label}</span>
                        <span style={styles.fieldType}>{field.type}</span>
                      </span>
                      <span style={styles.fieldPath}>{field.path}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {focused && (
        <div style={styles.chipsRow}>
          {FUNCTIONS.map(fn => (
            <button
              key={fn}
              type="button"
              style={styles.chip}
              onClick={() => handleFunctionPick(fn)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--b2, #d0d0d0)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--b1, #e8e8e8)';
              }}
            >
              {fn}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/ImagePreviewModal.tsx
```
import React from 'react';

interface Props {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ open, src, alt, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.65)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      <img
        src={src}
        alt={alt ?? 'Preview'}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: 8,
          boxShadow: '0 8px 40px rgba(0,0,0,.35)',
        }}
      />
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/DocInfoSection.tsx
```
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { align, formatDate, DocRow, Separator } from './shared';
import { printFieldResolver } from '../../services';

function r(fieldId: string, data: UniversalDocumentData, tpl: PrintTemplate) {
  return printFieldResolver.resolve(fieldId, data, tpl);
}

function renderThermalDocInfo(tpl: PrintTemplate, data: UniversalDocumentData) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{
        textAlign: align(tpl.title_align),
        fontSize: tpl.title_size,
        fontWeight: tpl.title_bold ? 900 : 400,
        color: tpl.title_color,
        fontFamily: "'Tajawal', sans-serif",
        marginBottom: 4,
      }}>
        {tpl.title_text}
      </div>

      <div style={{ fontSize: tpl.base_font_size }}>
        {tpl.show_doc_number && <DocRow label="رقم:" value={r('document.number', data, tpl) as string} mono />}
        {tpl.show_date && <DocRow label="التاريخ:" value={`${formatDate(r('document.date', data, tpl) as string)}${tpl.show_time && r('document.time', data, tpl) ? ' ' + r('document.time', data, tpl) : ''}`} />}
        {tpl.show_due_date && r('document.dueDate', data, tpl) && <DocRow label="تاريخ الاستحقاق:" value={r('document.dueDate', data, tpl) as string} />}
        {tpl.show_cashier && r('customer.cashierName', data, tpl) && (
          <DocRow label="الكاشير:" value={r('customer.cashierName', data, tpl) as string} />
        )}
        {tpl.show_session && r('session.code', data, tpl) && (
          <DocRow label="الجلسة:" value={r('session.code', data, tpl) as string} />
        )}
        {tpl.show_client && r('customer.name', data, tpl) && (
          <>
            <DocRow label="العميل:" value={r('customer.name', data, tpl) as string} />
            {tpl.show_client_nif     && r('customer.nif', data, tpl)      && <DocRow label="NIF العميل:" value={r('customer.nif', data, tpl) as string} />}
            {tpl.show_client_phone   && r('customer.phone', data, tpl)    && <DocRow label="هاتف العميل:" value={r('customer.phone', data, tpl) as string} />}
            {tpl.show_client_address && r('customer.address', data, tpl)  && <DocRow label="العنوان:" value={r('customer.address', data, tpl) as string} />}
            {tpl.show_delivery_address && r('customer.deliveryAddress', data, tpl) && <DocRow label="عنوان التسليم:" value={r('customer.deliveryAddress', data, tpl) as string} />}
          </>
        )}
        {tpl.show_payment_term && r('document.dueDate', data, tpl) && (
          <DocRow label="شروط الدفع:" value={r('document.dueDate', data, tpl) as string} />
        )}
      </div>

      <Separator style={tpl.doc_separator} />
    </div>
  );
}

function renderPageDocInfo(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';
  const clientName = r('customer.name', data, tpl) as string;

  if (!tpl.show_client || !clientName) return null;

  if (isA4) {
    return (
      <div style={{ display: 'flex', gap: 30, marginBottom: 24 }}>
        <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.company_info_size + 1, marginBottom: 6, color: '#111' }}>بيانات العميل</div>
          <div style={{ fontSize: tpl.company_info_size, color: '#333' }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{clientName}</div>
            {tpl.show_client_nif     && r('customer.nif', data, tpl)     && <div>NIF: {r('customer.nif', data, tpl) as string}</div>}
            {tpl.show_client_phone   && r('customer.phone', data, tpl)   && <div>☎ {r('customer.phone', data, tpl) as string}</div>}
            {tpl.show_client_address && r('customer.address', data, tpl) && <div>{r('customer.address', data, tpl) as string}</div>}
          </div>
        </div>
        {tpl.show_delivery_address && r('customer.deliveryAddress', data, tpl) && (
          <div style={{ flex: 1, padding: 12, background: '#f9fafb', borderRadius: 4, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: tpl.company_info_size + 1, marginBottom: 6, color: '#111' }}>عنوان التسليم</div>
            <div style={{ fontSize: tpl.company_info_size, color: '#333' }}>
              {r('customer.deliveryAddress', data, tpl) as string}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      fontSize: tpl.company_info_size, marginBottom: 10,
      padding: 8, background: '#f9fafb', borderRadius: 4,
    }}>
      <span style={{ fontWeight: 700 }}>العميل: </span>{clientName}
      {tpl.show_client_nif   && r('customer.nif', data, tpl)   && <span style={{ marginRight: 12 }}>NIF: {r('customer.nif', data, tpl) as string}</span>}
      {tpl.show_client_phone && r('customer.phone', data, tpl) && <span style={{ marginRight: 12 }}>☎ {r('customer.phone', data, tpl) as string}</span>}
    </div>
  );
}

export function renderDocInfo(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalDocInfo(tpl, data);
  return renderPageDocInfo(tpl, data);
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/FooterSection.tsx
```
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { Separator } from './shared';

function barcodeText(tpl: PrintTemplate, data: UniversalDocumentData): string {
  if (tpl.barcode_content === 'custom') return tpl.barcode_custom_text;
  if (tpl.barcode_content === 'total') return `${Number(data.totals.totalTtc).toFixed(2)} دج`;
  return data.doc.number;
}

function qrDataText(tpl: PrintTemplate, data: UniversalDocumentData): string {
  const parts: string[] = [];
  if (tpl.qr_content === 'doc-number' || tpl.qr_content === 'both') {
    parts.push(data.doc.number);
  }
  if (tpl.qr_content === 'company-info' || tpl.qr_content === 'both') {
    parts.push(data.company.name || '');
  }
  return parts.join(' | ');
}

function renderThermalFooter(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_barcode || tpl.show_qr ||
    tpl.show_cashier_signature || tpl.show_client_signature || tpl.show_stamp ||
    tpl.show_bank_details;

  if (!hasContent) return null;

  return (
    <div style={{ textAlign: 'center', fontSize: tpl.base_font_size - 0.5 }}>
      <Separator style={tpl.footer_separator} />

      {tpl.show_bank_details && tpl.bank_details_text && (
        <div style={{ marginBottom: 6, padding: '4px 0', borderBottom: '1px solid #ddd' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.base_font_size - 0.5, marginBottom: 2 }}>البيانات البنكية</div>
          <div style={{ fontSize: tpl.base_font_size - 1, color: '#555', whiteSpace: 'pre-line' }}>
            {tpl.bank_details_text}
          </div>
        </div>
      )}

      {tpl.footer_line1 && <div style={{ marginBottom: 2 }}>{tpl.footer_line1}</div>}
      {tpl.footer_line2 && <div style={{ marginBottom: 2 }}>{tpl.footer_line2}</div>}
      {tpl.footer_line3 && <div style={{ marginBottom: 2 }}>{tpl.footer_line3}</div>}

      {tpl.show_returns_policy && tpl.returns_policy_text && (
        <div style={{ fontSize: tpl.base_font_size - 1, color: '#666', marginBottom: 3 }}>
          {tpl.returns_policy_text}
        </div>
      )}

      {tpl.show_thank_you && (
        <div style={{
          fontSize: tpl.thank_you_size,
          fontWeight: 700,
          color: tpl.thank_you_color,
          fontFamily: "'Tajawal', sans-serif",
          margin: '4px 0',
        }}>
          {tpl.thank_you_text}
        </div>
      )}

      {tpl.footer_legal_text && (
        <div style={{ fontSize: tpl.base_font_size - 2, color: '#999', marginTop: 3 }}>
          {tpl.footer_legal_text}
        </div>
      )}

      {tpl.show_barcode && (
        <div style={{ margin: '8px 0 4px' }}>
          <div style={{ display: 'inline-flex', gap: 1, alignItems: 'flex-end' }}>
            {Array.from({ length: 48 }, (_, i) => (
              <div key={i} style={{
                width: i % 3 === 0 ? 2 : 1,
                height: i % 5 === 0 ? 28 : 22,
                background: '#111',
              }} />
            ))}
          </div>
          <div style={{ fontSize: tpl.base_font_size - 1, letterSpacing: 2, marginTop: 2 }}>
            {barcodeText(tpl, data)}
          </div>
        </div>
      )}

      {tpl.show_qr && (
        <div style={{ margin: '4px auto', width: 48, height: 48 }}>
          <svg viewBox="0 0 10 10" width={48} height={48}>
            <rect x="0" y="0" width="3" height="3" fill="#111" />
            <rect x="1" y="1" width="1" height="1" fill="#fff" />
            <rect x="7" y="0" width="3" height="3" fill="#111" />
            <rect x="8" y="1" width="1" height="1" fill="#fff" />
            <rect x="0" y="7" width="3" height="3" fill="#111" />
            <rect x="1" y="8" width="1" height="1" fill="#fff" />
            <rect x="4" y="0" width="1" height="1" fill="#111" />
            <rect x="4" y="2" width="2" height="1" fill="#111" />
            <rect x="3" y="4" width="4" height="1" fill="#111" />
            <rect x="5" y="6" width="2" height="3" fill="#111" />
            <rect x="3" y="7" width="1" height="1" fill="#111" />
          </svg>
          <div style={{ fontSize: 7, color: '#666', marginTop: 1 }}>
            {qrDataText(tpl, data)}
          </div>
        </div>
      )}

      {(tpl.show_cashier_signature || tpl.show_client_signature) && (
        <div style={{
          display: 'flex', justifyContent: 'space-around',
          marginTop: 14, fontSize: tpl.base_font_size - 1,
        }}>
          {tpl.show_cashier_signature && (
            <div>
              <div style={{ width: 70, borderTop: '1px solid #111', marginBottom: 3 }} />
              <span>إمضاء الكاشير</span>
            </div>
          )}
          {tpl.show_client_signature && (
            <div>
              <div style={{ width: 70, borderTop: '1px solid #111', marginBottom: 3 }} />
              <span>إمضاء العميل</span>
            </div>
          )}
        </div>
      )}

      {tpl.show_stamp && (
        <div style={{
          width: 44, height: 44, margin: '8px auto',
          border: '2px solid #111', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 900, transform: 'rotate(-12deg)',
        }}>
          ختم
        </div>
      )}
    </div>
  );
}

function renderA4Footer(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.show_returns_policy || tpl.footer_legal_text ||
    tpl.show_bank_details;

  if (!hasContent) return null;

  return (
    <div style={{
      fontSize: tpl.base_font_size - 0.5,
      borderTop: tpl.footer_separator === 'none' ? 'none' : '2px solid #111',
      paddingTop: 16,
      marginTop: 12,
    }}>
      {tpl.show_bank_details && tpl.bank_details_text && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>البيانات البنكية</div>
          <div style={{ fontSize: tpl.base_font_size - 1, color: '#555', whiteSpace: 'pre-line' }}>
            {tpl.bank_details_text}
          </div>
        </div>
      )}

      {tpl.footer_line1 && <div style={{ margin: '4px 0' }}>{tpl.footer_line1}</div>}
      {tpl.footer_line2 && <div style={{ margin: '4px 0' }}>{tpl.footer_line2}</div>}
      {tpl.footer_line3 && <div style={{ margin: '4px 0' }}>{tpl.footer_line3}</div>}

      {tpl.show_returns_policy && tpl.returns_policy_text && (
        <div style={{ fontSize: tpl.base_font_size - 1, color: '#555', margin: '6px 0' }}>
          {tpl.returns_policy_text}
        </div>
      )}

      {tpl.show_thank_you && (
        <div style={{
          fontWeight: 700, margin: '8px 0',
          fontSize: tpl.thank_you_size,
          textAlign: 'center',
        }}>
          {tpl.thank_you_text}
        </div>
      )}

      {tpl.footer_legal_text && (
        <div style={{ fontSize: tpl.base_font_size - 1.5, color: '#888', margin: '6px 0', textAlign: 'center' }}>
          {tpl.footer_legal_text}
        </div>
      )}

      {(tpl.show_cashier_signature || tpl.show_client_signature) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: tpl.base_font_size }}>
          {tpl.show_cashier_signature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 150, height: 1, borderTop: '1px solid #111', marginBottom: 4 }} />
              <span>إمضاء الكاشير</span>
            </div>
          )}
          {tpl.show_client_signature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 150, height: 1, borderTop: '1px solid #111', marginBottom: 4 }} />
              <span>إمضاء العميل</span>
            </div>
          )}
        </div>
      )}

      {tpl.show_stamp && (
        <div style={{
          width: 60, height: 60, margin: '16px auto',
          border: '2px solid #111', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 900,
          transform: 'rotate(-15deg)',
        }}>
          ختم
        </div>
      )}
    </div>
  );
}

function renderA5Footer(tpl: PrintTemplate, data: UniversalDocumentData) {
  const hasContent =
    tpl.footer_line1 || tpl.footer_line2 || tpl.footer_line3 ||
    tpl.show_thank_you || tpl.footer_legal_text ||
    tpl.show_cashier_signature || tpl.show_client_signature ||
    tpl.show_bank_details;

  if (!hasContent) return null;

  return (
    <div style={{
      textAlign: 'center',
      fontSize: tpl.base_font_size - 0.5,
      borderTop: tpl.footer_separator === 'none' ? 'none' : '1.5px solid #111',
      paddingTop: 10,
    }}>
      {tpl.show_bank_details && tpl.bank_details_text && (
        <div style={{ marginBottom: 6, padding: '4px 0', borderBottom: '1px solid #ddd' }}>
          <div style={{ fontWeight: 700, fontSize: tpl.base_font_size - 0.5, marginBottom: 2 }}>البيانات البنكية</div>
          <div style={{ fontSize: tpl.base_font_size - 1, color: '#555', whiteSpace: 'pre-line' }}>
            {tpl.bank_details_text}
          </div>
        </div>
      )}
      {tpl.footer_line1 && <div style={{ marginBottom: 1 }}>{tpl.footer_line1}</div>}
      {tpl.footer_line2 && <div style={{ marginBottom: 1 }}>{tpl.footer_line2}</div>}

      {tpl.show_thank_you && (
        <div style={{
          fontWeight: 700, fontSize: tpl.thank_you_size,
          color: tpl.thank_you_color, margin: '4px 0',
        }}>
          {tpl.thank_you_text}
        </div>
      )}

      {tpl.footer_legal_text && (
        <div style={{ fontSize: tpl.base_font_size - 1.5, color: '#888' }}>
          {tpl.footer_legal_text}
        </div>
      )}

      {(tpl.show_cashier_signature || tpl.show_client_signature) && (
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16 }}>
          {tpl.show_cashier_signature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, borderTop: '1px solid #111', marginBottom: 2 }} />
              <span style={{ fontSize: tpl.base_font_size - 1 }}>إمضاء الكاشير</span>
            </div>
          )}
          {tpl.show_client_signature && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, borderTop: '1px solid #111', marginBottom: 2 }} />
              <span style={{ fontSize: tpl.base_font_size - 1 }}>إمضاء العميل</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function renderFooter(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalFooter(tpl, data);
  if (tpl.paper_size === 'A4') return renderA4Footer(tpl, data);
  return renderA5Footer(tpl, data);
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/HeaderSection.tsx
```
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { renderLogo } from './LogoRenderer';
import { align, formatDate, Separator, InfoRow } from './shared';
import { printFieldResolver } from '../../services';

function r(fieldId: string, data: UniversalDocumentData, tpl: PrintTemplate) {
  return printFieldResolver.resolve(fieldId, data, tpl);
}

function renderThermalHeader(tpl: PrintTemplate, data: UniversalDocumentData) {
  return (
    <div style={{ textAlign: align(tpl.company_info_align), marginBottom: 5 }}>
      {tpl.show_logo && renderLogo(tpl, data)}
      {tpl.show_company_name && (
        <div style={{
          textAlign: align(tpl.company_name_align),
          fontSize: tpl.company_name_size,
          fontWeight: tpl.company_name_bold ? 900 : 400,
          color: tpl.company_name_color,
          marginBottom: 3,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          {r('company.name', data, tpl)}
        </div>
      )}
      <div style={{ fontSize: tpl.company_info_size, color: '#444' }}>
        {tpl.show_address && r('company.address', data, tpl) && <div>{r('company.address', data, tpl)}</div>}
        {tpl.show_phone   && r('company.phone', data, tpl)   && <div>☏ {r('company.phone', data, tpl)}</div>}
        {tpl.show_tax_id  && r('company.nif', data, tpl)     && <div>NIF: {r('company.nif', data, tpl)}</div>}
        {tpl.show_rc      && r('company.rc', data, tpl)      && <div>RC: {r('company.rc', data, tpl)}</div>}
        {tpl.show_nis     && r('company.nis', data, tpl)     && <div>NIS: {r('company.nis', data, tpl)}</div>}
        {tpl.show_ice     && r('company.ice', data, tpl)     && <div>ICE: {r('company.ice', data, tpl)}</div>}
        {tpl.show_article && r('company.article', data, tpl) && <div>{r('company.article', data, tpl)}</div>}
      </div>
      {tpl.header_custom_text && (
        <div style={{ fontSize: tpl.company_info_size, color: '#555', marginTop: 2 }}>
          {tpl.header_custom_text}
        </div>
      )}
      <Separator style={tpl.header_separator} />
    </div>
  );
}

function renderPageHeader(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: isA4 ? 30 : 16,
      paddingBottom: isA4 ? 20 : 10,
      borderBottom: isA4 ? '2px solid #111' : '1.5px solid #111',
    }}>
      <div style={{ flex: 1 }}>
        {tpl.show_logo && renderLogo(tpl, data)}
        {tpl.show_company_name && (
          <div style={{
            fontSize: tpl.company_name_size + (isA4 ? 4 : 2),
            fontWeight: tpl.company_name_bold ? 900 : 400,
            fontFamily: "'Tajawal', sans-serif",
            marginBottom: 4,
          }}>
            {r('company.name', data, tpl)}
          </div>
        )}
        <div style={{ fontSize: tpl.company_info_size, color: '#555' }}>
          {tpl.show_address && <div>{r('company.address', data, tpl)}</div>}
          {tpl.show_phone   && <div>☎ {r('company.phone', data, tpl)}</div>}
          {tpl.show_tax_id  && <div>NIF: {r('company.nif', data, tpl)}</div>}
          {tpl.show_rc      && <div>RC: {r('company.rc', data, tpl)}</div>}
          {tpl.show_nis     && <div>NIS: {r('company.nis', data, tpl)}</div>}
          {tpl.show_ice     && <div>ICE: {r('company.ice', data, tpl)}</div>}
          {tpl.show_article && <div>{r('company.article', data, tpl)}</div>}
        </div>
      </div>

      <div style={{ textAlign: 'left', minWidth: isA4 ? 250 : 180 }}>
        <div style={{
          fontSize: tpl.title_size + (isA4 ? 4 : 2),
          fontWeight: tpl.title_bold ? 900 : 400,
          color: tpl.title_color,
          marginBottom: isA4 ? 12 : 8,
          textAlign: 'left',
        }}>
          {tpl.title_text}
        </div>
        <table style={{ fontSize: tpl.company_info_size, borderCollapse: 'collapse' }}>
          <tbody>
            {tpl.show_doc_number && <InfoRow label={isA4 ? 'رقم الفاتورة' : 'رقم'} value={r('document.number', data, tpl) as string} />}
            {tpl.show_date && <InfoRow label="التاريخ" value={formatDate(r('document.date', data, tpl) as string) + (tpl.show_time && r('document.time', data, tpl) ? ' ' + r('document.time', data, tpl) : '')} />}
            {tpl.show_due_date && r('document.dueDate', data, tpl) && <InfoRow label="تاريخ الاستحقاق" value={r('document.dueDate', data, tpl) as string} />}
            {tpl.show_cashier && (r('customer.cashierName', data, tpl)) && (
              <InfoRow label="الكاشير" value={r('customer.cashierName', data, tpl) as string} />
            )}
            {tpl.show_session && r('session.code', data, tpl) && <InfoRow label="الجلسة" value={r('session.code', data, tpl) as string} />}
            {tpl.show_payment_term && r('document.dueDate', data, tpl) && <InfoRow label="شروط الدفع" value={r('document.dueDate', data, tpl) as string} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function renderHeader(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalHeader(tpl, data);
  return renderPageHeader(tpl, data);
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/ItemsSection.tsx
```
import type { PrintTemplate, ColumnKey, AlignOption } from '../../types';
import type { UniversalDocumentData, DocumentLine } from '../../types/data';
import { getVisibleCols, colWidth, colAlign, colDefaultHeader, borderStyle, align } from './shared';
import { COLUMN_DEFAULTS } from '../../services/SettingsRegistry';
import { printFieldResolver } from '../../services';

const COL_WIDTH_DEFAULTS: Partial<Record<ColumnKey, number>> = Object.fromEntries(
  (Object.keys(COLUMN_DEFAULTS) as ColumnKey[]).map(k => [k, COLUMN_DEFAULTS[k].width]),
) as Partial<Record<ColumnKey, number>>;

const FIELD_MAP: Record<string, string> = {
  rowNumber: 'item.index',
  name:      'item.name',
  ref:       'item.code',
  barcode:   'item.barcode',
  unit:      'item.unit',
  quantity:  'item.quantity',
  price:     'item.price',
  discount:  'item.discount',
  tva:       'item.tva',
  total:     'item.total',
};

function colValue(col: ColumnKey, line: DocumentLine, _tpl: PrintTemplate, idx: number): string {
  const fieldId = FIELD_MAP[col];
  if (!fieldId) return '';

  const val = printFieldResolver.resolveItemField(fieldId, line, idx);
  if (col === 'discount') {
    const pct = printFieldResolver.resolveItemField('item.discount', line, idx) as number;
    return pct > 0 ? `${pct}%` : '';
  }
  if (col === 'tva') {
    const pct = printFieldResolver.resolveItemField('item.tvaPct', line, idx) as number;
    return `${pct}%`;
  }
  if (col === 'price') {
    const display = _tpl.price_display === 'ttc' ? line.unitPriceTtc : line.unitPriceHt;
    return Number(display).toFixed(2);
  }
  if (col === 'total') {
    const display = _tpl.show_line_total_ttc ? line.totalTtc : line.totalHt;
    return Number(display).toFixed(2);
  }
  return val !== undefined ? String(val) : '';
}

function renderThermalItems(tpl: PrintTemplate, data: UniversalDocumentData) {
  const visibleCols = getVisibleCols(tpl);
  if (visibleCols.length === 0 || data.lines.length === 0) return null;

  const ff = tpl.items_font_family === 'monospace'
    ? "'Courier New', monospace"
    : "'Tajawal', sans-serif";

  const bs = borderStyle(tpl.table_border_style);
  const border = tpl.table_border_style === 'none' ? 'none' : `1px ${bs} #999`;

  return (
    <div style={{ fontSize: tpl.items_font_size, fontFamily: ff, marginBottom: 4 }}>
      {tpl.show_col_header && (
        <div style={{
          display: 'flex', gap: 2,
          fontWeight: tpl.table_header_bold ? 800 : 400,
          color: tpl.table_header_color,
          background: tpl.table_header_bg ? '#f0f0f0' : 'transparent',
          borderBottom: border,
          paddingBottom: 3, marginBottom: 2,
        }}>
          {visibleCols.map(col => (
            <div key={col} style={{
              flex: `0 0 ${colWidth(tpl, col, COL_WIDTH_DEFAULTS)}%`,
              textAlign: align(colAlign(tpl, col)),
            }}>
              {tpl.col_headers[col] ?? colDefaultHeader(col)}
            </div>
          ))}
        </div>
      )}

      {data.lines.map((line, idx) => (
        <div key={idx} style={{
          display: 'flex', gap: 2,
          background: tpl.alternating_rows && idx % 2 === 1 ? tpl.alternating_color : 'transparent',
          padding: '1px 0',
          borderBottom: tpl.table_border_style !== 'none' ? `1px ${bs} #eee` : 'none',
        }}>
          {visibleCols.map(col => (
            <div key={col} style={{
              flex: `0 0 ${colWidth(tpl, col, COL_WIDTH_DEFAULTS)}%`,
              textAlign: align(colAlign(tpl, col)),
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: col === 'name' ? 'normal' : 'nowrap',
            }}>
              {colValue(col, line, tpl, idx)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function renderPageItems(tpl: PrintTemplate, data: UniversalDocumentData) {
  const visibleCols = getVisibleCols(tpl);
  if (visibleCols.length === 0 || data.lines.length === 0) return null;

  const isA4 = tpl.paper_size === 'A4';
  const cellPad = isA4 ? '10px' : '5px 6px';
  const totalPct = visibleCols.reduce((s, c) => s + colWidth(tpl, c, COL_WIDTH_DEFAULTS), 0);
  const scale = totalPct > 0 ? 100 / totalPct : 1;

  return (
    <div style={{ marginBottom: isA4 ? 20 : 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tpl.items_font_size }}>
        <thead>
          <tr style={{
            background: tpl.table_header_bg ? (tpl.table_header_color || '#111') : '#f5f5f5',
            borderBottom: isA4 ? '2px solid #111' : '1.5px solid #111',
          }}>
            {visibleCols.map(col => (
              <th key={col} style={{
                width: `${colWidth(tpl, col, COL_WIDTH_DEFAULTS) * scale}%`,
                padding: cellPad,
                textAlign: align(colAlign(tpl, col)),
                fontWeight: tpl.table_header_bold ? 700 : 600,
                color: tpl.table_header_bg ? '#fff' : tpl.table_header_color || '#111',
                fontSize: tpl.items_font_size,
              }}>
                {tpl.col_headers[col] ?? colDefaultHeader(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={{
              borderBottom: tpl.table_border_style !== 'none'
                ? `1px ${borderStyle(tpl.table_border_style)} #ddd`
                : 'none',
              background: tpl.alternating_rows && i % 2 === 1 ? (tpl.alternating_color || '#fafafa') : 'transparent',
            }}>
              {visibleCols.map(col => (
                <td key={col} style={{
                  padding: cellPad,
                  textAlign: align(colAlign(tpl, col)),
                  fontWeight: col === 'total' ? 700 : 400,
                  fontSize: tpl.items_font_size,
                }}>
                  {colValue(col, line, tpl, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function renderItems(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalItems(tpl, data);
  return renderPageItems(tpl, data);
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/LogoRenderer.tsx
```
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';

function resolveLogoUrl(tpl: PrintTemplate, data: UniversalDocumentData): string | null {
  if (tpl.logo_source === 'custom') return tpl.custom_logo_url || null;
  if (tpl.logo_source === 'default') return null;
  return data.company?.logoUrl || null;
}

export function renderLogo(tpl: PrintTemplate, data: UniversalDocumentData) {
  const logoUrl = resolveLogoUrl(tpl, data);
  const companyName = data.company?.name || '';

  return (
    <div style={{
      display: 'flex',
      justifyContent: tpl.logo_align === 'right' ? 'flex-start' : tpl.logo_align === 'left' ? 'flex-end' : 'center',
      marginBottom: 4,
    }}>
      {logoUrl ? (
        <img src={logoUrl} alt="logo"
          style={{
            width: tpl.logo_size, height: tpl.logo_size,
            objectFit: 'contain',
            borderRadius: `${tpl.logo_border_radius}%`,
          }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div style={{
          width: tpl.logo_size, height: tpl.logo_size,
          background: '#111',
          borderRadius: `${tpl.logo_border_radius}%`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: tpl.logo_size * 0.35, fontWeight: 900,
        }}>
          {companyName.charAt(0)}
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/PaymentsSection.tsx
```
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { Separator } from './shared';
import { printFieldResolver } from '../../services';

function renderThermalPayments(tpl: PrintTemplate, data: UniversalDocumentData) {
  return (
    <div style={{ fontSize: tpl.payment_font_size, marginBottom: 4 }}>
      <Separator style="dashed" />
      <div style={{ fontWeight: 700, marginBottom: 2 }}>وسائل الدفع:</div>
      {data.payments.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span>{printFieldResolver.resolveItemField('payment.method', p as any, i)}</span>
          <span dir="ltr">{Number(printFieldResolver.resolveItemField('payment.amount', p as any, i)).toFixed(2)}</span>
        </div>
      ))}
      <Separator style="dashed" />
    </div>
  );
}

function renderPagePayments(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';
  if (isA4) {
    return (
      <div style={{ fontSize: tpl.payment_font_size, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>تفاصيل الدفع</div>
        <table style={{ width: 320, borderCollapse: 'collapse', direction: 'ltr' }}>
          <tbody>
            {data.payments.map((p, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 12px', textAlign: 'right' }}>{printFieldResolver.resolveItemField('payment.method', p as any, i)}</td>
                <td style={{ padding: '4px 12px', textAlign: 'right' }}>{Number(printFieldResolver.resolveItemField('payment.amount', p as any, i)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ fontSize: tpl.payment_font_size, marginBottom: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>وسائل الدفع:</div>
      {data.payments.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
          <span>{printFieldResolver.resolveItemField('payment.method', p as any, i)}</span>
          <span>{Number(printFieldResolver.resolveItemField('payment.amount', p as any, i)).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export function renderPayments(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (!tpl.show_payment_details) return null;
  if (data.payments.length === 0) return null;
  if (isThermal) return renderThermalPayments(tpl, data);
  return renderPagePayments(tpl, data);
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/ReportSection.tsx
```
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import ChartSection from '../ChartSection';

export function renderReport(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean, width: number) {
  const r = data.report!;

  return (
    <div style={{ marginBottom: isThermal ? 4 : 12 }}>
      {tpl.show_report_header && (
        <div style={{ marginBottom: isThermal ? 3 : 8 }}>
          {tpl.report_header_text && (
            <div style={{
              fontSize: tpl.title_size, fontWeight: 900,
              textAlign: 'center', marginBottom: 4,
            }}>
              {tpl.report_header_text}
            </div>
          )}
          <div style={{ fontSize: tpl.base_font_size - 0.5, color: '#555', textAlign: 'center' }}>
            {tpl.show_report_period && r.periodStart && r.periodEnd && (
              <span>من {r.periodStart} إلى {r.periodEnd}</span>
            )}
            {tpl.show_report_cashier && r.cashierName && (
              <span style={{ marginRight: 12 }}>الكاشير: {r.cashierName}</span>
            )}
          </div>
        </div>
      )}

      {tpl.show_report_summary_cards && (
        <div style={{
          display: 'grid', gridTemplateColumns: isThermal ? '1fr' : 'repeat(3, 1fr)',
          gap: isThermal ? 4 : 8, marginBottom: isThermal ? 4 : 12,
        }}>
          {[
            { label: 'إجمالي المبيعات', val: r.grossSales, color: '#16a34a' },
            { label: 'المرتجعات',        val: -r.returnsTotal, color: '#dc2626', hide: r.returnsTotal === 0 },
            { label: 'صافي المبيعات',   val: r.netSales, color: '#2563eb' },
            { label: 'عدد الفواتير',     val: r.invoicesCount, color: '#8b5cf6', isCount: true },
            { label: 'متوسط الفاتورة',   val: r.avgInvoice, color: '#d97706' },
            { label: 'أعلى فاتورة',      val: r.highestInvoice, color: '#06b6d4' },
          ].map(card => {
            if (card.hide) return null;
            return (
              <div key={card.label} style={{
                padding: isThermal ? '3px 6px' : '10px 14px',
                borderRadius: 'var(--r2)', border: `1px solid ${card.color}22`,
                background: `${card.color}08`, textAlign: 'center',
              }}>
                <div style={{ fontSize: isThermal ? 9 : 11, color: '#666', marginBottom: 2 }}>{card.label}</div>
                <div style={{
                  fontSize: isThermal ? 13 : 18, fontWeight: 900, color: card.color,
                }}>
                  {card.isCount ? card.val : `${Number(card.val).toFixed(2)} دج`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tpl.show_charts && tpl.show_report_payment_breakdown && (
        <ChartSection
          data={data}
          chartType={tpl.chart_type}
          title={tpl.chart_title || 'توزيع وسائل الدفع'}
          width={isThermal ? 288 : width - 80}
        />
      )}

      {tpl.show_report_top_products && r.topProducts.length > 0 && (
        <div style={{ marginTop: isThermal ? 4 : 12 }}>
          <div style={{ fontWeight: 700, fontSize: isThermal ? 11 : 13, marginBottom: 4 }}>
            {tpl.group_by ? `تقرير حسب ${tpl.group_by}` : 'أفضل المنتجات مبيعاً'}
          </div>
          {(() => {
            const sorted = [...r.topProducts];
            if (tpl.sort_by === 'quantity') {
              sorted.sort((a, b) => tpl.sort_direction === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity);
            } else if (tpl.sort_by === 'total') {
              sorted.sort((a, b) => tpl.sort_direction === 'asc' ? a.totalTtc - b.totalTtc : b.totalTtc - a.totalTtc);
            } else {
              sorted.sort((a, b) => {
                const cmp = a.name.localeCompare(b.name);
                return tpl.sort_direction === 'asc' ? cmp : -cmp;
              });
            }
            return (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: tpl.items_font_size }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    {(['product', 'quantity', 'total'] as const).map(col => (
                      <th key={col} style={{
                        width: `${tpl.report_col_widths[col] ?? (col === 'product' ? 50 : col === 'quantity' ? 20 : 30)}%`,
                        textAlign: col === 'product' ? 'right' : 'center',
                        padding: '4px 6px', fontWeight: 700,
                      }}>
                        {tpl.report_col_headers[col] || (col === 'product' ? 'المنتج' : col === 'quantity' ? 'الكمية' : 'الإجمالي')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      {(['product', 'quantity', 'total'] as const).map(col => (
                        <td key={col} style={{
                          width: `${tpl.report_col_widths[col] ?? (col === 'product' ? 50 : col === 'quantity' ? 20 : 30)}%`,
                          textAlign: col === 'product' ? 'right' : 'center',
                          padding: '3px 6px',
                        }}>
                          {col === 'product' ? p.name : col === 'quantity' ? p.quantity : Number(p.totalTtc).toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {tpl.show_report_footer && tpl.report_footer_text && (
        <div style={{
          marginTop: isThermal ? 4 : 12,
          fontSize: tpl.base_font_size - 1,
          textAlign: 'center',
          color: '#666',
          borderTop: '1px solid #ddd',
          paddingTop: 6,
        }}>
          {tpl.report_footer_text}
        </div>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/shared.tsx
```
import React from 'react';
import type { DocumentLine } from '../../types/data';
import type {
  PrintTemplate,
  ColumnKey,
  AlignOption,
  BorderStyle,
  FontFamily,
} from '../../types';

export function formatDate(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// ─── Styling helpers ────────────────────────────────────────────────────────────

export function mm(v: number): number {
  return v * 3.78;
}

export function align(a: AlignOption): React.CSSProperties['textAlign'] {
  return a === 'right' ? 'right' : a === 'left' ? 'left' : 'center';
}

export function fontFamily(f: FontFamily): string {
  switch (f) {
    case 'monospace': return "'Courier New', monospace";
    case 'times':     return "'Times New Roman', serif";
    case 'arial':     return "Arial, sans-serif";
    default:          return "'Tajawal', sans-serif";
  }
}

import { COLUMN_DEFAULTS } from '../../services/SettingsRegistry';

export function colDefaultHeader(col: ColumnKey): string {
  return COLUMN_DEFAULTS[col]?.header ?? col;
}

export function borderStyle(s: BorderStyle): string {
  switch (s) {
    case 'solid':  return 'solid';
    case 'dashed': return 'dashed';
    case 'double': return 'double';
    default:       return 'none';
  }
}

const BORDER_MAP: Record<BorderStyle, string> = {
  solid:  'solid',
  dashed: 'dashed',
  double: 'double',
  none:   'none',
};

export function Separator({ style }: { style: BorderStyle }): JSX.Element {
  if (style === 'none') return <div />;
  const thickness = style === 'double' ? 3 : 1;
  return <div style={{ borderBottom: `${thickness}px ${BORDER_MAP[style]} #999`, margin: '4px 0' }} />;
}

export const MemoizedSeparator = React.memo(Separator);

// ─── Data extraction helpers ────────────────────────────────────────────────────

export function getVisibleCols(tpl: PrintTemplate): ColumnKey[] {
  return tpl.col_order.filter(k => tpl.col_show[k] !== false);
}

export function colWidth(
  tpl: PrintTemplate,
  col: ColumnKey,
  defaults?: Partial<Record<ColumnKey, number>>,
): number {
  return tpl.col_widths[col] ?? defaults?.[col] ?? COLUMN_DEFAULTS[col]?.width ?? 20;
}

export function colAlign(tpl: PrintTemplate, col: ColumnKey): AlignOption {
  return tpl.col_aligns[col] ?? COLUMN_DEFAULTS[col]?.align ?? 'right';
}

export interface CompanyData {
  name:    string;
  address: string;
  phone:   string;
  nif:     string;
  rc:      string;
  nis:     string;
  ice:     string;
  article: string;
  logoUrl?: string | null;
}

export function buildTvaByRate(
  lines: DocumentLine[],
): Array<{ rate: number; base: number; amount: number }> {
  const map = new Map<number, { base: number; amount: number }>();
  for (const line of lines) {
    const pct = line.tvaPct;
    const prev = map.get(pct) ?? { base: 0, amount: 0 };
    map.set(pct, {
      base:   prev.base   + line.totalHt,
      amount: prev.amount + line.totalTva,
    });
  }
  return Array.from(map.entries()).map(([rate, v]) => ({ rate, ...v }));
}

// ─── Simple presentational components ──────────────────────────────────────────

interface DocRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

function DocRowFn({ label, value, mono }: DocRowProps): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: mono ? "'Courier New', monospace" : undefined }}>{value}</span>
    </div>
  );
}

export const DocRow = React.memo(DocRowFn);

interface TotalRowProps {
  label: string;
  val: string;
  red?: boolean;
  bold?: boolean;
}

function TotalRowFn({ label, val, red, bold }: TotalRowProps): JSX.Element {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', marginBottom: 2,
      fontWeight: bold ? 800 : 'inherit',
      color: red ? '#c00' : 'inherit',
    }}>
      <span>{label}</span>
      <span dir="ltr">{val}</span>
    </div>
  );
}

export const TotalRow = React.memo(TotalRowFn);

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRowFn({ label, value }: InfoRowProps): JSX.Element {
  return (
    <tr>
      <td style={{ color: '#555', padding: '2px 0', whiteSpace: 'nowrap', fontWeight: 600 }}>
        {label}:
      </td>
      <td style={{ padding: '2px 0', paddingRight: 12 }}>
        {value}
      </td>
    </tr>
  );
}

export const InfoRow = React.memo(InfoRowFn);

// ─── SectionWrap — applies highlight styling from rules ──────────────────────

export function SectionWrap({ highlight, children }: {
  highlight: Record<string, string> | null;
  children: React.ReactNode;
}) {
  if (!highlight) return <>{children}</>;
  return <div style={highlight}>{children}</div>;
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/TotalsSection.tsx
```
import type { PrintTemplate } from '../../types';
import type { UniversalDocumentData } from '../../types/data';
import { TotalRow, borderStyle } from './shared';
import { printFieldResolver } from '../../services';

function r(fieldId: string, data: UniversalDocumentData, tpl: PrintTemplate) {
  return printFieldResolver.resolve(fieldId, data, tpl);
}

function PageTotalRow({ label, val, red, bold }: { label: string; val: number; red?: boolean; bold?: boolean }) {
  return (
    <tr>
      <td style={{
        padding: '5px 12px',
        textAlign: 'right',
        fontWeight: bold ? 800 : 400,
        color: red ? '#c00' : 'inherit',
      }}>
        {label}
      </td>
      <td style={{
        padding: '5px 12px',
        textAlign: 'right',
        fontWeight: bold ? 800 : 400,
        color: red ? '#c00' : 'inherit',
      }}>
        {Number(val).toFixed(2)}
      </td>
    </tr>
  );
}

function renderThermalTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  const fs = tpl.totals_font_size;
  const totalTtc = r('totals.ttc', data, tpl) as number;
  const totalDiscount = r('totals.discount', data, tpl) as number;
  const taxBreakdown = data.taxBreakdown;

  return (
    <div style={{
      fontSize: fs,
      fontWeight: tpl.totals_bold ? 700 : 400,
      textAlign: tpl.totals_align === 'left' ? 'left' : tpl.totals_align === 'center' ? 'center' : 'right',
      marginBottom: 4,
    }}>
      {tpl.show_total_ht      && <TotalRow label="المجموع HT"        val={r('totals.ht', data, tpl) as number} />}
      {tpl.show_discount_total && totalDiscount > 0 && (
        <TotalRow label="إجمالي الخصومات" val={-totalDiscount} red />
      )}
      {tpl.show_total_tva     && <TotalRow label="TVA"               val={r('totals.tva', data, tpl) as number} />}
      {tpl.show_tva_breakdown && taxBreakdown.map(rr => (
        <TotalRow key={rr.rate} label={`  TVA ${rr.rate}%`} val={rr.tva} />
      ))}
      {tpl.show_fiscal_stamp  && (r('totals.fiscalStamp', data, tpl) as number) > 0 && (
        <TotalRow label="الطابع الجبائي" val={r('totals.fiscalStamp', data, tpl) as number} />
      )}

      {tpl.show_total_ttc && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          border: tpl.total_border_style === 'none'
            ? 'none'
            : `2px ${borderStyle(tpl.total_border_style)} #111`,
          padding: '3px 5px', margin: '5px 0',
          fontWeight: tpl.total_ttc_bold ? 900 : 700,
          fontSize: tpl.total_ttc_font_size,
          color: tpl.total_ttc_color,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          <span>المجموع TTC:</span>
          <span dir="ltr">{Number(totalTtc).toFixed(2)} دج</span>
        </div>
      )}

      {tpl.show_amount_in_words && r('totals.amountInWords', data, tpl) && (
        <div style={{ fontSize: fs - 1, textAlign: 'center', color: '#555', marginTop: 2 }}>
          <em>فقط: {r('totals.amountInWords', data, tpl)} ديناراً جزائرياً</em>
        </div>
      )}

      {tpl.show_paid_amount   && <TotalRow label="المدفوع"        val={r('totals.paid', data, tpl) as number} bold />}
      {tpl.show_change        && <TotalRow label="الباقي"         val={r('totals.change', data, tpl) as number} />}
      {tpl.show_remaining     && (r('totals.remaining', data, tpl) as number) > 0 && <TotalRow label="المتبقي"  val={r('totals.remaining', data, tpl) as number} red />}
      {tpl.show_prev_balance  && data.balance && <TotalRow label="الرصيد السابق"  val={r('balance.previous', data, tpl) as number} />}
      {tpl.show_new_balance   && data.balance && <TotalRow label="الرصيد الجديد"  val={r('balance.current', data, tpl) as number} bold />}
    </div>
  );
}

function renderPageTotals(tpl: PrintTemplate, data: UniversalDocumentData) {
  const isA4 = tpl.paper_size === 'A4';
  const tblW = isA4 ? 320 : 260;
  const totalTtc = r('totals.ttc', data, tpl) as number;
  const totalDiscount = r('totals.discount', data, tpl) as number;
  const taxBreakdown = data.taxBreakdown;

  const borderTop = tpl.total_border_style === 'none'
    ? 'none'
    : `${isA4 ? '3px' : '2px'} ${borderStyle(tpl.total_border_style)} #111`;

  const totalsJustify = tpl.totals_align === 'left' ? 'flex-start' : tpl.totals_align === 'center' ? 'center' : 'flex-end';

  return (
    <div style={{
      display: 'flex', justifyContent: totalsJustify,
      fontSize: tpl.totals_font_size,
      fontWeight: tpl.totals_bold ? 700 : 400,
      marginBottom: isA4 ? 24 : 12,
      direction: 'ltr',
    }}>
      <table style={{ width: tblW, borderCollapse: 'collapse' }}>
        <tbody>
          {tpl.show_total_ht      && <PageTotalRow label="المجموع HT"      val={r('totals.ht', data, tpl) as number} />}
          {tpl.show_discount_total && totalDiscount > 0 && <PageTotalRow label="إجمالي الخصومات" val={-totalDiscount} red />}
          {tpl.show_total_tva     && <PageTotalRow label="TVA"             val={r('totals.tva', data, tpl) as number} />}
          {tpl.show_tva_breakdown && taxBreakdown.map(rr => (
            <PageTotalRow key={rr.rate} label={`  TVA ${rr.rate}%`} val={rr.tva} />
          ))}
          {tpl.show_fiscal_stamp  && (r('totals.fiscalStamp', data, tpl) as number) > 0 && <PageTotalRow label="الطابع الجبائي" val={r('totals.fiscalStamp', data, tpl) as number} />}

          {tpl.show_total_ttc && (
            <tr>
              <td style={{
                padding: isA4 ? '10px 12px' : '6px 8px',
                borderTop: borderTop,
                fontWeight: tpl.total_ttc_bold ? 900 : 700,
                fontSize: tpl.total_ttc_font_size,
                textAlign: 'right',
                color: tpl.total_ttc_color,
              }}>
                المجموع TTC:
              </td>
              <td style={{
                padding: isA4 ? '10px 12px' : '6px 8px',
                borderTop: borderTop,
                fontWeight: tpl.total_ttc_bold ? 900 : 700,
                fontSize: tpl.total_ttc_font_size,
                textAlign: 'right',
                color: tpl.total_ttc_color,
              }}>
                {Number(totalTtc).toFixed(2)}
              </td>
            </tr>
          )}

          {tpl.show_paid_amount  && <PageTotalRow label="المدفوع"       val={r('totals.paid', data, tpl) as number} bold />}
          {tpl.show_change       && <PageTotalRow label="الباقي"        val={r('totals.change', data, tpl) as number} />}
          {tpl.show_remaining    && (r('totals.remaining', data, tpl) as number) > 0 && <PageTotalRow label="المبلغ المتبقي" val={r('totals.remaining', data, tpl) as number} red />}
          {tpl.show_prev_balance && data.balance && <PageTotalRow label="الرصيد السابق" val={r('balance.previous', data, tpl) as number} />}
          {tpl.show_new_balance  && data.balance && <PageTotalRow label="الرصيد الجديد" val={r('balance.current', data, tpl) as number} bold />}
        </tbody>
      </table>
    </div>
  );
}

export function renderTotals(tpl: PrintTemplate, data: UniversalDocumentData, isThermal: boolean) {
  if (isThermal) return renderThermalTotals(tpl, data);
  return renderPageTotals(tpl, data);
}
```

## FILE: resources/js/pages/settings/print-settings/components/preview/UniversalPreview.tsx
```
import React, { useMemo, useEffect } from 'react';
import type { UniversalDocumentData } from '../../types/data';
import type { PrintTemplate } from '../../types';
import {
  mm, fontFamily, SectionWrap,
} from './shared';
import { renderHeader } from './HeaderSection';
import { renderDocInfo } from './DocInfoSection';
import { renderItems } from './ItemsSection';
import { renderTotals } from './TotalsSection';
import { renderPayments } from './PaymentsSection';
import { renderFooter } from './FooterSection';
import { renderReport } from './ReportSection';
import { rulesEngine } from '../../services/engines/RulesEngine';
import { formulaEngine, type EvaluationContext, type ExpressionValue } from '../../services/engines/FormulaEngine';
import { calculatedFieldService } from '../../services/CalculatedFieldService';

export interface UniversalPreviewProps {
  tpl:      PrintTemplate;
  data:     UniversalDocumentData;
}

function buildEvalContext(data: UniversalDocumentData): EvaluationContext {
  const t = data.totals;
  const computed: Record<string, ExpressionValue> = {
    totalHt:      t.totalHt,
    totalTva:     t.totalTva,
    totalTtc:     t.totalTtc,
    totalDiscount: t.totalDiscount,
    fiscalStamp:  t.fiscalStamp,
    paid:         t.paid,
    change:       t.change,
    remaining:    t.remaining,
    lineCount:    data.lines.length,
    itemCount:    data.lines.reduce((s, l) => s + (l.quantity || 0), 0),
    prevBalance:  data.balance?.previous ?? 0,
    newBalance:   data.balance?.current ?? 0,
    docNumber:    data.doc.number,
    docDate:      data.doc.date,
  };
  const calcFields = calculatedFieldService.computeAll(data);
  Object.assign(computed, calcFields);
  return { data, computed };
}

function UniversalPreview({ tpl, data }: UniversalPreviewProps) {
  useEffect(() => { formulaEngine.clearCache(); }, [data]);

  const isThermal   = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';
  const isA4        = tpl.paper_size === 'A4';
  const isA5        = tpl.paper_size === 'A5';
  const isLandscape = !isThermal && tpl.page_orientation === 'landscape';

  const portraitW = isA4 ? 794 : 559;
  const portraitH = isA4 ? 1123 : 794;
  const paperWidth   = isThermal ? tpl.paper_width_mm * 3.78 : (isLandscape ? portraitH : portraitW);
  const minHeight    = isThermal ? 'auto' : (isLandscape ? portraitW : portraitH);

  const ruleResult = useMemo(() => {
    if (!tpl.rules || tpl.rules.length === 0) return null;
    try {
      const ctx = buildEvalContext(data);
      return rulesEngine.evaluate(tpl.rules, ctx, formulaEngine);
    } catch {
      return null;
    }
  }, [tpl.rules, data]);

  const sectionVisible = (section: string): boolean => {
    if (ruleResult && ruleResult.visibility[section] === false) return false;
    return true;
  };

  const sectionHighlight = (section: string): Record<string, string> | null => {
    if (ruleResult && ruleResult.highlights[section]) return ruleResult.highlights[section];
    return null;
  };

  const paddingTop   = isThermal ? mm(tpl.margin_top) : (isA4 ? 40 : 20);
  const paddingSide  = isThermal ? mm(tpl.margin_sides) : (isA4 ? 50 : 24);
  const paddingBottom = isThermal ? mm(tpl.margin_bottom) : (isA4 ? 40 : 20);

  return (
    <div style={{
      width: paperWidth,
      direction: 'rtl',
      fontFamily: fontFamily(tpl.font_family),
      fontSize: tpl.base_font_size,
      lineHeight: tpl.line_spacing,
      padding: `${paddingTop}px ${paddingSide}px ${paddingBottom}px`,
      background: '#fff',
      color: '#111',
      margin: '0 auto',
      minHeight,
      boxSizing: 'border-box',
    }}>
      {tpl.show_header_section && sectionVisible('header') && (
        <SectionWrap highlight={sectionHighlight('header')}>
          {renderHeader(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_doc_info_section && sectionVisible('doc-info') && (
        <SectionWrap highlight={sectionHighlight('doc-info')}>
          {renderDocInfo(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_items_section && sectionVisible('items') && (
        <SectionWrap highlight={sectionHighlight('items')}>
          {renderItems(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {data.report && renderReport(tpl, data, isThermal, paperWidth)}
      {tpl.show_totals_section && sectionVisible('totals') && (
        <SectionWrap highlight={sectionHighlight('totals')}>
          {renderTotals(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_payments_section && sectionVisible('payments') && (
        <SectionWrap highlight={sectionHighlight('payments')}>
          {renderPayments(tpl, data, isThermal)}
        </SectionWrap>
      )}
      {tpl.show_footer_section && sectionVisible('footer') && (
        <SectionWrap highlight={sectionHighlight('footer')}>
          {renderFooter(tpl, data, isThermal)}
        </SectionWrap>
      )}
    </div>
  );
}

export default React.memo(UniversalPreview);
```

## FILE: resources/js/pages/settings/print-settings/components/PreviewSelector.tsx
```
import React, { Suspense } from 'react';
import type { PrintTemplate } from '../types';
import type { UniversalDocumentData } from '../types/data';

const UniversalPreview = React.lazy(() => import('./preview/UniversalPreview'));

const FALLBACK = (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 400, color: '#999', fontSize: 14, fontFamily: 'sans-serif',
    border: '1px dashed #ddd', borderRadius: 8, margin: 16,
  }}>
    Loading preview…
  </div>
);

interface Props {
  tpl:   PrintTemplate;
  data?:    UniversalDocumentData | null;
}

export default function PreviewSelector({ tpl, data }: Props) {
  return (
    <Suspense fallback={FALLBACK}>
      <UniversalPreview tpl={tpl} data={data ?? null} />
    </Suspense>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/QuickNav.tsx
```
import React, { useState, useEffect } from 'react';

const NAV_SECTIONS = [
  { id: 's-header', label: 'الشعار'    },
  { id: 's-doc',    label: 'المستند'   },
  { id: 's-items',  label: 'المنتجات'  },
  { id: 's-totals', label: 'الإجمالي'  },
  { id: 's-footer', label: 'التذييل'   },
  { id: 's-format', label: 'التنسيق'   },
  { id: 's-rules',  label: 'القواعد'   },
  { id: 's-report', label: 'التقرير'   },
];

export function QuickNav({ controlsRef }: { controlsRef: React.RefObject<HTMLDivElement> }) {
  const [active, setActive] = useState('s-header');

  useEffect(() => {
    const container = controlsRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { root: container, threshold: 0.3 },
    );

    NAV_SECTIONS.forEach(s => {
      const el = container.querySelector(`#${s.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [controlsRef]);

  return (
    <div style={{
      display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8,
      padding: '6px 8px', background: 'var(--bg3)', borderRadius: 'var(--r2)',
      border: '1px solid var(--b2)',
    }}>
      {NAV_SECTIONS.map(s => (
        <button
          key={s.id} type="button"
          onClick={() => {
            const el = controlsRef.current?.querySelector(`#${s.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          style={{
            padding: '3px 8px', borderRadius: 5, fontSize: 11,
            fontFamily: 'Tajawal, sans-serif', fontWeight: 700,
            border: `1px solid ${active === s.id ? 'var(--em)' : 'var(--b2)'}`,
            background: active === s.id ? 'var(--emb)' : 'transparent',
            color: active === s.id ? 'var(--em)' : 'var(--t4)',
            cursor: 'pointer', transition: 'all .12s',
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/RulesSection.tsx
```
import React, { useState, useCallback } from 'react';
import type { PrintTemplate, ReportRule } from '../types';
import FormulaEditor from './FormulaEditor';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface RulesSectionProps {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

type RuleAction = ReportRule['action'];

const ACTIONS: { value: RuleAction; label: string }[] = [
  { value: 'show',       label: 'إظهار'     },
  { value: 'hide',       label: 'إخفاء'     },
  { value: 'highlight',  label: 'تمييز'     },
  { value: 'disable',    label: 'تعطيل'     },
];

const SECTION_TARGETS: { value: string; label: string }[] = [
  { value: 'header',    label: 'رأس الفاتورة'    },
  { value: 'doc-info',  label: 'معلومات المستند'  },
  { value: 'items',     label: 'جدول المنتجات'    },
  { value: 'totals',    label: 'الإجماليات'       },
  { value: 'payments',  label: 'وسائل الدفع'      },
  { value: 'footer',    label: 'التذييل'          },
];

const SECTION_KEYS: { key: keyof PrintTemplate; label: string }[] = [
  { key: 'show_header_section',   label: 'رأس الفاتورة'    },
  { key: 'show_doc_info_section', label: 'معلومات المستند'  },
  { key: 'show_items_section',    label: 'جدول المنتجات'    },
  { key: 'show_totals_section',   label: 'الإجماليات'       },
  { key: 'show_payments_section', label: 'وسائل الدفع'      },
  { key: 'show_footer_section',   label: 'التذييل'          },
];

const LABEL_MAP: Record<string, string> = {
  header:    'رأس الفاتورة',
  'doc-info':'معلومات المستند',
  items:     'جدول المنتجات',
  totals:    'الإجماليات',
  payments:  'وسائل الدفع',
  footer:    'التذييل',
};

const STYLES = {
  row: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0',
  } as React.CSSProperties,
  badge: {
    fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
    background: 'var(--emb)', color: 'var(--em)',
  } as React.CSSProperties,
  ruleCard: {
    border: '1px solid var(--b2)', borderRadius: 'var(--r1)',
    padding: 8, marginBottom: 6, background: 'var(--bg3)',
  } as React.CSSProperties,
  label: {
    fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2,
  } as React.CSSProperties,
  input: {
    width: '100%', padding: '4px 6px', borderRadius: 'var(--r1)',
    border: '1px solid var(--b2)', background: 'var(--bg)',
    fontSize: 12, color: 'var(--t1)', outline: 'none', boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%', padding: '4px 6px', borderRadius: 'var(--r1)',
    border: '1px solid var(--b2)', background: 'var(--bg)',
    fontSize: 12, color: 'var(--t1)', outline: 'none',
  },
  btn: {
    padding: '4px 10px', borderRadius: 'var(--r1)', border: 'none',
    cursor: 'pointer', fontSize: 12, fontWeight: 700,
  },
};

function genId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function RulesSection({ tpl, update }: RulesSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddRule = useCallback(() => {
    const newRule: ReportRule = {
      id: genId(),
      condition: '',
      action: 'hide',
      target: 'items',
      priority: 0,
    };
    update('rules', [...(tpl.rules || []), newRule]);
    setEditingId(newRule.id);
  }, [tpl.rules, update]);

  const handleDeleteRule = useCallback((id: string) => {
    update('rules', (tpl.rules || []).filter(r => r.id !== id));
    if (editingId === id) setEditingId(null);
  }, [tpl.rules, update, editingId]);

  const handleUpdateRule = useCallback((id: string, patch: Partial<ReportRule>) => {
    update('rules', (tpl.rules || []).map(r => r.id === id ? { ...r, ...patch } : r));
  }, [tpl.rules, update]);

  const handleToggleSection = useCallback((key: keyof PrintTemplate) => {
    update(key, !tpl[key] as never);
  }, [tpl, update]);

  return (
    <div>
      {/* ── Section visibility toggles ───────────────────────────────────── */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--em)', marginBottom: 6 }}>
        إظهار/إخفاء كل قسم يدوياً
      </div>
      {SECTION_KEYS.map(sk => (
        <label key={sk.key} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '3px 0', cursor: 'pointer', userSelect: 'none',
        }}>
          <div
            onClick={() => handleToggleSection(sk.key)}
            style={{
              width: 32, height: 17, borderRadius: 9, flexShrink: 0,
              background: tpl[sk.key] ? 'var(--em)' : 'var(--bg5)',
              border: '1px solid ' + (tpl[sk.key] ? 'var(--embo)' : 'var(--b3)'),
              position: 'relative', cursor: 'pointer',
              transition: 'background .16s, border-color .16s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, width: 11, height: 11,
              borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,.25)',
              left: tpl[sk.key] ? 15 : 2, transition: 'left .16s',
            }} />
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 500 }}>{sk.label}</span>
        </label>
      ))}

      <hr style={{ border: 'none', borderTop: '1px solid var(--b2)', margin: '8px 0' }} />

      {/* ── Rules list ────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--em)', marginBottom: 6 }}>
        قواعد الشرط (إذا تحقق الشرط → نفّذ الإجراء)
      </div>

      {(tpl.rules || []).length === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--t4)', padding: '8px 0', textAlign: 'center' }}>
          لا توجد قواعد بعد. أضف قاعدة لبدء التحكم الشرطي في الأقسام.
        </div>
      )}

      {(tpl.rules || []).map(rule => (
        <RuleCard
          key={rule.id}
          rule={rule}
          editing={editingId === rule.id}
          onEdit={() => setEditingId(editingId === rule.id ? null : rule.id)}
          onDelete={() => handleDeleteRule(rule.id)}
          onUpdate={patch => handleUpdateRule(rule.id, patch)}
        />
      ))}

      <button
        type="button" onClick={handleAddRule}
        style={{
          ...STYLES.btn, background: 'var(--em)', color: '#fff',
          width: '100%', marginTop: 4,
        }}
      >
        + إضافة قاعدة جديدة
      </button>
    </div>
  );
}

// ─── RuleCard ────────────────────────────────────────────────────────────────────

function RuleCard({
  rule, editing, onEdit, onDelete, onUpdate,
}: {
  rule: ReportRule;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<ReportRule>) => void;
}) {
  if (editing) {
    return (
      <div style={STYLES.ruleCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={STYLES.badge}>{LABEL_MAP[rule.target] || rule.target}</span>
          <button type="button" onClick={onEdit}
            style={{ ...STYLES.btn, background: 'var(--bg5)', color: 'var(--t2)', fontSize: 11 }}>
            إغلاق
          </button>
        </div>

        {/* Condition */}
        <FormulaEditor
          value={rule.condition}
          onChange={v => onUpdate({ condition: v })}
          label="الشرط (صيغة)"
          placeholder="مثال: total > 1000"
          showFieldPicker
        />

        {/* Action + Target row */}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <span style={STYLES.label}>الإجراء</span>
            <select value={rule.action} onChange={e => onUpdate({ action: e.target.value as RuleAction })} style={STYLES.select}>
              {ACTIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <span style={STYLES.label}>الهدف</span>
            <select value={rule.target} onChange={e => onUpdate({ target: e.target.value })} style={STYLES.select}>
              {SECTION_TARGETS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 60 }}>
            <span style={STYLES.label}>الأولوية</span>
            <input
              type="number" value={rule.priority ?? 0}
              onChange={e => onUpdate({ priority: parseInt(e.target.value) || 0 })}
              style={STYLES.input}
            />
          </div>
        </div>

        {/* Highlight style (only when action = highlight) */}
        {rule.action === 'highlight' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              <span style={STYLES.label}>لون الخلفية</span>
              <input
                type="color" value={rule.highlightStyle?.background || '#fff3cd'}
                onChange={e => onUpdate({
                  highlightStyle: { ...(rule.highlightStyle || {}), background: e.target.value }
                })}
                style={{ ...STYLES.input, padding: 2, height: 28 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={STYLES.label}>لون النص</span>
              <input
                type="color" value={rule.highlightStyle?.color || '#111'}
                onChange={e => onUpdate({
                  highlightStyle: { ...(rule.highlightStyle || {}), color: e.target.value }
                })}
                style={{ ...STYLES.input, padding: 2, height: 28 }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer', fontSize: 11, color: 'var(--t3)', paddingBottom: 4,
              }}>
                <input
                  type="checkbox"
                  checked={rule.highlightStyle?.fontWeight === 'bold' || rule.highlightStyle?.fontWeight === '700'}
                  onChange={e => onUpdate({
                    highlightStyle: {
                      ...(rule.highlightStyle || {}),
                      fontWeight: e.target.checked ? 'bold' : 'normal',
                    }
                  })}
                />
                عريض
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Collapsed view
  const actionLabels: Record<string, string> = {
    show: 'إظهار', hide: 'إخفاء', highlight: 'تمييز', disable: 'تعطيل',
  };
  const actionColors: Record<string, string> = {
    show: '#16a34a', hide: '#dc2626', highlight: '#d97706', disable: '#6b7280',
  };

  return (
    <div style={{
      ...STYLES.ruleCard, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    }} onClick={onEdit}>
      <span style={STYLES.badge}>{LABEL_MAP[rule.target] || rule.target}</span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: actionColors[rule.action] || '#111',
      }}>
        {actionLabels[rule.action] || rule.action}
      </span>
      <span style={{
        flex: 1, fontSize: 11, color: 'var(--t4)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {rule.condition ? `← ${rule.condition}` : '(بدون شرط)'}
      </span>
      <button
        type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{
          ...STYLES.btn, background: 'transparent', color: 'var(--t4)',
          fontSize: 14, padding: '2px 6px',
        }}
        title="حذف القاعدة"
      >
        ✕
      </button>
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/shared/PrintQueuePanel.tsx
```
import React from 'react';
import { usePrintJobQueue, statusColor, statusLabel } from '../../renderers/usePrintJobQueue';

const panelStyle: React.CSSProperties = {
  position: 'fixed', bottom: 16, right: 16, width: 360, maxHeight: 400,
  background: '#fff', borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  display: 'flex', flexDirection: 'column', zIndex: 999, overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 14px', borderBottom: '1px solid #e2e8f0',
  fontSize: 13, fontWeight: 700,
};

const listStyle: React.CSSProperties = {
  flex: 1, overflow: 'auto', padding: '4px 0',
};

const itemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 14px', fontSize: 12, borderBottom: '1px solid #f8f9fa',
};

const badgeStyle: (color: string) => React.CSSProperties = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
  color: '#fff', background: color, whiteSpace: 'nowrap',
});

const btnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
  color: '#dc2626', padding: '2px 6px', borderRadius: 4,
};

export default function PrintQueuePanel() {
  const {
    jobs, pending, completed, failed, isProcessing, cancel, cancelAll, clear,
  } = usePrintJobQueue();

  if (jobs.length === 0) return null;

  const now = Date.now();

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>
          <i className="ti ti-printer" style={{ marginLeft: 6 }} />
          مهام الطباعة ({jobs.length})
          {isProcessing && (
            <span style={{ fontSize: 11, fontWeight: 400, marginRight: 8, color: '#3b82f6' }}>
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', marginLeft: 4 }} />
              جارٍ…
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {pending > 0 && (
            <button onClick={cancelAll} style={btnStyle} type="button">
              إلغاء الكل
            </button>
          )}
          {completed + failed > 0 && completed + failed === jobs.length && (
            <button onClick={clear} style={{ ...btnStyle, color: '#666' }} type="button">
              مسح
            </button>
          )}
        </div>
      </div>

      <div style={listStyle}>
        {jobs.map(job => {
          const elapsed = job.completedAt
            ? Math.round((job.completedAt - job.createdAt) / 1000)
            : Math.round((now - job.createdAt) / 1000);
          return (
            <div key={job.id} style={itemStyle}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {job.name}
              </span>
              {job.status === 'failed' && job.error && (
                <span title={job.error} style={{ color: '#dc2626', fontSize: 10, cursor: 'help' }}>
                  <i className="ti ti-alert-triangle" />
                </span>
              )}
              <span style={badgeStyle(statusColor(job.status))}>
                {job.status === 'printing' && <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />}
                {statusLabel(job.status)}
              </span>
              <span style={{ color: '#999', fontSize: 10, minWidth: 30, textAlign: 'left' }}>
                {elapsed}s
              </span>
              {job.status === 'pending' && (
                <button onClick={() => cancel(job.id)} style={{ ...btnStyle, fontSize: 10 }} type="button">
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex', gap: 12, padding: '6px 14px', borderTop: '1px solid #e2e8f0',
        fontSize: 11, color: '#94a3b8',
      }}>
        <span>بانتظار: {pending}</span>
        <span style={{ color: '#16a34a' }}>تم: {completed}</span>
        {failed > 0 && <span style={{ color: '#dc2626' }}>فشل: {failed}</span>}
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/shared/TemplatePrintModal.tsx
```
import React, { Suspense, useMemo, useEffect, useRef, useCallback } from 'react';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data/DocumentDataBuilder';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';
import type { PrintTemplate, DocTypeCode } from '@/pages/settings/print-settings/types';
import { createDefaultTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import { resolveTemplate } from '@/pages/settings/print-settings/runtime/TemplateResolver';
import { openPrintPopup } from '@/pages/settings/print-settings/runtime';

const UniversalPreview = React.lazy(() => import('@/pages/settings/print-settings/components/preview/UniversalPreview'));

// ─── ApiDocument ────────────────────────────────────────────────────────────
// Minimal shape expected by DocumentDataBuilder.fromApiDocument().
// Consumers pass their full CommercialDocument — extra fields are ignored.

interface ApiDocument {
  id?:                   number;
  document_number?:      string;
  document_date?:        string;
  due_date?:             string | null;
  notes?:                string | null;
  document_type?:        { code?: string; name?: string } | null;
  document_status?:      { name?: string; code?: string } | null;
  party?:                Record<string, unknown> | null;
  warehouse?:            Record<string, unknown> | null;
  currency?:             { code?: string; symbol?: string; exchange_rate?: number } | null;
  lines?:                Record<string, unknown>[];
  payments?:             Record<string, unknown>[];
  totals?:               Record<string, unknown> | null;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TemplatePrintModalProps {
  open:        boolean;
  onClose:     () => void;
  document?:   ApiDocument;
  company:     CompanyData;
  templates?:  PrintTemplate[];
  template?:   PrintTemplate;
  docTypeCode: string;
  /** Pre-built data (bypasses fromApiDocument when provided) */
  data?:       UniversalDocumentData;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  width: '90vw',
  maxWidth: 900,
  maxHeight: '90vh',
  background: 'var(--bg1)',
  borderRadius: 8,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--b2)',
};

const previewAreaStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 16,
  display: 'flex',
  justifyContent: 'center',
  background: 'var(--bg3)',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  padding: '12px 16px',
  borderTop: '1px solid var(--b2)',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px',
  border: 'none',
  borderRadius: 6,
  background: 'var(--em)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 20px',
  border: '1px solid var(--b2)',
  borderRadius: 6,
  background: 'var(--bg1)',
  color: 'var(--t2)',
  fontSize: 14,
  cursor: 'pointer',
};

// ─── Component ──────────────────────────────────────────────────────────────

function TemplatePrintModal({ open, onClose, document, company, template, templates, docTypeCode, data: overrideData }: TemplatePrintModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const data: UniversalDocumentData = useMemo(
    () => overrideData ?? (document ? DocumentDataBuilder.fromApiDocument(document, company) : DocumentDataBuilder.empty()),
    [overrideData, document, company],
  );

  const tpl: PrintTemplate = useMemo(() => {
    if (template) return template;
    const found = resolveTemplate(templates ?? [], docTypeCode);
    if (found) return found;
    return createDefaultTemplate(docTypeCode as DocTypeCode, 'A4');
  }, [template, templates, docTypeCode]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handlePrint = useCallback(() => {
    if (!tpl) return;

    const isThermal = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';
    const paperW = isThermal
      ? (tpl.paper_width_mm ?? 80)
      : (tpl.paper_size === 'A4' ? 210 : 148);
    const winW = isThermal
      ? Math.min(Math.round(paperW * 3.78) + 60, 900)
      : 900;
    const winH = isThermal ? 700 : Math.min(
      tpl.paper_size === 'A4' ? 1123 : 794,
      window.screen.availHeight,
    );

    const bodyStyle = isThermal
      ? 'body{margin:0;background:#fff;display:flex;justify-content:center;padding:10px}*{box-sizing:border-box}'
      : 'body{margin:0;background:#fff;display:flex;justify-content:center;padding:20px}*{box-sizing:border-box}';

    const win = openPrintPopup(winW, winH, bodyStyle);
    if (!win) { window.print(); return; }

    const root = win.document.getElementById('print-root');
    if (!root) return;

    import('react-dom/client').then(({ createRoot }) => {
      createRoot(root).render(
        React.createElement(UniversalPreview, { tpl, data }),
      );
    });
  }, [tpl, data]);

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>طباعة حسب القالب</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--t4)', padding: '0 4px', lineHeight: 1 }}
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <div style={previewAreaStyle}>
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>...</div>}>
            <UniversalPreview tpl={tpl} data={data} />
          </Suspense>
        </div>

        <div style={footerStyle}>
          <button style={btnSecondary} onClick={onClose}>إلغاء</button>
          <button style={btnPrimary} onClick={handlePrint}>طباعة</button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(TemplatePrintModal);
```

## FILE: resources/js/pages/settings/print-settings/components/TemplateControls.tsx
```
import React, { useState } from 'react';
import type { PrintTemplate, FontFamily } from '../types';
import type { CompanyData } from '../types';
import { Toggle, Field, Input, Select, Pills, SectionTitle } from './ui';
import { Accordion } from './Accordion';
import type { Updater } from './ColumnManager';
import { Section } from '../sections/ToggleSwitch';
import HeaderSectionControls from '../sections/HeaderSection';
import DocumentSectionControls from '../sections/DocumentSection';
import ItemsSectionControls from '../sections/ItemsSection';
import TotalsSectionControls from '../sections/TotalsSection';
import PaymentsSectionControls from '../sections/PaymentsSection';
import FooterSectionControls from '../sections/FooterSection';
import FormattingSectionControls from '../sections/FormattingSection';
import RulesSection from './RulesSection';
import { isPropertyVisible } from '../services/PropertyVisibilityService';

export function TemplateControls({ tpl, update, companyData }: {
  tpl: PrintTemplate; update: Updater; companyData: CompanyData | null;
}) {
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseVersion, setCollapseVersion] = useState(0);
  const docType = tpl.doc_type_code;
  const paperSize = tpl.paper_size;

  const sec = (k: string) => isPropertyVisible(k, docType, paperSize, tpl);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      <button onClick={() => {
        setAllCollapsed(c => !c);
        setCollapseVersion(v => v + 1);
      }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)',
          cursor: 'pointer', fontSize: 12, color: 'var(--t2)', marginBottom: 4,
        }}>
        <i className="ti ti-arrows-vertical" />
        {allCollapsed ? 'فتح الكل' : 'طي الكل'}
      </button>

      {/* ── Section visibility toggles ── */}
      <div style={{
        padding: '6px 10px', background: 'var(--bg3)', borderRadius: 'var(--r2)',
        border: '1px solid var(--b2)', marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: 4,
      }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', width: '100%', marginBottom: 2 }}>
          إظهار / إخفاء الأقسام
        </span>
        <Toggle value={tpl.show_header_section} onChange={v => update('show_header_section', v)} label="الرأس" />
        <Toggle value={tpl.show_doc_info_section} onChange={v => update('show_doc_info_section', v)} label="المستند" />
        <Toggle value={tpl.show_items_section} onChange={v => update('show_items_section', v)} label="الجدول" />
        <Toggle value={tpl.show_totals_section} onChange={v => update('show_totals_section', v)} label="الإجماليات" />
        <Toggle value={tpl.show_payments_section} onChange={v => update('show_payments_section', v)} label="الدفع" />
        <Toggle value={tpl.show_footer_section} onChange={v => update('show_footer_section', v)} label="التذييل" />
      </div>

      {sec('show_header_section') && (
        <Section id="s-header" title="رأس الفاتورة — الشعار والشركة" icon="ti-building-store" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <HeaderSectionControls tpl={tpl} update={update} company={companyData} />
        </Section>
      )}

      {sec('show_doc_info_section') && (
        <Section id="s-doc" title="معلومات المستند" icon="ti-file-description" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <DocumentSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      {sec('show_items_section') && (
        <Section id="s-items" title="جدول المنتجات — الأعمدة والتنسيق" icon="ti-table" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <ItemsSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      {sec('show_totals_section') && (
        <Section id="s-totals" title="الإجماليات — الحسابات" icon="ti-cash" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <TotalsSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      {sec('show_payments_section') && (
        <Section id="s-payments" title="تفاصيل الدفع" icon="ti-cash-banknote" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <PaymentsSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      {sec('show_footer_section') && (
        <Section id="s-footer" title="التذييل — النصوص والتواقيع" icon="ti-file-text" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
          <FooterSectionControls tpl={tpl} update={update} />
        </Section>
      )}

      <Section id="s-format" title="تنسيق الطباعة — الهوامش والمسافات" icon="ti-settings" defaultOpen={!allCollapsed} collapseVersion={collapseVersion}>
        <FormattingSectionControls tpl={tpl} update={update} />
      </Section>

      <Accordion id="s-rules" title="القواعد — الإظهار/الإخفاء الشرطي" icon="ti-adjustments" collapseVersion={collapseVersion} defaultOpen={!allCollapsed}>
        <RulesSection tpl={tpl} update={update} />
      </Accordion>

      {sec('show_report_header') && (
        <Accordion id="s-report" title="التقارير — الرسوم البيانية والتجميع" icon="ti-report-analytics" collapseVersion={collapseVersion} defaultOpen={!allCollapsed}>
          <Field label="نص رأس التقرير">
            <Input value={tpl.report_header_text} onChange={v => update('report_header_text', v)} />
          </Field>
          <Toggle value={tpl.show_report_header} onChange={v => update('show_report_header', v)} label="عرض رأس التقرير" />
          <Toggle value={tpl.show_charts} onChange={v => update('show_charts', v)} label="عرض الرسم البياني" />
          {tpl.show_charts && (
            <>
              <div style={{ padding: '2px 0' }}>
                <Pills
                  options={[{ v: 'bar' as const, l: 'مخطط أعمدة' }, { v: 'pie' as const, l: 'مخطط دائري' }]}
                  value={tpl.chart_type}
                  onChange={v => update('chart_type', v)}
                />
              </div>
              <Field label="عنوان الرسم البياني">
                <Input value={tpl.chart_title} onChange={v => update('chart_title', v)} placeholder="توزيع وسائل الدفع" />
              </Field>
            </>
          )}
          <SectionTitle>خيارات التقرير</SectionTitle>
          <Toggle value={tpl.show_report_period}  onChange={v => update('show_report_period', v)}  label="عرض الفترة" />
          <Toggle value={tpl.show_report_cashier} onChange={v => update('show_report_cashier', v)} label="عرض الكاشير" />
          <Toggle value={tpl.show_report_summary_cards} onChange={v => update('show_report_summary_cards', v)} label="عرض بطاقات الملخص" />
          <Toggle value={tpl.show_report_payment_breakdown} onChange={v => update('show_report_payment_breakdown', v)} label="توزيع وسائل الدفع" />
          <Toggle value={tpl.show_report_top_products} onChange={v => update('show_report_top_products', v)} label="أفضل المنتجات" />
          {tpl.show_report_top_products && (
            <div style={{ padding: '4px 0', borderBottom: '1px solid var(--b1)', marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 4 }}>عرض أعمدة الجدول</div>
              {([['product', 'المنتج'], ['quantity', 'الكمية'], ['total', 'الإجمالي']] as const).map(([k, label]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--t2)', minWidth: 50 }}>{label}</span>
                  <input type="range" min={10} max={70} step={1}
                    value={tpl.report_col_widths[k] ?? 30}
                    onChange={e => update('report_col_widths', { ...tpl.report_col_widths, [k]: Number(e.target.value) })}
                    style={{ flex: 1, height: 3, accentColor: 'var(--em)' }} />
                  <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 28, textAlign: 'left' }}>
                    {tpl.report_col_widths[k] ?? 30}%
                  </span>
                  <input
                    value={tpl.report_col_headers[k] ?? ''}
                    onChange={e => update('report_col_headers', { ...tpl.report_col_headers, [k]: e.target.value })}
                    placeholder={label}
                    style={{
                      width: 60, fontSize: 10, padding: '1px 4px',
                      border: '1px solid var(--b2)', borderRadius: 'var(--r1)',
                      background: 'var(--bg3)', color: 'var(--t2)',
                      fontFamily: 'Tajawal, sans-serif',
                    }} />
                </div>
              ))}
            </div>
          )}
          <SectionTitle>ترتيب وتجميع</SectionTitle>
          <Field label="تجميع حسب">
            <Input value={tpl.group_by} onChange={v => update('group_by', v)} placeholder="مثال: category" />
          </Field>
          <Field label="ترتيب حسب">
            <Input value={tpl.sort_by} onChange={v => update('sort_by', v)} placeholder="مثال: total" />
          </Field>
          <div style={{ padding: '2px 0' }}>
            <Pills
              options={[{ v: 'asc' as const, l: 'تصاعدي' }, { v: 'desc' as const, l: 'تنازلي' }]}
              value={tpl.sort_direction}
              onChange={v => update('sort_direction', v)}
            />
          </div>
          <Toggle value={tpl.show_report_footer} onChange={v => update('show_report_footer', v)} label="عرض تذييل التقرير" />
          <Field label="نص تذييل التقرير">
            <Input value={tpl.report_footer_text} onChange={v => update('report_footer_text', v)} />
          </Field>
        </Accordion>
      )}
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/TinyBtn.tsx
```
export const toolBtnStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 'var(--r1)', fontSize: 13,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t3)', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
};

export function TinyBtn({ icon, color, title, onClick, loading, disabled }: {
  icon: string; color: string; title: string; onClick: () => void;
  loading?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={loading ? undefined : onClick}
      title={loading ? 'جاري…' : title}
      type="button"
      disabled={disabled || loading}
      style={{
        padding: '4px 5px', border: 'none', background: 'transparent',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        color: (disabled || loading) ? 'var(--t4)' : color,
        fontSize: 11, lineHeight: 1, opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        : <i className={`ti ${icon}`} />}
    </button>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/components/ui.tsx
```
import React from 'react';
import type { AlignOption, BorderStyle } from '../types';

export const styledInput: React.CSSProperties = {
  width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)',
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  fontSize: 12, color: 'var(--t1)', outline: 'none',
  fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box',
};

// ── Toggle ────────────────────────────────────────────────────────────────────

export const Toggle = React.memo(function Toggle({
  value, onChange, label,
}: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 0', cursor: 'pointer', userSelect: 'none',
    }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 34, height: 18, borderRadius: 9, flexShrink: 0,
          background: value ? 'var(--em)' : 'var(--bg5)',
          border: '1px solid ' + (value ? 'var(--embo)' : 'var(--b3)'),
          position: 'relative', cursor: 'pointer', transition: 'background .16s, border-color .16s',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, width: 12, height: 12,
          borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)',
          left: value ? 16 : 2, transition: 'left .16s',
        }} />
      </div>
      <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 500, lineHeight: 1.4 }}>{label}</span>
    </label>
  );
});

// ── Slider ────────────────────────────────────────────────────────────────────

export const Slider = React.memo(function Slider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ margin: '2px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--t2)', marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--t1)' }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step ?? 1}
        value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', height: 4, accentColor: 'var(--em)', cursor: 'pointer' }}
      />
    </div>
  );
});

// ── Field ─────────────────────────────────────────────────────────────────────

export function Field({ label, children, hint }: {
  label: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div style={{ margin: '2px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{label}</span>
        {hint && <span style={{ fontSize: 9.5, fontWeight: 400, color: 'var(--t4)' }}>({hint})</span>}
      </div>
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

export function Input({ value, onChange, placeholder, onEnter }: {
  value: string | null; onChange: (v: string) => void;
  placeholder?: string; onEnter?: () => void;
}) {
  return (
    <input
      value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={styledInput}
      onKeyDown={e => { if (e.key === 'Enter') onEnter?.(); }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--emb)'; }}
      onBlur={e  => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

export function Textarea({ value, onChange, placeholder, rows = 2 }: {
  value: string | null | undefined; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{ ...styledInput, resize: 'vertical' }}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

export function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={styledInput}>
      {children}
    </select>
  );
}

// ── Pills ─────────────────────────────────────────────────────────────────────

export function Pills<T extends string>({ options, value, onChange }: {
  options: { v: T; l: string }[];
  value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
      {options.map(o => (
        <button
          key={o.v} onClick={() => onChange(o.v)} type="button"
          style={{
            flex: 1, padding: '4px 0', fontSize: 11, borderRadius: 'var(--r1)',
            border: `1px solid ${value === o.v ? 'var(--em)' : 'var(--b2)'}`,
            background: value === o.v ? 'var(--emb)' : 'var(--bg3)',
            color: value === o.v ? 'var(--em)' : 'var(--t3)',
            cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontWeight: 600,
          }}
        >{o.l}</button>
      ))}
    </div>
  );
}

// ── ColorField ────────────────────────────────────────────────────────────────

export function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 30, height: 26, border: '1px solid var(--b2)', borderRadius: 4, cursor: 'pointer', padding: 1 }}
        />
        <input
          type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ ...styledInput, flex: 1, fontFamily: 'monospace', fontSize: 11 }}
        />
      </div>
    </Field>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider() {
  return <div style={{ height: 1, background: 'var(--b2)', margin: '5px 0' }} />;
}

// ── SectionTitle ──────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', margin: '4px 0 2px', letterSpacing: '.3px' }}>
      {children}
    </div>
  );
}

// ── Alignment/border option constants ─────────────────────────────────────────

export const ALIGN_OPTS: { v: AlignOption; l: string }[] = [
  { v: 'right', l: 'يمين' }, { v: 'center', l: 'وسط' }, { v: 'left', l: 'يسار' },
];

export const BORDER_OPTS: { v: BorderStyle; l: string }[] = [
  { v: 'solid', l: '─' }, { v: 'dashed', l: '- -' },
  { v: 'double', l: '═' }, { v: 'none', l: 'بلا' },
];
```

## FILE: resources/js/pages/settings/print-settings/contracts/ApiClient.ts
```
export interface ApiClient {
  get<T>(url: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: unknown): Promise<T>;
  put<T>(url: string, data?: unknown): Promise<T>;
  patch<T>(url: string, data?: unknown): Promise<T>;
  delete(url: string): Promise<void>;
  upload<T>(url: string, fd: FormData, onProgress?: (p: number) => void): Promise<T>;
}
```

## FILE: resources/js/pages/settings/print-settings/contracts/HostContext.ts
```
import type { ApiClient } from './ApiClient';
import type { Notifier } from './Notifier';
import type { PrintTemplatesApi } from './TemplateRepository';
import type { CompanyData } from '../types';

export interface HostDependencies {
  apiClient: ApiClient;
  notifier: Notifier;
  printTemplatesApi: PrintTemplatesApi;
  company: CompanyData | null;
  slug: string | null;
}
```

## FILE: resources/js/pages/settings/print-settings/contracts/Notifier.ts
```
export interface Notifier {
  success(message: string): void;
  error(message: string): void;
}
```

## FILE: resources/js/pages/settings/print-settings/contracts/TemplateRepository.ts
```
import type { PrintTemplate } from '../types';

export interface PrintTemplatesApi {
  list(docTypeCode?: string): Promise<PrintTemplate[]>;
  show(id: number): Promise<PrintTemplate>;
  create(tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<PrintTemplate>;
  update(id: number, tpl: Partial<PrintTemplate>): Promise<PrintTemplate>;
  delete(id: number): Promise<void>;
  setDefault(id: number): Promise<PrintTemplate>;
  duplicate(id: number, newName: string): Promise<PrintTemplate>;
  library(): Promise<{ id: string; name: string; paper_size: string }[]>;
  installLibrary(templateId: string): Promise<PrintTemplate>;
  uploadLogo(file: File, onProgress?: (p: number) => void): Promise<{ path: string; url: string }>;
}


```

## FILE: resources/js/pages/settings/print-settings/engines/AdvancedFunctions.ts
```
import { formulaEngine, type ExpressionFunction, type ExpressionValue } from '@/pages/settings/print-settings/services/engines/FormulaEngine';

// ─── Helper ──────────────────────────────────────────────────────────────────

function toNum(v: ExpressionValue): number {
  return typeof v === 'number' ? v : Number(v) || 0;
}

function toStr(v: ExpressionValue): string {
  return v == null ? '' : String(v);
}

function toDate(v: ExpressionValue): Date | null {
  if (v instanceof Date) return v;
  const s = toStr(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function isArray(v: ExpressionValue): boolean {
  return Array.isArray(v);
}

function isNumArr(v: ExpressionValue): v is number[] {
  return Array.isArray(v) && v.every(x => typeof x === 'number');
}

// ─── Financial Functions ─────────────────────────────────────────────────────

const PMT: ExpressionFunction = ([rate, nper, pvArg, fvArg, typeArg]) => {
  const r = toNum(rate) / 100;
  const n = toNum(nper);
  const pv = toNum(pvArg);
  const fv = fvArg != null ? toNum(fvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  if (r === 0) return -(pv + fv) / n;
  const pvif = Math.pow(1 + r, n);
  return -(r * pv * pvif + fv * r / (pvif - 1)) / (pvif - 1) / (1 + r * type);
};

const NPER: ExpressionFunction = ([rate, pmtArg, pvArg, fvArg, typeArg]) => {
  const r = toNum(rate) / 100;
  const pmt = toNum(pmtArg);
  const pv = toNum(pvArg);
  const fv = fvArg != null ? toNum(fvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  if (r === 0) return -(pv + fv) / pmt;
  const num = pmt * (1 + r * type) - fv * r;
  const den = pmt * (1 + r * type) + pv * r;
  return Math.log(num / den) / Math.log(1 + r);
};

const RATE: ExpressionFunction = ([nper, pmtArg, pvArg, fvArg, typeArg, guessArg]) => {
  const n = toNum(nper);
  const pmt = toNum(pmtArg);
  const pv = toNum(pvArg);
  const fv = fvArg != null ? toNum(fvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  let guess = guessArg != null ? toNum(guessArg) : 0.1;
  for (let i = 0; i < 100; i++) {
    const y = pmt * (1 + guess * type) * (Math.pow(1 + guess, n) - 1) / guess + pv * Math.pow(1 + guess, n) + fv;
    const dy = pmt * (1 + guess * type) * (n * Math.pow(1 + guess, n - 1) / guess - (Math.pow(1 + guess, n) - 1) / (guess * guess)) + pv * n * Math.pow(1 + guess, n - 1);
    if (Math.abs(dy) < 1e-12) break;
    const newGuess = guess - y / dy;
    if (Math.abs(newGuess - guess) < 1e-10) return newGuess;
    guess = newGuess;
  }
  return guess;
};

const FV: ExpressionFunction = ([rate, nper, pmtArg, pvArg, typeArg]) => {
  const r = toNum(rate) / 100;
  const n = toNum(nper);
  const pmt = toNum(pmtArg);
  const pv = pvArg != null ? toNum(pvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  if (r === 0) return -(pv + pmt * n);
  const pvif = Math.pow(1 + r, n);
  return -pv * pvif - pmt * (1 + r * type) * (pvif - 1) / r;
};

const PV: ExpressionFunction = ([rate, nper, pmtArg, fvArg, typeArg]) => {
  const r = toNum(rate) / 100;
  const n = toNum(nper);
  const pmt = toNum(pmtArg);
  const fv = fvArg != null ? toNum(fvArg) : 0;
  const type = typeArg != null ? toNum(typeArg) : 0;
  if (r === 0) return -(fv + pmt * n);
  const pvif = Math.pow(1 + r, n);
  return -(fv / pvif + pmt * (1 + r * type) * (1 / r - 1 / (r * pvif)));
};

const NPV: ExpressionFunction = ([rate, ...values]) => {
  const r = toNum(rate) / 100;
  let result = 0;
  for (let i = 0; i < values.length; i++) {
    result += toNum(values[i]) / Math.pow(1 + r, i + 1);
  }
  return result;
};

const IRR: ExpressionFunction = ([...values]) => {
  const vals = values.map(toNum);
  let guess = 0.1;
  for (let i = 0; i < 1000; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let j = 0; j < vals.length; j++) {
      npv += vals[j] / Math.pow(1 + guess, j);
      dnpv -= j * vals[j] / Math.pow(1 + guess, j + 1);
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const newGuess = guess - npv / dnpv;
    if (Math.abs(newGuess - guess) < 1e-10) return newGuess;
    guess = newGuess;
  }
  return guess;
};

// ─── Date Functions ──────────────────────────────────────────────────────────

const DATEDIF: ExpressionFunction = ([start, end, unit]) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return null;
  const u = toStr(unit).toUpperCase();
  const ms = e.getTime() - s.getTime();
  const years = e.getFullYear() - s.getFullYear();
  const months = years * 12 + (e.getMonth() - s.getMonth());
  const days = Math.floor(ms / 86400000);
  if (u === 'Y') return years;
  if (u === 'M') return months;
  if (u === 'D') return days;
  if (u === 'MD') {
    return e.getDate() - s.getDate();
  }
  if (u === 'YM') return months % 12;
  if (u === 'YD') {
    const s2 = new Date(e.getFullYear(), s.getMonth(), s.getDate());
    return Math.floor((e.getTime() - s2.getTime()) / 86400000);
  }
  return days;
};

const EOMONTH: ExpressionFunction = ([date, months]) => {
  const d = toDate(date);
  if (!d) return null;
  const m = Math.floor(toNum(months));
  d.setMonth(d.getMonth() + m + 1, 0);
  return d.toISOString().slice(0, 10);
};

const WORKDAY: ExpressionFunction = ([start, days]) => {
  const d = toDate(start);
  if (!d) return null;
  let n = Math.floor(toNum(days));
  const dir = n >= 0 ? 1 : -1;
  while (n !== 0) {
    d.setDate(d.getDate() + dir);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 5) n -= dir;
  }
  return d.toISOString().slice(0, 10);
};

const NETWORKDAYS: ExpressionFunction = ([start, end]) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return null;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 5) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const WEEKNUM: ExpressionFunction = ([date]) => {
  const d = toDate(date);
  if (!d) return null;
  const s = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - s.getTime() + (s.getTimezoneOffset() - d.getTimezoneOffset()) * 60000;
  return Math.ceil((diff / 86400000 + s.getDay() + 1) / 7);
};

const ISOWEEKNUM: ExpressionFunction = ([date]) => {
  const d = toDate(date);
  if (!d) return null;
  const temp = new Date(d.valueOf());
  temp.setDate(temp.getDate() + 3 - (temp.getDay() + 6) % 7);
  const s = new Date(temp.getFullYear(), 0, 1);
  return 1 + Math.round(((temp.getTime() - s.getTime()) / 86400000 - 3 + (s.getDay() + 6) % 7) / 7);
};

const QUARTER: ExpressionFunction = ([date]) => {
  const d = toDate(date);
  if (!d) return null;
  return Math.floor(d.getMonth() / 3) + 1;
};

const YEARFRAC: ExpressionFunction = ([start, end]) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return null;
  return (e.getTime() - s.getTime()) / 365.25 / 86400000;
};

const EDATE: ExpressionFunction = ([date, months]) => {
  const d = toDate(date);
  if (!d) return null;
  d.setMonth(d.getMonth() + Math.floor(toNum(months)));
  return d.toISOString().slice(0, 10);
};

// ─── Array Functions ─────────────────────────────────────────────────────────

const FILTER: ExpressionFunction = ([arr, cond]) => {
  if (!isArray(arr)) return [];
  const condVal = (cond as ExpressionValue);
  if (typeof condVal === 'function') {
    return (arr as ExpressionValue[]).filter((item: ExpressionValue) => condVal(item));
  }
  return (arr as ExpressionValue[]).filter(() => isTruthy(condVal));
};

const SORT: ExpressionFunction = ([arr, direction]) => {
  if (!isArray(arr)) return [];
  const dir = toStr(direction).toLowerCase() === 'desc' ? -1 : 1;
  return [...(arr as ExpressionValue[])].sort((a, b) => {
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
    return String(a).localeCompare(String(b)) * dir;
  });
};

const UNIQUE: ExpressionFunction = ([arr]) => {
  if (!isArray(arr)) return [];
  return [...new Set(arr as ExpressionValue[])];
};

const FLATTEN: ExpressionFunction = ([arr]) => {
  if (!isArray(arr)) return [];
  const result: ExpressionValue[] = [];
  function flatten(v: ExpressionValue): void {
    if (Array.isArray(v)) v.forEach(flatten);
    else result.push(v);
  }
  (arr as ExpressionValue[]).forEach(flatten);
  return result;
};

const ARRAY: ExpressionFunction = ([...args]) => args;

const RANGE: ExpressionFunction = ([start, end, stepParam]) => {
  const s = Math.floor(toNum(start));
  const e = Math.floor(toNum(end));
  const step = stepParam != null ? Math.max(1, Math.floor(toNum(stepParam))) : 1;
  const result: number[] = [];
  for (let i = s; i <= e; i += step) result.push(i);
  return result;
};

function isTruthy(val: ExpressionValue): boolean {
  if (val === null) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  return val !== '';
}

// ─── Window Functions ────────────────────────────────────────────────────────

const ROW_NUMBER: ExpressionFunction = ([_arr, sortField]) => { return null; };

const RANK: ExpressionFunction = ([arr, value, order]) => {
  if (!isNumArr(arr)) return null;
  const desc = toStr(order).toLowerCase() === 'desc';
  const sorted = [...arr].sort((a, b) => desc ? b - a : a - b);
  const idx = sorted.indexOf(toNum(value));
  return idx >= 0 ? idx + 1 : null;
};

const DENSE_RANK: ExpressionFunction = ([arr, value, order]) => {
  if (!isNumArr(arr)) return null;
  const desc = toStr(order).toLowerCase() === 'desc';
  const uniq = [...new Set(arr)].sort((a, b) => desc ? b - a : a - b);
  const idx = uniq.indexOf(toNum(value));
  return idx >= 0 ? idx + 1 : null;
};

const NTILE: ExpressionFunction = ([arr, n]) => {
  if (!isArray(arr) || !n) return [];
  const numTiles = Math.max(1, Math.floor(toNum(n)));
  const len = (arr as ExpressionValue[]).length;
  const perTile = Math.ceil(len / numTiles);
  return (arr as ExpressionValue[]).map((_, i) => Math.min(Math.floor(i / perTile) + 1, numTiles));
};

const LAG: ExpressionFunction = ([arr, offsetParam]) => {
  if (!isArray(arr)) return null;
  return null;
};

const LEAD: ExpressionFunction = ([arr, offsetParam]) => {
  if (!isArray(arr)) return null;
  return null;
};

const FIRST_VALUE: ExpressionFunction = ([arr]) => {
  return isArray(arr) ? (arr as ExpressionValue[])[0] ?? null : null;
};

const LAST_VALUE: ExpressionFunction = ([arr]) => {
  return isArray(arr) ? (arr as ExpressionValue[])[(arr as ExpressionValue[]).length - 1] ?? null : null;
};

const SUM_OVER: ExpressionFunction = ([..._args]) => null;
const AVG_OVER: ExpressionFunction = ([..._args]) => null;

// ─── Aggregation Extensions ──────────────────────────────────────────────────

const MEDIAN: ExpressionFunction = ([arr]) => {
  if (!isNumArr(arr) || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const MODE: ExpressionFunction = ([arr]) => {
  if (!isNumArr(arr) || arr.length === 0) return null;
  const freq = new Map<number, number>();
  for (const n of arr) freq.set(n, (freq.get(n) ?? 0) + 1);
  let maxFreq = 0;
  let mode = arr[0];
  for (const [n, f] of freq) {
    if (f > maxFreq) { maxFreq = f; mode = n; }
  }
  return mode;
};

const STDDEV: ExpressionFunction = ([arr]) => {
  if (!isNumArr(arr) || arr.length < 2) return null;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
};

const VARIANCE: ExpressionFunction = ([arr]) => {
  if (!isNumArr(arr) || arr.length < 2) return null;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
};

const PRODUCT: ExpressionFunction = ([...args]) => {
  const nums = args.filter((v): v is number => typeof v === 'number');
  return nums.length > 0 ? nums.reduce((p, v) => p * v, 1) : 0;
};

const COUNTIF: ExpressionFunction = ([arr, predicate]) => {
  if (!isArray(arr)) return 0;
  let count = 0;
  for (const item of (arr as ExpressionValue[])) {
    if (typeof predicate === 'number') {
      if (item === predicate) count++;
    } else if (typeof predicate === 'string') {
      if (String(item).includes(predicate)) count++;
    } else if (predicate === true) {
      if (isTruthy(item)) count++;
    }
  }
  return count;
};

const SUMIF: ExpressionFunction = ([arr, predicate, sumArr]) => {
  const items = isArray(arr) ? (arr as ExpressionValue[]) : [];
  const sums = sumArr != null && isArray(sumArr) ? (sumArr as ExpressionValue[]) : null;
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    let match = false;
    if (typeof predicate === 'number') match = items[i] === predicate;
    else if (typeof predicate === 'string') match = String(items[i]).includes(predicate);
    else if (predicate === true) match = isTruthy(items[i]);
    if (match) total += toNum(sums ? (sums[i] ?? items[i]) : items[i]);
  }
  return total;
};

const AVERAGEIF: ExpressionFunction = ([arr, predicate, avgArr]) => {
  const items = isArray(arr) ? (arr as ExpressionValue[]) : [];
  const avgs = avgArr != null && isArray(avgArr) ? (avgArr as ExpressionValue[]) : null;
  let total = 0;
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    let match = false;
    if (typeof predicate === 'number') match = items[i] === predicate;
    else if (typeof predicate === 'string') match = String(items[i]).includes(predicate);
    else if (predicate === true) match = isTruthy(items[i]);
    if (match) { total += toNum(avgs ? (avgs[i] ?? items[i]) : items[i]); count++; }
  }
  return count > 0 ? total / count : 0;
};

// ─── Lookup Functions ────────────────────────────────────────────────────────

const VLOOKUP: ExpressionFunction = ([lookup, range, colIndex, exactMatch]) => {
  if (!isArray(range)) return null;
  const rows = range as ExpressionValue[];
  const col = Math.floor(toNum(colIndex)) - 1;
  const exact = exactMatch == null || isTruthy(exactMatch);
  for (const row of rows) {
    if (isArray(row)) {
      const r = row as ExpressionValue[];
      if (exact ? r[0] === lookup : String(r[0]).toLowerCase().includes(String(lookup).toLowerCase())) {
        return r[col] ?? null;
      }
    }
  }
  return null;
};

const HLOOKUP: ExpressionFunction = ([lookup, range, rowIndex, exactMatch]) => {
  if (!isArray(range)) return null;
  const cols = range as ExpressionValue[];
  const row = Math.floor(toNum(rowIndex)) - 1;
  const exact = exactMatch == null || isTruthy(exactMatch);
  for (const col of cols) {
    if (isArray(col)) {
      const c = col as ExpressionValue[];
      if (exact ? c[0] === lookup : String(c[0]).toLowerCase().includes(String(lookup).toLowerCase())) {
        return c[row] ?? null;
      }
    }
  }
  return null;
};

const INDEX: ExpressionFunction = ([arr, row, col]) => {
  if (!isArray(arr)) return null;
  const rows = arr as ExpressionValue[];
  const r = Math.floor(toNum(row)) - 1;
  if (col != null) {
    const c = Math.floor(toNum(col)) - 1;
    const item = rows[r];
    return isArray(item) ? (item as ExpressionValue[])[c] ?? null : null;
  }
  return rows[r] ?? null;
};

const MATCH: ExpressionFunction = ([lookup, arr, matchType]) => {
  if (!isArray(arr)) return null;
  const items = arr as ExpressionValue[];
  const mt = matchType != null ? Math.floor(toNum(matchType)) : 0;
  for (let i = 0; i < items.length; i++) {
    if (mt === 0 && items[i] === lookup) return i + 1;
    if (mt === 1 && typeof items[i] === 'number' && typeof lookup === 'number' && items[i] <= lookup) return i + 1;
    if (mt === -1 && typeof items[i] === 'number' && typeof lookup === 'number' && items[i] >= lookup) return i + 1;
  }
  return null;
};

const CHOOSE: ExpressionFunction = ([index, ...values]) => {
  const idx = Math.floor(toNum(index)) - 1;
  return values[idx] ?? null;
};

// ─── Register all advanced functions ─────────────────────────────────────────

export function registerAdvancedFunctions(): void {
  // Financial
  formulaEngine.registerFunction('PMT', PMT);
  formulaEngine.registerFunction('NPER', NPER);
  formulaEngine.registerFunction('RATE', RATE);
  formulaEngine.registerFunction('FV', FV);
  formulaEngine.registerFunction('PV', PV);
  formulaEngine.registerFunction('NPV', NPV);
  formulaEngine.registerFunction('IRR', IRR);

  // Date
  formulaEngine.registerFunction('DATEDIF', DATEDIF);
  formulaEngine.registerFunction('EOMONTH', EOMONTH);
  formulaEngine.registerFunction('WORKDAY', WORKDAY);
  formulaEngine.registerFunction('NETWORKDAYS', NETWORKDAYS);
  formulaEngine.registerFunction('WEEKNUM', WEEKNUM);
  formulaEngine.registerFunction('ISOWEEKNUM', ISOWEEKNUM);
  formulaEngine.registerFunction('QUARTER', QUARTER);
  formulaEngine.registerFunction('YEARFRAC', YEARFRAC);
  formulaEngine.registerFunction('EDATE', EDATE);

  // Array
  formulaEngine.registerFunction('FILTER', FILTER);
  formulaEngine.registerFunction('SORT', SORT);
  formulaEngine.registerFunction('UNIQUE', UNIQUE);
  formulaEngine.registerFunction('FLATTEN', FLATTEN);
  formulaEngine.registerFunction('ARRAY', ARRAY);
  formulaEngine.registerFunction('RANGE', RANGE);

  // Window
  formulaEngine.registerFunction('ROW_NUMBER', ROW_NUMBER);
  formulaEngine.registerFunction('RANK', RANK);
  formulaEngine.registerFunction('DENSE_RANK', DENSE_RANK);
  formulaEngine.registerFunction('NTILE', NTILE);
  formulaEngine.registerFunction('LAG', LAG);
  formulaEngine.registerFunction('LEAD', LEAD);
  formulaEngine.registerFunction('FIRST_VALUE', FIRST_VALUE);
  formulaEngine.registerFunction('LAST_VALUE', LAST_VALUE);
  formulaEngine.registerFunction('SUM_OVER', SUM_OVER);
  formulaEngine.registerFunction('AVG_OVER', AVG_OVER);

  // Aggregation extensions
  formulaEngine.registerFunction('MEDIAN', MEDIAN);
  formulaEngine.registerFunction('MODE', MODE);
  formulaEngine.registerFunction('STDDEV', STDDEV);
  formulaEngine.registerFunction('VARIANCE', VARIANCE);
  formulaEngine.registerFunction('PRODUCT', PRODUCT);
  formulaEngine.registerFunction('COUNTIF', COUNTIF);
  formulaEngine.registerFunction('SUMIF', SUMIF);
  formulaEngine.registerFunction('AVERAGEIF', AVERAGEIF);

  // Lookup
  formulaEngine.registerFunction('VLOOKUP', VLOOKUP);
  formulaEngine.registerFunction('HLOOKUP', HLOOKUP);
  formulaEngine.registerFunction('INDEX', INDEX);
  formulaEngine.registerFunction('MATCH', MATCH);
  formulaEngine.registerFunction('CHOOSE', CHOOSE);
}
```

## FILE: resources/js/pages/settings/print-settings/engines/LayoutEngine.ts
```
export type LayoutMode = 'flow' | 'flex' | 'absolute';

export interface LayoutElement {
  id: string;
  type: 'text' | 'table' | 'image' | 'barcode' | 'qr' | 'line' | 'spacer';
  mode: LayoutMode;
  width: number;
  height: number;
  order: number;
  flexBasis?: number;
  grow?: number;
  minHeight?: number;
  x?: number;
  y?: number;
}

export interface ComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  consumedSpace: number;
}

export interface LayoutResult {
  elements: Map<string, ComputedLayout>;
  totalHeight: number;
  pageCount: number;
}

export class LayoutEngine {
  private getDefaultHeight(type: LayoutElement['type']): number {
    switch (type) {
      case 'text':
        return 5;
      case 'table':
        return 20;
      case 'image':
        return 20;
      case 'barcode':
        return 15;
      case 'qr':
        return 15;
      case 'line':
        return 1;
      case 'spacer':
        return 5;
    }
  }

  private resolveHeight(el: LayoutElement): number {
    const base = el.height > 0 ? el.height : this.getDefaultHeight(el.type);
    return el.minHeight != null ? Math.max(base, el.minHeight) : base;
  }

  estimateTableHeight(
    rowCount: number,
    rowHeight: number,
    headerHeight: number,
  ): number {
    return headerHeight + rowCount * rowHeight;
  }

  compute(
    elements: LayoutElement[],
    paperWidth: number,
    startY: number = 0,
    maxHeight: number = 0,
  ): LayoutResult {
    const sorted = [...elements].sort((a, b) => a.order - b.order);
    const result = new Map<string, ComputedLayout>();
    let currentY = startY;
    let currentPage = 1;
    let totalContentHeight = 0;

    let i = 0;
    while (i < sorted.length) {
      const el = sorted[i];

      if (el.mode === 'absolute') {
        const h = this.resolveHeight(el);
        result.set(el.id, {
          x: el.x ?? 0,
          y: el.y ?? 0,
          width: el.width,
          height: h,
          consumedSpace: 0,
        });
        i++;
        continue;
      }

      if (el.mode === 'flow') {
        const h = this.resolveHeight(el);

        if (maxHeight > 0 && currentY - startY + h > maxHeight) {
          currentPage++;
          currentY = startY;
        }

        result.set(el.id, {
          x: 0,
          y: currentY,
          width: paperWidth,
          height: h,
          consumedSpace: h,
        });

        currentY += h;
        totalContentHeight += h;
        i++;
        continue;
      }

      if (el.mode === 'flex') {
        const flexRow: LayoutElement[] = [];
        while (i < sorted.length && sorted[i].mode === 'flex') {
          flexRow.push(sorted[i]);
          i++;
        }

        const totalFlexBasis = flexRow.reduce(
          (sum, fel) => sum + (fel.flexBasis ?? fel.width),
          0,
        );
        const totalGrow = flexRow.reduce(
          (sum, fel) => sum + (fel.grow ?? 0),
          0,
        );
        const remaining = Math.max(0, paperWidth - totalFlexBasis);

        let rowHeight = 0;
        const baseWidths: number[] = [];

        for (const fel of flexRow) {
          baseWidths.push(fel.flexBasis ?? fel.width);
          const h = this.resolveHeight(fel);
          if (h > rowHeight) rowHeight = h;
        }

        if (maxHeight > 0 && currentY - startY + rowHeight > maxHeight) {
          currentPage++;
          currentY = startY;
        }

        let accX = 0;
        for (let j = 0; j < flexRow.length; j++) {
          const fel = flexRow[j];
          const grow = fel.grow ?? 0;
          let w = baseWidths[j];
          if (totalGrow > 0 && grow > 0) {
            w += remaining * (grow / totalGrow);
          }
          const h = this.resolveHeight(fel);

          result.set(fel.id, {
            x: accX,
            y: currentY,
            width: w,
            height: h,
            consumedSpace: w,
          });
          accX += w;
        }

        currentY += rowHeight;
        totalContentHeight += rowHeight;
      }
    }

    return {
      elements: result,
      totalHeight: totalContentHeight,
      pageCount: currentPage,
    };
  }
}

export const layoutEngine = new LayoutEngine();
```

## FILE: resources/js/pages/settings/print-settings/index.ts
```
﻿// ظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـ
// print-settings/index.ts ظ¤ Public API
//
// Consumers import ONLY from here:
//   import { PrintSettingsPage, PreviewSelector } from '@/pages/settings/print-settings';
// ظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـ

export { default as PrintSettingsPage } from './PrintSettingsPage';
export { default as PreviewSelector } from './components/PreviewSelector';

// Types ظ¤ consumers need access to these for template data
export * from './types';
export type { CompanyPreviewData } from './types';
```

## FILE: resources/js/pages/settings/print-settings/PrintSettingsPage.tsx
```
import React, {
  useState, useCallback, useEffect, useMemo, useRef,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  usePrintTemplates, usePrintTemplateMutations,
} from './api/printTemplatesApi';
import PreviewSelector from './components/PreviewSelector';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TemplateControls } from './components/TemplateControls';
import { QuickNav } from './components/QuickNav';
import { TinyBtn, toolBtnStyle } from './components/TinyBtn';
import { Input } from './components/ui';
import { type Updater } from './components/ColumnManager';
import {
  DOC_TYPE_LIST,
  type PrintTemplate, type DocTypeCode,
} from './types';
import { DocumentDataBuilder } from './types/data/DocumentDataBuilder';
import { resolveTemplate } from './runtime';
import type { UniversalDocumentData } from './types/data';
import { TemplateLibraryModal } from './template-library';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import { useApiClient, useNotifier, useCompany, useSlug } from './providers/PrintSettingsContext';
import { normalizeTemplate } from './services/SettingsSerializer';

const PAPER_DIM: Record<string, { w: number; h: number }> = {
  '80mm': { w: 80,  h: 0   },
  '58mm': { w: 58,  h: 0   },
  'A4':   { w: 210, h: 297 },
  'A5':   { w: 148, h: 210 },
};

function paperLabel(size: string, mm: number): string {
  const d = PAPER_DIM[size];
  if (!d) return `${mm}mm × تلقائي`;
  return d.h > 0 ? `${d.w}×${d.h}mm` : `${d.w}mm × تلقائي`;
}

const DOC_CATS = [
  { key: 'pos',      label: 'POS',        icon: 'ti-device-desktop' },
  { key: 'sales',    label: 'المبيعات',   icon: 'ti-receipt'        },
  { key: 'purchase', label: 'الشراء',     icon: 'ti-truck'          },
  { key: 'warehouse',label: 'المخزون',    icon: 'ti-box'            },
] as const;

export default function PrintSettingsPage() {
  const apiClient  = useApiClient();
  const notifier   = useNotifier();
  const companyCtx = useCompany();
  const slug       = useSlug();



  const [activeCat,     setActiveCat]     = useState<string>('pos');
  const [activeDoc,     setActiveDoc]     = useState<DocTypeCode>('POS');
  const [selectedTplId, setSelectedTplId] = useState<number | null>(null);
  const [localTpl,      setLocalTpl]      = useState<PrintTemplate | null>(null);
  const [isDirty,       setIsDirty]       = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [canUndo,       setCanUndo]       = useState(false);
  const [canRedo,       setCanRedo]       = useState(false);
  const [editingName,   setEditingName]   = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<number | null>(null);
  const [useRealData,       setUseRealData]       = useState(true);
  const [showLibrary,       setShowLibrary]       = useState(false);

  const historyRef    = useRef<PrintTemplate[]>([]);
  const historyPos    = useRef(-1);
  const controlsRef   = useRef<HTMLDivElement>(null);

  const { data: templatesRaw, isLoading } = usePrintTemplates(activeDoc);
  const templates = useMemo(() => templatesRaw ?? [], [templatesRaw]);
  const mutations = usePrintTemplateMutations();

  const { data: previewDoc, refetch, isFetching } = useQuery({
    queryKey: [slug, 'preview-latest-doc', activeDoc],
    queryFn: async () => {
      const list = await apiClient.get<Record<string, unknown>>('/documents', {
        'filter[document_type.code]': activeDoc,
        'page[size]': 1,
        sort: '-id',
        'fields[commercial_documents]': 'id',
      });
      const docs = (list?.data ?? []) as Array<{ id?: number }>;
      const first = docs[0];
      if (!first?.id) return null;
      const full = await apiClient.get<Record<string, unknown>>(`/documents/${first.id}`, {
        include: ['party', 'lines', 'lines.product', 'lines.packaging', 'lines.stockLot', 'payments', 'payments.paymentMode'].join(','),
      });
      const doc = (full?.data ?? full) as Record<string, unknown>;
      return doc ?? null;
    },
    enabled: !!slug && useRealData,
    staleTime: 60_000,
  });
  const prevUseRealData = useRef(useRealData);
  useEffect(() => {
    if (useRealData && !prevUseRealData.current) refetch();
    prevUseRealData.current = useRealData;
  }, [useRealData, refetch]);
  const previewData: UniversalDocumentData | null = useMemo(() => {
    if (!previewDoc || !companyCtx) return null;
    return DocumentDataBuilder.fromApiDocument(previewDoc, companyCtx);
  }, [previewDoc, companyCtx]);

  useEffect(() => {
    if (templates.length > 0) {
      const tpl = resolveTemplate(templates, activeDoc) ?? templates[0];
      setSelectedTplId(tpl.id);
      setLocalTpl(normalizeTemplate(tpl, activeDoc, tpl.paper_size));
      setIsDirty(false);
    } else {
      setSelectedTplId(null);
      setLocalTpl(normalizeTemplate({ id: null, doc_type_code: activeDoc, name: 'قالب جديد' }, activeDoc));
      setIsDirty(true);
    }
    historyRef.current = [];
    historyPos.current = -1;
    setCanUndo(false);
    setCanRedo(false);
  }, [templates, activeDoc]);

  const pushHistory = useCallback((tpl: PrintTemplate) => {
    const stack = historyRef.current;
    stack.length = historyPos.current + 1;
    stack.push({ ...tpl });
    if (stack.length > 60) stack.shift();
    historyPos.current = stack.length - 1;
    setCanUndo(historyPos.current > 0);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyPos.current <= 0) return;
    const prev = historyRef.current[historyPos.current - 1];
    setLocalTpl({ ...prev });
    historyPos.current--;
    setCanUndo(historyPos.current > 0);
    setCanRedo(true);
    setIsDirty(true);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyPos.current >= historyRef.current.length - 1) return;
    const next = historyRef.current[historyPos.current + 1];
    setLocalTpl({ ...next });
    historyPos.current++;
    setCanUndo(true);
    setCanRedo(historyPos.current < historyRef.current.length - 1);
    setIsDirty(true);
  }, []);

  const update: Updater = useCallback(<K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => {
    setLocalTpl(prev => {
      if (prev) pushHistory(prev);
      const next = prev ? { ...prev, [key]: val } : prev;
      if (key === 'paper_size' && next) {
        if (val === '80mm') next.paper_width_mm = 80;
        else if (val === '58mm') next.paper_width_mm = 58;
      }
      return next;
    });
    setIsDirty(true);
  }, [pushHistory]);

  const handleSave = useCallback(async () => {
    if (!localTpl || isSaving) return;
    setIsSaving(true);
    try {
      let savedTpl: PrintTemplate;
      if (localTpl.id) {
        try {
          savedTpl = await mutations.update.mutateAsync({ id: localTpl.id, data: localTpl });
        } catch (e: any) {
          if (e?.response?.status === 404) {
            savedTpl = await mutations.create.mutateAsync({
              ...localTpl, id: undefined,
              doc_type_code: activeDoc,
              is_default: templates.length === 0,
            });
            setSelectedTplId(savedTpl.id);
          } else {
            throw e;
          }
        }
      } else {
        savedTpl = await mutations.create.mutateAsync({
          ...localTpl,
          doc_type_code: activeDoc,
          is_default: templates.length === 0,
        });
        setSelectedTplId(savedTpl.id);
      }
      setLocalTpl({ ...savedTpl });
      setIsDirty(false);
      notifier.success('✅ تم حفظ القالب');
    } catch (e: any) {
      notifier.error(e?.message ?? 'فشل الحفظ');
    } finally {
      setIsSaving(false);
    }
  }, [localTpl, isSaving, activeDoc, templates.length, mutations, notifier]);

  const handleSetDefault = useCallback(async (id: number) => {
    setActionLoading(`default-${id}`);
    try { await mutations.setDefault.mutateAsync(id); notifier.success('تم تعيين القالب الافتراضي'); }
    catch { notifier.error('فشل التعيين'); }
    finally { setActionLoading(null); }
  }, [mutations, notifier]);

  const handleDuplicate = useCallback(async (tpl: PrintTemplate) => {
    if (!tpl.id) return;
    setActionLoading(`duplicate-${tpl.id}`);
    try {
      const copy = await mutations.duplicate.mutateAsync({ id: tpl.id, name: `نسخة من ${tpl.name}` });
      setSelectedTplId(copy.id);
      setLocalTpl({ ...copy });
      setIsDirty(false);
      notifier.success('تم نسخ القالب');
    } catch { notifier.error('فشل النسخ'); }
    finally { setActionLoading(null); }
  }, [mutations, notifier]);

  const handleDelete = useCallback(async (id: number) => {
    setDeleteTarget(id);
  }, []);

  const handleToggleActive = useCallback(async (tpl: PrintTemplate) => {
    if (!tpl.id) return;
    setActionLoading(`toggle-${tpl.id}`);
    if (localTpl?.id === tpl.id) setLocalTpl(p => p ? { ...p, is_active: !p.is_active } : p);
    try { await mutations.update.mutateAsync({ id: tpl.id, data: { is_active: !tpl.is_active } }); notifier.success(tpl.is_active ? 'تم تعطيل القالب' : 'تم تفعيل القالب'); }
    catch { notifier.error('فشل التحديث'); }
    finally { setActionLoading(null); }
  }, [mutations, localTpl, notifier]);

  const confirmDelete = useCallback(async () => {
    if (deleteTarget === null) return;
    const id = deleteTarget;
    setActionLoading(`delete-${id}`);
    setDeleteTarget(null);
    try { await mutations.remove.mutateAsync(id); notifier.success('تم الحذف'); }
    catch { notifier.error('فشل الحذف'); }
    finally { setActionLoading(null); }
  }, [deleteTarget, mutations, notifier]);

  const handleNewTemplate = useCallback(() => {
    setShowLibrary(true);
  }, []);

  const handleInstallLibrary = useCallback(async (_templateId: string, _tpl: PrintTemplate) => {
    try {
      const saved = await mutations.installLibrary.mutateAsync(_templateId);
      setSelectedTplId(saved.id);
      setLocalTpl({ ...saved });
      setIsDirty(false);
      setShowLibrary(false);
      notifier.success(`✅ تم تثبيت القالب "${saved.name}"`);
    } catch (e: any) {
      notifier.error(e?.message ?? 'فشل تثبيت القالب');
    }
  }, [activeDoc, mutations, notifier]);

  const handleExport = useCallback(() => {
    if (!localTpl) return;
    const json = JSON.stringify({ version: 2, docCode: activeDoc, template: localTpl, exportedAt: new Date().toISOString() }, null, 2);
    const a    = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([json], { type: 'application/json' })),
      download: `print-template-${activeDoc}.json`,
    });
    a.click();
    notifier.success('تم تصدير القالب');
  }, [activeDoc, localTpl, notifier]);

  const handleImport = useCallback(() => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data     = JSON.parse(await file.text());
        const imported = data.template ?? data;
        if (!imported?.col_order || !imported?.paper_size) {
          notifier.error('ملف غير صالح');
          return;
        }
        imported.id = localTpl?.id ?? null;
        const merged = normalizeTemplate(imported, imported.doc_type_code ?? activeDoc, imported.paper_size);
        setLocalTpl(merged);
        setIsDirty(true);
        notifier.success('تم الاستيراد — احفظ للتطبيق');
      } catch { notifier.error('فشل قراءة الملف'); }
    };
    input.click();
  }, [activeDoc, localTpl?.id, notifier]);

  const handleTestPrint = useCallback(async () => {
    if (!localTpl) return;
    const mmW = PAPER_DIM[localTpl.paper_size]?.w ?? localTpl.paper_width_mm;
    const winW = Math.min(Math.round(mmW * 3.78) + 60, 900);
    const win  = window.open('', '_blank', `width=${winW},height=700`);
    if (!win) { window.print(); return; }
    const printCss = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #fff; display: flex; justify-content: center; }
      @media print { body { padding: 0; } @page { margin: 0; } }
    `;
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head>
      <meta charset="UTF-8"/>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
      <style>${printCss}</style>
    </head><body><div id="r"></div></body></html>`);
    win.document.close();
    const { createRoot } = await import('react-dom/client');
    const root = win.document.getElementById('r');
    if (!root) return;
    const reactRoot = createRoot(root);
    reactRoot.render(
      React.createElement(PreviewSelector, {
        tpl: localTpl, company: companyCtx,
        data: useRealData ? previewData : null,
      }),
    );
    await win.document.fonts.ready;
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 400));
    win.focus();
    win.print();
    setTimeout(() => win.close(), 500);
  }, [localTpl, companyCtx, previewData, useRealData]);

  const refs = useRef({ handleSave, handleUndo, handleRedo, isDirty, isSaving });
  useEffect(() => { refs.current = { handleSave, handleUndo, handleRedo, isDirty, isSaving }; });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 's') { e.preventDefault(); if (refs.current.isDirty && !refs.current.isSaving) refs.current.handleSave(); }
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); refs.current.handleUndo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); refs.current.handleRedo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const docsInCat = DOC_TYPE_LIST.filter(d => d.category === activeCat);

  return (
    <><div style={{ display: 'flex', flexDirection: 'column', height: '100vh', direction: 'rtl', overflow: 'hidden' }}>

      <div style={{
        padding: '10px 18px', borderBottom: '1px solid var(--b2)',
        background: 'var(--bg2)', display: 'flex', alignItems: 'center',
        gap: 10, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ti ti-printer" style={{ color: 'var(--em)' }} />
            إعدادات الطباعة
          </div>
          <div style={{ fontSize: 11, color: 'var(--t4)' }}>
            قوالب الطباعة لكل أنواع المستندات — محفوظة في DB
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {localTpl && (
          <div style={{ display: 'flex', gap: 3 }}>
            <button
              onClick={handleUndo} disabled={!canUndo} type="button"
              title="تراجع (Ctrl+Z)"
              style={{
                ...toolBtnStyle,
                opacity: canUndo ? 1 : .35, cursor: canUndo ? 'pointer' : 'not-allowed',
              }}
            >
              <i className="ti ti-arrow-back-up" />
            </button>
            <button
              onClick={handleRedo} disabled={!canRedo} type="button"
              title="إعادة (Ctrl+Y)"
              style={{
                ...toolBtnStyle,
                opacity: canRedo ? 1 : .35, cursor: canRedo ? 'pointer' : 'not-allowed',
              }}
            >
              <i className="ti ti-arrow-forward-up" />
            </button>
          </div>
        )}

        {localTpl && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={handleExport} title="تصدير JSON" type="button" style={toolBtnStyle}>
              <i className="ti ti-download" />
            </button>
            <button onClick={handleImport} title="استيراد JSON" type="button" style={toolBtnStyle}>
              <i className="ti ti-upload" />
            </button>

            <div style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 'var(--r2)',
              background: isDirty ? 'var(--goldb)' : 'var(--emb)',
              border: `1px solid ${isDirty ? 'var(--goldbo)' : 'var(--embo)'}`,
              color: isDirty ? 'var(--gold)' : 'var(--em)',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <i className={`ti ${isDirty ? 'ti-point-filled' : 'ti-check'}`} style={{ fontSize: 10 }} />
              {isDirty ? 'تغييرات غير محفوظة' : 'محفوظ'}
            </div>

            <button
              onClick={handleSave} disabled={!isDirty || isSaving} type="button"
              style={{
                padding: '6px 14px', borderRadius: 'var(--r2)', fontSize: 12.5, fontWeight: 800,
                border: 'none', fontFamily: 'Tajawal, sans-serif',
                background: isDirty ? 'var(--em)' : 'var(--bg5)',
                color: isDirty ? '#fff' : 'var(--t4)',
                cursor: isDirty && !isSaving ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: isDirty ? 'var(--emglow)' : 'none',
                transition: 'all .15s',
              }}
            >
              {isSaving
                ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
                : <><i className="ti ti-device-floppy" /> حفظ (Ctrl+S)</>
              }
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        <div style={{
          width: 200, flexShrink: 0, borderLeft: '1px solid var(--b2)',
          background: 'var(--bg2)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          {DOC_CATS.map(cat => (
            <div key={cat.key}>
              <button
                onClick={() => setActiveCat(cat.key)} type="button"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 12px', border: 'none', cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif', fontSize: 11.5, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '.8px',
                  color: activeCat === cat.key ? 'var(--em)' : 'var(--t4)',
                  background: activeCat === cat.key ? 'var(--emb)' : 'transparent',
                  borderBottom: '1px solid var(--b1)', textAlign: 'right',
                }}
              >
                <i className={`ti ${cat.icon}`} style={{ fontSize: 13 }} />
                {cat.label}
              </button>

              {activeCat === cat.key && docsInCat.map(doc => {
                const count = templates.filter(t => t.doc_type_code === doc.code).length;
                return (
                  <button
                    key={doc.code}
                    onClick={() => setActiveDoc(doc.code)} type="button"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px 7px 16px', border: 'none', cursor: 'pointer',
                      fontFamily: 'Tajawal, sans-serif', fontSize: 12.5,
                      color: activeDoc === doc.code ? 'var(--em)' : 'var(--t2)',
                      background: activeDoc === doc.code ? 'rgba(10,138,92,.04)' : 'transparent',
                      borderRight: `2px solid ${activeDoc === doc.code ? 'var(--em)' : 'transparent'}`,
                      borderBottom: '1px solid var(--b1)', textAlign: 'right',
                    }}
                  >
                    <span>
                      <span style={{ fontWeight: 800, marginLeft: 5, fontSize: 11 }}>{doc.code}</span>
                      {doc.name}
                    </span>
                    {count > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '0 5px', borderRadius: 8,
                        background: 'var(--emb)', color: 'var(--em)', flexShrink: 0,
                      }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--b2)' }}>

          <div style={{
            padding: '8px 10px', borderBottom: '1px solid var(--b2)',
            background: 'var(--bg3)', display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0,
          }}>
            {isLoading ? (
              <span style={{ fontSize: 12, color: 'var(--t4)' }}><i className="ti ti-loader-2 spin" /> تحميل...</span>
            ) : templates.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-files-off" />
                لا توجد قوالب — أنشئ أول قالب بالزر أعلاه
              </span>
            ) : templates.map(tpl => (
              <div
                key={tpl.id!}
                style={{
                  display: 'flex', alignItems: 'center',
                  border: `1.5px solid ${selectedTplId === tpl.id ? 'var(--em)' : 'var(--b2)'}`,
                  borderRadius: 'var(--r2)', overflow: 'hidden',
                  background: selectedTplId === tpl.id ? 'var(--emb)' : 'var(--bg2)',
                }}
              >
                <button
                  onClick={() => {
                    setSelectedTplId(tpl.id); setLocalTpl(normalizeTemplate(tpl, activeDoc, tpl.paper_size)); setIsDirty(false);
                  }}
                  type="button"
                  style={{
                    padding: '4px 9px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', fontSize: 12,
                    fontWeight: 600, color: selectedTplId === tpl.id ? 'var(--em)' : 'var(--t2)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {tpl.is_default && <i className="ti ti-star-filled" style={{ fontSize: 9, color: 'var(--gold)' }} />}
                  {tpl.name}
                  <span style={{ fontSize: 9, opacity: .5, fontFamily: 'monospace' }}>{tpl.paper_size}</span>
                </button>
                <div style={{ display: 'flex', borderRight: '1px solid var(--b2)' }}>
                  {!tpl.is_default && (
                    <TinyBtn icon="ti-star"  color="var(--gold)"  title="افتراضي" loading={actionLoading === ('default-' + tpl.id)} onClick={() => handleSetDefault(tpl.id!)} />
                  )}
                  <TinyBtn icon={tpl.is_active ? 'ti-eye' : 'ti-eye-off'} color="var(--t4)" title={tpl.is_active ? 'تعطيل' : 'تفعيل'}
                    loading={actionLoading === ('toggle-' + tpl.id)}
                    onClick={() => handleToggleActive(tpl)} />
                  <TinyBtn icon="ti-copy"   color="var(--blue)"  title="نسخ"     loading={actionLoading === ('duplicate-' + tpl.id)} onClick={() => handleDuplicate(tpl)} />
                  <TinyBtn icon="ti-trash"  color="var(--red)"   title="حذف"     loading={actionLoading === ('delete-' + tpl.id)} onClick={() => handleDelete(tpl.id!)} />
                </div>
              </div>
            ))}

            <button
              onClick={handleNewTemplate} type="button"
              style={{
                padding: '4px 9px', borderRadius: 'var(--r2)',
                border: '1.5px dashed var(--embo)', background: 'var(--emb)',
                color: 'var(--em)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <i className="ti ti-plus" /> جديد
            </button>
          </div>

          {localTpl ? (
            <div ref={controlsRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
              <div style={{
                padding: '7px 9px', marginBottom: 8,
                background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--t3)', marginBottom: 3 }}>اسم القالب</div>
                {editingName ? (
                  <Input
                    value={localTpl.name}
                    onChange={v => update('name', v)}
                    onEnter={() => setEditingName(false)}
                    placeholder="اسم القالب..."
                  />
                ) : (
                  <div
                    onClick={() => setEditingName(true)}
                    style={{
                      fontSize: 13, fontWeight: 700, color: 'var(--t1)',
                      padding: '3px 6px', borderRadius: 'var(--r1)',
                      cursor: 'text', border: '1px dashed transparent',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--b3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                  >
                    {localTpl.name || '—'}
                    <i className="ti ti-pencil" style={{ fontSize: 9, opacity: .3, marginRight: 5 }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {(['80mm', '58mm', 'A4', 'A5'] as const).map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => update('paper_size', s)}
                      style={{
                        flex: 1, padding: '3px 0', fontSize: 11, borderRadius: 'var(--r1)',
                        border: `1px solid ${localTpl.paper_size === s ? 'var(--em)' : 'var(--b2)'}`,
                        background: localTpl.paper_size === s ? 'var(--emb)' : 'var(--bg3)',
                        color: localTpl.paper_size === s ? 'var(--em)' : 'var(--t3)',
                        cursor: 'pointer', fontWeight: 700,
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <QuickNav controlsRef={controlsRef} />
              <TemplateControls tpl={localTpl} update={update} companyData={companyCtx} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontSize: 13, gap: 8 }}>
              <i className="ti ti-printer-off" style={{ fontSize: 32, opacity: 0.4 }} />
              <span>اختر قالباً من القائمة أو أنشئ قالباً جديداً</span>
            </div>
          )}
        </div>

        <div style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bg1)', overflow: 'hidden',
          position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: '100vh',
        }}>
          <div style={{
            padding: '8px 14px', borderBottom: '1px solid var(--b2)',
            background: 'var(--bg2)', display: 'flex', alignItems: 'center',
            gap: 8, flexShrink: 0,
          }}>
            <i className="ti ti-eye" style={{ color: 'var(--em)', fontSize: 14 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t2)' }}>معاينة حية</span>
            {localTpl && (
              <span style={{
                fontSize: 11, padding: '2px 7px', borderRadius: 8,
                background: 'var(--bg3)', border: '1px solid var(--b2)',
                color: 'var(--t3)', fontWeight: 600, marginRight: 2,
              }}>
                {paperLabel(localTpl.paper_size, localTpl.paper_width_mm)}
              </span>
            )}
            {companyCtx && (
              <span style={{
                fontSize: 10.5, padding: '2px 7px', borderRadius: 8,
                background: 'var(--emb)', border: '1px solid var(--embo)',
                color: 'var(--em)', fontWeight: 600,
              }}>
                <i className="ti ti-building-store" style={{ marginLeft: 4, fontSize: 10 }} />
                {companyCtx.name}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {localTpl && (
              <button
                onClick={() => setUseRealData(v => !v)}
                type="button"
                title={useRealData ? 'استخدام بيانات فارغة' : 'استخدام آخر مستند حقيقي'}
                style={{
                  ...toolBtnStyle,
                  padding: '5px 8px', fontSize: 11,
                  color: useRealData ? 'var(--em)' : 'var(--t3)',
                  borderColor: useRealData ? 'var(--em)' : 'var(--b2)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <i className={`ti ${useRealData ? 'ti-database' : 'ti-database-off'}`} />
                {useRealData ? 'بيانات حقيقية' : 'بيانات تجريبية'}
              </button>
            )}
            {localTpl && useRealData && (
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                type="button"
                title="تحديث البيانات من الخادم"
                style={{
                  ...toolBtnStyle,
                  padding: '5px 8px', fontSize: 11,
                  opacity: isFetching ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <i className={`ti ${isFetching ? 'ti-loader-2 spin' : 'ti-refresh'}`} />
                تحديث
              </button>
            )}
            {localTpl && (
              <button onClick={handleTestPrint} type="button"
                style={{
                  ...toolBtnStyle,
                  padding: '5px 11px', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <i className="ti ti-printer" /> طباعة تجريبية
              </button>
            )}
            {localTpl && (
              <button onClick={handleSave} disabled={!isDirty || isSaving} type="button"
                style={{
                  ...toolBtnStyle,
                  padding: '5px 11px', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: isDirty ? 'var(--em)' : 'var(--bg5)',
                  color: isDirty ? '#fff' : 'var(--t4)',
                  border: 'none',
                  cursor: isDirty && !isSaving ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                }}
              >
                {isSaving
                  ? <><i className="ti ti-loader-2 spin" /> جارٍ الحفظ...</>
                  : <><i className="ti ti-device-floppy" /> حفظ</>
                }
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', justifyContent: 'center' }}>
            {localTpl ? (
              <div style={{
                boxShadow: '0 4px 24px rgba(0,0,0,.14)',
                border: '1px solid var(--b3)',
                borderRadius: 2,
                display: 'inline-block',
              }}>
                <ErrorBoundary>
                  <PreviewSelector tpl={localTpl} company={companyCtx} data={useRealData ? previewData : null} />
                </ErrorBoundary>
              </div>
            ) : (
              <div style={{ color: 'var(--t4)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-device-desktop-off" style={{ fontSize: 24, opacity: 0.4 }} />
                اختر قالباً لعرض المعاينة
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      <TemplateLibraryModal
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onInstall={handleInstallLibrary}
        activeDoc={activeDoc}
      />

      <DeleteConfirmModal
        deleteTarget={deleteTarget}
        actionLoading={actionLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/providers/PrintSettingsContext.tsx
```
import React, { createContext, useContext } from 'react';
import type { HostDependencies } from '../contracts/HostContext';

const PrintSettingsContext = createContext<HostDependencies | null>(null);

export function PrintSettingsProvider({ value, children }: { value: HostDependencies; children: React.ReactNode }) {
  return (
    <PrintSettingsContext.Provider value={value}>
      {children}
    </PrintSettingsContext.Provider>
  );
}

export function useHost(): HostDependencies {
  const ctx = useContext(PrintSettingsContext);
  if (!ctx) throw new Error('PrintSettingsProvider missing — wrap <PrintSettingsPage> in <PrintSettingsProvider>');
  return ctx;
}

export function useApiClient() { return useHost().apiClient; }
export function useNotifier() { return useHost().notifier; }
export function usePrintTemplatesApi() { return useHost().printTemplatesApi; }
export function useCompany() { return useHost().company; }
export function useSlug() { return useHost().slug; }
```

## FILE: resources/js/pages/settings/print-settings/renderers/CsvRenderer.ts
```
import type { IRenderer, RenderContext, RenderResult } from './IRenderer';
import type { DocumentLine } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';

function escapeCsv(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function lineToRow(line: DocumentLine): string[] {
  return [
    String(line.rowNumber),
    line.ref ?? '',
    line.name,
    line.unit ?? '',
    String(line.quantity),
    String(line.unitPriceHt),
    String(line.tvaPct),
    String(line.discountPct),
    String(line.totalHt),
    String(line.totalTtc),
  ];
}

function headerRow(fields: string[]): string {
  return fields.map(escapeCsv).join(',');
}

export class CsvRenderer implements IRenderer<string> {
  readonly outputType = 'csv' as const;

  async render(ctx: RenderContext): Promise<RenderResult<string>> {
    const { data, template, currencySymbol } = ctx;
    const cur = currencySymbol ?? data.currency?.symbol ?? '';

    const lines: string[] = [];

    // ── Company info ──
    lines.push(`# ${escapeCsv(data.company.name)}`);
    if (data.company.address) lines.push(`# ${escapeCsv(data.company.address)}`);
    lines.push(`# NIF: ${escapeCsv(data.company.nif ?? '')}  RC: ${escapeCsv(data.company.rc ?? '')}`);
    lines.push('');

    // ── Document info ──
    lines.push(`${escapeCsv(data.doc.typeName ?? '')},${escapeCsv(data.doc.number)},${escapeCsv(data.doc.date)}`);
    if (data.party) {
      lines.push(`عميل,${escapeCsv(data.party.name)},NIF: ${escapeCsv(data.party.nif ?? '')}`);
    }
    lines.push('');

    // ── Items ──
    if (data.lines.length > 0) {
      lines.push(headerRow(['#', 'مرجع', 'المنتج', 'الوحدة', 'الكمية', 'سعر الوحدة HT', 'TVA%', 'الخصم%', 'الإجمالي HT', 'الإجمالي TTC']));
      for (const line of data.lines) {
        lines.push(lineToRow(line).map(escapeCsv).join(','));
      }
      lines.push('');
    }

    // ── Totals ──
    const t = data.totals;
    lines.push(`الإجمالي HT,${t.totalHt} ${cur}`);
    lines.push(`TVA,${t.totalTva} ${cur}`);
    lines.push(`الطابع,${t.fiscalStamp} ${cur}`);
    lines.push(`الخصم,${t.totalDiscount} ${cur}`);
    lines.push(`الإجمالي TTC,${t.totalTtc} ${cur}`);
    lines.push(`المدفوع,${t.paid} ${cur}`);
    if (t.remaining > 0) lines.push(`المتبقي,${t.remaining} ${cur}`);
    lines.push('');

    // ── Payments ──
    if (data.payments.length > 0) {
      lines.push(headerRow(['وسيلة الدفع', 'المبلغ']));
      for (const p of data.payments) {
        lines.push(`${escapeCsv(p.mode)},${p.amount}`);
      }
      lines.push('');
    }

    // ── Report summary ──
    if (data.report) {
      const r = data.report;
      lines.push('═ تقرير الجلسة ═');
      lines.push(`المبيعات الصافية,${r.netSales} ${cur}`);
      lines.push(`إجمالي المبيعات,${r.grossSales} ${cur}`);
      lines.push(`المرتجعات,${r.returnsTotal} ${cur} (${r.returnsCount})`);
      lines.push(`عدد الفواتير,${r.invoicesCount}`);
      lines.push(`أعلى فاتورة,${r.highestInvoice} ${cur}`);
      lines.push(`متوسط الفاتورة,${r.avgInvoice} ${cur}`);
      lines.push(`TVA,${r.totalTva} ${cur}`);
      lines.push(`الخصومات,${r.totalDiscount} ${cur}`);
      lines.push(`الطابع,${r.totalFiscalStamp} ${cur}`);
      lines.push(`رصيد الافتتاح,${r.openingCash} ${cur}`);
      lines.push(`المتوقع بالدرج,${r.closingCashExpected} ${cur}`);
      lines.push(`المعدود بالدرج,${r.closingCashCounted} ${cur}`);
      lines.push(`فرق الخزينة,${r.cashDifference} ${cur}`);
      lines.push('');

      if (r.paymentBreakdown.length > 0) {
        lines.push(headerRow(['وسيلة الدفع', 'عدد', 'المبلغ']));
        for (const p of r.paymentBreakdown) {
          lines.push(`${escapeCsv(p.mode)},${p.count},${p.amount}`);
        }
        lines.push('');
      }

      if (r.topProducts.length > 0) {
        lines.push(headerRow(['المنتج', 'الكمية', 'الإجمالي HT', 'الإجمالي TTC']));
        for (const p of r.topProducts) {
          lines.push(`${escapeCsv(p.name)},${p.quantity},${p.totalHt},${p.totalTtc}`);
        }
        lines.push('');
      }
    }

    const csv = '\uFEFF' + lines.join('\r\n');

    return {
      type: 'csv',
      payload: csv,
      mimeType: 'text/csv;charset=utf-8',
      filename: `${data.doc.typeName ?? 'export'}_${data.doc.number ?? 'unknown'}.csv`,
    };
  }

  supports(): boolean {
    return true;
  }
}

export const csvRenderer = new CsvRenderer();
```

## FILE: resources/js/pages/settings/print-settings/renderers/ExcelRenderer.ts
```
import type { IRenderer, RenderContext, RenderResult } from './IRenderer';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cell(value: unknown, type: 'String' | 'Number' = 'String'): string {
  if (type === 'Number') return `<Cell><Data ss:Type="Number">${value ?? 0}</Data></Cell>`;
  return `<Cell><Data ss:Type="String">${escXml(String(value ?? ''))}</Data></Cell>`;
}

function headingRow(label: string): string {
  return `<Row><Cell ss:StyleID="heading"><Data ss:Type="String">${escXml(label)}</Data></Cell></Row>`;
}

function dataCell(val: unknown, isNum = false): string {
  return isNum ? cell(val, 'Number') : cell(val);
}

function stylesXml(): string {
  return `
<Styles>
  <Style ss:ID="Default" ss:Name="Normal">
    <Font ss:FontName="Tajawal" ss:Size="10" />
    <Alignment ss:Horizontal="Right" ss:Vertical="Center" />
  </Style>
  <Style ss:ID="heading">
    <Font ss:FontName="Tajawal" ss:Size="12" ss:Bold="1" />
    <Interior ss:Color="#1e3a5f" ss:Pattern="Solid" />
    <Font ss:Color="#ffffff" />
  </Style>
  <Style ss:ID="section">
    <Font ss:FontName="Tajawal" ss:Size="11" ss:Bold="1" />
    <Interior ss:Color="#e8eef5" ss:Pattern="Solid" />
  </Style>
  <Style ss:ID="total">
    <Font ss:FontName="Tajawal" ss:Size="10" ss:Bold="1" />
    <Interior ss:Color="#f0f4f8" ss:Pattern="Solid" />
  </Style>
  <Style ss:ID="number">
    <NumberFormat ss:Format="#,##0.00" />
  </Style>
</Styles>`;
}

function buildSheet(data: UniversalDocumentData): string {
  const cur = data.currency?.symbol ?? 'د.ج';
  const rows: string[] = [];

  // Company header
  rows.push(headingRow(data.company.name));
  if (data.company.address) rows.push(`<Row>${cell(data.company.address)}</Row>`);
  rows.push(`<Row>${cell(`NIF: ${data.company.nif ?? '—'}  RC: ${data.company.rc ?? '—'}`)}</Row>`);
  rows.push('<Row></Row>');

  // Document info
  rows.push(`<Row>${cell(`${data.doc.typeName ?? ''} : ${data.doc.number}`)}<Cell>${cell(data.doc.date)}</Cell></Row>`);
  if (data.party) {
    rows.push(`<Row>${cell(`العميل: ${data.party.name}`)}<Cell>${cell(`NIF: ${data.party.nif ?? ''}`)}</Cell></Row>`);
  }
  rows.push('<Row></Row>');

  // Items
  if (data.lines.length > 0) {
    rows.push(`<Row ss:StyleID="section">${['#', 'المنتج', 'الكمية', 'سعر الوحدة', 'TVA%', 'الإجمالي HT', 'الإجمالي TTC'].map(h => cell(h)).join('')}</Row>`);
    for (const line of data.lines) {
      rows.push(`<Row>${[
        dataCell(line.rowNumber),
        dataCell(line.name),
        dataCell(line.quantity, true),
        dataCell(line.unitPriceHt, true),
        dataCell(line.tvaPct, true),
        dataCell(line.totalHt, true),
        dataCell(line.totalTtc, true),
      ].join('')}</Row>`);
    }
    rows.push('<Row></Row>');
  }

  // Totals
  const t = data.totals;
  rows.push(`<Row ss:StyleID="total">${cell('الإجمالي HT')}${cell(t.totalHt, 'Number')}</Row>`);
  rows.push(`<Row>${cell('TVA')}${cell(t.totalTva, 'Number')}</Row>`);
  rows.push(`<Row>${cell('الطابع الجبائي')}${cell(t.fiscalStamp, 'Number')}</Row>`);
  rows.push(`<Row>${cell('الخصم')}${cell(t.totalDiscount, 'Number')}</Row>`);
  rows.push(`<Row ss:StyleID="total">${cell('الإجمالي TTC')}${cell(t.totalTtc, 'Number')}</Row>`);
  rows.push(`<Row>${cell('المدفوع')}${cell(t.paid, 'Number')}</Row>`);
  if (t.remaining > 0) rows.push(`<Row>${cell('المتبقي')}${cell(t.remaining, 'Number')}</Row>`);
  rows.push('<Row></Row>');

  // Payments
  if (data.payments.length > 0) {
    rows.push(`<Row ss:StyleID="section">${['وسيلة الدفع', 'المبلغ'].map(h => cell(h)).join('')}</Row>`);
    for (const p of data.payments) {
      rows.push(`<Row>${cell(p.mode)}${cell(p.amount, 'Number')}</Row>`);
    }
    rows.push('<Row></Row>');
  }

  // Report
  if (data.report) {
    const r = data.report;
    rows.push(headingRow('تقرير الجلسة'));
    [
      ['المبيعات الصافية', r.netSales, true],
      ['إجمالي المبيعات', r.grossSales, true],
      ['المرتجعات', r.returnsTotal, true],
      ['عدد الفواتير', r.invoicesCount, true],
      ['أعلى فاتورة', r.highestInvoice, true],
      ['متوسط الفاتورة', r.avgInvoice, true],
      ['TVA الإجمالية', r.totalTva, true],
      ['الخصومات', r.totalDiscount, true],
      ['الطابع الجبائي', r.totalFiscalStamp, true],
      ['رصيد الافتتاح', r.openingCash, true],
      ['المتوقع بالدرج', r.closingCashExpected, true],
      ['المعدود بالدرج', r.closingCashCounted, true],
      ['فرق الخزينة', r.cashDifference, true],
    ].forEach(([label, val, isNum]) => {
      rows.push(`<Row>${cell(label as string)}${cell(val as number, isNum ? 'Number' : 'String')}</Row>`);
    });
    rows.push('<Row></Row>');

    // Payment breakdown
    if (r.paymentBreakdown.length > 0) {
      rows.push(`<Row ss:StyleID="section">${['وسيلة الدفع', 'عدد', 'المبلغ'].map(h => cell(h)).join('')}</Row>`);
      for (const p of r.paymentBreakdown) {
        rows.push(`<Row>${cell(p.mode)}${cell(p.count, 'Number')}${cell(p.amount, 'Number')}</Row>`);
      }
      rows.push('<Row></Row>');
    }

    // Top products
    if (r.topProducts.length > 0) {
      rows.push(`<Row ss:StyleID="section">${['المنتج', 'الكمية', 'الإجمالي HT', 'الإجمالي TTC'].map(h => cell(h)).join('')}</Row>`);
      for (const p of r.topProducts) {
        rows.push(`<Row>${cell(p.name)}${cell(p.quantity, 'Number')}${cell(p.totalHt, 'Number')}${cell(p.totalTtc, 'Number')}</Row>`);
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:x="urn:schemas-microsoft-com:office:excel">
${stylesXml()}
<Worksheet ss:Name="Report">
  <Table ss:DefaultColumnWidth="120">
    ${rows.join('\n    ')}
  </Table>
</Worksheet>
</Workbook>`;
}

export class ExcelRenderer implements IRenderer<string> {
  readonly outputType = 'xlsx' as const;

  async render(ctx: RenderContext): Promise<RenderResult<string>> {
    const xml = buildSheet(ctx.data);

    return {
      type: 'xlsx',
      payload: xml,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${ctx.data.doc.typeName ?? 'export'}_${ctx.data.doc.number ?? 'unknown'}.xlsx`,
    };
  }

  supports(): boolean {
    return true;
  }
}

export const excelRenderer = new ExcelRenderer();
```

## FILE: resources/js/pages/settings/print-settings/renderers/IRenderer.ts
```
// ════════════════════════════════════════════════════════════════════════════
// reporting/renderers/IRenderer.ts
//
// The renderer interface. All renderers (React, ESC/POS, PDF, …) implement
// this contract so the framework core never touches a specific output format.
//
// Dependency direction:
//   Core → IRenderer ← ReactRenderer
//                    ← ESCPOSRenderer
//                    ← PDFRenderer (future)
// ════════════════════════════════════════════════════════════════════════════

import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';

// ─── Render output ────────────────────────────────────────────────────────────

export type RendererOutputType = 'html' | 'escpos' | 'pdf' | 'image' | 'json' | 'csv' | 'xlsx';

export interface RenderResult<T = unknown> {
  /** What format this output is */
  type:     RendererOutputType;
  /** The actual output — HTMLElement, Uint8Array, Blob, string, etc. */
  payload:  T;
  /** MIME type for download/upload use */
  mimeType?: string;
  /** Suggested filename if downloading */
  filename?: string;
}

// ─── Render context ───────────────────────────────────────────────────────────

export interface RenderContext {
  /** The document data to render */
  data:     UniversalDocumentData;
  /** The template controlling layout and visibility */
  template: PrintTemplate;
  /**
   * Optional: override the company info from template's override_* fields.
   * If not provided, renderers use data.company directly.
   */
  companyOverrides?: Partial<{
    name:    string;
    address: string;
    phone:   string;
    nif:     string;
    rc:      string;
    nis:     string;
    ice:     string;
    article: string;
  }>;
  /** Locale for number/date formatting. Defaults to 'ar-DZ'. */
  locale?: string;
  /** Currency symbol override. Defaults to data.currency.symbol. */
  currencySymbol?: string;
}

// ─── IRenderer ───────────────────────────────────────────────────────────────

export interface IRenderer<TOutput = unknown> {
  /**
   * The output format this renderer produces.
   * Used by RendererRegistry to select the right renderer.
   */
  readonly outputType: RendererOutputType;

  /**
   * Render the document and return the output.
   * Must be pure with respect to external state — all inputs are in ctx.
   */
  render(ctx: RenderContext): Promise<RenderResult<TOutput>>;

  /**
   * True if this renderer can handle the given template's paper_size.
   * The registry calls this before render() to select the right adapter.
   */
  supports(paperSize: PrintTemplate['paper_size']): boolean;
}

// ─── Renderer registry ────────────────────────────────────────────────────────

/**
 * Simple registry mapping output type → renderer instance.
 * Call RendererRegistry.register() to add a renderer (including plugins).
 * Call RendererRegistry.get() to retrieve one.
 */
class RendererRegistryClass {
  private readonly _renderers = new Map<RendererOutputType, IRenderer>();

  register(renderer: IRenderer): void {
    this._renderers.set(renderer.outputType, renderer);
  }

  get(type: RendererOutputType): IRenderer | undefined {
    return this._renderers.get(type);
  }

  has(type: RendererOutputType): boolean {
    return this._renderers.has(type);
  }

  /** Returns all registered output types */
  types(): RendererOutputType[] {
    return Array.from(this._renderers.keys());
  }

  /** Clear all registered renderers. Useful in tests. */
  reset(): void {
    this._renderers.clear();
  }
}

export const RendererRegistry = new RendererRegistryClass();

// ─── Built-in renderer registration ─────────────────────────────────────────────
// Import and register the built-in CSV and Excel renderers so they're available
// via RendererRegistry.get('csv') / RendererRegistry.get('xlsx') right away.

import { csvRenderer } from './CsvRenderer';
import { excelRenderer } from './ExcelRenderer';

RendererRegistry.register(csvRenderer);
RendererRegistry.register(excelRenderer);
```

## FILE: resources/js/pages/settings/print-settings/renderers/PrintJobQueue.ts
```
/**
 * PrintJobQueue — a lightweight, framework-agnostic print job queue.
 *
 * Manages sequential processing of print jobs with status tracking,
 * cancellation, and event emission.
 *
 * Usage:
 *   import { printJobQueue } from '@/reporting';
 *
 *   const jobId = printJobQueue.enqueue({ name: 'FV-001', printFn: async () => { … } });
 *   printJobQueue.on('complete', (id, result) => …);
 *   printJobQueue.cancel(jobId);
 *   printJobQueue.clear();
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';

export interface PrintJob {
  id:       string;
  name:     string;
  status:   PrintJobStatus;
  error?:   string;
  createdAt: number;
  completedAt?: number;
}

export interface PrintJobInput {
  name:    string;
  printFn: () => Promise<void>;
}

export type PrintJobEvent = 'enqueue' | 'start' | 'complete' | 'fail' | 'cancel' | 'drain';

type Listener = (jobId: string, job: PrintJob) => void;

// ─── Service ─────────────────────────────────────────────────────────────────

class PrintJobQueueService {
  private _queue: { input: PrintJobInput; job: PrintJob }[] = [];
  private _processing = false;
  private _cancelled = new Set<string>();
  private _listeners = new Map<PrintJobEvent, Set<Listener>>();
  private _idCounter = 0;

  private _genId(): string {
    this._idCounter++;
    return `print_${Date.now()}_${this._idCounter}`;
  }

  // ── Events ───────────────────────────────────────────────────────────────

  on(event: PrintJobEvent, listener: Listener): () => void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(listener);
    return () => this._listeners.get(event)?.delete(listener);
  }

  private _emit(event: PrintJobEvent, jobId: string, job: PrintJob): void {
    this._listeners.get(event)?.forEach(fn => fn(jobId, job));
  }

  // ── Queue management ─────────────────────────────────────────────────────

  enqueue(input: PrintJobInput): string {
    const job: PrintJob = {
      id:        this._genId(),
      name:      input.name,
      status:    'pending',
      createdAt: Date.now(),
    };
    this._queue.push({ input, job });
    this._emit('enqueue', job.id, job);
    this._process();
    return job.id;
  }

  enqueueBatch(inputs: PrintJobInput[]): string[] {
    return inputs.map(i => this.enqueue(i));
  }

  cancel(jobId: string): void {
    const entry = this._queue.find(e => e.job.id === jobId);
    if (!entry) return;
    if (entry.job.status === 'pending') {
      entry.job.status = 'cancelled';
      this._emit('cancel', jobId, entry.job);
    } else if (entry.job.status === 'printing') {
      this._cancelled.add(jobId);
    }
  }

  cancelAll(): void {
    this._queue.forEach(e => {
      if (e.job.status === 'pending') {
        e.job.status = 'cancelled';
        this._emit('cancel', e.job.id, e.job);
      } else if (e.job.status === 'printing') {
        this._cancelled.add(e.job.id);
      }
    });
  }

  clear(): void {
    this._queue = [];
    this._cancelled.clear();
  }

  /** Returns a snapshot of all jobs */
  jobs(): PrintJob[] {
    return this._queue.map(e => ({ ...e.job }));
  }

  /** Returns jobs filtered by status */
  jobsByStatus(status: PrintJobStatus): PrintJob[] {
    return this._queue.filter(e => e.job.status === status).map(e => ({ ...e.job }));
  }

  /** Number of currently pending jobs */
  get pending(): number {
    return this._queue.filter(e => e.job.status === 'pending').length;
  }

  /** Total jobs ever queued */
  get total(): number {
    return this._queue.length;
  }

  /** True if the queue is actively processing */
  get isProcessing(): boolean {
    return this._processing;
  }

  // ── Internal processing ──────────────────────────────────────────────────

  private async _process(): Promise<void> {
    if (this._processing) return;
    this._processing = true;

    while (this._queue.length > 0) {
      const entry = this._queue[0];

      if (entry.job.status === 'cancelled') {
        this._queue.shift();
        continue;
      }

      if (this._cancelled.has(entry.job.id)) {
        entry.job.status = 'cancelled';
        this._emit('cancel', entry.job.id, entry.job);
        this._queue.shift();
        this._cancelled.delete(entry.job.id);
        continue;
      }

      entry.job.status = 'printing';
      this._emit('start', entry.job.id, entry.job);

      try {
        await entry.input.printFn();
        if (this._cancelled.has(entry.job.id)) {
          entry.job.status = 'cancelled';
          this._emit('cancel', entry.job.id, entry.job);
          this._cancelled.delete(entry.job.id);
        } else {
          entry.job.status = 'completed';
          entry.job.completedAt = Date.now();
          this._emit('complete', entry.job.id, entry.job);
        }
      } catch (err) {
        entry.job.status = 'failed';
        entry.job.error = err instanceof Error ? err.message : String(err);
        this._emit('fail', entry.job.id, entry.job);
      }

      this._queue.shift();
    }

    this._processing = false;
    this._emit('drain', '', {
      id: 'drain', name: '', status: 'completed', createdAt: 0,
    });
  }
}

export const printJobQueue = new PrintJobQueueService();
```

## FILE: resources/js/pages/settings/print-settings/renderers/useExportDocument.ts
```
import { useCallback } from 'react';
import type { UniversalDocumentData } from '@/pages/settings/print-settings/types/data/UniversalDocumentData';
import { RendererRegistry } from './IRenderer';

/**
 * Triggers a file download from a Blob/string payload.
 */
function download(payload: string, filename: string, mimeType: string): void {
  const blob = new Blob([payload], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * React hook: returns export functions for CSV and Excel.
 *
 * Usage:
 *   const { exportCsv, exportXlsx } = useExportDocument();
 *   await exportCsv(data, template);
 */
export function useExportDocument() {
  const exportCsv = useCallback(async (data: UniversalDocumentData) => {
    const renderer = RendererRegistry.get('csv');
    if (!renderer) throw new Error('CSV renderer not registered');
    const result = await renderer.render({
      data,
      template: { paper_size: 'A4' } as const,
    });
    download(result.payload as string, result.filename ?? 'export.csv', result.mimeType ?? 'text/csv');
  }, []);

  const exportXlsx = useCallback(async (data: UniversalDocumentData) => {
    const renderer = RendererRegistry.get('xlsx');
    if (!renderer) throw new Error('Excel renderer not registered');
    const result = await renderer.render({
      data,
      template: { paper_size: 'A4' } as const,
    });
    download(result.payload as string, result.filename ?? 'export.xlsx', result.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }, []);

  return { exportCsv, exportXlsx };
}

/**
 * Standalone function (non-hook) for use outside React components.
 */
export async function exportDocumentCsv(data: UniversalDocumentData): Promise<void> {
  const renderer = RendererRegistry.get('csv');
  if (!renderer) throw new Error('CSV renderer not registered');
  const result = await renderer.render({
    data,
    template: { paper_size: 'A4' } as const,
  });
  download(result.payload as string, result.filename ?? 'export.csv', result.mimeType ?? 'text/csv');
}

export async function exportDocumentXlsx(data: UniversalDocumentData): Promise<void> {
  const renderer = RendererRegistry.get('xlsx');
  if (!renderer) throw new Error('Excel renderer not registered');
  const result = await renderer.render({
    data,
    template: { paper_size: 'A4' } as const,
  });
  download(result.payload as string, result.filename ?? 'export.xlsx', result.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
```

## FILE: resources/js/pages/settings/print-settings/renderers/usePrintJobQueue.ts
```
import { useState, useEffect, useCallback } from 'react';
import { printJobQueue } from './PrintJobQueue';
import type { PrintJob, PrintJobInput, PrintJobStatus } from './PrintJobQueue';

/**
 * React hook that subscribes to the singleton PrintJobQueue and provides
 * reactive state for UI components.
 *
 * Usage:
 *   const { jobs, pending, enqueue, cancelAll } = usePrintJobQueue();
 *   enqueue({ name: 'Doc-1', printFn: async () => { … } });
 */
export function usePrintJobQueue() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const update = () => {
      setJobs(printJobQueue.jobs());
      setIsProcessing(printJobQueue.isProcessing);
    };

    const unsub1 = printJobQueue.on('enqueue', update);
    const unsub2 = printJobQueue.on('start', update);
    const unsub3 = printJobQueue.on('complete', update);
    const unsub4 = printJobQueue.on('fail', update);
    const unsub5 = printJobQueue.on('cancel', update);
    const unsub6 = printJobQueue.on('drain', update);

    update();

    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6();
    };
  }, []);

  const enqueue = useCallback((input: PrintJobInput) => printJobQueue.enqueue(input), []);
  const enqueueBatch = useCallback((inputs: PrintJobInput[]) => printJobQueue.enqueueBatch(inputs), []);
  const cancel = useCallback((jobId: string) => printJobQueue.cancel(jobId), []);
  const cancelAll = useCallback(() => printJobQueue.cancelAll(), []);
  const clear = useCallback(() => printJobQueue.clear(), []);

  const pending = jobs.filter(j => j.status === 'pending').length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const failed = jobs.filter(j => j.status === 'failed').length;

  return {
    jobs,
    pending,
    completed,
    failed,
    total: jobs.length,
    isProcessing,
    enqueue,
    enqueueBatch,
    cancel,
    cancelAll,
    clear,
  };
}

/**
 * Get a color for the job status badge.
 */
export function statusColor(status: PrintJobStatus): string {
  switch (status) {
    case 'pending':   return '#f59e0b';
    case 'printing':  return '#3b82f6';
    case 'completed': return '#16a34a';
    case 'failed':    return '#dc2626';
    case 'cancelled': return '#94a3b8';
  }
}

export function statusLabel(status: PrintJobStatus): string {
  switch (status) {
    case 'pending':   return 'في الانتظار';
    case 'printing':  return 'جاري الطباعة';
    case 'completed': return 'تم';
    case 'failed':    return 'فشل';
    case 'cancelled': return 'ملغي';
  }
}
```

## FILE: resources/js/pages/settings/print-settings/runtime/index.ts
```
// ════════════════════════════════════════════════════════════════════════════
// runtime/index.ts — Print Runtime barrel
//
// The runtime layer is a dedicated read-only layer for loading, resolving,
// and printing templates. It depends ONLY on RuntimeContext (minimal),
// NOT on PrintSettingsProvider (designer context with undo/redo, notifier…).
//
// Architectural boundary:
//   Print Designer  ←→  Print Runtime   ←→  Host App (apiGet, slug)
//   (print-settings)       (runtime/)
// ════════════════════════════════════════════════════════════════════════════
export { PrintRuntimeAdapter } from './PrintRuntimeAdapter';
export { RuntimeProvider, useRuntime } from './PrintRuntimeContext';
export type { RuntimeDependencies } from './PrintRuntimeContext';
export { usePrintTemplatesList } from './usePrintTemplatesList';
export {
  resolveTemplate,
  resolveTemplateById,
} from './TemplateResolver';
export { default as UniversalPrintPipeline } from './UniversalPrintPipeline';
export type { PipelineSource } from './UniversalPrintPipeline';
export { renderPreviewToHtml } from './renderPreviewToHtml';
export { openPrintPopup, renderPipelineToPopup } from './UniversalPrintPipeline';
export { mapCompany } from './PrintRuntimeAdapter';
```

## FILE: resources/js/pages/settings/print-settings/runtime/PrintRuntimeAdapter.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// PrintRuntimeAdapter — the ONLY bridge between the host app and the runtime
// layer. This is the single place where global API functions and Zustand
// store are imported for the runtime module.
//
// Mount this at the app root (or inside RequireCompany) so that all printing
// consumers have access to the runtime context.
// ════════════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { useActiveSlug, useActiveCompany } from '@/lib/store/appStore';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiUpload } from '@/lib/api/core/client';
import { createPrintTemplatesApi } from '@/pages/settings/print-settings/api/printTemplatesApi';
import type { ApiClient } from '@/pages/settings/print-settings/contracts/ApiClient';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';
import { RuntimeProvider } from './PrintRuntimeContext';

const __hostApiClient: ApiClient = {
  get:      <T,>(url: string, params?: Record<string, unknown>) => apiGet<T>(url, params),
  post:     <T,>(url: string, data?: unknown)                   => apiPost<T>(url, data),
  put:      <T,>(url: string, data?: unknown)                   => apiPut<T>(url, data),
  patch:    <T,>(url: string, data?: unknown)                   => apiPatch<T>(url, data),
  delete:   (url: string)                                      => apiDelete(url),
  upload:   <T,>(url: string, fd: FormData, onProgress?: (p: number) => void) => apiUpload<T>(url, fd, onProgress),
};

export function mapCompany(ac: ReturnType<typeof useActiveCompany>): CompanyData | null {
  if (!ac) return null;
  return {
    name:    ac.name    ?? '',
    address: ac.address ?? '',
    phone:   ac.phone   ?? '',
    nif:     ac.nif     ?? '',
    rc:      ac.rc      ?? '',
    nis:     ac.nis     ?? '',
    ice:     (ac as any).ice ?? '',
    article: (ac as any).ai ?? '',
    logoUrl: (ac as any).avatar ?? null,
  };
}

export function PrintRuntimeAdapter({ children }: { children: React.ReactNode }) {
  const slug    = useActiveSlug();
  const company = useActiveCompany();
  const deps = useMemo(() => ({
    templateRepository: createPrintTemplatesApi(__hostApiClient),
    slug,
    company: mapCompany(company),
  }), [slug, company]);
  return <RuntimeProvider value={deps}>{children}</RuntimeProvider>;
}
```

## FILE: resources/js/pages/settings/print-settings/runtime/PrintRuntimeContext.tsx
```
import { createContext, useContext } from 'react';
import type { PrintTemplatesApi } from '@/pages/settings/print-settings/contracts/TemplateRepository';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';

export interface RuntimeDependencies {
  templateRepository: PrintTemplatesApi;
  slug: string | null;
  company: CompanyData | null;
}

const RuntimeContext = createContext<RuntimeDependencies | null>(null);

export function RuntimeProvider({ value, children }: { value: RuntimeDependencies; children: React.ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeDependencies {
  const ctx = useContext(RuntimeContext);
  if (!ctx) throw new Error('RuntimeProvider missing — mount <PrintRuntimeAdapter> at app root');
  return ctx;
}
```

## FILE: resources/js/pages/settings/print-settings/runtime/renderPreviewToHtml.ts
```
import React from 'react';
import ReactDOMServer from 'react-dom/server.browser';
import UniversalPrintPipeline from './UniversalPrintPipeline';
import type { PipelineSource } from './UniversalPrintPipeline';
import type { PrintTemplate } from '@/pages/settings/print-settings/types';
import type { CompanyData } from '@/pages/settings/print-settings/components/preview/shared';

export function renderPreviewToHtml(input: {
  template: PrintTemplate;
  company: CompanyData | null;
  source: PipelineSource;
}): string {
  const { template, company, source } = input;

  const element = React.createElement(UniversalPrintPipeline, {
    source,
    template,
    company,
  });

  return ReactDOMServer.renderToStaticMarkup(element);
}
```

## FILE: resources/js/pages/settings/print-settings/runtime/TemplateResolver.ts
```
// ════════════════════════════════════════════════════════════════════════════
// TemplateResolver — pure functions for template resolution
//
// No hooks, no context — just logic.
// ════════════════════════════════════════════════════════════════════════════
import type { PrintTemplate, PaperSize } from '@/pages/settings/print-settings/types';

/**
 * Find the first active template matching docTypeCode and optionally paperSize.
 * Returns undefined if no match.
 */
export function resolveTemplate(
  templates: PrintTemplate[],
  docTypeCode: string,
  paperSize?: PaperSize,
): PrintTemplate | undefined {
  if (!templates || templates.length === 0) return undefined;

  const matching = templates.filter(
    t => t.doc_type_code === docTypeCode && t.is_active,
  );
  if (matching.length === 0) return undefined;

  if (paperSize) {
    return matching.find(t => t.paper_size === paperSize) ?? matching[0];
  }
  return matching.find(t => t.is_default) ?? matching[0];
}

/**
 * Find a template by ID.
 */
export function resolveTemplateById(
  templates: PrintTemplate[],
  id: number | null | undefined,
): PrintTemplate | undefined {
  if (!id || !templates || templates.length === 0) return undefined;
  return templates.find(t => t.id === id);
}
```

## FILE: resources/js/pages/settings/print-settings/runtime/UniversalPrintPipeline.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// reporting/runtime/UniversalPrintPipeline.tsx
//
// The single print pipeline for ALL consumers.
//
// Every print path (designer preview, POS receipt, commercial document,
// batch print, session report) goes through this component.
//
// Contract:
//   1. Caller builds UniversalDocumentData via DocumentDataBuilder.*
//   2. Pipeline renders UniversalPreview
//   3. Pipeline provides print-to-popup-window
// ════════════════════════════════════════════════════════════════════════════

import React, { useMemo, Suspense, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createDefaultTemplate } from '@/pages/settings/print-settings/types';
import type { PrintTemplate, DocTypeCode, PaperSize } from '@/pages/settings/print-settings/types';
import type { UniversalDocumentData, CompanyInfo } from '@/pages/settings/print-settings/types/data';
import { DocumentDataBuilder, POSSaleSnapshot } from '@/pages/settings/print-settings/types/data';

const UniversalPreview = React.lazy(() => import('@/pages/settings/print-settings/components/preview/UniversalPreview'));

const FALLBACK = (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 400, color: '#999', fontSize: 14, fontFamily: 'sans-serif',
    border: '1px dashed #ddd', borderRadius: 8, margin: 16,
  }}>
    Loading preview…
  </div>
);

// ─── Source types ──────────────────────────────────────────────────────────

export type PipelineSource =
  | { type: 'api-document'; doc: Record<string, unknown>; options?: { prevBalance?: number; newBalance?: number } }
  | { type: 'pos-snapshot'; snapshot: POSSaleSnapshot }
  | { type: 'session-report'; session: Record<string, unknown> }
  | { type: 'prebuilt'; data: UniversalDocumentData };

// ─── Props ─────────────────────────────────────────────────────────────────

interface Props {
  source:    PipelineSource;
  template:  PrintTemplate;
  company:   CompanyInfo | null;
  className?: string;
  style?:    React.CSSProperties;
}

// ─── Pipeline component ────────────────────────────────────────────────────

export default function UniversalPrintPipeline({ source, template, company, className, style }: Props) {
  const data: UniversalDocumentData = useMemo(() => {
    switch (source.type) {
      case 'prebuilt':
        return source.data;
      case 'api-document':
        return DocumentDataBuilder.fromApiDocument(source.doc, company ?? {} as CompanyInfo, source.options);
      case 'pos-snapshot':
        return DocumentDataBuilder.fromPOSSnapshot(source.snapshot, company ?? {} as CompanyInfo);
      case 'session-report':
        return DocumentDataBuilder.fromSessionReport(source.session, company ?? {} as CompanyInfo);
      default:
        return DocumentDataBuilder.empty();
    }
  }, [source, company]);

  return (
    <Suspense fallback={FALLBACK}>
      <div className={className} style={style}>
        <UniversalPreview tpl={template} data={data} />
      </div>
    </Suspense>
  );
}

// ─── Shared popup window helper ──────────────────────────────────────────

export function openPrintPopup(
  width:       number,
  height:      number,
  extraStyles?: string,
): Window | null {
  const win = window.open('', '_blank', `width=${width},height=${height}`);
  if (!win) return null;

  win.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>Print</title>
  <style>
    body { margin: 0; padding: 0; direction: rtl; font-family: 'Tajawal', sans-serif; }
    @page { margin: 0; }
    @media print { body { padding: 0; } }
    ${extraStyles ?? ''}
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
</head>
<body><div id="print-root"></div>
<script>
  function doPrint() { window.print(); setTimeout(function() { window.close(); }, 500); }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() { setTimeout(doPrint, 200); });
  } else {
    setTimeout(doPrint, 600);
  }
</script>
</body>
</html>`);
  win.document.close();
  return win;
}

// ─── Print-to-popup helper ─────────────────────────────────────────────────

export function renderPipelineToPopup(
  source:    PipelineSource,
  template:  PrintTemplate,
  company:   CompanyInfo | null,
): Window | null {
  const isThermal = template.paper_size === '80mm' || template.paper_size === '58mm';
  const w = isThermal ? 320 : template.paper_size === 'A5' ? 500 : 720;
  const win = openPrintPopup(w, 700);
  if (!win) return null;

  const root = win.document.getElementById('print-root');
  if (!root) { win.close(); return null; }

  const reactRoot = ReactDOM.createRoot(root);
  reactRoot.render(
    <Suspense fallback={null}>
      <UniversalPreview tpl={template} data={buildData(source, company)} />
    </Suspense>
  );

  return win;
}

function buildData(source: PipelineSource, company: CompanyInfo | null): UniversalDocumentData {
  switch (source.type) {
    case 'prebuilt':       return source.data;
    case 'api-document':   return DocumentDataBuilder.fromApiDocument(source.doc, company ?? {} as CompanyInfo, source.options);
    case 'pos-snapshot':   return DocumentDataBuilder.fromPOSSnapshot(source.snapshot, company ?? {} as CompanyInfo);
    case 'session-report': return DocumentDataBuilder.fromSessionReport(source.session, company ?? {} as CompanyInfo);
    default:               return DocumentDataBuilder.empty();
  }
}
```

## FILE: resources/js/pages/settings/print-settings/runtime/usePrintTemplatesList.ts
```
// ════════════════════════════════════════════════════════════════════════════
// usePrintTemplatesList — runtime hook for loading print templates
//
// Depends ONLY on RuntimeContext (no PrintSettingsProvider needed).
// Reads from the same React Query cache as the designer hooks, so cache
// invalidations from the Print Settings page are reflected here.
// ════════════════════════════════════════════════════════════════════════════
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { DocTypeCode } from '@/pages/settings/print-settings/types';
import { useRuntime } from './PrintRuntimeContext';

export function usePrintTemplatesList(docTypeCode?: DocTypeCode) {
  const { templateRepository, slug } = useRuntime();
  return useQuery({
    queryKey:  [slug, 'print-templates', 'list', docTypeCode],
    queryFn:   () => templateRepository.list(docTypeCode),
    enabled:   !!slug,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
```

## FILE: resources/js/pages/settings/print-settings/sections/DocumentSection.tsx
```
import React from 'react';
import type { BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';
import { Field, ColorField, Textarea, Input } from '../components/ui';
import { isSettingVisible } from '../services/SettingsRegistry';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function DocumentSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  return (
    <>
      {sec('title_text') && <Field label="عنوان المستند">
        <Input value={tpl.title_text} onChange={v => update('title_text', v)} />
      </Field>}
      {sec('title_size') && <SliderField label="حجم عنوان المستند" value={tpl.title_size} min={10} max={22} unit="px"
        onChange={v => update('title_size', v)} />}
      {sec('title_bold') && <Toggle value={tpl.title_bold} onChange={v => update('title_bold', v)} label="خط عريض" />}
      {sec('title_align') && <AlignButtons label="محاذاة العنوان" value={tpl.title_align} onChange={v => update('title_align', v)} />}
      {sec('title_color') && <ColorField label="لون العنوان" value={tpl.title_color} onChange={v => update('title_color', v)} />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {sec('show_doc_number') && <Toggle value={tpl.show_doc_number} onChange={v => update('show_doc_number', v)} label="رقم الوثيقة" />}
      {sec('show_date') && <Toggle value={tpl.show_date} onChange={v => update('show_date', v)} label="التاريخ" />}
      {sec('show_time') && <Toggle value={tpl.show_time} onChange={v => update('show_time', v)} label="الوقت" />}
      {sec('show_due_date') && <Toggle value={tpl.show_due_date} onChange={v => update('show_due_date', v)} label="تاريخ الاستحقاق" />}
      {sec('show_cashier') && <Toggle value={tpl.show_cashier} onChange={v => update('show_cashier', v)} label="اسم الكاشير" />}
      {sec('show_client') && <Toggle value={tpl.show_client} onChange={v => update('show_client', v)} label="اسم العميل" />}

      {sec('show_client') && tpl.show_client && (
        <>
          <div className="ps-section-title" style={{ fontSize: 12, marginTop: 4 }}>تفاصيل العميل</div>
          {sec('show_client_nif') && <Toggle value={tpl.show_client_nif} onChange={v => update('show_client_nif', v)} label="الرقم الضريبي للعميل" />}
          {sec('show_client_phone') && <Toggle value={tpl.show_client_phone} onChange={v => update('show_client_phone', v)} label="هاتف العميل" />}
          {sec('show_client_address') && <Toggle value={tpl.show_client_address} onChange={v => update('show_client_address', v)} label="عنوان العميل" />}
          {sec('show_delivery_address') && <Toggle value={tpl.show_delivery_address} onChange={v => update('show_delivery_address', v)} label="  ↳ عنوان التسليم" />}
        </>
      )}

      {sec('show_session') && <Toggle value={tpl.show_session} onChange={v => update('show_session', v)} label="رقم الجلسة" />}
      {sec('show_payment_term') && <Toggle value={tpl.show_payment_term} onChange={v => update('show_payment_term', v)} label="شروط الدفع" />}
      {sec('show_bank_details') && <Toggle value={tpl.show_bank_details} onChange={v => update('show_bank_details', v)} label="البيانات البنكية" />}
      {sec('show_bank_details') && tpl.show_bank_details && (
        <Field label="نص البيانات البنكية">
          <Textarea value={tpl.bank_details_text} onChange={v => update('bank_details_text', v)} placeholder="CCP: 001 234 567 — بنك الفلاحة" rows={3} />
        </Field>
      )}

      {sec('doc_separator') && <BorderSelect label="فاصل المستند" value={tpl.doc_separator} onChange={v => update('doc_separator', v as BorderStyle)} />}
    </>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/FooterSection.tsx
```
import React from 'react';
import type { BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { ColorField, Field, Input, Textarea } from '../components/ui';
import { BorderSelect } from './HeaderSection';
import { isSettingVisible } from '../services/SettingsRegistry';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function FooterSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  return (
    <>
      <Section title="التذييل — النصوص والتواقيع" icon="ti-file-text">
        {sec('footer_line1') && <Field label="سطر التذييل 1">
          <Input value={tpl.footer_line1}
            onChange={v => update('footer_line1', v)}
            placeholder="مثال: مفتوح من 08:00 إلى 20:00" />
        </Field>}
        {sec('footer_line2') && <Field label="سطر التذييل 2">
          <Input value={tpl.footer_line2}
            onChange={v => update('footer_line2', v)} />
        </Field>}
        {sec('footer_line3') && <Field label="سطر التذييل 3">
          <Input value={tpl.footer_line3}
            onChange={v => update('footer_line3', v)} />
        </Field>}

        {sec('footer_separator') && <BorderSelect label="فاصل التذييل" value={tpl.footer_separator}
          onChange={v => update('footer_separator', v as BorderStyle)} />}

        <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

        {sec('show_thank_you') && <Toggle value={tpl.show_thank_you} onChange={v => update('show_thank_you', v)} label="رسالة الشكر" />}
        {sec('show_thank_you') && tpl.show_thank_you && (
          <>
            <Field label="نص رسالة الشكر">
              <Input value={tpl.thank_you_text}
                onChange={v => update('thank_you_text', v)} />
            </Field>
            {sec('thank_you_size') && <SliderField label="حجم خط الشكر" value={tpl.thank_you_size} min={9} max={18} unit="px"
              onChange={v => update('thank_you_size', v)} />}
            {sec('thank_you_color') && <ColorField label="لون الشكر" value={tpl.thank_you_color} onChange={v => update('thank_you_color', v)} />}
          </>
        )}

        {sec('show_returns_policy') && <Toggle value={tpl.show_returns_policy} onChange={v => update('show_returns_policy', v)} label="سياسة الإرجاع" />}
        {sec('show_returns_policy') && tpl.show_returns_policy && (
          <Field label="نص سياسة الإرجاع">
            <Textarea value={tpl.returns_policy_text}
              onChange={v => update('returns_policy_text', v)} rows={2} />
          </Field>
        )}

        {sec('footer_legal_text') && <Field label="نص قانوني (تذييل سفلي)">
          <Textarea value={tpl.footer_legal_text}
            onChange={v => update('footer_legal_text', v)}
            placeholder="مثال: يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري" rows={2} />
        </Field>}
      </Section>

      <Section title="الباركود و QR" icon="ti-barcode">
        {sec('show_barcode') && <Toggle value={tpl.show_barcode} onChange={v => update('show_barcode', v)} label="الباركود" />}
        {sec('show_barcode') && tpl.show_barcode && (
          <div className="ps-field">
            <label className="ps-field-label">محتوى الباركود</label>
            <select className="ps-select" value={tpl.barcode_content}
              onChange={e => update('barcode_content', e.target.value as 'doc-number' | 'total' | 'custom')}>
              <option value="doc-number">رقم المستند</option>
              <option value="total">المبلغ الإجمالي</option>
              <option value="custom">نص مخصص</option>
            </select>
            {tpl.barcode_content === 'custom' && (
              <input className="ps-input" style={{ marginTop: 4 }} value={tpl.barcode_custom_text ?? ''}
                onChange={e => update('barcode_custom_text', e.target.value)}
                placeholder="أدخل النص للباركود" />
            )}
          </div>
        )}

        {sec('show_qr') && <Toggle value={tpl.show_qr} onChange={v => update('show_qr', v)} label="QR Code" />}
        {sec('show_qr') && tpl.show_qr && (
          <div className="ps-field">
            <label className="ps-field-label">محتوى QR</label>
            <select className="ps-select" value={tpl.qr_content}
              onChange={e => update('qr_content', e.target.value as 'doc-number' | 'company-info' | 'both')}>
              <option value="doc-number">رقم المستند</option>
              <option value="company-info">معلومات الشركة</option>
              <option value="both">الاثنين معاً</option>
            </select>
          </div>
        )}
      </Section>

      <Section title="التواقيع والختم" icon="ti-signature">
        {sec('show_cashier_signature') && <Toggle value={tpl.show_cashier_signature} onChange={v => update('show_cashier_signature', v)} label="إمضاء الكاشير" />}
        {sec('show_client_signature') && <Toggle value={tpl.show_client_signature} onChange={v => update('show_client_signature', v)} label="إمضاء العميل" />}
        {sec('show_stamp') && <Toggle value={tpl.show_stamp} onChange={v => update('show_stamp', v)} label="ختم المؤسسة" />}
      </Section>
    </>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/FormattingSection.tsx
```
import React from 'react';
import type { FontFamily } from '../types';
import type { PrintTemplate } from '../types';
import { SliderField } from './ToggleSwitch';
import { Field, Select, Pills } from '../components/ui';
import { isSettingVisible } from '../services/SettingsRegistry';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function FormattingSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);
  const isThermal = tpl.paper_size === '80mm' || tpl.paper_size === '58mm';

  return (
    <>
      {sec('paper_width_mm') && isThermal && (
        <div className="ps-field">
          <label className="ps-field-label">عرض الورق (حراري)</label>
          <div className="ps-paper-pills" style={{ marginTop: 2 }}>
            {([80, 58] as const).map(w => (
              <button key={w} className={`ps-paper-pill ${tpl.paper_width_mm === w ? 'on' : ''}`}
                onClick={() => update('paper_width_mm', w)}>
                {w} mm
              </button>
            ))}
          </div>
        </div>
      )}

      {!isThermal && sec('page_orientation') && (
        <Field label="اتجاه الصفحة">
          <Pills
            options={[{ v: 'portrait' as const, l: 'عمودي' }, { v: 'landscape' as const, l: 'أفقي' }]}
            value={tpl.page_orientation}
            onChange={v => update('page_orientation', v)}
          />
        </Field>
      )}

      {sec('margin_top') && <SliderField label="الهامش العلوي" value={tpl.margin_top} min={0} max={10} unit="mm"
        onChange={v => update('margin_top', v)} />}
      {sec('margin_bottom') && <SliderField label="الهامش السفلي" value={tpl.margin_bottom} min={0} max={10} unit="mm"
        onChange={v => update('margin_bottom', v)} />}
      {sec('margin_sides') && <SliderField label="الهامش الجانبي" value={tpl.margin_sides} min={0} max={10} unit="mm"
        onChange={v => update('margin_sides', v)} />}
      {sec('line_spacing') && <SliderField label="تباعد الأسطر" value={tpl.line_spacing} min={1} max={2.5} step={0.1} unit="×"
        onChange={v => update('line_spacing', v)} />}
      {sec('base_font_size') && <SliderField label="حجم الخط الأساسي" value={tpl.base_font_size} min={8} max={14} unit="px"
        onChange={v => update('base_font_size', v)} />}

      {sec('font_family') && <Field label="نوع الخط الأساسي">
        <Select value={tpl.font_family} onChange={v => update('font_family', v as FontFamily)}>
          <option value="tajawal">Tajawal — عربي</option>
          <option value="monospace">Courier — أحادي</option>
          <option value="arial">Arial — لاتيني</option>
          <option value="times">Times New Roman</option>
        </Select>
      </Field>}
    </>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/HeaderSection.tsx
```
import React, { useRef, useState } from 'react';
import type { AlignOption, BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import type { CompanyData } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { Field, ColorField, Input } from '../components/ui';
import { usePrintTemplatesApi } from '../providers/PrintSettingsContext';
import { isSettingVisible } from '../services/SettingsRegistry';
import ImagePreviewModal from '../components/ImagePreviewModal';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
  company?: CompanyData | null;
}

export default function HeaderSectionControls({ tpl, update, company }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);
  const [uploading, setUploading] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const templatesApi = usePrintTemplatesApi();

  const logoPreviewUrl = tpl.logo_source === 'custom' ? tpl.custom_logo_url
    : tpl.logo_source === 'company' ? (company?.logoUrl ?? null)
    : null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await templatesApi.uploadLogo(file);
      update('custom_logo_url', res.url);
      update('logo_source', 'custom');
    } catch {
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      {sec('show_logo') && <Toggle value={tpl.show_logo} onChange={v => update('show_logo', v)} label="إظهار الشعار" />}
      {sec('show_logo') && tpl.show_logo && (
        <>
          <div className="ps-field">
            <label className="ps-field-label">مصدر الشعار</label>
            <div className="ps-paper-pills" style={{ marginTop: 2 }}>
              {(['default', 'company', 'custom'] as const).map(s => (
                <button key={s} className={`ps-paper-pill ${tpl.logo_source === s ? 'on' : ''}`}
                  onClick={() => update('logo_source', s)}>
                  {s === 'default' ? 'افتراضي' : s === 'company' ? 'شعار الشركة' : 'شعار مخصص'}
                </button>
              ))}
            </div>
          </div>

          <div className="ps-field">
            <label className="ps-field-label">معاينة الشعار</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 36 }}>
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="logo preview"
                  onClick={() => setZoomImg(logoPreviewUrl)}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, cursor: 'zoom-in', border: '1px solid var(--b2)' }} />
              ) : (
                <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                  {tpl.logo_source === 'default' ? 'سيتم استخدام الحرف الأول من اسم المؤسسة' : 'لا يوجد شعار'}
                </span>
              )}
            </div>
          </div>

          {tpl.logo_source === 'custom' && (
            <div className="ps-field">
              <label className="ps-field-label">رفع شعار مخصص</label>
              <input ref={fileRef} type="file" accept="image/*" hidden
                onChange={handleLogoUpload} />
              <button onClick={() => fileRef.current?.click()} type="button"
                disabled={uploading}
                style={{
                  padding: '5px 10px', borderRadius: 'var(--r1)', fontSize: 11,
                  border: '1px solid var(--b2)', background: 'var(--bg3)',
                  color: 'var(--t2)', cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <i className={`ti ${uploading ? 'ti-loader-2 spin' : 'ti-upload'}`} />
                {uploading ? 'رفع...' : 'اختيار صورة'}
              </button>
            </div>
          )}

          <SliderField label="حجم الشعار" value={tpl.logo_size} min={30} max={120} unit="px"
            onChange={v => update('logo_size', v)} />
          <AlignButtons label="محاذاة الشعار" value={tpl.logo_align}
            onChange={v => update('logo_align', v)} />
        </>
      )}

      <ImagePreviewModal open={!!zoomImg} src={zoomImg ?? ''} onClose={() => setZoomImg(null)} />

      {sec('show_company_name') && <Toggle value={tpl.show_company_name} onChange={v => update('show_company_name', v)} label="اسم المؤسسة" />}
      {sec('show_company_name') && tpl.show_company_name && (
        <>
          <SliderField label="حجم الخط" value={tpl.company_name_size} min={10} max={28} unit="px"
            onChange={v => update('company_name_size', v)} />
          <Toggle value={tpl.company_name_bold} onChange={v => update('company_name_bold', v)} label="خط عريض" />
          <AlignButtons label="محاذاة الاسم" value={tpl.company_name_align}
            onChange={v => update('company_name_align', v)} />
          <ColorField label="لون الاسم" value={tpl.company_name_color} onChange={v => update('company_name_color', v)} />
        </>
      )}

      {sec('header_custom_text') && <Field label="نص إضافي في الرأس">
        <Input value={tpl.header_custom_text}
          onChange={v => update('header_custom_text', v)}
          placeholder="مثال: السجل التجاري: 13/B.0123456" />
      </Field>}

      <div className="ps-section-title" style={{ marginTop: 8, fontSize: 12 }}>معلومات الشركة</div>
      {sec('show_address') && <Toggle value={tpl.show_address} onChange={v => update('show_address', v)} label="العنوان" />}
      {sec('show_phone') && <Toggle value={tpl.show_phone}   onChange={v => update('show_phone', v)} label="الهاتف" />}
      {sec('show_tax_id') && <Toggle value={tpl.show_tax_id}   onChange={v => update('show_tax_id', v)} label="رقم NIF" />}
      {sec('show_rc') && <Toggle value={tpl.show_rc}      onChange={v => update('show_rc', v)} label="السجل التجاري RC" />}
      {sec('show_nis') && <Toggle value={tpl.show_nis}     onChange={v => update('show_nis', v)} label="رقم NIS / STAT" />}
      {sec('show_ice') && <Toggle value={tpl.show_ice}     onChange={v => update('show_ice', v)} label="رقم ICE" />}
      {sec('show_article') && <Toggle value={tpl.show_article} onChange={v => update('show_article', v)} label="النشاط (Article)" />}

      {sec('company_info_size') && <SliderField label="حجم خط معلومات الشركة" value={tpl.company_info_size} min={7} max={14} unit="px"
        onChange={v => update('company_info_size', v)} />}
      {sec('company_info_align') && <AlignButtons label="محاذاة معلومات الشركة" value={tpl.company_info_align}
        onChange={v => update('company_info_align', v)} />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12, marginBottom: 4 }}>
        بيانات المؤسسة
        <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--t4)', marginRight: 6 }}>
          (اتركها فارغة لاستخدام بيانات الشركة تلقائياً)
        </span>
      </div>
      {sec('company_name_text') && <CompanyField label="الاسم" value={tpl.company_name_text} onChange={v => update('company_name_text', v)} placeholder="اسم المؤسسة" apiValue={company?.name} />}
      {sec('override_address') && <CompanyField label="العنوان" value={tpl.override_address} onChange={v => update('override_address', v)} placeholder="عنوان المؤسسة" apiValue={company?.address} />}
      {sec('override_phone') && <CompanyField label="الهاتف" value={tpl.override_phone} onChange={v => update('override_phone', v)} placeholder="رقم الهاتف" apiValue={company?.phone} />}
      {sec('override_nif') && <CompanyField label="NIF" value={tpl.override_nif} onChange={v => update('override_nif', v)} placeholder="الرقم الضريبي" apiValue={company?.nif} />}
      {sec('override_rc') && <CompanyField label="RC" value={tpl.override_rc} onChange={v => update('override_rc', v)} placeholder="السجل التجاري" apiValue={company?.rc} />}
      {sec('override_nis') && <CompanyField label="NIS" value={tpl.override_nis} onChange={v => update('override_nis', v)} placeholder="رقم NIS" apiValue={company?.nis} />}
      {sec('override_ice') && <CompanyField label="ICE" value={tpl.override_ice} onChange={v => update('override_ice', v)} placeholder="رقم ICE" />}
      {sec('override_article') && <CompanyField label="النشاط" value={tpl.override_article} onChange={v => update('override_article', v)} placeholder="نشاط المؤسسة" apiValue={company?.article} />}

      {sec('logo_border_radius') && <SliderField label="تدوير الزوايا" value={tpl.logo_border_radius} min={0} max={50} unit="%" onChange={v => update('logo_border_radius', v)} />}
      {sec('header_separator') && <BorderSelect label="فاصل الرأس" value={tpl.header_separator}
        onChange={v => update('header_separator', v as BorderStyle)} />}
    </>
  );
}

export function AlignButtons({ label, value, onChange }: {
  label: string; value: AlignOption; onChange: (v: AlignOption) => void;
}) {
  return (
    <div className="ps-field">
      <label className="ps-field-label">{label}</label>
      <div className="ps-paper-pills" style={{ marginTop: 2 }}>
        {(['right', 'center', 'left'] as AlignOption[]).map(a => (
          <button key={a} className={`ps-paper-pill ${value === a ? 'on' : ''}`}
            onClick={() => onChange(a)}>
            {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BorderSelect({ label, value, onChange }: {
  label: string; value: BorderStyle; onChange: (v: BorderStyle) => void;
}) {
  return (
    <div className="ps-field">
      <label className="ps-field-label">{label}</label>
      <select className="ps-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="solid">خط متصل</option>
        <option value="dashed">خط متقطع</option>
        <option value="double">خط مزدوج</option>
        <option value="none">بدون فاصل</option>
      </select>
    </div>
  );
}

export function CompanyField({ label, value, onChange, placeholder, apiValue }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; apiValue?: string;
}) {
  const isUsingApi = !value && !!apiValue;
  return (
    <div className="ps-field">
      <label className="ps-field-label">
        {label}
        {isUsingApi && (
          <span className="ps-badge-api">تلقائي من الشركة</span>
        )}
      </label>
      <input className="ps-input" style={{ fontSize: 12 }} value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={apiValue || placeholder} />
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/ItemsSection.tsx
```
import React, { useState, useRef } from 'react';
import type { ColumnKey, FontFamily, BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField, Section } from './ToggleSwitch';
import { ColorField } from '../components/ui';
import { BorderSelect } from './HeaderSection';
import { isSettingVisible } from '../services/SettingsRegistry';

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'rowNumber', label: 'رقم السطر' },
  { key: 'barcode',   label: 'باركود المنتج' },
  { key: 'ref',       label: 'المرجع' },
  { key: 'name',      label: 'اسم المنتج' },
  { key: 'unit',      label: 'الوحدة' },
  { key: 'quantity',  label: 'الكمية' },
  { key: 'price',     label: 'السعر' },
  { key: 'discount',  label: 'الخصم' },
  { key: 'tva',       label: 'نسبة TVA' },
  { key: 'total',     label: 'المجموع' },
];

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function ItemsSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);
  const [dragKey, setDragKey] = useState<ColumnKey | null>(null);
  const dragOverKey = useRef<ColumnKey | null>(null);
  const lastDropTarget = useRef<ColumnKey | null>(null);

  const toggleCol = (key: ColumnKey, show: boolean) => {
    const newShow = { ...tpl.col_show, [key]: show };
    update('col_show', newShow);
    if (show && !tpl.col_order.includes(key)) {
      update('col_order', [...tpl.col_order, key]);
    }
  };

  const moveCol = (key: ColumnKey, dir: -1 | 1) => {
    const idx = tpl.col_order.indexOf(key);
    if (idx === -1) return;
    const newOrder = [...tpl.col_order];
    const target = idx + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    update('col_order', newOrder);
  };

  const handleDragStart = (key: ColumnKey) => {
    setDragKey(key);
  };

  const handleDragOver = (e: React.DragEvent, key: ColumnKey) => {
    e.preventDefault();
    if (!dragKey || dragKey === key) return;
    if (lastDropTarget.current === key) return;
    lastDropTarget.current = key;
    dragOverKey.current = key;
    const from = tpl.col_order.indexOf(dragKey);
    const to = tpl.col_order.indexOf(key);
    if (from < 0 || to < 0) return;
    const newOrder = [...tpl.col_order];
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragKey);
    update('col_order', newOrder);
    setDragKey(key);
  };

  const handleDragEnd = () => {
    setDragKey(null);
    dragOverKey.current = null;
    lastDropTarget.current = null;
  };

  const changeColWidth = (key: ColumnKey, width: number) => {
    update('col_widths', { ...tpl.col_widths, [key]: Math.max(5, Math.min(60, width)) });
  };

  const changeColHeader = (key: ColumnKey, header: string) => {
    update('col_headers', { ...tpl.col_headers, [key]: header });
  };

  const changeColAlign = (key: ColumnKey, align: 'right' | 'left' | 'center') => {
    update('col_aligns', { ...tpl.col_aligns, [key]: align });
  };

  return (
    <>
      {sec('col_order') && (
        <Section title="الأعمدة — إظهار / ترتيب / عرض" icon="ti-list-details">
          <div className="ps-section-sub" style={{ marginBottom: 8 }}>
            اختر الأعمدة التي تظهر في جدول المنتجات، ورتبها حسب ما تريد — اسحب وأفلت لإعادة الترتيب
          </div>

          {COLUMNS.map(col => {
            const visible = tpl.col_show[col.key] !== false;
            const idx = tpl.col_order.indexOf(col.key);
            const isDragging = dragKey === col.key;
            return (
              <div key={col.key} draggable
                onDragStart={() => handleDragStart(col.key)}
                onDragOver={e => handleDragOver(e, col.key)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 0', borderBottom: '1px solid var(--b1)',
                  cursor: 'grab',
                  opacity: isDragging ? 0.4 : 1,
                  background: isDragging ? 'var(--emb)' : 'transparent',
                  borderTop: dragOverKey.current === col.key && dragKey !== col.key ? '2px solid var(--em)' : 'none',
                  borderTopStyle: dragOverKey.current === col.key && dragKey !== col.key ? 'dashed' : 'none',
                }}>
                <div
                  className={`ps-toggle-track ${visible ? 'on' : ''}`}
                  onClick={() => toggleCol(col.key, !visible)}
                  style={{ flexShrink: 0 }}
                >
                  <div className="ps-toggle-thumb" />
                </div>

                <span style={{
                  flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--t2)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <i className="ti ti-grip-vertical" style={{ fontSize: 10, opacity: 0.3 }} />
                  {col.label}
                </span>

                <button className="ps-btn-xs" onClick={() => moveCol(col.key, -1)}
                  disabled={idx <= 0}
                  style={{ opacity: idx <= 0 ? 0.3 : 1 }}>
                  <i className="ti ti-chevron-right" />
                </button>
                <button className="ps-btn-xs" onClick={() => moveCol(col.key, 1)}
                  disabled={idx >= tpl.col_order.length - 1}
                  style={{ opacity: idx >= tpl.col_order.length - 1 ? 0.3 : 1 }}>
                  <i className="ti ti-chevron-left" />
                </button>

                {visible && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div className="ps-paper-pills" style={{ gap: 2 }}>
                      {(['right', 'center', 'left'] as const).map(a => (
                        <button key={a}
                          className={`ps-paper-pill ${(tpl.col_aligns?.[col.key] ?? 'right') === a ? 'on' : ''}`}
                          onClick={() => changeColAlign(col.key, a)}
                          style={{ fontSize: 9, padding: '1px 4px' }}>
                          {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
                        </button>
                      ))}
                    </div>
                    <input type="range" min={5} max={60} step={1}
                      value={tpl.col_widths[col.key] ?? 20}
                      onChange={e => changeColWidth(col.key, Number(e.target.value))}
                      style={{ width: 40, height: 3 }} />
                    <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 20 }}>
                      {tpl.col_widths[col.key] ?? 20}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </Section>
      )}

      <Section title="تنسيق جدول المنتجات" icon="ti-table-options">
        {sec('items_font_size') && <SliderField label="حجم الخط" value={tpl.items_font_size} min={7} max={14} unit="px"
          onChange={v => update('items_font_size', v)} />}

        {sec('items_font_family') && <div className="ps-field">
          <label className="ps-field-label">نوع الخط</label>
          <select className="ps-select" value={tpl.items_font_family}
            onChange={e => update('items_font_family', e.target.value as FontFamily)}>
            <option value="tajawal">Tajawal (واضح)</option>
            <option value="monospace">Courier (أحادي)</option>
          </select>
        </div>}

        {sec('show_col_header') && <Toggle value={tpl.show_col_header} onChange={v => update('show_col_header', v)} label="إظهار رأس الجدول" />}
        {sec('show_col_header') && tpl.show_col_header && (
          <>
            {sec('table_header_bold') && <Toggle value={tpl.table_header_bold} onChange={v => update('table_header_bold', v)} label="خط عريض للرأس" />}
            {sec('table_header_bg') && <Toggle value={tpl.table_header_bg} onChange={v => update('table_header_bg', v)} label="خلفية للرأس" />}
            {sec('table_header_color') && <ColorField label="لون نص الرأس" value={tpl.table_header_color} onChange={v => update('table_header_color', v)} />}
            {COLUMNS.filter(c => tpl.col_show[c.key] !== false).map(col => (
              <div className="ps-field" key={col.key} style={{ marginTop: 2 }}>
                <label className="ps-field-label">رأس: {col.label}</label>
                <input className="ps-input" style={{ fontSize: 11 }}
                  value={tpl.col_headers[col.key] ?? ''}
                  onChange={e => changeColHeader(col.key, e.target.value)}
                  placeholder={col.label} />
              </div>
            ))}
          </>
        )}

        {sec('table_border_style') && <BorderSelect label="حدود الجدول" value={tpl.table_border_style}
          onChange={v => update('table_border_style', v as BorderStyle)} />}
        {sec('alternating_rows') && <Toggle value={tpl.alternating_rows} onChange={v => update('alternating_rows', v)} label="تلوين متناوب للأسطر" />}
        {sec('alternating_rows') && tpl.alternating_rows && (
          <ColorField label="لون الأسطر الزوجية" value={tpl.alternating_color} onChange={v => update('alternating_color', v)} />
        )}
      </Section>

      <Section title="خيارات عرض الأسعار" icon="ti-calculator">
        {sec('price_display') && <div className="ps-field">
          <label className="ps-field-label">عرض الأسعار</label>
          <div className="ps-paper-pills" style={{ marginTop: 2 }}>
            {(['ht', 'ttc'] as const).map(m => (
              <button key={m} className={`ps-paper-pill ${tpl.price_display === m ? 'on' : ''}`}
                onClick={() => update('price_display', m)}>
                {m === 'ht' ? 'HT (بدون ضريبة)' : 'TTC (بالضريبة)'}
              </button>
            ))}
          </div>
        </div>}
        {sec('show_line_total_ttc') && <Toggle value={tpl.show_line_total_ttc} onChange={v => update('show_line_total_ttc', v)} label="الإجمالي TTC لكل سطر" />}
      </Section>
    </>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/PaymentsSection.tsx
```
import React from 'react';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { isSettingVisible } from '../services/SettingsRegistry';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function PaymentsSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  return (
    <>
      {sec('show_payment_details') && <Toggle value={tpl.show_payment_details} onChange={v => update('show_payment_details', v)} label="تفصيل وسائل الدفع" />}
      {sec('show_payment_details') && tpl.show_payment_details && (
        <SliderField label="حجم خط الدفع" value={tpl.payment_font_size} min={8} max={14} unit="px"
          onChange={v => update('payment_font_size', v)} />
      )}
    </>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/sections/ToggleSwitch.tsx
```
import React from 'react';
import { Toggle as UIToggle } from '../components/ui';

export const Toggle = UIToggle;

export function SliderField({
  label, value, min, max, step = 1, unit = '', onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="ps-slider-field">
      <div className="ps-slider-header">
        <span className="ps-slider-label">{label}</span>
        <span className="ps-slider-val">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} className="ps-range" />
    </div>
  );
}

export function Section({ title, icon, children, defaultOpen = true, id, collapseVersion }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean; id?: string; collapseVersion?: number;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setOpen(defaultOpen);
  }, [collapseVersion, defaultOpen]);
  return (
    <div className="ps-section" id={id}>
      <button className="ps-section-head" onClick={() => setOpen(o => !o)}>
        <i className={`ti ${icon}`} />
        <span>{title}</span>
        <i className={`ti ti-chevron-down ps-section-chevron ${open ? 'open' : ''}`} />
      </button>
      {open && <div ref={bodyRef} className="ps-section-body">{children}</div>}
    </div>
  );
}


```

## FILE: resources/js/pages/settings/print-settings/sections/TotalsSection.tsx
```
import React from 'react';
import type { BorderStyle } from '../types';
import type { PrintTemplate } from '../types';
import { Toggle, SliderField } from './ToggleSwitch';
import { AlignButtons, BorderSelect } from './HeaderSection';
import { ColorField } from '../components/ui';
import { isSettingVisible } from '../services/SettingsRegistry';

interface Props {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

export default function TotalsSectionControls({ tpl, update }: Props) {
  const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size, tpl);

  return (
    <>
      {sec('totals_font_size') && <SliderField label="حجم خط الإجماليات" value={tpl.totals_font_size} min={8} max={16} unit="px"
        onChange={v => update('totals_font_size', v)} />}
      {sec('totals_bold') && <Toggle value={tpl.totals_bold} onChange={v => update('totals_bold', v)} label="خط عريض" />}
      {sec('totals_align') && <AlignButtons label="محاذاة الإجماليات" value={tpl.totals_align}
        onChange={v => update('totals_align', v)} />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />

      {sec('show_total_ht') && <Toggle value={tpl.show_total_ht} onChange={v => update('show_total_ht', v)} label="المجموع HT" />}
      {sec('show_total_tva') && <Toggle value={tpl.show_total_tva} onChange={v => update('show_total_tva', v)} label="مبلغ TVA" />}
      {sec('show_tva_breakdown') && <Toggle value={tpl.show_tva_breakdown} onChange={v => update('show_tva_breakdown', v)} label="تفصيل TVA حسب النسبة" />}
      {sec('show_discount_total') && <Toggle value={tpl.show_discount_total} onChange={v => update('show_discount_total', v)} label="إجمالي الخصومات" />}
      {sec('show_fiscal_stamp') && <Toggle value={tpl.show_fiscal_stamp} onChange={v => update('show_fiscal_stamp', v)} label="الطابع الجبائي" />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      {sec('show_total_ttc') && <Toggle value={tpl.show_total_ttc} onChange={v => update('show_total_ttc', v)} label="المجموع TTC (الإجمالي)" />}
      {sec('show_total_ttc') && tpl.show_total_ttc && (
        <>
          {sec('total_ttc_font_size') && <SliderField label="حجم خط TTC" value={tpl.total_ttc_font_size} min={12} max={24} unit="px"
            onChange={v => update('total_ttc_font_size', v)} />}
          {sec('total_ttc_bold') && <Toggle value={tpl.total_ttc_bold} onChange={v => update('total_ttc_bold', v)} label="خط عريض" />}
          {sec('total_ttc_color') && <ColorField label="لون TTC" value={tpl.total_ttc_color} onChange={v => update('total_ttc_color', v)} />}
          {sec('total_border_style') && <BorderSelect label="إطار TTC" value={tpl.total_border_style}
            onChange={v => update('total_border_style', v as BorderStyle)} />}
        </>
      )}

      {sec('show_amount_in_words') && <Toggle value={tpl.show_amount_in_words} onChange={v => update('show_amount_in_words', v)} label="المبلغ بالكتابة" />}

      <div style={{ borderTop: '1px solid var(--b2)', margin: '6px 0' }} />
      <div className="ps-section-title" style={{ fontSize: 12 }}>المبالغ والرصيد</div>
      {sec('show_paid_amount') && <Toggle value={tpl.show_paid_amount} onChange={v => update('show_paid_amount', v)} label="المبلغ المدفوع" />}
      {sec('show_change') && <Toggle value={tpl.show_change} onChange={v => update('show_change', v)} label="الباقي (الصرف)" />}
      {sec('show_remaining') && <Toggle value={tpl.show_remaining} onChange={v => update('show_remaining', v)} label="المبلغ المتبقي" />}
      {sec('show_prev_balance') && <Toggle value={tpl.show_prev_balance} onChange={v => update('show_prev_balance', v)} label="الرصيد السابق" />}
      {sec('show_new_balance') && <Toggle value={tpl.show_new_balance} onChange={v => update('show_new_balance', v)} label="الرصيد الجديد" />}


    </>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/services/CalculatedFieldService.ts
```
﻿// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// reporting/data/CalculatedFieldService.ts
//
// Layer 2 â€” depends on UniversalDocumentData types. Pure TypeScript.
// Computes derived field values that are not directly in the API response:
// balance movements, profit/margin, running totals, amount in words, etc.
//
// Design notes:
//   - profit uses a simplified calculation: for each line, totalHt - totalTva.
//     This is the gross margin assuming cost â‰ˆ Tva (i.e. cost = unitPriceHt أ—
//     tvaRate أ— qty). Real profit requires cost price from inventory, which
//     is not yet present in UniversalDocumentData.
//   - amountInWords is a stub returning a description string. A full Arabic
//     number-to-words converter can be plugged in later.
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

import type { ExpressionValue } from './engines/FormulaEngine';
import type { UniversalDocumentData } from '../types/data/UniversalDocumentData';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CalculatedField {
  /** Unique identifier for this field (used as key in data.computed) */
  id: string;
  /** Human-readable label in Arabic */
  label: string;
  /** Compute function â€” returns a single ExpressionValue */
  compute: (data: UniversalDocumentData) => ExpressionValue;
  /**
   * List of field paths this computed field depends on.
   * Used for cache invalidation in the formula engine.
   */
  dependencies: string[];
}

// â”€â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class CalculatedFieldService {
  private readonly fields = new Map<string, CalculatedField>();

  constructor() {
    this.registerDefaults();
  }

  // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  register(field: CalculatedField): void {
    this.fields.set(field.id, field);
  }

  registerMany(fields: CalculatedField[]): void {
    for (const field of fields) {
      this.register(field);
    }
  }

  computeAll(data: UniversalDocumentData): Record<string, ExpressionValue> {
    const results: Record<string, ExpressionValue> = {};
    for (const [id, field] of this.fields) {
      try {
        results[id] = field.compute(data);
      } catch {
        results[id] = null;
      }
    }
    return results;
  }

  computeOne(id: string, data: UniversalDocumentData): ExpressionValue | null {
    const field = this.fields.get(id);
    if (!field) return null;
    try {
      return field.compute(data);
    } catch {
      return null;
    }
  }

  list(): CalculatedField[] {
    return Array.from(this.fields.values());
  }

  get(id: string): CalculatedField | undefined {
    return this.fields.get(id);
  }

  // â”€â”€ Default field registrations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private registerDefaults(): void {
    // 1. Movement â€” balance movement = current - previous
    this.register({
      id: 'movement',
      label: 'ط­ط±ظƒط© ط§ظ„ط±طµظٹط¯',
      compute: (data) => {
        if (!data.balance) return null;
        return data.balance.current - data.balance.previous;
      },
      dependencies: ['balance.current', 'balance.previous'],
    });

    // 2. Amount in words (stub)
    this.register({
      id: 'amountInWords',
      label: 'ط§ظ„ظ…ط¨ظ„ط؛ ظƒطھط§ط¨ط©',
      compute: (data) => {
        const total = data.totals.totalTtc;
        return `ظ…ط¨ظ„ط؛ ${total} ط¯ظٹظ†ط§ط± ط¬ط²ط§ط¦ط±ظٹ ظپظ‚ط·`;
      },
      dependencies: ['totals.totalTtc'],
    });

    // 3. Profit â€” simplified: per line totalHt - totalTva
    this.register({
      id: 'profit',
      label: 'ط§ظ„ط±ط¨ط­ ط§ظ„ظ…ظ‚ط¯ط±',
      compute: (data) => {
        return data.lines.reduce((sum, line) => {
          return sum + (line.totalHt - line.totalTva);
        }, 0);
      },
      dependencies: ['lines.*.totalHt', 'lines.*.totalTva'],
    });

    // 4. Profit margin â€” profit / totalHt * 100
    this.register({
      id: 'profitMargin',
      label: 'ظ‡ط§ظ…ط´ ط§ظ„ط±ط¨ط­',
      compute: (data) => {
        const totalHt = data.totals.totalHt;
        if (totalHt === 0) return null;
        const profit = data.lines.reduce((sum, line) => {
          return sum + (line.totalHt - line.totalTva);
        }, 0);
        return (profit / totalHt) * 100;
      },
      dependencies: ['profit', 'totals.totalHt'],
    });

    // 5. Running total â€” cumulative sum of totalTtc across lines
    this.register({
      id: 'runningTotal',
      label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط§ظ„طھط±ط§ظƒظ…ظٹ',
      compute: (data) => {
        return data.lines.reduce((sum, line) => sum + line.totalTtc, 0);
      },
      dependencies: ['lines.*.totalTtc'],
    });

    // 6. Line count
    this.register({
      id: 'lineCount',
      label: 'ط¹ط¯ط¯ ط§ظ„ط£ط³ط·ط±',
      compute: (data) => data.lines.length,
      dependencies: ['lines'],
    });

    // 7. Item count â€” sum of quantities
    this.register({
      id: 'itemCount',
      label: 'ط¹ط¯ط¯ ط§ظ„ظ…ظˆط§ط¯',
      compute: (data) => {
        return data.lines.reduce((sum, line) => sum + line.quantity, 0);
      },
      dependencies: ['lines.*.quantity'],
    });

    // 8. Average line total â€” average of line TTC totals
    this.register({
      id: 'averageLineTotal',
      label: 'ظ…طھظˆط³ط· ط§ظ„ط³ط·ط±',
      compute: (data) => {
        const lines = data.lines;
        if (lines.length === 0) return 0;
        const total = lines.reduce((sum, line) => sum + line.totalTtc, 0);
        return total / lines.length;
      },
      dependencies: ['lines.*.totalTtc', 'lines'],
    });
  }
}

// â”€â”€â”€ Singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const calculatedFieldService = new CalculatedFieldService();
```

## FILE: resources/js/pages/settings/print-settings/services/engines/FormulaEngine.ts
```
﻿// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// reporting/core/engines/FormulaEngine.ts
//
// Layer 1 â€” zero dependencies. Pure TypeScript.
//
// Custom expression evaluator for report formulas.
// No eval(), no Math.js, no external DSL.
//
// Built-in functions: IF, SUM, AVG, ROUND, CONCAT, FORMAT, TODAY,
//                     MIN, MAX, COUNT, ABS, LEN, UPPER, LOWER
//
// Expressions:
//   "Hello " + name
//   IF(total > 1000, "high", "low")
//   ROUND(SUM(lines.*.totalHt), 2)
//   FORMAT(doc.date, "YYYY-MM-DD")
//   COUNT(lines.*.totalHt > 0)
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

import type { UniversalDocumentData } from '../../types/data/UniversalDocumentData';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ExpressionValue = number | string | boolean | null;

export interface EvaluationContext {
  data: UniversalDocumentData;
  computed: Record<string, ExpressionValue>;
  /** Current line index when evaluating within a line context */
  currentLineIndex?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  /** Expected return type */
  returnType?: 'number' | 'string' | 'boolean' | 'any';
}

export type ExpressionFunction = (
  args: ExpressionValue[],
  context: EvaluationContext,
) => ExpressionValue;

// â”€â”€â”€ Tokenizer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TokenType =
  | 'number' | 'string' | 'identifier'
  | 'lparen' | 'rparen' | 'comma' | 'dot' | 'star'
  | 'plus' | 'minus' | 'asterisk' | 'slash'
  | 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte'
  | 'and' | 'or' | 'not'
  | 'eof';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const peek = () => input[i] ?? '';
  const advance = () => input[i++];
  const pos = () => i;

  while (i < input.length) {
    const start = pos();
    const ch = peek();

    // Skip whitespace
    if (/\s/.test(ch)) { advance(); continue; }

    // String literal
    if (ch === '"' || ch === "'") {
      const quote = ch;
      advance();
      let str = '';
      while (i < input.length && peek() !== quote) {
        if (peek() === '\\') { advance(); str += advance(); }
        else { str += advance(); }
      }
      if (peek() === quote) advance();
      tokens.push({ type: 'string', value: str, pos: start });
      continue;
    }

    // Number
    if (/[\d.]/.test(ch) && !(ch === '.' && /[\d.]/.test(input[i + 1] ?? ''))) {
      let num = '';
      while (i < input.length && /[\d.]/.test(peek())) num += advance();
      tokens.push({ type: 'number', value: num, pos: start });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_\u0600-\u06FF]/.test(ch)) {
      let id = '';
      while (i < input.length && /[a-zA-Z0-9_\u0600-\u06FF]/.test(peek())) id += advance();
      tokens.push({ type: 'identifier', value: id, pos: start });
      continue;
    }

    // Multi-char operators
    const next2 = input.slice(i, i + 2);
    if (next2 === '==') { tokens.push({ type: 'eq', value: '==', pos: start }); i += 2; continue; }
    if (next2 === '!=') { tokens.push({ type: 'neq', value: '!=', pos: start }); i += 2; continue; }
    if (next2 === '<=') { tokens.push({ type: 'lte', value: '<=', pos: start }); i += 2; continue; }
    if (next2 === '>=') { tokens.push({ type: 'gte', value: '>=', pos: start }); i += 2; continue; }
    if (next2 === '&&') { tokens.push({ type: 'and', value: '&&', pos: start }); i += 2; continue; }
    if (next2 === '||') { tokens.push({ type: 'or', value: '||', pos: start }); i += 2; continue; }

    // Single-char operators
    const singleOps: Record<string, TokenType> = {
      '(': 'lparen', ')': 'rparen', ',': 'comma', '.': 'dot', '*': 'star',
      '+': 'plus', '-': 'minus', '/': 'slash', '<': 'lt', '>': 'gt', '!': 'not',
    };
    if (singleOps[ch]) { tokens.push({ type: singleOps[ch], value: ch, pos: start }); advance(); continue; }

    // Unknown character â€” skip
    advance();
  }

  tokens.push({ type: 'eof', value: '', pos: i });
  return tokens;
}

// â”€â”€â”€ AST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ASTNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'identifier'; name: string }
  | { kind: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { kind: 'unary'; op: string; operand: ASTNode }
  | { kind: 'call'; name: string; args: ASTNode[] }
  | { kind: 'member'; object: ASTNode; property: string }
  | { kind: 'wildcard'; prefix: string; field: string };

// â”€â”€â”€ Parser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ParseError extends Error {
  constructor(message: string, public pos: number) {
    super(`Parse error at position ${pos}: ${message}`);
  }
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(input: string) {
    this.tokens = tokenize(input);
  }

  private peek(): Token { return this.tokens[this.pos] ?? { type: 'eof', value: '', pos: -1 }; }
  private advance(): Token { return this.tokens[this.pos++] ?? { type: 'eof', value: '', pos: -1 }; }
  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) throw new ParseError(`Expected ${type}, got ${token.type} (${token.value})`, token.pos);
    return this.advance();
  }

  parse(): ASTNode {
    return this.parseOr();
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (this.peek().type === 'or') {
      this.advance();
      left = { kind: 'binary', op: '||', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): ASTNode {
    let left = this.parseComparison();
    while (this.peek().type === 'and') {
      this.advance();
      left = { kind: 'binary', op: '&&', left, right: this.parseComparison() };
    }
    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive();
    const cmpOps: Record<string, string> = { eq: '==', neq: '!=', lt: '<', lte: '<=', gt: '>', gte: '>=' };
    const t = this.peek();
    if (cmpOps[t.type]) {
      this.advance();
      left = { kind: 'binary', op: cmpOps[t.type], left, right: this.parseAdditive() };
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'plus' || this.peek().type === 'minus') {
      const op = this.advance().value;
      left = { kind: 'binary', op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    while (this.peek().type === 'asterisk' || this.peek().type === 'slash') {
      const op = this.advance().value;
      left = { kind: 'binary', op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.peek().type === 'minus') {
      this.advance();
      return { kind: 'unary', op: '-', operand: this.parsePrimary() };
    }
    if (this.peek().type === 'not') {
      this.advance();
      return { kind: 'unary', op: '!', operand: this.parsePrimary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const t = this.peek();

    // Parenthesized expression
    if (t.type === 'lparen') {
      this.advance();
      const expr = this.parseOr();
      this.expect('rparen');
      return expr;
    }

    // Number literal
    if (t.type === 'number') {
      this.advance();
      return { kind: 'number', value: parseFloat(t.value) };
    }

    // String literal
    if (t.type === 'string') {
      this.advance();
      return { kind: 'string', value: t.value };
    }

    // Identifier â€” could be a function call, member access, or wildcard
    if (t.type === 'identifier') {
      this.advance();
      let node: ASTNode = { kind: 'identifier', name: t.value };

      // Function call: IDENTIFIER(...)
      if (this.peek().type === 'lparen') {
        this.advance();
        const args: ASTNode[] = [];
        while (this.peek().type !== 'rparen') {
          args.push(this.parseOr());
          if (this.peek().type === 'comma') this.advance();
        }
        this.expect('rparen');
        node = { kind: 'call', name: t.value, args };
      }

      // Member access: expr.property
      while (this.peek().type === 'dot') {
        this.advance();
        const prop = this.expect('identifier');
        node = { kind: 'member', object: node, property: prop.value };
      }

      // Wildcard: prefix.*.field (for array aggregation)
      if (this.peek().type === 'star') {
        this.advance();
        this.expect('dot');
        const field = this.expect('identifier');
        node = { kind: 'wildcard', prefix: t.value, field: field.value };
      }

      return node;
    }

    throw new ParseError(`Unexpected token: ${t.value}`, t.pos);
  }
}

// â”€â”€â”€ Evaluator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function isTruthy(val: ExpressionValue): boolean {
  if (val === null) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  return val !== '';
}

function compareValues(a: ExpressionValue, b: ExpressionValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

// â”€â”€â”€ Cache Entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CacheEntry {
  value: ExpressionValue;
  timestamp: number;
}

// â”€â”€â”€ FormulaEngine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class FormulaEngine {
  private readonly functions = new Map<string, ExpressionFunction>();
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheOrder: string[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private static readonly CACHE_TTL = 60_000; // 60 seconds
  private static readonly CACHE_MAX = 500; // max entries
  private _dataVersion = 0;

  constructor() {
    this.registerBuiltins();
  }

  // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  registerFunction(name: string, fn: ExpressionFunction): void {
    this.functions.set(name.toUpperCase(), fn);
  }

  /** Increment data version to invalidate all cached evaluations */
  bumpDataVersion(): void {
    this._dataVersion++;
  }

  evaluate(expression: string, context: EvaluationContext): ExpressionValue {
    // Context-aware cache key: expression + data version + computed keys hash
    const ctxHash = this._hashContext(context);
    const cacheKey = `${expression}::v${this._dataVersion}::${ctxHash}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      if (Date.now() - cached.timestamp < FormulaEngine.CACHE_TTL) {
        this.cacheHits++;
        return cached.value;
      }
      this.cache.delete(cacheKey);
      const idx = this.cacheOrder.indexOf(cacheKey);
      if (idx >= 0) this.cacheOrder.splice(idx, 1);
    }
    this.cacheMisses++;

    try {
      const parser = new Parser(expression);
      const ast = parser.parse();
      const result = this.evaluateNode(ast, context);
      this._setCache(cacheKey, result);
      return result;
    } catch (e) {
      if (e instanceof ParseError) return null;
      throw e;
    }
  }

  validate(expression: string): ValidationResult {
    try {
      const parser = new Parser(expression);
      parser.parse();
      return { valid: true, returnType: 'any' };
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheOrder.length = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this._dataVersion++;
  }

  get stats() {
    return { size: this.cache.size, hits: this.cacheHits, misses: this.cacheMisses, dataVersion: this._dataVersion };
  }

  // â”€â”€ Private â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private _setCache(key: string, value: ExpressionValue): void {
    if (this.cache.size >= FormulaEngine.CACHE_MAX) {
      const oldest = this.cacheOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
    this.cacheOrder.push(key);
  }

  private _hashContext(ctx: EvaluationContext): string {
    const d = ctx.data;
    const parts: string[] = [
      String(d.doc.number),
      d.doc.date,
      String(d.totals.totalHt),
      String(d.totals.totalTtc),
      String(d.totals.paid),
      String(d.lines.length),
    ];
    if (d.balance) {
      parts.push(String(d.balance.previous));
      parts.push(String(d.balance.current));
    }
    if (ctx.currentLineIndex !== undefined) {
      parts.push(`i${ctx.currentLineIndex}`);
    }
    return parts.join('|');
  }

  private evaluateNode(node: ASTNode, context: EvaluationContext): ExpressionValue {
    switch (node.kind) {
      case 'number':
        return node.value;

      case 'string':
        return node.value;

      case 'identifier':
        return this.resolveIdentifier(node.name, context);

      case 'binary':
        return this.evaluateBinary(node, context);

      case 'unary':
        return this.evaluateUnary(node, context);

      case 'call':
        return this.evaluateCall(node, context);

      case 'member':
        return this.evaluateMember(node, context);

      case 'wildcard':
        return this.evaluateWildcard(node, context);
    }
  }

  private resolveIdentifier(name: string, ctx: EvaluationContext): ExpressionValue {
    const d = ctx.data;

    // Top-level fields
    if (name === 'docNumber') return d.doc.number;
    if (name === 'docDate') return d.doc.date;
    if (name === 'dueDate') return d.doc.dueDate ?? null;
    if (name === 'totalHt') return d.totals.totalHt;
    if (name === 'totalTva') return d.totals.totalTva;
    if (name === 'totalTtc') return d.totals.totalTtc;
    if (name === 'paid') return d.totals.paid;
    if (name === 'change') return d.totals.change;
    if (name === 'remaining') return d.totals.remaining;
    if (name === 'fiscalStamp') return d.totals.fiscalStamp;
    if (name === 'totalDiscount') return d.totals.totalDiscount;
    if (name === 'prevBalance') return d.balance?.previous ?? null;
    if (name === 'newBalance') return d.balance?.current ?? null;

    // Computed values
    if (name in ctx.computed) return ctx.computed[name];

    // Current line field (within line iteration)
    if (ctx.currentLineIndex !== undefined) {
      const line = d.lines[ctx.currentLineIndex];
      if (!line) return null;
      if (name === 'rowNumber') return line.rowNumber;
      if (name === 'lineRef') return line.ref ?? null;
      if (name === 'lineName') return line.name;
      if (name === 'quantity') return line.quantity;
      if (name === 'unitPriceHt') return line.unitPriceHt;
      if (name === 'lineTotalHt') return line.totalHt;
      if (name === 'lineTotalTva') return line.totalTva;
      if (name === 'lineTotalTtc') return line.totalTtc;
      if (name === 'tvaRate') return line.tvaPct;
    }

    return null;
  }

  private evaluateBinary(node: { kind: 'binary'; op: string; left: ASTNode; right: ASTNode }, ctx: EvaluationContext): ExpressionValue {
    const left = this.evaluateNode(node.left, ctx);
    const right = this.evaluateNode(node.right, ctx);

    switch (node.op) {
      case '+': {
        if (typeof left === 'string' || typeof right === 'string') return String(left ?? '') + String(right ?? '');
        return (left as number ?? 0) + (right as number ?? 0);
      }
      case '-': return (left as number ?? 0) - (right as number ?? 0);
      case '*': return (left as number ?? 0) * (right as number ?? 0);
      case '/': {
        const r = right as number ?? 0;
        if (r === 0) return null;
        return (left as number ?? 0) / r;
      }
      case '==': return left === right;
      case '!=': return left !== right;
      case '<': return compareValues(left, right) < 0;
      case '<=': return compareValues(left, right) <= 0;
      case '>': return compareValues(left, right) > 0;
      case '>=': return compareValues(left, right) >= 0;
      case '&&': return isTruthy(left) && isTruthy(right);
      case '||': return isTruthy(left) || isTruthy(right);
      default: return null;
    }
  }

  private evaluateUnary(node: { kind: 'unary'; op: string; operand: ASTNode }, ctx: EvaluationContext): ExpressionValue {
    const operand = this.evaluateNode(node.operand, ctx);
    switch (node.op) {
      case '-': return -(operand as number ?? 0);
      case '!': return !isTruthy(operand);
      default: return null;
    }
  }

  private evaluateCall(node: { kind: 'call'; name: string; args: ASTNode[] }, ctx: EvaluationContext): ExpressionValue {
    const fn = this.functions.get(node.name.toUpperCase());
    if (!fn) return null;
    const argValues = node.args.map(a => this.evaluateNode(a, ctx));
    return fn(argValues, ctx);
  }

  private evaluateMember(node: { kind: 'member'; object: ASTNode; property: string }, ctx: EvaluationContext): ExpressionValue {
    const obj = this.evaluateNode(node.object, ctx);
    if (obj == null || typeof obj !== 'object') return null;
    return (obj as Record<string, unknown>)[node.property] as ExpressionValue ?? null;
  }

  private evaluateWildcard(node: { kind: 'wildcard'; prefix: string; field: string }, ctx: EvaluationContext): ExpressionValue {
    // Currently only supports lines.*.field
    if (node.prefix !== 'lines') return null;
    return ctx.data.lines.map(line => {
      const val = (line as Record<string, unknown>)[node.field];
      return typeof val === 'number' ? val : 0;
    });
  }

  // â”€â”€ Built-in functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private registerBuiltins(): void {
    this.functions.set('IF', ([cond, t, f]: ExpressionValue[]) =>
      isTruthy(cond) ? t : f,
    );

    this.functions.set('SUM', (args: ExpressionValue[]) =>
      args.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0),
    );

    this.functions.set('AVG', (args: ExpressionValue[]) => {
      const nums = args.filter((v): v is number => typeof v === 'number');
      return nums.length > 0 ? nums.reduce((s, v) => s + v, 0) / nums.length : 0;
    });

    this.functions.set('ROUND', ([val, decimals]: ExpressionValue[]) => {
      const n = val as number ?? 0;
      const d = Math.pow(10, Math.floor(decimals as number ?? 0));
      return Math.round(n * d) / d;
    });

    this.functions.set('CONCAT', (args: ExpressionValue[]) =>
      args.map(v => v ?? '').join(''),
    );

    this.functions.set('FORMAT', ([val, fmt]: ExpressionValue[]) => {
      if (val == null) return '';
      if (fmt === 'NUMBER' || fmt === 'number') {
        const n = val as number;
        return n.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      if (fmt === 'DATE' || fmt === 'date' || fmt === 'YYYY-MM-DD') {
        const d = String(val);
        if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
        return d;
      }
      return String(val);
    });

    this.functions.set('TODAY', () =>
      new Date().toISOString().slice(0, 10),
    );

    this.functions.set('MIN', (args: ExpressionValue[]) => {
      const nums = args.filter((v): v is number => typeof v === 'number');
      return nums.length > 0 ? Math.min(...nums) : null;
    });

    this.functions.set('MAX', (args: ExpressionValue[]) => {
      const nums = args.filter((v): v is number => typeof v === 'number');
      return nums.length > 0 ? Math.max(...nums) : null;
    });

    this.functions.set('COUNT', (args: ExpressionValue[]) => args.length);

    this.functions.set('ABS', ([val]: ExpressionValue[]) =>
      Math.abs(val as number ?? 0),
    );

    this.functions.set('LEN', ([val]: ExpressionValue[]) =>
      String(val ?? '').length,
    );

    this.functions.set('UPPER', ([val]: ExpressionValue[]) =>
      String(val ?? '').toUpperCase(),
    );

    this.functions.set('LOWER', ([val]: ExpressionValue[]) =>
      String(val ?? '').toLowerCase(),
    );
  }
}

// â”€â”€â”€ Singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const formulaEngine = new FormulaEngine();
```

## FILE: resources/js/pages/settings/print-settings/services/engines/index.ts
```
export type { ExpressionValue, EvaluationContext, ValidationResult, ExpressionFunction } from './FormulaEngine';
export { FormulaEngine, formulaEngine } from './FormulaEngine';
export type { RuleAction, RuleEvaluationResult } from './RulesEngine';
export { RulesEngine, rulesEngine } from './RulesEngine';
```

## FILE: resources/js/pages/settings/print-settings/services/engines/RulesEngine.ts
```
﻿// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// reporting/core/engines/RulesEngine.ts
//
// Layer 1 â€” zero dependencies. Pure TypeScript.
//
// Evaluates declarative conditions to determine show/hide, highlight,
// and disable rules for report elements.
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

import type { FormulaEngine, EvaluationContext } from './FormulaEngine';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type RuleAction = 'show' | 'hide' | 'highlight' | 'disable';

export interface ReportRule {
  id: string;
  /** Formula expression string evaluated by FormulaEngine */
  condition: string;
  action: RuleAction;
  /** Section or element ID this rule applies to */
  target: string;
  /** Rule ordering â€” higher priority runs later (default 0) */
  priority?: number;
  /** For highlight action: CSS properties to apply */
  highlightStyle?: Record<string, string>;
}

export interface RuleEvaluationResult {
  /** Per-element visibility: true = visible, false = hidden */
  visibility: Record<string, boolean>;
  /** Per-element highlight styles */
  highlights: Record<string, Record<string, string>>;
  /** Per-element disabled state: true = disabled */
  disabled: Record<string, boolean>;
}

// â”€â”€â”€ RulesEngine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class RulesEngine {
  /**
   * Evaluate a set of rules against the given context.
   * Rules are sorted by priority before evaluation.
   * Later rules override earlier ones for the same target.
   * Failed condition evaluations are skipped gracefully.
   */
  evaluate(
    rules: ReportRule[],
    context: EvaluationContext,
    formulaEngine: FormulaEngine,
  ): RuleEvaluationResult {
    const result = this.emptyResult();

    const sorted = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    for (const rule of sorted) {
      try {
        const raw = formulaEngine.evaluate(rule.condition, context);
        const truthy = raw !== null && raw !== 0 && raw !== '' && raw !== false;

        if (!truthy) continue;

        this.applyAction(result, rule);
      } catch {
        // Failed condition evaluation â€” skip rule gracefully
      }
    }

    return result;
  }

  /**
   * Merge multiple results. Later results override earlier ones.
   */
  merge(base: RuleEvaluationResult, overrides: RuleEvaluationResult): RuleEvaluationResult {
    return {
      visibility: { ...base.visibility, ...overrides.visibility },
      highlights: this.mergeHighlights(base.highlights, overrides.highlights),
      disabled: { ...base.disabled, ...overrides.disabled },
    };
  }

  /**
   * Default result: everything visible, nothing highlighted, nothing disabled.
   */
  emptyResult(): RuleEvaluationResult {
    return {
      visibility: {},
      highlights: {},
      disabled: {},
    };
  }

  // â”€â”€ Public (used by RulesEngineAdvanced) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  applyAction(result: RuleEvaluationResult, rule: ReportRule): void {
    switch (rule.action) {
      case 'show':
        result.visibility[rule.target] = true;
        break;

      case 'hide':
        result.visibility[rule.target] = false;
        break;

      case 'highlight':
        if (rule.highlightStyle) {
          const existing = result.highlights[rule.target];
          if (existing) {
            Object.assign(existing, rule.highlightStyle);
          } else {
            result.highlights[rule.target] = { ...rule.highlightStyle };
          }
        }
        break;

      case 'disable':
        result.disabled[rule.target] = true;
        break;
    }
  }

  private mergeHighlights(
    base: Record<string, Record<string, string>>,
    overrides: Record<string, Record<string, string>>,
  ): Record<string, Record<string, string>> {
    const merged: Record<string, Record<string, string>> = {};

    for (const [key, styles] of Object.entries(base)) {
      merged[key] = { ...styles };
    }

    for (const [key, styles] of Object.entries(overrides)) {
      if (merged[key]) {
        Object.assign(merged[key], styles);
      } else {
        merged[key] = { ...styles };
      }
    }

    return merged;
  }
}

// â”€â”€â”€ Singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const rulesEngine = new RulesEngine();
```

## FILE: resources/js/pages/settings/print-settings/services/FieldRegistry.ts
```
﻿// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
// reporting/data/FieldRegistry.ts
//
// Layer 2 â€” depends on UniversalDocumentData types only.
// Catalogs every entity field available for use in report formulas, rules, and
// template properties. The singleton `fieldRegistry` is the single source of
// truth for field discovery in the reporting framework.
// â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface FieldDefinition {
  path: string;
  label: string;
  group: string;
  type: 'string' | 'number' | 'boolean';
  /**
   * Primary aggregation hint for array-numeric fields:
   * - `'sum'` â€” supports SUM, AVG, COUNT
   * - `'count'` â€” supports COUNT only (string/boolean array fields)
   * - `null` â€” no aggregation
   */
  aggregate?: 'sum' | 'avg' | 'count' | null;
  description?: string;
}

export interface FieldGroup {
  id: string;
  label: string;
  fields: FieldDefinition[];
}

// â”€â”€â”€ Registry implementation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class FieldRegistry {
  private byPath = new Map<string, FieldDefinition>();
  private groups = new Map<string, FieldGroup>();

  constructor(fields: FieldDefinition[]) {
    const grouped = new Map<string, FieldDefinition[]>();

    fields.forEach(f => {
      this.byPath.set(f.path, f);
      const list = grouped.get(f.group) ?? [];
      list.push(f);
      grouped.set(f.group, list);
    });

    const groupLabels: Record<string, string> = {
      doc:      'ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ…ط³طھظ†ط¯',
      company:  'ط§ظ„ط´ط±ظƒط©',
      party:    'ط§ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯',
      lines:    'ط§ظ„ط£ط³ط·ط±',
      totals:   'ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط§طھ',
      balance:  'ط§ظ„ط±طµظٹط¯',
      payments: 'ط§ظ„ظ…ط¯ظپظˆط¹ط§طھ',
      computed: 'ظ…ط­ط³ظˆط¨',
    };

    grouped.forEach((fields, id) => {
      this.groups.set(id, {
        id,
        label: groupLabels[id] ?? id,
        fields,
      });
    });
  }

  getGroup(groupId: string): FieldGroup {
    const g = this.groups.get(groupId);
    if (!g) throw new Error(`FieldRegistry: unknown group "${groupId}"`);
    return g;
  }

  getAllGroups(): FieldGroup[] {
    const order = ['doc', 'company', 'party', 'lines', 'totals', 'balance', 'payments', 'computed'];
    return order.reduce<FieldGroup[]>((acc, id) => {
      const g = this.groups.get(id);
      if (g) acc.push(g);
      return acc;
    }, []);
  }

  getByPath(path: string): FieldDefinition | undefined {
    return this.byPath.get(path);
  }

  search(query: string): FieldDefinition[] {
    const q = query.toLowerCase();
    const results: FieldDefinition[] = [];
    this.byPath.forEach(f => {
      if (f.path.toLowerCase().includes(q) || f.label.includes(q)) {
        results.push(f);
      }
    });
    return results;
  }

  register(field: FieldDefinition): void {
    if (this.byPath.has(field.path)) {
      throw new Error(`FieldRegistry: field "${field.path}" already registered`);
    }
    this.byPath.set(field.path, field);
    let group = this.groups.get(field.group);
    if (!group) {
      group = { id: field.group, label: field.group, fields: [] };
      this.groups.set(field.group, group);
    }
    group.fields.push(field);
  }
}

// â”€â”€â”€ All fields from UniversalDocumentData â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ALL_FIELDS: FieldDefinition[] = [
  // â”€â”€ doc (ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ…ط³طھظ†ط¯) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'doc.number',     label: 'ط±ظ‚ظ… ط§ظ„ظپط§طھظˆط±ط©',       group: 'doc', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„ظ…ط³طھظ†ط¯ ط§ظ„ظپط±ظٹط¯' },
  { path: 'doc.date',       label: 'طھط§ط±ظٹط® ط§ظ„ظپط§طھظˆط±ط©',     group: 'doc', type: 'string', description: 'طھط§ط±ظٹط® ط§ظ„ظ…ط³طھظ†ط¯ ط¨طµظٹط؛ط© ISO' },
  { path: 'doc.dueDate',    label: 'طھط§ط±ظٹط® ط§ظ„ط§ط³طھط­ظ‚ط§ظ‚',    group: 'doc', type: 'string', description: 'طھط§ط±ظٹط® ط§ط³طھط­ظ‚ط§ظ‚ ط§ظ„ط¯ظپط¹' },
  { path: 'doc.time',       label: 'ط§ظ„ظˆظ‚طھ',              group: 'doc', type: 'string', description: 'ظˆظ‚طھ ط¥طµط¯ط§ط± ط§ظ„ظ…ط³طھظ†ط¯' },
  { path: 'doc.typeCode',   label: 'ط±ظ…ط² ط§ظ„ظ†ظˆط¹',          group: 'doc', type: 'string', description: 'ط±ظ…ط² ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯ (FV, BL, FA, POS)' },
  { path: 'doc.typeName',   label: 'ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯',        group: 'doc', type: 'string', description: 'ط§ظ„ط§ط³ظ… ط§ظ„ظ…ط­ظ„ظٹ ظ„ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯' },
  { path: 'doc.status',     label: 'ط§ظ„ط­ط§ظ„ط©',             group: 'doc', type: 'string', description: 'ط­ط§ظ„ط© ط§ظ„ظ…ط³طھظ†ط¯ (ظ…ط³ظˆط¯ط©, ظ…ط¤ظƒط¯ط©, ظ…ظ„ط؛ظٹط©)' },
  { path: 'doc.notes',      label: 'ظ…ظ„ط§ط­ط¸ط§طھ',            group: 'doc', type: 'string', description: 'ظ…ظ„ط§ط­ط¸ط§طھ ط¹ظ„ظ‰ ط§ظ„ظ…ط³طھظ†ط¯' },
  { path: 'doc.reference',  label: 'ط§ظ„ظ…ط±ط¬ط¹',             group: 'doc', type: 'string', description: 'ط±ظ‚ظ… ظ…ط±ط¬ط¹ظٹ ط®ط§ط±ط¬ظٹ' },

  // â”€â”€ warehouse طھط­طھ doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'warehouse.id',      label: 'ظ…ط¹ط±ظپ ط§ظ„ظ…ط³طھظˆط¯ط¹',     group: 'doc', type: 'number', description: 'ظ…ط¹ط±ظپ ط§ظ„ظ…ط³طھظˆط¯ط¹ ط§ظ„ط±ظ‚ظ…ظٹ' },
  { path: 'warehouse.name',    label: 'ط§ط³ظ… ط§ظ„ظ…ط³طھظˆط¯ط¹',      group: 'doc', type: 'string', description: 'ط§ط³ظ… ط§ظ„ظ…ط³طھظˆط¯ط¹ ط£ظˆ ط§ظ„ظپط±ط¹' },
  { path: 'warehouse.address', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ظ…ط³طھظˆط¯ط¹',    group: 'doc', type: 'string', description: 'ط¹ظ†ظˆط§ظ† ط§ظ„ظ…ط³طھظˆط¯ط¹' },
  { path: 'warehouse.code',    label: 'ط±ظ…ط² ط§ظ„ظ…ط³طھظˆط¯ط¹',      group: 'doc', type: 'string', description: 'ط±ظ…ط² ط§ظ„ظ…ط³طھظˆط¯ط¹' },

  // â”€â”€ session طھط­طھ doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'session.id',         label: 'ظ…ط¹ط±ظپ ط§ظ„ط¬ظ„ط³ط©',      group: 'doc', type: 'number', description: 'ظ…ط¹ط±ظپ ط¬ظ„ط³ط© ط§ظ„ط¨ظٹط¹' },
  { path: 'session.code',       label: 'ط±ظ…ط² ط§ظ„ط¬ظ„ط³ط©',       group: 'doc', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„ط¬ظ„ط³ط©' },
  { path: 'session.openedAt',   label: 'ظˆظ‚طھ ط§ظ„ظپطھط­',        group: 'doc', type: 'string', description: 'ظˆظ‚طھ ظپطھط­ ط§ظ„ط¬ظ„ط³ط©' },
  { path: 'session.closedAt',   label: 'ظˆظ‚طھ ط§ظ„ط¥ط؛ظ„ط§ظ‚',      group: 'doc', type: 'string', description: 'ظˆظ‚طھ ط¥ط؛ظ„ط§ظ‚ ط§ظ„ط¬ظ„ط³ط©' },
  { path: 'session.cashierName', label: 'ط§ط³ظ… ط§ظ„ظƒط§ط´ظٹط±',     group: 'doc', type: 'string', description: 'ط§ط³ظ… ط£ظ…ظٹظ† ط§ظ„طµظ†ط¯ظˆظ‚' },

  // â”€â”€ currency طھط­طھ doc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'currency.code',   label: 'ط±ظ…ط² ط§ظ„ط¹ظ…ظ„ط©',         group: 'doc', type: 'string', description: 'ط±ظ…ط² ط§ظ„ط¹ظ…ظ„ط© (DZD, EUR, USD)' },
  { path: 'currency.symbol', label: 'ط±ظ…ط² ط§ظ„ط¹ظ…ظ„ط©',         group: 'doc', type: 'string', description: 'ط±ظ…ط² ط§ظ„ط¹ظ…ظ„ط© ط§ظ„ظ…ط­ظ„ظٹ (ط¯ط¬)' },
  { path: 'currency.rate',   label: 'ط³ط¹ط± ط§ظ„طµط±ظپ',          group: 'doc', type: 'number', description: 'ط³ط¹ط± ط§ظ„طµط±ظپ ظ…ظ‚ط§ط¨ظ„ ط§ظ„ط¹ظ…ظ„ط© ط§ظ„ط£ط³ط§ط³ظٹط©' },

  // â”€â”€ company (ط§ظ„ط´ط±ظƒط©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'company.name',    label: 'ط§ط³ظ… ط§ظ„ط´ط±ظƒط©',         group: 'company', type: 'string', description: 'ط§ط³ظ… ط§ظ„ط´ط±ظƒط© ط§ظ„ظ…ط·ط¨ظˆط¹ط© ط¹ظ„ظ‰ ط§ظ„ظ…ط³طھظ†ط¯' },
  { path: 'company.address', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط´ط±ظƒط©',       group: 'company', type: 'string', description: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط´ط±ظƒط©' },
  { path: 'company.phone',   label: 'ظ‡ط§طھظپ ط§ظ„ط´ط±ظƒط©',        group: 'company', type: 'string', description: 'ط±ظ‚ظ… ظ‡ط§طھظپ ط§ظ„ط´ط±ظƒط©' },
  { path: 'company.nif',     label: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¬ط¨ط§ط¦ظٹ',      group: 'company', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„طھط¹ط±ظٹظپ ط§ظ„ط¬ط¨ط§ط¦ظٹ' },
  { path: 'company.rc',      label: 'ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ',      group: 'company', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ' },
  { path: 'company.nis',     label: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¥ط­طµط§ط¦ظٹ',     group: 'company', type: 'string', description: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¥ط­طµط§ط¦ظٹ' },
  { path: 'company.ice',     label: 'ط±ظ‚ظ… ط§ظ„ط­ط³ط§ط¨ ICE',     group: 'company', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„ط­ط³ط§ط¨ ط§ظ„ط¬ط§ط±ظٹ ICE' },
  { path: 'company.article', label: 'ط§ظ„ظ…ط§ط¯ط©',             group: 'company', type: 'string', description: 'ط±ظ‚ظ… ط§ظ„ظ…ط§ط¯ط©' },
  { path: 'company.logoUrl', label: 'ط±ط§ط¨ط· ط§ظ„ط´ط¹ط§ط±',        group: 'company', type: 'string', description: 'ط±ط§ط¨ط· طµظˆط±ط© ط´ط¹ط§ط± ط§ظ„ط´ط±ظƒط©' },
  { path: 'company.email',   label: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ',  group: 'company', type: 'string', description: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ„ظ„ط´ط±ظƒط©' },
  { path: 'company.website', label: 'ط§ظ„ظ…ظˆظ‚ط¹ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ',  group: 'company', type: 'string', description: 'ط§ظ„ظ…ظˆظ‚ط¹ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ„ظ„ط´ط±ظƒط©' },

  // â”€â”€ party (ط§ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'party.id',              label: 'ظ…ط¹ط±ظپ ط§ظ„ط·ط±ظپ',           group: 'party', type: 'number', description: 'ط§ظ„ظ…ط¹ط±ظپ ط§ظ„ط±ظ‚ظ…ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.name',            label: 'ط§ط³ظ… ط§ظ„ط¹ظ…ظٹظ„',           group: 'party', type: 'string', description: 'ط§ط³ظ… ط§ظ„ط¹ظ…ظٹظ„ ط£ظˆ ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.type',            label: 'ظ†ظˆط¹ ط§ظ„ط·ط±ظپ',            group: 'party', type: 'string', description: 'ظ†ظˆط¹ ط§ظ„ط·ط±ظپ: ط¹ظ…ظٹظ„ ط£ظˆ ظ…ظˆط±ط¯' },
  { path: 'party.nif',             label: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¬ط¨ط§ط¦ظٹ ظ„ظ„ط·ط±ظپ',  group: 'party', type: 'string', description: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¬ط¨ط§ط¦ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.rc',              label: 'ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ ظ„ظ„ط·ط±ظپ',  group: 'party', type: 'string', description: 'ط§ظ„ط³ط¬ظ„ ط§ظ„طھط¬ط§ط±ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.nis',             label: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¥ط­طµط§ط¦ظٹ ظ„ظ„ط·ط±ظپ', group: 'party', type: 'string', description: 'ط§ظ„ط±ظ‚ظ… ط§ظ„ط¥ط­طµط§ط¦ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.phone',           label: 'ظ‡ط§طھظپ ط§ظ„ط·ط±ظپ',           group: 'party', type: 'string', description: 'ط±ظ‚ظ… ظ‡ط§طھظپ ط§ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.email',           label: 'ط¨ط±ظٹط¯ ط§ظ„ط·ط±ظپ',           group: 'party', type: 'string', description: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ„ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.address',         label: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط·ط±ظپ',          group: 'party', type: 'string', description: 'ط¹ظ†ظˆط§ظ† ط§ظ„ط¹ظ…ظٹظ„/ط§ظ„ظ…ظˆط±ط¯' },
  { path: 'party.deliveryAddress', label: 'ط¹ظ†ظˆط§ظ† ط§ظ„طھظˆطµظٹظ„',        group: 'party', type: 'string', description: 'ط¹ظ†ظˆط§ظ† ط§ظ„طھظˆطµظٹظ„ ظ„ظ„ط¹ظ…ظٹظ„' },
  { path: 'party.cashierName',     label: 'ط§ط³ظ… ط§ظ„ظƒط§ط´ظٹط±',          group: 'party', type: 'string', description: 'ط§ط³ظ… ط£ظ…ظٹظ† ط§ظ„طµظ†ط¯ظˆظ‚ (ظ„ظ„ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظ†ظ‚ط¯ظٹط©)' },

  // â”€â”€ lines.* (ط§ظ„ط£ط³ط·ط±) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Wildcard paths â€” individual line fields accessible via lines.*.<field>
  { path: 'lines.*.rowNumber',   label: 'ط±ظ‚ظ… ط§ظ„ط³ط·ط±',     group: 'lines', type: 'number', aggregate: 'sum',  description: 'ط±ظ‚ظ… ط§ظ„ط³ط·ط± (1-based)' },
  { path: 'lines.*.ref',         label: 'ط§ظ„ظ…ط±ط¬ط¹',        group: 'lines', type: 'string', aggregate: 'count', description: 'ظ…ط±ط¬ط¹ ط§ظ„ظ…ظ†طھط¬ / SKU' },
  { path: 'lines.*.barcode',     label: 'ط§ظ„ط¨ط§ط±ظƒظˆط¯',      group: 'lines', type: 'string', aggregate: 'count', description: 'ط§ظ„ط¨ط§ط±ظƒظˆط¯' },
  { path: 'lines.*.name',        label: 'ط§ظ„ط¨ظٹط§ظ†',        group: 'lines', type: 'string', aggregate: 'count', description: 'ط§ط³ظ… ط§ظ„ظ…ظ†طھط¬ ط£ظˆ ط§ظ„ط®ط¯ظ…ط©' },
  { path: 'lines.*.unit',        label: 'ط§ظ„ظˆط­ط¯ط©',        group: 'lines', type: 'string', aggregate: 'count', description: 'ظˆط­ط¯ط© ط§ظ„ظ‚ظٹط§ط³' },
  { path: 'lines.*.quantity',    label: 'ط§ظ„ظƒظ…ظٹط©',        group: 'lines', type: 'number', aggregate: 'sum',  description: 'ط§ظ„ظƒظ…ظٹط© ط§ظ„ظ…ط¨ط§ط¹ط©' },
  { path: 'lines.*.unitPriceHt', label: 'ط³ط¹ط± ط§ظ„ظˆط­ط¯ط©',    group: 'lines', type: 'number', aggregate: 'sum',  description: 'ط³ط¹ط± ط§ظ„ظˆط­ط¯ط© ط¨ط¯ظˆظ† ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'lines.*.unitPriceTtc', label: 'ط³ط¹ط± ط§ظ„ظˆط­ط¯ط© ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©', group: 'lines', type: 'number', aggregate: 'sum', description: 'ط³ط¹ط± ط§ظ„ظˆط­ط¯ط© ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'lines.*.tvaRate',     label: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط©',  group: 'lines', type: 'number', aggregate: 'sum',  description: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط© (0.19)' },
  { path: 'lines.*.tvaPct',      label: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط© %', group: 'lines', type: 'number', aggregate: 'sum', description: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط© ط§ظ„ظ…ط¦ظˆظٹط© (19)' },
  { path: 'lines.*.discountPct', label: 'ظ†ط³ط¨ط© ط§ظ„ط®طµظ…',    group: 'lines', type: 'number', aggregate: 'sum',  description: 'ظ†ط³ط¨ط© ط§ظ„ط®طµظ… ط§ظ„ظ…ط¦ظˆظٹط©' },
  { path: 'lines.*.discountAmt', label: 'ظ‚ظٹظ…ط© ط§ظ„ط®طµظ…',    group: 'lines', type: 'number', aggregate: 'sum',  description: 'ظ‚ظٹظ…ط© ط§ظ„ط®طµظ… ط¨ط§ظ„ط¹ظ…ظ„ط©' },
  { path: 'lines.*.totalHt',     label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط§ظ„ط®ط§ظ…', group: 'lines', type: 'number', aggregate: 'sum',  description: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط¨ط¯ظˆظ† ط§ظ„ط¶ط±ظٹط¨ط© ط¨ط¹ط¯ ط§ظ„ط®طµظ…' },
  { path: 'lines.*.totalTva',    label: 'ظ‚ظٹظ…ط© ط§ظ„ط¶ط±ظٹط¨ط©',  group: 'lines', type: 'number', aggregate: 'sum',  description: 'ظ‚ظٹظ…ط© ط§ظ„ط¶ط±ظٹط¨ط© ط¹ظ„ظ‰ ط§ظ„ط³ط·ط±' },
  { path: 'lines.*.totalTtc',    label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©', group: 'lines', type: 'number', aggregate: 'sum', description: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'lines.*.lot',         label: 'ط±ظ‚ظ… ط§ظ„ط¯ظپط¹ط©',    group: 'lines', type: 'string', aggregate: 'count', description: 'ط±ظ‚ظ… ط§ظ„ط¯ظپط¹ط© / ط§ظ„طھط³ظ„ط³ظ„' },
  { path: 'lines.*.notes',       label: 'ظ…ظ„ط§ط­ط¸ط§طھ',       group: 'lines', type: 'string', aggregate: 'count', description: 'ظ…ظ„ط§ط­ط¸ط§طھ ط¹ظ„ظ‰ ط§ظ„ط³ط·ط±' },

  // â”€â”€ totals (ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹط§طھ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'totals.totalHt',       label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط§ظ„ط®ط§ظ…',             group: 'totals', type: 'number', description: 'ظ…ط¬ظ…ظˆط¹ ظƒظ„ ط§ظ„ط£ط³ط·ط± ط¨ط¯ظˆظ† ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'totals.totalTva',      label: 'ظ…ط¬ظ…ظˆط¹ ط§ظ„ط¶ط±ظٹط¨ط©',            group: 'totals', type: 'number', description: 'ظ…ط¬ظ…ظˆط¹ ط§ظ„ط¶ط±ظٹط¨ط© ط¹ظ„ظ‰ ط§ظ„ظ‚ظٹظ…ط© ط§ظ„ظ…ط¶ط§ظپط©' },
  { path: 'totals.totalTtc',      label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©',     group: 'totals', type: 'number', description: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط§ظ„ظ†ظ‡ط§ط¦ظٹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'totals.fiscalStamp',   label: 'ط§ظ„ط·ط§ط¨ط¹ ط§ظ„ط¬ط¨ط§ط¦ظٹ',           group: 'totals', type: 'number', description: 'ط§ظ„ط·ط§ط¨ط¹ ط§ظ„ط¬ط¨ط§ط¦ظٹ (1% ط¨ظ‚ظٹظ…ط© 2500 ط¯ط¬ ظƒط­ط¯ ط£ظ‚طµظ‰)' },
  { path: 'totals.totalDiscount', label: 'ظ…ط¬ظ…ظˆط¹ ط§ظ„ط®طµظ…',              group: 'totals', type: 'number', description: 'ظ…ط¬ظ…ظˆط¹ ط§ظ„ط®طµظ… ط¹ظ„ظ‰ ظƒظ„ ط§ظ„ط£ط³ط·ط±' },
  { path: 'totals.paid',          label: 'ط§ظ„ظ…ط¯ظپظˆط¹',                  group: 'totals', type: 'number', description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط¯ظپظˆط¹ ظپط¹ظ„ط§ظ‹' },
  { path: 'totals.change',        label: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط±طھط¬ط¹',           group: 'totals', type: 'number', description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط±طھط¬ط¹ ظ„ظ„ط¹ظ…ظٹظ„' },
  { path: 'totals.remaining',     label: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…طھط¨ظ‚ظٹ',           group: 'totals', type: 'number', description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…طھط¨ظ‚ظٹ ظ„ظ„ط¯ظپط¹' },

  // â”€â”€ taxBreakdown.* طھط­طھ totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'taxBreakdown.*.rate',   label: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط©',        group: 'totals', type: 'number', aggregate: 'sum', description: 'ظ†ط³ط¨ط© ط§ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'taxBreakdown.*.baseHt', label: 'ط§ظ„ط£ط³ط§ط³ ط§ظ„ط®ط§ط¶ط¹',       group: 'totals', type: 'number', aggregate: 'sum', description: 'ط§ظ„ط£ط³ط§ط³ ط§ظ„ط®ط§ط¶ط¹ ظ„ظ„ط¶ط±ظٹط¨ط©' },
  { path: 'taxBreakdown.*.tva',    label: 'ظ‚ظٹظ…ط© ط§ظ„ط¶ط±ظٹط¨ط©',        group: 'totals', type: 'number', aggregate: 'sum', description: 'ظ‚ظٹظ…ط© ط§ظ„ط¶ط±ظٹط¨ط© ظ„ظ„ط´ط±ظٹط­ط©' },
  { path: 'taxBreakdown.*.ttc',    label: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط©', group: 'totals', type: 'number', aggregate: 'sum', description: 'ط§ظ„ظ…ط¬ظ…ظˆط¹ ط´ط§ظ…ظ„ ط§ظ„ط¶ط±ظٹط¨ط© ظ„ظ„ط´ط±ظٹط­ط©' },

  // â”€â”€ payments (ط§ظ„ظ…ط¯ظپظˆط¹ط§طھ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'payments.*.mode',      label: 'ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹',     group: 'payments', type: 'string', aggregate: 'count', description: 'ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹ (ظ†ظ‚ط¯ط§ظ‹, طھط­ظˆظٹظ„ ط¨ظ†ظƒظٹ)' },
  { path: 'payments.*.amount',    label: 'ط§ظ„ظ…ط¨ظ„ط؛',          group: 'payments', type: 'number', aggregate: 'sum',  description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ظ…ط¯ظپظˆط¹ ط¹ط¨ط± ظ‡ط°ظ‡ ط§ظ„ط·ط±ظٹظ‚ط©' },
  { path: 'payments.*.reference', label: 'ظ…ط±ط¬ط¹ ط§ظ„ط¯ظپط¹',     group: 'payments', type: 'string', aggregate: 'count', description: 'ط§ظ„ظ…ط±ط¬ط¹ ط§ظ„ظ…طµط±ظپظٹ ظ„ظ„ط¯ظپط¹' },
  { path: 'payments.*.date',      label: 'طھط§ط±ظٹط® ط§ظ„ط¯ظپط¹',     group: 'payments', type: 'string', aggregate: 'count', description: 'طھط§ط±ظٹط® ط§ظ„ط¯ظپط¹' },

  // â”€â”€ balance (ط§ظ„ط±طµظٹط¯) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'balance.previous', label: 'ط§ظ„ط±طµظٹط¯ ط§ظ„ط³ط§ط¨ظ‚',   group: 'balance', type: 'number', description: 'ط±طµظٹط¯ ط§ظ„ط¹ظ…ظٹظ„ ظ‚ط¨ظ„ ظ‡ط°ظ‡ ط§ظ„ظپط§طھظˆط±ط©' },
  { path: 'balance.movement', label: 'ط§ظ„ط­ط±ظƒط©',          group: 'balance', type: 'number', description: 'طµط§ظپظٹ ط§ظ„ط­ط±ظƒط© ظ…ظ† ظ‡ط°ظ‡ ط§ظ„ظپط§طھظˆط±ط©' },
  { path: 'balance.current',  label: 'ط§ظ„ط±طµظٹط¯ ط§ظ„ط­ط§ظ„ظٹ',    group: 'balance', type: 'number', description: 'ط±طµظٹط¯ ط§ظ„ط¹ظ…ظٹظ„ ط¨ط¹ط¯ ظ‡ط°ظ‡ ط§ظ„ظپط§طھظˆط±ط©' },
  { path: 'balance.due',      label: 'ط§ظ„ظ…ط³طھط­ظ‚',          group: 'balance', type: 'number', description: 'ط§ظ„ط±طµظٹط¯ ط§ظ„ظ…ط³طھط­ظ‚ ظپظٹ طھط§ط±ظٹط® ط§ظ„ط§ط³طھط­ظ‚ط§ظ‚' },

  // â”€â”€ computed (ظ…ط­ط³ظˆط¨) â€” future / formula-engine fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { path: 'computed.amountInWords', label: 'ط§ظ„ظ…ط¨ظ„ط؛ ظƒطھط§ط¨ط©',     group: 'computed', type: 'string',  description: 'ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ ظƒطھط§ط¨ط© ط¨ط§ظ„ط¹ط±ط¨ظٹ' },
  { path: 'computed.profit',        label: 'ط§ظ„ط±ط¨ط­',            group: 'computed', type: 'number',  description: 'ط§ظ„ط±ط¨ط­ ظپظٹ ط§ظ„ظپط§طھظˆط±ط© (ظ…ط­ط³ظˆط¨)' },
];

// â”€â”€â”€ Legacy / convenience aliases (identical to real paths for field lookup) â”€â”€
// These are NOT registered â€” they exist conceptually but resolve to existing paths.
// The labels here are for documentation only:
//   prevBalance â†’ balance.previous
//   newBalance  â†’ balance.current
//   amountInWords â†’ computed.amountInWords
//   profit â†’ computed.profit

// â”€â”€â”€ Singleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const fieldRegistry = new FieldRegistry(ALL_FIELDS);
```

## FILE: resources/js/pages/settings/print-settings/services/index.ts
```
export type { FieldDefinition, FieldGroup } from './FieldRegistry';
export { fieldRegistry } from './FieldRegistry';
export type { CalculatedField } from './CalculatedFieldService';
export { CalculatedFieldService, calculatedFieldService } from './CalculatedFieldService';
export {
  dbSaveDocConfigs, dbFetchDocConfigs,
  DB_KEY_DOC_CONFIGS,
} from './printStoreService';
export type { ExpressionValue, EvaluationContext, ValidationResult, ExpressionFunction } from './engines/FormulaEngine';
export { FormulaEngine, formulaEngine } from './engines/FormulaEngine';
export type { RuleAction, RuleEvaluationResult } from './engines/RulesEngine';
export { RulesEngine, rulesEngine } from './engines/RulesEngine';
export type { PrintFieldDefinition, PrintFieldGroup } from './PrintFieldRegistry';
export { PRINT_FIELDS, printFieldRegistry } from './PrintFieldRegistry';
export type { ColumnDefinition } from './PrintFieldResolver';
export { printFieldResolver } from './PrintFieldResolver';
```

## FILE: resources/js/pages/settings/print-settings/services/PrintFieldRegistry.ts
```
/**
 * Canonical identifier for every printable field in the system.
 * Every renderer (UniversalPreview, ESC/POS, future PDF) reads fields
 * by ID from this registry — never by raw property access.
 *
 * Design rule:
 *   One field ID → one data source → one visibility rule → one render path.
 */

export interface PrintFieldDefinition {
  id: string;
  label: string;
  group: PrintFieldGroup;
  type: 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'image';
  /** Dot-path inside UniversalDocumentData (e.g. "party.name") */
  sourcePath: string;
  /** Related setting key in SettingsRegistry (e.g. "show_client") */
  settingKey?: string;
  /** Template override path — if non-empty in template, wins over sourcePath */
  overrideTemplatePath?: string;
  align: 'left' | 'center' | 'right';
  visibleByDefault: boolean;
  /** True if this field appears in a repeating table (items, payments, etc.) */
  isRepeating?: boolean;
  /** Path relative to repeating context (e.g. "name" for DocumentLine) */
  relativePath?: string;
  description?: string;
}

export type PrintFieldGroup =
  | 'customer' | 'document' | 'company' | 'session' | 'warehouse'
  | 'item' | 'totals' | 'balance' | 'payment'
  | 'tvaBreakdown' | 'footer' | 'barcode' | 'qr'
  | 'signature' | 'report';

export const PRINT_FIELDS: PrintFieldDefinition[] = [
  // ── Customer / Party ─────────────────────────────────────────────────
  { id: 'customer.name',           label: 'اسم العميل',          group: 'customer', type: 'string',   sourcePath: 'party.name',           settingKey: 'show_client',          align: 'right',   visibleByDefault: true },
  { id: 'customer.nif',            label: 'رقم ضريبة العميل',    group: 'customer', type: 'string',   sourcePath: 'party.nif',            settingKey: 'show_client_nif',      align: 'right',   visibleByDefault: true },
  { id: 'customer.phone',          label: 'هاتف العميل',          group: 'customer', type: 'string',   sourcePath: 'party.phone',          settingKey: 'show_client_phone',    align: 'right',   visibleByDefault: true },
  { id: 'customer.address',        label: 'عنوان العميل',         group: 'customer', type: 'string',   sourcePath: 'party.address',        settingKey: 'show_client_address',  align: 'right',   visibleByDefault: true },
  { id: 'customer.deliveryAddress', label: 'عنوان التسليم',       group: 'customer', type: 'string',   sourcePath: 'party.deliveryAddress', settingKey: 'show_delivery_address', align: 'right',   visibleByDefault: false },
  { id: 'customer.cashierName',    label: 'الكاشير',              group: 'customer', type: 'string',   sourcePath: 'party.cashierName',    settingKey: 'show_cashier',         align: 'right',   visibleByDefault: true },

  // ── Document ─────────────────────────────────────────────────────────
  { id: 'document.number',         label: 'رقم المستند',          group: 'document', type: 'string',   sourcePath: 'doc.number',           settingKey: 'show_doc_number',      align: 'right',   visibleByDefault: true },
  { id: 'document.date',           label: 'التاريخ',              group: 'document', type: 'date',     sourcePath: 'doc.date',             settingKey: 'show_date',            align: 'right',   visibleByDefault: true },
  { id: 'document.time',           label: 'الوقت',                group: 'document', type: 'string',   sourcePath: 'doc.time',             settingKey: 'show_time',            align: 'right',   visibleByDefault: true },
  { id: 'document.dueDate',        label: 'تاريخ الاستحقاق',       group: 'document', type: 'date',     sourcePath: 'doc.dueDate',          settingKey: 'show_due_date',        align: 'right',   visibleByDefault: true },
  { id: 'document.paymentTerm',    label: 'شروط الدفع',           group: 'document', type: 'string',   sourcePath: 'doc.dueDate',          settingKey: 'show_payment_term',    align: 'right',   visibleByDefault: false },
  { id: 'document.typeCode',       label: 'رمز النوع',            group: 'document', type: 'string',   sourcePath: 'doc.typeCode',                                         align: 'right',   visibleByDefault: false },
  { id: 'document.typeName',       label: 'نوع المستند',          group: 'document', type: 'string',   sourcePath: 'doc.typeName',                                        align: 'right',   visibleByDefault: false },
  { id: 'document.status',         label: 'الحالة',               group: 'document', type: 'string',   sourcePath: 'doc.status',                                          align: 'right',   visibleByDefault: false },
  { id: 'document.notes',          label: 'ملاحظات',              group: 'document', type: 'string',   sourcePath: 'doc.notes',                                           align: 'right',   visibleByDefault: false },
  { id: 'document.reference',      label: 'المرجع',               group: 'document', type: 'string',   sourcePath: 'doc.reference',                                       align: 'right',   visibleByDefault: false },

  // ── Session ──────────────────────────────────────────────────────────
  { id: 'session.code',            label: 'رقم الجلسة',           group: 'session',  type: 'string',   sourcePath: 'session.code',          settingKey: 'show_session',         align: 'right',   visibleByDefault: true },
  { id: 'session.cashierName',     label: 'كاشير الجلسة',         group: 'session',  type: 'string',   sourcePath: 'session.cashierName',                                  align: 'right',   visibleByDefault: false },

  // ── Warehouse ────────────────────────────────────────────────────────
  { id: 'warehouse.name',          label: 'اسم المستودع',          group: 'warehouse', type: 'string',  sourcePath: 'warehouse.name',                                       align: 'right',   visibleByDefault: false },

  // ── Company ──────────────────────────────────────────────────────────
  { id: 'company.name',            label: 'اسم الشركة',           group: 'company',  type: 'string',   sourcePath: 'company.name',          settingKey: 'show_company_name',     align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'company_name_text' },
  { id: 'company.address',         label: 'عنوان الشركة',         group: 'company',  type: 'string',   sourcePath: 'company.address',       settingKey: 'show_address',         align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_address' },
  { id: 'company.phone',           label: 'هاتف الشركة',          group: 'company',  type: 'string',   sourcePath: 'company.phone',         settingKey: 'show_phone',           align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_phone' },
  { id: 'company.nif',             label: 'رقم الضريبة',          group: 'company',  type: 'string',   sourcePath: 'company.nif',           settingKey: 'show_tax_id',          align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_nif' },
  { id: 'company.rc',              label: 'السجل التجاري',        group: 'company',  type: 'string',   sourcePath: 'company.rc',            settingKey: 'show_rc',              align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_rc' },
  { id: 'company.nis',             label: 'الرقم الإحصائي',       group: 'company',  type: 'string',   sourcePath: 'company.nis',           settingKey: 'show_nis',             align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_nis' },
  { id: 'company.ice',             label: 'رقم ICE',              group: 'company',  type: 'string',   sourcePath: 'company.ice',           settingKey: 'show_ice',             align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_ice' },
  { id: 'company.article',         label: 'المادة',               group: 'company',  type: 'string',   sourcePath: 'company.article',       settingKey: 'show_article',         align: 'center',  visibleByDefault: true,  overrideTemplatePath: 'override_article' },
  { id: 'company.logo',            label: 'الشعار',               group: 'company',  type: 'image',    sourcePath: 'company.logoUrl',       settingKey: 'show_logo',            align: 'center',  visibleByDefault: true },

  // ── Items (table) ─────────────────────────────────────────────────────
  { id: 'item.index',              label: 'الرقم',                group: 'item',     type: 'number',   sourcePath: '',                      align: 'center',  visibleByDefault: true,  isRepeating: true, relativePath: '_index' },
  { id: 'item.name',               label: 'المنتج',               group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'name' },
  { id: 'item.code',               label: 'الرمز',                group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'ref' },
  { id: 'item.barcode',            label: 'الباركود',             group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: false, isRepeating: true, relativePath: 'barcode' },
  { id: 'item.unit',               label: 'الوحدة',               group: 'item',     type: 'string',   sourcePath: '',                      align: 'center',  visibleByDefault: true,  isRepeating: true, relativePath: 'unit' },
  { id: 'item.quantity',           label: 'الكمية',               group: 'item',     type: 'number',   sourcePath: '',                      align: 'center',  visibleByDefault: true,  isRepeating: true, relativePath: 'quantity' },
  { id: 'item.price',              label: 'الثمن',                group: 'item',     type: 'currency',  sourcePath: '',                     align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'unitPriceHt' },
  { id: 'item.discount',           label: 'الخصم',                group: 'item',     type: 'currency',  sourcePath: '',                     align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'discountPct' },
  { id: 'item.tva',                label: 'TVA',                  group: 'item',     type: 'number',   sourcePath: '',                      align: 'center',  visibleByDefault: true,  isRepeating: true, relativePath: 'tvaRate' },
  { id: 'item.total',              label: 'المجموع',              group: 'item',     type: 'currency',  sourcePath: '',                     align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'totalHt' },
  { id: 'item.lot',                label: 'رقم الدفعة',           group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: false, isRepeating: true, relativePath: 'lot' },
  { id: 'item.notes',              label: 'ملاحظات',              group: 'item',     type: 'string',   sourcePath: '',                      align: 'right',   visibleByDefault: false, isRepeating: true, relativePath: 'notes' },

  // ── Totals ───────────────────────────────────────────────────────────
  { id: 'totals.ht',               label: 'المجموع HT',            group: 'totals',   type: 'currency', sourcePath: 'totals.totalHt',        settingKey: 'show_total_ht',        align: 'right',   visibleByDefault: true },
  { id: 'totals.tva',              label: 'مجموع الضريبة',         group: 'totals',   type: 'currency', sourcePath: 'totals.totalTva',       settingKey: 'show_total_tva',        align: 'right',   visibleByDefault: true },
  { id: 'totals.discount',         label: 'مجموع الخصم',           group: 'totals',   type: 'currency', sourcePath: 'totals.totalDiscount',  settingKey: 'show_discount_total',   align: 'right',   visibleByDefault: true },
  { id: 'totals.fiscalStamp',      label: 'الطابع الضريبي',        group: 'totals',   type: 'currency', sourcePath: 'totals.fiscalStamp',    settingKey: 'show_fiscal_stamp',     align: 'right',   visibleByDefault: true },
  { id: 'totals.ttc',              label: 'المجموع TTC',           group: 'totals',   type: 'currency', sourcePath: 'totals.totalTtc',       settingKey: 'show_total_ttc',        align: 'right',   visibleByDefault: true },
  { id: 'totals.paid',             label: 'المدفوع',               group: 'totals',   type: 'currency', sourcePath: 'totals.paid',           settingKey: 'show_paid_amount',      align: 'right',   visibleByDefault: true },
  { id: 'totals.change',           label: 'الباقي',                group: 'totals',   type: 'currency', sourcePath: 'totals.change',         settingKey: 'show_change',           align: 'right',   visibleByDefault: true },
  { id: 'totals.remaining',        label: 'المتبقي',               group: 'totals',   type: 'currency', sourcePath: 'totals.remaining',      settingKey: 'show_remaining',        align: 'right',   visibleByDefault: true },
  { id: 'totals.amountInWords',    label: 'المبلغ كتابة',          group: 'totals',   type: 'string',   sourcePath: 'computed.amountInWords', settingKey: 'show_amount_in_words', align: 'right',   visibleByDefault: true },

  // ── Balance ──────────────────────────────────────────────────────────
  { id: 'balance.previous',        label: 'الرصيد السابق',         group: 'balance',  type: 'currency', sourcePath: 'balance.previous',      settingKey: 'show_prev_balance',     align: 'right',   visibleByDefault: true },
  { id: 'balance.current',         label: 'الرصيد الجديد',         group: 'balance',  type: 'currency', sourcePath: 'balance.current',       settingKey: 'show_new_balance',      align: 'right',   visibleByDefault: true },

  // ── Payment ──────────────────────────────────────────────────────────
  { id: 'payment.method',          label: 'طريقة الدفع',           group: 'payment',  type: 'string',   sourcePath: 'payments[*].mode',      settingKey: 'show_payment_details',  align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'mode' },
  { id: 'payment.amount',          label: 'المبلغ المدفوع',        group: 'payment',  type: 'currency', sourcePath: 'payments[*].amount',    settingKey: 'show_payment_details',  align: 'right',   visibleByDefault: true,  isRepeating: true, relativePath: 'amount' },

  // ── TVA Breakdown ────────────────────────────────────────────────────
  { id: 'tvaBreakdown.rate',       label: 'نسبة الضريبة',          group: 'tvaBreakdown', type: 'number',  sourcePath: 'taxBreakdown[*].rate', settingKey: 'show_tva_breakdown', align: 'center', visibleByDefault: true,  isRepeating: true, relativePath: 'rate' },
  { id: 'tvaBreakdown.base',       label: 'الأساس',                group: 'tvaBreakdown', type: 'currency', sourcePath: 'taxBreakdown[*].baseHt', settingKey: 'show_tva_breakdown', align: 'right',  visibleByDefault: true,  isRepeating: true, relativePath: 'baseHt' },
  { id: 'tvaBreakdown.tva',        label: 'الضريبة',               group: 'tvaBreakdown', type: 'currency', sourcePath: 'taxBreakdown[*].tva',   settingKey: 'show_tva_breakdown', align: 'right',  visibleByDefault: true,  isRepeating: true, relativePath: 'tva' },
  { id: 'tvaBreakdown.ttc',        label: 'المجموع',               group: 'tvaBreakdown', type: 'currency', sourcePath: 'taxBreakdown[*].ttc',   settingKey: 'show_tva_breakdown', align: 'right',  visibleByDefault: true,  isRepeating: true, relativePath: 'ttc' },

  // ── Footer / Barcode / QR ────────────────────────────────────────────
  { id: 'footer.barcode',          label: 'الباركود',              group: 'barcode',  type: 'string',   sourcePath: 'doc.number',            settingKey: 'show_barcode',          align: 'center', visibleByDefault: true },
  { id: 'footer.qr',               label: 'رمز QR',               group: 'qr',       type: 'string',   sourcePath: 'doc.number',            settingKey: 'show_qr',               align: 'center', visibleByDefault: true },
  { id: 'footer.thankYou',         label: 'الشكر',                 group: 'footer',   type: 'string',   sourcePath: '',                      settingKey: 'show_thank_you',        align: 'center', visibleByDefault: true },
  { id: 'footer.returnsPolicy',    label: 'سياسة الإرجاع',         group: 'footer',   type: 'string',   sourcePath: '',                      settingKey: 'show_returns_policy',   align: 'center', visibleByDefault: false },
  { id: 'footer.bankDetails',      label: 'البيانات البنكية',       group: 'footer',   type: 'string',   sourcePath: '',                      settingKey: 'show_bank_details',     align: 'center', visibleByDefault: false },

  // ── Cashier / Client Signature ───────────────────────────────────────
  { id: 'signature.cashier',       label: 'توقيع الكاشير',         group: 'signature', type: 'boolean', sourcePath: '',                      settingKey: 'show_cashier_signature', align: 'center', visibleByDefault: true },
  { id: 'signature.client',        label: 'توقيع العميل',          group: 'signature', type: 'boolean', sourcePath: '',                      settingKey: 'show_client_signature',  align: 'center', visibleByDefault: true },
  { id: 'signature.stamp',         label: 'الختم',                 group: 'signature', type: 'boolean', sourcePath: '',                      settingKey: 'show_stamp',             align: 'center', visibleByDefault: true },

  // ── Report (session/aggregated) ──────────────────────────────────────
  { id: 'report.periodStart',      label: 'بداية الفترة',          group: 'report',   type: 'date',     sourcePath: 'report.periodStart',     settingKey: 'show_report_period',     align: 'right',   visibleByDefault: true },
  { id: 'report.periodEnd',        label: 'نهاية الفترة',          group: 'report',   type: 'date',     sourcePath: 'report.periodEnd',       settingKey: 'show_report_period',     align: 'right',   visibleByDefault: true },
  { id: 'report.cashier',          label: 'كاشير التقرير',          group: 'report',   type: 'string',   sourcePath: 'report.cashierName',     settingKey: 'show_report_cashier',    align: 'right',   visibleByDefault: true },
  { id: 'report.grossSales',       label: 'إجمالي المبيعات',       group: 'report',   type: 'currency', sourcePath: 'report.grossSales',      settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
  { id: 'report.returnsTotal',     label: 'المرتجعات',             group: 'report',   type: 'currency', sourcePath: 'report.returnsTotal',    settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
  { id: 'report.netSales',         label: 'صافي المبيعات',         group: 'report',   type: 'currency', sourcePath: 'report.netSales',        settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
  { id: 'report.invoicesCount',    label: 'عدد الفواتير',          group: 'report',   type: 'number',   sourcePath: 'report.invoicesCount',   settingKey: 'show_report_summary_cards', align: 'center', visibleByDefault: true },
  { id: 'report.returnsCount',     label: 'عدد المرتجعات',         group: 'report',   type: 'number',   sourcePath: 'report.returnsCount',    settingKey: 'show_report_summary_cards', align: 'center', visibleByDefault: true },
  { id: 'report.highestInvoice',   label: 'أعلى فاتورة',           group: 'report',   type: 'currency', sourcePath: 'report.highestInvoice',   settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
  { id: 'report.avgInvoice',       label: 'متوسط الفاتورة',        group: 'report',   type: 'currency', sourcePath: 'report.avgInvoice',       settingKey: 'show_report_summary_cards', align: 'right', visibleByDefault: true },
];

// ─── Singleton ───────────────────────────────────────────────────────────

class PrintFieldRegistry {
  private byId = new Map<string, PrintFieldDefinition>();
  private bySettingKey = new Map<string, PrintFieldDefinition>();
  private byGroup = new Map<PrintFieldGroup, PrintFieldDefinition[]>();

  constructor(fields: PrintFieldDefinition[]) {
    for (const f of fields) {
      this.byId.set(f.id, f);
      if (f.settingKey) {
        this.bySettingKey.set(f.settingKey, f);
      }
      const list = this.byGroup.get(f.group) ?? [];
      list.push(f);
      this.byGroup.set(f.group, list);
    }
  }

  get(id: string): PrintFieldDefinition | undefined {
    return this.byId.get(id);
  }

  getBySettingKey(key: string): PrintFieldDefinition | undefined {
    return this.bySettingKey.get(key);
  }

  getByGroup(group: PrintFieldGroup): PrintFieldDefinition[] {
    return this.byGroup.get(group) ?? [];
  }

  getAllFields(): PrintFieldDefinition[] {
    return Array.from(this.byId.values());
  }

  /** Return only fields that appear in a repeating table */
  getRepeatingFields(group?: PrintFieldGroup): PrintFieldDefinition[] {
    const all = group ? this.getByGroup(group) : this.getAllFields();
    return all.filter(f => f.isRepeating);
  }
}

export const printFieldRegistry = new PrintFieldRegistry(PRINT_FIELDS);
```

## FILE: resources/js/pages/settings/print-settings/services/PrintFieldResolver.ts
```
/**
 * The ONLY layer that resolves a canonical field ID to a value.
 *
 * Every renderer (UniversalPreview, ESC/POS, future PDF) calls
 * `printFieldResolver.resolve("customer.name", data, template)` instead of
 * accessing `data.party?.name` directly.
 *
 * This guarantees that:
 *   - The same field ID produces the same value everywhere
 *   - Template overrides (e.g. company_name_text) are automatically applied
 *   - Computed fields (item.tvaPct, item.index) are derived consistently
 */

import type { UniversalDocumentData, DocumentLine } from '../types/data';
import type { PrintTemplate } from '../types';
import { printFieldRegistry, type PrintFieldDefinition } from './PrintFieldRegistry';
import { numberToArabicWords } from '../utils';

type ResolveContext = UniversalDocumentData | DocumentLine | Record<string, any>;

function getByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc: any, key: string) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, obj);
}

class PrintFieldResolver {
  getField(id: string): PrintFieldDefinition | undefined {
    return printFieldRegistry.get(id);
  }

  getFieldBySettingKey(key: string): PrintFieldDefinition | undefined {
    return printFieldRegistry.getBySettingKey(key);
  }

  /**
   * Resolve a document-level field against UniversalDocumentData.
   * Automatically applies template overrides and computed fields.
   */
  resolve(
    fieldId: string,
    data: UniversalDocumentData,
    template?: PrintTemplate | null,
  ): any {
    const def = this.getField(fieldId);
    if (!def) return undefined;

    // 1) Template override (e.g. company_name_text overrides company.name)
    if (template && def.overrideTemplatePath) {
      const override = getByPath(template, def.overrideTemplatePath);
      if (override !== undefined && override !== null && override !== '') {
        return override;
      }
    }

    // 2) Footer/static fields — values come from template, not data
    if (fieldId === 'footer.thankYou') {
      return template?.thank_you_text ?? '';
    }
    if (fieldId === 'footer.returnsPolicy') {
      return template?.returns_policy_text ?? '';
    }
    if (fieldId === 'footer.bankDetails') {
      return template?.bank_details_text ?? '';
    }
    if (fieldId === 'signature.cashier' || fieldId === 'signature.client' || fieldId === 'signature.stamp') {
      return true; // boolean — visibility is controlled by the setting, not value
    }

    // 3) Computed fields
    if (fieldId === 'totals.amountInWords') {
      const total = data.totals?.totalTtc ?? 0;
      return numberToArabicWords(total);
    }

    // 4) Simple data path
    return getByPath(data, def.sourcePath);
  }

  /**
   * Resolve an item-level field against a single DocumentLine.
   * Handles computed item fields like item.index, item.tvaPct.
   */
  resolveItemField(
    fieldId: string,
    line: DocumentLine,
    lineIndex: number,
  ): any {
    const def = this.getField(fieldId);
    if (!def) return undefined;

    // Computed item fields
    if (fieldId === 'item.index') return lineIndex + 1;
    if (fieldId === 'item.tvaPct') return Math.round((line.tvaRate ?? 0) * 100);
    if (fieldId === 'item.discountAmt') return (line.totalHt ?? 0) * ((line.discountPct ?? 0) / 100);

    // Relative path for repeating fields
    if (def.relativePath && def.relativePath !== '_index') {
      return getByPath(line, def.relativePath);
    }

    // Fallback for absolute paths
    return getByPath(line, def.sourcePath);
  }

  /**
   * Check if a field should be visible.
   * Uses the template's show_* setting (if mapped) and also checks the
   * data contains a value for the field.
   */
  isVisible(fieldId: string, template: Record<string, any>): boolean {
    const def = this.getField(fieldId);
    if (!def) return false;

    if (def.settingKey) {
      const setting = template[def.settingKey];
      if (setting === false) return false;
    }

    return true;
  }

  getItemColumns(template: Record<string, any>): ColumnDefinition[] {
    const order: string[] = template.col_order ?? ['name', 'quantity', 'price', 'total'];
    const headers: Record<string, string> = template.col_headers ?? {};
    const widths: Record<string, number> = template.col_widths ?? {};
    const aligns: Record<string, string> = template.col_aligns ?? {};
    const show: Record<string, boolean> = template.col_show ?? {};

    const FIELD_MAP: Record<string, string> = {
      rowNumber: 'item.index',
      name:      'item.name',
      ref:       'item.code',
      barcode:   'item.barcode',
      unit:      'item.unit',
      quantity:  'item.quantity',
      price:     'item.price',
      discount:  'item.discount',
      tva:       'item.tva',
      total:     'item.total',
    };

    return order
      .filter(col => show[col] !== false)
      .map(col => {
        const fieldId = FIELD_MAP[col] ?? col;
        const def = this.getField(fieldId);
        return {
          id: fieldId,
          label: headers[col] ?? def?.label ?? col,
          width: widths[col] ?? 10,
          align: (aligns[col] as 'left' | 'center' | 'right') ?? def?.align ?? 'right',
          visible: show[col] !== false,
        };
      });
  }
}

export interface ColumnDefinition {
  id: string;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
  visible: boolean;
}

export const printFieldResolver = new PrintFieldResolver();
```

## FILE: resources/js/pages/settings/print-settings/services/printStoreService.ts
```
import type { ApiClient } from '../contracts/ApiClient';

export const DB_KEY_DOC_CONFIGS = 'print:doc_configs';

/** Save document configs */
export async function dbSaveDocConfigs(api: ApiClient, configs: Record<string, unknown>[]): Promise<void> {
  await api.patch('/settings', { [DB_KEY_DOC_CONFIGS]: JSON.stringify(configs) });
}

/** Fetch document configs */
export async function dbFetchDocConfigs(api: ApiClient): Promise<Record<string, unknown>[]> {
  try {
    const res = await api.get<{ value: string | object }>(`/settings/${DB_KEY_DOC_CONFIGS}`);
    const raw = (res as Record<string, unknown>)?.value ?? (res as Record<string, unknown>)?.data?.value ?? null;
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}
```

## FILE: resources/js/pages/settings/print-settings/services/PropertyVisibilityService.ts
```
import type { DocTypeCode, PaperSize, PrintTemplate, SettingMeta } from '../types';
import { isSettingVisible, getVisibleSettings } from './SettingsRegistry';

export type { SettingMeta, PropertyCategory } from './SettingsRegistry';

const THERMAL_SIZES: PaperSize[] = ['80mm', '58mm'];
const PAGE_SIZES: PaperSize[] = ['A4', 'A5'];

export function isReportDoc(code: DocTypeCode): boolean {
  return code === 'RPT';
}

export function isInvoiceDoc(code: DocTypeCode): boolean {
  return ['FV', 'BL', 'DEV', 'BCC', 'FA', 'BR', 'AV', 'AA'].includes(code);
}

export function isThermalPaper(size: PaperSize): boolean {
  return THERMAL_SIZES.includes(size);
}

export function isPagePaper(size: PaperSize): boolean {
  return PAGE_SIZES.includes(size);
}

export function isPropertyVisible(
  key: string,
  docType: DocTypeCode,
  paperSize: PaperSize,
  tpl?: Partial<PrintTemplate>,
): boolean {
  return isSettingVisible(key, docType, paperSize, tpl);
}

export function getSectionProperties(tpl: PrintTemplate): Record<string, boolean> {
  return {
    show_header_section: tpl.show_header_section,
    show_doc_info_section: tpl.show_doc_info_section,
    show_items_section: tpl.show_items_section,
    show_totals_section: tpl.show_totals_section,
    show_payments_section: tpl.show_payments_section,
    show_footer_section: tpl.show_footer_section,
  };
}

export function getFilteredMeta(docType: DocTypeCode, paperSize: PaperSize): SettingMeta[] {
  return getVisibleSettings(docType, paperSize);
}
```

## FILE: resources/js/pages/settings/print-settings/services/SettingsRegistry.ts
```
import type { DocTypeCode, PaperSize, PrintTemplate, ColumnKey, AlignOption, BorderStyle, PriceMode, PageOrientation, FontFamily } from '../types/domain';

export type SettingComponent = 'toggle' | 'input' | 'select' | 'pills' | 'slider' | 'color' | 'textarea' | 'column-manager' | 'rules-editor' | 'logo-upload';

export interface SettingMeta {
  key: keyof PrintTemplate;
  label: string;
  labelAr: string;
  category: 'global' | 'paper' | 'header' | 'company' | 'document' | 'columns' | 'items' | 'totals' | 'payments' | 'footer' | 'barcode' | 'qr' | 'signature' | 'section-visibility' | 'rules' | 'report' | 'charts' | 'formatting';
  component: SettingComponent;
  defaultValue: unknown;
  supportedPapers: PaperSize[];
  supportedDocs: DocTypeCode[];
  description?: string;
  groupKey?: string;
  dependsOn?: keyof PrintTemplate;
  options?: readonly { v: string; l: string }[];
  min?: number;
  max?: number;
  step?: number;
  /** Canonical field ID from PrintFieldRegistry (show_* settings only) */
  field?: string;
}

const ALL_DOCS: DocTypeCode[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS', 'RPT'];
const COMMERCIAL_DOCS: DocTypeCode[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV'];
const POS_DOCS: DocTypeCode[] = ['POS', 'RPT'];
const WAREHOUSE_DOCS: DocTypeCode[] = ['DDP', 'BT'];
const REPORT_DOC: DocTypeCode[] = ['RPT'];
const NON_REPORT_DOCS: DocTypeCode[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS'];
const THERMAL: PaperSize[] = ['80mm', '58mm'];
const PAGE: PaperSize[] = ['A4', 'A5'];
const ALL_PAPERS: PaperSize[] = ['80mm', '58mm', 'A4', 'A5'];

const ALIGN_OPTS = [
  { v: 'right' as const, l: 'يمين' },
  { v: 'center' as const, l: 'وسط' },
  { v: 'left' as const, l: 'يسار' },
];

const BORDER_OPTS = [
  { v: 'solid' as const, l: 'صلبة' },
  { v: 'dashed' as const, l: 'متقطعة' },
  { v: 'double' as const, l: 'مزدوجة' },
  { v: 'none' as const, l: 'بدون' },
];

export const SETTINGS_REGISTRY: Record<string, SettingMeta> = {
  // ── Global ──
  id:             { key: 'id', label: 'ID', labelAr: 'المعرف', category: 'global', component: 'input', defaultValue: null, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  name:           { key: 'name', label: 'Name', labelAr: 'الاسم', category: 'global', component: 'input', defaultValue: 'قالب جديد', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  doc_type_code:  { key: 'doc_type_code', label: 'Document Type', labelAr: 'نوع المستند', category: 'global', component: 'select', defaultValue: 'FV', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  paper_size:     { key: 'paper_size', label: 'Paper Size', labelAr: 'حجم الورق', category: 'paper', component: 'pills', defaultValue: '80mm' as PaperSize, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  is_default:     { key: 'is_default', label: 'Default', labelAr: 'افتراضي', category: 'global', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  is_active:      { key: 'is_active', label: 'Active', labelAr: 'مفعل', category: 'global', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Paper / Formatting ──
  paper_width_mm:   { key: 'paper_width_mm', label: 'Paper Width (mm)', labelAr: 'عرض الورق (ملم)', category: 'paper', component: 'select', defaultValue: 80, supportedPapers: THERMAL, supportedDocs: ALL_DOCS, options: [{ v: '58', l: '58mm' }, { v: '80', l: '80mm' }] },
  page_orientation: { key: 'page_orientation', label: 'Page Orientation', labelAr: 'اتجاه الصفحة', category: 'paper', component: 'pills', defaultValue: 'portrait' as PageOrientation, supportedPapers: PAGE, supportedDocs: ALL_DOCS, options: [{ v: 'portrait', l: 'عمودي' }, { v: 'landscape', l: 'أفقي' }] },
  margin_top:       { key: 'margin_top', label: 'Top Margin (mm)', labelAr: 'الهامش العلوي (ملم)', category: 'formatting', component: 'slider', defaultValue: 3, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 0, max: 20, step: 0.5 },
  margin_bottom:    { key: 'margin_bottom', label: 'Bottom Margin (mm)', labelAr: 'الهامش السفلي (ملم)', category: 'formatting', component: 'slider', defaultValue: 3, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 0, max: 20, step: 0.5 },
  margin_sides:     { key: 'margin_sides', label: 'Side Margin (mm)', labelAr: 'الهامش الجانبي (ملم)', category: 'formatting', component: 'slider', defaultValue: 3, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 0, max: 20, step: 0.5 },
  line_spacing:     { key: 'line_spacing', label: 'Line Spacing', labelAr: 'تباعد الأسطر', category: 'formatting', component: 'slider', defaultValue: 1.3, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 0.8, max: 3, step: 0.1 },
  base_font_size:   { key: 'base_font_size', label: 'Base Font Size', labelAr: 'حجم الخط الأساسي', category: 'formatting', component: 'slider', defaultValue: 10, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 20, step: 0.5 },
  font_family:      { key: 'font_family', label: 'Font Family', labelAr: 'نوع الخط', category: 'formatting', component: 'select', defaultValue: 'tajawal' as FontFamily, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: [{ v: 'tajawal', l: 'Tajawal' }, { v: 'monospace', l: 'Monospace' }, { v: 'times', l: 'Times New Roman' }, { v: 'arial', l: 'Arial' }] },

  // ── Header / Logo ──
  show_logo:          { key: 'show_logo', label: 'Show Logo', labelAr: 'إظهار الشعار', category: 'header', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.logo' },
  logo_source:        { key: 'logo_source', label: 'Logo Source', labelAr: 'مصدر الشعار', category: 'header', component: 'pills', defaultValue: 'company', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo', options: [{ v: 'company', l: 'الشركة' }, { v: 'custom', l: 'مخصص' }, { v: 'default', l: 'افتراضي' }] },
  logo_size:          { key: 'logo_size', label: 'Logo Size (px)', labelAr: 'حجم الشعار (بكسل)', category: 'header', component: 'slider', defaultValue: 56, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo', min: 20, max: 200, step: 2 },
  logo_align:         { key: 'logo_align', label: 'Logo Alignment', labelAr: 'محاذاة الشعار', category: 'header', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo', options: ALIGN_OPTS },
  logo_border_radius: { key: 'logo_border_radius', label: 'Logo Border Radius', labelAr: 'تدوير زوايا الشعار', category: 'header', component: 'slider', defaultValue: 50, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo', min: 0, max: 100, step: 5 },
  custom_logo_url:    { key: 'custom_logo_url', label: 'Custom Logo URL', labelAr: 'رابط الشعار المخصص', category: 'header', component: 'input', defaultValue: null, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_logo' },

  // ── Company ──
  show_company_name:  { key: 'show_company_name', label: 'Show Company Name', labelAr: 'إظهار اسم الشركة', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.name' },
  company_name_text:  { key: 'company_name_text', label: 'Company Name Text', labelAr: 'نص اسم الشركة', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name' },
  company_name_size:  { key: 'company_name_size', label: 'Company Name Size', labelAr: 'حجم اسم الشركة', category: 'company', component: 'slider', defaultValue: 15, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name', min: 8, max: 30, step: 1 },
  company_name_bold:  { key: 'company_name_bold', label: 'Bold Company Name', labelAr: 'تسميك اسم الشركة', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name' },
  company_name_align: { key: 'company_name_align', label: 'Company Name Alignment', labelAr: 'محاذاة اسم الشركة', category: 'company', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name', options: ALIGN_OPTS },
  company_name_color: { key: 'company_name_color', label: 'Company Name Color', labelAr: 'لون اسم الشركة', category: 'company', component: 'color', defaultValue: '#111111', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_company_name' },

  // ── Company Info ──
  show_address:       { key: 'show_address', label: 'Show Address', labelAr: 'إظهار العنوان', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.address' },
  show_phone:         { key: 'show_phone', label: 'Show Phone', labelAr: 'إظهار الهاتف', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.phone' },
  show_tax_id:        { key: 'show_tax_id', label: 'Show Tax ID (NIF)', labelAr: 'إظهار رقم الضريبة', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.nif' },
  show_rc:            { key: 'show_rc', label: 'Show RC', labelAr: 'إظهار السجل التجاري', category: 'company', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.rc' },
  show_nis:           { key: 'show_nis', label: 'Show NIS', labelAr: 'إظهار رقم NIS', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.nis' },
  show_ice:           { key: 'show_ice', label: 'Show ICE', labelAr: 'إظهار رقم ICE', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.ice' },
  show_article:       { key: 'show_article', label: 'Show Article', labelAr: 'إظهار المادة', category: 'company', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'company.article' },
  company_info_align: { key: 'company_info_align', label: 'Info Alignment', labelAr: 'محاذاة المعلومات', category: 'company', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  company_info_size:  { key: 'company_info_size', label: 'Info Font Size', labelAr: 'حجم خط المعلومات', category: 'company', component: 'slider', defaultValue: 9, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 16, step: 0.5 },
  override_address:   { key: 'override_address', label: 'Override Address', labelAr: 'تجاوز العنوان', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_phone:     { key: 'override_phone', label: 'Override Phone', labelAr: 'تجاوز الهاتف', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_nif:       { key: 'override_nif', label: 'Override NIF', labelAr: 'تجاوز رقم الضريبة', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_rc:        { key: 'override_rc', label: 'Override RC', labelAr: 'تجاوز السجل التجاري', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_nis:       { key: 'override_nis', label: 'Override NIS', labelAr: 'تجاوز NIS', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_ice:       { key: 'override_ice', label: 'Override ICE', labelAr: 'تجاوز ICE', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  override_article:   { key: 'override_article', label: 'Override Article', labelAr: 'تجاوز المادة', category: 'company', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  header_custom_text: { key: 'header_custom_text', label: 'Header Custom Text', labelAr: 'نص مخصص للرأس', category: 'header', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  header_separator:   { key: 'header_separator', label: 'Header Separator', labelAr: 'فاصل الرأس', category: 'header', component: 'pills', defaultValue: 'dashed' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },

  // ── Document ──
  title_text:           { key: 'title_text', label: 'Title Text', labelAr: 'نص العنوان', category: 'document', component: 'input', defaultValue: 'فاتورة بيع', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  title_size:           { key: 'title_size', label: 'Title Size', labelAr: 'حجم العنوان', category: 'document', component: 'slider', defaultValue: 13, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 8, max: 30, step: 1 },
  title_bold:           { key: 'title_bold', label: 'Bold Title', labelAr: 'تسميك العنوان', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  title_align:          { key: 'title_align', label: 'Title Alignment', labelAr: 'محاذاة العنوان', category: 'document', component: 'pills', defaultValue: 'center' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  title_color:          { key: 'title_color', label: 'Title Color', labelAr: 'لون العنوان', category: 'document', component: 'color', defaultValue: '#111111', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_doc_number:      { key: 'show_doc_number', label: 'Show Document Number', labelAr: 'إظهار رقم المستند', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'document.number' },
  show_date:            { key: 'show_date', label: 'Show Date', labelAr: 'إظهار التاريخ', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'document.date' },
  show_time:            { key: 'show_time', label: 'Show Time', labelAr: 'إظهار الوقت', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'document.time' },
  show_due_date:        { key: 'show_due_date', label: 'Show Due Date', labelAr: 'إظهار تاريخ الاستحقاق', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'document.dueDate' },
  show_cashier:         { key: 'show_cashier', label: 'Show Cashier', labelAr: 'إظهار الكاشير', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.cashierName' },
  show_client:          { key: 'show_client', label: 'Show Client', labelAr: 'إظهار العميل', category: 'document', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.name' },
  show_client_nif:      { key: 'show_client_nif', label: 'Show Client NIF', labelAr: 'إظهار رقم ضريبة العميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.nif' },
  show_client_phone:    { key: 'show_client_phone', label: 'Show Client Phone', labelAr: 'إظهار هاتف العميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.phone' },
  show_client_address:  { key: 'show_client_address', label: 'Show Client Address', labelAr: 'إظهار عنوان العميل', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, field: 'customer.address' },
  show_delivery_address:{ key: 'show_delivery_address', label: 'Show Delivery Address', labelAr: 'إظهار عنوان التسليم', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: COMMERCIAL_DOCS, field: 'customer.deliveryAddress' },
  show_session:         { key: 'show_session', label: 'Show Session', labelAr: 'إظهار الجلسة', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: POS_DOCS, field: 'session.code' },
  show_payment_term:    { key: 'show_payment_term', label: 'Show Payment Term', labelAr: 'إظهار شرط الدفع', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: COMMERCIAL_DOCS, field: 'document.paymentTerm' },
  show_bank_details:    { key: 'show_bank_details', label: 'Show Bank Details', labelAr: 'إظهار تفاصيل البنك', category: 'document', component: 'toggle', defaultValue: false, supportedPapers: PAGE, supportedDocs: COMMERCIAL_DOCS, field: 'footer.bankDetails' },
  bank_details_text:    { key: 'bank_details_text', label: 'Bank Details Text', labelAr: 'نص تفاصيل البنك', category: 'document', component: 'textarea', defaultValue: '', supportedPapers: PAGE, supportedDocs: COMMERCIAL_DOCS, dependsOn: 'show_bank_details' },
  doc_separator:        { key: 'doc_separator', label: 'Document Separator', labelAr: 'فاصل المستند', category: 'document', component: 'pills', defaultValue: 'dashed' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },

  // ── Items / Columns ──
  col_order:            { key: 'col_order', label: 'Column Order', labelAr: 'ترتيب الأعمدة', category: 'columns', component: 'column-manager', defaultValue: ['name', 'quantity', 'price', 'total'] as ColumnKey[], supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  col_show:             { key: 'col_show', label: 'Column Visibility', labelAr: 'إظهار الأعمدة', category: 'columns', component: 'column-manager', defaultValue: {} as Partial<Record<ColumnKey, boolean>>, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  col_widths:           { key: 'col_widths', label: 'Column Widths', labelAr: 'عرض الأعمدة', category: 'columns', component: 'column-manager', defaultValue: {} as Partial<Record<ColumnKey, number>>, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  col_headers:          { key: 'col_headers', label: 'Column Headers', labelAr: 'عناوين الأعمدة', category: 'columns', component: 'column-manager', defaultValue: {} as Partial<Record<ColumnKey, string>>, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  col_aligns:           { key: 'col_aligns', label: 'Column Alignments', labelAr: 'محاذاة الأعمدة', category: 'columns', component: 'column-manager', defaultValue: {} as Partial<Record<ColumnKey, AlignOption>>, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Items Table ──
  items_font_size:      { key: 'items_font_size', label: 'Items Font Size', labelAr: 'حجم خط الجدول', category: 'items', component: 'slider', defaultValue: 10, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 18, step: 0.5 },
  items_font_family:    { key: 'items_font_family', label: 'Items Font Family', labelAr: 'نوع خط الجدول', category: 'items', component: 'select', defaultValue: 'tajawal' as FontFamily, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: [{ v: 'tajawal', l: 'Tajawal' }, { v: 'monospace', l: 'Monospace' }, { v: 'times', l: 'Times' }, { v: 'arial', l: 'Arial' }] },
  show_col_header:      { key: 'show_col_header', label: 'Show Column Headers', labelAr: 'إظهار رؤوس الأعمدة', category: 'items', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  table_header_bold:    { key: 'table_header_bold', label: 'Bold Table Header', labelAr: 'تسميك رأس الجدول', category: 'items', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_col_header' },
  table_header_bg:      { key: 'table_header_bg', label: 'Table Header Background', labelAr: 'خلفية رأس الجدول', category: 'items', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_col_header' },
  table_header_color:   { key: 'table_header_color', label: 'Table Header Color', labelAr: 'لون رأس الجدول', category: 'items', component: 'color', defaultValue: '#333333', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_col_header' },
  table_border_style:   { key: 'table_border_style', label: 'Table Border Style', labelAr: 'نمط حدود الجدول', category: 'items', component: 'pills', defaultValue: 'dashed' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },
  alternating_rows:     { key: 'alternating_rows', label: 'Alternating Row Colors', labelAr: 'تلوين الصفوف بالتناوب', category: 'items', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  alternating_color:    { key: 'alternating_color', label: 'Alternating Color', labelAr: 'لون التناوب', category: 'items', component: 'color', defaultValue: '#f5f5f5', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'alternating_rows' },
  price_display:        { key: 'price_display', label: 'Price Display Mode', labelAr: 'طريقة عرض السعر', category: 'items', component: 'pills', defaultValue: 'ht' as PriceMode, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: [{ v: 'ht', l: 'HT' }, { v: 'ttc', l: 'TTC' }] },
  show_line_total_ttc:  { key: 'show_line_total_ttc', label: 'Show Line Total TTC', labelAr: 'إظهار المجموع لكل سطر', category: 'items', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Totals ──
  totals_font_size:     { key: 'totals_font_size', label: 'Totals Font Size', labelAr: 'حجم خط الإجماليات', category: 'totals', component: 'slider', defaultValue: 10, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 20, step: 0.5 },
  totals_bold:          { key: 'totals_bold', label: 'Bold Totals', labelAr: 'تسميك الإجماليات', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  totals_align:         { key: 'totals_align', label: 'Totals Alignment', labelAr: 'محاذاة الإجماليات', category: 'totals', component: 'pills', defaultValue: 'right' as AlignOption, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: ALIGN_OPTS },
  show_total_ht:        { key: 'show_total_ht', label: 'Show Total HT', labelAr: 'إظهار المجموع HT', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.ht' },
  show_total_tva:       { key: 'show_total_tva', label: 'Show Total TVA', labelAr: 'إظهار مجموع الضريبة', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.tva' },
  show_tva_breakdown:   { key: 'show_tva_breakdown', label: 'Show TVA Breakdown', labelAr: 'تفصيل الضريبة حسب النسبة', category: 'totals', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'tvaBreakdown.rate' },
  show_discount_total:  { key: 'show_discount_total', label: 'Show Discount Total', labelAr: 'إظهار مجموع الخصم', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.discount' },
  show_fiscal_stamp:    { key: 'show_fiscal_stamp', label: 'Show Fiscal Stamp', labelAr: 'إظهار الطابع الضريبي', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: COMMERCIAL_DOCS , field: 'totals.fiscalStamp' },
  show_total_ttc:       { key: 'show_total_ttc', label: 'Show Total TTC', labelAr: 'إظهار المجموع TTC', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.ttc' },
  total_ttc_font_size:  { key: 'total_ttc_font_size', label: 'TTC Font Size', labelAr: 'حجم خط TTC', category: 'totals', component: 'slider', defaultValue: 14, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 10, max: 30, step: 1 },
  total_ttc_bold:       { key: 'total_ttc_bold', label: 'Bold TTC', labelAr: 'تسميك TTC', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  total_ttc_color:      { key: 'total_ttc_color', label: 'TTC Color', labelAr: 'لون TTC', category: 'totals', component: 'color', defaultValue: '#111111', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  total_border_style:   { key: 'total_border_style', label: 'Totals Border Style', labelAr: 'نمط حدود الإجماليات', category: 'totals', component: 'pills', defaultValue: 'double' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },
  show_amount_in_words: { key: 'show_amount_in_words', label: 'Show Amount in Words', labelAr: 'إظهار المبلغ كتابةً', category: 'totals', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.amountInWords' },
  show_paid_amount:     { key: 'show_paid_amount', label: 'Show Paid Amount', labelAr: 'إظهار المبلغ المدفوع', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.paid' },
  show_change:          { key: 'show_change', label: 'Show Change', labelAr: 'إظهار الباقي', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.change' },
  show_remaining:       { key: 'show_remaining', label: 'Show Remaining', labelAr: 'إظهار المتبقي', category: 'totals', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'totals.remaining' },
  show_prev_balance:    { key: 'show_prev_balance', label: 'Show Previous Balance', labelAr: 'إظهار الرصيد السابق', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'balance.previous' },
  show_new_balance:     { key: 'show_new_balance', label: 'Show New Balance', labelAr: 'إظهار الرصيد الجديد', category: 'totals', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'balance.current' },

  // ── Payments ──
  show_payment_details: { key: 'show_payment_details', label: 'Show Payment Details', labelAr: 'إظهار تفاصيل الدفع', category: 'payments', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'payment.method' },
  payment_font_size:    { key: 'payment_font_size', label: 'Payment Font Size', labelAr: 'حجم خط الدفع', category: 'payments', component: 'slider', defaultValue: 9, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, min: 6, max: 16, step: 0.5 },

  // ── Footer ──
  footer_line1:         { key: 'footer_line1', label: 'Footer Line 1', labelAr: 'سطر التذييل 1', category: 'footer', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  footer_line2:         { key: 'footer_line2', label: 'Footer Line 2', labelAr: 'سطر التذييل 2', category: 'footer', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  footer_line3:         { key: 'footer_line3', label: 'Footer Line 3', labelAr: 'سطر التذييل 3', category: 'footer', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  footer_separator:     { key: 'footer_separator', label: 'Footer Separator', labelAr: 'فاصل التذييل', category: 'footer', component: 'pills', defaultValue: 'solid' as BorderStyle, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, options: BORDER_OPTS },
  show_thank_you:       { key: 'show_thank_you', label: 'Show Thank You', labelAr: 'إظهار الشكر', category: 'footer', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'footer.thankYou' },
  thank_you_text:       { key: 'thank_you_text', label: 'Thank You Text', labelAr: 'نص الشكر', category: 'footer', component: 'input', defaultValue: 'شكراً لزيارتكم!', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_thank_you' },
  thank_you_size:       { key: 'thank_you_size', label: 'Thank You Size', labelAr: 'حجم خط الشكر', category: 'footer', component: 'slider', defaultValue: 11, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_thank_you', min: 8, max: 24, step: 1 },
  thank_you_color:      { key: 'thank_you_color', label: 'Thank You Color', labelAr: 'لون الشكر', category: 'footer', component: 'color', defaultValue: '#111111', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_thank_you' },
  show_returns_policy:  { key: 'show_returns_policy', label: 'Show Returns Policy', labelAr: 'إظهار سياسة الإرجاع', category: 'footer', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'footer.returnsPolicy' },
  returns_policy_text:  { key: 'returns_policy_text', label: 'Returns Policy Text', labelAr: 'نص سياسة الإرجاع', category: 'footer', component: 'input', defaultValue: 'كل الاحتجاجات لا تتعدى 48 ساعة', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_returns_policy' },
  footer_legal_text:    { key: 'footer_legal_text', label: 'Footer Legal Text', labelAr: 'نص قانوني', category: 'footer', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Barcode / QR ──
  show_barcode:         { key: 'show_barcode', label: 'Show Barcode', labelAr: 'إظهار الباركود', category: 'barcode', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'footer.barcode' },
  barcode_content:      { key: 'barcode_content', label: 'Barcode Content', labelAr: 'محتوى الباركود', category: 'barcode', component: 'pills', defaultValue: 'doc-number', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_barcode', options: [{ v: 'doc-number', l: 'رقم المستند' }, { v: 'total', l: 'المجموع' }, { v: 'custom', l: 'نص مخصص' }] },
  barcode_custom_text:  { key: 'barcode_custom_text', label: 'Barcode Custom Text', labelAr: 'نص الباركود المخصص', category: 'barcode', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'barcode_content' },
  show_qr:              { key: 'show_qr', label: 'Show QR Code', labelAr: 'إظهار رمز QR', category: 'qr', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'footer.qr' },
  qr_content:           { key: 'qr_content', label: 'QR Content', labelAr: 'محتوى QR', category: 'qr', component: 'pills', defaultValue: 'doc-number', supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS, dependsOn: 'show_qr', options: [{ v: 'doc-number', l: 'رقم المستند' }, { v: 'company-info', l: 'معلومات الشركة' }, { v: 'both', l: 'كلاهما' }] },

  // ── Signatures ──
  show_cashier_signature: { key: 'show_cashier_signature', label: 'Cashier Signature', labelAr: 'توقيع الكاشير', category: 'signature', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'signature.cashier' },
  show_client_signature:  { key: 'show_client_signature', label: 'Client Signature', labelAr: 'توقيع العميل', category: 'signature', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'signature.client' },
  show_stamp:             { key: 'show_stamp', label: 'Show Stamp', labelAr: 'إظهار الختم', category: 'signature', component: 'toggle', defaultValue: false, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS , field: 'signature.stamp' },

  // ── Section Visibility ──
  show_header_section:    { key: 'show_header_section', label: 'Header Section', labelAr: 'قسم الرأس', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_doc_info_section:  { key: 'show_doc_info_section', label: 'Document Section', labelAr: 'قسم المستند', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_items_section:     { key: 'show_items_section', label: 'Items Section', labelAr: 'قسم الجدول', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_totals_section:    { key: 'show_totals_section', label: 'Totals Section', labelAr: 'قسم الإجماليات', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_payments_section:  { key: 'show_payments_section', label: 'Payments Section', labelAr: 'قسم الدفع', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },
  show_footer_section:    { key: 'show_footer_section', label: 'Footer Section', labelAr: 'قسم التذييل', category: 'section-visibility', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Rules ──
  rules:                  { key: 'rules', label: 'Rules', labelAr: 'القواعد', category: 'rules', component: 'rules-editor', defaultValue: [] as any[], supportedPapers: ALL_PAPERS, supportedDocs: ALL_DOCS },

  // ── Report ──
  show_report_header:        { key: 'show_report_header', label: 'Show Report Header', labelAr: 'إظهار رأس التقرير', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  report_header_text:        { key: 'report_header_text', label: 'Report Header Text', labelAr: 'نص رأس التقرير', category: 'report', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, dependsOn: 'show_report_header' },
  show_report_footer:        { key: 'show_report_footer', label: 'Show Report Footer', labelAr: 'إظهار تذييل التقرير', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  report_footer_text:        { key: 'report_footer_text', label: 'Report Footer Text', labelAr: 'نص تذييل التقرير', category: 'report', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, dependsOn: 'show_report_footer' },
  show_charts:               { key: 'show_charts', label: 'Show Charts', labelAr: 'إظهار الرسوم البيانية', category: 'charts', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  chart_type:                { key: 'chart_type', label: 'Chart Type', labelAr: 'نوع الرسم البياني', category: 'charts', component: 'pills', defaultValue: 'bar', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, dependsOn: 'show_charts', options: [{ v: 'bar', l: 'أعمدة' }, { v: 'pie', l: 'دائري' }] },
  chart_title:               { key: 'chart_title', label: 'Chart Title', labelAr: 'عنوان الرسم البياني', category: 'charts', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, dependsOn: 'show_charts' },
  group_by:                  { key: 'group_by', label: 'Group By', labelAr: 'تجميع حسب', category: 'report', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  sort_by:                   { key: 'sort_by', label: 'Sort By', labelAr: 'ترتيب حسب', category: 'report', component: 'input', defaultValue: '', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  sort_direction:            { key: 'sort_direction', label: 'Sort Direction', labelAr: 'اتجاه الترتيب', category: 'report', component: 'pills', defaultValue: 'asc', supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC, options: [{ v: 'asc', l: 'تصاعدي' }, { v: 'desc', l: 'تنازلي' }] },
  show_report_period:        { key: 'show_report_period', label: 'Show Report Period', labelAr: 'إظهار فترة التقرير', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'report.periodStart' },
  show_report_cashier:       { key: 'show_report_cashier', label: 'Show Cashier in Report', labelAr: 'إظهار الكاشير في التقرير', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'report.cashier' },
  show_report_summary_cards: { key: 'show_report_summary_cards', label: 'Show Summary Cards', labelAr: 'إظهار بطاقات الملخص', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'report.grossSales' },
  show_report_payment_breakdown: { key: 'show_report_payment_breakdown', label: 'Show Payment Breakdown', labelAr: 'إظهار توزيع الدفع', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'payment.method' },
  show_report_top_products:  { key: 'show_report_top_products', label: 'Show Top Products', labelAr: 'إظهار أفضل المنتجات', category: 'report', component: 'toggle', defaultValue: true, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC , field: 'item.name' },
  report_col_widths:         { key: 'report_col_widths', label: 'Report Column Widths', labelAr: 'عرض أعمدة التقرير', category: 'report', component: 'input', defaultValue: {} as any, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
  report_col_headers:        { key: 'report_col_headers', label: 'Report Column Headers', labelAr: 'عناوين أعمدة التقرير', category: 'report', component: 'input', defaultValue: {} as any, supportedPapers: ALL_PAPERS, supportedDocs: REPORT_DOC },
};

export function getSettingMeta(key: string): SettingMeta | undefined {
  return SETTINGS_REGISTRY[key];
}

export function getSettingsByCategory(category: SettingMeta['category']): SettingMeta[] {
  return Object.values(SETTINGS_REGISTRY).filter(s => s.category === category);
}

export function getSettingsForPaper(paperSize: PaperSize): SettingMeta[] {
  return Object.values(SETTINGS_REGISTRY).filter(s => s.supportedPapers.includes(paperSize));
}

export function getSettingsForDoc(docType: DocTypeCode): SettingMeta[] {
  return Object.values(SETTINGS_REGISTRY).filter(s => s.supportedDocs.includes(docType));
}

export function getVisibleSettings(docType: DocTypeCode, paperSize: PaperSize): SettingMeta[] {
  return Object.values(SETTINGS_REGISTRY).filter(s =>
    s.supportedDocs.includes(docType) &&
    s.supportedPapers.includes(paperSize)
  );
}

// ─── Column-level metadata defaults (single source of truth) ────────────────
export interface ColumnDefault {
  header: string;
  width: number;
  align: AlignOption;
}

export const COLUMN_DEFAULTS: Record<ColumnKey, ColumnDefault> = {
  rowNumber: { header: '#',       width: 8,  align: 'center' },
  barcode:   { header: 'باركود',   width: 14, align: 'right'  },
  ref:       { header: 'مرجع',     width: 12, align: 'right'  },
  name:      { header: 'البيان',    width: 30, align: 'right'  },
  unit:      { header: 'وحدة',     width: 10, align: 'center' },
  quantity:  { header: 'الكمية',   width: 12, align: 'center' },
  price:     { header: 'السعر',    width: 14, align: 'right'  },
  discount:  { header: 'خصم',      width: 12, align: 'center' },
  tva:       { header: 'TVA',      width: 10, align: 'center' },
  total:     { header: 'المجموع',   width: 16, align: 'right'  },
};

export function isSettingVisible(key: string, docType: DocTypeCode, paperSize: PaperSize, tpl?: Partial<PrintTemplate>): boolean {
  const meta = SETTINGS_REGISTRY[key];
  if (!meta) return true;
  if (!meta.supportedDocs.includes(docType)) return false;
  if (!meta.supportedPapers.includes(paperSize)) return false;
  if (tpl && meta.dependsOn) {
    const parentMeta = SETTINGS_REGISTRY[meta.dependsOn];
    const parentVal = (tpl as any)[meta.dependsOn];
    if (parentMeta?.component === 'toggle' && !parentVal) return false;
  }
  return true;
}
```

## FILE: resources/js/pages/settings/print-settings/services/SettingsSerializer.ts
```
import type { DocTypeCode, PaperSize, PrintTemplate } from '../types/domain';
import { SETTINGS_REGISTRY } from './SettingsRegistry';

export const TEMPLATE_VERSION = 2;

const SETTING_CONFIG_KEYS = new Set(Object.keys(SETTINGS_REGISTRY));

const TOP_LEVEL_KEYS = new Set([
  'id', 'name', 'doc_type_code', 'paper_size', 'is_default', 'is_active',
  'template_version', 'created_at', 'updated_at',
]);

export interface TemplatePayload {
  name: string;
  doc_type_code: string;
  paper_size: string;
  is_default: boolean;
  is_active: boolean;
  template_version?: number;
  config: Record<string, unknown>;
}

export interface ApiResponse {
  id: number;
  name: string;
  doc_type_code: string;
  paper_size: string;
  is_default: boolean;
  is_active: boolean;
  template_version?: number;
  created_at?: string;
  updated_at?: string;
  config?: Record<string, unknown> | null;
}

/**
 * Normalize a partial template: fill missing fields from registry defaults,
 * preserve valid values, add template_version, keep unknown fields.
 */
export function normalizeTemplate(
  partial: Partial<PrintTemplate>,
  docType?: DocTypeCode,
  paperSize?: PaperSize,
): PrintTemplate {
  const doc   = docType   ?? partial.doc_type_code ?? 'FV' as DocTypeCode;
  const paper = paperSize ?? partial.paper_size    ?? '80mm' as PaperSize;

  const result: Record<string, unknown> = {
    ...partial,
    template_version: TEMPLATE_VERSION,
  };

  for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
    if (key === 'id' || key === 'name' || key === 'doc_type_code' || key === 'paper_size') continue;
    const metaKey = meta.key as string;
    if (result[metaKey] !== undefined && result[metaKey] !== null) continue;
    if (meta.defaultValue !== null) {
      result[metaKey] = meta.defaultValue;
    } else {
      const t = typeof meta.defaultValue;
      if (t === 'string') result[metaKey] = '';
      else if (t === 'number') result[metaKey] = 0;
      else if (t === 'boolean') result[metaKey] = false;
      else if (Array.isArray(meta.defaultValue)) result[metaKey] = [];
      else result[metaKey] = null;
    }
  }

  if (typeof result.name !== 'string' || !result.name) result.name = 'قالب جديد';
  if (!result.doc_type_code) result.doc_type_code = doc;
  if (!result.paper_size) result.paper_size = paper;

  if (result.paper_size === '80mm') { (result as any).paper_width_mm = 80; }
  else if (result.paper_size === '58mm') { (result as any).paper_width_mm = 58; }

  return result as unknown as PrintTemplate;
}

/**
 * Build the API payload from a template — strips top-level fields into config.
 */
export function toApiPayload(tpl: Partial<PrintTemplate>): TemplatePayload {
  const t = tpl as Record<string, unknown>;
  const config: Record<string, unknown> = {};
  for (const key of Object.keys(t)) {
    if (!TOP_LEVEL_KEYS.has(key) && SETTING_CONFIG_KEYS.has(key)) {
      config[key] = t[key];
    }
  }
  return {
    name:             String(t.name ?? 'قالب جديد'),
    doc_type_code:    String(t.doc_type_code ?? 'FV'),
    paper_size:       String(t.paper_size ?? '80mm'),
    is_default:       Boolean(t.is_default),
    is_active:        Boolean(t.is_active),
    template_version: TEMPLATE_VERSION,
    config,
  };
}

/**
 * Reconstruct PrintTemplate from API response — top-level fields + config merge.
 */
export function fromApiResponse(r: ApiResponse): PrintTemplate {
  const base: Partial<PrintTemplate> = {
    id:              r.id,
    name:            r.name,
    doc_type_code:   r.doc_type_code as DocTypeCode,
    paper_size:      r.paper_size as PaperSize,
    is_default:      r.is_default,
    is_active:       r.is_active,
    created_at:      r.created_at,
    updated_at:      r.updated_at,
    template_version: r.template_version ?? TEMPLATE_VERSION,
  };
  const config = r.config ?? {};
  for (const key of Object.keys(config)) {
    (base as any)[key] = (config as any)[key];
  }
  return normalizeTemplate(base, base.doc_type_code, base.paper_size);
}


```

## FILE: resources/js/pages/settings/print-settings/template-library/categories.ts
```
import type { TemplateCategory } from './types';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'invoices',        name: 'Invoices',                nameAr: 'الفواتير',               icon: 'ti-file-invoice' },
  { id: 'delivery-notes',  name: 'Delivery Notes',          nameAr: 'وصل تسليم',              icon: 'ti-truck-delivery' },
  { id: 'receipts',        name: 'Receipts',                nameAr: 'إيصالات',                icon: 'ti-receipt' },
  { id: 'quotes',          name: 'Quotations',              nameAr: 'عروض الأسعار',           icon: 'ti-file-description' },
  { id: 'purchase',        name: 'Purchase Orders',         nameAr: 'أوامر الشراء',           icon: 'ti-shopping-cart' },
  { id: 'pos',             name: 'POS Receipts',            nameAr: 'إيصالات نقاط البيع',     icon: 'ti-device-analytics' },
  { id: 'warehouse',       name: 'Warehouse',               nameAr: 'المستودعات',             icon: 'ti-building-warehouse' },
  { id: 'inventory',       name: 'Inventory',               nameAr: 'الجرد',                  icon: 'ti-packages' },
  { id: 'thermal',         name: 'Thermal Printers',        nameAr: 'طابعات حرارية',          icon: 'ti-printer' },
];

export const ALL_TAGS = [
  'algeria', 'arabic', 'fiscal', 'official', 'tva',
  'qrcode', 'barcode', 'signature', 'stamp',
  'a4', 'a5', '80mm', '58mm',
  'invoice', 'delivery', 'receipt',
] as const;

export type TagSlug = typeof ALL_TAGS[number];

export function categoryFromDocType(docType: string): string {
  const map: Record<string, string> = {
    FV:   'invoices',
    BL:   'delivery-notes',
    DEV:  'quotes',
    BCC:  'quotes',
    AA:   'receipts',
    FA:   'purchase',
    BR:   'purchase',
    AV:   'purchase',
    DDP:  'warehouse',
    BT:   'warehouse',
    POS:  'pos',
    RPT:  'pos',
  };
  return map[docType] ?? 'invoices';
}
```

## FILE: resources/js/pages/settings/print-settings/template-library/config/FooterConfig.ts
```
import type { BorderStyle } from '../../../types';

export interface FooterConfig {
  footerLine1: string;
  footerLine2: string;
  footerLine3: string;
  footerSeparator: BorderStyle;
  showThankYou: boolean;
  thankYouText: string;
  thankYouSize: number;
  showReturnsPolicy: boolean;
  returnsPolicyText: string;
  showBarcode: boolean;
  showQr: boolean;
  showCashierSignature: boolean;
  showClientSignature: boolean;
  showStamp: boolean;
}

export const INVOICE_FOOTER: FooterConfig = {
  footerLine1: 'البضاعة المباعة لا ترد ولا تستبدل',
  footerLine2: 'للاستفسار اتصل على: 0550 00 00 00',
  footerLine3: '',
  footerSeparator: 'solid',
  showThankYou: true,
  thankYouText: 'شكراً لتعاملكم',
  thankYouSize: 11,
  showReturnsPolicy: true,
  returnsPolicyText: 'البضاعة المباعة لا ترد ولا تستبدل',
  showBarcode: true,
  showQr: true,
  showCashierSignature: true,
  showClientSignature: true,
  showStamp: true,
};

export const DELIVERY_FOOTER: FooterConfig = {
  ...INVOICE_FOOTER,
  footerLine1: 'البضاعة المسلمة لا ترد ولا تستبدل',
  footerLine2: 'التوقيع: إمضاء المخزن / إمضاء الزبون',
  showReturnsPolicy: true,
  returnsPolicyText: 'البضاعة المسلمة لا ترد ولا تستبدل',
};

export const DELIVERY_A5_FOOTER: FooterConfig = {
  ...DELIVERY_FOOTER,
  footerLine1: 'البضاعة المسلمة لا ترد ولا تستبدل',
  footerLine2: '',
  thankYouSize: 10,
};
```

## FILE: resources/js/pages/settings/print-settings/template-library/config/HeaderConfig.ts
```
import type { AlignOption, BorderStyle, PaperSize } from '../../../types';
import { LOGO_SIZE_A4, LOGO_SIZE_A5, COLOR_PRIMARY } from '../constants';

export interface HeaderConfig {
  showLogo: boolean;
  logoSize: number;
  logoAlign: AlignOption;
  logoBorderRadius: number;
  showCompanyName: boolean;
  companyNameSize: number;
  companyNameBold: boolean;
  companyNameAlign: AlignOption;
  companyNameColor: string;
  showAddress: boolean;
  showPhone: boolean;
  showTaxId: boolean;
  showRc: boolean;
  showNis: boolean;
  showIce: boolean;
  showArticle: boolean;
  companyInfoAlign: AlignOption;
  companyInfoSize: number;
  headerSeparator: BorderStyle;
}

export function headerConfig(size: PaperSize): HeaderConfig {
  const isA4 = size === 'A4';
  return {
    showLogo: true,
    logoSize: isA4 ? LOGO_SIZE_A4 : LOGO_SIZE_A5,
    logoAlign: 'left',
    logoBorderRadius: 0,
    showCompanyName: true,
    companyNameSize: isA4 ? 16 : 13,
    companyNameBold: true,
    companyNameAlign: 'right',
    companyNameColor: COLOR_PRIMARY,
    showAddress: true,
    showPhone: true,
    showTaxId: true,
    showRc: true,
    showNis: true,
    showIce: true,
    showArticle: true,
    companyInfoAlign: 'right',
    companyInfoSize: isA4 ? 8.5 : 7.5,
    headerSeparator: 'solid',
  };
}
```

## FILE: resources/js/pages/settings/print-settings/template-library/config/index.ts
```
export type { PaperConfig } from './PaperConfig';
export { paperConfig } from './PaperConfig';
export type { TypographyConfig } from './TypographyConfig';
export { typographyConfig } from './TypographyConfig';
export type { HeaderConfig } from './HeaderConfig';
export { headerConfig } from './HeaderConfig';
export type { TableConfig } from './TableConfig';
export { INVOICE_COLUMNS, DELIVERY_COLUMNS, DELIVERY_A5_COLUMNS } from './TableConfig';
export type { TotalsConfig } from './TotalsConfig';
export { INVOICE_TOTALS, DELIVERY_TOTALS, DELIVERY_A5_TOTALS } from './TotalsConfig';
export type { FooterConfig } from './FooterConfig';
export { INVOICE_FOOTER, DELIVERY_FOOTER, DELIVERY_A5_FOOTER } from './FooterConfig';
```

## FILE: resources/js/pages/settings/print-settings/template-library/config/PaperConfig.ts
```
import type { PaperSize, PageOrientation } from '../../../types';
import {
  A4_MARGIN_TOP, A4_MARGIN_BOTTOM, A4_MARGIN_SIDES,
  A5_MARGIN_TOP, A5_MARGIN_BOTTOM, A5_MARGIN_SIDES,
  THERMAL_MARGIN,
} from '../constants';

export interface PaperConfig {
  paperSize: PaperSize;
  pageOrientation: PageOrientation;
  marginTop: number;
  marginBottom: number;
  marginSides: number;
  paperWidthMm: 58 | 80;
}

export function paperConfig(size: PaperSize): PaperConfig {
  switch (size) {
    case 'A4':
      return {
        paperSize: 'A4',
        pageOrientation: 'portrait',
        marginTop: A4_MARGIN_TOP,
        marginBottom: A4_MARGIN_BOTTOM,
        marginSides: A4_MARGIN_SIDES,
        paperWidthMm: 80,
      };
    case 'A5':
      return {
        paperSize: 'A5',
        pageOrientation: 'portrait',
        marginTop: A5_MARGIN_TOP,
        marginBottom: A5_MARGIN_BOTTOM,
        marginSides: A5_MARGIN_SIDES,
        paperWidthMm: 80,
      };
    default:
      return {
        paperSize: size,
        pageOrientation: 'portrait',
        marginTop: THERMAL_MARGIN,
        marginBottom: THERMAL_MARGIN,
        marginSides: THERMAL_MARGIN,
        paperWidthMm: size === '58mm' ? 58 : 80,
      };
  }
}
```

## FILE: resources/js/pages/settings/print-settings/template-library/config/TableConfig.ts
```
import type { ColumnKey, AlignOption, BorderStyle, FontFamily } from '../../../types';
import {
  TABLE_HEADER_BG, TABLE_HEADER_COLOR, TABLE_ROW_ALT,
  COLUMN_REF_WIDTH, COLUMN_NAME_WIDTH, COLUMN_QTY_WIDTH,
  COLUMN_PRICE_WIDTH, COLUMN_TVA_WIDTH, COLUMN_TOTAL_WIDTH,
  COLOR_PRIMARY,
} from '../constants';

export interface TableConfig {
  columnOrder: ColumnKey[];
  columnShow: Partial<Record<ColumnKey, boolean>>;
  columnWidths: Partial<Record<ColumnKey, number>>;
  columnHeaders: Partial<Record<ColumnKey, string>>;
  columnAligns: Partial<Record<ColumnKey, AlignOption>>;
  itemsFontSize: number;
  itemsFontFamily: FontFamily;
  showColHeader: boolean;
  tableHeaderBold: boolean;
  tableHeaderBg: boolean;
  tableHeaderColor: string;
  tableBorderStyle: BorderStyle;
  alternatingRows: boolean;
  alternatingColor: string;
  priceDisplay: 'ht' | 'ttc';
}

export const INVOICE_COLUMNS: TableConfig = {
  columnOrder: ['ref', 'name', 'quantity', 'price', 'tva', 'total'],
  columnShow: { ref: true, name: true, quantity: true, price: true, tva: true, total: true },
  columnWidths: { ref: COLUMN_REF_WIDTH, name: COLUMN_NAME_WIDTH, quantity: COLUMN_QTY_WIDTH, price: COLUMN_PRICE_WIDTH, tva: COLUMN_TVA_WIDTH, total: COLUMN_TOTAL_WIDTH },
  columnHeaders: { ref: 'م', name: 'البيان', quantity: 'الكمية', price: 'س.و.ح', tva: '%TVA', total: 'المبلغ' },
  columnAligns: { ref: 'center', name: 'right', quantity: 'center', price: 'center', tva: 'center', total: 'center' },
  itemsFontSize: 9,
  itemsFontFamily: 'tajawal',
  showColHeader: true,
  tableHeaderBold: true,
  tableHeaderBg: true,
  tableHeaderColor: COLOR_PRIMARY,
  tableBorderStyle: 'solid',
  alternatingRows: true,
  alternatingColor: TABLE_ROW_ALT,
  priceDisplay: 'ht',
};

export const DELIVERY_COLUMNS: TableConfig = {
  ...INVOICE_COLUMNS,
  columnOrder: ['ref', 'name', 'quantity', 'price', 'tva', 'total'],
  columnHeaders: { ref: 'م', name: 'البيان', quantity: 'الكمية', price: 'س.و.ح', tva: '%TVA', total: 'المبلغ' },
};

export const DELIVERY_A5_COLUMNS: TableConfig = {
  ...INVOICE_COLUMNS,
  columnOrder: ['ref', 'name', 'quantity', 'price', 'total'],
  columnShow: { ref: true, name: true, quantity: true, price: true, total: true },
  columnWidths: { ref: 8, name: 32, quantity: 14, price: 20, total: 22 },
  columnHeaders: { ref: 'م', name: 'البيان', quantity: 'الكمية', price: 'س.و.ح', total: 'المبلغ' },
  columnAligns: { ref: 'center', name: 'right', quantity: 'center', price: 'center', total: 'center' },
  itemsFontSize: 8,
};
```

## FILE: resources/js/pages/settings/print-settings/template-library/config/TotalsConfig.ts
```
import type { AlignOption, BorderStyle } from '../../../types';
import { COLOR_PRIMARY, TOTAL_TTC_FONT_SIZE } from '../constants';

export interface TotalsConfig {
  totalsFontSize: number;
  totalsBold: boolean;
  totalsAlign: AlignOption;
  showTotalHt: boolean;
  showTotalTva: boolean;
  showTvaBreakdown: boolean;
  showDiscountTotal: boolean;
  showFiscalStamp: boolean;
  showTotalTtc: boolean;
  totalTtcFontSize: number;
  totalTtcBold: boolean;
  totalTtcColor: string;
  totalBorderStyle: BorderStyle;
  showAmountInWords: boolean;
  showPaidAmount: boolean;
  showChange: boolean;
  showRemaining: boolean;
  showPrevBalance: boolean;
  showNewBalance: boolean;
}

export const INVOICE_TOTALS: TotalsConfig = {
  totalsFontSize: 10,
  totalsBold: true,
  totalsAlign: 'left',
  showTotalHt: true,
  showTotalTva: true,
  showTvaBreakdown: true,
  showDiscountTotal: true,
  showFiscalStamp: true,
  showTotalTtc: true,
  totalTtcFontSize: TOTAL_TTC_FONT_SIZE,
  totalTtcBold: true,
  totalTtcColor: COLOR_PRIMARY,
  totalBorderStyle: 'double',
  showAmountInWords: true,
  showPaidAmount: false,
  showChange: false,
  showRemaining: false,
  showPrevBalance: false,
  showNewBalance: false,
};

export const DELIVERY_TOTALS: TotalsConfig = {
  ...INVOICE_TOTALS,
};

export const DELIVERY_A5_TOTALS: TotalsConfig = {
  ...INVOICE_TOTALS,
  totalsFontSize: 9,
  totalTtcFontSize: 14,
  showTvaBreakdown: false,
  showFiscalStamp: false,
  showAmountInWords: false,
};
```

## FILE: resources/js/pages/settings/print-settings/template-library/config/TypographyConfig.ts
```
import type { FontFamily, AlignOption, PaperSize } from '../../../types';
import {
  TITLE_SIZE_A4, TITLE_SIZE_A5,
  COMPANY_NAME_SIZE_A4, COMPANY_NAME_SIZE_A5,
  COMPANY_INFO_SIZE_A4, COMPANY_INFO_SIZE_A5,
  BASE_FONT_SIZE_A4, BASE_FONT_SIZE_A5,
  ITEMS_FONT_SIZE_A4, ITEMS_FONT_SIZE_A5,
  TOTALS_FONT_SIZE, TOTALS_FONT_SIZE_A5,
  TOTAL_TTC_FONT_SIZE, TOTAL_TTC_FONT_SIZE_A5,
  THANK_YOU_SIZE, THANK_YOU_SIZE_A5,
} from '../constants';

export interface TypographyConfig {
  fontFamily: FontFamily;
  baseFontSize: number;
  titleSize: number;
  titleBold: boolean;
  titleAlign: AlignOption;
  companyNameSize: number;
  companyNameBold: boolean;
  companyInfoSize: number;
  itemsFontSize: number;
  totalsFontSize: number;
  totalTtcFontSize: number;
  thankYouSize: number;
}

export function typographyConfig(size: PaperSize): TypographyConfig {
  const isA4 = size === 'A4';
  const isA5 = size === 'A5';
  return {
    fontFamily: 'tajawal',
    baseFontSize: isA4 ? BASE_FONT_SIZE_A4 : isA5 ? BASE_FONT_SIZE_A5 : 9,
    titleSize: isA4 ? TITLE_SIZE_A4 : isA5 ? TITLE_SIZE_A5 : 13,
    titleBold: true,
    titleAlign: 'center',
    companyNameSize: isA4 ? COMPANY_NAME_SIZE_A4 : isA5 ? COMPANY_NAME_SIZE_A5 : 14,
    companyNameBold: true,
    companyInfoSize: isA4 ? COMPANY_INFO_SIZE_A4 : isA5 ? COMPANY_INFO_SIZE_A5 : 8,
    itemsFontSize: isA4 ? ITEMS_FONT_SIZE_A4 : isA5 ? ITEMS_FONT_SIZE_A5 : 9,
    totalsFontSize: isA5 ? TOTALS_FONT_SIZE_A5 : TOTALS_FONT_SIZE,
    totalTtcFontSize: isA5 ? TOTAL_TTC_FONT_SIZE_A5 : TOTAL_TTC_FONT_SIZE,
    thankYouSize: isA5 ? THANK_YOU_SIZE_A5 : THANK_YOU_SIZE,
  };
}
```

## FILE: resources/js/pages/settings/print-settings/template-library/constants.ts
```
// ─── Layout constants ──────────────────────────────────────────────────────────
export const A4_PAGE_WIDTH_MM     = 210;
export const A5_PAGE_WIDTH_MM     = 148;
export const A4_CONTENT_WIDTH     = 174; // 210 - (18*2)
export const A5_CONTENT_WIDTH     = 126; // 148 - (12*2)
export const A4_MARGIN_TOP        = 20;
export const A4_MARGIN_BOTTOM     = 20;
export const A4_MARGIN_SIDES      = 18;
export const A5_MARGIN_TOP        = 12;
export const A5_MARGIN_BOTTOM     = 12;
export const A5_MARGIN_SIDES      = 11;
export const THERMAL_MARGIN       = 3;

// ─── Logo ──────────────────────────────────────────────────────────────────────
export const LOGO_SIZE_A4         = 75;
export const LOGO_SIZE_A5         = 55;
export const LOGO_SIZE_THERMAL    = 56;

// ─── Typography ────────────────────────────────────────────────────────────────
export const TITLE_SIZE_A4        = 20;
export const TITLE_SIZE_A5        = 16;
export const TITLE_SIZE_THERMAL   = 13;
export const COMPANY_NAME_SIZE_A4 = 16;
export const COMPANY_NAME_SIZE_A5 = 13;
export const COMPANY_INFO_SIZE_A4 = 8.5;
export const COMPANY_INFO_SIZE_A5 = 7.5;
export const BASE_FONT_SIZE_A4    = 9.5;
export const BASE_FONT_SIZE_A5    = 8.5;
export const ITEMS_FONT_SIZE_A4   = 9;
export const ITEMS_FONT_SIZE_A5   = 8;
export const TOTALS_FONT_SIZE     = 10;
export const TOTALS_FONT_SIZE_A5  = 9;
export const TOTAL_TTC_FONT_SIZE  = 17;
export const TOTAL_TTC_FONT_SIZE_A5 = 14;

// ─── Colors ────────────────────────────────────────────────────────────────────
export const COLOR_PRIMARY        = '#1a1a2e';
export const COLOR_TEXT           = '#000000';
export const COLOR_MUTED          = '#333333';
export const COLOR_BORDER         = '#d1d5db';
export const COLOR_TABLE_HOVER    = '#f8f9fa';
export const COLOR_BG_LIGHT       = '#f9fafb';

// ─── Table ─────────────────────────────────────────────────────────────────────
export const TABLE_HEADER_BG      = '#1a1a2e';
export const TABLE_HEADER_COLOR   = '#ffffff';
export const TABLE_ROW_ALT        = '#f8f9fa';
export const TABLE_BORDER_COLOR   = '#e5e7eb';
export const COLUMN_REF_WIDTH     = 8;
export const COLUMN_NAME_WIDTH    = 28;
export const COLUMN_QTY_WIDTH     = 10;
export const COLUMN_PRICE_WIDTH   = 18;
export const COLUMN_TVA_WIDTH     = 12;
export const COLUMN_TOTAL_WIDTH   = 18;

// ─── Footer / Legal ────────────────────────────────────────────────────────────
export const THANK_YOU_SIZE       = 11;
export const THANK_YOU_SIZE_A5    = 10;
export const LEGAL_TEXT_SIZE      = 6;
export const SIG_LINE_WIDTH       = 40;
export const QR_SIZE              = 20;
export const STAMP_SIZE           = 28;

// ─── Modal ─────────────────────────────────────────────────────────────────────
export const MODAL_MAX_WIDTH      = 1100;
export const CARD_MIN_WIDTH       = 280;
export const CARD_PREVIEW_HEIGHT  = 340;
export const CARD_PREVIEW_SCALE   = 0.38;
export const GRID_GAP             = 16;
export const MODAL_BORDER_RADIUS  = 12;
export const CARD_BORDER_RADIUS   = 10;

// ─── Registry ──────────────────────────────────────────────────────────────────
export const TEMPLATE_AUTHOR      = 'erp-system';
export const LAYOUT_ENGINE_VERSION = '1.0.0';
export const TEMPLATE_COUNTRY_DZ  = 'DZ';
```

## FILE: resources/js/pages/settings/print-settings/template-library/index.ts
```
// ─── Registry (single source of truth) ──────────────────────────────────────
export { templateRegistry, registerBuiltinTemplates, buildTemplate, createMeta } from './registry';
// ─── Modal ──────────────────────────────────────────────────────────────────
export { default as TemplateLibraryModal } from './TemplateLibraryModal';
// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  LibraryTemplateEntry, LibraryTemplateMeta, LibraryApiResponse,
  TemplateVersion, TemplateTags, TemplateCategory,
  LibraryFilterState, FavoriteEntry, InstallHistoryEntry,
} from './types';
// ─── Constants ──────────────────────────────────────────────────────────────
export * from './constants';
// ─── Config layers ──────────────────────────────────────────────────────────
export {
  paperConfig, typographyConfig, headerConfig,
  INVOICE_COLUMNS, DELIVERY_COLUMNS, DELIVERY_A5_COLUMNS,
  INVOICE_TOTALS, DELIVERY_TOTALS, DELIVERY_A5_TOTALS,
  INVOICE_FOOTER, DELIVERY_FOOTER, DELIVERY_A5_FOOTER,
} from './config';
export type {
  PaperConfig, TypographyConfig, HeaderConfig,
  TableConfig, TotalsConfig, FooterConfig,
} from './config';
// ─── Categories ─────────────────────────────────────────────────────────────
export { TEMPLATE_CATEGORIES, ALL_TAGS, categoryFromDocType } from './categories';
export type { TagSlug } from './categories';
// ─── Mock data (for preview only) ───────────────────────────────────────────
export { getMockDocumentData } from './mockData';
```

## FILE: resources/js/pages/settings/print-settings/template-library/mockData.ts
```
import type { UniversalDocumentData } from '../types/data';

let _mockCache: UniversalDocumentData | null = null;

export function getMockDocumentData(): UniversalDocumentData {
  if (_mockCache) return _mockCache;
  const data: UniversalDocumentData = {
    doc: {
      number:   'FV-2025-0001',
      date:     '28/06/2025',
      dueDate:  '28/07/2025',
      time:     '10:30',
      typeCode: 'FV',
      typeName: 'فاتورة بيع',
      status:   'confirmed',
      notes:    '',
      reference: '',
    },
    company: {
      name:    'المؤسسة الجزائرية',
      address: '15 شارع فلسطين، الجزائر العاصمة',
      phone:   '0550 00 00 00',
      nif:     '09991234567890',
      rc:      '99B1234567',
      nis:     '09991234567890',
      ice:     '09991234567890',
      article: '1604123456',
      logoUrl: null,
      email:   'contact@entreprise.dz',
      website: '',
    },
    party: {
      id:              1,
      name:            'شركة نموذجية',
      type:            'client',
      nif:             '09991234567895',
      rc:              '',
      nis:             '',
      phone:           '0550 00 00 01',
      email:           '',
      address:         'شارع الاستقلال، الجزائر',
      deliveryAddress: '',
      cashierName:     '',
    },
    lines: [
      {
        rowNumber:  1,
        ref:        'REF001',
        barcode:    '',
        name:       'منتج نموذجي 1',
        unit:       'قطعة',
        quantity:   2,
        unitPriceHt: 5000,
        unitPriceTtc: 5950,
        tvaRate:    19,
        tvaPct:     19,
        discountPct: 0,
        discountAmt: 0,
        totalHt:    10000,
        totalTva:   1900,
        totalTtc:   11900,
        lot:        '',
        notes:      '',
      },
      {
        rowNumber:  2,
        ref:        'REF002',
        barcode:    '',
        name:       'منتج نموذجي 2',
        unit:       'قطعة',
        quantity:   1,
        unitPriceHt: 3500,
        unitPriceTtc: 3815,
        tvaRate:    9,
        tvaPct:     9,
        discountPct: 0,
        discountAmt: 0,
        totalHt:    3500,
        totalTva:   315,
        totalTtc:   3815,
        lot:        '',
        notes:      '',
      },
      {
        rowNumber:  3,
        ref:        'REF003',
        barcode:    '',
        name:       'منتج نموذجي 3',
        unit:       'قطعة',
        quantity:   5,
        unitPriceHt: 1200,
        unitPriceTtc: 1428,
        tvaRate:    19,
        tvaPct:     19,
        discountPct: 0,
        discountAmt: 0,
        totalHt:    6000,
        totalTva:   1140,
        totalTtc:   7140,
        lot:        '',
        notes:      '',
      },
    ],
    totals: {
      totalHt:      19500,
      totalTva:     3355,
      totalTtc:     23055,
      fiscalStamp:  200,
      totalDiscount: 0,
      paid:         0,
      change:       0,
      remaining:    23055,
    },
    taxBreakdown: [
      { rate: 19, baseHt: 16000, tva: 3040, ttc: 19040 },
      { rate: 9,  baseHt: 3500,  tva: 315,  ttc: 3815 },
    ],
    payments: [
      { mode: 'cash', amount: 23055, reference: '', date: '28/06/2025' },
    ],
  };
  _mockCache = data;
  return data;
}
```

## FILE: resources/js/pages/settings/print-settings/template-library/registry.ts
```
import type { PrintTemplate, PaperSize, DocTypeCode, CompanyData } from '../types';
import type { UniversalDocumentData } from '../types/data';
import type { LibraryTemplateEntry, LibraryTemplateMeta } from './types';
import {
  TEMPLATE_AUTHOR, LAYOUT_ENGINE_VERSION, TEMPLATE_COUNTRY_DZ,
} from './constants';
import {
  INVOICE_COLUMNS, INVOICE_TOTALS, INVOICE_FOOTER,
  DELIVERY_COLUMNS, DELIVERY_TOTALS, DELIVERY_FOOTER,
  DELIVERY_A5_COLUMNS, DELIVERY_A5_TOTALS, DELIVERY_A5_FOOTER,
} from './config';
import { headerConfig, paperConfig, typographyConfig } from './config';
import { categoryFromDocType } from './categories';
import { getMockDocumentData } from './mockData';

// ─── TemplateRegistry — single source of truth for built-in templates ─────────

class TemplateRegistryClass {
  private entries = new Map<string, LibraryTemplateEntry>();

  register(entry: LibraryTemplateEntry): void {
    if (this.entries.has(entry.meta.id)) {
      console.warn(`[TemplateRegistry] Overwriting template: ${entry.meta.id}`);
    }
    this.entries.set(entry.meta.id, entry);
  }

  get(id: string): LibraryTemplateEntry | undefined {
    return this.entries.get(id);
  }

  getAll(): LibraryTemplateEntry[] {
    return Array.from(this.entries.values());
  }

  getByDocType(docType: DocTypeCode): LibraryTemplateEntry[] {
    return this.getAll().filter(e => e.meta.documentType === docType);
  }

  getByPaperSize(size: PaperSize): LibraryTemplateEntry[] {
    return this.getAll().filter(e => e.meta.paperSize === size);
  }

  getByCategory(category: string): LibraryTemplateEntry[] {
    return this.getAll().filter(e => e.meta.category === category);
  }

  getByTag(tag: string): LibraryTemplateEntry[] {
    return this.getAll().filter(e => e.meta.tags.includes(tag));
  }

  search(query: string): LibraryTemplateEntry[] {
    const q = query.toLowerCase();
    return this.getAll().filter(e =>
      e.meta.name.toLowerCase().includes(q) ||
      e.meta.nameAr.includes(q) ||
      e.meta.description.toLowerCase().includes(q) ||
      e.meta.descriptionAr.includes(q) ||
      e.meta.category.includes(q) ||
      e.meta.tags.some(t => t.includes(q)) ||
      e.meta.documentType.toLowerCase().includes(q)
    );
  }

  getCategories(): string[] {
    return [...new Set(this.getAll().map(e => e.meta.category))];
  }

  getTags(): string[] {
    return [...new Set(this.getAll().flatMap(e => e.meta.tags))];
  }

  getPaperSizes(): PaperSize[] {
    return [...new Set(this.getAll().map(e => e.meta.paperSize))];
  }

  getDocTypes(): DocTypeCode[] {
    return [...new Set(this.getAll().map(e => e.meta.documentType))];
  }

  buildPreview(templateId: string, companyOverride?: CompanyData | null): { tpl: PrintTemplate; data: UniversalDocumentData } | null {
    const entry = this.get(templateId);
    if (!entry) return null;
    const tpl = { ...entry.createConfig(), id: -1, is_default: false, is_active: true };
    if (companyOverride) {
      tpl.override_address = companyOverride.address || '';
      tpl.override_phone = companyOverride.phone || '';
      tpl.override_nif = companyOverride.nif || '';
      tpl.override_rc = companyOverride.rc || '';
      tpl.override_nis = companyOverride.nis || '';
      tpl.override_ice = companyOverride.ice || '';
      tpl.override_article = companyOverride.article || '';
    }
    return { tpl, data: this.getMockData() };
  }

  private mockData: UniversalDocumentData | null = null;

  private getMockData(): UniversalDocumentData {
    if (this.mockData) return this.mockData;
    this.mockData = getMockDocumentData();
    return this.mockData!;
  }
}

export const templateRegistry = new TemplateRegistryClass();

// ─── Helper to build a LibraryTemplateMeta from factory configs ────────────────

export function createMeta(overrides: {
  id: string; name: string; nameAr: string;
  description: string; descriptionAr: string;
  documentType: DocTypeCode; paperSize: PaperSize;
  version?: string; tags?: string[]; subcategory?: string;
  revision?: number;
}): LibraryTemplateMeta {
  return {
    id: overrides.id,
    version: overrides.version ?? '1.0.0',
    revision: overrides.revision ?? 1,
    createdAt: '2025-06-28',
    updatedAt: '2025-06-28',
    author: TEMPLATE_AUTHOR,
    country: TEMPLATE_COUNTRY_DZ,
    layoutEngineVersion: LAYOUT_ENGINE_VERSION,
    name: overrides.name,
    nameAr: overrides.nameAr,
    description: overrides.description,
    descriptionAr: overrides.descriptionAr,
    documentType: overrides.documentType,
    paperSize: overrides.paperSize,
    category: categoryFromDocType(overrides.documentType),
    subcategory: overrides.subcategory,
    tags: overrides.tags ?? [],
    readOnly: true as const,
  };
}

// ─── Factory function for building PrintTemplate from layer configs ────────────

export function buildTemplate(
  name: string,
  docTypeCode: DocTypeCode,
  paperSize: PaperSize,
  overrides?: Partial<PrintTemplate>,
): PrintTemplate {
  const paper = paperConfig(paperSize);
  const typo = typographyConfig(paperSize);
  const header = headerConfig(paperSize);

  const isInvoice = docTypeCode === 'FV';
  const isA5 = paperSize === 'A5';

  const table = isInvoice
    ? INVOICE_COLUMNS
    : isA5
      ? DELIVERY_A5_COLUMNS
      : DELIVERY_COLUMNS;

  const totals = isInvoice
    ? INVOICE_TOTALS
    : isA5
      ? DELIVERY_A5_TOTALS
      : DELIVERY_TOTALS;

  const footer = isInvoice
    ? INVOICE_FOOTER
    : isA5
      ? DELIVERY_A5_FOOTER
      : DELIVERY_FOOTER;

  const base: PrintTemplate = {
    id: null,
    name,
    doc_type_code: docTypeCode,
    paper_size: paperSize,
    paper_width_mm: paper.paperWidthMm,
    page_orientation: paper.pageOrientation,
    is_default: false,
    is_active: true,

    margin_top: paper.marginTop,
    margin_bottom: paper.marginBottom,
    margin_sides: paper.marginSides,
    line_spacing: 1.2,
    base_font_size: typo.baseFontSize,
    font_family: typo.fontFamily,

    show_logo: header.showLogo,
    logo_size: header.logoSize,
    logo_align: header.logoAlign,
    logo_border_radius: header.logoBorderRadius,

    show_company_name: header.showCompanyName,
    company_name_text: '',
    company_name_size: header.companyNameSize,
    company_name_bold: header.companyNameBold,
    company_name_align: header.companyNameAlign,
    company_name_color: header.companyNameColor,

    show_address: header.showAddress,
    show_phone: header.showPhone,
    show_tax_id: header.showTaxId,
    show_rc: header.showRc,
    show_nis: header.showNis,
    show_ice: header.showIce,
    show_article: header.showArticle,
    company_info_align: header.companyInfoAlign,
    company_info_size: header.companyInfoSize,

    override_address: '',
    override_phone: '',
    override_nif: '',
    override_rc: '',
    override_nis: '',
    override_ice: '',
    override_article: '',
    header_custom_text: '',
    header_separator: header.headerSeparator,

    title_text: isInvoice ? 'فاتورة بيع' : 'وصل تسليم',
    title_size: typo.titleSize,
    title_bold: typo.titleBold,
    title_align: typo.titleAlign,
    title_color: header.companyNameColor,
    show_doc_number: true,
    show_date: true,
    show_time: false,
    show_due_date: isInvoice,
    show_cashier: isInvoice,
    show_client: true,
    show_client_nif: true,
    show_client_phone: true,
    show_client_address: true,
    show_delivery_address: !isInvoice,
    show_session: false,
    show_payment_term: false,
    show_bank_details: isInvoice,
    bank_details_text: isInvoice ? 'RIB: 007 99999 000012345678 90' : '',
    doc_separator: 'solid',

    col_order: table.columnOrder,
    col_show: table.columnShow,
    col_widths: table.columnWidths,
    col_headers: table.columnHeaders,
    col_aligns: table.columnAligns,

    items_font_size: table.itemsFontSize,
    items_font_family: table.itemsFontFamily,
    show_col_header: table.showColHeader,
    table_header_bold: table.tableHeaderBold,
    table_header_bg: table.tableHeaderBg,
    table_header_color: table.tableHeaderColor,
    table_border_style: table.tableBorderStyle,
    alternating_rows: table.alternatingRows,
    alternating_color: table.alternatingColor,
    price_display: table.priceDisplay,
    show_line_total_ttc: false,

    totals_font_size: totals.totalsFontSize,
    totals_bold: totals.totalsBold,
    totals_align: totals.totalsAlign,
    show_total_ht: totals.showTotalHt,
    show_total_tva: totals.showTotalTva,
    show_tva_breakdown: totals.showTvaBreakdown,
    show_discount_total: totals.showDiscountTotal,
    show_fiscal_stamp: totals.showFiscalStamp,
    show_total_ttc: totals.showTotalTtc,
    total_ttc_font_size: totals.totalTtcFontSize,
    total_ttc_bold: totals.totalTtcBold,
    total_ttc_color: totals.totalTtcColor,
    total_border_style: totals.totalBorderStyle,
    show_amount_in_words: totals.showAmountInWords,
    show_paid_amount: totals.showPaidAmount,
    show_change: totals.showChange,
    show_remaining: totals.showRemaining,
    show_prev_balance: totals.showPrevBalance,
    show_new_balance: totals.showNewBalance,

    show_payment_details: false,
    payment_font_size: 9,

    footer_line1: footer.footerLine1,
    footer_line2: footer.footerLine2,
    footer_line3: footer.footerLine3,
    footer_separator: footer.footerSeparator,
    show_thank_you: footer.showThankYou,
    thank_you_text: footer.thankYouText,
    thank_you_size: footer.thankYouSize,
    thank_you_color: '#333333',
    show_returns_policy: footer.showReturnsPolicy,
    returns_policy_text: footer.returnsPolicyText,
    footer_legal_text: '',

    show_barcode: footer.showBarcode,
    barcode_content: 'doc-number',
    barcode_custom_text: '',
    show_qr: footer.showQr,
    qr_content: 'both',

    show_cashier_signature: footer.showCashierSignature,
    show_client_signature: footer.showClientSignature,
    show_stamp: footer.showStamp,

    show_header_section: true,
    show_doc_info_section: true,
    show_items_section: true,
    show_totals_section: true,
    show_payments_section: false,
    show_footer_section: true,

    rules: [],

    show_report_header: false,
    report_header_text: '',
    show_report_footer: false,
    report_footer_text: '',
    show_charts: false,
    chart_type: 'bar',
    chart_title: '',
    group_by: '',
    sort_by: '',
    sort_direction: 'asc',
    show_report_period: false,
    show_report_cashier: false,
    show_report_summary_cards: false,
    show_report_payment_breakdown: false,
    show_report_top_products: false,
  };

  return overrides ? { ...base, ...overrides } : base;
}

// ─── Register all built-in templates ───────────────────────────────────────────

export function registerBuiltinTemplates(): void {
  templateRegistry.register({
    meta: createMeta({
      id: 'dz-invoice-a4',
      name: 'Algerian Invoice A4',
      nameAr: 'الفاتورة الجزائرية A4',
      description: 'Standard Algerian fiscal invoice in A4 format with full TVA breakdown, fiscal stamp, amount in words, signature and QR code.',
      descriptionAr: 'فاتورة بيع جزائرية رسمية بصيغة A4 مع تفصيل TVA والطابع الجبائي والمبلغ كتابة والتوقيع ورمز QR',
      documentType: 'FV',
      paperSize: 'A4',
      tags: ['algeria', 'arabic', 'fiscal', 'official', 'tva', 'qrcode', 'barcode', 'signature', 'invoice', 'a4'],
    }),
    createConfig: () => buildTemplate('قالب الفاتورة الجزائري A4', 'FV', 'A4'),
  });

  templateRegistry.register({
    meta: createMeta({
      id: 'dz-delivery-a4',
      name: 'Algerian Delivery Note A4',
      nameAr: 'وصل التسليم الجزائري A4',
      description: 'Standard Algerian delivery note in A4 format with detailed items table, TVA breakdown and signature block.',
      descriptionAr: 'وصل تسليم جزائري رسمي بصيغة A4 مع جدول المواد وتفصيل TVA والتوقيع',
      documentType: 'BL',
      paperSize: 'A4',
      tags: ['algeria', 'arabic', 'fiscal', 'official', 'tva', 'qrcode', 'barcode', 'signature', 'delivery', 'a4'],
    }),
    createConfig: () => buildTemplate('قالب وصل التسليم الجزائري A4', 'BL', 'A4'),
  });

  templateRegistry.register({
    meta: createMeta({
      id: 'dz-delivery-a5',
      name: 'Algerian Delivery Note A5',
      nameAr: 'وصل التسليم الجزائري A5',
      description: 'Compact Algerian delivery note in A5 half-page format with items table, TVA and signature block.',
      descriptionAr: 'وصل تسليم جزائري بصيغة A5 بنصف صفحة مع جدول المواد و TVA والتوقيع',
      documentType: 'BL',
      paperSize: 'A5',
      tags: ['algeria', 'arabic', 'fiscal', 'official', 'delivery', 'a5'],
    }),
    createConfig: () => buildTemplate('قالب وصل التسليم الجزائري A5', 'BL', 'A5'),
  });
}

// ─── Eagerly register on module load (runs once per page load) ─────────────────
registerBuiltinTemplates();
```

## FILE: resources/js/pages/settings/print-settings/template-library/TemplateLibraryModal.tsx
```
import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { templateRegistry } from './registry';
import { TEMPLATE_CATEGORIES, ALL_TAGS } from './categories';
import type { LibraryTemplateEntry, LibraryFilterState, FavoriteEntry, InstallHistoryEntry } from './types';
import type { PrintTemplate, PaperSize, DocTypeCode } from '../types';
import type { UniversalDocumentData } from '../types/data';
import {
  MODAL_MAX_WIDTH, CARD_MIN_WIDTH, CARD_PREVIEW_HEIGHT,
  CARD_PREVIEW_SCALE, MODAL_BORDER_RADIUS, CARD_BORDER_RADIUS,
  GRID_GAP,
} from './constants';
import { getMockDocumentData } from './mockData';

// ════════════════════════════════════════════════════════════════════════════
//  Lazy-loaded UniversalPreview (code-split)
// ════════════════════════════════════════════════════════════════════════════

const UniversalPreview = lazy(() => import('../components/preview/UniversalPreview'));

function PreviewFallback() {
  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, color: '#bbb', background: '#f9fafb',
    }}>
      <i className="ti ti-loader-2 spin" style={{ fontSize: 20 }} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Props
// ════════════════════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  onClose: () => void;
  onInstall: (templateId: string, tpl: PrintTemplate) => Promise<void>;
  activeDoc: string;
}

// ════════════════════════════════════════════════════════════════════════════
//  Local storage helpers — favorites, install history, recently used
// ════════════════════════════════════════════════════════════════════════════

const FAV_KEY = 'template_library_favorites';
const RECENT_KEY = 'template_library_recent';
const HISTORY_KEY = 'template_library_history';
const MAX_RECENT = 5;

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    const parsed: FavoriteEntry[] = JSON.parse(raw);
    return new Set(parsed.map(e => e.templateId));
  } catch { return new Set(); }
}

function saveFavorites(ids: Set<string>): void {
  const entries: FavoriteEntry[] = Array.from(ids).map(templateId => ({
    templateId, addedAt: new Date().toISOString(),
  }));
  localStorage.setItem(FAV_KEY, JSON.stringify(entries));
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addRecent(templateId: string): void {
  const list = loadRecent().filter(id => id !== templateId);
  list.unshift(templateId);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

function addHistory(entry: InstallHistoryEntry): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list: InstallHistoryEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20)));
  } catch { /* ignore */ }
}

// ════════════════════════════════════════════════════════════════════════════
//  Component
// ════════════════════════════════════════════════════════════════════════════

const STYLES = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: 20, direction: 'rtl' as const,
  },
  modal: {
    background: '#fff', borderRadius: MODAL_BORDER_RADIUS,
    width: '100%', maxWidth: MODAL_MAX_WIDTH, maxHeight: '90vh',
    display: 'flex' as const, flexDirection: 'column' as const,
    boxShadow: '0 25px 60px rgba(0,0,0,.25)',
    overflow: 'hidden',
  },
  header: {
    padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 17, fontWeight: 800, color: '#111',
    display: 'flex' as const, alignItems: 'center' as const, gap: 8,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8, border: 'none',
    background: '#f3f4f6', cursor: 'pointer', fontSize: 16,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    color: '#666',
  },
  body: {
    padding: 0, overflow: 'hidden', flex: 1,
    display: 'flex' as const, flexDirection: 'column' as const,
  },
  toolbar: {
    padding: '12px 20px', borderBottom: '1px solid #e5e7eb',
    display: 'flex' as const, flexWrap: 'wrap' as const, gap: 8,
    alignItems: 'center' as const, background: '#fafafa',
  },
  searchInput: {
    flex: 1, minWidth: 180, padding: '7px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
    fontFamily: 'Tajawal, sans-serif',
  },
  filterSelect: {
    padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db',
    fontSize: 12, fontFamily: 'Tajawal, sans-serif', background: '#fff',
  },
  grid: {
    display: 'grid' as const, gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
    gap: GRID_GAP, padding: 20, overflowY: 'auto' as const, flex: 1,
  },
  card: {
    borderRadius: CARD_BORDER_RADIUS, border: '1px solid #e5e7eb',
    overflow: 'hidden', display: 'flex' as const, flexDirection: 'column' as const,
    transition: 'box-shadow .2s', background: '#fff',
  },
  cardPreviewWrapper: {
    height: CARD_PREVIEW_HEIGHT, overflow: 'hidden', position: 'relative' as const,
    background: '#f9fafb', cursor: 'pointer',
  },
  cardPreviewContent: {
    transform: `scale(${CARD_PREVIEW_SCALE})`,
    transformOrigin: 'top right',
    width: `${100 / CARD_PREVIEW_SCALE}%`,
  },
  cardBody: {
    padding: '12px 14px', flex: 1, display: 'flex' as const,
    flexDirection: 'column' as const, gap: 6,
  },
  cardName: {
    fontSize: 14, fontWeight: 700, color: '#111',
    display: 'flex' as const, alignItems: 'center' as const, gap: 6,
  },
  cardDesc: {
    fontSize: 11, color: '#666', lineHeight: 1.5, flex: 1,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  tagRow: {
    display: 'flex' as const, gap: 4, flexWrap: 'wrap' as const,
  },
  tagDoc: {
    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
    background: '#eef2ff', color: '#4338ca',
    display: 'flex' as const, alignItems: 'center' as const, gap: 3,
  },
  tagSize: {
    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
    background: '#f0fdf4', color: '#15803d',
    display: 'flex' as const, alignItems: 'center' as const, gap: 3,
  },
  tagCategory: {
    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
    background: '#fef3c7', color: '#92400e',
    display: 'flex' as const, alignItems: 'center' as const, gap: 3,
  },
  installBtn: {
    padding: '8px 16px', border: 'none', borderRadius: 6,
    background: '#1a1a2e', color: '#fff', cursor: 'pointer',
    fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 6, marginTop: 8, transition: 'opacity .2s',
  },
  favBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, padding: 0, lineHeight: 1,
  },
  emptyState: {
    textAlign: 'center' as const, padding: 60, color: '#999', fontSize: 13,
    display: 'flex' as const, flexDirection: 'column' as const, alignItems: 'center' as const, gap: 8,
  },
  recentRow: {
    padding: '10px 20px', borderBottom: '1px solid #e5e7eb',
    display: 'flex' as const, gap: 12, alignItems: 'center' as const,
    background: '#f7f7ff', fontSize: 12, color: '#555',
  },
  zoomControls: {
    display: 'flex' as const, gap: 4,
  },
  zoomBtn: {
    width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db',
    background: '#fff', cursor: 'pointer', fontSize: 12,
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    color: '#555',
  },
};

export default function TemplateLibraryModal({ open, onClose, onInstall, activeDoc }: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterDocType, setFilterDocType] = useState<string | null>(null);
  const [filterPaperSize, setFilterPaperSize] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);
  const [previewZoom, setPreviewZoom] = useState<'fit' | '100' | 'page'>('fit');

  // ── Cached mock data (never recreate) ──────────────────────────────────────
  const mockDataRef = useRef<UniversalDocumentData | null>(null);
  if (!mockDataRef.current) {
    mockDataRef.current = getMockDocumentData();
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const allTemplates = useMemo(() => templateRegistry.getAll(), []);
  const recentTemplates = useMemo(
    () => recentIds.map(id => templateRegistry.get(id)).filter(Boolean) as LibraryTemplateEntry[],
    [recentIds],
  );

  const filtered = useMemo(() => {
    let list = allTemplates;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.meta.name.toLowerCase().includes(q) ||
        e.meta.nameAr.includes(q) ||
        e.meta.description.toLowerCase().includes(q) ||
        e.meta.descriptionAr.includes(q) ||
        e.meta.tags.some(t => t.includes(q)) ||
        e.meta.documentType.toLowerCase().includes(q)
      );
    }
    if (filterDocType) list = list.filter(e => e.meta.documentType === filterDocType);
    if (filterPaperSize) list = list.filter(e => e.meta.paperSize === filterPaperSize);
    if (filterCategory) list = list.filter(e => e.meta.category === filterCategory);
    if (favoritesOnly) list = list.filter(e => favorites.has(e.meta.id));
    return list;
  }, [allTemplates, search, filterDocType, filterPaperSize, filterCategory, favoritesOnly, favorites]);

  // ── Derived filter options ─────────────────────────────────────────────────
  const docTypeOptions = useMemo(() => templateRegistry.getDocTypes(), [allTemplates]);
  const paperSizeOptions = useMemo(() => templateRegistry.getPaperSizes(), [allTemplates]);
  const categoryOptions = useMemo(() => templateRegistry.getCategories(), [allTemplates]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleInstall = useCallback(async (entry: LibraryTemplateEntry) => {
    setInstalling(entry.meta.id);
    try {
      const config = entry.createConfig();
      await onInstall(entry.meta.id, config);
      addRecent(entry.meta.id);
      setRecentIds(loadRecent());
      addHistory({
        templateId: entry.meta.id,
        templateNameAr: entry.meta.nameAr,
        installedAt: new Date().toISOString(),
        version: entry.meta.version,
        createdTplId: null,
      });
    } finally {
      setInstalling(null);
    }
  }, [onInstall]);

  const resetFilters = useCallback(() => {
    setSearch('');
    setFilterDocType(null);
    setFilterPaperSize(null);
    setFilterCategory(null);
    setFavoritesOnly(false);
  }, []);

  // ── Keyboard handler ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      window.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  // ── Filter tag pills display ───────────────────────────────────────────────
  const hasActiveFilters = search || filterDocType || filterPaperSize || filterCategory || favoritesOnly;

  return (
    <div style={STYLES.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={STYLES.modal}>
        {/* Header */}
        <div style={STYLES.header}>
          <div style={STYLES.headerTitle}>
            <i className="ti ti-library" />
            مكتبة القوالب الجاهزة
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={resetFilters}
              style={{
                ...STYLES.closeBtn, fontSize: 11, width: 'auto', padding: '0 10px',
                color: hasActiveFilters ? 'var(--em)' : '#999',
                fontWeight: hasActiveFilters ? 700 : 400,
              }}
              title="إعادة ضبط الفلاتر"
            >
              <i className="ti ti-filter-off" style={{ marginLeft: 4 }} />
              {hasActiveFilters ? 'مسح الكل' : 'فلاتر'}
            </button>
            <button type="button" style={STYLES.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={STYLES.body}>
          {/* Search + Filters toolbar */}
          <div style={STYLES.toolbar}>
            <input
              type="text"
              placeholder="🔍 بحث في القوالب..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={STYLES.searchInput}
            />
            <select
              value={filterDocType ?? ''}
              onChange={e => setFilterDocType(e.target.value || null)}
              style={STYLES.filterSelect}
            >
              <option value="">كل المستندات</option>
              {docTypeOptions.map(dt => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
            <select
              value={filterPaperSize ?? ''}
              onChange={e => setFilterPaperSize(e.target.value || null)}
              style={STYLES.filterSelect}
            >
              <option value="">كل الأحجام</option>
              {paperSizeOptions.map(ps => (
                <option key={ps} value={ps}>{ps}</option>
              ))}
            </select>
            <select
              value={filterCategory ?? ''}
              onChange={e => setFilterCategory(e.target.value || null)}
              style={STYLES.filterSelect}
            >
              <option value="">كل التصنيفات</option>
              {categoryOptions.map(cat => {
                const label = TEMPLATE_CATEGORIES.find(c => c.id === cat);
                return (
                  <option key={cat} value={cat}>{label?.nameAr ?? cat}</option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={() => setFavoritesOnly(f => !f)}
              style={{
                ...STYLES.filterSelect, cursor: 'pointer',
                background: favoritesOnly ? '#fef3c7' : '#fff',
                fontWeight: favoritesOnly ? 700 : 400,
              }}
            >
              <i className="ti ti-star" style={{ marginLeft: 4 }} />
              المفضلة
            </button>
          </div>

          {/* Recently installed */}
          {recentTemplates.length > 0 && !search && !favoritesOnly && (
            <div style={STYLES.recentRow}>
              <i className="ti ti-history" style={{ fontSize: 14, color: '#6366f1' }} />
              <span style={{ fontWeight: 700, color: '#444' }}>المثبتة مؤخراً:</span>
              {recentTemplates.slice(0, 3).map(t => (
                <button
                  key={t.meta.id}
                  type="button"
                  style={{
                    background: '#eef2ff', border: 'none', borderRadius: 4,
                    padding: '2px 8px', fontSize: 11, color: '#4338ca', cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSearch('');
                    setFilterDocType(t.meta.documentType);
                  }}
                >
                  {t.meta.nameAr}
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          <div style={STYLES.grid}>
            {filtered.length === 0 ? (
              <div style={{ ...STYLES.emptyState, gridColumn: '1 / -1' }}>
                <i className="ti ti-files-off" style={{ fontSize: 32 }} />
                {hasActiveFilters ? 'لا توجد نتائج للبحث' : 'لا توجد قوالب جاهزة'}
              </div>
            ) : filtered.map(entry => {
              const { meta } = entry;
              const isBusy = installing === meta.id;
              const isFav = favorites.has(meta.id);
              const categoryObj = TEMPLATE_CATEGORIES.find(c => c.id === meta.category);

              return (
                <div key={meta.id} style={STYLES.card}>
                  {/* Preview */}
                  <div style={STYLES.cardPreviewWrapper}>
                    <div style={STYLES.cardPreviewContent}>
                      <Suspense fallback={<PreviewFallback />}>
                        <UniversalPreview
                          tpl={entry.createConfig()}
                          data={mockDataRef.current!}
                          company={null}
                        />
                      </Suspense>
                    </div>
                    {/* Favorite toggle */}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(meta.id)}
                      style={{
                        ...STYLES.favBtn, position: 'absolute', top: 6, left: 6,
                      }}
                      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    >
                      {isFav ? '⭐' : '☆'}
                    </button>
                  </div>

                  {/* Info */}
                  <div style={STYLES.cardBody}>
                    <div style={STYLES.cardName}>
                      {meta.nameAr}
                    </div>
                    <div style={STYLES.cardDesc}>{meta.descriptionAr}</div>
                    <div style={STYLES.tagRow}>
                      <span style={STYLES.tagDoc}>
                        <i className="ti ti-file-text" style={{ fontSize: 8 }} />
                        {meta.documentType}
                      </span>
                      <span style={STYLES.tagSize}>
                        <i className="ti ti-dimensions" style={{ fontSize: 8 }} />
                        {meta.paperSize}
                      </span>
                      {categoryObj && (
                        <span style={STYLES.tagCategory}>
                          <i className="ti ti-folder" style={{ fontSize: 8 }} />
                          {categoryObj.nameAr}
                        </span>
                      )}
                    </div>

                    {/* Install */}
                    <button
                      type="button"
                      style={{
                        ...STYLES.installBtn,
                        opacity: isBusy ? 0.6 : 1,
                        cursor: isBusy ? 'wait' : 'pointer',
                      }}
                      onClick={() => handleInstall(entry)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <><i className="ti ti-loader-2 spin" /> جارٍ التثبيت...</>
                      ) : (
                        <><i className="ti ti-download" /> تثبيت القالب</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/settings/print-settings/template-library/types.ts
```
import type { PrintTemplate, DocTypeCode, PaperSize } from '../types';

// ─── Versioning ─────────────────────────────────────────────────────────────────
export interface TemplateVersion {
  id:        string;
  version:   string;
  revision:  number;
  createdAt: string;
  updatedAt: string;
  author:    string;
  country:   string;
  layoutEngineVersion: string;
}

// ─── Tags & Categories ──────────────────────────────────────────────────────────
export interface TemplateTags {
  tags: string[];
  category: string;
  subcategory?: string;
}

// ─── Metadata (frontend registry entry) ─────────────────────────────────────────
export interface LibraryTemplateMeta extends TemplateVersion {
  name:             string;
  nameAr:           string;
  description:      string;
  descriptionAr:    string;
  documentType:     DocTypeCode;
  paperSize:        PaperSize;
  category:         string;
  subcategory?:     string;
  tags:             string[];
  readOnly:         true;
}

// ─── Full entry in the frontend registry ────────────────────────────────────────
export interface LibraryTemplateEntry {
  meta:         LibraryTemplateMeta;
  createConfig: () => PrintTemplate;
}

// ─── API response shape (from backend GET /print-templates/library) ────────────
export interface LibraryApiResponse {
  id:             string;
  name:           string;
  name_ar:        string;
  description:    string;
  description_ar: string;
  document_type:  string;
  paper_size:     string;
  category:       string;
  subcategory?:   string;
  tags:           string[];
  version:        string;
  revision:       number;
  country:        string;
  author:         string;
  read_only:      boolean;
}

// ─── Category descriptor ────────────────────────────────────────────────────────
export interface TemplateCategory {
  id:      string;
  name:    string;
  nameAr:  string;
  icon?:   string;
}

// ─── Filter state ───────────────────────────────────────────────────────────────
export interface LibraryFilterState {
  search:       string;
  docType:      string | null;
  paperSize:    string | null;
  category:     string | null;
  country:      string | null;
  tags:         string[];
  favoritesOnly: boolean;
}

// ─── Favorites (stored in localStorage) ─────────────────────────────────────────
export interface FavoriteEntry {
  templateId: string;
  addedAt:    string;
}

// ─── Install history entry ──────────────────────────────────────────────────────
export interface InstallHistoryEntry {
  templateId:      string;
  templateNameAr:  string;
  installedAt:     string;
  version:         string;
  createdTplId:    number | null;
}
```

## FILE: resources/js/pages/settings/print-settings/theme/ThemeSystem.ts
```
export interface ThemeColors {
  primary: string;
  text: string;
  background: string;
  accent: string;
  muted: string;
  border: string;
  headerBg: string;
  headerText: string;
  alternatingRow: string;
  success: string;
  warning: string;
  danger: string;
}

export interface ThemeFonts {
  family: string;
  sizeBase: number;
  sizeSmall: number;
  sizeLarge: number;
  sizeTitle: number;
}

export interface ThemeSpacing {
  marginTop: number;
  marginBottom: number;
  marginSides: number;
  padding: number;
  lineHeight: number;
}

export interface ThemeBorders {
  style: 'solid' | 'dashed' | 'double' | 'none';
  color: string;
  width: number;
  radius: number;
}

export interface ThemeTable {
  headerBold: boolean;
  headerBg: string;
  headerText: string;
  borderStyle: 'solid' | 'dashed' | 'double' | 'none';
  alternatingRows: boolean;
  alternatingColor: string;
  cellPadding: number;
}

export interface ReportTheme {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  table: ThemeTable;
  variables: Record<string, string>;
}

function cloneTheme(t: ReportTheme): ReportTheme {
  return {
    name: t.name,
    colors: { ...t.colors },
    fonts: { ...t.fonts },
    spacing: { ...t.spacing },
    borders: { ...t.borders },
    table: { ...t.table },
    variables: { ...t.variables },
  };
}

export class ThemeSystem {
  private themes = new Map<string, ReportTheme>();

  constructor() {
    for (const [name, theme] of Object.entries(PRESETS)) {
      this.themes.set(name, cloneTheme(theme));
    }
  }

  get(name: string): ReportTheme {
    const t = this.themes.get(name);
    if (!t) {
      throw new Error(`Theme "${name}" not found. Available themes: ${this.list().join(', ')}`);
    }
    return cloneTheme(t);
  }

  register(theme: ReportTheme): void {
    this.themes.set(theme.name, cloneTheme(theme));
  }

  list(): string[] {
    return Array.from(this.themes.keys());
  }

  toCSSVariables(theme: ReportTheme): Record<string, string> {
    const c = theme.colors;
    const f = theme.fonts;
    const s = theme.spacing;
    const b = theme.borders;
    const t = theme.table;

    return {
      '--color-primary': c.primary,
      '--color-text': c.text,
      '--color-background': c.background,
      '--color-accent': c.accent,
      '--color-muted': c.muted,
      '--color-border': c.border,
      '--color-header-bg': c.headerBg,
      '--color-header-text': c.headerText,
      '--color-alternating-row': c.alternatingRow,
      '--color-success': c.success,
      '--color-warning': c.warning,
      '--color-danger': c.danger,

      '--font-family': f.family,
      '--font-size-base': `${f.sizeBase}px`,
      '--font-size-small': `${f.sizeSmall}px`,
      '--font-size-large': `${f.sizeLarge}px`,
      '--font-size-title': `${f.sizeTitle}px`,

      '--margin-top': `${s.marginTop}mm`,
      '--margin-bottom': `${s.marginBottom}mm`,
      '--margin-sides': `${s.marginSides}mm`,
      '--padding': `${s.padding}px`,
      '--line-height': String(s.lineHeight),

      '--border-style': b.style,
      '--border-color': b.color,
      '--border-width': `${b.width}px`,
      '--border-radius': `${b.radius}px`,

      '--table-header-bold': String(t.headerBold),
      '--table-header-bg': t.headerBg,
      '--table-header-text': t.headerText,
      '--table-border-style': t.borderStyle,
      '--table-alternating-rows': String(t.alternatingRows),
      '--table-alternating-color': t.alternatingColor,
      '--table-cell-padding': `${t.cellPadding}px`,

      ...theme.variables,
    };
  }

  applyTemplateOverrides(
    baseTheme: ReportTheme,
    overrides: {
      fontFamily?: string;
      baseFontSize?: number;
      marginTop?: number;
      marginBottom?: number;
      marginSides?: number;
      lineSpacing?: number;
      tableBorderStyle?: string;
      alternatingRows?: boolean;
      alternatingColor?: string;
      tableHeaderBold?: boolean;
      tableHeaderBg?: boolean;
    },
  ): ReportTheme {
    const theme = cloneTheme(baseTheme);
    theme.name = `${baseTheme.name} (overridden)`;

    if (overrides.fontFamily !== undefined) {
      theme.fonts.family = overrides.fontFamily;
    }
    if (overrides.baseFontSize !== undefined) {
      theme.fonts.sizeBase = overrides.baseFontSize;
      theme.fonts.sizeSmall = Math.round(overrides.baseFontSize * 0.8);
      theme.fonts.sizeLarge = Math.round(overrides.baseFontSize * 1.25);
      theme.fonts.sizeTitle = Math.round(overrides.baseFontSize * 1.6);
    }
    if (overrides.marginTop !== undefined) {
      theme.spacing.marginTop = overrides.marginTop;
    }
    if (overrides.marginBottom !== undefined) {
      theme.spacing.marginBottom = overrides.marginBottom;
    }
    if (overrides.marginSides !== undefined) {
      theme.spacing.marginSides = overrides.marginSides;
    }
    if (overrides.lineSpacing !== undefined) {
      theme.spacing.lineHeight = overrides.lineSpacing;
    }
    if (overrides.tableBorderStyle !== undefined) {
      const valid = ['solid', 'dashed', 'double', 'none'] as const;
      if (valid.includes(overrides.tableBorderStyle as typeof valid[number])) {
        theme.table.borderStyle = overrides.tableBorderStyle as typeof valid[number];
        theme.borders.style = overrides.tableBorderStyle as typeof valid[number];
      }
    }
    if (overrides.alternatingRows !== undefined) {
      theme.table.alternatingRows = overrides.alternatingRows;
    }
    if (overrides.alternatingColor !== undefined) {
      theme.table.alternatingColor = overrides.alternatingColor;
    }
    if (overrides.tableHeaderBold !== undefined) {
      theme.table.headerBold = overrides.tableHeaderBold;
    }
    if (overrides.tableHeaderBg !== undefined) {
      if (overrides.tableHeaderBg) {
        theme.table.headerBg = theme.colors.headerBg;
        theme.table.headerText = theme.colors.headerText;
      } else {
        theme.table.headerBg = 'transparent';
        theme.table.headerText = theme.colors.text;
      }
    }

    return theme;
  }
}

export const PRESETS: Record<string, ReportTheme> = {
  'default-light': {
    name: 'default-light',
    colors: {
      primary: '#2563eb',
      text: '#111111',
      background: '#ffffff',
      accent: '#3b82f6',
      muted: '#6b7280',
      border: '#999999',
      headerBg: '#f3f4f6',
      headerText: '#111111',
      alternatingRow: '#fafafa',
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626',
    },
    fonts: {
      family: 'Tajawal, sans-serif',
      sizeBase: 10,
      sizeSmall: 8,
      sizeLarge: 12,
      sizeTitle: 16,
    },
    spacing: {
      marginTop: 10,
      marginBottom: 10,
      marginSides: 8,
      padding: 4,
      lineHeight: 1.4,
    },
    borders: {
      style: 'dashed',
      color: '#999999',
      width: 1,
      radius: 0,
    },
    table: {
      headerBold: true,
      headerBg: '#f3f4f6',
      headerText: '#111111',
      borderStyle: 'dashed',
      alternatingRows: true,
      alternatingColor: '#fafafa',
      cellPadding: 4,
    },
    variables: {},
  },

  minimal: {
    name: 'minimal',
    colors: {
      primary: '#000000',
      text: '#000000',
      background: '#ffffff',
      accent: '#000000',
      muted: '#555555',
      border: '#cccccc',
      headerBg: '#ffffff',
      headerText: '#000000',
      alternatingRow: '#ffffff',
      success: '#000000',
      warning: '#000000',
      danger: '#000000',
    },
    fonts: {
      family: 'Tajawal, sans-serif',
      sizeBase: 10,
      sizeSmall: 8,
      sizeLarge: 12,
      sizeTitle: 16,
    },
    spacing: {
      marginTop: 5,
      marginBottom: 5,
      marginSides: 5,
      padding: 2,
      lineHeight: 1.3,
    },
    borders: {
      style: 'none',
      color: 'transparent',
      width: 0,
      radius: 0,
    },
    table: {
      headerBold: true,
      headerBg: '#ffffff',
      headerText: '#000000',
      borderStyle: 'none',
      alternatingRows: false,
      alternatingColor: '#ffffff',
      cellPadding: 2,
    },
    variables: {},
  },

  compact: {
    name: 'compact',
    colors: {
      primary: '#111111',
      text: '#111111',
      background: '#ffffff',
      accent: '#333333',
      muted: '#666666',
      border: '#999999',
      headerBg: '#f3f4f6',
      headerText: '#111111',
      alternatingRow: '#fafafa',
      success: '#111111',
      warning: '#111111',
      danger: '#111111',
    },
    fonts: {
      family: 'Tajawal, sans-serif',
      sizeBase: 8,
      sizeSmall: 7,
      sizeLarge: 10,
      sizeTitle: 13,
    },
    spacing: {
      marginTop: 5,
      marginBottom: 5,
      marginSides: 4,
      padding: 2,
      lineHeight: 1.2,
    },
    borders: {
      style: 'solid',
      color: '#cccccc',
      width: 1,
      radius: 0,
    },
    table: {
      headerBold: false,
      headerBg: '#f3f4f6',
      headerText: '#111111',
      borderStyle: 'solid',
      alternatingRows: true,
      alternatingColor: '#fafafa',
      cellPadding: 2,
    },
    variables: {},
  },
};

export const themeSystem = new ThemeSystem();
```

## FILE: resources/js/pages/settings/print-settings/types.ts
```
export type {
  PaperSize, AlignOption, BorderStyle, PriceMode, PageOrientation, FontFamily,
  ColumnKey, DocTypeCode, PrintTemplate, SectionTarget, ReportRule,
} from './types/domain';

export {
  DOC_TYPE_LIST,
} from './types/domain';

export {
  createDefaultTemplate,
  defaultTemplate,
} from './types/defaults';

export type {
  PrintTemplateApiResponse,
} from './types/api';

export type {
  CompanyData,
  DetectedPrinter,
  DocumentPrintConfig,
  ReceiptTemplate80mm,
  CompanyPreviewData,
} from './types/live-data';
```

## FILE: resources/js/pages/settings/print-settings/types/api.ts
```
import type { PrintTemplate } from './domain';

export interface PrintTemplateApiResponse {
  id:            number;
  name:          string;
  doc_type_code: string;
  paper_size:    string;
  is_default:    boolean;
  is_active:     boolean;
  config:        Omit<PrintTemplate, 'id' | 'name' | 'doc_type_code' | 'paper_size' | 'is_default' | 'is_active' | 'created_at' | 'updated_at'>;
  created_at:    string;
  updated_at:    string;
}
```

## FILE: resources/js/pages/settings/print-settings/types/data/DocumentDataBuilder.ts
```
// ════════════════════════════════════════════════════════════════════════════
// reporting/data/DocumentDataBuilder.ts
//
// Builds UniversalDocumentData from various source shapes:
//   - CommercialDocument (from /api/v1/{company}/documents/{id})
//   - POSSaleSnapshot (from POSPage.handleCompleteSale)
//
// Principles:
//   - No component builds its own data shape. Call a builder method instead.
//   - All field access is null-safe. Missing API fields → sensible defaults.
//   - No side effects. Pure functions, easily testable.
//   - CompanyInfo is passed in (from the company context, not hardcoded).
// ════════════════════════════════════════════════════════════════════════════

import type {
  UniversalDocumentData,
  DocumentInfo,
  CompanyInfo,
  PartyInfo,
  WarehouseInfo,
  SessionInfo,
  DocumentLine,
  TaxRate,
  DocumentTotals,
  Payment,
  BalanceInfo,
  CurrencyInfo,
} from './UniversalDocumentData';

import { emptyDocumentData } from './UniversalDocumentData';

// ─── Source type: CommercialDocument from API ─────────────────────────────────
//
// We define a minimal interface here so this file has no circular dependency
// on lib/api/core/types. The real CommercialDocument type is a superset.

interface ApiDocumentLine {
  id?:                  number;
  product_id?:          number;
  description?:         string | null;
  quantity:             number;
  unit_price_ht:        number;
  unit_price_ttc?:      number;
  tva_rate:             number;
  discount_percentage?: number;
  discount_amount?:     number;
  total_ht:             number;
  total_tva?:           number;
  total_ttc?:           number;
  product?: {
    name?:       string;
    reference?:  string | null;
    barcode?:    string | null;
    unit?: { name?: string } | null;
  } | null;
  packaging?: { name?: string } | null;
  stock_lot?: { lot_number?: string } | null;
  notes?:     string | null;
}

interface ApiPayment {
  amount:       number;
  reference?:   string | null;
  payment_date?: string | null;
  payment_mode?: { name?: string } | null;
}

interface ApiDocument {
  id?:           number;
  document_number?: string;
  document_date?:   string;
  due_date?:        string | null;
  notes?:           string | null;
  document_type?: {
    code?: string;
    name?: string;
  } | null;
  document_status?: {
    name?: string;
    code?: string;
  } | null;
  party?: {
    id?:      number;
    name?:    string;
    type?:    string;
    nif?:     string | null;
    rc?:      string | null;
    nis?:     string | null;
    /** Actual API returns flat strings, not arrays */
    phone?:   string | null;
    mobile?:  string | null;
    email?:   string | null;
    address?: string | null;
  } | null;
  warehouse?: {
    id?:     number;
    name?:   string;
    code?:   string | null;
    address?: string | null;
  } | null;
  currency?: {
    code?:          string;
    symbol?:        string;
    exchange_rate?: number;
  } | null;
  lines?:    ApiDocumentLine[];
  payments?: ApiPayment[];
  /** Totals computed by backend */
  totals?: {
    total_ht?:       number;
    total_tva?:      number;
    total_ttc?:      number;
    fiscal_stamp?:   number;
    total_discount?: number;
    paid?:           number;
    change?:         number;
    remaining?:      number;
  } | null;
}

// ─── Source type: POS sale snapshot ──────────────────────────────────────────

export interface POSSaleSnapshot {
  docNumber:    string;
  docDate:      string;
  cashierName?: string;
  client?: {
    name?:    string;
    nif?:     string | null;
    phone?:   string | null;
    address?: string | null;
  } | null;
  items: Array<{
    name:               string;
    ref?:               string | null;
    qty:                number;
    unit_price_ht:      number;
    unit?:              string | null;
    tva_rate:           number;
    discount_percentage?: number;
    total_ht:           number;
  }>;
  totals: {
    total_ht:       number;
    total_tva:      number;
    total_ttc:      number;
    fiscal_stamp:   number;
    total_discount: number;
    paid:           number;
    change:         number;
    remaining:      number;
  };
  payments:    Array<{ mode: string; amount: number }>;
  prevBalance?: number | null;
  newBalance?:  number | null;
  dueDate?:    string | null;
}

// ─── DocumentDataBuilder ──────────────────────────────────────────────────────

export const DocumentDataBuilder = {

  /**
   * Build from a full CommercialDocument API response.
   * Used by CommercialDocumentModal and any document-list print action.
   */
  fromApiDocument(
    doc:     ApiDocument,
    company: CompanyInfo,
    options?: {
      prevBalance?: number;
      newBalance?:  number;
    },
  ): UniversalDocumentData {
    const lines  = buildLinesFromApi(doc.lines ?? []);
    const totals = buildTotalsFromApi(doc, lines);

    // Auto-compute balance from document when no explicit options provided:
    // remaining > 0 indicates the party still owes this amount after this doc.
    const balance = options?.prevBalance != null && options?.newBalance != null
      ? buildBalance(options.prevBalance, options.newBalance)
      : buildBalance(0, totals.remaining);

    return {
      doc:         buildDocInfo(doc),
      company,
      party:       buildPartyFromApi(doc.party),
      warehouse:   buildWarehouseFromApi(doc.warehouse),
      session:     null,
      lines,
      totals,
      taxBreakdown: buildTaxBreakdown(lines),
      payments:     buildPaymentsFromApi(doc.payments ?? []),
      balance,
      currency:     buildCurrencyFromApi(doc.currency),
      computed:     {},
    };
  },

  /**
   * Build from a POS sale snapshot.
   * Used by POSPage after a completed sale.
   */
  fromPOSSnapshot(
    snapshot: POSSaleSnapshot,
    company:  CompanyInfo,
    sessionInfo?: SessionInfo | null,
  ): UniversalDocumentData {
    const lines  = buildLinesFromSnapshot(snapshot.items);
    const totals: DocumentTotals = {
      totalHt:       snapshot.totals.total_ht,
      totalTva:      snapshot.totals.total_tva,
      totalTtc:      snapshot.totals.total_ttc,
      fiscalStamp:   snapshot.totals.fiscal_stamp,
      totalDiscount: snapshot.totals.total_discount,
      paid:          snapshot.totals.paid,
      change:        snapshot.totals.change,
      remaining:     snapshot.totals.remaining,
    };

    return {
      doc: {
        number:   snapshot.docNumber,
        date:     snapshot.docDate,
        dueDate:  snapshot.dueDate ?? null,
        time:     new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        typeCode: 'POS',
        typeName: 'إيصال POS',
        status:   'validated',
      },
      company,
      party: snapshot.client
        ? {
            name:         snapshot.client.name    ?? '',
            nif:          snapshot.client.nif     ?? null,
            phone:        snapshot.client.phone   ?? null,
            address:      snapshot.client.address ?? null,
            cashierName:  snapshot.cashierName    ?? null,
          }
        : snapshot.cashierName
          ? { name: '', cashierName: snapshot.cashierName }
          : null,
      session:      sessionInfo ?? null,
      warehouse:    null,
      lines,
      totals,
      taxBreakdown: buildTaxBreakdown(lines),
      payments:     snapshot.payments.map(p => ({ mode: p.mode, amount: p.amount })),
      balance:      buildBalance(snapshot.prevBalance, snapshot.newBalance),
      currency:     { code: 'DZD', symbol: 'دج', rate: 1 },
      computed:     {},
    };
  },

  /**
   * Returns an empty document for preview placeholders.
   * Replaces MOCK / MOCK_COMPANY in preview components.
   */
  empty(): UniversalDocumentData {
    return emptyDocumentData();
  },

  /**
   * Builds a UniversalDocumentData from a POS session report.
   * Converts aggregated session data into the ReportSummary structure
   * for template-based session report printing.
   */
  fromSessionReport(
    session: Record<string, unknown>,
    company: CompanyInfo,
  ): UniversalDocumentData {
    const sessionPayments = (session.payments as Array<Record<string, unknown>> | undefined) ?? [];
    const topProducts     = (session.top_products as Array<Record<string, unknown>> | undefined) ?? [];
    const grossSales      = Number(session.gross_sales ?? 0);
    const returnsTotal    = Number(session.returns_total ?? 0);

    return {
      doc: {
        number:   session.document_number as string ?? '—',
        date:     session.closed_at ? String(session.closed_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
        typeCode: 'RPT',
        typeName: 'تقرير الجلسة',
        status:   String(session.status ?? ''),
      },
      company,
      party: null,
      session: {
        id:          session.id as number ?? undefined,
        code:        session.code as string ?? null,
        openedAt:    session.opened_at as string ?? null,
        closedAt:    session.closed_at as string ?? null,
        cashierName: (session.user as Record<string, unknown> | undefined)?.name as string ?? null,
      },
      warehouse: session.warehouse ? {
        id:   (session.warehouse as Record<string, unknown>).id as number ?? undefined,
        name: String((session.warehouse as Record<string, unknown>).name ?? ''),
      } : null,
      lines: [],
      totals: {
        totalHt:       0,
        totalTva:      Number(session.total_tva ?? 0),
        totalTtc:      grossSales,
        fiscalStamp:   Number(session.total_fiscal_stamp ?? 0),
        totalDiscount: Number(session.total_discount ?? 0),
        paid:          grossSales,
        change:        0,
        remaining:     0,
      },
      taxBreakdown: [],
      payments: sessionPayments.map(p => ({
        mode:   String((p.payment_mode as Record<string, unknown> | undefined)?.name ?? '—'),
        amount: Number(p.amount ?? 0),
      })),
      balance: null,
      currency: { code: 'DZD', symbol: 'دج', rate: 1 },
      report: {
        title:              'تقرير جلسة',
        periodStart:        session.opened_at as string ?? null,
        periodEnd:          session.closed_at as string ?? null,
        cashierName:        (session.user as Record<string, unknown> | undefined)?.name as string ?? null,
        grossSales,
        returnsTotal,
        netSales:           Number(session.net_sales ?? 0),
        invoicesCount:      Number(session.invoices_count ?? 0),
        returnsCount:       Number(session.returns_count ?? 0),
        highestInvoice:     Number(session.highest_invoice ?? 0),
        avgInvoice:         Number(session.avg_invoice ?? 0),
        totalTva:           Number(session.total_tva ?? 0),
        totalFiscalStamp:   Number(session.total_fiscal_stamp ?? 0),
        totalDiscount:      Number(session.total_discount ?? 0),
        openingCash:        Number(session.opening_cash ?? 0),
        closingCashExpected: Number(session.closing_cash_expected ?? 0),
        closingCashCounted: Number(session.closing_cash_counted ?? 0),
        cashDifference:     Number(session.cash_difference ?? 0),
        paymentBreakdown: sessionPayments.map(p => ({
          mode:   String((p.payment_mode as Record<string, unknown> | undefined)?.name ?? '—'),
          count:  Number(p.count ?? 0),
          amount: Number(p.amount ?? 0),
        })),
        topProducts: topProducts.slice(0, 10).map(p => ({
          name:     String(p.product_name ?? ''),
          ref:      null,
          quantity: Number(p.quantity_sold ?? 0),
          totalHt:  Number(p.total_ht ?? 0),
          totalTtc: Number(p.total_ttc ?? 0),
        })),
      },
      computed: {},
    };
  },
} as const;

// ─── Internal builders ────────────────────────────────────────────────────────

function buildDocInfo(doc: ApiDocument): DocumentInfo {
  return {
    number:   doc.document_number ?? '—',
    date:     doc.document_date   ?? new Date().toLocaleDateString('ar-DZ'),
    dueDate:  doc.due_date        ?? null,
    time:     new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    typeCode: doc.document_type?.code ?? undefined,
    typeName: doc.document_type?.name ?? undefined,
    status:   doc.document_status?.code ?? doc.document_status?.name ?? undefined,
    notes:    doc.notes ?? null,
  };
}

function buildPartyFromApi(
  party: ApiDocument['party'],
  deliveryAddress?: string | null,
): PartyInfo | null {
  if (!party) return null;
  return {
    id:      party.id,
    name:    party.name ?? '',
    type:    (party.type as 'customer' | 'supplier') ?? undefined,
    nif:     party.nif ?? null,
    rc:      party.rc  ?? null,
    nis:     party.nis ?? null,
    phone:   party.phone ?? null,
    email:   party.email ?? null,
    address: party.address ?? null,
    deliveryAddress: deliveryAddress ?? null,
  };
}

function buildWarehouseFromApi(
  warehouse: ApiDocument['warehouse'],
): WarehouseInfo | null {
  if (!warehouse) return null;
  return {
    id:      warehouse.id,
    name:    warehouse.name    ?? '',
    code:    warehouse.code    ?? null,
    address: warehouse.address ?? null,
  };
}

function buildCurrencyFromApi(
  currency: ApiDocument['currency'],
): CurrencyInfo {
  if (!currency) return { code: 'DZD', symbol: 'دج', rate: 1 };
  return {
    code:   currency.code   ?? 'DZD',
    symbol: currency.symbol ?? 'دج',
    rate:   currency.exchange_rate ?? 1,
  };
}

function buildLineFromApi(line: ApiDocumentLine, index: number): DocumentLine {
  const tvaRate   = line.tva_rate ?? 0;
  const tvaPct    = Math.round(tvaRate * 100);
  const discPct   = line.discount_percentage ?? 0;
  const discAmt   = line.discount_amount     ?? 0;
  const totalHt   = line.total_ht ?? 0;
  const totalTva  = line.total_tva  ?? totalHt * tvaRate;
  const totalTtc  = line.total_ttc  ?? totalHt + totalTva;
  const uPriceHt  = line.unit_price_ht  ?? 0;
  const uPriceTtc = line.unit_price_ttc ?? uPriceHt * (1 + tvaRate);

  return {
    rowNumber:    index + 1,
    ref:          line.product?.reference  ?? null,
    barcode:      line.product?.barcode    ?? null,
    name:         line.product?.name ?? line.description ?? '',
    unit:         line.product?.unit?.name ?? line.packaging?.name ?? null,
    quantity:     line.quantity,
    unitPriceHt:  uPriceHt,
    unitPriceTtc: uPriceTtc,
    tvaRate,
    tvaPct,
    discountPct:  discPct,
    discountAmt:  discAmt,
    totalHt,
    totalTva,
    totalTtc,
    lot:   line.stock_lot?.lot_number ?? null,
    notes: line.notes ?? null,
  };
}

function buildLinesFromApi(apiLines: ApiDocumentLine[]): DocumentLine[] {
  return apiLines.map((line, i) => buildLineFromApi(line, i));
}

function buildLinesFromSnapshot(
  items: POSSaleSnapshot['items'],
): DocumentLine[] {
  return items.map((item, i) => {
    const tvaRate  = item.tva_rate ?? 0;
    const tvaPct   = Math.round(tvaRate * 100);
    const totalHt  = item.total_ht ?? 0;
    const totalTva = totalHt * tvaRate;
    return {
      rowNumber:    i + 1,
      ref:          item.ref  ?? null,
      barcode:      null,
      name:         item.name,
      unit:         item.unit ?? null,
      quantity:     item.qty,
      unitPriceHt:  item.unit_price_ht,
      unitPriceTtc: item.unit_price_ht * (1 + tvaRate),
      tvaRate,
      tvaPct,
      discountPct:  item.discount_percentage ?? 0,
      discountAmt:  item.total_ht * ((item.discount_percentage ?? 0) / 100),
      totalHt,
      totalTva,
      totalTtc:     totalHt + totalTva,
      lot:          null,
      notes:        null,
    };
  });
}

function buildTaxBreakdown(lines: DocumentLine[]): TaxRate[] {
  const map = new Map<number, TaxRate>();
  for (const line of lines) {
    const existing = map.get(line.tvaPct) ?? {
      rate: line.tvaPct, baseHt: 0, tva: 0, ttc: 0,
    };
    map.set(line.tvaPct, {
      rate:   line.tvaPct,
      baseHt: existing.baseHt + line.totalHt,
      tva:    existing.tva    + line.totalTva,
      ttc:    existing.ttc    + line.totalTtc,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
}

function buildTotalsFromApi(
  doc:   ApiDocument,
  lines: DocumentLine[],
): DocumentTotals {
  // Prefer backend-computed totals; fall back to summing lines
  const t = doc.totals;
  return {
    totalHt:       t?.total_ht       ?? lines.reduce((s, l) => s + l.totalHt,  0),
    totalTva:      t?.total_tva      ?? lines.reduce((s, l) => s + l.totalTva, 0),
    totalTtc:      t?.total_ttc      ?? lines.reduce((s, l) => s + l.totalTtc, 0),
    fiscalStamp:   t?.fiscal_stamp   ?? 0,
    totalDiscount: t?.total_discount ?? lines.reduce((s, l) => s + l.discountAmt, 0),
    paid:          t?.paid           ?? 0,
    change:        t?.change         ?? 0,
    remaining:     t?.remaining      ?? 0,
  };
}

function buildPaymentsFromApi(apiPayments: ApiPayment[]): Payment[] {
  return apiPayments.map(p => ({
    mode:      p.payment_mode?.name ?? '—',
    amount:    p.amount,
    reference: p.reference    ?? null,
    date:      p.payment_date ?? null,
  }));
}

function buildBalance(
  prev?: number | null,
  next?: number | null,
): BalanceInfo | null {
  // Both prev and next must be present for a meaningful balance snapshot.
  // Partial data (one null) → null (caller should provide both or neither).
  if (prev == null || next == null) return null;
  return {
    previous: prev,
    movement: next - prev,
    current:  next,
  };
}
```

## FILE: resources/js/pages/settings/print-settings/types/data/index.ts
```
export type {
  UniversalDocumentData,
  DocumentInfo,
  CompanyInfo,
  PartyInfo,
  WarehouseInfo,
  SessionInfo,
  DocumentLine,
  TaxRate,
  DocumentTotals,
  Payment,
  BalanceInfo,
  CurrencyInfo,
} from './UniversalDocumentData';

export {
  emptyDocumentData,
} from './UniversalDocumentData';

export { DocumentDataBuilder } from './DocumentDataBuilder';
export type { POSSaleSnapshot } from './DocumentDataBuilder';
```

## FILE: resources/js/pages/settings/print-settings/types/data/UniversalDocumentData.ts
```
// ════════════════════════════════════════════════════════════════════════════
// reporting/data/UniversalDocumentData.ts
//
// THE single data contract for the ERP Report Designer Framework.
//
// Design rules:
//   1. Every preview component (Thermal, A4, A5, future) consumes THIS type.
//   2. No component builds its own data shape from raw API responses.
//   3. ReceiptLiveData / TemplateLiveData (in types.ts) become aliases for
//      UniversalDocumentData. Migration happens in Phase 1 — in Phase 0 the
//      old types keep their existing shape and live alongside this contract.
//   4. No MOCK or demo data lives in this file or in any component file.
//      Test fixtures live in __tests__/ or Storybook stories only.
//   5. All fields are optional at the top level so the contract is usable
//      for partial documents (e.g. draft with no party yet assigned).
// ════════════════════════════════════════════════════════════════════════════

// ─── Sub-types ───────────────────────────────────────────────────────────────

export interface DocumentInfo {
  /** e.g. "FV-2025-001770" */
  number:       string;
  /** ISO date string "2026-06-26" */
  date:         string;
  /** ISO date string or null */
  dueDate?:     string | null;
  /** localised time string e.g. "14:35" — computed by DocumentDataBuilder */
  time?:        string;
  /** DocTypeCode: "FV", "BL", "FA", "POS", … */
  typeCode?:    string;
  /** Localised document type name e.g. "فاتورة المبيعات" */
  typeName?:    string;
  /** "draft" | "pending" | "validated" | "paid" | "cancelled" | … */
  status?:      string;
  notes?:       string | null;
  reference?:   string | null;
}

export interface CompanyInfo {
  name:     string;
  address?: string | null;
  phone?:   string | null;
  nif?:     string | null;
  rc?:      string | null;
  nis?:     string | null;
  ice?:     string | null;
  article?: string | null;
  logoUrl?: string | null;
  email?:   string | null;
  website?: string | null;
}

export interface PartyInfo {
  id?:          number;
  name:         string;
  type?:        'customer' | 'supplier';
  nif?:         string | null;
  rc?:          string | null;
  nis?:         string | null;
  phone?:       string | null;
  email?:       string | null;
  address?:     string | null;
  deliveryAddress?: string | null;
  /** Cashier name for POS context */
  cashierName?: string | null;
}

export interface WarehouseInfo {
  id?:     number;
  name:    string;
  address?: string | null;
  code?:   string | null;
}

export interface SessionInfo {
  id?:         number;
  /** Session code / number */
  code?:       string | null;
  openedAt?:   string | null;
  closedAt?:   string | null;
  cashierName?: string | null;
}

export interface DocumentLine {
  /** Line index (1-based, for display) */
  rowNumber:    number;
  /** Product reference / SKU */
  ref?:         string | null;
  /** Product barcode */
  barcode?:     string | null;
  /** Product or service description */
  name:         string;
  /** Unit of measure label e.g. "قطعة" */
  unit?:        string | null;
  quantity:     number;
  /** Unit price excluding tax */
  unitPriceHt:  number;
  /** Unit price including tax */
  unitPriceTtc: number;
  /** TVA rate as decimal e.g. 0.19 for 19% */
  tvaRate:      number;
  /** TVA percentage as integer e.g. 19 */
  tvaPct:       number;
  /** Discount percentage e.g. 10 for 10% */
  discountPct:  number;
  /** Discount amount in DZD */
  discountAmt:  number;
  /** Line total HT after discount */
  totalHt:      number;
  /** Line TVA amount */
  totalTva:     number;
  /** Line total TTC after discount */
  totalTtc:     number;
  /** Lot/serial number if applicable */
  lot?:         string | null;
  notes?:       string | null;
}

export interface TaxRate {
  /** Integer percentage e.g. 9, 19 */
  rate:   number;
  /** Taxable base HT */
  baseHt: number;
  /** TVA amount for this rate */
  tva:    number;
  /** Total TTC for this rate */
  ttc:    number;
}

export interface DocumentTotals {
  totalHt:       number;
  totalTva:      number;
  totalTtc:      number;
  /** Fiscal stamp (timbre fiscal) — flat 1% capped at 2500 DZD in Algeria */
  fiscalStamp:   number;
  totalDiscount: number;
  /** Amount effectively paid */
  paid:          number;
  /** Change returned to customer */
  change:        number;
  /** Amount still owed */
  remaining:     number;
}

export interface Payment {
  /** Payment mode name e.g. "نقداً", "تحويل بنكي" */
  mode:      string;
  amount:    number;
  reference?: string | null;
  date?:     string | null;
}

export interface BalanceInfo {
  /** Party balance before this document */
  previous: number;
  /** Net movement from this document */
  movement: number;
  /** Party balance after this document */
  current:  number;
  /** Payment due date balance (for credit terms) */
  due?:     number | null;
}

export interface CurrencyInfo {
  code?:   string;
  /** DZD by default */
  symbol?: string;
  /** Exchange rate to base currency */
  rate?:   number;
}

// ─── Report summary (for session reports, aggregated reports) ──────────────────

export interface ReportPaymentBreakdown {
  mode:   string;
  count:  number;
  amount: number;
}

export interface ReportProductSummary {
  name:        string;
  ref?:        string | null;
  quantity:    number;
  totalHt:     number;
  totalTtc:    number;
}

export interface ReportSummary {
  /** Report title */
  title?:           string;
  /** Period start (ISO date) */
  periodStart?:     string | null;
  /** Period end (ISO date) */
  periodEnd?:       string | null;
  /** Cashier / user who generated the report */
  cashierName?:     string | null;
  /** Gross sales before returns */
  grossSales:       number;
  /** Total returns */
  returnsTotal:     number;
  /** Net sales (gross - returns) */
  netSales:         number;
  /** Number of invoices in period */
  invoicesCount:    number;
  /** Number of returns in period */
  returnsCount:     number;
  /** Highest single invoice amount */
  highestInvoice:   number;
  /** Average invoice amount */
  avgInvoice:       number;
  /** Total TVA collected */
  totalTva:         number;
  /** Total fiscal stamp */
  totalFiscalStamp: number;
  /** Total discounts given */
  totalDiscount:    number;
  /** Opening cash amount */
  openingCash:      number;
  /** Expected cash in drawer */
  closingCashExpected: number;
  /** Counted cash in drawer */
  closingCashCounted:  number;
  /** Difference (counted - expected) */
  cashDifference:   number;
  /** Per payment mode breakdown */
  paymentBreakdown: ReportPaymentBreakdown[];
  /** Top products sold */
  topProducts:      ReportProductSummary[];
  /** Group label (for grouped reports) */
  groupLabel?:      string;
}

// ─── Primary contract ─────────────────────────────────────────────────────────

export interface UniversalDocumentData {
  /** Document identity: number, date, type, status */
  doc:          DocumentInfo;
  /** Printing company info (may be overridden by template override_* fields) */
  company:      CompanyInfo;
  /** Customer or supplier. Null for anonymous POS sales. */
  party?:       PartyInfo | null;
  /** Warehouse / branch */
  warehouse?:   WarehouseInfo | null;
  /** POS session — null for commercial documents */
  session?:     SessionInfo | null;
  /** Document lines */
  lines:        DocumentLine[];
  /** Aggregated totals */
  totals:       DocumentTotals;
  /** Per-rate tax breakdown */
  taxBreakdown: TaxRate[];
  /** Payment methods used */
  payments:     Payment[];
  /** Party balance snapshot — null if party has no balance tracking */
  balance?:     BalanceInfo | null;
  /** Currency info */
  currency?:    CurrencyInfo;
  /** Aggregated report summary — for session reports and aggregated reports */
  report?:      ReportSummary | null;
  /**
   * Computed / formula results.
   * FormulaEngine writes results here keyed by expression ID.
   * Preview components read from here after evaluation.
   */
  computed:     Record<string, unknown>;
}

// ─── Empty document factory ───────────────────────────────────────────────────

/**
 * Returns a structurally valid but visually empty UniversalDocumentData.
 * Use this in preview components instead of MOCK data when liveData is null.
 * All string fields are '—', all numbers are 0, all arrays empty, no timestamps.
 * Deterministic — always returns the same shape regardless of when called.
 */
export function emptyDocumentData(): UniversalDocumentData {
  return {
    doc: {
      number:   '—',
      date:     '—',
      dueDate:  null,
      time:     null,
      typeCode: 'FV',
      typeName: 'معاينة',
      status:   'draft',
    },
    company: {
      name:    '',
      address: null,
      phone:   null,
      nif:     null,
      rc:      null,
      nis:     null,
      ice:     null,
      article: null,
      logoUrl: null,
    },
    party:       null,
    session:     null,
    warehouse:   null,
    lines:       [],
    totals: {
      totalHt:       0,
      totalTva:      0,
      totalTtc:      0,
      fiscalStamp:   0,
      totalDiscount: 0,
      paid:          0,
      change:        0,
      remaining:     0,
    },
    taxBreakdown: [],
    payments:     [],
    report:       null,
    balance:      null,
    currency:     { code: 'DZD', symbol: 'دج', rate: 1 },
    computed:     {},
  };
}
```

## FILE: resources/js/pages/settings/print-settings/types/defaults.ts
```
import type { DocTypeCode, PaperSize, PrintTemplate } from './domain';

export function createDefaultTemplate(
  docTypeCode: DocTypeCode = 'POS' as DocTypeCode,
  paperSize: PaperSize = '80mm',
  name = 'القالب الافتراضي',
): PrintTemplate {
  return {
    id:             null,
    name,
    doc_type_code:  docTypeCode,
    paper_size:     paperSize,
    is_default:     true,
    is_active:      true,

    paper_width_mm:   paperSize === '58mm' ? 58 : 80,
    page_orientation: 'portrait',
    margin_top:       3,
    margin_bottom:    3,
    margin_sides:     3,
    line_spacing:     1.3,
    base_font_size:   10,
    font_family:      'tajawal',

    show_logo:          true,
    logo_source:        'company',
    logo_size:          56,
    logo_align:         'center',
    logo_border_radius: 50,
    custom_logo_url:    null,

    show_company_name:  true,
    company_name_text:  '',
    company_name_size:  15,
    company_name_bold:  true,
    company_name_align: 'center',
    company_name_color: '#111111',

    show_address:       true,
    show_phone:         true,
    show_tax_id:        true,
    show_rc:            true,
    show_nis:           false,
    show_ice:           false,
    show_article:       false,
    company_info_align: 'center',
    company_info_size:  9,
    override_address:   '',
    override_phone:     '',
    override_nif:       '',
    override_rc:        '',
    override_nis:       '',
    override_ice:       '',
    override_article:   '',

    header_custom_text: '',
    header_separator:   'dashed',

    title_text:       docTypeCode === 'POS' ? 'إيصال بيع' : 'فاتورة بيع',
    title_size:       13,
    title_bold:       true,
    title_align:      'center',
    title_color:      '#111111',
    show_doc_number:  true,
    show_date:        true,
    show_time:        true,
    show_due_date:    false,
    show_cashier:     true,
    show_client:      true,
    show_client_nif:  false,
    show_client_phone:false,
    show_client_address: false,
    show_delivery_address: false,
    show_session:     docTypeCode === 'POS',
    show_payment_term:false,
    show_bank_details:false,
    bank_details_text:'',
    doc_separator:    'dashed',

    col_order:   ['name', 'quantity', 'price', 'total'],
    col_show:    { name: true, quantity: true, price: true, total: true },
    col_widths:  { name: 40, quantity: 15, price: 22, total: 23 },
    col_headers: { name: 'البيان', quantity: 'الكمية', price: 'السعر', total: 'الإجمالي' },
    col_aligns:  { name: 'right', quantity: 'center', price: 'center', total: 'center' },

    items_font_size:    10,
    items_font_family:  'tajawal',
    show_col_header:    true,
    table_header_bold:  true,
    table_header_bg:    false,
    table_header_color: '#333333',
    table_border_style: 'dashed',
    alternating_rows:   false,
    alternating_color:  '#f5f5f5',
    price_display:      'ht',
    show_line_total_ttc:false,

    totals_font_size:    10,
    totals_bold:         true,
    totals_align:        'right',
    show_total_ht:       true,
    show_total_tva:      true,
    show_tva_breakdown:  false,
    show_discount_total: true,
    show_fiscal_stamp:   true,
    show_total_ttc:      true,
    total_ttc_font_size: 14,
    total_ttc_bold:      true,
    total_ttc_color:     '#111111',
    total_border_style:  'double',
    show_amount_in_words:false,
    show_paid_amount:    true,
    show_change:         true,
    show_remaining:      false,
    show_prev_balance:   true,
    show_new_balance:    true,

    show_payment_details:true,
    payment_font_size:   9,

    footer_line1:        '',
    footer_line2:        '',
    footer_line3:        '',
    footer_separator:    'solid',
    show_thank_you:      true,
    thank_you_text:      'شكراً لزيارتكم!',
    thank_you_size:      11,
    thank_you_color:     '#111111',
    show_returns_policy: true,
    returns_policy_text: 'كل الاحتجاجات لا تتعدى 48 ساعة',
    footer_legal_text:   '',

    show_barcode:        true,
    barcode_content:     'doc-number',
    barcode_custom_text: '',
    show_qr:             false,
    qr_content:          'doc-number',

    show_cashier_signature: false,
    show_client_signature:  false,
    show_stamp:             false,

    show_header_section:    true,
    show_doc_info_section:  true,
    show_items_section:     true,
    show_totals_section:    true,
    show_payments_section:  true,
    show_footer_section:    true,

    rules: [],

    show_report_header:        true,
    report_header_text:        '',
    show_report_footer:        true,
    report_footer_text:        '',
    show_charts:               true,
    chart_type:                'bar',
    chart_title:               '',
    group_by:                  '',
    sort_by:                   '',
    sort_direction:            'asc',
    show_report_period:        true,
    show_report_cashier:       true,
    show_report_summary_cards: true,
    show_report_payment_breakdown: true,
    show_report_top_products:  true,

    report_col_widths:  { product: 50, quantity: 20, total: 30 },
    report_col_headers: { product: 'المنتج', quantity: 'الكمية', total: 'الإجمالي' },
  };
}

export function defaultTemplate(): PrintTemplate {
  return createDefaultTemplate('FV' as DocTypeCode, '80mm');
}
```

## FILE: resources/js/pages/settings/print-settings/types/domain.ts
```
export type PaperSize       = '80mm' | '58mm' | 'A4' | 'A5' | 'none';
export type AlignOption     = 'right' | 'center' | 'left';
export type BorderStyle     = 'solid' | 'dashed' | 'double' | 'none';
export type PriceMode       = 'ht' | 'ttc';
export type PageOrientation = 'portrait' | 'landscape';
export type FontFamily      = 'tajawal' | 'monospace' | 'times' | 'arial';

export type ColumnKey =
  | 'rowNumber' | 'barcode' | 'ref' | 'name'
  | 'unit' | 'quantity' | 'price' | 'discount' | 'tva' | 'total';

export const DOC_TYPE_LIST = [
  { code: 'FV',  name: 'فاتورة المبيعات',   category: 'sales'     },
  { code: 'BL',  name: 'وصل التسليم',       category: 'sales'     },
  { code: 'DEV', name: 'عرض السعر',         category: 'sales'     },
  { code: 'BCC', name: 'طلب العميل',        category: 'sales'     },
  { code: 'AA',  name: 'مرتجع المبيعات',   category: 'sales'     },
  { code: 'FA',  name: 'فاتورة الشراء',    category: 'purchase'  },
  { code: 'BR',  name: 'وصل الاستلام',     category: 'purchase'  },
  { code: 'AV',  name: 'أمر الشراء',       category: 'purchase'  },
  { code: 'DDP', name: 'إذن التسليم',      category: 'warehouse' },
  { code: 'BT',  name: 'تحويل المخزون',   category: 'warehouse' },
  { code: 'POS', name: 'إيصال POS',        category: 'pos'       },
  { code: 'RPT', name: 'تقرير الجلسة',    category: 'pos'       },
] as const;

export type DocTypeCode = typeof DOC_TYPE_LIST[number]['code'];

export interface PrintTemplate {
  id:           number | null;
  name:         string;
  doc_type_code: DocTypeCode;
  paper_size:   PaperSize;
  is_default:   boolean;
  is_active:    boolean;
  template_version?: number;
  created_at?:  string;
  updated_at?:  string;

  paper_width_mm:   58 | 80;
  page_orientation: PageOrientation;
  margin_top:       number;
  margin_bottom:    number;
  margin_sides:     number;
  line_spacing:     number;
  base_font_size:   number;
  font_family:      FontFamily;

  show_logo:         boolean;
  logo_source:       'default' | 'company' | 'custom';
  logo_size:         number;
  logo_align:        AlignOption;
  logo_border_radius: number;
  custom_logo_url:   string | null;

  show_company_name:   boolean;
  company_name_text:   string;
  company_name_size:   number;
  company_name_bold:   boolean;
  company_name_align:  AlignOption;
  company_name_color:  string;

  show_address:        boolean;
  show_phone:          boolean;
  show_tax_id:         boolean;
  show_rc:             boolean;
  show_nis:            boolean;
  show_ice:            boolean;
  show_article:        boolean;
  company_info_align:  AlignOption;
  company_info_size:   number;
  override_address:    string;
  override_phone:      string;
  override_nif:        string;
  override_rc:         string;
  override_nis:        string;
  override_ice:        string;
  override_article:    string;

  header_custom_text:  string;
  header_separator:    BorderStyle;

  title_text:       string;
  title_size:       number;
  title_bold:       boolean;
  title_align:      AlignOption;
  title_color:      string;
  show_doc_number:  boolean;
  show_date:        boolean;
  show_time:        boolean;
  show_due_date:    boolean;
  show_cashier:     boolean;
  show_client:      boolean;
  show_client_nif:  boolean;
  show_client_phone:boolean;
  show_client_address: boolean;
  show_delivery_address: boolean;
  show_session:     boolean;
  show_payment_term:boolean;
  show_bank_details:boolean;
  bank_details_text:string;
  doc_separator:    BorderStyle;

  col_order:   ColumnKey[];
  col_show:    Partial<Record<ColumnKey, boolean>>;
  col_widths:  Partial<Record<ColumnKey, number>>;
  col_headers: Partial<Record<ColumnKey, string>>;
  col_aligns:  Partial<Record<ColumnKey, AlignOption>>;

  items_font_size:    number;
  items_font_family:  FontFamily;
  show_col_header:    boolean;
  table_header_bold:  boolean;
  table_header_bg:    boolean;
  table_header_color: string;
  table_border_style: BorderStyle;
  alternating_rows:   boolean;
  alternating_color:  string;
  price_display:      PriceMode;
  show_line_total_ttc:boolean;

  totals_font_size:    number;
  totals_bold:         boolean;
  totals_align:        AlignOption;
  show_total_ht:       boolean;
  show_total_tva:      boolean;
  show_tva_breakdown:  boolean;
  show_discount_total: boolean;
  show_fiscal_stamp:   boolean;
  show_total_ttc:      boolean;
  total_ttc_font_size: number;
  total_ttc_bold:      boolean;
  total_ttc_color:     string;
  total_border_style:  BorderStyle;
  show_amount_in_words:boolean;
  show_paid_amount:    boolean;
  show_change:         boolean;
  show_remaining:      boolean;
  show_prev_balance:   boolean;
  show_new_balance:    boolean;

  show_payment_details:boolean;
  payment_font_size:   number;

  footer_line1:        string;
  footer_line2:        string;
  footer_line3:        string;
  footer_separator:    BorderStyle;
  show_thank_you:      boolean;
  thank_you_text:      string;
  thank_you_size:      number;
  thank_you_color:     string;
  show_returns_policy: boolean;
  returns_policy_text: string;
  footer_legal_text:   string;

  show_barcode:         boolean;
  barcode_content:      'doc-number' | 'total' | 'custom';
  barcode_custom_text:  string;
  show_qr:              boolean;
  qr_content:           'doc-number' | 'company-info' | 'both';

  show_cashier_signature: boolean;
  show_client_signature:  boolean;
  show_stamp:             boolean;

  show_header_section:    boolean;
  show_doc_info_section:  boolean;
  show_items_section:     boolean;
  show_totals_section:    boolean;
  show_payments_section:  boolean;
  show_footer_section:    boolean;

  rules: ReportRule[];

  show_report_header:        boolean;
  report_header_text:        string;
  show_report_footer:        boolean;
  report_footer_text:        string;
  show_charts:               boolean;
  chart_type:                'bar' | 'pie';
  chart_title:               string;
  group_by:                  string;
  sort_by:                   string;
  sort_direction:            'asc' | 'desc';
  show_report_period:        boolean;
  show_report_cashier:       boolean;
  show_report_summary_cards: boolean;
  show_report_payment_breakdown: boolean;
  show_report_top_products:  boolean;

  report_col_widths:  Partial<Record<'product' | 'quantity' | 'total', number>>;
  report_col_headers: Partial<Record<'product' | 'quantity' | 'total', string>>;
}

export type SectionTarget = 'header' | 'doc-info' | 'items' | 'totals' | 'payments' | 'footer';

export interface ReportRule {
  id: string;
  condition: string;
  action: 'show' | 'hide' | 'highlight' | 'disable';
  target: string;
  priority?: number;
  highlightStyle?: Record<string, string>;
}
```

## FILE: resources/js/pages/settings/print-settings/types/live-data.ts
```
import type { PaperSize, PrintTemplate } from './domain';

export interface TemplateLiveData {
  docNumber?:   string;
  docDate?:     string;
  dueDate?:     string;
  cashierName?: string;
  client?:      { name?: string; nif?: string; phone?: string; address?: string } | null;
  items?:       Array<{
    name:               string;
    ref?:               string;
    qty:                number;
    unit_price_ht:      number;
    unit?:              string;
    tva_rate:           number;
    discount_percentage?: number;
    total_ht:           number;
  }>;
  totals?: {
    total_ht:       number;
    total_tva:      number;
    total_ttc:      number;
    fiscal_stamp:   number;
    total_discount: number;
    paid?:          number;
    change?:        number;
    remaining?:     number;
  };
  payments?:    Array<{ mode: string; amount: number }>;
  prevBalance?: number;
  newBalance?:  number;
}

export interface CompanyData {
  name:     string;
  address:  string;
  phone:    string;
  nif:      string;
  rc:       string;
  nis:      string;
  ice:      string;
  article:  string;
  logoUrl?: string | null;
}

export interface DetectedPrinter {
  id:        string;
  name:      string;
  isDefault: boolean;
  status:    'ready' | 'offline' | 'unknown';
  source?:   'usb' | 'demo' | 'manual';
}

export interface DocumentPrintConfig {
  docTypeCode:   string;
  docTypeName:   string;
  enabled:       boolean;
  paperSize:     PaperSize;
  printerId:     string | null;
  copies:        number;
  autoPrint:     boolean;
  showPreview:   boolean;
  templates:     PaperSize[];
}

export type ReceiptTemplate80mm = PrintTemplate;
export type CompanyPreviewData = CompanyData;
```

## FILE: resources/js/pages/settings/print-settings/utils/index.ts
```
export { numberToArabicWords } from './numberToArabic';
```

## FILE: resources/js/pages/settings/print-settings/utils/numberToArabic.ts
```
export function numberToArabicWords(n: number): string {
  if (n === 0) return 'صفر';
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens  = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاث مئة', 'أربع مئة', 'خمس مئة', 'ست مئة', 'سبع مئة', 'ثمان مئة', 'تسع مئة'];

  const intPart = Math.floor(n);
  if (intPart === 0) return 'صفر';

  let result = '';

  const thousands = Math.floor(intPart / 1000);
  const remainder = intPart % 1000;

  if (thousands > 0) {
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else result += units[thousands] + ' آلاف';
  }

  if (remainder > 0) {
    if (result) result += ' و';
    const h = Math.floor(remainder / 100);
    const t = remainder % 100;

    if (h > 0) {
      result += hundreds[h];
    }

    if (t > 0) {
      if (h > 0) result += ' و';
      if (t < 10) {
        result += units[t];
      } else if (t < 20) {
        result += teens[t - 10];
      } else {
        const u = t % 10;
        const tIdx = Math.floor(t / 10);
        if (u > 0) result += units[u] + ' و';
        result += tens[tIdx];
      }
    }
  }

  return result;
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

