import { test, expect } from '@playwright/test';
import { bootstrapApp, navigateToPrintSettings, MockTemplate } from './helpers/test-utils';

const POS_TPL: MockTemplate = {
  id: 1, name: 'POS Template', doc_type_code: 'POS', paper_size: '80mm',
  is_default: true, is_active: true,
};
const RPT_TPL: MockTemplate = {
  id: 2, name: 'RPT Template', doc_type_code: 'RPT', paper_size: 'A4',
  is_default: true, is_active: true,
};

test.describe('Print Settings — Lifecycle', () => {
  test('loads the page with the default POS template selected', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL]);
    await navigateToPrintSettings(page);

    await expect(page.getByRole('button', { name: 'حفظ (Ctrl+S)' })).toBeVisible();
    await expect(page.getByText('POS Template', { exact: true })).toBeVisible();
    await expect(page.getByText('معاينة حية')).toBeVisible();
  });

  test('save button sends PUT /print-templates/{id} when dirty', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL]);

    let putCount = 0;
    await page.route('**/api/v1/*/print-templates/1', (route) => {
      if (route.request().method() === 'PUT') {
        putCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { ...POS_TPL } }),
        });
      } else {
        route.fallback();
      }
    });

    await navigateToPrintSettings(page);
    await expect(page.getByRole('button', { name: 'حفظ (Ctrl+S)' })).toBeDisabled();

    await page.getByRole('button', { name: 'A4', exact: true }).click();
    await page.getByRole('button', { name: 'حفظ (Ctrl+S)' }).click();

    await expect.poll(() => putCount).toBeGreaterThan(0);
  });

  test('paper-size change marks the template dirty (save enabled)', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL]);
    await navigateToPrintSettings(page);

    const saveBtn = page.getByRole('button', { name: 'حفظ (Ctrl+S)' });
    await expect(saveBtn).toBeDisabled();

    await page.getByRole('button', { name: 'A4', exact: true }).click();
    await expect(saveBtn).toBeEnabled();
  });

  test('switching doc type loads that doc type template', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL, RPT_TPL]);
    await navigateToPrintSettings(page);

    await expect(page.getByText('POS Template', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /تقرير الجلسة/ }).click();
    await expect(page.getByText('RPT Template', { exact: true })).toBeVisible();
  });
});
