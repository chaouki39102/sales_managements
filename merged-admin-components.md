

# =========================================
# 🧠 components\admin
# =========================================

## FILE: resources/js/components/admin/CompanyDrawer/index.tsx
```
// components/admin/CompanyDrawer/index.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DrawerShell, TabBar, FlashBar, Avatar, StatusBadge, ActionBtn, InfoRow, SectionTitle, EmptyState, Spinner, fmtDate, TabDef } from '../shared';
import { companiesApi } from '@/lib/api/admin';
import { useCompanyMutations } from '@/hooks/admin';
import type { AdminCompany, AdminUser } from '@/types/admin';

const PLANS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي', enterprise: 'مؤسسة', custom: 'مخصص',
};

const TABS: TabDef[] = [
  { key: 'info',    label: 'المعلومات', icon: 'ti-building'     },
  { key: 'members', label: 'الأعضاء',  icon: 'ti-users'        },
  { key: 'plan',    label: 'الخطة',    icon: 'ti-crown'        },
  { key: 'notes',   label: 'ملاحظات',  icon: 'ti-notes'        },
  { key: 'danger',  label: 'إجراءات',  icon: 'ti-bolt'         },
];

interface Props {
  company: AdminCompany;
  onClose: (refresh?: boolean) => void;
}

export default function CompanyDrawer({ company: co, onClose }: Props) {
  const [tab,         setTab]         = useState('info');
  const [flash,       setFlash]       = useState<{ ok: boolean; msg: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspend, setShowSuspend] = useState(false);
  const [notes,       setNotes]       = useState(co.notes ?? '');
  const [planForm,    setPlanForm]    = useState({ plan: co.plan, max_users: co.max_users, max_products: co.max_products, max_warehouses: co.max_warehouses });

  const muts = useCompanyMutations();
  const close = (refresh = false) => onClose(refresh);
  const flash$ = (ok: boolean, msg: string) => { setFlash({ ok, msg }); setTimeout(() => setFlash(null), 3000); };

  // أعضاء الشركة
  const { data: membersData, isLoading: mLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['admin', 'companies', co.id, 'users'],
    queryFn:  () => companiesApi.listUsers(co.id),
    enabled:  tab === 'members',
    staleTime: 60_000,
  });
  const members: AdminUser[] = (membersData as any)?.data ?? [];

  return (
    <DrawerShell
      open
      onClose={() => close()}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar id={co.id} name={co.name} size={34} radius={10} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{co.name}</div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>/{co.slug}</div>
          </div>
        </div>
      }
      badge={<StatusBadge active={co.active} suspended={co.is_suspended} />}
    >
      {flash && <FlashBar ok={flash.ok} msg={flash.msg} />}
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ══ INFO ══════════════════════════════════════════════════════════════ */}
      {tab === 'info' && (
        <div style={{ padding: '16px 20px' }}>
          <InfoRow label="الاسم التجاري"  value={co.commercial_name ?? co.name} />
          <InfoRow label="البريد"         value={co.email ?? '—'} />
          <InfoRow label="الهاتف"         value={co.phone ?? '—'} />
          <InfoRow label="النشاط"         value={co.activity ?? '—'} />
          <InfoRow label="NIF"            value={co.nif ?? '—'} />
          <InfoRow label="الخطة"          value={PLANS[co.plan] ?? co.plan} />
          <InfoRow label="المستخدمون"     value={`${co.users_count} / ${co.max_users || '∞'}`} />
          <InfoRow label="الموثّق"        value={co.verified_at ? `✓ ${fmtDate(co.verified_at)}` : '—'} />
          <InfoRow label="المالك"         value={co.owner ? `${co.owner.name} · ${co.owner.email}` : '—'} />
          <InfoRow label="تاريخ الإنشاء"  value={fmtDate(co.created_at)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {co.is_suspended ? (
              <ActionBtn icon="ti-player-play" label="رفع التعليق" variant="success"
                onClick={() => muts.unsuspend.mutate(co.id, { onSuccess: () => { flash$(true, 'تم رفع التعليق'); close(true); } })}
                loading={muts.unsuspend.isPending} />
            ) : (
              <ActionBtn icon="ti-ban" label="تعليق الشركة" variant="danger"
                onClick={() => setShowSuspend(true)} />
            )}
            {co.active ? (
              <ActionBtn icon="ti-x" label="إيقاف التفعيل"
                onClick={() => muts.deactivate.mutate(co.id, { onSuccess: () => { flash$(true, 'تم الإيقاف'); close(true); } })}
                loading={muts.deactivate.isPending} />
            ) : (
              <ActionBtn icon="ti-check" label="تفعيل" variant="success"
                onClick={() => muts.activate.mutate(co.id, { onSuccess: () => { flash$(true, 'تم التفعيل'); close(true); } })}
                loading={muts.activate.isPending} />
            )}
            {!co.verified_at ? (
              <ActionBtn icon="ti-shield-check" label="توثيق" variant="success"
                onClick={() => muts.verify.mutate(co.id, { onSuccess: () => { flash$(true, 'تم التوثيق'); close(true); } })}
                loading={muts.verify.isPending} />
            ) : (
              <ActionBtn icon="ti-shield-off" label="إلغاء التوثيق"
                onClick={() => muts.unverify.mutate(co.id, { onSuccess: () => { flash$(true, 'تم الإلغاء'); close(true); } })}
                loading={muts.unverify.isPending} />
            )}
          </div>

          {/* نموذج التعليق */}
          {showSuspend && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 10, border: '1px solid #ef444433', background: '#ef44440a' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>سبب التعليق</div>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={2} placeholder="أدخل سبب التعليق..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ef444433', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <ActionBtn icon="ti-ban" label="تأكيد التعليق" variant="danger"
                  disabled={!suspendReason.trim()}
                  onClick={() => muts.suspend.mutate(
                    { id: co.id, reason: suspendReason },
                    { onSuccess: () => { flash$(true, 'تم التعليق'); close(true); } }
                  )}
                  loading={muts.suspend.isPending} />
                <ActionBtn icon="ti-x" label="إلغاء" onClick={() => setShowSuspend(false)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MEMBERS ═══════════════════════════════════════════════════════════ */}
      {tab === 'members' && (
        <div style={{ padding: '16px 20px' }}>
          <SectionTitle>أعضاء الشركة ({members.length})</SectionTitle>
          {mLoading ? <Spinner /> : members.length === 0 ? (
            <EmptyState icon="ti-users" text="لا يوجد أعضاء" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg3)' }}>
                  <Avatar id={u.id} name={u.name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t4)' }}>{u.email}</div>
                  </div>
                  <StatusBadge active={u.active} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button title="تجميد/تفعيل"
                      onClick={async () => { await companiesApi.toggleUser(co.id, u.id); refetchMembers(); }}
                      style={iBtn}><i className="ti ti-user-pause" /></button>
                    <button title="إزالة"
                      onClick={async () => {
                        if (!confirm(`إزالة ${u.name}؟`)) return;
                        await companiesApi.removeUser(co.id, u.id);
                        refetchMembers();
                        flash$(true, 'تم الإزالة');
                      }}
                      style={{ ...iBtn, color: '#ef4444', borderColor: '#ef444433' }}><i className="ti ti-user-minus" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ PLAN ══════════════════════════════════════════════════════════════ */}
      {tab === 'plan' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionTitle>تغيير الخطة</SectionTitle>
          <div>
            <label style={lbl}>الخطة</label>
            <select value={planForm.plan} onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value }))} style={sel}>
              {Object.entries(PLANS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {[
            { key: 'max_users',      label: 'حد المستخدمين (0 = غير محدود)' },
            { key: 'max_products',   label: 'حد المنتجات (0 = غير محدود)' },
            { key: 'max_warehouses', label: 'حد المستودعات (0 = غير محدود)' },
          ].map(f => (
            <div key={f.key}>
              <label style={lbl}>{f.label}</label>
              <input type="number" min={0}
                value={(planForm as any)[f.key]}
                onChange={e => setPlanForm(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))}
                style={inp} />
            </div>
          ))}
          <ActionBtn icon="ti-crown" label="تطبيق الخطة"
            onClick={() => muts.changePlan.mutate(
              { id: co.id, ...planForm },
              { onSuccess: () => { flash$(true, 'تم تغيير الخطة'); close(true); } }
            )}
            loading={muts.changePlan.isPending} />
        </div>
      )}

      {/* ══ NOTES ═════════════════════════════════════════════════════════════ */}
      {tab === 'notes' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle>ملاحظات داخلية</SectionTitle>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={8} placeholder="ملاحظات خاصة بالشركة..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif' }}
          />
          <ActionBtn icon="ti-device-floppy" label="حفظ الملاحظات"
            onClick={() => muts.updateNotes.mutate(
              { id: co.id, notes },
              { onSuccess: () => flash$(true, 'تم الحفظ') }
            )}
            loading={muts.updateNotes.isPending} />
        </div>
      )}

      {/* ══ DANGER ════════════════════════════════════════════════════════════ */}
      {tab === 'danger' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ef44441a', border: '1px solid #ef444433', fontSize: 12, color: '#ef4444' }}>
            هذه الإجراءات لا يمكن التراجع عنها.
          </div>
          <ActionBtn icon="ti-database" label="بذر البيانات الأساسية" onClick={() =>
            muts.seed.mutate(co.id, { onSuccess: () => flash$(true, 'تم البذر بنجاح') })}
            loading={muts.seed.isPending} />
          <ActionBtn icon="ti-trash" label="حذف الشركة نهائياً" variant="danger"
            onClick={() => {
              if (!confirm(`حذف شركة "${co.name}" نهائياً؟`)) return;
              muts.remove.mutate(co.id, { onSuccess: () => close(true) });
            }}
            loading={muts.remove.isPending} />
        </div>
      )}
    </DrawerShell>
  );
}

const iBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7, border: '1px solid var(--b2)',
  background: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 6 };
const sel: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif' };
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box' };
```

