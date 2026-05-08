// ════════════════════════════════════════════════════════════════════
<<<<<<< HEAD
// components/modals/DataSeedingModal.tsx (الإصدار النهائي)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api/client';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import  Switch  from '@/components/ui/Switch';   // استخدام مكوّن Switch الموجود
=======
// components/modals/DataSeedingModal.tsx
// مودال إعداد البيانات الأولية — تجربة Wizard احترافية
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { tenantApi } from '@/lib/api/client';
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)

// ── Types ───────────────────────────────────────────────────────────
interface SeedItem {
  key: string;
  label: string;
  endpoint: string;
}

interface SeedGroup {
  id: string;
  label: string;
  description: string;
  icon: string;
  required: boolean;
  recommended: boolean;
  color: string;
  accent: string;
  seeds: SeedItem[];
}

type SeedStatus = 'idle' | 'running' | 'done' | 'error';

interface SeedLog {
  key: string;
  label: string;
  status: SeedStatus;
  message?: string;
}

<<<<<<< HEAD
// ── Seed Groups (الترتيب الصحيح: المستودع قبل الوثائق) ─────────────
=======
// ── Seed Groups ──────────────────────────────────────────────────────
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
const SEED_GROUPS: SeedGroup[] = [
  {
    id: 'lookups',
    label: 'الجداول المرجعية',
    description: 'العملات، نسب الضريبة TVA، وحدات القياس، الأشكال القانونية، مستويات الأسعار، طوابع الدفع',
    icon: '⚙️',
    required: true,
    recommended: true,
    color: 'var(--blue)',
    accent: 'rgba(26,79,214,.1)',
    seeds: [
      { key: 'currencies',    label: 'العملات (DZD, EUR, USD)',    endpoint: 'currencies' },
      { key: 'tvas',          label: 'نسب الضريبة TVA',            endpoint: 'tvas' },
      { key: 'units',         label: 'وحدات القياس',               endpoint: 'units' },
      { key: 'legal_forms',   label: 'الأشكال القانونية',          endpoint: 'legal-forms' },
      { key: 'fiscal_stamps', label: 'طوابع الدفع',                endpoint: 'fiscal-stamps' },
      { key: 'price_levels',  label: 'مستويات الأسعار',            endpoint: 'price-levels' },
    ],
  },
  {
<<<<<<< HEAD
    id: 'inventory',
    label: 'تقييم المخزون',
    description: 'طرق احتساب التكلفة: FIFO، LIFO، المتوسط المرجح',
    icon: '📦',
    required: false,
    recommended: true,
    color: 'var(--indigo, #3730a3)',
    accent: 'rgba(55,48,163,.1)',
    seeds: [
      { key: 'valuation_methods', label: 'طرق تقييم المخزون', endpoint: 'inventory-valuation-methods' },
    ],
  },
  {
    id: 'geography',
    label: 'البيانات الجغرافية',
    description: '58 ولاية جزائرية مع جميع البلديات',
    icon: '🗺️',
    required: false,
    recommended: true,
    color: 'var(--em)',
    accent: 'rgba(10,138,92,.1)',
    seeds: [
      { key: 'wilayas_communes', label: 'الولايات والبلديات', endpoint: 'wilayas-communes' },
    ],
  },
  // ⭐ المستودع هنا (قبل الوثائق) ⭐
  {
    id: 'warehouse',
    label: 'المستودع الرئيسي',
    description: 'إنشاء مستودع رئيسي جاهز للاستخدام',
=======
    id: 'warehouse',
    label: 'المستودع الرئيسي',
    description: 'إنشاء مستودع رئيسي (Dépôt Principal) جاهز للاستخدام الفوري',
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    icon: '🏭',
    required: false,
    recommended: true,
    color: 'var(--orange)',
    accent: 'rgba(196,58,10,.1)',
    seeds: [
<<<<<<< HEAD
      { key: 'warehouse', label: 'مستودع رئيسي', endpoint: 'warehouses' },
    ],
  },
  {
    id: 'finance',
    label: 'الخزينة وطرق الدفع',
    description: 'حسابات الخزينة وطرق الدفع الشائعة',
    icon: '💰',
    required: false,
    recommended: true,
    color: 'var(--teal)',
    accent: 'rgba(13,122,140,.1)',
    seeds: [
      { key: 'treasury_accounts', label: 'حسابات الخزينة', endpoint: 'treasury-accounts' },
      { key: 'payment_modes',     label: 'طرق الدفع',       endpoint: 'payment-modes' },
=======
      { key: 'warehouse', label: 'مستودع رئيسي (Dépôt Principal)', endpoint: 'warehouses' },
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    ],
  },
  {
    id: 'documents',
    label: 'الوثائق التجارية',
<<<<<<< HEAD
    description: 'الفواتير، أوامر الشراء، عروض الأسعار، سلاسل الترقيم',
=======
    description: 'الفواتير، أوامر الشراء، عروض الأسعار، التسليم، الإشعارات، مع سلاسل الترقيم التلقائي',
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    icon: '📄',
    required: true,
    recommended: true,
    color: 'var(--purple)',
    accent: 'rgba(105,32,212,.1)',
    seeds: [
<<<<<<< HEAD
      { key: 'doc_base_ops',     label: 'العمليات الأساسية للوثائق', endpoint: 'document-base-operations' },
      { key: 'doc_statuses',     label: 'حالات الوثائق',            endpoint: 'document-statuses' },
      { key: 'document_types',   label: 'أنواع الوثائق التجارية',  endpoint: 'document-types' },
      { key: 'numbering_series', label: 'سلاسل الترقيم التلقائي',  endpoint: 'numbering-series' },
=======
      { key: 'doc_base_ops',     label: 'العمليات الأساسية للوثائق',  endpoint: 'document-base-operations' },
      { key: 'doc_statuses',     label: 'حالات الوثائق',              endpoint: 'document-statuses' },
      { key: 'document_types',   label: 'أنواع الوثائق التجارية',     endpoint: 'document-types' },
      { key: 'numbering_series', label: 'سلاسل الترقيم التلقائي',     endpoint: 'numbering-series' },
    ],
  },
  {
    id: 'geography',
    label: 'البيانات الجغرافية',
    description: '58 ولاية جزائرية مع جميع البلديات (1541 بلدية) — ضروري لبيانات العملاء والموردين',
    icon: '🗺️',
    required: false,
    recommended: true,
    color: 'var(--em)',
    accent: 'rgba(10,138,92,.1)',
    seeds: [
      { key: 'wilayas_communes', label: 'الولايات والبلديات (58 ولاية)', endpoint: 'wilayas-communes' },
    ],
  },

  {
    id: 'finance',
    label: 'الخزينة وطرق الدفع',
    description: 'حسابات الخزينة (صندوق + بنك) وطرق الدفع الشائعة في السوق الجزائرية',
    icon: '💰',
    required: false,
    recommended: true,
    color: 'var(--teal)',
    accent: 'rgba(13,122,140,.1)',
    seeds: [
      { key: 'treasury_accounts', label: 'حسابات الخزينة (صندوق + بنك)', endpoint: 'treasury-accounts' },
      { key: 'payment_modes',     label: 'طرق الدفع',                    endpoint: 'payment-modes' },
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    ],
  },
  {
    id: 'expenses',
    label: 'تصنيفات المصروفات',
<<<<<<< HEAD
    description: 'فئات المصروفات الشائعة',
=======
    description: 'فئات المصروفات الشائعة: إيجار، مرتبات، فواتير، صيانة، نقل...',
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    icon: '🧾',
    required: false,
    recommended: false,
    color: 'var(--gold)',
    accent: 'rgba(184,125,10,.1)',
    seeds: [
      { key: 'expense_categories', label: 'تصنيفات المصروفات', endpoint: 'expense-categories' },
    ],
  },
<<<<<<< HEAD
];

