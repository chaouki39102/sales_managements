import { test, expect } from '@playwright/test';

/**
 * Official PDF export (upgrade 1 task 1.4) — end-to-end against the REAL
 * backend (dev server on :8000, company 1). Seeded auth token grants a tenant
 * session; the invoices list (`/documents/FV`) row-action «طباعة» opens
 * TemplatePrintModal for the full document, and the modal's PDF button exports
 * `{document_number}.pdf` via the client-side dompdf.js engine (WASM inlined).
 *
 * Requires a live seeded token (created with the tinker one-liner in the
 * phase notes) and a real FV document (FV-2026-000001) in company 1.
 */
const FV_NUMBER = 'FV-2026-000001';
const SLUG = 'el-houda-emballage-6a7ae911e0aab';

test.describe('Official PDF export', () => {
  test('invoices list → TemplatePrintModal → PDF download named {number}.pdf', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(([slug]) => {
      window.localStorage.setItem('auth_token', '10|pJjKE3oqym4zNLiq7fJgPbMGMHPrDBrsNlHTt4b603813dca');
      window.sessionStorage.setItem('app-store', JSON.stringify({
        state: {
          activeCompany: { id: 1, name: 'test', slug },
          selectedYearId: 1,
          sidebarCollapsed: false,
          theme: 'light',
        },
        version: 0,
      }));
    }, [SLUG]);

    // The invoices list is a real tenant route — NOT a fake deep-link.
    await page.goto('/documents/FV');
    await page.waitForTimeout(1500);

    // Locate the row for FV-2026-000001 and use its per-row «طباعة» action
    // (opens TemplatePrintModal directly with the full document).
    const row = page.locator('tr', { hasText: FV_NUMBER }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    const printBtn = row.locator('button[title="طباعة"]');
    await printBtn.click();

    await expect(page.getByText('طباعة حسب القالب')).toBeVisible({ timeout: 10000 });

    // The PDF button lives in the modal footer.
    const downloadPromise = page.waitForEvent('download');
    const pdfBtn = page.getByRole('button', { name: /PDF/ });
    await expect(pdfBtn).toBeVisible();
    await pdfBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`${FV_NUMBER}.pdf`);

    const path = await download.path();
    const fs = await import('node:fs');
    const head = fs.readFileSync(path as unknown as string).subarray(0, 5).toString();
    expect(head).toBe('%PDF-');

    // The exported PDF is a real rendered document (non-trivial size).
    const size = fs.statSync(path as unknown as string).size;
    expect(size).toBeGreaterThan(5000);
  });
});
