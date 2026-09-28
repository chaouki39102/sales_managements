import { test, expect, type Page } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

// Regression (Phase 95): printing a MODAL must put only the modal body on paper.
//
// The shared <Modal> (components/ui/Modal.tsx) is not a React portal -- it is
// rendered INLINE, as a `.ov.on` subtree of the surrounding page. Before Phase 95
// a modal therefore printed together with the whole page behind it (sidebar,
// topbar, KPI cards) and, worse, kept its SCREEN geometry: `position: fixed`,
// `width/height/max-height` set inline by Modal's resizable state, `flex: 1 1 auto`
// + `height: <bodyHeight>` inline on `.m-body`, and `max-height`/`overflow` inline
// on inner scroll containers (TransactionHistoryModal). Content below the fold of
// those scrollers was simply lost from the sheet.
//
// The isolation gate lives in resources/css/theme/pages.css:
//   body:has(.ov.on) *:not(.ov.on):not(.ov.on *):not(:has(.ov.on)) { display:none }
// That hides every node that is neither the open overlay nor an ancestor of one,
// which is why the harness below mounts the replica INSIDE `#p-dashboard`: the
// page wrapper stays (it is an ancestor) while the page's own content is hidden.
//
// Two properties are asserted deliberately, because both were broken once:
//  1. CONDITIONALITY -- with no overlay open, the page prints normally. A blanket
//     `body > *` / `body *` print kill (the bug Phase 95 removed from pos.css)
//     passes every isolation assertion and still yields a blank sheet.
//  2. GEOMETRY -- the overlay is `position:static` with `height/max-height:auto` and
//     `overflow:visible`, so the scroller stops clipping. Asserted as a
//     screen->print DELTA on the scroller, not as an absolute pixel value.

/** Marker injected into the page, OUTSIDE any overlay. */
const PROBE_PAGE = '[data-print-probe="page"]';
/** Replica of <Modal>'s DOM + the inline styles the print rules must neutralize. */
const PROBE_OVERLAY = '[data-print-probe="overlay"]';
const PROBE_MODAL = '[data-print-probe="modal"]';
const PROBE_BODY = '[data-print-probe="body"]';
const PROBE_SCROLLER = '[data-print-probe="scroller"]';
const PROBE_ROW = '[data-print-probe="row"]';
const PROBE_PRINT_ONLY = '[data-print-probe="print-only"]';
const PROBE_REF_BTN = '[data-print-probe="ref-btn"]';
const PROBE_ICON_BTN = '[data-print-probe="icon-btn"]';
const PROBE_NOPRINT_BTN = '[data-print-probe="noprint-btn"]';
const PROBE_SRCH = '[data-print-probe="srch"]';
const PROBE_TABLE = '[data-print-probe="table"]';

const ROWS = 24;
const SCROLLER_MAX_H = 180;

