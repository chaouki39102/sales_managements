// ════════════════════════════════════════════════════════════════════════════
// components/modals/SystemBootModal.tsx
//
// مودال تحميل مكونات النظام عند أول دخول للشركة
// يُعرض بعد اختيار السنة المالية وقبل navigate('/dashboard')
// يُنفذ prefetch لجميع الـ lookups حتى تكون جاهزة فور الدخول
//
// الاستخدام:
//   <SystemBootModal
//     companySlug={slug}
//     onComplete={() => navigate('/dashboard', { replace: true })}
//   />
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/core/client';

// ─── قائمة الموارد المُراد تحميلها مسبقاً ──────────────────────────────────
interface BootResource {
  key: string;          // queryKey الذي يُخزَّن به في React Query cache
  label: string;        // النص المعروض للمستخدم
  endpoint: string;     // المسار النسبي للـ API  (/{slug}/...)
  icon: string;         // tabler icon class
  group: string;        // مجموعة بصرية
  critical: boolean;    // إذا فشل → يُظهر warning لكن لا يوقف التحميل
}

const BOOT_RESOURCES: BootResource[] = [
  // ── مجموعة 1: أساسيات ────────────────────────────────────────────────────
  { key: 'currencies',                label: 'العملات',                    endpoint: 'currencies',                  icon: 'ti-currency-dollar',        group: 'أساسيات',        critical: true  },
  { key: 'tvas',                      label: 'نسب الضريبة TVA',            endpoint: 'tvas',                        icon: 'ti-receipt-tax',            group: 'أساسيات',        critical: true  },
  { key: 'units',                     label: 'وحدات القياس',               endpoint: 'units',                       icon: 'ti-ruler',                  group: 'أساسيات',        critical: true  },
  { key: 'price_levels',              label: 'مستويات الأسعار',            endpoint: 'price-levels',               icon: 'ti-tags',                   group: 'أساسيات',        critical: false },
  { key: 'payment_modes',             label: 'طرق الدفع',                  endpoint: 'payment-modes',              icon: 'ti-credit-card',            group: 'أساسيات',        critical: true  },

  // ── مجموعة 2: منتجات ─────────────────────────────────────────────────────
  { key: 'product_types',             label: 'أنواع المنتجات',             endpoint: 'product-types',              icon: 'ti-box',                    group: 'منتجات',         critical: false },
  { key: 'families',                  label: 'عائلات المنتجات',            endpoint: 'families',                   icon: 'ti-category',               group: 'منتجات',         critical: false },
  { key: 'brands',                    label: 'العلامات التجارية',          endpoint: 'brands',                     icon: 'ti-bookmark',               group: 'منتجات',         critical: false },
  { key: 'warehouses',                label: 'المستودعات',                 endpoint: 'warehouses',                 icon: 'ti-building-warehouse',     group: 'منتجات',         critical: true  },
  { key: 'inventory_valuation',       label: 'طرق تقييم المخزون',         endpoint: 'inventory-valuation-methods',icon: 'ti-chart-bar',              group: 'منتجات',         critical: false },

  // ── مجموعة 3: مالية ──────────────────────────────────────────────────────
  { key: 'treasury_account_types',    label: 'أنواع الخزينة',              endpoint: 'treasury-account-types',     icon: 'ti-building-bank',          group: 'مالية',          critical: false },
  { key: 'treasury_accounts',         label: 'حسابات الخزينة',            endpoint: 'treasury-accounts',          icon: 'ti-cash',                   group: 'مالية',          critical: true  },
  { key: 'expense_categories',        label: 'فئات المصاريف',              endpoint: 'expense-categories',         icon: 'ti-folder',                 group: 'مالية',          critical: false },

  // ── مجموعة 4: مستندات ────────────────────────────────────────────────────
  { key: 'document_types',            label: 'أنواع المستندات',            endpoint: 'document-types',             icon: 'ti-file-description',       group: 'مستندات',        critical: true  },
  { key: 'document_statuses',         label: 'حالات المستندات',            endpoint: 'document-statuses',          icon: 'ti-clipboard-check',        group: 'مستندات',        critical: false },
  { key: 'numbering_series',          label: 'سلاسل الترقيم',              endpoint: 'numbering-series',           icon: 'ti-list-numbers',           group: 'مستندات',        critical: false },

  // ── مجموعة 5: أطراف ──────────────────────────────────────────────────────
  { key: 'party_types',               label: 'أنواع الأطراف',              endpoint: 'party-types',                icon: 'ti-users',                  group: 'أطراف',          critical: false },

  // ── مجموعة 6: بيانات جغرافية ─────────────────────────────────────────────
  { key: 'wilayas',                   label: 'الولايات والبلديات',         endpoint: 'wilayas',                    icon: 'ti-map-pin',                group: 'جغرافيا',        critical: false },
];

