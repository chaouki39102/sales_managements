// ════════════════════════════════════════════════════════════
// pages/admin/CompaniesPage.tsx — إدارة الشركات (Super Admin)
// ════════════════════════════════════════════════════════════
import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import { useAuth } from '@/context/AuthContext';

import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import PageHeader   from '@/components/ui/PageHeader';
import AlertBar     from '@/components/ui/AlertBar';
import EmptyState   from '@/components/ui/EmptyState';
import KpiCard      from '@/components/ui/KpiCard';
import SearchInput  from '@/components/ui/SearchInput';
import Switch       from '@/components/ui/Switch';

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════
interface Company {
  id: number;
  name: string;
  commercial_name?: string;
  slug: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  activity?: string;
  nif?: string; nis?: string; rc?: string; ai?: string;
  active: boolean;
  is_suspended: boolean;
  is_operational: boolean;
  is_verified: boolean;
  is_on_trial: boolean;
  trial_days_remaining?: number | null;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  max_users: number;
  max_products: number;
  max_warehouses: number;
  notes?: string;
  owner?: { id: number; name: string };
  owner_id?: number;
  created_at?: string;
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'deactivated' | 'trial' | 'verified';
type Tab = 'companies' | 'super';

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════
const AV_COLORS = [
  'linear-gradient(135deg,#0a8a5c,#0dbf84)',
  'linear-gradient(135deg,#1a4fd6,#60a5fa)',
  'linear-gradient(135deg,#6920d4,#a78bfa)',
  'linear-gradient(135deg,#b87d0a,#fbbf24)',
  'linear-gradient(135deg,#0d7a8c,#22d3ee)',
  'linear-gradient(135deg,#c43a0a,#fb923c)',
];
const avColor  = (id: number) => AV_COLORS[id % AV_COLORS.length];
const initials = (name: string) =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

const PLAN_META: Record<string, { label: string; color: string; bg: string }> = {
  free:         { label: 'مجاني',       color: 'var(--t4)',    bg: 'var(--bg4)' },
  starter:      { label: 'Starter',     color: 'var(--blue)',  bg: 'var(--blueb)' },
  professional: { label: 'Pro',         color: 'var(--em)',    bg: 'var(--emb)' },
  enterprise:   { label: 'Enterprise',  color: 'var(--gold)',  bg: 'var(--goldb)' },
};

const PLANS = ['free', 'starter', 'professional', 'enterprise'] as const;

function statusInfo(co: Company) {
  if (co.is_suspended)  return { label: 'معلّقة',   color: 'var(--red)',   bg: 'var(--redb)',  icon: 'ti-lock' };
  if (!co.active)    return { label: 'موقوفة',   color: 'var(--t4)',    bg: 'var(--bg4)',   icon: 'ti-minus-circle' };
  if (co.is_on_trial)   return { label: `تجريبية · ${co.trial_days_remaining ?? '?'} يوم`, color: 'var(--gold)', bg: 'var(--goldb)', icon: 'ti-clock' };
  if (co.is_verified)   return { label: 'موثّقة',   color: 'var(--em)',    bg: 'var(--emb)',   icon: 'ti-rosette-discount-check' };
  return                       { label: 'نشطة',     color: 'var(--blue)',  bg: 'var(--blueb)', icon: 'ti-circle-check' };
}

// ════════════════════════════════════════════════════════════
// Style helpers
// ════════════════════════════════════════════════════════════
const actionBtn = (): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: 'var(--t3)',
  transition: '.13s', flexShrink: 0,
});
const hoverBtn = (e: React.MouseEvent, bg: string, color: string) => {
  const el = e.currentTarget as HTMLButtonElement;
  el.style.background = bg;
  el.style.color = color;
  el.style.borderColor = color + '44';
};
const inp: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 9,
  border: '1px solid var(--b3)', background: 'var(--bg3)',
  color: 'var(--t1)', fontFamily: 'Tajawal, sans-serif',
  fontSize: 13, outline: 'none',
};

// ════════════════════════════════════════════════════════════
// CompanyAvatar
// ════════════════════════════════════════════════════════════
function CompanyAvatar({ name, id, size = 42 }: { name: string; id: number; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      flexShrink: 0, background: avColor(id),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 900, color: '#fff', letterSpacing: -1,
    }}>
      {initials(name)}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// EditCompanyDrawer — درج تعديل الشركة
