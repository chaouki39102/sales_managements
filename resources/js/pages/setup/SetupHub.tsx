// ════════════════════════════════════════════════════════════
// pages/setup/SetupHub.tsx
// مركز الإعداد — تهيئة البيانات الأولية للشركة
// يُعرض مرة واحدة بعد إنشاء الشركة أو من إعدادات الشركة
// ════════════════════════════════════════════════════════════
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api/client';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════
type RunState = 'idle' | 'running' | 'done' | 'error' | 'skipped';

interface SeederDef {
  key:         string;
  class:       string;
  label:       string;
  description: string;
  icon:        string;
  color:       string;
  required:    boolean;   // إجباري لا يمكن إلغاؤه
  depends?:    string[];  // keys يجب تشغيلها قبله
}

interface SeederGroup {
  key:     string;
  label:   string;
  icon:    string;
  color:   string;
  seeders: SeederDef[];
}

// ════════════════════════════════════════════════════════════
// Seeder Definitions — مجمّعة بمنطق
// ════════════════════════════════════════════════════════════
const GROUPS: SeederGroup[] = [
  {
    key: 'core', label: 'البيانات الأساسية', icon: 'ti-database', color: 'var(--em)',
    seeders: [
      { key: 'roles',    class: 'RolesAndPermissionsSeeder', label: 'الأدوار والصلاحيات',  description: 'ينشئ الأدوار (admin, manager, salesperson...) وصلاحياتها', icon: 'ti-shield',        color: 'var(--em)',    required: true  },
      { key: 'genders',  class: 'GenderSeeder',              label: 'الجنس',                description: 'ذكر / أنثى',                                             icon: 'ti-gender-bigender', color: 'var(--blue)',   required: true  },
      { key: 'legal',    class: 'LegalFormSeeder',           label: 'الأشكال القانونية',   description: 'SARL، EURL، SPA، SNC...',                                icon: 'ti-file-certificate', color: 'var(--blue)',  required: false },
      { key: 'wilayas',  class: 'WilayaCommuneSeeder',       label: 'الولايات والبلديات',  description: '58 ولاية و1541 بلدية جزائرية',                           icon: 'ti-map-pin',          color: 'var(--teal)',  required: false },
    ],
  },
  {
    key: 'finance', label: 'المالية والمحاسبة', icon: 'ti-cash', color: 'var(--gold)',
    seeders: [
      { key: 'currencies',   class: 'CurrencySeeder',           label: 'العملات',              description: 'الدينار الجزائري، اليورو، الدولار...',                   icon: 'ti-currency-dollar', color: 'var(--gold)',   required: true  },
      { key: 'tvas',         class: 'TvaSeeder',                label: 'معدلات TVA',            description: '0%، 9%، 19% — حسب التشريع الجزائري',                    icon: 'ti-receipt-tax',     color: 'var(--gold)',   required: true  },
      { key: 'fiscal_stamp', class: 'FiscalStampSeeder',        label: 'الطابع الجبائي',       description: 'الطابع التدريجي حسب LF 2025',                            icon: 'ti-stamp',           color: 'var(--gold)',   required: false },
      { key: 'price_levels', class: 'PriceLevelSeeder',         label: 'مستويات الأسعار',      description: 'سعر التجزئة، نصف الجملة، الجملة',                        icon: 'ti-tag',             color: 'var(--gold)',   required: false },
      { key: 'payment_modes',class: 'PaymentModeSeeder',        label: 'طرق الدفع',            description: 'نقداً، شيك، تحويل بنكي، آجل...',                         icon: 'ti-wallet',          color: 'var(--gold)',   required: false },
      { key: 'treasury',     class: 'TreasuryAccountSeeder',    label: 'حسابات الخزينة',       description: 'الصندوق الرئيسي وحساب بنكي افتراضي',                     icon: 'ti-building-bank',   color: 'var(--gold)',   required: false },
      { key: 'expenses_cat', class: 'ExpenseCategorySeeder',    label: 'فئات المصروفات',       description: 'إيجار، رواتب، مواد، خدمات...',                           icon: 'ti-category',        color: 'var(--orange)', required: false },
    ],
  },
  {
    key: 'inventory', label: 'المخزون والمنتجات', icon: 'ti-package', color: 'var(--blue)',
    seeders: [
      { key: 'units',       class: 'UnitSeeder',                label: 'وحدات القياس',         description: 'كغ، لتر، قطعة، صندوق، كرتون...',                         icon: 'ti-ruler',           color: 'var(--blue)',   required: true  },
      { key: 'inv_methods', class: 'InventoryValuationMethodSeeder', label: 'طرق تقييم المخزون', description: 'FIFO، LIFO، متوسط الأسعار',                           icon: 'ti-chart-bar',       color: 'var(--blue)',   required: false },
      { key: 'warehouse',   class: 'WarehouseSeeder',            label: 'المستودعات',           description: 'مستودع رئيسي افتراضي',                                   icon: 'ti-building-warehouse', color: 'var(--blue)', required: false },
    ],
  },
  {
    key: 'documents', label: 'المستندات التجارية', icon: 'ti-file-invoice', color: 'var(--purple)',
    seeders: [
      { key: 'doc_ops',       class: 'DocumentBaseOperationSeeder', label: 'عمليات المستندات',   description: 'بيع، شراء، مرتجع، تحويل...',                           icon: 'ti-arrows-transfer-up-down', color: 'var(--purple)', required: true, depends: [] },
      { key: 'doc_statuses',  class: 'DocumentStatusSeeder',        label: 'حالات المستندات',   description: 'مسودة، مؤكد، ملغى، مدفوع...',                          icon: 'ti-list-check',     color: 'var(--purple)',  required: true  },
      { key: 'doc_types',     class: 'DocumentTypeSeeder',          label: 'أنواع المستندات',   description: 'فاتورة، BL، عرض سعر، أمر شراء...',                     icon: 'ti-files',          color: 'var(--purple)',  required: true, depends: ['doc_ops', 'doc_statuses'] },
      { key: 'numbering',     class: 'NumberingSeriesSeeder',        label: 'سلاسل الترقيم',     description: 'F-2025-XXXX، BC-2025-XXXX...',                         icon: 'ti-sort-ascending-numbers', color: 'var(--purple)', required: false, depends: ['doc_types', 'warehouse'] },
    ],
  },
  {
    key: 'demo', label: 'بيانات تجريبية', icon: 'ti-sparkles', color: 'var(--teal)',
    seeders: [
      { key: 'parties_demo', class: 'PartierSeeder',   label: 'عملاء وموردون تجريبيون', description: '10 عملاء + 5 موردون جزائريون مع بيانات واقعية', icon: 'ti-users',   color: 'var(--teal)',   required: false },
      { key: 'fiscal_year',  class: 'FiscalYearSeeder', label: 'سنة مالية',              description: `سنة مالية ${new Date().getFullYear()} جاهزة للاستخدام`,    icon: 'ti-calendar', color: 'var(--teal)',  required: false },
    ],
  },
];

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════
const ALL_SEEDERS = GROUPS.flatMap(g => g.seeders);