// ── Props ──────────────────────────────────────────────────────────
=======
  {
    id: 'inventory',
    label: 'تقييم المخزون',
    description: 'طرق احتساب التكلفة: FIFO، LIFO، المتوسط المرجح (المطلوب للمخزون)',
    icon: '📦',
    required: false,
    recommended: true,
    color: 'var(--indigo, #3730a3)',
    accent: 'rgba(55,48,163,.1)',
    seeds: [
      { key: 'valuation_methods', label: 'طرق تقييم المخزون (FIFO/LIFO/WA)', endpoint: 'inventory-valuation-methods' },
    ],
  },
];

// ── Props ────────────────────────────────────────────────────────────
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
interface Props {
  companySlug: string;
  companyName: string;
  onClose: () => void;
  onComplete: () => void;
}

// ════════════════════════════════════════════════════════════════════
<<<<<<< HEAD
export default function DataSeedingModal({ companySlug, companyName, onClose, onComplete }: Props) {
  type Phase = 'select' | 'applying' | 'done';
  const [phase, setPhase] = useState<Phase>('select');
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(SEED_GROUPS.filter(g => g.required || g.recommended).map(g => g.id))
  );
  const [logs, setLogs] = useState<SeedLog[]>([]);
  const [totalDone, setTotalDone] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasErrors, setHasErrors] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const selectedGroups = SEED_GROUPS.filter(g => enabled.has(g.id));
  const selectedSeeds = selectedGroups.flatMap(g => g.seeds);
  const progress = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;

  // ── تطبيق السيدرز بالتتابع ───────────────────────────────────────
