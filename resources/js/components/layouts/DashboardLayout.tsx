// resources/js/components/layouts/DashboardLayout.tsx
// ════════════════════════════════════════════════
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFiscalYear, FiscalYearSelector } from '@/context/FiscalYearContext';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';
import apiClient from '@/lib/api/client';

// ─── ناف القائمة ─────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم', href: 'dashboard', icon: 'ti-layout-dashboard' },
      { name: 'نقطة البيع',  href: 'pos',        icon: 'ti-shopping-cart'   },
    ],
  },
  {
    label: 'المبيعات',
    items: [
      { name: 'عروض الأسعار',          href: 'documents/DEV', icon: 'ti-file-check'             },
      { name: 'طلبيات العملاء',        href: 'documents/BCC', icon: 'ti-clipboard-list'         },
      { name: 'وصل التسليم BL',        href: 'documents/BL',  icon: 'ti-truck'                  },
      { name: 'فواتير البيع',          href: 'documents/FV',  icon: 'ti-file-invoice', badge: 3 },
      { name: 'مرتجعات البيع',         href: 'documents/AV',  icon: 'ti-corner-up-left'         },
    ],
  },
  {
    label: 'المشتريات',
    items: [
      { name: 'طلبات عروض الأسعار',    href: 'documents/DDP', icon: 'ti-file-search'           },
      { name: 'أوامر الشراء للموردين', href: 'documents/BCF', icon: 'ti-clipboard-check'       },
      { name: 'وصل الاستلام',          href: 'documents/BR',  icon: 'ti-package-import'        },
      { name: 'فواتير الشراء',         href: 'documents/FA',  icon: 'ti-file-invoice'          },
      { name: 'مرتجعات الشراء',        href: 'documents/AA',  icon: 'ti-corner-up-left-double' },
    ],
  },
  {
    label: 'المخزون',
    items: [
      { name: 'المنتجات',       href: 'products',   icon: 'ti-package'                          },
      { name: 'إدارة المخزون',  href: 'inventory',  icon: 'ti-building-warehouse', badgeWarn: true },
      { name: 'الفئات',         href: 'categories', icon: 'ti-folder-open'                      },
      { name: 'العلامات',       href: 'brands',     icon: 'ti-award'                            },
      { name: 'الوحدات',        href: 'units',      icon: 'ti-ruler'                            },
      { name: 'الموردون',       href: 'suppliers',  icon: 'ti-truck'                            },
      { name: 'المستودعات',     href: 'warehouses', icon: 'ti-building-warehouse'               },
    ],
  },
  {
    label: 'المحاسبة والمالية',
    items: [
      { name: 'العملاء',          href: 'clients',     icon: 'ti-users'           },
      { name: 'الخزينة',          href: 'finance',     icon: 'ti-building-bank'   },
      { name: 'المصروفات',        href: 'expenses',    icon: 'ti-credit-card'     },
      { name: 'الديون',           href: 'debts',       icon: 'ti-receipt'         },
      { name: 'إقرار TVA — G50', href: 'tva',         icon: 'ti-calculator'      },
      { name: 'الملف الجبائي',    href: 'fiscal',      icon: 'ti-file-barcode'    },
      { name: 'السنوات المالية',  href: 'fiscalyears', icon: 'ti-calendar'        },
      { name: 'العملات',          href: 'currencies',  icon: 'ti-currency-dollar' },
      { name: 'مستويات الأسعار',  href: 'pricelevels', icon: 'ti-tag'             },
    ],
  },
  {
    label: 'التقارير',
    items: [
      { name: 'التقارير والإحصائيات', href: 'reports', icon: 'ti-chart-bar' },
      { name: 'الميزانية التقديرية',   href: 'balance', icon: 'ti-scale'     },
    ],
  },
  {
    label: 'النظام',
    items: [
      { name: 'الموظفون',        href: 'employees',               icon: 'ti-id-badge'     },
      { name: 'المستخدمون',      href: 'users',                   icon: 'ti-user'         },
      { name: 'الإعدادات',       href: 'settings',                icon: 'ti-settings'     },
      { name: 'أنواع المستندات', href: 'settings/document-types', icon: 'ti-file'         },
      { name: 'سلاسل الترقيم',   href: 'numbering-series',        icon: 'ti-list-numbers' },
      { name: 'طرق الدفع',       href: 'payment-methods',         icon: 'ti-credit-card'  },
      { name: 'فئات المصروفات',  href: 'expense-categories',      icon: 'ti-category'     },
    ],
  },
  {
    label: 'Super Admin',
    superAdminOnly: true,
    items: [
      { name: 'إدارة الشركات', href: 'admin/companies', icon: 'ti-building-community' },
    ],
  },
];

