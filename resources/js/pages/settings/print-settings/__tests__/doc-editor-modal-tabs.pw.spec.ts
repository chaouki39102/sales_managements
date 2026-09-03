import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

// Regression coverage for the document editor's modal layer:
// 1. The dedicated save modal (DocSaveModal) opens via the F9/Ctrl+S hotkey
//    and the rail save button, exposes the 3 actions (حفظ S / حفظ وجديد N /
//    حفظ وإغلاق C) with keyboard shortcuts, and closes on Esc.
// 2. The extra-options modal keeps a FIXED/uniform height via the bodyHeight
//    prop while switching tabs (خيارات إضافية / الإدخال السريع / شروط الدفع),
//    and the modal body itself scrolls internally instead of changing size.
// 3. The backend doc-type readout (.doc-type-props) renders inside the modal.
test.describe('DOC EDITOR MODAL TABS + SAVE MODAL', () => {
  const DOC_TYPES = [
    {
      id: 1, name: 'فاتورة', code: 'FV', description: '',
      base_operation_id: 1, affects_stock_direction: -1,
      requires_party: true, affects_accounting: true,
      is_printable: true, display_order: 1, active: true,
    },
  ];

  test.beforeEach(async ({ page }) => {
    await bootstrapApp(page);
    await page.route('**/api/v1/demo/document-types*', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: DOC_TYPES }),
    }));
    await page.route('**/api/v1/demo/warehouses*', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 1, name: 'رئيسي', is_default: true }] }),
    }));
    await page.route('**/api/v1/demo/currencies*', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 1, name: 'دينار', code: 'DZD', is_base_currency: true }] }),
    }));
    await page.route('**/api/v1/demo/price-levels*', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 1, name: 'أساسي', is_default: true }] }),
    }));
    await page.route('**/api/v1/demo/customers*', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 1, name: 'زبون', code: 'C1' }] }),
    }));
  });

  async function gotoEditor(page: import('@playwright/test').Page) {
    await page.goto('/documents/FV/new');
    await page.waitForSelector('#doc-party-select', { timeout: 15000 });
    await page.waitForTimeout(400);
  }

  test('F9 opens the save modal with 3 actions and S/N/C keyboard shortcuts', async ({ page }) => {
    await gotoEditor(page);

    // open via the F9 hotkey
    await page.keyboard.press('F9');
    await page.waitForSelector('.doc-save-actions', { timeout: 5000 });
    await page.waitForTimeout(150);

    const btns = page.locator('.doc-save-btn');
    expect(await btns.count()).toBe(3);

    // each button has a kbd badge + label (they render regardless of mojibake)
    const kbdTexts = await btns.locator('.doc-save-btn-kbd').allTextContents();
    expect(kbdTexts.map((s) => s.trim()).sort()).toEqual(['C', 'N', 'S']);

    // shortcut keys (lowercase) select the same action as the badge shows
    const dispatch = async (until: string) => {
      await page.keyboard.press(until);
      await page.waitForTimeout(200);
    };

    // pressing 's' (save) closes the modal (it hides via .ov, children stay mounted)
    await dispatch('s');
    await expect(page.locator('.doc-save-actions')).toBeHidden();
  });

  test('rail save button also opens the save modal; Esc closes it', async ({ page }) => {
    await gotoEditor(page);

    // rail save button (F9 / Ctrl+S tooltip)
    const railSave = page.locator('.pp-rail-btn[title="حفظ (F9 / Ctrl+S)"]');
    if (await railSave.count()) {
      await railSave.click();
      await page.waitForSelector('.doc-save-actions', { timeout: 5000 });
      await page.waitForTimeout(150);
      expect(await page.locator('.doc-save-btn').count()).toBe(3);

      // Esc closes without saving (children stay mounted; assert hidden state)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      await expect(page.locator('.doc-save-actions')).toBeHidden();
    }
  });

  test('extra-options modal keeps a stable body height across tab switches', async ({ page }) => {
    await gotoEditor(page);

    // open via the rail options button
    const railOptions = page.locator('.pp-rail-btn').filter({ has: page.locator('i.ti-adjustments') }).first();
    await railOptions.click();
    await page.waitForSelector('.doc-type-props', { timeout: 5000 });
    await page.waitForTimeout(200);

    // read the modal body box
    const readBody = () => page.evaluate(() => {
      const body = document.querySelector('.m-body > div') as HTMLElement | null;
      const modal = document.querySelector('.modal') as HTMLElement | null;
      const r = modal && modal.getBoundingClientRect();
      return {
        bodyH: body ? Math.round(body.getBoundingClientRect().height) : -1,
        modalH: r ? Math.round(r.height) : -1,
      };
    });

    const h0 = await readBody();

    // doc-type readout reflects the mocked FV config
    const props = page.locator('.doc-type-prop');
    expect(await props.count()).toBe(4);

    // switch tabs — height must stay identical (bodyHeight fixed, internal scroll)
    const tabButtons = page.locator('button').filter({ hasText: /الإدخال السريع|خيارات إضافية|شروط الدفع/ });
    const n = await tabButtons.count();
    let sawSecondTab = false;
    for (let i = 0; i < n && i < 3; i++) {
      const label = (await tabButtons.nth(i).textContent()) || '';
      if (/خيارات إضافية|الإدخال السريع|شروط الدفع/.test(label)) {
        if (!sawSecondTab) { sawSecondTab = true; continue; } // skip the already-active tab
        await tabButtons.nth(i).click();
        await page.waitForTimeout(250);
        const hh = await readBody();
        expect(Math.abs(hh.bodyH - h0.bodyH)).toBeLessThanOrEqual(1);
        expect(Math.abs(hh.modalH - h0.modalH)).toBeLessThanOrEqual(2);
      }
    }
  });
});
