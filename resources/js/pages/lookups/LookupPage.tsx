// ════════════════════════════════════════════════
// resources/js/pages/lookups/LookupPage.tsx
// v3: يدعم cascade select (wilaya → commune)
// ════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import { useLookup } from '@/hooks/useLookup';
import apiClient from '@/lib/api/client';

// ── Types ──────────────────────────────────────
export interface FieldDef {
  key:          string;
  label:        string;
  type?:        'text' | 'number' | 'select' | 'textarea' | 'remote-select';
  placeholder?: string;
  options?:     { value: string | number; label: string }[];

  // remote-select
  remoteEndpoint?:    string;
  remoteLabel?:       string;     // افتراضي: 'arabic_name' إن وُجد وإلا 'name'
  remoteValue?:       string;     // افتراضي: 'id'
  remotePlaceholder?: string;
  remoteParams?:      Record<string, any>;  // params ثابتة إضافية

  // cascade: هذا الحقل يُصفَّى بناءً على قيمة حقل آخر
  cascadeParent?: string;         // مفتاح الحقل الأب (مثال: 'wilaya_id')
  cascadeParam?:  string;         // اسم الـ param المُرسَل (مثال: 'filter[wilaya_id]')

  required?:    boolean;
  showInTable?: boolean;
  badge?:       boolean;
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
// Hook: يجلب خيارات remote-select
// parentValue: إذا تغيّر يُعيد الجلب مع param إضافي
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

  const fetch = useCallback(() => {
    if (!endpoint) return;
    // إذا كان هناك cascade ولم تُختَر قيمة الأب بعد — نفرّغ الخيارات
    if (cascadeParam && !parentValue) {
      setOptions([]);
      return;
    }
    setLoading(true);
    const params: Record<string, any> = { per_page: 500, ...extraParams };
    if (cascadeParam && parentValue) params[cascadeParam] = parentValue;

    apiClient.get(endpoint, { params })
      .then(res => {
        const raw = res.data as any;
        const items: any[] = Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.data?.data)
            ? raw.data.data
            : [];
        setOptions(items.map(i => ({
          value: i[valueField] ?? i.id,
          // نفضّل arabic_name إذا طُلب labelField='name' وكان arabic_name موجوداً
          label: i[labelField] ?? i.arabic_name ?? i.name ?? String(i.id),
        })));
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [endpoint, labelField, valueField, cascadeParam, parentValue,
      JSON.stringify(extraParams)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { options, loading, refetch: fetch };
}

// ════════════════════════════════════════════════
// RemoteSelect — يدعم cascade
// ════════════════════════════════════════════════
function RemoteSelect({ field, value, onChange, parentValue }: {
  field:       FieldDef;
  value:       any;
  onChange:    (v: any) => void;
  parentValue?: any;
}) {
  const { options, loading } = useRemoteOptions(
    field.remoteEndpoint,
    field.remoteLabel  ?? 'arabic_name',
    field.remoteValue  ?? 'id',
    field.remoteParams ?? {},
    field.cascadeParam,
    parentValue,
  );

  // عند تغيّر الأب، نصفّر قيمة هذا الحقل
  useEffect(() => {
    if (field.cascadeParent && parentValue !== undefined) {
      onChange('');
    }
  }, [parentValue]);

  const isDisabled = loading || (!!field.cascadeParent && !parentValue);

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={isDisabled}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 'var(--r2)',
          border: `1px solid ${isDisabled ? 'var(--b2)' : 'var(--b3)'}`,
          background: isDisabled ? 'var(--bg2)' : 'var(--bg1)',
          color: (value && !isDisabled) ? 'var(--t1)' : 'var(--t4)',
          fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        }}
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
      {loading && (
        <i className="ti ti-loader-2" style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 13, color: 'var(--t4)', animation: 'spin .8s linear infinite',
        }} />
      )}
      {/* عدد الخيارات */}
      {!loading && options.length > 0 && (
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, color: 'var(--t4)',
        }}>
          {options.length}
        </span>
      )}
    </div>
  );
}

function getCascadeParentLabel(field: FieldDef): string {
  // نستخرج label الأب من cascadeParent key
  // مثال: 'wilaya_id' → 'الولاية'
  const map: Record<string, string> = {
    wilaya_id: 'الولاية', parent_id: 'الفئة الأم',
    region_id: 'المنطقة', category_id: 'الفئة',
  };
  return map[field.cascadeParent ?? ''] ?? field.cascadeParent ?? 'الحقل الأب';
}

