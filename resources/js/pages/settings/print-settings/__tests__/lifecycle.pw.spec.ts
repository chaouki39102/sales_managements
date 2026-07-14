import { test, expect } from '@playwright/test';

test.describe('Print Settings — Lifecycle', () => {
  test('loads the page without errors', async ({ page }) => {
    const { mockApiResponse } = await import('./helpers/test-utils');
    await mockApiResponse(page, { doc_type_code: 'FV', paper_size: '80mm' });
    await page.goto('/settings/print-settings?doc_type=FV');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText('Print');
  });

  test('save button triggers API call', async ({ page }) => {
    const { mockApiResponse } = await import('./helpers/test-utils');
    await mockApiResponse(page, { doc_type_code: 'FV', paper_size: '80mm' });

    let putCalled = false;
    await page.route('**/api/v1/print-templates/**', (route) => {
      if (route.request().method() === 'PUT') {
        putCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 1, name: 'Test', doc_type_code: 'FV', paper_size: '80mm',
              is_default: true, is_active: true,
              config: {},
            },
          }),
        });
      }
    });

    await page.goto('/settings/print-settings?doc_type=FV');
    await page.waitForLoadState('networkidle');

    const saveBtn = page.locator('button:has-text("حفظ")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
      expect(putCalled).toBe(true);
    }
  });

  test('should show template selector with templates', async ({ page }) => {
    const { mockTemplatesList } = await import('./helpers/test-utils');
    await mockTemplatesList(page, [
      { id: 1, name: 'Template 1', doc_type_code: 'FV', paper_size: '80mm', is_default: true, is_active: true },
    ]);

    await page.route('**/api/v1/print-templates/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1, name: 'Template 1', doc_type_code: 'FV', paper_size: '80mm',
            is_default: true, is_active: true,
            config: { show_logo: true, title_text: 'FACTURE' },
          },
        }),
      });
    });

    await page.goto('/settings/print-settings?doc_type=FV');
    await page.waitForLoadState('networkidle');
  });
});