=======
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function DataSeedingModal({ companySlug, companyName, onClose, onComplete }: Props) {
  type Phase = 'select' | 'applying' | 'done';
  const [phase, setPhase]       = useState<Phase>('select');
  const [enabled, setEnabled]   = useState<Set<string>>(
    () => new Set(SEED_GROUPS.filter(g => g.required || g.recommended).map(g => g.id))
  );
  const [logs, setLogs]             = useState<SeedLog[]>([]);
  const [totalDone, setTotalDone]   = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasErrors, setHasErrors]   = useState(false);
  const [currentLabel, setCurrentLabel] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── ESC to close ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase === 'select') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [phase, onClose]);

  // ── Toggle group ────────────────────────────────────────────────
  const toggleGroup = useCallback((id: string) => {
    const g = SEED_GROUPS.find(g => g.id === id);
    if (g?.required) return;
    setEnabled(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const selectedGroups = SEED_GROUPS.filter(g => enabled.has(g.id));
  const selectedSeeds  = selectedGroups.flatMap(g => g.seeds);
  const progress       = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;

  // ── Apply seeds sequentially ────────────────────────────────────
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
  const handleApply = async () => {
    if (selectedSeeds.length === 0) { onComplete(); return; }

    setTotalCount(selectedSeeds.length);
    setTotalDone(0);
    setHasErrors(false);
    setPhase('applying');

    const initLogs: SeedLog[] = selectedSeeds.map(s => ({ key: s.key, label: s.label, status: 'idle' }));
    setLogs(initLogs);

    let done = 0;
    let errors = false;

<<<<<<< HEAD
=======
    // ✅ نبني instance بالـ slug مباشرةً — لا اعتماد على sessionStorage
    const api = tenantApi(companySlug);

>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
    for (const seed of selectedSeeds) {
      setCurrentLabel(seed.label);
      setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'running' } : l));

      try {
<<<<<<< HEAD
        await apiClient.post(`/${companySlug}/seeds/${seed.endpoint}`);
=======
        await api.post(`seeds/${seed.endpoint}`);
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        done++;
        setTotalDone(done);
        setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'done' } : l));
      } catch (err: any) {
<<<<<<< HEAD
        const msg = err?.response?.data?.message ?? 'فشل التطبيق';
=======
        const msg = err?.message ?? err?.response?.data?.message ?? 'فشل التطبيق';
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
        errors = true;
        done++;
        setTotalDone(done);
        setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'error', message: msg } : l));
      }

<<<<<<< HEAD
      // تمرير للأسفل
=======
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }

    setCurrentLabel('');
    setHasErrors(errors);
    setPhase('done');
  };

