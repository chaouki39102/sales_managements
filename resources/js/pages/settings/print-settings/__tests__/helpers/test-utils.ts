import { Page } from '@playwright/test';
import { SETTINGS_REGISTRY } from '../../services/SettingsRegistry';

export function getRegistryKeys(): string[] {
  return Object.keys(SETTINGS_REGISTRY).filter(k =>
    !['id', 'name', 'doc_type_code', 'paper_size', 'template_version', 'created_at', 'updated_at'].includes(k)
  );
}

export function getToggleKeys(): string[] {
  return Object.entries(SETTINGS_REGISTRY)
    .filter(([, m]) => m.component === 'toggle')
    .map(([k]) => k);
}

export function getInputKeys(): string[] {
  return Object.entries(SETTINGS_REGISTRY)
    .filter(([, m]) => ['input', 'textarea', 'color'].includes(m.component))
    .map(([k]) => k);
}

export async function mockApiResponse(page: Page, templateOverrides: Record<string, any> = {}, status = 200) {
  await page.route('**/api/v1/print-templates/**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1,
            name: 'Test Template',
            doc_type_code: templateOverrides.doc_type_code || 'FV',
            paper_size: templateOverrides.paper_size || '80mm',
            is_default: true,
            is_active: true,
            template_version: 2,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            config: { ...templateOverrides, ...templateOverrides.config },
          },
        }),
      });
    } else if (route.request().method() === 'PUT') {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      route.fulfill({ status: 404 });
    }
  });
}

export async function mockTemplatesList(page: Page, templates: any[] = []) {
  await page.route('**/api/v1/print-templates*', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: templates }),
      });
    } else {
      route.continue();
    }
  });
}

export async function navigateToPrintSettings(page: Page, docType = 'FV') {
  await page.goto(`/settings/print-settings?doc_type=${docType}`);
  await page.waitForLoadState('networkidle');
}
