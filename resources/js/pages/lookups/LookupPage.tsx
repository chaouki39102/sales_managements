// ════════════════════════════════════════════════
// resources/js/pages/lookups/LookupPage.tsx
// v5: UX محسّن — Enter للانتقال، Toggle، تحقق لحظي،
//     تحريك سلس، Quick‑Edit inline، تلميحات ذكية
// ════════════════════════════════════════════════
import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { useLookup }       from '@/hooks/useLookup';
import { useRemoteLabels } from '@/hooks/useRemoteLabels';
import { apiGet }           from '@/lib/api/core/client';
import Card                from '@/components/ui/Card';
import SimpleTable          from '@/components/ui/SimpleTable';
import { useNotification } from '@/hooks/useNotification';

// ── Types ──────────────────────────────────────
export interface FieldDef {
  key:          string;
  label:        string;
  type?:        'text' | 'number' | 'select' | 'textarea' | 'remote-select' | 'toggle';
  placeholder?: string;
  options?:     { value: string | number; label: string }[];

  // remote-select
  remoteEndpoint?:    string;
  remoteLabel?:       string;
  remoteValue?:       string;
  remotePlaceholder?: string;
  remoteParams?:      Record<string, any>;

  // cascade
  cascadeParent?: string;
  cascadeParam?:  string;

  required?:    boolean;
  showInTable?: boolean;
  badge?:       boolean;
  hint?:        string;
  autoOrder?:   boolean;   // ✅ يُحسب تلقائياً = items.length + 1
  defaultValue?: any;      // ✅ قيمة افتراضية صريحة
  renderCell?:  (value: any, item: any, labels: RemoteLabels) => React.ReactNode;
}

export type RemoteLabels = Record<string, Record<string | number, string>>;

export interface LookupPageProps {
  title:      string;
  resource:   string;
  endpoint:   string;
  fields:     FieldDef[];
  color?:     string;
  icon?:      string;
  emptyText?: string;
}

// ════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════
function isBooleanField(f: FieldDef): boolean {
  if (f.type === 'toggle') return true;
  if (f.type !== 'select') return false;
  const opts = f.options ?? [];
  return (
    opts.length === 2 &&
    opts.every(o => o.value === 1 || o.value === 0 || o.value === '1' || o.value === '0')
  );
}

// ════════════════════════════════════════════════
// Hook: remote options
// ════════════════════════════════════════════════
function useRemoteOptions(
  endpoint?: string,
  labelField = 'name',
  valueField = 'id',
  extraParams: Record<string, any> = {},
  cascadeParam?: string,
  parentValue?: any,
) {
  const [options, setOptions] = useState<{ value: string | number; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const doFetch = useCallback(() => {
    if (!endpoint) return;
    if (cascadeParam && !parentValue) { setOptions([]); return; }
    setLoading(true);
    const params: Record<string, any> = { per_page: 500, ...extraParams };
    if (cascadeParam && parentValue) params[cascadeParam] = parentValue;

    apiGet<any>(endpoint, params)
      .then(data => {
        const items: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data : [];
        setOptions(items.map(i => ({
          value: i[valueField] ?? i.id,
          label: i[labelField] ?? i.arabic_name ?? i.name ?? String(i.id),
        })));
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, labelField, valueField, cascadeParam, parentValue, JSON.stringify(extraParams)]);

  useEffect(() => { doFetch(); }, [doFetch]);
  return { options, loading, refetch: doFetch };
}

// ════════════════════════════════════════════════
// Toggle Component
// ════════════════════════════════════════════════
function ToggleField({ field, value, onChange }: {
  field: FieldDef; value: any; onChange: (v: any) => void;
}) {
  const isOn = value === 1 || value === '1' || value === true;
  const opts = field.options ?? [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }];
  const onLabel  = opts.find(o => o.value === 1 || o.value === '1')?.label ?? 'نعم';
  const offLabel = opts.find(o => o.value === 0 || o.value === '0')?.label ?? 'لا';

  return (
    <button
      type="button"
      onClick={() => onChange(isOn ? 0 : 1)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
        fontFamily: 'Tajawal, sans-serif',
      }}
    >
      {/* Track */}
      <span style={{
        position: 'relative', display: 'inline-block',
        width: 46, height: 26, borderRadius: 13, flexShrink: 0,
        background: isOn ? 'var(--em)' : 'var(--bg5)',
        border: `1.5px solid ${isOn ? 'var(--em)' : 'var(--b3)'}`,
        transition: 'background .2s, border-color .2s',
        boxShadow: isOn ? 'var(--emglow)' : 'none',
      }}>
        <span style={{
          position: 'absolute',
          top: 2, right: isOn ? 2 : 20,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)',
          transition: 'right .2s cubic-bezier(.34,1.4,.64,1)',
        }} />
      </span>
      {/* Label */}
      <span style={{
        fontSize: 13, fontWeight: 700,
        color: isOn ? 'var(--em)' : 'var(--t4)',
        transition: 'color .2s',
        minWidth: 28,
      }}>
        {isOn ? onLabel : offLabel}
      </span>
    </button>
  );
}

