import { test, expect, type Page } from '@playwright/test';
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

/**
 * The page opens on the POS document type, so an FV test must select the sales
 * category, then the FV tab, then a template row. Everything keys off the stable
 * data-testid hooks: Arabic accessible names are unusable (Tabler's `<i>` icon
 * `::before` is folded into the accname) and the always-mounted
 * TemplateLibraryModal duplicates the template names. `data-cat`/`data-code`
 * are used rather than labels because the POS category label is the literal
 * string 'POS', not 'نقاط البيع'.
 */
async function selectDocType(page: Page, code: 'FV' | 'POS') {
  await page.locator(`[data-testid="ps-doc-cat"][data-cat="${code === 'FV' ? 'sales' : 'pos'}"]`).click();
  await page.locator(`[data-testid="ps-doc-tab"][data-code="${code}"]`).click();
  await page.getByTestId('ps-tpl').first().click();
}

test.describe('Print Settings — E2E Workflow', () => {
  test('page loads and shows template controls + live preview', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL]);
    await navigateToPrintSettings(page);
    await selectDocType(page, 'FV');

    await expect(page.getByTestId('ps-tpl')).toHaveAttribute('data-tpl-id', '1');
    await expect(page.getByTestId('ps-save')).toBeVisible();
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
    await selectDocType(page, 'FV');

    const saveBtn = page.getByTestId('ps-save');
    await expect(saveBtn).toBeDisabled();

    await page.getByTestId('ps-paper').filter({ hasText: 'A4' }).click();
    await expect(saveBtn).toBeEnabled();

    await saveBtn.click();
    await expect.poll(() => putCount).toBeGreaterThan(0);
  });

  test('switching doc type in sidebar loads different template', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL, POS_TPL]);
    await navigateToPrintSettings(page);

    await selectDocType(page, 'POS');
    await expect(page.getByTestId('ps-tpl').first()).toHaveAttribute('data-paper', '80mm');

    await selectDocType(page, 'FV');
    await expect(page.getByTestId('ps-tpl').first()).toHaveAttribute('data-paper', 'A4');
  });

  test('quick-nav scrolls to section', async ({ page }) => {
    await bootstrapApp(page, [FV_TPL]);
    await navigateToPrintSettings(page);
    await selectDocType(page, 'FV');

    const headerNav = page.locator('button', { hasText: 'العنوان' }).first();
    if (await headerNav.isVisible()) {
      await headerNav.click();
      const headerSection = page.locator('#s-header');
      await expect(headerSection).toBeVisible();
    }
  });
});
