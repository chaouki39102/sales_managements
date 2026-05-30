// ════════════════════════════════════════════════════════════════════════════
// lib/api/endpoints/settings.ts — النسخة المُصلحة والمكتملة
//
// الإصلاحات:
// ① settingsApi.list()    → يُرجع dict، نُحوِّله لـ array داخلياً
// ② settingsApi.byGroup() → يُرجع array من objects مباشرة (صحيح)
// ③ settingsApi.update()  → PATCH (لا fallback لـ POST — الـ backend يدعمه)
// ④ useSettingsByGroup()  → hook متخصص يُرجع array (ما يتوقعه SettingsPage)
// ⑤ gs() helper          → آمن مع أي صيغة response
// ════════════════════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../core/client';
import { tenantKeys } from '../core/queryKeys';
import { useActiveSlug } from '../../store/appStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Setting {
  key:         string;
  value:       unknown;
  group:       string;
  type?:       string;
  is_editable?: boolean;
  updated_at?: string;
}

/** الصيغة التي يُرجعها GET /settings (dictionary) */
export type SettingsDict = Record<string, {
  value:       unknown;
  group:       string;
  type:        string;
  is_editable: boolean;
}>;

// ─── API functions ────────────────────────────────────────────────────────────

export const settingsApi = {

  /**
   * GET /settings → dictionary
   * يُرجع: { "app_name": { value, group, type, is_editable }, ... }
   */
  list: () => apiGet<SettingsDict>('/settings'),

  /**
   * PATCH /settings → تحديث متعدد
   * يقبل: { "app_name": "My App", "tax_regime": "reel", ... }
   * يُرجع: [{ key, value, group, type }, ...]
   *
   * ✅ PATCH فقط — الـ backend يدعمه صراحةً في المسارات
   */
  update: (settings: Record<string, unknown>) =>
    apiPatch<Setting[]>('/settings', settings),

  /**
   * GET /settings/group/{group} → array من objects
   * يُرجع: [{ key, value, group, type, is_editable, updated_at }, ...]
   *
   * ✅ هذا الشكل متوافق مع ما يتوقعه SettingsPage:
   *   (rawSettings as any[]).find(s => s.key === key)?.value
   */
  byGroup: (group: string) => apiGet<Setting[]>(`/settings/group/${group}`),

  /**
   * GET /settings/{key} → إعداد واحد
   */
  getValue: (key: string) =>
    apiGet<{ key: string; value: unknown; group: string; type: string }>(`/settings/${key}`),

} as const;

// ─── Helper: gs() — جلب قيمة آمنة من array ──────────────────────────────────

/**
 * ✅ gs() — Get Setting value بأمان
 *
 * يعمل مع:
 *   - rawSettings: Setting[] (array من objects)
 *   - إرجاع القيمة مع default إذا لم توجد
 *
 * الاستخدام:
 *   const gs = makeGs(rawSettings);
 *   gs('app_name', 'My App') → 'My App'
 */
export function makeGs(rawSettings: Setting[]) {
  return function gs<T = unknown>(key: string, defaultValue: T): T {
    const found = rawSettings.find(s => s.key === key);
    if (!found) return defaultValue;
    const v = found.value;
    if (v === null || v === undefined || v === '') return defaultValue;
    return v as T;
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * جلب كل الإعدادات كـ dictionary
 * للاستخدام في Export/Import وغيرها
 */
export function useSettingsDict() {
  const slug = useActiveSlug() ?? '';
  return useQuery({
    queryKey:  tenantKeys.settings.current(slug),
    queryFn:   settingsApi.list,
    enabled:   !!slug,
    staleTime: 5 * 60_000,
  });
}

/**
 * ✅ جلب إعدادات مجموعة محددة كـ array من objects
 *
 * يُستخدم في كل تبويبات الإعدادات:
 *   const { data: rawSettings = [] } = useSettingsByGroup('invoice');
 *   const gs = makeGs(rawSettings);
 *   const design = gs('invoice_design', 'classic');
 */
export function useSettingsByGroup(group: string) {
  const slug = useActiveSlug() ?? '';
  return useQuery({
    queryKey:  [...tenantKeys.settings.current(slug), group],
    queryFn:   () => settingsApi.byGroup(group),
    enabled:   !!slug && !!group,
    staleTime: 5 * 60_000,
    // ✅ لا نُعيد الجلب عند العودة للتبويب — البيانات مستقرة
    refetchOnWindowFocus: false,
    // ✅ initialData آمن كـ array فارغ
    placeholderData: [],
  });
}

/**
 * Mutation لتحديث الإعدادات
 *
 * الاستخدام:
 *   const { mutateAsync: saveSettings, isPending } = useUpdateSettings();
 *   await saveSettings({ app_name: 'My App', tax_regime: 'reel' });
 */
export function useUpdateSettings() {
  const slug = useActiveSlug() ?? '';
  const qc   = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      // ✅ أبطل كل الـ settings queries للـ slug الحالي
      qc.invalidateQueries({ queryKey: tenantKeys.settings.current(slug) });
    },
    onError: (err: unknown) => {
      const e = err as { status?: number; message?: string; errors?: unknown };
      console.error('[Settings Update Error]', {
        status:  e.status,
        message: e.message,
        errors:  e.errors,
      });
    },
  });
}

// ─── Legacy exports (للتوافق مع الكود القديم) ────────────────────────────────

/** @deprecated استخدم useUpdateSettings() بدلاً منه */
export function useSettingsMutations() {
  return { update: useUpdateSettings() };
}
