// lib/admin-constants.ts — Single source of truth for admin panel constants

export const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي',
  enterprise: 'مؤسسة', custom: 'مخصص',
};
export const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1', professional: '#0ea5e9',
  enterprise: '#f59e0b', custom: '#8b5cf6',
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام', admin: 'مدير', manager: 'مدير قسم',
  member: 'عضو', viewer: 'مشاهد', cashier: 'كاشير',
};
export const ROLE_COLORS: Record<string, string> = {
  super_admin: '#ef4444', admin: '#8b5cf6', manager: '#6366f1',
  member: '#10b981', viewer: '#6b7280', cashier: '#0ea5e9',
};

export const EVENT_LABELS: Record<string, string> = {
  created: 'إنشاء', updated: 'تعديل', deleted: 'حذف',
  restored: 'استعادة', attached: 'إضافة', detached: 'إزالة',
  login: 'تسجيل دخول', logout: 'تسجيل خروج',
};
export const EVENT_COLORS: Record<string, string> = {
  created: '#10b981', updated: '#0ea5e9', deleted: '#ef4444',
  restored: '#f59e0b', attached: '#8b5cf6', detached: '#6b7280',
  login: '#6366f1', logout: '#6b7280',
};

export const STATUS_LABELS = {
  active: { label: 'نشط', color: '#10b981' },
  suspended: { label: 'موقوف', color: '#f59e0b' },
  inactive: { label: 'معطل', color: '#6b7280' },
  verified: { label: 'موثّق', color: '#10b981' },
  unverified: { label: 'غير موثّق', color: '#ef4444' },
  pending: { label: 'قيد المراجعة', color: '#f59e0b' },
  approved: { label: 'مقبول', color: '#10b981' },
  rejected: { label: 'مرفوض', color: '#ef4444' },
} as const;
