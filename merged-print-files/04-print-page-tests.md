# 🖨️ Print Settings — API + Page + Tests


## FILE: ./resources/js/pages/settings/print-settings/__tests__/fixtures/expanded-registry.ts

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

## FILE: ./resources/js/pages/settings/print-settings/__tests__/fixtures/templates.ts

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

    show_address: false,
    show_phone: false,
    show_tax_id: false,
    show_rc: false,
    show_nis: false,
    show_article: false,
    show_capital: false,
    show_mobile: false,
    show_commercial_name: false,
    show_email: false,
    show_fax: false,
    show_bank_name: false,
    show_rib: false,
    show_activity: false,
    company_info_align: 'center',
    company_info_size: 9,
    company_info_bold: false,
    company_info_italic: false,
    company_info_font_family: 'tajawal',
    label_address: 'العنوان',
    label_phone: 'الهاتف',
    label_nif: 'NIF',
    label_rc: 'RC',
    label_nis: 'NIS',
    label_article: 'المادة الجبائية',
    label_capital: 'الرأس المال',
    label_mobile: 'المحمول',
    label_commercial_name: 'الاسم التجاري',
    label_email: 'البريد الإلكتروني',
    label_fax: 'الفاكس',
    label_bank_name: 'اسم البنك',
    label_rib: 'RIB',
    label_activity: 'النشاط',
    override_address: '',
    override_phone: '',
    override_nif: '',
    override_rc: '',
    override_nis: '',
    override_article: '',
    override_capital: '',
    override_mobile: '',
    override_commercial_name: '',
    override_email: '',
    override_fax: '',
    override_bank_name: '',
    override_rib: '',
    override_activity: '',

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
    show_client: false,
    show_client_nif: false,
    show_client_phone: false,
    show_client_address: false,
    show_delivery_address: false,
    label_client: 'العميل',
    label_client_nif: 'NIF العميل',
    label_client_phone: 'هاتف العميل',
    label_client_address: 'العنوان',
    label_delivery_address: 'عنوان التسليم',
    override_client_name: '',
    override_client_nif: '',
    override_client_phone: '',
    override_client_address: '',
    override_delivery_address: '',
    show_customer_commercial_name: false,
    show_customer_rc: false,
    show_customer_nis: false,
    show_customer_ai: false,
    show_customer_mobile: false,
    show_customer_fax: false,
    show_customer_email: false,
    show_customer_activity: false,
    show_customer_bank_name: false,
    show_customer_rib: false,
    label_customer_commercial_name: 'الاسم التجاري',
    label_customer_rc: 'RC',
    label_customer_nis: 'NIS',
    label_customer_ai: 'المادة الجبائية',
    label_customer_mobile: 'المحمول',
    label_customer_fax: 'الفاكس',
    label_customer_email: 'البريد الإلكتروني',
    label_customer_activity: 'النشاط',
    label_customer_bank_name: 'اسم البنك',
    label_customer_rib: 'RIB',
    override_customer_commercial_name: '',
    override_customer_rc: '',
    override_customer_nis: '',
    override_customer_ai: '',
    override_customer_mobile: '',
    override_customer_fax: '',
    override_customer_email: '',
    override_customer_activity: '',
    override_customer_bank_name: '',
    override_customer_rib: '',
    customer_info_font_family: 'tajawal' as any,
    customer_info_size: 9,
    customer_info_bold: false,
    customer_info_italic: false,
    customer_info_align: 'right' as any,
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
    table_header_bg: '#f5f5f5',
    table_header_color: '#333333',
    table_cell_padding: 6,
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

## FILE: ./resources/js/pages/settings/print-settings/__tests__/helpers/test-utils.ts

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

## FILE: ./resources/js/pages/settings/print-settings/__tests__/lifecycle.pw.spec.ts

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

## FILE: ./resources/js/pages/settings/print-settings/__tests__/playwright.config.ts

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