async function openDashboard(page: Page) {
  await bootstrapApp(page);
  await page.goto('/dashboard');
  await page.waitForSelector('#p-dashboard', { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
}

async function mountModalHarness(page: Page) {
  await page.evaluate(
    ({ rows, maxH }) => {
      const host = document.querySelector<HTMLElement>('#p-dashboard');
      if (!host) throw new Error('#p-dashboard not found');

      let probe = document.querySelector<HTMLElement>('[data-print-probe="page"]');
      if (!probe) {
        probe = document.createElement('div');
        probe.setAttribute('data-print-probe', 'page');
        probe.textContent = 'PAGE-CONTENT-MARKER';
        probe.style.cssText = 'padding:8px;background:#eef';
        host.prepend(probe);
      }

      const ov = document.createElement('div');
      ov.className = 'ov on';
      ov.setAttribute('data-print-probe', 'overlay');
      // Modal is inline (no portal) and the overlay itself is positioned.
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.45)';
      ov.innerHTML = `
        <div class="modal" data-print-probe="modal"
             style="width:640px;height:420px;max-width:640px;max-height:420px">
          <div class="m-hd" data-print-probe="head">
            <div><div class="m-title">Transaction history</div></div>
            <div class="m-x" data-print-probe="close">
              <span class="ic ic-xs"><i class="ti ti-x"></i></span>
            </div>
          </div>
          <div class="m-body" data-print-probe="body"
               style="flex:1 1 auto;min-height:0;height:300px">
            <div data-print-probe="scroller" style="max-height:${maxH}px;overflow-y:auto">
              ${Array.from({ length: rows }, (_, i) => `<div data-print-probe="row">row ${i + 1}</div>`).join('')}
            </div>
            <div class="print-only" data-print-probe="print-only" style="display:none">PRINT-ONLY-MARKER</div>
            <div>
              <button class="btn" data-print-probe="ref-btn">ref 12345</button>
              <button class="btn" data-print-probe="icon-btn"><i class="ti ti-arrows-maximize"></i></button>
              <button class="btn no-print" data-print-probe="noprint-btn">NO-PRINT</button>
              <div class="srch" data-print-probe="srch"><input class="srch-inp" /></div>
            </div>
            <table data-print-probe="table">
              <thead><tr><th>ref</th><th>amount</th></tr></thead>
              <tbody>
                ${Array.from({ length: 6 }, (_, i) => `<tr><td>row ${i + 1}</td><td>${100 * (i + 1)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="m-foot" data-print-probe="foot">
            <button class="btn btn-p" data-print-probe="foot-btn">close</button>
          </div>
          <div class="modal-resize-handle" data-print-probe="handle">
            <i class="ti ti-grip-vertical"></i>
          </div>
        </div>`;
      host.appendChild(ov);

      // Reproduce an OPEN sidebar deterministically. `#main` normally gets
      // `margin-right: var(--sb)` from layout.css:222; forcing the same computed
      // value inline makes the print assertion independent of the sidebar's
      // persisted open/closed state. The print reset at theme.css:1519 is
      // `!important` inside `@layer components`, and a layered important
      // declaration beats an UNLAYERED non-important one -- so this inline value
      // must be zeroed by print, exactly as a real open sidebar would be.
      const main = document.querySelector('#main');
      if (main) (main as HTMLElement).style.marginRight = '248px';
    },
    { rows: ROWS, maxH: SCROLLER_MAX_H },
  );
}

const marginRight = (page: Page) =>
  page.locator('#main').evaluate((el) => getComputedStyle(el).marginRight);

const disp = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => getComputedStyle(el).display);

/** Overflow clipping of the inner scroller, in px. >0 means content is cut off. */
const clipped = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => el.scrollHeight - el.clientHeight);

