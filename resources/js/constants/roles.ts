// ════════════════════════════════════════════════════════════════════════════
// constants/roles.ts
// مصدر الحقيقة الوحيد لأسماء الأدوار — بدل الـ strings المكررة في كل مكان
// ════════════════════════════════════════════════════════════════════════════

export const ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN:       'admin',
  MANAGER:     'manager',
  CASHIER:     'cashier',
  VIEWER:      'viewer',
  MEMBER:      'member',
} as const;

export type RoleKey = typeof ROLES[keyof typeof ROLES];

// ─── تسميات عربية ───────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<RoleKey, string> = {
  'super-admin': 'Super Admin',
  'admin':       'Admin',
  'manager':     'Manager',
  'cashier':     'Cashier',
  'viewer':      'Viewer',
  'member':      'Member',
};

// ─── ألوان الـ badge ─────────────────────────────────────────────────────────

export const ROLE_COLORS: Record<RoleKey, string> = {
  'super-admin': '#ef4444',
  'admin':       '#6366f1',
  'manager':     '#0ea5e9',
  'cashier':     '#f59e0b',
  'viewer':      '#6b7280',
  'member':      '#10b981',
};

// ─── Helper: هل المستخدم super-admin؟ ────────────────────────────────────────

export const isSuperAdmin = (role?: string | null): boolean =>
  role === ROLES.SUPER_ADMIN;