// ════════════════════════════════════════════════
// FormField
// ════════════════════════════════════════════════
function FormField({ field, value, onChange, formData }: {
  field:    FieldDef;
  value:    any;
  onChange: (v: any) => void;
  formData: Record<string, any>;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 'var(--r2)',
    border: '1px solid var(--b3)', background: 'var(--bg1)',
    color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
    outline: 'none',
  };

  if (field.type === 'remote-select') {
    // قيمة الأب من formData إذا كان cascade
    const parentValue = field.cascadeParent ? formData[field.cascadeParent] : undefined;
    return (
      <RemoteSelect
        field={field}
        value={value}
        onChange={onChange}
        parentValue={parentValue}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        style={{ ...inputStyle, resize: 'vertical' }}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
        <option value="">— اختر —</option>
        {field.options?.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type ?? 'text'}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      style={inputStyle}
    />
  );
}

// ════════════════════════════════════════════════
// Modal / ConfirmModal
// ════════════════════════════════════════════════
function Modal({ title, children, onClose, saving }: {
  title: string; children: React.ReactNode; onClose: () => void; saving: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="card-hd">
          <div className="card-title">{title}</div>
          <button className="btn btn-xs" onClick={onClose} disabled={saving}>
            <i className="ti ti-x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ name, onConfirm, onClose, saving }: {
  name: string; onConfirm: () => void; onClose: () => void; saving: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 380, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', marginTop: 12 }}>
            تأكيد الحذف
          </div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 8 }}>
            هل تريد حذف <strong>{name}</strong>؟<br />
            <span style={{ fontSize: 11.5, color: 'var(--red)' }}>لا يمكن التراجع عن هذا الإجراء.</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          <button className="btn" onClick={onClose} disabled={saving}>إلغاء</button>
          <button className="btn btn-r" onClick={onConfirm} disabled={saving}>
            {saving
              ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
              : <i className="ti ti-trash" />}
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// LookupPage
// ════════════════════════════════════════════════
export default function LookupPage({
  title, resource, endpoint, fields,
  color = 'var(--em)', icon = 'ti-list', emptyText,
}: LookupPageProps) {
  const { items, loading, error, saving, refetch, create, update, remove } = useLookup<any>(endpoint);

  const [search,   setSearch]   = useState('');
  const [modal,    setModal]    = useState<'add' | 'edit' | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErr,  setFormErr]  = useState<string | null>(null);
  const [delItem,  setDelItem]  = useState<any | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // جلب labels الـ remote-select لعرضها في الجدول
  const [remoteLabels, setRemoteLabels] = useState<RemoteLabels>({});
  useEffect(() => {
    fields
      .filter(f => f.type === 'remote-select' && f.remoteEndpoint)
      .forEach(f => {
        apiClient.get(f.remoteEndpoint!, { params: { per_page: 500 } })
          .then(res => {
            const raw = res.data as any;
            const arr: any[] = Array.isArray(raw?.data) ? raw.data
              : Array.isArray(raw?.data?.data) ? raw.data.data : [];
            const labelField = f.remoteLabel ?? 'arabic_name';
            const valueField = f.remoteValue ?? 'id';
            const map: Record<string | number, string> = {};
            arr.forEach(i => {
              map[i[valueField]] = i[labelField] ?? i.arabic_name ?? i.name ?? String(i[valueField]);
            });
            setRemoteLabels(prev => ({ ...prev, [f.key]: map }));
          })
          .catch(() => {});
      });
  }, []);

  const tableFields = fields.filter(f => f.showInTable !== false);
  const nameField   = fields[0]?.key ?? 'name';
  const filtered    = items.filter(item =>
    !search || String(item[nameField] ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openAdd() {
    const defaults: Record<string, any> = {};
    fields.forEach(f => { defaults[f.key] = ''; });
    setFormData(defaults);
    setFormErr(null);
    setEditItem(null);
    setModal('add');
  }

  function openEdit(item: any) {
    const data: Record<string, any> = {};
    fields.forEach(f => { data[f.key] = item[f.key] ?? ''; });
    setFormData(data);
    setFormErr(null);
    setEditItem(item);
    setModal('edit');
  }

  async function handleSubmit() {
    for (const f of fields) {
      if (f.required && !formData[f.key]) {
        setFormErr(`حقل "${f.label}" إلزامي`);
        return;
      }
    }
    setFormErr(null);
    try {
      if (modal === 'add') {
        await create(formData);
        showToast(`تمت إضافة ${resource} بنجاح`);
      } else if (editItem) {
        await update(editItem.id, formData);
        showToast(`تم تعديل ${resource} بنجاح`);
      }
      setModal(null);
    } catch (e: any) {
      setFormErr(e.message);
    }
  }

  async function handleDelete() {
    if (!delItem) return;
    try {
      await remove(delItem.id);
      showToast(`تم حذف ${resource} بنجاح`);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
    setDelItem(null);
  }

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

    if (f.badge) {
      const opt = f.options?.find(o => String(o.value) === String(val));
      const isYes = String(val) === '1' || val === true;
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: isYes
            ? 'color-mix(in srgb, var(--em) 12%, transparent)'
            : 'color-mix(in srgb, var(--t4) 10%, transparent)',
          color: isYes ? 'var(--em)' : 'var(--t4)',
        }}>
          {opt?.label ?? (isYes ? 'نعم' : 'لا')}
        </span>
      );
    }

    if (val === null || val === undefined || val === '') {
      return <span style={{ color: 'var(--t4)' }}>—</span>;
    }
    return val;
  }

  return (
    <div className="page on" style={{ padding: '18px 20px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 20px', borderRadius: 'var(--r2)',
          background: toast.type === 'success' ? 'var(--em)' : 'var(--red)',
          color: '#fff', fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 20px rgba(0,0,0,.25)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className={`ti ${toast.type === 'success' ? 'ti-check' : 'ti-x'}`} />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, fontSize: 18,
          }}>
            <i className={`ti ${icon}`} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--t4)' }}>
              {loading ? 'جارٍ التحميل...' : `${items.length} عنصر`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="srch" style={{ width: 200 }}>
            <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
            <input
              type="text" placeholder="بحث..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn" onClick={refetch} title="تحديث">
            <i className="ti ti-refresh" />
          </button>
          <button className="btn btn-p" onClick={openAdd}>
            <i className="ti ti-plus" />
            إضافة {resource}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 16, borderRadius: 'var(--r2)',
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

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
            <table>
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  {tableFields.map(f => <th key={f.key}>{f.label}</th>)}
                  <th style={{ width: 100, textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--t4)', fontSize: 11 }}>{idx + 1}</td>
                    {tableFields.map(f => (
                      <td key={f.key}>{renderCellValue(f, item)}</td>
                    ))}
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="btn btn-xs" onClick={() => openEdit(item)} title="تعديل">
                          <i className="ti ti-pencil" />
                        </button>
                        <button className="btn btn-xs btn-r" onClick={() => setDelItem(item)} title="حذف">
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div style={{ padding: '9px 16px', borderTop: '1px solid var(--b1)' }}>
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>
              {search ? `${filtered.length} نتيجة من ${items.length}` : `${items.length} عنصر`}
            </span>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? `إضافة ${resource} جديد` : `تعديل ${resource}`}
          onClose={() => setModal(null)}
          saving={saving}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--t2)',
                  display: 'block', marginBottom: 5,
                }}>
                  {f.label}
                  {f.required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
                </label>
                <FormField
                  field={f}
                  value={formData[f.key]}
                  onChange={v => setFormData(d => ({ ...d, [f.key]: v }))}
                  formData={formData}
                />
              </div>
            ))}

            {formErr && (
              <div style={{
                padding: '8px 12px', borderRadius: 'var(--r2)',
                background: 'var(--redb)', color: 'var(--red)',
                fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ti ti-alert-circle" />
                {formErr}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button className="btn" onClick={() => setModal(null)} disabled={saving}>إلغاء</button>
              <button className="btn btn-p" onClick={handleSubmit} disabled={saving}>
                {saving
                  ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
                  : <i className={`ti ${modal === 'add' ? 'ti-plus' : 'ti-check'}`} />}
                {modal === 'add' ? 'إضافة' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </Modal>
      )}

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
