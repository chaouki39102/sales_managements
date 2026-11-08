// pages/portal/orders-admin/ordersAdminUtils.ts
// Formatters, status metadata and pipeline helpers for the portal orders admin page.
import type { Product, ProductPackaging } from '@/lib/api/core/types';
import type { PortalOrderStatus } from '@/lib/api/portal/portal';

export const fmt = (n: number) =>
  n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString('ar-DZ', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

// يعكس Product::defaultPackaging(): العبوة الافتراضية، وإلا الأصغر كميةً
export const defaultPackOf = (p: Product): ProductPackaging | undefined => {
  const ps = p.packagings ?? [];
  return ps.find((x) => x.is_default) ?? [...ps].sort((a, b) => a.quantity - b.quantity)[0];
};

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'orange' | 'gray';
export type ButtonVariant = 'default' | 'primary' | 'danger' | 'warning' | 'info' | 'outline' | 'secondary' | 'success' | 'ghost' | 'gray';

// ── بيانات الحالات (لون/أيقونة/شارة) ────────────────────────────────────────
export const STATUS_META: Record<PortalOrderStatus, { label: string; icon: string; color: string; badge: BadgeVariant }> = {
  pending:   { label: 'قيد الاعداد',  icon: 'ti-clock',            color: '#64748b', badge: 'gray'    },
  preparing: { label: 'قيد الاعداد',  icon: 'ti-pencil',           color: '#f59e0b', badge: 'warning' },
  confirmed: { label: 'مؤكد',         icon: 'ti-circle-check',     color: '#2563eb', badge: 'info'    },
  processed: { label: 'تم المعالجة',  icon: 'ti-settings',         color: '#8b5cf6', badge: 'purple'  },
  shipped:   { label: 'الشحن',        icon: 'ti-truck',            color: '#f97316', badge: 'orange'  },
  delivered: { label: 'تم التسليم',   icon: 'ti-package-import',  color: '#16a34a', badge: 'success' },
  returned:  { label: 'مرتجع',        icon: 'ti-rotate-clockwise', color: '#dc2626', badge: 'danger'  },
  cancelled: { label: 'ملغي',         icon: 'ti-x',                color: '#94a3b8', badge: 'gray'    },
  completed: { label: 'مكتمل',        icon: 'ti-check',            color: '#15803d', badge: 'success' },
};

// قراءة آمنة لأي حالة (تُحفظ الصفحة من قيم قديمة/غير معروفة في قاعدة البيانات)
export const stMeta = (st: string) =>
  STATUS_META[st as PortalOrderStatus] ?? { label: st, icon: 'ti-circle', color: '#94a3b8', badge: 'gray' as BadgeVariant };

export const MAIN_PIPELINE: Exclude<PortalOrderStatus, 'pending' | 'completed'>[] = ['preparing', 'confirmed', 'processed', 'shipped', 'delivered'];
export const TERMINALS: Exclude<PortalOrderStatus, 'pending' | 'completed'>[] = ['returned', 'cancelled'];

// ترتيب خط الأنابيب لسجل الحالات: يُعرض التاريخ دائماً بتقدم المسار
// (قيد الاعداد ← مؤكد ← تم المعالجة ← الشحن ← تم التسليم) والفروع في الآخر.
export const PIPELINE_RANK: Record<PortalOrderStatus, number> = {
  pending:   -1,
  preparing: 0,
  confirmed: 1,
  processed: 2,
  shipped:   3,
  delivered: 4,
  returned:  5,
  cancelled: 6,
  completed: 7,
};
export const sortByPipeline = (
  a: { status: string; created_at?: string | null },
  b: { status: string; created_at?: string | null },
) => {
  const ra = PIPELINE_RANK[a.status as PortalOrderStatus] ?? 99;
  const rb = PIPELINE_RANK[b.status as PortalOrderStatus] ?? 99;
  if (ra !== rb) return ra - rb;
  return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
};

export const NEXT_ACTION_LABEL: Partial<Record<PortalOrderStatus, string>> = {
  confirmed: 'تأكيد الطلب',
  processed: 'بدء المعالجة',
  shipped:   'الشحن',
  delivered: 'تسليم الطلب',
  returned:  'إرجاع الطلب',
  cancelled: 'إلغاء الطلب',
};

export const NEXT_ACTION_VARIANT: Record<PortalOrderStatus, ButtonVariant> = {
  pending:   'default',
  preparing: 'default',
  confirmed: 'info',
  processed: 'primary',
  shipped:   'primary',
  delivered: 'success',
  returned:  'danger',
  cancelled: 'danger',
  completed: 'default',
};

export const initialsOf = (name?: string | null) =>
  (name || '؟').trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
