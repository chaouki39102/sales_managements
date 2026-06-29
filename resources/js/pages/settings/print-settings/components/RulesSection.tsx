import React, { useState, useCallback } from 'react';
import type { PrintTemplate, ReportRule } from '../types';
import FormulaEditor from './FormulaEditor';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface RulesSectionProps {
  tpl: PrintTemplate;
  update: <K extends keyof PrintTemplate>(key: K, val: PrintTemplate[K]) => void;
}

type RuleAction = ReportRule['action'];

const ACTIONS: { value: RuleAction; label: string }[] = [
  { value: 'show',       label: 'إظهار'     },
  { value: 'hide',       label: 'إخفاء'     },
  { value: 'highlight',  label: 'تمييز'     },
  { value: 'disable',    label: 'تعطيل'     },
];

const SECTION_TARGETS: { value: string; label: string }[] = [
  { value: 'header',    label: 'رأس الفاتورة'    },
  { value: 'doc-info',  label: 'معلومات المستند'  },
  { value: 'items',     label: 'جدول المنتجات'    },
  { value: 'totals',    label: 'الإجماليات'       },
  { value: 'payments',  label: 'وسائل الدفع'      },
  { value: 'footer',    label: 'التذييل'          },
];

const SECTION_KEYS: { key: keyof PrintTemplate; label: string }[] = [
  { key: 'show_header_section',   label: 'رأس الفاتورة'    },
  { key: 'show_doc_info_section', label: 'معلومات المستند'  },
  { key: 'show_items_section',    label: 'جدول المنتجات'    },
  { key: 'show_totals_section',   label: 'الإجماليات'       },
  { key: 'show_payments_section', label: 'وسائل الدفع'      },
  { key: 'show_footer_section',   label: 'التذييل'          },
];

const LABEL_MAP: Record<string, string> = {
  header:    'رأس الفاتورة',
  'doc-info':'معلومات المستند',
  items:     'جدول المنتجات',
  totals:    'الإجماليات',
  payments:  'وسائل الدفع',
  footer:    'التذييل',
};

const STYLES = {
  row: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0',
  } as React.CSSProperties,
  badge: {
    fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
    background: 'var(--emb)', color: 'var(--em)',
  } as React.CSSProperties,
  ruleCard: {
    border: '1px solid var(--b2)', borderRadius: 'var(--r1)',
    padding: 8, marginBottom: 6, background: 'var(--bg3)',
  } as React.CSSProperties,
  label: {
    fontSize: 11, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 2,
  } as React.CSSProperties,
  input: {
    width: '100%', padding: '4px 6px', borderRadius: 'var(--r1)',
    border: '1px solid var(--b2)', background: 'var(--bg)',
    fontSize: 12, color: 'var(--t1)', outline: 'none', boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%', padding: '4px 6px', borderRadius: 'var(--r1)',
    border: '1px solid var(--b2)', background: 'var(--bg)',
    fontSize: 12, color: 'var(--t1)', outline: 'none',
  },
  btn: {
    padding: '4px 10px', borderRadius: 'var(--r1)', border: 'none',
    cursor: 'pointer', fontSize: 12, fontWeight: 700,
  },
};