const LABEL_COLORS = ['var(--em)','var(--blue)','var(--purple)','var(--gold)','var(--orange)','var(--teal)'];

const PAGE_META: Record<string, { title: string; path: string }> = {
  'dashboard':               { title: 'لوحة التحكم',        path: 'الرئيسية ← إحصائيات'   },
  'pos':                     { title: 'نقطة البيع',          path: 'الرئيسية ← POS'         },
  'documents/DEV':           { title: 'عروض الأسعار',       path: 'مبيعات ← عروض أسعار'   },
  'documents/BCC':           { title: 'طلبيات العملاء',     path: 'مبيعات ← طلبيات'       },
  'documents/BL':            { title: 'وصل التسليم',        path: 'مبيعات ← وصل تسليم'    },
  'documents/FV':            { title: 'فواتير البيع',       path: 'مبيعات ← فواتير'        },
  'documents/AV':            { title: 'مرتجعات البيع',      path: 'مبيعات ← مرتجعات'      },
  'documents/DDP':           { title: 'طلبات عروض الأسعار', path: 'مشتريات ← طلبات عروض'  },
  'documents/BCF':           { title: 'أوامر الشراء',       path: 'مشتريات ← أوامر شراء'  },
  'documents/BR':            { title: 'وصل الاستلام',       path: 'مشتريات ← وصل استلام'  },
  'documents/FA':            { title: 'فواتير الشراء',      path: 'مشتريات ← فواتير شراء' },
  'documents/AA':            { title: 'مرتجعات الشراء',     path: 'مشتريات ← مرتجعات'     },
  'products':                { title: 'المنتجات',            path: 'مخزون ← منتجات'         },
  'inventory':               { title: 'إدارة المخزون',      path: 'مخزون ← جرد'            },
  'categories':              { title: 'الفئات',              path: 'مخزون ← فئات'           },
  'brands':                  { title: 'العلامات التجارية',  path: 'مخزون ← علامات'         },
  'units':                   { title: 'وحدات القياس',       path: 'مخزون ← وحدات'          },
  'suppliers':               { title: 'الموردون',            path: 'مخزون ← موردون'         },
  'warehouses':              { title: 'المستودعات',          path: 'مخزون ← مستودعات'       },
  'clients':                 { title: 'العملاء',             path: 'محاسبة ← عملاء'         },
  'finance':                 { title: 'الخزينة',             path: 'محاسبة ← خزينة'         },
  'expenses':                { title: 'المصروفات',           path: 'محاسبة ← مصروفات'       },
  'debts':                   { title: 'الديون',              path: 'محاسبة ← ديون'          },
  'tva':                     { title: 'إقرار TVA — G50',     path: 'محاسبة ← TVA'           },
  'fiscal':                  { title: 'الملف الجبائي',      path: 'محاسبة ← جبايات'        },
  'fiscalyears':             { title: 'السنوات المالية',     path: 'محاسبة ← سنوات مالية'  },
  'currencies':              { title: 'العملات',             path: 'محاسبة ← عملات'         },
  'pricelevels':             { title: 'مستويات الأسعار',    path: 'محاسبة ← مستويات أسعار' },
  'employees':               { title: 'الموظفون',            path: 'موارد بشرية ← موظفون'   },
  'reports':                 { title: 'التقارير',            path: 'تقارير'                  },
  'balance':                 { title: 'الميزانية التقديرية', path: 'تقارير ← ميزانية'       },
  'users':                   { title: 'المستخدمون',          path: 'نظام ← مستخدمون'        },
  'settings':                { title: 'الإعدادات',           path: 'نظام ← إعدادات'         },
  'settings/document-types': { title: 'أنواع المستندات',    path: 'نظام ← أنواع المستندات' },
  'numbering-series':        { title: 'سلاسل الترقيم',      path: 'نظام ← سلاسل الترقيم'   },
  'payment-methods':         { title: 'طرق الدفع',           path: 'نظام ← طرق الدفع'       },
  'expense-categories':      { title: 'فئات المصروفات',     path: 'نظام ← فئات المصروفات'  },
  'admin/companies':         { title: 'إدارة الشركات',      path: 'Super Admin ← الشركات'  },
};

