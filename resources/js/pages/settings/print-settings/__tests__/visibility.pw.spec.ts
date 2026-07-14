import { test, expect } from '@playwright/test';

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
