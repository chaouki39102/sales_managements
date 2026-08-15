import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { bootstrapApp } from './helpers/test-utils';

/**
 * B.3 — Scan the printed fiscal QR → reopen the exact document.
 *
 * Two surfaces:
 *   1. Admin documents page: the header camera button decodes the fiscal QR
 *      (JSON v1 payload, `invoice.number` = e.g. `FV-2026-000001`) and opens
 *      the DocumentViewModal for the EXACT matching document.
 *   2. Portal «طلباتي»: the scan chip decodes the SAME printed QR — the
 *      backend matches the converted FV number via source_document_id — and
 *      shows the matching order (whose `reference` is the CMD number, while
 *      `document.document_number` is the converted FV number).
 *
 * The camera feed is REAL-QR and fully mocked: `getUserMedia` is replaced in
 * an init script with a canvas whose stream is continuously redrawn from the
 * committed QR SVG fixture (`fixtures/fiscal-qr-fv.svg`, DGI 21-98 payload).
 * The QR is scaled so it EXACTLY FILLS Html5Qrcode's square 280×280 scanning
 * box (the box coordinates are in viewfinder-client pixels, so the draw size
 * is `280 × videoWidth/clientWidth` to land on the frame in video pixels).
 * This exercises the real `Html5Qrcode` decoder (ZXing, v2.3.8) with real
 * pixels — no stubbing of the library itself (it is a module import, so it
 * cannot be reached from an init script). A square box is REQUIRED here: a
 * 280×140 landscape box would crop the square QR to 140px tall (~1.8px per
 * module) and ZXing cannot decode it (empirically verified); 280×280 gives
 * ~3.6px/module and decodes the full payload.
 *
 * Every tenant/portal API route is answered from fixtures registered AFTER
 * `bootstrapApp` (Playwright matches routes in reverse registration order).
 */

const FV_NUMBER = 'FV-2026-000001';
const DOC_ID = 7;
const QR_SVG_B64 = readFileSync(
  new URL('./fixtures/fiscal-qr-fv.svg', import.meta.url),
).toString('base64');

// ─── Admin fixtures (same shapes as pdf-export.pw.spec.ts) ──────────────────

const FV_TYPE = {
  id: 4,
  code: 'FV',
  name: 'فاتورة بيع',
  label: 'فاتورة بيع',
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

// ─── Portal fixtures ────────────────────────────────────────────────────────
// The scanned QR carries the CONVERTED FV number; the order's `reference` is
// the CMD number and `document.document_number` is the FV number.
const ORDER = {
  id: 51,
  reference: 'CMD-2026-000007',
  status: 'confirmed',
  status_label: 'مؤكد',
  notes: null,
  total_ht: 200,
  total_tva: 38,
  total_ttc: 238,
  total_discount: 0,
  items_count: 1,
  is_converted: true,
  sale_document_id: DOC_ID,
  requested_at: '2026-08-15T10:00:00Z',
  created_at: '2026-08-15T10:00:00Z',
  updated_at: '2026-08-15T10:00:00Z',
  payment_status: null,
  payment_amount: 0,
  payment_provider: null,
  payment_intent_id: null,
  payment_transaction_id: null,
  paid_at: null,
  party: { id: 771, name: 'Client Cash', code: 'CC-0001', phone: '', is_tva_exempt: false },
  document: {
    id: DOC_ID,
    document_number: FV_NUMBER,
    document_date: '2026-08-15',
    document_type: 'FV',
    type_name: 'فاتورة بيع',
    net_to_pay: 238,
    warehouse_id: 1,
  },
  lines: [
    {
      line_id: 101,
      product_id: 29,
      product_name: 'حليب',
      product_ref: 'HLB',
      unit: 'وحدة',
      unit_name: 'وحدة',
      quantity: 2,
      unit_price_ht: 100,
      packaging_id: null,
      pack_qty: 1,
      tva_rate: 19,
      discount_percentage: 0,
      total_discount_amount: 0,
      total_ht: 200,
      total_tva: 38,
      total_ttc: 238,
    },
  ],
};

function paginated(data: unknown[], total: number) {
  return JSON.stringify({
    data,
    meta: { current_page: 1, from: 1, to: data.length, last_page: 1, per_page: 15, total },
    links: { first: null, last: null, prev: null, next: null },
  });
}

/**
 * Replace the camera with a continuously-redrawn canvas whose frames carry the
 * real QR SVG. The QR is sized to exactly fill Html5Qrcode's square 280×280
 * scanning box (the box is centered on the video and its pixels are in
 * viewfinder-client coordinates, so the draw size must be scaled by
 * videoWidth/clientWidth to land on the frame in video pixels). ZXing (the
 * actual decoder) needs roughly ≥2px per module; at 280px across 78 modules
 * that's ~3.6px/module — decodable. A landscape 280×140 box would cap the
 * square QR at 140px (~1.8px/module) and fail.
 */
async function mockCamera(page: import('@playwright/test').Page) {
  await page.addInitScript(({ b64 }) => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 640;
          const ctx = canvas.getContext('2d')!;
          const img = new Image();
          img.src = `data:image/svg+xml;base64,${b64}`;
          await img.decode();
          const draw = () => {
            const scanner = document.getElementById('html5-qrcode-scanner');
            const clientWidth = scanner?.clientWidth ?? 640;
            const scale = canvas.width / Math.max(clientWidth, 1);
            const qrPx = Math.round(280 * scale);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 640, 640);
            ctx.drawImage(img, (640 - qrPx) / 2, (640 - qrPx) / 2, qrPx, qrPx);
            requestAnimationFrame(draw);
          };
          draw();
          return canvas.captureStream(10);
        },
      },
    });
  }, { b64: QR_SVG_B64 });
}