function getInitialSelected(): Set<string> {
  const s = new Set<string>();
  ALL_SEEDERS.forEach(sd => { if (sd.required) s.add(sd.key); });
  return s;
}

function resolveDeps(key: string, selected: Set<string>): Set<string> {
  const next = new Set(selected);
  const sd = ALL_SEEDERS.find(s => s.key === key);
  if (sd?.depends) {
    sd.depends.forEach(dep => {
      next.add(dep);
      resolveDeps(dep, next).forEach(k => next.add(k));
    });
  }
  return next;
}

// ════════════════════════════════════════════════════════════
// SeederCard
// ════════════════════════════════════════════════════════════
function SeederCard({
  seeder, selected, state, onClick,
}: {
  seeder: SeederDef;
  selected: boolean;
  state: RunState;
  onClick: () => void;
}) {
  const isRunning = state === 'running';
  const isDone    = state === 'done';
  const isError   = state === 'error';

  const stateStyles: Record<RunState, React.CSSProperties> = {
    idle:    { border: selected ? `1.5px solid ${seeder.color}` : '1.5px solid var(--b2)', background: selected ? `${seeder.color}11` : 'var(--bg3)' },
    running: { border: `1.5px solid ${seeder.color}`, background: `${seeder.color}18`, boxShadow: `0 0 14px ${seeder.color}33` },
    done:    { border: '1.5px solid var(--em)', background: 'var(--emb)' },
    error:   { border: '1.5px solid var(--red)', background: 'var(--redb)' },
    skipped: { border: '1.5px solid var(--b2)', background: 'var(--bg3)', opacity: .5 },
  };

  return (
    <div
      onClick={!seeder.required && state === 'idle' ? onClick : undefined}
      style={{
        borderRadius: 12, padding: '12px 14px', transition: 'all .15s',
        cursor: seeder.required || state !== 'idle' ? 'default' : 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: 11,
        ...stateStyles[state],
      }}
    >
      {/* أيقونة الحالة أو الـ seeder */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isDone ? 'var(--em)' : isError ? 'var(--red)' : `${seeder.color}22`,
        color: isDone ? '#fff' : isError ? '#fff' : seeder.color,
        fontSize: 16, transition: '.2s',
      }}>
        {isRunning ? (
          <i className="ti ti-loader" style={{ animation: 'spin .7s linear infinite' }} />
        ) : isDone ? (
          <i className="ti ti-check" />
        ) : isError ? (
          <i className="ti ti-x" />
        ) : (
          <i className={`ti ${seeder.icon}`} />
        )}
      </div>

      {/* المعلومات */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? 'var(--em)' : isError ? 'var(--red)' : 'var(--t1)' }}>
            {seeder.label}
          </span>
          {seeder.required && (
            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'var(--emb)', color: 'var(--em)', fontWeight: 800, letterSpacing: .5 }}>
              إجباري
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: isError ? 'var(--red)' : 'var(--t4)', lineHeight: 1.4 }}>
          {seeder.description}
        </div>
      </div>

      {/* Checkbox */}
      {state === 'idle' && (
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
          border: `2px solid ${selected ? seeder.color : 'var(--b3)'}`,
          background: selected ? seeder.color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: '.13s',
        }}>
          {selected && <i className="ti ti-check" style={{ fontSize: 11, color: '#fff' }} />}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Progress Log
