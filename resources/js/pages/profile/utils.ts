// resources/js/pages/profile/utils.ts — دوال مساعدة
import type { Permission } from "./types";

export const err2str = (e: unknown, fb = "حدث خطأ") => {
  const ae = e as any;
  // استخرج أول خطأ من errors إن وجد
  const firstErr = ae?.response?.data?.errors
    ? Object.values(ae.response.data.errors as Record<string, string[]>)[0]?.[0]
    : null;
  return firstErr ?? ae?.response?.data?.message ?? ae?.message ?? fb;
};

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("ar-DZ") : "—";

export const fmtDT = (d?: string | null) =>
  d
    ? `${new Date(d).toLocaleDateString("ar-DZ")} — ${new Date(d).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`
    : "—";

// يزيل التكرار حسب id أولاً، ثم حسب الاسم ثانياً (لأن الباكاند يُرجع أدواراً متعددة بنفس الاسم ولكن بمعرفات مختلفة)
export function dedup<T extends { id: number; name?: string }>(arr: T[]): T[] {
  const seen = new Set<number>();

  // أولاً: dedup حسب id (التكرار الحقيقي)
  const result = arr.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // ثانياً: dedup حسب الاسم للأدوار فقط — نبقي الأول فقط لكل اسم
  const seenName = new Set<string>();
  return result.filter(item => {
    const key = item.name;
    if (key && seenName.has(key)) return false;
    if (key) seenName.add(key);
    return true;
  });
}

export function extractPermissionGroup(p: Permission): string {
  if (p.group) return p.group;
  const parts = p.name.split("_");
  if (parts.length >= 2) {
    const resource = parts.slice(1).join("_");
    const AR: Record<string, string> = {
      user: "المستخدمون", role: "الأدوار", permission: "الصلاحيات",
      product: "المنتجات", party: "الأطراف", document: "الوثائق",
      payment: "المدفوعات", expense: "المصاريف", employee: "الموظفون",
      company: "الشركة", setting: "الإعدادات", report: "التقارير",
      fiscal_year: "السنة المالية", inventory: "المخزون",
      warehouse: "المستودعات", stock_movement: "حركة المخزون",
      family: "الفئات", brand: "العلامات التجارية", unit: "الوحدات",
      price_level: "مستويات الأسعار", audit: "السجلات",
      any_user: "المستخدمون", any_role: "الأدوار",
    };
    return AR[resource] ?? resource;
  }
  return "أخرى";
}
