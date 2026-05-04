// ════════════════════════════════════════════════════════════
// components/modals/CompanyFormDrawer.tsx
// Drawer لإنشاء / تعديل الشركة — يستخدم المكونات الموجودة
// ════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────
export interface CompanyFormData {
  id?: number;
  name: string;
  commercial_name: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  activity: string;
  nif: string;
  nis: string;
  rc: string;
  ai: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  max_users: number;
  max_products: number;
  max_warehouses: number;
  notes: string;
  is_active: boolean;
  slug?: string;
}

interface CompanyFormDrawerProps {
  open: boolean;
  company?: CompanyFormData | null;  // null = إنشاء جديد
  isSuperAdmin?: boolean;
  onClose: () => void;
  onSuccess?: (company: CompanyFormData) => void;
}

const PLANS = [
  { value: 'free',         label: 'مجاني',        users: 3,   products: 500,    warehouses: 1 },
  { value: 'starter',      label: 'Starter',      users: 10,  products: 2000,   warehouses: 2 },
  { value: 'professional', label: 'Professional', users: 25,  products: 10000,  warehouses: 5 },
  { value: 'enterprise',   label: 'Enterprise',   users: 999, products: 999999, warehouses: 99 },
] as const;

const EMPTY: CompanyFormData = {
  name: '', commercial_name: '', email: '', phone: '', mobile: '',
  address: '', activity: '', nif: '', nis: '', rc: '', ai: '',
  plan: 'free', max_users: 3, max_products: 500, max_warehouses: 1,
  notes: '', is_active: true,
};

// ── Helper components ──────────────────────────────────────