test.describe('MODAL - PRINT ISOLATION', () => {
  test('control: with no overlay open the page prints normally', async ({ page }) => {
    await openDashboard(page);

    // Negative control for the whole suite: the isolation gate is keyed on an open
    // overlay. Without this test a blanket print kill would look green.
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#p-dashboard'), 'page should print when no modal is open').toBeVisible();
    await expect(page.locator('#sidebar'), 'sidebar chrome stays hidden').toBeHidden();
    await expect(page.locator('#topbar'), 'topbar chrome stays hidden').toBeHidden();
  });

  test('open overlay isolates the sheet to the modal body', async ({ page }) => {
    await openDashboard(page);
    await mountModalHarness(page);

    // Negative control: everything below must be VISIBLE on screen, so a "passing"
    // print assertion cannot come from a node that was already hidden.
    await expect(page.locator(PROBE_PAGE)).toBeVisible();
    await expect(page.locator(PROBE_MODAL)).toBeVisible();
    await expect(page.locator(PROBE_REF_BTN)).toBeVisible();
    await expect(page.locator(PROBE_ICON_BTN)).toBeVisible();
    await expect(page.locator(PROBE_NOPRINT_BTN)).toBeVisible();
    await expect(page.locator(PROBE_SRCH)).toBeVisible();
    // `.print-only` carries inline `display:none` -- visible ONLY under print.
    await expect(page.locator(PROBE_PRINT_ONLY)).toBeHidden();
    // The scroller really does clip on screen (this is what print must undo).
    expect(await clipped(page, PROBE_SCROLLER)).toBeGreaterThan(40);

    await page.emulateMedia({ media: 'print' });

    // The page behind the overlay is gone; the overlay itself survives.
    await expect(page.locator(PROBE_PAGE), 'page content behind the modal must not print').toBeHidden();
    await expect(page.locator(PROBE_OVERLAY), 'the overlay is the print root').toBeVisible();
    await expect(page.locator(PROBE_MODAL), 'the open modal must print').toBeVisible();
    await expect(page.locator(PROBE_ROW).last(), 'rows below the screen fold must print').toBeVisible();
    await expect(page.locator(PROBE_TABLE), 'tables inside the modal must print').toBeVisible();
  });

  test('modal chrome is dropped, body content is kept', async ({ page }) => {
    await openDashboard(page);
    await mountModalHarness(page);
    await page.emulateMedia({ media: 'print' });

    // Header / footer / close / resize handle are UI, not document content.
    for (const sel of ['[data-print-probe="head"]', '[data-print-probe="foot"]', '.m-x', '.modal-resize-handle']) {
      await expect(page.locator(sel), `${sel} must not print`).toBeHidden();
    }

    // `.print-only` is inline `display:none` on screen and is the one thing the
    // print block must reveal (TransactionHistoryModal.tsx:592).
    await expect(page.locator(PROBE_PRINT_ONLY), '.print-only must print').toBeVisible();

    // Text/content buttons print; icon-only and no-print controls do not.
    // `.ref-btn` is a plain text button with no icon -- the exact shape of the
    // reference buttons at TransactionHistoryModal.tsx:125 and :830.
    await expect(page.locator(PROBE_REF_BTN), 'text reference button must print').toBeVisible();
    await expect(page.locator(PROBE_ICON_BTN), 'icon-only button must not print').toBeHidden();
    await expect(page.locator(PROBE_NOPRINT_BTN), '.no-print button must not print').toBeHidden();
    await expect(page.locator(PROBE_SRCH), 'search chrome must not print').toBeHidden();

    // Table header repeats on every sheet (pages.css §6).
    await expect
      .poll(() => disp(page, `${PROBE_TABLE} thead`))
      .toBe('table-header-group');
  });

  test('modal geometry is normalized and inner scrolling is removed', async ({ page }) => {
    await openDashboard(page);
    await mountModalHarness(page);

    const screenClipped = await clipped(page, PROBE_SCROLLER);
    expect(screenClipped, 'scroller must clip on screen for this test to mean anything').toBeGreaterThan(40);

    await page.emulateMedia({ media: 'print' });

    // `position: fixed` + inline width/height would place the modal in the
    // viewport box and cut it to one sheet.
    await expect
      .poll(() => page.locator(PROBE_MODAL).evaluate((el) => getComputedStyle(el).position))
      .toBe('static');
    await expect
      .poll(() => disp(page, PROBE_MODAL))
      .toBe('block');
    await expect
      .poll(() => page.locator(PROBE_MODAL).evaluate((el) => getComputedStyle(el).maxHeight))
      .toBe('none');

    // Scrolling: the inline `max-height`/`overflow` scroller must stop clipping,
    // and `.m-body` must stop being an inline `flex:1` box.
    await expect
      .poll(() => page.locator(PROBE_SCROLLER).evaluate((el) => getComputedStyle(el).overflowY))
      .toBe('visible');
    await expect
      .poll(() => page.locator(PROBE_SCROLLER).evaluate((el) => getComputedStyle(el).maxHeight))
      .toBe('none');
    await expect
      .poll(() => clipped(page, PROBE_SCROLLER))
      .toBeLessThanOrEqual(1);
    await expect
      .poll(() => page.locator(PROBE_BODY).evaluate((el) => getComputedStyle(el).overflowY))
      .toBe('visible');
    await expect
      .poll(() => page.locator(PROBE_BODY).evaluate((el) => getComputedStyle(el).flex))
      .toBe('0 0 auto');

    // The layout shell must not push the sheet sideways: `#main` normally carries
    // `margin-right: var(--sb)` to clear the sidebar (layout.css:222), which would
    // indent the modal by a full sidebar width in print. The harness forces that
    // margin inline, so the print reset is proven against a real sidebar offset.
    await expect
      .poll(() => marginRight(page), 'open-sidebar margin must be reset for print')
      .toBe('0px');
    await expect
      .poll(() => page.locator('#main').evaluate((el) => el.getBoundingClientRect().left))
      .toBeLessThan(1);
  });

  test('the sheet is a real, non-empty PDF', async ({ page }) => {
    await openDashboard(page);
    await mountModalHarness(page);
    await page.emulateMedia({ media: 'print' });

    let pdf: Buffer;
    try {
      pdf = await page.pdf({ format: 'A4', printBackground: true });
    } catch (e) {
      test.skip(true, `PDF rendering unavailable in this browser: ${(e as Error).message}`);
      return;
    }
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