## FILE: resources/js/components/admin/shared.tsx
```
// components/admin/shared.tsx
// مكونات مشتركة خفيفة لوحة الأدمن

// ─── Avatar ───────────────────────────────────────────────────────────────────

const GRADS = [
  'linear-gradient(135deg,#0a8a5c,#0dbf84)',
  'linear-gradient(135deg,#1a4fd6,#60a5fa)',
  'linear-gradient(135deg,#6920d4,#a78bfa)',
  'linear-gradient(135deg,#b87d0a,#fbbf24)',
  'linear-gradient(135deg,#c43a0a,#fb923c)',
];

export const grad   = (id: number) => GRADS[id % GRADS.length];
export const inits  = (n: string)  =>
  n.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
export const fmtDate= (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-DZ') : '—';
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('ar-DZ', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

interface AvatarProps { id: number; name: string; size?: number; radius?: number | string; }
export function Avatar({ id, name, size = 32, radius = '50%' }: AvatarProps) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: grad(id), flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff',
    }}>
      {inits(name)}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

interface SBProps { active: boolean; suspended?: boolean; size?: number; }
export function StatusBadge({ active, suspended, size = 11 }: SBProps) {
  const label = suspended ? 'موقوف' : active ? 'نشط' : 'معطل';
  const color = suspended ? '#f59e0b' : active ? '#10b981' : '#6b7280';
  return (
    <span style={{
      fontSize: size, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: color + '22', color,
    }}>{label}</span>
  );
}

// ─── DrawerShell ──────────────────────────────────────────────────────────────

interface DrawerProps {
  open:     boolean;
  onClose:  () => void;
  title:    React.ReactNode;
  subtitle?: string;
  badge?:   React.ReactNode;
  children: React.ReactNode;
  width?:   number;
}
export function DrawerShell({ open, onClose, title, subtitle, badge, children, width = 500 }: DrawerProps) {
  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,.45)', direction: 'rtl' }}
    >
      <div style={{ width, maxWidth: '100vw', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,.2)', maxHeight: '100vh', animation: 'slideInRight .22s ease' }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:none;opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {badge}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--t4)', padding: 4, lineHeight: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

export interface TabDef { key: string; label: string; icon: string; }
interface TabBarProps { tabs: TabDef[]; active: string; onChange: (k: string) => void; }
export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', padding: '0 16px', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '9px 12px', border: 'none', background: 'none',
          borderBottom: active === t.key ? '2px solid var(--em)' : '2px solid transparent',
          color: active === t.key ? 'var(--em)' : 'var(--t3)',
          fontWeight: active === t.key ? 700 : 500,
          fontSize: 12, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        }}>
          <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />{t.label}
        </button>
      ))}
    </div>
  );
}

// ─── FlashBar ─────────────────────────────────────────────────────────────────

export function FlashBar({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div style={{
      padding: '8px 20px', fontSize: 12, fontWeight: 600,
      background: ok ? '#10b9811a' : '#ef44441a',
      color: ok ? '#10b981' : '#ef4444',
    }}>
      {ok ? '✓' : '✗'} {msg}
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--b1)' }}>
      <span style={{ width: 130, fontSize: 12, color: 'var(--t4)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────

interface ABProps {
  icon: string; label: string; onClick: () => void;
  variant?: 'default' | 'danger' | 'success'; disabled?: boolean; loading?: boolean;
}
export function ActionBtn({ icon, label, onClick, variant = 'default', disabled, loading }: ABProps) {
  const colors = {
    default: { bg: 'var(--bg3)', border: 'var(--b2)',      color: 'var(--t2)' },
    danger:  { bg: '#ef44440d', border: '#ef444433',       color: '#ef4444'   },
    success: { bg: '#10b9810d', border: '#10b98133',       color: '#10b981'   },
  }[variant];
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 14px', borderRadius: 8, border: `1px solid ${colors.border}`,
        background: colors.bg, color: colors.color,
        fontSize: 12, fontWeight: 700, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? .6 : 1, fontFamily: 'Tajawal, sans-serif',
        flex: 1,
      }}
    >
      <i className={`ti ${loading ? 'ti-loader' : icon}`} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
      {label}
    </button>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t4)' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 32, display: 'block', marginBottom: 10, opacity: .3 }} />
      <p style={{ margin: 0, fontSize: 13 }}>{text}</p>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <i className="ti ti-loader" style={{ fontSize: 24, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}
```

