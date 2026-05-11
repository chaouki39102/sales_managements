// ════════════════════════════════════════════════════════════════════
// components/modals/DataSeedingModal.tsx — تصميم جديد عصري
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api/client';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface SeedItem  { key: string; label: string; endpoint: string; }
interface SeedGroup {
  id: string; label: string; description: string;
  icon: string; required: boolean; recommended: boolean;
  seeds: SeedItem[];
  tabler: string;
}

type SeedStatus = 'idle' | 'running' | 'done' | 'error';
interface SeedLog { key: string; label: string; status: SeedStatus; message?: string; }

const SEED_GROUPS: SeedGroup[] = [
  {
    id: 'lookups', label: 'الجداول المرجعية',
    description: 'عملات · ضرائب TVA · وحدات · أشكال قانونية · أسعار',
    icon: '⚙️', tabler: 'ti-adjustments-horizontal',
    required: true, recommended: true,
    seeds: [
      { key: 'currencies',    label: 'العملات',             endpoint: 'currencies' },
      { key: 'tvas',          label: 'نسب الضريبة TVA',     endpoint: 'tvas' },
      { key: 'units',         label: 'وحدات القياس',         endpoint: 'units' },
      { key: 'legal_forms',   label: 'الأشكال القانونية',   endpoint: 'legal-forms' },
      { key: 'fiscal_stamps', label: 'طوابع الدفع',          endpoint: 'fiscal-stamps' },
      { key: 'price_levels',  label: 'مستويات الأسعار',     endpoint: 'price-levels' },
    ],
  },
  {
    id: 'inventory', label: 'تقييم المخزون',
    description: 'FIFO · LIFO · المتوسط المرجح',
    icon: '📦', tabler: 'ti-package',
    required: false, recommended: true,
    seeds: [{ key: 'valuation_methods', label: 'طرق تقييم المخزون', endpoint: 'inventory-valuation-methods' }],
  },
  {
    id: 'geography', label: 'البيانات الجغرافية',
    description: '58 ولاية جزائرية وجميع البلديات',
    icon: '🗺️', tabler: 'ti-map-pin',
    required: false, recommended: true,
    seeds: [{ key: 'wilayas_communes', label: 'الولايات والبلديات', endpoint: 'wilayas-communes' }],
  },
  {
    id: 'warehouse', label: 'المستودع الرئيسي',
    description: 'مستودع جاهز للاستخدام الفوري',
    icon: '🏭', tabler: 'ti-building-warehouse',
    required: false, recommended: true,
    seeds: [{ key: 'warehouse', label: 'مستودع رئيسي', endpoint: 'warehouses' }],
  },
  {
    id: 'finance', label: 'الخزينة والدفع',
    description: 'أنواع حسابات · خزينة · طرق الدفع',
    icon: '💰', tabler: 'ti-cash',
    required: false, recommended: true,
    seeds: [
      { key: 'treasury_account_types', label: 'أنواع حسابات الخزينة', endpoint: 'treasury-account-types' },
      { key: 'treasury_accounts',      label: 'حسابات الخزينة',       endpoint: 'treasury-accounts' },
      { key: 'payment_modes',          label: 'طرق الدفع',             endpoint: 'payment-modes' },
    ],
  },
  {
    id: 'documents', label: 'الوثائق التجارية',
    description: 'فواتير · أوامر شراء · عروض أسعار · ترقيم',
    icon: '📄', tabler: 'ti-file-invoice',
    required: true, recommended: true,
    seeds: [
      { key: 'doc_base_ops',     label: 'العمليات الأساسية',      endpoint: 'document-base-operations' },
      { key: 'doc_statuses',     label: 'حالات الوثائق',          endpoint: 'document-statuses' },
      { key: 'document_types',   label: 'أنواع الوثائق',          endpoint: 'document-types' },
      { key: 'numbering_series', label: 'سلاسل الترقيم التلقائي', endpoint: 'numbering-series' },
    ],
  },
  {
    id: 'expenses', label: 'تصنيفات المصروفات',
    description: 'فئات المصروفات الشائعة',
    icon: '🧾', tabler: 'ti-receipt',
    required: false, recommended: false,
    seeds: [{ key: 'expense_categories', label: 'تصنيفات المصروفات', endpoint: 'expense-categories' }],
  },
];

