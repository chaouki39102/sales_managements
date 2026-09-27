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

    // The camera icon button lives in the lines section's scan bar. The full-page
    // editor now passes `hideScanBar` (CommercialDocumentPage.tsx) and the global
    // FAB is suppressed on /documents/* routes, so the affordance is reached
    // through the globally-mounted quick-create modal (DocumentQuickCreateProvider)
    // opened from a neutral page.
    //
    // Count 0 BEFORE opening is the regression guard for the modal body gating fix:
    // the closed quick-create modal used to keep its whole form in the DOM
    // (opacity:0), leaking a hidden camera button onto every page. Its body is now
    // unmounted, and count 1 AFTER opening proves the affordance itself still works.
    await page.goto('/dashboard');

    const camBtn = page.locator('button[title="مسح الباركود بالكاميرا"]');
    await expect(camBtn).toHaveCount(0);

    // No last-used type yet → the FAB opens the type menu, then the modal.
    // The seeded type name carries tatweel (فـاتـورة مبيعات) which breaks any exact
    // Arabic match, so target the tatweel-free word and scope the click to the
    // type menu itself («المبيعات» is also the sidebar group label).
    await page.getByTitle(/مستند جديد/).first().click();
    const typeMenu = page.getByText('إنشاء مستند جديد').locator('..');
    await typeMenu.getByRole('button', { name: /مبيعات/ }).click();

    await expect(camBtn).toHaveCount(1);
    await expect(camBtn).toBeVisible();

    await camBtn.click();
    await expect(page.getByText('مسح الباركود لإضافة منتج')).toBeVisible();
    await expect(page.getByText(/صوّب الكاميرا على باركود المنتج/)).toBeVisible();
  });
});
