

# =========================================
# 📄 PAGES
# =========================================

## FILE: resources/js/pages/admin/CompaniesPage.tsx
```
// ════════════════════════════════════════════════════════════
// pages/admin/CompaniesPage.tsx
// إدارة الشركات — Super Admin
// يستخدم: Card, Badge, Button, PageHeader, AlertBar,
//          EmptyState, KpiCard, Switch, SearchInput
//          + CompanyFormDrawer (مكوّن جديد)
// ════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';

// ── UI Components (موجودة لديك) ──────────────────────────
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import PageHeader   from '@/components/ui/PageHeader';
import AlertBar     from '@/components/ui/AlertBar';
import EmptyState   from '@/components/ui/EmptyState';
import KpiCard      from '@/components/ui/KpiCard';
import SearchInput  from '@/components/ui/SearchInput';
import Switch       from '@/components/ui/Switch';

// ── Drawer جديد ───────────────────────────────────────────
import CompanyFormDrawer, { CompanyFormData } from '@/components/modals/CompanyFormDrawer';

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
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  is_active: boolean;
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
  created_at?: string;
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'deactivated' | 'trial' | 'verified';
type Tab = 'companies' | 'super';

// ════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════
const AV_COLORS = [
  'linear-gradient(135deg,#0a8a5c,#0dbf84)',
  'linear-gradient(135deg,#1a4fd6,#60a5fa)',
  'linear-gradient(135deg,#6920d4,#a78bfa)',
  'linear-gradient(135deg,#b87d0a,#fbbf24)',
  'linear-gradient(135deg,#0d7a8c,#22d3ee)',
  'linear-gradient(135deg,#c43a0a,#fb923c)',
];
const avColor = (id: number) => AV_COLORS[id % AV_COLORS.length];
const initials = (name: string) =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', starter: 'Starter',
  professional: 'Professional', enterprise: 'Enterprise',
};
const PLAN_COLORS: Record<string, { color: string; bg: string }> = {
  free:         { color: 'var(--t4)',     bg: 'var(--bg4)' },
  starter:      { color: 'var(--blue)',   bg: 'var(--blueb)' },
  professional: { color: 'var(--em)',     bg: 'var(--emb)' },
  enterprise:   { color: 'var(--gold)',   bg: 'var(--goldb)' },
};

function statusInfo(co: Company): { label: string; color: string; bg: string; dot?: boolean } {
  if (co.is_suspended)       return { label: 'معلّقة',  color: 'var(--red)',    bg: 'var(--redb)',  dot: true };
  if (!co.is_active)         return { label: 'موقوفة',  color: 'var(--t4)',     bg: 'var(--bg4)' };
  if (co.is_on_trial)        return { label: `تجريبية · ${co.trial_days_remaining ?? '?'} يوم`, color: 'var(--gold)', bg: 'var(--goldb)' };
  if (co.is_verified)        return { label: 'موثّقة',  color: 'var(--em)',     bg: 'var(--emb)',   dot: true };
  return                            { label: 'نشطة',    color: 'var(--blue)',   bg: 'var(--blueb)', dot: true };
}

function companyToForm(co: Company): CompanyFormData {
  return {
    id: co.id, slug: co.slug,
    name: co.name, commercial_name: co.commercial_name ?? '',
    email: co.email ?? '', phone: co.phone ?? '', mobile: co.mobile ?? '',
    address: co.address ?? '', activity: co.activity ?? '',
    nif: co.nif ?? '', nis: co.nis ?? '', rc: co.rc ?? '', ai: co.ai ?? '',
    plan: co.plan, max_users: co.max_users,
    max_products: co.max_products, max_warehouses: co.max_warehouses,
    notes: co.notes ?? '', is_active: co.is_active,
  };
}

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

/** Avatar الشركة */
function CompanyAvatar({ name, id, size = 44 }: { name: string; id: number; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
      background: avColor(id), display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.35, fontWeight: 900,
      color: '#fff', letterSpacing: -1,
    }}>
      {initials(name)}
    </div>
  );
}

/** صف شركة في الجدول */
function CompanyRow({
  co, onEdit, onSuspend, onVerify, onDelete, loading,
}: {
  co: Company;
  onEdit: () => void;
  onSuspend: () => void;
  onVerify: () => void;
  onDelete: () => void;
  loading?: boolean;
}) {
  const si = statusInfo(co);
  const pc = PLAN_COLORS[co.plan] ?? PLAN_COLORS.free;

  return (
    <div
      className="u-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 140px',
        padding: '13px 18px',
        borderBottom: '1px solid var(--b1)',
        background: 'var(--bg2)',
        transition: '.13s',
        alignItems: 'center',
        direction: 'rtl',
      }}
    >
      {/* الشركة */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <CompanyAvatar name={co.name} id={co.id} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 7 }}>
            {co.name}
            {co.is_verified && (
              <i className="ti ti-rosette-discount-check" style={{ color: 'var(--em)', fontSize: 14 }} />
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace', marginTop: 1 }}>
            {co.slug}
            {co.owner && <span style={{ marginRight: 8 }}>· {co.owner.name}</span>}
          </div>
        </div>
      </div>

      {/* البريد / الهاتف */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {co.email && (
          <div style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {co.email}
          </div>
        )}
        {co.phone && (
          <div style={{ fontSize: 10, color: 'var(--t4)', direction: 'ltr' }}>{co.phone}</div>
        )}
      </div>

      {/* الخطة */}
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          color: pc.color, background: pc.bg,
        }}>
          {PLAN_LABELS[co.plan] ?? co.plan}
        </span>
      </div>

      {/* الحالة */}
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          color: si.color, background: si.bg,
        }}>
          {si.dot && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: si.color, display: 'inline-block' }} />
          )}
          {si.label}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        {/* تعديل */}
        <button
          onClick={onEdit}
          title="تعديل"
          style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--emb)', 'var(--em)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}
        >
          <i className="ti ti-pencil" style={{ fontSize: 13 }} />
        </button>

        {/* تعليق / رفع */}
        <button
          onClick={onSuspend}
          title={co.is_suspended ? 'رفع التعليق' : 'تعليق مؤقت'}
          style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--goldb)', 'var(--gold)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}
        >
          <i className={`ti ti-${co.is_suspended ? 'lock-open' : 'lock'}`} style={{ fontSize: 13 }} />
        </button>

        {/* توثيق */}
        <button
          onClick={onVerify}
          title={co.is_verified ? 'إلغاء التوثيق' : 'توثيق'}
          style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--emb)', 'var(--em)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}
        >
          <i className={`ti ti-${co.is_verified ? 'rosette-discount-check' : 'rosette'}`} style={{ fontSize: 13 }} />
        </button>

        {/* حذف */}
        <button
          onClick={onDelete}
          title="تعطيل"
          disabled={loading}
          style={actionBtn()}
          onMouseEnter={e => hoverBtn(e, 'var(--redb)', 'var(--red)')}
          onMouseLeave={e => hoverBtn(e, 'var(--bg3)', 'var(--t3)')}
        >
          <i className="ti ti-trash" style={{ fontSize: 13 }} />
        </button>
      </div>
    </div>
  );
}

// style helpers
const actionBtn = (): React.CSSProperties => ({
  width: 28, height: 28, borderRadius: 7,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: 'var(--t3)', transition: '.13s',
  flexShrink: 0,
});
const hoverBtn = (e: React.MouseEvent, bg: string, color: string) => {
  (e.currentTarget as HTMLButtonElement).style.background = bg;
  (e.currentTarget as HTMLButtonElement).style.color = color;
};

// ════════════════════════════════════════════════════════════
// Super Admin Tab — إعدادات حرجة
// ════════════════════════════════════════════════════════════
function SuperAdminTab() {
  const [settings, setSettings] = useState({
    registrations: true,
    new_companies: true,
    notifications: true,
    debug: false,
    public_api: true,
    free_trial_days: 14,
    free_max_users: 3,
    starter_max_products: 2000,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (k: keyof typeof settings) =>
    setSettings(prev => ({ ...prev, [k]: !prev[k] }));

  const handleSave = () => {
    // TODO: apiClient.post('/admin/settings', settings)
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'slideIn .2s ease' }}>

      {/* تحذير */}
      <AlertBar variant="red">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 16, flexShrink: 0 }} />
          <span>هذه الإعدادات تؤثر على كامل النظام — تصرف بحذر</span>
        </div>
      </AlertBar>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* إدارة النظام */}
        <Card title="إدارة النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {([
              { key: 'registrations',  label: 'تسجيل مستخدمين جدد',   icon: 'ti-user-plus' },
              { key: 'new_companies',  label: 'إنشاء شركات جديدة',     icon: 'ti-building-plus' },
              { key: 'notifications',  label: 'نظام الإشعارات',        icon: 'ti-bell' },
              { key: 'debug',          label: 'وضع التصحيح (Debug)',    icon: 'ti-bug' },
              { key: 'public_api',     label: 'API العام',              icon: 'ti-api' },
            ] as { key: keyof typeof settings; label: string; icon: string }[]).map(item => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 0', borderBottom: '1px solid var(--b1)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className={`ti ${item.icon}`} style={{ color: 'var(--em)', fontSize: 14 }} />
                  {item.label}
                </span>
                <Switch
                  checked={settings[item.key] as boolean}
                  onChange={() => toggle(item.key)}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* إعدادات الخطط */}
        <Card title="الخطط الافتراضية" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'free_trial_days',       label: 'مدة التجربة المجانية (أيام)', min: 1, max: 90 },
              { key: 'free_max_users',         label: 'حد المستخدمين — Free',        min: 1, max: 10 },
              { key: 'starter_max_products',   label: 'حد المنتجات — Starter',       min: 100, max: 9999 },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 5 }}>
                  {f.label}
                </label>
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  value={settings[f.key as keyof typeof settings] as number}
                  onChange={e => setSettings(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 10,
                    border: '1px solid var(--b3)', background: 'var(--bg3)',
                    color: 'var(--t1)', fontFamily: 'Tajawal, sans-serif', fontSize: 13,
                    outline: 'none', direction: 'ltr',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              style={{
                padding: '9px', borderRadius: 10, border: 'none',
                background: saved ? 'var(--emb)' : 'var(--em)',
                color: saved ? 'var(--em)' : '#fff',
                fontSize: 13, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'Tajawal, sans-serif', transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <i className={`ti ti-${saved ? 'check' : 'device-floppy'}`} />
              {saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
            </button>
          </div>
        </Card>

        {/* عمليات النظام */}
        <Card title="عمليات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'مسح الكاش العام',           icon: 'ti-refresh',        color: 'var(--em)',   bg: 'var(--emb)',    action: () => alert('تم مسح الكاش') },
              { label: 'تشغيل المهام المجدولة',      icon: 'ti-clock-play',     color: 'var(--blue)', bg: 'var(--blueb)',  action: () => alert('تم تشغيل المهام') },
              { label: 'تصدير ملفات اللوج',          icon: 'ti-download',       color: 'var(--blue)', bg: 'var(--blueb)',  action: () => alert('جارٍ التصدير...') },
              { label: 'نسخ احتياطي فوري',           icon: 'ti-database-export',color: 'var(--gold)', bg: 'var(--goldb)',  action: () => alert('النسخة تُنشأ...') },
              { label: 'إرسال إشعار لكل المستخدمين', icon: 'ti-speakerphone',   color: 'var(--gold)', bg: 'var(--goldb)',  action: () => alert('تم الإرسال') },
              { label: 'تفعيل وضع الصيانة',          icon: 'ti-alert-triangle', color: 'var(--red)',  bg: 'var(--redb)',   action: () => confirm('تفعيل وضع الصيانة؟') && alert('وضع الصيانة مفعّل') },
            ].map(op => (
              <button
                key={op.label}
                onClick={op.action}
                style={{
                  padding: '10px 14px', borderRadius: 10, width: '100%',
                  border: `1px solid ${op.bg}`, background: op.bg,
                  color: op.color, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 9,
                  transition: '.13s', textAlign: 'right',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <i className={`ti ${op.icon}`} style={{ fontSize: 15, flexShrink: 0 }} />
                {op.label}
              </button>
            ))}
          </div>
        </Card>

        {/* إحصائيات النظام */}
        <Card title="إحصائيات النظام" noHeader={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'إجمالي المستخدمين',   value: '—', icon: 'ti-users' },
              { label: 'إجمالي الفواتير',      value: '—', icon: 'ti-file-invoice' },
              { label: 'إجمالي المنتجات',      value: '—', icon: 'ti-package' },
              { label: 'محاولات الدخول اليوم', value: '—', icon: 'ti-login' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--bg3)', border: '1px solid var(--b1)',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'var(--emb)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: 'var(--em)', flexShrink: 0,
                }}>
                  <i className={`ti ${s.icon}`} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{s.value}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: 'var(--t4)', textAlign: 'center', marginTop: 4 }}>
              للإحصائيات الحية — اربط endpoint <code>/admin/stats</code>
            </div>
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
  const isSuperAdmin: boolean = user?.roles?.some((r: any) => r.name === 'super-admin') ?? false;

  const [tab, setTab]                   = useState<Tab>('companies');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch]             = useState('');
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<CompanyFormData | null>(null);

  // ── Queries ────────────────────────────────────────────────
  const { data: companies = [], isLoading, isError, refetch } = useQuery<Company[]>({
    queryKey: ['companies', statusFilter, search],
    queryFn: async () => {
      const params: Record<string, string> = { per_page: '100', include: 'owner' };
      if (search)             params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  const verify = useMutation({
    mutationFn: ({ slug, verified }: { slug: string; verified: boolean }) =>
      verified
        ? apiClient.post(`/companies/${slug}/unverify`)
        : apiClient.post(`/companies/${slug}/verify`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  const destroy = useMutation({
    mutationFn: (slug: string) => apiClient.delete(`/companies/${slug}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });

  // ── Open drawer ────────────────────────────────────────────
  const openAdd  = () => { setEditTarget(null);              setDrawerOpen(true); };
  const openEdit = useCallback((co: Company) => { setEditTarget(companyToForm(co)); setDrawerOpen(true); }, []);

  // ── KPIs ───────────────────────────────────────────────────
  const total      = companies.length;
  const active     = companies.filter(c => c.is_operational).length;
  const suspended  = companies.filter(c => c.is_suspended).length;
  const onTrial    = companies.filter(c => c.is_on_trial).length;

  // ── Status filter buttons ──────────────────────────────────
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
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .u-row:hover { background: var(--bg3) !important; }
      `}</style>

      <div className="page on" style={{ animation: 'slideIn .25s ease' }}>

        {/* ── Header ── */}
        <PageHeader
          title="إدارة الشركات"
          subtitle={`${total} شركة · ${active} نشطة · ${suspended} معلّقة`}
          actions={
            tab === 'companies' ? (
              <Button
                variant="primary"
                icon={<i className="ti ti-building-plus" />}
                onClick={openAdd}
              >
                شركة جديدة
              </Button>
            ) : undefined
          }
        />

        {/* ── KPIs ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 10, marginBottom: 22,
        }}>
          <KpiCard
            label="إجمالي الشركات"
            value={total}
            icon="ti-building"
            color="var(--em)"
            bg="var(--emb)"
          />
          <KpiCard
            label="نشطة"
            value={active}
            icon="ti-check"
            color="var(--blue)"
            bg="var(--blueb)"
          />
          <KpiCard
            label="معلّقة"
            value={suspended}
            icon="ti-lock"
            color="var(--red)"
            bg="var(--redb)"
          />
          <KpiCard
            label="تجريبية"
            value={onTrial}
            icon="ti-clock"
            color="var(--gold)"
            bg="var(--goldb)"
          />
        </div>

        {/* ── Main Tabs ── */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--b2)',
          marginBottom: 20, gap: 0, overflowX: 'auto',
        }}>
          {([
            { key: 'companies', label: 'الشركات',             icon: 'ti-building',  count: total },
            { key: 'super',     label: 'إعدادات Super Admin', icon: 'ti-star',      count: null },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 20px', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.key ? 'var(--em)' : 'transparent'}`,
                color: tab === t.key ? 'var(--em)' : 'var(--t4)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                fontFamily: 'Tajawal, sans-serif', transition: '.13s',
                whiteSpace: 'nowrap',
              }}
            >
              <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />
              {t.label}
              {t.count !== null && (
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 800,
                  background: tab === t.key ? 'var(--emb)' : 'var(--bg4)',
                  color: tab === t.key ? 'var(--em)' : 'var(--t4)',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════ TAB: COMPANIES ══════════ */}
        {tab === 'companies' && (
          <div style={{ animation: 'slideIn .2s ease' }}>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="بحث بالاسم، البريد، NIF..."
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    style={{
                      padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', transition: '.13s',
                      background: statusFilter === f.key ? 'var(--em)' : 'var(--bg3)',
                      border: `1px solid ${statusFilter === f.key ? 'var(--em)' : 'var(--b2)'}`,
                      color: statusFilter === f.key ? '#fff' : 'var(--t3)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {isError && (
              <AlertBar variant="red">
                فشل تحميل الشركات.{' '}
                <button
                  onClick={() => refetch()}
                  style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                >
                  إعادة المحاولة
                </button>
              </AlertBar>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="empty">
                <div className="empty-ic"><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /></div>
                <div className="empty-tx">جارٍ تحميل الشركات...</div>
              </div>
            )}

            {/* Empty */}
            {!isLoading && companies.length === 0 && (
              <EmptyState icon="ti-building" text="لا توجد شركات" sub="أضف شركتك الأولى" />
            )}

            {/* Table */}
            {!isLoading && companies.length > 0 && (
              <Card padding={0}>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 140px',
                  padding: '10px 18px', borderBottom: '1px solid var(--b2)',
                  background: 'var(--bg3)', direction: 'rtl',
                }}>
                  {['الشركة', 'التواصل', 'الخطة', 'الحالة', ''].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8 }}>
                      {h}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {companies.map((co, i) => (
                  <CompanyRow
                    key={co.id}
                    co={co}
                    onEdit={() => openEdit(co)}
                    onSuspend={() => suspend.mutate({ slug: co.slug, suspended: co.is_suspended })}
                    onVerify={() => verify.mutate({ slug: co.slug, verified: co.is_verified })}
                    onDelete={() => {
                      if (confirm(`تعطيل شركة "${co.name}"؟`)) destroy.mutate(co.slug);
                    }}
                    loading={destroy.isPending}
                  />
                ))}
              </Card>
            )}
          </div>
        )}

        {/* ══════════ TAB: SUPER ADMIN ══════════ */}
        {tab === 'super' && <SuperAdminTab />}

      </div>

      {/* ── Drawer ── */}
      <CompanyFormDrawer
        open={drawerOpen}
        company={editTarget}
        isSuperAdmin={isSuperAdmin}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['companies'] })}
      />
    </>
  );
}
```

## FILE: resources/js/pages/auth/LoginPage.tsx
```
// pages/auth/LoginPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    // redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) navigate("/onboarding", { replace: true });
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. تحقق محلي (Client-side Validation)
        if (!email || !password) {
            setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
            return;
        }

        if (password.length < 8) {
            setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
            return;
        }

        setError("");
        setLoading(true);

        try {
            // 2. إرسال الطلب فقط إذا كانت البيانات صحيحة
            await login({ email, password });
            navigate("/onboarding", { replace: true });
        } catch (err: any) {
            if (err.response) {
                // الخادم رد برسالة خطأ
                const msg =
                    err.response.data?.message || err.response.statusText;
                setError(`خطأ ${err.response.status}: ${msg}`);
            } else if (err.request) {
                // الطلب أُرسل ولكن لا توجد استجابة (مشكلة شبكة/CORS/الخادم معطل)
                setError(
                    "لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم وإعدادات CORS.",
                );
                console.error(err);
            } else {
                setError(err.message || "بيانات الدخول غير صحيحة");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                background: "var(--bg0)",
                direction: "rtl",
            }}
        >
            {/* ── Left decorative panel ── */}
            <div
                style={{
                    flex: 1,
                    background:
                        "linear-gradient(145deg, var(--em) 0%, #065f46 100%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 48,
                    position: "relative",
                    overflow: "hidden",
                }}
                className="login-panel"
            >
                {/* Background circles */}
                {[
                    { size: 300, top: -80, left: -80, opacity: 0.08 },
                    { size: 200, bottom: -40, right: -40, opacity: 0.06 },
                    { size: 150, top: "40%", left: "60%", opacity: 0.05 },
                ].map((c, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            width: c.size,
                            height: c.size,
                            borderRadius: "50%",
                            background: "#fff",
                            opacity: c.opacity,
                            top: c.top,
                            left: c.left,
                            bottom: (c as { bottom?: number }).bottom,
                            right: (c as { right?: number }).right,
                            pointerEvents: "none",
                        }}
                    />
                ))}

                <div
                    style={{
                        position: "relative",
                        textAlign: "center",
                        color: "#fff",
                        maxWidth: 360,
                    }}
                >
                    <div
                        style={{
                            width: 140,
                            height: 80,
                            borderRadius: 24,
                            background: "rgba(255,255,255,.15)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 24px",
                            fontSize: 36,
                            fontWeight: 900,
                        }}
                    >
                        POS Dz
                    </div>
                    <h1
                        style={{
                            fontSize: 28,
                            fontWeight: 900,
                            marginBottom: 12,
                            lineHeight: 1.3,
                        }}
                    >
                        نظام إدارة المبيعات
                    </h1>
                    <p
                        style={{
                            fontSize: 15,
                            opacity: 0.85,
                            lineHeight: 1.7,
                            marginBottom: 32,
                        }}
                    >
                        المنصة الأولى الموجهة للمؤسسات الجزائرية، تجمع بين قوة
                        الأداء، دقة الحسابات، والامتثال الكامل للتشريعات
                        الوطنية.
                    </p>

                    {/* Professional Features List */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                            textAlign: "right",
                        }}
                    >
                        {[
                            {
                                icon: "ti-receipt-2",
                                text: "فوترة إلكترونية متوافقة مع النظام الجبائي",
                            },
                            {
                                icon: "ti-building-warehouse",
                                text: "إدارة مخزون احترافية ومتعددة المستودعات",
                            },
                            {
                                icon: "ti-calculator",
                                text: "حسابات TVA دقيقة مع إصدار تلقائي لـ G50/G12",
                            },
                            {
                                icon: "ti-chart-pie",
                                text: "لوحات تحكم تفاعلية لتقارير الأداء اللحظية",
                            },
                            {
                                icon: "ti-shield-check",
                                text: "أمان بيانات متطور مع نسخ احتياطي دوري",
                            },
                            {
                                icon: "ti-users",
                                text: "إدارة متكاملة لبيانات العملاء والموردين",
                            },
                        ].map(({ icon, text }) => (
                            <div
                                key={text}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    opacity: 0.95,
                                }}
                            >
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: "rgba(255,255,255,.15)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        fontSize: 16,
                                    }}
                                >
                                    <i className={`ti ${icon}`} />
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>
                                    {text}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Support Footer */}
                    <div
                        style={{
                            marginTop: 48,
                            padding: "16px",
                            background: "rgba(0,0,0,0.2)",
                            borderRadius: 12,
                        }}
                    >
                        <p style={{ fontSize: 13, margin: 0, opacity: 0.9 }}>
                            <i
                                className="ti ti-headset"
                                style={{ marginLeft: 8 }}
                            />
                            دعم فني متخصص لمساعدتك 24/7
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Right login form ── */}
            <div
                style={{
                    width: 440,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 40,
                    background: "var(--bg2)",
                    flexShrink: 0,
                }}
                className="login-form-panel"
            >
                <div style={{ width: "100%", maxWidth: 360 }}>
                    {/* Header */}
                    <div style={{ marginBottom: 32 }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 8,
                            }}
                        >
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    background: "var(--grad-em)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#fff",
                                    fontWeight: 900,
                                    fontSize: 18,
                                    boxShadow: "var(--emglow)",
                                }}
                            >
                                ب
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontWeight: 900,
                                        fontSize: 16,
                                        color: "var(--t1)",
                                    }}
                                >
                                    بيزنس بلاس
                                </div>
                                <div
                                    style={{ fontSize: 11, color: "var(--t4)" }}
                                >
                                    نظام إدارة الأعمال
                                </div>
                            </div>
                        </div>
                        <h2
                            style={{
                                fontSize: 22,
                                fontWeight: 900,
                                color: "var(--t1)",
                                margin: "20px 0 6px",
                            }}
                        >
                            مرحباً بعودتك 👋
                        </h2>
                        <p style={{ fontSize: 13, color: "var(--t4)" }}>
                            أدخل بياناتك للدخول إلى لوحة التحكم
                        </p>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                        }}
                    >
                        {/* Email */}
                        <div className="fg">
                            <label className="req">البريد الإلكتروني</label>
                            <div className="inp-row">
                                <div
                                    className="inp-pre"
                                    style={{
                                        padding: "0 10px",
                                        display: "flex",
                                        alignItems: "center",
                                        color: "var(--t4)",
                                        fontSize: 15,
                                        borderLeft: "1px solid var(--b3)",
                                    }}
                                >
                                    <i className="ti ti-mail" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@mail.com"
                                    autoComplete="email"
                                    autoFocus
                                    style={{
                                        borderRight: "none",
                                        borderRadius: "0 var(--r2) var(--r2) 0",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="fg">
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <label className="req">كلمة المرور</label>
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: "var(--em)",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                    }}
                                >
                                    نسيت كلمة المرور؟
                                </span>
                            </div>
                            <div
                                className="inp-row"
                                style={{ position: "relative" }}
                            >
                                <div
                                    className="inp-pre"
                                    style={{
                                        padding: "0 10px",
                                        display: "flex",
                                        alignItems: "center",
                                        color: "var(--t4)",
                                        fontSize: 15,
                                        borderLeft: "1px solid var(--b3)",
                                    }}
                                >
                                    <i className="ti ti-lock" />
                                </div>
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    style={{
                                        borderRight: "none",
                                        borderRadius: "0 var(--r2) var(--r2) 0",
                                        paddingLeft: 36,
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass((v) => !v)}
                                    style={{
                                        position: "absolute",
                                        left: 10,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--t4)",
                                        fontSize: 15,
                                        padding: 0,
                                    }}
                                >
                                    <i
                                        className={`ti ${showPass ? "ti-eye-off" : "ti-eye"}`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div
                                className="al al-r"
                                style={{
                                    borderRadius: "var(--r2)",
                                    padding: "10px 14px",
                                }}
                            >
                                <span
                                    className="ic ic-xs"
                                    style={{ flexShrink: 0 }}
                                >
                                    <i className="ti ti-alert-circle" />
                                </span>
                                <div style={{ fontSize: 13 }}>{error}</div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "12px 20px",
                                borderRadius: "var(--r2)",
                                border: "none",
                                background: loading
                                    ? "var(--bg4)"
                                    : "var(--em)",
                                color: loading ? "var(--t4)" : "#fff",
                                fontSize: 14,
                                fontWeight: 800,
                                cursor: loading ? "not-allowed" : "pointer",
                                fontFamily: "Tajawal, sans-serif",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                boxShadow: loading ? "none" : "var(--emglow)",
                                transition: ".2s",
                                marginTop: 4,
                            }}
                        >
                            {loading ? (
                                <>
                                    <div
                                        style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            border: "2px solid rgba(255,255,255,.3)",
                                            borderTopColor: "#fff",
                                            animation:
                                                "spin .7s linear infinite",
                                        }}
                                    />
                                    جاري الدخول...
                                </>
                            ) : (
                                <>
                                    <i className="ti ti-login" />
                                    تسجيل الدخول
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div
                        style={{
                            marginTop: 32,
                            paddingTop: 20,
                            borderTop: "1px solid var(--b1)",
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                color: "var(--t4)",
                                lineHeight: 1.6,
                            }}
                        >
                            بيانات تجريبية:{" "}
                            <code
                                style={{
                                    background: "var(--bg3)",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                }}
                            >
                                admin@mail.com
                            </code>
                            {" / "}
                            <code
                                style={{
                                    background: "var(--bg3)",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                }}
                            >
                                password
                            </code>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-panel { display: none !important; }
          .login-form-panel { width: 100% !important; }
        }
      `}</style>
        </div>
    );
}
```

## FILE: resources/js/pages/clients/ClientsPage.tsx
```
// pages/clients/ClientsPage.tsx
import React, { useState } from 'react';
import { useCustomers, useCreateParty, useUpdateParty } from '@/hooks/useData';
import { useModal } from '@/hooks/useModal';
import PageHeader   from '@/components/ui/PageHeader';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import Modal        from '@/components/ui/Modal';
import KpiCard      from '@/components/ui/KpiCard';
import Avatar       from '@/components/ui/Avatar';
import EmptyState   from '@/components/ui/EmptyState';
import ProgressBar  from '@/components/ui/ProgressBar';
import type { Party } from '@/types';

export default function ClientsPage() {
  const [search,   setSearch]  = useState('');
  const [editing,  setEditing] = useState<Party | null>(null);
  const modal = useModal();

  const { data, isLoading } = useCustomers({ search: search || undefined, per_page: 30 });
  const clients = data?.data ?? [];
  const meta    = data?.meta;

  const openCreate = () => { setEditing(null); modal.openModal(); };
  const openEdit   = (c: Party) => { setEditing(c); modal.openModal(); };

  // Stats
  const withDebt    = clients.filter(c => (c.balance ?? 0) > 0).length;
  const totalDebt   = clients.reduce((s, c) => s + (c.balance ?? 0), 0);
  const totalBusiness = clients.reduce((s, c) => s + (c.total_purchases ?? 0), 0);

  return (
    <div className="page on" id="p-clients">

      <PageHeader
        title="العملاء"
        subtitle={`إدارة قاعدة العملاء — ${meta?.total ?? '...'} زبون`}
        actions={
          <>
            <Button size="sm" icon={<i className="ti ti-table-export"/>}>تصدير</Button>
            <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus"/>} onClick={openCreate}>
              زبون جديد
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-users"         label="إجمالي العملاء"    value={meta?.total ?? '—'} />
        <KpiCard variant="blue"   icon="ti-trending-up"   label="إجمالي المشتريات"  value={totalBusiness.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" />
        <KpiCard variant="red"    icon="ti-receipt"       label="ديون العملاء"      value={totalDebt.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" sub={`${withDebt} زبون متأخر`} />
        <KpiCard variant="gold"   icon="ti-star"          label="عملاء VIP"         value="—" />
      </div>

      {/* Search */}
      <div className="filters">
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input type="text" placeholder="ابحث بالاسم، الهاتف، NIF..." style={{ width: '100%' }}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ width: 140 }}>
          <option>كل الأنواع</option>
          <option>فرد</option>
          <option>شركة</option>
        </select>
        <select style={{ width: 140 }}>
          <option>كل الحالات</option>
          <option>نشط</option>
          <option>لديه دين</option>
        </select>
      </div>

      {/* Grid of client cards */}
      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : clients.length === 0 ? (
        <EmptyState icon="ti-users" text="لا يوجد عملاء" sub="أضف زبونك الأول" action={<Button variant="primary" onClick={openCreate}>زبون جديد</Button>} />
      ) : (
        <div className="g3">
          {clients.map((c, i) => {
            const hasDebt     = (c.balance ?? 0) > 0;
            const avatarColor = ((i % 7) + 1) as 1|2|3|4|5|6|7;
            const creditUsed  = c.credit_limit > 0 ? Math.min(100, ((c.balance ?? 0) / c.credit_limit) * 100) : 0;

            return (
              <Card key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <Avatar initials={c.name[0]} color={avatarColor} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 2 }}>{c.name}</div>
                    {c.commercial_name && <div style={{ fontSize: 11.5, color: 'var(--t4)' }}>{c.commercial_name}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <Badge variant={c.active ? 'success' : 'danger'}>{c.active ? 'نشط' : 'موقوف'}</Badge>
                      {hasDebt && <Badge variant="danger">دين</Badge>}
                    </div>
                  </div>
                </div>

                {/* Info rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--t3)' }}>
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="ti ti-phone" style={{ fontSize: 13, color: 'var(--t4)' }}/>
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.nif && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="ti ti-file-certificate" style={{ fontSize: 13, color: 'var(--t4)' }}/>
                      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>NIF: {c.nif}</span>
                    </div>
                  )}
                </div>

                {/* Financials */}
                <div style={{ marginTop: 10, padding: '8px 0', borderTop: '1px solid var(--b1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                    <span style={{ color: 'var(--t4)' }}>إجمالي المشتريات</span>
                    <span style={{ fontWeight: 700, color: 'var(--em)' }}>
                      {(c.total_purchases ?? 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                    </span>
                  </div>
                  {hasDebt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                      <span style={{ color: 'var(--red)', fontWeight: 700 }}>دين مستحق</span>
                      <span style={{ fontWeight: 800, color: 'var(--red)' }}>
                        {(c.balance ?? 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                      </span>
                    </div>
                  )}
                  {c.credit_limit > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t4)', marginBottom: 3 }}>
                        <span>حد الائتمان</span>
                        <span>{creditUsed.toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={creditUsed} color={creditUsed > 80 ? 'var(--red)' : creditUsed > 50 ? 'var(--gold)' : 'var(--em)'} height={4} />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                  <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEdit(c)}>تعديل</Button>
                  <Button size="xs" icon={<i className="ti ti-file-invoice"/>}>فواتيره</Button>
                  {hasDebt && <Button size="xs" variant="danger" icon={<i className="ti ti-cash"/>}>تسوية</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Client modal */}
      <ClientModal open={modal.open} party={editing} onClose={modal.closeModal} />
    </div>
  );
}

function ClientModal({ open, party, onClose }: {
  open: boolean; party: Party | null; onClose: () => void;
}) {
  const isEdit    = !!party;
  const createMut = useCreateParty();
  const updateMut = useUpdateParty();

  const [form, setForm] = useState({
    name:           party?.name            ?? '',
    commercial_name:party?.commercial_name ?? '',
    phone:          party?.phone           ?? '',
    mobile:         party?.mobile          ?? '',
    email:          party?.email           ?? '',
    address:        party?.address         ?? '',
    nif:            party?.nif             ?? '',
    nis:            party?.nis             ?? '',
    rc:             party?.rc              ?? '',
    ai:             party?.ai              ?? '',
    credit_limit:   party?.credit_limit    ?? 0,
    credit_days:    party?.credit_days     ?? 30,
    is_tva_exempt:  party?.is_tva_exempt   ?? false,
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (isEdit) {
      await updateMut.mutateAsync({ id: party!.id, data: { ...form, party_type_id: party!.party_type_id } });
    } else {
      await createMut.mutateAsync({ ...form, party_type_id: 1 }); // 1 = customer
    }
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={isEdit ? `تعديل — ${party!.name}` : 'زبون جديد'}
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button variant="primary" icon={<i className="ti ti-device-floppy"/>} onClick={handleSave}
            disabled={createMut.isPending || updateMut.isPending || !form.name.trim()}>
            {(createMut.isPending || updateMut.isPending) ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      <div className="tabs" style={{ marginBottom: 16 }}>
        <div className="tab on">المعلومات الأساسية</div>
        <div className="tab">القانونية والمالية</div>
        <div className="tab">التجاري</div>
      </div>

      <div className="fgrid c3">
        <div className="fg s2">
          <label className="req">الاسم الكامل / الشركة</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="الاسم واللقب أو اسم الشركة" />
        </div>
        <div className="fg">
          <label>الاسم التجاري</label>
          <input value={form.commercial_name} onChange={e => set('commercial_name', e.target.value)} placeholder="اختياري" />
        </div>
        <div className="fg">
          <label>الهاتف</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0555 xx xx xx" type="tel" />
        </div>
        <div className="fg">
          <label>الجوال</label>
          <input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="0770 xx xx xx" type="tel" />
        </div>
        <div className="fg">
          <label>البريد الإلكتروني</label>
          <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="exemple@mail.com" type="email" />
        </div>
        <div className="fg s3">
          <label>العنوان</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="العنوان الكامل" />
        </div>
        <div className="fg">
          <label>NIF — رقم التعريف الجبائي</label>
          <input value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="000000000000000" style={{ fontFamily: 'monospace' }} />
        </div>
        <div className="fg">
          <label>NIS — رقم إحصائي</label>
          <input value={form.nis} onChange={e => set('nis', e.target.value)} style={{ fontFamily: 'monospace' }} />
        </div>
        <div className="fg">
          <label>RC — السجل التجاري</label>
          <input value={form.rc} onChange={e => set('rc', e.target.value)} style={{ fontFamily: 'monospace' }} />
        </div>
        <div className="fg">
          <label>حد الائتمان (دج)</label>
          <input type="number" value={form.credit_limit} onChange={e => set('credit_limit', +e.target.value)} min={0} />
        </div>
        <div className="fg">
          <label>أجل الدفع (يوم)</label>
          <input type="number" value={form.credit_days} onChange={e => set('credit_days', +e.target.value)} min={0} />
        </div>
        <div className="fg" style={{ justifyContent: 'flex-end' }}>
          <label>معفى من TVA</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div className={`sw ${form.is_tva_exempt ? 'on' : ''}`} onClick={() => set('is_tva_exempt', !form.is_tva_exempt)} />
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>{form.is_tva_exempt ? 'نعم' : 'لا'}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pages/dashboard/DashboardPage.tsx
```
// pages/dashboard/DashboardPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KpiCard      from '@/components/ui/KpiCard';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Avatar       from '@/components/ui/Avatar';
import AlertBar     from '@/components/ui/AlertBar';
import Button       from '@/components/ui/Button';
import ProgressBar  from '@/components/ui/ProgressBar';

// ── Types ─────────────────────────────────────
interface Invoice {
  id: string; client: string; clientInitial: string; avatarColor: 1|2|3|4|5|6|7;
  amount: string; tva: string;
  status: 'paid' | 'pending' | 'partial' | 'cancelled';
  date: string; action: string;
}

interface StockAlert {
  name: string; qty: string; level: number;
  status: 'out' | 'low';
}

interface Activity {
  dot: 'e' | 'b' | 'g' | 'r' | 'z';
  time: string; text: React.ReactNode;
}

// ── Static data (will be replaced by API later) ─
const INVOICES: Invoice[] = [
  { id:'#INV-0342', client:'بوزيد أحمد',      clientInitial:'ب', avatarColor:1, amount:'24,500 دج', tva:'4,655 دج', status:'paid',      date:'اليوم 09:42',   action:'print' },
  { id:'#INV-0341', client:'فاطمة بن علي',    clientInitial:'ف', avatarColor:2, amount:'8,200 دج',  tva:'1,558 دج', status:'pending',    date:'اليوم 08:15',   action:'pay'   },
  { id:'#INV-0340', client:'الشركة الوطنية',  clientInitial:'ش', avatarColor:3, amount:'152,000 دج',tva:'28,880 دج',status:'partial',    date:'أمس 16:30',     action:'pay'   },
  { id:'#INV-0339', client:'كمال دبيح',       clientInitial:'ك', avatarColor:4, amount:'5,800 دج',  tva:'1,102 دج', status:'paid',       date:'أمس 14:08',     action:'print' },
  { id:'#INV-0338', client:'نبيل بوعزيز',     clientInitial:'ن', avatarColor:6, amount:'12,000 دج', tva:'—',        status:'cancelled',  date:'14/04 11:00',   action:'view'  },
];

const STOCK_ALERTS: StockAlert[] = [
  { name:'زيت مائدة 5L',     qty:'4 وحدة',  level:8,  status:'out' },
  { name:'دقيق مطحنة 25kg',  qty:'7 كيس',   level:20, status:'low' },
  { name:'زيت المحرك 4L',    qty:'4 علبة',  level:12, status:'out' },
];

const ACTIVITIES: Activity[] = [
  { dot:'e', time:'منذ 12 دقيقة', text: <><strong>#0342 — 24,500 دج</strong> فاتورة جديدة</> },
  { dot:'b', time:'منذ 35 دقيقة', text: <>زبون جديد: <strong>فاطمة بن علي</strong></> },
  { dot:'g', time:'منذ ساعة',     text: <>إدخال مخزون: <strong>+24 وحدة زيت</strong></> },
  { dot:'r', time:'منذ 2 ساعة',   text: <>فاتورة <strong>#0338 ملغاة</strong></> },
  { dot:'z', time:'منذ 5 ساعات',  text: <>نسخة احتياطية — <strong>2.4 MB</strong></> },
];

// ── Status helpers ─────────────────────────────
const statusBadge = (s: Invoice['status']) => {
  switch(s) {
    case 'paid':      return <Badge variant="success">مدفوعة</Badge>;
    case 'pending':   return <Badge variant="warning">معلقة</Badge>;
    case 'partial':   return <Badge variant="info">جزئياً</Badge>;
    case 'cancelled': return <Badge variant="danger">ملغاة</Badge>;
  }
};

const actionIcon = (a: string) => {
  if (a === 'print') return 'ti-printer';
  if (a === 'pay')   return 'ti-cash';
  return 'ti-eye';
};

// ── BarChart mini component ────────────────────
const MONTHS = [
  { lbl:'نوف', v:40,  val:'210K', hi:false },
  { lbl:'ديس', v:55,  val:'290K', hi:false },
  { lbl:'جان', v:46,  val:'242K', hi:false },
  { lbl:'فيف', v:64,  val:'339K', hi:false },
  { lbl:'مار', v:52,  val:'275K', hi:false },
  { lbl:'أفر', v:100, val:'524K ★', hi:true },
];

function BarChart() {
  return (
    <>
      <div className="barchart">
        {MONTHS.map((m) => (
          <div className="bc-col" key={m.lbl}>
            <div
              className={`bc-bar ${m.hi ? 'hi' : ''}`}
              style={{ height: `${m.v}%` }}
            >
              <span
                className="bc-v"
                style={m.hi ? { color: 'var(--gold)' } : {}}
              >
                {m.val}
              </span>
            </div>
            <div
              className="bc-lbl"
              style={m.hi ? { color: 'var(--gold)', fontWeight: 800 } : {}}
            >
              {m.lbl}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        display:'flex', justifyContent:'space-between', marginTop:12,
        padding:'9px 12px', background:'var(--bg3)', borderRadius:'var(--r2)',
      }}>
        <span style={{fontSize:'11.5px',color:'var(--t4)'}}>أدنى <strong style={{color:'var(--t2)'}}>210K</strong></span>
        <span style={{fontSize:'11.5px',color:'var(--t4)'}}>متوسط <strong style={{color:'var(--t2)'}}>313K</strong></span>
        <span style={{fontSize:'11.5px',color:'var(--t4)'}}>أعلى <strong style={{color:'var(--gold)'}}>524K دج</strong></span>
      </div>
    </>
  );
}

// ── Donut chart (CSS only) ─────────────────────
const DONUT_LEGEND = [
  { color:'var(--em2)',    label:'أغذية',       pct:'38%' },
  { color:'var(--gold)',   label:'إلكترونيات',  pct:'24%' },
  { color:'var(--blue)',   label:'ملابس',        pct:'17%' },
  { color:'var(--purple)', label:'صيانة',        pct:'9%'  },
  { color:'var(--t4)',     label:'أخرى',         pct:'12%' },
];

// ── Main component ─────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>('weekly');

  return (
    <div className="page on" id="p-dashboard">

      {/* ── Alert ── */}
      <AlertBar variant="green">
        <strong>تنبيهات اليوم:</strong>{' '}
        5 منتجات بمخزون منخفض — 3 فواتير معلقة — دين مستحق لفاطمة بن علي منذ 5 أيام.{' '}
        <a onClick={() => navigate('/dashboard/inventory')} style={{cursor:'pointer',fontWeight:800,textDecoration:'underline',marginRight:4}}>
          معالجة المخزون ←
        </a>
        <a onClick={() => navigate('/dashboard/debts')} style={{cursor:'pointer',fontWeight:800,textDecoration:'underline'}}>
          تتبع الديون ←
        </a>
      </AlertBar>

      {/* ── Mobile quick actions ── */}
      <div className="dash-quick" style={{gap:8,marginBottom:14,overflowX:'auto',paddingBottom:2}}>
        <Button variant="primary" size="sm" icon={<i className="ti ti-file-plus"/>}>فاتورة</Button>
        <Button size="sm" icon={<i className="ti ti-shopping-bag"/>} onClick={() => navigate('/pos')}>بيع</Button>
        <Button size="sm" icon={<i className="ti ti-package"/>} onClick={() => navigate('/dashboard/inventory')}>مخزون</Button>
        <Button size="sm" icon={<i className="ti ti-building-bank"/>} onClick={() => navigate('/dashboard/finance')}>خزينة</Button>
      </div>

      {/* ── KPI Row 1 ── */}
      <div className="kpis">
        <KpiCard
          variant="green" icon="ti-cash"
          label="مبيعات اليوم" value="184,750" unit="دج"
          trend="▲ 12.4%" trendDir="up"
          sub="مقارنة بالأمس: 164,320 دج"
        />
        <KpiCard
          variant="gold" icon="ti-file-text"
          label="فواتير الشهر" value="342"
          trend="▲ 8" trendDir="up"
          sub="8 اليوم — 3 معلقة"
        />
        <KpiCard
          variant="blue" icon="ti-users"
          label="عملاء جدد — أفريل" value="47"
          trend="▲ 3" trendDir="up"
          sub="إجمالي: 284 زبون"
        />
        <KpiCard
          variant="red" icon="ti-package"
          label="مخزون منخفض" value="5"
          trend="تدخّل" trendDir="down"
          sub="منتج واحد نفد تماماً"
          onClick={() => navigate('/dashboard/inventory')}
        />
      </div>

      {/* ── KPI Row 2 ── */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <KpiCard
          variant="purple" icon="ti-trending-up"
          label="مبيعات الشهر" value="1,248,400" unit="دج"
          trend="▲ 18%" trendDir="up"
          sub={
            <>
              هدف: 1,500,000 دج
              <div style={{ marginTop: 5 }}>
                <ProgressBar value={83} />
              </div>
            </>
          }
        />
        <KpiCard
          variant="teal" icon="ti-diamond"
          label="صافي الربح — أفريل" value="763,200" unit="دج"
          trend="▲ 22%" trendDir="up"
          sub="هامش: 61.1%"
        />
        <KpiCard
          variant="gold" icon="ti-calculator"
          label="TVA محصّلة — أفريل" value="237,196" unit="دج"
          trend="G50" trendDir="neutral"
          sub="استحقاق: 20 ماي • TVA + Timbre"
        />
        <KpiCard
          variant="red" icon="ti-receipt"
          label="ديون العملاء" value="56,200" unit="دج"
          trend="مستحقة" trendDir="down"
          sub="3 عملاء متأخرون"
          onClick={() => navigate('/dashboard/debts')}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="g65" style={{ marginBottom: 18 }}>

        {/* Bar Chart */}
        <Card
          title={
            <>
              <span className="ic ic-sm" style={{color:'var(--em)'}}>
                <i className="ti ti-chart-bar"/>
              </span>
              مبيعات الأشهر الستة الأخيرة
            </>
          }
          actions={
            <>
              <Button size="xs" onClick={() => setChartMode('monthly')}
                style={chartMode === 'monthly' ? {background:'var(--emb)',borderColor:'var(--embo)',color:'var(--em)'} : {}}>
                شهري
              </Button>
              <Button size="xs" onClick={() => setChartMode('weekly')}
                style={chartMode === 'weekly' ? {background:'var(--emb)',borderColor:'var(--embo)',color:'var(--em)'} : {}}>
                أسبوعي
              </Button>
            </>
          }
        >
          <BarChart />
        </Card>

        {/* Side column */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Donut */}
          <Card
            padding={14}
            title={
              <>
                <span className="ic ic-sm" style={{color:'var(--purple)'}}>
                  <i className="ti ti-chart-donut"/>
                </span>
                توزيع المبيعات
              </>
            }
          >
            <div className="donut-w">
              <div className="donut" />
              <div className="d-legend">
                {DONUT_LEGEND.map(({ color, label, pct }) => (
                  <div className="d-item" key={label}>
                    <div className="d-dot" style={{ background: color }} />
                    <span style={{ color:'var(--t3)', flex:1 }}>{label}</span>
                    <strong>{pct}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Top products */}
          <Card
            padding={14}
            title={
              <>
                <span className="ic ic-sm" style={{color:'var(--gold)'}}>
                  <i className="ti ti-star"/>
                </span>
                أكثر مبيعاً
              </>
            }
          >
            {[
              { name:'زيت مائدة 5L',    val:52,  n:'124 وحدة',   c:'var(--em)'     },
              { name:'ماء معدني 1.5L',  val:31,  n:'740 قارورة', c:'var(--blue)'   },
              { name:'سكر 1kg',         val:18,  n:'215 كيس',    c:'var(--gold)'   },
            ].map(({ name, val, n, c }) => (
              <div className="sr" key={name}>
                <div>
                  <div style={{fontSize:'12.5px',fontWeight:700,color:'var(--t1)',marginBottom:4}}>
                    {name}
                  </div>
                  <ProgressBar value={val} color={c} height={4} />
                </div>
                <span style={{fontSize:'11.5px',color:'var(--t4)',minWidth:72,textAlign:'left'}}>{n}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="g73">

        {/* Recent invoices table */}
        <Card
          title={
            <>
              <span className="ic ic-sm" style={{color:'var(--em)'}}>
                <i className="ti ti-file-invoice"/>
              </span>
              آخر الفواتير
            </>
          }
          actions={
            <Button size="xs" onClick={() => navigate('/dashboard/invoices')}>
              عرض الكل
            </Button>
          }
        >
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>الزبون</th>
                  <th>المبلغ</th>
                  <th>TVA</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv) => (
                  <tr key={inv.id}>
                    <td className="m">{inv.id}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <Avatar initials={inv.clientInitial} color={inv.avatarColor} size={26} />
                        <span className="s"
                          style={inv.status === 'cancelled' ? {textDecoration:'line-through',color:'var(--t4)'} : {}}>
                          {inv.client}
                        </span>
                      </div>
                    </td>
                    <td className={inv.status === 'cancelled' ? 'r' : 'e'}
                      style={inv.status === 'cancelled' ? {textDecoration:'line-through'} : {}}>
                      {inv.amount}
                    </td>
                    <td className="m" style={{color:'var(--t4)'}}>{inv.tva}</td>
                    <td>{statusBadge(inv.status)}</td>
                    <td style={{fontSize:'11.5px',color:'var(--t4)'}}>{inv.date}</td>
                    <td>
                      <button className="btn btn-xs">
                        <span className="ic ic-xs">
                          <i className={`ti ${actionIcon(inv.action)}`}/>
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right column */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Stock alerts */}
          <Card
            padding={14}
            title={
              <>
                <span className="ic ic-sm" style={{color:'var(--red)'}}>
                  <i className="ti ti-alert-triangle"/>
                </span>
                تنبيهات المخزون
              </>
            }
            actions={<Badge variant="danger">5</Badge>}
          >
            {STOCK_ALERTS.map(({ name, qty, level, status }) => (
              <div className="sr" key={name}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'12.5px',fontWeight:700,color:'var(--t1)'}}>{name}</div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                    <ProgressBar
                      value={level}
                      color={status === 'out' ? 'var(--red)' : 'var(--gold)'}
                      height={4}
                    />
                    <span style={{
                      fontSize:'10.5px',
                      color: status === 'out' ? 'var(--red)' : 'var(--gold)',
                      minWidth:44,
                    }}>
                      {qty}
                    </span>
                  </div>
                </div>
                <Badge variant={status === 'out' ? 'danger' : 'warning'}>
                  {status === 'out' ? 'نفد' : 'منخفض'}
                </Badge>
              </div>
            ))}
            <Button
              variant="danger" size="sm" fullWidth
              icon={<i className="ti ti-arrow-left"/>}
              style={{marginTop:10}}
              onClick={() => navigate('/dashboard/inventory')}
            >
              إدارة المخزون
            </Button>
          </Card>

          {/* Activity timeline */}
          <Card
            padding={14}
            title={
              <>
                <span className="ic ic-sm" style={{color:'var(--teal)'}}>
                  <i className="ti ti-clock"/>
                </span>
                آخر الأحداث
              </>
            }
          >
            <div className="tl">
              {ACTIVITIES.map((a, i) => (
                <div className="tl-i" key={i}>
                  <div className={`tl-d ${a.dot}`} />
                  <div className="tl-t">{a.time}</div>
                  <div className="tl-x">{a.text}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* TVA quick card */}
          <Card
            padding={14}
            style={{
              background: 'linear-gradient(135deg,var(--emb),rgba(10,138,92,.04))',
              borderColor: 'var(--embo)',
            }}
            noHeader
          >
            <div style={{fontSize:12,fontWeight:700,color:'var(--em)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
              <i className="ti ti-landmark"/> TVA مستحقة — أفريل 2024
            </div>
            <div className="sr">
              <div className="sr-l">TVA محصّلة</div>
              <div className="sr-v" style={{color:'var(--gold)'}}>237,196 دج</div>
            </div>
            <div className="sr">
              <div className="sr-l">TVA مستردة</div>
              <div className="sr-v" style={{color:'var(--blue)'}}>− 46,588 دج</div>
            </div>
            <div className="sr" style={{borderTop:'1px solid var(--embo)',paddingTop:8,marginTop:4}}>
              <div className="sr-l" style={{fontWeight:800,color:'var(--red)'}}>المستحق للدولة</div>
              <div className="sr-v" style={{color:'var(--red)',fontSize:16}}>190,608 دج</div>
            </div>
            <div style={{
              fontSize:'10.5px',color:'var(--em)',marginTop:8,
              padding:'6px 10px',background:'rgba(10,138,92,.08)',borderRadius:6,
            }}>
              ⏰ الاستحقاق: 20 ماي 2024 — G50
            </div>
            <Button
              variant="primary" size="sm" fullWidth
              icon={<i className="ti ti-calculator"/>}
              style={{marginTop:10}}
              onClick={() => navigate('/dashboard/tva')}
            >
              إقرار G50
            </Button>
          </Card>
        </div>
      </div>

    </div>
  );
}
```

## FILE: resources/js/pages/debts/DebtsPage.tsx
```
// resources/js/pages/debts/DebtsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import ProgressBar from '@/components/ui/ProgressBar';
import Avatar from '@/components/ui/Avatar';
import apiClient from '@/lib/api/client';
import type { CommercialDocument } from '@/types';

export default function DebtsPage() {
    const [activeTab, setActiveTab] = useState<'unpaid' | 'overdue'>('unpaid');
    const [search, setSearch] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<CommercialDocument | null>(null);
    const detailModal = useModal();
    const qc = useQueryClient();

    // جلب الفواتير غير المدفوعة
    const { data: unpaidDocs, isLoading: loadingUnpaid } = useQuery({
        queryKey: ['debts', 'unpaid', search],
        queryFn: () => apiClient.get('/commercial-documents/unpaid', {
            params: { search: search || undefined }
        }).then(r => r.data.data || []),
    });

    // جلب الفواتير المتأخرة
    const { data: overdueDocs, isLoading: loadingOverdue } = useQuery({
        queryKey: ['debts', 'overdue', search],
        queryFn: () => apiClient.get('/commercial-documents/overdue', {
            params: { search: search || undefined }
        }).then(r => r.data.data || []),
    });

    const docs = activeTab === 'unpaid' ? (unpaidDocs || []) : (overdueDocs || []);
    const totalAmount = docs.reduce((sum: number, doc: CommercialDocument) => sum + doc.amount_remaining, 0);
    const totalTTC = docs.reduce((sum: number, doc: CommercialDocument) => sum + doc.total_ttc, 0);
    const clientsCount = new Set(docs.filter((d: CommercialDocument) => d.party_id).map((d: CommercialDocument) => d.party_id)).size;

    const viewDetail = (doc: CommercialDocument) => {
        setSelectedDoc(doc);
        detailModal.openModal();
    };

    return (
        <div className="page on" id="p-debts">
            <PageHeader
                title="الديون والمستحقات"
                subtitle="متابعة الفواتير غير المدفوعة والمتأخرة"
                actions={
                    <>
                        <Button size="sm" icon={<i className="ti ti-download"/>}>تصدير</Button>
                        <Button size="sm" icon={<i className="ti ti-printer"/>}>طباعة</Button>
                    </>
                }
            />

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard
                    variant="red" icon="ti-cash" label="إجمالي الديون"
                    value={totalAmount.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                    sub={`${docs.length} مستند`}
                />
                <KpiCard
                    variant={activeTab === 'overdue' ? 'red' : 'gold'} icon="ti-clock"
                    label={activeTab === 'overdue' ? 'متأخرة' : 'معلقة'}
                    value={docs.length}
                    sub={`${clientsCount} زبون`}
                />
                <KpiCard
                    variant="blue" icon="ti-file-invoice" label="إجمالي TTC"
                    value={totalTTC.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                />
                <KpiCard
                    variant="purple" icon="ti-percentage" label="نسبة التحصيل"
                    value={`${totalTTC > 0 ? Math.round((1 - totalAmount / totalTTC) * 100) : 0}%`}
                    sub="من إجمالي المستحقات"
                />
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 16 }}>
                <div className={`tab ${activeTab === 'unpaid' ? 'on' : ''}`} onClick={() => setActiveTab('unpaid')}>
                    <span className="ic ic-xs"><i className="ti ti-file-text"/></span>
                    غير مدفوعة {unpaidDocs ? `(${unpaidDocs.length})` : ''}
                </div>
                <div className={`tab ${activeTab === 'overdue' ? 'on' : ''}`} onClick={() => setActiveTab('overdue')}>
                    <span className="ic ic-xs"><i className="ti ti-alert-triangle"/></span>
                    متأخرة {overdueDocs ? `(${overdueDocs.length})` : ''}
                </div>
            </div>

            {/* Search */}
            <div className="filters" style={{ marginBottom: 16 }}>
                <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
                    <input
                        type="text"
                        placeholder="ابحث برقم الفاتورة أو اسم الزبون..."
                        style={{ width: '100%' }}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            {(activeTab === 'unpaid' ? loadingUnpaid : loadingOverdue) ? (
                <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
            ) : docs.length === 0 ? (
                <EmptyState
                    icon="ti-receipt"
                    text={activeTab === 'unpaid' ? 'لا توجد فواتير غير مدفوعة' : 'لا توجد فواتير متأخرة'}
                    sub="جميع المدفوعات مكتملة"
                />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>رقم الفاتورة</th>
                                    <th>الزبون</th>
                                    <th>TTC</th>
                                    <th>المدفوع</th>
                                    <th>المتبقي</th>
                                    <th>نسبة التحصيل</th>
                                    <th>تاريخ الاستحقاق</th>
                                    <th>الحالة</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {docs.map((doc: CommercialDocument, i: number) => {
                                    const isOverdue = doc.due_date && new Date(doc.due_date) < new Date();
                                    const percentPaid = doc.total_ttc > 0
                                        ? Math.round((doc.amount_paid / doc.total_ttc) * 100)
                                        : 0;
                                    return (
                                        <tr key={doc.id} onClick={() => viewDetail(doc)} style={{ cursor: 'pointer' }}>
                                            <td className="m">{doc.document_number}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <Avatar
                                                        initials={doc.party?.name?.[0] || '?'}
                                                        color={((i % 7) + 1) as 1|2|3|4|5|6|7}
                                                        size={26}
                                                    />
                                                    <span className="s">{doc.party?.name || 'عابر'}</span>
                                                </div>
                                            </td>
                                            <td className="e">{doc.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                            <td style={{ color: 'var(--em)', fontFamily: 'monospace' }}>
                                                {doc.amount_paid.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                                            </td>
                                            <td className="r">{doc.amount_remaining.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <ProgressBar
                                                        value={percentPaid}
                                                        color={percentPaid > 50 ? 'var(--em)' : 'var(--red)'}
                                                        height={5}
                                                    />
                                                    <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 32 }}>
                                                        {percentPaid}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{
                                                fontSize: 12,
                                                color: isOverdue ? 'var(--red)' : 'var(--t4)',
                                                fontWeight: isOverdue ? 700 : 400
                                            }}>
                                                {doc.due_date
                                                    ? new Date(doc.due_date).toLocaleDateString('fr-DZ')
                                                    : '—'}
                                            </td>
                                            <td>
                                                <Badge variant={isOverdue ? 'danger' : doc.status === 'partial' ? 'warning' : 'info'}>
                                                    {isOverdue ? 'متأخرة' : doc.status === 'partial' ? 'جزئية' : 'معلقة'}
                                                </Badge>
                                            </td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: 3 }}>
                                                    <Button size="xs" variant="primary" icon={<i className="ti ti-cash"/>}>
                                                        تحصيل
                                                    </Button>
                                                    <Button size="xs" icon={<i className="ti ti-eye"/>} onClick={() => viewDetail(doc)}/>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Detail Modal */}
            <DebtDetailModal
                open={detailModal.open}
                doc={selectedDoc}
                onClose={detailModal.closeModal}
            />
        </div>
    );
}

// ===============================================
// Debt Detail Modal
// ===============================================
function DebtDetailModal({ open, doc, onClose }: {
    open: boolean;
    doc: CommercialDocument | null;
    onClose: () => void;
}) {
    if (!doc) return null;

    const isOverdue = doc.due_date && new Date(doc.due_date) < new Date();
    const percentPaid = doc.total_ttc > 0 ? Math.round((doc.amount_paid / doc.total_ttc) * 100) : 0;
    const daysLate = doc.due_date
        ? Math.floor((new Date().getTime() - new Date(doc.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <Modal
            open={open} onClose={onClose} size="md"
            title={`تفاصيل — ${doc.document_number}`}
            subtitle={doc.party?.name || 'زبون عابر'}
            footer={
                <>
                    <Button onClick={onClose}>إغلاق</Button>
                    <Button variant="primary" icon={<i className="ti ti-cash"/>}>تسجيل دفعة</Button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Status */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: isOverdue ? 'var(--redb)' : 'var(--goldb)',
                    border: `1px solid ${isOverdue ? 'var(--redbo)' : 'var(--goldbo)'}`,
                    borderRadius: 'var(--r2)'
                }}>
                    <span className="ic ic-sm" style={{ color: isOverdue ? 'var(--red)' : 'var(--gold)' }}>
                        <i className={`ti ${isOverdue ? 'ti-alert-triangle' : 'ti-clock'}`}/>
                    </span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>
                            {isOverdue ? `متأخرة بـ ${daysLate} يوم` : 'معلقة'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                            تاريخ الاستحقاق: {doc.due_date ? new Date(doc.due_date).toLocaleDateString('ar-DZ') : 'غير محدد'}
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                        { label: 'الإجمالي TTC', value: doc.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }), color: 'var(--em)' },
                        { label: 'المدفوع', value: doc.amount_paid.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }), color: 'var(--em)' },
                        { label: 'المتبقي', value: doc.amount_remaining.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }), color: 'var(--red)' },
                        { label: 'TVA', value: doc.total_tva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }), color: 'var(--t3)' },
                    ].map(item => (
                        <div key={item.label} style={{
                            padding: 10, background: 'var(--bg3)', borderRadius: 'var(--r2)',
                            border: '1px solid var(--b1)'
                        }}>
                            <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontWeight: 700, color: item.color }}>{item.value} دج</div>
                        </div>
                    ))}
                </div>

                {/* Progress */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: 'var(--t3)' }}>نسبة التحصيل</span>
                        <span style={{ fontWeight: 700, color: percentPaid > 50 ? 'var(--em)' : 'var(--red)' }}>{percentPaid}%</span>
                    </div>
                    <ProgressBar value={percentPaid} color={percentPaid > 50 ? 'var(--em)' : 'var(--red)'} height={8} />
                </div>

                {/* Dates */}
                <div>
                    {[
                        { label: 'تاريخ الفاتورة', value: new Date(doc.document_date).toLocaleDateString('ar-DZ') },
                        { label: 'تاريخ الاستحقاق', value: doc.due_date ? new Date(doc.due_date).toLocaleDateString('ar-DZ') : '—' },
                        { label: 'تاريخ الإنشاء', value: new Date(doc.created_at).toLocaleDateString('ar-DZ') },
                    ].map(row => (
                        <div key={row.label} className="sr">
                            <span className="sr-l">{row.label}</span>
                            <span className="sr-v">{row.value}</span>
                        </div>
                    ))}
                </div>

                {/* Client Info */}
                {doc.party && (
                    <div style={{
                        padding: 12, background: 'var(--bg3)', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b1)'
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 8 }}>
                            معلومات الزبون
                        </div>
                        <div className="sr">
                            <span className="sr-l">الاسم</span>
                            <span className="sr-v">{doc.party.name}</span>
                        </div>
                        {doc.party.phone && (
                            <div className="sr">
                                <span className="sr-l">الهاتف</span>
                                <span className="sr-v">{doc.party.phone}</span>
                            </div>
                        )}
                        {doc.party.nif && (
                            <div className="sr">
                                <span className="sr-l">NIF</span>
                                <span className="sr-v" style={{ fontFamily: 'monospace', fontSize: 12 }}>{doc.party.nif}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
```

## FILE: resources/js/pages/documents/CommercialDocumentModal.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/documents/CommercialDocumentModal.tsx
// Modal إنشاء/تعديل المستند التجاري — نسخة محسّنة
// ════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type { DocumentType } from '@/types';

// ── Algerian fiscal stamp rules (LF 2024) ─────
function calcFiscalStamp(totalTtc: number): number {
  if (totalTtc <= 0) return 0;
  if (totalTtc < 30_000) return 0;
  return Math.min(Math.ceil(totalTtc * 0.01), 2_500);
}

// ── Types ──────────────────────────────────────
interface LineItem {
  id?:                   number;
  product_id:    string;
  description:           string;
  quantity:              number;
  unit_price_ht:         number;
  discount_percentage:   number;
  tva_rate:              number;
  _variantName?:         string;
  _productName?:         string;
  _unitSymbol?:          string;
}

interface FormState {
  party_id:       string;
  document_date:  string;
  due_date:       string;
  notes:          string;
  warehouse_id:   string;
  fiscal_year_id: string;
  currency_id:    string;
  exchange_rate:  string;
  apply_stamp:    boolean;
  lines:          LineItem[];
}

// ── Helpers ────────────────────────────────────
function inpStyle(err?: boolean): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg1)', color: 'var(--t1)',
    fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
  };
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {children}
      {required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
    </label>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        paddingBottom: 8, borderBottom: '1px solid var(--b1)',
      }}>
        <i className={`ti ${icon}`} style={{ color: 'var(--em)', fontSize: 15 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════
// Modal Component
// ════════════════════════════════════════════════
interface Props {
  open:              boolean;
  documentType:      DocumentType | null;
  existingDocument?: any;
  onClose:           () => void;
  onSaved:           () => void;
}

export default function CommercialDocumentModal({ open, documentType, existingDocument, onClose, onSaved }: Props) {
  const isEdit   = !!existingDocument;
  const qc       = useQueryClient();
  const { selectedYear } = useFiscalYear() as any;
  const isPurch  = documentType?.document_base_operation_id === 2;
  const needsParty = documentType?.requires_party !== false;

  // ── جلب الأطراف (زبائن / موردين) ──────────────────
  const { data: parties = [] } = useQuery({
    queryKey: ['parties-select', isPurch],
    queryFn:  () => apiClient.get(isPurch ? '/suppliers' : '/customers', { params: { per_page: 500 } })
      .then(r => extractList(r.data)),
    enabled: open && needsParty,
    staleTime: 60_000,
  });

  // ── جلب المنتجات (بدون include product.unit لتجنب 500 مؤقتاً) ──
  const { data: variantsRaw = [], isLoading: isLoadingVariants, error: variantsError, refetch: refetchVariants } = useQuery({
    queryKey: ['variants-select'],
    queryFn:  () => apiClient.get('/product-variants', { params: { per_page: 500, include: 'product' } })
      .then(r => extractList(r.data)),
    enabled: open,
    staleTime: 60_000,
    retry: 1,
  });
  const variants = variantsRaw;
  const hasVariantsError = !!variantsError;

  // ── باقي الجداول المساعدة ─────────────────────────
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-select'],
    queryFn:  () => apiClient.get('/warehouses', { params: { per_page: 100 } }).then(r => extractList(r.data)),
    enabled: open,
    staleTime: 120_000,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies-select'],
    queryFn:  () => apiClient.get('/currencies', { params: { per_page: 50 } }).then(r => extractList(r.data)),
    enabled: open,
    staleTime: 300_000,
  });

  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['fiscal-years-select'],
    queryFn:  () => apiClient.get('/fiscal-years', { params: { per_page: 20, 'filter[is_closed]': 0 } }).then(r => extractList(r.data)),
    enabled: open,
    staleTime: 60_000,
  });

  const { data: tvaRates = [] } = useQuery({
    queryKey: ['tvas-select'],
    queryFn:  () => apiClient.get('/tvas', { params: { per_page: 20 } }).then(r => extractList(r.data)),
    enabled: open,
    staleTime: 300_000,
  });

  // ── استخراج القيم الافتراضية باستخدام useMemo (لتجنب الحلقات اللانهائية) ──
  const baseCurrencyId = useMemo(() => {
    const base = currencies.find((c: any) => c.is_base_currency) ?? currencies[0];
    return base ? String(base.id) : '';
  }, [currencies]);

  const defaultWhId = useMemo(() => {
    return warehouses[0] ? String(warehouses[0].id) : '';
  }, [warehouses]);

  const selectedYearId = useMemo(() => selectedYear?.id ? String(selectedYear.id) : '', [selectedYear]);

  // ── حالة النموذج ────────────────────────────────
  const [form,    setForm]    = useState<FormState>(() => buildDefault());
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [apiErr,  setApiErr]  = useState('');
  const [lineErr, setLineErr] = useState('');

  function buildDefault(): FormState {
    if (existingDocument) {
      return {
        party_id:       String(existingDocument.party_id       ?? ''),
        document_date:  existingDocument.document_date         ?? today(),
        due_date:       existingDocument.due_date              ?? '',
        notes:          existingDocument.notes                 ?? '',
        warehouse_id:   String(existingDocument.warehouse_id   ?? ''),
        fiscal_year_id: String(existingDocument.fiscal_year_id ?? ''),
        currency_id:    String(existingDocument.currency_id    ?? ''),
        exchange_rate:  String(existingDocument.exchange_rate  ?? '1'),
        apply_stamp:    parseFloat(existingDocument.total_stamp ?? 0) > 0,
        lines:          (existingDocument.lines ?? []).map((l: any) => ({
          id:                  l.id,
          product_id:  String(l.product_id ?? ''),
          description:         l.description ?? '',
          quantity:            parseFloat(l.quantity) || 1,
          unit_price_ht:       parseFloat(l.unit_price_ht) || 0,
          discount_percentage: parseFloat(l.discount_percentage) || 0,
          tva_rate:            parseFloat(l.tva_rate) || 19,
          _productName:        l.product_variant?.product?.name,
          _variantName:        l.product_variant?.variant_name,
        })),
      };
    }
    return {
      party_id:       '',
      document_date:  today(),
      due_date:       '',
      notes:          '',
      warehouse_id:   '',
      fiscal_year_id: selectedYearId,
      currency_id:    '',
      exchange_rate:  '1',
      apply_stamp:    false,
      lines:          [],
    };
  }

  // تعبئة القيم الافتراضية للحقول غير المعبأة (للمستند الجديد فقط)
  useEffect(() => {
    if (!isEdit && open) {
      setForm(f => ({
        ...f,
        warehouse_id:   f.warehouse_id   || defaultWhId,
        currency_id:    f.currency_id    || baseCurrencyId,
        fiscal_year_id: f.fiscal_year_id || selectedYearId,
      }));
    }
  }, [defaultWhId, baseCurrencyId, selectedYearId, isEdit, open]);

  // إعادة تعيين النموذج عند فتح الـ modal أو تغيير المستند الموجود
  useEffect(() => {
    if (open) {
      setForm(buildDefault());
      setErrors({});
      setApiErr('');
      setLineErr('');
    }
  }, [open, existingDocument?.id]);

  const set = useCallback((k: keyof FormState, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }));
  }, [errors]);

  // ── دوال الأسطر ──────────────────────────────────
  const addLine = useCallback(() => {
    const defaultTva = tvaRates.find((t: any) => t.is_default)?.rate ?? 19;
    setForm(f => ({
      ...f,
      lines: [...f.lines, {
        product_id: '', description: '',
        quantity: 1, unit_price_ht: 0,
        discount_percentage: 0, tva_rate: defaultTva,
      }],
    }));
    setLineErr('');
  }, [tvaRates]);

  const updateLine = useCallback((idx: number, field: keyof LineItem, value: any) => {
    setForm(f => {
      const lines = [...f.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      if (field === 'product_id' && value) {
        const v = variants.find((vr: any) => String(vr.id) === String(value));
        if (v) {
          lines[idx]._productName = v.product?.name ?? '';
          lines[idx]._variantName = v.variant_name ?? '';
          lines[idx]._unitSymbol = v.product?.unit?.symbol ?? '';
          if (!lines[idx].unit_price_ht || lines[idx].unit_price_ht === 0) {
            lines[idx].unit_price_ht = parseFloat(v.price_ht ?? v.prix_detail ?? 0);
          }
          if (v.tva_rate) lines[idx].tva_rate = parseFloat(v.tva_rate);
        }
      }
      return { ...f, lines };
    });
  }, [variants]);

  const removeLine = useCallback((idx: number) => {
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }, []);

  // ── حساب الإجماليات ─────────────────────────────
  const totals = useMemo(() => {
    let ht = 0, tva = 0, discount = 0;
    form.lines.forEach(l => {
      const gross = (l.unit_price_ht || 0) * (l.quantity || 0);
      const disc = gross * ((l.discount_percentage || 0) / 100);
      const net = gross - disc;
      ht += net;
      tva += net * ((l.tva_rate || 0) / 100);
      discount += disc;
    });
    const ttc = ht + tva;
    const stamp = form.apply_stamp ? calcFiscalStamp(ttc) : 0;
    return { ht, tva, ttc, discount, stamp, netToPay: ttc + stamp };
  }, [form.lines, form.apply_stamp]);

  // ── التحقق من صحة البيانات ───────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (needsParty && !form.party_id) errs.party_id = 'هذا الحقل إلزامي';
    if (!form.document_date) errs.document_date = 'هذا الحقل إلزامي';
    if (!form.warehouse_id) errs.warehouse_id = 'اختر مستودعاً';
    if (!form.fiscal_year_id) errs.fiscal_year_id = 'اختر السنة المالية';
    if (!form.currency_id) errs.currency_id = 'اختر العملة';
    if (form.lines.length === 0) {
      setLineErr('يجب إضافة سطر واحد على الأقل');
      return false;
    }
    for (let i = 0; i < form.lines.length; i++) {
      if (!form.lines[i].product_id) {
        setLineErr(`السطر ${i + 1}: اختر منتجاً`);
        return false;
      }
      if (!form.lines[i].quantity || form.lines[i].quantity <= 0) {
        setLineErr(`السطر ${i + 1}: الكمية يجب أن تكون أكبر من صفر`);
        return false;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, needsParty]);

  // ── حفظ المستند ─────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        document_type_id: documentType?.id,
        party_id: needsParty && form.party_id ? parseInt(form.party_id) : null,
        warehouse_id: parseInt(form.warehouse_id),
        fiscal_year_id: parseInt(form.fiscal_year_id),
        currency_id: parseInt(form.currency_id),
        exchange_rate: parseFloat(form.exchange_rate) || 1,
        document_date: form.document_date,
        due_date: form.due_date || null,
        notes: form.notes || null,
        total_discount: totals.discount,
        total_stamp: totals.stamp,
        lines: form.lines.map(l => ({
          ...(l.id ? { id: l.id } : {}),
          product_id: parseInt(l.product_id),
          description: l.description || null,
          quantity: l.quantity,
          unit_price_ht: l.unit_price_ht,
          tva_rate: l.tva_rate,
          discount_percentage: l.discount_percentage || 0,
        })),
      };
      if (isEdit)
        return apiClient.put(`/commercial-documents/${existingDocument.id}`, payload);
      return apiClient.post('/commercial-documents', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commercial-documents'] });
      onSaved();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? e?.response?.data?.errors
        ? Object.values(e.response.data.errors).flat().join(' | ')
        : 'فشل الحفظ';
      setApiErr(String(msg));
    },
  });

  const handleSave = useCallback(() => {
    setApiErr('');
    if (validate()) saveMut.mutate();
  }, [validate, saveMut]);

  if (!open) return null;

  const isPending = saveMut.isPending;
  const disableForm = isPending || isLoadingVariants;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '20px 16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 920,
          background: 'var(--bg1)', borderRadius: 'var(--r3)',
          boxShadow: '0 24px 64px rgba(0,0,0,.25)',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg2)', borderRadius: 'var(--r3) var(--r3) 0 0',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>
              {isEdit ? `تعديل ${documentType?.name}` : `${documentType?.name} جديد`}
            </div>
            {documentType?.name_latin && (
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                {documentType.name_latin} — {documentType.code}
              </div>
            )}
          </div>
          <button onClick={onClose} disabled={isPending} style={{
            width: 30, height: 30, borderRadius: 8,
            border: '1px solid var(--b2)', background: 'var(--bg1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isPending ? 'not-allowed' : 'pointer',
            color: 'var(--t3)',
          }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* API Error */}
          {apiErr && (
            <div style={{
              padding: '10px 14px', marginBottom: 16, borderRadius: 'var(--r2)',
              background: 'var(--redb)', border: '1px solid var(--redbo)',
              color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <i className="ti ti-alert-circle" />{apiErr}
            </div>
          )}

          {/* ── Section: الأساسيات ─────────────── */}
          <Section title="معلومات المستند" icon="ti-file-description">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {needsParty && (
                <div style={{ gridColumn: 'span 2' }}>
                  <Label required>{isPurch ? 'المورد' : 'الزبون'}</Label>
                  <select
                    value={form.party_id}
                    onChange={e => set('party_id', e.target.value)}
                    style={{ ...inpStyle(!!errors.party_id), cursor: 'pointer' }}
                    disabled={disableForm}
                  >
                    <option value="">— اختر {isPurch ? 'مورداً' : 'زبوناً'} —</option>
                    {parties.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {errors.party_id && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>{errors.party_id}</div>}
                </div>
              )}

              <div>
                <Label required>تاريخ المستند</Label>
                <input type="date" style={inpStyle(!!errors.document_date)}
                  value={form.document_date} onChange={e => set('document_date', e.target.value)} disabled={disableForm} />
              </div>
              <div>
                <Label>تاريخ الاستحقاق</Label>
                <input type="date" style={inpStyle()}
                  value={form.due_date} onChange={e => set('due_date', e.target.value)} disabled={disableForm} />
              </div>
              <div>
                <Label required>المستودع</Label>
                <select style={{ ...inpStyle(!!errors.warehouse_id), cursor: 'pointer' }}
                  value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)} disabled={disableForm}>
                  <option value="">— اختر —</option>
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={String(w.id)}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label required>السنة المالية</Label>
                <select style={{ ...inpStyle(!!errors.fiscal_year_id), cursor: 'pointer' }}
                  value={form.fiscal_year_id} onChange={e => set('fiscal_year_id', e.target.value)} disabled={disableForm}>
                  <option value="">— اختر —</option>
                  {fiscalYears.map((fy: any) => (
                    <option key={fy.id} value={String(fy.id)}>
                      {fy.name} {fy.is_current ? '★' : ''}{fy.is_closed ? ' (مقفلة)' : ''}
                    </option>
                  ))}
                </select>
                {errors.fiscal_year_id && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>{errors.fiscal_year_id}</div>}
              </div>
              <div>
                <Label required>العملة</Label>
                <select style={{ ...inpStyle(!!errors.currency_id), cursor: 'pointer' }}
                  value={form.currency_id} onChange={e => set('currency_id', e.target.value)} disabled={disableForm}>
                  <option value="">— اختر —</option>
                  {currencies.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>سعر الصرف</Label>
                <input type="number" step="0.0001" min="0" style={inpStyle()}
                  value={form.exchange_rate}
                  onChange={e => set('exchange_rate', e.target.value)} disabled={disableForm} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Label>ملاحظات</Label>
              <textarea style={{ ...inpStyle(), resize: 'vertical' }} rows={2}
                value={form.notes}
                placeholder="ملاحظات اختيارية..."
                onChange={e => set('notes', e.target.value)} disabled={disableForm} />
            </div>
          </Section>

          {/* ── Section: الأسطر ────────────────── */}
          <Section title="أسطر المستند" icon="ti-list-details">
            {lineErr && (
              <div style={{
                padding: '8px 12px', marginBottom: 10, borderRadius: 'var(--r2)',
                background: 'var(--redb)', color: 'var(--red)',
                fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center',
              }}>
                <i className="ti ti-alert-circle" />{lineErr}
              </div>
            )}

            {isLoadingVariants ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--t4)' }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جاري تحميل المنتجات...
              </div>
            ) : hasVariantsError ? (
              <div style={{ padding: '10px 14px', marginBottom: 10, borderRadius: 'var(--r2)', background: 'var(--redb)', color: 'var(--red)', fontSize: 12 }}>
                <i className="ti ti-alert-circle" /> فشل تحميل قائمة المنتجات.
                <button onClick={() => refetchVariants()} style={{ background: 'none', border: 'none', color: 'var(--red)', textDecoration: 'underline', cursor: 'pointer', marginRight: 8 }}>
                  إعادة المحاولة
                </button>
              </div>
            ) : variants.length === 0 && !isLoadingVariants ? (
              <div style={{ padding: '10px 14px', marginBottom: 10, borderRadius: 'var(--r2)', background: 'var(--goldb)', color: 'var(--gold)', fontSize: 12 }}>
                <i className="ti ti-info-circle" /> لا توجد منتجات مسجلة. يرجى إضافة منتجات أولاً.
              </div>
            ) : null}

            <div className="tw" style={{ marginBottom: 10, opacity: isLoadingVariants ? 0.6 : 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th style={{ minWidth: 180 }}>المنتج</th>
                    <th style={{ width: 80 }}>الكمية</th>
                    <th style={{ width: 110 }}>سعر HT</th>
                    <th style={{ width: 80 }}>خصم %</th>
                    <th style={{ width: 80 }}>TVA %</th>
                    <th style={{ width: 120, textAlign: 'left' }}>إجمالي TTC</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => {
                    const gross = (line.unit_price_ht || 0) * (line.quantity || 0);
                    const disc = gross * ((line.discount_percentage || 0) / 100);
                    const net = gross - disc;
                    const lineTtc = net + net * ((line.tva_rate || 0) / 100);
                    return (
                      <tr key={idx}>
                        <td style={{ color: 'var(--t4)', fontSize: 11, textAlign: 'center' }}>{idx + 1}</td>
                        <td>
                          <select
                            value={line.product_id}
                            onChange={e => updateLine(idx, 'product_id', e.target.value)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}
                            disabled={isLoadingVariants || variants.length === 0 || isPending}
                          >
                            <option value="">— اختر منتجاً —</option>
                            {variants.map((v: any) => (
                              <option key={v.id} value={v.id}>
                                {v.product?.name ?? v.name}{v.variant_name ? ` — ${v.variant_name}` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input type="number" min="0" step="0.001"
                            value={line.quantity}
                            onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none', textAlign: 'center' }}
                            disabled={isPending}
                          />
                        </td>
                        <td>
                          <input type="number" min="0" step="0.01"
                            value={line.unit_price_ht}
                            onChange={e => updateLine(idx, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none', textAlign: 'right', direction: 'ltr' }}
                            disabled={isPending}
                          />
                        </td>
                        <td>
                          <input type="number" min="0" max="100" step="0.01"
                            value={line.discount_percentage}
                            onChange={e => updateLine(idx, 'discount_percentage', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none', textAlign: 'center' }}
                            disabled={isPending}
                          />
                        </td>
                        <td>
                          <select
                            value={line.tva_rate}
                            onChange={e => updateLine(idx, 'tva_rate', parseFloat(e.target.value))}
                            style={{ width: '100%', padding: '5px 4px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}
                            disabled={isPending}
                          >
                            {tvaRates.length > 0
                              ? tvaRates.map((t: any) => (
                                  <option key={t.id} value={t.rate}>{t.rate}%</option>
                                ))
                              : [0, 9, 19].map(r => <option key={r} value={r}>{r}%</option>)
                            }
                          </select>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--em)', direction: 'ltr', textAlign: 'right', fontSize: 13 }}>
                          {lineTtc.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td>
                          <button
                            onClick={() => removeLine(idx)}
                            style={{
                              width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
                              border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)',
                              background: 'color-mix(in srgb, var(--red) 8%, transparent)',
                              color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            disabled={isPending}
                          >
                            <i className="ti ti-trash" style={{ fontSize: 12 }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              onClick={addLine}
              disabled={isLoadingVariants || isPending || (variants.length === 0 && !hasVariantsError)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 'var(--r2)',
                border: '1px dashed var(--b3)', background: 'transparent',
                color: 'var(--em)', fontSize: 13, fontWeight: 600,
                cursor: (isLoadingVariants || isPending || (variants.length === 0 && !hasVariantsError)) ? 'not-allowed' : 'pointer',
                fontFamily: 'Tajawal, sans-serif',
                transition: 'all .15s', opacity: (isLoadingVariants || isPending || (variants.length === 0 && !hasVariantsError)) ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!isLoadingVariants && !isPending && variants.length > 0) (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--em) 6%, transparent)'; }}
              onMouseLeave={e => { if (!isLoadingVariants && !isPending && variants.length > 0) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <i className="ti ti-plus" style={{ fontSize: 14 }} />
              إضافة سطر
            </button>
          </Section>

          {/* ── Section: المجاميع ──────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            {/* Stamp toggle */}
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--r2)',
              background: 'var(--bg2)', border: '1px solid var(--b1)',
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: disableForm ? 0.6 : 1,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>الطابع الجبائي</div>
                <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                  {totals.ttc >= 30_000 ? `1% من TTC — سقف 2500 دج` : 'يُطبَّق للمبالغ ≥ 30,000 دج'}
                </div>
              </div>
              <div
                onClick={() => !disableForm && set('apply_stamp', !form.apply_stamp)}
                style={{
                  width: 44, height: 24, borderRadius: 12, cursor: disableForm ? 'not-allowed' : 'pointer',
                  background: form.apply_stamp ? 'var(--em)' : 'var(--b2)',
                  position: 'relative', transition: 'background .2s',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: form.apply_stamp ? 'calc(100% - 21px)' : 3,
                  transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                }} />
              </div>
            </div>

            {/* Totals box */}
            <div style={{ minWidth: 300, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: 'إجمالي HT', value: totals.ht, color: 'var(--t2)' },
                { label: 'TVA', value: totals.tva, color: 'var(--t3)' },
                totals.discount > 0 ? { label: 'إجمالي الخصم', value: -totals.discount, color: 'var(--red)' } : null,
                totals.stamp > 0 ? { label: 'الطابع الجبائي', value: totals.stamp, color: 'var(--orange)' } : null,
              ].filter(Boolean).map((row: any) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--t3)' }}>{row.label}</span>
                  <span style={{ color: row.color, fontWeight: 600, direction: 'ltr' }}>
                    {row.value < 0
                      ? `-${Math.abs(row.value).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}`
                      : row.value.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}
                    دج
                  </span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                paddingTop: 10, marginTop: 4, borderTop: '2px solid var(--b2)',
                fontSize: 16, fontWeight: 800,
              }}>
                <span style={{ color: 'var(--t1)' }}>الإجمالي TTC</span>
                <span style={{ color: 'var(--em)', direction: 'ltr' }}>
                  {totals.netToPay.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} دج
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────── */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--b1)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          background: 'var(--bg2)', borderRadius: '0 0 var(--r3) var(--r3)',
        }}>
          <button onClick={onClose} disabled={isPending} style={{
            padding: '8px 20px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b3)', background: 'var(--bg1)',
            color: 'var(--t2)', fontSize: 13, fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'Tajawal, sans-serif',
          }}>
            إلغاء
          </button>
          <button onClick={handleSave} disabled={isPending} style={{
            padding: '8px 24px', borderRadius: 'var(--r2)',
            border: 'none', background: isPending ? 'var(--b2)' : 'var(--em)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'Tajawal, sans-serif',
            display: 'flex', alignItems: 'center', gap: 7,
            transition: 'all .15s',
          }}>
            {isPending
              ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
              : <i className={`ti ${isEdit ? 'ti-check' : 'ti-plus'}`} />}
            {isPending ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء المستند'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Utils ──────────────────────────────────────
function extractList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.data)) return data.data.data;
  return [];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}
```

## FILE: resources/js/pages/documents/CommercialDocumentsPage.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/documents/CommercialDocumentsPage.tsx
// صفحة المستندات التجارية — نظام متكامل
// ════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { useFiscalYear } from '@/context/FiscalYearContext';
import CommercialDocumentModal from './CommercialDocumentModal';
import type { DocumentType } from '@/types';

// ── Status config ──────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: 'مسودة',           color: 'var(--t4)',     bg: 'var(--bg3)'   },
  pending:        { label: 'قيد الانتظار',     color: 'var(--orange)', bg: 'color-mix(in srgb, var(--orange) 12%, transparent)' },
  validated:      { label: 'معتمد',            color: 'var(--blue)',   bg: 'color-mix(in srgb, var(--blue) 12%, transparent)'   },
  partially_paid: { label: 'مدفوع جزئياً',    color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 12%, transparent)' },
  paid:           { label: 'مدفوع',            color: 'var(--em)',     bg: 'color-mix(in srgb, var(--em) 12%, transparent)'     },
  overdue:        { label: 'متأخر',            color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 12%, transparent)'    },
  cancelled:      { label: 'ملغي',             color: 'var(--red)',    bg: 'color-mix(in srgb, var(--red) 8%, transparent)'     },
  returned:       { label: 'مرتجع',            color: 'var(--purple)', bg: 'color-mix(in srgb, var(--purple) 10%, transparent)' },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function fmtNum(n?: number | string) {
  const v = parseFloat(String(n ?? 0));
  return isNaN(v) ? '—' : v.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' دج';
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: 'var(--t4)', bg: 'var(--bg3)' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

export default function CommercialDocumentsPage() {
  const { typeCode } = useParams<{ typeCode: string }>();
  const navigate     = useNavigate();
  const qc           = useQueryClient();
  const { selectedYear, isReadOnly } = useFiscalYear() as any;

  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState<'add' | 'edit' | 'view' | null>(null);
  const [activeDoc,  setActiveDoc]  = useState<any | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const { data: docType } = useQuery<DocumentType>({
    queryKey: ['document-type', typeCode],
    queryFn: () =>
      apiClient
        .get('/document-types', { params: { per_page: 500 } })
        .then((r) => {
          const list = r.data.data ?? [];
          return list.find((dt: any) => dt.code === typeCode) ?? null;
        }),
  });

  const { data: docs, isLoading, isFetching } = useQuery({
    queryKey: ['commercial-documents', typeCode, selectedYear?.id, search, statusFilter, page],
    queryFn: () =>
      apiClient.get('/commercial-documents', {
        params: {
          'filter[document_type_id]': docType?.id,
          'filter[fiscal_year_id]': selectedYear?.id,
          'filter[search]': search || undefined,
          'filter[document_status_id]': statusFilter || undefined,
          include: 'party,documentStatus,warehouse',
          sort: '-document_date',
          per_page: 15,
          page,
        },
      }).then(r => r.data),
    enabled: !!docType?.id && !!selectedYear?.id,
    placeholderData: keepPreviousData,
  });

  const items = docs?.data ?? [];
  const meta  = docs?.meta ?? {};
  const isPurch = docType?.document_base_operation_id === 2;

  const validateMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/commercial-documents/${id}/validate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial-documents'] }); showToast('تم اعتماد المستند بنجاح'); },
    onError:   (e: any) => showToast(e?.response?.data?.message ?? 'فشل الاعتماد', 'error'),
  });
  const lockMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/commercial-documents/${id}/lock`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial-documents'] }); showToast('تم قفل المستند'); },
    onError:   (e: any) => showToast(e?.response?.data?.message ?? 'فشل القفل', 'error'),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/commercial-documents/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial-documents'] }); showToast('تم إلغاء المستند'); },
    onError:   (e: any) => showToast(e?.response?.data?.message ?? 'فشل الإلغاء', 'error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/commercial-documents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercial-documents'] }); showToast('تم حذف المستند'); },
    onError:   (e: any) => showToast(e?.response?.data?.message ?? 'فشل الحذف', 'error'),
  });

  const opColor = isPurch ? 'var(--purple)' : 'var(--em)';
  const opIcon  = isPurch ? 'ti-shopping-cart' : 'ti-file-invoice';

  return (
    <div className="page on" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 22px', borderRadius: 'var(--r2)',
          background: toast.type === 'success' ? 'var(--em)' : 'var(--red)',
          color: '#fff', fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 24px rgba(0,0,0,.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className={`ti ${toast.type === 'success' ? 'ti-check' : 'ti-x'}`} />
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: `color-mix(in srgb, ${opColor} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${opColor} 25%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: opColor, fontSize: 20,
          }}>
            <i className={`ti ${opIcon}`} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--t1)' }}>
              {docType?.name ?? '...'}
              {docType?.name_latin && (
                <span style={{ fontSize: 12, color: 'var(--t4)', marginRight: 8, fontWeight: 400 }}>
                  {docType.name_latin}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>{meta.total ?? 0} مستند</span>
              {selectedYear && (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700,
                  background: 'color-mix(in srgb, var(--blue) 12%, transparent)',
                  color: 'var(--blue)',
                }}>{selectedYear.name}</span>
              )}
              {isReadOnly && (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700,
                  background: 'color-mix(in srgb, var(--red) 12%, transparent)',
                  color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <i className="ti ti-lock" style={{ fontSize: 9 }} /> للقراءة فقط
                </span>
              )}
            </div>
          </div>
        </div>
        {!isReadOnly && (
          <button className="btn btn-p" onClick={() => { setActiveDoc(null); setModal('add'); }}>
            <i className="ti ti-plus" /> {docType?.name ?? 'مستند'} جديد
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="srch" style={{ flex: '1 1 220px', maxWidth: 320 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input type="text" placeholder="بحث برقم المستند، اسم المتعامل..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{
          padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)',
          background: 'var(--bg1)', color: 'var(--t1)', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif',
          outline: 'none', cursor: 'pointer',
        }}>
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
        </select>
        <button className="btn" onClick={() => { setSearch(''); setStatus(''); setPage(1); }} title="إعادة الضبط">
          <i className="ti ti-refresh" />
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, gap: 10, color: 'var(--t3)' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 22, animation: 'spin .8s linear infinite' }} /> جارٍ تحميل المستندات...
          </div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 10, color: 'var(--t4)' }}>
            <i className="ti ti-file-off" style={{ fontSize: 40 }} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>لا توجد مستندات</div>
            <div style={{ fontSize: 12 }}>
              {search || statusFilter ? 'لا توجد نتائج تطابق البحث' : `لم يتم إنشاء أي ${docType?.name ?? 'مستند'} بعد`}
            </div>
            {!isReadOnly && !search && !statusFilter && (
              <button className="btn btn-p btn-sm" style={{ marginTop: 4 }} onClick={() => { setActiveDoc(null); setModal('add'); }}>
                <i className="ti ti-plus" /> إضافة أول مستند
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="tw" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th>رقم المستند</th><th>التاريخ</th><th>{isPurch ? 'المورد' : 'الزبون'}</th><th>المستودع</th><th>الإجمالي HT</th><th>TVA</th><th>الإجمالي TTC</th><th>الحالة</th><th style={{ textAlign: 'center', width: 130 }}>إجراءات</th></tr>
                </thead>
                <tbody>
                  {items.map((doc: any) => {
                    const status = doc.document_status?.name ?? 'draft';
                    const canEdit = !doc.is_locked && status === 'draft';
                    const canValid = !doc.validated_at && status === 'draft';
                    const canLock = !!doc.validated_at && !doc.is_locked;
                    const canCancel = !['cancelled', 'returned'].includes(status);
                    return (
                      <tr key={doc.id} style={{ cursor: 'pointer' }} onClick={() => { setActiveDoc(doc); setModal('view'); }}>
                        <td><span style={{ fontWeight: 800, color: opColor, fontFamily: 'monospace', fontSize: 13 }}>{doc.document_number ?? `#${doc.id}`}</span>{doc.is_locked && <i className="ti ti-lock" style={{ fontSize: 11, color: 'var(--t4)', marginRight: 6 }} />}</td>
                        <td style={{ color: 'var(--t3)', fontSize: 12 }}>{fmtDate(doc.document_date)}</td>
                        <td>{doc.party ? <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{doc.party.name}</span> : <span style={{ color: 'var(--t4)' }}>—</span>}</td>
                        <td style={{ color: 'var(--t3)', fontSize: 12 }}>{doc.warehouse?.name ?? '—'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--t2)', textAlign: 'left', direction: 'ltr' }}>{fmtNum(doc.total_ht)}</td>
                        <td style={{ color: 'var(--t4)', fontSize: 12, textAlign: 'left', direction: 'ltr' }}>{fmtNum(doc.total_tva)}</td>
                        <td style={{ fontWeight: 800, color: opColor, textAlign: 'left', direction: 'ltr' }}>{fmtNum(doc.total_ttc)}</td>
                        <td><StatusBadge status={status} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            {!isReadOnly && canEdit && <button className="btn btn-xs" title="تعديل" onClick={() => { setActiveDoc(doc); setModal('edit'); }}><i className="ti ti-pencil" /></button>}
                            {!isReadOnly && canValid && <button className="btn btn-xs" title="اعتماد" style={{ color: 'var(--blue)', borderColor: 'color-mix(in srgb, var(--blue) 30%, transparent)' }} onClick={() => validateMutation.mutate(doc.id)}><i className="ti ti-check" /></button>}
                            {!isReadOnly && canLock && <button className="btn btn-xs" title="قفل" style={{ color: 'var(--orange)', borderColor: 'color-mix(in srgb, var(--orange) 30%, transparent)' }} onClick={() => lockMutation.mutate(doc.id)}><i className="ti ti-lock" /></button>}
                            <button className="btn btn-xs" title="طباعة" style={{ color: 'var(--t4)' }}><i className="ti ti-printer" /></button>
                            {!isReadOnly && (canEdit ? <button className="btn btn-xs btn-r" title="حذف" onClick={() => { if(confirm('هل تريد حذف هذا المستند؟')) deleteMutation.mutate(doc.id); }}><i className="ti ti-trash" /></button> : canCancel ? <button className="btn btn-xs btn-r" title="إلغاء" onClick={() => { if(confirm('إلغاء هذا المستند؟')) cancelMutation.mutate(doc.id); }}><i className="ti ti-x" /></button> : null)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {meta.last_page > 1 && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-xs" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><i className="ti ti-chevron-right" /></button>
                  {Array.from({ length: Math.min(meta.last_page, 7) }, (_, i) => i + 1).map(p => (
                    <button key={p} className="btn btn-xs" style={page === p ? { background: 'var(--em)', color: '#fff', borderColor: 'var(--em)' } : {}} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="btn btn-xs" disabled={page >= meta.last_page} onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}><i className="ti ti-chevron-left" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <CommercialDocumentModal
          open={true}
          documentType={docType ?? null}
          existingDocument={modal === 'edit' ? activeDoc : undefined}
          onClose={() => { setModal(null); setActiveDoc(null); }}
          onSaved={() => {
            showToast(modal === 'add' ? 'تم إنشاء المستند بنجاح' : 'تم تحديث المستند بنجاح');
            setModal(null); setActiveDoc(null);
            qc.invalidateQueries({ queryKey: ['commercial-documents'] });
          }}
        />
      )}

      {modal === 'view' && activeDoc && (
        <DocumentViewModal
          doc={activeDoc}
          docType={docType ?? null}
          onClose={() => { setModal(null); setActiveDoc(null); }}
          onEdit={() => setModal('edit')}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
}

function DocumentViewModal({ doc, docType, onClose, onEdit, isReadOnly }: {
  doc: any; docType: DocumentType | null; onClose: () => void; onEdit: () => void; isReadOnly: boolean;
}) {
  const status = doc.document_status?.name ?? 'draft';
  const isPurch = docType?.document_base_operation_id === 2;
  const { data: fullDoc, isLoading } = useQuery({
    queryKey: ['commercial-document-detail', doc.id],
    queryFn: () => apiClient.get(`/commercial-documents/${doc.id}`, {
      params: { include: 'party,documentStatus,warehouse,fiscalYear,currency,lines,lines.productVariant,lines.productVariant.product,documentType,validatedBy' },
    }).then(r => r.data.data),
  });
  const d = fullDoc ?? doc;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 860, maxHeight: '92vh', overflow: 'auto', background: 'var(--bg1)', borderRadius: 'var(--r3)', boxShadow: '0 24px 64px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)' }}>{docType?.name} — {d.document_number ?? `#${d.id}`}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                <StatusBadge status={status} />
                {d.is_locked && <span style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-lock" style={{ fontSize: 11 }} /> مقفل</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {!isReadOnly && !d.is_locked && status === 'draft' && <button className="btn btn-sm" onClick={onEdit}><i className="ti ti-pencil" /> تعديل</button>}
            <button className="btn btn-sm" onClick={() => window.print()}><i className="ti ti-printer" /> طباعة</button>
            <button className="btn btn-sm btn-xs" onClick={onClose}><i className="ti ti-x" /></button>
          </div>
        </div>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--t3)' }}><i className="ti ti-loader-2" style={{ fontSize: 22, animation: 'spin .8s linear infinite' }} /></div>
        ) : (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[{ label: isPurch ? 'المورد' : 'الزبون', value: d.party?.name }, { label: 'التاريخ', value: fmtDate(d.document_date) }, { label: 'تاريخ الاستحقاق', value: fmtDate(d.due_date) }, { label: 'المستودع', value: d.warehouse?.name }, { label: 'السنة المالية', value: d.fiscal_year?.name }, { label: 'العملة', value: d.currency?.code }].map(({ label, value }) => value ? (
                <div key={label} style={{ padding: '10px 14px', borderRadius: 'var(--r2)', background: 'var(--bg2)', border: '1px solid var(--b1)' }}>
                  <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{value}</div>
                </div>
              ) : null)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>أسطر المستند</div>
              <div className="tw">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th>#</th><th>المنتج</th><th style={{ textAlign: 'left' }}>الكمية</th><th style={{ textAlign: 'left' }}>سعر HT</th><th style={{ textAlign: 'left' }}>خصم</th><th style={{ textAlign: 'left' }}>TVA</th><th style={{ textAlign: 'left' }}>الإجمالي TTC</th></tr></thead>
                  <tbody>{(d.lines ?? []).map((line: any, idx: number) => {
                    const product = line.product_variant?.product;
                    const variantName = line.product_variant?.variant_name;
                    return (<tr key={line.id ?? idx}>
                      <td style={{ color: 'var(--t4)', fontSize: 11 }}>{idx + 1}</td>
                      <td><div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 13 }}>{product?.name ?? '—'}</div>{variantName && <div style={{ fontSize: 11, color: 'var(--t4)' }}>{variantName}</div>}</td>
                      <td style={{ direction: 'ltr', textAlign: 'left', fontWeight: 600 }}>{parseFloat(line.quantity).toLocaleString('fr-DZ')}</td>
                      <td style={{ direction: 'ltr', textAlign: 'left' }}>{fmtNum(line.unit_price_ht)}</td>
                      <td style={{ color: 'var(--red)', direction: 'ltr', textAlign: 'left' }}>{parseFloat(line.discount_percentage ?? 0) > 0 ? `-${line.discount_percentage}%` : '—'}</td>
                      <td style={{ color: 'var(--t4)', direction: 'ltr', textAlign: 'left' }}>{line.tva_rate}%</td>
                      <td style={{ fontWeight: 800, color: 'var(--em)', direction: 'ltr', textAlign: 'left' }}>{fmtNum(line.total_ttc)}</td>
                    </tr>);
                  })}</tbody>
                </table>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[{ label: 'إجمالي HT', value: d.total_ht, color: 'var(--t2)' }, { label: 'TVA', value: d.total_tva, color: 'var(--t3)' }, d.total_discount && parseFloat(d.total_discount) > 0 && { label: 'الخصم', value: `-${fmtNum(d.total_discount)}`, color: 'var(--red)' }, d.total_stamp && parseFloat(d.total_stamp) > 0 && { label: 'الطابع الجبائي', value: d.total_stamp, color: 'var(--t3)' }].filter(Boolean).map((row: any) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: row.color }}>
                    <span>{row.label}</span><span style={{ fontWeight: 600, direction: 'ltr' }}>{typeof row.value === 'string' && row.value.startsWith('-') ? row.value : fmtNum(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTop: '2px solid var(--b2)', fontSize: 15, fontWeight: 800 }}>
                  <span style={{ color: 'var(--t1)' }}>الإجمالي TTC</span><span style={{ color: 'var(--em)', direction: 'ltr' }}>{fmtNum(d.total_ttc)}</span>
                </div>
                {d.remaining_amount && parseFloat(d.remaining_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--t4)' }}>المبلغ المتبقي</span><span style={{ color: 'var(--red)', fontWeight: 700, direction: 'ltr' }}>{fmtNum(d.remaining_amount)}</span></div>
                )}
              </div>
            </div>
            {d.notes && (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 'var(--r2)', background: 'var(--bg2)', border: '1px solid var(--b1)', fontSize: 12.5, color: 'var(--t3)' }}>
                <i className="ti ti-notes" style={{ marginLeft: 6 }} /> {d.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/expenses/ExpensesPage.tsx
```
// resources/js/pages/expenses/ExpensesPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import { useFiscalYear } from '@/context/FiscalYearContext';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import apiClient from '@/lib/api/client';

// --------------- Types ---------------
interface Expense {
  id: number;
  date: string;
  amount: number;
  expense_category_id: number;
  fiscal_year_id?: number;
  payment_mode_id?: number | null;
  treasury_account_id?: number | null;
  party_id?: number | null;
  description: string;
  reference?: string;
  is_paid: boolean;
  is_recurring?: boolean;
}

// --------------- API Layer ---------------
const expensesApi = {
  list: (params: Record<string, any>) =>
    apiClient.get('/expenses', { params }).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/expenses', data).then(r => r.data),
  update: (id: number, data: any) =>
    apiClient.put(`/expenses/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    apiClient.delete(`/expenses/${id}`).then(r => r.data),
};

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const formatDZD = (amount: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount) + ' دج';

export default function ExpensesPage() {
  const qc = useQueryClient();
  const { selectedYear } = useFiscalYear() as any;
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [paidFilter, setPaidFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const modal = useModal();
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: paginated, isLoading, isFetching } = useQuery({
    queryKey: ['expenses', debouncedSearch, paidFilter, categoryFilter, page, perPage],
    queryFn: () => expensesApi.list({
      'filter[search]': debouncedSearch || undefined,
      'filter[is_paid]': paidFilter || undefined,
      'filter[expense_category_id]': categoryFilter || undefined,
      sort: '-date',
      per_page: perPage,
      page,
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const expenses: Expense[] = paginated?.data ?? [];
  const meta = paginated?.meta;

  // قوائم الاختيار – سنستخدمها لعرض الأسماء
  const { data: categories } = useQuery({
    queryKey: ['expense-categories-select'],
    queryFn: () => apiClient.get('/expense-categories', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: parties } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn: () => apiClient.get('/suppliers', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: paymentModes } = useQuery({
    queryKey: ['payment-modes-select'],
    queryFn: () => apiClient.get('/payment-modes', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: treasuryAccounts } = useQuery({
    queryKey: ['treasury-accounts-select'],
    queryFn: () => apiClient.get('/treasury-accounts', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  // دوال مساعدة للبحث عن الاسم باستخدام id
  const getCategoryName = (id: number) => categories?.find((c: any) => c.id === id)?.name ?? '—';
  const getPartyName    = (id?: number | null) => !id ? '—' : parties?.find((p: any) => p.id === id)?.name ?? '—';
  const getPaymentName  = (id?: number | null) => !id ? '—' : paymentModes?.find((pm: any) => pm.id === id)?.name ?? '—';

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      deleteModal.closeModal();
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'فشل الحذف');
      deleteModal.closeModal();
    },
  });

  const handleDelete = (id: number) => { setDeletingId(id); deleteModal.openModal(); };
  const confirmDelete = () => { if (deletingId) deleteMutation.mutate(deletingId); };
  const openAdd = () => { setEditing(null); modal.openModal(); };
  const openEdit = (item: Expense) => { setEditing(item); modal.openModal(); };

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidCount = expenses.filter(e => e.is_paid).length;
  const unpaidCount = expenses.filter(e => !e.is_paid).length;

  return (
    <div className="page on" id="p-expenses">
      <PageHeader
        title="المصروفات"
        subtitle={`إدارة المصروفات — ${meta?.total ?? 0} عملية`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
            تسجيل مصروف جديد
          </Button>
        }
      />

      {error && <AlertBar variant="red" dismissible>{error}</AlertBar>}

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green" icon="ti-receipt" label="إجمالي المصروفات" value={formatDZD(totalAmount)} />
        <KpiCard variant="blue" icon="ti-check" label="مدفوعة" value={paidCount} />
        <KpiCard variant="red" icon="ti-clock" label="غير مدفوعة" value={unpaidCount} />
        <KpiCard variant="purple" icon="ti-folders" label="عدد العمليات" value={meta?.total ?? 0} />
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input type="text" placeholder="ابحث بالوصف أو المرجع..." style={{ width: '100%' }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select style={{ width: 140 }} value={paidFilter} onChange={e => { setPaidFilter(e.target.value); setPage(1); }}>
          <option value="">كل الحالات</option>
          <option value="1">مدفوعة</option>
          <option value="0">غير مدفوعة</option>
        </select>
        <select style={{ width: 150 }} value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">كل الفئات</option>
          {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader" /></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : expenses.length === 0 ? (
        <EmptyState icon="ti-credit-card" text="لا توجد مصروفات" sub="سجل أول مصروف" action={<Button variant="primary" onClick={openAdd}>مصروف جديد</Button>} />
      ) : (
        <Card noHeader style={{ padding: 0, opacity: isFetching ? 0.7 : 1 }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>الوصف</th>
                  <th>الفئة</th>
                  <th>المستفيد</th>
                  <th>المبلغ</th>
                  <th>طريقة الدفع</th>
                  <th>مدفوعة؟</th>
                  <th>التاريخ</th>
                  <th style={{ textAlign: 'center', width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id} onClick={() => openEdit(exp)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{exp.description}</div>
                      {exp.reference && <div style={{ fontSize: 11, color: 'var(--t4)' }}>Ref: {exp.reference}</div>}
                    </td>
                    <td><Badge variant="warning" noDot>{getCategoryName(exp.expense_category_id)}</Badge></td>
                    <td>{getPartyName(exp.party_id)}</td>
                    <td className="e" style={{ direction: 'ltr', textAlign: 'right' }}>{formatDZD(exp.amount)}</td>
                    <td>{getPaymentName(exp.payment_mode_id)}</td>
                    <td><Badge variant={exp.is_paid ? 'success' : 'danger'}>{exp.is_paid ? 'مدفوعة' : 'غير مدفوعة'}</Badge></td>
                    <td style={{ fontSize: 12, color: 'var(--t4)' }}>
                      {new Date(exp.date).toLocaleDateString('fr-DZ')}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(exp)} />
                        <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(exp.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--b1)' }}>
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="xs" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <i className="ti ti-chevron-right" />
                </Button>
                {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-xs ${p === page ? 'btn-p' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <Button size="xs" disabled={page >= meta.last_page} onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}>
                  <i className="ti ti-chevron-left" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <ExpenseModal
        open={modal.open} record={editing}
        categories={categories ?? []} parties={parties ?? []}
        paymentModes={paymentModes ?? []} treasuryAccounts={treasuryAccounts ?? []}
        fiscalYearId={selectedYear?.id}
        onClose={modal.closeModal}
      />

      <ConfirmDeleteModal open={deleteModal.open} onClose={deleteModal.closeModal} onConfirm={confirmDelete} loading={deleteMutation.isPending} />
    </div>
  );
}

// =============== Modal (سليم) ===============
function ExpenseModal({
  open, record, categories, parties, paymentModes, treasuryAccounts, fiscalYearId, onClose,
}: {
  open: boolean; record: Expense | null; categories: any[]; parties: any[]; paymentModes: any[]; treasuryAccounts: any[]; fiscalYearId?: number; onClose: () => void;
}) {
  const isEdit = !!record;
  const qc = useQueryClient();

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    amount: '',
    expense_category_id: '',
    payment_mode_id: '' as string | number,
    treasury_account_id: '' as string | number,
    party_id: '' as string | number,
    description: '',
    reference: '',
    is_paid: false,
    is_recurring: false,
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      if (record) {
        setForm({
          date: record.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
          amount: String(record.amount ?? ''),
          expense_category_id: String(record.expense_category_id ?? ''),
          payment_mode_id: record.payment_mode_id ?? '',
          treasury_account_id: record.treasury_account_id ?? '',
          party_id: record.party_id ?? '',
          description: record.description ?? '',
          reference: record.reference ?? '',
          is_paid: record.is_paid ?? false,
          is_recurring: record.is_recurring ?? false,
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setServerError('');
    }
  }, [open, record]);

  const set = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'المبلغ غير صالح';
    if (!form.description.trim()) errs.description = 'الوصف مطلوب';
    if (!form.date) errs.date = 'التاريخ مطلوب';
    if (!form.expense_category_id) errs.expense_category_id = 'اختر فئة المصروف';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = {
        date: data.date,
        amount: parseFloat(data.amount),
        expense_category_id: parseInt(data.expense_category_id) || null,
        payment_mode_id: data.payment_mode_id ? parseInt(String(data.payment_mode_id)) : null,
        treasury_account_id: data.treasury_account_id ? parseInt(String(data.treasury_account_id)) : null,
        party_id: data.party_id ? parseInt(String(data.party_id)) : null,
        description: data.description.trim(),
        reference: data.reference || null,
        is_paid: data.is_paid,
        is_recurring: data.is_recurring,
        fiscal_year_id: fiscalYearId ?? null,
      };
      return isEdit ? expensesApi.update(record!.id, payload) : expensesApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); onClose(); },
    onError: (err: any) => {
      const msg = err?.response?.data;
      if (msg?.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(msg.errors)) fieldErrors[k] = (v as string[])[0];
        setErrors(fieldErrors);
      } else {
        setServerError(msg?.message || 'فشل الحفظ');
      }
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    saveMutation.mutate(form);
  };

  return (
    <Modal open={open} onClose={onClose} size="md"
      title={isEdit ? 'تعديل المصروف' : 'تسجيل مصروف جديد'}
      footer={
        <>
          <Button onClick={onClose} disabled={saveMutation.isPending}>إلغاء</Button>
          <Button variant="primary" icon={<i className="ti ti-device-floppy" />} onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      {serverError && <AlertBar variant="red">{serverError}</AlertBar>}
      <div className="fgrid c2" style={{ gap: 14 }}>
        <div className="fg s2">
          <label className="req">الوصف</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف المصروف" />
          {errors.description && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.description}</span>}
        </div>
        <div className="fg">
          <label className="req">المبلغ</label>
          <div className="inp-row"><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" /><div className="inp-suf">دج</div></div>
          {errors.amount && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.amount}</span>}
        </div>
        <div className="fg">
          <label className="req">التاريخ</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          {errors.date && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.date}</span>}
        </div>
        <div className="fg">
          <label className="req">الفئة</label>
          <select
            value={form.expense_category_id as string}
            onChange={e => set('expense_category_id', e.target.value)}
            style={{ borderColor: errors.expense_category_id ? 'var(--red)' : undefined }}
          >
            <option value="">— اختر —</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.expense_category_id && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.expense_category_id}</span>}
        </div>
        <div className="fg">
          <label>المستفيد</label>
          <select value={form.party_id} onChange={e => set('party_id', e.target.value)}>
            <option value="">— بدون —</option>
            {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>طريقة الدفع</label>
          <select value={form.payment_mode_id} onChange={e => set('payment_mode_id', e.target.value)}>
            <option value="">— غير محدد —</option>
            {paymentModes.map((pm: any) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>الحساب المالي</label>
          <select value={form.treasury_account_id} onChange={e => set('treasury_account_id', e.target.value)}>
            <option value="">— غير محدد —</option>
            {treasuryAccounts.map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>مرجع</label>
          <input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="اختياري" />
        </div>
        <div className="fg">
          <label>مدفوعة</label>
          <Switch checked={form.is_paid} onChange={v => set('is_paid', v)} />
        </div>
        <div className="fg">
          <label>متكررة</label>
          <Switch checked={form.is_recurring} onChange={v => set('is_recurring', v)} />
        </div>
      </div>
    </Modal>
  );
}

function ConfirmDeleteModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="تأكيد الحذف">
      <div style={{ textAlign: 'center', padding: 16 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
        <div style={{ fontWeight: 800, fontSize: 15, margin: '12px 0 6px' }}>هل أنت متأكد؟</div>
        <div style={{ fontSize: 13, color: 'var(--t4)' }}>لا يمكن التراجع عن حذف المصروف.</div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 0 0' }}>
        <Button onClick={onClose} disabled={loading}>إلغاء</Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading} icon={loading ? <i className="ti ti-loader" /> : <i className="ti ti-trash" />}>
          {loading ? 'جاري الحذف...' : 'حذف'}
        </Button>
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pages/finance/FinancePage.tsx
```
// resources/js/pages/finance/FinancePage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import Switch from '@/components/ui/Switch';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import apiClient from '@/lib/api/client';
import type { TreasuryAccount, PaymentMode } from '@/types';

// ===============================================
// MAIN COMPONENT
// ===============================================
export default function FinancePage() {
    const [activeTab, setActiveTab] = useState(0);
    const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);
    const [editingMode, setEditingMode] = useState<PaymentMode | null>(null);
    const accountModal = useModal();
    const modeModal = useModal();
    const qc = useQueryClient();

    // جلب الحسابات المالية
    const { data: accounts, isLoading: loadingAccounts, error: accountsError } = useQuery({
        queryKey: ['treasury-accounts'],
        queryFn: () => apiClient.get('/treasury-accounts').then(r => r.data.data),
    });

    // جلب طرق الدفع
    const { data: paymentModes, isLoading: loadingModes } = useQuery({
        queryKey: ['payment-modes'],
        queryFn: () => apiClient.get('/payment-modes').then(r => r.data.data),
    });

    // تحويل البيانات: treasuryAccountType يحتوي على name وليس type مباشرة
    const enrichAccounts = accounts?.map((acc: any) => ({
        ...acc,
        type: acc.relations?.treasuryAccountType?.name === 'cash' ? 'cash' : 'bank',
    })) || [];

    const totalBalance = enrichAccounts.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0) || 0;
    const bankAccounts = enrichAccounts.filter((a: any) => a.type === 'bank');
    const cashAccounts = enrichAccounts.filter((a: any) => a.type === 'cash');
    const bankBalance = bankAccounts.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0);
    const cashBalance = cashAccounts.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0);

    // حذف حساب
    const deleteAccount = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/treasury-accounts/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
        },
    });

    // حذف طريقة دفع
    const deleteMode = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/payment-modes/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payment-modes'] });
        },
    });

    const openAddAccount = () => { setEditingAccount(null); accountModal.openModal(); };
    const openEditAccount = (account: TreasuryAccount) => { setEditingAccount(account); accountModal.openModal(); };
    const openAddMode = () => { setEditingMode(null); modeModal.openModal(); };
    const openEditMode = (mode: PaymentMode) => { setEditingMode(mode); modeModal.openModal(); };

    return (
        <div className="page on" id="p-finance">
            <PageHeader
                title="الخزينة والمالية"
                subtitle="إدارة الحسابات البنكية والصناديق وطرق الدفع"
                actions={
                    <Button variant="primary" size="sm" icon={<i className="ti ti-plus"/>}
                        onClick={activeTab === 0 ? openAddAccount : openAddMode}>
                        {activeTab === 0 ? 'حساب جديد' : 'طريقة دفع جديدة'}
                    </Button>
                }
            />

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 20 }}>
                <div className={`tab ${activeTab === 0 ? 'on' : ''}`} onClick={() => setActiveTab(0)}>
                    <span className="ic ic-xs"><i className="ti ti-building-bank"/></span>
                    الحسابات والصناديق
                </div>
                <div className={`tab ${activeTab === 1 ? 'on' : ''}`} onClick={() => setActiveTab(1)}>
                    <span className="ic ic-xs"><i className="ti ti-credit-card"/></span>
                    طرق الدفع
                </div>
            </div>

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-wallet" label="إجمالي الأرصدة"
                    value={totalBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                    sub={`${enrichAccounts.length} حساب`} />
                <KpiCard variant="blue" icon="ti-building-bank" label="الرصيد البنكي"
                    value={bankBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                    sub={`${bankAccounts.length} حساب بنكي`} />
                <KpiCard variant="gold" icon="ti-cash-register" label="الرصيد النقدي"
                    value={cashBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                    sub={`${cashAccounts.length} صندوق`} />
                <KpiCard variant="purple" icon="ti-credit-card" label="طرق الدفع"
                    value={paymentModes?.length ?? 0}
                    sub={`${paymentModes?.filter((m: PaymentMode) => m.active).length ?? 0} نشطة`} />
            </div>

            {/* رسالة خطأ إذا فشل جلب البيانات */}
            {accountsError && (
                <AlertBar variant="red">
                    فشل جلب الحسابات المالية. تأكد من اتصالك بالخادم.
                </AlertBar>
            )}

            {/* ACCOUNTS TAB */}
            {activeTab === 0 && (
                loadingAccounts ? (
                    <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
                ) : enrichAccounts.length === 0 ? (
                    <EmptyState
                        icon="ti-building-bank"
                        text="لا توجد حسابات مالية"
                        sub="أضف أول حساب بنكي أو صندوق نقدي للبدء"
                        action={<Button variant="primary" onClick={openAddAccount}>إضافة حساب جديد</Button>}
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Bank Accounts */}
                        {bankAccounts.length > 0 && (
                            <Card
                                title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-building-bank"/></span> الحسابات البنكية</>}
                                noHeader
                                style={{ padding: 0 }}
                            >
                                <div className="tw">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>الاسم</th>
                                                <th>الكود</th>
                                                <th>البنك</th>
                                                <th>رقم الحساب</th>
                                                <th>الرصيد</th>
                                                <th>الافتراضي</th>
                                                <th>الحالة</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bankAccounts.map((acc: any) => (
                                                <tr key={acc.id}>
                                                    <td className="s">{acc.name}</td>
                                                    <td className="m">{acc.code || '—'}</td>
                                                    <td style={{ fontSize: 12, color: 'var(--t3)' }}>{acc.bank_name || '—'}</td>
                                                    <td className="m" style={{ fontSize: 11 }}>{acc.account_number || acc.rib || acc.iban || '—'}</td>
                                                    <td className="e">{(acc.current_balance || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                                    <td>{acc.is_default ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                                                    <td><Badge variant={acc.active ? 'success' : 'danger'}>{acc.active ? 'نشط' : 'موقوف'}</Badge></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 3 }}>
                                                            <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEditAccount(acc)}/>
                                                            <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={() => deleteAccount.mutate(acc.id)}/>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {/* Cash Accounts */}
                        {cashAccounts.length > 0 && (
                            <Card
                                title={<><span className="ic ic-sm" style={{ color: 'var(--gold)' }}><i className="ti ti-cash-register"/></span> الصناديق النقدية</>}
                                noHeader
                                style={{ padding: 0 }}
                            >
                                <div className="tw">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>الاسم</th>
                                                <th>الكود</th>
                                                <th>الرصيد</th>
                                                <th>الرصيد الافتتاحي</th>
                                                <th>الافتراضي</th>
                                                <th>الحالة</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cashAccounts.map((acc: any) => (
                                                <tr key={acc.id}>
                                                    <td className="s">{acc.name}</td>
                                                    <td className="m">{acc.code || '—'}</td>
                                                    <td className="e">{(acc.current_balance || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                                    <td className="m">{(acc.initial_balance || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                                    <td>{acc.is_default ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                                                    <td><Badge variant={acc.active ? 'success' : 'danger'}>{acc.active ? 'نشط' : 'موقوف'}</Badge></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 3 }}>
                                                            <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEditAccount(acc)}/>
                                                            <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={() => deleteAccount.mutate(acc.id)}/>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )
            )}

            {/* PAYMENT MODES TAB */}
            {activeTab === 1 && (
                loadingModes ? (
                    <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
                ) : !paymentModes || paymentModes.length === 0 ? (
                    <EmptyState
                        icon="ti-credit-card"
                        text="لا توجد طرق دفع"
                        sub="أضف طريقة دفع جديدة"
                        action={<Button variant="primary" onClick={openAddMode}>طريقة دفع جديدة</Button>}
                    />
                ) : (
                    <Card noHeader style={{ padding: 0 }}>
                        <div className="tw">
                            <table>
                                <thead>
                                    <tr>
                                        <th>الاسم</th>
                                        <th>الكود</th>
                                        <th>الحساب</th>
                                        <th>نقدي</th>
                                        <th>مرجع</th>
                                        <th>الحالة</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentModes.map((mode: PaymentMode) => (
                                        <tr key={mode.id}>
                                            <td className="s">{mode.name}</td>
                                            <td className="m">{mode.code}</td>
                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>—</td>
                                            <td><Badge variant={mode.is_cash ? 'success' : 'gray'}>{mode.is_cash ? 'نعم' : 'لا'}</Badge></td>
                                            <td>{mode.requires_reference ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                                            <td><Badge variant={mode.active ? 'success' : 'danger'}>{mode.active ? 'نشط' : 'موقوف'}</Badge></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 3 }}>
                                                    <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEditMode(mode)}/>
                                                    <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={() => deleteMode.mutate(mode.id)}/>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )
            )}

            {/* Account Modal */}
            <AccountModal
                open={accountModal.open}
                account={editingAccount}
                onClose={accountModal.closeModal}
            />

            {/* Payment Mode Modal */}
            <PaymentModeModal
                open={modeModal.open}
                mode={editingMode}
                onClose={modeModal.closeModal}
            />
        </div>
    );
}

// ===============================================
// ACCOUNT MODAL - مع useEffect صحيح
// ===============================================
function AccountModal({ open, account, onClose }: {
    open: boolean;
    account: TreasuryAccount | null;
    onClose: () => void;
}) {
    const isEdit = !!account;
    const qc = useQueryClient();

    const emptyForm = {
        name: '',
        code: '',
        type: 'bank' as 'bank' | 'cash',
        bank_name: '',
        account_number: '',
        rib: '',
        iban: '',
        swift_bic: '',
        currency: 'DZD',
        initial_balance: 0,
        current_balance: 0,
        is_default: false,
        active: true,
        notes: '',
        treasury_account_type_id: null as number | null,
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    // إعادة تعيين النموذج
    useEffect(() => {
        if (open) {
            if (account) {
                const acc = account as any;
                setForm({
                    name: acc.name || '',
                    code: acc.code || '',
                    type: acc.type || (acc.relations?.treasuryAccountType?.name === 'cash' ? 'cash' : 'bank'),
                    bank_name: acc.bank_name || '',
                    account_number: acc.account_number || '',
                    rib: acc.rib || '',
                    iban: acc.iban || '',
                    swift_bic: acc.swift_bic || '',
                    currency: acc.currency || 'DZD',
                    initial_balance: acc.initial_balance || 0,
                    current_balance: acc.current_balance || 0,
                    is_default: acc.is_default || false,
                    active: acc.active ?? true,
                    notes: acc.notes || '',
                    treasury_account_type_id: acc.treasury_account_type_id || null,
                });
            } else {
                setForm(emptyForm);
            }
            setError('');
        }
    }, [open, account]);

    const set = (k: string, v: string | boolean | number | null) => {
        setForm(f => ({ ...f, [k]: v }));
        setError('');
    };

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                name: data.name,
                code: data.code || null,
                treasury_account_type_id: data.type === 'cash' ? 2 : 1, // 1=bank, 2=cash
                bank_name: data.type === 'bank' ? data.bank_name : null,
                account_number: data.type === 'bank' ? data.account_number : null,
                rib: data.type === 'bank' ? data.rib : null,
                iban: data.type === 'bank' ? data.iban : null,
                swift_bic: data.type === 'bank' ? data.swift_bic : null,
                currency: data.currency,
                initial_balance: data.initial_balance,
                current_balance: data.current_balance,
                is_default: data.is_default,
                active: data.active,
                notes: data.notes || null,
            };

            if (isEdit) {
                return apiClient.put(`/treasury-accounts/${account!.id}`, payload);
            }
            return apiClient.post('/treasury-accounts', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
            onClose();
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'فشل الحفظ. تحقق من البيانات وحاول مجدداً.';
            setError(msg);
        },
    });

    const handleSave = () => {
        if (!form.name.trim()) {
            setError('اسم الحساب مطلوب');
            return;
        }
        saveMutation.mutate(form);
    };

    return (
        <Modal
            open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل — ${(account as any)?.name || ''}` : 'حساب مالي جديد'}
            subtitle={isEdit ? '' : 'إضافة حساب بنكي أو صندوق نقدي'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={handleSave}
                        disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }
        >
            {error && (
                <AlertBar variant="red">{error}</AlertBar>
            )}

            <div className="fgrid c2">
                <div className="fg s2">
                    <label className="req">اسم الحساب</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: الحساب الجاري BNA" autoFocus />
                </div>
                <div className="fg">
                    <label>الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="CP01" />
                </div>
                <div className="fg">
                    <label className="req">النوع</label>
                    <select value={form.type} onChange={e => set('type', e.target.value)}>
                        <option value="bank">🏦 حساب بنكي</option>
                        <option value="cash">💵 صندوق نقدي</option>
                    </select>
                </div>

                {form.type === 'bank' && (
                    <>
                        <div className="fg">
                            <label>اسم البنك</label>
                            <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="BNA" />
                        </div>
                        <div className="fg">
                            <label>رقم الحساب</label>
                            <input value={form.account_number} onChange={e => set('account_number', e.target.value)} placeholder="00000000000" style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>RIB</label>
                            <input value={form.rib} onChange={e => set('rib', e.target.value)} placeholder="00799999000XXXXXXXX00" style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>IBAN</label>
                            <input value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="DZ..." style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>SWIFT / BIC</label>
                            <input value={form.swift_bic} onChange={e => set('swift_bic', e.target.value)} placeholder="BNAL...DZ" style={{ fontFamily: 'monospace' }} />
                        </div>
                    </>
                )}

                <div className="fg">
                    <label>الرصيد الافتتاحي</label>
                    <div className="inp-row">
                        <input type="number" value={form.initial_balance} onChange={e => set('initial_balance', parseFloat(e.target.value) || 0)} />
                        <div className="inp-suf">دج</div>
                    </div>
                </div>
                <div className="fg">
                    <label>الرصيد الحالي</label>
                    <div className="inp-row">
                        <input type="number" value={form.current_balance} onChange={e => set('current_balance', parseFloat(e.target.value) || 0)} />
                        <div className="inp-suf">دج</div>
                    </div>
                </div>
                <div className="fg s2">
                    <label>ملاحظات</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات إضافية..." rows={2} />
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>افتراضي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_default} onChange={(v) => set('is_default', v)} />
                    </div>
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={(v) => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ===============================================
// PAYMENT MODE MODAL - مع useEffect صحيح
// ===============================================
function PaymentModeModal({ open, mode, onClose }: {
    open: boolean;
    mode: PaymentMode | null;
    onClose: () => void;
}) {
    const isEdit = !!mode;
    const qc = useQueryClient();

    const { data: treasuryAccounts } = useQuery({
        queryKey: ['treasury-accounts'],
        queryFn: () => apiClient.get('/treasury-accounts').then(r => r.data.data),
        enabled: open,
    });

    const emptyForm = {
        name: '',
        code: '',
        description: '',
        treasury_account_id: '' as string | number,
        requires_reference: false,
        is_cash: false,
        active: true,
        display_order: 0,
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            if (mode) {
                setForm({
                    name: mode.name || '',
                    code: mode.code || '',
                    description: (mode as any).description || '',
                    treasury_account_id: (mode as any).treasury_account_id || '',
                    requires_reference: mode.requires_reference || false,
                    is_cash: mode.is_cash || false,
                    active: mode.active ?? true,
                    display_order: (mode as any).display_order || 0,
                });
            } else {
                setForm(emptyForm);
            }
            setError('');
        }
    }, [open, mode]);

    const set = (k: string, v: string | boolean | number) => setForm(f => ({ ...f, [k]: v }));

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                name: data.name,
                code: data.code,
                description: data.description || null,
                treasury_account_id: data.treasury_account_id ? parseInt(data.treasury_account_id as string) : null,
                requires_reference: data.requires_reference,
                is_cash: data.is_cash,
                active: data.active,
                display_order: data.display_order,
            };

            if (isEdit) {
                return apiClient.put(`/payment-modes/${mode!.id}`, payload);
            }
            return apiClient.post('/payment-modes', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payment-modes'] });
            onClose();
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'فشل الحفظ. تحقق من البيانات.';
            setError(msg);
        },
    });

    return (
        <Modal
            open={open} onClose={onClose} size="md"
            title={isEdit ? `تعديل — ${mode?.name || ''}` : 'طريقة دفع جديدة'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={() => saveMutation.mutate(form)}
                        disabled={saveMutation.isPending || !form.name.trim() || !form.code.trim()}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }
        >
            {error && <AlertBar variant="red">{error}</AlertBar>}

            <div className="fgrid">
                <div className="fg s2">
                    <label className="req">الاسم</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="نقداً، شيك، CIB..." autoFocus />
                </div>
                <div className="fg">
                    <label className="req">الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="cash, check, cib" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>الحساب الافتراضي</label>
                    <select value={form.treasury_account_id as string} onChange={e => set('treasury_account_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {(treasuryAccounts || []).map((acc: any) => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>ترتيب العرض</label>
                    <input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>نقدي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_cash} onChange={(v) => set('is_cash', v)} />
                    </div>
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>يتطلب مرجع</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.requires_reference} onChange={(v) => set('requires_reference', v)} />
                    </div>
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={(v) => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
```

## FILE: resources/js/pages/finance/TreasuryAccountsPage.tsx
```
// resources/js/pages/finance/TreasuryAccountsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import apiClient from '@/lib/api/client';

interface TreasuryAccount {
  id: number;
  name: string;
  code: string | null;
  treasury_account_type_id: number;
  type_name?: string;
  bank_name?: string;
  account_number?: string;
  rib?: string;
  iban?: string;
  swift_bic?: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  is_default: boolean;
  active: boolean;
  notes?: string;
  relations?: {
    treasuryAccountType?: { id: number; name: string };
  };
}

export default function TreasuryAccountsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState<TreasuryAccount | null>(null);
  const modal = useModal();
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts
  const { data: accounts, isLoading } = useQuery<TreasuryAccount[]>({
    queryKey: ['treasury-accounts', search, typeFilter],
    queryFn: () => apiClient.get('/treasury-accounts', {
      params: {
        search: search || undefined,
        'filter[treasury_account_type_id]': typeFilter || undefined,
        include: 'treasuryAccountType',
      },
    }).then(r => r.data.data),
  });

  // Fetch types
  const { data: accountTypes } = useQuery({
    queryKey: ['treasury-account-types'],
    queryFn: () => apiClient.get('/treasury-account-types').then(r => r.data.data),
    staleTime: Infinity,
  });

  const bankAccounts = accounts?.filter(a => a.relations?.treasuryAccountType?.name === 'bank') || [];
  const cashAccounts = accounts?.filter(a => a.relations?.treasuryAccountType?.name === 'cash') || [];
  const totalBank = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
  const totalCash = cashAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/treasury-accounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
      deleteModal.closeModal();
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'فشل الحذف'),
  });

  const openAdd = () => { setEditing(null); modal.openModal(); };
  const openEdit = (acc: TreasuryAccount) => { setEditing(acc); modal.openModal(); };
  const handleDelete = (id: number) => { setDeletingId(id); deleteModal.openModal(); };
  const confirmDelete = () => { if (deletingId) deleteMutation.mutate(deletingId); };

  if (error) return <AlertBar variant="red">{error}</AlertBar>;

  return (
    <div className="page on" id="p-treasury-accounts">
      <PageHeader
        title="الحسابات المالية"
        subtitle={`إدارة الحسابات البنكية والصناديق — ${accounts?.length || 0} حساب`}
        actions={<Button variant="primary" size="sm" icon={<i className="ti ti-plus"/>} onClick={openAdd}>حساب جديد</Button>}
      />

      <div className="kpis" style={{ marginBottom: 20 }}>
        <KpiCard variant="blue" icon="ti-building-bank" label="الرصيد البنكي" value={totalBank.toLocaleString('fr-DZ')} unit="دج" />
        <KpiCard variant="green" icon="ti-cash" label="الرصيد النقدي" value={totalCash.toLocaleString('fr-DZ')} unit="دج" />
        <KpiCard variant="purple" icon="ti-wallet" label="إجمالي الأرصدة" value={(totalBank + totalCash).toLocaleString('fr-DZ')} unit="دج" />
        <KpiCard variant="gold" icon="ti-list" label="عدد الحسابات" value={accounts?.length || 0} />
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="srch" style={{ flex: 1, display: 'flex' }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input type="text" placeholder="ابحث باسم أو كود الحساب..." onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 150 }}>
          <option value="">كل الأنواع</option>
          {accountTypes?.map((t: any) => <option key={t.id} value={t.id}>{t.label || t.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : !accounts?.length ? (
        <EmptyState icon="ti-building-bank" text="لا توجد حسابات مالية" sub="أضف أول حساب" action={<Button variant="primary" onClick={openAdd}>حساب جديد</Button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bankAccounts.length > 0 && (
            <Card noHeader style={{ padding: 0 }}>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>الاسم</th><th>الكود</th><th>البنك</th><th>الرصيد</th><th>الافتراضي</th><th>نشط</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankAccounts.map(acc => (
                      <tr key={acc.id}>
                        <td className="s">{acc.name}</td>
                        <td className="m">{acc.code || '—'}</td>
                        <td>{acc.bank_name || '—'}</td>
                        <td className="e">{acc.current_balance?.toLocaleString('fr-DZ')} دج</td>
                        <td>{acc.is_default ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                        <td><Badge variant={acc.active ? 'success' : 'danger'}>{acc.active ? 'نشط' : 'موقوف'}</Badge></td>
                        <td>
                          <Button size="xs" onClick={() => openEdit(acc)}><i className="ti ti-pencil"/></Button>
                          <Button size="xs" variant="danger" onClick={() => handleDelete(acc.id)}><i className="ti ti-trash"/></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {cashAccounts.length > 0 && (
            <Card noHeader style={{ padding: 0 }}>
              {/* جدول مشابه للصناديق */}
            </Card>
          )}
        </div>
      )}

      <TreasuryAccountModal
        open={modal.open}
        account={editing}
        accountTypes={accountTypes || []}
        onClose={modal.closeModal}
      />

      <ConfirmDeleteModal open={deleteModal.open} onClose={deleteModal.closeModal} onConfirm={confirmDelete} loading={deleteMutation.isPending} />
    </div>
  );
}

// مكون المودال (اكتبه بنفس النمط الموجود في FinancePage)
function TreasuryAccountModal({ open, account, accountTypes, onClose }: { ... }) { ... }
function ConfirmDeleteModal({ ... }: { ... }) { ... }
```

## FILE: resources/js/pages/fiscal/FiscalYearsPage.tsx
```
// ════════════════════════════════════════════════════════════
// resources/js/pages/fiscal/FiscalYearsPage.tsx
// النسخة النهائية المُحسَّنة — تجمع أفضل الميزات
// ════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import AlertBar from '@/components/ui/AlertBar';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import apiClient from '@/lib/api/client';
import type { FiscalYear } from '@/types';

// ─────────────────────────────────────────────────────────────
// Date helpers — timezone-safe (من النسخة المُحسَّنة)
// ─────────────────────────────────────────────────────────────
const extractDate = (date: unknown): string => {
    if (!date) return '';
    const m = String(date).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
};

const fmtDate = (date: unknown): string => {
    const d = extractDate(date);
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
};

const daysBetween = (start: string, end: string): number => {
    const [y1, m1, d1] = start.split('-').map(Number);
    const [y2, m2, d2] = end.split('-').map(Number);
    return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000);
};

const calcProgress = (startStr: string, endStr: string): number => {
    const total = daysBetween(startStr, endStr);
    if (total <= 0) return 0;
    const [y1, m1, d1] = startStr.split('-').map(Number);
    const elapsed = Math.max(0, Math.min(
        (Date.now() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000,
        total
    ));
    return Math.round((elapsed / total) * 100);
};

const toInput = extractDate;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const safeNextYear = (yearName: string): number => {
    const m = String(yearName ?? '').match(/(\d{4})/);
    if (m) { const n = parseInt(m[1], 10); if (!isNaN(n)) return n + 1; }
    const direct = parseInt(String(yearName ?? ''), 10);
    if (!isNaN(direct)) return direct + 1;
    return new Date().getFullYear() + 1;
};

const resolveClosedByName = (year: FiscalYear): string => {
    const y = year as unknown as Record<string, unknown>;
    for (const key of ['closed_by_user', 'closedBy', 'relations']) {
        const v = y[key];
        if (v && typeof v === 'object') {
            const obj = v as Record<string, unknown>;
            // relations.closedBy
            const inner = (obj as any)?.closedBy || obj;
            if (typeof inner?.name === 'string' && inner.name.trim()) return inner.name.trim();
            if (inner?.id) return `المستخدم #${inner.id}`;
        }
    }
    const cb = y['closed_by'];
    if (cb && (typeof cb === 'number' || (typeof cb === 'string' && !isNaN(Number(cb))))) {
        return `المستخدم #${cb}`;
    }
    return '—';
};

const parseApiError = (err: unknown, fallback: string): string => {
    const e = err as {
        response?: {
            data?: {
                message?: string;
                error?: string;
                errors?: Record<string, string[]>;
            };
        };
        message?: string;
    };
    if (e?.response?.data?.errors) {
        const first = Object.values(e.response.data.errors)[0];
        if (first?.[0]) return first[0];
    }
    if (e?.response?.data?.message) return e.response.data.message;
    if (e?.response?.data?.error) return e.response.data.error;
    if (e?.message) return e.message;
    return fallback;
};

// ─────────────────────────────────────────────────────────────
// Checklist الإقفال
// ─────────────────────────────────────────────────────────────
const CLOSURE_CHECKLIST = [
    { id: 1, label: 'التحقق من توازن الميزانية (Balance Sheet)', dz: 'المادة 131 SCF' },
    { id: 2, label: "مراجعة قيود التسوية الجردية (Écritures d'inventaire)", dz: 'المادة 132 SCF' },
    { id: 3, label: 'ترحيل نتيجة الدورة إلى الأموال الخاصة', dz: 'المادة 137 SCF' },
    { id: 4, label: 'تسوية الأرصدة الدائنة والمدينة مع الأطراف', dz: 'دليل المحاسبة الوطني' },
    { id: 5, label: 'الإقرار بالضرائب (TVA G50 + IBS/IRG)', dz: 'قانون الضرائب المباشرة' },
    { id: 6, label: 'التحقق من جرد المخزون (CUMP/FIFO)', dz: 'المادة 218 SCF' },
];

// ─────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────
function StatusBadge({ year }: { year: FiscalYear }) {
    if (year.is_current) return <Badge variant="success"><i className="ti ti-star-filled" style={{ fontSize: 11, color: 'var(--gold)' }}/> الحالية</Badge>;
    if (year.is_closed) return <Badge variant="danger"><i className="ti ti-lock" style={{ fontSize: 11 }}/> مقفلة</Badge>;
    return <Badge variant="info">مفتوحة</Badge>;
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function FiscalYearsPage() {
    const qc = useQueryClient();

    const [editingYear, setEditingYear] = useState<FiscalYear | null>(null);
    const [closingYear, setClosingYear] = useState<FiscalYear | null>(null);
    const [viewingYear, setViewingYear] = useState<FiscalYear | null>(null);

    const addModal = useModal();
    const closeModal = useModal();
    const detailModal = useModal();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['fiscal-years'],
        queryFn: () => apiClient
            .get('/fiscal-years', { params: { include: 'closedBy', per_page: 50 } })
            .then(r => r.data.data as FiscalYear[]),
        staleTime: 60_000,
    });

    const years = data ?? [];
    const currentYear = years.find(y => y.is_current);
    const openYears = years.filter(y => !y.is_closed);
    const closedYears = years.filter(y => y.is_closed);

    // تذكير G50
    const g50Reminder = useMemo(() => {
        if (!currentYear) return null;
        const endDate = extractDate(currentYear.end_date);
        const diff = Math.round((new Date(endDate).getTime() - Date.now()) / 86_400_000);
        return diff > 0 && diff <= 60 ? diff : null;
    }, [currentYear]);

    // تعيين سنة كحالية
    const setCurrent = useMutation({
        mutationFn: (id: number) => apiClient.put(`/fiscal-years/${id}`, { is_current: true }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-years'] }),
    });

    // حذف سنة
    const deleteYear = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/fiscal-years/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-years'] }),
    });

    const openAdd = () => { setEditingYear(null); addModal.openModal(); };
    const openEdit = (y: FiscalYear) => { if (!y.is_closed) { setEditingYear(y); addModal.openModal(); } };
    const openClose = (y: FiscalYear) => { setClosingYear(y); closeModal.openModal(); };
    const openDetail = (y: FiscalYear) => { setViewingYear(y); detailModal.openModal(); };

    const handleDelete = async (y: FiscalYear) => {
        if (y.is_closed || y.is_current) return;
        if (!confirm(`هل أنت متأكد من حذف السنة المالية "${y.name}"؟`)) return;
        deleteYear.mutate(y.id);
    };

    return (
        <div className="page on" id="p-fiscalyears">

            <PageHeader
                title="السنوات المالية"
                subtitle={`إدارة الفترات المحاسبية وفق SCF — الحالية: ${currentYear?.name ?? 'غير محددة'}`}
                actions={
                    <Button variant="primary" size="sm" icon={<i className="ti ti-calendar-plus"/>} onClick={openAdd}>
                        سنة مالية جديدة
                    </Button>
                }
            />

            {/* تنبيهات */}
            {isError && (
                <AlertBar variant="red">
                    فشل تحميل السنوات المالية.{' '}
                    <button onClick={() => refetch()} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        إعادة المحاولة
                    </button>
                </AlertBar>
            )}

            {g50Reminder !== null && (
                <AlertBar variant="gold">
                    <strong>تذكير G50:</strong> تبقّى <strong>{g50Reminder} يوماً</strong> على نهاية السنة المالية {currentYear?.name}.
                </AlertBar>
            )}

            {openYears.length > 1 && (
                <AlertBar variant="gold">
                    يوجد <strong>{openYears.length} سنوات مفتوحة</strong> — يُنصح بإقفال السنوات القديمة.
                </AlertBar>
            )}

            {/* KPIs */}
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-calendar-check"
                    label="السنة المالية الحالية" value={currentYear?.name ?? '—'}
                    sub={currentYear ? `${fmtDate(currentYear.start_date)} — ${fmtDate(currentYear.end_date)}` : 'لم تُحدَّد بعد'} />
                <KpiCard variant="blue" icon="ti-lock-open"
                    label="سنوات مفتوحة" value={openYears.length}
                    sub={`${openYears.filter(y => y.is_current).length} حالية`} />
                <KpiCard variant="red" icon="ti-lock"
                    label="سنوات مقفلة" value={closedYears.length}
                    sub="مؤرشفة نهائياً" />
                <KpiCard variant="gold" icon="ti-calendar"
                    label="إجمالي الفترات" value={years.length}
                    sub={currentYear && !currentYear.is_closed ? `${calcProgress(toInput(currentYear.start_date), toInput(currentYear.end_date))}٪ مكتمل` : '—'} />
            </div>

            {/* شريط تقدم السنة الحالية */}
            {currentYear && !currentYear.is_closed && (() => {
                const s = toInput(currentYear.start_date), e = toInput(currentYear.end_date);
                const progress = calcProgress(s, e), total = daysBetween(s, e);
                const elapsed = Math.round(progress / 100 * total), remaining = total - elapsed;
                return (
                    <Card
                        title={<><span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-calendar-stats"/></span> تقدم السنة المالية — {currentYear.name}</>}
                        style={{ marginBottom: 18 }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                                    <span style={{ color: 'var(--t4)' }}>{fmtDate(s)}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--em)' }}>{progress}٪</span>
                                    <span style={{ color: 'var(--t4)' }}>{fmtDate(e)}</span>
                                </div>
                                <ProgressBar value={progress} color={progress > 80 ? 'var(--gold)' : 'var(--em)'} height={10} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--t4)' }}>
                                    <span>مضى: <strong style={{ color: 'var(--t2)' }}>{elapsed} يوم</strong></span>
                                    <span>متبقي: <strong style={{ color: remaining < 90 ? 'var(--gold)' : 'var(--t2)' }}>{remaining} يوم</strong></span>
                                    <span>الإجمالي: <strong style={{ color: 'var(--t2)' }}>{total} يوم</strong></span>
                                </div>
                            </div>
                            {remaining < 90 && (
                                <div style={{ padding: '10px 16px', background: 'var(--goldb)', border: '1px solid var(--goldbo)', borderRadius: 'var(--r2)', textAlign: 'center', minWidth: 140 }}>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>{remaining}</div>
                                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>يوماً على نهاية السنة</div>
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })()}

            {/* جدول السنوات */}
            {isLoading ? (
                <div className="empty">
                    <div className="empty-ic"><i className="ti ti-loader"/></div>
                    <div className="empty-tx">جاري التحميل...</div>
                </div>
            ) : years.length === 0 ? (
                <EmptyState icon="ti-calendar-off" text="لا توجد سنوات مالية" sub="أنشئ سنتك المالية الأولى"
                    action={<Button variant="primary" onClick={openAdd}><i className="ti ti-plus"/> سنة مالية جديدة</Button>} />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>السنة المالية</th>
                                    <th>بداية الفترة</th>
                                    <th>نهاية الفترة</th>
                                    <th>المدة</th>
                                    <th>التقدم</th>
                                    <th>الحالة</th>
                                    <th>الإقفال</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {years.map(y => {
                                    const s = toInput(y.start_date), e = toInput(y.end_date);
                                    const total = daysBetween(s, e);
                                    const months = Math.round(total / 30.44);
                                    const progress = y.is_closed ? 100 : calcProgress(s, e);
                                    const closedByName = resolveClosedByName(y);

                                    return (
                                        <tr key={y.id} style={{ ...(y.is_current ? { background: 'var(--emb)' } : {}), cursor: 'pointer' }}
                                            onClick={() => openDetail(y)}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 10,
                                                        background: y.is_closed ? 'var(--bg4)' : y.is_current ? 'var(--emb)' : 'var(--blueb)',
                                                        border: `1px solid ${y.is_closed ? 'var(--b2)' : y.is_current ? 'var(--embo)' : 'var(--bluebo)'}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        <i className={`ti ${y.is_closed ? 'ti-lock' : y.is_current ? 'ti-star-filled' : 'ti-calendar'}`}
                                                            style={{ fontSize: 16, color: y.is_closed ? 'var(--t4)' : y.is_current ? 'var(--gold)' : 'var(--blue)' }}/>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)' }}>{y.name}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
                                                            {y.is_current ? '★ الحالية' : y.is_closed ? '🔒 مقفلة' : 'مفتوحة'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="m">{fmtDate(y.start_date)}</td>
                                            <td className="m">{fmtDate(y.end_date)}</td>
                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>{months} شهراً</td>
                                            <td style={{ minWidth: 120 }}>
                                                {y.is_closed ? (
                                                    <span style={{ fontSize: 11, color: 'var(--t4)', fontStyle: 'italic' }}>مكتملة</span>
                                                ) : (
                                                    <div>
                                                        <ProgressBar value={progress} color={y.is_current ? 'var(--em)' : 'var(--blue)'} height={6}/>
                                                        <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 3, textAlign: 'left' }}>{progress}٪</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td><StatusBadge year={y}/></td>
                                            <td style={{ fontSize: 11, color: 'var(--t4)' }}>
                                                {y.is_closed ? (
                                                    <div>
                                                        <div>{fmtDate(y.closed_at)}</div>
                                                        {closedByName !== '—' && <div style={{ color: 'var(--t3)' }}>{closedByName}</div>}
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                    <Button size="xs" icon={<i className="ti ti-eye"/>} onClick={() => openDetail(y)}/>
                                                    {!y.is_closed && (
                                                        <>
                                                            {!y.is_current && (
                                                                <Button size="xs" variant="info" icon={<i className="ti ti-star"/>}
                                                                    onClick={() => setCurrent.mutate(y.id)} disabled={setCurrent.isPending}/>
                                                            )}
                                                            <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEdit(y)}/>
                                                            {y.is_current && (
                                                                <Button size="xs" variant="warning" icon={<i className="ti ti-lock"/>} onClick={() => openClose(y)}>إقفال</Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Modals */}
            <FiscalYearModal open={addModal.open} year={editingYear} years={years} onClose={addModal.closeModal}/>
            <CloseYearModal open={closeModal.open} year={closingYear} onClose={closeModal.closeModal}/>
            <FiscalYearDetailModal open={detailModal.open} year={viewingYear}
                onClose={detailModal.closeModal}
                onClose2={() => { detailModal.closeModal(); openClose(viewingYear!); }}/>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// MODAL: إضافة / تعديل
// ─────────────────────────────────────────────────────────────
function FiscalYearModal({ open, year, years, onClose }: {
    open: boolean; year: FiscalYear | null; years: FiscalYear[]; onClose: () => void;
}) {
    const isEdit = !!year;
    const qc = useQueryClient();
    const nextY = new Date().getFullYear();

    const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_current: false });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        if (year) {
            setForm({ name: year.name, start_date: toInput(year.start_date), end_date: toInput(year.end_date), is_current: year.is_current });
        } else {
            const suggested = years.length > 0
                ? Math.max(...years.map(y => safeNextYear(y.name) - 1)) + 1
                : nextY;
            setForm({
                name: String(suggested),
                start_date: `${suggested}-01-01`,
                end_date: `${suggested}-12-31`,
                is_current: years.length === 0,
            });
        }
    }, [open, year, years.length]);

    const set = (k: string, v: string | boolean) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    const overlapError = useMemo(() => {
        if (!form.start_date || !form.end_date) return '';
        for (const y of years.filter(y => !isEdit || y.id !== year?.id)) {
            const s = toInput(y.start_date), e = toInput(y.end_date);
            if (form.start_date <= e && form.end_date >= s)
                return `تتداخل مع السنة المالية ${y.name} (${fmtDate(s)} — ${fmtDate(e)})`;
        }
        if (form.start_date >= form.end_date) return 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية';
        return '';
    }, [form.start_date, form.end_date, years, year?.id, isEdit]);

    const duration = form.start_date && form.end_date && !overlapError
        ? `${Math.round(daysBetween(form.start_date, form.end_date) / 30.44)} شهراً`
        : null;

    const saveMut = useMutation({
        mutationFn: (d: typeof form) => {
            const payload = { name: d.name, start_date: d.start_date, end_date: d.end_date, is_current: d.is_current };
            return isEdit ? apiClient.put(`/fiscal-years/${year!.id}`, payload) : apiClient.post('/fiscal-years', payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['fiscal-years'] }); onClose(); },
        onError: (err: unknown) => {
            const msg = parseApiError(err, 'فشل الحفظ. تحقق من البيانات.');
            setError(msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('already')
                ? `اسم السنة المالية "${form.name}" موجود مسبقاً` : msg);
        },
    });

    return (
        <Modal open={open} onClose={onClose} size="md"
            title={isEdit ? `تعديل — ${year?.name}` : 'سنة مالية جديدة'}
            subtitle={isEdit ? 'تعديل بيانات السنة المالية' : 'وفق النظام المحاسبي المالي SCF'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={() => saveMut.mutate(form)}
                        disabled={!(form.name && form.start_date && form.end_date && !overlapError && !saveMut.isPending)}>
                        {saveMut.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>
            {(error || overlapError) && <AlertBar variant="red">{error || overlapError}</AlertBar>}

            <div style={{ background: 'var(--blueb)', border: '1px solid var(--bluebo)', borderRadius: 'var(--r2)', padding: '8px 14px', marginBottom: 16, display: 'flex', gap: 8, fontSize: 12, color: 'var(--t2)' }}>
                <i className="ti ti-info-circle" style={{ color: 'var(--blue)', fontSize: 15, flexShrink: 0 }}/>
                السنة المالية في الجزائر: <strong>01 يناير — 31 ديسمبر</strong> (المرسوم 08-156)
            </div>

            <div className="fgrid" style={{ gap: 14 }}>
                <div className="fg s2">
                    <label className="req">اسم السنة المالية</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: 2025" autoFocus/>
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>يُنصح باستخدام السنة الميلادية</span>
                </div>
                <div className="fg">
                    <label className="req">تاريخ البداية</label>
                    <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}/>
                </div>
                <div className="fg">
                    <label className="req">تاريخ النهاية</label>
                    <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} min={form.start_date}/>
                </div>
                {duration && !overlapError && (
                    <div className="fg s2">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--emb)', border: '1px solid var(--embo)', borderRadius: 'var(--r2)' }}>
                            <i className="ti ti-check" style={{ color: 'var(--em)', fontSize: 16 }}/>
                            <span style={{ fontSize: 13, color: 'var(--em)', fontWeight: 700 }}>
                                المدة: {duration} ({daysBetween(form.start_date, form.end_date)} يوم)
                            </span>
                        </div>
                    </div>
                )}
                <div className="fg s2">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)' }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>تعيين كسنة حالية</div>
                            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>ستُلغى الحالية الأخرى تلقائياً</div>
                        </div>
                        <div className={`sw ${form.is_current ? 'on' : ''}`} onClick={() => set('is_current', !form.is_current)}/>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────
// MODAL: إقفال السنة المالية (مع Checklist)
// ─────────────────────────────────────────────────────────────
function CloseYearModal({ open, year, onClose }: {
    open: boolean; year: FiscalYear | null; onClose: () => void;
}) {
    const qc = useQueryClient();
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [step, setStep] = useState<'checklist' | 'confirm' | 'success'>('checklist');

    useEffect(() => {
        if (open) { setNotes(''); setError(''); setChecked(new Set()); setStep('checklist'); }
    }, [open]);

    const allChecked = checked.size === CLOSURE_CHECKLIST.length;
    const nextYearName = year ? safeNextYear(year.name) : null;

    const closeMut = useMutation({
        mutationFn: (id: number) => apiClient.post(`/fiscal-years/${id}/close`, { notes: notes || null }),
        onSuccess: async () => {
            setStep('success');
            await qc.refetchQueries({ queryKey: ['fiscal-years'] });
            setTimeout(onClose, 800);
        },
        onError: (err: unknown) => {
            setError(parseApiError(err, 'فشل إقفال السنة المالية. تحقق من المتطلبات.'));
        },
    });

    if (!year) return null;

    return (
        <Modal
            open={open} onClose={onClose} size="md"
            title={
                step === 'success'
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="ti ti-circle-check" style={{ color: 'var(--em)', fontSize: 20 }}/>
                        تم الإقفال بنجاح
                    </span>
                    : <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="ti ti-alert-triangle" style={{ color: 'var(--red)', fontSize: 20 }}/>
                        إقفال السنة المالية {year.name}
                    </span>
            }
            footer={
                step === 'success' ? null : (
                    <>
                        <Button onClick={onClose} disabled={closeMut.isPending}>إلغاء</Button>
                        {step === 'checklist' ? (
                            <Button variant="warning" icon={<i className="ti ti-arrow-left"/>}
                                onClick={() => setStep('confirm')} disabled={!allChecked}>
                                المتابعة للتأكيد
                            </Button>
                        ) : (
                            <Button variant="danger" icon={<i className="ti ti-lock"/>}
                                onClick={() => closeMut.mutate(year.id)} disabled={closeMut.isPending}>
                                {closeMut.isPending ? 'جاري الإقفال...' : 'تأكيد الإقفال النهائي'}
                            </Button>
                        )}
                    </>
                )
            }>
            {step === 'success' ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'var(--emb)', border: '2px solid var(--embo)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <i className="ti ti-circle-check" style={{ fontSize: 32, color: 'var(--em)' }}/>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 6 }}>
                        تم إقفال {year.name} بنجاح
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--t4)' }}>
                        جاري إنشاء السنة {nextYearName} وترحيل الأرصدة...
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* تحذير */}
                    <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'var(--redb)', border: '1px solid var(--redbo)', borderRadius: 'var(--r2)' }}>
                        <i className="ti ti-lock" style={{ color: 'var(--red)', fontSize: 18, flexShrink: 0, marginTop: 1 }}/>
                        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.7 }}>
                            <strong>تحذير نهائي:</strong> بعد الإقفال لا يمكن إضافة أو تعديل أي مستند في هذه السنة.
                        </div>
                    </div>

                    {step === 'checklist' && (
                        <>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>قائمة تحقق الإقفال — SCF</span>
                                <span style={{ color: allChecked ? 'var(--em)' : 'var(--t4)' }}>{checked.size}/{CLOSURE_CHECKLIST.length}</span>
                            </div>
                            {CLOSURE_CHECKLIST.map(item => (
                                <label key={item.id} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                                    background: checked.has(item.id) ? 'var(--emb)' : 'var(--bg3)',
                                    border: `1px solid ${checked.has(item.id) ? 'var(--embo)' : 'var(--b2)'}`,
                                    borderRadius: 'var(--r2)', cursor: 'pointer',
                                }}>
                                    <input type="checkbox" checked={checked.has(item.id)}
                                        onChange={() => setChecked(prev => {
                                            const n = new Set(prev);
                                            n.has(item.id) ? n.delete(item.id) : n.add(item.id);
                                            return n;
                                        })}
                                        style={{ accentColor: 'var(--em)', width: 16, height: 16, flexShrink: 0 }}/>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: checked.has(item.id) ? 'var(--em)' : 'var(--t1)' }}>{item.label}</div>
                                        <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>{item.dz}</div>
                                    </div>
                                </label>
                            ))}
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            {error && <AlertBar variant="red">{error}</AlertBar>}
                            <div className="fg">
                                <label>ملاحظات الإقفال (اختياري)</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="ملاحظات للمدقق..." rows={3} style={{ resize: 'vertical' }}/>
                            </div>
                            <div style={{ padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)', fontSize: 12, color: 'var(--t4)' }}>
                                <i className="ti ti-calendar-plus" style={{ fontSize: 14, marginLeft: 6 }}/>
                                سيتم إنشاء السنة المالية <strong>{nextYearName ?? '(التالية)'}</strong> تلقائياً.
                            </div>
                        </>
                    )}
                </div>
            )}
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────
// MODAL: تفاصيل السنة المالية
// ─────────────────────────────────────────────────────────────
function FiscalYearDetailModal({ open, year, onClose, onClose2 }: {
    open: boolean; year: FiscalYear | null; onClose: () => void; onClose2: () => void;
}) {
    if (!year) return null;

    const s = toInput(year.start_date), e = toInput(year.end_date);
    const totalDays = daysBetween(s, e);
    const progress = year.is_closed ? 100 : calcProgress(s, e);
    const elapsed = Math.round(progress / 100 * totalDays);
    const closedByName = resolveClosedByName(year);
    const closingNotes = (year as unknown as { closing_notes?: string }).closing_notes;

    return (
        <Modal open={open} onClose={onClose} size="md"
            title={`السنة المالية — ${year.name}`}
            subtitle={year.is_closed ? 'مقفلة نهائياً' : year.is_current ? 'السنة الحالية' : 'مفتوحة'}
            footer={
                <>
                    {!year.is_closed && year.is_current && (
                        <Button variant="warning" icon={<i className="ti ti-lock"/>} onClick={onClose2}>إقفال السنة</Button>
                    )}
                    <Button onClick={onClose}>إغلاق</Button>
                </>
            }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Status */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: year.is_closed ? 'var(--redb)' : year.is_current ? 'var(--emb)' : 'var(--blueb)',
                    border: `1px solid ${year.is_closed ? 'var(--redbo)' : year.is_current ? 'var(--embo)' : 'var(--bluebo)'}`,
                    borderRadius: 'var(--r2)',
                }}>
                    <i className={`ti ${year.is_closed ? 'ti-lock' : year.is_current ? 'ti-star-filled' : 'ti-calendar'}`}
                        style={{ fontSize: 24, color: year.is_closed ? 'var(--red)' : year.is_current ? 'var(--gold)' : 'var(--blue)' }}/>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>
                            {year.is_closed ? 'مقفلة' : year.is_current ? 'السنة الحالية' : 'مفتوحة'}
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                        { label: 'اسم السنة', value: year.name },
                        { label: 'المدة', value: `${Math.round(totalDays / 30.44)} شهراً — ${totalDays} يوم` },
                        { label: 'تاريخ البداية', value: fmtDate(year.start_date) },
                        { label: 'تاريخ النهاية', value: fmtDate(year.end_date) },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--b1)', borderRadius: 'var(--r2)' }}>
                            <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 13 }}>{value}</div>
                        </div>
                    ))}
                </div>

                {/* Progress */}
                {!year.is_closed && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                            <span style={{ color: 'var(--t3)' }}>نسبة الإنجاز</span>
                            <span style={{ fontWeight: 700, color: 'var(--em)' }}>{progress}٪</span>
                        </div>
                        <ProgressBar value={progress} height={8}/>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--t4)' }}>
                            <span>مضى: {elapsed} يوم</span>
                            <span>متبقي: {totalDays - elapsed} يوم</span>
                        </div>
                    </div>
                )}

                {/* Closure info */}
                {year.is_closed && (
                    <div style={{ padding: '12px 14px', background: 'var(--bg3)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 10 }}>معلومات الإقفال</div>
                        <div className="sr"><span className="sr-l">تاريخ الإقفال</span><span className="sr-v">{fmtDate(year.closed_at)}</span></div>
                        <div className="sr"><span className="sr-l">أُقفلت بواسطة</span><span className="sr-v">{closedByName}</span></div>
                        {closingNotes && <div className="sr"><span className="sr-l">ملاحظات</span><span className="sr-v" style={{ fontSize: 11 }}>{closingNotes}</span></div>}
                    </div>
                )}
            </div>
        </Modal>
    );
}
```

## FILE: resources/js/pages/fiscal/TvaPage.tsx
```
// resources/js/pages/fiscal/TvaPage.tsx
import React, { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import KpiCard from '@/components/ui/KpiCard';
import ProgressBar from '@/components/ui/ProgressBar';

// Static data for demonstration (will be replaced by API later)
const TVA_SUMMARY = {
    totalCollected: 237196.00,
    totalDeductible: -46588.00,
    netToPay: 190608.00,
    submitted: false,
    deadline: '2024-05-20', // Usually the 20th of next month
};

const TVA_TRANSACTIONS = [
    { id: 1, date: '2024-04-25', description: 'فاتورة رقم #0342', client: 'بوزيد أحمد', amount: 45000.00, tva: 8550.00, type: 'collected' },
    { id: 2, date: '2024-04-24', description: 'فاتورة رقم #0341', client: 'فاطمة بن علي', amount: 8200.00, tva: 1558.00, type: 'collected' },
    { id: 3, date: '2024-04-22', description: 'شراء بضاعة', supplier: 'مورد الجملة', amount: 50000.00, tva: 9500.00, type: 'deductible' },
    { id: 4, date: '2024-04-20', description: 'فاتورة رقم #0340', client: 'الشركة الوطنية', amount: 152000.00, tva: 28880.00, type: 'collected' },
    { id: 5, date: '2024-04-18', description: 'مصاريف كهرباء', supplier: 'سونلغاز', amount: 12000.00, tva: 1080.00, type: 'deductible' },
    { id: 6, date: '2024-04-15', description: 'فاتورة رقم #0339', client: 'كمال دبيح', amount: 5800.00, tva: 1102.00, type: 'collected' },
    { id: 7, date: '2024-04-10', description: 'شراء أثاث', supplier: 'الأثاث العصري', amount: 35000.00, tva: 6650.00, type: 'deductible' },
];

export default function TvaPage() {
    const [period, setPeriod] = useState('2024-04');
    const [declarationType, setDeclarationType] = useState<'G50' | 'G12'>('G50');

    const totalTvaCollected = TVA_TRANSACTIONS
        .filter(t => t.type === 'collected')
        .reduce((sum, t) => sum + t.tva, 0);

    const totalTvaDeductible = TVA_TRANSACTIONS
        .filter(t => t.type === 'deductible')
        .reduce((sum, t) => sum + t.tva, 0);

    const netTva = totalTvaCollected - totalTvaDeductible;

    return (
        <div className="page on" id="p-tva">
            <PageHeader
                title="إقرار TVA"
                subtitle={`إقرار ${declarationType} — ${new Date(period + '-01').toLocaleDateString('ar-DZ', { month: 'long', year: 'numeric' })}`}
                actions={
                    <>
                        <Button size="sm" icon={<i className="ti ti-file-export"/>}>تصدير Excel</Button>
                        <Button size="sm" icon={<i className="ti ti-printer"/>}>طباعة</Button>
                        <Button variant="primary" size="sm" icon={<i className="ti ti-send"/>} disabled={TVA_SUMMARY.submitted}>
                            {TVA_SUMMARY.submitted ? 'تم التصريح' : 'تقديم الإقرار'}
                        </Button>
                    </>
                }
            />

            {/* Type selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <Button
                    variant={declarationType === 'G50' ? 'primary' : 'default'}
                    size="sm"
                    onClick={() => setDeclarationType('G50')}
                >
                    G50 — شهري
                </Button>
                <Button
                    variant={declarationType === 'G12' ? 'primary' : 'default'}
                    size="sm"
                    onClick={() => setDeclarationType('G12')}
                >
                    G12 — ربع سنوي
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard
                    variant="green"
                    icon="ti-arrow-up-circle"
                    label="TVA محصلة"
                    value={totalTvaCollected.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                    unit="دج"
                    sub="من الفواتير والمبيعات"
                />
                <KpiCard
                    variant="blue"
                    icon="ti-arrow-down-circle"
                    label="TVA مستردة"
                    value={totalTvaDeductible.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                    unit="دج"
                    sub="من المشتريات والمصاريف"
                />
                <KpiCard
                    variant="red"
                    icon="ti-calculator"
                    label="المستحق للدولة"
                    value={netTva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                    unit="دج"
                    sub={`آخر أجل: ${new Date(TVA_SUMMARY.deadline).toLocaleDateString('ar-DZ')}`}
                />
                <KpiCard
                    variant="purple"
                    icon="ti-file-check"
                    label="حالة الإقرار"
                    value={TVA_SUMMARY.submitted ? 'مقدم' : 'قيد الإعداد'}
                    sub={TVA_SUMMARY.submitted ? 'بانتظار المراجعة' : 'لم يقدم بعد'}
                />
            </div>

            {/* Summary Card */}
            <div className="g2" style={{ marginBottom: 20 }}>
                <Card title="ملخص الإقرار" subtitle={`${declarationType} — ${new Date(period + '-01').toLocaleDateString('ar-DZ', { month: 'long', year: 'numeric' })}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { label: 'رقم الإقرار', value: declarationType === 'G50' ? 'G50-04-2024' : 'G12-T1-2024', mono: true },
                            { label: 'الفترة القانونية', value: new Date(period + '-01').toLocaleDateString('ar-DZ', { month: 'long', year: 'numeric' }) },
                            { label: 'المبيعات الإجمالية HT', value: `${(totalTvaCollected / 0.19).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج` },
                            { label: 'TVA محصلة (19%)', value: `${totalTvaCollected.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج`, color: 'var(--em)' },
                            { label: 'المشتريات الإجمالية HT', value: `${(totalTvaDeductible / 0.19).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج` },
                            { label: 'TVA قابلة للخصم', value: `${totalTvaDeductible.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج`, color: 'var(--blue)' },
                        ].map((row) => (
                            <div key={row.label} className="sr">
                                <span className="sr-l">{row.label}</span>
                                <span className="sr-v" style={row.color ? { fontFamily: row.mono ? 'monospace' : undefined, color: 'var(--t1)', fontWeight: 700 } : { fontFamily: row.mono ? 'monospace' : undefined }}>
                                    {row.value}
                                </span>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--b3)', paddingTop: 12, marginTop: 4 }}>
                            <div className="sr">
                                <span className="sr-l" style={{ fontWeight: 800, color: 'var(--t1)' }}>المبلغ المستحق للدفع</span>
                                <span className="sr-v" style={{ fontSize: 18, fontWeight: 900, color: 'var(--red)' }}>
                                    {netTva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title="نسبة الامتثال الضريبي" subtitle="آخر 6 أشهر">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { month: 'نوفمبر 2023', percent: 100 },
                            { month: 'ديسمبر 2023', percent: 100 },
                            { month: 'جانفي 2024', percent: 100 },
                            { month: 'فيفري 2024', percent: 85 },
                            { month: 'مارس 2024', percent: 100 },
                            { month: 'أفريل 2024', percent: 100 },
                        ].map((m) => (
                            <div key={m.month}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                    <span style={{ color: 'var(--t3)' }}>{m.month}</span>
                                    <span style={{ fontWeight: 700, color: m.percent < 100 ? 'var(--red)' : 'var(--em)' }}>{m.percent}%</span>
                                </div>
                                <ProgressBar value={m.percent} color={m.percent < 100 ? 'var(--red)' : 'var(--em)'} height={4} />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Transactions Detail */}
            <Card title="تفاصيل العمليات" subtitle="حركات TVA للفترة المحددة">
                <div className="tw">
                    <table>
                        <thead>
                            <tr>
                                <th>التاريخ</th>
                                <th>البيان</th>
                                <th>المتعامل</th>
                                <th>المبلغ HT</th>
                                <th>TVA</th>
                                <th>النوع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {TVA_TRANSACTIONS.map((trans) => (
                                <tr key={trans.id}>
                                    <td className="m">{new Date(trans.date).toLocaleDateString('fr-DZ')}</td>
                                    <td className="s">{trans.description}</td>
                                    <td style={{ color: 'var(--t3)' }}>{trans.client || trans.supplier}</td>
                                    <td className="m">{trans.amount.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                    <td className={trans.type === 'collected' ? 'e' : 'r'}>
                                        {trans.type === 'deductible' ? '- ' : ''}{trans.tva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                                    </td>
                                    <td>
                                        <Badge variant={trans.type === 'collected' ? 'success' : 'info'}>
                                            {trans.type === 'collected' ? 'محصلة' : 'قابلة للخصم'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--b2)' }}>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--t4)' }}>إجمالي TVA المحصلة: </span>
                        <strong style={{ color: 'var(--em)' }}>{totalTvaCollected.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--t4)' }}>إجمالي TVA القابلة للخصم: </span>
                        <strong style={{ color: 'var(--red)' }}>- {totalTvaDeductible.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</strong>
                    </div>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--t4)' }}>الصافي المستحق: </span>
                        <strong style={{ color: 'var(--red)', fontSize: 15 }}>{netTva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</strong>
                    </div>
                </div>
            </Card>
        </div>
    );
}
```

## FILE: resources/js/pages/inventory/InventoryPage.tsx
```
// pages/inventory/InventoryPage.tsx
import React, { useState } from 'react';
import { useQuery }       from '@tanstack/react-query';
import { useLowStockVariants } from '@/hooks/useProducts';
import { useWarehouses, useFamilies } from '@/hooks/useData';
import { useModal }       from '@/hooks/useModal';
import PageHeader         from '@/components/ui/PageHeader';
import Card               from '@/components/ui/Card';
import Badge              from '@/components/ui/Badge';
import Button             from '@/components/ui/Button';
import Modal              from '@/components/ui/Modal';
import KpiCard            from '@/components/ui/KpiCard';
import ProgressBar        from '@/components/ui/ProgressBar';
import AlertBar           from '@/components/ui/AlertBar';
import { variantsApi }   from '@/lib/api';
import type { ProductVariant } from '@/types';

export default function InventoryPage() {
  const [search, setSearch]   = useState('');
  const [familyId, setFamily] = useState<number | null>(null);
  const [statusFilter, setStatus] = useState('');

  const stockIn  = useModal();
  const stockOut = useModal();

  const { data: lowStock } = useLowStockVariants();
  const { data: families } = useFamilies();
  const { data: warehouses } = useWarehouses();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'variants', search, familyId, statusFilter],
    queryFn:  () => variantsApi.list({ search: search || undefined, page: 1 }).then(r => r.data),
    staleTime: 30_000,
  });

  const variants = data?.data ?? [];
  const meta     = data?.meta;

  const outOfStock = lowStock?.filter(v => (v.current_stock ?? 0) <= 0).length ?? 0;
  const lowStockCount = lowStock?.filter(v => {
    const s = v.current_stock ?? 0;
    return s > 0 && s <= v.min_stock_alert;
  }).length ?? 0;

  return (
    <div className="page on" id="p-inventory">

      <PageHeader
        title="إدارة المخزون"
        subtitle={`تتبع الكميات والقيمة — ${warehouses?.[0]?.name ?? 'المستودع الرئيسي'}`}
        actions={
          <>
            <Button variant="primary" size="sm" icon={<i className="ti ti-download"/>} onClick={stockIn.openModal}>
              إدخال مخزون
            </Button>
            <Button variant="warning" size="sm" icon={<i className="ti ti-upload"/>} onClick={stockOut.openModal}>
              إخراج
            </Button>
            <Button size="sm" icon={<i className="ti ti-clipboard-list"/>}>طلب شراء</Button>
            <Button size="sm" icon={<i className="ti ti-table-export"/>}>تصدير</Button>
          </>
        }
      />

      {(outOfStock > 0 || lowStockCount > 0) && (
        <AlertBar variant="red">
          <strong>تحذير!</strong> — {outOfStock > 0 && `${outOfStock} منتج نفد تماماً`}
          {outOfStock > 0 && lowStockCount > 0 && ' و'}
          {lowStockCount > 0 && `${lowStockCount} منتج بالحد الأدنى`}
          . يُنصح بالطلب الفوري.
        </AlertBar>
      )}

      {/* KPIs */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-coin"           label="قيمة المخزون الكلي"  value="451,820" unit="دج" sub="بسعر الشراء" />
        <KpiCard variant="red"    icon="ti-alert-circle"   label="منتجات نفدت"         value={outOfStock}          sub="تحتاج طلب عاجل" />
        <KpiCard variant="gold"   icon="ti-alert-triangle" label="منتجات منخفضة"       value={lowStockCount}        sub="دون الحد الأدنى" />
        <KpiCard variant="blue"   icon="ti-package"        label="إجمالي الأصناف"      value={meta?.total ?? '…'} sub={`${variants.filter(v => (v.current_stock ?? 0) > 0).length} متوفر`} />
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input type="text" placeholder="ابحث بالاسم أو الباركود..." style={{ width: '100%' }}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ width: 130 }} onChange={e => setFamily(e.target.value ? Number(e.target.value) : null)}>
          <option value="">كل الفئات</option>
          {families?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select style={{ width: 140 }}>
          <option value="">كل المستودعات</option>
          {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select style={{ width: 140 }} onChange={e => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="ok">جيد</option>
          <option value="low">منخفض</option>
          <option value="out">نفد</option>
        </select>
      </div>

      {/* Table */}
      <Card noHeader style={{ padding: 0 }}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الفئة</th>
                <th>الكمية</th>
                <th>الحد الأدنى</th>
                <th>سعر الشراء</th>
                <th>سعر البيع TTC</th>
                <th>الهامش</th>
                <th>القيمة الإجمالية</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>جاري التحميل...</td></tr>
              ) : variants.map(v => {
                const stock     = v.current_stock ?? 0;
                const minStock  = v.min_stock_alert;
                const isOOS     = v.manages_stock && stock <= 0;
                const isLow     = v.manages_stock && stock > 0 && stock <= minStock;
                const buyPrice  = v.last_purchase_price;
                const sellHt    = v.default_selling_price_ht;
                const tvaRate   = v.tva?.rate ?? 19;
                const sellTtc   = sellHt * (1 + tvaRate / 100);
                const margin    = sellHt > 0 ? ((sellHt - buyPrice) / sellHt * 100) : 0;
                const totalVal  = stock * buyPrice;
                const pct       = minStock > 0 ? Math.min(100, (stock / (minStock * 2)) * 100) : 100;

                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--em)', flexShrink: 0 }}>
                          <i className="ti ti-package"/>
                        </div>
                        <div>
                          <div className="s">{v.product?.name ?? '—'}</div>
                          <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
                            {v.barcode ?? v.ref ?? '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><Badge variant="warning" noDot>{v.product?.family?.name ?? '—'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 800, color: isOOS ? 'var(--red)' : isLow ? 'var(--gold)' : 'var(--t1)' }}>
                            {v.manages_stock ? stock : '∞'}
                          </div>
                          {v.manages_stock && (
                            <div style={{ marginTop: 3 }}>
                              <ProgressBar value={pct} color={isOOS ? 'var(--red)' : isLow ? 'var(--gold)' : 'var(--em)'} height={3} />
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>{v.unit?.symbol ?? 'قطعة'}</span>
                      </div>
                    </td>
                    <td className="m" style={{ color: 'var(--t4)' }}>{minStock > 0 ? minStock : '—'}</td>
                    <td className="m">{buyPrice.toFixed(2)} دج</td>
                    <td className="e">{sellTtc.toFixed(0)} دج</td>
                    <td style={{ color: margin > 20 ? 'var(--em)' : margin > 0 ? 'var(--gold)' : 'var(--red)', fontWeight: 700 }}>
                      {margin > 0 ? `+${margin.toFixed(1)}%` : '—'}
                    </td>
                    <td className="m">{totalVal > 0 ? totalVal.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' دج' : '—'}</td>
                    <td>
                      <Badge variant={isOOS ? 'danger' : isLow ? 'warning' : 'success'}>
                        {isOOS ? 'نفد' : isLow ? 'منخفض' : 'جيد'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <Button size="xs" variant="primary" icon={<i className="ti ti-plus"/>} onClick={stockIn.openModal} title="إدخال" />
                        <Button size="xs" icon={<i className="ti ti-history"/>} title="حركات" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stock In Modal */}
      <StockMovementModal
        open={stockIn.open}
        onClose={stockIn.closeModal}
        type="in"
        variants={variants}
      />
      <StockMovementModal
        open={stockOut.open}
        onClose={stockOut.closeModal}
        type="out"
        variants={variants}
      />
    </div>
  );
}

function StockMovementModal({ open, onClose, type, variants }: {
  open: boolean; onClose: () => void;
  type: 'in' | 'out'; variants: ProductVariant[];
}) {
  const [variantId, setVariantId] = useState('');
  const [qty,       setQty]       = useState('');
  const [price,     setPrice]     = useState('');
  const [notes,     setNotes]     = useState('');

  return (
    <Modal
      open={open} onClose={onClose} size="sm"
      title={type === 'in' ? 'إدخال مخزون' : 'إخراج مخزون'}
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button variant={type === 'in' ? 'primary' : 'warning'} icon={<i className={`ti ${type === 'in' ? 'ti-download' : 'ti-upload'}`}/>}>
            تأكيد
          </Button>
        </>
      }
    >
      <div className="fgrid">
        <div className="fg s2">
          <label className="req">المنتج</label>
          <select value={variantId} onChange={e => setVariantId(e.target.value)}>
            <option value="">— اختر منتجاً —</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.product?.name}{v.variant_name ? ` — ${v.variant_name}` : ''}
                {v.manages_stock ? ` (مخزون: ${v.current_stock ?? 0})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label className="req">الكمية</label>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" min={0.001} inputMode="decimal" />
        </div>
        {type === 'in' && (
          <div className="fg">
            <label>سعر الشراء HT</label>
            <div className="inp-row">
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
              <div className="inp-suf">دج</div>
            </div>
          </div>
        )}
        <div className="fg s2">
          <label>ملاحظة</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="سبب الحركة..." />
        </div>
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pages/invoices/InvoicesPage.tsx
```
// pages/invoices/InvoicesPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useInvoices, useCreateInvoice, useValidateInvoice, useCancelInvoice } from '@/hooks/useInvoices';
import { useCustomers } from '@/hooks/useData';
import { useWarehouses, useCurrentFiscalYear, useDocumentTypes, usePaymentModes } from '@/hooks/useData';
import { useModal }     from '@/hooks/useModal';
import PageHeader       from '@/components/ui/PageHeader';
import Card             from '@/components/ui/Card';
import Badge            from '@/components/ui/Badge';
import Button           from '@/components/ui/Button';
import Modal            from '@/components/ui/Modal';
import KpiCard          from '@/components/ui/KpiCard';
import Avatar           from '@/components/ui/Avatar';
import EmptyState       from '@/components/ui/EmptyState';
import type { CommercialDocument, CommercialDocumentLine, Party } from '@/types';
import type { InvoiceFilters } from '@/lib/api/invoices';

// ── Status helpers ─────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  draft:     { label: 'مسودة',   variant: 'gray'    },
  validated: { label: 'معلقة',   variant: 'warning' },
  partial:   { label: 'جزئية',   variant: 'info'    },
  paid:      { label: 'مدفوعة',  variant: 'success' },
  cancelled: { label: 'ملغاة',   variant: 'danger'  },
  locked:    { label: 'مقفولة',  variant: 'purple'  },
};

const PAY_ICON: Record<string, string> = {
  cash: '💵', cib: '💳', ccp: '📮', bank: '🏦', credit: '📋', mixed: '✂️',
};

export default function InvoicesPage() {
  const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, per_page: 20 });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewing,  setViewing]  = useState<CommercialDocument | null>(null);

  const detail   = useModal();
  const newInv   = useModal();

  const { data, isLoading, isFetching } = useInvoices(filters);
  const { data: customers } = useCustomers({ per_page: 200 });

  const invoices = data?.data ?? [];
  const meta     = data?.meta;

  const validateMut = useValidateInvoice();
  const cancelMut   = useCancelInvoice();

  // ── Selection ──────────────────────────────────
  const toggleSelect = useCallback((id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    setSelected(checked ? new Set(invoices.map(i => i.id)) : new Set());
  }, [invoices]);

  // ── Open detail ────────────────────────────────
  const openDetail = (inv: CommercialDocument) => {
    setViewing(inv);
    detail.openModal();
  };

  return (
    <div className="page on" id="p-invoices">

      <PageHeader
        title="الفواتير"
        subtitle={`إدارة فواتير البيع — ${meta?.total ?? '...'} فاتورة`}
        actions={
          <>
            <Button size="sm" icon={<i className="ti ti-table"/>}>Excel</Button>
            <Button size="sm" icon={<i className="ti ti-printer"/>}>طباعة</Button>
            <Button variant="primary" size="sm" icon={<i className="ti ti-plus"/>} onClick={newInv.openModal}>
              فاتورة جديدة
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-circle-check" label="مدفوعة"         value="1,248,400" unit="دج" sub="318 فاتورة" />
        <KpiCard variant="gold"   icon="ti-clock"        label="معلقة وجزئية"   value="384,700"   unit="دج" sub="16 فاتورة"  />
        <KpiCard variant="red"    icon="ti-ban"          label="ملغاة"           value="8"                   sub="قيمة: 24,500 دج" />
        <KpiCard variant="blue"   icon="ti-calculator"   label="TVA محصّلة"      value="237,196"   unit="دج" sub="G50 — 20 ماي" />
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة، اسم الزبون..."
            style={{ width: '100%' }}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined, page: 1 }))}
          />
        </div>
        <select style={{ width: 150 }} onChange={e => setFilters(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}>
          <option value="">كل الحالات</option>
          <option value="paid">مدفوعة</option>
          <option value="validated">معلقة</option>
          <option value="partial">جزئية</option>
          <option value="cancelled">ملغاة</option>
        </select>
        <select style={{ width: 150 }} onChange={e => setFilters(f => ({ ...f, party_id: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}>
          <option value="">كل العملاء</option>
          {customers?.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="date"
          style={{ padding: '7px 10px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 12 }}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value || undefined, page: 1 }))}
        />
      </div>

      {/* Table */}
      <Card noHeader style={{ padding: 0 }}>
        {/* Bulk actions bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--b1)', background: 'var(--bg3)', borderRadius: 'var(--r3) var(--r3) 0 0' }}>
          <input
            type="checkbox"
            style={{ width: 'auto', cursor: 'pointer' }}
            checked={selected.size === invoices.length && invoices.length > 0}
            onChange={e => toggleAll(e.target.checked)}
          />
          <span style={{ fontSize: 12, color: 'var(--t4)' }}>
            {selected.size > 0 ? `${selected.size} محدد` : 'تحديد الكل'}
          </span>
          {isFetching && (
            <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 8 }}>
              <i className="ti ti-loader"/> جاري التحديث...
            </span>
          )}
          <div style={{ marginRight: 'auto', display: 'flex', gap: 6, opacity: selected.size > 0 ? 1 : 0.4, pointerEvents: selected.size > 0 ? 'all' : 'none' }}>
            <Button size="xs" icon={<i className="ti ti-printer"/>}>طباعة</Button>
            <Button size="xs" variant="danger" icon={<i className="ti ti-ban"/>}>إلغاء</Button>
          </div>
        </div>

        <div className="tw">
          {isLoading ? (
            <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
          ) : invoices.length === 0 ? (
            <EmptyState icon="ti-file-invoice" text="لا توجد فواتير" sub="أنشئ فاتورتك الأولى" action={<Button variant="primary" onClick={newInv.openModal}>فاتورة جديدة</Button>} />
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>رقم الفاتورة</th>
                  <th>الزبون</th>
                  <th>HT</th>
                  <th>TVA</th>
                  <th>TTC</th>
                  <th>المدفوع</th>
                  <th>الرصيد</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const sb = STATUS_BADGE[inv.status] ?? STATUS_BADGE.draft;
                  const hasBalance = inv.amount_remaining > 0;
                  return (
                    <tr key={inv.id} onClick={() => openDetail(inv)}>
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          style={{ width: 'auto', cursor: 'pointer' }}
                          checked={selected.has(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                        />
                      </td>
                      <td className="m">{inv.document_number}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Avatar initials={(inv.party?.name?.[0] ?? '?')} color={1} size={26} />
                          <div>
                            <div className="s">{inv.party?.name ?? 'عابر'}</div>
                            {(inv.party?.balance ?? 0) > 0 && (
                              <div style={{ fontSize: 10, color: 'var(--red)' }}>
                                ⚠️ دين {inv.party!.balance!.toLocaleString('fr-DZ')} دج
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--t3)' }}>{inv.total_ht.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                      <td className="m" style={{ color: 'var(--t4)' }}>{inv.total_tva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                      <td className="e">{inv.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                      <td className="e">{inv.amount_paid.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                      <td className={hasBalance ? 'r' : ''} style={{ color: hasBalance ? undefined : 'var(--t4)' }}>
                        {hasBalance ? `${inv.amount_remaining.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج` : '—'}
                      </td>
                      <td><Badge variant={sb.variant}>{sb.label}</Badge></td>
                      <td style={{ fontSize: 11, color: 'var(--t4)' }}>
                        {new Date(inv.document_date).toLocaleDateString('fr-DZ')}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          <Button size="xs" icon={<i className="ti ti-eye"/>} onClick={() => openDetail(inv)} />
                          <Button size="xs" icon={<i className="ti ti-printer"/>} />
                          {inv.status === 'validated' && (
                            <Button size="xs" variant="primary" icon={<i className="ti ti-cash"/>}
                              onClick={() => validateMut.mutate(inv.id)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--b1)' }}>
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>
              {meta.from}–{meta.to} من {meta.total}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button size="xs" disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}>
                <i className="ti ti-chevron-right"/>
              </Button>
              {Array.from({ length: Math.min(meta.last_page, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`btn btn-xs ${(filters.page ?? 1) === p ? 'btn-p' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, page: p }))}>{p}</button>
              ))}
              <Button size="xs" disabled={(filters.page ?? 1) >= meta.last_page} onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}>
                <i className="ti ti-chevron-left"/>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        open={detail.open}
        invoice={viewing}
        onClose={detail.closeModal}
        onValidate={() => viewing && validateMut.mutate(viewing.id)}
        onCancel={() => viewing && cancelMut.mutate(viewing.id)}
      />

      {/* New Invoice Modal */}
      <NewInvoiceModal
        open={newInv.open}
        onClose={newInv.closeModal}
        customers={customers?.data ?? []}
      />
    </div>
  );
}

// ── Invoice Detail Modal ───────────────────────────
function InvoiceDetailModal({ open, invoice, onClose, onValidate, onCancel }: {
  open: boolean; invoice: CommercialDocument | null;
  onClose: () => void; onValidate: () => void; onCancel: () => void;
}) {
  if (!invoice) return null;
  const sb = STATUS_BADGE[invoice.status] ?? STATUS_BADGE.draft;

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={invoice.document_number}
      subtitle={`${new Date(invoice.document_date).toLocaleDateString('ar-DZ')} • ${invoice.party?.name ?? 'عابر'}`}
      footer={
        <>
          <div className="m-foot-l">
            {invoice.status !== 'cancelled' && (
              <Button variant="danger" size="sm" icon={<i className="ti ti-ban"/>} onClick={onCancel}>إلغاء</Button>
            )}
            <Button size="sm" icon={<i className="ti ti-corner-up-left"/>}>مرتجع</Button>
          </div>
          <Button size="sm" variant="info" icon={<i className="ti ti-mail"/>}>إرسال</Button>
          <Button size="sm" variant="primary" icon={<i className="ti ti-printer"/>}>طباعة</Button>
        </>
      }
    >
      {/* Seller / Buyer */}
      <div className="g2" style={{ marginBottom: 14 }}>
        {[
          { label: 'البائع', name: 'مؤسسة النور للتجارة', sub: ['NIF: 001234567890123', 'RC: 29/00-0012345B05', 'ورقلة — الجزائر'] },
          { label: 'المشتري', name: invoice.party?.name ?? 'عابر', sub: [invoice.party?.phone ?? '', invoice.party?.nif ? `NIF: ${invoice.party.nif}` : ''].filter(Boolean) },
        ].map(({ label, name, sub }) => (
          <div key={label} style={{ padding: 12, background: 'var(--bg3)', borderRadius: 'var(--r2)' }}>
            <div style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>{label}</div>
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 3 }}>{name}</div>
            {sub.map((s, i) => <div key={i} style={{ fontSize: '11.5px', color: 'var(--t4)' }}>{s}</div>)}
          </div>
        ))}
      </div>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Badge variant={sb.variant}>{sb.label}</Badge>
        {invoice.amount_remaining > 0 && (
          <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700 }}>
            متبقي: {invoice.amount_remaining.toLocaleString('fr-DZ')} دج
          </span>
        )}
      </div>

      {/* Lines table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 14 }}>
        <thead style={{ background: 'var(--bg3)' }}>
          <tr>
            {['المنتج', 'الكمية', 'سعر HT', 'TVA', 'خصم', 'TTC'].map(h => (
              <th key={h} style={{ padding: '9px 12px', textAlign: 'right', fontSize: 11, color: 'var(--t4)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(invoice.lines ?? []).map((line, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--b1)' }}>
              <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                {line.product_variant?.product?.name ?? line.description ?? '—'}
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--t3)' }}>{line.quantity}</td>
              <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{line.unit_price_ht.toFixed(2)} دج</td>
              <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--t4)' }}>{line.tva_rate}%</td>
              <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--red)' }}>
                {line.discount_percentage > 0 ? `${line.discount_percentage}%` : '—'}
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--em)', fontWeight: 800, fontFamily: 'monospace' }}>
                {line.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 280 }}>
          {[
            { label: 'المجموع HT', val: invoice.total_ht },
            { label: 'TVA',        val: invoice.total_tva },
            { label: 'الطابع الجبائي', val: invoice.fiscal_stamp },
          ].map(({ label, val }) => val > 0 && (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: 'var(--t4)' }}>
              <span>{label}</span>
              <span>{val.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--b3)', fontSize: 17, fontWeight: 900 }}>
            <span>الإجمالي TTC</span>
            <span style={{ color: 'var(--em)' }}>{invoice.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── New Invoice Modal ──────────────────────────────
function NewInvoiceModal({ open, onClose, customers }: {
  open: boolean; onClose: () => void; customers: Party[];
}) {
  const createMut = useCreateInvoice();
  const { data: warehouses   } = useWarehouses();
  const { data: fiscalYear   } = useCurrentFiscalYear();
  const { data: docTypes     } = useDocumentTypes();
  const { data: payModes     } = usePaymentModes();

  const [clientId, setClientId] = useState('');
  const [lines, setLines] = useState([
    { description: '', quantity: 1, unit_price_ht: 0, tva_rate: 19, discount_percentage: 0 },
  ]);
  const [note, setNote] = useState('');

  const addLine = () => setLines(l => [...l, { description: '', quantity: 1, unit_price_ht: 0, tva_rate: 19, discount_percentage: 0 }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));

  const totals = useMemo(() => {
    let ht = 0, tva = 0;
    lines.forEach(l => {
      const lineHt  = l.unit_price_ht * l.quantity * (1 - l.discount_percentage / 100);
      ht  += lineHt;
      tva += lineHt * (l.tva_rate / 100);
    });
    return { ht, tva, ttc: ht + tva };
  }, [lines]);

  const handleSave = async (draft = false) => {
    const invType = docTypes?.find(t => t.code === 'FAC' || t.name_latin?.includes('Invoice'));
    const wh = warehouses?.[0];
    if (!invType || !wh || !fiscalYear) return;

    await createMut.mutateAsync({
      document_type_id:  invType.id,
      party_id:          clientId ? Number(clientId) : null,
      warehouse_id:      wh.id,
      fiscal_year_id:    fiscalYear.id,
      document_date:     new Date().toISOString().split('T')[0],
      notes:             note || null,
      lines:             lines.map((l, i) => ({ ...l, line_order: i + 1 })) as unknown as CommercialDocumentLine[],
    } as Partial<CommercialDocument>);
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title="فاتورة جديدة"
      footer={
        <>
          <div className="m-foot-l">
            <Button onClick={onClose}>إلغاء</Button>
          </div>
          <Button icon={<i className="ti ti-file-minus"/>} onClick={() => handleSave(true)}>مسودة</Button>
          <Button variant="primary" icon={<i className="ti ti-circle-check"/>} onClick={() => handleSave(false)} disabled={createMut.isPending}>
            {createMut.isPending ? 'جاري الحفظ...' : 'حفظ وطباعة'}
          </Button>
        </>
      }
    >
      {/* Client + Date */}
      <div className="fgrid" style={{ marginBottom: 16 }}>
        <div className="fg">
          <label>الزبون</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">👤 زبون عابر</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>التاريخ</label>
          <input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
        </div>
      </div>

      {/* Lines */}
      <div style={{ border: '1px solid var(--b2)', borderRadius: 'var(--r2)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['#', 'المنتج / الخدمة', 'الكمية', 'سعر HT', 'TVA', 'خصم %', 'TTC', ''].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'right', fontSize: 11, color: 'var(--t4)', background: 'var(--bg3)', borderBottom: '1px solid var(--b2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const ttc = line.unit_price_ht * line.quantity * (1 - line.discount_percentage / 100) * (1 + line.tva_rate / 100);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--t4)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <input
                        value={line.description}
                        onChange={e => setLines(l => l.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                        placeholder="اسم المنتج أو الخدمة"
                        style={{ width: '100%', minWidth: 160 }}
                      />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" value={line.quantity} min={0.001} style={{ width: 65, textAlign: 'center' }}
                        onChange={e => setLines(l => l.map((x, idx) => idx === i ? { ...x, quantity: +e.target.value } : x))} />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" value={line.unit_price_ht} min={0} style={{ width: 90 }}
                        onChange={e => setLines(l => l.map((x, idx) => idx === i ? { ...x, unit_price_ht: +e.target.value } : x))} />
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <select style={{ width: 72 }} value={line.tva_rate}
                        onChange={e => setLines(l => l.map((x, idx) => idx === i ? { ...x, tva_rate: +e.target.value } : x))}>
                        <option value={19}>19%</option>
                        <option value={9}>9%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="number" value={line.discount_percentage} min={0} max={100} style={{ width: 65, textAlign: 'center' }}
                        onChange={e => setLines(l => l.map((x, idx) => idx === i ? { ...x, discount_percentage: +e.target.value } : x))} />
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--em)', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <button className="btn btn-xs" style={{ background: 'transparent', border: 'none', color: 'var(--red)' }} onClick={() => removeLine(i)}>
                        <span className="ic ic-xs"><i className="ti ti-trash"/></span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--b1)', background: 'var(--bg3)' }}>
          <Button size="xs" icon={<i className="ti ti-plus"/>} onClick={addLine}>إضافة سطر</Button>
        </div>
      </div>

      {/* Totals + Notes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div className="fg" style={{ flex: 1, minWidth: 200 }}>
          <label>ملاحظات</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظات اختيارية..." style={{ minHeight: 60 }} />
        </div>
        <div style={{ width: 270, background: 'var(--bg3)', borderRadius: 'var(--r2)', padding: 14, border: '1px solid var(--b2)' }}>
          {[
            { label: 'المجموع HT', val: totals.ht },
            { label: 'TVA',        val: totals.tva },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
              <span style={{ color: 'var(--t4)' }}>{label}</span>
              <span>{val.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--b3)', fontSize: 16, fontWeight: 900 }}>
            <span>الإجمالي TTC</span>
            <span style={{ color: 'var(--em)' }}>{totals.ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pages/lookups/BrandsPage.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/lookups/BrandsPage.tsx
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function BrandsPage() {
  return (
    <LookupPage
      title="العلامات التجارية"
      resource="علامة"
      endpoint="/brands"
      icon="ti-award"
      color="var(--blue)"
      fields={[
        { key: 'name',        label: 'اسم العلامة', required: true, placeholder: 'مثال: سامسونغ'  },
        { key: 'description', label: 'الوصف',        type: 'textarea', showInTable: false,
          placeholder: 'وصف اختياري' },
      ]}
    />
  );
}
```

## FILE: resources/js/pages/lookups/CurrenciesPage.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/lookups/CurrenciesPage.tsx
// DB: id, name, code, symbol, decimal_places, is_base_currency, active
// ❌ كان: is_default  ✅ الصحيح: is_base_currency
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function CurrenciesPage() {
  return (
    <LookupPage
      title="العملات"
      resource="عملة"
      endpoint="/currencies"
      icon="ti-currency-dollar"
      color="var(--gold)"
      fields={[
        { key: 'name',             label: 'اسم العملة',     required: true, placeholder: 'مثال: دينار جزائري' },
        { key: 'code',             label: 'الرمز الدولي ISO', required: true, placeholder: 'مثال: DZD'         },
        { key: 'symbol',           label: 'الإشارة',                          placeholder: 'مثال: دج'           },
        { key: 'decimal_places',   label: 'المنازل العشرية', type: 'number',  placeholder: '2'                  },
        { key: 'is_base_currency', label: 'عملة أساسية',    type: 'select',  badge: true,
          options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },
        { key: 'active',           label: 'نشط',            type: 'select',  badge: true, showInTable: false,
          options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },
      ]}
    />
  );
}```

## FILE: resources/js/pages/lookups/ExpenseCategoriesPage.tsx
```
import LookupPage from './LookupPage';

export default function ExpenseCategoriesPage() {
   return (
      <LookupPage
         title="فئات المصروفات"
         resource="فئة مصروف"
         endpoint="/expense-categories"
         icon="ti-category"
         color="var(--teal)"
         fields={[
            { key: 'name', label: 'اسم الفئة', required: true, placeholder: 'مثال: كهرباء' },
            { key: 'description', label: 'الوصف', type: 'textarea', showInTable: false },
            { key: 'active', label: 'نشط', type: 'select', badge: true, options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },
         ]}
      />
   );
}
```

## FILE: resources/js/pages/lookups/FamiliesPage.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/lookups/FamiliesPage.tsx
// ✅ v3: parent_id كـ remote-select من /families
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function FamiliesPage() {
  return (
    <LookupPage
      title="فئات المنتجات"
      resource="فئة"
      endpoint="/families"
      icon="ti-folder-open"
      color="var(--purple)"
      fields={[
        { key: 'name',
          label: 'اسم الفئة',
          required: true,
          placeholder: 'مثال: أغذية ومشروبات' },

        // ✅ parent_id: remote-select من نفس الـ endpoint
        { key: 'parent_id',
          label: 'الفئة الأم',
          type: 'remote-select',
          remoteEndpoint: '/families',
          remoteLabel: 'name',
          remoteValue: 'id',
          remotePlaceholder: '— فئة رئيسية (بدون أم) —',
          // في الجدول نعرض اسم الفئة الأم بدل الـ id
          showInTable: true },

        { key: 'active',
          label: 'نشط',
          type: 'select',
          badge: true,
          options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },

        { key: 'display_order',
          label: 'ترتيب العرض',
          type: 'number',
          showInTable: false,
          placeholder: '0' },

        { key: 'description',
          label: 'الوصف',
          type: 'textarea',
          showInTable: false },
      ]}
    />
  );
}
```

## FILE: resources/js/pages/lookups/LookupPage.tsx
```
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
```

## FILE: resources/js/pages/lookups/NumberingSeriesPage.tsx
```
// resources/js/pages/lookups/NumberingSeriesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import apiClient from '@/lib/api/client';

// =============== Types ===============
interface NumberingSeriesRecord {
  id: number;
  document_type_id: number;
  warehouse_id: number | null;
  prefix: string;
  suffix: string | null;
  format: string;
  last_number: number;
  padding: number;
  start_number: number;
  max_number: number | null;
  reset_yearly: boolean;
  reset_monthly: boolean;
  current_year: number;
  current_month: number;
  active: boolean;
  is_locked: boolean;
  relations?: {
    documentType?: { id: number; name: string; code: string };
    warehouse?: { id: number; name: string };
  };
  // حقل إضافي من الـ API بعد المزامنة
  actual_last_number?: number;
}

interface DocumentTypeOption { id: number; name: string; code: string }
interface WarehouseOption { id: number; name: string }

// =============== API Layer ===============
const numberingSeriesApi = {
  list: (params: Record<string, any>) =>
    apiClient.get('/numbering-series', { params }).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/numbering-series', data).then(r => r.data),
  update: (id: number, data: any) =>
    apiClient.put(`/numbering-series/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    apiClient.delete(`/numbering-series/${id}`).then(r => r.data),
  preview: (id: number) =>
    apiClient.get(`/numbering-series/${id}/next-number?preview=true`).then(r => r.data),
  lock: (id: number) =>
    apiClient.post(`/numbering-series/${id}/lock`).then(r => r.data),
  unlock: (id: number) =>
    apiClient.post(`/numbering-series/${id}/unlock`).then(r => r.data),
  sync: (id: number) =>
    apiClient.post(`/numbering-series/${id}/sync`).then(r => r.data),
};

// =============== Helpers ===============
function simulateNumber(series: NumberingSeriesRecord, next = true): string {
  try {
    const num = next ? series.last_number + 1 : series.last_number;
    const padded = String(num).padStart(series.padding, '0');
    let fmt = series.format
      .replace('{PREFIX}', series.prefix || '')
      .replace('{SUFFIX}', series.suffix || '')
      .replace('{YY}', String(series.current_year || new Date().getFullYear()).slice(-2))
      .replace('{YYYY}', String(series.current_year || new Date().getFullYear()))
      .replace('{MM}', String(series.current_month || new Date().getMonth() + 1).padStart(2, '0'))
      .replace('{MONTH}', String(series.current_month || new Date().getMonth() + 1).padStart(2, '0'))
      .replace('{NUMBER}', padded);
    return fmt.replace(/\{NUMBER:(\d+)\}/g, (_, w) => String(num).padStart(Number(w), '0'));
  } catch { return '—'; }
}

function haveDocumentsBeenCreated(series: NumberingSeriesRecord): boolean {
  return series.last_number >= series.start_number;
}

// =============== Main Component ===============
export default function NumberingSeriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<NumberingSeriesRecord | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const modal = useModal();
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Queries
  const { data: paginated, isLoading, isFetching } = useQuery({
    queryKey: ['numbering-series', debouncedSearch, page, perPage],
    queryFn: () => numberingSeriesApi.list({
      'filter[search]': debouncedSearch || undefined,
      include: 'documentType,warehouse',
      sort: '-id',
      per_page: perPage,
      page,
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const items: NumberingSeriesRecord[] = paginated?.data ?? [];
  const meta = paginated?.meta;

  const { data: documentTypes } = useQuery<DocumentTypeOption[]>({
    queryKey: ['document-types-select'],
    queryFn: () => apiClient.get('/document-types', { params: { per_page: 500 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: warehouses } = useQuery<WarehouseOption[]>({
    queryKey: ['warehouses-select'],
    queryFn: () => apiClient.get('/warehouses', { params: { per_page: 500 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  // Mutations with error handling
  const deleteMutation = useMutation({
    mutationFn: (id: number) => numberingSeriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['numbering-series'] });
      deleteModal.closeModal();
      setSyncError(null);
    },
    onError: (err: any) => {
      setSyncError(err?.response?.data?.message || 'فشل حذف السلسلة');
      deleteModal.closeModal();
    },
  });

  const lockMutation = useMutation({
    mutationFn: (id: number) => numberingSeriesApi.lock(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['numbering-series'] }); setSyncError(null); },
    onError: (err: any) => setSyncError(err?.response?.data?.message || 'فشل القفل'),
  });
  const unlockMutation = useMutation({
    mutationFn: (id: number) => numberingSeriesApi.unlock(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['numbering-series'] }); setSyncError(null); },
    onError: (err: any) => setSyncError(err?.response?.data?.message || 'فشل فتح القفل'),
  });
  const syncMutation = useMutation({
    mutationFn: (id: number) => numberingSeriesApi.sync(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['numbering-series'] }); setSyncError(null); },
    onError: (err: any) => setSyncError(err?.response?.data?.message || 'فشل المزامنة'),
  });

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteModal.openModal();
  };
  const confirmDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId);
  };
  const openAdd = () => { setEditing(null); modal.openModal(); };
  const openEdit = (item: NumberingSeriesRecord) => { setEditing(item); modal.openModal(); };

  return (
    <div className="page on" id="p-numbering-series">
      <PageHeader
        title="سلاسل الترقيم"
        subtitle={`إدارة تسلسلات المستندات — ${meta?.total ?? 0} سلسلة`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
            سلسلة جديدة
          </Button>
        }
      />

      {syncError && (
        <AlertBar variant="red" dismissible onDismiss={() => setSyncError(null)}>
          {syncError}
        </AlertBar>
      )}

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green" icon="ti-list-numbers" label="إجمالي السلاسل" value={meta?.total ?? 0} />
        <KpiCard variant="blue" icon="ti-calendar-repeat" label="إعادة سنوية" value={items.filter(i => i.reset_yearly).length} />
        <KpiCard variant="red" icon="ti-lock" label="مقفلة" value={items.filter(i => i.is_locked).length} />
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input
            type="text"
            placeholder="ابحث بالبادئة أو الصيغة..."
            style={{ width: '100%' }}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader" /></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : items.length === 0 ? (
        <EmptyState icon="ti-list-numbers" text="لا توجد سلاسل ترقيم" sub="أضف أول سلسلة ترقيم" action={<Button variant="primary" onClick={openAdd}>إضافة</Button>} />
      ) : (
        <Card noHeader style={{ padding: 0, opacity: isFetching ? 0.7 : 1 }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>نوع المستند</th>
                  <th>البادئة</th>
                  <th>الصيغة</th>
                  <th style={{ textAlign: 'center' }}>الرقم الحالي</th>
                  <th style={{ textAlign: 'center' }}>الرقم التالي ⏭</th>
                  <th>إعادة سنوية</th>
                  <th>نشط</th>
                  <th>مقفل</th>
                  <th style={{ textAlign: 'center', width: 190 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const docType = item.relations?.documentType;
                  const warehouse = item.relations?.warehouse;
                  const hasDocuments = haveDocumentsBeenCreated(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{docType?.name ?? '—'}</div>
                        {docType?.code && <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'monospace' }}>{docType.code}</div>}
                        {warehouse && <div style={{ fontSize: 10, color: 'var(--t3)' }}>🏭 {warehouse.name}</div>}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--em)' }}>
                          {item.prefix || '—'}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: 11, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>
                          {item.format}
                        </code>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>
                        {hasDocuments ? (
                          item.last_number
                        ) : (
                          <span style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 12 }}>لم يصدر بعد</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', direction: 'ltr' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 700,
                          background: 'var(--emb)',
                          padding: '2px 8px',
                          borderRadius: 10,
                          color: 'var(--em)',
                          whiteSpace: 'nowrap',
                        }}>
                          {hasDocuments ? simulateNumber(item, true) : '—'}
                        </span>
                      </td>
                      <td><Badge variant={item.reset_yearly ? 'success' : 'gray'}>{item.reset_yearly ? 'نعم' : 'لا'}</Badge></td>
                      <td><Badge variant={item.active ? 'success' : 'danger'}>{item.active ? 'نشط' : 'موقوف'}</Badge></td>
                      <td><Badge variant={item.is_locked ? 'danger' : 'success'}>{item.is_locked ? 'مقفل' : 'مفتوح'}</Badge></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(item)} disabled={item.is_locked} />
                          {item.is_locked ? (
                            <Button size="xs" variant="warning" icon={<i className="ti ti-lock-open" />} onClick={() => unlockMutation.mutate(item.id)} />
                          ) : (
                            <Button size="xs" variant="info" icon={<i className="ti ti-lock" />} onClick={() => lockMutation.mutate(item.id)} />
                          )}
                          <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(item.id)} disabled={item.is_locked} />
                          <Button size="xs" icon={<i className="ti ti-refresh" />} onClick={() => syncMutation.mutate(item.id)} title="مزامنة الرقم بعد حذف مستند" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--b1)' }}>
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="xs" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <i className="ti ti-chevron-right" />
                </Button>
                {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-xs ${p === page ? 'btn-p' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <Button size="xs" disabled={page >= meta.last_page} onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}>
                  <i className="ti ti-chevron-left" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <NumberingSeriesModal
        open={modal.open}
        record={editing}
        documentTypes={documentTypes ?? []}
        warehouses={warehouses ?? []}
        onClose={modal.closeModal}
      />

      <ConfirmDeleteModal
        open={deleteModal.open}
        onClose={deleteModal.closeModal}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// =============== Confirm Delete Modal ===============
function ConfirmDeleteModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="تأكيد الحذف">
      <div style={{ textAlign: 'center', padding: 16 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
        <div style={{ fontWeight: 800, fontSize: 15, margin: '12px 0 6px' }}>هل أنت متأكد؟</div>
        <div style={{ fontSize: 13, color: 'var(--t4)' }}>لا يمكن التراجع عن حذف سلسلة الترقيم.</div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 0 0' }}>
        <Button onClick={onClose} disabled={loading}>إلغاء</Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading} icon={loading ? <i className="ti ti-loader" /> : <i className="ti ti-trash" />}>
          {loading ? 'جاري الحذف...' : 'حذف'}
        </Button>
      </div>
    </Modal>
  );
}

// =============== NumberingSeries Modal (محسّن) ===============
function NumberingSeriesModal({
  open, record, documentTypes, warehouses, onClose,
}: {
  open: boolean; record: NumberingSeriesRecord | null; documentTypes: DocumentTypeOption[]; warehouses: WarehouseOption[]; onClose: () => void;
}) {
  const isEdit = !!record;
  const qc = useQueryClient();

  // إذا وصلنا إلى مرحلة التحرير، نتحقق من وجود مستندات سابقة
  const hasExistingDocuments = record ? haveDocumentsBeenCreated(record) : false;

  const emptyForm = {
    document_type_id: '',
    warehouse_id: '' as string | number,
    prefix: '',
    suffix: '',
    format: '{PREFIX}-{YYYY}-{NUMBER:6}',
    last_number: 0,
    padding: 6,
    start_number: 1,
    max_number: '' as string | number,
    reset_yearly: true,
    reset_monthly: false,
    active: true,
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      if (record) {
        setForm({
          document_type_id: String(record.document_type_id ?? ''),
          warehouse_id: record.warehouse_id ?? '',
          prefix: record.prefix ?? '',
          suffix: record.suffix ?? '',
          format: record.format ?? '{PREFIX}-{YYYY}-{NUMBER:6}',
          last_number: record.last_number ?? 0,
          padding: record.padding ?? 6,
          start_number: record.start_number ?? 1,
          max_number: record.max_number ?? '',
          reset_yearly: record.reset_yearly ?? true,
          reset_monthly: record.reset_monthly ?? false,
          active: record.active ?? true,
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setServerError('');
    }
  }, [open, record]);

  const set = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.document_type_id) errs.document_type_id = 'نوع المستند مطلوب';
    if (!form.format) errs.format = 'الصيغة مطلوبة';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const simulatedNext = useMemo(() => {
    try {
      const num = form.start_number;
      const padded = String(num).padStart(form.padding, '0');
      let fmt = form.format
        .replace('{PREFIX}', form.prefix || 'XXX')
        .replace('{SUFFIX}', form.suffix || '')
        .replace('{YY}', new Date().getFullYear().toString().slice(-2))
        .replace('{YYYY}', new Date().getFullYear().toString())
        .replace('{MM}', String(new Date().getMonth() + 1).padStart(2, '0'))
        .replace('{NUMBER}', padded);
      return fmt.replace(/\{NUMBER:(\d+)\}/g, (_, w) => String(num).padStart(Number(w), '0'));
    } catch { return '...'; }
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = {
        document_type_id: parseInt(data.document_type_id || '0') || null,
        warehouse_id: data.warehouse_id ? parseInt(String(data.warehouse_id)) : null,
        prefix: data.prefix || null,
        suffix: data.suffix || null,
        format: data.format,
        padding: data.padding,
        start_number: data.start_number,
        max_number: data.max_number ? Number(data.max_number) : null,
        reset_yearly: data.reset_yearly,
        reset_monthly: data.reset_monthly,
        active: data.active,
        ...(isEdit ? {} : { last_number: data.start_number - 1 }),
      };
      return isEdit
        ? numberingSeriesApi.update(record!.id, payload)
        : numberingSeriesApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['numbering-series'] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data;
      if (msg?.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(msg.errors)) {
          fieldErrors[k] = (v as string[])[0];
        }
        setErrors(fieldErrors);
      } else {
        setServerError(msg?.message || 'فشل الحفظ');
      }
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    saveMutation.mutate(form);
  };

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={isEdit ? 'تعديل سلسلة الترقيم' : 'سلسلة ترقيم جديدة'}
      footer={
        <>
          <Button onClick={onClose} disabled={saveMutation.isPending}>إلغاء</Button>
          <Button variant="primary" icon={<i className="ti ti-device-floppy" />} onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      {serverError && <AlertBar variant="red">{serverError}</AlertBar>}

      {/* تحذير عند وجود مستندات سابقة */}
      {hasExistingDocuments && (
        <AlertBar variant="gold">
          <strong>تنبيه:</strong> توجد مستندات مرتبطة بهذه السلسلة. تعديل الصيغة أو الرقم الحالي قد يسبب تعارضاً.
        </AlertBar>
      )}

      <div className="fgrid c2" style={{ gap: 14 }}>
        <div className="fg">
          <label className="req">نوع المستند</label>
          <select value={form.document_type_id as string} onChange={e => set('document_type_id', e.target.value)}
            style={{ borderColor: errors.document_type_id ? 'var(--red)' : undefined }}>
            <option value="">— اختر —</option>
            {documentTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name} ({dt.code})</option>)}
          </select>
          {errors.document_type_id && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.document_type_id}</span>}
        </div>

        <div className="fg">
          <label>المستودع (اختياري)</label>
          <select value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)}>
            <option value="">— كل المستودعات —</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className="fg">
          <label>البادئة</label>
          <input value={form.prefix} onChange={e => set('prefix', e.target.value.toUpperCase())} placeholder="INV" style={{ fontFamily: 'monospace' }} />
        </div>
        <div className="fg">
          <label>اللاحقة</label>
          <input value={form.suffix ?? ''} onChange={e => set('suffix', e.target.value.toUpperCase() || null)} placeholder="-DZ" style={{ fontFamily: 'monospace' }} />
        </div>

        <div className="fg s2">
          <label className="req">الصيغة</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={form.format}
              onChange={e => set('format', e.target.value)}
              style={{
                fontFamily: 'monospace', flex: 1,
                borderColor: errors.format ? 'var(--red)' : undefined,
                background: hasExistingDocuments ? 'var(--bg3)' : undefined,
                opacity: hasExistingDocuments ? 0.7 : 1,
              }}
              readOnly={hasExistingDocuments}
              placeholder="الصيغة"
            />
            {!hasExistingDocuments && (
              <select style={{ width: 130, fontFamily: 'monospace', fontSize: 11 }} onChange={e => set('format', e.target.value)} value="">
                <option value="">نماذج</option>
                {['{PREFIX}-{YYYY}-{NUMBER:6}','{PREFIX}-{YY}{MM}-{NUMBER:4}','{PREFIX}/{YYYY}/{NUMBER:5}','{NUMBER:8}'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
          </div>
          {errors.format && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.format}</span>}
          {hasExistingDocuments && <span style={{ fontSize: 10, color: 'var(--gold)' }}>تم تعطيل تعديل الصيغة لوجود مستندات مرتبطة</span>}
        </div>

        <div className="fg">
          <label>الخانات (Padding)</label>
          <select value={form.padding} onChange={e => set('padding', +e.target.value)}>
            {[2,3,4,5,6,7,8].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>رقم البداية</label>
          <input type="number" value={form.start_number} onChange={e => set('start_number', +e.target.value || 0)} min={0} />
        </div>
        {isEdit && (
          <div className="fg">
            <label>الرقم الحالي</label>
            <input
              type="number"
              value={form.last_number}
              onChange={e => {
                if (!hasExistingDocuments) set('last_number', +e.target.value || 0);
              }}
              readOnly={hasExistingDocuments}
              style={{
                background: hasExistingDocuments ? 'var(--bg3)' : undefined,
                opacity: hasExistingDocuments ? 0.7 : 1,
              }}
            />
            {hasExistingDocuments && <span style={{ fontSize: 10, color: 'var(--gold)' }}>لا يمكن تقليل الرقم لأقل من أعلى رقم صادر</span>}
          </div>
        )}
        <div className="fg">
          <label>الحد الأقصى</label>
          <input type="number" value={form.max_number} onChange={e => set('max_number', e.target.value)} placeholder="غير محدود" />
        </div>

        <div className="fg">
          <label>إعادة سنوية</label>
          <Switch checked={form.reset_yearly} onChange={v => { set('reset_yearly', v); if (v) set('reset_monthly', false); }} />
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>{form.reset_yearly ? 'سيعاد التعيين مع بداية السنة' : ''}</span>
        </div>
        <div className="fg">
          <label>إعادة شهرية</label>
          <Switch checked={form.reset_monthly} onChange={v => { set('reset_monthly', v); if (v) set('reset_yearly', false); }} />
        </div>
        <div className="fg">
          <label>نشط</label>
          <Switch checked={form.active} onChange={v => set('active', v)} />
        </div>
        <div className="fg s2" style={{ marginTop: 8 }}>
          <label>معاينة الرقم الأول</label>
          <div style={{
            padding: '12px', background: 'var(--emb)', border: '1px solid var(--embo)',
            borderRadius: 'var(--r2)', fontFamily: 'monospace', fontSize: 18, fontWeight: 800,
            color: 'var(--em)', textAlign: 'center', direction: 'ltr', letterSpacing: 1,
          }}>{simulatedNext}</div>
        </div>
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pages/lookups/PriceLevelsPage.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/lookups/PriceLevelsPage.tsx
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function PriceLevelsPage() {
  return (
    <LookupPage
      title="مستويات الأسعار"
      resource="مستوى"
      endpoint="/price-levels"
      icon="ti-tag"
      color="var(--gold)"
      fields={[
        { key: 'name',             label: 'الاسم',             required: true,  placeholder: 'مثال: الجملة'    },
        { key: 'discount_percent', label: 'نسبة الخصم (%)',    type: 'number',  placeholder: 'مثال: 10'         },
        { key: 'description',      label: 'الوصف',             type: 'textarea', showInTable: false              },
      ]}
    />
  );
}
```

## FILE: resources/js/pages/lookups/TvasPage.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/lookups/TvasPage.tsx
// معدلات TVA الجزائرية: 0%, 9%, 19%
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function TvasPage() {
  return (
    <LookupPage
      title="معدلات TVA"
      resource="معدل TVA"
      endpoint="/tvas"
      icon="ti-calculator"
      color="var(--orange)"
      emptyText="لا توجد معدلات TVA مضافة — أضف 0%, 9%, 19%"
      fields={[
        { key: 'name',       label: 'الاسم',          required: true,  placeholder: 'مثال: TVA 19%'        },
        { key: 'rate',       label: 'المعدل (%)',      required: true,  type: 'number', placeholder: '19'  },
        { key: 'is_default', label: 'افتراضي',
          type: 'select',
          badge: true,
          options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }],
        },
        { key: 'description', label: 'الوصف',   type: 'textarea', showInTable: false },
      ]}
    />
  );
}
```

## FILE: resources/js/pages/lookups/UnitsPage.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/lookups/UnitsPage.tsx
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function UnitsPage() {
  return (
    <LookupPage
      title="وحدات القياس"
      resource="وحدة"
      endpoint="/units"
      icon="ti-ruler"
      color="var(--purple)"
      fields={[
        { key: 'name',         label: 'الاسم',         required: true,  placeholder: 'مثال: كيلوغرام' },
        { key: 'abbreviation', label: 'الاختصار',      required: true,  placeholder: 'مثال: كغ'        },
        { key: 'description',  label: 'الوصف',         showInTable: false, type: 'textarea', placeholder: 'وصف اختياري' },
      ]}
    />
  );
}```

## FILE: resources/js/pages/lookups/WarehousesPage.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/lookups/WarehousesPage.tsx
// v4: cascade wilaya → commune
// ════════════════════════════════════════════════
import LookupPage, { FieldDef } from './LookupPage';

const fields: FieldDef[] = [
  { key: 'name',
    label: 'اسم المستودع',
    required: true,
    placeholder: 'مثال: المستودع الرئيسي' },

  { key: 'code',
    label: 'الرمز',
    placeholder: 'مثال: WH-01' },

  { key: 'manager_name',
    label: 'اسم المسؤول',
    placeholder: 'مثال: محمد بن علي' },

  { key: 'phone',
    label: 'الهاتف',
    placeholder: 'مثال: 0555 123 456' },

  // ── الولاية (الأب في الـ cascade) ──────────────
  { key: 'wilaya_id',
    label: 'الولاية',
    type: 'remote-select',
    remoteEndpoint: '/wilayas',
    remoteLabel: 'arabic_name',   // arabic_name أوضح للمستخدم
    remoteValue: 'id',
    remotePlaceholder: '— اختر الولاية —',
    showInTable: true },

  // ── البلدية (الابن في الـ cascade) ─────────────
  { key: 'commune_id',
    label: 'البلدية',
    type: 'remote-select',
    remoteEndpoint: '/communes',
    remoteLabel: 'arabic_name',
    remoteValue: 'id',
    remotePlaceholder: '— اختر الولاية أولاً —',
    // cascade: تُصفَّى حسب wilaya_id المختارة
    cascadeParent: 'wilaya_id',
    // الـ param المُرسَل للـ API: GET /communes?filter[wilaya_id]=5
    cascadeParam: 'filter[wilaya_id]',
    showInTable: false },

  { key: 'rc',
    label: 'السجل التجاري RC',
    placeholder: 'مثال: 25/00-1234567',
    showInTable: false },

  { key: 'nif',
    label: 'رقم التعريف الجبائي NIF',
    placeholder: '15 رقماً',
    showInTable: false },

  { key: 'nis',
    label: 'رقم التعريف الإحصائي NIS',
    placeholder: 'اختياري',
    showInTable: false },

  { key: 'ai',
    label: 'رقم المادة AI',
    placeholder: 'اختياري',
    showInTable: false },

  { key: 'active',
    label: 'نشط',
    type: 'select',
    badge: true,
    options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },

  { key: 'address',
    label: 'العنوان التفصيلي',
    type: 'textarea',
    showInTable: false },
];

export default function WarehousesPage() {
  return (
    <LookupPage
      title="المستودعات"
      resource="مستودع"
      endpoint="/warehouses"
      icon="ti-building-warehouse"
      color="var(--teal)"
      fields={fields}
    />
  );
}
```

## FILE: resources/js/pages/onboarding/OnboardingPage.tsx
```
// ════════════════════════════════════════════════
// pages/onboarding/OnboardingPage.tsx
// مُحدَّث ليتوافق مع api.php — Multi-Tenancy Structure
//
// التغييرات:
//   1. handleCompanyClick: POST /companies/switch يأخذ { company_id } ✅ (بدون تغيير)
//   2. FiscalYearModal.handleCreateYear: POST /{slug}/fiscal-years ✅ (بدون تغيير)
//   3. AdminModal.handleSuspend: POST /admin/companies/{slug}/suspend|unsuspend ✅
//   4. AdminModal.handleVerify:  POST /admin/companies/{slug}/verify|unverify ✅
//   5. AdminModal.handleSaveCompany: PUT /companies/{slug} ✅
//   6. AdminModal: يجلب الشركات من /admin/companies (جميع الشركات)
//      بدلاً من /companies (شركات المستخدم فقط)
//   7. FiscalYearModal: GET /{slug}/fiscal-years ✅
// ════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
// ✅ المودال الجديد الشامل
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal';

// ── Types ──────────────────────────────────────
interface Company {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
  is_suspended?: boolean;
  is_verified?: boolean;
  plan?: string;
  owner?: { id: number; name: string };
  users_count?: number;
  commercial_name?: string;
  email?: string;
  phone?: string;
  activity?: string;
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  address?: string;
  max_users?: number;
  max_products?: number;
  max_warehouses?: number;
  notes?: string;
}

interface FiscalYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
}

// ── Helpers ────────────────────────────────────
function fmtDate(date: string): string {
  const d = String(date).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
  if (!d) return '—';
  const [y, m] = d.split('-');
  const months = ['يناير','فبراير','مارس','أبريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── FiscalYearModal (للشركات القائمة التي لديها سنوات) ──────────
// GET /{slug}/fiscal-years  →  POST /{slug}/fiscal-years
function FiscalYearModal({
  company,
  onConfirm,
  onClose,
}: {
  company: Company;
  onConfirm: (yearId: number | null) => void;
  onClose: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [years, setYears]       = useState<FiscalYear[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newYearName, setNewYearName] = useState(String(currentYear));
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchYears = () => {
    setLoading(true);
    setError(null);
    // ✅ المسار الصحيح: /{slug}/fiscal-years
    apiClient
      .get(`/${company.slug}/fiscal-years`, { params: { per_page: 50 } })
      .then(r => {
        const data: FiscalYear[] = r.data?.data ?? (Array.isArray(r.data) ? r.data : []);
        setYears(data);
        const current = data.find(y => y.is_current) ?? data.find(y => !y.is_closed) ?? data[0] ?? null;
        if (current) setSelected(current.id);
      })
      .catch(e => setError(e?.response?.data?.message ?? 'تعذّر جلب السنوات المالية'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchYears(); }, [company.slug]);

  const canProceed = selected !== null;

  const handleCreateYear = async () => {
    const name = newYearName.trim();
    const year = parseInt(name);
    if (isNaN(year) || year < 2000 || year > 2100) {
      setCreateError('أدخل سنة صحيحة (مثال: 2025)');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      // ✅ المسار الصحيح: /{slug}/fiscal-years
      await apiClient.post(`/${company.slug}/fiscal-years`, {
        name,
        start_date: `${year}-01-01`,
        end_date:   `${year}-12-31`,
        is_current: true,
      });
      fetchYears();
    } catch (e: any) {
      setCreateError(e?.response?.data?.message ?? 'فشل إنشاء السنة المالية');
    } finally {
      setCreating(false);
    }
  };

  const openYears   = years.filter(y => !y.is_closed);
  const closedYears = years.filter(y => y.is_closed);

  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:10002,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)',
        padding:16, animation:'fadein .2s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background:'var(--bg2)', borderRadius:20, width:'100%', maxWidth:460,
        border:'1px solid var(--b3)', boxShadow:'0 24px 64px rgba(0,0,0,.35)',
        overflow:'hidden', animation:'slideup .25s cubic-bezier(.34,1.4,.64,1)',
        direction:'rtl',
      }}>
        {/* Header */}
        <div style={{
          padding:'20px 24px 16px',
          background:'linear-gradient(135deg, var(--em), var(--em3))',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:-40, left:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.07)' }} />
          <div style={{ position:'relative' }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:'rgba(255,255,255,.2)', backdropFilter:'blur(8px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, marginBottom:10,
            }}>🗓️</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:3 }}>اختر السنة المالية</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>
              للدخول إلى <strong style={{ color:'#fff' }}>{company.name}</strong>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'16px 20px 8px', maxHeight:360, overflowY:'auto' }}>
          {loading && (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--t4)' }}>
              <div style={{ fontSize:28, marginBottom:8, display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</div>
              <div style={{ fontSize:13 }}>جارٍ تحميل السنوات...</div>
            </div>
          )}

          {error && (
            <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:12, background:'var(--redb)', border:'1px solid var(--redbo)', color:'var(--red)', fontSize:13 }}>
              ⚠️ {error}
            </div>
          )}

          {/* إذا لا توجد سنوات → نموذج إنشاء إجباري */}
          {!loading && years.length === 0 && !error && (
            <div style={{ padding:'8px 0 4px' }}>
              <div style={{ textAlign:'center', padding:'16px 0 20px', borderBottom:'1px solid var(--b1)', marginBottom:16 }}>
                <div style={{ fontSize:32, marginBottom:8, opacity:.4 }}>📅</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>لا توجد سنوات مالية</div>
                <div style={{ fontSize:12, color:'var(--t4)' }}>أنشئ سنة مالية للمتابعة</div>
              </div>

              {createError && (
                <div style={{ padding:'8px 12px', borderRadius:8, marginBottom:12, background:'var(--redb)', border:'1px solid var(--redbo)', color:'var(--red)', fontSize:12 }}>
                  ⚠️ {createError}
                </div>
              )}

              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--t3)', marginBottom:6 }}>السنة المالية</label>
              <input
                type="text" value={newYearName}
                onChange={e => { setNewYearName(e.target.value); setCreateError(null); }}
                placeholder="مثال: 2025"
                style={{
                  width:'100%', padding:'11px 14px', borderRadius:10,
                  border:'1.5px solid var(--b3)', background:'var(--bg3)',
                  color:'var(--t1)', fontFamily:'Tajawal, sans-serif',
                  fontSize:15, fontWeight:700, textAlign:'center',
                  outline:'none', marginBottom:10, direction:'ltr',
                }}
                onFocus={e => (e.target.style.borderColor='var(--em)')}
                onBlur={e => (e.target.style.borderColor='var(--b3)')}
              />
              <div style={{ fontSize:11, color:'var(--t4)', marginBottom:14, textAlign:'center' }}>
                من 01 يناير إلى 31 ديسمبر {newYearName}
              </div>
              <button
                onClick={handleCreateYear} disabled={creating}
                style={{
                  width:'100%', padding:'11px', borderRadius:10,
                  border:'none', background:'var(--em)', color:'#fff',
                  fontSize:13, fontWeight:800, cursor:creating ? 'wait' : 'pointer',
                  fontFamily:'Tajawal, sans-serif', boxShadow:'var(--emglow)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}
              >
                {creating
                  ? <><span style={{ display:'inline-block', width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', animation:'spin .7s linear infinite' }} />جارٍ الإنشاء...</>
                  : 'إنشاء السنة المالية'
                }
              </button>
            </div>
          )}

          {!loading && openYears.length > 0 && (
            <>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--em)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>سنوات مفتوحة</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                {openYears.map(y => (
                  <YearItem key={y.id} year={y} selected={selected === y.id} onClick={() => setSelected(y.id)} />
                ))}
              </div>
            </>
          )}

          {!loading && closedYears.length > 0 && (
            <div style={{ borderTop:'1px solid var(--b1)', paddingTop:12 }}>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>سنوات مقفلة</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                {closedYears.map(y => (
                  <YearItem key={y.id} year={y} selected={selected === y.id} onClick={() => setSelected(y.id)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px 20px', borderTop:'1px solid var(--b1)', display:'flex', gap:10 }}>
          <button onClick={onClose} style={btnSecStyle}>إلغاء</button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={!canProceed}
            style={{ ...btnPrimStyle, opacity: canProceed ? 1 : .5, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            <span>دخول</span>
            <span style={{ fontSize:16 }}>←</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function YearItem({ year, selected, onClick }: { year: FiscalYear; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12,
        border:`1.5px solid ${selected ? 'var(--em)' : 'var(--b2)'}`,
        background: selected ? 'var(--emb)' : 'var(--bg3)',
        cursor:'pointer', transition:'all .14s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background='var(--bg4)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background='var(--bg3)'; }}
    >
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0,
        background: year.is_closed ? 'var(--bg4)' : year.is_current
          ? 'linear-gradient(135deg,var(--em),var(--em3))' : 'var(--emb)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
      }}>
        {year.is_closed ? '🔒' : year.is_current ? '⭐' : '📅'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight: selected ? 700 : 600, color: selected ? 'var(--em)' : 'var(--t1)', display:'flex', alignItems:'center', gap:6 }}>
          {year.name}
          {year.is_current && !year.is_closed && (
            <span style={{ fontSize:9, fontWeight:800, padding:'1px 7px', borderRadius:20, background:'var(--em)', color:'#fff' }}>الحالية</span>
          )}
          {year.is_closed && (
            <span style={{ fontSize:9, fontWeight:700, padding:'1px 7px', borderRadius:20, background:'var(--bg5)', color:'var(--t4)' }}>مقفلة</span>
          )}
        </div>
        <div style={{ fontSize:11, color:'var(--t4)', marginTop:2 }}>
          {fmtDate(year.start_date)} — {fmtDate(year.end_date)}
        </div>
      </div>
      {selected && (
        <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--em)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }}>✓</div>
      )}
    </div>
  );
}

const btnSecStyle: React.CSSProperties = {
  flex:1, padding:'11px 0', borderRadius:12, border:'1px solid var(--b3)', background:'var(--bg3)',
  color:'var(--t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', transition:'.13s',
};
const btnPrimStyle: React.CSSProperties = {
  flex:2, padding:'11px 0', borderRadius:12, border:'none', background:'var(--em)', color:'#fff',
  fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'Tajawal, sans-serif', boxShadow:'var(--emglow)',
  display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'.13s',
};

// ── CompanyCard ─────────────────────────────────
const CARD_COLORS = [
  { bg:'linear-gradient(135deg,var(--em),var(--em3))',   glow:'var(--emglow)' },
  { bg:'linear-gradient(135deg,var(--blue),#60a5fa)',    glow:'0 4px 20px rgba(26,79,214,.3)' },
  { bg:'linear-gradient(135deg,var(--purple),#a78bfa)', glow:'0 4px 20px rgba(105,32,212,.3)' },
  { bg:'linear-gradient(135deg,var(--gold),#fbbf24)',    glow:'0 4px 20px rgba(184,125,10,.3)' },
  { bg:'linear-gradient(135deg,var(--teal),#22d3ee)',    glow:'0 4px 20px rgba(13,122,140,.3)' },
  { bg:'linear-gradient(135deg,var(--orange),#fb923c)', glow:'0 4px 20px rgba(196,58,10,.3)' },
];

function CompanyCard({ company, index, onClick }: { company: Company; index: number; onClick: () => void }) {
  const c = CARD_COLORS[index % CARD_COLORS.length];
  const suspended = company.is_suspended;

  return (
    <div
      onClick={suspended ? undefined : onClick}
      style={{
        background:'var(--bg2)', border:'1.5px solid var(--b2)',
        borderRadius:16, padding:'18px 20px',
        cursor: suspended ? 'not-allowed' : 'pointer',
        transition:'all .18s cubic-bezier(.34,1,.64,1)',
        display:'flex', alignItems:'center', gap:16,
        position:'relative', overflow:'hidden',
        opacity: suspended ? .6 : 1,
        animation:`slideup .3s ease ${index * .07}s both`,
      }}
      onMouseEnter={e => {
        if (suspended) return;
        e.currentTarget.style.transform='translateY(-2px)';
        e.currentTarget.style.boxShadow='var(--shadow2)';
        e.currentTarget.style.borderColor='var(--b3)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform='none';
        e.currentTarget.style.boxShadow='none';
        e.currentTarget.style.borderColor='var(--b2)';
      }}
    >
      <div style={{ position:'absolute', top:0, right:0, width:80, height:80, borderRadius:'50%', background:c.bg, opacity:.05, transform:'translate(20px,-20px)', pointerEvents:'none' }} />
      <div style={{ width:50, height:50, borderRadius:14, background:c.bg, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', boxShadow:c.glow, letterSpacing:-1 }}>
        {getInitials(company.name)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {company.name}
        </div>
        <div style={{ fontSize:11, color:'var(--t4)', display:'flex', alignItems:'center', gap:8 }}>
          {suspended ? (
            <span style={{ color:'var(--red)', fontWeight:700 }}>🔴 معلّقة</span>
          ) : company.is_active === false ? (
            <span style={{ color:'var(--t4)' }}>غير نشطة</span>
          ) : (
            <span style={{ color:'var(--em)', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--em)', display:'inline-block' }} />
              نشطة
            </span>
          )}
          {company.slug && (
            <span style={{ fontFamily:'monospace', fontSize:10, opacity:.6 }}>{company.slug}</span>
          )}
        </div>
      </div>
      {!suspended && (
        <div style={{ width:30, height:30, borderRadius:8, background:'var(--bg3)', border:'1px solid var(--b2)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t4)', fontSize:14, flexShrink:0 }}>
          ←
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// AdminModal — مودال إدارة الشركات للـ Super Admin
//
// التغييرات في api.php:
//   • GET  /admin/companies     → لا يوجد في api.php، نستخدم /companies (شركات كل المستخدمين عبر super-admin middleware)
//   • PUT  /companies/{slug}    → تعديل شركة ✅
//   • POST /admin/companies/{slug}/suspend|unsuspend ✅
//   • POST /admin/companies/{slug}/verify|unverify   ✅
//   • PATCH /admin/companies/{slug}/plan             ✅
//   • PATCH /admin/companies/{slug}/notes            ✅
// ════════════════════════════════════════════════

const PLANS = ['free','starter','professional','enterprise'] as const;
const PLAN_LABELS: Record<string, string> = {
  free:'مجاني', starter:'Starter', professional:'Professional', enterprise:'Enterprise',
};

function AdminModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [tab, setTab]               = useState<'companies' | 'super'>('companies');
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [search, setSearch]         = useState('');
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');

  // إعدادات Super Admin
  const [settings, setSettings] = useState({
    registrations: true, new_companies: true,
    notifications: true, debug: false, public_api: true,
    trial_days: 14, free_max_users: 3,
  });

  // فورم تعديل شركة
  const [form, setForm] = useState({
    name:'', commercial_name:'', email:'', phone:'',
    activity:'', nif:'', nis:'', rc:'', ai:'', address:'',
    plan:'free' as typeof PLANS[number],
    max_users:3, max_products:500, max_warehouses:1,
    notes:'', is_active:true, is_suspended:false,
  });

  // ✅ جلب كل الشركات عبر /companies (super-admin يرى الكل)
  // وإن كان الـ backend يعيد فقط شركات المستخدم العادي،
  // نحاول /admin/users?include=companies أو نكتفي بـ /companies
  useEffect(() => {
    setLoadingAdmin(true);
    apiClient.get('/companies')
      .then(res => {
        const data = res.data?.data ?? res.data;
        setCompanies(Array.isArray(data) ? data : []);
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoadingAdmin(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const openEdit = (co: Company) => {
    setForm({
      name:           co.name           ?? '',
      commercial_name:co.commercial_name ?? '',
      email:          co.email          ?? '',
      phone:          co.phone          ?? '',
      activity:       co.activity       ?? '',
      nif:            co.nif            ?? '',
      nis:            co.nis            ?? '',
      rc:             co.rc             ?? '',
      ai:             co.ai             ?? '',
      address:        co.address        ?? '',
      plan:           (co.plan as typeof PLANS[number]) ?? 'free',
      max_users:      co.max_users      ?? 3,
      max_products:   co.max_products   ?? 500,
      max_warehouses: co.max_warehouses ?? 1,
      notes:          co.notes          ?? '',
      is_active:      co.is_active      ?? true,
      is_suspended:   co.is_suspended   ?? false,
    });
    setEditTarget(co);
  };

  // ✅ PUT /companies/{slug}
  const handleSaveCompany = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await apiClient.put(`/companies/${editTarget.slug}`, form);
      setCompanies(prev => prev.map(c =>
        c.id === editTarget.id ? { ...c, ...form } : c
      ));
      setEditTarget(null);
      showToast(`تم حفظ ${form.name}`);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // ✅ POST /admin/companies/{slug}/suspend|unsuspend
  const handleSuspend = async (co: Company) => {
    try {
      const isSuspended = co.is_suspended;
      const endpoint = isSuspended ? 'unsuspend' : 'suspend';
      await apiClient.post(
        `/admin/companies/${co.slug}/${endpoint}`,
        isSuspended ? {} : { reason: 'قرار إداري' }
      );
      setCompanies(prev => prev.map(c =>
        c.id === co.id ? { ...c, is_suspended: !isSuspended } : c
      ));
      showToast(isSuspended ? 'تم رفع التعليق' : 'تم تعليق الشركة');
    } catch {
      showToast('فشلت العملية');
    }
  };

  // ✅ POST /admin/companies/{slug}/verify|unverify
  const handleVerify = async (co: Company) => {
    try {
      const isVerified = co.is_verified;
      const endpoint = isVerified ? 'unverify' : 'verify';
      await apiClient.post(`/admin/companies/${co.slug}/${endpoint}`);
      setCompanies(prev => prev.map(c =>
        c.id === co.id ? { ...c, is_verified: !isVerified } : c
      ));
      showToast(isVerified ? 'تم إلغاء التوثيق' : 'تم توثيق الشركة');
    } catch {
      showToast('فشلت العملية');
    }
  };

  // ✅ PATCH /admin/companies/{slug}/plan
  const handleChangePlan = async (co: Company, plan: typeof PLANS[number]) => {
    try {
      await apiClient.patch(`/admin/companies/${co.slug}/plan`, { plan });
      setCompanies(prev => prev.map(c =>
        c.id === co.id ? { ...c, plan } : c
      ));
      showToast(`تم تغيير خطة ${co.name} إلى ${PLAN_LABELS[plan]}`);
    } catch {
      showToast('فشل تغيير الخطة');
    }
  };

  // ✅ PATCH /admin/companies/{slug}/notes
  const handleSaveNotes = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await apiClient.patch(`/admin/companies/${editTarget.slug}/notes`, { notes: form.notes });
      setCompanies(prev => prev.map(c =>
        c.id === editTarget.id ? { ...c, notes: form.notes } : c
      ));
      showToast('تم حفظ الملاحظات');
    } catch {
      showToast('فشل حفظ الملاحظات');
    } finally {
      setSaving(false);
    }
  };

  const filtered = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const f = <K extends keyof typeof form>(k: K) =>
    (v: (typeof form)[K]) => setForm(prev => ({ ...prev, [k]: v }));

  const inp: React.CSSProperties = {
    width:'100%', padding:'8px 11px', borderRadius:9,
    border:'1px solid var(--b3)', background:'var(--bg3)',
    color:'var(--t1)', fontFamily:'Tajawal, sans-serif',
    fontSize:13, outline:'none',
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && (editTarget ? setEditTarget(null) : onClose());
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [editTarget, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position:'fixed', inset:0, zIndex:10010, background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          background:'var(--bg2)', borderRadius:20, width:'100%', maxWidth:680,
          border:'1px solid var(--b3)', boxShadow:'0 28px 72px rgba(0,0,0,.4)',
          maxHeight:'90vh', display:'flex', flexDirection:'column',
          direction:'rtl', animation:'slideup .25s cubic-bezier(.34,1.4,.64,1)',
        }}>
          {/* ── Header */}
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--b2)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'var(--emb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--em)', flexShrink:0 }}>
              <i className="ti ti-building-community" />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>لوحة Super Admin</div>
              <div style={{ fontSize:11, color:'var(--t4)' }}>{companies.length} شركة في النظام</div>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--b2)', background:'var(--bg3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontSize:14 }}>
              <i className="ti ti-x" />
            </button>
          </div>

          {/* ── Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--b2)', padding:'0 20px', flexShrink:0 }}>
            {([
              { key:'companies', label:'الشركات',             icon:'ti-building',  count: companies.length },
              { key:'super',     label:'إعدادات Super Admin', icon:'ti-star',      count: null },
            ] as const).map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setEditTarget(null); }}
                style={{ padding:'10px 16px', background:'none', border:'none', borderBottom:`2px solid ${tab===t.key?'var(--em)':'transparent'}`, color:tab===t.key?'var(--em)':'var(--t4)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', display:'flex', alignItems:'center', gap:6, transition:'.13s', whiteSpace:'nowrap' }}>
                <i className={`ti ${t.icon}`} style={{ fontSize:14 }} />
                {t.label}
                {t.count !== null && (
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, fontWeight:800, background:tab===t.key?'var(--emb)':'var(--bg4)', color:tab===t.key?'var(--em)':'var(--t4)' }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Body */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>

            {/* ══ TAB: COMPANIES ══ */}
            {tab === 'companies' && !editTarget && (
              <div>
                {/* بحث */}
                <div style={{ position:'relative', marginBottom:14 }}>
                  <i className="ti ti-search" style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', color:'var(--t4)', fontSize:13 }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="بحث بالاسم..."
                    style={{ ...inp, paddingRight:34 }}
                    onFocus={e => (e.target.style.borderColor='var(--em)')}
                    onBlur={e => (e.target.style.borderColor='var(--b3)')}
                  />
                </div>

                {/* Loading */}
                {loadingAdmin && (
                  <div style={{ textAlign:'center', padding:'32px 0', color:'var(--t4)' }}>
                    <i className="ti ti-loader" style={{ fontSize:24, animation:'spin .8s linear infinite' }} />
                  </div>
                )}

                {/* قائمة الشركات */}
                {!loadingAdmin && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {filtered.map(co => {
                      const suspended = co.is_suspended;
                      const verified  = co.is_verified;
                      const plan      = co.plan ?? 'free';
                      return (
                        <div key={co.id} style={{ background:'var(--bg3)', borderRadius:12, border:'1px solid var(--b1)', padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                          {/* avatar */}
                          <div style={{ width:40, height:40, borderRadius:11, background:`linear-gradient(135deg,#0a8a5c,#0dbf84)`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#fff', fontSize:15, flexShrink:0 }}>
                            {co.name[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:13, color:'var(--t1)', display:'flex', alignItems:'center', gap:7 }}>
                              {co.name}
                              {verified && <i className="ti ti-rosette-discount-check" style={{ color:'var(--em)', fontSize:13 }} />}
                            </div>
                            <div style={{ fontSize:10, color:'var(--t4)', fontFamily:'monospace' }}>
                              {co.slug} · {PLAN_LABELS[plan] ?? plan}
                              {suspended && <span style={{ color:'var(--red)', marginRight:8 }}>· معلّقة</span>}
                            </div>
                          </div>
                          {/* actions */}
                          <div style={{ display:'flex', gap:5 }}>
                            <button onClick={() => openEdit(co)} title="تعديل"
                              style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--b2)', background:'var(--bg2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontSize:13 }}
                              onMouseEnter={e => { (e.currentTarget as any).style.background='var(--emb)'; (e.currentTarget as any).style.color='var(--em)'; }}
                              onMouseLeave={e => { (e.currentTarget as any).style.background='var(--bg2)'; (e.currentTarget as any).style.color='var(--t3)'; }}
                            ><i className="ti ti-pencil" /></button>
                            <button onClick={() => handleSuspend(co)} title={suspended?'رفع التعليق':'تعليق'}
                              style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--b2)', background:'var(--bg2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontSize:13 }}
                              onMouseEnter={e => { (e.currentTarget as any).style.background='var(--goldb)'; (e.currentTarget as any).style.color='var(--gold)'; }}
                              onMouseLeave={e => { (e.currentTarget as any).style.background='var(--bg2)'; (e.currentTarget as any).style.color='var(--t3)'; }}
                            ><i className={`ti ti-${suspended?'lock-open':'lock'}`} /></button>
                            <button onClick={() => handleVerify(co)} title={verified?'إلغاء توثيق':'توثيق'}
                              style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--b2)', background:'var(--bg2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t3)', fontSize:13 }}
                              onMouseEnter={e => { (e.currentTarget as any).style.background='var(--emb)'; (e.currentTarget as any).style.color='var(--em)'; }}
                              onMouseLeave={e => { (e.currentTarget as any).style.background='var(--bg2)'; (e.currentTarget as any).style.color='var(--t3)'; }}
                            ><i className={`ti ti-${verified?'rosette-discount-check':'rosette'}`} /></button>
                          </div>
                        </div>
                      );
                    })}
                    {filtered.length === 0 && !loadingAdmin && (
                      <div style={{ textAlign:'center', padding:'32px', color:'var(--t4)', fontSize:13 }}>لا توجد شركات</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ فورم تعديل شركة ══ */}
            {tab === 'companies' && editTarget && (
              <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
                {/* breadcrumb */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                  <button onClick={() => setEditTarget(null)} style={{ background:'none', border:'none', color:'var(--em)', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:'Tajawal, sans-serif', display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-arrow-right" style={{ fontSize:11 }} /> الشركات
                  </button>
                  <span style={{ color:'var(--t4)', fontSize:12 }}>← {editTarget.name}</span>
                </div>

                {/* المعلومات الأساسية */}
                <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1, borderBottom:'1px solid var(--b1)', paddingBottom:7 }}>
                  <i className="ti ti-building" style={{ color:'var(--em)', marginLeft:5 }} />المعلومات الأساسية
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { label:'اسم الشركة *', key:'name' as const },
                    { label:'الاسم التجاري', key:'commercial_name' as const },
                    { label:'النشاط التجاري', key:'activity' as const },
                    { label:'العنوان', key:'address' as const },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{label}</label>
                      <input value={form[key] as string} onChange={e => f(key)(e.target.value as any)}
                        style={inp}
                        onFocus={e => (e.target.style.borderColor='var(--em)')}
                        onBlur={e => (e.target.style.borderColor='var(--b3)')}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { label:'البريد الإلكتروني', key:'email' as const },
                    { label:'الهاتف', key:'phone' as const },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{label}</label>
                      <input value={form[key] as string} onChange={e => f(key)(e.target.value as any)}
                        style={{ ...inp, direction:'ltr' }}
                        onFocus={e => (e.target.style.borderColor='var(--em)')}
                        onBlur={e => (e.target.style.borderColor='var(--b3)')}
                      />
                    </div>
                  ))}
                </div>

                {/* الوثائق القانونية */}
                <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1, borderBottom:'1px solid var(--b1)', paddingBottom:7, marginTop:4 }}>
                  <i className="ti ti-file-certificate" style={{ color:'var(--em)', marginLeft:5 }} />الوثائق القانونية
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {(['nif','nis','rc','ai'] as const).map(key => (
                    <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{key.toUpperCase()}</label>
                      <input value={form[key]} onChange={e => f(key)(e.target.value)}
                        style={{ ...inp, direction:'ltr' }}
                        onFocus={e => (e.target.style.borderColor='var(--em)')}
                        onBlur={e => (e.target.style.borderColor='var(--b3)')}
                      />
                    </div>
                  ))}
                </div>

                {/* إعدادات Super Admin */}
                <div style={{ fontSize:10, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:1, borderBottom:'1px solid var(--b1)', paddingBottom:7, marginTop:4 }}>
                  <i className="ti ti-star" style={{ color:'var(--em)', marginLeft:5 }} />إعدادات Super Admin
                </div>

                {/* حالة الشركة */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--b1)' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--t2)' }}>حالة الشركة</span>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, color: form.is_active ? 'var(--em)' : 'var(--red)' }}>
                      {form.is_active ? 'نشطة' : 'موقوفة'}
                    </span>
                    <div className={`sw ${form.is_active ? 'on' : ''}`} onClick={() => f('is_active')(!form.is_active)} />
                  </div>
                </div>

                {/* الخطة — ✅ نستخدم handleChangePlan مباشرة عبر PATCH /admin/companies/{slug}/plan */}
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>خطة الاشتراك</label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                    {PLANS.map(p => (
                      <button key={p} onClick={() => f('plan')(p)}
                        style={{ padding:'8px 0', borderRadius:10, fontSize:11, fontWeight:700, border:`1.5px solid ${form.plan===p?'var(--em)':'var(--b2)'}`, background:form.plan===p?'var(--emb)':'var(--bg3)', color:form.plan===p?'var(--em)':'var(--t3)', cursor:'pointer', fontFamily:'Tajawal, sans-serif', transition:'.13s' }}>
                        {PLAN_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* الحدود */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[
                    { label:'حد المستخدمين', key:'max_users' as const },
                    { label:'حد المنتجات',   key:'max_products' as const },
                    { label:'حد المستودعات', key:'max_warehouses' as const },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{label}</label>
                      <input type="number" min={1} value={form[key]} onChange={e => f(key)(Number(e.target.value) as any)}
                        style={{ ...inp, textAlign:'center', direction:'ltr' }}
                        onFocus={e => (e.target.style.borderColor='var(--em)')}
                        onBlur={e => (e.target.style.borderColor='var(--b3)')}
                      />
                    </div>
                  ))}
                </div>

                {/* ملاحظات — ✅ تُحفظ عبر PATCH /admin/companies/{slug}/notes */}
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>ملاحظات داخلية (مرئية لك فقط)</label>
                  <textarea value={form.notes} onChange={e => f('notes')(e.target.value)} rows={2}
                    style={{ ...inp, resize:'vertical', minHeight:55 }}
                    onFocus={e => (e.target.style.borderColor='var(--em)')}
                    onBlur={e => (e.target.style.borderColor='var(--b3)')}
                    placeholder="ملاحظات..."
                  />
                </div>
              </div>
            )}

            {/* ══ TAB: SUPER ADMIN ══ */}
            {tab === 'super' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {/* تحذير */}
                <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--redb)', border:'1px solid var(--redbo)', color:'var(--red)', fontSize:12, display:'flex', alignItems:'center', gap:8 }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize:15, flexShrink:0 }} />
                  هذه الإعدادات تؤثر على كامل النظام — تصرف بحذر
                </div>

                {/* الميزات */}
                <div style={{ background:'var(--bg3)', borderRadius:12, border:'1px solid var(--b1)', padding:'14px 16px' }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>ميزات النظام</div>
                  {([
                    { key:'registrations' as const, label:'تسجيل مستخدمين جدد',  icon:'ti-user-plus' },
                    { key:'new_companies' as const, label:'إنشاء شركات جديدة',    icon:'ti-building-plus' },
                    { key:'notifications' as const, label:'نظام الإشعارات',       icon:'ti-bell' },
                    { key:'debug'         as const, label:'وضع التصحيح (Debug)',  icon:'ti-bug' },
                    { key:'public_api'    as const, label:'API العام',             icon:'ti-api' },
                  ]).map(item => (
                    <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--b1)' }}>
                      <span style={{ fontSize:13, color:'var(--t2)', display:'flex', alignItems:'center', gap:8 }}>
                        <i className={`ti ${item.icon}`} style={{ color:'var(--em)', fontSize:14 }} />
                        {item.label}
                      </span>
                      <div
                        className={`sw ${settings[item.key] ? 'on' : ''}`}
                        onClick={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      />
                    </div>
                  ))}
                </div>

                {/* الإعدادات الرقمية */}
                <div style={{ background:'var(--bg3)', borderRadius:12, border:'1px solid var(--b1)', padding:'14px 16px' }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>الخطط الافتراضية</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                    {[
                      { label:'مدة التجربة (أيام)', key:'trial_days' as const },
                      { label:'حد مستخدمي Free',    key:'free_max_users' as const },
                    ].map(({ label, key }) => (
                      <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <label style={{ fontSize:10, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:.7 }}>{label}</label>
                        <input type="number" min={1} value={settings[key]}
                          onChange={e => setSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          style={{ ...inp, textAlign:'center', direction:'ltr' }}
                          onFocus={e => (e.target.style.borderColor='var(--em)')}
                          onBlur={e => (e.target.style.borderColor='var(--b3)')}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* عمليات النظام */}
                <div style={{ background:'var(--bg3)', borderRadius:12, border:'1px solid var(--b1)', padding:'14px 16px' }}>
                  <div style={{ fontSize:11, fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>عمليات النظام</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[
                      { label:'مسح الكاش العام',        icon:'ti-refresh',         color:'var(--em)',   bg:'var(--emb)',   action:() => showToast('تم مسح الكاش') },
                      { label:'نسخ احتياطي فوري',       icon:'ti-database-export', color:'var(--gold)', bg:'var(--goldb)', action:() => showToast('النسخة تُنشأ...') },
                      { label:'تصدير اللوج',            icon:'ti-download',        color:'var(--blue)', bg:'var(--blueb)', action:() => showToast('جارٍ التصدير') },
                      { label:'إرسال إشعار للكل',       icon:'ti-speakerphone',    color:'var(--gold)', bg:'var(--goldb)', action:() => showToast('تم الإرسال') },
                      { label:'تفعيل وضع الصيانة',      icon:'ti-alert-triangle',  color:'var(--red)',  bg:'var(--redb)',  action:() => confirm('تفعيل وضع الصيانة؟') && showToast('مفعّل') },
                      { label:'تشغيل المهام المجدولة',  icon:'ti-clock-play',      color:'var(--blue)', bg:'var(--blueb)', action:() => showToast('تم تشغيل المهام') },
                    ].map(op => (
                      <button key={op.label} onClick={op.action}
                        style={{ padding:'10px 12px', borderRadius:10, border:`1px solid ${op.bg}`, background:op.bg, color:op.color, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', display:'flex', alignItems:'center', gap:7, transition:'.13s' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity='.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity='1')}
                      >
                        <i className={`ti ${op.icon}`} style={{ fontSize:14 }} />
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer */}
          <div style={{ padding:'12px 20px', borderTop:'1px solid var(--b2)', display:'flex', gap:8, justifyContent:'flex-end', background:'var(--bg3)', borderRadius:'0 0 20px 20px', flexShrink:0 }}>
            {tab === 'companies' && editTarget ? (
              <>
                <button onClick={() => setEditTarget(null)} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid var(--b3)', background:'var(--bg2)', color:'var(--t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif' }}>
                  رجوع
                </button>
                <button onClick={handleSaveCompany} disabled={saving || !form.name.trim()}
                  style={{ padding:'9px 22px', borderRadius:10, border:'none', background:form.name.trim()?'var(--em)':'var(--b3)', color:form.name.trim()?'#fff':'var(--t4)', fontSize:13, fontWeight:800, cursor:saving||!form.name.trim()?'not-allowed':'pointer', fontFamily:'Tajawal, sans-serif', boxShadow:form.name.trim()?'var(--emglow)':'none', display:'flex', alignItems:'center', gap:7 }}>
                  {saving ? <><i className="ti ti-loader" style={{ animation:'spin .8s linear infinite' }} />جارٍ الحفظ...</> : <><i className="ti ti-device-floppy" />حفظ التغييرات</>}
                </button>
              </>
            ) : tab === 'super' ? (
              <button onClick={() => showToast('تم حفظ الإعدادات')} style={{ padding:'9px 22px', borderRadius:10, border:'none', background:'var(--em)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'Tajawal, sans-serif', boxShadow:'var(--emglow)', display:'flex', alignItems:'center', gap:7 }}>
                <i className="ti ti-device-floppy" />حفظ الإعدادات
              </button>
            ) : (
              <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid var(--b3)', background:'var(--bg2)', color:'var(--t2)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif' }}>
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#2c2c2a', color:'#fff', padding:'10px 22px', borderRadius:20, fontSize:13, fontFamily:'Tajawal, sans-serif', zIndex:10020, animation:'slideup .2s ease' }}>
          {toast}
        </div>
      )}
    </>
  );
}

// ── Main Page ───────────────────────────────────
export default function OnboardingPage() {
  const { user, logout, setActiveCompany } = useAuth() as any;
  const navigate = useNavigate();

  const isSuperAdmin: boolean = user?.roles?.some((r: any) => r.name === 'super-admin') ?? false;

  const [companies, setCompanies]           = useState<Company[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [showCreate, setShowCreate]         = useState(false);
  const [pendingCompany, setPendingCompany] = useState<Company | null>(null);
  const [switching, setSwitching]           = useState(false);
  // ✅ مودال Super Admin
  const [showAdminModal, setShowAdminModal] = useState(false);

  // ✅ GET /companies — شركات المستخدم المسجّل
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/companies');
      const data = res.data?.data ?? res.data;
      setCompanies(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'فشل جلب الشركات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user, fetchCompanies]);

  // ── الضغط على شركة قائمة → switch + مودال السنة
  // ✅ POST /companies/switch { company_id }
  const handleCompanyClick = async (company: Company) => {
    if (company.is_suspended || switching) return;
    setSwitching(true);
    setError(null);
    try {
      await apiClient.post('/companies/switch', { company_id: company.id });
      setPendingCompany(company);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'فشل الدخول إلى الشركة');
    } finally {
      setSwitching(false);
    }
  };

  // ── بعد اختيار السنة (للشركات القائمة)
  const handleFiscalConfirm = (yearId: number | null) => {
    if (!pendingCompany) return;
    if (yearId) {
      try { sessionStorage.setItem('selected_fiscal_year', String(yearId)); } catch {}
    }
    // ✅ تحديث AuthContext بالشركة النشطة
    setActiveCompany({
      id:   pendingCompany.id,
      name: pendingCompany.name,
      slug: pendingCompany.slug,
    });
    setPendingCompany(null);
    navigate('/dashboard', { replace: true });
  };

  // ✅ بعد إنشاء شركة جديدة + سنة مالية من المودال الشامل
  const handleNewCompanyCreated = (company: Company, fiscalYear: { id: number }) => {
    setShowCreate(false);
    setCompanies(prev => [...prev, company]);
    // ✅ حفظ السنة قبل navigate لتجنب مشكلة "جارٍ تحميل"
    try { sessionStorage.setItem('selected_fiscal_year', String(fiscalYear.id)); } catch {}
    // ✅ POST /companies/switch { company_id }
    apiClient.post('/companies/switch', { company_id: company.id })
      .then(() => {
        setActiveCompany({ id: company.id, name: company.name, slug: company.slug });
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        // حتى لو فشل الـ switch، نذهب للـ dashboard
        setActiveCompany({ id: company.id, name: company.name, slug: company.slug });
        navigate('/dashboard', { replace: true });
      });
  };

  if (!user) return null;

  return (
    <>
      <style>{`
        @keyframes fadein  { from{opacity:0} to{opacity:1} }
        @keyframes slideup { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{
        minHeight:'100vh', background:'var(--bg0)',
        display:'flex', flexDirection:'column',
        direction:'rtl', animation:'fadein .3s ease',
      }}>
        {/* ── Topbar ── */}
        <div style={{
          height:60, background:'var(--bg2)', borderBottom:'1px solid var(--b2)',
          display:'flex', alignItems:'center', padding:'0 24px', gap:14,
          boxShadow:'var(--shadow)',
        }}>
          <div style={{
            width:36, height:36, borderRadius:10, background:'var(--grad-em)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:16, fontWeight:900, color:'#fff', boxShadow:'var(--emglow)',
          }}>ص</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--t1)', lineHeight:1.2 }}>نظام المبيعات</div>
            <div style={{ fontSize:10, color:'var(--t4)' }}>الإدارة المتكاملة</div>
          </div>
          <div style={{ marginRight:'auto', display:'flex', alignItems:'center', gap:10 }}>
            {/* ✅ زر Super Admin — يظهر فقط للمدير العام */}
            {isSuperAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                style={{
                  padding:'7px 14px', borderRadius:10,
                  border:'1px solid var(--embo)', background:'var(--emb)',
                  color:'var(--em)', fontSize:12, fontWeight:700,
                  cursor:'pointer', fontFamily:'Tajawal, sans-serif',
                  display:'flex', alignItems:'center', gap:6, transition:'.13s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--em)'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background='var(--emb)'; e.currentTarget.style.color='var(--em)'; }}
              >
                <i className="ti ti-building-community" style={{ fontSize:14 }} />
                إدارة الشركات
              </button>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--b2)' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--grad-em)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>
                {user.name?.[0]?.toUpperCase() ?? 'م'}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{user.name}</div>
                <div style={{ fontSize:10, color:'var(--t4)' }}>{(user as any).email}</div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              style={{ padding:'7px 14px', borderRadius:10, border:'1px solid var(--b2)', background:'var(--bg3)', color:'var(--t3)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', transition:'.13s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--redbo)'; e.currentTarget.style.color='var(--red)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--b2)'; e.currentTarget.style.color='var(--t3)'; }}
            >
              تسجيل خروج
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex:1, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'48px 24px' }}>
          <div style={{ width:'100%', maxWidth:560 }}>

            {/* Title */}
            <div style={{ marginBottom:32, animation:'slideup .3s ease' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--em)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 }}>
                مرحباً، {user.name}
              </div>
              <h1 style={{ fontSize:28, fontWeight:900, color:'var(--t1)', margin:'0 0 8px', lineHeight:1.2 }}>
                اختر شركتك
              </h1>
              <p style={{ fontSize:14, color:'var(--t4)', margin:0 }}>
                حدد الشركة التي تريد العمل عليها اليوم
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding:'11px 14px', borderRadius:12, marginBottom:16, background:'var(--redb)', border:'1px solid var(--redbo)', color:'var(--red)', fontSize:13, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer', fontSize:16 }}>×</button>
              </div>
            )}

            {/* Switching overlay */}
            {switching && (
              <div style={{ padding:'14px', borderRadius:12, marginBottom:16, background:'var(--emb)', border:'1px solid var(--embo)', color:'var(--em)', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</span>
                جارٍ الدخول إلى الشركة...
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign:'center', padding:'60px 0', color:'var(--t4)' }}>
                <div style={{ fontSize:32, marginBottom:12, display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</div>
                <div style={{ fontSize:14 }}>جارٍ تحميل الشركات...</div>
              </div>
            )}

            {/* Company list */}
            {!loading && companies.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                {companies.map((company, i) => (
                  <CompanyCard key={company.id} company={company} index={i} onClick={() => handleCompanyClick(company)} />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && companies.length === 0 && (
              <div style={{
                textAlign:'center', padding:'60px 24px',
                background:'var(--bg2)', borderRadius:20,
                border:'1.5px dashed var(--b3)', marginBottom:16,
                animation:'slideup .3s ease .1s both',
              }}>
                <div style={{ fontSize:52, marginBottom:12, opacity:.3 }}>🏢</div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--t2)', marginBottom:6 }}>لا توجد شركات بعد</div>
                <div style={{ fontSize:13, color:'var(--t4)' }}>أنشئ شركتك الأولى للبدء</div>
              </div>
            )}

            {/* Add company */}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                width:'100%', padding:'13px 20px', borderRadius:14,
                border:'1.5px dashed var(--b3)', background:'transparent',
                color:'var(--t4)', fontSize:13, fontWeight:700,
                cursor:'pointer', fontFamily:'Tajawal, sans-serif',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'all .15s', animation:'slideup .3s ease .15s both',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background='var(--emb)';
                e.currentTarget.style.borderColor='var(--embo)';
                e.currentTarget.style.color='var(--em)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background='transparent';
                e.currentTarget.style.borderColor='var(--b3)';
                e.currentTarget.style.color='var(--t4)';
              }}
            >
              <span style={{ fontSize:18, lineHeight:1 }}>+</span>
              إضافة شركة جديدة
            </button>

            <p style={{ textAlign:'center', fontSize:11, color:'var(--t4)', marginTop:20, animation:'slideup .3s ease .2s both' }}>
              {companies.length > 0
                ? 'عند الدخول ستُطلب منك تحديد السنة المالية الخاصة بالشركة'
                : 'أنشئ شركتك وستُطلب منك إضافة السنة المالية تلقائياً'
              }
            </p>
          </div>
        </div>
      </div>

      {/* ✅ المودال الشامل: شركة + سنة مالية */}
      {showCreate && (
        <CreateCompanyModal
          onCreated={handleNewCompanyCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* مودال السنة للشركات القائمة */}
      {pendingCompany && (
        <FiscalYearModal
          company={pendingCompany}
          onConfirm={handleFiscalConfirm}
          onClose={() => setPendingCompany(null)}
        />
      )}

      {/* ✅ مودال Super Admin */}
      {showAdminModal && (
        <AdminModal
          onClose={() => setShowAdminModal(false)}
        />
      )}
    </>
  );
}
```

## FILE: resources/js/pages/pos/POSPage.tsx
```
// pages/pos/POSPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePOS }           from '@/pos/hooks/usePOS';
import { useVariants }      from '@/hooks/useProducts';
import { useCustomers }     from '@/hooks/useData';
import { usePaymentModes, useWarehouses, useCurrentFiscalYear } from '@/hooks/useData';
import { useDocumentTypes } from '@/hooks/useData';
import ProductCard          from '@/pos/components/ProductCard';
import Cart                 from '@/pos/components/Cart';
import PaymentModal         from '@/pos/components/PaymentModal';
import HeldCartsModal       from '@/pos/components/HeldCartsModal';
import Receipt              from '@/pos/components/Receipt';
import type { ProductVariant } from '@/types';
import { formatDZD } from '@/pos/utils/calculations';

export default function POSPage() {
  const pos             = usePOS();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showHeld,    setShowHeld]    = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showManual,  setShowManual]  = useState(false);
  const [mobTab,      setMobTab]      = useState<'products' | 'cart'>('products');
  const [lastDocNum,  setLastDocNum]  = useState<string | undefined>();

  const searchRef = useRef<HTMLInputElement>(null);

  // API data
  const { data: variantsData, isLoading: loadingVariants } = useVariants({
    search: pos.searchQuery || undefined,
    page: 1,
  });
  const { data: customersData } = useCustomers({ active: true, per_page: 100 });
  const { data: paymentModes  } = usePaymentModes();
  const { data: warehouses    } = useWarehouses();
  const { data: fiscalYear    } = useCurrentFiscalYear();
  const { data: documentTypes } = useDocumentTypes();

  const variants  = variantsData?.data ?? [];
  const customers = customersData?.data ?? [];

  // Filter by category
  const filteredVariants: ProductVariant[] = pos.selectedCategory
    ? variants.filter(v => v.product?.family_id === pos.selectedCategory)
    : variants;

  // Get unique families for category bar
  const families = Array.from(
    new Map(
      variants
        .filter(v => v.product?.family)
        .map(v => [v.product!.family!.id, v.product!.family!])
    ).values()
  );

  // ── Keyboard shortcuts ────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      if (e.key === 'F4') { e.preventDefault(); if (!pos.isEmpty) pos.openPayment(); }
      if (e.key === 'F5') { e.preventDefault(); if (!pos.isEmpty) pos.holdCart(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pos]);

  // ── Complete sale handler ─────────────────────
  const handleCompleteSale = useCallback(async (params: {
    paymentModeId: number;
    amountPaid: number;
    dueDate?: string;
    note?: string;
  }) => {
    // Find invoice document type
    const invType = documentTypes?.find(t => t.code === 'FAC' || t.code === 'INV');
    const wh = warehouses?.[0];
    if (!invType || !wh || !fiscalYear) {
      return { ok: false, message: 'إعدادات غير مكتملة (نوع المستند / المستودع / السنة المالية)' };
    }
    const res = await pos.completeSale({
      paymentModeId:   params.paymentModeId,
      documentTypeId:  invType.id,
      warehouseId:     wh.id,
      fiscalYearId:    fiscalYear.id,
      amountPaid:      params.amountPaid,
    });
    if (res.ok && res.document) {
      setLastDocNum(res.document.document_number);
      setShowReceipt(true);
    }
    return res;
  }, [pos, documentTypes, warehouses, fiscalYear]);

  const totalTtc = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  return (
    <div className="page on" id="p-pos">

      {/* ── Stats bar ── */}
      <div className="pos-stats">
        <div className="pos-chip g" title="فواتير اليوم">
          <span className="ic ic-xs"><i className="ti ti-receipt" /></span>
          <span>فواتير:</span><strong>{pos.sessionInvoices}</strong>
        </div>
        <div className="pos-chip o" title="مبيعات اليوم">
          <span className="ic ic-xs"><i className="ti ti-cash" /></span>
          <span>مبيعات:</span><strong>{formatDZD(pos.sessionSales)}</strong>
        </div>
        <div
          className="pos-chip b clickable"
          onClick={() => setShowHeld(true)}
          title="الفواتير المعلقة"
        >
          <span className="ic ic-xs"><i className="ti ti-clock-pause" /></span>
          <span>معلقة:</span><strong>{pos.heldCarts.length}</strong>
          <span style={{ opacity: 0.6, fontSize: 10 }}>←</span>
        </div>

        <div className="pos-tools">
          <button className="btn btn-xs" onClick={() => setShowManual(true)} title="إضافة يدوي (F7)">
            <span className="ic ic-xs"><i className="ti ti-plus" /></span>
            <span className="tb-txt"> يدوي</span>
          </button>
          <button className="btn btn-xs" onClick={() => setShowReceipt(true)} title="معاينة وطباعة" disabled={pos.isEmpty}>
            <span className="ic ic-xs"><i className="ti ti-printer" /></span>
          </button>
        </div>

        <div className="pos-kb-hint">
          <kbd>F2</kbd> بحث &nbsp;
          <kbd>F4</kbd> بيع &nbsp;
          <kbd>F5</kbd> تعليق
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="pos-mob-tabs">
        <div
          className={`pmt ${mobTab === 'products' ? 'on' : ''}`}
          onClick={() => setMobTab('products')}
        >
          <div className="pmt-ic"><i className="ti ti-package" /></div>
          <span>المنتجات</span>
        </div>
        <div
          className={`pmt ${mobTab === 'cart' ? 'on' : ''}`}
          onClick={() => setMobTab('cart')}
        >
          <div className="pmt-ic"><i className="ti ti-shopping-cart" /></div>
          {pos.itemsCount > 0 && (
            <div className="pmt-badge">{pos.itemsCount}</div>
          )}
          <span>السلة</span>
        </div>
        <button
          className="pmt-sell-btn"
          onClick={pos.openPayment}
          disabled={pos.isEmpty}
        >
          <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
          تأكيد البيع
        </button>
      </div>

      {/* ── Mobile total bar ── */}
      {!pos.isEmpty && (
        <div className="mob-total-bar" style={{ display: 'flex' }}>
          <div className="mob-total-left">
            <span className="ic ic-xs"><i className="ti ti-shopping-cart" /></span>
            <span>{pos.itemsCount} وحدة</span>
          </div>
          <div className="mob-total-right">
            <span className="mob-total-label">الإجمالي</span>
            <span className="mob-total-val">{formatDZD(totalTtc)}</span>
            <button className="mob-total-pay-btn" onClick={pos.openPayment}>
              <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
              دفع
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div
        className={`pos-layout ${mobTab === 'cart' ? 'mob-show-cart' : ''}`}
        id="pos-layout"
      >

        {/* ═══ LEFT: Products ═══ */}
        <div className="pos-left" id="pos-left">

          {/* Search bar */}
          <div className="pos-search-bar">
            <div className="pos-inp">
              <span className="ic ic-xs" style={{ color: 'var(--t4)' }}><i className="ti ti-search" /></span>
              <input
                ref={searchRef}
                type="text"
                id="pos-search"
                placeholder="ابحث بالاسم أو الباركود... (F2)"
                value={pos.searchQuery}
                onChange={e => pos.setSearch(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {pos.searchQuery && (
                <button
                  onClick={() => pos.setSearch('')}
                  style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', padding: 0, fontSize: 12 }}
                >
                  <span className="ic ic-xs"><i className="ti ti-x" /></span>
                </button>
              )}
            </div>
            <div className="view-tog">
              <button
                className={`vtb ${view === 'grid' ? 'on' : ''}`}
                onClick={() => setView('grid')}
                title="شبكي"
              >
                <span className="ic ic-xs"><i className="ti ti-grid-dots" /></span>
              </button>
              <button
                className={`vtb ${view === 'list' ? 'on' : ''}`}
                onClick={() => setView('list')}
                title="قائمة"
              >
                <span className="ic ic-xs"><i className="ti ti-list" /></span>
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div className="pos-cats">
            <button
              className={`cat-btn ${!pos.selectedCategory ? 'on' : ''}`}
              onClick={() => pos.setCategory(null)}
            >
              <span className="ic ic-xs"><i className="ti ti-apps" /></span>
              الكل
              <span className="cat-cnt">{variants.length}</span>
            </button>
            {families.map(f => {
              const count = variants.filter(v => v.product?.family_id === f.id).length;
              return (
                <button
                  key={f.id}
                  className={`cat-btn ${pos.selectedCategory === f.id ? 'on' : ''}`}
                  onClick={() => pos.setCategory(f.id)}
                >
                  {f.name}
                  <span className="cat-cnt">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Products grid */}
          <div className="pos-grid-area">
            {loadingVariants ? (
              <div className="no-res">
                <span style={{ fontSize: 36, opacity: 0.3 }}><i className="ti ti-loader" /></span>
                <div>جاري التحميل...</div>
              </div>
            ) : filteredVariants.length === 0 ? (
              <div className="no-res">
                <span style={{ fontSize: 36, opacity: 0.2 }}><i className="ti ti-search" /></span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>لا توجد نتائج</div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>جرّب بحثاً مختلفاً</div>
                <button className="btn btn-p btn-sm" onClick={() => setShowManual(true)}>
                  <span className="ic ic-xs"><i className="ti ti-plus" /></span> إضافة يدوي
                </button>
              </div>
            ) : (
              <div className={`pgrid ${view === 'list' ? 'lv' : ''}`}>
                {filteredVariants.map(variant => {
                  const inCart = pos.items.find(i => i.product_id === variant.id);
                  return (
                    <ProductCard
                      key={variant.id}
                      variant={variant}
                      qtyInCart={inCart?.quantity ?? 0}
                      view={view}
                      onClick={() => pos.addToCart(variant)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Cart ═══ */}
        <Cart
          items={pos.items}
          totals={pos.totals}
          client={pos.client}
          customers={customers}
          onQty={pos.updateQty}
          onDiscount={pos.updateDiscount}
          onRemove={pos.removeItem}
          onSetClient={pos.setClient}
          onHold={() => pos.holdCart()}
          onSell={pos.openPayment}
          onNote={() => {}}
          onClear={pos.clearCart}
          onHeld={() => setShowHeld(true)}
        />
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Payment */}
      <PaymentModal
        open={pos.paymentModalOpen}
        totals={pos.totals}
        client={pos.client}
        paymentModes={paymentModes ?? []}
        onClose={pos.closePayment}
        onConfirm={handleCompleteSale}
      />

      {/* Held carts */}
      <HeldCartsModal
        open={showHeld}
        carts={pos.heldCarts}
        onClose={() => setShowHeld(false)}
        onRestore={pos.restoreCart}
        onDelete={pos.deleteHeldCart}
      />

      {/* Receipt / print preview */}
      <Receipt
        open={showReceipt}
        items={pos.items}
        totals={pos.totals}
        client={pos.client}
        docNumber={lastDocNum}
        onClose={() => setShowReceipt(false)}
        onPrint={() => window.print()}
      />

      {/* Manual product modal */}
      <ManualProductModal
        open={showManual}
        onClose={() => setShowManual(false)}
        onAdd={(name, priceTtc, qty, tvaRate) => {
          const htPrice = priceTtc / (1 + tvaRate / 100);
          const fakeVariant: ProductVariant = {
            id: Date.now(),
            product_id: 0,
            ref: null,
            barcode: null,
            variant_name: null,
            unit_id: null,
            tva_id: null,
            last_purchase_price: 0,
            average_cost_price: 0,
            default_selling_price_ht: htPrice,
            manages_stock: false,
            allow_negative_stock: true,
            has_lots: false,
            has_expiration_date: false,
            min_stock_alert: 0,
            max_stock_alert: 0,
            active: true,
            product: { id: 0, name, slug: '', description: null, family_id: null, brand_id: null, product_type_id: 1, images: null, active: true, created_at: '', updated_at: '' },
            tva: { id: 0, name: `${tvaRate}%`, rate: tvaRate, description: null, active: true, is_default: false, display_order: 0 },
          };
          pos.addToCart(fakeVariant, qty);
          setShowManual(false);
        }}
      />
    </div>
  );
}

// ── Manual product add modal ──────────────────────
function ManualProductModal({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, priceTtc: number, qty: number, tvaRate: number) => void;
}) {
  const [name,  setName]  = useState('');
  const [price, setPrice] = useState('');
  const [qty,   setQty]   = useState('1');
  const [tva,   setTva]   = useState('19');

  const handleAdd = () => {
    if (!name.trim() || !price) return;
    onAdd(name.trim(), parseFloat(price), parseInt(qty) || 1, parseInt(tva));
    setName(''); setPrice(''); setQty('1');
  };

  if (!open) return null;

  return (
    <div className="ov on">
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-plus" /></span>
            منتج / خدمة يدوية
          </div>
          <div className="m-x" onClick={onClose}><span className="ic ic-xs"><i className="ti ti-x" /></span></div>
        </div>
        <div className="m-body">
          <div className="fgrid">
            <div className="fg s2">
              <label className="req">الوصف</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="اسم المنتج أو الخدمة..."
                autoFocus
              />
            </div>
            <div className="fg">
              <label className="req">السعر TTC</label>
              <div className="inp-row">
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  min={0}
                  inputMode="decimal"
                />
                <div className="inp-suf">دج</div>
              </div>
            </div>
            <div className="fg">
              <label>الكمية</label>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} min={1} inputMode="numeric" />
            </div>
            <div className="fg">
              <label>TVA</label>
              <select value={tva} onChange={e => setTva(e.target.value)}>
                <option value="19">19%</option>
                <option value="9">9%</option>
                <option value="0">0% معفى</option>
              </select>
            </div>
          </div>
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleAdd} disabled={!name.trim() || !price}>
            <span className="ic ic-xs"><i className="ti ti-shopping-cart-plus" /></span> إضافة
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/products/ProductModal.tsx
```
// resources/js/components/products/ProductModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import AlertBar from '@/components/ui/AlertBar';
import apiClient from '@/lib/api/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface Family    { id: number; name: string; }
interface Brand     { id: number; name: string; }
interface ProductType { id: number; name: string; label?: string; }
interface Unit      { id: number; name: string; symbol: string; }
interface TvaRate   { id: number; rate: number; is_default?: boolean; }
interface PriceLevel { id: number; name: string; }

interface VariantPrice {
  price_level_id: number;
  price: number | '';
  valid_from?: string;
  valid_to?: string;
  active: boolean;
}

interface QuantityDiscount {
  min_quantity: number | '';
  max_quantity?: number | null | '';
  discount_percentage?: number | null | '';
  discount_per_unit?: number | null | '';
  tier_order: number;
  active: boolean;
}

// اسم الحقول متوافق مع Backend (ProductService.prepareVariantData)
interface VariantForm {
  id?: number;
  ref: string;
  variant_name: string;
  barcode: string;
  last_purchase_price: number | '';          // اسم DB
  default_selling_price_ht: number | '';     // اسم DB
  tva_id: number | null;
  unit_id: number | null;
  min_stock_alert: number;                   // اسم DB
  active: boolean;
  manages_stock: boolean;
  allow_negative_stock: boolean;
  has_lots: boolean;
  has_expiration_date: boolean;
  manages_quantity_discounts: boolean;
  weight?: number | null;
  volume?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  variant_attributes?: Record<string, string>;
  prices: VariantPrice[];
  quantity_discounts: QuantityDiscount[];
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  family_id: number | null;
  brand_id: number | null;
  product_type_id: number | null;
  images: string[];
  active: boolean;
  variants: VariantForm[];
}

interface ProductModalProps {
  open: boolean;
  product?: any | null;
  lookups?: {
    families?: Family[];
    brands?: Brand[];
    priceLevels?: PriceLevel[];
  };
  onClose: () => void;
  onSaved: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants / Helpers
// ═══════════════════════════════════════════════════════════════════════════

const formatDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' دج';

const inp = (err?: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px', borderRadius: 'var(--r2)',
  border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
  background: 'var(--bg2)', color: 'var(--t1)',
  fontSize: 13, fontFamily: 'Tajawal, sans-serif',
  outline: 'none', transition: 'border-color .15s',
});

const sel: React.CSSProperties = { ...inp(), cursor: 'pointer', appearance: 'menulist' as any };

const STEPS = [
  { label: 'معلومات المنتج', icon: 'ti-info-circle' },
  { label: 'المتغيرات',      icon: 'ti-versions' },
  { label: 'مراجعة',         icon: 'ti-check' },
];

function makeEmptyVariant(priceLevels: PriceLevel[], tvaId: number | null): VariantForm {
  return {
    ref: '', variant_name: '', barcode: '',
    last_purchase_price: '', default_selling_price_ht: '',
    tva_id: tvaId, unit_id: null,
    min_stock_alert: 0,
    active: true, manages_stock: true,
    allow_negative_stock: false, has_lots: false,
    has_expiration_date: false, manages_quantity_discounts: false,
    weight: null, volume: null, length: null, width: null, height: null,
    variant_attributes: {},
    prices: priceLevels.map(pl => ({ price_level_id: pl.id, price: '', active: true })),
    quantity_discounts: [],
  };
}

// تحويل بيانات المنتج القادمة من API إلى صيغة الفورم
function productToForm(product: any, priceLevels: PriceLevel[]): ProductFormData {
  const variants: VariantForm[] = (product.variants ?? []).map((v: any) => ({
    id: v.id,
    ref: v.ref ?? '',
    variant_name: v.variant_name ?? '',
    barcode: v.barcode ?? '',
    last_purchase_price: v.purchase_price ?? v.last_purchase_price ?? '',
    default_selling_price_ht: v.price_ht ?? v.default_selling_price_ht ?? '',
    tva_id: v.tva_id ?? null,
    unit_id: v.unit_id ?? null,
    min_stock_alert: v.min_stock ?? v.min_stock_alert ?? 0,
    active: v.active ?? true,
    manages_stock: v.manages_stock ?? true,
    allow_negative_stock: v.allow_negative_stock ?? false,
    has_lots: v.has_lots ?? false,
    has_expiration_date: v.has_expiration_date ?? false,
    manages_quantity_discounts: v.manages_quantity_discounts ?? false,
    weight: v.weight ?? null,
    volume: v.volume ?? null,
    length: v.length ?? null,
    width: v.width ?? null,
    height: v.height ?? null,
    variant_attributes: v.variant_attributes ?? {},
    prices: priceLevels.map(pl => {
      const existing = (v.prices ?? []).find((p: any) => p.price_level_id === pl.id);
      return {
        price_level_id: pl.id,
        price: existing?.price ?? '',
        valid_from: existing?.valid_from ?? '',
        valid_to: existing?.valid_to ?? '',
        active: existing?.active !== false,
      };
    }),
    quantity_discounts: (v.quantity_discounts ?? []).map((d: any) => ({
      min_quantity: d.min_quantity,
      max_quantity: d.max_quantity ?? null,
      discount_percentage: d.discount_percentage ?? null,
      discount_per_unit: d.discount_per_unit ?? null,
      tier_order: d.tier_order,
      active: d.active ?? true,
    })),
  }));

  return {
    name: product.name ?? '',
    slug: product.slug ?? '',
    description: product.description ?? '',
    family_id: product.family_id ?? null,
    brand_id: product.brand_id ?? null,
    product_type_id: product.product_type_id ?? null,
    images: product.images ?? [],
    active: product.active ?? true,
    variants,
  };
}

function emptyForm(): ProductFormData {
  return {
    name: '', slug: '', description: '',
    family_id: null, brand_id: null, product_type_id: null,
    images: [], active: true, variants: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Stepper
// ═══════════════════════════════════════════════════════════════════════════

function Stepper({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {STEPS.map((s, i) => {
        const done = i < step;
        const cur  = i === step;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--em)' : cur ? 'var(--emb)' : 'var(--bg3)',
                color: done ? '#fff' : cur ? 'var(--em)' : 'var(--t4)',
                border: cur ? '2px solid var(--em)' : '2px solid transparent',
                fontSize: 14, transition: 'all .2s',
              }}>
                {done
                  ? <i className="ti ti-check" style={{ fontSize: 15 }} />
                  : <i className={`ti ${s.icon}`} style={{ fontSize: 14 }} />
                }
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: cur ? 'var(--em)' : done ? 'var(--t3)' : 'var(--t4)', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'var(--em)' : 'var(--b2)', margin: '0 4px', marginBottom: 18, transition: 'background .3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Variant Sidebar Card
// ═══════════════════════════════════════════════════════════════════════════

function VariantCard({ v, index, active, onSelect, onRemove, hasError }: {
  v: VariantForm; index: number; active: boolean;
  onSelect: () => void; onRemove: () => void; hasError: boolean;
}) {
  return (
    <div onClick={onSelect} style={{
      borderRadius: 'var(--r2)', padding: '9px 12px', cursor: 'pointer',
      border: active ? '1.5px solid var(--em)' : hasError ? '1px solid var(--red)' : '1px solid var(--b2)',
      background: active ? 'var(--emb)' : 'var(--bg3)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'all .12s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: active ? 'var(--em)' : 'var(--bg4)',
          color: active ? '#fff' : 'var(--t4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>{index + 1}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {v.variant_name || v.ref || `متغير ${index + 1}`}
          </div>
          {v.ref && <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>{v.ref}</div>}
        </div>
        {hasError && <i className="ti ti-alert-circle" style={{ color: 'var(--red)', fontSize: 14 }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {Number(v.default_selling_price_ht) > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--em)' }}>
            {formatDZD(Number(v.default_selling_price_ht))}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid var(--b2)', cursor: 'pointer', background: 'var(--bg3)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
        >
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductModal({ open, product, lookups, onClose, onSaved }: ProductModalProps) {
  const isEdit = !!product;
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProductFormData>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [selVariant, setSelVariant] = useState(0);
  const [variantTab, setVariantTab] = useState<'basic' | 'prices' | 'discounts' | 'dimensions'>('basic');

  // ── جلب بيانات المساعدة ──
  const fetchOpts = { enabled: open, staleTime: Infinity };

  const { data: families = [] } = useQuery({
    queryKey: ['families'],
    queryFn: () => apiClient.get('/families', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
    initialData: lookups?.families?.length ? lookups.families : undefined,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => apiClient.get('/brands', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
    initialData: lookups?.brands?.length ? lookups.brands : undefined,
  });

  const { data: productTypes = [] } = useQuery({
    queryKey: ['product-types'],
    queryFn: () => apiClient.get('/product-types', { params: { per_page: 50 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => apiClient.get('/units', { params: { per_page: 100 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
  });

  const { data: tvaRates = [] } = useQuery({
    queryKey: ['tvas'],
    queryFn: () => apiClient.get('/tvas', { params: { per_page: 20 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
  });

  const { data: priceLevels = [] } = useQuery({
    queryKey: ['price-levels'],
    queryFn: () => apiClient.get('/price-levels', { params: { per_page: 50 } }).then(r => r.data.data ?? []),
    ...fetchOpts,
    initialData: lookups?.priceLevels?.length ? lookups.priceLevels : undefined,
  });

  const defaultTvaId = (tvaRates as TvaRate[]).find(t => t.is_default)?.id ?? null;

  // ── تهيئة الفورم عند الفتح ──
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setApiError('');
    setStep(0);
    setSelVariant(0);
    setVariantTab('basic');

    if (isEdit && product && priceLevels.length >= 0) {
      setForm(productToForm(product, priceLevels as PriceLevel[]));
    } else {
      setForm(emptyForm());
    }
  }, [open, product?.id]);

  // ── عند تحميل priceLevels: أضف الأسعار الناقصة للمتغيرات الموجودة ──
  useEffect(() => {
    if (!priceLevels.length || !open) return;
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => ({
        ...v,
        prices: (priceLevels as PriceLevel[]).map(pl => {
          const existing = v.prices.find(p => p.price_level_id === pl.id);
          return existing ?? { price_level_id: pl.id, price: '', active: true };
        }),
      })),
    }));
  }, [priceLevels.length, open]);

  // ── Variant helpers ──
  const addVariant = useCallback(() => {
    const newV = makeEmptyVariant(priceLevels as PriceLevel[], defaultTvaId);
    setForm(f => ({ ...f, variants: [...f.variants, newV] }));
    setSelVariant(form.variants.length);
    setVariantTab('basic');
  }, [priceLevels, defaultTvaId, form.variants.length]);

  const removeVariant = (idx: number) => {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
    setSelVariant(s => Math.max(0, s >= idx ? s - 1 : s));
  };

  const updateVariant = (idx: number, key: keyof VariantForm, value: any) => {
    setForm(f => {
      const variants = [...f.variants];
      variants[idx] = { ...variants[idx], [key]: value };
      return { ...f, variants };
    });
  };

  const updatePrice = (vidx: number, plId: number, field: keyof VariantPrice, value: any) => {
    setForm(f => {
      const variants = [...f.variants];
      const prices = variants[vidx].prices.map(p =>
        p.price_level_id === plId ? { ...p, [field]: value } : p
      );
      variants[vidx] = { ...variants[vidx], prices };
      return { ...f, variants };
    });
  };

  const addDiscount = (vidx: number) => {
    setForm(f => {
      const variants = [...f.variants];
      const discounts = [...variants[vidx].quantity_discounts, {
        min_quantity: 1, max_quantity: null,
        discount_percentage: null, discount_per_unit: null,
        tier_order: variants[vidx].quantity_discounts.length + 1, active: true,
      }];
      variants[vidx] = { ...variants[vidx], quantity_discounts: discounts };
      return { ...f, variants };
    });
  };

  const removeDiscount = (vidx: number, didx: number) => {
    setForm(f => {
      const variants = [...f.variants];
      variants[vidx] = { ...variants[vidx], quantity_discounts: variants[vidx].quantity_discounts.filter((_, i) => i !== didx) };
      return { ...f, variants };
    });
  };

  const updateDiscount = (vidx: number, didx: number, field: keyof QuantityDiscount, value: any) => {
    setForm(f => {
      const variants = [...f.variants];
      const discounts = [...variants[vidx].quantity_discounts];
      discounts[didx] = { ...discounts[didx], [field]: value };
      variants[vidx] = { ...variants[vidx], quantity_discounts: discounts };
      return { ...f, variants };
    });
  };

  // ── Validation ──
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    if (form.variants.length === 0) errs.variants = 'يجب إضافة متغير واحد على الأقل';
    form.variants.forEach((v, i) => {
      if (!v.ref.trim()) errs[`v${i}_ref`] = 'المرجع مطلوب';
      if (v.default_selling_price_ht === '' || Number(v.default_selling_price_ht) < 0)
        errs[`v${i}_price`] = 'سعر البيع مطلوب';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 0 && !form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    if (s === 1) {
      if (form.variants.length === 0) errs.variants = 'يجب إضافة متغير واحد على الأقل';
      form.variants.forEach((v, i) => {
        if (!v.ref.trim()) errs[`v${i}_ref`] = 'المرجع مطلوب';
        if (v.default_selling_price_ht === '' || Number(v.default_selling_price_ht) < 0)
          errs[`v${i}_price`] = 'سعر البيع مطلوب';
      });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Build Payload ──
  function buildPayload() {
    return {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || null,
      family_id: form.family_id,
      brand_id: form.brand_id,
      product_type_id: form.product_type_id,
      active: form.active,
      images: form.images,
      variants: form.variants.map(v => ({
        ...(v.id ? { id: v.id } : {}),
        ref: v.ref,
        variant_name: v.variant_name || null,
        barcode: v.barcode || null,
        last_purchase_price: v.last_purchase_price !== '' ? Number(v.last_purchase_price) : null,
        default_selling_price_ht: v.default_selling_price_ht !== '' ? Number(v.default_selling_price_ht) : 0,
        tva_id: v.tva_id,
        unit_id: v.unit_id,
        min_stock_alert: Number(v.min_stock_alert) || 0,
        active: v.active,
        manages_stock: v.manages_stock,
        allow_negative_stock: v.allow_negative_stock,
        has_lots: v.has_lots,
        has_expiration_date: v.has_expiration_date,
        manages_quantity_discounts: v.manages_quantity_discounts,
        weight: v.weight || null,
        volume: v.volume || null,
        length: v.length || null,
        width: v.width || null,
        height: v.height || null,
        variant_attributes: v.variant_attributes || {},
        prices: v.prices
          .filter(p => p.price !== '' && p.price !== null && Number(p.price) > 0)
          .map(p => ({
            price_level_id: p.price_level_id,
            price: Number(p.price),
            valid_from: p.valid_from || null,
            valid_to: p.valid_to || null,
            active: p.active,
          })),
        quantity_discounts: v.manages_quantity_discounts
          ? v.quantity_discounts
              .filter(d => d.min_quantity !== '' && Number(d.min_quantity) >= 0
                && (d.discount_percentage || d.discount_per_unit))
              .map((d, idx) => ({
                min_quantity: Number(d.min_quantity),
                max_quantity: d.max_quantity !== '' && d.max_quantity != null ? Number(d.max_quantity) : null,
                discount_percentage: d.discount_percentage ? Number(d.discount_percentage) : null,
                discount_per_unit: d.discount_per_unit ? Number(d.discount_per_unit) : null,
                tier_order: idx + 1,
                active: d.active,
              }))
          : [],
      })),
    };
  }

  // ── Mutation ──
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload();
      return isEdit && product
        ? apiClient.put(`/products/${product.id}`, payload)
        : apiClient.post('/products', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      onSaved();
      onClose();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      const msg = data?.message
        || Object.values(data?.errors ?? {}).flat().join(' | ')
        || 'فشل الحفظ، يرجى المحاولة مرة أخرى';
      setApiError(msg);
      // إذا كانت أخطاء في المتغيرات، ارجع لخطوة المتغيرات
      if (data?.errors && Object.keys(data.errors).some(k => k.startsWith('variants'))) {
        setStep(1);
      }
    },
  });

  function handleSave() {
    setApiError('');
    if (validate()) saveMutation.mutate();
  }

  if (!open) return null;

  const isPending = saveMutation.isPending;
  const cv = form.variants[selVariant];

  // ── Render ──
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
      subtitle={`${form.name || 'أدخل اسم المنتج'} • ${form.variants.length} متغير`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button onClick={step === 0 ? onClose : () => setStep(s => s - 1)} disabled={isPending}>
            {step === 0 ? 'إلغاء' : <><i className="ti ti-arrow-right" /> رجوع</>}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={() => { if (validateStep(step)) setStep(s => s + 1); }}>
              التالي <i className="ti ti-arrow-left" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSave} disabled={isPending}>
              {isPending
                ? <><i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} /> جارٍ الحفظ...</>
                : isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'
              }
            </Button>
          )}
        </div>
      }
    >
      {apiError && <AlertBar variant="red" style={{ marginBottom: 16 }}>{apiError}</AlertBar>}

      {/* Stepper */}
      <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--b1)', marginBottom: 20 }}>
        <Stepper step={step} />
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 0 — معلومات المنتج                               */}
      {/* ══════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="fgrid c2" style={{ gap: 14 }}>
            <div className="fg s2">
              <label className="req">اسم المنتج</label>
              <input
                style={inp(!!errors.name)}
                value={form.name}
                placeholder="أدخل اسم المنتج..."
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              {errors.name && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.name}</span>}
            </div>
            <div className="fg">
              <label>الرابط الدائم (Slug)</label>
              <input
                style={inp()}
                value={form.slug}
                placeholder="يُوَلَّد تلقائياً"
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              />
            </div>
          </div>

          <div className="fgrid c3" style={{ gap: 14 }}>
            <div className="fg">
              <label>الفئة</label>
              <select style={sel} value={form.family_id ?? ''} onChange={e => setForm(f => ({ ...f, family_id: e.target.value ? +e.target.value : null }))}>
                <option value="">— بدون فئة —</option>
                {(families as Family[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>العلامة التجارية</label>
              <select style={sel} value={form.brand_id ?? ''} onChange={e => setForm(f => ({ ...f, brand_id: e.target.value ? +e.target.value : null }))}>
                <option value="">— بدون علامة —</option>
                {(brands as Brand[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>نوع المنتج</label>
              <select style={sel} value={form.product_type_id ?? ''} onChange={e => setForm(f => ({ ...f, product_type_id: e.target.value ? +e.target.value : null }))}>
                <option value="">— بدون نوع —</option>
                {(productTypes as ProductType[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="fg">
            <label>الوصف</label>
            <textarea
              style={{ ...inp(), resize: 'vertical' }}
              rows={4}
              placeholder="وصف المنتج..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* معرض الصور */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>معرض الصور</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {form.images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 'var(--r2)', overflow: 'hidden', border: '1px solid var(--b2)' }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                    style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'var(--red)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                </div>
              ))}
              <label style={{ width: 80, height: 80, borderRadius: 'var(--r2)', border: '2px dashed var(--b3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData(); fd.append('image', file);
                  try {
                    const { data } = await apiClient.post('/attachments', fd);
                    setForm(f => ({ ...f, images: [...f.images, data.url] }));
                  } catch { /* silent */ }
                }} />
                <i className="ti ti-plus" style={{ fontSize: 24, color: 'var(--t4)' }} />
              </label>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
            <Switch
              checked={form.active}
              onChange={v => setForm(f => ({ ...f, active: v }))}
              label={form.active ? 'المنتج نشط ومتاح للبيع' : 'المنتج غير نشط'}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 1 — المتغيرات                                    */}
      {/* ══════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div style={{ display: 'flex', gap: 16, minHeight: 460 }}>
          {/* Sidebar */}
          <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 2 }}>
              المتغيرات ({form.variants.length})
            </div>
            {form.variants.map((v, i) => (
              <VariantCard
                key={i} v={v} index={i} active={selVariant === i}
                hasError={!!(errors[`v${i}_ref`] || errors[`v${i}_price`])}
                onSelect={() => { setSelVariant(i); setVariantTab('basic'); }}
                onRemove={() => removeVariant(i)}
              />
            ))}
            <button
              onClick={addVariant}
              style={{ padding: '8px 12px', borderRadius: 'var(--r2)', cursor: 'pointer', border: '1.5px dashed var(--b3)', background: 'transparent', color: 'var(--t4)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}
            >
              <i className="ti ti-plus" /> إضافة متغير
            </button>
            {errors.variants && (
              <div style={{ color: 'var(--red)', fontSize: 11, padding: 8, background: 'var(--redb)', borderRadius: 'var(--r2)' }}>
                {errors.variants}
              </div>
            )}
          </div>

          {/* Details */}
          {cv ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--b1)' }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {cv.variant_name || cv.ref || `متغير ${selVariant + 1}`}
                </div>
                <Switch
                  checked={cv.active}
                  onChange={v => updateVariant(selVariant, 'active', v)}
                  label={cv.active ? 'نشط' : 'غير نشط'}
                />
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--b1)' }}>
                {(['basic', 'prices', 'discounts', 'dimensions'] as const).map(tab => {
                  const labels: Record<string, [string, string]> = {
                    basic: ['أساسي', 'ti-info-circle'],
                    prices: ['أسعار', 'ti-tag'],
                    discounts: ['خصومات', 'ti-discount'],
                    dimensions: ['أبعاد', 'ti-ruler'],
                  };
                  const [label, icon] = labels[tab];
                  return (
                    <button key={tab} onClick={() => setVariantTab(tab)} style={{
                      padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: 11.5, fontWeight: 700, color: variantTab === tab ? 'var(--em)' : 'var(--t4)',
                      borderBottom: variantTab === tab ? '2px solid var(--em)' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                    }}>
                      <i className={`ti ${icon}`} style={{ fontSize: 12 }} /> {label}
                    </button>
                  );
                })}
              </div>

              {/* Tab: Basic */}
              {variantTab === 'basic' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <label className="req">المرجع (SKU)</label>
                    <input
                      style={inp(!!errors[`v${selVariant}_ref`])}
                      value={cv.ref}
                      placeholder="REF-001"
                      onChange={e => updateVariant(selVariant, 'ref', e.target.value)}
                    />
                    {errors[`v${selVariant}_ref`] && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors[`v${selVariant}_ref`]}</span>}
                  </div>
                  <div>
                    <label>اسم المتغير</label>
                    <input style={inp()} value={cv.variant_name} placeholder="مثال: أحمر L" onChange={e => updateVariant(selVariant, 'variant_name', e.target.value)} />
                  </div>
                  <div>
                    <label>الباركود</label>
                    <input style={inp()} value={cv.barcode} placeholder="6191..." onChange={e => updateVariant(selVariant, 'barcode', e.target.value)} />
                  </div>
                  <div>
                    <label>سعر الشراء (HT)</label>
                    <input type="number" min="0" step="0.01" style={inp()} value={cv.last_purchase_price} placeholder="0.00" onChange={e => updateVariant(selVariant, 'last_purchase_price', e.target.value)} />
                  </div>
                  <div>
                    <label className="req">سعر البيع (HT)</label>
                    <input
                      type="number" min="0" step="0.01"
                      style={inp(!!errors[`v${selVariant}_price`])}
                      value={cv.default_selling_price_ht}
                      placeholder="0.00"
                      onChange={e => updateVariant(selVariant, 'default_selling_price_ht', e.target.value)}
                    />
                    {errors[`v${selVariant}_price`] && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors[`v${selVariant}_price`]}</span>}
                  </div>
                  <div>
                    <label>معدل TVA</label>
                    <select style={sel} value={cv.tva_id ?? ''} onChange={e => {
                      const id = e.target.value ? +e.target.value : null;
                      updateVariant(selVariant, 'tva_id', id);
                    }}>
                      <option value="">— اختر —</option>
                      {(tvaRates as TvaRate[]).map(t => <option key={t.id} value={t.id}>{t.rate}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label>وحدة القياس</label>
                    <select style={sel} value={cv.unit_id ?? ''} onChange={e => updateVariant(selVariant, 'unit_id', e.target.value ? +e.target.value : null)}>
                      <option value="">— اختر —</option>
                      {(units as Unit[]).map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                    </select>
                  </div>
                  <div>
                    <label>الحد الأدنى للمخزون</label>
                    <input type="number" min="0" style={inp()} value={cv.min_stock_alert} onChange={e => updateVariant(selVariant, 'min_stock_alert', +e.target.value || 0)} />
                  </div>
                  <div>
                    <label>السمات (JSON)</label>
                    <textarea
                      style={{ ...inp(), fontFamily: 'monospace', fontSize: 11 }}
                      rows={2}
                      placeholder='{"اللون":"أحمر","المقاس":"XL"}'
                      value={JSON.stringify(cv.variant_attributes ?? {}, null, 0)}
                      onChange={e => {
                        try { updateVariant(selVariant, 'variant_attributes', JSON.parse(e.target.value)); } catch { /* ignore */ }
                      }}
                    />
                  </div>
                  {/* Toggles */}
                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 4 }}>
                    {[
                      ['manages_stock', 'إدارة المخزون'],
                      ['allow_negative_stock', 'السماح بالسالب'],
                      ['has_lots', 'دفعات (Lots)'],
                      ['has_expiration_date', 'تاريخ انتهاء'],
                    ].map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={(cv as any)[key]}
                          onChange={e => updateVariant(selVariant, key as any, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Prices */}
              {variantTab === 'prices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)' }}>
                    <i className="ti ti-chart-pie" style={{ marginLeft: 4 }} /> مستويات الأسعار
                  </div>
                  {(priceLevels as PriceLevel[]).length === 0 ? (
                    <div style={{ color: 'var(--t4)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                      <i className="ti ti-info-circle" /> لا توجد مستويات أسعار مُعرَّفة
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                      {(priceLevels as PriceLevel[]).map(pl => {
                        const price = cv.prices.find(p => p.price_level_id === pl.id);
                        return (
                          <div key={pl.id} style={{ padding: 10, background: 'var(--bg3)', borderRadius: 'var(--r2)' }}>
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>{pl.name}</div>
                            <input
                              type="number" min="0" step="0.01" style={inp()}
                              placeholder="السعر (0 = بدون مستوى)"
                              value={price?.price ?? ''}
                              onChange={e => updatePrice(selVariant, pl.id, 'price', e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                              <input
                                type="date" style={{ ...inp(), fontSize: 11, padding: '6px 8px', flex: 1 }}
                                value={price?.valid_from?.split('T')[0] ?? ''}
                                onChange={e => updatePrice(selVariant, pl.id, 'valid_from', e.target.value)}
                              />
                              <input
                                type="date" style={{ ...inp(), fontSize: 11, padding: '6px 8px', flex: 1 }}
                                value={price?.valid_to?.split('T')[0] ?? ''}
                                onChange={e => updatePrice(selVariant, pl.id, 'valid_to', e.target.value)}
                              />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11 }}>
                              <input type="checkbox" checked={price?.active !== false} onChange={e => updatePrice(selVariant, pl.id, 'active', e.target.checked)} />
                              مفعل
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Discounts */}
              {variantTab === 'discounts' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)' }}>تخفيضات الكميات</div>
                    <Switch
                      checked={cv.manages_quantity_discounts}
                      onChange={v => updateVariant(selVariant, 'manages_quantity_discounts', v)}
                      label="تفعيل التخفيضات"
                    />
                  </div>
                  {cv.manages_quantity_discounts && (
                    <>
                      <button onClick={() => addDiscount(selVariant)} style={{ padding: '6px 12px', borderRadius: 'var(--r1)', fontSize: 11, border: '1px solid var(--b3)', background: 'transparent', marginBottom: 12, cursor: 'pointer' }}>
                        <i className="ti ti-plus" /> إضافة شريحة
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cv.quantity_discounts.map((d, di) => (
                          <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, background: 'var(--bg3)', borderRadius: 'var(--r2)', flexWrap: 'wrap' }}>
                            <div style={{ flex: '0 0 auto' }}>
                              <label style={{ fontSize: 10, color: 'var(--t4)' }}>من</label>
                              <input type="number" min="0" style={{ ...inp(), width: 80 }} value={d.min_quantity} onChange={e => updateDiscount(selVariant, di, 'min_quantity', e.target.value)} />
                            </div>
                            <div style={{ flex: '0 0 auto' }}>
                              <label style={{ fontSize: 10, color: 'var(--t4)' }}>إلى</label>
                              <input type="number" min="0" style={{ ...inp(), width: 80 }} value={d.max_quantity ?? ''} onChange={e => updateDiscount(selVariant, di, 'max_quantity', e.target.value || null)} />
                            </div>
                            <div style={{ flex: '0 0 auto' }}>
                              <label style={{ fontSize: 10, color: 'var(--t4)' }}>نسبة %</label>
                              <input type="number" step="0.1" min="0" max="100" style={{ ...inp(), width: 90 }} value={d.discount_percentage ?? ''} onChange={e => updateDiscount(selVariant, di, 'discount_percentage', e.target.value || null)} />
                            </div>
                            <div style={{ flex: '0 0 auto' }}>
                              <label style={{ fontSize: 10, color: 'var(--t4)' }}>خصم ثابت</label>
                              <input type="number" step="0.01" min="0" style={{ ...inp(), width: 90 }} value={d.discount_per_unit ?? ''} onChange={e => updateDiscount(selVariant, di, 'discount_per_unit', e.target.value || null)} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                              <input type="checkbox" checked={d.active} onChange={e => updateDiscount(selVariant, di, 'active', e.target.checked)} />
                              مفعل
                            </label>
                            <button onClick={() => removeDiscount(selVariant, di)} style={{ color: 'var(--red)', background: 'transparent', border: 'none', cursor: 'pointer', marginRight: 'auto' }}>
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tab: Dimensions */}
              {variantTab === 'dimensions' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    ['weight', 'الوزن (كغ)', '0.001'],
                    ['volume', 'الحجم (م³)', '0.001'],
                    ['length', 'الطول (سم)', '0.1'],
                    ['width',  'العرض (سم)', '0.1'],
                    ['height', 'الارتفاع (سم)', '0.1'],
                  ].map(([field, label, step]) => (
                    <div key={field}>
                      <label>{label}</label>
                      <input
                        type="number" step={step} min="0" style={inp()}
                        value={(cv as any)[field] ?? ''}
                        onChange={e => updateVariant(selVariant, field as any, e.target.value ? +e.target.value : null)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', gap: 10 }}>
              <i className="ti ti-versions" style={{ fontSize: 32 }} />
              <div style={{ fontSize: 13 }}>أضف متغيراً أو اختر من القائمة</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 2 — مراجعة وإرسال                               */}
      {/* ══════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Product Summary */}
          <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', background: 'var(--bg3)', border: '1px solid var(--b2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{form.name}</div>
              <Badge variant={form.active ? 'success' : 'danger'}>{form.active ? 'نشط' : 'غير نشط'}</Badge>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--t3)', flexWrap: 'wrap' }}>
              {form.family_id && <span><i className="ti ti-folder" style={{ marginLeft: 4 }} />{(families as Family[]).find(f => f.id === form.family_id)?.name}</span>}
              {form.brand_id && <span><i className="ti ti-award" style={{ marginLeft: 4 }} />{(brands as Brand[]).find(b => b.id === form.brand_id)?.name}</span>}
              {form.product_type_id && <span><i className="ti ti-category" style={{ marginLeft: 4 }} />{(productTypes as ProductType[]).find(t => t.id === form.product_type_id)?.name}</span>}
            </div>
            {form.description && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t4)', lineHeight: 1.6 }}>{form.description}</div>}
          </div>

          {/* Variants Summary */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)' }}>{form.variants.length} متغير</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.variants.map((v, i) => {
              const price = Number(v.default_selling_price_ht) || 0;
              const priceLvls = v.prices.filter(p => p.price !== '' && Number(p.price) > 0).length;
              return (
                <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{v.variant_name || v.ref}</div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
                      {v.ref}{v.barcode ? ` · ${v.barcode}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--t4)' }}>سعر البيع HT</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--em)' }}>{price > 0 ? formatDZD(price) : '—'}</div>
                    </div>
                    {priceLvls > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--t4)' }}>مستويات الأسعار</div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{priceLvls} مستوى</div>
                      </div>
                    )}
                    {v.manages_quantity_discounts && v.quantity_discounts.length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--t4)' }}>خصومات</div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{v.quantity_discounts.length} شريحة</div>
                      </div>
                    )}
                    <Badge variant={v.active ? 'success' : 'danger'}>{v.active ? 'نشط' : 'غير نشط'}</Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning if no variants */}
          {form.variants.length === 0 && (
            <AlertBar variant="orange">
              ⚠️ لم تضف أي متغير — يرجى العودة لإضافة متغير واحد على الأقل
            </AlertBar>
          )}
        </div>
      )}
    </Modal>
  );
}
```

## FILE: resources/js/pages/products/ProductsPage.tsx
```
// resources/js/pages/products/ProductsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import ProgressBar from '@/components/ui/ProgressBar';
import ProductModal from '@/components/products/ProductModal';
import apiClient from '@/lib/api/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface Family      { id: number; name: string; }
interface Brand       { id: number; name: string; }
interface PriceLevel  { id: number; name: string; }

interface Variant {
  id: number;
  ref: string;
  variant_name: string | null;
  barcode: string | null;
  purchase_price: number;
  price_ht: number;
  tva_rate: number;
  tva_id: number | null;
  unit_id: number | null;
  min_stock: number;
  min_stock_alert: number;
  active: boolean;
  stock_quantity: number;
  manages_quantity_discounts: boolean;
  prices: any[];
  quantity_discounts: any[];
}

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  family_id: number | null;
  brand_id: number | null;
  product_type_id: number | null;
  images: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  family: Family | null;
  brand: Brand | null;
  productType: { id: number; name: string } | null;
  variants: Variant[];
}

interface ApiResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const formatDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' دج';

const StockBadge = ({ qty, min = 5 }: { qty?: number; min?: number }) => {
  const q = qty ?? 0;
  if (q <= 0)  return <span className="bx br no-dot" style={{ fontSize: 10 }}>نفذ</span>;
  if (q <= min) return <span className="bx bg no-dot" style={{ fontSize: 10 }}>منخفض</span>;
  return <span className="bx be no-dot" style={{ fontSize: 10 }}>متوفر</span>;
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductsPage() {
  const qc = useQueryClient();

  // Search & Filters
  const [search, setSearch]           = useState('');
  const debouncedSearch               = useDebounce(search, 350);
  const [page, setPage]               = useState(1);
  const [perPage]                     = useState(15);
  const [familyFilter, setFamilyFilter] = useState('');
  const [brandFilter, setBrandFilter]   = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [sortField, setSortField]     = useState('created_at');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals
  const modal       = useModal();
  const deleteModal = useModal();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId]         = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Variant Tooltip
  const [variantTooltip, setVariantTooltip] = useState<{ productId: number; variants: Variant[] } | null>(null);

  // ── Lookups (مشتركة بين الصفحة والمودال) ──
  const { data: families = [] } = useQuery<Family[]>({
    queryKey: ['families'],
    queryFn: () => apiClient.get('/families', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    staleTime: 5 * 60_000,
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => apiClient.get('/brands', { params: { per_page: 200 } }).then(r => r.data.data ?? []),
    staleTime: 5 * 60_000,
  });

  const { data: priceLevels = [] } = useQuery<PriceLevel[]>({
    queryKey: ['price-levels'],
    queryFn: () => apiClient.get('/price-levels', { params: { per_page: 50 } }).then(r => r.data.data ?? []),
    staleTime: 10 * 60_000,
  });

  // ── Products Query ──
  // نضيف include=variants حتى يأتي الرد مع المتغيرات
  const { data: response, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['products', debouncedSearch, familyFilter, brandFilter, activeFilter, page, perPage, sortField, sortDir],
    queryFn: () => {
      const params: Record<string, any> = {
        sort: sortDir === 'desc' ? `-${sortField}` : sortField,
        per_page: perPage,
        page,
        include: 'variants',   // ← مطلوب لجلب المتغيرات
      };
      if (debouncedSearch) params['filter[search]'] = debouncedSearch;
      if (familyFilter)    params['filter[family_id]'] = familyFilter;
      if (brandFilter)     params['filter[brand_id]'] = brandFilter;
      if (activeFilter)    params['filter[active]'] = activeFilter;
      return apiClient.get<ApiResponse<Product>>('/products', { params }).then(r => r.data);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const products: Product[] = response?.data ?? [];
  const meta = response?.meta ?? { current_page: 1, last_page: 1, total: 0, from: 0, to: 0 };

  // ── Stats ──
  const stats = {
    totalProducts: meta.total,
    totalVariants: products.reduce((s, p) => s + (p.variants?.length ?? 0), 0),
    activeProducts: products.filter(p => p.active).length,
    lowStockVariants: products.flatMap(p => p.variants ?? []).filter(v => v.stock_quantity <= (v.min_stock_alert ?? v.min_stock ?? 5)).length,
    totalStock: products.reduce((s, p) => s + (p.variants ?? []).reduce((vs, v) => vs + (v.stock_quantity ?? 0), 0), 0),
    highestPrice: Math.max(...products.flatMap(p => (p.variants ?? []).map(v => v.price_ht ?? 0)), 0),
  };

  // ── Mutations ──
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      showToast('تم حذف المنتج بنجاح');
      deleteModal.closeModal();
      setDeletingId(null);
    },
    onError: (err: any) => showToast(err?.response?.data?.message ?? 'فشل الحذف', 'error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiClient.put(`/products/${id}`, { active }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: () => showToast('فشل تغيير الحالة', 'error'),
  });

  // ── Handlers ──
  const handleDelete = (id: number) => { setDeletingId(id); deleteModal.openModal(); };
  const confirmDelete = () => { if (deletingId) deleteMutation.mutate(deletingId); };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const clearFilters = () => { setSearch(''); setFamilyFilter(''); setBrandFilter(''); setActiveFilter(''); setPage(1); };
  const hasFilters = debouncedSearch || familyFilter || brandFilter || activeFilter;

  const openAdd  = () => { setEditingProduct(null); modal.openModal(); };
  const openEdit = (p: Product) => { setEditingProduct(p); modal.openModal(); };

  const getFamilyName = (id: number | null) => families.find(f => f.id === id)?.name ?? '—';
  const getBrandName  = (id: number | null) => brands.find(b => b.id === id)?.name ?? '—';

  // ── Bulk ──
  const bulkToggle = async (active: boolean) => {
    await Promise.all(selectedIds.map(id => toggleActiveMutation.mutateAsync({ id, active })));
    qc.invalidateQueries({ queryKey: ['products'] });
    showToast(`تم ${active ? 'تفعيل' : 'تعطيل'} ${selectedIds.length} منتج`);
    setSelectedIds([]);
  };

  const bulkDelete = async () => {
    if (!confirm(`حذف ${selectedIds.length} منتج؟`)) return;
    await Promise.all(selectedIds.map(id => apiClient.delete(`/products/${id}`)));
    qc.invalidateQueries({ queryKey: ['products'] });
    showToast(`تم حذف ${selectedIds.length} منتج`);
    setSelectedIds([]);
  };

  // ── Render ──
  return (
    <div className="page on" id="p-products">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '10px 22px', borderRadius: 'var(--r3)', background: toast.type === 'success' ? 'var(--em)' : 'var(--red)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 24px rgba(0,0,0,.2)' }}>
          <i className={`ti ${toast.type === 'success' ? 'ti-check' : 'ti-x'}`} /> {toast.msg}
        </div>
      )}

      <PageHeader
        title="المنتجات"
        subtitle={`إدارة المنتجات — ${meta.total} منتج`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
            منتج جديد
          </Button>
        }
      />

      {/* KPIs */}
      <div className="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-package"        label="المنتجات"         value={stats.totalProducts} />
        <KpiCard variant="blue"   icon="ti-versions"       label="المتغيرات"         value={stats.totalVariants} />
        <KpiCard variant="indigo" icon="ti-check"          label="نشطة"              value={stats.activeProducts} />
        <KpiCard variant="orange" icon="ti-alert-triangle" label="مخزون منخفض"      value={stats.lowStockVariants} />
        <KpiCard variant="teal"   icon="ti-box"            label="إجمالي المخزون"    value={stats.totalStock} suffix=" وحدة" />
        <KpiCard variant="purple" icon="ti-tag"            label="أعلى سعر"          value={formatDZD(stats.highestPrice)} />
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--emb)', borderRadius: 'var(--r2)', border: '1px solid var(--em)', marginBottom: 16 }}>
          <span style={{ fontWeight: 700 }}><i className="ti ti-checkbox" style={{ color: 'var(--em)', marginLeft: 8 }} />تم تحديد {selectedIds.length} منتج</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="xs" icon={<i className="ti ti-check" />} onClick={() => bulkToggle(true)}>تفعيل</Button>
            <Button size="xs" icon={<i className="ti ti-x" />} onClick={() => bulkToggle(false)}>تعطيل</Button>
            <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={bulkDelete}>حذف</Button>
            <Button size="xs" onClick={() => setSelectedIds([])}>إلغاء</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="srch" style={{ flex: 2, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input
            type="text" placeholder="بحث بالاسم أو السلوج..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select style={{ width: 130, padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)' }} value={familyFilter} onChange={e => { setFamilyFilter(e.target.value); setPage(1); }}>
          <option value="">كل الفئات</option>
          {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select style={{ width: 130, padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)' }} value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }}>
          <option value="">كل العلامات</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select style={{ width: 110, padding: '7px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)' }} value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}>
          <option value="">كل الحالات</option>
          <option value="1">نشط</option>
          <option value="0">غير نشط</option>
        </select>
        {hasFilters && (
          <Button size="xs" variant="danger" icon={<i className="ti ti-x" />} onClick={clearFilters}>مسح الكل</Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {hasFilters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {debouncedSearch && <Badge variant="info" className="cursor-pointer" onClick={() => setSearch('')}>بحث: {debouncedSearch} ✕</Badge>}
          {familyFilter && <Badge variant="info" className="cursor-pointer" onClick={() => setFamilyFilter('')}>الفئة: {getFamilyName(+familyFilter)} ✕</Badge>}
          {brandFilter && <Badge variant="info" className="cursor-pointer" onClick={() => setBrandFilter('')}>العلامة: {getBrandName(+brandFilter)} ✕</Badge>}
          {activeFilter && <Badge variant="info" className="cursor-pointer" onClick={() => setActiveFilter('')}>الحالة: {activeFilter === '1' ? 'نشط' : 'غير نشط'} ✕</Badge>}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="empty">
          <div className="empty-ic"><i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite' }} /></div>
          <div className="empty-tx">جاري التحميل...</div>
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon="ti-package-off" text="لا توجد منتجات" action={<Button variant="primary" onClick={openAdd}>إضافة منتج</Button>} />
      ) : (
        <Card noHeader style={{ padding: 0, opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
          <div className="tw" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={() => setSelectedIds(selectedIds.length === products.length ? [] : products.map(p => p.id))}
                    />
                  </th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', minWidth: 180 }}>
                    المنتج {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>الفئة</th>
                  <th>العلامة</th>
                  <th style={{ textAlign: 'center' }}>المتغيرات</th>
                  <th style={{ textAlign: 'right' }}>السعر</th>
                  <th style={{ textAlign: 'center' }}>المخزون</th>
                  <th style={{ textAlign: 'center' }}>الحالة</th>
                  <th style={{ textAlign: 'center', width: 100 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => {
                  const variants    = prod.variants ?? [];
                  const totalStock  = variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0);
                  const minPrice    = variants.length ? Math.min(...variants.map(v => v.price_ht ?? 0)) : 0;
                  const minAlert    = variants[0]?.min_stock_alert ?? variants[0]?.min_stock ?? 5;
                  const stockPct    = minAlert > 0 ? Math.min(100, (totalStock / minAlert) * 100) : 100;
                  const isSelected  = selectedIds.includes(prod.id);

                  return (
                    <tr key={prod.id} style={{ background: isSelected ? 'var(--emb)' : undefined }}>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={() => setSelectedIds(prev => isSelected ? prev.filter(id => id !== prod.id) : [...prev, prod.id])}
                        />
                      </td>

                      <td>
                        <div style={{ fontWeight: 700 }}>{prod.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>{prod.slug}</div>
                        {prod.description && (
                          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {prod.description}
                          </div>
                        )}
                      </td>

                      <td>{getFamilyName(prod.family_id)}</td>
                      <td>{getBrandName(prod.brand_id)}</td>

                      {/* Variants */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <span
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--bg3)', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            onMouseEnter={() => setVariantTooltip({ productId: prod.id, variants })}
                            onMouseLeave={() => setVariantTooltip(null)}
                          >
                            {variants.length} <i className="ti ti-versions" style={{ fontSize: 12 }} />
                          </span>
                          {variantTooltip?.productId === prod.id && variants.length > 0 && (
                            <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg1)', border: '1px solid var(--b2)', borderRadius: 'var(--r2)', boxShadow: 'var(--shadow2)', padding: 8, minWidth: 180, zIndex: 100, whiteSpace: 'nowrap' }}>
                              {variants.slice(0, 5).map(v => (
                                <div key={v.id} style={{ padding: '3px 8px', fontSize: 11 }}>
                                  {v.variant_name || v.ref} — {formatDZD(v.price_ht ?? 0)}
                                </div>
                              ))}
                              {variants.length > 5 && <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--t4)' }}>+{variants.length - 5} أكثر</div>}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 700, color: 'var(--em)' }}>
                        {variants.length ? formatDZD(minPrice) : '—'}
                      </td>

                      {/* Stock */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ minWidth: 80 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ProgressBar value={stockPct} height={4} />
                            <span style={{ fontSize: 11, minWidth: 30 }}>{totalStock}</span>
                          </div>
                          <StockBadge qty={totalStock} min={minAlert} />
                        </div>
                      </td>

                      {/* Active Toggle */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={prod.active}
                          onChange={val => toggleActiveMutation.mutate({ id: prod.id, active: val })}
                        />
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(prod)} title="تعديل" />
                          <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(prod.id)} title="حذف" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid var(--b1)' }}>
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="ti ti-chevron-right" /></Button>
                {(() => {
                  const pages: number[] = [];
                  const max = 5;
                  if (meta.last_page <= max) for (let i = 1; i <= meta.last_page; i++) pages.push(i);
                  else if (page <= 3) for (let i = 1; i <= max; i++) pages.push(i);
                  else if (page >= meta.last_page - 2) for (let i = meta.last_page - max + 1; i <= meta.last_page; i++) pages.push(i);
                  else for (let i = page - 2; i <= page + 2; i++) pages.push(i);
                  return pages.map(p => (
                    <button key={p} className={`btn btn-xs ${p === page ? 'btn-p' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  ));
                })()}
                <Button size="xs" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}><i className="ti ti-chevron-left" /></Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Product Modal */}
      <ProductModal
        open={modal.open}
        product={editingProduct}
        lookups={{ families, brands, priceLevels }}
        onClose={() => { modal.closeModal(); setEditingProduct(null); }}
        onSaved={() => {
          refetch();
          showToast(editingProduct ? 'تم تعديل المنتج بنجاح' : 'تمت إضافة المنتج بنجاح');
        }}
      />

      {/* Confirm Delete */}
      <Modal open={deleteModal.open} onClose={deleteModal.closeModal} size="sm" title="تأكيد حذف المنتج">
        <div style={{ textAlign: 'center', padding: 16 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
          <div style={{ fontWeight: 800, fontSize: 15, margin: '12px 0 6px' }}>هل أنت متأكد؟</div>
          <div style={{ fontSize: 13, color: 'var(--t4)' }}>لا يمكن التراجع عن هذا الإجراء.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 0 0' }}>
          <Button onClick={deleteModal.closeModal} disabled={deleteMutation.isPending}>إلغاء</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleteMutation.isPending}
            icon={deleteMutation.isPending ? <i className="ti ti-loader" /> : <i className="ti ti-trash" />}
          >
            {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
```

## FILE: resources/js/pages/reports/ReportsPage.tsx
```
// ════════════════════════════════════════════════
// resources/js/pages/reports/ReportsPage.tsx
// لوحة التقارير والإحصائيات
// ════════════════════════════════════════════════
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import KpiCard from '@/components/ui/KpiCard';
import AlertBar from '@/components/ui/AlertBar';
import ProgressBar from '@/components/ui/ProgressBar';
import apiClient from '@/lib/api/client';
import { useFiscalYear } from '@/context/FiscalYearContext';

// ─────────────────────────────────────────────────────────────
// أنواع التقارير
// ─────────────────────────────────────────────────────────────
interface ReportCard {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    endpoint: string;
    params?: Record<string, string>;
    badge?: string;
    badgeColor?: string;
}

const REPORT_CARDS: ReportCard[] = [
    {
        id: 'sales',
        title: 'تقرير المبيعات',
        description: 'تحليل المبيعات حسب الفترة، المنتج، والزبون مع مقارنة سنوية',
        icon: 'ti-trending-up',
        color: 'var(--em)',
        endpoint: '/reports/sales',
        badge: 'الأكثر استخداماً',
    },
    {
        id: 'purchases',
        title: 'تقرير المشتريات',
        description: 'تحليل المشتريات والموردين مع تتبع التكاليف',
        icon: 'ti-trending-down',
        color: 'var(--blue)',
        endpoint: '/reports/purchases',
    },
    {
        id: 'customers',
        title: 'تقرير العملاء',
        description: 'كشف حساب العملاء، الديون المستحقة، وأفضل العملاء',
        icon: 'ti-users',
        color: 'var(--purple)',
        endpoint: '/reports/customers',
    },
    {
        id: 'suppliers',
        title: 'تقرير الموردين',
        description: 'كشف حساب الموردين، المستحقات، وأفضل الموردين',
        icon: 'ti-truck',
        color: 'var(--gold)',
        endpoint: '/reports/suppliers',
    },
    {
        id: 'products',
        title: 'تقرير المنتجات',
        description: 'حركة المنتجات، الأكثر مبيعاً، والأقل مبيعاً',
        icon: 'ti-package',
        color: 'var(--teal)',
        endpoint: '/reports/products',
    },
    {
        id: 'inventory',
        title: 'تقرير المخزون',
        description: 'تقييم المخزون، الحركات، والمنتجات المنخفضة',
        icon: 'ti-building-warehouse',
        color: 'var(--orange)',
        endpoint: '/reports/inventory',
    },
    {
        id: 'payments',
        title: 'تقرير الدفعات',
        description: 'سجل الدفعات والتحصيلات حسب طريقة الدفع والفترة',
        icon: 'ti-cash',
        color: 'var(--em)',
        endpoint: '/reports/payments',
    },
    {
        id: 'taxes',
        title: 'تقرير الضرائب',
        description: 'تقرير TVA، الطابع الجبائي، وإقرار G50',
        icon: 'ti-calculator',
        color: 'var(--red)',
        endpoint: '/reports/taxes',
        badge: 'G50',
        badgeColor: 'var(--gold)',
    },
];

// ─────────────────────────────────────────────────────────────
// مكون التقرير السريع
// ─────────────────────────────────────────────────────────────
function QuickReportCard({ report }: { report: ReportCard }) {
    const navigate = useNavigate();

    return (
        <Card
            style={{ cursor: 'pointer', transition: 'all .2s' }}
            onClick={() => navigate(`/reports?id=${report.id}`)}
        >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* الأيقونة */}
                <div style={{
                    width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                    background: `color-mix(in srgb, ${report.color} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${report.color} 25%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: report.color, fontSize: 22,
                }}>
                    <span className="ic"><i className={`ti ${report.icon}`}/></span>
                </div>

                {/* المحتوى */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--t1)' }}>
                            {report.title}
                        </div>
                        {report.badge && (
                            <Badge variant="success" noDot>
                                {report.badge}
                            </Badge>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 12, lineHeight: 1.6 }}>
                        {report.description}
                    </div>
                    <Button size="xs" variant="primary" icon={<i className="ti ti-arrow-left"/>}>
                        عرض التقرير
                    </Button>
                </div>
            </div>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// مكون عرض تقرير محدد
// ─────────────────────────────────────────────────────────────
function ReportViewer({ reportId, fiscalYearId }: { reportId: string; fiscalYearId?: number }) {
    const report = REPORT_CARDS.find(r => r.id === reportId);
    const isTaxReport = reportId === 'taxes';

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['report', reportId, fiscalYearId],
        queryFn: () => apiClient.get(report?.endpoint || '', {
            params: {
                fiscal_year_id: fiscalYearId,
                ...(report?.params || {}),
            },
        }).then(r => r.data),
        enabled: !!reportId && !!report?.endpoint,
    });

    if (!report) {
        return (
            <EmptyState icon="ti-file-search" text="تقرير غير موجود" sub="اختر تقريراً من القائمة"/>
        );
    }

    return (
        <div>
            <PageHeader
                title={report.title}
                subtitle={report.description}
                actions={
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button size="sm" icon={<i className="ti ti-download"/>} onClick={() => window.open(`${report.endpoint}?fiscal_year_id=${fiscalYearId}&export=excel`, '_blank')}>
                            تصدير Excel
                        </Button>
                        <Button size="sm" icon={<i className="ti ti-printer"/>} onClick={() => window.open(`${report.endpoint}?fiscal_year_id=${fiscalYearId}&export=pdf`, '_blank')}>
                            PDF
                        </Button>
                        <Button size="sm" icon={<i className="ti ti-refresh"/>} onClick={() => refetch()}>
                            تحديث
                        </Button>
                    </div>
                }
            />

            {isLoading ? (
                <div className="empty" style={{ padding: 60 }}>
                    <div className="empty-ic"><i className="ti ti-loader"/></div>
                    <div className="empty-tx">جاري تحميل التقرير...</div>
                </div>
            ) : isError ? (
                <AlertBar variant="red">
                    فشل تحميل التقرير.{' '}
                    <button onClick={() => refetch()} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        إعادة المحاولة
                    </button>
                </AlertBar>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* KPIs خاصة بالتقرير */}
                    {isTaxReport && data?.summary && (
                        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                            <KpiCard variant="green" icon="ti-arrow-up-circle" label="TVA محصلة" value={data.summary.tva_collected?.toLocaleString('fr-DZ') || '—'} unit="دج"/>
                            <KpiCard variant="blue" icon="ti-arrow-down-circle" label="TVA قابلة للخصم" value={data.summary.tva_deductible?.toLocaleString('fr-DZ') || '—'} unit="دج"/>
                            <KpiCard variant="red" icon="ti-calculator" label="المستحق" value={data.summary.net_tva?.toLocaleString('fr-DZ') || '—'} unit="دج"/>
                            <KpiCard variant="gold" icon="ti-file-check" label="حالة الإقرار" value={data.summary.submitted ? 'مقدم' : 'قيد الإعداد'}/>
                        </div>
                    )}

                    {/* جدول البيانات */}
                    {data?.data && data.data.length > 0 && (
                        <Card noHeader style={{ padding: 0 }}>
                            <div className="tw">
                                <table>
                                    <thead>
                                        <tr>
                                            {Object.keys(data.data[0]).slice(0, 6).map(key => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.data.slice(0, 20).map((row: any, i: number) => (
                                            <tr key={i}>
                                                {Object.values(row).slice(0, 6).map((val: any, j: number) => (
                                                    <td key={j}>{String(val ?? '—')}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data.data.length > 20 && (
                                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--b1)', fontSize: 12, color: 'var(--t4)', textAlign: 'center' }}>
                                    عرض 20 من أصل {data.data.length} سجل — حمّل الملف للاطلاع على الكل
                                </div>
                            )}
                        </Card>
                    )}

                    {(!data?.data || data.data.length === 0) && (
                        <div className="empty" style={{ padding: 40 }}>
                            <div className="empty-ic"><i className="ti ti-file-off"/></div>
                            <div className="empty-tx">لا توجد بيانات متاحة لهذه الفترة</div>
                            <div className="empty-sub">جرب تغيير السنة المالية أو معايير التقرير</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// حالة فارغة
// ─────────────────────────────────────────────────────────────
function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
    return (
        <div className="empty" style={{ padding: 60 }}>
            <div className="empty-ic"><i className={`ti ${icon}`}/></div>
            <div className="empty-tx">{text}</div>
            {sub && <div className="empty-sub">{sub}</div>}
        </div>
    );
}

// ════════════════════════════════════════════════
// الصفحة الرئيسية للتقارير
// ════════════════════════════════════════════════
export default function ReportsPage() {
    const { selectedYear } = useFiscalYear();
    const [viewingReport, setViewingReport] = useState<string | null>(null);

    // إذا كان هناك تقرير مطلوب عرضه
    if (viewingReport) {
        return (
            <div className="page on" id="p-reports">
                <div style={{ marginBottom: 16 }}>
                    <Button size="sm" icon={<i className="ti ti-arrow-right"/>} onClick={() => setViewingReport(null)}>
                        العودة لقائمة التقارير
                    </Button>
                </div>
                <ReportViewer reportId={viewingReport} fiscalYearId={selectedYear?.id}/>
            </div>
        );
    }

    return (
        <div className="page on" id="p-reports">
            <PageHeader
                title="التقارير والإحصائيات"
                subtitle={`جميع التقارير المالية والإدارية — السنة: ${selectedYear?.name || '—'}`}
            />

            {/* KPIs للتقارير */}
            <div className="kpis" style={{ marginBottom: 24 }}>
                <KpiCard variant="green" icon="ti-file-text" label="إجمالي التقارير" value={REPORT_CARDS.length}/>
                <KpiCard variant="blue" icon="ti-clock" label="آخر تحديث" value="قبل لحظات"/>
                <KpiCard variant="gold" icon="ti-download" label="التقارير المُصدرة" value="—"/>
                <KpiCard variant="purple" icon="ti-star" label="التقارير المفضلة" value="3"/>
            </div>

            {/* سنة مقفلة — تحذير */}
            {selectedYear?.is_closed && (
                <AlertBar variant="gold">
                    🔒 السنة المالية {selectedYear.name} مقفلة — التقارير للعرض فقط ولا يمكن تعديل البيانات.
                </AlertBar>
            )}

            {/* قائمة التقارير */}
            <div className="g2" style={{ marginBottom: 20 }}>
                {REPORT_CARDS.map(report => (
                    <div key={report.id} onClick={() => setViewingReport(report.id)}>
                        <QuickReportCard report={report}/>
                    </div>
                ))}
            </div>

            {/* معلومات إضافية */}
            <Card
                title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-info-circle"/></span> معلومات عن التقارير</>}
                noHeader={false}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--t3)' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <i className="ti ti-check" style={{ color: 'var(--em)', flexShrink: 0, marginTop: 3 }}/>
                        <span>جميع التقارير تدعم التصدير بصيغ <strong>Excel</strong> و <strong>PDF</strong></span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <i className="ti ti-check" style={{ color: 'var(--em)', flexShrink: 0, marginTop: 3 }}/>
                        <span>يمكن تصفية التقارير حسب <strong>السنة المالية</strong> المختارة من الشريط العلوي</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <i className="ti ti-check" style={{ color: 'var(--em)', flexShrink: 0, marginTop: 3 }}/>
                        <span>التقارير تُحدَّث <strong>تلقائياً</strong> مع كل عملية بيع أو شراء</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
```

## FILE: resources/js/pages/settings/DocumentTypesPage.tsx
```
// resources/js/pages/settings/DocumentTypesPage.tsx
// resources/js/pages/settings/DocumentTypesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import apiClient from '@/lib/api/client';
import type { DocumentType } from '@/types';

// ===============================================
// MAIN COMPONENT
// ===============================================
export default function DocumentTypesPage() {
    const qc = useQueryClient();
    const [editing, setEditing] = useState<DocumentType | null>(null);
    const [filter, setFilter] = useState('');
    const modal = useModal();

    // 1. جلب أنواع المستندات
    const { data: items, isLoading, isError, refetch } = useQuery<DocumentType[]>({
        queryKey: ['document-types', filter],
        queryFn: () => apiClient.get('/document-types', { params: { filter: filter || undefined } }).then(r => r.data.data),
    });

    // 2. جلب العمليات الأساسية لتحويل id -> اسم
    const { data: operationsData } = useQuery({
        queryKey: ['document-base-operations'],
        queryFn: () => apiClient.get('/document-base-operations').then(r => r.data.data),
        staleTime: 10 * 60_000, // تخزين طويل
    });

    // إنشاء خريطة id -> label
    const operationMap = useMemo(() => {
        const map: Record<number, string> = {};
        if (operationsData) {
            // دالة ترجمة احتياطية
            const translate = (name: string) => {
                const dict: Record<string, string> = {
                    sale: 'مبيعات', purchase: 'مشتريات', transfer: 'نقل مخزون', adjustment: 'تسوية (جرد)'
                };
                return dict[name] || name;
            };
            operationsData.forEach((op: any) => {
                map[op.id] = op.label || translate(op.name) || op.name;
            });
        }
        return map;
    }, [operationsData]);

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/document-types/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['document-types'] }),
    });

    const openAdd = () => { setEditing(null); modal.openModal(); };
    const openEdit = (item: DocumentType) => { setEditing(item); modal.openModal(); };
    const handleDelete = (id: number) => {
        if (confirm('هل تريد حذف نوع المستند هذا؟')) deleteMutation.mutate(id);
    };

    return (
        <div className="page on" id="p-document-types">
            <PageHeader
                title="أنواع المستندات"
                subtitle="تخصيص أسماء المستندات وتأثيرها على المخزون والترقيم"
                actions={
                    <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
                        إضافة نوع جديد
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 16 }}>
                <KpiCard variant="green"  icon="ti-file-text"     label="أنواع المستندات" value={items?.length ?? 0} />
                <KpiCard variant="blue"   icon="ti-package"       label="تأثير على المخزون" value={items?.filter(d => d.affects_stock_direction !== 0).length ?? 0} />
                <KpiCard variant="gold"   icon="ti-calculator"    label="تأثير محاسبي"       value={items?.filter(d => d.affects_accounting).length ?? 0} />
                <KpiCard variant="purple" icon="ti-clipboard-check" label="يتطلب متعامل"        value={items?.filter(d => d.requires_party).length ?? 0} />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div className="srch" style={{ flex: 1, display: 'flex' }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
                    <input type="text" placeholder="بحث بالاسم أو الكود..." onChange={e => setFilter(e.target.value)} />
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="empty"><span className="ic ic-xl"><i className="ti ti-loader" /></span><div className="empty-tx">جارٍ التحميل...</div></div>
            ) : isError ? (
                <AlertBar variant="red">فشل تحميل البيانات. <button onClick={() => refetch()} style={{ fontWeight: 700, textDecoration: 'underline' }}>إعادة المحاولة</button></AlertBar>
            ) : !items || items.length === 0 ? (
                <EmptyState icon="ti-file-off" text="لم يتم العثور على أنواع مستندات" sub="أضف نوعاً جديداً للبدء" action={<Button variant="primary" onClick={openAdd}>إضافة نوع جديد</Button>} />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>الاسم (عربي)</th>
                                    <th>الاسم (لاتيني)</th>
                                    <th>الكود</th>
                                    <th>العملية الأساسية</th>
                                    <th>اتجاه المخزون</th>
                                    <th>يحتاج متعامل</th>
                                    <th>محاسبي</th>
                                    <th>نشط</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item: any) => {
                                    // الحصول على اسم العملية من الخريطة
                                    const operationName = operationMap[item.document_base_operation_id] || '-';
                                    const operationCode = operationsData?.find((o: any) => o.id === item.document_base_operation_id)?.name || '';
                                    // اختيار لون البادج
                                    let badgeVariant: any = 'info';
                                    if (operationCode === 'sale') badgeVariant = 'success';
                                    else if (operationCode === 'purchase') badgeVariant = 'warning';
                                    else if (operationCode === 'transfer') badgeVariant = 'info';
                                    else if (operationCode === 'adjustment') badgeVariant = 'info';

                                    return (
                                        <tr key={item.id}>
                                            <td className="s">{item.name}</td>
                                            <td style={{ color: 'var(--t3)' }}>{item.name_latin}</td>
                                            <td className="m">{item.code}</td>
                                            <td>
                                                <Badge variant={badgeVariant}>
                                                    {operationName}
                                                </Badge>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {item.affects_stock_direction === 1 ? (
                                                    <Badge variant="success">+ دخول</Badge>
                                                ) : item.affects_stock_direction === -1 ? (
                                                    <Badge variant="danger">- خروج</Badge>
                                                ) : (
                                                    <Badge variant="gray">لا تأثير</Badge>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="ic ic-xs" style={{ color: item.requires_party ? 'var(--em)' : 'var(--t4)' }}>
                                                    <i className={`ti ${item.requires_party ? 'ti-check' : 'ti-x'}`} />
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="ic ic-xs" style={{ color: item.affects_accounting ? 'var(--em)' : 'var(--t4)' }}>
                                                    <i className={`ti ${item.affects_accounting ? 'ti-check' : 'ti-x'}`} />
                                                </span>
                                            </td>
                                            <td><Badge variant={item.active ? 'success' : 'danger'}>{item.active ? 'نشط' : 'موقوف'}</Badge></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 3 }}>
                                                    <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(item)} />
                                                    <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(item.id)} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Modal */}
            <DocumentTypeModal
                open={modal.open}
                docType={editing}
                onClose={modal.closeModal}
            />
        </div>
    );
}


// ===============================================
// MODAL: Add / Edit Document Type
// ===============================================
// داخل نفس ملف DocumentTypesPage.tsx، استبدلي مكون DocumentTypeModal بهذا:

// ===============================================
// MODAL: Add / Edit Document Type (محسّن)
// ===============================================
// ===============================================
// MODAL: Add / Edit Document Type (إصدار نهائي)
// ===============================================
// ===============================================
// MODAL: Add / Edit Document Type (كامل بعد التعديل)
// ===============================================
// ===============================================
// MODAL: Add / Edit Document Type (مع حماية البيانات التاريخية)
// ===============================================
function DocumentTypeModal({ open, docType, onClose }: {
    open: boolean; docType: DocumentType | null; onClose: () => void;
}) {
    const isEdit = !!docType;
    const qc = useQueryClient();

    // ---------- العمليات الأساسية ----------
    const STATIC_OPERATIONS = [
        { id: 1, name: 'sale',       label: 'مبيعات' },
        { id: 2, name: 'purchase',   label: 'مشتريات' },
        { id: 3, name: 'transfer',   label: 'نقل مخزون' },
        { id: 4, name: 'adjustment', label: 'تسوية (جرد)' },
    ];

    const translateOperationName = (name: string) => {
        const map: Record<string, string> = {
            sale:       'مبيعات',
            purchase:   'مشتريات',
            transfer:   'نقل مخزون',
            adjustment: 'تسوية (جرد)',
        };
        return map[name] || name;
    };

    const { data: serverOps, isLoading: opsLoading } = useQuery({
        queryKey: ['document-base-operations'],
        queryFn: () => apiClient.get('/document-base-operations').then(r => r.data.data),
        enabled: open,
        staleTime: 2 * 60_000,
    });

    const operations = React.useMemo(() => {
        const source = (Array.isArray(serverOps) && serverOps.length > 0) ? serverOps : STATIC_OPERATIONS;
        return source.map((op: any) => ({ id: op.id, label: op.label || translateOperationName(op.name) || op.name }));
    }, [serverOps]);

    // ---------- عدد المستندات المنشأة بهذا النوع ----------
    const [docsCount, setDocsCount] = useState(0);
    const [checkingDocs, setCheckingDocs] = useState(false);

    useEffect(() => {
        if (open && isEdit && docType?.id) {
            setCheckingDocs(true);
            apiClient.get('/commercial-documents', {
                params: { document_type_id: docType.id, per_page: 1 }
            })
            .then(res => {
                const meta = res.data?.meta;
                setDocsCount(meta?.total ?? 0);
            })
            .catch(() => setDocsCount(0))
            .finally(() => setCheckingDocs(false));
        } else {
            setDocsCount(0);
        }
    }, [open, isEdit, docType]);

    // ---------- النموذج ----------
    const [form, setForm] = useState({
        name: '',
        name_latin: '',
        code: '',
        description: '',
        document_base_operation_id: '',
        affects_stock_direction: '0',
        requires_party: true,
        affects_accounting: true,
        is_printable: true,
        display_order: 0,
        active: true,
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            if (docType) {
                setForm({
                    name: docType.name || '',
                    name_latin: docType.name_latin || '',
                    code: docType.code || '',
                    description: docType.description || '',
                    document_base_operation_id: String(docType.document_base_operation_id || ''),
                    affects_stock_direction: String(docType.affects_stock_direction ?? 0),
                    requires_party: docType.requires_party ?? true,
                    affects_accounting: docType.affects_accounting ?? true,
                    is_printable: docType.is_printable ?? true,
                    display_order: docType.display_order ?? 0,
                    active: docType.active ?? true,
                });
            } else {
                setForm({
                    name: '',
                    name_latin: '',
                    code: '',
                    description: '',
                    document_base_operation_id: '',
                    affects_stock_direction: '0',
                    requires_party: true,
                    affects_accounting: true,
                    is_printable: true,
                    display_order: 0,
                    active: true,
                });
            }
            setError('');
        }
    }, [open, docType]);

    const set = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload = {
                ...data,
                document_base_operation_id: parseInt(data.document_base_operation_id) || null,
                affects_stock_direction: parseInt(data.affects_stock_direction),
                display_order: parseInt(String(data.display_order)) || 0,
            };
            return isEdit
                ? apiClient.put(`/document-types/${docType!.id}`, payload)
                : apiClient.post('/document-types', payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['document-types'] }); onClose(); },
        onError: (err: any) => setError(err?.response?.data?.message || 'فشل الحفظ'),
    });

    const handleSave = () => {
        if (!form.name.trim()) { setError('الاسم العربي مطلوب'); return; }
        if (!form.code.trim()) { setError('الكود مطلوب'); return; }
        if (!form.document_base_operation_id) { setError('يجب اختيار العملية الأساسية'); return; }
        saveMutation.mutate(form);
    };

    const hasDocuments = docsCount > 0;
    const criticalFieldsDisabled = isEdit && hasDocuments;

    return (
        <Modal open={open} onClose={onClose} size="md"
            title={isEdit ? `تعديل — ${docType?.name}` : 'إضافة نوع مستند جديد'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>

            {/* رسالة تحذيرية عند وجود مستندات سابقة */}
            {checkingDocs ? (
                <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', marginBottom: 12, fontSize: 13, color: 'var(--t3)' }}>
                    جارٍ فحص المستندات المرتبطة...
                </div>
            ) : hasDocuments && (
                <AlertBar variant="gold">
                    <strong>تنبيه هام:</strong> يوجد <strong>{docsCount}</strong> مستند تم إنشاؤه بهذا النوع. لا يمكن تعديل الخصائص المؤثرة على المخزون أو المحاسبة أو العملية الأساسية حفاظاً على سلامة البيانات.
                </AlertBar>
            )}

            {error && <AlertBar variant="red">{error}</AlertBar>}

            <div className="fgrid">
                <div className="fg s2">
                    <label className="req">الاسم العربي</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: فاتورة البيع" autoFocus />
                </div>
                <div className="fg s2">
                    <label className="req">الاسم اللاتيني</label>
                    <input value={form.name_latin} onChange={e => set('name_latin', e.target.value)} placeholder="Sales Invoice" />
                </div>
                <div className="fg">
                    <label className="req">الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="FV, BL, BCC..." style={{ fontFamily: 'monospace' }} />
                </div>

                {/* العملية الأساسية – معطلة إذا كانت هناك مستندات */}
                <div className="fg">
                    <label className="req">العملية الأساسية</label>
                    <select
                        value={form.document_base_operation_id}
                        onChange={e => set('document_base_operation_id', e.target.value)}
                        disabled={criticalFieldsDisabled}
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: 'var(--r2)',
                            border: '1px solid var(--b3)', background: criticalFieldsDisabled ? 'var(--bg3)' : 'var(--bg2)',
                            color: form.document_base_operation_id ? 'var(--t1)' : 'var(--t4)',
                            fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                            opacity: criticalFieldsDisabled ? 0.6 : 1,
                            cursor: criticalFieldsDisabled ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <option value="">— اختر —</option>
                        {operations.map((op: any) => (
                            <option key={op.id} value={op.id} style={{ color: 'var(--t1)', background: 'var(--bg2)' }}>
                                {op.label}
                            </option>
                        ))}
                    </select>
                    {criticalFieldsDisabled && <span style={{ fontSize: 10, color: 'var(--gold)', marginTop: 2 }}>لا يمكن التعديل – مرتبط بمستندات سابقة</span>}
                </div>

                <div className="fg">
                    <label className="req">تأثير على المخزون</label>
                    <select value={form.affects_stock_direction} onChange={e => set('affects_stock_direction', e.target.value)}
                        disabled={criticalFieldsDisabled}
                        style={{ opacity: criticalFieldsDisabled ? 0.6 : 1, cursor: criticalFieldsDisabled ? 'not-allowed' : 'pointer', background: criticalFieldsDisabled ? 'var(--bg3)' : undefined }}
                    >
                        <option value="-1">خروج (-1)</option>
                        <option value="0">لا تأثير (0)</option>
                        <option value="1">دخول (+1)</option>
                    </select>
                </div>
                <div className="fg">
                    <label>الوصف</label>
                    <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف اختياري..." />
                </div>
                <div className="fg">
                    <label>يتطلب متعامل (زبون/مورد)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, opacity: criticalFieldsDisabled ? 0.6 : 1 }}>
                        <Switch checked={form.requires_party} onChange={(v) => { if (!criticalFieldsDisabled) set('requires_party', v); }} />
                        {criticalFieldsDisabled && <span style={{ fontSize: 10, color: 'var(--gold)' }}>مُعطل مؤقتاً</span>}
                    </div>
                </div>
                <div className="fg">
                    <label>يؤثر على المحاسبة</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, opacity: criticalFieldsDisabled ? 0.6 : 1 }}>
                        <Switch checked={form.affects_accounting} onChange={(v) => { if (!criticalFieldsDisabled) set('affects_accounting', v); }} />
                        {criticalFieldsDisabled && <span style={{ fontSize: 10, color: 'var(--gold)' }}>مُعطل مؤقتاً</span>}
                    </div>
                </div>
                <div className="fg">
                    <label>قابل للطباعة</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_printable} onChange={(v) => set('is_printable', v)} />
                    </div>
                </div>
                <div className="fg">
                    <label>ترتيب العرض</label>
                    <input type="number" value={form.display_order} onChange={e => set('display_order', e.target.value)} />
                </div>
                <div className="fg">
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={(v) => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
```

## FILE: resources/js/pages/settings/PaymentMethodsPage.tsx
```
// resources/js/pages/settings/PaymentMethodsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import apiClient from '@/lib/api/client';

// --------------- Types ---------------
interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  description?: string;
  treasury_account_id?: number | null;
  requires_reference: boolean;
  is_cash: boolean;
  active: boolean;
  display_order: number;
  relations?: {
    treasuryAccount?: { id: number; name: string };
  };
}

interface TreasuryAccount {
  id: number;
  name: string;
}

// --------------- API Layer ---------------
const paymentMethodsApi = {
  list: (params: Record<string, any>) =>
    apiClient.get('/payment-modes', { params }).then(r => r.data),
  create: (data: any) =>
    apiClient.post('/payment-modes', data).then(r => r.data),
  update: (id: number, data: any) =>
    apiClient.put(`/payment-modes/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    apiClient.delete(`/payment-modes/${id}`).then(r => r.data),
};

// --------------- Debounce ---------------
function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// =============== Main Component ===============
export default function PaymentMethodsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const modal = useModal();
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch payment methods
  const { data: paginated, isLoading, isFetching } = useQuery({
    queryKey: ['payment-modes', debouncedSearch, page, perPage],
    queryFn: () => paymentMethodsApi.list({
      'filter[search]': debouncedSearch || undefined,
      sort: 'name',
      per_page: perPage,
      page,
      include: 'treasuryAccount',
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const methods: PaymentMethod[] = paginated?.data ?? [];
  const meta = paginated?.meta;

  // Treasury accounts (for modal)
  const { data: treasuryAccounts } = useQuery<TreasuryAccount[]>({
    queryKey: ['treasury-accounts-select'],
    queryFn: () => apiClient.get('/treasury-accounts', { params: { per_page: 200 } })
      .then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: number) => paymentMethodsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-modes'] });
      deleteModal.closeModal();
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'فشل الحذف');
      deleteModal.closeModal();
    },
  });

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteModal.openModal();
  };
  const confirmDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId);
  };

  const openAdd = () => { setEditing(null); modal.openModal(); };
  const openEdit = (item: PaymentMethod) => { setEditing(item); modal.openModal(); };

  return (
    <div className="page on" id="p-payment-methods">
      <PageHeader
        title="طرق الدفع"
        subtitle={`إدارة وسائل الدفع المتاحة — ${meta?.total ?? 0} طريقة`}
        actions={
          <Button variant="primary" size="sm" icon={<i className="ti ti-plus" />} onClick={openAdd}>
            إضافة طريقة دفع
          </Button>
        }
      />

      {error && (
        <AlertBar variant="red" dismissible onDismiss={() => setError(null)}>
          {error}
        </AlertBar>
      )}

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green" icon="ti-credit-card" label="إجمالي الطرق" value={meta?.total ?? 0} />
        <KpiCard variant="blue" icon="ti-cash" label="طرق نقدية" value={methods.filter(m => m.is_cash).length} />
        <KpiCard variant="purple" icon="ti-receipt" label="تتطلب مرجع" value={methods.filter(m => m.requires_reference).length} />
        <KpiCard variant="red" icon="ti-ban" label="موقوفة" value={methods.filter(m => !m.active).length} />
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
          <input
            type="text"
            placeholder="ابحث بالاسم أو الكود..."
            style={{ width: '100%' }}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader" /></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : methods.length === 0 ? (
        <EmptyState
          icon="ti-credit-card"
          text="لا توجد طرق دفع"
          sub="أضف أول طريقة دفع (نقداً، CIB، شيك...)"
          action={<Button variant="primary" onClick={openAdd}>إضافة طريقة دفع</Button>}
        />
      ) : (
        <Card noHeader style={{ padding: 0, opacity: isFetching ? 0.7 : 1 }}>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الكود</th>
                  <th>الحساب المالي</th>
                  <th>نقدي</th>
                  <th>يتطلب مرجع</th>
                  <th>الترتيب</th>
                  <th>نشط</th>
                  <th style={{ textAlign: 'center', width: 130 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {methods.map(item => (
                  <tr key={item.id}>
                    <td className="s">{item.name}</td>
                    <td><code style={{ fontSize: 12, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>{item.code}</code></td>
                    <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                      {item.relations?.treasuryAccount?.name ?? '—'}
                    </td>
                    <td><Badge variant={item.is_cash ? 'success' : 'gray'}>{item.is_cash ? 'نعم' : 'لا'}</Badge></td>
                    <td>
                      {item.requires_reference ? (
                        <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check" /></span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.display_order}</td>
                    <td><Badge variant={item.active ? 'success' : 'danger'}>{item.active ? 'نشط' : 'موقوف'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <Button size="xs" icon={<i className="ti ti-pencil" />} onClick={() => openEdit(item)} />
                        <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />} onClick={() => handleDelete(item.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--b1)' }}>
              <span style={{ fontSize: 12, color: 'var(--t4)' }}>{meta.from}–{meta.to} من {meta.total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="xs" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <i className="ti ti-chevron-right" />
                </Button>
                {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-xs ${p === page ? 'btn-p' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <Button size="xs" disabled={page >= meta.last_page} onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}>
                  <i className="ti ti-chevron-left" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <PaymentMethodModal
        open={modal.open}
        record={editing}
        treasuryAccounts={treasuryAccounts ?? []}
        onClose={modal.closeModal}
      />

      <ConfirmDeleteModal
        open={deleteModal.open}
        onClose={deleteModal.closeModal}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// =============== Confirm Delete Modal ===============
function ConfirmDeleteModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" title="تأكيد الحذف">
      <div style={{ textAlign: 'center', padding: 16 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: 'var(--red)' }} />
        <div style={{ fontWeight: 800, fontSize: 15, margin: '12px 0 6px' }}>هل أنت متأكد؟</div>
        <div style={{ fontSize: 13, color: 'var(--t4)' }}>لن تتمكن من استعادة طريقة الدفع بعد الحذف.</div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 0 0' }}>
        <Button onClick={onClose} disabled={loading}>إلغاء</Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading} icon={loading ? <i className="ti ti-loader" /> : <i className="ti ti-trash" />}>
          {loading ? 'جاري الحذف...' : 'حذف'}
        </Button>
      </div>
    </Modal>
  );
}

// =============== Add/Edit Modal ===============
function PaymentMethodModal({
  open, record, treasuryAccounts, onClose,
}: {
  open: boolean; record: PaymentMethod | null; treasuryAccounts: TreasuryAccount[]; onClose: () => void;
}) {
  const isEdit = !!record;
  const qc = useQueryClient();

  const emptyForm = {
    name: '',
    code: '',
    description: '',
    treasury_account_id: '' as string | number,
    requires_reference: false,
    is_cash: false,
    active: true,
    display_order: 0,
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      if (record) {
        setForm({
          name: record.name || '',
          code: record.code || '',
          description: record.description || '',
          treasury_account_id: record.treasury_account_id ?? '',
          requires_reference: record.requires_reference || false,
          is_cash: record.is_cash || false,
          active: record.active ?? true,
          display_order: record.display_order || 0,
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setServerError('');
    }
  }, [open, record]);

  const set = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'الاسم مطلوب';
    if (!form.code.trim()) errs.code = 'الكود مطلوب';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = {
        ...data,
        treasury_account_id: data.treasury_account_id ? parseInt(String(data.treasury_account_id)) : null,
      };
      return isEdit
        ? paymentMethodsApi.update(record!.id, payload)
        : paymentMethodsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-modes'] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data;
      if (msg?.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(msg.errors)) {
          fieldErrors[k] = (v as string[])[0];
        }
        setErrors(fieldErrors);
      } else {
        setServerError(msg?.message || 'فشل الحفظ');
      }
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    saveMutation.mutate(form);
  };

  return (
    <Modal
      open={open} onClose={onClose} size="md"
      title={isEdit ? 'تعديل طريقة الدفع' : 'طريقة دفع جديدة'}
      footer={
        <>
          <Button onClick={onClose} disabled={saveMutation.isPending}>إلغاء</Button>
          <Button variant="primary" icon={<i className="ti ti-device-floppy" />} onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      {serverError && <AlertBar variant="red">{serverError}</AlertBar>}

      <div className="fgrid c2" style={{ gap: 14 }}>
        <div className="fg s2">
          <label className="req">الاسم</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: نقداً" />
          {errors.name && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.name}</span>}
        </div>
        <div className="fg">
          <label className="req">الكود</label>
          <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="cash, cib, check" style={{ fontFamily: 'monospace' }} />
          {errors.code && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.code}</span>}
        </div>
        <div className="fg">
          <label>الحساب المالي الافتراضي</label>
          <select value={form.treasury_account_id} onChange={e => set('treasury_account_id', e.target.value)}>
            <option value="">— اختياري —</option>
            {treasuryAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>ترتيب العرض</label>
          <input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
        </div>
        <div className="fg">
          <label>نقدي</label>
          <Switch checked={form.is_cash} onChange={v => set('is_cash', v)} />
          <span style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>
            {form.is_cash ? 'سيظهر كدفع نقدي' : ''}
          </span>
        </div>
        <div className="fg">
          <label>يتطلب مرجع (رقم شيك، معرف تحويل...)</label>
          <Switch checked={form.requires_reference} onChange={v => set('requires_reference', v)} />
        </div>
        <div className="fg">
          <label>نشط</label>
          <Switch checked={form.active} onChange={v => set('active', v)} />
        </div>
        <div className="fg s2">
          <label>وصف</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف اختياري..." rows={2} />
        </div>
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pages/settings/SettingsPage.tsx
```
// pages/settings/SettingsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader  from '@/components/ui/PageHeader';
import Card        from '@/components/ui/Card';
import Button      from '@/components/ui/Button';
import Switch      from '@/components/ui/Switch';
import apiClient   from '@/lib/api/client';
import type { Setting } from '@/types';

// ── Tab definitions ───────────────────────────────
const TABS = [
  { id: 'company',   label: 'المؤسسة',         icon: 'ti-building'          },
  { id: 'fiscal',    label: 'الجبائي والضرائب', icon: 'ti-calculator'        },
  { id: 'docs',      label: 'المستندات',         icon: 'ti-file-description'  },
  { id: 'numbering', label: 'الترقيم',           icon: 'ti-list-numbers'      },
  { id: 'print',     label: 'الطباعة',           icon: 'ti-printer'           },
  { id: 'backup',    label: 'البيانات',           icon: 'ti-database'          },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <div className="page on" id="p-settings">
      <PageHeader title="الإعدادات" subtitle="إعدادات النظام والمؤسسة" />

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--b2)', marginBottom: 18, overflowX: 'auto' }}>
        {TABS.map(t => (
          <div
            key={t.id}
            className={`stab ${activeTab === t.id ? 'on' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="ic ic-xs"><i className={`ti ${t.icon}`}/></span>
            {t.label}
          </div>
        ))}
      </div>

      {/* Panels */}
      {activeTab === 'company'   && <CompanyPanel   />}
      {activeTab === 'fiscal'    && <FiscalPanel    />}
      {activeTab === 'docs'      && <DocsPanel      />}
      {activeTab === 'numbering' && <NumberingPanel />}
      {activeTab === 'print'     && <PrintPanel     />}
      {activeTab === 'backup'    && <BackupPanel    />}
    </div>
  );
}

// ── Save button with feedback ─────────────────────
function SaveBtn({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  const [saved, setSaved] = useState(false);

  const handle = async () => {
    await onClick();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Button variant="primary" icon={saved ? <i className="ti ti-check"/> : <i className="ti ti-device-floppy"/>}
      onClick={handle} disabled={loading}
      style={saved ? { background: 'var(--em)' } : {}}>
      {saved ? 'تم الحفظ!' : loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
    </Button>
  );
}

// ── Company Panel ─────────────────────────────────
function CompanyPanel() {
  const [form, setForm] = useState({
    name:      'مؤسسة النور للتجارة العامة',
    legal:     'EURL',
    sector:    'تجارة التجزئة',
    address:   'حي النصر، طريق غرداية، ورقلة 30000',
    phone1:    '029 71 23 45',
    phone2:    '',
    fax:       '029 71 23 46',
    email:     'info@alnour-dz.com',
    website:   '',
    nif:       '001234567890123',
    nis:       '245103002000012',
    ai:        '29202400012',
    rc:        '29/00-0012345B05',
    rib:       '',
    bank:      'BNA — بنك الجزائر',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="g65">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card title={<><span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-building"/></span> البيانات الرسمية للمؤسسة</>}>
          <div className="fgrid c3" style={{ gap: 12 }}>
            <div className="fg s3">
              <label className="req">اسم المؤسسة / الشركة</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="fg">
              <label>الشكل القانوني</label>
              <select value={form.legal} onChange={e => set('legal', e.target.value)}>
                {['SARL', 'EURL', 'SPA', 'SNC', 'Entreprise individuelle', 'Auto-entrepreneur'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>قطاع النشاط</label>
              <select value={form.sector} onChange={e => set('sector', e.target.value)}>
                {['تجارة التجزئة', 'تجارة الجملة', 'الصناعة والتصنيع', 'الخدمات', 'البناء والأشغال', 'الفلاحة', 'النقل'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="fg s3">
              <label>العنوان الكامل</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="fg"><label>الهاتف 1</label><input value={form.phone1} onChange={e => set('phone1', e.target.value)} /></div>
            <div className="fg"><label>الهاتف 2</label><input value={form.phone2} onChange={e => set('phone2', e.target.value)} placeholder="اختياري" /></div>
            <div className="fg"><label>الفاكس</label><input value={form.fax} onChange={e => set('fax', e.target.value)} /></div>
            <div className="fg"><label>البريد الإلكتروني</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="fg"><label>الموقع الإلكتروني</label><input value={form.website} onChange={e => set('website', e.target.value)} placeholder="www.example.com" /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <SaveBtn onClick={() => {}} />
          </div>
        </Card>

        <Card title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-id-badge"/></span> المعرّفات الجبائية والتجارية</>}
          subtitle="مطابقة للقانون الجبائي الجزائري">
          <div className="fgrid c3" style={{ gap: 12 }}>
            {[
              { key: 'nif', label: 'NIF — رقم التعريف الجبائي', hint: '15 خانة رقمية', maxLen: 15 },
              { key: 'nis', label: 'NIS — الرقم الإحصائي',       hint: 'مركز الإحصاء الوطني', maxLen: 15 },
              { key: 'ai',  label: 'AI — رقم المادة الجبائية',   hint: 'مديرية الضرائب' },
            ].map(({ key, label, hint, maxLen }) => (
              <div className="fg" key={key}>
                <label className="req">{label}</label>
                <input
                  value={(form as Record<string, string>)[key]}
                  onChange={e => set(key, e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                  maxLength={maxLen}
                />
                <span style={{ fontSize: 10, color: 'var(--t4)' }}>{hint}</span>
              </div>
            ))}
            <div className="fg s2">
              <label className="req">RC — السجل التجاري</label>
              <input value={form.rc} onChange={e => set('rc', e.target.value)} style={{ fontFamily: 'monospace' }} />
              <span style={{ fontSize: 10, color: 'var(--t4)' }}>المركز الوطني للسجل التجاري CNRC</span>
            </div>
            <div className="fg">
              <label>البنك الرئيسي</label>
              <select value={form.bank} onChange={e => set('bank', e.target.value)}>
                {['BNA', 'BEA', 'CPA', 'BADR', 'BDL', 'CNEP', 'AGB', 'ABC', 'Société Générale'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="fg s3">
              <label>رقم الحساب البنكي RIB/IBAN</label>
              <input value={form.rib} onChange={e => set('rib', e.target.value)} placeholder="00799999000XXXXXXXX00" style={{ fontFamily: 'monospace' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <SaveBtn onClick={() => {}} />
          </div>
        </Card>
      </div>

      {/* Right column — Logo & preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card title={<><span className="ic ic-sm" style={{ color: 'var(--purple)' }}><i className="ti ti-photo"/></span> الشعار والهوية</>}>
          <div style={{ border: '2px dashed var(--b3)', borderRadius: 'var(--r3)', padding: 24, textAlign: 'center', cursor: 'pointer', transition: '.2s', marginBottom: 12 }}
            onClick={() => document.getElementById('logo-upload')?.click()}>
            <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 8 }}><i className="ti ti-photo"/></div>
            <div style={{ fontSize: 13, color: 'var(--t4)', fontWeight: 600 }}>اضغط لرفع الشعار</div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>PNG, SVG — 400×400 بكسل</div>
            <input id="logo-upload" type="file" accept="image/*" style={{ display: 'none' }} />
          </div>
          <Button size="sm" fullWidth icon={<i className="ti ti-upload"/>}>رفع الشعار</Button>
        </Card>

        <Card title="معاينة رأس الفاتورة" noHeader={false}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, fontFamily: 'serif' }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#0a8a5c', marginBottom: 4 }}>{form.name}</div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              <div style={{ fontFamily: 'monospace' }}>NIF: {form.nif} | RC: {form.rc}</div>
              <div>{form.address}</div>
              <div>{form.phone1}{form.phone2 ? ` — ${form.phone2}` : ''}</div>
              {form.email && <div>{form.email}</div>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Fiscal Panel ──────────────────────────────────
function FiscalPanel() {
  const [priceMode, setPriceMode] = useState<'ht' | 'ttc'>('ttc');
  const [fiscalStamp, setFiscalStamp] = useState(true);
  const [autoG50, setAutoG50] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--gold)' }}><i className="ti ti-calculator"/></span> إعدادات TVA والأسعار</>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Price mode */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 8 }}>
              وضع الأسعار الافتراضي
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="price-ht"
                className={`btn ${priceMode === 'ht' ? 'btn-p' : ''}`}
                onClick={() => setPriceMode('ht')}
              >
                HT — بدون TVA
              </button>
              <button
                id="price-ttc"
                className={`btn ${priceMode === 'ttc' ? 'btn-p' : ''}`}
                onClick={() => setPriceMode('ttc')}
              >
                TTC — شامل TVA
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 6 }}>
              يؤثر على طريقة إدخال وعرض الأسعار في جميع الصفحات
            </div>
          </div>

          {/* Fiscal stamp toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>الطابع الجبائي (Timbre Fiscal)</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>تطبيق تلقائي وفق LF 2024 — 1% فوق 30,000 دج</div>
            </div>
            <Switch checked={fiscalStamp} onChange={setFiscalStamp} />
          </div>

          {/* Auto G50 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>الإقرار التلقائي G50</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>حساب TVA الشهري تلقائياً وتنبيه قبل الاستحقاق</div>
            </div>
            <Switch checked={autoG50} onChange={setAutoG50} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <SaveBtn onClick={() => {}} />
        </div>
      </Card>

      {/* TVA rates table */}
      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-percentage"/></span> معدلات TVA المطبّقة</>}>
        <div className="tw">
          <table>
            <thead><tr><th>الاسم</th><th>المعدل</th><th>الوضع الافتراضي</th><th>الحالة</th></tr></thead>
            <tbody>
              {[{ name: 'TVA 19%', rate: '19%', isDefault: true, active: true },
                { name: 'TVA 9%',  rate: '9%',  isDefault: false, active: true },
                { name: 'TVA 0%',  rate: '0%',  isDefault: false, active: true }].map(t => (
                <tr key={t.name}>
                  <td className="s">{t.name}</td>
                  <td className="m">{t.rate}</td>
                  <td>{t.isDefault ? <span style={{ color: 'var(--em)', fontSize: 13 }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                  <td><span className="bx be">نشط</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Docs Panel ────────────────────────────────────
function DocsPanel() {
  return (
    <Card title={<><span className="ic ic-sm" style={{ color: 'var(--purple)' }}><i className="ti ti-file-description"/></span> أسماء ونماذج المستندات</>}>
      <div className="fgrid c2" style={{ gap: 12 }}>
        {[
          { label: 'فاتورة البيع',       code: 'FAC', id: 'doc-s1' },
          { label: 'عرض السعر',          code: 'DEV', id: 'doc-s2' },
          { label: 'وصل التسليم BL',     code: 'BL',  id: 'doc-s3' },
          { label: 'طلب شراء',           code: 'BC',  id: 'doc-s4' },
          { label: 'إشعار الإرجاع',      code: 'AV',  id: 'doc-s5' },
        ].map(({ label, code, id }) => (
          <div className="fg" key={id}>
            <label>{label} <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--t4)' }}>({code})</span></label>
            <input id={id} defaultValue={label} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <SaveBtn onClick={() => {}} />
      </div>
    </Card>
  );
}

// ── Numbering Panel ───────────────────────────────
function NumberingPanel() {
  return (
    <Card title={<><span className="ic ic-sm" style={{ color: 'var(--teal)' }}><i className="ti ti-list-numbers"/></span> سلاسل الترقيم التلقائي</>}>
      <div className="tw">
        <table>
          <thead><tr><th>المستند</th><th>البادئة</th><th>الصيغة</th><th>آخر رقم</th><th>السنة</th><th></th></tr></thead>
          <tbody>
            {[
              { doc: 'فاتورة البيع', prefix: 'INV', format: '{PREFIX}-{YYYY}-{NUMBER:6}', last: '342', year: '2024' },
              { doc: 'عرض السعر',   prefix: 'DEV', format: '{PREFIX}-{YYYY}-{NUMBER:6}', last: '28',  year: '2024' },
              { doc: 'وصل التسليم', prefix: 'BL',  format: '{PREFIX}-{YYYY}-{NUMBER:6}', last: '156', year: '2024' },
            ].map(r => (
              <tr key={r.doc}>
                <td className="s">{r.doc}</td>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>{r.prefix}</span></td>
                <td className="m" style={{ fontSize: 11 }}>{r.format}</td>
                <td className="m">{r.last}</td>
                <td className="m">{r.year}</td>
                <td><Button size="xs" icon={<i className="ti ti-pencil"/>} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Print Panel ───────────────────────────────────
function PrintPanel() {
  const [showLogo, setShowLogo] = useState(true);
  const [showStamp, setShowStamp] = useState(true);
  const [showSign, setShowSign]   = useState(true);
  const [paperSize, setPaperSize] = useState('A4');

  return (
    <Card title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-printer"/></span> خيارات الطباعة</>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'إظهار الشعار في المطبوعات',    checked: showLogo,   set: setShowLogo  },
          { label: 'إظهار خانة الختم والإمضاء',    checked: showStamp,  set: setShowStamp },
          { label: 'إظهار توقيع رقمي',              checked: showSign,   set: setShowSign  },
        ].map(({ label, checked, set }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
            <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>
            <Switch checked={checked} onChange={set} />
          </div>
        ))}
        <div className="fg">
          <label>حجم الورق</label>
          <select value={paperSize} onChange={e => setPaperSize(e.target.value)} style={{ width: 140 }}>
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="thermal">حراري 80mm</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <SaveBtn onClick={() => {}} />
      </div>
    </Card>
  );
}

// ── Backup Panel ──────────────────────────────────
function BackupPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-database-export"/></span> النسخ الاحتياطي</>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'تصدير قاعدة البيانات كاملة',   icon: 'ti-database', variant: 'primary' as const },
            { label: 'تصدير المنتجات (Excel)',        icon: 'ti-table',    variant: 'default' as const },
            { label: 'تصدير الفواتير (Excel/PDF)',   icon: 'ti-file-zip', variant: 'default' as const },
            { label: 'تصدير العملاء والموردين',      icon: 'ti-users',    variant: 'default' as const },
          ].map(({ label, icon, variant }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 'var(--r2)', border: '1px solid var(--b2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ic ic-sm" style={{ color: 'var(--t3)' }}><i className={`ti ${icon}`}/></span>
                <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>
              </div>
              <Button size="xs" variant={variant} icon={<i className="ti ti-download"/>}>تصدير</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--gold)' }}><i className="ti ti-database-import"/></span> استيراد البيانات</>}>
        <div style={{ border: '2px dashed var(--b3)', borderRadius: 'var(--r3)', padding: 32, textAlign: 'center', cursor: 'pointer' }}>
          <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 8 }}><i className="ti ti-cloud-upload"/></div>
          <div style={{ fontSize: 13, color: 'var(--t4)', fontWeight: 600 }}>اسحب ملف Excel أو اضغط لاستيراد</div>
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>xlsx, csv</div>
        </div>
      </Card>
    </div>
  );
}
```

## FILE: resources/js/pages/setup/SetupWizard.tsx
```
// pages/setup/SetupWizard.tsx
// ════════════════════════════════════════════════
// معالج الإعداد الأولي للمؤسسة — 4 خطوات
// ════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import apiClient from '@/lib/api/client';

// ── Types ──────────────────────────────────────────
interface CompanyForm {
  name: string; legal_form: string; sector: string;
  address: string; wilaya_id: string; phone1: string;
  phone2: string; email: string; website: string;
}

interface TaxForm {
  nif: string; nis: string; ai: string;
  rc: string; bank: string; rib: string;
}

interface FiscalForm {
  name: string; start_date: string; end_date: string;
}

// ── Constants ──────────────────────────────────────
const LEGAL_FORMS = ['SARL', 'EURL', 'SPA', 'SNC', 'Entreprise individuelle', 'Auto-entrepreneur'];
const SECTORS = [
  'تجارة التجزئة', 'تجارة الجملة', 'الصناعة والتصنيع',
  'الخدمات', 'البناء والأشغال', 'الفلاحة', 'النقل', 'الصحة والصيدلة',
];
const BANKS = [
  'BNA', 'BEA', 'CPA', 'BADR', 'BDL', 'CNEP',
  'AGB', 'ABC', 'Société Générale Algérie', 'Al Salam Bank',
];
const WILAYAS = [
  { id:1,name:'أدرار' },{ id:2,name:'الشلف' },{ id:3,name:'الأغواط' },
  { id:4,name:'أم البواقي' },{ id:5,name:'باتنة' },{ id:6,name:'بجاية' },
  { id:7,name:'بسكرة' },{ id:8,name:'بشار' },{ id:9,name:'البليدة' },
  { id:10,name:'البويرة' },{ id:11,name:'تمنراست' },{ id:12,name:'تبسة' },
  { id:13,name:'تلمسان' },{ id:14,name:'تيارت' },{ id:15,name:'تيزي وزو' },
  { id:16,name:'الجزائر' },{ id:17,name:'الجلفة' },{ id:18,name:'جيجل' },
  { id:19,name:'سطيف' },{ id:20,name:'سعيدة' },{ id:21,name:'سكيكدة' },
  { id:22,name:'سيدي بلعباس' },{ id:23,name:'عنابة' },{ id:24,name:'قالمة' },
  { id:25,name:'قسنطينة' },{ id:26,name:'المدية' },{ id:27,name:'مستغانم' },
  { id:28,name:'المسيلة' },{ id:29,name:'معسكر' },{ id:30,name:'ورقلة' },
  { id:31,name:'وهران' },{ id:32,name:'البيض' },{ id:33,name:'إليزي' },
  { id:34,name:'برج بوعريريج' },{ id:35,name:'بومرداس' },{ id:36,name:'الطارف' },
  { id:37,name:'تندوف' },{ id:38,name:'تيسمسيلت' },{ id:39,name:'الوادي' },
  { id:40,name:'خنشلة' },{ id:41,name:'سوق أهراس' },{ id:42,name:'تيبازة' },
  { id:43,name:'ميلة' },{ id:44,name:'عين الدفلى' },{ id:45,name:'النعامة' },
  { id:46,name:'عين تموشنت' },{ id:47,name:'غرداية' },{ id:48,name:'غليزان' },
  { id:49,name:'تيميمون' },{ id:50,name:'برج باجي مختار' },{ id:51,name:'أولاد جلال' },
  { id:52,name:'بني عباس' },{ id:53,name:'عين صالح' },{ id:54,name:'عين قزام' },
  { id:55,name:'توقرت' },{ id:56,name:'جانت' },{ id:57,name:'المغير' },{ id:58,name:'المنيعة' },
];

const currentYear = new Date().getFullYear();

// ── Step indicator ────────────────────────────────
function StepBar({ step, total }: { step: number; total: number }) {
  const labels = ['معلومات المؤسسة', 'المعرّفات الجبائية', 'الشعار', 'السنة المالية'];
  const icons  = ['ti-building', 'ti-id-badge', 'ti-photo', 'ti-calendar'];

  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:0, marginBottom:36, position:'relative' }}>
      {/* connector bg */}
      <div style={{ position:'absolute', top:20, left:'10%', right:'10%', height:2, background:'var(--b2)', zIndex:0 }} />
      {/* connector fill */}
      <div style={{ position:'absolute', top:20, left:'10%', height:2, zIndex:1, width:`${((step-1)/(total-1))*80}%`, background:'var(--em)', transition:'width .5s ease' }} />

      {Array.from({ length: total }, (_, i) => {
        const done   = i + 1 < step;
        const active = i + 1 === step;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8, position:'relative', zIndex:2 }}>
            <div style={{
              width:40, height:40, borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:16, transition:'all .3s',
              background: done || active ? 'var(--em)' : 'var(--bg2)',
              border: `2px solid ${done || active ? 'var(--em)' : 'var(--b3)'}`,
              color: done || active ? '#fff' : 'var(--t4)',
              boxShadow: active ? 'var(--emglow)' : 'none',
            }}>
              {done
                ? <i className="ti ti-check" style={{ fontSize:16 }} />
                : <i className={`ti ${icons[i]}`} style={{ fontSize:16 }} />
              }
            </div>
            <span style={{ fontSize:11, fontWeight: active ? 700 : 400, whiteSpace:'nowrap', color: active ? 'var(--em)' : done ? 'var(--t2)' : 'var(--t4)' }}>
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Field helper ──────────────────────────────────
function Field({ label, required, hint, children, span = 1 }: {
  label: string; required?: boolean; hint?: string;
  children: React.ReactNode; span?: number;
}) {
  return (
    <div className="fg" style={{ gridColumn: `span ${span}` }}>
      <label style={{ display:'flex', gap:4, alignItems:'center', marginBottom:6, fontSize:12, fontWeight:600, color:'var(--t2)' }}>
        {label}
        {required && <span style={{ color:'var(--red)', fontSize:14 }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize:10, color:'var(--t4)', marginTop:3, display:'block' }}>{hint}</span>}
    </div>
  );
}

// ── Nav buttons ───────────────────────────────────
function NavBtns({ step, total, onPrev, onNext, onFinish, loading, canNext }: {
  step:number; total:number; onPrev:()=>void; onNext:()=>void; onFinish:()=>void;
  loading?:boolean; canNext?:boolean;
}) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:28, paddingTop:20, borderTop:'1px solid var(--b2)' }}>
      <button className="btn" onClick={onPrev} disabled={step===1} style={{ opacity:step===1 ? 0.3 : 1 }}>
        <i className="ti ti-arrow-right" /> السابق
      </button>
      <span style={{ fontSize:12, color:'var(--t4)' }}>{step} / {total}</span>
      {step < total ? (
        <button className="btn btn-p" onClick={onNext} disabled={canNext === false}>
          التالي <i className="ti ti-arrow-left" />
        </button>
      ) : (
        <button className="btn btn-p" onClick={onFinish} disabled={loading} style={{ minWidth:140 }}>
          {loading
            ? <><i className="ti ti-loader" style={{ animation:'spin 1s linear infinite' }} /> جاري الحفظ...</>
            : <><i className="ti ti-check" /> إنهاء الإعداد</>
          }
        </button>
      )}
    </div>
  );
}

// ════ STEP 1 — معلومات المؤسسة ════════════════════
function Step1({ form, onChange }: { form: CompanyForm; onChange: (k: keyof CompanyForm, v: string) => void }) {
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>معلومات المؤسسة</h3>
        <p style={{ fontSize:13, color:'var(--t3)' }}>أدخل البيانات الرسمية للمؤسسة كما هي مسجلة قانونياً</p>
      </div>
      <div className="fgrid c3" style={{ gap:14 }}>
        <Field label="اسم المؤسسة / الشركة" required span={3}>
          <input value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="مثال: مؤسسة النور للتجارة العامة" autoFocus />
        </Field>
        <Field label="الشكل القانوني" required>
          <select value={form.legal_form} onChange={e => onChange('legal_form', e.target.value)}>
            <option value="">— اختر —</option>
            {LEGAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="قطاع النشاط" required span={2}>
          <select value={form.sector} onChange={e => onChange('sector', e.target.value)}>
            <option value="">— اختر —</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="العنوان الكامل" required span={2}>
          <input value={form.address} onChange={e => onChange('address', e.target.value)} placeholder="الحي، الشارع، الرمز البريدي" />
        </Field>
        <Field label="الولاية" required>
          <select value={form.wilaya_id} onChange={e => onChange('wilaya_id', e.target.value)}>
            <option value="">— اختر الولاية —</option>
            {WILAYAS.map(w => (
              <option key={w.id} value={String(w.id)}>
                {String(w.id).padStart(2,'0')} — {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الهاتف الرئيسي" required>
          <input value={form.phone1} onChange={e => onChange('phone1', e.target.value)} placeholder="029 XX XX XX" dir="ltr" />
        </Field>
        <Field label="الهاتف الثاني" hint="اختياري">
          <input value={form.phone2} onChange={e => onChange('phone2', e.target.value)} placeholder="055 XX XX XX" dir="ltr" />
        </Field>
        <Field label="البريد الإلكتروني">
          <input type="email" value={form.email} onChange={e => onChange('email', e.target.value)} placeholder="info@company.dz" dir="ltr" />
        </Field>
      </div>
    </div>
  );
}

// ════ STEP 2 — المعرّفات الجبائية ═══════════════
function Step2({ form, onChange }: { form: TaxForm; onChange: (k: keyof TaxForm, v: string) => void }) {
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>المعرّفات الجبائية والتجارية</h3>
        <p style={{ fontSize:13, color:'var(--t3)' }}>هذه المعلومات إلزامية وتظهر على جميع الوثائق التجارية</p>
      </div>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start', background:'var(--blueb)', border:'1px solid var(--bluebo)', borderRadius:'var(--r2)', padding:'10px 14px', marginBottom:20 }}>
        <i className="ti ti-info-circle" style={{ color:'var(--blue)', fontSize:16, marginTop:1 }} />
        <span style={{ fontSize:12, color:'var(--t2)', lineHeight:1.6 }}>
          تأكد من صحة هذه الأرقام — تُستخدم في الفواتير الرسمية وتقارير TVA
        </span>
      </div>
      <div className="fgrid c3" style={{ gap:14 }}>
        <Field label="NIF — رقم التعريف الجبائي" hint="15 خانة رقمية" required>
          <input value={form.nif} onChange={e => onChange('nif', e.target.value)} maxLength={15} placeholder="001234567890123" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
        <Field label="NIS — الرقم الإحصائي" hint="مركز الإحصاء الوطني" required>
          <input value={form.nis} onChange={e => onChange('nis', e.target.value)} maxLength={15} placeholder="245103002000012" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
        <Field label="AI — رقم المادة الجبائية" hint="مديرية الضرائب">
          <input value={form.ai} onChange={e => onChange('ai', e.target.value)} placeholder="29202400012" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
        <Field label="RC — السجل التجاري" hint="المركز الوطني CNRC" required span={2}>
          <input value={form.rc} onChange={e => onChange('rc', e.target.value)} placeholder="29/00-0012345B05" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
        <div style={{ gridColumn:'span 3', borderTop:'1px dashed var(--b2)', paddingTop:16, marginTop:4 }} />
        <Field label="البنك الرئيسي" hint="اختياري">
          <select value={form.bank} onChange={e => onChange('bank', e.target.value)}>
            <option value="">— اختر البنك —</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="رقم الحساب البنكي RIB / IBAN" hint="اختياري" span={2}>
          <input value={form.rib} onChange={e => onChange('rib', e.target.value)} placeholder="00799999000XXXXXXXX00" style={{ fontFamily:'monospace', letterSpacing:1 }} dir="ltr" />
        </Field>
      </div>
    </div>
  );
}

// ════ STEP 3 — الشعار ════════════════════════════
function Step3({ logo, onLogo, companyName }: { logo: File | null; onLogo: (f: File | null) => void; companyName: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    onLogo(file);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>الشعار والهوية البصرية</h3>
        <p style={{ fontSize:13, color:'var(--t3)' }}>يظهر على الفواتير والوثائق — يمكن تعديله لاحقاً من الإعدادات</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => document.getElementById('logo-upload-wiz')?.click()}
            style={{
              border: `2px dashed ${dragging || preview ? 'var(--em)' : 'var(--b3)'}`,
              borderRadius:'var(--r3)', padding:32, textAlign:'center', cursor:'pointer',
              background: dragging ? 'var(--emb)' : 'var(--bg3)', transition:'all .2s',
              minHeight:180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
            }}
          >
            {preview ? (
              <>
                <img src={preview} alt="logo" style={{ maxHeight:100, maxWidth:'100%', objectFit:'contain', borderRadius:8 }} />
                <span style={{ fontSize:12, color:'var(--em)' }}><i className="ti ti-check" /> تم رفع الشعار</span>
              </>
            ) : (
              <>
                <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--emb)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="ti ti-photo" style={{ fontSize:24, color:'var(--em)' }} />
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--t2)' }}>اسحب الشعار هنا أو اضغط للاختيار</div>
                <div style={{ fontSize:11, color:'var(--t4)' }}>PNG, SVG, JPG — 400×400 بكسل</div>
              </>
            )}
          </div>
          <input id="logo-upload-wiz" type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {preview && (
            <button className="btn" style={{ marginTop:8, width:'100%', color:'var(--red)' }} onClick={() => { onLogo(null); setPreview(null); }}>
              <i className="ti ti-trash" /> إزالة الشعار
            </button>
          )}
          <p style={{ fontSize:11, color:'var(--t4)', textAlign:'center', marginTop:10 }}>يمكنك تخطي هذه الخطوة وإضافة الشعار لاحقاً</p>
        </div>
        {/* Preview */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--t3)', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>معاينة رأس الفاتورة</div>
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:20, fontFamily:'serif', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center', borderBottom:'2px solid #0a9268', paddingBottom:14, marginBottom:12 }}>
              {preview && <img src={preview} alt="" style={{ height:48, width:48, objectFit:'contain', borderRadius:6 }} />}
              <div>
                <div style={{ fontWeight:900, fontSize:15, color:'#0a8a5c' }}>{companyName || 'اسم المؤسسة'}</div>
                <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>Entreprise Algérienne</div>
              </div>
            </div>
            <div style={{ fontSize:10, color:'#64748b', lineHeight:1.8, fontFamily:'monospace' }}>
              <div>NIF: 001234567890123</div>
              <div>RC: 29/00-0012345B05</div>
            </div>
            <div style={{ marginTop:14, borderTop:'1px dashed #e2e8f0', paddingTop:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:700 }}>
                <span>فاتورة بيع</span>
                <span style={{ fontFamily:'monospace', color:'#0a9268' }}>FAC-{currentYear}-000001</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════ STEP 4 — السنة المالية ══════════════════════
function Step4({ form, onChange }: { form: FiscalForm; onChange: (k: keyof FiscalForm, v: string) => void }) {
  const duration = form.start_date && form.end_date ? (() => {
    const months = Math.round((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000*60*60*24*30));
    return `${months} شهراً تقريباً`;
  })() : '—';

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>السنة المالية الأولى</h3>
        <p style={{ fontSize:13, color:'var(--t3)' }}>تُعيَّن كسنة مالية نشطة تلقائياً — لا يمكن حذف الأولى</p>
      </div>
      <div style={{ background:'var(--goldb)', border:'1px solid var(--goldbo)', borderRadius:'var(--r2)', padding:'12px 16px', marginBottom:24, display:'flex', gap:12, alignItems:'flex-start' }}>
        <i className="ti ti-calendar-event" style={{ color:'var(--gold)', fontSize:18, marginTop:1 }} />
        <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.7 }}>
          <strong>معلومة:</strong> السنة المالية في الجزائر تبدأ عادةً في <strong>01 يناير</strong> وتنتهي في <strong>31 ديسمبر</strong>.
        </div>
      </div>
      <div className="fgrid c3" style={{ gap:14 }}>
        <Field label="اسم السنة المالية" required span={3}>
          <input value={form.name} onChange={e => onChange('name', e.target.value)} placeholder={`السنة المالية ${currentYear}`} style={{ maxWidth:320 }} />
        </Field>
        <Field label="تاريخ البداية" required>
          <input type="date" value={form.start_date} onChange={e => onChange('start_date', e.target.value)} />
        </Field>
        <Field label="تاريخ النهاية" required>
          <input type="date" value={form.end_date} onChange={e => onChange('end_date', e.target.value)} min={form.start_date} />
        </Field>
        <Field label="المدة">
          <div style={{ padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--b2)', borderRadius:'var(--r1)', fontSize:13, color:'var(--t3)' }}>
            {duration}
          </div>
        </Field>
      </div>
      {form.name && form.start_date && form.end_date && (
        <div style={{ marginTop:24, padding:'14px 18px', background:'var(--emb)', border:'1px solid var(--embo)', borderRadius:'var(--r2)', display:'flex', alignItems:'center', gap:12 }}>
          <i className="ti ti-circle-check" style={{ color:'var(--em)', fontSize:20 }} />
          <div style={{ fontSize:13, color:'var(--t1)' }}>
            سيتم إنشاء <strong>"{form.name}"</strong> من{' '}
            <strong>{new Date(form.start_date).toLocaleDateString('ar-DZ')}</strong> إلى{' '}
            <strong>{new Date(form.end_date).toLocaleDateString('ar-DZ')}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// MAIN WIZARD
// ════════════════════════════════════════════════
export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const [company, setCompany] = useState<CompanyForm>({
    name:'', legal_form:'EURL', sector:'', address:'',
    wilaya_id:'', phone1:'', phone2:'', email:'', website:'',
  });
  const [tax, setTax] = useState<TaxForm>({ nif:'', nis:'', ai:'', rc:'', bank:'', rib:'' });
  const [logo, setLogo] = useState<File | null>(null);
  const [fiscal, setFiscal] = useState<FiscalForm>({
    name: `السنة المالية ${currentYear}`,
    start_date: `${currentYear}-01-01`,
    end_date:   `${currentYear}-12-31`,
  });

  const setC = useCallback((k: keyof CompanyForm, v: string) => setCompany(f => ({ ...f, [k]: v })), []);
  const setT = useCallback((k: keyof TaxForm, v: string)     => setTax(f => ({ ...f, [k]: v })),     []);
  const setF = useCallback((k: keyof FiscalForm, v: string)  => setFiscal(f => ({ ...f, [k]: v })),  []);

  const canNext = (() => {
    if (step === 1) return !!(company.name && company.legal_form && company.sector && company.address && company.wilaya_id && company.phone1);
    if (step === 2) return !!(tax.nif && tax.nis && tax.rc);
    if (step === 3) return true; // شعار اختياري
    if (step === 4) return !!(fiscal.name && fiscal.start_date && fiscal.end_date);
    return true;
  })();

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      // 1. حفظ إعدادات الشركة
      const settings = [
        { key:'company.name',       group:'company', value:company.name },
        { key:'company.legal_form', group:'company', value:company.legal_form },
        { key:'company.sector',     group:'company', value:company.sector },
        { key:'company.address',    group:'company', value:company.address },
        { key:'company.wilaya_id',  group:'company', value:company.wilaya_id },
        { key:'company.phone1',     group:'company', value:company.phone1 },
        { key:'company.phone2',     group:'company', value:company.phone2 },
        { key:'company.email',      group:'company', value:company.email },
        { key:'company.website',    group:'company', value:company.website },
        { key:'company.nif',        group:'company', value:tax.nif },
        { key:'company.nis',        group:'company', value:tax.nis },
        { key:'company.ai',         group:'company', value:tax.ai },
        { key:'company.rc',         group:'company', value:tax.rc },
        { key:'company.bank',       group:'company', value:tax.bank },
        { key:'company.rib',        group:'company', value:tax.rib },
      ];

      // نحفظ الإعدادات بشكل تسلسلي لتجنب race conditions
      for (const s of settings.filter(x => x.value)) {
        await apiClient.post('/settings', s);
      }

      // 2. رفع الشعار (اختياري — لا يوقف الإعداد)
      if (logo) {
        try {
          const fd = new FormData();
          fd.append('file', logo);
          fd.append('type', 'company_logo');
          await apiClient.post('/attachments', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch { /* تجاهل خطأ الشعار */ }
      }

      // 3. إنشاء السنة المالية
      await apiClient.post('/fiscal-years', {
        name:       fiscal.name,
        start_date: fiscal.start_date,
        end_date:   fiscal.end_date,
      });

      // 4. الانتهاء
      onComplete();

    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; errors?: Record<string,string[]> } } })?.response?.data;
      if (msg?.errors) {
        const firstError = Object.values(msg.errors)[0]?.[0];
        setError(firstError || 'حدث خطأ أثناء الحفظ');
      } else {
        setError(msg?.message || 'حدث خطأ أثناء الحفظ. تحقق من الاتصال وأعد المحاولة.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg0)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px' }}>
      <div style={{ width:'100%', maxWidth:780 }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'var(--emb)', border:'1px solid var(--embo)', borderRadius:'var(--r4)', padding:'6px 18px', marginBottom:16 }}>
            <i className="ti ti-settings-2" style={{ color:'var(--em)', fontSize:16 }} />
            <span style={{ fontSize:12, fontWeight:700, color:'var(--em)', letterSpacing:0.5 }}>إعداد النظام</span>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:'var(--t1)', marginBottom:8 }}>
            مرحباً بك في نظام إدارة المبيعات
          </h1>
          <p style={{ fontSize:14, color:'var(--t3)', maxWidth:460, margin:'0 auto' }}>
            سنقوم معاً بإعداد النظام في دقائق قليلة — يمكنك تعديل أي معلومة لاحقاً
          </p>
        </div>

        {/* Card */}
        <div style={{ background:'var(--bg2)', borderRadius:'var(--r4)', border:'1px solid var(--b2)', padding:'32px 36px', boxShadow:'var(--shadow2)' }}>
          <StepBar step={step} total={4} />

          <div style={{ minHeight:360 }}>
            {step === 1 && <Step1 form={company} onChange={setC} />}
            {step === 2 && <Step2 form={tax}     onChange={setT} />}
            {step === 3 && <Step3 logo={logo} onLogo={setLogo} companyName={company.name} />}
            {step === 4 && <Step4 form={fiscal}  onChange={setF} />}
          </div>

          {error && (
            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:16, padding:'10px 14px', background:'var(--redb)', border:'1px solid var(--redbo)', borderRadius:'var(--r2)' }}>
              <i className="ti ti-alert-circle" style={{ color:'var(--red)', fontSize:16 }} />
              <span style={{ fontSize:13, color:'var(--red)' }}>{error}</span>
            </div>
          )}

          <NavBtns
            step={step} total={4}
            onPrev={() => setStep(s => Math.max(1, s-1))}
            onNext={() => { if (canNext) setStep(s => Math.min(4, s+1)); }}
            onFinish={handleFinish}
            loading={saving}
            canNext={canNext}
          />
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'var(--t4)', marginTop:20 }}>
          <i className="ti ti-lock" style={{ fontSize:12 }} /> بياناتك محفوظة محلياً وآمنة
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
```

## FILE: resources/js/pages/suppliers/SuppliersPage.tsx
```
// resources/js/pages/suppliers/SuppliersPage.tsx
import React, { useState, useEffect } from 'react';
import { useSuppliers, useCreateParty, useUpdateParty } from '@/hooks/useData';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import ProgressBar from '@/components/ui/ProgressBar';
import Switch from '@/components/ui/Switch';
import AlertBar from '@/components/ui/AlertBar';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import type { Party } from '@/types';

export default function SuppliersPage() {
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Party | null>(null);
    const modal = useModal();

    const { data, isLoading } = useSuppliers({ search: search || undefined, per_page: 30 });
    const suppliers = data?.data ?? [];
    const meta = data?.meta;

    const openCreate = () => { setEditing(null); modal.openModal(); };
    const openEdit = (c: Party) => { setEditing(c); modal.openModal(); };

    const withDebt = suppliers.filter((c: Party) => (c.balance ?? 0) > 0).length;
    const totalDebt = suppliers.reduce((s: number, c: Party) => s + (c.balance ?? 0), 0);
    const totalBusiness = suppliers.reduce((s: number, c: Party) => s + (c.total_purchases ?? 0), 0);

    return (
        <div className="page on" id="p-suppliers">
            <PageHeader
                title="الموردون"
                subtitle={`إدارة قائمة الموردين — ${meta?.total ?? '...'} مورد`}
                actions={
                    <>
                        <Button size="sm" icon={<i className="ti ti-table-export"/>}>تصدير</Button>
                        <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus"/>} onClick={openCreate}>
                            مورد جديد
                        </Button>
                    </>
                }
            />

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-users" label="إجمالي الموردين" value={meta?.total ?? '—'} />
                <KpiCard variant="blue" icon="ti-trending-up" label="إجمالي المشتريات" value={totalBusiness.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" />
                <KpiCard variant="red" icon="ti-receipt" label="ديون للموردين" value={totalDebt.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" sub={`${withDebt} مورد`} />
                <KpiCard variant="gold" icon="ti-star" label="موردون نشطون" value={suppliers.filter((s: Party) => s.active).length} />
            </div>

            {/* Search */}
            <div className="filters" style={{ marginBottom: 16 }}>
                <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
                    <input type="text" placeholder="ابحث بالاسم، الهاتف، NIF..." style={{ width: '100%' }} onChange={e => setSearch(e.target.value)} />
                </div>
                <select style={{ width: 140 }}>
                    <option>كل الأنواع</option>
                    <option>نشط</option>
                    <option>موقوف</option>
                </select>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
            ) : suppliers.length === 0 ? (
                <EmptyState icon="ti-truck" text="لا يوجد موردون" sub="أضف موردك الأول" action={<Button variant="primary" onClick={openCreate}>مورد جديد</Button>} />
            ) : (
                <div className="g3">
                    {suppliers.map((c: Party, i: number) => {
                        const hasDebt = (c.balance ?? 0) > 0;
                        const avatarColor = ((i % 7) + 1) as 1|2|3|4|5|6|7;
                        const creditUsed = c.credit_limit > 0 ? Math.min(100, ((c.balance ?? 0) / c.credit_limit) * 100) : 0;

                        return (
                            <Card key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                    <Avatar initials={c.name[0]} color={avatarColor} size={42} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 2 }}>{c.name}</div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                            <Badge variant={c.active ? 'success' : 'danger'}>{c.active ? 'نشط' : 'موقوف'}</Badge>
                                            {hasDebt && <Badge variant="danger">دين</Badge>}
                                        </div>
                                    </div>
                                </div>

                                {(c.phone || c.nif) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--t3)' }}>
                                        {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-phone" style={{ fontSize: 13, color: 'var(--t4)' }}/><span>{c.phone}</span></div>}
                                        {c.nif && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-file-certificate" style={{ fontSize: 13, color: 'var(--t4)' }}/><span style={{ fontFamily: 'monospace', fontSize: 11 }}>NIF: {c.nif}</span></div>}
                                    </div>
                                )}

                                {c.credit_limit > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t4)', marginBottom: 3 }}>
                                            <span>حد الائتمان</span>
                                            <span>{creditUsed.toFixed(0)}%</span>
                                        </div>
                                        <ProgressBar value={creditUsed} color={creditUsed > 80 ? 'var(--red)' : creditUsed > 50 ? 'var(--gold)' : 'var(--em)'} height={4} />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                                    <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEdit(c)}>تعديل</Button>
                                    <Button size="xs" icon={<i className="ti ti-file-invoice"/>}>فواتيره</Button>
                                    {hasDebt && <Button size="xs" variant="danger" icon={<i className="ti ti-cash"/>}>تسوية</Button>}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <SupplierModal open={modal.open} party={editing} onClose={modal.closeModal} />
        </div>
    );
}

// ===============================================
// Supplier Modal
// ===============================================
function SupplierModal({ open, party, onClose }: { open: boolean; party: Party | null; onClose: () => void }) {
    const isEdit = !!party;
    const createMut = useCreateParty();
    const updateMut = useUpdateParty();

    const emptyForm = {
        name: '',
        commercial_name: '',
        phone: '',
        mobile: '',
        email: '',
        address: '',
        nif: '',
        nis: '',
        rc: '',
        ai: '',
        credit_limit: 0,
        credit_days: 30,
        is_tva_exempt: false,
        active: true,
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            if (party) {
                setForm({
                    name: party.name || '',
                    commercial_name: party.commercial_name || '',
                    phone: party.phone || '',
                    mobile: party.mobile || '',
                    email: party.email || '',
                    address: party.address || '',
                    nif: party.nif || '',
                    nis: party.nis || '',
                    rc: party.rc || '',
                    ai: party.ai || '',
                    credit_limit: party.credit_limit || 0,
                    credit_days: party.credit_days || 30,
                    is_tva_exempt: party.is_tva_exempt || false,
                    active: party.active ?? true,
                });
            } else {
                setForm(emptyForm);
            }
            setError('');
        }
    }, [open, party]);

    const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!form.name.trim()) {
            setError('اسم المورد مطلوب');
            return;
        }

        try {
            if (isEdit) {
                await updateMut.mutateAsync({ id: party!.id, data: { ...form, party_type_id: 2 } });
            } else {
                await createMut.mutateAsync({ ...form, party_type_id: 2 });
            }
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'فشل الحفظ. تحقق من البيانات.');
        }
    };

    return (
        <Modal open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل — ${party?.name}` : 'مورد جديد'}
            subtitle={isEdit ? '' : 'إضافة مورد جديد'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>} onClick={handleSave}
                        disabled={createMut.isPending || updateMut.isPending || !form.name.trim()}>
                        {(createMut.isPending || updateMut.isPending) ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>

            {error && <AlertBar variant="red">{error}</AlertBar>}

            <div className="tabs" style={{ marginBottom: 16 }}>
                <div className="tab on">المعلومات الأساسية</div>
                <div className="tab">القانونية والمالية</div>
            </div>

            <div className="fgrid c3">
                <div className="fg s2">
                    <label className="req">الاسم الكامل / الشركة</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="الاسم واللقب أو اسم الشركة" autoFocus />
                </div>
                <div className="fg">
                    <label>الاسم التجاري</label>
                    <input value={form.commercial_name} onChange={e => set('commercial_name', e.target.value)} placeholder="اختياري" />
                </div>
                <div className="fg">
                    <label>الهاتف</label>
                    <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="029 xx xx xx" />
                </div>
                <div className="fg">
                    <label>الجوال</label>
                    <input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="0555 xx xx xx" />
                </div>
                <div className="fg">
                    <label>البريد الإلكتروني</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@fournisseur.dz" />
                </div>
                <div className="fg s3">
                    <label>العنوان</label>
                    <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="العنوان الكامل" />
                </div>
                <div className="fg">
                    <label>NIF</label>
                    <input value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="000000000000000" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>NIS</label>
                    <input value={form.nis} onChange={e => set('nis', e.target.value)} placeholder="رقم إحصائي" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>RC — السجل التجاري</label>
                    <input value={form.rc} onChange={e => set('rc', e.target.value)} placeholder="29/00-0012345B05" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>AI — المادة الجبائية</label>
                    <input value={form.ai} onChange={e => set('ai', e.target.value)} style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>حد الائتمان (دج)</label>
                    <input type="number" value={form.credit_limit} onChange={e => set('credit_limit', +e.target.value)} min={0} />
                </div>
                <div className="fg">
                    <label>أجل الدفع (يوم)</label>
                    <input type="number" value={form.credit_days} onChange={e => set('credit_days', +e.target.value)} min={0} />
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>معفى من TVA</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_tva_exempt} onChange={(v) => set('is_tva_exempt', v)} />
                        <span style={{ fontSize: 12, color: 'var(--t3)' }}>{form.is_tva_exempt ? 'نعم' : 'لا'}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
```

## FILE: resources/js/pages/users/EmployeesPage.tsx
```
// resources/js/pages/users/EmployeesPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import Switch from '@/components/ui/Switch';
import AlertBar from '@/components/ui/AlertBar';
import apiClient from '@/lib/api/client';
import type { Employee } from '@/types';

export default function EmployeesPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const modal = useModal();
    const qc = useQueryClient();

    const { data: employees, isLoading, error } = useQuery({
        queryKey: ['employees', search, statusFilter],
        queryFn: () => apiClient.get('/employees', {
            params: {
                search: search || undefined,
                employment_status: statusFilter || undefined
            }
        }).then(r => r.data.data),
    });

    const activeEmployees = employees?.filter((emp: any) => emp.employment_status === 'active') || [];
    const suspendedEmployees = employees?.filter((emp: any) => emp.employment_status === 'suspended') || [];
    const terminatedEmployees = employees?.filter((emp: any) => emp.employment_status === 'terminated') || [];

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/employees/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
    });

    const openAdd = () => { setEditingEmployee(null); modal.openModal(); };
    const openEdit = (emp: Employee) => { setEditingEmployee(emp); modal.openModal(); };

    return (
        <div className="page on" id="p-employees">
            <PageHeader
                title="الموظفون"
                subtitle={`إدارة بيانات الموظفين — ${employees?.length || 0} موظف`}
                actions={
                    <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus"/>} onClick={openAdd}>
                        موظف جديد
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-users" label="إجمالي الموظفين" value={employees?.length || 0} />
                <KpiCard variant="blue" icon="ti-user-check" label="نشطون" value={activeEmployees.length} />
                <KpiCard variant="gold" icon="ti-user-pause" label="معلقون" value={suspendedEmployees.length} />
                <KpiCard variant="red" icon="ti-user-off" label="منتهي خدمتهم" value={terminatedEmployees.length} />
            </div>

            {/* Filters */}
            <div className="filters" style={{ marginBottom: 16 }}>
                <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
                    <input type="text" placeholder="ابحث باسم الموظف أو رقم التسجيل..." style={{ width: '100%' }}
                        onChange={e => setSearch(e.target.value)} />
                </div>
                <select style={{ width: 160 }} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">كل الحالات</option>
                    <option value="active">نشط</option>
                    <option value="suspended">معلق</option>
                    <option value="terminated">منتهي الخدمة</option>
                </select>
            </div>

            {/* Error */}
            {error && (
                <AlertBar variant="red">
                    فشل جلب بيانات الموظفين. تأكد من اتصالك بالخادم.
                </AlertBar>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
            ) : !employees || employees.length === 0 ? (
                <EmptyState icon="ti-users" text="لا يوجد موظفون" sub="أضف أول موظف" action={<Button variant="primary" onClick={openAdd}>موظف جديد</Button>} />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>الموظف</th>
                                    <th>رقم التسجيل</th>
                                    <th>NSS</th>
                                    <th>تاريخ الميلاد</th>
                                    <th>تاريخ التوظيف</th>
                                    <th>الحالة الوظيفية</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp: any, i: number) => (
                                    <tr key={emp.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Avatar
                                                    initials={`${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`}
                                                    color={((i % 7) + 1) as 1|2|3|4|5|6|7}
                                                    size={32}
                                                />
                                                <div>
                                                    <div className="s">{emp.first_name} {emp.last_name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                                                        {emp.relations?.user?.email || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="m">{emp.matricule || '—'}</td>
                                        <td className="m" style={{ fontSize: 11 }}>{emp.nss || '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--t4)' }}>
                                            {emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('fr-DZ') : '—'}
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--t4)' }}>
                                            {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('fr-DZ') : '—'}
                                        </td>
                                        <td>
                                            <Badge variant={
                                                emp.employment_status === 'active' ? 'success' :
                                                emp.employment_status === 'suspended' ? 'warning' : 'danger'
                                            }>
                                                {emp.employment_status === 'active' ? 'نشط' :
                                                 emp.employment_status === 'suspended' ? 'معلق' : 'منتهي الخدمة'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEdit(emp)}/>
                                                <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={() => deleteMutation.mutate(emp.id)}/>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <EmployeeModal open={modal.open} employee={editingEmployee} onClose={modal.closeModal} />
        </div>
    );
}

// ===============================================
// Employee Modal
// ===============================================
function EmployeeModal({ open, employee, onClose }: {
    open: boolean;
    employee: Employee | null;
    onClose: () => void;
}) {
    const isEdit = !!employee;
    const qc = useQueryClient();

    const emptyForm = {
        first_name: '',
        last_name: '',
        matricule: '',
        nss: '',
        birth_date: '',
        gender_id: '',
        rib: '',
        bank_name: '',
        hire_date: new Date().toISOString().split('T')[0],
        termination_date: '',
        employment_status: 'active',
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    // Fetch genders
    const { data: genders } = useQuery({
        queryKey: ['genders'],
        queryFn: () => apiClient.get('/genders').then(r => r.data.data),
        staleTime: 10 * 60_000,
        enabled: open,
    });

    // إعادة تعيين النموذج
    useEffect(() => {
        if (open) {
            if (employee) {
                const emp = employee as any;
                setForm({
                    first_name: emp.first_name || '',
                    last_name: emp.last_name || '',
                    matricule: emp.matricule || '',
                    nss: emp.nss || '',
                    birth_date: emp.birth_date ? emp.birth_date.split('T')[0] : '',
                    gender_id: emp.gender_id || '',
                    rib: emp.rib || '',
                    bank_name: emp.bank_name || '',
                    hire_date: emp.hire_date ? emp.hire_date.split('T')[0] : '',
                    termination_date: emp.termination_date ? emp.termination_date.split('T')[0] : '',
                    employment_status: emp.employment_status || 'active',
                });
            } else {
                setForm(emptyForm);
            }
            setError('');
        }
    }, [open, employee]);

    const set = (k: string, v: string) => {
        setForm(f => ({ ...f, [k]: v }));
        setError('');
    };

    // في EmployeesPage.tsx، داخل EmployeeModal، عدل saveMutation:

const saveMutation = useMutation({
    mutationFn: (data: typeof form) => {
        const payload: any = {
            first_name: data.first_name,
            last_name: data.last_name,
            matricule: data.matricule || null,
            nss: data.nss || null,
            birth_date: data.birth_date || null,
            gender_id: data.gender_id ? parseInt(data.gender_id) : null,
            rib: data.rib || null,
            bank_name: data.bank_name || null,
            hire_date: data.hire_date || null,
            termination_date: data.termination_date || null,
            employment_status: data.employment_status || 'active',
        };

        // ✅ لا نرسل created_by - الباك-إند يجب أن يتعامل معها تلقائياً
        if (isEdit) {
            return apiClient.put(`/employees/${employee!.id}`, payload);
        }
        return apiClient.post('/employees', payload);
    },
    onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['employees'] });
        onClose();
    },
    onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.response?.data?.error || 'فشل الحفظ. تحقق من البيانات.';
        // ✅ إذا كان الخطأ يتعلق بـ created_by، نعرض رسالة أوضح
        if (msg.includes('created_by')) {
            setError('خطأ في الخادم: تأكد من تسجيل الدخول بشكل صحيح.');
        } else {
            setError(msg);
        }
    },
});

    const handleSave = () => {
        if (!form.first_name.trim() || !form.last_name.trim()) {
            setError('الاسم واللقب مطلوبان');
            return;
        }
        saveMutation.mutate(form);
    };

    return (
        <Modal open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل — ${(employee as any)?.first_name} ${(employee as any)?.last_name}` : 'موظف جديد'}
            subtitle={isEdit ? '' : 'إضافة موظف جديد إلى النظام'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={handleSave}
                        disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>

            {error && <AlertBar variant="red">{error}</AlertBar>}

            <div className="fgrid c3">
                <div className="fg">
                    <label className="req">الاسم الأول</label>
                    <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="الاسم" autoFocus />
                </div>
                <div className="fg">
                    <label className="req">اللقب</label>
                    <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="اللقب" />
                </div>
                <div className="fg">
                    <label>رقم التسجيل</label>
                    <input value={form.matricule} onChange={e => set('matricule', e.target.value)} placeholder="MAT-001" />
                </div>
                <div className="fg">
                    <label>NSS</label>
                    <input value={form.nss} onChange={e => set('nss', e.target.value)} placeholder="رقم الضمان الاجتماعي" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>تاريخ الميلاد</label>
                    <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                </div>
                <div className="fg">
                    <label>الجنس</label>
                    <select value={form.gender_id} onChange={e => set('gender_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {genders?.map((g: any) => (
                            <option key={g.id} value={g.id}>{g.label || g.name}</option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>تاريخ التوظيف</label>
                    <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
                </div>
                <div className="fg">
                    <label>تاريخ إنهاء الخدمة</label>
                    <input type="date" value={form.termination_date} onChange={e => set('termination_date', e.target.value)} />
                </div>
                <div className="fg">
                    <label>الحالة الوظيفية</label>
                    <select value={form.employment_status} onChange={e => set('employment_status', e.target.value)}>
                        <option value="active">نشط</option>
                        <option value="suspended">معلق</option>
                        <option value="terminated">منتهي الخدمة</option>
                    </select>
                </div>
                <div className="fg">
                    <label>اسم البنك</label>
                    <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="BNA" />
                </div>
                <div className="fg">
                    <label>RIB</label>
                    <input value={form.rib} onChange={e => set('rib', e.target.value)} placeholder="00799999000XXXXXXXX00" style={{ fontFamily: 'monospace' }} />
                </div>
            </div>
        </Modal>
    );
}
```

## FILE: resources/js/pages/users/RolesPage.tsx
```
// ════════════════════════════════════════════════════════════
// resources/js/pages/users/RolesPage.tsx
// عرض الأدوار والصلاحيات المرتبطة بها
// ════════════════════════════════════════════════════════════
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AlertBar from '@/components/ui/AlertBar';
import EmptyState from '@/components/ui/EmptyState';

// ── Types ──────────────────────────────────────
interface Permission {
  id: number;
  name: string;
  display_name?: string;
  group?: string;
}

interface Role {
  id: number;
  name: string;
  display_name?: string;
  permissions?: Permission[];
}

// ── ألوان المجموعات ────────────────────────────
const GROUP_COLORS = [
  'var(--em)',
  'var(--blue)',
  'var(--purple)',
  'var(--gold)',
  'var(--teal)',
  'var(--orange)',
];

// ── تجميع الصلاحيات حسب group ──────────────────
function groupPermissions(permissions: Permission[]) {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const group = p.group || 'أخرى';
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});
}

// ── مكوّن الصفحة الرئيسي ───────────────────────
export default function RolesPage() {
  const { data: roles = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles', {
        params: { include: 'permissions', per_page: 100 },
      });
      const raw = res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
    staleTime: 60_000,
  });

  return (
    <div className="page on">
      <PageHeader
        title="الأدوار والصلاحيات"
        subtitle="الصلاحيات المرتبطة بكل دور في النظام"
      />

      {/* تحميل */}
      {isLoading && (
        <div className="empty">
          <div className="empty-ic">
            <i className="ti ti-loader" />
          </div>
          <div className="empty-tx">جارٍ تحميل الأدوار...</div>
        </div>
      )}

      {/* خطأ */}
      {isError && (
        <AlertBar variant="red">
          فشل تحميل الأدوار.{' '}
          <button
            onClick={() => refetch()}
            style={{
              fontWeight: 700,
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            إعادة المحاولة
          </button>
        </AlertBar>
      )}

      {/* لا توجد أدوار */}
      {!isLoading && roles.length === 0 && (
        <EmptyState
          icon="ti-shield"
          text="لا توجد أدوار"
          sub="لم يتم إنشاء أي دور بعد"
        />
      )}

      {/* عرض الأدوار */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
        {roles.map((role: Role) => {
          const groups = groupPermissions(role.permissions ?? []);
          const hasPermissions = Object.keys(groups).length > 0;

          return (
            <Card key={role.id} padding={18}>
              {/* رأس البطاقة */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <i
                  className="ti ti-shield"
                  style={{ fontSize: 20, color: 'var(--em)' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--t1)' }}>
                    {role.display_name || role.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: 'var(--t4)',
                    }}
                  >
                    ({role.name})
                  </div>
                </div>
              </div>

              {/* صلاحيات الدور */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--t4)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i
                  className="ti ti-lock-open"
                  style={{ color: 'var(--em)' }}
                />
                الصلاحيات المرتبطة
              </div>

              {hasPermissions ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(groups).map(([group, perms], gi) => (
                    <div
                      key={group}
                      style={{
                        background: 'var(--bg3)',
                        borderRadius: 'var(--r3)',
                        border: '1px solid var(--b1)',
                        padding: '12px 14px',
                        borderRight: `3px solid ${GROUP_COLORS[gi % GROUP_COLORS.length]}`,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: GROUP_COLORS[gi % GROUP_COLORS.length],
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <i className="ti ti-folders" />
                        {group}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {perms.map((p) => (
                          <span
                            key={p.id}
                            style={{
                              fontSize: 11,
                              padding: '3px 10px',
                              borderRadius: 20,
                              background: 'var(--bg4)',
                              color: 'var(--t2)',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              borderBottom: `2px solid ${GROUP_COLORS[gi % GROUP_COLORS.length]}`,
                            }}
                          >
                            <i
                              className="ti ti-check"
                              style={{
                                color: GROUP_COLORS[gi % GROUP_COLORS.length],
                                fontSize: 10,
                              }}
                            />
                            {p.display_name || p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    color: 'var(--t4)',
                    fontSize: 12,
                    padding: '8px 12px',
                    background: 'var(--bg3)',
                    borderRadius: 'var(--r2)',
                  }}
                >
                  لا توجد صلاحيات مرتبطة بهذا الدور
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

## FILE: resources/js/pages/users/UsersPage.tsx
```
// resources/js/pages/users/UsersPage.tsx
// ════════════════════════════════════════════════
// إدارة المستخدمين + الأدوار + الصلاحيات — واجهة متكاملة
// ════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api/client";

// ─── Types ─────────────────────────────────────
interface Permission {
    id: number;
    name: string;
    display_name?: string;
    group?: string;
    description?: string;
}
interface Role {
    id: number;
    name: string;
    display_name?: string;
    description?: string;
    permissions?: Permission[];
    relations?: {
        permissions?: { id: number; name: string; display_name?: string }[];
    };
}
interface User {
    id: number;
    name: string;
    email: string;
    username?: string;
    phone?: string;
    job_title?: string;
    active: boolean;
    last_login_at?: string;
    created_at: string;
    roles?: Role[];
    permissions?: Permission[];
}

// ─── Helpers ────────────────────────────────────
const err2str = (e: unknown, fb = "حدث خطأ") =>
    (e as any)?.response?.data?.message ?? (e as any)?.message ?? fb;
const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("ar-DZ") : "—";
const fmtDT = (d?: string | null) =>
    d
        ? `${fmtDate(d)} ${new Date(d).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`
        : "—";

const AV_COLORS = [
    "linear-gradient(135deg,#0a8a5c,#0dbf84)",
    "linear-gradient(135deg,#1a4fd6,#60a5fa)",
    "linear-gradient(135deg,#6920d4,#a78bfa)",
    "linear-gradient(135deg,#b87d0a,#fbbf24)",
    "linear-gradient(135deg,#0d7a8c,#22d3ee)",
    "linear-gradient(135deg,#c43a0a,#fb923c)",
];
const avColor = (id: number) => AV_COLORS[id % AV_COLORS.length];

const GROUP_COLORS = [
    "#0a8a5c",
    "#1a4fd6",
    "#6920d4",
    "#b87d0a",
    "#0d7a8c",
    "#c43a0a",
];
const gColor = (i: number) => GROUP_COLORS[i % GROUP_COLORS.length];

function Avatar({
    name,
    id,
    size = 38,
}: {
    name: string;
    id: number;
    size?: number;
}) {
    const initials = name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: size * 0.28,
                flexShrink: 0,
                background: avColor(id),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size * 0.36,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: -1,
            }}
        >
            {initials}
        </div>
    );
}

function Badge({
    children,
    color = "var(--em)",
    bg = "var(--emb)",
}: {
    children: React.ReactNode;
    color?: string;
    bg?: string;
}) {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 9px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                color,
                background: bg,
                whiteSpace: "nowrap",
            }}
        >
            {children}
        </span>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return active ? (
        <Badge color="var(--em)" bg="var(--emb)">
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--em)",
                    display: "inline-block",
                }}
            />
            نشط
        </Badge>
    ) : (
        <Badge color="var(--red)" bg="var(--redb)">
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--red)",
                    display: "inline-block",
                }}
            />
            موقوف
        </Badge>
    );
}

// ─── Overlay / Modal ────────────────────────────
function Overlay({
    open,
    onClose,
    children,
    width = 600,
}: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: number;
}) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", h);
        return () => document.removeEventListener("keydown", h);
    }, [onClose]);
    if (!open) return null;
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 10001,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,.6)",
                backdropFilter: "blur(6px)",
                padding: 16,
                animation: "ovIn .18s ease",
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    background: "var(--bg2)",
                    borderRadius: 20,
                    width: "100%",
                    maxWidth: width,
                    border: "1px solid var(--b3)",
                    boxShadow: "0 24px 64px rgba(0,0,0,.3)",
                    maxHeight: "92vh",
                    display: "flex",
                    flexDirection: "column",
                    animation: "modalIn .22s cubic-bezier(.34,1.4,.64,1)",
                }}
            >
                {children}
            </div>
        </div>
    );
}

function MHead({
    title,
    sub,
    icon,
    onClose,
}: {
    title: string;
    sub?: string;
    icon?: string;
    onClose: () => void;
}) {
    return (
        <div
            style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--b2)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
            }}
        >
            {icon && (
                <div
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "var(--emb)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        color: "var(--em)",
                        flexShrink: 0,
                    }}
                >
                    <i className={`ti ${icon}`} />
                </div>
            )}
            <div style={{ flex: 1 }}>
                <div
                    style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "var(--t1)",
                    }}
                >
                    {title}
                </div>
                {sub && (
                    <div
                        style={{
                            fontSize: 11,
                            color: "var(--t4)",
                            marginTop: 1,
                        }}
                    >
                        {sub}
                    </div>
                )}
            </div>
            <button
                onClick={onClose}
                style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "1px solid var(--b2)",
                    background: "var(--bg3)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--t3)",
                    fontSize: 14,
                    flexShrink: 0,
                    transition: ".14s",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                        "var(--redb)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--red)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                        "var(--bg3)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--t3)";
                }}
            >
                <i className="ti ti-x" />
            </button>
        </div>
    );
}

function MBody({
    children,
    pad = 20,
}: {
    children: React.ReactNode;
    pad?: number;
}) {
    return (
        <div style={{ padding: pad, overflowY: "auto", flex: 1 }}>
            {children}
        </div>
    );
}

function MFoot({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--b2)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                background: "var(--bg3)",
                borderRadius: "0 0 20px 20px",
            }}
        >
            {children}
        </div>
    );
}

// ─── Button ─────────────────────────────────────
function Btn({
    children,
    onClick,
    variant = "default",
    size = "md",
    disabled,
    loading,
    icon,
    type = "button",
}: {
    children?: React.ReactNode;
    onClick?: () => void;
    variant?: "default" | "primary" | "danger" | "ghost";
    size?: "sm" | "md" | "xs";
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    type?: "button" | "submit";
}) {
    const styles: Record<string, React.CSSProperties> = {
        default: {
            background: "var(--bg3)",
            border: "1px solid var(--b3)",
            color: "var(--t2)",
        },
        primary: {
            background: "var(--em)",
            border: "1px solid var(--em)",
            color: "#fff",
            boxShadow: "var(--emglow)",
        },
        danger: {
            background: "var(--redb)",
            border: "1px solid var(--redbo)",
            color: "var(--red)",
        },
        ghost: {
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--t3)",
        },
    };
    const pads = { xs: "4px 10px", sm: "7px 14px", md: "9px 18px" };
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            style={{
                ...styles[variant],
                padding: pads[size],
                borderRadius: 10,
                fontSize: size === "xs" ? 11 : 13,
                fontWeight: 700,
                cursor: disabled || loading ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "Tajawal, sans-serif",
                transition: ".14s",
                whiteSpace: "nowrap",
            }}
        >
            {loading ? (
                <i
                    className="ti ti-loader"
                    style={{ animation: "spin .8s linear infinite" }}
                />
            ) : (
                icon
            )}
            {children}
        </button>
    );
}

// ─── Form Field ─────────────────────────────────
function Field({
    label,
    req,
    children,
}: {
    label: string;
    req?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--t4)",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                }}
            >
                {label}
                {req && (
                    <span style={{ color: "var(--red)", marginRight: 2 }}>
                        *
                    </span>
                )}
            </label>
            {children}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid var(--b3)",
    background: "var(--bg3)",
    color: "var(--t1)",
    fontFamily: "Tajawal, sans-serif",
    fontSize: 13,
    outline: "none",
    transition: ".14s",
};

// ─── Permissions Matrix ──────────────────────────
function PermMatrix({
    permissions,
    selected,
    onChange,
}: {
    permissions: Permission[];
    selected: number[];
    onChange: (ids: number[]) => void;
}) {
    const groups = permissions.reduce<Record<string, Permission[]>>(
        (acc, p) => {
            const g = p.group || "أخرى";
            if (!acc[g]) acc[g] = [];
            acc[g].push(p);
            return acc;
        },
        {},
    );

    const toggleOne = (id: number) =>
        onChange(
            selected.includes(id)
                ? selected.filter((i) => i !== id)
                : [...selected, id],
        );

    const toggleGroup = (perms: Permission[]) => {
        const ids = perms.map((p) => p.id);
        const allOn = ids.every((id) => selected.includes(id));
        if (allOn) onChange(selected.filter((id) => !ids.includes(id)));
        else onChange([...new Set([...selected, ...ids])]);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(groups).map(([group, perms], gi) => {
                const color = gColor(gi);
                const ids = perms.map((p) => p.id);
                const allOn = ids.every((id) => selected.includes(id));
                const someOn = ids.some((id) => selected.includes(id));
                return (
                    <div
                        key={group}
                        style={{
                            borderRadius: 12,
                            border: "1px solid var(--b2)",
                            overflow: "hidden",
                        }}
                    >
                        {/* Group header */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "9px 14px",
                                cursor: "pointer",
                                background: allOn ? `${color}15` : "var(--bg3)",
                                borderBottom: "1px solid var(--b1)",
                            }}
                            onClick={() => toggleGroup(perms)}
                        >
                            <div
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 5,
                                    border: `2px solid ${allOn ? color : someOn ? color : "var(--b3)"}`,
                                    background: allOn
                                        ? color
                                        : someOn
                                          ? `${color}40`
                                          : "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    transition: ".13s",
                                }}
                            >
                                {(allOn || someOn) && (
                                    <i
                                        className="ti ti-check"
                                        style={{
                                            fontSize: 10,
                                            color: allOn ? "#fff" : color,
                                        }}
                                    />
                                )}
                            </div>
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color,
                                    flex: 1,
                                }}
                            >
                                {group}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--t4)" }}>
                                {
                                    ids.filter((id) => selected.includes(id))
                                        .length
                                }
                                /{ids.length}
                            </span>
                        </div>
                        {/* Permissions */}
                        <div
                            style={{
                                padding: "10px 14px",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                background: "var(--bg2)",
                            }}
                        >
                            {perms.map((p) => {
                                const on = selected.includes(p.id);
                                return (
                                    <label
                                        key={p.id}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 5,
                                            padding: "4px 10px",
                                            borderRadius: 20,
                                            cursor: "pointer",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: on
                                                ? `${color}15`
                                                : "var(--bg4)",
                                            border: `1px solid ${on ? color + "50" : "transparent"}`,
                                            color: on ? color : "var(--t3)",
                                            transition: "all .13s",
                                            userSelect: "none",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={on}
                                            onChange={() => toggleOne(p.id)}
                                            style={{ display: "none" }}
                                        />
                                        <i
                                            className={`ti ti-${on ? "check" : "plus"}`}
                                            style={{ fontSize: 9 }}
                                        />
                                        {p.display_name ?? p.name}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ════════════════════════════════════════════════
// USER DETAIL MODAL
// ════════════════════════════════════════════════
function UserDetailModal({
    user,
    onClose,
    onEdit,
    slug,
}: {
    user: User | null;
    onClose: () => void;
    onEdit: (u: User) => void;
    slug: string;
}) {
    const qc = useQueryClient();
    const toggleActive = useMutation({
        mutationFn: () =>
            apiClient.post(`/${slug}/users/${user!.id}/toggle-active`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["users", slug] }),
    });

    if (!user) return null;
    const permissions = user.permissions ?? [];
    const groups = permissions.reduce<Record<string, Permission[]>>(
        (acc, p) => {
            const g = p.group ?? "عامة";
            if (!acc[g]) acc[g] = [];
            acc[g].push(p);
            return acc;
        },
        {},
    );

    return (
        <Overlay open onClose={onClose} width={580}>
            <MHead
                title={user.name}
                sub={user.job_title ?? user.email}
                icon="ti-user"
                onClose={onClose}
            />
            <MBody>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                    }}
                >
                    {/* Profile card */}
                    <div
                        style={{
                            display: "flex",
                            gap: 16,
                            alignItems: "center",
                            padding: "14px 16px",
                            borderRadius: 14,
                            background: user.active
                                ? "var(--emb)"
                                : "var(--redb)",
                            border: `1px solid ${user.active ? "var(--embo)" : "var(--redbo)"}`,
                        }}
                    >
                        <Avatar name={user.name} id={user.id} size={56} />
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 17,
                                    color: "var(--t1)",
                                    marginBottom: 3,
                                }}
                            >
                                {user.name}
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "var(--t4)",
                                    fontFamily: "monospace",
                                }}
                            >
                                {user.email}
                            </div>
                            {user.username && (
                                <div
                                    style={{ fontSize: 11, color: "var(--t4)" }}
                                >
                                    @{user.username}
                                </div>
                            )}
                            {user.phone && (
                                <div
                                    style={{ fontSize: 11, color: "var(--t4)" }}
                                >
                                    {user.phone}
                                </div>
                            )}
                        </div>
                        <StatusBadge active={user.active} />
                    </div>

                    {/* Meta grid */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                        }}
                    >
                        {[
                            {
                                label: "تاريخ التسجيل",
                                value: fmtDate(user.created_at),
                                icon: "ti-calendar",
                            },
                            {
                                label: "آخر دخول",
                                value: fmtDT(user.last_login_at),
                                icon: "ti-clock",
                            },
                        ].map((m) => (
                            <div
                                key={m.label}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    background: "var(--bg3)",
                                    border: "1px solid var(--b1)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                            >
                                <i
                                    className={`ti ${m.icon}`}
                                    style={{
                                        color: "var(--em)",
                                        fontSize: 16,
                                        flexShrink: 0,
                                    }}
                                />
                                <div>
                                    <div
                                        style={{
                                            fontSize: 10,
                                            color: "var(--t4)",
                                            marginBottom: 1,
                                        }}
                                    >
                                        {m.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: "var(--t1)",
                                        }}
                                    >
                                        {m.value}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Roles */}
                    {(user.roles?.length ?? 0) > 0 && (
                        <div>
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: "var(--t4)",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    marginBottom: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <i
                                    className="ti ti-shield"
                                    style={{ color: "var(--em)" }}
                                />
                                الأدوار
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                }}
                            >
                                {user.roles!.map((r) => (
                                    <div
                                        key={r.id}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: 20,
                                            background: "var(--emb)",
                                            border: "1px solid var(--embo)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <i
                                            className="ti ti-shield-half"
                                            style={{
                                                color: "var(--em)",
                                                fontSize: 12,
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: "var(--em)",
                                            }}
                                        >
                                            {r.display_name ?? r.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Permissions by group */}
                    {Object.keys(groups).length > 0 && (
                        <div>
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: "var(--t4)",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    marginBottom: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <i
                                    className="ti ti-lock-open"
                                    style={{ color: "var(--em)" }}
                                />
                                الصلاحيات ({permissions.length})
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                }}
                            >
                                {Object.entries(groups).map(
                                    ([grp, perms], gi) => (
                                        <div
                                            key={grp}
                                            style={{
                                                background: "var(--bg3)",
                                                borderRadius: 10,
                                                padding: "10px 12px",
                                                borderRight: `3px solid ${gColor(gi)}`,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    color: gColor(gi),
                                                    marginBottom: 7,
                                                }}
                                            >
                                                {grp}
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 5,
                                                }}
                                            >
                                                {perms.map((p) => (
                                                    <span
                                                        key={p.id}
                                                        style={{
                                                            fontSize: 11,
                                                            padding: "2px 9px",
                                                            borderRadius: 20,
                                                            background:
                                                                "var(--bg4)",
                                                            color: "var(--t2)",
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {p.display_name ??
                                                            p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </MBody>
            <MFoot>
                <Btn
                    variant="danger"
                    icon={
                        <i
                            className={`ti ti-${user.active ? "user-x" : "user-check"}`}
                        />
                    }
                    loading={toggleActive.isPending}
                    onClick={() => toggleActive.mutate()}
                >
                    {user.active ? "إيقاف" : "تفعيل"}
                </Btn>
                <Btn onClick={onClose}>إغلاق</Btn>
                <Btn
                    variant="primary"
                    icon={<i className="ti ti-pencil" />}
                    onClick={() => onEdit(user)}
                >
                    تعديل
                </Btn>
            </MFoot>
        </Overlay>
    );
}

// ════════════════════════════════════════════════
// USER FORM MODAL
// ════════════════════════════════════════════════
function UserFormModal({
    user,
    roles,
    permissions,
    slug,
    onClose,
}: {
    user: User | null;
    roles: Role[];
    permissions: Permission[];
    slug: string;
    onClose: () => void;
}) {
    const isEdit = !!user;
    const qc = useQueryClient();
    const nameRef = useRef<HTMLInputElement>(null);
    const [tab, setTab] = useState<"info" | "perms">("info");
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: "",
        email: "",
        username: "",
        phone: "",
        job_title: "",
        password: "",
        role: "",
        permission_ids: [] as number[],
        active: true,
    });

    useEffect(() => {
        setError("");
        setTab("info");
        if (user) {
            setForm({
                name: user.name ?? "",
                email: user.email ?? "",
                username: user.username ?? "",
                phone: user.phone ?? "",
                job_title: user.job_title ?? "",
                password: "",
                role: user.roles?.[0]?.name ?? "",
                // نجمع: الصلاحيات المباشرة + صلاحيات الدور المُعيَّن
                // user.permissions = Direct Permissions (objects مع id)
                // user.role_permissions = صلاحيات الدور (يرجعها UserResource)
                permission_ids: [
                    ...(user.permissions?.map((p: any) => p.id) ?? []),
                    ...(user.role_permissions?.map((p: any) => p.id) ?? []),
                ],
                active: user.active ?? true,
            });
        } else {
            setForm({
                name: "",
                email: "",
                username: "",
                phone: "",
                job_title: "",
                password: "",
                role: "",
                permission_ids: [],
                active: true,
            });
        }
        setTimeout(() => nameRef.current?.focus(), 80);
    }, [user]);

    const mutation = useMutation({
        mutationFn: async (data: typeof form) => {
            // نرسل كل البيانات بما فيها permission_ids
            // UserService.afterUpdate يعالجها عبر syncPermissions
            if (isEdit)
                return apiClient.put(`/${slug}/users/${user!.id}`, data);
            return apiClient.post(`/${slug}/users`, data);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["users", slug] });
            onClose();
        },
        onError: (e) =>
            setError(err2str(e, isEdit ? "فشل التحديث" : "فشل إنشاء المستخدم")),
    });

    const f =
        <T extends keyof typeof form>(k: T) =>
        (v: (typeof form)[T]) =>
            setForm((prev) => ({ ...prev, [k]: v }));

    const sel_perm_count = form.permission_ids.length;

    return (
        <Overlay open onClose={onClose} width={620}>
            <MHead
                title={isEdit ? `تعديل: ${user?.name}` : "مستخدم جديد"}
                sub={
                    isEdit ? "تحديث بيانات المستخدم" : "إضافة مستخدم إلى الشركة"
                }
                icon={isEdit ? "ti-user-edit" : "ti-user-plus"}
                onClose={onClose}
            />

            {/* Tabs */}
            <div
                style={{
                    display: "flex",
                    borderBottom: "1px solid var(--b2)",
                    padding: "0 20px",
                }}
            >
                {(
                    [
                        {
                            key: "info",
                            label: "المعلومات الأساسية",
                            icon: "ti-user",
                        },
                        {
                            key: "perms",
                            label: `الصلاحيات${sel_perm_count > 0 ? ` (${sel_perm_count})` : ""}`,
                            icon: "ti-lock",
                        },
                    ] as const
                ).map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: "10px 16px",
                            borderBottom: `2px solid ${tab === t.key ? "var(--em)" : "transparent"}`,
                            color: tab === t.key ? "var(--em)" : "var(--t4)",
                            background: "none",
                            borderTop: 0,
                            borderLeft: 0,
                            borderRight: 0,
                            borderBottom: `2px solid ${tab === t.key ? "var(--em)" : "transparent"}`,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "Tajawal, sans-serif",
                            transition: ".13s",
                        }}
                    >
                        <i
                            className={`ti ${t.icon}`}
                            style={{ fontSize: 14 }}
                        />
                        {t.label}
                    </button>
                ))}
            </div>

            <MBody>
                {error && (
                    <div
                        style={{
                            padding: "9px 14px",
                            borderRadius: 10,
                            marginBottom: 14,
                            background: "var(--redb)",
                            border: "1px solid var(--redbo)",
                            color: "var(--red)",
                            fontSize: 12,
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                        }}
                    >
                        <i
                            className="ti ti-alert-circle"
                            style={{ flexShrink: 0 }}
                        />
                        {error}
                    </div>
                )}

                {tab === "info" && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                            }}
                        >
                            <Field label="الاسم الكامل" req>
                                <input
                                    ref={nameRef}
                                    value={form.name}
                                    onChange={(e) => f("name")(e.target.value)}
                                    style={inputStyle}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--em)")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--b3)")
                                    }
                                    placeholder="أحمد محمد"
                                />
                            </Field>
                            <Field label="اسم المستخدم">
                                <input
                                    value={form.username}
                                    onChange={(e) =>
                                        f("username")(e.target.value)
                                    }
                                    style={{ ...inputStyle, direction: "ltr" }}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--em)")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--b3)")
                                    }
                                    placeholder="ahmed.mohammed"
                                />
                            </Field>
                        </div>

                        <Field label="البريد الإلكتروني" req>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => f("email")(e.target.value)}
                                style={{ ...inputStyle, direction: "ltr" }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b3)")
                                }
                                placeholder="ahmed@example.com"
                            />
                        </Field>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                            }}
                        >
                            <Field label="رقم الهاتف">
                                <input
                                    value={form.phone}
                                    onChange={(e) => f("phone")(e.target.value)}
                                    style={{ ...inputStyle, direction: "ltr" }}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--em)")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--b3)")
                                    }
                                    placeholder="0550 000 000"
                                />
                            </Field>
                            <Field label="المسمى الوظيفي">
                                <input
                                    value={form.job_title}
                                    onChange={(e) =>
                                        f("job_title")(e.target.value)
                                    }
                                    style={inputStyle}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--em)")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor =
                                            "var(--b3)")
                                    }
                                    placeholder="محاسب / مدير المبيعات..."
                                />
                            </Field>
                        </div>

                        <Field
                            label={
                                isEdit
                                    ? "كلمة المرور (اتركها فارغة للإبقاء)"
                                    : "كلمة المرور"
                            }
                            req={!isEdit}
                        >
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => f("password")(e.target.value)}
                                style={{ ...inputStyle, direction: "ltr" }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b3)")
                                }
                                placeholder={
                                    isEdit ? "••••••••" : "كلمة مرور قوية"
                                }
                            />
                        </Field>

                        <Field label="الدور">
                            <select
                                value={form.role}
                                onChange={(e) => f("role")(e.target.value)}
                                style={{ ...inputStyle, cursor: "pointer" }}
                            >
                                <option value="">بدون دور</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.name}>
                                        {r.display_name ?? r.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "10px 14px",
                                borderRadius: 10,
                                background: "var(--bg3)",
                                border: "1px solid var(--b1)",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "var(--t2)",
                                    flex: 1,
                                }}
                            >
                                حالة الحساب
                            </span>
                            <div
                                className={`sw ${form.active ? "on" : ""}`}
                                onClick={() => f("active")(!form.active)}
                            />
                            <span
                                style={{
                                    fontSize: 12,
                                    color: form.active
                                        ? "var(--em)"
                                        : "var(--red)",
                                    fontWeight: 700,
                                    minWidth: 40,
                                }}
                            >
                                {form.active ? "نشط" : "موقوف"}
                            </span>
                        </div>
                    </div>
                )}

                {tab === "perms" && (
                    <div>
                        <div
                            style={{
                                marginBottom: 12,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <span style={{ fontSize: 12, color: "var(--t4)" }}>
                                صلاحيات مباشرة — {sel_perm_count} محدد من{" "}
                                {permissions.length}
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                                <Btn
                                    size="xs"
                                    onClick={() =>
                                        f("permission_ids")(
                                            permissions.map((p) => p.id),
                                        )
                                    }
                                >
                                    تحديد الكل
                                </Btn>
                                <Btn
                                    size="xs"
                                    onClick={() => f("permission_ids")([])}
                                >
                                    إلغاء الكل
                                </Btn>
                            </div>
                        </div>
                        <PermMatrix
                            permissions={permissions}
                            selected={form.permission_ids}
                            onChange={(ids) => f("permission_ids")(ids)}
                        />
                    </div>
                )}
            </MBody>

            <MFoot>
                <Btn onClick={onClose}>إلغاء</Btn>
                <Btn
                    variant="primary"
                    icon={
                        <i
                            className={`ti ti-${isEdit ? "device-floppy" : "user-plus"}`}
                        />
                    }
                    loading={mutation.isPending}
                    onClick={() => mutation.mutate(form)}
                >
                    {isEdit ? "حفظ التغييرات" : "إنشاء المستخدم"}
                </Btn>
            </MFoot>
        </Overlay>
    );
}

// ════════════════════════════════════════════════
// ROLE FORM MODAL
// ════════════════════════════════════════════════
function RoleFormModal({
    role,
    permissions,
    slug,
    onClose,
}: {
    role: Role | null;
    permissions: Permission[];
    slug: string;
    onClose: () => void;
}) {
    const isEdit = !!role;
    const qc = useQueryClient();
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: "",
        display_name: "",
        description: "",
        permission_ids: [] as number[],
    });

    useEffect(() => {
        setError("");
        if (role) {
            const perms = role.permissions ?? role.relations?.permissions ?? [];
            setForm({
                name: role.name ?? "",
                display_name: role.display_name ?? "",
                description: role.description ?? "",
                permission_ids: perms.map((p) => p.id),
            });
        } else {
            setForm({
                name: "",
                display_name: "",
                description: "",
                permission_ids: [],
            });
        }
    }, [role]);

    const mutation = useMutation({
        mutationFn: async () => {
            const payload = {
                name: form.name,
                display_name: form.display_name,
                description: form.description,
                permission_ids: form.permission_ids,
            };
            if (isEdit)
                return apiClient.put(`/${slug}/roles/${role!.id}`, payload);
            return apiClient.post(`/${slug}/roles`, payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["roles", slug] });
            onClose();
        },
        onError: (e) => setError(err2str(e, "فشل الحفظ")),
    });

    return (
        <Overlay open onClose={onClose} width={640}>
            <MHead
                title={
                    isEdit
                        ? `تعديل الدور: ${role?.display_name ?? role?.name}`
                        : "دور جديد"
                }
                sub="تحديد الصلاحيات المرتبطة بالدور"
                icon="ti-shield"
                onClose={onClose}
            />
            <MBody>
                {error && (
                    <div
                        style={{
                            padding: "9px 14px",
                            borderRadius: 10,
                            marginBottom: 14,
                            background: "var(--redb)",
                            border: "1px solid var(--redbo)",
                            color: "var(--red)",
                            fontSize: 12,
                        }}
                    >
                        {error}
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                        }}
                    >
                        <Field label="الاسم التقني" req>
                            <input
                                value={form.name}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        name: e.target.value,
                                    }))
                                }
                                style={{ ...inputStyle, direction: "ltr" }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b3)")
                                }
                                placeholder="sales-manager"
                                disabled={isEdit}
                            />
                        </Field>
                        <Field label="الاسم المعروض">
                            <input
                                value={form.display_name}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        display_name: e.target.value,
                                    }))
                                }
                                style={inputStyle}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b3)")
                                }
                                placeholder="مدير المبيعات"
                            />
                        </Field>
                    </div>

                    <Field label="الوصف">
                        <textarea
                            value={form.description}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    description: e.target.value,
                                }))
                            }
                            style={{
                                ...inputStyle,
                                resize: "vertical",
                                minHeight: 60,
                            }}
                            onFocus={(e) =>
                                (e.target.style.borderColor = "var(--em)")
                            }
                            onBlur={(e) =>
                                (e.target.style.borderColor = "var(--b3)")
                            }
                            placeholder="وصف مختصر للدور ومهامه..."
                        />
                    </Field>

                    <div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 10,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: "var(--t4)",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                }}
                            >
                                الصلاحيات — {form.permission_ids.length} محدد
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <Btn
                                    size="xs"
                                    onClick={() =>
                                        setForm((f) => ({
                                            ...f,
                                            permission_ids: permissions.map(
                                                (p) => p.id,
                                            ),
                                        }))
                                    }
                                >
                                    تحديد الكل
                                </Btn>
                                <Btn
                                    size="xs"
                                    onClick={() =>
                                        setForm((f) => ({
                                            ...f,
                                            permission_ids: [],
                                        }))
                                    }
                                >
                                    إلغاء الكل
                                </Btn>
                            </div>
                        </div>
                        <PermMatrix
                            permissions={permissions}
                            selected={form.permission_ids}
                            onChange={(ids) =>
                                setForm((f) => ({ ...f, permission_ids: ids }))
                            }
                        />
                    </div>
                </div>
            </MBody>
            <MFoot>
                <Btn onClick={onClose}>إلغاء</Btn>
                <Btn
                    variant="primary"
                    icon={
                        <i
                            className={`ti ti-${isEdit ? "device-floppy" : "shield-plus"}`}
                        />
                    }
                    loading={mutation.isPending}
                    onClick={() => mutation.mutate()}
                >
                    {isEdit ? "حفظ التغييرات" : "إنشاء الدور"}
                </Btn>
            </MFoot>
        </Overlay>
    );
}

// ════════════════════════════════════════════════
// ROLE DETAIL DRAWER
// ════════════════════════════════════════════════
function RoleDetailModal({
    role,
    slug,
    onClose,
    onEdit,
}: {
    role: Role | null;
    slug: string;
    onClose: () => void;
    onEdit: (r: Role) => void;
}) {
    const qc = useQueryClient();
    const deleteRole = useMutation({
        mutationFn: () => apiClient.delete(`/${slug}/roles/${role!.id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["roles", slug] });
            onClose();
        },
    });

    if (!role) return null;
    const perms = role.permissions ?? role.relations?.permissions ?? [];
    const groups = perms.reduce<Record<string, typeof perms>>((acc, p) => {
        const g = (p as any).group ?? "عامة";
        if (!acc[g]) acc[g] = [];
        acc[g].push(p);
        return acc;
    }, {});

    return (
        <Overlay open onClose={onClose} width={540}>
            <MHead
                title={role.display_name ?? role.name}
                sub={role.description ?? "تفاصيل الدور"}
                icon="ti-shield"
                onClose={onClose}
            />
            <MBody>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                    }}
                >
                    {/* Info */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                background: "var(--emb)",
                                border: "1px solid var(--embo)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 10,
                                    color: "var(--em)",
                                    fontWeight: 800,
                                    marginBottom: 3,
                                }}
                            >
                                الاسم التقني
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "var(--em)",
                                    fontFamily: "monospace",
                                }}
                            >
                                {role.name}
                            </div>
                        </div>
                        <div
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                background: "var(--bg3)",
                                border: "1px solid var(--b1)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 10,
                                    color: "var(--t4)",
                                    fontWeight: 800,
                                    marginBottom: 3,
                                }}
                            >
                                عدد الصلاحيات
                            </div>
                            <div
                                style={{
                                    fontSize: 18,
                                    fontWeight: 900,
                                    color: "var(--t1)",
                                }}
                            >
                                {perms.length}
                            </div>
                        </div>
                    </div>

                    {/* Permissions */}
                    {Object.keys(groups).length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "24px",
                                background: "var(--bg3)",
                                borderRadius: 12,
                                color: "var(--t4)",
                                fontSize: 13,
                            }}
                        >
                            لا توجد صلاحيات مرتبطة
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: "var(--t4)",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                }}
                            >
                                الصلاحيات المرتبطة
                            </div>
                            {Object.entries(groups).map(([grp, ps], gi) => (
                                <div
                                    key={grp}
                                    style={{
                                        background: "var(--bg3)",
                                        borderRadius: 10,
                                        padding: "10px 12px",
                                        borderRight: `3px solid ${gColor(gi)}`,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 800,
                                            color: gColor(gi),
                                            marginBottom: 7,
                                        }}
                                    >
                                        {grp}{" "}
                                        <span
                                            style={{
                                                opacity: 0.6,
                                                fontWeight: 600,
                                            }}
                                        >
                                            ({ps.length})
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 5,
                                        }}
                                    >
                                        {ps.map((p) => (
                                            <span
                                                key={p.id}
                                                style={{
                                                    fontSize: 11,
                                                    padding: "2px 9px",
                                                    borderRadius: 20,
                                                    background: `${gColor(gi)}18`,
                                                    color: gColor(gi),
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {(p as any).display_name ??
                                                    p.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </MBody>
            <MFoot>
                <Btn
                    variant="danger"
                    icon={<i className="ti ti-trash" />}
                    loading={deleteRole.isPending}
                    onClick={() => {
                        if (
                            confirm(
                                `حذف دور "${role.display_name ?? role.name}"؟`,
                            )
                        )
                            deleteRole.mutate();
                    }}
                >
                    حذف
                </Btn>
                <Btn onClick={onClose}>إغلاق</Btn>
                <Btn
                    variant="primary"
                    icon={<i className="ti ti-pencil" />}
                    onClick={() => onEdit(role)}
                >
                    تعديل
                </Btn>
            </MFoot>
        </Overlay>
    );
}

// ════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════
export default function UsersPage() {
    const { activeCompany } = useAuth() as any;
    const slug = activeCompany?.slug as string | undefined;
    const qc = useQueryClient();

    const [mainTab, setMainTab] = useState<"users" | "roles" | "permissions">(
        "users",
    );
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

    // User modals
    const [viewUser, setViewUser] = useState<User | null>(null);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [showAdd, setShowAdd] = useState(false);

    // Role modals
    const [viewRole, setViewRole] = useState<Role | null>(null);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [showAddRole, setShowAddRole] = useState(false);

    // ─── Queries ───────────────────────────────────
    const {
        data: users = [],
        isLoading: usersLoading,
        isError: usersError,
    } = useQuery<User[]>({
        queryKey: ["users", slug, search],
        queryFn: async () => {
            if (!slug) return [];
            const res = await apiClient.get(`/${slug}/users`, {
                params: {
                    search: search || undefined,
                    per_page: 100,
                    include: "roles,permissions",
                },
            });
            const raw = res.data?.data ?? res.data;
            return Array.isArray(raw) ? raw : (raw?.data ?? []);
        },
        enabled: !!slug,
        staleTime: 30_000,
    });

    const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
        queryKey: ["roles", slug],
        queryFn: async () => {
            if (!slug) return [];
            const res = await apiClient.get(`/${slug}/roles`, {
                params: { per_page: 100, include: "permissions" },
            });
            const raw = res.data?.data ?? res.data;
            return Array.isArray(raw) ? raw : (raw?.data ?? []);
        },
        enabled: !!slug,
        staleTime: 300_000,
    });

    const { data: permissions = [], isLoading: permsLoading } = useQuery<
        Permission[]
    >({
        queryKey: ["permissions", slug],
        queryFn: async () => {
            if (!slug) return [];
            const res = await apiClient.get(`/${slug}/permissions`, {
                params: { per_page: 200 },
            });
            const raw = res.data?.data ?? res.data;
            return Array.isArray(raw) ? raw : (raw?.data ?? []);
        },
        enabled: !!slug,
        staleTime: 600_000,
    });

    // ─── Mutations ─────────────────────────────────
    const deleteUser = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/${slug}/users/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["users", slug] }),
    });

    // ─── Filtered users ────────────────────────────
    const filteredUsers = users.filter((u) => {
        if (filter === "active" && !u.active) return false;
        if (filter === "inactive" && u.active) return false;
        return true;
    });

    // ─── Permission groups for display ────────────
    const permGroups = permissions.reduce<Record<string, Permission[]>>(
        (acc, p) => {
            const g = p.group ?? "أخرى";
            if (!acc[g]) acc[g] = [];
            acc[g].push(p);
            return acc;
        },
        {},
    );

    if (!slug)
        return (
            <div className="page on">
                <div className="empty">
                    <div className="empty-tx">تحميل...</div>
                </div>
            </div>
        );

    return (
        <>
            <style>{`
        @keyframes ovIn    { from{opacity:0} to{opacity:1} }
        @keyframes modalIn { from{opacity:0;transform:scale(.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .u-row:hover { background: var(--bg3) !important; }
        .r-card:hover { border-color: var(--embo) !important; transform: translateY(-1px); }
      `}</style>

            <div
                className="page on"
                id="p-users"
                style={{ animation: "slideIn .25s ease" }}
            >
                {/* ── Header ── */}
                <div style={{ marginBottom: 22 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                        }}
                    >
                        <div>
                            <h1
                                style={{
                                    fontSize: 22,
                                    fontWeight: 900,
                                    color: "var(--t1)",
                                    margin: 0,
                                    marginBottom: 3,
                                }}
                            >
                                إدارة المستخدمين
                            </h1>
                            <p
                                style={{
                                    fontSize: 12,
                                    color: "var(--t4)",
                                    margin: 0,
                                }}
                            >
                                الأدوار · الصلاحيات · الحسابات — {users.length}{" "}
                                مستخدم · {roles.length} دور ·{" "}
                                {permissions.length} صلاحية
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            {mainTab === "users" && (
                                <Btn
                                    variant="primary"
                                    icon={<i className="ti ti-user-plus" />}
                                    onClick={() => setShowAdd(true)}
                                >
                                    مستخدم جديد
                                </Btn>
                            )}
                            {mainTab === "roles" && (
                                <Btn
                                    variant="primary"
                                    icon={<i className="ti ti-shield-plus" />}
                                    onClick={() => setShowAddRole(true)}
                                >
                                    دور جديد
                                </Btn>
                            )}
                        </div>
                    </div>

                    {/* KPIs */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4,1fr)",
                            gap: 10,
                            marginTop: 18,
                        }}
                    >
                        {[
                            {
                                label: "المستخدمون",
                                value: users.length,
                                icon: "ti-users",
                                color: "var(--em)",
                                bg: "var(--emb)",
                            },
                            {
                                label: "نشطون",
                                value: users.filter((u) => u.active).length,
                                icon: "ti-user-check",
                                color: "var(--blue)",
                                bg: "var(--blueb)",
                            },
                            {
                                label: "موقوفون",
                                value: users.filter((u) => !u.active).length,
                                icon: "ti-user-x",
                                color: "var(--red)",
                                bg: "var(--redb)",
                            },
                            {
                                label: "الأدوار",
                                value: roles.length,
                                icon: "ti-shield",
                                color: "var(--purple)",
                                bg: "var(--purb)",
                            },
                        ].map((k, i) => (
                            <div
                                key={i}
                                style={{
                                    background: "var(--bg2)",
                                    borderRadius: 14,
                                    padding: "14px 16px",
                                    border: "1px solid var(--b2)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    transition: ".15s",
                                    animation: `slideIn .3s ease ${i * 0.05}s both`,
                                }}
                            >
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 10,
                                        background: k.bg,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 18,
                                        color: k.color,
                                        flexShrink: 0,
                                    }}
                                >
                                    <i className={`ti ${k.icon}`} />
                                </div>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 22,
                                            fontWeight: 900,
                                            color: "var(--t1)",
                                            lineHeight: 1,
                                        }}
                                    >
                                        {k.value}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "var(--t4)",
                                            marginTop: 2,
                                        }}
                                    >
                                        {k.label}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Main Tabs ── */}
                <div
                    style={{
                        display: "flex",
                        borderBottom: "1px solid var(--b2)",
                        marginBottom: 18,
                        gap: 0,
                        overflowX: "auto",
                    }}
                >
                    {(
                        [
                            {
                                key: "users",
                                label: "المستخدمون",
                                icon: "ti-users",
                                count: users.length,
                            },
                            {
                                key: "roles",
                                label: "الأدوار",
                                icon: "ti-shield",
                                count: roles.length,
                            },
                            {
                                key: "permissions",
                                label: "الصلاحيات",
                                icon: "ti-lock",
                                count: permissions.length,
                            },
                        ] as const
                    ).map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setMainTab(t.key)}
                            style={{
                                padding: "10px 20px",
                                background: "none",
                                border: "none",
                                borderBottom: `2px solid ${mainTab === t.key ? "var(--em)" : "transparent"}`,
                                color:
                                    mainTab === t.key
                                        ? "var(--em)"
                                        : "var(--t4)",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                fontFamily: "Tajawal, sans-serif",
                                transition: ".13s",
                                whiteSpace: "nowrap",
                            }}
                        >
                            <i
                                className={`ti ${t.icon}`}
                                style={{ fontSize: 15 }}
                            />
                            {t.label}
                            <span
                                style={{
                                    fontSize: 10,
                                    padding: "1px 7px",
                                    borderRadius: 20,
                                    background:
                                        mainTab === t.key
                                            ? "var(--emb)"
                                            : "var(--bg4)",
                                    color:
                                        mainTab === t.key
                                            ? "var(--em)"
                                            : "var(--t4)",
                                    fontWeight: 800,
                                }}
                            >
                                {t.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ══════════ USERS TAB ══════════ */}
                {mainTab === "users" && (
                    <div style={{ animation: "slideIn .2s ease" }}>
                        {/* Toolbar */}
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                marginBottom: 14,
                                flexWrap: "wrap",
                            }}
                        >
                            <div
                                style={{
                                    position: "relative",
                                    flex: 1,
                                    minWidth: 200,
                                }}
                            >
                                <i
                                    className="ti ti-search"
                                    style={{
                                        position: "absolute",
                                        right: 11,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "var(--t4)",
                                        fontSize: 13,
                                    }}
                                />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="بحث بالاسم أو البريد..."
                                    style={{ ...inputStyle, paddingRight: 34 }}
                                />
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                {(["all", "active", "inactive"] as const).map(
                                    (f) => {
                                        const labels = {
                                            all: "الكل",
                                            active: "نشطون",
                                            inactive: "موقوفون",
                                        };
                                        return (
                                            <button
                                                key={f}
                                                onClick={() => setFilter(f)}
                                                style={{
                                                    padding: "7px 14px",
                                                    borderRadius: 10,
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    cursor: "pointer",
                                                    fontFamily:
                                                        "Tajawal, sans-serif",
                                                    transition: ".13s",
                                                    background:
                                                        filter === f
                                                            ? "var(--em)"
                                                            : "var(--bg3)",
                                                    border: `1px solid ${filter === f ? "var(--em)" : "var(--b2)"}`,
                                                    color:
                                                        filter === f
                                                            ? "#fff"
                                                            : "var(--t3)",
                                                }}
                                            >
                                                {labels[f]}
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>

                        {usersLoading ? (
                            <div className="empty">
                                <div className="empty-ic">
                                    <i
                                        className="ti ti-loader"
                                        style={{
                                            animation:
                                                "spin 1s linear infinite",
                                        }}
                                    />
                                </div>
                                <div className="empty-tx">جارٍ التحميل...</div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="empty">
                                <div className="empty-ic">
                                    <i className="ti ti-users" />
                                </div>
                                <div className="empty-tx">
                                    {search
                                        ? "لا توجد نتائج"
                                        : "لا يوجد مستخدمون"}
                                </div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    background: "var(--bg2)",
                                    borderRadius: 14,
                                    border: "1px solid var(--b2)",
                                    overflow: "hidden",
                                }}
                            >
                                {/* Table header */}
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "2fr 1.5fr 1fr 1fr 100px",
                                        padding: "10px 18px",
                                        borderBottom: "1px solid var(--b2)",
                                        background: "var(--bg3)",
                                    }}
                                >
                                    {[
                                        "المستخدم",
                                        "البريد / الهاتف",
                                        "الدور",
                                        "آخر دخول",
                                        "",
                                    ].map((h, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                color: "var(--t4)",
                                                textTransform: "uppercase",
                                                letterSpacing: 0.8,
                                            }}
                                        >
                                            {h}
                                        </div>
                                    ))}
                                </div>

                                {/* Rows */}
                                {filteredUsers.map((u, i) => (
                                    <div
                                        key={u.id}
                                        className="u-row"
                                        onClick={() => setViewUser(u)}
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "2fr 1.5fr 1fr 1fr 100px",
                                            padding: "12px 18px",
                                            cursor: "pointer",
                                            borderBottom:
                                                i < filteredUsers.length - 1
                                                    ? "1px solid var(--b1)"
                                                    : "none",
                                            background: "var(--bg2)",
                                            transition: ".13s",
                                            animation: `slideIn .25s ease ${i * 0.03}s both`,
                                        }}
                                    >
                                        {/* Name */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 11,
                                            }}
                                        >
                                            <Avatar name={u.name} id={u.id} />
                                            <div>
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: 13,
                                                        color: "var(--t1)",
                                                    }}
                                                >
                                                    {u.name}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 10,
                                                        color: "var(--t4)",
                                                        fontFamily: "monospace",
                                                    }}
                                                >
                                                    {u.username
                                                        ? `@${u.username}`
                                                        : "—"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "center",
                                                gap: 2,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 12,
                                                    color: "var(--t2)",
                                                    fontFamily: "monospace",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {u.email}
                                            </div>
                                            {u.phone && (
                                                <div
                                                    style={{
                                                        fontSize: 10,
                                                        color: "var(--t4)",
                                                        direction: "ltr",
                                                    }}
                                                >
                                                    {u.phone}
                                                </div>
                                            )}
                                        </div>

                                        {/* Role */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            {u.roles?.[0] ? (
                                                <Badge
                                                    color="var(--purple)"
                                                    bg="var(--purb)"
                                                >
                                                    <i
                                                        className="ti ti-shield-half"
                                                        style={{ fontSize: 9 }}
                                                    />
                                                    {u.roles[0].display_name ??
                                                        u.roles[0].name}
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    color="var(--t4)"
                                                    bg="var(--bg4)"
                                                >
                                                    بدون دور
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Last login */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                fontSize: 11,
                                                color: "var(--t4)",
                                            }}
                                        >
                                            {u.last_login_at
                                                ? fmtDT(u.last_login_at)
                                                : "لم يدخل بعد"}
                                        </div>

                                        {/* Actions */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 5,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <StatusBadge active={u.active} />
                                            <Btn
                                                size="xs"
                                                variant="ghost"
                                                icon={
                                                    <i className="ti ti-pencil" />
                                                }
                                                onClick={() => setEditUser(u)}
                                            />
                                            <Btn
                                                size="xs"
                                                variant="ghost"
                                                icon={
                                                    <i
                                                        className="ti ti-trash"
                                                        style={{
                                                            color: "var(--red)",
                                                        }}
                                                    />
                                                }
                                                onClick={() => {
                                                    if (
                                                        confirm(
                                                            `حذف "${u.name}"؟`,
                                                        )
                                                    )
                                                        deleteUser.mutate(u.id);
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════ ROLES TAB ══════════ */}
                {mainTab === "roles" && (
                    <div style={{ animation: "slideIn .2s ease" }}>
                        {rolesLoading ? (
                            <div className="empty">
                                <div className="empty-ic">
                                    <i
                                        className="ti ti-loader"
                                        style={{
                                            animation:
                                                "spin 1s linear infinite",
                                        }}
                                    />
                                </div>
                                <div className="empty-tx">جارٍ التحميل...</div>
                            </div>
                        ) : roles.length === 0 ? (
                            <div className="empty">
                                <div className="empty-ic">
                                    <i className="ti ti-shield" />
                                </div>
                                <div className="empty-tx">لا توجد أدوار</div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(auto-fill,minmax(300px,1fr))",
                                    gap: 12,
                                }}
                            >
                                {roles.map((role, i) => {
                                    const perms =
                                        role.permissions ??
                                        role.relations?.permissions ??
                                        [];
                                    const groups = [
                                        ...new Set(
                                            perms.map(
                                                (p: any) => p.group ?? "أخرى",
                                            ),
                                        ),
                                    ];
                                    return (
                                        <div
                                            key={role.id}
                                            className="r-card"
                                            onClick={() => setViewRole(role)}
                                            style={{
                                                background: "var(--bg2)",
                                                borderRadius: 14,
                                                border: "1px solid var(--b2)",
                                                padding: 16,
                                                cursor: "pointer",
                                                transition: "all .18s",
                                                animation: `slideIn .25s ease ${i * 0.05}s both`,
                                            }}
                                        >
                                            {/* Card head */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    gap: 12,
                                                    marginBottom: 14,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 42,
                                                        height: 42,
                                                        borderRadius: 12,
                                                        background:
                                                            "var(--emb)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "center",
                                                        fontSize: 20,
                                                        color: "var(--em)",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <i className="ti ti-shield-half" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 800,
                                                            fontSize: 14,
                                                            color: "var(--t1)",
                                                        }}
                                                    >
                                                        {role.display_name ??
                                                            role.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 10,
                                                            color: "var(--t4)",
                                                            fontFamily:
                                                                "monospace",
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        {role.name}
                                                    </div>
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 4,
                                                    }}
                                                >
                                                    <Btn
                                                        size="xs"
                                                        variant="ghost"
                                                        icon={
                                                            <i className="ti ti-pencil" />
                                                        }
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditRole(role);
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Permission count */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: 8,
                                                    flexWrap: "wrap",
                                                    marginBottom: 10,
                                                }}
                                            >
                                                <Badge
                                                    color="var(--em)"
                                                    bg="var(--emb)"
                                                >
                                                    <i
                                                        className="ti ti-lock"
                                                        style={{ fontSize: 9 }}
                                                    />
                                                    {perms.length} صلاحية
                                                </Badge>
                                                {groups
                                                    .slice(0, 2)
                                                    .map((g, gi) => (
                                                        <Badge
                                                            key={g}
                                                            color={gColor(gi)}
                                                            bg={`${gColor(gi)}15`}
                                                        >
                                                            {g}
                                                        </Badge>
                                                    ))}
                                                {groups.length > 2 && (
                                                    <Badge
                                                        color="var(--t4)"
                                                        bg="var(--bg4)"
                                                    >
                                                        +{groups.length - 2}
                                                    </Badge>
                                                )}
                                            </div>

                                            {role.description && (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "var(--t4)",
                                                        borderTop:
                                                            "1px solid var(--b1)",
                                                        paddingTop: 10,
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    {role.description}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════ PERMISSIONS TAB ══════════ */}
                {mainTab === "permissions" && (
                    <div style={{ animation: "slideIn .2s ease" }}>
                        {permsLoading ? (
                            <div className="empty">
                                <div className="empty-ic">
                                    <i
                                        className="ti ti-loader"
                                        style={{
                                            animation:
                                                "spin 1s linear infinite",
                                        }}
                                    />
                                </div>
                                <div className="empty-tx">جارٍ التحميل...</div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                }}
                            >
                                {/* Summary */}
                                <div
                                    style={{
                                        padding: "12px 16px",
                                        borderRadius: 12,
                                        background: "var(--emb)",
                                        border: "1px solid var(--embo)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                    }}
                                >
                                    <i
                                        className="ti ti-info-circle"
                                        style={{
                                            color: "var(--em)",
                                            fontSize: 18,
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: 13,
                                            color: "var(--em)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {permissions.length} صلاحية مُعرَّفة في{" "}
                                        {Object.keys(permGroups).length} مجموعة
                                        — للعرض فقط، التعديل من الكود
                                    </span>
                                </div>

                                {Object.entries(permGroups).map(
                                    ([group, perms], gi) => (
                                        <div
                                            key={group}
                                            style={{
                                                background: "var(--bg2)",
                                                borderRadius: 14,
                                                border: "1px solid var(--b2)",
                                                overflow: "hidden",
                                                animation: `slideIn .25s ease ${gi * 0.06}s both`,
                                            }}
                                        >
                                            {/* Group header */}
                                            <div
                                                style={{
                                                    padding: "12px 18px",
                                                    borderBottom:
                                                        "1px solid var(--b1)",
                                                    background: "var(--bg3)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    borderRight: `4px solid ${gColor(gi)}`,
                                                }}
                                            >
                                                <i
                                                    className="ti ti-folders"
                                                    style={{
                                                        color: gColor(gi),
                                                        fontSize: 16,
                                                    }}
                                                />
                                                <span
                                                    style={{
                                                        fontWeight: 800,
                                                        fontSize: 13,
                                                        color: gColor(gi),
                                                    }}
                                                >
                                                    {group}
                                                </span>
                                                <Badge
                                                    color={gColor(gi)}
                                                    bg={`${gColor(gi)}18`}
                                                >
                                                    {perms.length} صلاحية
                                                </Badge>
                                            </div>

                                            {/* Permissions grid */}
                                            <div
                                                style={{
                                                    padding: "12px 18px",
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 8,
                                                }}
                                            >
                                                {perms.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        style={{
                                                            padding: "6px 14px",
                                                            borderRadius: 20,
                                                            background: `${gColor(gi)}10`,
                                                            border: `1px solid ${gColor(gi)}30`,
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 7,
                                                        }}
                                                    >
                                                        <i
                                                            className="ti ti-check"
                                                            style={{
                                                                color: gColor(
                                                                    gi,
                                                                ),
                                                                fontSize: 10,
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: "var(--t2)",
                                                            }}
                                                        >
                                                            {p.display_name ??
                                                                p.name}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: 9,
                                                                color: "var(--t4)",
                                                                fontFamily:
                                                                    "monospace",
                                                                opacity: 0.7,
                                                            }}
                                                        >
                                                            {p.name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            {viewUser && (
                <UserDetailModal
                    user={viewUser}
                    slug={slug!}
                    onClose={() => setViewUser(null)}
                    onEdit={(u) => {
                        setViewUser(null);
                        setEditUser(u);
                    }}
                />
            )}
            {(showAdd || editUser) && (
                <UserFormModal
                    user={editUser}
                    roles={roles}
                    permissions={permissions}
                    slug={slug!}
                    onClose={() => {
                        setShowAdd(false);
                        setEditUser(null);
                    }}
                />
            )}
            {viewRole && (
                <RoleDetailModal
                    role={viewRole}
                    slug={slug!}
                    onClose={() => setViewRole(null)}
                    onEdit={(r) => {
                        setViewRole(null);
                        setEditRole(r);
                    }}
                />
            )}
            {(showAddRole || editRole) && (
                <RoleFormModal
                    role={editRole}
                    permissions={permissions}
                    slug={slug!}
                    onClose={() => {
                        setShowAddRole(false);
                        setEditRole(null);
                    }}
                />
            )}
        </>
    );
}
```



# =========================================
# 🛒 POS MODULE
# =========================================

## FILE: resources/js/pages/pos/POSPage.tsx
```
// pages/pos/POSPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePOS }           from '@/pos/hooks/usePOS';
import { useVariants }      from '@/hooks/useProducts';
import { useCustomers }     from '@/hooks/useData';
import { usePaymentModes, useWarehouses, useCurrentFiscalYear } from '@/hooks/useData';
import { useDocumentTypes } from '@/hooks/useData';
import ProductCard          from '@/pos/components/ProductCard';
import Cart                 from '@/pos/components/Cart';
import PaymentModal         from '@/pos/components/PaymentModal';
import HeldCartsModal       from '@/pos/components/HeldCartsModal';
import Receipt              from '@/pos/components/Receipt';
import type { ProductVariant } from '@/types';
import { formatDZD } from '@/pos/utils/calculations';

export default function POSPage() {
  const pos             = usePOS();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showHeld,    setShowHeld]    = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showManual,  setShowManual]  = useState(false);
  const [mobTab,      setMobTab]      = useState<'products' | 'cart'>('products');
  const [lastDocNum,  setLastDocNum]  = useState<string | undefined>();

  const searchRef = useRef<HTMLInputElement>(null);

  // API data
  const { data: variantsData, isLoading: loadingVariants } = useVariants({
    search: pos.searchQuery || undefined,
    page: 1,
  });
  const { data: customersData } = useCustomers({ active: true, per_page: 100 });
  const { data: paymentModes  } = usePaymentModes();
  const { data: warehouses    } = useWarehouses();
  const { data: fiscalYear    } = useCurrentFiscalYear();
  const { data: documentTypes } = useDocumentTypes();

  const variants  = variantsData?.data ?? [];
  const customers = customersData?.data ?? [];

  // Filter by category
  const filteredVariants: ProductVariant[] = pos.selectedCategory
    ? variants.filter(v => v.product?.family_id === pos.selectedCategory)
    : variants;

  // Get unique families for category bar
  const families = Array.from(
    new Map(
      variants
        .filter(v => v.product?.family)
        .map(v => [v.product!.family!.id, v.product!.family!])
    ).values()
  );

  // ── Keyboard shortcuts ────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      if (e.key === 'F4') { e.preventDefault(); if (!pos.isEmpty) pos.openPayment(); }
      if (e.key === 'F5') { e.preventDefault(); if (!pos.isEmpty) pos.holdCart(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pos]);

  // ── Complete sale handler ─────────────────────
  const handleCompleteSale = useCallback(async (params: {
    paymentModeId: number;
    amountPaid: number;
    dueDate?: string;
    note?: string;
  }) => {
    // Find invoice document type
    const invType = documentTypes?.find(t => t.code === 'FAC' || t.code === 'INV');
    const wh = warehouses?.[0];
    if (!invType || !wh || !fiscalYear) {
      return { ok: false, message: 'إعدادات غير مكتملة (نوع المستند / المستودع / السنة المالية)' };
    }
    const res = await pos.completeSale({
      paymentModeId:   params.paymentModeId,
      documentTypeId:  invType.id,
      warehouseId:     wh.id,
      fiscalYearId:    fiscalYear.id,
      amountPaid:      params.amountPaid,
    });
    if (res.ok && res.document) {
      setLastDocNum(res.document.document_number);
      setShowReceipt(true);
    }
    return res;
  }, [pos, documentTypes, warehouses, fiscalYear]);

  const totalTtc = pos.totals.total_ttc + pos.totals.fiscal_stamp;

  return (
    <div className="page on" id="p-pos">

      {/* ── Stats bar ── */}
      <div className="pos-stats">
        <div className="pos-chip g" title="فواتير اليوم">
          <span className="ic ic-xs"><i className="ti ti-receipt" /></span>
          <span>فواتير:</span><strong>{pos.sessionInvoices}</strong>
        </div>
        <div className="pos-chip o" title="مبيعات اليوم">
          <span className="ic ic-xs"><i className="ti ti-cash" /></span>
          <span>مبيعات:</span><strong>{formatDZD(pos.sessionSales)}</strong>
        </div>
        <div
          className="pos-chip b clickable"
          onClick={() => setShowHeld(true)}
          title="الفواتير المعلقة"
        >
          <span className="ic ic-xs"><i className="ti ti-clock-pause" /></span>
          <span>معلقة:</span><strong>{pos.heldCarts.length}</strong>
          <span style={{ opacity: 0.6, fontSize: 10 }}>←</span>
        </div>

        <div className="pos-tools">
          <button className="btn btn-xs" onClick={() => setShowManual(true)} title="إضافة يدوي (F7)">
            <span className="ic ic-xs"><i className="ti ti-plus" /></span>
            <span className="tb-txt"> يدوي</span>
          </button>
          <button className="btn btn-xs" onClick={() => setShowReceipt(true)} title="معاينة وطباعة" disabled={pos.isEmpty}>
            <span className="ic ic-xs"><i className="ti ti-printer" /></span>
          </button>
        </div>

        <div className="pos-kb-hint">
          <kbd>F2</kbd> بحث &nbsp;
          <kbd>F4</kbd> بيع &nbsp;
          <kbd>F5</kbd> تعليق
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="pos-mob-tabs">
        <div
          className={`pmt ${mobTab === 'products' ? 'on' : ''}`}
          onClick={() => setMobTab('products')}
        >
          <div className="pmt-ic"><i className="ti ti-package" /></div>
          <span>المنتجات</span>
        </div>
        <div
          className={`pmt ${mobTab === 'cart' ? 'on' : ''}`}
          onClick={() => setMobTab('cart')}
        >
          <div className="pmt-ic"><i className="ti ti-shopping-cart" /></div>
          {pos.itemsCount > 0 && (
            <div className="pmt-badge">{pos.itemsCount}</div>
          )}
          <span>السلة</span>
        </div>
        <button
          className="pmt-sell-btn"
          onClick={pos.openPayment}
          disabled={pos.isEmpty}
        >
          <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
          تأكيد البيع
        </button>
      </div>

      {/* ── Mobile total bar ── */}
      {!pos.isEmpty && (
        <div className="mob-total-bar" style={{ display: 'flex' }}>
          <div className="mob-total-left">
            <span className="ic ic-xs"><i className="ti ti-shopping-cart" /></span>
            <span>{pos.itemsCount} وحدة</span>
          </div>
          <div className="mob-total-right">
            <span className="mob-total-label">الإجمالي</span>
            <span className="mob-total-val">{formatDZD(totalTtc)}</span>
            <button className="mob-total-pay-btn" onClick={pos.openPayment}>
              <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
              دفع
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div
        className={`pos-layout ${mobTab === 'cart' ? 'mob-show-cart' : ''}`}
        id="pos-layout"
      >

        {/* ═══ LEFT: Products ═══ */}
        <div className="pos-left" id="pos-left">

          {/* Search bar */}
          <div className="pos-search-bar">
            <div className="pos-inp">
              <span className="ic ic-xs" style={{ color: 'var(--t4)' }}><i className="ti ti-search" /></span>
              <input
                ref={searchRef}
                type="text"
                id="pos-search"
                placeholder="ابحث بالاسم أو الباركود... (F2)"
                value={pos.searchQuery}
                onChange={e => pos.setSearch(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {pos.searchQuery && (
                <button
                  onClick={() => pos.setSearch('')}
                  style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', padding: 0, fontSize: 12 }}
                >
                  <span className="ic ic-xs"><i className="ti ti-x" /></span>
                </button>
              )}
            </div>
            <div className="view-tog">
              <button
                className={`vtb ${view === 'grid' ? 'on' : ''}`}
                onClick={() => setView('grid')}
                title="شبكي"
              >
                <span className="ic ic-xs"><i className="ti ti-grid-dots" /></span>
              </button>
              <button
                className={`vtb ${view === 'list' ? 'on' : ''}`}
                onClick={() => setView('list')}
                title="قائمة"
              >
                <span className="ic ic-xs"><i className="ti ti-list" /></span>
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div className="pos-cats">
            <button
              className={`cat-btn ${!pos.selectedCategory ? 'on' : ''}`}
              onClick={() => pos.setCategory(null)}
            >
              <span className="ic ic-xs"><i className="ti ti-apps" /></span>
              الكل
              <span className="cat-cnt">{variants.length}</span>
            </button>
            {families.map(f => {
              const count = variants.filter(v => v.product?.family_id === f.id).length;
              return (
                <button
                  key={f.id}
                  className={`cat-btn ${pos.selectedCategory === f.id ? 'on' : ''}`}
                  onClick={() => pos.setCategory(f.id)}
                >
                  {f.name}
                  <span className="cat-cnt">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Products grid */}
          <div className="pos-grid-area">
            {loadingVariants ? (
              <div className="no-res">
                <span style={{ fontSize: 36, opacity: 0.3 }}><i className="ti ti-loader" /></span>
                <div>جاري التحميل...</div>
              </div>
            ) : filteredVariants.length === 0 ? (
              <div className="no-res">
                <span style={{ fontSize: 36, opacity: 0.2 }}><i className="ti ti-search" /></span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>لا توجد نتائج</div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>جرّب بحثاً مختلفاً</div>
                <button className="btn btn-p btn-sm" onClick={() => setShowManual(true)}>
                  <span className="ic ic-xs"><i className="ti ti-plus" /></span> إضافة يدوي
                </button>
              </div>
            ) : (
              <div className={`pgrid ${view === 'list' ? 'lv' : ''}`}>
                {filteredVariants.map(variant => {
                  const inCart = pos.items.find(i => i.product_id === variant.id);
                  return (
                    <ProductCard
                      key={variant.id}
                      variant={variant}
                      qtyInCart={inCart?.quantity ?? 0}
                      view={view}
                      onClick={() => pos.addToCart(variant)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Cart ═══ */}
        <Cart
          items={pos.items}
          totals={pos.totals}
          client={pos.client}
          customers={customers}
          onQty={pos.updateQty}
          onDiscount={pos.updateDiscount}
          onRemove={pos.removeItem}
          onSetClient={pos.setClient}
          onHold={() => pos.holdCart()}
          onSell={pos.openPayment}
          onNote={() => {}}
          onClear={pos.clearCart}
          onHeld={() => setShowHeld(true)}
        />
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Payment */}
      <PaymentModal
        open={pos.paymentModalOpen}
        totals={pos.totals}
        client={pos.client}
        paymentModes={paymentModes ?? []}
        onClose={pos.closePayment}
        onConfirm={handleCompleteSale}
      />

      {/* Held carts */}
      <HeldCartsModal
        open={showHeld}
        carts={pos.heldCarts}
        onClose={() => setShowHeld(false)}
        onRestore={pos.restoreCart}
        onDelete={pos.deleteHeldCart}
      />

      {/* Receipt / print preview */}
      <Receipt
        open={showReceipt}
        items={pos.items}
        totals={pos.totals}
        client={pos.client}
        docNumber={lastDocNum}
        onClose={() => setShowReceipt(false)}
        onPrint={() => window.print()}
      />

      {/* Manual product modal */}
      <ManualProductModal
        open={showManual}
        onClose={() => setShowManual(false)}
        onAdd={(name, priceTtc, qty, tvaRate) => {
          const htPrice = priceTtc / (1 + tvaRate / 100);
          const fakeVariant: ProductVariant = {
            id: Date.now(),
            product_id: 0,
            ref: null,
            barcode: null,
            variant_name: null,
            unit_id: null,
            tva_id: null,
            last_purchase_price: 0,
            average_cost_price: 0,
            default_selling_price_ht: htPrice,
            manages_stock: false,
            allow_negative_stock: true,
            has_lots: false,
            has_expiration_date: false,
            min_stock_alert: 0,
            max_stock_alert: 0,
            active: true,
            product: { id: 0, name, slug: '', description: null, family_id: null, brand_id: null, product_type_id: 1, images: null, active: true, created_at: '', updated_at: '' },
            tva: { id: 0, name: `${tvaRate}%`, rate: tvaRate, description: null, active: true, is_default: false, display_order: 0 },
          };
          pos.addToCart(fakeVariant, qty);
          setShowManual(false);
        }}
      />
    </div>
  );
}

// ── Manual product add modal ──────────────────────
function ManualProductModal({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, priceTtc: number, qty: number, tvaRate: number) => void;
}) {
  const [name,  setName]  = useState('');
  const [price, setPrice] = useState('');
  const [qty,   setQty]   = useState('1');
  const [tva,   setTva]   = useState('19');

  const handleAdd = () => {
    if (!name.trim() || !price) return;
    onAdd(name.trim(), parseFloat(price), parseInt(qty) || 1, parseInt(tva));
    setName(''); setPrice(''); setQty('1');
  };

  if (!open) return null;

  return (
    <div className="ov on">
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title">
            <span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-plus" /></span>
            منتج / خدمة يدوية
          </div>
          <div className="m-x" onClick={onClose}><span className="ic ic-xs"><i className="ti ti-x" /></span></div>
        </div>
        <div className="m-body">
          <div className="fgrid">
            <div className="fg s2">
              <label className="req">الوصف</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="اسم المنتج أو الخدمة..."
                autoFocus
              />
            </div>
            <div className="fg">
              <label className="req">السعر TTC</label>
              <div className="inp-row">
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  min={0}
                  inputMode="decimal"
                />
                <div className="inp-suf">دج</div>
              </div>
            </div>
            <div className="fg">
              <label>الكمية</label>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} min={1} inputMode="numeric" />
            </div>
            <div className="fg">
              <label>TVA</label>
              <select value={tva} onChange={e => setTva(e.target.value)}>
                <option value="19">19%</option>
                <option value="9">9%</option>
                <option value="0">0% معفى</option>
              </select>
            </div>
          </div>
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleAdd} disabled={!name.trim() || !price}>
            <span className="ic ic-xs"><i className="ti ti-shopping-cart-plus" /></span> إضافة
          </button>
        </div>
      </div>
    </div>
  );
}
```

/* ====================================================
   ⚠️ هذا الملف عبارة عن دمج لعدة ملفات من المشروع
   ⚠️ الملفات الأصلية مازالت منفصلة داخل المشروع
   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

