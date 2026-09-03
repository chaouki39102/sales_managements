import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

// Regression: the doc-editor rail's "تخصيص الشريط" (manage) button must be
// clickable at every breakpoint and the customize overlay must always render
// above all elements (full viewport, position:fixed).
//
// On mobile (<=720px) the generic `.pp-rail` rule pins the rail to the bottom
// (bottom:0, z-index:40) which used to put it under the app's #mob-nav
// (z-index:9999, height var(--mb)) — the manage button was unclickable. The
// `.doc-rail { bottom: var(--mb) }` scoped override lifts it above the nav.
test.describe('DOC EDITOR RAIL CUSTOMIZE OVERLAY', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapApp(page);
    await page.route('**/api/v1/demo/document-types*', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 1, name: 'فاتورة', code: 'FV', description: '', base_operation_id: 1, affects_stock_direction: -1, requires_party: true, affects_accounting: true, is_printable: true, display_order: 1, active: true }] }),
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

  // desktop/tablet/narrow/mobile — the whole responsive range the editor supports
  for (const W of [1440, 1280, 1100, 900, 390]) {
    test(`manage button clickable + overlay above everything @${W}`, async ({ page }) => {
      await page.setViewportSize({ width: W, height: 800 });
      await page.goto('/documents/FV/new');
      await page.waitForSelector('#doc-party-select', { timeout: 15000 });
      await page.waitForTimeout(400);

      // Must not time out (was intercepted by #mob-nav on mobile before the fix)
      await page.click('.pp-rail-manage');
      await page.waitForSelector('.ov.on', { timeout: 5000 });
      await page.waitForTimeout(150);

      const geo = await page.evaluate(() => {
        const ov = document.querySelector('.ov.on') as HTMLElement;
        const r = ov.getBoundingClientRect();
        const cs = getComputedStyle(ov);
        let blocker: string | null = null;
        const ancestors: Array<{ cls: string; transform: string; filter: string; willChange: string; contain: string; perspective: string; backdrop: string }> = [];
        let el: HTMLElement | null = ov.parentElement;
        while (el && el !== document.body) {
          const s = getComputedStyle(el);
          const suspicious = s.transform !== 'none' || s.filter !== 'none' || s.willChange !== 'auto' || s.contain !== 'none' || s.perspective !== 'none' || s.backdropFilter !== 'none';
          if (suspicious) blocker = el.className?.toString?.() || el.tagName;
          ancestors.push({ cls: el.className?.toString?.() || el.tagName, transform: s.transform, filter: s.filter, willChange: s.willChange, contain: s.contain, perspective: s.perspective, backdrop: s.backdropFilter });
          el = el.parentElement;
        }
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        return { vw, vh, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left), position: cs.position, blocker, ancestors };
      });

      // Overlay must cover the full viewport so nothing (sidebar/bottom-nav) is above it
      expect(geo.position).toBe('fixed');
      expect(geo.w).toBeGreaterThanOrEqual(geo.vw - 2);
      expect(geo.h).toBeGreaterThanOrEqual(geo.vh - 2);
      expect(geo.top).toBeLessThanOrEqual(1);
      expect(geo.left).toBeLessThanOrEqual(1);
      // No ancestor that would act as a fixed containing block (which could clip it)
      expect(geo.blocker).toBeNull();
      expect(geo.ancestors.length).toBeGreaterThan(0);
    });
  }
});