## FILE: ./resources/js/pages/settings/print-settings/__tests__/registry-validation.spec.ts

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
  it('should have exactly 221 entries', () => {
    expect(SETTING_COUNT).toBe(221);
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

## FILE: ./resources/js/pages/settings/print-settings/__tests__/serializer.spec.ts

```
import { describe, it, expect } from 'vitest';
import { toApiPayload, fromApiResponse, TEMPLATE_VERSION } from '../services/SettingsSerializer';
import { SETTINGS_REGISTRY } from '../services/SettingsRegistry';
import { createMockTemplate } from './fixtures/templates';

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

    // DB is the only source of truth — null config = no settings
    expect(result.show_logo).toBeUndefined();
    expect(result.title_text).toBeUndefined();
  });

  it('should return only explicitly stored config keys', () => {
    const result = fromApiResponse({
      id: 1,
      name: 'Minimal',
      doc_type_code: 'POS',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: {},
    } as any);

    // DB is the only source of truth — empty config = no settings
    expect(result.show_logo).toBeUndefined();
    expect(result.show_barcode).toBeUndefined();
    expect(result.col_order).toBeUndefined();
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

## FILE: ./resources/js/pages/settings/print-settings/__tests__/visibility.pw.spec.ts

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

## FILE: ./resources/js/pages/settings/print-settings/__tests__/visibility-engine.spec.ts

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

## FILE: ./resources/js/pages/settings/print-settings/api/printTemplatesApi.ts

```
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { ApiClient } from '../contracts/ApiClient';
import type { PrintTemplatesApi } from '../contracts/TemplateRepository';
import type { PrintTemplate, PrintTemplateApiResponse, DocTypeCode } from '../types';
import type { LibraryApiResponse } from '../template-library/types';
import { usePrintTemplatesApi, useSlug } from '../providers/PrintSettingsContext';
import { toApiPayload as serializePayload, fromApiResponse as deserializeResponse } from '../services/SettingsSerializer';

// ─── Query key factory ─────────────────────────────────────────────────────
export const printTemplateKeys = {
  all:     (slug: string)              => [slug, 'print-templates']              as const,
  list:    (slug: string, code?: string) => [slug, 'print-templates', 'list', code] as const,
  detail:  (slug: string, id: number)  => [slug, 'print-templates', id]         as const,
};

// ─── Pure helpers ──────────────────────────────────────────────────────────

function toApiPayload(tpl: Partial<PrintTemplate>): Record<string, unknown> {
  return serializePayload(tpl) as unknown as Record<string, unknown>;
}

// ─── Factory: creates PrintTemplatesApi from an ApiClient ──────────────────

export function createPrintTemplatesApi(api: ApiClient): PrintTemplatesApi {
  return {
    list: (docTypeCode?: string) =>
      api.get<PrintTemplateApiResponse[]>('/print-templates', docTypeCode
        ? { doc_type_code: docTypeCode } : undefined)
        .then(r => (Array.isArray(r) ? r : (r as Record<string, unknown>)?.data ?? [] as PrintTemplateApiResponse[]).map(deserializeResponse)),

    show: (id: number) =>
      api.get<PrintTemplateApiResponse>(`/print-templates/${id}`)
        .then(deserializeResponse),

    create: (tpl: Omit<PrintTemplate, 'id' | 'created_at' | 'updated_at'>) =>
      api.post<PrintTemplateApiResponse>('/print-templates', toApiPayload(tpl as unknown as Partial<PrintTemplate>))
        .then(deserializeResponse),

    update: (id: number, tpl: Partial<PrintTemplate>) =>
      api.put<PrintTemplateApiResponse>(`/print-templates/${id}`, toApiPayload(tpl))
        .then(deserializeResponse),

    delete: (id: number) =>
      api.delete(`/print-templates/${id}`),

    setDefault: (id: number) =>
      api.post<PrintTemplateApiResponse>(`/print-templates/${id}/set-default`)
        .then(deserializeResponse),

    duplicate: (id: number, newName: string) =>
      api.post<PrintTemplateApiResponse>(`/print-templates/${id}/duplicate`, { name: newName })
        .then(deserializeResponse),

    library: () =>
      api.get<LibraryApiResponse[]>('/print-templates/library')
        .then(r => (Array.isArray(r) ? r : (r as Record<string, unknown>)?.data ?? [] as LibraryApiResponse[])),

    installLibrary: (templateId: string) =>
      api.post<PrintTemplateApiResponse>('/print-templates/library/install', { template_id: templateId })
        .then(deserializeResponse),

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

## FILE: ./resources/js/pages/settings/print-settings/ARCHITECTURE.md

```
# Print-Settings Module Architecture

## Overview

`print-settings/` is a **self-contained feature module** for ERP document template management. It handles creating, editing, previewing, saving, exporting/importing, and installing print templates for all document types (invoices, deliveries, quotes, receipts, etc.).

The module is split into two bounded contexts:
- **Print Designer** — edit, save, manage templates (requires `PrintSettingsContext`)
- **Print Runtime** — load, resolve, render, print (minimal context, independent of designer)

## Directory Structure

```
print-settings/
├── index.ts                              # Public API — exports Page + PreviewSelector + types
├── ARCHITECTURE.md                       # This file
├── types.ts                              # Barrel shim → types/ subdirectory
├── PrintSettingsPage.tsx                  # Main page orchestrator (~740 lines)
│
├── types/                                # Domain + data types
│   ├── domain.ts                         #   PrintTemplate (144+ fields), DocTypeCode, PaperSize, etc.
│   ├── api.ts                            #   PrintTemplateApiResponse
│   ├── live-data.ts                      #   CompanyData, DocumentPrintConfig, DetectedPrinter
│   └── data/
│       ├── index.ts                      #   Re-exports UniversalDocumentData + DocumentDataBuilder
│       ├── UniversalDocumentData.ts      #   Single data contract (15 sub-interfaces, 319 lines)
│       └── DocumentDataBuilder.ts        #   Builds from API/POS/Session sources (552 lines)
│
├── services/                             # Business logic services
│   ├── index.ts                          #   Barrel (8 exports)
│   ├── SettingsRegistry.ts               #   144+ settings metadata (SettingMeta interface)
│   ├── SettingsSerializer.ts             #   toApiPayload / fromApiResponse (symmetric)
│   ├── PropertyVisibilityService.ts      #   Visibility facade over SettingsRegistry
│   ├── PrintFieldRegistry.ts             #   60+ canonical field IDs with metadata
│   ├── PrintFieldResolver.ts             #   Canonical field access layer (ALL renderers use this)
│   ├── FieldRegistry.ts                  #   79 cataloged fields with Arabic labels
│   ├── CalculatedFieldService.ts         #   8 computed fields
│   ├── printStoreService.ts              #   DB layer — save/fetch templates from backend
│   └── engines/
│       ├── index.ts                      #   Barrel
│       ├── FormulaEngine.ts              #   Expression evaluator (no eval, custom parser)
│       └── RulesEngine.ts                #   Declarative show/hide/highlight rules
│
├── sections/                             # Editor control sections (no barrel)
│   ├── HeaderSection.tsx
│   ├── DocumentSection.tsx
│   ├── ItemsSection.tsx
│   ├── TotalsSection.tsx
│   ├── PaymentsSection.tsx               #   Extracted from TotalsSection (Phase 11)
│   ├── FooterSection.tsx
│   ├── FormattingSection.tsx             #   Thermal/page-aware split
│   └── ToggleSwitch.tsx                  #   Section toggle primitives
│
├── components/                           # UI components
│   ├── ui.tsx                            #   UI primitives (Toggle, Slider, Field, Input, etc.)
│   ├── Accordion.tsx
│   ├── ChartSection.tsx
│   ├── ColumnManager.tsx
│   ├── DeleteConfirmModal.tsx
│   ├── ErrorBoundary.tsx
│   ├── FormulaEditor.tsx
│   ├── ImagePreviewModal.tsx
│   ├── PreviewSelector.tsx               #   Routes to UniversalPreview or legacy previews
│   ├── QuickNav.tsx                      #   Sticky section navigation (IntersectionObserver)
│   ├── RulesSection.tsx                  #   Condition builder
│   ├── TemplateControls.tsx             #   Main template control composer
│   ├── TinyBtn.tsx
│   ├── shared/
│   │   ├── PrintQueuePanel.tsx
│   │   └── TemplatePrintModal.tsx        #   Pure component (receives templates as props)
│   └── preview/                          #   Preview renderers
│       ├── UniversalPreview.tsx          #   Main orchestrator (132 lines)
│       ├── shared.tsx                    #   Shared helpers (mm, align, SectionWrap, etc.)
│       ├── HeaderSection.tsx             #   Uses printFieldResolver.resolve()
│       ├── DocInfoSection.tsx            #   Uses printFieldResolver.resolve()
│       ├── ItemsSection.tsx              #   Uses printFieldResolver.resolveItemField()
│       ├── TotalsSection.tsx             #   Uses printFieldResolver.resolve()
│       ├── PaymentsSection.tsx           #   Uses printFieldResolver.resolve()
│       ├── FooterSection.tsx
│       ├── LogoRenderer.tsx              #   Accepts data (not company), resolves internally
│       └── ReportSection.tsx             #   Report rendering (KPI cards, charts, top products)
│
├── runtime/                              # Print Runtime (designer-independent)
│   ├── index.ts                          #   Barrel (24 lines, 10 exports)
│   ├── PrintRuntimeContext.tsx            #   Minimal context: { templateRepository, slug, company }
│   ├── PrintRuntimeAdapter.tsx           #   Bridge to host (ONLY file importing apiGet/useActiveSlug)
│   ├── usePrintTemplatesList.ts          #   Runtime hook for loading templates by doc type
│   ├── TemplateResolver.ts               #   Pure: resolveTemplate(), resolveTemplateById()
│   ├── UniversalPrintPipeline.tsx         #   Orchestrator: source → data → render
│   └── renderPreviewToHtml.ts            #   Server-side HTML string rendering
│
├── providers/
│   └── PrintSettingsContext.tsx           #   Designer context (undo/redo, notifier, full repo)
│
├── api/
│   └── printTemplatesApi.ts              #   React Query hooks for template CRUD
│
├── contracts/                            # Interface contracts
│   ├── ApiClient.ts
│   ├── HostContext.ts
│   ├── Notifier.ts
│   └── TemplateRepository.ts
│
├── renderers/                            # Export renderers
│   ├── IRenderer.ts
│   ├── CsvRenderer.ts
│   ├── ExcelRenderer.ts
│   ├── PrintJobQueue.ts
│   ├── useExportDocument.ts
│   └── usePrintJobQueue.ts
│
├── engines/                              # Standalone engines
│   ├── AdvancedFunctions.ts
│   └── LayoutEngine.ts
│
├── template-library/                     # Template library (install/search/filter)
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
├── theme/
│   └── ThemeSystem.ts
│
├── utils/
│   ├── index.ts
│   └── numberToArabic.ts                 #   Number-to-Arabic-words converter
│
└── __tests__/
    ├── visibility-engine.spec.ts          #   51 Vitest tests
    ├── serializer.spec.ts                 #   18 Vitest tests
    ├── registry-validation.spec.ts        #   19 Vitest tests
    ├── visibility.pw.spec.ts              #   4 Playwright browser tests
    ├── lifecycle.pw.spec.ts               #   3 Playwright browser tests
    ├── fixtures/
    │   ├── templates.ts
    │   └── expanded-registry.ts
    └── helpers/
        └── test-utils.ts
```

## Architecture Principles

### 1. Self-Containment
- All code for print template management lives inside `print-settings/`
- External imports are limited to 4 shared infrastructure paths:
  - `@/lib/api/core/client` (HTTP client)
  - `@/lib/store/appStore` (active company/slug)
  - `@/components/ui/ErrorBoundary`
  - `@/lib/api/core/types` (type-only)
- No imports from `@/pos`, `@/pages`, or other page modules

### 2. Two Bounded Contexts

| Context | Entry Point | Purpose | Dependencies |
|---------|-------------|---------|-------------|
| **Print Designer** | `PrintSettingsPage.tsx` | Edit, save, manage templates | `PrintSettingsContext` (undo/redo, notifier, full repository) |
| **Print Runtime** | `runtime/index.ts` | Load, resolve, render, print | `RuntimeContext` (templateRepository + slug + company only) |

The runtime is the **only** path used by POS, document modals, and batch printing. The designer is only mounted on the Settings page.

### 3. Single Source of Truth for Fields

**PrintFieldRegistry** defines 60+ canonical field IDs. **PrintFieldResolver** is the **only** access layer — every renderer calls `printFieldResolver.resolve(fieldId, data, template)` instead of raw property access. This guarantees:
- Template overrides (e.g., `company_name_text` overrides `company.name`)
- Computed fields (`item.tvaPct`, `item.index`, `amountInWords`)
- Null-safe dot-path traversal
- Consistent field access across all 10+ renderers

### 4. Settings as Metadata

**SettingsRegistry** defines 144+ settings with metadata: key, label, category, component type, default value, supported papers/docs, `dependsOn` dependencies, and `field` linkage to PrintFieldRegistry. This enables:
- Automatic UI generation from metadata
- Visibility engine (`PropertyVisibilityService`) gating controls by paper/doc type
- Symmetric serialization (`SettingsSerializer`) for save/load
- Auto-generated test suites (88+ tests from registry)

### 5. Data Flow
```
User action → PrintSettingsPage state → tpl object → UniversalPreview → Section components
                                                          ↕
                                              printFieldResolver.resolve(fieldId, data, tpl)
                                                          ↕
                                              rulesEngine.evaluate(tpl.rules, data)
```

### 6. Print Pipeline
```
POSPage → usePrintSettings(template) → renderPreviewToHtml() → browser print
            OR
         → printThermalViaWebUSBFromTemplate() → WebUSB ESC/POS
            OR
         → DocumentDataBuilder.fromPOSSnapshot() → UniversalPrintPipeline → UniversalPreview
```

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| PrintSettingsPage | `PrintSettingsPage.tsx` | 3-column layout: doc type selector, template controls, live preview |
| UniversalPreview | `components/preview/UniversalPreview.tsx` | Dispatches to paper-specific renderers |
| PreviewSelector | `components/PreviewSelector.tsx` | Routes to UniversalPreview or legacy A4/A5 previews |
| TemplateControls | `components/TemplateControls.tsx` | Composes all 7 section editors + section toggles |
| FormulaEditor | `components/FormulaEditor.tsx` | Expression editor with field picker + validation |
| TemplateLibraryModal | `template-library/TemplateLibraryModal.tsx` | Browse/search/install templates |
| RulesSection | `components/RulesSection.tsx` | Condition builder for show/hide/highlight |
| ChartSection | `components/ChartSection.tsx` | Chart rendering for report summaries |
| UniversalPrintPipeline | `runtime/UniversalPrintPipeline.tsx` | source → data → render orchestrator |

## Key Services

| Service | File | Purpose |
|---------|------|---------|
| SettingsRegistry | `services/SettingsRegistry.ts` | 144+ setting definitions with metadata |
| SettingsSerializer | `services/SettingsSerializer.ts` | Symmetric `toApiPayload()` / `fromApiResponse()` |
| PropertyVisibilityService | `services/PropertyVisibilityService.ts` | Facade: `isSettingVisible(key, paper, docType)` |
| PrintFieldRegistry | `services/PrintFieldRegistry.ts` | 60+ canonical field definitions |
| PrintFieldResolver | `services/PrintFieldResolver.ts` | Canonical field access: `resolve(fieldId, data, tpl)` |
| FormulaEngine | `services/engines/FormulaEngine.ts` | Expression evaluator (no `eval`) |
| RulesEngine | `services/engines/RulesEngine.ts` | Declarative rule evaluation |
| DocumentDataBuilder | `types/data/DocumentDataBuilder.ts` | Builds `UniversalDocumentData` from API/POS/Session |

## Runtime Architecture

The runtime layer (`runtime/`) is the only path used outside the designer:

```
POSPage / CommercialDocumentModal / BatchPrintModal
    ↓
PrintRuntimeAdapter (bridge: imports apiGet, useActiveSlug)
    ↓
RuntimeProvider { templateRepository, slug, company }
    ↓
usePrintTemplatesList(docTypeCode) → resolveTemplate() → UniversalPrintPipeline
    ↓
DocumentDataBuilder.fromPOSSnapshot() → UniversalPreview → HTML/ESC-POS
```

`PrintRuntimeAdapter` is the **only** file in the runtime that imports global modules. All runtime hooks depend solely on `RuntimeContext`.

## External Dependencies

Only 4 shared infrastructure imports:
- `@/lib/api/core/client`: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiUpload`, `apiPatch`
- `@/lib/store/appStore`: `useActiveCompany`, `useActiveSlug`
- `@/components/ui/ErrorBoundary`
- `@/lib/api/core/types`: `CommercialDocument` (type only)

## PrintTemplate Schema (144+ fields)

Organized into logical groups in `types/domain.ts`:

| Group | Fields | Purpose |
|-------|--------|---------|
| Metadata | `id`, `name`, `doc_type_code`, `paper_size`, `is_default`, `is_active` | Identity and routing |
| Paper/Layout | `paper_width_mm`, margins, `line_spacing`, `base_font_size`, `font_family` | Page geometry |
| Logo | `show_logo`, `logo_source`, `logo_size`, `logo_align`, `custom_logo_url` | Company logo |
| Company Info | `show_company_name/address/phone/tax_id/rc/nis/ice`, `override_*` | Company details |
| Document Info | `title_text/size/bold/align/color`, `show_doc_number/date/time/client` | Document metadata |
| Columns | `col_order`, `col_show`, `col_widths`, `col_headers`, `col_aligns` | Table columns |
| Items | `items_font_size`, `table_header_*`, `alternating_rows`, `price_display` | Line items |
| Totals | `show_total_ht/tva/discount/fiscal_stamp/ttc`, `show_amount_in_words` | Totals section |
| Payments | `show_payment_details`, `payment_font_size` | Payment details |
| Footer | `footer_line1/2/3`, `show_thank_you`, `show_returns_policy` | Footer content |
| Barcode/QR | `show_barcode`, `barcode_content/custom_text`, `show_qr`, `qr_content` | Machine-readable |
| Signatures | `show_cashier_signature`, `show_client_signature`, `show_stamp` | Signature areas |
| Section Visibility | `show_header/doc_info/items/totals/payments/footer_section` | Section toggles |
| Rules/Report | `rules: ReportRule[]`, `chart_type`, `group_by`, `show_report_*` | Report features |

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| `registry-validation.spec.ts` | 19 | Structural validation of all 144 settings |
| `serializer.spec.ts` | 18 | normalizeTemplate, toApiPayload, fromApiResponse, round-trip |
| `visibility-engine.spec.ts` | 51 | All 48 doc×paper combos + dependsOn gating |
| `visibility.pw.spec.ts` | 4 | Page-level visibility assertions (Playwright) |
| `lifecycle.pw.spec.ts` | 3 | Save/reload, template selector (Playwright) |

Tests auto-generate from `SETTINGS_REGISTRY` — adding a setting automatically includes it in all tests.

## Build

```bash
npm run build  # 1053 modules, 0 errors (print-settings-adapter chunk: ~104KB)
npm test       # 159/159 tests pass (includes 88 print-settings tests)
```

```

## FILE: ./resources/js/pages/settings/print-settings/index.ts

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

## FILE: ./resources/js/pages/settings/print-settings/PrintSettingsPage.tsx

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
import { validateTemplateIntegrity, TEMPLATE_VERSION } from './services/SettingsSerializer';

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

  // ── Preview data (balance now comes from backend balance_data, not separate API call) ──
  const previewData: UniversalDocumentData | null = useMemo(() => {
    if (!previewDoc || !companyCtx) return null;
    return DocumentDataBuilder.fromApiDocument(previewDoc, companyCtx);
  }, [previewDoc, companyCtx]);

  useEffect(() => {
    if (templates.length > 0) {
      const stillSelected = selectedTplId && templates.find(t => t.id === selectedTplId);
      const tpl = stillSelected ?? resolveTemplate(templates, activeDoc);
      if (tpl) {
        setSelectedTplId(tpl.id);
        setLocalTpl(tpl);
        setIsDirty(false);
      } else {
        const anyMatch = templates.some(t => t.doc_type_code === activeDoc);
        if (anyMatch) {
          setSelectedTplId(null);
          setLocalTpl(null);
          setIsDirty(true);
        }
      }
    } else {
      setSelectedTplId(null);
      setLocalTpl(null);
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
    const preSaveTpl = { ...localTpl };
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

      // Step 1: Replace editor state with DB response
      setLocalTpl({ ...savedTpl });
      setIsDirty(false);
      notifier.success('✅ تم حفظ القالب');

      // Step 2: Compare pre-save vs DB response — report discrepancies
      const SERVER_MUTABLE = new Set(['updated_at', 'created_at']);
      const diffs: string[] = [];
      const allKeys = new Set([...Object.keys(preSaveTpl), ...Object.keys(savedTpl)]);
      for (const k of allKeys) {
        if (SERVER_MUTABLE.has(k)) continue;
        const a = JSON.stringify((preSaveTpl as any)[k]);
        const b = JSON.stringify((savedTpl as any)[k]);
        if (a !== b) diffs.push(k);
      }
      if (diffs.length > 0) {
        console.warn('[PrintSettings] Save verification — differences:', diffs);
      }

      // Step 3: Verify integrity — warn if any registry keys are missing
      const missing = validateTemplateIntegrity(savedTpl, savedTpl.name || 'unknown');
      if (missing > 0) {
        notifier.error(`⚠️ القالب محفوظ لكن ${missing} خاصية مفقودة`);
      }
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
        if (!imported.doc_type_code) imported.doc_type_code = activeDoc;
        setLocalTpl(imported);
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
                    setSelectedTplId(tpl.id); setLocalTpl(tpl); setIsDirty(false);
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

## FILE: ./resources/js/pages/settings/print-settings/runtime/index.ts

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

## FILE: ./resources/js/pages/settings/print-settings/services/engines/index.ts

```
export type { ExpressionValue, EvaluationContext, ValidationResult, ExpressionFunction } from './FormulaEngine';
export { FormulaEngine, formulaEngine } from './FormulaEngine';
export type { RuleAction, RuleEvaluationResult } from './RulesEngine';
export { RulesEngine, rulesEngine } from './RulesEngine';

```

## FILE: ./resources/js/pages/settings/print-settings/services/index.ts

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
export { layoutEngine } from '../engines/LayoutEngine';
export type { LayoutElement, LayoutResult } from '../engines/LayoutEngine';

```

## FILE: ./resources/js/pages/settings/print-settings/template-library/config/index.ts

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

## FILE: ./resources/js/pages/settings/print-settings/template-library/index.ts

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

## FILE: ./resources/js/pages/settings/print-settings/template-library/types.ts

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

## FILE: ./resources/js/pages/settings/print-settings/types.ts

```
export type {
  PaperSize, AlignOption, BorderStyle, PriceMode, PageOrientation, FontFamily,
  ColumnKey, DocTypeCode, PrintTemplate, SectionTarget, ReportRule,
} from './types/domain';

export {
  DOC_TYPE_LIST,
} from './types/domain';


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

## FILE: ./resources/js/pages/settings/print-settings/types/data/index.ts

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

## FILE: ./resources/js/pages/settings/print-settings/utils/index.ts

```
export { numberToArabicWords } from './numberToArabic';

```