// ════════════════════════════════════════════════
// RemoteSelect — يدعم cascade
// ════════════════════════════════════════════════
function RemoteSelect({ field, value, onChange, parentValue, inputRef }: {
  field: FieldDef; value: any; onChange: (v: any) => void;
  parentValue?: any; inputRef?: React.Ref<HTMLSelectElement>;
}) {
  const { options, loading } = useRemoteOptions(
    field.remoteEndpoint,
    field.remoteLabel  ?? 'arabic_name',
    field.remoteValue  ?? 'id',
    field.remoteParams ?? {},
    field.cascadeParam,
    parentValue,
  );

  useEffect(() => {
    if (field.cascadeParent && parentValue !== undefined) onChange('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentValue]);

  const isDisabled = loading || (!!field.cascadeParent && !parentValue);
  const _selected = options.find(o => String(o.value) === String(value));

  return (
    <div style={{ position: 'relative' }}>
      <select
        ref={inputRef}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={isDisabled}
        style={selectStyle(isDisabled, !!value)}
      >
        <option value="">
          {loading
            ? 'جارٍ التحميل...'
            : (field.cascadeParent && !parentValue)
              ? `— اختر ${getCascadeParentLabel(field)} أولاً —`
              : (field.remotePlaceholder ?? `— اختر ${field.label} —`)}
        </option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Count badge */}
      {!loading && options.length > 0 && (
        <span style={{
          position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, color: 'var(--t4)', pointerEvents: 'none',
        }}>
          {options.length}
        </span>
      )}

      {/* Arrow / spinner */}
      <span style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: 'var(--t4)', fontSize: 13,
      }}>
        {loading
          ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
          : <i className="ti ti-chevron-down" />}
      </span>
    </div>
  );
}

function selectStyle(disabled: boolean, hasValue: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '8px 12px 8px 34px',
    borderRadius: 'var(--r2)',
    border: `1px solid ${disabled ? 'var(--b2)' : 'var(--b3)'}`,
    background: disabled ? 'var(--bg3)' : 'var(--bg1)',
    color: (hasValue && !disabled) ? 'var(--t1)' : 'var(--t4)',
    fontSize: 13, fontFamily: 'Tajawal, sans-serif',
    outline: 'none', appearance: 'none' as any,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color .15s, box-shadow .15s',
  };
}

function getCascadeParentLabel(field: FieldDef): string {
  const map: Record<string, string> = {
    wilaya_id: 'الولاية', parent_id: 'الفئة الأم',
    region_id: 'المنطقة', category_id: 'الفئة',
  };
  return map[field.cascadeParent ?? ''] ?? field.cascadeParent ?? 'الحقل الأب';
}

// ════════════════════════════════════════════════
// FormField — مع forwardRef + Enter navigation
// ════════════════════════════════════════════════
const FormField = React.forwardRef<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  {
    field: FieldDef;
    value: any;
    onChange: (v: any) => void;
    formData: Record<string, any>;
    onEnter?: () => void;  // ✅ انتقال للحقل التالي
    error?: boolean;       // ✅ حالة خطأ للحقل
  }