## FILE: resources/js/components/admin/UserDrawer/CompaniesTab.tsx
```
// components/admin/UserDrawer/CompaniesTab.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api/admin';
import { usersApi } from '@/lib/api/admin';
import { Avatar, SectionTitle, EmptyState, Spinner, StatusBadge } from '../shared';
import type { AdminUser, AdminCompany } from '@/types/admin';

interface Props {
  user:    AdminUser;
  onFlash: (ok: boolean, msg: string) => void;
  onRefreshUser: () => void;
}

export function CompaniesTab({ user: u, onFlash, onRefreshUser }: Props) {
  const [searchQ, setSearchQ] = useState('');
  const [transferId, setTransferId] = useState('');
  const [searching,  setSearching]  = useState(false);
  const [searchRes,  setSearchRes]  = useState<AdminCompany[]>([]);

  // شركات المستخدم الحالية
  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', u.id, 'companies'],
    queryFn:  () => usersApi.companies(u.id),
    staleTime: 60_000,
  });
  const companies: AdminCompany[] = (rawData as any)?.data ?? rawData ?? [];

  // بحث في الشركات للنقل
  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await companiesApi.list({ search: searchQ, per_page: 8 } as any);
      setSearchRes((res as any)?.data ?? []);
    } finally { setSearching(false); }
  };

  const handleRemove = async (coId: number, coName: string) => {
    if (!confirm(`إزالة ${u.name} من ${coName}؟`)) return;
    try {
      await companiesApi.removeUser(coId, u.id);
      refetch(); onRefreshUser();
      onFlash(true, 'تم الإزالة');
    } catch { onFlash(false, 'فشلت الإزالة'); }
  };

  const handleToggle = async (coId: number) => {
    try {
      await companiesApi.toggleUser(coId, u.id);
      refetch();
    } catch { onFlash(false, 'فشل التغيير'); }
  };

  const handleAdd = async (co: AdminCompany) => {
    const already = companies.find(c => c.id === co.id);
    if (already) { onFlash(false, 'المستخدم عضو بالفعل في هذه الشركة'); return; }
    try {
      await companiesApi.addUser(co.id, u.id, 'member');
      refetch(); onRefreshUser(); setSearchRes([]); setSearchQ('');
      onFlash(true, `تمت إضافة ${u.name} لـ ${co.name}`);
    } catch { onFlash(false, 'فشلت الإضافة'); }
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── الشركات الحالية ── */}
      <div>
        <SectionTitle>الشركات المرتبطة ({companies.length})</SectionTitle>

        {isLoading ? <Spinner /> : companies.length === 0 ? (
          <EmptyState icon="ti-building-off" text="لا ينتمي لأي شركة" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {companies.map(co => (
              <div key={co.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg3)' }}>
                <Avatar id={co.id} name={co.name} size={30} radius={8} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{co.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                    /{co.slug}
                    {(co as any).pivot?.role && ` · ${(co as any).pivot.role}`}
                  </div>
                </div>
                <StatusBadge active={(co as any).pivot?.active ?? true} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    title="تجميد/تفعيل"
                    onClick={() => handleToggle(co.id)}
                    style={iconBtn}
                  ><i className="ti ti-user-pause" /></button>
                  <button
                    title="إزالة"
                    onClick={() => handleRemove(co.id, co.name)}
                    style={{ ...iconBtn, color: '#ef4444', borderColor: '#ef444433' }}
                  ><i className="ti ti-building-minus" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── إضافة/نقل لشركة ── */}
      <div style={{ borderTop: '1px solid var(--b2)', paddingTop: 16 }}>
        <SectionTitle>إضافة / نقل إلى شركة</SectionTitle>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ابحث باسم الشركة..."
            style={inputStyle}
          />
          <button onClick={handleSearch} disabled={searching} style={searchBtn}>
            {searching
              ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
              : <i className="ti ti-search" />}
          </button>
        </div>

        {searchRes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {searchRes.map(co => (
              <div
                key={co.id}
                onClick={() => handleAdd(co)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: 'var(--bg3)', transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg4)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
              >
                <Avatar id={co.id} name={co.name} size={26} radius={7} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{co.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>/{co.slug}</div>
                </div>
                <i className="ti ti-plus" style={{ fontSize: 14, color: 'var(--em)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
};
const searchBtn: React.CSSProperties = {
  padding: '0 12px', borderRadius: 8, border: '1px solid var(--b2)',
  background: 'var(--em)', color: '#fff', cursor: 'pointer', fontSize: 14,
};
const iconBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  border: '1px solid var(--b2)', background: 'none',
  cursor: 'pointer', color: 'var(--t3)', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
```

