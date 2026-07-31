// resources/js/components/company/CompanyFormDrawer.tsx
// ════════════════════════════════════════════════
// مودال إضافة / تعديل شركة — يدعم slug أو id
// ════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/AuthContext';
import { apiPut, apiPatch, apiPost } from '@/lib/api/core/client';

// ── Types ──────────────────────────────────────
interface Company {
  id: number;
  name: string;
  commercial_name?: string;
  slug: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  activity?: string;
  legal_form_id?: number;
  wilaya_id?: number;
  commune_id?: number;
  active?: boolean;
  plan?: string;
  notes?: string;
}

interface Props {
  open: boolean;
  company?: Company | null;   // null = إنشاء جديد
  onClose: () => void;
  onSaved?: (company: Company) => void;
}

// ── Helper ─────────────────────────────────────
// استخراج رسالة الخطأ بأمان من أي شكل
function extractErrorMessage(error: unknown, fallback = 'حدث خطأ'): string {
  if (!error) return fallback;
  const e = error as any;

  // أخطاء validation من Laravel { errors: { field: [msgs] } }
  const errs = e?.response?.data?.errors;
  if (errs && typeof errs === 'object') {
    const msgs = Object.values(errs).flat() as string[];
    if (msgs.length > 0) return msgs.join(' — ');
  }

  // رسالة عادية
  const msg = e?.response?.data?.message ?? e?.message;
  if (msg && typeof msg === 'string') return msg;

  return fallback;
}

// ── Form Fields ────────────────────────────────
const inputCls: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: '1px solid var(--b3)', background: 'var(--bg3)',
  color: 'var(--t1)', fontFamily: 'Tajawal,sans-serif',
  fontSize: 13, outline: 'none', transition: 'border-color .14s',
};

function Field({ label, children, req }: { label: string; children: React.ReactNode; req?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8 }}>
        {label}{req && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', dir }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: 'ltr' | 'rtl';
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputCls, direction: dir }}
      onFocus={e => (e.target.style.borderColor = 'var(--em)')}
      onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
    />
  );
}

