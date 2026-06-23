// hooks/useTopbarTitle.ts
// ✅ يدعم static routes + dynamic routes (/documents/:code, /admin/*)
// ✅ المصدر الوحيد للـ page meta — DashboardLayout يستورد منه بدل PAGE_META المحلي

import { useLocation, useParams } from 'react-router-dom';

export interface PageMeta {
  title: string;
  path:  string;
}

// ── Document types (مطابق لـ api.php document codes) ──────────────────────────
const DOCUMENT_CODES: Record<string, PageMeta> = {
  DEV: { title: 'فاتورة شكلية',          path: 'مبيعات ← عروض أسعار'   },
  BCC: { title: 'طلبيات الزبائن',        path: 'مبيعات ← طلبيات'       },
  BL:  { title: 'وصل التسليم',        path: 'مبيعات ← وصل تسليم'    },
  FV:  { title: 'فواتير البيع',          path: 'مبيعات ← فواتير'        },
  AV:  { title: 'مرتجعات البيع',         path: 'مبيعات ← مرتجعات'      },
  DDP: { title: 'طلبات فاتورة شكلية',   path: 'مشتريات ← طلبات عروض'  },
  BCF: { title: 'أوامر الشراء',          path: 'مشتريات ← أوامر شراء'  },
  BR:  { title: 'وصل الاستلام',          path: 'مشتريات ← وصل استلام'  },
  FA:  { title: 'فواتير الشراء',         path: 'مشتريات ← فواتير شراء' },
  AA:  { title: 'مرتجعات الشراء',        path: 'مشتريات ← مرتجعات'     },
};

// ── Static routes ─────────────────────────────────────────────────────────────
const STATIC: Record<string, PageMeta> = {
  '/dashboard':               { title: 'لوحة التحكم',           path: 'الرئيسية ← إحصائيات'      },
  '/pos':                     { title: 'نقطة البيع',             path: 'الرئيسية ← POS'            },
  '/products':                { title: 'المنتجات',               path: 'مخزون ← منتجات'            },
  '/inventory':               { title: 'إدارة المخزون',          path: 'مخزون ← جرد'               },
  '/categories':              { title: 'الفئات',                 path: 'مخزون ← فئات'              },
  '/brands':                  { title: 'العلامات التجارية',      path: 'مخزون ← علامات'            },
  '/units':                   { title: 'وحدات القياس',           path: 'مخزون ← وحدات'             },
  '/suppliers':               { title: 'الموردون',               path: 'مخزون ← موردون'            },
  '/warehouses':              { title: 'المستودعات',              path: 'مخزون ← مستودعات'          },
  '/clients':                 { title: 'الزبائن',                path: 'محاسبة ← زبائن'            },
  '/finance':                 { title: 'الخزينة',                path: 'محاسبة ← خزينة'            },
  '/expenses':                { title: 'المصروفات',              path: 'محاسبة ← مصروفات'          },
  '/debts':                   { title: 'الديون',                 path: 'محاسبة ← ديون'             },
  '/tva':                     { title: 'إقرار TVA — G50',        path: 'محاسبة ← TVA'              },
  '/fiscal':                  { title: 'الملف الجبائي',          path: 'محاسبة ← جبايات'           },
  '/fiscalyears':             { title: 'السنوات المالية',         path: 'محاسبة ← سنوات مالية'      },
  '/currencies':              { title: 'العملات',                path: 'محاسبة ← عملات'            },
  '/pricelevels':             { title: 'مستويات الأسعار',        path: 'محاسبة ← مستويات أسعار'    },
  '/employees':               { title: 'الموظفون',               path: 'موارد بشرية ← موظفون'       },
  '/reports':                 { title: 'التقارير',               path: 'تقارير'                     },
  '/balance':                 { title: 'الميزانية التقديرية',    path: 'تقارير ← ميزانية'           },
  '/users':                   { title: 'المستخدمون',             path: 'نظام ← مستخدمون'           },
  '/settings':                { title: 'الإعدادات',              path: 'نظام ← إعدادات'            },
  '/settings/document-types': { title: 'أنواع المستندات',        path: 'نظام ← أنواع المستندات'    },
  '/numbering-series':        { title: 'سلاسل الترقيم',          path: 'نظام ← سلاسل الترقيم'      },
  '/expense-categories':      { title: 'فئات المصروفات',         path: 'نظام ← فئات المصروفات'     },
  '/profile':                 { title: 'الملف الشخصي',            path: 'النظام ← الملف الشخصي'     },
  // ── Super Admin ──
  '/admin':                   { title: 'لوحة السوبر أدمن',       path: 'Admin'                      },
  '/admin/dashboard':         { title: 'إحصائيات النظام',        path: 'Admin ← داشبورد'            },
  '/admin/companies':         { title: 'إدارة الشركات',          path: 'Admin ← الشركات'            },
  '/admin/users':             { title: 'إدارة المستخدمين',       path: 'Admin ← المستخدمون'         },
  '/admin/plans':             { title: 'الخطط والاشتراكات',       path: 'Admin ← الخطط'             },
  '/admin/activity':          { title: 'سجل النشاط',             path: 'Admin ← النشاط'            },
  '/admin/settings':          { title: 'إعدادات النظام',         path: 'Admin ← الإعدادات'         },
};

const FALLBACK: PageMeta = { title: 'لوحة التحكم', path: 'الرئيسية' };

export function useTopbarTitle(): PageMeta {
  const { pathname } = useLocation();

  // 1. مطابقة حرفية أولاً
  if (STATIC[pathname]) return STATIC[pathname];

  // 2. /documents/:code  ← أكثر route ديناميكي في النظام
  const docMatch = pathname.match(/^\/documents\/([A-Z]+)(?:\/|$)/);
  if (docMatch) return DOCUMENT_CODES[docMatch[1]] ?? FALLBACK;

  // 3. /documents/:code/:id  ← صفحة تفاصيل مستند
  const docDetailMatch = pathname.match(/^\/documents\/([A-Z]+)\/(\d+)$/);
  if (docDetailMatch) {
    const base = DOCUMENT_CODES[docDetailMatch[1]];
    return base
      ? { title: `${base.title} #${docDetailMatch[2]}`, path: `${base.path} ← تفاصيل` }
      : FALLBACK;
  }

  // 4. /admin/* غير مُطابَق أعلاه
  if (pathname.startsWith('/admin/')) {
    return { title: 'لوحة الإدارة', path: 'Admin ← ...' };
  }

  // 5. مطابقة جزئية — startsWith للـ nested routes
  const partial = Object.keys(STATIC)
    .sort((a, b) => b.length - a.length)      // أطول أولاً
    .find((key) => pathname.startsWith(key));

  return partial ? STATIC[partial] : FALLBACK;
}
