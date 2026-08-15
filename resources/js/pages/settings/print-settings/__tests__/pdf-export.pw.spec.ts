import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

/**
 * Official PDF export (upgrade 1 task 1.4) — E2E against a FULLY MOCKED
 * backend (the SPA runs against the real built bundle on :8000, but every
 * tenant API route is intercepted and answered from fixtures).
 *
 * The previous version of this spec depended on a live seeded auth token and
 * a real FV document (FV-2026-000001) existing in company 1 — both of which
 * rotted (token invalidated, document deleted), so the spec failed not because
 * the feature was broken but because its fixture no longer existed. PDF export
 * is fully CLIENT-SIDE (exportSourceToPdf → lazy dompdf.js chunk, WASM inlined
 * as base64, filename = document.document_number + '.pdf'), so mocking is both
 * legitimate and permanent — no server PDF service is exercised.
 *
 * Flow under test:
 *   1. `/documents/FV` renders the invoices list from the mocked documents
 *      endpoint (the list query is gated on the resolved FV doc type).
 *   2. The row «طباعة» action opens TemplatePrintModal with the FULL document
 *      (fetched from the mocked `/documents/7` detail endpoint).
 *   3. The modal's PDF button exports the preview to `FV-2026-000001.pdf`.
 */

const FV_NUMBER = 'FV-2026-000001';
const DOC_ID = 7;

// ─── Backend-shaped fixtures ────────────────────────────────────────────────

const FV_TYPE = {
  id: 4,
  code: 'FV',
  name: 'فاتورة بيع',
  label: 'فاتورة بيع',
  is_active: true,
};

// A MINIMAL template is safe: SettingsSerializer.fromApiResponse() fills every
// missing setting with its registry default, so UniversalPreview renders the
// full A4 invoice with the standard defaults (same normalization the real
// /print-templates endpoint goes through).
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

// Decimal-cast columns (total_ht, unit_price_ht, …) arrive as STRINGS from the
// Laravel API — keep them as strings so the fixture matches the real payload.
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

// ─── Tests ─────────────────────────────────────────────────────────────────

test.describe('Official PDF export', () => {
  test('invoices list → TemplatePrintModal → PDF download named {number}.pdf', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL]);

    // ── document-types: the invoices list query is gated on the FV doc type ──
    await page.route('**/api/v1/demo/document-types*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [FV_TYPE] }) });
    });

    // ── documents LIST (paginated; drives the table row) ─────────────────────
    await page.route('**/api/v1/demo/documents?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [DOC_ROW],
          meta: { current_page: 1, from: 1, to: 1, last_page: 1, per_page: 15, total: 1 },
          links: { first: null, last: null, prev: null, next: null },
        }),
      });
    });

    // ── documents DETAIL: the full doc TemplatePrintModal renders ────────────
    // Registered AFTER the list route → Playwright's reverse-order precedence
    // makes this win over the `documents?*` glob for `/documents/{DOC_ID}?…`.
    await page.route(`**/api/v1/demo/documents/${DOC_ID}?*`, (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: DOC_FULL }) });
    });

    // The invoices list is a real tenant route — NOT a fake deep-link.
    await page.goto('/documents/FV');

    // Locate the row for FV-2026-000001 and use its per-row «طباعة» action
    // (opens TemplatePrintModal directly with the full document).
    const row = page.locator('tr', { hasText: FV_NUMBER }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    const printBtn = row.locator('button[title="طباعة"]');
    await printBtn.click();

    await expect(page.getByText('طباعة حسب القالب')).toBeVisible({ timeout: 10000 });

    // The PDF button lives in the modal footer.
    const downloadPromise = page.waitForEvent('download');
    const pdfBtn = page.getByRole('button', { name: /PDF/ });
    await expect(pdfBtn).toBeVisible();
    await pdfBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`${FV_NUMBER}.pdf`);

    const path = await download.path();
    const fs = await import('node:fs');
    const head = fs.readFileSync(path as unknown as string).subarray(0, 5).toString();
    expect(head).toBe('%PDF-');

    // The exported PDF is a real rendered document (non-trivial size).
    const size = fs.statSync(path as unknown as string).size;
    expect(size).toBeGreaterThan(5000);
  });
});
