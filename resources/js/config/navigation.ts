// ════════════════════════════════════════════════════════════════════════════
// config/navigation.ts
// ✅ مصحح: ملف مستقل — routes/index.tsx في مكانه الصحيح
// ════════════════════════════════════════════════════════════════════════════

export interface NavItem {
  id:         string;
  label:      string;
  href:       string;
  icon:       string;
  badge?:     number;
  badgeWarn?: boolean;
}

export interface NavGroup {
  label: string;
  color: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'الرئيسية',
    color: 'var(--em)',
    items: [
      { id: 'dashboard', label: 'لوحة التحكم', href: '/dashboard', icon: 'ti-layout-dashboard' },
      { id: 'pos',       label: 'نقطة البيع',  href: '/pos',       icon: 'ti-shopping-cart'    },
    ],
  },
  {
    label: 'المبيعات',
    color: 'var(--blue)',
    items: [
      { id: 'invoices',   label: 'الفواتير',       href: '/invoices',   icon: 'ti-file-text',     badge: 3 },
      { id: 'orders',     label: 'طلبيات الشراء',  href: '/orders',     icon: 'ti-clipboard-list'           },
      { id: 'returns',    label: 'المرتجعات',       href: '/returns',    icon: 'ti-corner-up-left'           },
      { id: 'quotations', label: 'فاتورة شكلية',    href: '/quotations', icon: 'ti-file-check'               },
      { id: 'bl',         label: 'وصل التسليم BL',  href: '/bl',         icon: 'ti-truck'                    },
    ],
  },
  {
    label: 'المخزون',
    color: 'var(--purple)',
    items: [
      { id: 'products',   label: 'المنتجات',       href: '/products',   icon: 'ti-package'                         },
      { id: 'inventory',  label: 'إدارة المخزون',  href: '/inventory',  icon: 'ti-building-warehouse', badgeWarn: true },
      { id: 'categories', label: 'الفئات',          href: '/categories', icon: 'ti-folder-open'                    },
      { id: 'brands',     label: 'العلامات',        href: '/brands',     icon: 'ti-award'                           },
      { id: 'units',      label: 'الوحدات',         href: '/units',      icon: 'ti-ruler'                           },
      { id: 'suppliers',  label: 'الموردون',        href: '/suppliers',  icon: 'ti-truck'                           },
      { id: 'warehouses', label: 'المستودعات',      href: '/warehouses', icon: 'ti-building-warehouse'              },
    ],
  },
  {
    label: 'المحاسبة والمالية',
    color: 'var(--gold)',
    items: [
      { id: 'clients',     label: 'العملاء',            href: '/clients',     icon: 'ti-users'           },
      { id: 'finance',     label: 'الخزينة',             href: '/finance',     icon: 'ti-building-bank'   },
      { id: 'expenses',    label: 'المصروفات',           href: '/expenses',    icon: 'ti-credit-card'     },
      { id: 'debts',       label: 'الديون',              href: '/debts',       icon: 'ti-receipt'         },
      { id: 'tva',         label: 'إقرار TVA — G50',    href: '/tva',         icon: 'ti-calculator'      },
      { id: 'fiscal',      label: 'الملف الجبائي',       href: '/fiscal',      icon: 'ti-file-barcode'    },
      { id: 'fiscalyears', label: 'السنوات المالية',     href: '/fiscalyears', icon: 'ti-calendar'        },
      { id: 'currencies',  label: 'العملات',             href: '/currencies',  icon: 'ti-currency-dollar' },
      { id: 'pricelevels', label: 'مستويات الأسعار',     href: '/pricelevels', icon: 'ti-tag'             },
    ],
  },
  {
    label: 'التقارير',
    color: 'var(--orange)',
    items: [
      { id: 'reports', label: 'التقارير والإحصائيات', href: '/reports', icon: 'ti-chart-bar' },
      { id: 'balance', label: 'الميزانية التقديرية',  href: '/balance', icon: 'ti-scale'     },
    ],
  },
  {
    label: 'النظام',
    color: 'var(--teal)',
    items: [
      { id: 'employees',  label: 'الموظفون',    href: '/employees',       icon: 'ti-id-badge'   },
      { id: 'users',      label: 'المستخدمون',  href: '/users',           icon: 'ti-user'        },
      { id: 'settings',   label: 'الإعدادات',   href: '/settings',        icon: 'ti-settings'   },
      { id: 'numbering',  label: 'ترقيم المستندات', href: '/numbering-series', icon: 'ti-123'  },
      { id: 'profile',     label: 'الملف الشخصي', href: '/profile',         icon: 'ti-user-circle' },
    ],
  },
];

// ── Flat map for breadcrumbs ──────────────────────────────────────────────────
export const PAGE_META: Record<string, { title: string; path: string }> = {
  ...Object.fromEntries(
    NAV_GROUPS.flatMap(g =>
      g.items.map(item => [
        item.href,
        { title: item.label, path: `${g.label} ← ${item.label}` },
      ])
    )
  ),
  '/dashboard': { title: 'لوحة التحكم',   path: 'الرئيسية ← إحصائيات' },
  '/pos':       { title: 'نقطة البيع',     path: 'الرئيسية ← POS'       },
  '/onboarding':{ title: 'إعداد الشركة',  path: 'البداية ← إعداد'       },
};
