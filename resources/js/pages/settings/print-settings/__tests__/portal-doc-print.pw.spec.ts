import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

// Regression (Phase 94): `PortalDocumentDetailPage` prints with a raw
// `window.print()`, so the WHOLE on-screen tree lands on paper. The page's own
// chrome — the document header (number + type + status badge), the metadata
// block (date / due / totals), the status-step tracker and the payment-progress
// card — is UI, not document content, and must not print. The document itself
// (line items table, amounts summary, linked payments) must still print.
//
// Both lines of the single `@media print` block in resources/css/theme/portal.css
// are covered: the generic chrome (`.portal-hd`, `.portal-nav`, …) and the
// page-local classes (`.portal-doc-hd`, `.portal-doc-meta`, `.portal-doc-steps`,
// `.portal-doc-progress`).
//
// Phase 95 also zeroes the FIRST `.portal-sec` top margin in print. The section
// heading ("المنتجات (N)") is genuine document content and keeps printing, so the
// geometry assertion targets the card itself — measuring `.portal-table-wrap`
// would conflate the hidden chrome above it with the heading below it.

const SLUG = 'demo';
const DOC_ID = 7;

const ME = {
  data: { id: 3, name: 'زبون البوابة', email: 'portal@e2e.test', active: true, party_id: 771 },
};

const CONFIG = {
  data: {
    enabled: true,
    allow_guest_orders: true,
    allow_registered_orders: true,
    min_order_amount: 0,
    max_order_amount: 0,
    order_confirmation_message: '',
    authenticated: true,
    party_orders_enabled: true,
    can_order: true,
    show_stock: true,
    show_price: true,
    show_ref: true,
    show_unit: true,
    show_packaging: true,
    allow_change_packaging: true,
    show_discounts: true,
    show_tva: true,
    show_search: true,
    hide_out_of_stock: false,
    show_incart_badge: true,
    show_notes: true,
    online_payment_enabled: false,
  },
};

const DOC = {
  data: {
    id: DOC_ID,
    document_number: 'FV-2026-000007',
    document_date: '2026-08-03',
    due_date: '2026-08-18',
    type_code: 'FV',
    type_name: 'فاتورة مبيعات',
    status_name: 'مؤكدة',
    total_ht: 5000,
    total_tva: 950,
    total_discount: 0,
    total_stamp: 59.5,
    total_ttc: 5950,
    net_to_pay: 6009.5,
    paid_amount: 3000,
    remaining_amount: 3009.5,
    previous_balance: 1500,
    new_balance: 4509.5,
    lines: [
      {
        id: 1, product_id: 29, product_name: 'حليب', ref: 'L-001',
        quantity: 10, unit_price_ht: 300, discount_percentage: 0,
        total_discount_amount: 0, tva_rate: 19, total_ht: 3000,
        total_tva: 570, total_ttc: 3570, pack_qty: null,
      },
      {
        id: 2, product_id: 40, product_name: 'سكر', ref: 'S-002',
        quantity: 4, unit_price_ht: 500, discount_percentage: 0,
        total_discount_amount: 0, tva_rate: 19, total_ht: 2000,
        total_tva: 380, total_ttc: 2380, pack_qty: 12,
      },
    ],
    payments: [
      { id: 9, date: '2026-08-05', amount: 3000, payment_mode: 'نقداً', reference: 'REC-1' },
    ],
  },
};

const CHROME = [
  '.portal-hd',
  '.portal-nav',
  '.portal-doc-hd',
  '.portal-doc-meta',
  '.portal-doc-steps',
  '.portal-doc-progress',
];

