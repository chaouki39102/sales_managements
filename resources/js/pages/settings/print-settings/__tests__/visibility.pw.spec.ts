import { test, expect } from '@playwright/test';
import { bootstrapApp, navigateToPrintSettings, MockTemplate } from './helpers/test-utils';

const POS_TPL: MockTemplate = {
  id: 1, name: 'POS Template', doc_type_code: 'POS', paper_size: '80mm',
  is_default: true, is_active: true,
};
const FV_TPL: MockTemplate = {
  id: 2, name: 'FV Template', doc_type_code: 'FV', paper_size: '80mm',
  is_default: true, is_active: true,
};
const RPT_TPL: MockTemplate = {
  id: 3, name: 'RPT Template', doc_type_code: 'RPT', paper_size: 'A4',
  is_default: true, is_active: true,
};

test.describe('Print Settings — Visibility', () => {
  test('shows thermal-only settings on 80mm, hides page-only settings', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL]);
    await navigateToPrintSettings(page);

    await expect(page.getByText('عرض الورق (حراري)')).toBeVisible();
    await expect(page.getByText('اتجاه الصفحة')).toBeHidden();
  });

  test('hides thermal-only settings on A4, shows page-only settings', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL]);
    await navigateToPrintSettings(page);

    await page.getByRole('button', { name: 'A4', exact: true }).click();
    await expect(page.getByText('اتجاه الصفحة')).toBeVisible();
    await expect(page.getByText('عرض الورق (حراري)')).toBeHidden();
  });

  test('switching to RPT resolves the RPT template', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL, RPT_TPL]);
    await navigateToPrintSettings(page);

    await expect(page.getByText('POS Template', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /تقرير الجلسة/ }).click();
    await expect(page.getByText('RPT Template', { exact: true })).toBeVisible();
    await expect(page.getByText('معاينة حية')).toBeVisible();
  });

  test('does not crash when switching between doc types', async ({ page }) => {
    await bootstrapApp(page, [POS_TPL, FV_TPL, RPT_TPL]);
    await navigateToPrintSettings(page);

    // [category to activate (null = pos already active), doc-type button regex]
    const docs: Array<[string | null, RegExp]> = [
      [null, /إيصال POS/],
      [null, /تقرير الجلسة/],
      ['المبيعات', /فاتورة المبيعات/],
    ];
    for (const [cat, docBtn] of docs) {
      if (cat) {
        // The tabler icon glyph is part of the accessible name; the app nav has
        // a colliding group button earlier in the DOM, so target the last match.
        await page.getByRole('button', { name: new RegExp(cat) }).last().click();
      }
      await page.getByRole('button', { name: docBtn }).click();
      await expect(page.getByText('معاينة حية')).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Error');
    }
  });
});
