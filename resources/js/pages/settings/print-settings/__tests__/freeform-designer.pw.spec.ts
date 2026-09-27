import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
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

/**
 * The designer previews the LAST REAL document (`useRealData` defaults to true),
 * and the bootstrap catch-all answers every GET with `{ data: [] }` — an empty
 * document has no `lines`, so `items.table` is never rendered and the flow-first
 * invariant cannot be exercised in the browser. This fixture feeds the
 * list → detail lookup the page performs (`/documents?page[size]=1` then
 * `/documents/7?include=lines,...`) with a real line set.
 */
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
    {
      id: 2,
      description: 'سكر',
      product: { name: 'سكر', reference: 'S-001' },
      quantity: 1,
      unit_price_ht: 80,
      tva_rate: 0.09,
      total_ht: 80,
      total_tva: 7.2,
      total_ttc: 87.2,
      discount_percentage: 0,
      discount_amount: 0,
    },
  ],
};

async function mockPreviewDocument(page: Page) {
  // The tail needs a DOUBLE star: Playwright's `*` never matches `/`, so
  // `documents*` would match the list only and let `/documents/7` fall through
  // to bootstrapApp's catch-all (which returns `{ data: [] }` → no lines →
  // ItemsSection renders nothing → no items.table in the stage).
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

/**
 * The page opens on the POS document type, so an FV template is not loaded until
 * the sales category + FV tab are selected and the template row is clicked.
 * Locators use data-testid hooks — Arabic accessible names are unusable here
 * because Tabler's `<i>` icon `::before` content is folded into the accname.
 */
async function openDesignerAndSelect(page: Page, key: string) {
  await bootstrapApp(page, [FV_TPL]);
  // Registered AFTER bootstrapApp: Playwright matches routes in reverse
  // registration order, so this overrides the catch-all for the documents pair.
  await mockPreviewDocument(page);
  await navigateToPrintSettings(page);

  await page.getByTestId('ps-doc-cat').filter({ hasText: /مبيعات/ }).click();
  await page.getByTestId('ps-doc-tab').filter({ hasText: 'FV' }).click();
  await page.getByTestId('ps-tpl').first().click();

  await page.getByTestId('ps-designer-entry').click();
  // Scope to the VISIBLE stage: the always-mounted TemplateLibraryModal also
  // renders a (hidden) .ps-preview-wrapper with its own data-drag-key nodes.
  const holder = page.locator(`.ps-preview-wrapper:visible [data-drag-key="${key}"]`).first();
  await expect(holder).toHaveCount(1);
  // An element with no stored geometry renders as `display: contents`, which has
  // no box to click — and the stage attaches its pointerdown listener to the
  // first real child, so the child is the honest click target.
  const box = holder.locator('> *').first();
  await expect(box).toBeVisible();
  await box.click({ position: { x: 4, y: 4 } });
  await expect(page.locator('[data-ff-inspector]')).toBeVisible();
}

const inspector = (page: Page) => page.locator('[data-ff-inspector]');
const modeBtn = (page: Page, label: string) => inspector(page).getByRole('button', { name: label, exact: true });
const mmInput = (page: Page, label: string) => inspector(page).locator('label', { hasText: label }).locator('input');

test.describe('Freeform designer — numeric inspector + 3-way mode switch', () => {
  test('selecting an element opens the inspector in تلقائي with its real key', async ({ page }) => {
    await openDesignerAndSelect(page, 'totals.block');

    await expect(inspector(page).getByText('المجاميع')).toBeVisible();
    await expect(inspector(page).locator('code')).toHaveText('totals.block');
    // Nothing is stored yet, so the honest mode is automatic flow — NOT "ثابت".
    await expect(modeBtn(page, 'تلقائي')).toBeEnabled();
    await expect(inspector(page)).toContainText('تلقائي: العنصر في تدفّقه الطبيعي');
    // The measured fallback still shows numbers, so committing one field can
    // never blank the others.
    await expect(mmInput(page, 'العرض')).not.toHaveValue('');
  });

  test('ثابت → تدفّق → تلقائي round-trips and drops the fields the mode ignores', async ({ page }) => {
    await openDesignerAndSelect(page, 'totals.block');

    await modeBtn(page, 'ثابت').click();
    // Inspector survives its own clicks (regression: the stage used to treat
    // the inspector as empty area and deselect on every mode click).
    await expect(inspector(page)).toBeVisible();
    await expect(mmInput(page, 'X من الحافة اليمنى')).toBeVisible();
    await expect(mmInput(page, 'الارتفاع')).toBeVisible();

    await modeBtn(page, 'تدفّق').click();
    await expect(inspector(page)).toBeVisible();
    // Flow reads only width + vertical nudge: a page X and a captured height
    // would pin the growing box and break pagination.
    await expect(mmInput(page, 'العرض')).toBeVisible();
    await expect(mmInput(page, 'إزاحة رأسية')).toBeVisible();
    await expect(mmInput(page, 'X من الحافة اليمنى')).toHaveCount(0);
    await expect(mmInput(page, 'الارتفاع')).toHaveCount(0);
    await expect(mmInput(page, 'الدوران °')).toHaveCount(0);

    // Reset deletes the entry outright, so the element is automatic again.
    await modeBtn(page, 'تلقائي').click();
    await expect(inspector(page)).toBeVisible();
    await expect(inspector(page)).toContainText('تلقائي: العنصر في تدفّقه الطبيعي');
    await expect(mmInput(page, 'X من الحافة اليمنى')).toBeVisible();
  });

  test('items.table can never be pinned — the fixed button is disabled and explained', async ({ page }) => {
    await openDesignerAndSelect(page, 'items.table');

    await expect(inspector(page).getByText('جدول المنتجات')).toBeVisible();
    const fixed = modeBtn(page, 'ثابت');
    await expect(fixed).toBeDisabled();
    await expect(fixed).toHaveAttribute('title', /يتجاوز الصفحة/);
    // Switching it to flow is still allowed.
    await modeBtn(page, 'تدفّق').click();
    await expect(inspector(page)).toBeVisible();
  });

  test('arrow keys nudge a fixed element by 1mm and Shift+arrows by 5mm', async ({ page }) => {
    await openDesignerAndSelect(page, 'totals.block');
    await modeBtn(page, 'ثابت').click();

    const x = mmInput(page, 'X من الحافة اليمنى');
    const before = Number(await x.inputValue());
    // Focus stays on the mode button (not an input), so the window handler runs.
    // Nudge RIGHT only: X is measured from the right edge, so moving left on a
    // small element would hit the 0 clamp and assert nothing.
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => Number(await x.inputValue())).toBeCloseTo(before + 1, 2);

    await page.keyboard.press('Shift+ArrowRight');
    await expect.poll(async () => Number(await x.inputValue())).toBeCloseTo(before + 6, 2);
  });

  test('typed millimetres are clamped inside the page box', async ({ page }) => {
    await openDesignerAndSelect(page, 'totals.block');
    await modeBtn(page, 'ثابت').click();

    const x = mmInput(page, 'X من الحافة اليمنى');
    await x.fill('9999');
    await x.blur();
    const val = Number(await x.inputValue());
    expect(val).toBeGreaterThan(0);
    expect(val).toBeLessThanOrEqual(210);
  });

  test('clicking empty page area deselects the element', async ({ page }) => {
    await openDesignerAndSelect(page, 'totals.block');
    await expect(inspector(page)).toBeVisible();

    // The stage hint lives inside the stage root but outside every [data-drag-key]
    // element, so it is the deterministic "empty area" target (a click on the
    // paper's own corner usually lands on the header block instead).
    await page.getByText(/اسحب أي عنصر داخل الصفحة/).click();
    await expect(inspector(page)).toHaveCount(0);
  });
});