/** Navigate to the portal document detail page with the portal API mocked. */
async function openPortalDoc(page: import('@playwright/test').Page) {
  await bootstrapApp(page);
  // Registered AFTER bootstrapApp -> these win over its `**/api/v1/**` catch-all
  // (Playwright checks route handlers in reverse registration order).
  const json = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
  await page.route(`**/api/v1/${SLUG}/portal/auth/me`, (r) => r.fulfill(json(ME)));
  await page.route(`**/api/v1/${SLUG}/portal/config`, (r) => r.fulfill(json(CONFIG)));
  await page.route(`**/api/v1/${SLUG}/portal/documents/${DOC_ID}`, (r) => r.fulfill(json(DOC)));

  // The portal guard is `portal_token`; without it it redirects to /portal/{slug}/login.
  await page.addInitScript(() => window.localStorage.setItem('portal_token', 'portal-e2e-token'));

  await page.goto(`/portal/${SLUG}/documents/${DOC_ID}`);
  // Line items are the last thing to mount — wait for the real content, not the spinner.
  await page.waitForSelector('.portal-table-wrap table.portal-table', { timeout: 15000 });

  // The Google webfonts load asynchronously and reflow the whole page when they
  // arrive. Measuring geometry before they settle reports a transient offset
  // (~17px above the first card) that does NOT exist in the real print output —
  // the print CSS is correct, the document is simply still reflowing. Awaiting
  // `document.fonts.ready` makes the geometry assertions deterministic.
  await page.evaluate(() => document.fonts.ready);
  // One more frame so the reflow triggered by the final font swap is committed.
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
}

test.describe('PORTAL DOCUMENT DETAIL — PRINT', () => {
  test('print media hides the page chrome (screen chrome is visible)', async ({ page }) => {
    await openPortalDoc(page);

    // Negative control: on screen every hook must actually be visible, so a
    // "passing" print test can't come from a class that is always hidden.
    for (const sel of CHROME) {
      await expect(page.locator(sel), `${sel} should be visible on screen`).toBeVisible();
    }
    await expect(page.locator('.portal-print-btn')).toBeVisible();

    await page.emulateMedia({ media: 'print' });

    for (const sel of CHROME) {
      await expect(page.locator(sel), `${sel} should be hidden in print`).toBeHidden();
    }
  });

  test('print media keeps line items, totals and payments on the page', async ({ page }) => {
    await openPortalDoc(page);
    await page.emulateMedia({ media: 'print' });

    // Products table + linked-payments table (both `.portal-table-wrap`).
    const tables = page.locator('.portal-table-wrap table.portal-table');
    await expect(tables).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(tables.nth(i)).toBeVisible();
    }
    await expect(tables.nth(0).locator('tbody tr')).toHaveCount(2);

    // Amounts summary, including the net-to-pay total and the balance rows.
    await expect(page.locator('.portal-sr-total')).toBeVisible();
    await expect(page.getByText('الصافي للدفع')).toBeVisible();
    await expect(page.getByText('الرصيد قبل المستند')).toBeVisible();
    await expect(page.getByText('الرصيد بعد المستند')).toBeVisible();

    // Chrome occupies no vertical space, so the first CONTENT card must sit at
    // the top of the sheet. Measured on the card, not on `.portal-table-wrap`:
    // the wrap sits *below* the card's own `.portal-card-hd` heading
    // ("المنتجات"), which is legitimate document content and must print.
    //
    // Polled, not read once: switching to print media tears the page down and the
    // browser commits the reflow a frame or two later, so a single instantaneous
    // read can catch a transient ~20px offset that never reaches paper. Polling
    // asserts the SETTLED geometry, which is what actually prints.
    await expect
      .poll(
        async () =>
          page.locator('.portal-sec').first().evaluate((el) => el.getBoundingClientRect().top),
        { timeout: 5000, message: 'first printable card should settle at the top of the sheet' },
      )
      .toBeLessThan(2);

    // The section heading is real content: it must still print, in order.
    await expect(page.locator('.portal-sec .portal-card-hd h3').first()).toBeVisible();
    await expect(page.getByText('المنتجات (2)')).toBeVisible();
  });

  test('the print button calls window.print() and the sheet is a real PDF', async ({ page }) => {
    await openPortalDoc(page);
    await page.evaluate(() => {
      (window as unknown as { __printed: boolean }).__printed = false;
      window.print = () => { (window as unknown as { __printed: boolean }).__printed = true; };
    });

    await page.locator('.portal-print-btn').click();
    expect(await page.evaluate(() => (window as unknown as { __printed: boolean }).__printed)).toBe(true);

    await page.emulateMedia({ media: 'print' });
    let pdf: Buffer;
    try {
      pdf = await page.pdf({ format: 'A4', printBackground: true });
    } catch (e) {
      // page.pdf() is Chromium-headless only; stay honest instead of failing.
      test.skip(true, `PDF rendering unavailable in this browser: ${(e as Error).message}`);
      return;
    }
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
