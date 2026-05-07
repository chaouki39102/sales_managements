// ════════════════════════════════════════════════════════════════════
// components/modals/DataSeedingModal.tsx (الإصدار النهائي)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/api/client';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import  Switch  from '@/components/ui/Switch';   // استخدام مكوّن Switch الموجود

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

// ── Seed Groups (الترتيب الصحيح: المستودع قبل الوثائق) ─────────────
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
    icon: '🏭',
    required: false,
    recommended: true,
    color: 'var(--orange)',
    accent: 'rgba(196,58,10,.1)',
    seeds: [
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
    ],
  },
  {
    id: 'documents',
    label: 'الوثائق التجارية',
    description: 'الفواتير، أوامر الشراء، عروض الأسعار، سلاسل الترقيم',
    icon: '📄',
    required: true,
    recommended: true,
    color: 'var(--purple)',
    accent: 'rgba(105,32,212,.1)',
    seeds: [
      { key: 'doc_base_ops',     label: 'العمليات الأساسية للوثائق', endpoint: 'document-base-operations' },
      { key: 'doc_statuses',     label: 'حالات الوثائق',            endpoint: 'document-statuses' },
      { key: 'document_types',   label: 'أنواع الوثائق التجارية',  endpoint: 'document-types' },
      { key: 'numbering_series', label: 'سلاسل الترقيم التلقائي',  endpoint: 'numbering-series' },
    ],
  },
  {
    id: 'expenses',
    label: 'تصنيفات المصروفات',
    description: 'فئات المصروفات الشائعة',
    icon: '🧾',
    required: false,
    recommended: false,
    color: 'var(--gold)',
    accent: 'rgba(184,125,10,.1)',
    seeds: [
      { key: 'expense_categories', label: 'تصنيفات المصروفات', endpoint: 'expense-categories' },
    ],
  },
];

// ── Props ──────────────────────────────────────────────────────────
interface Props {
  companySlug: string;
  companyName: string;
  onClose: () => void;
  onComplete: () => void;
}

// ════════════════════════════════════════════════════════════════════
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

    for (const seed of selectedSeeds) {
      setCurrentLabel(seed.label);
      setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'running' } : l));

      try {
        await apiClient.post(`/${companySlug}/seeds/${seed.endpoint}`);
        done++;
        setTotalDone(done);
        setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'done' } : l));
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? 'فشل التطبيق';
        errors = true;
        done++;
        setTotalDone(done);
        setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'error', message: msg } : l));
      }

      // تمرير للأسفل
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }

    setCurrentLabel('');
    setHasErrors(errors);
    setPhase('done');
  };

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
  );
}
