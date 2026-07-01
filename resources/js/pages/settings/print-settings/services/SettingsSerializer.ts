import type { DocTypeCode, PaperSize, PrintTemplate } from '../types/domain';
import { SETTINGS_REGISTRY } from './SettingsRegistry';

export const TEMPLATE_VERSION = 2;

const SETTING_CONFIG_KEYS = new Set(Object.keys(SETTINGS_REGISTRY));

const TOP_LEVEL_KEYS = new Set([
  'id', 'name', 'doc_type_code', 'paper_size', 'is_default', 'is_active',
  'template_version', 'created_at', 'updated_at',
]);

export interface TemplatePayload {
  name: string;
  doc_type_code: string;
  paper_size: string;
  is_default: boolean;
  is_active: boolean;
  template_version?: number;
  config: Record<string, unknown>;
}

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
 * Normalize a partial template: fill missing fields from registry defaults,
 * preserve valid values, add template_version, keep unknown fields.
 *
 * IMPORTANT: DB values are ALWAYS preserved. Only truly undefined keys
 * (schema migration, new registry entries) get their defaults.
 * Null, false, 0, '' are all treated as valid DB values and preserved.
 */
export function normalizeTemplate(
  partial: Partial<PrintTemplate>,
  docType?: DocTypeCode,
  paperSize?: PaperSize,
): PrintTemplate {
  const doc   = docType   ?? partial.doc_type_code ?? 'FV' as DocTypeCode;
  const paper = paperSize ?? partial.paper_size    ?? '80mm' as PaperSize;

  const result: Record<string, unknown> = {
    ...partial,
    template_version: TEMPLATE_VERSION,
  };

  // Fill only keys that are truly missing (undefined) — never overwrite DB values
  for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
    if (key === 'id' || key === 'name' || key === 'doc_type_code' || key === 'paper_size') continue;
    const metaKey = meta.key as string;
    if (key in result && result[metaKey] !== undefined) continue;
    // Key is missing from DB result — fill with registry default
    if (meta.defaultValue !== null) {
      result[metaKey] = meta.defaultValue;
    } else {
      const t = typeof meta.defaultValue;
      if (t === 'string') result[metaKey] = '';
      else if (t === 'number') result[metaKey] = 0;
      else if (t === 'boolean') result[metaKey] = false;
      else if (Array.isArray(meta.defaultValue)) result[metaKey] = [];
      else result[metaKey] = null;
    }
  }

  if (typeof result.name !== 'string' || !result.name) result.name = 'قالب جديد';
  if (!result.doc_type_code) result.doc_type_code = doc;
  if (!result.paper_size) result.paper_size = paper;

  if (result.paper_size === '80mm') { (result as any).paper_width_mm = 80; }
  else if (result.paper_size === '58mm') { (result as any).paper_width_mm = 58; }

  return result as unknown as PrintTemplate;
}

/**
 * Build API payload from a partial template.
 *
 * CRITICAL RULE: Only top-level fields (name, doc_type_code, paper_size,
 * is_default, is_active) that are EXPLICITLY PRESENT in the input are included.
 * Missing top-level fields are OMITTED so the server preserves existing values.
 *
 * This prevents partial updates like `{ is_active: false }` from destroying
 * `name`, `doc_type_code`, `paper_size`, `is_default` with defaults.
 *
 * For CREATE (full template input): all fields are present → all included.
 * For UPDATE (partial input): only changed fields are sent.
 *
 * Config is omitted when empty → server preserves stored config on partial updates.
 */
export function toApiPayload(tpl: Partial<PrintTemplate>): Record<string, unknown> {
  const t = tpl as Record<string, unknown>;
  const config: Record<string, unknown> = {};
  for (const key of Object.keys(t)) {
    if (!TOP_LEVEL_KEYS.has(key) && SETTING_CONFIG_KEYS.has(key)) {
      config[key] = t[key];
    }
  }
  const hasSettings = Object.keys(config).length > 0;
  const result: Record<string, unknown> = { template_version: TEMPLATE_VERSION };
  // Only include top-level fields explicitly present in input
  for (const key of (['name', 'doc_type_code', 'paper_size', 'is_default', 'is_active'] as const)) {
    if (key in t) result[key] = t[key];
  }
  if (hasSettings) result.config = config;
  return result;
}

/**
 * Reconstruct PrintTemplate from API response — top-level fields + config merge.
 *
 * DESIGN: The database is the ONLY source of truth. Config keys from the API
 * response are merged directly. normalizeTemplate is NOT called — DB values
 * are never overwritten. If a key is missing from the DB (schema migration),
 * it remains undefined here; the first full save fills all registry keys.
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
  return result as unknown as PrintTemplate;
}

/**
 * Fill missing registry keys with defaults (for new templates or migration).
 * Only undefined keys are set — never overwrites DB values.
 */
export function normalizeAfterLoad(tpl: Partial<PrintTemplate>): PrintTemplate {
  const result: Record<string, unknown> = { ...tpl, template_version: TEMPLATE_VERSION };
  for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
    if (key === 'id' || key === 'name' || key === 'doc_type_code' || key === 'paper_size') continue;
    const metaKey = meta.key as string;
    if (key in result && result[metaKey] !== undefined) continue;
    if (meta.defaultValue !== null) {
      result[metaKey] = meta.defaultValue;
    } else {
      const t = typeof meta.defaultValue;
      if (t === 'string') result[metaKey] = '';
      else if (t === 'number') result[metaKey] = 0;
      else if (t === 'boolean') result[metaKey] = false;
      else if (Array.isArray(meta.defaultValue)) result[metaKey] = [];
      else result[metaKey] = null;
    }
  }
  if (typeof result.name !== 'string' || !result.name) result.name = 'قالب جديد';
  if (!result.doc_type_code) result.doc_type_code = (tpl.doc_type_code ?? 'FV') as DocTypeCode;
  if (!result.paper_size) result.paper_size = (tpl.paper_size ?? '80mm') as PaperSize;
  if (result.paper_size === '80mm') (result as any).paper_width_mm = 80;
  else if (result.paper_size === '58mm') (result as any).paper_width_mm = 58;
  return result as unknown as PrintTemplate;
}

/**
 * Verify that all registry keys are present in a loaded template.
 * Logs warnings for missing keys (would be overwritten by defaults).
 * Returns the count of missing keys.
 */
export function validateTemplateIntegrity(tpl: Partial<PrintTemplate>, label?: string): number {
  const missing: string[] = [];
  for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
    const val = (tpl as any)[key];
    if (val === undefined || val === null) {
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