function Field({
  label, children, required,
}: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{
        fontSize: 11, fontWeight: 700, color: 'var(--t4)',
        textTransform: 'uppercase', letterSpacing: 0.8,
        display: 'flex', alignItems: 'center', gap: 3,
      }}>
        {label}
        {required && <span style={{ color: 'var(--red)', fontSize: 13 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: '1px solid var(--b3)', background: 'var(--bg3)',
  color: 'var(--t1)', fontFamily: 'Tajawal, sans-serif', fontSize: 13,
  outline: 'none', transition: '.14s',
};

function SectionDivider({ label, icon }: { label: string; icon: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 10, fontWeight: 800, color: 'var(--t4)',
      textTransform: 'uppercase', letterSpacing: 1,
      borderBottom: '1px solid var(--b1)', paddingBottom: 8,
      marginTop: 4,
    }}>
      <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 13 }} />
      {label}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function CompanyFormDrawer({
  open, company, isSuperAdmin = false, onClose, onSuccess,
}: CompanyFormDrawerProps) {
  const isEdit = !!company?.id;
  const qc = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CompanyFormData>(EMPTY);
  const [showDocs, setShowDocs] = useState(false);
  const [error, setError] = useState('');

  // ── تعبئة الفورم عند الفتح
  useEffect(() => {
    if (!open) return;
    setError('');
    setShowDocs(false);
    setForm(company ? { ...EMPTY, ...company } : EMPTY);
    setTimeout(() => nameRef.current?.focus(), 100);
  }, [open, company]);

  // ── ESC للإغلاق
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const f = <K extends keyof CompanyFormData>(k: K) =>
    (v: CompanyFormData[K]) => setForm(prev => ({ ...prev, [k]: v }));

  // ── تحديث الحدود تلقائياً عند تغيير الخطة (إذا لم تكن مخصصة)
  const handlePlanChange = (plan: CompanyFormData['plan']) => {
    const p = PLANS.find(x => x.value === plan);
    if (!p) return;
    setForm(prev => ({
      ...prev, plan,
      max_users: p.users,
      max_products: p.products,
      max_warehouses: p.warehouses,
    }));
  };

  // ── Mutation
  const mutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const payload: Record<string, unknown> = {
        name:            data.name,
        commercial_name: data.commercial_name || undefined,
        email:           data.email           || undefined,
        phone:           data.phone           || undefined,
        address:         data.address         || undefined,
        activity:        data.activity        || undefined,
        nif:             data.nif             || undefined,
        nis:             data.nis             || undefined,
        rc:              data.rc              || undefined,
        ai:              data.ai              || undefined,
        is_active:       data.is_active,
      };

      // حقول Super Admin فقط
      if (isSuperAdmin) {
        payload.plan           = data.plan;
        payload.max_users      = data.max_users;
        payload.max_products   = data.max_products;
        payload.max_warehouses = data.max_warehouses;
        payload.notes          = data.notes || undefined;
      }

      if (isEdit && company?.slug) {
        const res = await apiClient.put(`/companies/${company.slug}`, payload);
        return res.data?.data ?? res.data;
      } else {
        const res = await apiClient.post('/companies', payload);
        return res.data?.data ?? res.data;
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      onSuccess?.(data);
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message
        ?? e?.response?.data?.errors
          ? Object.values(e.response.data.errors).flat().join(' — ')
          : 'حدث خطأ غير متوقع';
      setError(typeof msg === 'string' ? msg : 'حدث خطأ غير متوقع');
    },
  });

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(5px)',
          animation: 'ovIn .18s ease',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 10002, width: '100%', maxWidth: 500,
        background: 'var(--bg2)', borderRight: '1px solid var(--b2)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 32px rgba(0,0,0,.25)',
        animation: 'drawerIn .25s cubic-bezier(.34,1.4,.64,1)',
        direction: 'rtl',
      }}>

        {/* ── Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--b2)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          background: 'var(--bg2)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'var(--emb)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'var(--em)', flexShrink: 0,
          }}>
            <i className={`ti ti-${isEdit ? 'building-community' : 'building-plus'}`} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>
              {isEdit ? `تعديل: ${company?.name}` : 'شركة جديدة'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
              {isEdit ? 'تحديث بيانات الشركة' : 'إضافة شركة إلى النظام'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid var(--b2)', background: 'var(--bg3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--t3)', fontSize: 14,
              flexShrink: 0, transition: '.14s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--redb)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--t3)';
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* ── Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Error */}
          {error && (
            <div style={{
              padding: '9px 14px', borderRadius: 10,
              background: 'var(--redb)', border: '1px solid var(--redbo)',
              color: 'var(--red)', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* ── المعلومات الأساسية */}
          <SectionDivider label="المعلومات الأساسية" icon="ti-building" />

          <Field label="اسم الشركة" required>
            <input
              ref={nameRef}
              value={form.name}
              onChange={e => { f('name')(e.target.value); setError(''); }}
              style={inp}
              placeholder="شركة الأمل للتجارة"
              onFocus={e => (e.target.style.borderColor = 'var(--em)')}
              onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="الاسم التجاري">
              <input value={form.commercial_name} onChange={e => f('commercial_name')(e.target.value)}
                style={inp} placeholder="الاسم التجاري"
                onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
            </Field>
            <Field label="قطاع النشاط">
              <input value={form.activity} onChange={e => f('activity')(e.target.value)}
                style={inp} placeholder="تجارة — خدمات..."
                onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
            </Field>
          </div>

          {/* ── التواصل */}
          <SectionDivider label="معلومات التواصل" icon="ti-phone" />

          <Field label="البريد الإلكتروني">
            <input type="email" value={form.email} onChange={e => f('email')(e.target.value)}
              style={{ ...inp, direction: 'ltr' }} placeholder="contact@company.dz"
              onFocus={e => (e.target.style.borderColor = 'var(--em)')}
              onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="الهاتف">
              <input value={form.phone} onChange={e => f('phone')(e.target.value)}
                style={{ ...inp, direction: 'ltr' }} placeholder="023 xx xx xx"
                onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
            </Field>
            <Field label="الجوال">
              <input value={form.mobile} onChange={e => f('mobile')(e.target.value)}
                style={{ ...inp, direction: 'ltr' }} placeholder="06 xx xx xx xx"
                onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
            </Field>
          </div>

          <Field label="العنوان">
            <input value={form.address} onChange={e => f('address')(e.target.value)}
              style={inp} placeholder="الشارع، البلدية، الولاية"
              onFocus={e => (e.target.style.borderColor = 'var(--em)')}
              onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
          </Field>

          {/* ── الوثائق القانونية */}
          <button
            onClick={() => setShowDocs(v => !v)}
            style={{
              padding: '9px 14px', borderRadius: 10, width: '100%',
              border: '1px dashed var(--b3)', background: 'transparent',
              color: 'var(--t4)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: '.13s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--t2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--t4)'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="ti ti-file-certificate" style={{ fontSize: 13 }} />
              الوثائق القانونية والجبائية
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: 'var(--bg4)', color: 'var(--t4)' }}>اختياري</span>
            </span>
            <i className={`ti ti-chevron-${showDocs ? 'up' : 'down'}`} style={{ fontSize: 12 }} />
          </button>

          {showDocs && (
            <div style={{
              background: 'var(--bg3)', borderRadius: 12,
              border: '1px solid var(--b1)', padding: '14px 14px 4px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="رقم NIF">
                  <input value={form.nif} onChange={e => f('nif')(e.target.value)}
                    style={{ ...inp, direction: 'ltr' }} placeholder="رقم التعريف الجبائي"
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </Field>
                <Field label="رقم NIS">
                  <input value={form.nis} onChange={e => f('nis')(e.target.value)}
                    style={{ ...inp, direction: 'ltr' }} placeholder="رقم إحصائي"
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </Field>
                <Field label="رقم RC">
                  <input value={form.rc} onChange={e => f('rc')(e.target.value)}
                    style={{ ...inp, direction: 'ltr' }} placeholder="السجل التجاري"
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </Field>
                <Field label="رقم AI">
                  <input value={form.ai} onChange={e => f('ai')(e.target.value)}
                    style={{ ...inp, direction: 'ltr' }} placeholder="المادة الجبائية"
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </Field>
              </div>
            </div>
          )}

          {/* ── إعدادات Super Admin */}
          {isSuperAdmin && (
            <>
              <SectionDivider label="إعدادات Super Admin" icon="ti-star" />

              {/* حالة الشركة */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10,
                background: 'var(--bg3)', border: '1px solid var(--b1)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <i className="ti ti-toggle-right" style={{ color: 'var(--em)', fontSize: 14 }} />
                  حالة الشركة
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: form.is_active ? 'var(--em)' : 'var(--red)',
                  }}>
                    {form.is_active ? 'نشطة' : 'موقوفة'}
                  </span>
                  <div
                    className={`sw ${form.is_active ? 'on' : ''}`}
                    onClick={() => f('is_active')(!form.is_active)}
                  />
                </div>
              </div>

              {/* الخطة */}
              <Field label="خطة الاشتراك">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {PLANS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => handlePlanChange(p.value as CompanyFormData['plan'])}
                      style={{
                        padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        border: `1.5px solid ${form.plan === p.value ? 'var(--em)' : 'var(--b2)'}`,
                        background: form.plan === p.value ? 'var(--emb)' : 'var(--bg3)',
                        color: form.plan === p.value ? 'var(--em)' : 'var(--t3)',
                        cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', transition: '.13s',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* الحدود */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <Field label="حد المستخدمين">
                  <input type="number" min={1} value={form.max_users}
                    onChange={e => f('max_users')(Number(e.target.value))}
                    style={{ ...inp, direction: 'ltr', textAlign: 'center' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </Field>
                <Field label="حد المنتجات">
                  <input type="number" min={1} value={form.max_products}
                    onChange={e => f('max_products')(Number(e.target.value))}
                    style={{ ...inp, direction: 'ltr', textAlign: 'center' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </Field>
                <Field label="حد المستودعات">
                  <input type="number" min={1} value={form.max_warehouses}
                    onChange={e => f('max_warehouses')(Number(e.target.value))}
                    style={{ ...inp, direction: 'ltr', textAlign: 'center' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </Field>
              </div>

              {/* ملاحظات داخلية */}
              <Field label="ملاحظات داخلية (مرئية لك فقط)">
                <textarea
                  value={form.notes}
                  onChange={e => f('notes')(e.target.value)}
                  rows={2}
                  style={{ ...inp, resize: 'vertical', minHeight: 60 }}
                  placeholder="ملاحظات خاصة بهذه الشركة..."
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
                />
              </Field>
            </>
          )}
        </div>

        {/* ── Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--b2)',
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--bg3)', borderRadius: '0 0 0 0', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: '1px solid var(--b3)', background: 'var(--bg2)',
              color: 'var(--t2)', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              if (!form.name.trim()) { setError('اسم الشركة إلزامي'); return; }
              mutation.mutate(form);
            }}
            disabled={mutation.isPending || !form.name.trim()}
            style={{
              flex: 1, padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800,
              border: 'none', background: form.name.trim() ? 'var(--em)' : 'var(--b3)',
              color: form.name.trim() ? '#fff' : 'var(--t4)',
              cursor: mutation.isPending || !form.name.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'Tajawal, sans-serif', boxShadow: form.name.trim() ? 'var(--emglow)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all .14s',
            }}
          >
            {mutation.isPending ? (
              <><i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite' }} />جارٍ الحفظ...</>
            ) : (
              <><i className={`ti ti-${isEdit ? 'device-floppy' : 'building-plus'}`} />{isEdit ? 'حفظ التغييرات' : 'إنشاء الشركة'}</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ovIn    { from{opacity:0} to{opacity:1} }
        @keyframes drawerIn { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}
