// resources/js/lib/permissions.ts
// ══════════════════════════════════════════════════════════════════════════════
// طبقة الصلاحيات الأمامية — المصدر الوحيد لبيانيات الصلاحيات في الواجهة.
// بني على أدوار وصلاحيات المستخدم الحالي (useMyRolesAndPermissions) وليس على
// قائمة Spatie المسطّحة (useMyPermissions) — انظر PERMISSIONS_RESTRUCTURE_TODO.md.
import { useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMyRolesAndPermissions } from '@/lib/api/endpoints/roles';
import type { Role } from '@/lib/api/core/types';

// ══════════════════════════════════════════════════════════════════════════════
// أسماء الصلاحيات (مطابِقة لـ name في بذور GlobalRolesAndPermissionsSeeder /
// RolesAndPermissionsSeeder — Spatie). أضِف أي صلاحية جديدة هنا فقط.
// ══════════════════════════════════════════════════════════════════════════════
export const PERMISSION = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ANY_PARTY: 'view_any_party',
  VIEW_ANY_PRODUCT: 'view_any_product',
  VIEW_ANY_COMMERCIAL_DOCUMENT: 'view_any_commercial_document',
  VIEW_ANY_PAYMENT: 'view_any_payment',
  VIEW_ANY_USER: 'view_any_user',
  VIEW_ROLES: 'view_roles',
  VIEW_AUDIT_LOG: 'view_audit_log',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_PORTAL_ORDERS: 'manage_portal_orders',
  MANAGE_BACKUP: 'manage_backup',
  MANAGE_PRINTER: 'manage_printer',
  CREATE_SALES_DOCUMENT: 'create_sales_document',
  VIEW_SALES_REPORT: 'view_sales_report',
  VIEW_PURCHASE_REPORT: 'view_purchase_report',
  VIEW_INVENTORY_REPORT: 'view_inventory_report',
  VIEW_FINANCIAL_REPORT: 'view_financial_report',
  VIEW_COST_PRICE: 'view_cost_price',
} as const;

export type PermissionKey = keyof typeof PERMISSION;

/** بنى Set بأسماء الصلاحيات من قائمة أدوار المستخدم (كل دور يحمل permissions). */
export function permissionsSetFromRoles(roles: Role[]): Set<string> {
  return new Set(
    roles.flatMap((r) => (r.permissions ?? []).map((p) => p.name)),
  );
}

export interface UsePermissionsResult {
  permissions: Set<string>;
  /** can(perm?) — بلا وسيط يعني «مسموح» دائماً؛ super-admin يمرّ تلقائياً. */
  can: (permission?: string) => boolean;
  isLoading: boolean;
  /** true فقط بعد اكتمال الجلب الأول — يُستعمل لإخفاء الحراسة دون وميض «403». */
  isReady: boolean;
}

/** عكس source of truth: أدوار صلاحيات المستخدم الحالي (المفصولة backend). */
export function usePermissions(): UsePermissionsResult {
  const { isSuperAdmin } = useAuth();
  const { data, isPending, isFetched } = useMyRolesAndPermissions();

  const permissions = useMemo(
    () => permissionsSetFromRoles(data?.roles ?? []),
    [data],
  );

  const can = useCallback(
    (permission?: string) => {
      if (isSuperAdmin) return true;
      if (!permission) return true;
      return permissions.has(permission);
    },
    [isSuperAdmin, permissions],
  );

  return { permissions, can, isLoading: isPending, isReady: isFetched };
}

// ══════════════════════════════════════════════════════════════════════════════
// خريطة مسارات القائمة الجانبية → الصلاحية المطلوبة للعرض.
// تُطبَّق على عناصر NAV_GROUPS فقط؛ أي مسار غير مذكور هنا يبقى مرئياً للجميع.
// ══════════════════════════════════════════════════════════════════════════════
export const NAV_PATH_PERMISSION: Record<string, string> = {
  dashboard: PERMISSION.VIEW_DASHBOARD,
  pos: PERMISSION.CREATE_SALES_DOCUMENT,
  'pos/pro': PERMISSION.CREATE_SALES_DOCUMENT,
  'pos/sessions': PERMISSION.CREATE_SALES_DOCUMENT,
  'pos/monitor': PERMISSION.CREATE_SALES_DOCUMENT,
  'portal-orders': PERMISSION.MANAGE_PORTAL_ORDERS,
  products: PERMISSION.VIEW_ANY_PRODUCT,
  inventory: PERMISSION.VIEW_ANY_PRODUCT,
  'inventory/stock-take': PERMISSION.VIEW_ANY_PRODUCT,
  parties: PERMISSION.VIEW_ANY_PARTY,
  clients: PERMISSION.VIEW_ANY_PARTY,
  suppliers: PERMISSION.VIEW_ANY_PARTY,
  finance: PERMISSION.VIEW_ANY_PAYMENT,
  users: PERMISSION.VIEW_ANY_USER,
  'audit-log': PERMISSION.VIEW_AUDIT_LOG,
  settings: PERMISSION.MANAGE_SETTINGS,
  'settings/print': PERMISSION.MANAGE_SETTINGS,
};

/**
 * الصلاحية المطلوبة لعنصر قائمة جانبية، أو undefined إن لم يكن العنصر خاضعاً
 * لحراسة (يبقى مرئياً للجميع). عناصر المستندات (documents/*) كلها محمية
 * بـ view_any_commercial_document.
 */
export function permissionForNavPath(href: string): string | undefined {
  const h = href.replace(/^\//, '');
  if (h.startsWith('documents/')) return PERMISSION.VIEW_ANY_COMMERCIAL_DOCUMENT;
  return NAV_PATH_PERMISSION[h];
}