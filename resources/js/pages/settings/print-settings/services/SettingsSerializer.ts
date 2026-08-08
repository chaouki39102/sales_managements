import type { DocTypeCode, PaperSize, PrintTemplate } from '../types/domain';
import { SETTINGS_REGISTRY } from './SettingsRegistry';
import { ensureLayoutFields } from './layoutMigration';

export const TEMPLATE_VERSION = 2;

const TOP_LEVEL_KEYS = new Set([
  'id', 'name', 'doc_type_code', 'paper_size', 'is_default', 'is_active',
  'template_version', 'created_at', 'updated_at',
]);

export interface ApiResponse {
  id: number;
  name: string;
  doc_type_code: string;
  paper_size: string;
  is_default: boolean;
  is_active: boolean;
  template_version?: number;
  created_at?: string;
  updated_at?: string;
  config?: Record<string, unknown> | null;
}

/**
 * Build API payload from a template.
 *
 * All settings keys from the input are collected into config.
 * Top-level fields (name, doc_type_code, etc.) are sent at the top level.
 * The ENTIRE config is always sent — the DB must be the complete source of truth.
 */
export function toApiPayload(tpl: Partial<PrintTemplate>): Record<string, unknown> {
  const t = tpl as Record<string, unknown>;
  const config: Record<string, unknown> = {};
  for (const key of Object.keys(t)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      config[key] = t[key];
    }
  }
  delete config.template_version;
  const result: Record<string, unknown> = { template_version: TEMPLATE_VERSION };
  for (const key of (['name', 'doc_type_code', 'paper_size', 'is_default', 'is_active'] as const)) {
    if (key in t) result[key] = t[key];
  }
  result.config = config;
  return result;
}

/**
 * Reconstruct PrintTemplate from API response.
 *
 * DESIGN: The database is the primary source of truth.
 * Config keys from the API response are merged directly.
 * Missing keys (from SETTINGS_REGISTRY) are filled with registry defaults,
 * ensuring old templates survive new settings added after their creation.
 * Layout fields (totals_rows, footer_rows, etc.) are populated by ensureLayoutFields().
 */
export function fromApiResponse(r: ApiResponse): PrintTemplate {
  const result: Record<string, unknown> = {
    id:              r.id,
    name:            r.name,
    doc_type_code:   r.doc_type_code as DocTypeCode,
    paper_size:      r.paper_size as PaperSize,
    is_default:      r.is_default,
    is_active:       r.is_active,
    created_at:      r.created_at,
    updated_at:      r.updated_at,
    template_version: r.template_version ?? TEMPLATE_VERSION,
  };
  const config = r.config ?? {};
  for (const key of Object.keys(config)) {
    result[key] = (config as any)[key];
  }
  for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
    if (!(key in result)) {
      const docSpecific = meta.docDefaults ? (meta.docDefaults as Record<string, unknown>)[r.doc_type_code] : undefined;
      result[key] = docSpecific !== undefined ? docSpecific : meta.defaultValue;
    }
  }
  return ensureLayoutFields(result as unknown as PrintTemplate);
}

/**
 * Verify that all registry keys are present in a loaded template.
 * Logs warnings for missing keys.
 * Returns the count of missing keys.
 */
export function validateTemplateIntegrity(tpl: Partial<PrintTemplate>, label?: string): number {
  const missing: string[] = [];
  for (const [key, _meta] of Object.entries(SETTINGS_REGISTRY)) {
    const val = (tpl as any)[key];
    if (val === undefined) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.warn(
      `[SettingsSerializer] Template integrity check FAILED${label ? ` (${label})` : ''}: ` +
      `${missing.length} keys missing: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? `... (+${missing.length - 10} more)` : ''}`,
    );
  }
  return missing.length;
}


