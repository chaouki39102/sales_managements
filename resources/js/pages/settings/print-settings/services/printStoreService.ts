import { apiPatch, apiGet } from '@/lib/api/core/client';
import type { ReceiptTemplate80mm, PaperSize } from '../types';
import { defaultTemplate } from '../types';

export const DB_KEY_TEMPLATES   = 'print:templates';
export const DB_KEY_DOC_CONFIGS = 'print:doc_configs';

export const tplKey = (docCode: string, size: PaperSize) => `${docCode}_${size}`;

/** Fetch all templates from DB as dictionary */
export async function dbFetchTemplates(): Promise<Record<string, ReceiptTemplate80mm>> {
  try {
    const res = await apiGet<{ value: string | object }>(`/settings/${DB_KEY_TEMPLATES}`);
    const raw = (res as any)?.value ?? (res as any)?.data?.value ?? null;
    if (!raw) return {};
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed as Record<string, ReceiptTemplate80mm>;
  } catch {
    return {};
  }
}

/** Fetch single document template */
export async function dbFetchTemplate(
  docCode: string, size: PaperSize,
): Promise<ReceiptTemplate80mm> {
  const all = await dbFetchTemplates();
  const key = tplKey(docCode, size);
  return all[key] ? { ...defaultTemplate(), ...all[key] } : defaultTemplate();
}

/** Save one template into DB — merges with existing templates */
export async function dbSaveTemplate(
  docCode: string, size: PaperSize, template: ReceiptTemplate80mm,
): Promise<void> {
  const all = await dbFetchTemplates();
  const key = tplKey(docCode, size);
  all[key]  = template;
  await apiPatch('/settings', { [DB_KEY_TEMPLATES]: JSON.stringify(all) });
}

/** Copy template from one doc type to another (same paper size) */
export async function dbCopyTemplate(
  sourceCode: string, targetCode: string, size: PaperSize,
): Promise<void> {
  const all       = await dbFetchTemplates();
  const sourceKey = tplKey(sourceCode, size);
  const targetKey = tplKey(targetCode, size);
  if (!all[sourceKey]) throw new Error(`لا يوجد قالب لـ ${sourceCode}`);
  all[targetKey] = { ...all[sourceKey] };
  await apiPatch('/settings', { [DB_KEY_TEMPLATES]: JSON.stringify(all) });
}

/** Save document configs */
export async function dbSaveDocConfigs(configs: any[]): Promise<void> {
  await apiPatch('/settings', { [DB_KEY_DOC_CONFIGS]: JSON.stringify(configs) });
}

/** Fetch document configs */
export async function dbFetchDocConfigs(): Promise<any[]> {
  try {
    const res = await apiGet<{ value: string | object }>(`/settings/${DB_KEY_DOC_CONFIGS}`);
    const raw = (res as any)?.value ?? (res as any)?.data?.value ?? null;
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}