// ════════════════════════════════════════════════════════════
function EditCompanyDrawer({
  company, onClose, onSaved,
}: {
  company: Company;
  onClose: () => void;
  onSaved: (updated: Partial<Company>) => void;
}) {
  const [tab, setTab]     = useState<'basic' | 'legal' | 'admin' | 'danger'>('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [toast, setToast]   = useState('');

  const [form, setForm] = useState({
    name:            company.name            ?? '',
    commercial_name: company.commercial_name ?? '',
    email:           company.email           ?? '',
    phone:           company.phone           ?? '',
    mobile:          company.mobile          ?? '',
    activity:        company.activity        ?? '',
    address:         company.address         ?? '',
    nif:             company.nif             ?? '',
    nis:             company.nis             ?? '',
    rc:              company.rc              ?? '',
    ai:              company.ai              ?? '',
    plan:            company.plan            ?? 'free',
    max_users:       company.max_users       ?? 3,
    max_products:    company.max_products    ?? 500,
    max_warehouses:  company.max_warehouses  ?? 1,
    notes:           company.notes           ?? '',
    active:       company.active       ?? true,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200); };
  const f = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true); setError('');
    try {
      const { plan, max_users, max_products, max_warehouses, notes, active, ...basic } = form;

      // ① البيانات الأساسية
      await apiClient.put(`/companies/${company.slug}`, { ...basic, active });

      // ② الخطة — إن تغيّرت
      if (
        plan !== company.plan ||
        max_users !== company.max_users ||
        max_products !== company.max_products ||
        max_warehouses !== company.max_warehouses
      ) {
        await apiClient.patch(`/companies/${company.slug}/plan`, {
          plan, max_users, max_products, max_warehouses,
        });
      }

      // ③ الملاحظات الداخلية
      if (notes !== (company.notes ?? '')) {
        await apiClient.patch(`/admin/companies/${company.id}/notes`, { notes });
      }

      onSaved({ ...form });
      showToast('✅ تم الحفظ بنجاح');
      setTimeout(onClose, 600);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    const isSusp = company.is_suspended;
    try {
      if (isSusp) {
        await apiClient.post(`/companies/${company.slug}/unsuspend`);
      } else {
        const reason = prompt('سبب التعليق:') ?? 'قرار إداري';
        await apiClient.post(`/companies/${company.slug}/suspend`, { reason });
      }
      onSaved({ is_suspended: !isSusp });
      showToast(isSusp ? 'تم رفع التعليق' : 'تم تعليق الشركة');
    } catch { setError('فشلت العملية'); }
  };

  const handleVerify = async () => {
    try {
      if (company.is_verified) {
        await apiClient.post(`/companies/${company.slug}/unverify`);
        onSaved({ is_verified: false });
        showToast('تم إلغاء التوثيق');
      } else {
        await apiClient.post(`/companies/${company.slug}/verify`);
        onSaved({ is_verified: true });
        showToast('✅ تم توثيق الشركة');
      }
    } catch { setError('فشلت العملية'); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const TABS = [
    { key: 'basic',  label: 'أساسي',   icon: 'ti-building' },
    { key: 'legal',  label: 'قانوني',  icon: 'ti-file-certificate' },
    { key: 'admin',  label: 'الخطة',   icon: 'ti-star' },
    { key: 'danger', label: 'إجراءات', icon: 'ti-shield' },
  ] as const;

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 9001,
        width: 420, background: 'var(--bg2)',
        boxShadow: '4px 0 40px rgba(0,0,0,.3)',
        display: 'flex', flexDirection: 'column', direction: 'rtl',
        animation: 'slideFromRight .22s cubic-bezier(.34,1.2,.64,1)',
      }}>
        <style>{`@keyframes slideFromRight { from{transform:translateX(-30px);opacity:0} to{transform:none;opacity:1} }`}</style>

        {/* Header */}
        <div style={{
          padding: '16px 18px', borderBottom: '1px solid var(--b2)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          background: 'var(--bg3)',
        }}>
          <CompanyAvatar name={company.name} id={company.id} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {company.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>{company.slug}</div>
          </div>
          <button onClick={onClose} style={{ ...actionBtn(), width: 32, height: 32 }}>
            <i className="ti ti-x" style={{ fontSize: 15 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', padding: '0 4px', flexShrink: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 14px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? 'var(--em)' : 'transparent'}`,
              color: tab === t.key ? 'var(--em)' : 'var(--t4)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 5,
              transition: '.12s', whiteSpace: 'nowrap',
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 0' }}>

          {error && (
            <div style={{ padding: '10px 13px', borderRadius: 10, background: 'var(--redb)', color: 'var(--red)', fontSize: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-alert-circle" style={{ flexShrink: 0 }} />
              {error}
              <button onClick={() => setError('')} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14 }}>×</button>
            </div>
          )}

          {/* ── أساسي ── */}
          {tab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <DF label="الاسم الرسمي" req>
                <input value={form.name} onChange={e => f('name')(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
              <DF label="الاسم التجاري">
                <input value={form.commercial_name} onChange={e => f('commercial_name')(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <DF label="البريد الإلكتروني">
                  <input value={form.email} onChange={e => f('email')(e.target.value)} style={inp} dir="ltr"
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </DF>
                <DF label="الهاتف">
                  <input value={form.phone} onChange={e => f('phone')(e.target.value)} style={inp} dir="ltr"
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </DF>
              </div>
              <DF label="النشاط التجاري">
                <input value={form.activity} onChange={e => f('activity')(e.target.value)} style={inp}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
              <DF label="العنوان">
                <textarea value={form.address} onChange={e => f('address')(e.target.value)} rows={2}
                  style={{ ...inp, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
                <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-power" style={{ color: form.active ? 'var(--em)' : 'var(--t4)' }} />
                  حالة الشركة
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: form.active ? 'var(--em)' : 'var(--t4)', fontWeight: 700 }}>
                    {form.active ? 'نشطة' : 'موقوفة'}
                  </span>
                  <Switch checked={form.active} onChange={() => f('active')(!form.active)} />
                </div>
              </div>
            </div>
          )}

          {/* ── قانوني ── */}
          {tab === 'legal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {[
                { key: 'nif' as const, label: 'NIF — رقم التعريف الجبائي' },
                { key: 'nis' as const, label: 'NIS — رقم الإحصاء' },
                { key: 'rc'  as const, label: 'RC — السجل التجاري' },
                { key: 'ai'  as const, label: 'AI — رقم المادة' },
              ].map(({ key, label }) => (
                <DF key={key} label={label}>
                  <input value={form[key]} onChange={e => f(key)(e.target.value)} style={{ ...inp, direction: 'ltr', textAlign: 'left' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                </DF>
              ))}
            </div>
          )}

          {/* ── الخطة ── */}
          {tab === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '10px 13px', borderRadius: 10, background: 'var(--emb)', border: '1px solid var(--embo)', color: 'var(--em)', fontSize: 12, display: 'flex', gap: 8 }}>
                <i className="ti ti-shield-check" />
                هذه الإعدادات مقتصرة على Super Admin
              </div>

              <DF label="خطة الاشتراك">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {PLANS.map(p => {
                    const meta = PLAN_META[p];
                    const active = form.plan === p;
                    return (
                      <button key={p} onClick={() => f('plan')(p)} style={{
                        padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'Tajawal, sans-serif', fontSize: 12, fontWeight: 700,
                        border: `1.5px solid ${active ? meta.color : 'var(--b2)'}`,
                        background: active ? meta.bg : 'var(--bg3)',
                        color: active ? meta.color : 'var(--t3)',
                        transition: '.13s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        {active && <i className="ti ti-check" style={{ fontSize: 12 }} />}
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </DF>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {([
                  { key: 'max_users'      as const, label: 'حد المستخدمين', icon: 'ti-users' },
                  { key: 'max_products'   as const, label: 'حد المنتجات',   icon: 'ti-package' },
                  { key: 'max_warehouses' as const, label: 'حد المستودعات', icon: 'ti-building-warehouse' },
                ] as const).map(({ key, label, icon }) => (
                  <DF key={key} label={label}>
                    <div style={{ position: 'relative' }}>
                      <i className={`ti ${icon}`} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--t4)', pointerEvents: 'none' }} />
                      <input type="number" min={1} value={form[key]}
                        onChange={e => f(key)(Number(e.target.value) as any)}
                        style={{ ...inp, paddingRight: 28, textAlign: 'center', direction: 'ltr' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
                    </div>
                  </DF>
                ))}
              </div>

              <DF label="ملاحظات داخلية">
                <textarea value={form.notes} onChange={e => f('notes')(e.target.value)} rows={3}
                  placeholder="ملاحظات مرئية للـ Super Admin فقط..."
                  style={{ ...inp, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </DF>
            </div>
          )}

          {/* ── إجراءات ── */}
          {tab === 'danger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '10px 13px', borderRadius: 10, background: 'var(--redb)', border: '1px solid var(--redbo)', color: 'var(--red)', fontSize: 12, display: 'flex', gap: 8 }}>
                <i className="ti ti-alert-triangle" style={{ flexShrink: 0, fontSize: 14 }} />
                هذه الإجراءات تؤثر مباشرة على وصول الشركة للنظام
              </div>

              {/* تعليق / رفع */}
              <div style={{ padding: '14px', borderRadius: 12, background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>
                  {company.is_suspended ? 'الشركة معلّقة حالياً' : 'تعليق الشركة مؤقتاً'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 12 }}>
                  {company.is_suspended
                    ? 'رفع التعليق سيُعيد الوصول لجميع أعضاء الشركة'
                    : 'تعليق الشركة يمنع جميع أعضائها من الدخول'}
                </div>
                <button onClick={handleSuspend} style={{
                  padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7,
                  background: company.is_suspended ? 'var(--emb)' : 'var(--goldb)',
                  color: company.is_suspended ? 'var(--em)' : 'var(--gold)',
                }}>
                  <i className={`ti ti-${company.is_suspended ? 'lock-open' : 'lock'}`} />
                  {company.is_suspended ? 'رفع التعليق' : 'تعليق الشركة'}
                </button>
              </div>

              {/* توثيق */}
              <div style={{ padding: '14px', borderRadius: 12, background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>
                  {company.is_verified ? 'الشركة موثّقة' : 'توثيق الشركة'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 12 }}>
                  التوثيق يُضيف شارة موثّقة ويمنح ثقة إضافية للمستخدمين
                </div>
                <button onClick={handleVerify} style={{
                  padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7,
                  background: company.is_verified ? 'var(--redb)' : 'var(--emb)',
                  color: company.is_verified ? 'var(--red)' : 'var(--em)',
                }}>
                  <i className={`ti ti-${company.is_verified ? 'rosette-discount-check-off' : 'rosette-discount-check'}`} />
                  {company.is_verified ? 'إلغاء التوثيق' : 'توثيق الشركة'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--b2)', flexShrink: 0, display: 'flex', gap: 8, justifyContent: 'flex-end', background: 'var(--bg3)' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--b3)', background: 'var(--bg4)', color: 'var(--t2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>
            إغلاق
          </button>
          {tab !== 'danger' && (
            <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{
              padding: '9px 22px', borderRadius: 10, border: 'none',
              background: form.name.trim() ? 'var(--em)' : 'var(--bg4)',
              color: form.name.trim() ? '#fff' : 'var(--t4)',
              fontSize: 13, fontWeight: 800, cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: form.name.trim() ? 'var(--emglow)' : 'none',
            }}>
              {saving && <i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite' }} />}
              {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg0)', color: 'var(--t1)', padding: '9px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif', border: '1px solid var(--b2)', whiteSpace: 'nowrap', boxShadow: 'var(--shadow2)', zIndex: 1 }}>
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

function DF({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8 }}>
        {label}{req && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CompanyRow
// ════════════════════════════════════════════════════════════
function CompanyRow({
  co, onEdit, onSuspend, onVerify, onDelete,
}: {
  co: Company;
  onEdit: () => void;
  onSuspend: () => void;
  onVerify: () => void;
  onDelete: () => void;
}) {
  const si   = statusInfo(co);
  const meta = PLAN_META[co.plan] ?? PLAN_META.free;

  return (
    <div className="u-row" style={{
      display: 'grid',
      gridTemplateColumns: '2.4fr 1.4fr 1fr 1fr 130px',
      padding: '12px 18px',
      borderBottom: '1px solid var(--b1)',
      background: 'var(--bg2)', transition: '.13s',
      alignItems: 'center', direction: 'rtl',
    }}>
      {/* الشركة */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CompanyAvatar name={co.name} id={co.id} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.name}</span>
            {co.is_verified && <i className="ti ti-rosette-discount-check" style={{ color: 'var(--em)', fontSize: 13, flexShrink: 0 }} />}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace', marginTop: 2 }}>
            {co.slug}
            {co.owner && <span style={{ marginRight: 8, fontFamily: 'Tajawal, sans-serif' }}>· {co.owner.name}</span>}
          </div>
        </div>
      </div>

      {/* البريد / الهاتف */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {co.email && <div style={{ fontSize: 11, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{co.email}</div>}
        {co.phone && <div style={{ fontSize: 10, color: 'var(--t4)', direction: 'ltr' }}>{co.phone}</div>}
        {!co.email && !co.phone && <div style={{ fontSize: 11, color: 'var(--t4)', opacity: .5 }}>—</div>}
      </div>

      {/* الخطة */}
      <div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg }}>
          {meta.label}
        </span>
      </div>

      {/* الحالة */}
      <div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: si.color, background: si.bg }}>
          <i className={`ti ${si.icon}`} style={{ fontSize: 11 }} />
          {si.label}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <button onClick={onEdit} title="تعديل" style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--emb)', 'var(--em)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}>
          <i className="ti ti-settings" style={{ fontSize: 13 }} />
        </button>
        <button onClick={onSuspend} title={co.is_suspended ? 'رفع التعليق' : 'تعليق'} style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--goldb)', 'var(--gold)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}>
          <i className={`ti ti-${co.is_suspended ? 'lock-open' : 'lock'}`} style={{ fontSize: 13 }} />
        </button>
        <button onClick={onVerify} title={co.is_verified ? 'إلغاء التوثيق' : 'توثيق'} style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--emb)', 'var(--em)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}>
          <i className={`ti ti-${co.is_verified ? 'rosette-discount-check' : 'rosette'}`} style={{ fontSize: 13 }} />
        </button>
        <button onClick={onDelete} title="تعطيل/حذف" style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--redb)', 'var(--red)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}>
          <i className="ti ti-trash" style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SuperAdminTab
// ════════════════════════════════════════════════════════════
function SuperAdminTab() {
  const [settings, setSettings] = useState({
    registrations: true, new_companies: true,
    notifications: true, debug: false, public_api: true,
    free_trial_days: 14, free_max_users: 3, starter_max_products: 2000,
  });
  const [saved, setSaved] = useState(false);
  const toggle = (k: keyof typeof settings) => setSettings(p => ({ ...p, [k]: !p[k] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'slideIn .2s ease' }}>
      <AlertBar variant="red">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 16, flexShrink: 0 }} />
          هذه الإعدادات تؤثر على كامل النظام — تصرف بحذر
        </div>
      </AlertBar>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* ميزات النظام */}
        <Card title="ميزات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {([
              { key: 'registrations', label: 'تسجيل مستخدمين جدد',  icon: 'ti-user-plus' },
              { key: 'new_companies', label: 'إنشاء شركات جديدة',    icon: 'ti-building-plus' },
              { key: 'notifications', label: 'نظام الإشعارات',       icon: 'ti-bell' },
              { key: 'debug',         label: 'وضع التصحيح (Debug)',  icon: 'ti-bug' },
              { key: 'public_api',    label: 'API العام',             icon: 'ti-api' },
            ] as { key: keyof typeof settings; label: string; icon: string }[]).map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--b1)' }}>
                <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className={`ti ${item.icon}`} style={{ color: 'var(--em)', fontSize: 14 }} />
                  {item.label}
                </span>
                <Switch checked={settings[item.key] as boolean} onChange={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </Card>

        {/* الخطط الافتراضية */}
        <Card title="الخطط الافتراضية" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'free_trial_days',      label: 'مدة التجربة (أيام)',    min: 1,   max: 90 },
              { key: 'free_max_users',        label: 'حد المستخدمين — Free', min: 1,   max: 10 },
              { key: 'starter_max_products',  label: 'حد المنتجات — Starter', min: 100, max: 9999 },
            ].map(fi => (
              <div key={fi.key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 5 }}>{fi.label}</label>
                <input type="number" min={fi.min} max={fi.max}
                  value={settings[fi.key as keyof typeof settings] as number}
                  onChange={e => setSettings(p => ({ ...p, [fi.key]: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t1)', fontFamily: 'Tajawal, sans-serif', fontSize: 13, outline: 'none', direction: 'ltr' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')} />
              </div>
            ))}
            <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} style={{
              padding: '9px', borderRadius: 10, border: 'none',
              background: saved ? 'var(--emb)' : 'var(--em)',
              color: saved ? 'var(--em)' : '#fff', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <i className={`ti ti-${saved ? 'check' : 'device-floppy'}`} />
              {saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
            </button>
          </div>
        </Card>

        {/* عمليات النظام */}
        <Card title="عمليات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'مسح الكاش العام',          icon: 'ti-refresh',        color: 'var(--em)',   bg: 'var(--emb)',   action: () => alert('تم مسح الكاش') },
              { label: 'تشغيل المهام المجدولة',     icon: 'ti-clock-play',     color: 'var(--blue)', bg: 'var(--blueb)', action: () => alert('تم تشغيل المهام') },
              { label: 'تصدير ملفات اللوج',         icon: 'ti-download',       color: 'var(--blue)', bg: 'var(--blueb)', action: () => alert('جارٍ التصدير...') },
              { label: 'نسخ احتياطي فوري',          icon: 'ti-database-export',color: 'var(--gold)', bg: 'var(--goldb)', action: () => alert('النسخة تُنشأ...') },
              { label: 'إرسال إشعار للكل',          icon: 'ti-speakerphone',   color: 'var(--gold)', bg: 'var(--goldb)', action: () => alert('تم الإرسال') },
              { label: 'تفعيل وضع الصيانة',         icon: 'ti-alert-triangle', color: 'var(--red)',  bg: 'var(--redb)',  action: () => confirm('تفعيل وضع الصيانة؟') && alert('مفعّل') },
            ].map(op => (
              <button key={op.label} onClick={op.action} style={{
                padding: '10px 14px', borderRadius: 10, width: '100%',
                border: `1px solid ${op.bg}`, background: op.bg,
                color: op.color, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                display: 'flex', alignItems: 'center', gap: 9, transition: '.13s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                <i className={`ti ${op.icon}`} style={{ fontSize: 14, flexShrink: 0 }} />
                {op.label}
              </button>
            ))}
          </div>
        </Card>

        {/* إحصائيات */}
        <Card title="إحصائيات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'إجمالي المستخدمين',   icon: 'ti-users' },
              { label: 'إجمالي الفواتير',      icon: 'ti-file-invoice' },
              { label: 'إجمالي المنتجات',      icon: 'ti-package' },
              { label: 'محاولات الدخول اليوم', icon: 'ti-login' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--b1)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'var(--em)', flexShrink: 0 }}>
                  <i className={`ti ${s.icon}`} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>—</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Main Page
// ════════════════════════════════════════════════════════════
export default function CompaniesPage() {
  const { user } = useAuth() as any;
  const qc = useQueryClient();

  const [tab, setTab]                   = useState<Tab>('companies');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch]             = useState('');
  const [editTarget, setEditTarget]     = useState<Company | null>(null);

  // ── Query ──────────────────────────────────────────────────
  const { data: companies = [], isLoading, isError, refetch } = useQuery<Company[]>({
    queryKey: ['admin-companies', statusFilter, search],
    queryFn: async () => {
      const params: Record<string, string> = { per_page: '200', include: 'owner' };
      if (search)               params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      // super-admin يرى كل الشركات بدون فلتر الـ company context
      const res = await apiClient.get('/companies', { params });
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    staleTime: 30_000,
  });

  // ── Mutations ──────────────────────────────────────────────
  const suspend = useMutation({
    mutationFn: ({ slug, suspended }: { slug: string; suspended: boolean }) =>
      suspended
        ? apiClient.post(`/companies/${slug}/unsuspend`)
        : apiClient.post(`/companies/${slug}/suspend`, { reason: 'قرار إداري' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-companies'] }),
  });

  const verify = useMutation({
    mutationFn: ({ slug, verified }: { slug: string; verified: boolean }) =>
      verified
        ? apiClient.post(`/companies/${slug}/unverify`)
        : apiClient.post(`/companies/${slug}/verify`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-companies'] }),
  });

  const destroy = useMutation({
    mutationFn: (slug: string) => apiClient.delete(`/companies/${slug}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-companies'] }),
  });

  // ── KPIs ───────────────────────────────────────────────────
  const total     = companies.length;
  const active    = companies.filter(c => c.is_operational).length;
  const suspended = companies.filter(c => c.is_suspended).length;
  const onTrial   = companies.filter(c => c.is_on_trial).length;

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',         label: 'الكل' },
    { key: 'active',      label: 'نشطة' },
    { key: 'suspended',   label: 'معلّقة' },
    { key: 'deactivated', label: 'موقوفة' },
    { key: 'trial',       label: 'تجريبية' },
    { key: 'verified',    label: 'موثّقة' },
  ];

  return (
    <>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .u-row:hover { background: var(--bg3) !important; }
      `}</style>

      <div className="page on" style={{ animation: 'slideIn .25s ease' }}>

        {/* ── Header ── */}
        <PageHeader
          title="إدارة الشركات"
          subtitle={`${total} شركة · ${active} نشطة · ${suspended} معلّقة`}
          actions={
            tab === 'companies' ? (
              <Button variant="secondary" icon={<i className="ti ti-refresh" />} onClick={() => refetch()}>
                تحديث
              </Button>
            ) : undefined
          }
        />

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          <KpiCard label="إجمالي الشركات" value={total}     icon="ti-building"       color="var(--em)"   bg="var(--emb)" />
          <KpiCard label="نشطة"            value={active}    icon="ti-circle-check"   color="var(--blue)" bg="var(--blueb)" />
          <KpiCard label="معلّقة"           value={suspended} icon="ti-lock"           color="var(--red)"  bg="var(--redb)" />
          <KpiCard label="تجريبية"          value={onTrial}   icon="ti-clock"          color="var(--gold)" bg="var(--goldb)" />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', marginBottom: 20, gap: 0, overflowX: 'auto' }}>
          {([
            { key: 'companies', label: 'الشركات',             icon: 'ti-building', count: total },
            { key: 'super',     label: 'إعدادات Super Admin', icon: 'ti-star',     count: null },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? 'var(--em)' : 'transparent'}`,
              color: tab === t.key ? 'var(--em)' : 'var(--t4)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 7,
              transition: '.13s', whiteSpace: 'nowrap',
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />
              {t.label}
              {t.count !== null && (
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 800, background: tab === t.key ? 'var(--emb)' : 'var(--bg4)', color: tab === t.key ? 'var(--em)' : 'var(--t4)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ TAB: COMPANIES ══ */}
        {tab === 'companies' && (
          <div style={{ animation: 'slideIn .2s ease' }}>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم، البريد، NIF..." />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(f => (
                  <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
                    padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', transition: '.13s',
                    background: statusFilter === f.key ? 'var(--em)' : 'var(--bg3)',
                    border: `1px solid ${statusFilter === f.key ? 'var(--em)' : 'var(--b2)'}`,
                    color: statusFilter === f.key ? '#fff' : 'var(--t3)',
                  }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {isError && (
              <AlertBar variant="red">
                فشل تحميل الشركات.{' '}
                <button onClick={() => refetch()} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                  إعادة المحاولة
                </button>
              </AlertBar>
            )}

            {isLoading && (
              <div className="empty">
                <div className="empty-ic"><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /></div>
                <div className="empty-tx">جارٍ تحميل الشركات...</div>
              </div>
            )}

            {!isLoading && companies.length === 0 && (
              <EmptyState icon="ti-building" text="لا توجد شركات" sub={search ? 'لا توجد نتائج للبحث' : 'لم تُسجَّل أي شركة بعد'} />
            )}

            {!isLoading && companies.length > 0 && (
              <Card padding={0}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1fr 1fr 130px', padding: '10px 18px', borderBottom: '1px solid var(--b2)', background: 'var(--bg3)', direction: 'rtl' }}>
                  {['الشركة', 'التواصل', 'الخطة', 'الحالة', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8 }}>{h}</div>
                  ))}
                </div>

                {companies.map(co => (
                  <CompanyRow
                    key={co.id}
                    co={co}
                    onEdit={() => setEditTarget(co)}
                    onSuspend={() => suspend.mutate({ slug: co.slug, suspended: co.is_suspended })}
                    onVerify={() => verify.mutate({ slug: co.slug, verified: co.is_verified })}
                    onDelete={() => confirm(`تعطيل شركة "${co.name}"؟`) && destroy.mutate(co.slug)}
                  />
                ))}
              </Card>
            )}
          </div>
        )}

        {/* ══ TAB: SUPER ADMIN ══ */}
        {tab === 'super' && <SuperAdminTab />}
      </div>

      {/* ── Drawer تعديل الشركة ── */}
      {editTarget && (
        <EditCompanyDrawer
          company={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            qc.invalidateQueries({ queryKey: ['admin-companies'] });
            setEditTarget(null);
          }}
        />
      )}
    </>
  );
}
