// hooks/useTopbarTitle.ts
// يُعيد عنوان الصفحة الحالية والمسار التفصيلي بناءً على الـ URL
import { useLocation } from 'react-router-dom';

interface PageMeta {
  title: string;
  path:  string;
}

const META: Record<string, PageMeta> = {
  '/dashboard':    { title:'لوحة التحكم',         path:'الرئيسية ← إحصائيات'       },
  '/pos':          { title:'نقطة البيع',           path:'الرئيسية ← POS'            },
  '/invoices':     { title:'الفواتير',             path:'مبيعات ← فواتير'           },
  '/orders':       { title:'طلبيات الشراء',         path:'مبيعات ← طلبيات'          },
  '/returns':      { title:'المرتجعات',             path:'مبيعات ← مرتجعات'         },
  '/quotations':   { title:'عروض الأسعار',          path:'مبيعات ← عروض أسعار'      },
  '/bl':           { title:'وصل التسليم BL',        path:'مبيعات ← وصل تسليم'       },
  '/products':     { title:'المنتجات',              path:'مخزون ← منتجات'           },
  '/inventory':    { title:'إدارة المخزون',         path:'مخزون ← جرد'              },
  '/categories':   { title:'الفئات',               path:'مخزون ← فئات'             },
  '/brands':       { title:'العلامات التجارية',     path:'مخزون ← علامات'           },
  '/units':        { title:'وحدات القياس',          path:'مخزون ← وحدات'            },
  '/suppliers':    { title:'الموردون',              path:'مخزون ← موردون'           },
  '/warehouses':   { title:'المستودعات',            path:'مخزون ← مستودعات'         },
  '/clients':      { title:'العملاء',               path:'محاسبة ← عملاء'           },
  '/finance':      { title:'الخزينة',               path:'محاسبة ← خزينة'           },
  '/expenses':     { title:'المصروفات',             path:'محاسبة ← مصروفات'         },
  '/debts':        { title:'الديون',                path:'محاسبة ← ديون'            },
  '/tva':          { title:'إقرار TVA — G50',       path:'محاسبة ← TVA'             },
  '/fiscal':       { title:'الملف الجبائي',         path:'محاسبة ← جبايات'          },
  '/fiscalyears':  { title:'السنوات المالية',        path:'محاسبة ← سنوات مالية'     },
  '/currencies':   { title:'العملات',               path:'محاسبة ← عملات'           },
  '/pricelevels':  { title:'مستويات الأسعار',       path:'محاسبة ← مستويات أسعار'   },
  '/employees':    { title:'الموظفون',              path:'موارد بشرية ← موظفون'      },
  '/reports':      { title:'التقارير',              path:'تقارير'                    },
  '/balance':      { title:'الميزانية التقديرية',   path:'تقارير ← ميزانية'         },
  '/users':        { title:'المستخدمون',            path:'نظام ← مستخدمون'          },
  '/settings':     { title:'الإعدادات',             path:'نظام ← إعدادات'           },
};

export function useTopbarTitle(): PageMeta {
  const { pathname } = useLocation();
  return META[pathname] ?? { title: 'لوحة التحكم', path: 'الرئيسية' };
}
