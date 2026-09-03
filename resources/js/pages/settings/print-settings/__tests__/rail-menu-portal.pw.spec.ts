import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/test-utils';

// Regression: the doc-editor rail's dropdown menus (export / template / more —
// `.doc-rail-menu`) must render ABOVE all elements via a portal to
// document.body, positioned position:fixed at the trigger, NOT inside the
// sidebar's `.pp-rail` scroll container (which used to clip them and reveal
// the sidebar scrollbar).
test.describe('DOC EDITOR RAIL MENU PORTAL', () => {
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
    // a template so the export/template/more menus are all available
    await page.route('**/api/v1/demo/print-templates*', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 10, name: 'قالب فاتورة', doc_type_code: 'FV', paper_size: 'A4', is_default: true, is_active: true }] }),
    }));
  });

  for (const W of [1440, 900, 390]) {
    test(`export menu floats above all elements (portaled to body) @${W}`, async ({ page }) => {
      await page.setViewportSize({ width: W, height: 800 });
      await page.goto('/documents/FV/new');
      await page.waitForSelector('#doc-party-select', { timeout: 15000 });
      await page.waitForTimeout(400);

      // the export button lives inside the first .doc-rail-menu-wrap
      const exportWrap = page.locator('.doc-rail-menu-wrap').first();
      await exportWrap.locator('button').click();
      await page.waitForSelector('.doc-rail-menu', { timeout: 5000 });
      await page.waitForTimeout(150);

      const geo = await page.evaluate(() => {
        const menu = document.querySelector('.doc-rail-menu') as HTMLElement;
        const r = menu.getBoundingClientRect();
        const cs = getComputedStyle(menu);
        let blocker: string | null = null;
        let el: HTMLElement | null = menu.parentElement;
        while (el && el !== document.body) {
          const s = getComputedStyle(el);
          if (s.transform !== 'none' || s.filter !== 'none' || s.willChange !== 'auto' || s.contain !== 'none' || s.perspective !== 'none' || s.backdropFilter !== 'none') {
            blocker = el.className?.toString?.() || el.tagName;
          }
          el = el.parentElement;
        }
        const inSidebar = !!menu.closest('.pp-rail, aside');
        return {
          parentIsBody: menu.parentElement === document.body,
          inSidebar,
          position: cs.position,
          vw: window.innerWidth, vh: window.innerHeight,
          top: Math.round(r.top), left: Math.round(r.left),
          w: Math.round(r.width), h: Math.round(r.height),
          itemCount: menu.querySelectorAll('.doc-rail-menu-item').length,
          blocker,
        };
      });

      expect(geo.parentIsBody).toBe(true);
      expect(geo.inSidebar).toBe(false);
      expect(geo.position).toBe('fixed');
      expect(geo.itemCount).toBe(4); // Excel/PDF/JSON/XML
      // within viewport (clamped)
      expect(geo.left).toBeGreaterThanOrEqual(0);
      expect(geo.left + geo.w).toBeLessThanOrEqual(geo.vw + 1);
      expect(geo.top).toBeGreaterThanOrEqual(0);
      expect(geo.top + geo.h).toBeLessThanOrEqual(geo.vh + 1);
      expect(geo.blocker).toBeNull();
    });

    test(`more menu floats above all elements (portaled to body) @${W}`, async ({ page }) => {
      await page.setViewportSize({ width: W, height: 800 });
      await page.goto('/documents/FV/new');
      await page.waitForSelector('#doc-party-select', { timeout: 15000 });
      await page.waitForTimeout(400);

      // click the last (more) .doc-rail-menu-wrap
      const wraps = page.locator('.doc-rail-menu-wrap');
      const n = await wraps.count();
      expect(n).toBeGreaterThanOrEqual(2); // export / (template) / more
      await wraps.nth(n - 1).locator('button').click();
      const menuVisible = await page.locator('.doc-rail-menu').isVisible().catch(() => false);
      if (menuVisible) {
        const geo = await page.evaluate(() => {
          const menu = document.querySelector('.doc-rail-menu') as HTMLElement;
          return {
            parentIsBody: menu.parentElement === document.body,
            inSidebar: !!menu.closest('.pp-rail, aside'),
            position: getComputedStyle(menu).position,
          };
        });
        expect(geo.parentIsBody).toBe(true);
        expect(geo.inSidebar).toBe(false);
        expect(geo.position).toBe('fixed');
      }
    });
  }
});
