import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

// Regression: the doc-editor party-card avatar circle + ring (46px with a 3.5px
// box-shadow ring) must be fully visible in the rendered editor. It was previously
// clipped at .doc-party-card overflow:hidden / .doc-party-scroll overflow-y:auto,
// so the user saw a partially-cut circle on the customer card.
//
// This spec renders the real editor at /documents/FV/new (mocked lookups), then
// walks the avatar's clipping ancestors and asserts NONE cuts the painted ring.
test.describe('Doc editor party-card avatar visibility', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapApp(page);

    await page.route('**/api/v1/demo/document-types*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 1, name: 'فـاتـورة مبيعات', code: 'FV', description: '',
            base_operation_id: 1, affects_stock_direction: -1,
            requires_party: true, affects_accounting: true,
            is_printable: true, display_order: 1, active: true,
          }],
        }),
      });
    });
    await page.route('**/api/v1/demo/warehouses*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 1, name: 'المستودع الرئيسي', is_default: true }] }) });
    });
    await page.route('**/api/v1/demo/currencies*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 1, name: 'دينار جزائري', code: 'DZD', is_base_currency: true }] }) });
    });
    await page.route('**/api/v1/demo/price-levels*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 1, name: 'التجزئة', is_default: true }] }) });
    });
    await page.route('**/api/v1/demo/customers*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 1, name: 'زبون اختبار', code: 'C1', nif: '099916012145905' }] }) });
    });
  });

  test('avatar circle + box-shadow ring not cut by any clipping ancestor', async ({ page }) => {
    await page.goto('/documents/FV/new');

    const avatar = page.locator('#doc-party-select');
    await expect(avatar).toBeVisible();
    await page.waitForTimeout(300);

    const geo = await avatar.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);

      // Largest box-shadow spread = the ring width beyond the circle edges.
      const spread = cs.boxShadow
        .split(', color(')
        .map((s) => {
          const m = s.match(/0px 0px 0px (\d+(?:\.\d+)?)px/);
          return m ? parseFloat(m[1]) : 0;
        })
        .reduce((a, b) => Math.max(a, b), 0);
      const pad = (spread || 5.5) + 1;
      const ringTop = r.top - pad;
      const ringBottom = r.bottom + pad;

      // Walk ancestors of the avatar (skip the avatar itself: its own overflow
      // clips the inner image to the circle and never affects the ring drawn
      // outside via box-shadow). Flag any clipping container that cuts the ring.
      const cuts: string[] = [];
      let node: Element | null = el.parentElement;
      while (node && node.tagName !== 'BODY') {
        const s = getComputedStyle(node);
        if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
          const br = node.getBoundingClientRect();
          if (ringTop < br.top || ringBottom > br.bottom) {
            const cls = (node.className && typeof node.className === 'string') ? node.className : node.tagName;
            cuts.push(`${node.tagName}.${cls}`);
          }
        }
        node = node.parentElement;
      }

      return {
        width: r.width, height: r.height,
        boxShadow: cs.boxShadow,
        spread,
        cuts,
        scrollPaddingTop: document.querySelector('.doc-party-scroll')
          ? getComputedStyle(document.querySelector('.doc-party-scroll') as Element).paddingTop
          : null,
      };
    });

    // The circle is 46×46.
    expect(geo.width).toBeGreaterThanOrEqual(44);
    expect(geo.height).toBeGreaterThanOrEqual(44);
    // A ring must be present (the thing that was being clipped).
    expect(geo.boxShadow).not.toBe('none');
    expect(geo.spread).toBeGreaterThan(0);
    // The scroll container must reserve ≥ ring padding above the avatar.
    expect(parseFloat(geo.scrollPaddingTop ?? '0')).toBeGreaterThanOrEqual(geo.spread);
    // No ancestor may cut into the painted ring.
    expect(geo.cuts).toEqual([]);
  });
});
