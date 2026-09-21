import { test, expect, type Page } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

/**
 * Silent A4/A5 printing (Phase 28) — E2E against the FULLY MOCKED backend
 * (real built bundle on :8000, tenant routes answered from fixtures).
 *
 * The silent path is: Modal «طباعة» on an A4/A5 template →
 * trySilentPrintDocument → resolveWindowsTarget (localStorage → saved
 * system printers → live /system/printers discovery) →
 * renderPreviewToHtml → POST /system/printers/html → success toast
 * «تمت الطباعة على «printer»» and NEVER a preview popup.
 *
 * Flow under test:
 *   1. /documents/FV renders the invoices list from mocked endpoints.
 *   2. Row «طباعة» opens TemplatePrintModal with the full A4 document.
 *   3a. Line 1 — a Windows printer is discovered: the modal POSTs the
 *       renderer HTML to /system/printers/html, a success toast shows, and
 *       NO popup window is opened.
 *   3b. Line 2 — no Windows printer exists (default mock): an error toast
 *       shows and the browser preview popup opens (fallback preserved).
 */

const FV_NUMBER = 'FV-2026-000001';
const DOC_ID = 7;

const FV_TYPE = {
  id: 4,
  code: 'FV',
  name: 'فاتورة بيع',
  label: 'فاتورة بيع',
  is_active: true,
};

// Minimal template — SettingsSerializer.fromApiResponse() fills defaults.
const FV_TPL = {
  id: 1,
  name: 'قالب فاتورة افتراضي',
  doc_type_code: 'FV',
  paper_size: 'A4',
  is_default: true,
  is_active: true,
};

const PARTY = {
  id: 771,
  name: 'Client Cash',
  code: 'CC-0001',
  nif: '009916000000123',
  commercial_name: '',
  phone: '',
  mobile: '',
  address: '',
  is_tva_exempt: false,
};

const DOC_ROW = {
  id: DOC_ID,
  document_number: FV_NUMBER,
  document_date: '2026-08-15',
  reference: null,
  document_type: { id: FV_TYPE.id, code: 'FV', name: 'فاتورة بيع' },
  document_status: { id: 1, code: 'confirmed', name: 'confirmed' },
  party: PARTY,
  warehouse: { id: 1, name: 'المستودع الرئيسي' },
  user: { id: 1, name: 'Super Admin' },
  validated_by: null,
  validated_at: '2026-08-15T10:00:00Z',
  is_locked: false,
  is_exported_to_accounting: false,
  total_ht: '200.0000',
  total_tva: '38.0000',
  total_ttc: '238.0000',
  total_discount: '0.0000',
  total_stamp: '0.0000',
  net_to_pay: '238.0000',
  paid_amount: '238.0000',
  remaining_amount: '0.0000',
};

const DOC_FULL = {
  ...DOC_ROW,
  due_date: null,
  notes: null,
  qrcode_content: null,
  lines: [
    {
      id: 101,
      product_id: 29,
      quantity: 2,
      unit_price_ht: '100.0000',
      unit_price_ttc: '119.0000',
      tva_rate: 19,
      discount_percentage: '0.0000',
      discount_amount: '0.0000',
      total_ht: '200.0000',
      total_tva: '38.0000',
      total_ttc: '238.0000',
      product: {
        id: 29,
        name: 'حليب',
        ref: 'HLB',
        barcode: null,
        brand: null,
        image_url: null,
        unit: { id: 1, name: 'وحدة' },
      },
      packaging: null,
      stock_lot: null,
      notes: null,
    },
  ],
  payments: [
    {
      id: 1,
      payment_number: 'PAY-2026-000001',
      amount: '238.0000',
      payment_date: '2026-08-15',
      payment_mode: { id: 1, name: 'نقداً' },
    },
  ],
  totals: {
    total_ht: '200.0000',
    total_tva: '38.0000',
    total_ttc: '238.0000',
    fiscal_stamp: '0.0000',
    total_discount: '0.0000',
    paid: '238.0000',
    change: 0,
    remaining: '0.0000',
  },
  balance_data: { previous_balance: 100, new_balance: 338 },
  currency: { id: 1, code: 'DZD', symbol: 'دج', exchange_rate: 1 },
};

