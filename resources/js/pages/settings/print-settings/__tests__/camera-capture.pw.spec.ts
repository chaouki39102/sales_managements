import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

// B.2 — photograph a product via camera in the product form.
//
// A headless browser has no real camera, so the camera feed is fully mocked:
//   - getUserMedia → empty MediaStream (video.srcObject works, frames are blank)
//   - canvas.getContext('2d') → fake ctx whose drawImage is a no-op (a blank
//     video would otherwise throw InvalidStateError on drawImage)
//   - canvas.toBlob → emits a real JPEG blob so the File pipeline runs end-to-end
//
// Route-precedence note: Playwright checks routes in REVERSE registration order
// (the LAST registered route wins). bootstrapApp registers a catch-all
// `**/api/v1/**`, so the specific product/image routes below MUST be registered
// AFTER `await bootstrapApp(page)` to take precedence over it.
test.describe('B.2 Camera photograph — product form', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // ── Camera feed mock ──
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => new MediaStream(),
        },
      });

      // ── Canvas mocks ──
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]) {
        if (type !== '2d') return origGetContext.call(this, type, ...args);
        // Fake 2d ctx: drawImage is a no-op (blank video would throw otherwise),
        // everything else no-ops too. `canvas` property is preserved.
        return new Proxy({ canvas: this } as any, {
          get: (t, k) => {
            if (k === 'canvas') return t.canvas;
            return () => {};
          },
          set: () => true,
        });
      };

      HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, type?: string) {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#0a8a5c"/></svg>';
        cb(new Blob([svg], { type: type || 'image/jpeg' }));
      };
    });
  });

  test('create product: capture a photo, see the pending preview, save → image uploaded', async ({ page }) => {
    let created = 0;
    let imageUploaded = 0;

    await bootstrapApp(page);

    await page.route('**/api/v1/demo/products', async (route) => {
      if (route.request().method() !== 'POST') { await route.fallback(); return; }
      created++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { id: 999, name: 'منتج E2E', ref: 'E2E-001', images: [], default_image: null },
        }),
      });
    });
    await page.route('**/api/v1/demo/products/999/image', async (route) => {
      imageUploaded++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: 999, name: 'منتج E2E', ref: 'E2E-001',
            images: ['https://example.com/e2e.jpg'],
            default_image: 'https://example.com/e2e.jpg',
          },
        }),
      });
    });

    await page.goto('/products');

    // Open the create-product modal (default tab is «الأساسيات»)
    await page.getByRole('button', { name: 'منتج جديد' }).click();

    // Fill the required fields FIRST — they live on the «الأساسيات» tab, which is
    // hidden (removed from interaction) once we switch to «الصور». The save button
    // is in the modal header/footer, so it stays reachable from the «الصور» tab.
    await page.getByPlaceholder('مثال: حليب نصف دسم 1 لتر').fill('منتج E2E');
    await page.getByText('سعر الشراء HT').locator('..').locator('input').fill('150');

    await page.getByRole('button', { name: 'الصور' }).click();

    // Camera button (enabled in create mode — upload happens on save).
    // Scope by the modal button's unique title; `{ name: /كاميرا/ }` would also
    // match the page-header «مسح بالكاميرا» scan button (B.1).
    const camBtn = page.locator('button[title="التقاط صورة بالكاميرا — تُرفع عند الحفظ"]');
    await expect(camBtn).toBeVisible();
    await camBtn.click();

    // Camera modal opens with its title + hint
    await expect(page.getByText('التقاط صورة للمنتج')).toBeVisible();
    await expect(page.getByText(/صوّب الكاميرا على المنتج/)).toBeVisible();

    // Capture → shot preview → use it
    await page.getByRole('button', { name: /التقاط الصورة/ }).click();
    await expect(page.getByRole('button', { name: /استخدام هذه الصورة/ })).toBeVisible();
    await page.getByRole('button', { name: /استخدام هذه الصورة/ }).click();

    // Modal closed, pending preview card rendered (blob image + badges)
    await expect(page.getByText('التقاط صورة للمنتج')).toBeHidden();
    await expect(page.getByText('ستُرفع عند الحفظ')).toBeVisible();
    await expect(page.getByText('ملتقطة', { exact: true })).toBeVisible();
    await expect(page.locator('img[src^="blob:"]')).toHaveCount(1);

    // Save (fields already filled above)
    await page.getByRole('button', { name: /إنشاء المنتج/ }).click();

    // Product created, then the pending photo uploaded via the existing endpoint
    await expect(page.getByText('تمت إضافة المنتج بنجاح')).toBeVisible();
    await expect(page.getByText('تم رفع الصورة الملتقطة')).toBeVisible();
    expect(created).toBe(1);
    expect(imageUploaded).toBe(1);
  });

  test('edit mode: camera still available (upload targets the existing product id)', async ({ page }) => {
    await bootstrapApp(page);

    await page.route('**/api/v1/demo/products*', (route) => {
      if (route.request().method() !== 'GET') { void route.fallback(); return; }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 7, name: 'منتج قابل للتعديل', ref: 'PROD-7',
            purchase_price_ht: 100, images: [], default_image: null, active: true,
          }],
          meta: { current_page: 1, from: 1, to: 1, last_page: 1, per_page: 10, total: 1 },
          links: { first: null, last: null, prev: null, next: null },
        }),
      });
    });

    await page.goto('/products');

    // Open the edit modal for the listed product. The row edit button (title="تعديل")
    // doubles as the wait-for-render signal; `{ name: /تعديل/ }` would be ambiguous
    // and the product name appears twice in the DOM (table cell + the hidden
    // TemplatePrintModal sticker preview), so never wait on it by text.
    const editBtn = page.locator('button[title="تعديل"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await expect(page.getByText('تعديل المنتج')).toBeVisible();
    await page.getByRole('button', { name: 'الصور' }).click();

    const camBtn = page.locator('button[title="التقاط صورة بالكاميرا — تُرفع عند الحفظ"]');
    await expect(camBtn).toBeVisible();
    await camBtn.click();
    await expect(page.getByText('التقاط صورة للمنتج')).toBeVisible();
    await page.getByRole('button', { name: /التقاط الصورة/ }).click();
    await page.getByRole('button', { name: /استخدام هذه الصورة/ }).click();
    await expect(page.getByText('ستُرفع عند الحفظ')).toBeVisible();
  });
});