interface Props {
  companySlug: string;
  companyName: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function DataSeedingModal({ companySlug, companyName, onClose, onComplete }: Props) {
  type Phase = 'select' | 'applying' | 'done';
  const [phase, setPhase] = useState<Phase>('select');
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(SEED_GROUPS.filter(g => g.required || g.recommended).map(g => g.id))
  );
  const [logs, setLogs]           = useState<SeedLog[]>([]);
  const [totalDone, setTotalDone] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasErrors, setHasErrors] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const selectedGroups = SEED_GROUPS.filter(g => enabled.has(g.id));
  const selectedSeeds  = selectedGroups.flatMap(g => g.seeds);
  const progress = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;

  const handleApply = async () => {
    if (selectedSeeds.length === 0) { onComplete(); return; }
    setTotalCount(selectedSeeds.length);
    setTotalDone(0);
    setHasErrors(false);
    setPhase('applying');
    setLogs(selectedSeeds.map(s => ({ key: s.key, label: s.label, status: 'idle' })));

    let done = 0, errors = false;
    for (const seed of selectedSeeds) {
      setCurrentLabel(seed.label);
      setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'running' } : l));
      try {
        await apiClient.post(`/${companySlug}/seeds/${seed.endpoint}`);
        done++;
        setTotalDone(done);
        setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'done' } : l));
      } catch (err: any) {
        errors = true; done++;
        setTotalDone(done);
        setLogs(prev => prev.map(l =>
          l.key === seed.key ? { ...l, status: 'error', message: err?.response?.data?.message ?? 'فشل' } : l
        ));
      }
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
    setCurrentLabel(''); setHasErrors(errors); setPhase('done');
  };

  const toggleGroup = (id: string) => {
    const g = SEED_GROUPS.find(g => g.id === id);
    if (g?.required) return;
    setEnabled(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const totalSelected = selectedSeeds.length;
  const totalAll      = SEED_GROUPS.flatMap(g => g.seeds).length;

  // ── حساب عدد العناصر المحددة لكل مجموعة ──
  const groupCount = (g: SeedGroup) => enabled.has(g.id) ? g.seeds.length : 0;

  const renderSelect = () => (
    <div>
      {/* بطاقة الملخص */}
      <div style={{
        background: 'var(--emb, rgba(10,138,92,.08))',
        border: '1px solid var(--embo, rgba(10,138,92,.18))',
        borderRadius: 14, padding: '14px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14, direction: 'rtl',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--em)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="ti ti-database-import" style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', marginBottom: 2 }}>
            {companyName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>
            {totalSelected} عنصر من أصل {totalAll} • {selectedGroups.length} مجموعة محددة
          </div>
        </div>
        <div style={{ textAlign: 'center', direction: 'ltr' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--em)', lineHeight: 1 }}>{totalSelected}</div>
          <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700 }}>عنصر</div>
        </div>
      </div>

      {/* قائمة المجموعات */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SEED_GROUPS.map((group, idx) => {
          const isOn = enabled.has(group.id);
          return (
            <div
              key={group.id}
              onClick={() => toggleGroup(group.id)}
              style={{
                borderRadius: 12,
                border: `1.5px solid ${isOn ? 'var(--em)' : 'var(--b2)'}`,
                background: isOn ? 'var(--emb, rgba(10,138,92,.06))' : 'var(--bg3)',
                padding: '12px 16px',
                cursor: group.required ? 'default' : 'pointer',
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 12,
                direction: 'rtl',
                animation: `slideInRow .25s ease ${idx * 0.04}s both`,
              }}
            >
              {/* أيقونة */}
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: isOn ? 'var(--em)' : 'var(--bg4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}>
                <i className={`ti ${group.tabler}`} style={{
                  fontSize: 18,
                  color: isOn ? '#fff' : 'var(--t4)',
                }} />
              </div>

              {/* نص */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>{group.label}</span>
                  {group.required && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 20,
                      background: 'var(--em)', color: '#fff', letterSpacing: .5,
                    }}>إلزامي</span>
                  )}
                  {!group.required && group.recommended && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                      background: 'var(--goldb, rgba(184,125,10,.1))',
                      color: 'var(--gold, #b87d0a)',
                      border: '1px solid var(--goldbo, rgba(184,125,10,.2))',
                    }}>موصى به</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {group.description}
                </div>
              </div>

              {/* عداد + toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {isOn && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: 'var(--em)',
                    background: 'var(--emb)', padding: '2px 8px', borderRadius: 20,
                  }}>
                    {groupCount(group)}
                  </span>
                )}
                {group.required ? (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--em)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className="ti ti-lock" style={{ fontSize: 11, color: '#fff' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 36, height: 20, borderRadius: 10,
                      background: isOn ? 'var(--em)' : 'var(--b3)',
                      position: 'relative', transition: 'background .2s',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 2,
                      right: isOn ? 2 : 18,
                      transition: 'right .2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideInRow {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );

  const renderApplying = () => (
    <div style={{ direction: 'rtl' }}>
      {/* رأس التقدم */}
      <div style={{
        background: 'var(--bg3)', borderRadius: 14, padding: '16px 18px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--em)',
              animation: 'pulse 1.2s ease infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
              {currentLabel || 'اكتمل'}
            </span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--em)' }}>
            {progress}%
          </span>
        </div>

        {/* شريط التقدم مخصص */}
        <div style={{ height: 6, background: 'var(--b2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: 'var(--em)', borderRadius: 99,
            width: `${progress}%`, transition: 'width .4s ease',
          }} />
        </div>

        <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 8, textAlign: 'left' }}>
          {totalDone} / {totalCount} عنصر
        </div>
      </div>

      {/* سجل العمليات */}
      <div style={{ maxHeight: 260, overflowY: 'auto', borderRadius: 12, border: '1px solid var(--b1)' }}>
        {logs.map((log, i) => (
          <div
            key={log.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
              borderBottom: i < logs.length - 1 ? '1px solid var(--b1)' : 'none',
              background: log.status === 'running' ? 'var(--emb, rgba(10,138,92,.04))' : 'transparent',
              transition: 'background .2s',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background:
                log.status === 'done'    ? 'var(--emb)' :
                log.status === 'error'   ? 'var(--redb)' :
                log.status === 'running' ? 'var(--emb)' : 'var(--bg4)',
            }}>
              {log.status === 'done' && <i className="ti ti-check" style={{ fontSize: 12, color: 'var(--em)' }} />}
              {log.status === 'error' && <i className="ti ti-x" style={{ fontSize: 12, color: 'var(--red)' }} />}
              {log.status === 'running' && (
                <i className="ti ti-loader" style={{ fontSize: 12, color: 'var(--em)', animation: 'spin .7s linear infinite' }} />
              )}
              {log.status === 'idle' && <i className="ti ti-circle" style={{ fontSize: 12, color: 'var(--b3)' }} />}
            </div>

            <span style={{
              flex: 1, fontSize: 12, fontWeight: log.status === 'running' ? 700 : 500,
              color: log.status === 'error' ? 'var(--red)' : log.status === 'running' ? 'var(--t1)' : 'var(--t3)',
            }}>
              {log.label}
            </span>

            {log.status === 'error' && log.message && (
              <span style={{ fontSize: 10, color: 'var(--red)', maxWidth: 120, textAlign: 'left', opacity: .8 }}>
                {log.message}
              </span>
            )}
            {log.status === 'done' && (
              <span style={{ fontSize: 10, color: 'var(--em)', fontWeight: 700 }}>✓</span>
            )}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  const renderDone = () => (
    <div style={{ textAlign: 'center', padding: '12px 0 8px', direction: 'rtl' }}>
      {hasErrors ? (
        <>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            background: 'var(--goldb, rgba(184,125,10,.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 30, color: 'var(--gold, #b87d0a)' }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--t1)', marginBottom: 6 }}>
            اكتمل مع بعض الأخطاء
          </div>
          <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 16 }}>
            بعض البيانات لم تُطبَّق، يمكنك إضافتها لاحقاً
          </div>
          <div style={{
            background: 'var(--redb)', border: '1px solid var(--redbo)', borderRadius: 10,
            padding: '10px 14px', marginBottom: 20, textAlign: 'right',
          }}>
            {logs.filter(l => l.status === 'error').map(l => (
              <div key={l.key} style={{ fontSize: 12, color: 'var(--red)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-x" style={{ fontSize: 11 }} />
                {l.label}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'popIn .4s cubic-bezier(.34,1.6,.64,1)',
          }}>
            <i className="ti ti-check" style={{ fontSize: 30, color: 'var(--em)' }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--t1)', marginBottom: 6 }}>
            تم الإعداد بنجاح!
          </div>
          <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 20 }}>
            تم تطبيق <strong style={{ color: 'var(--em)' }}>{totalDone}</strong> عنصر بنجاح على شركة {companyName}
          </div>

          {/* إحصاء سريع */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {[
              { label: 'المجموعات', value: selectedGroups.length, icon: 'ti-stack' },
              { label: 'العناصر', value: totalDone, icon: 'ti-database' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--bg3)', borderRadius: 12, padding: '12px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 90,
              }}>
                <i className={`ti ${stat.icon}`} style={{ fontSize: 18, color: 'var(--em)' }} />
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--t1)' }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--t4)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={onComplete}
        style={{
          width: '100%', padding: '12px', borderRadius: 12,
          border: 'none', background: 'var(--em)', color: '#fff',
          fontSize: 14, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', boxShadow: 'var(--emglow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <i className="ti ti-arrow-left" style={{ fontSize: 16 }} />
        الدخول إلى الشركة
      </button>

      <style>{`@keyframes popIn { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );

  const renderFooter = () => {
    if (phase !== 'select') return null;
    return (
      <>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: '10px', borderRadius: 10,
            border: '1px solid var(--b3)', background: 'transparent',
            color: 'var(--t3)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          تخطي الآن
        </button>
        <button
          onClick={handleApply}
          disabled={selectedSeeds.length === 0}
          style={{
            flex: 2, padding: '10px', borderRadius: 10,
            border: 'none', background: selectedSeeds.length > 0 ? 'var(--em)' : 'var(--b3)',
            color: selectedSeeds.length > 0 ? '#fff' : 'var(--t4)',
            fontSize: 13, fontWeight: 800, cursor: selectedSeeds.length > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', boxShadow: selectedSeeds.length > 0 ? 'var(--emglow)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all .15s',
          }}
        >
          <i className="ti ti-bolt" style={{ fontSize: 15 }} />
          تطبيق {selectedSeeds.length} عنصر
        </button>
      </>
    );
  };

  const subtitleMap = {
    select:   `${companyName} · ${totalSelected} عنصر محدد`,
    applying: `جارٍ التطبيق... ${totalDone}/${totalCount}`,
    done:     hasErrors ? 'اكتمل مع أخطاء' : `تم تطبيق ${totalDone} عنصر بنجاح`,
  };

  return (
    <Modal
      open={true}
      onClose={phase === 'select' ? onClose : () => {}}
      title="إعداد البيانات الأولية"
      subtitle={subtitleMap[phase]}
      footer={renderFooter()}
      size="md"
    >
      {phase === 'select'   && renderSelect()}
      {phase === 'applying' && renderApplying()}
      {phase === 'done'     && renderDone()}
    </Modal>
  );
}