## FILE: resources/js/components/admin/UserDrawer/index.tsx
```
// components/admin/UserDrawer/index.tsx
import { useState } from 'react';
import { DrawerShell, TabBar, FlashBar, Avatar, StatusBadge, ActionBtn, SectionTitle, TabDef } from '../shared';
import { InfoTab }      from './InfoTab';
import { CompaniesTab } from './CompaniesTab';
import { useUserMutations } from '@/hooks/admin';
import type { AdminUser } from '@/types/admin';

const TABS: TabDef[] = [
  { key: 'info',      label: 'المعلومات',    icon: 'ti-user'    },
  { key: 'companies', label: 'الشركات',      icon: 'ti-building'},
  { key: 'password',  label: 'كلمة المرور',  icon: 'ti-lock'    },
  { key: 'danger',    label: 'إجراءات',      icon: 'ti-bolt'    },
];

interface Props {
  user:    AdminUser;
  onClose: (refresh?: boolean) => void;
}

export default function UserDrawer({ user: u, onClose }: Props) {
  const [tab,   setTab]   = useState('info');
  const [pwd,   setPwd]   = useState('');
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  const muts = useUserMutations();

  const flashMsg = (ok: boolean, msg: string) => {
    setFlash({ ok, msg });
    setTimeout(() => setFlash(null), 3000);
  };

  const close = (refresh = false) => onClose(refresh);

  return (
    <DrawerShell
      open
      onClose={() => close()}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar id={u.id} name={u.name} size={34} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{u.name}</div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>{u.email}</div>
          </div>
        </div>
      }
      badge={<StatusBadge active={u.active} />}
    >
      {flash && <FlashBar ok={flash.ok} msg={flash.msg} />}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ── info ── */}
      {tab === 'info' && (
        <InfoTab
          user={u}
          onToggle={() => muts.toggleActive.mutate(u.id, { onSuccess: () => { flashMsg(true, u.active ? 'تم التعطيل' : 'تم التفعيل'); close(true); } })}
          onImpersonate={() => muts.impersonate.mutate(u.id)}
          loading={muts.toggleActive.isPending || muts.impersonate.isPending}
        />
      )}

      {/* ── companies ── */}
      {tab === 'companies' && (
        <CompaniesTab
          user={u}
          onFlash={flashMsg}
          onRefreshUser={() => close(true)}
        />
      )}

      {/* ── password ── */}
      {tab === 'password' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--t3)' }}>
            تغيير كلمة المرور — ستُلغى جميع جلسات المستخدم.
          </p>
          <input
            type="password" value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)"
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', color: 'var(--t1)', fontSize: 13 }}
          />
          <ActionBtn
            icon="ti-lock-check" label="تغيير كلمة المرور"
            onClick={() => {
              if (pwd.length < 8) { flashMsg(false, 'كلمة المرور قصيرة'); return; }
              muts.resetPassword.mutate(
                { id: u.id, pwd },
                { onSuccess: () => { flashMsg(true, 'تم التغيير'); setPwd(''); } }
              );
            }}
            disabled={!pwd || pwd.length < 8}
            loading={muts.resetPassword.isPending}
          />
        </div>
      )}

      {/* ── danger ── */}
      {tab === 'danger' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ef44441a', border: '1px solid #ef444433', fontSize: 12, color: '#ef4444' }}>
            هذه الإجراءات لا يمكن التراجع عنها.
          </div>
          <ActionBtn
            icon="ti-trash" label="حذف المستخدم نهائياً" variant="danger"
            onClick={() => {
              if (!confirm(`حذف "${u.name}" نهائياً؟`)) return;
              muts.remove.mutate(u.id, { onSuccess: () => close(true) });
            }}
            loading={muts.remove.isPending}
          />
        </div>
      )}
    </DrawerShell>
  );
}
```