const TOTAL = BOOT_RESOURCES.length;

// ─── ألوان المجموعات ──────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  'أساسيات':  'var(--em)',
  'منتجات':   'var(--blue)',
  'مالية':    'var(--gold)',
  'مستندات':  'var(--purple)',
  'أطراف':    'var(--teal)',
  'جغرافيا':  'var(--orange)',
};

// ─── نوع الحالة الفردية ───────────────────────────────────────────────────
type ItemStatus = 'pending' | 'loading' | 'done' | 'error' | 'skipped';

interface ItemState {
  status: ItemStatus;
  ms?: number;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SystemBootModal({
  companySlug,
  onComplete,
}: {
  companySlug: string;
  onComplete: () => void;
}) {
  const qc = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(BOOT_RESOURCES.map(r => [r.key, { status: 'pending' }]))
  );
  const [doneCount, setDoneCount]     = useState(0);
  const [currentLabel, setCurrentLabel] = useState('جارٍ التحضير...');
  const [phase, setPhase]             = useState<'loading' | 'done' | 'error'>('loading');
  const [errors, setErrors]           = useState<string[]>([]);
  const [elapsed, setElapsed]         = useState(0);
  const startRef  = useRef(Date.now());
  const timerRef  = useRef<ReturnType<typeof setInterval>>();
  const doneRef   = useRef(0);
  const listRef   = useRef<HTMLDivElement>(null);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Prefetch runner ──────────────────────────────────────────────────────
  const setItem = useCallback((key: string, patch: Partial<ItemState>) => {
    setItems(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const errs: string[] = [];

      for (const res of BOOT_RESOURCES) {
        if (cancelled) break;

        setCurrentLabel(res.label);
        setItem(res.key, { status: 'loading' });

        // Scroll active item into view
        setTimeout(() => {
          const el = document.getElementById(`boot-item-${res.key}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);

        const t0 = Date.now();
        try {
          // تحقق أولاً: هل البيانات موجودة في cache؟
          const cached = qc.getQueryData([res.key, companySlug]);
          if (cached) {
            setItem(res.key, { status: 'done', ms: 0 });
          } else {
            // endpoint يبدأ بـ slug الشركة إلا إذا كان wilayas (عالمي)
            const url = res.key === 'wilayas'
              ? `/wilayas`
              : `/${companySlug}/${res.endpoint}`;

            const data = await apiGet<any>(url, { per_page: 500, no_paginate: 1 });
            // خزّن في React Query cache مباشرة — extractData يُزيل الغلاف بالفعل
            qc.setQueryData([res.key, companySlug], data);
            setItem(res.key, { status: 'done', ms: Date.now() - t0 });
          }
        } catch (e: any) {
          const msg = e?.response?.data?.message ?? e?.message ?? 'خطأ';
          setItem(res.key, { status: 'error' });
          errs.push(`${res.label}: ${msg}`);
        }

        doneRef.current += 1;
        setDoneCount(doneRef.current);

        // تأخير بسيط بين الطلبات لتجنب حجب الخادم
        await new Promise(r => setTimeout(r, 60));
      }

      if (!cancelled) {
        clearInterval(timerRef.current);
        setErrors(errs);
        setPhase(errs.length > 0 && errs.length === TOTAL ? 'error' : 'done');
        setCurrentLabel(errs.length === 0 ? 'اكتمل التحميل بنجاح ✓' : `اكتمل مع ${errs.length} تحذيرات`);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [companySlug, qc, setItem]);

  // ── Auto-proceed after done ──────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(onComplete, 900);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  const progress = Math.round((doneCount / TOTAL) * 100);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10050,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(12px)',
      padding: 20, direction: 'rtl',
      animation: 'bootFadeIn .25s ease',
    }}>
      <div style={{
        background: 'var(--bg2)',
        borderRadius: 24,
        width: '100%', maxWidth: 480,
        border: '1px solid var(--b3)',
        boxShadow: '0 32px 80px rgba(0,0,0,.45)',
        overflow: 'hidden',
        animation: 'bootSlideUp .3s cubic-bezier(.34,1.4,.64,1)',
      }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)',
          padding: '24px 28px 20px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* دوائر زخرفية */}
          <div style={{ position:'absolute', top:-50, left:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-30, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />

          <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:16 }}>
            {/* أيقونة */}
            <div style={{
              width:52, height:52, borderRadius:16, flexShrink:0,
              background:'rgba(255,255,255,.2)', backdropFilter:'blur(8px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:24, boxShadow:'0 4px 16px rgba(0,0,0,.2)',
            }}>
              {phase === 'done' ? '✅' : phase === 'error' ? '⚠️' : '⚡'}
            </div>

            <div style={{ flex:1 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#fff', marginBottom:4, lineHeight:1.2 }}>
                {phase === 'done'
                  ? 'النظام جاهز!'
                  : phase === 'error'
                  ? 'اكتمل مع تحذيرات'
                  : 'جارٍ تهيئة النظام'}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>
                {phase === 'loading'
                  ? `تحميل مكونات النظام لتجربة سلسة · ${elapsed}ث`
                  : `اكتمل في ${elapsed} ثانية`}
              </div>
            </div>
          </div>

          {/* شريط التقدم */}
          <div style={{ marginTop:20 }}>
            <div style={{
              height:6, borderRadius:99,
              background:'rgba(255,255,255,.2)',
              overflow:'hidden',
            }}>
              <div style={{
                height:'100%', borderRadius:99,
                background:'rgba(255,255,255,.9)',
                width:`${progress}%`,
                transition:'width .4s cubic-bezier(.4,0,.2,1)',
                boxShadow:'0 0 12px rgba(255,255,255,.5)',
              }} />
            </div>
            <div style={{
              display:'flex', justifyContent:'space-between',
              marginTop:6, fontSize:11, color:'rgba(255,255,255,.7)',
            }}>
              <span style={{ animation: phase==='loading' ? 'bootPulse 1.5s ease infinite' : 'none' }}>
                {currentLabel}
              </span>
              <span style={{ fontWeight:800, color:'#fff' }}>{progress}٪</span>
            </div>
          </div>
        </div>

        {/* ── قائمة العناصر ──────────────────────────────────────────────── */}
        <div
          ref={listRef}
          style={{
            maxHeight: 280, overflowY:'auto', padding:'12px 16px',
            scrollbarWidth:'thin',
          }}
        >
          {BOOT_RESOURCES.map((res) => {
            const state = items[res.key];
            const color = GROUP_COLORS[res.group] ?? 'var(--em)';
            return (
              <div
                id={`boot-item-${res.key}`}
                key={res.key}
                className="boot-item-row"
              >
                {/* أيقونة الحالة */}
                <div style={{ width:28, height:28, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {state.status === 'pending'  && <i className={`ti ${res.icon}`} style={{ fontSize:15, color:'var(--t4)' }} />}
                  {state.status === 'loading'  && <i className="ti ti-loader-2"   style={{ fontSize:15, color, animation:'bootSpin .7s linear infinite' }} />}
                  {state.status === 'done'     && (
                    <div style={{
                      width:22, height:22, borderRadius:'50%',
                      background:color, display:'flex', alignItems:'center', justifyContent:'center',
                      animation:'bootPop .3s cubic-bezier(.34,1.5,.64,1)',
                    }}>
                      <i className="ti ti-check" style={{ fontSize:12, color:'#fff', fontWeight:900 }} />
                    </div>
                  )}
                  {state.status === 'error'    && (
                    <div style={{
                      width:22, height:22, borderRadius:'50%',
                      background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <i className="ti ti-x" style={{ fontSize:11, color:'#fff' }} />
                    </div>
                  )}
                  {state.status === 'skipped'  && <i className="ti ti-minus" style={{ fontSize:13, color:'var(--t4)' }} />}
                </div>

                {/* النص */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:12, fontWeight:600,
                    color: state.status === 'loading' ? 'var(--t1)'
                         : state.status === 'done'    ? 'var(--t2)'
                         : state.status === 'error'   ? 'var(--red)'
                         : 'var(--t4)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {res.label}
                  </div>
                  {state.status === 'loading' && (
                    <div style={{
                      height:3, borderRadius:99, marginTop:3,
                      background:'var(--bg4)', overflow:'hidden',
                    }}>
                      <div style={{
                        height:'100%', borderRadius:99, width:'60%',
                        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                        backgroundSize:'400px 100%',
                        animation:'bootShimmer 1.2s linear infinite',
                      }} />
                    </div>
                  )}
                </div>

                {/* الوقت */}
                <div style={{ fontSize:10, color:'var(--t4)', flexShrink:0 }}>
                  {state.status === 'done' && state.ms !== undefined && state.ms > 0 && `${state.ms}ms`}
                  {state.status === 'done' && state.ms === 0 && <span style={{ color:'var(--em)', fontSize:9, fontWeight:700 }}>cache</span>}
                  {state.status === 'error' && <span style={{ color:'var(--red)', fontSize:9 }}>خطأ</span>}
                </div>

                {/* شارة المجموعة */}
                <div style={{
                  fontSize:9, fontWeight:700, padding:'1px 6px',
                  borderRadius:99, flexShrink:0,
                  background:`${color}22`, color,
                }}>
                  {res.group}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{
          padding:'12px 20px 18px',
          borderTop:'1px solid var(--b1)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
        }}>
          <div style={{ fontSize:11, color:'var(--t4)' }}>
            {doneCount} / {TOTAL} مكوّن
            {errors.length > 0 && (
              <span style={{ color:'var(--orange)', marginRight:8, fontWeight:700 }}>
                · {errors.length} تحذير
              </span>
            )}
          </div>

          {/* زر التخطي — يظهر بعد 3 ثواني فقط */}
          {phase === 'loading' && elapsed >= 3 && (
            <button
              onClick={onComplete}
              style={{
                padding:'6px 14px', borderRadius:10,
                border:'1px solid var(--b3)', background:'var(--bg3)',
                color:'var(--t3)', fontSize:11, fontWeight:700,
                cursor:'pointer', fontFamily:'Tajawal, sans-serif',
                transition:'all .13s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--em)'; e.currentTarget.style.color='var(--em)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--b3)'; e.currentTarget.style.color='var(--t3)'; }}
            >
              تخطي والدخول
            </button>
          )}

          {phase === 'done' && (
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 14px', borderRadius:10,
              background:'var(--emb)', border:'1px solid var(--embo)',
              fontSize:11, fontWeight:700, color:'var(--em)',
            }}>
              <i className="ti ti-rocket" style={{ fontSize:13 }} />
              جارٍ الانتقال...
            </div>
          )}

          {phase === 'error' && (
            <button
              onClick={onComplete}
              style={{
                padding:'6px 14px', borderRadius:10,
                border:'none', background:'var(--em)', color:'#fff',
                fontSize:11, fontWeight:700, cursor:'pointer',
                fontFamily:'Tajawal, sans-serif',
              }}
            >
              دخول رغم ذلك
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