<<<<<<< HEAD
  // ── التبديل لمجموعة ──────────────────────────────────────────────
  const toggleGroup = (id: string) => {
    const g = SEED_GROUPS.find(g => g.id === id);
    if (g?.required) return; // لا يمكن إلغاء المطلوب
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── عند الضغط على إغلاق من الـ Modal ─────────────────────────────
  const handleClose = () => {
    if (phase === 'select') onClose();
    // لا نغلق أثناء التطبيق
  };

  // ── تم أو تخطي ────────────────────────────────────────────────────
  const handleDone = () => {
    onComplete();
  };

  // ── محتوى الـ Modal حسب المرحلة ─────────────────────────────────
  const renderContent = () => {
    if (phase === 'select') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SEED_GROUPS.map(group => {
            const isOn = enabled.has(group.id);
            return (
              <div
                key={group.id}
                onClick={() => toggleGroup(group.id)}
                style={{
                  borderRadius: 12,
                  border: `2px solid ${isOn ? group.color : 'var(--b2)'}`,
                  background: isOn ? group.accent : 'var(--bg3)',
                  padding: 14,
                  cursor: group.required ? 'default' : 'pointer',
                  position: 'relative',
                  opacity: group.required ? 1 : undefined,
                  transition: 'all .15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{group.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t1)' }}>{group.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{group.description}</div>
                    </div>
                  </div>
                  <div>
                    {group.required ? (
                      <span style={{ fontSize: 10, background: group.accent, color: group.color, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>إلزامي</span>
                    ) : (
                      <Switch checked={isOn} onChange={() => toggleGroup(group.id)} />
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {group.seeds.map(s => (
                    <span key={s.key} style={{ fontSize: 10, background: 'var(--bg4)', padding: '2px 6px', borderRadius: 20, color: 'var(--t3)' }}>
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (phase === 'applying') {
      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
            <span style={{ fontWeight: 700 }}>{currentLabel || 'اكتمل'}</span>
            <span>{totalDone}/{totalCount} • {progress}%</span>
          </div>
          <ProgressBar value={progress} />
          <div style={{ maxHeight: 300, overflow: 'auto', marginTop: 12 }}>
            {logs.map((log, i) => (
              <div key={log.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--b1)' }}>
                <span style={{ width: 18, textAlign: 'center' }}>
                  {log.status === 'done' ? '✓' : log.status === 'running' ? '⟳' : log.status === 'error' ? '✕' : '○'}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: log.status === 'error' ? 'var(--red)' : 'var(--t2)' }}>
                  {log.label}
                </span>
                {log.status === 'error' && log.message && (
                  <span style={{ fontSize: 11, color: 'var(--red)' }}>{log.message}</span>
                )}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      );
    }

    if (phase === 'done') {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{hasErrors ? '⚠️' : '🎉'}</div>
          <h3 style={{ marginBottom: 8 }}>{hasErrors ? 'اكتمل مع بعض الأخطاء' : 'تم الإعداد بنجاح!'}</h3>
          <p style={{ color: 'var(--t3)', marginBottom: 16 }}>
            {hasErrors ? 'بعض البيانات لم تُطبَّق، يمكنك إضافتها لاحقاً.' : `تم تطبيق ${totalDone} عنصر بنجاح.`}
          </p>
          {hasErrors && (
            <div style={{ maxHeight: 150, overflow: 'auto', textAlign: 'right', marginBottom: 16 }}>
              {logs.filter(l => l.status === 'error').map(l => (
                <div key={l.key} style={{ color: 'var(--red)', fontSize: 12, padding: '4px 0' }}>✕ {l.label}</div>
              ))}
            </div>
          )}
          <Button variant="primary" onClick={handleDone}>الدخول إلى الشركة</Button>
        </div>
      );
    }
    return null;
  };

  // ── Footer (أثناء مرحلة الاختيار فقط) ───────────────────────────
  const renderFooter = () => {
    if (phase !== 'select') return null;
    return (
      <>
        <Button onClick={onClose}>تخطي الآن</Button>
        <Button variant="primary" onClick={handleApply} disabled={selectedSeeds.length === 0}>
          ⚡ تطبيق {selectedSeeds.length} عنصر
        </Button>
      </>
    );
  };

  return (
    <Modal
      open={true}
      onClose={handleClose}
      title="إعداد البيانات الأولية"
      subtitle={`${companyName} — ${selectedSeeds.length} عنصر محدد`}
      footer={renderFooter()}
      size="lg"
    >
      {renderContent()}
    </Modal>
=======
  return (
    <>
      <style>{`
        @keyframes seedIn    { from{opacity:0;transform:scale(.96) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes ovFade    { from{opacity:0} to{opacity:1} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes checkPop  { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes slideRow  { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:none} }
        @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes progressW { from{width:0} }
        .sg-card { transition: all .18s cubic-bezier(.34,1.2,.64,1) !important; }
        .sg-card:hover:not(.sg-disabled) { transform: translateY(-2px) !important; }
        .sg-card:active:not(.sg-disabled) { transform: scale(.98) !important; }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10010,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(12px)',
        padding: 16, animation: 'ovFade .2s ease', direction: 'rtl',
      }} onClick={e => { if (e.target === e.currentTarget && phase === 'select') onClose(); }}>

        <div style={{
          background: 'var(--bg2)', borderRadius: 24,
          width: '100%',
          maxWidth: phase === 'select' ? 760 : 520,
          border: '1px solid var(--b3)',
          boxShadow: '0 40px 100px rgba(0,0,0,.45)',
          overflow: 'hidden',
          animation: 'seedIn .32s cubic-bezier(.34,1.3,.64,1)',
          transition: 'max-width .35s cubic-bezier(.4,0,.2,1)',
          maxHeight: '94vh',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ══ HEADER ══════════════════════════════════════════ */}
          <div style={{
            background: 'linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)',
            padding: '22px 26px 20px',
            position: 'relative', overflow: 'hidden', flexShrink: 0,
          }}>
            {/* Decorative */}
            <div style={{ position:'absolute', top:-60, left:-60, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', bottom:-40, right:30, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', top:10, right:80, width:60, height:60, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }} />

            <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:14 }}>
              <div style={{
                width: 50, height: 50, borderRadius: 14,
                background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}>
                {phase === 'done' ? '✅' : phase === 'applying' ? '⚡' : '🗂️'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', marginBottom: 3 }}>
                  {phase === 'done' ? (hasErrors ? 'اكتمل مع بعض الأخطاء' : 'تم الإعداد بنجاح! 🎉') :
                   phase === 'applying' ? 'جارٍ تطبيق البيانات...' :
                   'إعداد البيانات الأولية'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', display:'flex', alignItems:'center', gap:5 }}>
                  <span>🏢</span>
                  <span>{companyName}</span>
                  {phase === 'select' && (
                    <span style={{ marginRight: 8, padding:'1px 9px', background:'rgba(255,255,255,.18)', borderRadius:20, fontSize:11, fontWeight:700 }}>
                      {selectedSeeds.length} عنصر محدد
                    </span>
                  )}
                </div>
              </div>
              {phase === 'select' && (
                <button onClick={onClose} style={{
                  width:32, height:32, borderRadius:9, flexShrink:0,
                  background:'rgba(255,255,255,.15)', border:'none',
                  color:'#fff', fontSize:16, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,.28)')}
                  onMouseLeave={e => (e.currentTarget.style.background='rgba(255,255,255,.15)')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Progress bar */}
            {phase === 'applying' && (
              <div style={{ marginTop: 16, position:'relative' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.85)', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:280 }}>
                    {currentLabel ? `⚡ ${currentLabel}` : 'اكتمل ✓'}
                  </span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.85)', fontWeight:800, flexShrink:0 }}>
                    {totalDone}/{totalCount} — {progress}%
                  </span>
                </div>
                <div style={{ height:7, background:'rgba(255,255,255,.18)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:99,
                    background:'rgba(255,255,255,.95)',
                    width:`${progress}%`,
                    transition:'width .5s cubic-bezier(.4,0,.2,1)',
                    boxShadow:'0 0 14px rgba(255,255,255,.6)',
                    animation: progress < 100 ? 'shimmer 2s infinite linear' : 'none',
                    backgroundImage: progress < 100
                      ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.3) 50%, transparent 100%)'
                      : 'none',
                    backgroundSize: '200% 100%',
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* ══ BODY ════════════════════════════════════════════ */}
          <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>

            {/* ── PHASE: SELECT ────────────────────────────── */}
            {phase === 'select' && (
              <>
                {/* Info bar */}
                <div style={{
                  padding:'12px 26px 0',
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
                }}>
                  <p style={{ margin:0, fontSize:12.5, color:'var(--t3)', lineHeight:1.6, flex:1 }}>
                    اختر البيانات التي تريد إضافتها تلقائياً.
                    البيانات <span style={{ color:'var(--em)', fontWeight:800 }}>الإلزامية</span> و
                    <span style={{ color:'var(--blue)', fontWeight:700 }}> الموصى بها</span> محددة مسبقاً.
                  </p>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => setEnabled(new Set(SEED_GROUPS.map(g => g.id)))}
                      style={{ fontSize:11, padding:'4px 11px', borderRadius:8, border:'1px solid var(--b3)', background:'var(--bg3)', color:'var(--t3)', cursor:'pointer', fontFamily:'Tajawal,sans-serif', transition:'.13s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='var(--embo)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='var(--b3)'}
                    >الكل</button>
                    <button onClick={() => setEnabled(new Set(SEED_GROUPS.filter(g=>g.required).map(g=>g.id)))}
                      style={{ fontSize:11, padding:'4px 11px', borderRadius:8, border:'1px solid var(--b3)', background:'var(--bg3)', color:'var(--t3)', cursor:'pointer', fontFamily:'Tajawal,sans-serif', transition:'.13s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='var(--redbo)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='var(--b3)'}
                    >الإلزامي فقط</button>
                  </div>
                </div>

                {/* Groups Grid */}
                <div style={{
                  padding:'14px 26px 8px',
                  display:'grid', gridTemplateColumns:'1fr 1fr',
                  gap:10,
                }}>
                  {SEED_GROUPS.map((group, idx) => {
                    const isOn = enabled.has(group.id);
                    return (
                      <div
                        key={group.id}
                        className={`sg-card${group.required ? ' sg-disabled' : ''}`}
                        onClick={() => toggleGroup(group.id)}
                        style={{
                          borderRadius: 14,
                          border: `2px solid ${isOn ? group.color : 'var(--b2)'}`,
                          background: isOn ? group.accent : 'var(--bg3)',
                          padding: '14px 16px',
                          cursor: group.required ? 'default' : 'pointer',
                          position: 'relative',
                          userSelect: 'none',
                          animation: `seedIn .25s ease ${idx * .04}s both`,
                        }}
                      >
                        {/* Top badges */}
                        <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:5 }}>
                          {group.required && (
                            <span style={{ fontSize:9, fontWeight:800, letterSpacing:.5, color:group.color, background:`${group.accent}`, border:`1px solid ${group.color}40`, padding:'2px 7px', borderRadius:99 }}>
                              إلزامي
                            </span>
                          )}
                          {group.recommended && !group.required && (
                            <span style={{ fontSize:9, fontWeight:700, color:'var(--blue)', background:'var(--blueb)', border:'1px solid var(--bluebo)', padding:'2px 7px', borderRadius:99 }}>
                              موصى به
                            </span>
                          )}
                        </div>

                        {/* Checkbox */}
                        <div style={{
                          position:'absolute', top:10, right:10,
                          width:20, height:20, borderRadius:6,
                          border:`2px solid ${isOn ? group.color : 'var(--b3)'}`,
                          background: isOn ? group.color : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          transition:'all .2s',
                          animation: isOn ? 'none' : 'none',
                        }}>
                          {isOn && <span style={{ color:'#fff', fontSize:11, fontWeight:900, animation:'checkPop .2s ease' }}>✓</span>}
                        </div>

                        {/* Icon + title */}
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7, marginTop: (group.required || group.recommended) ? 16 : 4 }}>
                          <span style={{ fontSize:22, flexShrink:0 }}>{group.icon}</span>
                          <div style={{ fontSize:13, fontWeight:800, color:'var(--t1)', lineHeight:1.3 }}>
                            {group.label}
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ margin:0, fontSize:11, color:'var(--t4)', lineHeight:1.55 }}>
                          {group.description}
                        </p>

                        {/* Seeds count */}
                        <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:4 }}>
                          {group.seeds.map(s => (
                            <span key={s.key} style={{
                              fontSize:10, padding:'2px 8px', borderRadius:99,
                              background:'var(--bg4)', color:'var(--t4)',
                              border:'1px solid var(--b1)',
                            }}>{s.label}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── PHASE: APPLYING ──────────────────────────── */}
            {phase === 'applying' && (
              <div style={{ padding:'12px 26px' }}>
                <p style={{ fontSize:12, color:'var(--t4)', marginBottom:12 }}>
                  يرجى الانتظار — لا تُغلق هذه النافذة
                </p>
                <div style={{ borderRadius:12, border:'1px solid var(--b2)', overflow:'hidden' }}>
                  {logs.map((log, i) => (
                    <SeedRow key={log.key} log={log} index={i} total={logs.length} />
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            {/* ── PHASE: DONE ──────────────────────────────── */}
            {phase === 'done' && (
              <div style={{ padding:'28px 26px', textAlign:'center' }}>
                {/* Big icon */}
                <div style={{
                  width:72, height:72, borderRadius:'50%', margin:'0 auto 16px',
                  background: hasErrors ? 'var(--goldb)' : 'var(--emb)',
                  border: `2px solid ${hasErrors ? 'var(--goldbo)' : 'var(--embo)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:32, animation:'checkPop .4s cubic-bezier(.34,1.5,.64,1)',
                }}>
                  {hasErrors ? '⚠️' : '🎉'}
                </div>

                <h2 style={{ fontSize:19, fontWeight:900, color:'var(--t1)', marginBottom:6, marginTop:0 }}>
                  {hasErrors ? 'اكتمل مع بعض الأخطاء' : 'شركتك جاهزة!'}
                </h2>
                <p style={{ fontSize:13, color:'var(--t3)', marginBottom:20 }}>
                  {hasErrors
                    ? 'بعض البيانات لم تُطبَّق. يمكنك إضافتها لاحقاً من إعدادات النظام.'
                    : `تم تطبيق ${totalDone} عنصر بنجاح. يمكنك البدء فوراً.`
                  }
                </p>

                {/* Stats */}
                <div style={{
                  display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                  gap:8, marginBottom:20,
                }}>
                  {[
                    { label:'تم', value: logs.filter(l=>l.status==='done').length, color:'var(--em)', icon:'✓' },
                    { label:'خطأ', value: logs.filter(l=>l.status==='error').length, color:'var(--red)', icon:'✕' },
                    { label:'المجموع', value: logs.length, color:'var(--t3)', icon:'#' },
                  ].map(s => (
                    <div key={s.label} style={{
                      padding:'10px 8px', borderRadius:10,
                      background:'var(--bg3)', border:'1px solid var(--b1)',
                    }}>
                      <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:10, color:'var(--t4)', marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Error log */}
                {hasErrors && (
                  <div style={{
                    borderRadius:10, border:'1px solid var(--b2)',
                    overflow:'hidden', marginBottom:16, textAlign:'right',
                    maxHeight:180, overflowY:'auto',
                  }}>
                    {logs.map((l, i) => <SeedRow key={l.key} log={l} index={i} total={logs.length} compact />)}
                  </div>
                )}

                {/* CTA */}
                <button onClick={onComplete} style={{
                  width:'100%', padding:'13px 0', borderRadius:12,
                  background:'var(--grad-em)', border:'none',
                  color:'#fff', fontSize:14, fontWeight:800,
                  cursor:'pointer', fontFamily:'Tajawal,sans-serif',
                  boxShadow:'var(--emglow)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  transition:'.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity='.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity='1'}
                >
                  <span>الدخول إلى الشركة</span>
                  <span>←</span>
                </button>
              </div>
            )}
          </div>

          {/* ══ FOOTER (select only) ═════════════════════════ */}
          {phase === 'select' && (
            <div style={{
              padding:'14px 26px 18px',
              borderTop:'1px solid var(--b2)',
              background:'var(--bg3)',
              display:'flex', gap:10, alignItems:'center',
              flexShrink:0,
            }}>
              <button onClick={onClose} style={{
                padding:'10px 20px', borderRadius:10,
                border:'1px solid var(--b3)', background:'transparent',
                color:'var(--t4)', fontSize:13, fontWeight:600,
                cursor:'pointer', fontFamily:'Tajawal,sans-serif', transition:'.13s',
              }}
                onMouseEnter={e => e.currentTarget.style.color='var(--t2)'}
                onMouseLeave={e => e.currentTarget.style.color='var(--t4)'}
              >
                تخطي الآن
              </button>

              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:'var(--t4)', lineHeight:1.5 }}>
                  يمكن إعادة الإعداد لاحقاً من
                  <span style={{ color:'var(--em)', fontWeight:700 }}> الإعدادات → البيانات الأولية</span>
                </div>
              </div>

              <button
                onClick={handleApply}
                disabled={selectedSeeds.length === 0}
                style={{
                  padding:'11px 26px', borderRadius:12,
                  border:'none',
                  background: selectedSeeds.length > 0 ? 'var(--em)' : 'var(--bg4)',
                  color: selectedSeeds.length > 0 ? '#fff' : 'var(--t4)',
                  fontSize:14, fontWeight:800,
                  cursor: selectedSeeds.length > 0 ? 'pointer' : 'not-allowed',
                  fontFamily:'Tajawal,sans-serif',
                  boxShadow: selectedSeeds.length > 0 ? 'var(--emglow)' : 'none',
                  display:'flex', alignItems:'center', gap:8,
                  transition:'.15s', whiteSpace:'nowrap',
                }}
                onMouseEnter={e => { if (selectedSeeds.length > 0) e.currentTarget.style.background='var(--em2)'; }}
                onMouseLeave={e => { if (selectedSeeds.length > 0) e.currentTarget.style.background='var(--em)'; }}
              >
                <span>تطبيق {selectedSeeds.length} عنصر</span>
                <span style={{ fontSize:16 }}>⚡</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── SeedRow ──────────────────────────────────────────────────────────
function SeedRow({ log, index, total, compact }: { log: SeedLog; index: number; total: number; compact?: boolean }) {
  const icons: Record<SeedStatus, React.ReactNode> = {
    idle:    <span style={{ color:'var(--t4)', fontSize:14 }}>○</span>,
    running: <span style={{ display:'inline-block', animation:'spin .7s linear infinite', fontSize:14, color:'var(--em)' }}>↻</span>,
    done:    <span style={{ color:'#22c55e', fontSize:14, animation:'checkPop .25s ease' }}>✓</span>,
    error:   <span style={{ color:'#ef4444', fontSize:14 }}>✕</span>,
  };

  const bgMap: Record<SeedStatus, string> = {
    idle: 'transparent',
    running: 'var(--emb)',
    done: 'transparent',
    error: 'rgba(239,68,68,.05)',
  };

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding: compact ? '6px 12px' : '9px 14px',
      background: bgMap[log.status],
      borderTop: index > 0 ? '1px solid var(--b1)' : 'none',
      transition:'background .25s',
      animation: log.status === 'running' ? 'none' : `slideRow .2s ease ${index * .02}s both`,
    }}>
      <div style={{ flexShrink:0, width:18, textAlign:'center' }}>{icons[log.status]}</div>
      <div style={{
        flex:1, fontSize: compact ? 11 : 12.5,
        color: log.status === 'running' ? 'var(--em)' : 'var(--t2)',
        fontWeight: log.status === 'running' ? 700 : 500,
      }}>
        {log.label}
      </div>
      {log.status === 'running' && (
        <span style={{ fontSize:10, color:'var(--em)', fontWeight:700, animation:'pulse 1.4s infinite' }}>
          جارٍ...
        </span>
      )}
      {log.status === 'error' && log.message && (
        <span style={{ fontSize:10, color:'#ef4444', maxWidth:140, textAlign:'left', lineHeight:1.4 }}>
          {log.message}
        </span>
      )}
      {log.status === 'done' && !compact && (
        <span style={{ fontSize:10, color:'#22c55e', fontWeight:700 }}>تم ✓</span>
      )}
    </div>
>>>>>>> d15eb8d (new commit add multi tenency for all the system tables)
  );
}