// ════════════════════════════════════════════════
// نافذة إنشاء السنة المالية — إجبارية لا تُغلَق
// ════════════════════════════════════════════════
function NoFiscalYearModal({ onCreated }: { onCreated: () => void }) {
  const { activeCompany }  = useAuth();
  const thisYear           = new Date().getFullYear();
  const [yearName, setYearName]   = useState(String(thisYear));
  const [creating, setCreating]   = useState(false);
  const [error,    setError]      = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleCreate = async () => {
    const name = yearName.trim();
    const y    = parseInt(name);
    if (isNaN(y) || y < 2000 || y > 2100) {
      setError('أدخل سنة صحيحة بأربعة أرقام (مثال: 2025)');
      return;
    }
    if (!activeCompany?.slug) {
      setError('لم يتم تحديد الشركة النشطة، أعد تسجيل الدخول.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      // ✅ نفس endpoint الذي يستخدمه FiscalYearContext
      await apiClient.post(`/${activeCompany.slug}/fiscal-years`, {
        name,
        start_date: `${y}-01-01`,
        end_date:   `${y}-12-31`,
        is_current: true,
      });
      onCreated();   // يُطلِق refetch() في Context
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.response?.data?.errors?.name?.[0] ?? 'فشل إنشاء السنة المالية.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:10002,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,.78)', backdropFilter:'blur(10px)', padding:16,
    }}>
      <div style={{
        background:'var(--bg2)', borderRadius:20, width:'100%', maxWidth:420,
        border:'1px solid var(--b3)', boxShadow:'0 24px 64px rgba(0,0,0,.45)',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:'28px 28px 22px',
          background:'linear-gradient(135deg, var(--em), var(--em3))',
          textAlign:'center', position:'relative', overflow:'hidden',
        }}>
          {/* Decoration circles */}
          <div style={{ position:'absolute', top:-50, left:-50, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-30, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
          <div style={{ position:'relative' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
            <div style={{ fontSize:19, fontWeight:800, color:'#fff', marginBottom:5 }}>
              لا توجد سنة مالية نشطة
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.8)', lineHeight:1.5 }}>
              يجب إنشاء سنة مالية لبدء استخدام النظام
              {activeCompany && (
                <div style={{ marginTop:6, fontSize:11, color:'rgba(255,255,255,.6)' }}>
                  الشركة: <strong style={{ color:'rgba(255,255,255,.9)' }}>{activeCompany.name}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'26px 28px 28px' }}>
          <label style={{ display:'block', fontSize:13, fontWeight:700, color:'var(--t2)', marginBottom:8 }}>
            السنة المالية
          </label>
          <input
            ref={inputRef}
            type="text"
            value={yearName}
            onChange={e => { setYearName(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={`مثال: ${thisYear}`}
            maxLength={4}
            style={{
              width:'100%', padding:'13px 16px', borderRadius:'var(--r2)',
              border:`1.5px solid ${error ? 'var(--red)' : 'var(--b3)'}`,
              background:'var(--bg3)', color:'var(--t1)',
              fontFamily:'Tajawal, sans-serif', fontSize:18,
              fontWeight:800, textAlign:'center', outline:'none',
              transition:'.14s', direction:'ltr',
              marginBottom: error ? 8 : 0,
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--em)')}
            onBlur={e => (e.target.style.borderColor = error ? 'var(--red)' : 'var(--b3)')}
          />

          {error && (
            <div style={{
              fontSize:12, color:'var(--red)', marginBottom:0,
              padding:'8px 12px', borderRadius:8,
              background:'var(--redb)', border:'1px solid var(--redbo)',
              marginTop: 8,
            }}>⚠️ {error}</div>
          )}

          {/* Preview */}
          {yearName.trim().length === 4 && !isNaN(parseInt(yearName)) && (
            <div style={{
              margin:'14px 0 20px', padding:'10px 14px',
              background:'var(--bg3)', borderRadius:10,
              border:'1px solid var(--b2)',
              fontSize:12, color:'var(--t3)', lineHeight:1.7,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--t4)' }}>تاريخ البداية</span>
                <strong>01 يناير {yearName}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--t4)' }}>تاريخ النهاية</span>
                <strong>31 ديسمبر {yearName}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--t4)' }}>الحالة</span>
                <strong style={{ color:'var(--em)' }}>✓ سنة حالية</strong>
              </div>
            </div>
          )}

          {(!yearName.trim() || yearName.trim().length !== 4 || isNaN(parseInt(yearName))) && (
            <div style={{ marginBottom: 20 }} />
          )}

          <button
            onClick={handleCreate}
            disabled={creating || !yearName.trim()}
            style={{
              width:'100%', padding:'13px 20px',
              borderRadius:'var(--r2)', border:'none',
              background: creating || !yearName.trim() ? 'var(--bg4)' : 'var(--em)',
              color: creating || !yearName.trim() ? 'var(--t4)' : '#fff',
              fontSize:14, fontWeight:800,
              cursor: creating ? 'wait' : !yearName.trim() ? 'not-allowed' : 'pointer',
              fontFamily:'Tajawal, sans-serif',
              boxShadow: yearName.trim() && !creating ? 'var(--emglow)' : 'none',
              transition:'.2s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}
          >
            {creating ? (
              <>
                <span style={{ display:'inline-block', width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', animation:'spin .7s linear infinite' }} />
                جارٍ الإنشاء...
              </>
            ) : (
              <>
                <i className="ti ti-calendar-plus" />
                إنشاء السنة المالية {yearName}
              </>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════
// DashboardLayout
// ════════════════════════════════════════════════
export default function DashboardLayout() {
  const { user, logout, activeCompany } = useAuth() as any;
  const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'super-admin') ?? false;
  const location                        = useLocation();
  const navigate                        = useNavigate();
  const { dark, toggle: toggleTheme }   = useTheme();
  const [drawerOpen, setDrawerOpen]     = useState(false);

  // ✅ نستخدم FiscalYearContext مباشرة — بدون useParams
  const { years, selectedYear, isLoading: fiscalLoading, refetch } = useFiscalYear();

  // ✅ fiscalState مشتق بالكامل من Context
  const fiscalState: 'loading' | 'noYear' | 'ready' =
    fiscalLoading         ? 'loading' :
    !activeCompany?.slug  ? 'loading' :   // ← ننتظر لو الشركة لم تُحدَّد بعد
    years.length === 0    ? 'noYear'  :
    selectedYear !== null ? 'ready'   : 'loading';

  // ✅ بعد إنشاء السنة → refetch فقط بدون reload
  const handleYearCreated = async () => {
    await refetch();
  };

  const currentPath = location.pathname.replace(/^\//, '') || 'dashboard';
  const meta = PAGE_META[currentPath] ?? { title: 'لوحة التحكم', path: 'الرئيسية' };
  const userInitial = user?.name?.[0] ?? 'م';

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ════════ SIDEBAR ════════ */}
      <nav id="sidebar">
        <div className="sb-logo">
          <div className="sb-mark">ب</div>
          <div>
            <div className="sb-name">نظام المبيعات</div>
            <div className="sb-sub">إدارة متكاملة • الجزائر</div>
          </div>
        </div>

        {activeCompany && (
          <div className="sb-co">
            <div className="sb-co-name">{activeCompany.name}</div>
            <div className="sb-co-info">{activeCompany.slug}</div>
          </div>
        )}

        {NAV_GROUPS.filter(g => !(g as any).superAdminOnly || isSuperAdmin).map((group, idx) => (
          <div className="sb-sec" key={group.label}>
            <div className="sb-lbl" style={{ color: LABEL_COLORS[idx] }}>{group.label}</div>
            {group.items.map(item => {
              const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
              return (
                <Link key={item.href} to={item.href} className={`sbi${isActive ? ' on' : ''}`}>
                  <span className="sbi-ic ic"><i className={`ti ${item.icon}`} /></span>
                  {item.name}
                  {'badge' in item && item.badge && <span className="sbi-badge">{item.badge}</span>}
                  {'badgeWarn' in item && item.badgeWarn && (
                    <span className="sbi-badge w ic-badge">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      </svg>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="sb-foot">
          <div className="sb-user" onClick={logout} title="تسجيل الخروج">
            <div className="sb-av">{userInitial}</div>
            <div>
              <div className="sb-uname">{user?.name ?? 'المستخدم'}</div>
              <div className="sb-urole">{(user as any)?.role ?? 'مدير النظام'}</div>
            </div>
            <div className="sb-dot" title="متصل" />
          </div>
        </div>
      </nav>

      {/* ════════ MAIN ════════ */}
      <main id="main">
        {/* Topbar */}
        <div id="topbar">
          <div className="tb-info">
            <div className="tb-title">{meta.title}</div>
            <div className="tb-path">{meta.path}</div>
          </div>
          <div className="tb-actions">
            <FiscalYearSelector />
            <div className="srch">
              <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
              <input type="text" placeholder="بحث سريع..." />
            </div>
            <div className="ib" title="الإشعارات">
              <span className="ic ic-sm"><i className="ti ti-bell" /></span>
              <div className="ib-n">5</div>
            </div>
            <button className="ib" onClick={toggleTheme} title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}>
              <span className="ic ic-sm"><i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} /></span>
            </button>
            <button className="tb-btn p" onClick={() => navigate('pos')}>
              <span className="ic ic-xs"><i className="ti ti-plus" /></span>
              <span>فاتورة جديدة</span>
            </button>
          </div>
        </div>

        {/* ════════ المحتوى ════════ */}
        <div style={{ flex:1 }}>
          {fiscalState === 'loading' && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:12, color:'var(--t4)' }}>
              <i className="ti ti-loader" style={{ fontSize:20, color:'var(--em)', animation:'spin 1s linear infinite' }} />
              <span style={{ fontSize:14 }}>جارٍ تحميل بيانات السنة المالية...</span>
            </div>
          )}

          {/* ✅ نافذة إجبارية — لا يمكن إغلاقها */}
          {fiscalState === 'noYear' && (
            <NoFiscalYearModal onCreated={handleYearCreated} />
          )}

          {fiscalState === 'ready' && <Outlet />}
        </div>
      </main>

      {/* ════════ MOBILE NAV ════════ */}
      <div id="mob-nav">
        <div className="mob-tabs">
          <Link to="dashboard" className={`mt${currentPath === 'dashboard' ? ' on' : ''}`}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-home" /></span></div>
            <div className="mt-lbl">الرئيسية</div>
          </Link>
          <Link to="documents/FV" className={`mt${currentPath === 'documents/FV' ? ' on' : ''}`}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-file-text" /></span></div>
            <div className="mt-lbl">فواتير</div>
            <div className="mt-n">3</div>
          </Link>
          <div className="mt-fab" onClick={() => navigate('pos')}>
            <div className="fab-btn"><span className="ic"><i className="ti ti-shopping-cart" /></span></div>
            <div className="mt-lbl" style={{ fontSize:9, marginTop:2 }}>بيع</div>
          </div>
          <Link to="inventory" className={`mt${currentPath === 'inventory' ? ' on' : ''}`}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-package" /></span></div>
            <div className="mt-lbl">مخزون</div>
          </Link>
          <div className="mt" onClick={() => setDrawerOpen(true)}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-dots" /></span></div>
            <div className="mt-lbl">المزيد</div>
          </div>
        </div>
      </div>

      {/* ════════ MOBILE DRAWER ════════ */}
      <div id="mob-drawer" className={drawerOpen ? 'on' : ''} onClick={() => setDrawerOpen(false)}>
        <div className="mdb-bg" />
        <div className="mdb-panel" onClick={e => e.stopPropagation()}>
          <div className="mdb-handle" />
          <div className="mdb-title">التنقل السريع</div>
          <div className="mdb-grid">
            {[
              { href:'pos',          icon:'ti-shopping-cart', label:'بيع'    },
              { href:'inventory',    icon:'ti-package',       label:'مخزون'  },
              { href:'finance',      icon:'ti-building-bank', label:'خزينة'  },
              { href:'clients',      icon:'ti-users',         label:'عملاء'  },
              { href:'documents/FV', icon:'ti-file-text',     label:'فواتير' },
              { href:'expenses',     icon:'ti-credit-card',   label:'مصاريف' },
              { href:'products',     icon:'ti-list',          label:'منتجات' },
              { href:'reports',      icon:'ti-chart-bar',     label:'تقارير' },
            ].map(({ href, icon, label }) => (
              <div key={href} className="mdb-item" onClick={() => { navigate(href); setDrawerOpen(false); }}>
                <div className="mdb-ic"><span className="ic"><i className={`ti ${icon}`} /></span></div>
                <div className="mdb-lbl">{label}</div>
              </div>
            ))}
          </div>
          <div className="mdb-title" style={{ marginTop:8 }}>الحساب</div>
          <div className="mdb-row" onClick={() => { logout(); setDrawerOpen(false); }}>
            <span className="ic ic-sm"><i className="ti ti-logout" /></span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--red)' }}>تسجيل الخروج</span>
          </div>
        </div>
      </div>
    </>
  );
}