// ─── Windows system printers (POST /system/printers + /html) ────────────────

const CANON = {
  name: 'Canon MF3010 (Copie 1)',
  driver: 'Canon MF3010',
  port: 'USB001',
  is_default: true,
  work_offline: false,
  shared: false,
  local: true,
  status: 'ready',
  status_label: 'جاهزة',
};

function registerDocumentRoutes(page: Page) {
  return Promise.all([
    page.route('**/api/v1/demo/document-types*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [FV_TYPE] }) });
    }),
    page.route('**/api/v1/demo/documents?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [DOC_ROW],
          meta: { current_page: 1, from: 1, to: 1, last_page: 1, per_page: 15, total: 1 },
          links: { first: null, last: null, prev: null, next: null },
        }),
      });
    }),
    // Registered AFTER the list route → reverse-order precedence wins for detail.
    page.route(`**/api/v1/demo/documents/${DOC_ID}?*`, (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: DOC_FULL }) });
    }),
  ]);
}

async function openPrintModal(page: Page) {
  await page.goto('/documents/FV');
  const row = page.locator('tr', { hasText: FV_NUMBER }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.locator('button[title="طباعة"]').click();
  await expect(page.getByText('طباعة حسب القالب')).toBeVisible({ timeout: 10000 });
}

function trackPopups(page: Page): Page[] {
  const popups: Page[] = [];
  page.on('popup', (p) => popups.push(p));
  return popups;
}

test.describe('Silent A4/A5 printing', () => {
  test('A4 → silent POST /system/printers/html + success toast + NO popup', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL]);
    await registerDocumentRoutes(page);

    // A Windows printer IS discovered via /system/printers.
    await page.route('**/api/v1/demo/system/printers', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { printers: [CANON], platform: 'win32', error: null },
        }),
      });
    });
    // Silent endpoint accepts the job (the real one spools via Edge+GDI).
    await page.route('**/api/v1/demo/system/printers/html', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { printed: true } }),
      });
    });

    const popups = trackPopups(page);
    await openPrintModal(page);

    // Capture the silent HTML submission BEFORE clicking.
    const htmlReqPromise = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().includes('system/printers/html'),
    );

    await page.locator('.m-foot').getByRole('button', { name: 'طباعة' }).click();

    const htmlReq = await htmlReqPromise;
    const payload = htmlReq.postDataJSON() as {
      name: string;
      data: string;
      copies: number;
    };
    expect(payload.name).toBe(CANON.name);
    expect(payload.copies).toBe(1);
    // The base64 payload is the rendered preview HTML (contains the doc number).
    const htmlText = Buffer.from(payload.data, 'base64').toString('utf8');
    expect(htmlText).toContain(FV_NUMBER);

    // Success toast, and the preview popup NEVER opened.
    await expect(page.getByText('تمت الطباعة')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(`على «${CANON.name}»`)).toBeVisible();
    // Give any stray popup a chance to appear, then assert none did.
    await page.waitForTimeout(800);
    expect(popups.length).toBe(0);
  });

  test('A4 → no Windows printer → error toast + preview popup fallback', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL]);
    await registerDocumentRoutes(page);
    // NOTE: no /system/printers route is registered — the catch-all answers
    // `{ data: [] }`, so resolveWindowsTarget finds no target.

    const popups = trackPopups(page);
    // Register the popup capture BEFORE clicking — renderPipelineToPopup opens
    // the window synchronously right after the error toast, and the popup's
    // own doPrint script closes it ~500ms later. A waitForEvent registered
    // after the toast assertion would miss the already-fired + closed popup.
    await openPrintModal(page);

    await page.locator('.m-foot').getByRole('button', { name: 'طباعة' }).click();

    await expect(page.getByText('تعذرت الطباعة الصامتة')).toBeVisible({ timeout: 15000 });

    // Fallback preserved: the browser preview popup still opens.
    await expect.poll(() => popups.length, { timeout: 10000 }).toBe(1);
  });
});