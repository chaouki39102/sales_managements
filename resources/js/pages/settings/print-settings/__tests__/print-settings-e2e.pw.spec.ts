import { test, expect } from '@playwright/test';
import { bootstrapApp, navigateToPrintSettings, MockTemplate } from './helpers/test-utils';

const FV_TPL: MockTemplate = {
  id: 1,
  name: 'فاتورة مبيعات',
  doc_type_code: 'FV',
  paper_size: 'A4',
  is_default: true,
  is_active: true,
  config: {},
};

const POS_TPL: MockTemplate = {
  id: 2,
  name: 'إيصال نقاط البيع',
  doc_type_code: 'POS',
  paper_size: '80mm',
  is_default: true,
  is_active: true,
  config: {},
};

test.describe('Print Settings — E2E Workflow', () => {
  test('page loads and shows template controls + live preview', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL]);
    await navigateToPrintSettings(page);

    await expect(page.getByText('فاتورة مبيعات', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'حفظ (Ctrl+S)' })).toBeVisible();
    await expect(page.getByText('معاينة حية')).toBeVisible();
  });

  test('toggle a setting and save persists via PUT', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL]);
    let putCount = 0;
    await page.route('**/api/v1/*/print-templates/1', (route) => {
      if (route.request().method() === 'PUT') {
        putCount++;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { ...FV_TPL } }),
        });
      } else {
        route.fallback();
      }
    });

    await navigateToPrintSettings(page);

    const saveBtn = page.getByRole('button', { name: 'حفظ (Ctrl+S)' });
    await expect(saveBtn).toBeDisabled();

    await page.getByRole('button', { name: 'A4', exact: true }).click();
    await expect(saveBtn).toBeEnabled();

    await saveBtn.click();
    await expect.poll(() => putCount).toBeGreaterThan(0);
  });

  test('switching doc type in sidebar loads different template', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL, POS_TPL]);
    await navigateToPrintSettings(page);

    await expect(page.getByText('فاتورة مبيعات', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /نقاط البيع/ }).click();
    await expect(page.getByText('إيصال نقاط البيع', { exact: true })).toBeVisible();
  });

  test('quick-nav scrolls to section', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL]);
    await navigateToPrintSettings(page);

    const headerNav = page.locator('button', { hasText: 'العنوان' }).first();
    if (await headerNav.isVisible()) {
      await headerNav.click();
      const headerSection = page.locator('#s-header');
      await expect(headerSection).toBeVisible();
    }
  });
});
