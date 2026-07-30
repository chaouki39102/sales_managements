import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useActiveSlug } from '@/lib/store/appStore';
import { apiPost } from '@/lib/api/core/client';
import { useQueryClient } from '@tanstack/react-query';
import { tenantKeys } from '@/lib/api/core/queryKeys';

// ══════════════════════════════════════════════════════════════════════════════
// QuickAddLookupButton — زر "+" بجانب حقل الـ Select لإضافة قيمة جديدة
// يفتح نموذجًا صغيرًا، يُنشئ العنصر عبر API، ثم يحدّث قائمة الاختيار تلقائيًا
// ══════════════════════════════════════════════════════════════════════════════

export interface QuickAddField {
  name:        string;
  label:       string;
  type?:       'text' | 'number';
  required?:   boolean;
  placeholder?: string;
  defaultValue?: string | number;
}

interface QuickAddLookupButtonProps {
  /** عنوان النافذة المنبثقة */
  title:        string;
  /** نص الزر (أيقونة +) */
  buttonLabel?: string;
  /** حقول النموذج */
  fields:       QuickAddField[];
  /** مسار API (مثال: 'families', 'brands') */
  resourcePath: string;
  /** callback بعد الإنشاء الناجح — يُمرَّر إليه العنصر الجديد { id, name, ... } */
  onCreated:    (item: Record<string, any>) => void;
}

/**
 * زر "+" صغير يُفتح نافذة إضافة سريعة لأي كيان lookup.
 *
 * المكون يستخدم `apiPost` مباشرة بدلاً من mutation hook،
 * ثم يُبطلّ ذاكرة التخزين المؤقت للبيانات المجمّعة تلقائيًا.
 *
 * Usage:
 * ```tsx
 * <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
 *   <select ...>...</select>
 *   <QuickAddLookupButton
 *     title="إضافة تصنيف"
 *     resourcePath="families"
 *     fields={[{ name: 'name', label: 'الاسم', required: true }]}
 *     onCreated={item => set('family_id', item.id)}
 *   />
 * </div>
 * ```
 */
export default function QuickAddLookupButton({
  title,
  _buttonLabel = '+',
  fields,
  resourcePath,
  onCreated,
}: QuickAddLookupButtonProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const firstInpRef = useRef<HTMLInputElement>(null);
  const slug = useActiveSlug();
  const qc = useQueryClient();

  // Focus first input on open
  useEffect(() => {
    if (open) {
      const init: Record<string, string | number> = {};
      for (const f of fields) init[f.name] = f.defaultValue ?? '';
      setValues(init);
      setError('');
      setTimeout(() => firstInpRef.current?.focus(), 60);
    }
  }, [open, fields]);

  const handleSubmit = async () => {
    // Validate required fields
    for (const f of fields) {
      if (f.required && !values[f.name] && values[f.name] !== 0) {
        setError(`${f.label} مطلوب`);
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const item = await apiPost<Record<string, any>>(`/${resourcePath}`, values);

      // Invalidate all lookups caches so the select list refreshes
      if (slug) {
        await qc.invalidateQueries({ queryKey: tenantKeys.lookups.all(slug) });
      }

      onCreated(item);
      setOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'حدث خطأ';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* زر الإضافة */}
      <button
        type="button"
        className="qalb-btn"
        onClick={() => setOpen(true)}
        title={title}
      >
        +
      </button>

      {/* النافذة المنبثقة */}
      {open && createPortal(
        <div className="qalb-overlay" onClick={() => !saving && setOpen(false)}>
          <div className="qalb-modal" onClick={e => e.stopPropagation()}>
            <div className="qalb-header">
              <span className="qalb-title">{title}</span>
              <button className="qalb-close" onClick={() => !saving && setOpen(false)} type="button">
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="qalb-body">
              {fields.map(f => (
                <div key={f.name} className="qalb-field">
                  <label className="qalb-label">
                    {f.label}{f.required && <span className="qalb-req">*</span>}
                  </label>
                  <input
                    ref={fields.indexOf(f) === 0 ? firstInpRef : undefined}
                    className="qalb-input"
                    type={f.type ?? 'text'}
                    value={values[f.name] ?? ''}
                    placeholder={f.placeholder ?? ''}
                    onChange={e => setValues(v => ({
                      ...v,
                      [f.name]: f.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value,
                    }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !saving) handleSubmit();
                      if (e.key === 'Escape') setOpen(false);
                    }}
                    disabled={saving}
                  />
                </div>
              ))}
              {error && <div className="qalb-error">{error}</div>}
            </div>

            <div className="qalb-footer">
              <button className="btn" onClick={() => setOpen(false)} disabled={saving}>إلغاء</button>
              <button className="btn btn-p" onClick={handleSubmit} disabled={saving}>
                {saving ? <><i className="ti ti-loader-2 ti-spin" /> جاري...</> : <><i className="ti ti-check" /> حفظ</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