// ════════════════════════════════════════════════════════════
function ProgressLog({ logs }: { logs: { text: string; type: 'info' | 'success' | 'error' | 'warn' }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div ref={ref} style={{
      background: 'var(--bg0)', border: '1px solid var(--b2)', borderRadius: 10,
      padding: '12px 14px', maxHeight: 180, overflowY: 'auto', direction: 'ltr',
      fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7,
    }}>
      {logs.map((log, i) => (
        <div key={i} style={{
          color: log.type === 'success' ? 'var(--em)' : log.type === 'error' ? 'var(--red)' : log.type === 'warn' ? 'var(--gold)' : 'var(--t3)',
        }}>
          <span style={{ opacity: .4, marginLeft: 8 }}>
            {new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          {log.type === 'success' ? ' ✓ ' : log.type === 'error' ? ' ✗ ' : log.type === 'warn' ? ' ⚠ ' : ' › '}
          {log.text}
        </div>
      ))}
      {logs.length === 0 && <div style={{ color: 'var(--t4)' }}>في انتظار التشغيل...</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Main SetupHub
// ════════════════════════════════════════════════════════════
interface Props {
  companySlug: string;
  onFinish: () => void;
}

export default function SetupHub({ companySlug, onFinish }: Props) {
  const navigate = useNavigate();

  // ── Guard: يقرأ sessionStorage flag ──────────────────────────
  // يُحذف الـ flag فور القراءة — لن يظهر SetupHub مجدداً عند reload
  const [isNewCompany] = React.useState<boolean>(() => {
    try {
      const flag = sessionStorage.getItem('pending_setup');
      if (flag === '1') {
        sessionStorage.removeItem('pending_setup'); // حذف فوري
        return true;
      }
    } catch {}
    return false;
  });

  React.useEffect(() => {
    if (!isNewCompany) {
      navigate('/dashboard', { replace: true });
    }
  }, []); // eslint-disable-line

  if (!isNewCompany) return null;

  const [selected, setSelected]   = useState<Set<string>>(getInitialSelected);
  const [states,   setStates]     = useState<Record<string, RunState>>({});
  const [running,  setRunning]    = useState(false);
  const [done,     setDone]       = useState(false);
  const [logs,     setLogs]       = useState<{ text: string; type: 'info' | 'success' | 'error' | 'warn' }[]>([]);
  const [progress, setProgress]   = useState(0);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const total     = ALL_SEEDERS.length;
  const selCount  = selected.size;
  const doneCount = Object.values(states).filter(s => s === 'done').length;

  // ── Toggle seeder ──────────────────────────────
  const toggleSeeder = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        // لا نزيل الإجباري
        const sd = ALL_SEEDERS.find(s => s.key === key);
        if (sd?.required) return prev;
        next.delete(key);
      } else {
        next.add(key);
        // أضف الـ dependencies تلقائياً
        return resolveDeps(key, next);
      }
      return next;
    });
  };

  const selectGroup = (groupKey: string) => {
    const group = GROUPS.find(g => g.key === groupKey);
    if (!group) return;
    const allSelected = group.seeders.every(s => selected.has(s.key));
    setSelected(prev => {
      const next = new Set(prev);
      group.seeders.forEach(s => {
        if (allSelected && !s.required) next.delete(s.key);
        else next.add(s.key);
      });
      return next;
    });
  };

  const selectAll  = () => setSelected(new Set(ALL_SEEDERS.map(s => s.key)));
  const selectNone = () => setSelected(getInitialSelected());

  // ── Add log ─────────────────────────────────────
  const addLog = (text: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    setLogs(prev => [...prev, { text, type }]);
  };

  // ── Run Seeders ─────────────────────────────────
  const runSeeders = async () => {
    setRunning(true);
    setDone(false);
    setLogs([]);
    setProgress(0);

    // ترتيب التشغيل — الإجباريون أولاً، ثم الباقون حسب الترتيب
    const ordered = ALL_SEEDERS.filter(s => selected.has(s.key));
    const total   = ordered.length;

    addLog(`بدء تهيئة ${total} مكوّن...`, 'info');

    let completed = 0;

    for (const seeder of ordered) {
      setStates(prev => ({ ...prev, [seeder.key]: 'running' }));
      addLog(`تشغيل: ${seeder.label}`, 'info');

      try {
        await apiClient.post(`/${companySlug}/seeders/run`, {
          seeder: seeder.class,
        });

        setStates(prev => ({ ...prev, [seeder.key]: 'done' }));
        addLog(`${seeder.label} — تم بنجاح`, 'success');
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? 'خطأ غير معروف';
        setStates(prev => ({ ...prev, [seeder.key]: 'error' }));
        addLog(`${seeder.label} — فشل: ${msg}`, 'error');

        // المكوّنات الإجبارية توقف العملية
        if (seeder.required) {
          addLog('توقف بسبب خطأ في مكوّن إجباري', 'warn');
          setRunning(false);
          return;
        }
      }

      completed++;
      setProgress(Math.round((completed / total) * 100));
    }

    // تعيين المتبقين كـ skipped
    ALL_SEEDERS.filter(s => !selected.has(s.key)).forEach(s => {
      setStates(prev => ({ ...prev, [s.key]: 'skipped' }));
    });

    addLog('✓ اكتملت عملية التهيئة بنجاح!', 'success');
    setRunning(false);
    setDone(true);
  };

  // ════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 16px', direction: 'rtl' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      `}</style>

      <div style={{ width: '100%', maxWidth: 860, animation: 'slideUp .3s ease' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--emb)', border: '1px solid var(--embo)', borderRadius: 20, padding: '5px 16px', marginBottom: 14 }}>
            <i className="ti ti-sparkles" style={{ color: 'var(--em)', fontSize: 14 }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--em)' }}>تهيئة الشركة</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--t1)', marginBottom: 8 }}>
            اختر البيانات التي تريد تهيئتها
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            اختر المكوّنات التي تحتاجها الآن — يمكنك دائماً تشغيلها لاحقاً من إعدادات الشركة
          </p>
        </div>

        {/* ── Stats Bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'إجمالي المكوّنات', value: total,    color: 'var(--t2)',    icon: 'ti-database' },
            { label: 'محدد للتشغيل',     value: selCount,  color: 'var(--em)',    icon: 'ti-check' },
            { label: 'تم تنفيذه',         value: doneCount, color: 'var(--blue)',  icon: 'ti-circle-check' },
            { label: 'التقدم',            value: `${progress}%`, color: 'var(--gold)', icon: 'ti-loader' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg2)', border: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className={`ti ${stat.icon}`} style={{ fontSize: 18, color: stat.color }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Progress Bar ── */}
        {(running || done) && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--t3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                {running && <i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite', color: 'var(--em)' }} />}
                {done    && <i className="ti ti-circle-check" style={{ color: 'var(--em)' }} />}
                {running ? 'جارٍ التهيئة...' : 'اكتمل'}
              </span>
              <span style={{ fontWeight: 800, color: 'var(--em)' }}>{progress}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg4)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 20, background: done ? 'var(--em)' : 'linear-gradient(90deg,var(--em),var(--blue))', width: `${progress}%`, transition: 'width .4s ease', boxShadow: 'var(--emglow)' }} />
            </div>
          </div>
        )}

        {/* ── Main Card ── */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.12)' }}>

          {/* Toolbar */}
          {!running && !done && (
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)' }}>
              <span style={{ fontSize: 12, color: 'var(--t4)', marginLeft: 'auto' }}>تحديد سريع:</span>
              <button onClick={selectAll} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg4)', color: 'var(--t2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="ti ti-select-all" style={{ fontSize: 12 }} /> الكل
              </button>
              <button onClick={selectNone} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg4)', color: 'var(--t2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="ti ti-deselect" style={{ fontSize: 12 }} /> الإجباري فقط
              </button>
            </div>
          )}

          {/* Groups */}
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {GROUPS.map(group => {
              const groupSelected = group.seeders.every(s => selected.has(s.key));
              const groupPartial  = group.seeders.some(s => selected.has(s.key));
              const isOpen        = activeGroup === group.key || running || done;

              return (
                <div key={group.key} style={{ border: '1px solid var(--b2)', borderRadius: 12, overflow: 'hidden' }}>

                  {/* Group Header */}
                  <div
                    onClick={() => !running && setActiveGroup(prev => prev === group.key ? null : group.key)}
                    style={{
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      cursor: running ? 'default' : 'pointer', background: isOpen ? 'var(--bg3)' : 'var(--bg2)',
                      borderBottom: isOpen ? '1px solid var(--b2)' : 'none', transition: '.13s',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${group.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: group.color, fontSize: 15, flexShrink: 0 }}>
                      <i className={`ti ${group.icon}`} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {group.label}
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: `${group.color}22`, color: group.color, fontWeight: 800 }}>
                          {group.seeders.filter(s => selected.has(s.key)).length}/{group.seeders.length}
                        </span>
                      </div>
                    </div>

                    {/* Group checkbox */}
                    {!running && !done && (
                      <div
                        onClick={e => { e.stopPropagation(); selectGroup(group.key); }}
                        style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${groupSelected ? group.color : groupPartial ? group.color : 'var(--b3)'}`, background: groupSelected ? group.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.13s', flexShrink: 0 }}
                      >
                        {groupSelected && <i className="ti ti-check" style={{ fontSize: 12, color: '#fff' }} />}
                        {groupPartial && !groupSelected && <div style={{ width: 10, height: 2, background: group.color, borderRadius: 2 }} />}
                      </div>
                    )}

                    <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: 13, color: 'var(--t4)', flexShrink: 0 }} />
                  </div>

                  {/* Seeders Grid */}
                  {isOpen && (
                    <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
                      {group.seeders.map(seeder => (
                        <SeederCard
                          key={seeder.key}
                          seeder={seeder}
                          selected={selected.has(seeder.key)}
                          state={states[seeder.key] ?? 'idle'}
                          onClick={() => toggleSeeder(seeder.key)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Log */}
          {logs.length > 0 && (
            <div style={{ padding: '0 18px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>
                سجل التنفيذ
              </div>
              <ProgressLog logs={logs} />
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onFinish}
            style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t3)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <i className="ti ti-arrow-right" /> تخطي وتهيئة لاحقاً
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            {done && (
              <button
                onClick={onFinish}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--em)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 7, boxShadow: 'var(--emglow)' }}
              >
                <i className="ti ti-arrow-left" /> الانتقال للوحة التحكم
              </button>
            )}

            {!done && (
              <button
                onClick={runSeeders}
                disabled={running || selCount === 0}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: running || selCount === 0 ? 'var(--bg4)' : 'var(--em)',
                  color: running || selCount === 0 ? 'var(--t4)' : '#fff',
                  fontSize: 13, fontWeight: 800, cursor: running || selCount === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 7,
                  boxShadow: !running && selCount > 0 ? 'var(--emglow)' : 'none',
                  transition: '.15s',
                }}
              >
                {running ? (
                  <><i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite' }} /> جارٍ التهيئة ({doneCount}/{selCount})</>
                ) : (
                  <><i className="ti ti-player-play" /> تشغيل {selCount} مكوّن</>
                )}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--t4)', marginTop: 16 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 12 }} /> المكوّنات الإجبارية لا يمكن إلغاؤها — تُشغَّل تلقائياً عند الضغط على "تشغيل"
        </p>
      </div>
    </div>
  );
}