/** The admin documents list + detail mock routes (registered after bootstrapApp). */
async function mockAdminDocuments(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/demo/document-types*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [FV_TYPE] }) });
  });
  await page.route('**/api/v1/demo/documents?*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: paginated([DOC_ROW], 1) });
  });
  await page.route(`**/api/v1/demo/documents/${DOC_ID}?*`, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: DOC_FULL }) });
  });
}

test.describe('B.3 Scan printed fiscal QR → reopen exact document', () => {
  test.beforeEach(async ({ page }) => {
    await mockCamera(page);
  });

  test('admin: documents header scan opens the exact FV document', async ({ page }) => {
    await bootstrapApp(page);
    await mockAdminDocuments(page);

    await page.goto('/documents/FV');

    const camBtn = page.getByRole('button', { name: 'مسح QR الفاتورة لفتح المستند' });
    await expect(camBtn).toBeVisible({ timeout: 20000 });

    await camBtn.click();
    await expect(page.getByText('مسح QR المستند لفتحه')).toBeVisible({ timeout: 10000 });

    // The real decoder turns the fixture QR → payload → FV-2026-000001 → view modal.
    await expect(page.getByText('فاتورة بيع #FV-2026-000001')).toBeVisible({ timeout: 30000 });

    // The scan modal auto-closes once a code is decoded.
    await expect(page.getByText('مسح QR المستند لفتحه')).toBeHidden();
  });

  test('admin: unknown QR number shows a not-found toast', async ({ page }) => {
    await bootstrapApp(page);
    // Document types registered so the page resolves its doc type; NO documents
    // routes → the catch-all answers the scan search with an empty list.
    await page.route('**/api/v1/demo/document-types*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [FV_TYPE] }) });
    });

    await page.goto('/documents/FV');

    const camBtn = page.getByRole('button', { name: 'مسح QR الفاتورة لفتح المستند' });
    await expect(camBtn).toBeVisible({ timeout: 20000 });
    await camBtn.click();
    await expect(page.getByText('مسح QR المستند لفتحه')).toBeVisible();

    await expect(page.getByText('لم يتم العثور على مستند بهذا الرقم')).toBeVisible({ timeout: 30000 });
  });

  test('portal: scan the printed FV QR tracks the converted order', async ({ page }) => {
    await bootstrapApp(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('portal_token', 'portal-e2e-token');
    });

    await page.route('**/api/v1/demo/portal/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1,
            name: 'Client Cash',
            email: 'cc@example.com',
            is_active: true,
            last_login_at: null,
            company: null,
            party: null,
          },
        }),
      });
    });

    // The orders list AND the scan search both land here; the resolved order is
    // matched by document.document_number (the FV number from the QR).
    await page.route('**/api/v1/demo/portal/orders*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: paginated([ORDER], 1) });
    });

    await page.goto('/portal/demo/myorders');

    // The order list renders before scanning.
    const row = page.getByText('CMD-2026-000007').first();
    await expect(row).toBeVisible({ timeout: 20000 });

    const scanBtn = page.getByRole('button', { name: 'مسح' });
    await scanBtn.click();
    await expect(page.getByText('مسح QR الفاتورة لتتبع الطلب')).toBeVisible({ timeout: 10000 });

    // Decode → search by FV number → found CMD-2026-000007 → scan chip + detail open.
    await expect(page.getByText('CMD-2026-000007').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('حليب').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('مسح QR الفاتورة لتتبع الطلب')).toBeHidden();
  });
});
