import type { ApiClient } from '../contracts/ApiClient';

export const DB_KEY_DOC_CONFIGS = 'print:doc_configs';

/** Save document configs */
export async function dbSaveDocConfigs(api: ApiClient, configs: Record<string, unknown>[]): Promise<void> {
  await api.patch('/settings', { [DB_KEY_DOC_CONFIGS]: JSON.stringify(configs) });
}

/** Fetch document configs */
export async function dbFetchDocConfigs(api: ApiClient): Promise<Record<string, unknown>[]> {
  try {
    const res = await api.get<Record<string, unknown>>(`/settings/${DB_KEY_DOC_CONFIGS}`);
    const raw = (res as Record<string, unknown>)?.value ?? ((res as Record<string, unknown>)?.data as Record<string, unknown>)?.value ?? null;
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown>[] : raw as Record<string, unknown>[];
  } catch {
    return [];
  }
}
