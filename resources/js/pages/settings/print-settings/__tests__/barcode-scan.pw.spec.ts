import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

// B.1 — shared camera-scan affordance wired outside the POS.
//
// A headless browser has no real camera, so each page shows the camera button +
// modal title/hint immediately when opened; `html5-qrcode.start()` fails with a
// NotFound/NotAllowed error which the modal surfaces as Arabic text but never
// hides the title/hint. The camera feed is mocked via getUserMedia so the
// permission path never fires.
test.describe('B.1 Camera scan everywhere — non-POS pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Mock the camera feed so Html5Qrcode.start() never hits NotAllowed.
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => ({
            getTracks: () => [{ stop: () => {} }],
            getVideoTracks: () => [{ stop: () => {} }],
          }),
        },
      });
    });
  });

  test('products page: scan button opens the scan modal with its title/hint', async ({ page }) => {
    await bootstrapApp(page);
    await page.goto('/products');

    const camBtn = page.getByRole('button', { name: /مسح بالكاميرا/ });
    await expect(camBtn).toBeVisible();

    await camBtn.click();
    await expect(page.getByText('مسح الباركود لفتح المنتج')).toBeVisible();
    await expect(page.getByText(/صوّب الكاميرا على باركود منتج/)).toBeVisible();

    // Scope the cancel click to the scan modal's own overlay (z-index 99999):
    // other modals on the page (e.g. the product editor) also carry «إلغاء».
    const overlay = page.locator('div[style*="z-index: 99999"]');
    await overlay.getByRole('button', { name: /إلغاء|إغلاق/ }).click();
    await expect(page.getByText('مسح الباركود لفتح المنتج')).toBeHidden();
  });

  test('parties page: scan button opens the scan modal with its title/hint', async ({ page }) => {
    await bootstrapApp(page);
    await page.goto('/parties');

    const camBtn = page.getByRole('button', { name: /مسح بالكاميرا/ });
    await expect(camBtn).toBeVisible();

    await camBtn.click();
    await expect(page.getByText('مسح NIF / RC لفتح الطرف')).toBeVisible();
    await expect(page.getByText(/صوّب الكاميرا على رمز NIF أو RC/)).toBeVisible();
  });

  test('documents form (FV): lines camera button opens the scan modal', async ({ page }) => {
    await bootstrapApp(page);

    // The FV document type + lookups (warehouse/currency/price level/customers)
    // so the controller's `lookupsReady` gate passes and the lines section
    // (which holds the camera button) renders instead of the loader.
    await page.route('**/api/v1/demo/document-types*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 1, name: 'فـاتـورة مبيعات', code: 'FV', description: '',
            base_operation_id: 1, affects_stock_direction: -1,
            requires_party: true, affects_accounting: true,
            is_printable: true, display_order: 1, active: true,
          }],
        }),
      });
    });
    await page.route('**/api/v1/demo/warehouses*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 1, name: 'المستودع الرئيسي', is_default: true }] }) });
    });
    await page.route('**/api/v1/demo/currencies*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 1, name: 'دينار جزائري', code: 'DZD', is_base_currency: true }] }) });
    });
    await page.route('**/api/v1/demo/price-levels*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 1, name: 'التجزئة', is_default: true }] }) });
    });
    await page.route('**/api/v1/demo/customers*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 1, name: 'زبون نقدي' }] }) });
    });

    await page.goto('/documents/FV/new');

    // The camera icon button next to the barcode input in the lines section.
    // Scope to #main: a second, identical button lives in the globally-mounted
    // quick-create CommercialDocumentModal (App.tsx DocumentQuickCreateProvider)
    // whose body stays in the DOM with opacity:0 / pointer-events:none when
    // closed — Playwright's visibility check ignores opacity, so without the
    // #main scope this strict locator resolves to 2 elements.
    const camBtn = page.locator('#main button[title="مسح الباركود بالكاميرا"]');
    await expect(camBtn).toBeVisible();

    await camBtn.click();
    await expect(page.getByText('مسح الباركود لإضافة منتج')).toBeVisible();
    await expect(page.getByText(/صوّب الكاميرا على باركود المنتج/)).toBeVisible();
  });
});