## FILE: resources/js/components/admin/UserDrawer/InfoTab.tsx
```
// components/admin/UserDrawer/InfoTab.tsx
import { InfoRow, ActionBtn, fmtDate } from '../shared';
import type { AdminUser } from '@/types/admin';

interface Props {
  user:     AdminUser;
  onToggle: () => void;
  onImpersonate: () => void;
  loading?: boolean;
}

export function InfoTab({ user: u, onToggle, onImpersonate, loading }: Props) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <InfoRow label="الاسم"        value={u.name} />
      <InfoRow label="البريد"       value={u.email} />
      <InfoRow label="الهاتف"       value={u.phone ?? '—'} />
      <InfoRow label="الدور"        value={u.role ?? '—'} />
      <InfoRow label="الشركات"      value={u.companies_count ?? 0} />
      <InfoRow label="آخر دخول"     value={fmtDate(u.last_login_at)} />
      <InfoRow label="تاريخ الإنشاء" value={fmtDate(u.created_at)} />

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <ActionBtn icon="ti-login"      label="دخول كهذا المستخدم"       onClick={onImpersonate} loading={loading} />
        <ActionBtn
          icon={u.active ? 'ti-user-off' : 'ti-user-check'}
          label={u.active ? 'تعطيل' : 'تفعيل'}
          variant={u.active ? 'danger' : 'success'}
          onClick={onToggle}
          loading={loading}
        />
      </div>
    </div>
  );
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