>(({ field, value, onChange, formData, onEnter, error }, ref) => {

  const baseStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 'var(--r2)',
    border: `1px solid ${error ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)',
    color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
    boxShadow: error ? '0 0 0 3px var(--redb)' : 'none',
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && field.type !== 'textarea') {
      e.preventDefault();
      onEnter?.();
    }
  };

  // ── Toggle ──
  if (isBooleanField(field)) {
    return <ToggleField field={field} value={value} onChange={onChange} />;
  }

  // ── Remote Select ──
  if (field.type === 'remote-select') {
    const parentValue = field.cascadeParent ? formData[field.cascadeParent] : undefined;
    return (
      <RemoteSelect
        field={field} value={value} onChange={onChange} parentValue={parentValue}
        inputRef={ref as React.Ref<HTMLSelectElement>}
      />
    );
  }

  // ── Textarea ──
  if (field.type === 'textarea') {
    return (
      <textarea
        ref={ref as React.Ref<HTMLTextAreaElement>}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        style={{ ...baseStyle, resize: 'vertical' }}
      />
    );
  }

  // ── Select ──
  if (field.type === 'select') {
    return (
      <div style={{ position: 'relative' }}>
        <select
          ref={ref as React.Ref<HTMLSelectElement>}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ ...baseStyle, paddingLeft: 34, appearance: 'none' as any, cursor: 'pointer' }}
        >
          <option value="">— اختر —</option>
          {field.options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: 'var(--t4)', fontSize: 13,
        }}>
          <i className="ti ti-chevron-down" />
        </span>
      </div>
    );
  }

  // ── Number ──
  if (field.type === 'number') {
    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={field.placeholder}
        style={{ ...baseStyle, direction: 'ltr', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}
      />
    );
  }

  // ── Text (default) ──
  return (
    <input
      ref={ref as React.Ref<HTMLInputElement>}
      type="text"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={field.placeholder}
      style={baseStyle}
    />
  );
});
FormField.displayName = 'FormField';

// ════════════════════════════════════════════════
// Modal
// ════════════════════════════════════════════════
function Modal({ title, subtitle, children, onClose, saving }: {
  title: string; subtitle?: string; children: React.ReactNode;
  onClose: () => void; saving: boolean;
}) {
  // إغلاق بـ Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, saving]);

  return (
    <div
      className="ov on"
      onClick={saving ? undefined : onClose}
    >
      <div
        className="modal modal-lg"
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="m-hd">
          <div>
            <div className="m-title">{title}</div>
            {subtitle && <div className="m-sub">{subtitle}</div>}
          </div>
          <button className="m-x" onClick={onClose} disabled={saving}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Body */}
        <div className="m-body" style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// ConfirmModal
// ════════════════════════════════════════════════
function ConfirmModal({ name, onConfirm, onClose, saving }: {
  name: string; onConfirm: () => void; onClose: () => void; saving: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
      if (e.key === 'Enter' && !saving) onConfirm();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, onConfirm, saving]);

  return (
    <div className="ov on" onClick={saving ? undefined : onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="m-body" style={{ textAlign: 'center', padding: '28px 24px 20px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--redb)', border: '1px solid var(--redbo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 26, color: 'var(--red)',
          }}>
            <i className="ti ti-trash" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 8 }}>
            تأكيد الحذف
          </div>
          <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
            هل تريد حذف <strong style={{ color: 'var(--t1)' }}>«{name}»</strong>؟
            <br />
            <span style={{ fontSize: 12, color: 'var(--red)', opacity: .8 }}>
              لا يمكن التراجع عن هذا الإجراء
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
            <button className="btn" onClick={onClose} disabled={saving} style={{ minWidth: 90 }}>
              إلغاء
            </button>
            <button className="btn btn-r" onClick={onConfirm} disabled={saving} style={{ minWidth: 90 }}>
              {saving
                ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
                : <i className="ti ti-trash" />}
              حذف
            </button>
          </div>
          <div style={{ marginTop: 12, fontSize: 10.5, color: 'var(--t4)' }}>
            <i className="ti ti-keyboard" /> Enter للتأكيد · Escape للإلغاء
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Error helpers — تحويل أخطاء Laravel التقنية إلى رسائل عربية
// ════════════════════════════════════════════════
function parseTechError(msg: string, fields: FieldDef[]): string {
  if (!msg) return 'حدث خطأ أثناء الحفظ، يرجى المحاولة مجدداً';

  // UNIQUE constraint — نُحدد الحقل المكرر إن أمكن
  const uniqueMatch = msg.match(/UNIQUE constraint failed:\s*\w+\.(\w+)/i);
  if (uniqueMatch) {
    const col = uniqueMatch[1];
    const field = fields.find(f => f.key === col || col.includes(f.key));
    const lbl = field?.label ?? col;
    if (col === 'slug') return `هذا الاسم مستخدم مسبقاً، يرجى تغييره`;
    return `حقل "${lbl}" مكرر — هذه القيمة موجودة مسبقاً`;
  }

  // NOT NULL constraint
  const nullMatch = msg.match(/NOT NULL constraint failed:\s*\w+\.(\w+)/i);
  if (nullMatch) {
    const col = nullMatch[1];
    const field = fields.find(f => f.key === col);
    const lbl = field?.label ?? col;
    return `حقل "${lbl}" مطلوب ولا يمكن تركه فارغاً`;
  }

  // Foreign key
  if (/foreign key/i.test(msg)) {
    return 'البيانات المُدخلة مرتبطة بسجل غير موجود، يرجى المراجعة';
  }

  // أي خطأ تقني آخر
  const techPatterns = [/SQLSTATE/i, /Integrity constraint/i, /sqlite/i, /SQL:/i, /PDOException/i];
  if (techPatterns.some(p => p.test(msg))) {
    return 'حدث خطأ أثناء الحفظ، يرجى المحاولة مجدداً';
  }

  return msg;
}

function translateLaravelMsg(msg: string, key: string, label?: string): string {
  const l = label ?? key;
  return msg
    .replace(new RegExp(`The ${key}`, 'gi'),        `حقل "${l}"`)
    .replace(new RegExp(`The ${key} field`, 'gi'),  `حقل "${l}"`)
    .replace(/has already been taken/gi,  'مستخدم مسبقاً')
    .replace(/is required/gi,             'مطلوب')
    .replace(/must be a number/gi,        'يجب أن يكون رقماً')
    .replace(/must not be greater than/gi,'يجب ألا يتجاوز')
    .replace(/must be at least/gi,        'يجب أن يكون على الأقل')
    .replace(/is invalid/gi,             'غير صالح');
}

// ════════════════════════════════════════════════
// LookupPage
// ════════════════════════════════════════════════
export default function LookupPage({
  title, resource, endpoint, fields,
  color = 'var(--em)', icon = 'ti-list', emptyText,
}: LookupPageProps) {
  const { items, loading, error, saving, refetch, create, update, remove } = useLookup<any>(endpoint);

  const notify = useNotification();

  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState<'add' | 'edit' | null>(null);
  const [editItem,  setEditItem]  = useState<any | null>(null);
  const [formData,  setFormData]  = useState<Record<string, any>>({});
  const [formErr,   setFormErr]   = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});
  const [delItem,   setDelItem]   = useState<any | null>(null);
  const [sortKey,   setSortKey]   = useState<string | null>(null);
  const [sortAsc,   setSortAsc]   = useState(true);

  // refs للحقول — للـ Enter navigation
  const fieldRefs = useRef<Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>([]);

  // remote labels للجدول — مع كاش React Query (useRemoteLabels.ts)
  const remoteLabels = useRemoteLabels(fields, endpoint);

  // Enter navigation: انتقل للحقل التالي
  const focusField = useCallback((idx: number) => {
    // تجاوز toggle fields (لا تحتاج focus بالـ enter)
    for (let i = idx; i < fields.length; i++) {
      if (!isBooleanField(fields[i]) && fieldRefs.current[i]) {
        fieldRefs.current[i]?.focus();
        return;
      }
    }
    // إذا انتهت الحقول — ركّز زر الحفظ
    (document.querySelector('.btn-save-close') as HTMLElement)?.focus();
  }, [fields]);

  // حساب القيمة الافتراضية لحقل عند الإضافة
  function getFieldDefault(f: FieldDef): any {
    if (f.defaultValue !== undefined) return f.defaultValue;
    if (isBooleanField(f)) {
      const opts = f.options ?? [];
      // حقل "active" و"نشط" يكون ON افتراضياً عند الإنشاء
      const isActiveField = ['active', 'is_active', 'enabled', 'status'].includes(f.key);
      if (isActiveField) {
        return opts.find(o => o.value === 1 || o.value === '1')?.value ?? 1;
      }
      // بقية الحقول البوليانية → OFF
      return opts.find(o => o.value === 0 || o.value === '0')?.value ?? 0;
    }
    if (f.autoOrder || f.key === 'display_order' || f.key === 'sort_order' || f.key === 'order') {
      return items.length + 1;
    }
    return '';
  }

  // فتح مودل الإضافة
  function openAdd() {
    const defaults: Record<string, any> = {};
    fields.forEach(f => { defaults[f.key] = getFieldDefault(f); });
    setFormData(defaults);
    setFormErr(null);
    setFieldErrs({});
    setEditItem(null);
    setModal('add');
    setTimeout(() => focusField(0), 80);
  }

  // فتح مودل التعديل
  function openEdit(item: any) {
    const data: Record<string, any> = {};
    fields.forEach(f => { data[f.key] = item[f.key] ?? ''; });
    setFormData(data);
    setFormErr(null);
    setFieldErrs({});
    setEditItem(item);
    setModal('edit');
    setTimeout(() => focusField(0), 80);
  }

  // تحقق لحظي من الحقل عند مغادرته
  function validateField(f: FieldDef, val: any) {
    if (f.required && (val === '' || val === null || val === undefined)) {
      return `${f.label} مطلوب`;
    }
    return null;
  }

  function handleFieldChange(f: FieldDef, v: any) {
    setFormData(d => ({ ...d, [f.key]: v }));
    // مسح الخطأ فور الكتابة
    if (fieldErrs[f.key]) {
      setFieldErrs(prev => { const n = { ...prev }; delete n[f.key]; return n; });
    }
    setFormErr(null);
  }

  function _handleFieldBlur(f: FieldDef, v: any) {
    const err = validateField(f, v);
    if (err) setFieldErrs(prev => ({ ...prev, [f.key]: err }));
  }

  // حفظ أساسي
  async function performSubmit(closeAfterSave: boolean) {
    // تحقق من جميع الحقول
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const err = validateField(f, formData[f.key]);
      if (err) errs[f.key] = err;
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrs(errs);
      setFormErr('يرجى تعبئة الحقول المطلوبة');
      // ركّز أول حقل خاطئ
      const firstErrIdx = fields.findIndex(f => errs[f.key]);
      if (firstErrIdx >= 0) focusField(firstErrIdx);
      return;
    }
    setFormErr(null);
    setFieldErrs({});
    try {
      if (modal === 'add') {
        await create(formData);
        notify.success(`✓ تمت إضافة ${resource} بنجاح`);
        if (closeAfterSave) {
          setModal(null);
        } else {
          const defaults: Record<string, any> = {};
          fields.forEach(f => { defaults[f.key] = getFieldDefault(f); });
          setFormData(defaults);
          setFieldErrs({});
          setTimeout(() => focusField(0), 80);
        }
      } else if (modal === 'edit' && editItem) {
        await update(editItem.id, formData);
        notify.success(`✓ تم تعديل ${resource} بنجاح`);
        if (closeAfterSave) {
          setModal(null);
        } else {
          setModal('add');
          const defaults: Record<string, any> = {};
          fields.forEach(f => { defaults[f.key] = getFieldDefault(f); });
          setFormData(defaults);
          setEditItem(null);
          setFieldErrs({});
          setTimeout(() => focusField(0), 80);
        }
      }
    } catch (e: any) {
      const resp = e?.response?.data;
      if (resp?.errors) {
        // أخطاء validation من Laravel — نُترجم الحقول للعربية
        const errs: Record<string, string> = {};
        const fieldLabels: Record<string, string> = {};
        fields.forEach(f => { fieldLabels[f.key] = f.label; });
        Object.entries(resp.errors).forEach(([k, v]: any) => {
          const raw = Array.isArray(v) ? v[0] : String(v);
          errs[k] = translateLaravelMsg(raw, k, fieldLabels[k]);
        });
        setFieldErrs(errs);
        setFormErr('يرجى مراجعة البيانات المُدخلة');
      } else if (resp?.message || resp?.error) {
        setFormErr(parseTechError(resp?.message ?? resp?.error ?? '', fields));
      } else {
        setFormErr('حدث خطأ أثناء الحفظ، يرجى المحاولة مجدداً');
      }
    }
  }

  async function handleDelete() {
    if (!delItem) return;
    try {
      await remove(delItem.id);
      notify.success(`تم حذف ${resource}`);
    } catch (e: any) {
      const resp = e?.response?.data;
      const raw  = resp?.message ?? resp?.error ?? e?.message ?? '';
      notify.error(parseTechError(raw, fields));
    }
    setDelItem(null);
  }

  // ── اختصارات لوحة المفاتيح ──
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!modal) return;
      if (e.key === 'F1') { e.preventDefault(); performSubmit(false); }
      if (e.key === 'F2') { e.preventDefault(); performSubmit(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, saving, formData, editItem]);

  // ── الجدول ──
  const tableFields = fields.filter(f => f.showInTable !== false);
  const nameField   = fields[0]?.key ?? 'name';

  // بحث + فرز
  const filtered = useMemo(() => {
    let arr = items.filter(item =>
      !search || String(item[nameField] ?? '').toLowerCase().includes(search.toLowerCase())
    );
    if (sortKey) {
      arr = [...arr].sort((a, b) => {
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        const cmp = String(av).localeCompare(String(bv), 'ar');
        return sortAsc ? cmp : -cmp;
      });
    }
    return arr;
  }, [items, search, sortKey, sortAsc, nameField]);

  function handleSort(key: string) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  // ── render cell ──
  function renderCellValue(f: FieldDef, item: any) {
    const val = item[f.key];
    if (f.renderCell) return f.renderCell(val, item, remoteLabels);

    if (f.type === 'remote-select') {
      const label = remoteLabels[f.key]?.[val];
      return label
        ? <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{label}</span>
        : val
          ? <span style={{ color: 'var(--t4)', fontSize: 11 }}>#{val}</span>
          : <span style={{ color: 'var(--t4)' }}>—</span>;
    }

    if (f.badge || isBooleanField(f)) {
      const opt = f.options?.find(o => String(o.value) === String(val));
      const isYes = String(val) === '1' || val === true;
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
          background: isYes
            ? 'color-mix(in srgb, var(--em) 12%, transparent)'
            : 'color-mix(in srgb, var(--t4) 10%, transparent)',
          color: isYes ? 'var(--em)' : 'var(--t4)',
        }}>
          {isYes
            ? <i className="ti ti-check" style={{ fontSize: 10 }} />
            : <i className="ti ti-minus" style={{ fontSize: 10 }} />}
          {opt?.label ?? (isYes ? 'نعم' : 'لا')}
        </span>
      );
    }

    if (val === null || val === undefined || val === '') {
      return <span style={{ color: 'var(--t4)' }}>—</span>;
    }
    return val;
  }

  // عدد الحقول البوليانية والعادية للـ grid
  const boolFields    = fields.filter(isBooleanField);
  const regularFields = fields.filter(f => !isBooleanField(f));

  return (
    <div className="page on" style={{ padding: '18px 20px' }}>



      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, fontSize: 19,
          }}>
            <i className={`ti ${icon}`} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--t4)' }}>
              {loading
                ? 'جارٍ التحميل...'
                : `${items.length} عنصر`
                  + (search ? ` · ${filtered.length} نتيجة` : '')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* البحث */}
          <div className="srch lkp-inp-focused" style={{ width: 210 }}>
            <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
            <input
              type="text" placeholder="بحث سريع..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--t4)', display: 'flex' }}
              >
                <i className="ti ti-x" style={{ fontSize: 12 }} />
              </button>
            )}
          </div>
          <button className="btn" onClick={refetch} title="تحديث">
            <i className={`ti ti-refresh ${loading ? 'spin' : ''}`} style={loading ? { animation: 'spin .8s linear infinite' } : {}} />
          </button>
          <button className="btn btn-p" onClick={openAdd}>
            <i className="ti ti-plus" />
            <span>إضافة {resource}</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '11px 15px', marginBottom: 14, borderRadius: 'var(--r2)',
          background: 'var(--redb)', border: '1px solid var(--redbo)',
          color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <i className="ti ti-alert-circle" />
          {error}
          <button className="btn btn-xs btn-r" style={{ marginRight: 'auto' }} onClick={refetch}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <Card noHeader style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--t3)' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 22, animation: 'spin .8s linear infinite' }} />
            جارٍ تحميل البيانات...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8, color: 'var(--t4)' }}>
            <i className="ti ti-inbox" style={{ fontSize: 36 }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {search ? 'لا توجد نتائج للبحث' : (emptyText ?? `لا توجد ${title} بعد`)}
            </div>
            {!search && (
              <button className="btn btn-p btn-sm" onClick={openAdd} style={{ marginTop: 4 }}>
                إضافة أول {resource}
              </button>
            )}
          </div>
        ) : (
          <div className="tw">
            <SimpleTable
              columns={[
                { key: '_idx', label: '#', className: 'center', render: (_v, _row, _k) => filtered.indexOf(_row as any) + 1 },
                ...tableFields.map(f => ({
                  key: f.key,
                  label: f.label,
                  render: (value: unknown, row: Record<string, unknown>) => renderCellValue(f, row),
                })),
                { key: '_actions', label: 'إجراءات', render: (_v, row) => (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <button className="btn btn-xs" onClick={() => openEdit(row)} title="تعديل (Enter للتأكيد)">
                      <i className="ti ti-pencil" />
                    </button>
                    <button className="btn btn-xs btn-r" onClick={() => setDelItem(row)} title="حذف">
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                )},
              ]}
              data={filtered}
              rowKey="id"
              emptyText={search ? 'لا توجد نتائج للبحث' : (emptyText ?? `لا توجد ${title} بعد`)}
              onRowClick={(row) => openEdit(row)}
            />
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{
            padding: '8px 16px', borderTop: '1px solid var(--b1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11.5, color: 'var(--t4)' }}>
              {search
                ? `${filtered.length} نتيجة من أصل ${items.length}`
                : `إجمالي: ${items.length} عنصر`}
            </span>
            <span style={{ fontSize: 11, color: 'var(--t4)' }}>
              <i className="ti ti-mouse-2" style={{ fontSize: 10 }} /> انقر مرتين على صف للتعديل
            </span>
          </div>
        )}
      </Card>

      {/* ── Modal النموذج ── */}
      {modal && (
        <Modal
          title={modal === 'add' ? `إضافة ${resource} جديد` : `تعديل ${resource}`}
          subtitle={
            modal === 'add'
              ? 'اضغط Enter للانتقال بين الحقول · F1 حفظ وجديد · F2 حفظ وإغلاق'
              : undefined
          }
          onClose={() => setModal(null)}
          saving={saving}
        >
          {/* ── حقول عادية ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: boolFields.length ? 14 : 0 }}>
            {regularFields.map((f, visIdx) => {
              const realIdx = fields.indexOf(f);
              const isTextarea = f.type === 'textarea';
              return (
                <div
                  key={f.key}
                  className="lkp-field-wrap lkp-inp-focused"
                  style={isTextarea ? { gridColumn: 'span 2' } : undefined}
                >
                  <label className="lkp-field-label">
                    {f.label}
                    {f.required && <span className="req">*</span>}
                  </label>

                  <FormField
                    ref={el => { fieldRefs.current[realIdx] = el; }}
                    field={f}
                    value={formData[f.key]}
                    onChange={v => handleFieldChange(f, v)}
                    formData={formData}
                    onEnter={() => {
                      // انتقل للحقل العادي التالي
                      const nextRegular = regularFields.findIndex((rf, i) => i > visIdx && !isBooleanField(rf));
                      if (nextRegular >= 0) {
                        const nextReal = fields.indexOf(regularFields[nextRegular]);
                        focusField(nextReal);
                      } else {
                        (document.querySelector('.btn-save-close') as HTMLElement)?.focus();
                      }
                    }}
                    error={!!fieldErrs[f.key]}
                  />

                  {/* خطأ الحقل */}
                  {fieldErrs[f.key] && (
                    <span className="lkp-field-err">
                      <i className="ti ti-alert-circle" style={{ fontSize: 11 }} />
                      {fieldErrs[f.key]}
                    </span>
                  )}

                  {/* تلميح */}
                  {f.hint && !fieldErrs[f.key] && (
                    <span className="lkp-field-hint">
                      <i className="ti ti-info-circle" style={{ fontSize: 11 }} />
                      {f.hint}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── حقول Toggle/Boolean ── */}
          {boolFields.length > 0 && (
            <div className="lkp-bool-grid" style={{ marginBottom: formErr ? 12 : 0 }}>
              {boolFields.map(f => (
                <div key={f.key} className="lkp-bool-item">
                  <span className="lkp-bool-lbl">{f.label}</span>
                  <ToggleField
                    field={f}
                    value={formData[f.key]}
                    onChange={v => handleFieldChange(f, v)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* خطأ عام */}
          {formErr && (
            <div style={{
              padding: '9px 12px', borderRadius: 'var(--r2)', marginTop: 10,
              background: 'var(--redb)', border: '1px solid var(--redbo)',
              color: 'var(--red)', fontSize: 12.5,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ti ti-alert-circle" />
              {formErr}
            </div>
          )}

          {/* ── أزرار الإجراءات ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 16, marginTop: 8, borderTop: '1px solid var(--b1)',
          }}>
            {/* يسار: اختصارات */}
            <span style={{ fontSize: 10.5, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-keyboard" />
              <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--b3)', background: 'var(--bg3)', fontSize: 10 }}>F1</kbd> حفظ وجديد
              &nbsp;·&nbsp;
              <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--b3)', background: 'var(--bg3)', fontSize: 10 }}>F2</kbd> حفظ وإغلاق
              &nbsp;·&nbsp;
              <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--b3)', background: 'var(--bg3)', fontSize: 10 }}>Esc</kbd> إلغاء
            </span>

            {/* يمين: أزرار */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setModal(null)} disabled={saving}>
                إلغاء
              </button>
              <button
                className="btn lkp-btn-save-new"
                onClick={() => performSubmit(false)}
                disabled={saving}
                style={{ background: 'var(--bg3)', border: '1px solid var(--b3)', color: 'var(--t2)' }}
              >
                {saving
                  ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
                  : <i className="ti ti-copy" />}
                حفظ وجديد
              </button>
              <button
                className="btn btn-p lkp-btn-save-close"
                onClick={() => performSubmit(true)}
                disabled={saving}
              >
                {saving
                  ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
                  : <i className="ti ti-device-floppy" />}
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete ── */}
      {delItem && (
        <ConfirmModal
          name={delItem[nameField] ?? `#${delItem.id}`}
          onConfirm={handleDelete}
          onClose={() => setDelItem(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
