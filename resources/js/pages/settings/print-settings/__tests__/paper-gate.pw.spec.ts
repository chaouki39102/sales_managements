import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { bootstrapApp, navigateToPrintSettings, MockTemplate } from './helpers/test-utils';

const tpl = (id: number, paper: string, name: string): MockTemplate => ({
  id,
  name,
  doc_type_code: 'FV',
  paper_size: paper,
  is_default: true,
  is_active: true,
  config: {},
});

const A4_TPL = tpl(1, 'A4', 'فاتورة مبيعات A4');
const A5_TPL = tpl(2, 'A5', 'فاتورة مبيعات A5');
const M80_TPL = tpl(3, '80mm', 'فاتورة مبيعات 80mm');
const M58_TPL = tpl(4, '58mm', 'فاتورة مبيعات 58mm');

const PREVIEW_DOC = {
  id: 7,
  document_number: 'FV-2026-000007',
  document_date: '2026-09-07',
  document_type: { code: 'FV', name: 'فاتورة مبيعات' },
  total_ht: 2480,
  total_tva: 463.2,
  total_ttc: 2943.2,
  total_stamp: 5,
  net_to_pay: 2948.2,
  paid_amount: 2943.2,
  remaining_amount: 5,
  party: { id: 3, name: 'زبون تجريبي', type: 'customer', code: 'C-001' },
  payments: [],
  lines: [
    {
      id: 1,
      description: 'حليب',
      product: { name: 'حليب', reference: 'L-001' },
      quantity: 2,
      unit_price_ht: 1200,
      tva_rate: 0.19,
      total_ht: 2400,
      total_tva: 456,
      total_ttc: 2856,
      discount_percentage: 0,
      discount_amount: 0,
    },
  ],
};

async function mockPreviewDocument(page: Page) {
  // The tail needs a DOUBLE star: Playwright's `*` never matches `/`, so
  // `documents*` would match the list only and let `/documents/7` fall through
  // to bootstrapApp's catch-all (which returns `{ data: [] }` → no lines).
  await page.route('**/api/v1/*/documents**', (route) => {
    const isDetail = /\/documents\/\d+/.test(route.request().url());
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        isDetail
          ? { data: PREVIEW_DOC }
          : { data: [{ id: PREVIEW_DOC.id }], meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 }, links: {} },
      ),
    });
  });
}

/** Select the sales category, then the FV tab, then the requested template row. */
async function openTemplate(page: Page, templateId: number) {
  await page.locator('[data-testid="ps-doc-cat"][data-cat="sales"]').click();
  await page.locator('[data-testid="ps-doc-tab"][data-code="FV"]').click();
  await page.locator(`[data-testid="ps-tpl"][data-tpl-id="${templateId}"]`).click();
}

const stage = (page: Page) => page.locator('.ps-preview-wrapper:visible').first();

test.describe('Print Settings — freeform is A4-only', () => {
  test('A4 exposes the designer entry and the mm stage', async ({ page }) => {
    await bootstrapApp(page, [A4_TPL, A5_TPL, M80_TPL, M58_TPL]);
    await mockPreviewDocument(page);
    await navigateToPrintSettings(page);
    await openTemplate(page, 1);

    await expect(page.getByTestId('ps-designer-entry')).toBeVisible();
    await page.getByTestId('ps-designer-entry').click();
    // The ACTIVE stage mounts (the honest "designer is open" signal), and it
    // wraps its OWN `.ps-preview-wrapper`, so probe the stage globally rather
    // than from inside a wrapper that the stage sits above.
    const active = page.locator('[data-ff-stage]');
    await expect(active).toHaveCount(1);
    await expect(active.locator('.ps-preview-wrapper [data-drag-key]').first()).toBeVisible();
    await expect(active.locator('.ps-preview-wrapper [data-drag-key="items.table"]')).toHaveCount(1);
    await expect(page.locator('[data-ff-inspector]')).toHaveCount(0);
  });

  for (const [label, id] of [['A5', 2], ['80mm', 3], ['58mm', 4]] as const) {
    test(`${label} renders the normal preview with no freeform affordances`, async ({ page }) => {
      await bootstrapApp(page, [A4_TPL, A5_TPL, M80_TPL, M58_TPL]);
      await mockPreviewDocument(page);
      await navigateToPrintSettings(page);
      await openTemplate(page, id);

      // The gate is the ONLY thing that must be absent: no designer entry, and
      // therefore no ACTIVE stage, no inspector, and no stored mm geometry.
      // `data-drag-key`/`data-ff-mode` are NOT the probe here — the normal
      // (non-freeform) preview emits them too, so only the stage root counts.
      await expect(page.getByTestId('ps-designer-entry')).toHaveCount(0);
      await expect(page.locator('[data-ff-stage]')).toHaveCount(0);
      await expect(page.locator('[data-ff-inspector]')).toHaveCount(0);

      // The non-freeform preview must still render the document body.
      await expect(stage(page)).toBeVisible();
      await expect(stage(page)).toContainText('FV-2026-000007');
      await expect(stage(page).getByText('حليب').first()).toBeVisible();
    });
  }
});