function genId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function RulesSection({ tpl, update }: RulesSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddRule = useCallback(() => {
    const newRule: ReportRule = {
      id: genId(),
      condition: '',
      action: 'hide',
      target: 'items',
      priority: 0,
    };
    update('rules', [...(tpl.rules || []), newRule]);
    setEditingId(newRule.id);
  }, [tpl.rules, update]);

  const handleDeleteRule = useCallback((id: string) => {
    update('rules', (tpl.rules || []).filter(r => r.id !== id));
    if (editingId === id) setEditingId(null);
  }, [tpl.rules, update, editingId]);

  const handleUpdateRule = useCallback((id: string, patch: Partial<ReportRule>) => {
    update('rules', (tpl.rules || []).map(r => r.id === id ? { ...r, ...patch } : r));
  }, [tpl.rules, update]);

  const handleToggleSection = useCallback((key: keyof PrintTemplate) => {
    update(key, !tpl[key] as never);
  }, [tpl, update]);

  return (
    <div>
      {/* ── Section visibility toggles ───────────────────────────────────── */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--em)', marginBottom: 6 }}>
        إظهار/إخفاء كل قسم يدوياً
      </div>
      {SECTION_KEYS.map(sk => (
        <label key={sk.key} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '3px 0', cursor: 'pointer', userSelect: 'none',
        }}>
          <div
            onClick={() => handleToggleSection(sk.key)}
            style={{
              width: 32, height: 17, borderRadius: 9, flexShrink: 0,
              background: tpl[sk.key] ? 'var(--em)' : 'var(--bg5)',
              border: '1px solid ' + (tpl[sk.key] ? 'var(--embo)' : 'var(--b3)'),
              position: 'relative', cursor: 'pointer',
              transition: 'background .16s, border-color .16s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, width: 11, height: 11,
              borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,.25)',
              left: tpl[sk.key] ? 15 : 2, transition: 'left .16s',
            }} />
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 500 }}>{sk.label}</span>
        </label>
      ))}

      <hr style={{ border: 'none', borderTop: '1px solid var(--b2)', margin: '8px 0' }} />

      {/* ── Rules list ────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--em)', marginBottom: 6 }}>
        قواعد الشرط (إذا تحقق الشرط → نفّذ الإجراء)
      </div>

      {(tpl.rules || []).length === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--t4)', padding: '8px 0', textAlign: 'center' }}>
          لا توجد قواعد بعد. أضف قاعدة لبدء التحكم الشرطي في الأقسام.
        </div>
      )}

      {(tpl.rules || []).map(rule => (
        <RuleCard
          key={rule.id}
          rule={rule}
          editing={editingId === rule.id}
          onEdit={() => setEditingId(editingId === rule.id ? null : rule.id)}
          onDelete={() => handleDeleteRule(rule.id)}
          onUpdate={patch => handleUpdateRule(rule.id, patch)}
        />
      ))}

      <button
        type="button" onClick={handleAddRule}
        style={{
          ...STYLES.btn, background: 'var(--em)', color: '#fff',
          width: '100%', marginTop: 4,
        }}
      >
        + إضافة قاعدة جديدة
      </button>
    </div>
  );
}

// ─── RuleCard ────────────────────────────────────────────────────────────────────

function RuleCard({
  rule, editing, onEdit, onDelete, onUpdate,
}: {
  rule: ReportRule;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<ReportRule>) => void;
}) {
  if (editing) {
    return (
      <div style={STYLES.ruleCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={STYLES.badge}>{LABEL_MAP[rule.target] || rule.target}</span>
          <button type="button" onClick={onEdit}
            style={{ ...STYLES.btn, background: 'var(--bg5)', color: 'var(--t2)', fontSize: 11 }}>
            إغلاق
          </button>
        </div>

        {/* Condition */}
        <FormulaEditor
          value={rule.condition}
          onChange={v => onUpdate({ condition: v })}
          label="الشرط (صيغة)"
          placeholder="مثال: total > 1000"
          showFieldPicker
        />

        {/* Action + Target row */}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <span style={STYLES.label}>الإجراء</span>
            <select value={rule.action} onChange={e => onUpdate({ action: e.target.value as RuleAction })} style={STYLES.select}>
              {ACTIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <span style={STYLES.label}>الهدف</span>
            <select value={rule.target} onChange={e => onUpdate({ target: e.target.value })} style={STYLES.select}>
              {SECTION_TARGETS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 60 }}>
            <span style={STYLES.label}>الأولوية</span>
            <input
              type="number" value={rule.priority ?? 0}
              onChange={e => onUpdate({ priority: parseInt(e.target.value) || 0 })}
              style={STYLES.input}
            />
          </div>
        </div>

        {/* Highlight style (only when action = highlight) */}
        {rule.action === 'highlight' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              <span style={STYLES.label}>لون الخلفية</span>
              <input
                type="color" value={rule.highlightStyle?.background || '#fff3cd'}
                onChange={e => onUpdate({
                  highlightStyle: { ...(rule.highlightStyle || {}), background: e.target.value }
                })}
                style={{ ...STYLES.input, padding: 2, height: 28 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={STYLES.label}>لون النص</span>
              <input
                type="color" value={rule.highlightStyle?.color || '#111'}
                onChange={e => onUpdate({
                  highlightStyle: { ...(rule.highlightStyle || {}), color: e.target.value }
                })}
                style={{ ...STYLES.input, padding: 2, height: 28 }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer', fontSize: 11, color: 'var(--t3)', paddingBottom: 4,
              }}>
                <input
                  type="checkbox"
                  checked={rule.highlightStyle?.fontWeight === 'bold' || rule.highlightStyle?.fontWeight === '700'}
                  onChange={e => onUpdate({
                    highlightStyle: {
                      ...(rule.highlightStyle || {}),
                      fontWeight: e.target.checked ? 'bold' : 'normal',
                    }
                  })}
                />
                عريض
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Collapsed view
  const actionLabels: Record<string, string> = {
    show: 'إظهار', hide: 'إخفاء', highlight: 'تمييز', disable: 'تعطيل',
  };
  const actionColors: Record<string, string> = {
    show: '#16a34a', hide: '#dc2626', highlight: '#d97706', disable: '#6b7280',
  };

  return (
    <div style={{
      ...STYLES.ruleCard, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    }} onClick={onEdit}>
      <span style={STYLES.badge}>{LABEL_MAP[rule.target] || rule.target}</span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: actionColors[rule.action] || '#111',
      }}>
        {actionLabels[rule.action] || rule.action}
      </span>
      <span style={{
        flex: 1, fontSize: 11, color: 'var(--t4)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {rule.condition ? `← ${rule.condition}` : '(بدون شرط)'}
      </span>
      <button
        type="button" onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{
          ...STYLES.btn, background: 'transparent', color: 'var(--t4)',
          fontSize: 14, padding: '2px 6px',
        }}
        title="حذف القاعدة"
      >
        ✕
      </button>
    </div>
  );
}