// ── Main Component ─────────────────────────────
export default function CompanyFormDrawer({ open, company, onClose, onSaved }: Props) {
  const isEdit = !!company;
  const qc = useQueryClient();
  const { user } = useAuth() as any;
  const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'super-admin') ?? false;

  const nameRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'basic' | 'legal' | 'admin'>('basic');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', commercial_name: '', email: '', phone: '', mobile: '',
    address: '', nif: '', nis: '', rc: '', ai: '', activity: '',
    legal_form_id: '', wilaya_id: '', commune_id: '',
    active: true, plan: 'free',
    max_users: '', max_warehouses: '', max_products: '',
    notes: '',
  });

  // ── تهيئة الفورم عند الفتح ──────────────────
  useEffect(() => {
    if (!open) return;
    setError('');
    setTab('basic');

    if (company) {
      setForm({
        name:             company.name             ?? '',
        commercial_name:  company.commercial_name  ?? '',
        email:            company.email            ?? '',
        phone:            company.phone            ?? '',
        mobile:           company.mobile           ?? '',
        address:          company.address          ?? '',
        nif:              company.nif              ?? '',
        nis:              company.nis              ?? '',
        rc:               company.rc               ?? '',
        ai:               company.ai               ?? '',
        activity:         company.activity         ?? '',
        legal_form_id:    String(company.legal_form_id ?? ''),
        wilaya_id:        String(company.wilaya_id     ?? ''),
        commune_id:       String(company.commune_id    ?? ''),
        active:        company.active        ?? true,
        plan:             company.plan             ?? 'free',
        max_users:        '',
        max_warehouses:   '',
        max_products:     '',
        notes:            company.notes            ?? '',
      });
    } else {
      setForm({
        name: '', commercial_name: '', email: '', phone: '', mobile: '',
        address: '', nif: '', nis: '', rc: '', ai: '', activity: '',
        legal_form_id: '', wilaya_id: '', commune_id: '',
        active: true, plan: 'free',
        max_users: '', max_warehouses: '', max_products: '',
        notes: '',
      });
    }
    setTimeout(() => nameRef.current?.focus(), 80);
  }, [open, company]);

  // ── Mutation ─────────────────────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      // ① فصل حقول Super Admin عن الحقول الأساسية
      const ADMIN_FIELDS = ['plan', 'max_users', 'max_warehouses', 'max_products', 'notes'];
      const basicPayload: Record<string, any> = {};
      const adminPayload: Record<string, any> = {};

      Object.entries(form).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) return;
        if (ADMIN_FIELDS.includes(k)) adminPayload[k] = v;
        else basicPayload[k] = v;
      });

      ['legal_form_id', 'wilaya_id', 'commune_id'].forEach(k => {
        if (basicPayload[k]) basicPayload[k] = Number(basicPayload[k]);
      });
      ['max_users', 'max_warehouses', 'max_products'].forEach(k => {
        if (adminPayload[k]) adminPayload[k] = Number(adminPayload[k]);
      });

      if (isEdit) {
        const identifier = company!.slug ?? company!.id;

        // ② تحديث البيانات الأساسية
        const saved = await apiPut<Company>(`/companies/${identifier}`, basicPayload);

        // ③ تحديث الخطة — endpoint منفصل لأن PUT لا يحفظها
        if (isSuperAdmin) {
          const planChanged = form.plan !== (company!.plan ?? 'free');
          const limitsExist = adminPayload.max_users || adminPayload.max_warehouses || adminPayload.max_products;

          if (planChanged || limitsExist) {
            await apiPatch(`/companies/${identifier}/plan`, {
              plan:           adminPayload.plan ?? form.plan,
              max_users:      adminPayload.max_users      || undefined,
              max_warehouses: adminPayload.max_warehouses || undefined,
              max_products:   adminPayload.max_products   || undefined,
            });
          }

          // ④ الملاحظات الداخلية
          if (adminPayload.notes !== undefined) {
            await apiPatch(`/companies/${identifier}/notes`, {
              notes: adminPayload.notes,
            });
          }
        }

        return saved;
      } else {
        // إنشاء جديد — نجمع كل الحقول
        return await apiPost<Company>('/companies', { ...basicPayload, ...adminPayload });
      }
    },
    onSuccess: (saved: Company) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (e: unknown) => {
      setError(extractErrorMessage(e, isEdit ? 'فشل تحديث الشركة' : 'فشل إنشاء الشركة'));
    },
  });

  // ── Keyboard close ────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && !mutation.isPending && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mutation.isPending, onClose]);

  if (!open) return null;

  const f = <K extends keyof typeof form>(k: K) =>
    (v: (typeof form)[K]) => setForm(p => ({ ...p, [k]: v }));

  const tabs = [
    { key: 'basic', label: 'المعلومات الأساسية', icon: 'ti-building' },
    { key: 'legal', label: 'الوثائق القانونية',  icon: 'ti-file-certificate' },
    ...(isSuperAdmin ? [{ key: 'admin', label: 'إدارة (Super Admin)', icon: 'ti-shield' }] : []),
  ] as const;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, animation: 'ovFade .18s ease',
        }}
        onClick={e => { if (e.target === e.currentTarget && !mutation.isPending) onClose(); }}
      >
        <div style={{
          background: 'var(--bg2)', borderRadius: 20, width: '100%', maxWidth: 640,
          border: '1px solid var(--b3)', boxShadow: '0 24px 64px rgba(0,0,0,.3)',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          animation: 'drawerIn .22s cubic-bezier(.34,1.4,.64,1)',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--b2)',
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'var(--emb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'var(--em)',
            }}>
              <i className={`ti ${isEdit ? 'ti-building-cog' : 'ti-building-plus'}`} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>
                {isEdit ? `تعديل: ${company!.name}` : 'شركة جديدة'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                {isEdit ? `slug: ${company!.slug}` : 'ملء البيانات الأساسية للبدء'}
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              style={{
                width: 30, height: 30, borderRadius: 8, border: '1px solid var(--b2)',
                background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--t3)',
                fontSize: 14, transition: '.13s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--redb)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--t3)'; }}
            >
              <i className="ti ti-x" />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', padding: '0 20px', flexShrink: 0 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)} style={{
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.key ? 'var(--em)' : 'transparent'}`,
                color: tab === t.key ? 'var(--em)' : 'var(--t4)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'Tajawal,sans-serif', transition: '.13s', whiteSpace: 'nowrap',
              }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />{t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                background: 'var(--redb)', border: '1px solid var(--redbo)',
                color: 'var(--red)', fontSize: 12,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <i className="ti ti-alert-circle" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
                <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginRight: 'auto', fontSize: 15, padding: 0 }}>×</button>
              </div>
            )}

            {/* ── TAB: المعلومات الأساسية ── */}
            {tab === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="اسم الشركة" req>
                    <input
                      ref={nameRef} value={form.name}
                      onChange={e => f('name')(e.target.value)}
                      placeholder="مثال: شركة الأمل للتجارة"
                      style={inputCls}
                      onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
                    />
                  </Field>
                  <Field label="الاسم التجاري">
                    <Input value={form.commercial_name} onChange={f('commercial_name')} placeholder="Amel Trade" />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="البريد الإلكتروني">
                    <Input type="email" value={form.email} onChange={f('email')} placeholder="info@company.dz" dir="ltr" />
                  </Field>
                  <Field label="رقم الهاتف">
                    <Input value={form.phone} onChange={f('phone')} placeholder="023 000 000" dir="ltr" />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="الموبايل">
                    <Input value={form.mobile} onChange={f('mobile')} placeholder="0550 000 000" dir="ltr" />
                  </Field>
                  <Field label="النشاط التجاري">
                    <Input value={form.activity} onChange={f('activity')} placeholder="تجارة الجملة، صناعة..." />
                  </Field>
                </div>

                <Field label="العنوان">
                  <textarea
                    value={form.address}
                    onChange={e => f('address')(e.target.value)}
                    placeholder="الشارع، الحي، الولاية..."
                    rows={2}
                    style={{ ...inputCls, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
                  />
                </Field>

                {/* حالة الشركة */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--b1)',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)', flex: 1 }}>حالة الشركة</span>
                  <div
                    className={`sw ${form.active ? 'on' : ''}`}
                    onClick={() => f('active')(!form.active)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{
                    fontSize: 12, fontWeight: 700, minWidth: 50,
                    color: form.active ? 'var(--em)' : 'var(--red)',
                  }}>
                    {form.active ? 'نشطة' : 'موقوفة'}
                  </span>
                </div>
              </div>
            )}

            {/* ── TAB: الوثائق القانونية ── */}
            {tab === 'legal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--blueb)', border: '1px solid var(--bluebo)',
                  color: 'var(--blue)', fontSize: 12, display: 'flex', gap: 8,
                }}>
                  <i className="ti ti-info-circle" style={{ flexShrink: 0 }} />
                  أدخل الأرقام الضريبية والتجارية الخاصة بالشركة (اختياري)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="NIF — رقم التعريف الجبائي">
                    <Input value={form.nif} onChange={f('nif')} placeholder="000000000000000" dir="ltr" />
                  </Field>
                  <Field label="NIS — رقم الإحصاء">
                    <Input value={form.nis} onChange={f('nis')} placeholder="000000000000000" dir="ltr" />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="RC — السجل التجاري">
                    <Input value={form.rc} onChange={f('rc')} placeholder="00/00-000000B00" dir="ltr" />
                  </Field>
                  <Field label="AI — مقالة الضريبة">
                    <Input value={form.ai} onChange={f('ai')} placeholder="00000000000" dir="ltr" />
                  </Field>
                </div>

                <Field label="الشكل القانوني">
                  <select value={form.legal_form_id} onChange={e => f('legal_form_id')(e.target.value)}
                    style={{ ...inputCls, cursor: 'pointer' }}>
                    <option value="">اختر الشكل القانوني</option>
                    <option value="1">مؤسسة فردية</option>
                    <option value="2">SARL</option>
                    <option value="3">SPA</option>
                    <option value="4">SNC</option>
                    <option value="5">EURL</option>
                  </select>
                </Field>
              </div>
            )}

            {/* ── TAB: Super Admin ── */}
            {tab === 'admin' && isSuperAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--purb)', border: '1px solid var(--purbo)',
                  color: 'var(--purple)', fontSize: 12, display: 'flex', gap: 8,
                }}>
                  <i className="ti ti-shield-check" style={{ flexShrink: 0 }} />
                  هذه الإعدادات مرئية للـ Super Admin فقط
                </div>

                <Field label="خطة الاشتراك">
                  <select value={form.plan} onChange={e => f('plan')(e.target.value)}
                    style={{ ...inputCls, cursor: 'pointer' }}>
                    <option value="free">مجاني</option>
                    <option value="starter">مبتدئ</option>
                    <option value="professional">احترافي</option>
                    <option value="enterprise">مؤسسي</option>
                  </select>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  <Field label="حد المستخدمين">
                    <Input value={form.max_users} onChange={f('max_users')} placeholder="3" dir="ltr" />
                  </Field>
                  <Field label="حد المستودعات">
                    <Input value={form.max_warehouses} onChange={f('max_warehouses')} placeholder="1" dir="ltr" />
                  </Field>
                  <Field label="حد المنتجات">
                    <Input value={form.max_products} onChange={f('max_products')} placeholder="500" dir="ltr" />
                  </Field>
                </div>

                <Field label="ملاحظات (داخلية)">
                  <textarea
                    value={form.notes}
                    onChange={e => f('notes')(e.target.value)}
                    placeholder="ملاحظات للإدارة..."
                    rows={3}
                    style={{ ...inputCls, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--b2)', flexShrink: 0,
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            background: 'var(--bg3)', borderRadius: '0 0 20px 20px',
          }}>
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              style={{
                padding: '9px 20px', borderRadius: 10, border: '1px solid var(--b3)',
                background: 'var(--bg4)', color: 'var(--t2)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
              }}
            >
              إلغاء
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.name.trim()}
              style={{
                padding: '9px 22px', borderRadius: 10, border: 'none',
                background: form.name.trim() ? 'var(--em)' : 'var(--bg4)',
                color: form.name.trim() ? '#fff' : 'var(--t4)',
                fontSize: 13, fontWeight: 800, cursor: mutation.isPending || !form.name.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'Tajawal,sans-serif', boxShadow: form.name.trim() ? 'var(--emglow)' : 'none',
                display: 'flex', alignItems: 'center', gap: 7, transition: '.13s',
              }}
            >
              {mutation.isPending && (
                <i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite' }} />
              )}
              {mutation.isPending
                ? (isEdit ? 'جارٍ الحفظ...' : 'جارٍ الإنشاء...')
                : (isEdit ? 'حفظ التغييرات' : 'إنشاء الشركة')
              }
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
