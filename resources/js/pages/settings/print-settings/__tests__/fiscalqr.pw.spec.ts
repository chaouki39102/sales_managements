import { test, expect } from '@playwright/test';
import { bootstrapApp, navigateToPrintSettings, MockTemplate } from './helpers/test-utils';

const POS_TPL: MockTemplate = {
  id: 1, name: 'POS Template', doc_type_code: 'POS', paper_size: '80mm',
  is_default: true, is_active: true,
  config: { show_qr: true, qr_content: 'both' },
};

test.describe('Print Settings — Fiscal QR rendering', () => {
  test('preview renders a real QR image instead of the legacy fake SVG', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL]);
    await navigateToPrintSettings(page);

    await expect(page.getByText('POS Template', { exact: true })).toBeVisible();

    // The new FiscalQR component renders an <img> whose src is a data:image/png
    // data URL (encoded client-side via the `qrcode` npm lib).
    const qrImg = page.locator('img[alt="QR"]');
    await expect(qrImg).toBeVisible();
    const src = await qrImg.getAttribute('src');
    expect(src).toMatch(/^data:image\/png;base64,/);

    // A PNG data URL of a QR code is non-trivial in length (hundreds of bytes).
    expect(src!.length).toBeGreaterThan(500);
  });

  test('legacy fake QR SVG is gone from the preview footer', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL]);
    await navigateToPrintSettings(page);

    await expect(page.getByText('POS Template', { exact: true })).toBeVisible();
    // The old hardcoded 10x10 QR pattern rendered `<rect>` inside an <svg>;
    // the new component must not leak any of those.
    await expect(page.locator('svg rect')).toHaveCount(0);
  });
});
