

# =========================================
# 📘 components
# =========================================

## FILE: resources/js/components/admin/CompanyDrawer/index.tsx
```
// components/admin/CompanyDrawer/index.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DrawerShell, TabBar, FlashBar, Avatar, StatusBadge, ActionBtn,
  InfoRow, SectionTitle, EmptyState, Spinner, fmtDate,
} from '../shared';
import type { TabDef } from '../shared';
import { companiesApi } from '@/lib/api/admin';
import { useCompanyMutations } from '@/hooks/admin';
import type { AdminCompany, AdminUser } from '@/types/admin';

const PLANS: Record<string, string> = {
  free:         'مجاني',
  starter:      'مبتدئ',
  professional: 'احترافي',
  enterprise:   'مؤسسة',
  custom:       'مخصص',
};

const TABS: TabDef[] = [
  { key: 'info',    label: 'المعلومات', icon: 'ti-building' },
  { key: 'members', label: 'الأعضاء',  icon: 'ti-users'    },
  { key: 'plan',    label: 'الخطة',    icon: 'ti-crown'    },
  { key: 'notes',   label: 'ملاحظات',  icon: 'ti-notes'    },
  { key: 'danger',  label: 'إجراءات',  icon: 'ti-bolt'     },
];

interface Props {
  company: AdminCompany;
  onClose: (refresh?: boolean) => void;
}

export default function CompanyDrawer({ company: co, onClose }: Props) {
  const [tab,           setTab]           = useState('info');
  const [flash,         setFlash]         = useState<{ ok: boolean; msg: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspend,   setShowSuspend]   = useState(false);
  const [notes,         setNotes]         = useState(co.notes ?? '');
  const [planForm,      setPlanForm]      = useState({
    plan:           co.plan,
    max_users:      co.max_users,
    max_products:   co.max_products,
    max_warehouses: co.max_warehouses,
  });

  const muts = useCompanyMutations();
  const close = (refresh = false) => onClose(refresh);

  // ─── Flash helper ────────────────────────────────────────────────────────────
  const flash$ = (ok: boolean, msg: string) => {
    setFlash({ ok, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  // ─── Error helper — يستخرج رسالة الخطأ من ApiError أو أي كائن آخر ──────────
  const errMsg = (e: unknown): string => {
    if (!e) return 'حدث خطأ غير متوقع';
    if (typeof e === 'object' && 'message' in e) return (e as Error).message;
    return String(e);
  };

  // ─── Shorthand mutation caller مع onSuccess + onError ──────────────────────
  const run = (
    mutation: { mutate: (v: any, opts: any) => void; isPending: boolean },
    value: any,
    successMsg: string,
    refreshOnSuccess = true,
  ) => {
    mutation.mutate(value, {
      onSuccess: () => {
        flash$(true, successMsg);
        if (refreshOnSuccess) close(true);
      },
      onError: (e: unknown) => flash$(false, errMsg(e)),
    });
  };

  // ─── أعضاء الشركة ────────────────────────────────────────────────────────────
  const {
    data:     membersData,
    isLoading: mLoading,
    refetch:  refetchMembers,
  } = useQuery({
    queryKey: ['admin', 'companies', co.id, 'users'],
    queryFn:  () => companiesApi.listUsers(co.id),
    enabled:  tab === 'members',
    staleTime: 60_000,
  });

  // listUsers يُعيد Paginated<AdminUser> من apiGetPaginated (raw response.data)
  // البنية: { data: AdminUser[], meta: {...} }
  const members: AdminUser[] = (membersData as any)?.data ?? [];

  // ─── Helpers لأعضاء الشركة (مع error handling) ───────────────────────────────
  const handleToggleUser = async (u: AdminUser) => {
    try {
      await companiesApi.toggleUser(co.id, u.id);
      refetchMembers();
    } catch (e) {
      flash$(false, errMsg(e));
    }
  };

  const handleRemoveUser = async (u: AdminUser) => {
    if (!confirm(`إزالة ${u.name}؟`)) return;
    try {
      await companiesApi.removeUser(co.id, u.id);
      refetchMembers();
      flash$(true, 'تم إزالة المستخدم');
    } catch (e) {
      flash$(false, errMsg(e));
    }
  };

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

      {/* ══ INFO ═══════════════════════════════════════════════════════════════ */}
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
                onClick={() => run(muts.unsuspend, co.id, 'تم رفع التعليق')}
                loading={muts.unsuspend.isPending} />
            ) : (
              <ActionBtn icon="ti-ban" label="تعليق الشركة" variant="danger"
                onClick={() => setShowSuspend(true)} />
            )}

            {co.active ? (
              <ActionBtn icon="ti-x" label="إيقاف التفعيل"
                onClick={() => run(muts.deactivate, co.id, 'تم إيقاف التفعيل')}
                loading={muts.deactivate.isPending} />
            ) : (
              <ActionBtn icon="ti-check" label="تفعيل" variant="success"
                onClick={() => run(muts.activate, co.id, 'تم التفعيل')}
                loading={muts.activate.isPending} />
            )}

            {!co.verified_at ? (
              <ActionBtn icon="ti-shield-check" label="توثيق" variant="success"
                onClick={() => run(muts.verify, co.id, 'تم التوثيق')}
                loading={muts.verify.isPending} />
            ) : (
              <ActionBtn icon="ti-shield-off" label="إلغاء التوثيق"
                onClick={() => run(muts.unverify, co.id, 'تم إلغاء التوثيق')}
                loading={muts.unverify.isPending} />
            )}
          </div>

          {/* نموذج التعليق */}
          {showSuspend && (
            <div style={{
              marginTop: 14, padding: 14, borderRadius: 10,
              border: '1px solid #ef444433', background: '#ef44440a',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
                سبب التعليق
              </div>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={2} placeholder="أدخل سبب التعليق..."
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid #ef444433', background: 'var(--bg3)',
                  color: 'var(--t1)', fontSize: 13, resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <ActionBtn icon="ti-ban" label="تأكيد التعليق" variant="danger"
                  disabled={!suspendReason.trim()}
                  onClick={() => run(
                    muts.suspend,
                    { id: co.id, reason: suspendReason },
                    'تم التعليق',
                  )}
                  loading={muts.suspend.isPending} />
                <ActionBtn icon="ti-x" label="إلغاء"
                  onClick={() => { setShowSuspend(false); setSuspendReason(''); }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MEMBERS ════════════════════════════════════════════════════════════ */}
      {tab === 'members' && (
        <div style={{ padding: '16px 20px' }}>
          <SectionTitle>أعضاء الشركة ({members.length})</SectionTitle>

          {mLoading ? <Spinner /> : members.length === 0 ? (
            <EmptyState icon="ti-users" text="لا يوجد أعضاء" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.map(u => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10, background: 'var(--bg3)',
                }}>
                  <Avatar id={u.id} name={u.name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t4)' }}>{u.email}</div>
                  </div>
                  <StatusBadge active={u.active} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button title="تجميد/تفعيل"
                      onClick={() => handleToggleUser(u)}
                      style={iBtn}>
                      <i className="ti ti-user-pause" />
                    </button>
                    <button title="إزالة"
                      onClick={() => handleRemoveUser(u)}
                      style={{ ...iBtn, color: '#ef4444', borderColor: '#ef444433' }}>
                      <i className="ti ti-user-minus" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ PLAN ═══════════════════════════════════════════════════════════════ */}
      {tab === 'plan' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionTitle>تغيير الخطة</SectionTitle>

          <div>
            <label style={lbl}>الخطة</label>
            <select
              value={planForm.plan}
              onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value }))}
              style={sel}
            >
              {Object.entries(PLANS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {([
            { key: 'max_users',      label: 'حد المستخدمين (0 = غير محدود)'   },
            { key: 'max_products',   label: 'حد المنتجات (0 = غير محدود)'     },
            { key: 'max_warehouses', label: 'حد المستودعات (0 = غير محدود)'   },
          ] as const).map(f => (
            <div key={f.key}>
              <label style={lbl}>{f.label}</label>
              <input
                type="number" min={0}
                value={planForm[f.key]}
                onChange={e => setPlanForm(p => ({
                  ...p,
                  [f.key]: parseInt(e.target.value, 10) || 0,
                }))}
                style={inp}
              />
            </div>
          ))}

          <ActionBtn icon="ti-crown" label="تطبيق الخطة"
            onClick={() => run(
              muts.changePlan,
              {
                id:             co.id,
                plan:           planForm.plan,
                // نُرسل null بدل 0 لكي يتجاهله array_filter في الباكاند
                // أو نُرسل القيمة كما هي — الباكاند يتعامل معها
                max_users:      planForm.max_users      || undefined,
                max_products:   planForm.max_products   || undefined,
                max_warehouses: planForm.max_warehouses || undefined,
              },
              'تم تغيير الخطة',
            )}
            loading={muts.changePlan.isPending} />
        </div>
      )}

      {/* ══ NOTES ══════════════════════════════════════════════════════════════ */}
      {tab === 'notes' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle>ملاحظات داخلية</SectionTitle>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={8} placeholder="ملاحظات خاصة بالشركة..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--b2)', background: 'var(--bg3)',
              color: 'var(--t1)', fontSize: 13, resize: 'vertical',
              boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif',
            }}
          />
          {/* ملاحظات: لا نُغلق الـ drawer بعد الحفظ — نبقى في نفس التاب */}
          <ActionBtn icon="ti-device-floppy" label="حفظ الملاحظات"
            onClick={() => run(
              muts.updateNotes,
              { id: co.id, notes },
              'تم حفظ الملاحظات',
              false, // لا نُغلق الدرور بعد الحفظ
            )}
            loading={muts.updateNotes.isPending} />
        </div>
      )}

      {/* ══ DANGER ═════════════════════════════════════════════════════════════ */}
      {tab === 'danger' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: '#ef44441a', border: '1px solid #ef444433',
            fontSize: 12, color: '#ef4444',
          }}>
            هذه الإجراءات لا يمكن التراجع عنها.
          </div>

          <ActionBtn icon="ti-database" label="بذر البيانات الأساسية"
            onClick={() => run(muts.seed, co.id, 'تم البذر بنجاح', false)}
            loading={muts.seed.isPending} />

          <ActionBtn icon="ti-trash" label="حذف الشركة نهائياً" variant="danger"
            onClick={() => {
              if (!confirm(`حذف شركة "${co.name}" نهائياً؟`)) return;
              muts.remove.mutate(co.id, {
                onSuccess: () => close(true),
                onError:   (e: unknown) => flash$(false, errMsg(e)),
              });
            }}
            loading={muts.remove.isPending} />
        </div>
      )}
    </DrawerShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const iBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7, border: '1px solid var(--b2)',
  background: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--t4)', marginBottom: 6,
};

const sel: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box',
};
```

## FILE: resources/js/components/admin/shared.tsx
```
/**
 * components/admin/shared.tsx
 * ══════════════════════════════════════════════════════════════
 * مكونات مشتركة لـ Admin Drawers — محوَّلة بالكامل إلى Tailwind
 * ══════════════════════════════════════════════════════════════
 */
import React, { useEffect } from 'react'
import { cn } from '@/lib/cn'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TabDef {
  key:   string
  label: string
  icon?: string   // tabler icon class e.g. 'ti-building'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ════════════════════════════════════════════════════════════
// DRAWER SHELL
// ════════════════════════════════════════════════════════════
interface DrawerShellProps {
  open:     boolean
  onClose:  () => void
  title:    React.ReactNode
  badge?:   React.ReactNode
  children: React.ReactNode
}

export function DrawerShell({ open, onClose, title, badge, children }: DrawerShellProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[3px] z-[10000]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        'fixed top-0 bottom-0 right-0 z-[10001]',
        'w-full max-w-[480px]',
        'bg-[var(--bg2)] border-l border-[var(--b2)]',
        'shadow-[var(--shadow3)]',
        'flex flex-col',
        'animate-slide-right',   // defined in theme.css @utility
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--b2)] flex-shrink-0">
          <div className="flex-1 min-w-0">{title}</div>
          {badge}
          <button
            onClick={onClose}
            className={cn(
              'w-7 h-7 rounded-[7px] bg-[var(--bg3)] border border-[var(--b2)]',
              'flex items-center justify-center flex-shrink-0',
              'text-[var(--t3)] text-[13px] cursor-pointer transition-all duration-150',
              'hover:bg-[var(--redb)] hover:border-[var(--redbo)] hover:text-[var(--red)]',
            )}
          >
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════
// TAB BAR
// ════════════════════════════════════════════════════════════
export function TabBar({ tabs, active, onChange }: {
  tabs: TabDef[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex border-b border-[var(--b2)] overflow-x-auto scrollbar-none flex-shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-[6px] px-4 py-[10px]',
            'text-[12.5px] font-bold whitespace-nowrap select-none cursor-pointer',
            'border-b-2 -mb-px transition-colors duration-150',
            tab.key === active
              ? 'text-[var(--em)] border-[var(--em)]'
              : 'text-[var(--t4)] border-transparent hover:text-[var(--t2)]',
          )}
        >
          {tab.icon && <i className={`ti ${tab.icon} text-[13px]`} />}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// FLASH BAR
// ════════════════════════════════════════════════════════════
export function FlashBar({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={cn(
      'flex items-center gap-[10px] px-4 py-[10px] text-[12.5px] font-bold flex-shrink-0',
      ok
        ? 'bg-[var(--emb)] border-b border-[var(--embo)] text-[var(--em)]'
        : 'bg-[var(--redb)] border-b border-[var(--redbo)] text-[var(--red)]',
    )}>
      <i className={`ti ${ok ? 'ti-circle-check' : 'ti-alert-circle'}`} />
      {msg}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// AVATAR (Admin version — accepts id + radius)
// ════════════════════════════════════════════════════════════
const GRADS = [
  'from-[#0a8a5c] to-[#0dbf84]',
  'from-[#6920d4] to-[#a78bfa]',
  'from-[#1a4fd6] to-[#60a5fa]',
  'from-[#b87d0a] to-[#fbbf24]',
  'from-[#d42b2b] to-[#f87171]',
  'from-[#0d7a8c] to-[#67e8f9]',
  'from-[#c43a0a] to-[#fb923c]',
]

export function Avatar({ id, name, size = 32, radius = 50 }: {
  id?: number | string
  name?: string
  size?: number
  radius?: number
}) {
  const initials = name ? name.slice(0, 2) : '؟'
  const idx = typeof id === 'number' ? id % GRADS.length : 0
  const grad = GRADS[idx]
  const br = radius >= 50 ? 'rounded-full' : ''

  return (
    <div
      className={cn(
        'flex items-center justify-center font-extrabold text-white flex-shrink-0',
        `bg-gradient-to-br ${grad}`,
        !br && 'rounded-[var(--r2)]',
        br,
      )}
      style={{ width: size, height: size, borderRadius: radius >= 50 ? '50%' : radius }}
    >
      <span style={{ fontSize: size * 0.35 }}>{initials}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// STATUS BADGE
// ════════════════════════════════════════════════════════════
export function StatusBadge({ active, suspended }: { active?: boolean; suspended?: boolean }) {
  if (suspended) return (
    <span className="inline-flex items-center gap-1 px-[9px] py-[3px] rounded-[20px] text-[11px] font-bold border bg-[var(--redb)] text-[var(--red)] border-[var(--redbo)]">
      <span className="w-[5px] h-[5px] rounded-full bg-current opacity-75" />
      موقوف
    </span>
  )
  if (active) return (
    <span className="inline-flex items-center gap-1 px-[9px] py-[3px] rounded-[20px] text-[11px] font-bold border bg-[#dcfce7] text-[#15803d] border-[#86efac]">
      <span className="w-[5px] h-[5px] rounded-full bg-current opacity-75" />
      نشط
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-[9px] py-[3px] rounded-[20px] text-[11px] font-bold border bg-[var(--bg4)] text-[var(--t3)] border-[var(--b3)]">
      <span className="w-[5px] h-[5px] rounded-full bg-current opacity-75" />
      غير نشط
    </span>
  )
}

// ════════════════════════════════════════════════════════════
// ACTION BUTTON
// ════════════════════════════════════════════════════════════
type ActionVariant = 'default' | 'danger' | 'success'

const actionVariants: Record<ActionVariant, string> = {
  default: 'bg-[var(--bg3)] border-[var(--b3)] text-[var(--t2)] hover:bg-[var(--bg4)] hover:text-[var(--t1)]',
  danger:  'bg-[var(--redb)] border-[var(--redbo)] text-[var(--red)] hover:bg-[var(--red)] hover:text-white',
  success: 'bg-[var(--emb)] border-[var(--embo)] text-[var(--em)] hover:bg-[var(--em)] hover:text-white',
}

export function ActionBtn({ icon, label, variant = 'default', onClick, loading }: {
  icon:     string
  label:    string
  variant?: ActionVariant
  onClick:  () => void
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-[6px] px-3 py-[7px]',
        'rounded-[var(--r2)] border text-[12.5px] font-bold',
        'cursor-pointer transition-all duration-150 font-sans',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        actionVariants[variant],
      )}
    >
      {loading
        ? <span className="w-[13px] h-[13px] border-2 border-current border-t-transparent rounded-full animate-spin" />
        : <i className={`ti ${icon} text-[13px]`} />
      }
      {label}
    </button>
  )
}

// ════════════════════════════════════════════════════════════
// INFO ROW
// ════════════════════════════════════════════════════════════
export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-[9px] border-b border-[var(--b1)] gap-3 last:border-b-0">
      <span className="text-[12px] text-[var(--t3)] flex-shrink-0">{label}</span>
      <span className="text-[13px] font-bold text-[var(--t1)] text-left">{value}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SECTION TITLE
// ════════════════════════════════════════════════════════════
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-extrabold text-[var(--t4)] uppercase tracking-[1.2px] mb-[10px]">
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// EMPTY STATE (Admin version)
// ════════════════════════════════════════════════════════════
export function EmptyState({ icon, text }: { icon?: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-[var(--t4)]">
      {icon && <i className={`ti ${icon} text-[32px] opacity-30`} />}
      <span className="text-[13px]">{text}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SPINNER
// ════════════════════════════════════════════════════════════
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div className="flex justify-center py-8">
      <span
        className="border-2 border-[var(--b3)] border-t-[var(--em)] rounded-full animate-spin"
        style={{ width: size, height: size }}
      />
    </div>
  )
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
// ════════════════════════════════════════════════════════════════════════════
// components/admin/CompanyDrawer/index.tsx  ← النسخة المُصلحة
//
// المشاكل الأصلية:
//
//   1. muts.suspend.mutate(co.id, ...)      ← كان يتوقع { slug, reason }
//      muts.unsuspend.mutate(co.id, ...)    ← كان يتوقع slug: string
//      muts.activate/deactivate/verify/unverify — نفس المشكلة
//      muts.changePlan.mutate({ id, ... })  ← كان يتوقع { slug, ... }
//      → الآن كلها تقبل id: number ✅
//
//   2. companiesApi.listUsers غير موجودة في الكود القديم
//      → أُضيفت في companies.ts ✅
//
//   3. muts.seed غير موجودة في useCompanyMutations
//      → أُضيفت في useAdminCompanies.ts ✅
//
//   4. بنية الـ response: members كانت (membersData as any)?.data ?? []
//      لكن apiGetPaginated يُعيد { data: [...], meta: {...} } مباشرة
//      → النتيجة الصحيحة: membersData?.data ?? []
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DrawerShell, TabBar, FlashBar, Avatar, StatusBadge,
  ActionBtn, InfoRow, SectionTitle, EmptyState, Spinner,
  fmtDate,
} from '../shared';
import type { TabDef } from '../shared';
import { companiesApi } from '@/lib/api/admin';
import { useCompanyMutations } from '@/hooks/admin';
import type { AdminCompany, AdminUser } from '@/types/admin';

const PLANS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي',
  enterprise: 'مؤسسة', custom: 'مخصص',
};

const TABS: TabDef[] = [
  { key: 'info',    label: 'المعلومات', icon: 'ti-building' },
  { key: 'members', label: 'الأعضاء',  icon: 'ti-users'    },
  { key: 'plan',    label: 'الخطة',    icon: 'ti-crown'    },
  { key: 'notes',   label: 'ملاحظات',  icon: 'ti-notes'    },
  { key: 'danger',  label: 'إجراءات',  icon: 'ti-bolt'     },
];

interface Props {
  company: AdminCompany;
  onClose: (refresh?: boolean) => void;
}

export default function CompanyDrawer({ company: co, onClose }: Props) {
  const [tab,          setTab]          = useState('info');
  const [flash,        setFlash]        = useState<{ ok: boolean; msg: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspend,  setShowSuspend]  = useState(false);
  const [notes,        setNotes]        = useState(co.notes ?? '');
  const [planForm,     setPlanForm]     = useState({
    plan:           co.plan,
    max_users:      co.max_users,
    max_products:   co.max_products,
    max_warehouses: co.max_warehouses,
  });

  const muts  = useCompanyMutations();
  const close = (refresh = false) => onClose(refresh);

  const flash$ = (ok: boolean, msg: string) => {
    setFlash({ ok, msg });
    setTimeout(() => setFlash(null), 3000);
  };

  // ── أعضاء الشركة ──────────────────────────────────────────────────────────
  // ✅ companiesApi.listUsers أُضيفت في companies.ts
  const {
    data: membersData,
    isLoading: mLoading,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['admin', 'companies', co.id, 'users'],
    queryFn:  () => companiesApi.listUsers(co.id),
    enabled:  tab === 'members',
    staleTime: 60_000,
  });

  // ✅ apiGetPaginated يُعيد { data:[...], meta:{...} } مباشرة
  const members: AdminUser[] = membersData?.data ?? [];

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
          <InfoRow label="البريد"          value={co.email ?? '—'} />
          <InfoRow label="الهاتف"          value={co.phone ?? '—'} />
          <InfoRow label="النشاط"          value={co.activity ?? '—'} />
          <InfoRow label="NIF"             value={co.nif ?? '—'} />
          <InfoRow label="الخطة"           value={PLANS[co.plan] ?? co.plan} />
          <InfoRow label="المستخدمون"      value={`${co.users_count ?? 0} / ${co.max_users || '∞'}`} />
          <InfoRow label="الموثّق"         value={co.verified_at ? `✓ ${fmtDate(co.verified_at)}` : '—'} />
          <InfoRow label="المالك"          value={co.owner ? `${co.owner.name} · ${co.owner.email}` : '—'} />
          <InfoRow label="تاريخ الإنشاء"   value={fmtDate(co.created_at)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {/* ✅ suspend/unsuspend — id بدل slug */}
            {co.is_suspended ? (
              <ActionBtn
                icon="ti-player-play" label="رفع التعليق" variant="success"
                onClick={() => muts.unsuspend.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم رفع التعليق'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل رفع التعليق'),
                })}
                loading={muts.unsuspend.isPending}
              />
            ) : (
              <ActionBtn
                icon="ti-ban" label="تعليق الشركة" variant="danger"
                onClick={() => setShowSuspend(true)}
              />
            )}

            {/* ✅ activate/deactivate — id بدل slug */}
            {co.active ? (
              <ActionBtn
                icon="ti-x" label="إيقاف التفعيل"
                onClick={() => muts.deactivate.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم الإيقاف'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل الإيقاف'),
                })}
                loading={muts.deactivate.isPending}
              />
            ) : (
              <ActionBtn
                icon="ti-check" label="تفعيل" variant="success"
                onClick={() => muts.activate.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم التفعيل'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل التفعيل'),
                })}
                loading={muts.activate.isPending}
              />
            )}

            {/* ✅ verify/unverify — id بدل slug */}
            {!co.verified_at ? (
              <ActionBtn
                icon="ti-shield-check" label="توثيق" variant="success"
                onClick={() => muts.verify.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم التوثيق'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل التوثيق'),
                })}
                loading={muts.verify.isPending}
              />
            ) : (
              <ActionBtn
                icon="ti-shield-off" label="إلغاء التوثيق"
                onClick={() => muts.unverify.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم الإلغاء'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل إلغاء التوثيق'),
                })}
                loading={muts.unverify.isPending}
              />
            )}
          </div>

          {/* نموذج التعليق */}
          {showSuspend && (
            <div style={{
              marginTop: 14, padding: 14, borderRadius: 10,
              border: '1px solid #ef444433', background: '#ef44440a',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
                سبب التعليق
              </div>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={2}
                placeholder="أدخل سبب التعليق..."
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid #ef444433', background: 'var(--bg3)',
                  color: 'var(--t1)', fontSize: 13, resize: 'vertical',
                  boxSizing: 'border-box' as const,
                  fontFamily: 'Tajawal, sans-serif',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <ActionBtn
                  icon="ti-ban" label="تأكيد التعليق" variant="danger"
                  disabled={!suspendReason.trim()}
                  onClick={() =>
                    muts.suspend.mutate(
                      { id: co.id, reason: suspendReason },
                      {
                        onSuccess: () => { flash$(true, 'تم التعليق'); close(true); },
                        onError:   (e: any) => flash$(false, e?.message ?? 'فشل التعليق'),
                      }
                    )
                  }
                  loading={muts.suspend.isPending}
                />
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

          {mLoading ? (
            <Spinner />
          ) : members.length === 0 ? (
            <EmptyState icon="ti-users" text="لا يوجد أعضاء" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10, background: 'var(--bg3)',
                  }}
                >
                  <Avatar id={u.id} name={u.name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t4)' }}>{u.email}</div>
                  </div>
                  <StatusBadge active={u.active} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      title="تجميد/تفعيل"
                      onClick={async () => {
                        await companiesApi.toggleUser(co.id, u.id);
                        refetchMembers();
                      }}
                      style={iBtn}
                    >
                      <i className="ti ti-user-pause" />
                    </button>
                    <button
                      title="إزالة"
                      onClick={async () => {
                        if (!confirm(`إزالة ${u.name}؟`)) return;
                        await companiesApi.removeUser(co.id, u.id);
                        refetchMembers();
                        flash$(true, 'تم الإزالة');
                      }}
                      style={{ ...iBtn, color: '#ef4444', borderColor: '#ef444433' }}
                    >
                      <i className="ti ti-user-minus" />
                    </button>
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
            <select
              value={planForm.plan}
              onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value }))}
              style={sel}
            >
              {Object.entries(PLANS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {([
            { key: 'max_users',      label: 'حد المستخدمين (0 = غير محدود)' },
            { key: 'max_products',   label: 'حد المنتجات (0 = غير محدود)' },
            { key: 'max_warehouses', label: 'حد المستودعات (0 = غير محدود)' },
          ] as { key: keyof typeof planForm; label: string }[]).map(f => (
            <div key={f.key}>
              <label style={lbl}>{f.label}</label>
              <input
                type="number" min={0}
                value={planForm[f.key]}
                onChange={e => setPlanForm(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))}
                style={inp}
              />
            </div>
          ))}

          {/* ✅ changePlan — { id, plan, max_users, ... } بدل { slug, ... } */}
          <ActionBtn
            icon="ti-crown" label="تطبيق الخطة"
            onClick={() =>
              muts.changePlan.mutate(
                { id: co.id, ...planForm },
                {
                  onSuccess: () => { flash$(true, 'تم تغيير الخطة'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل تغيير الخطة'),
                }
              )
            }
            loading={muts.changePlan.isPending}
          />
        </div>
      )}

      {/* ══ NOTES ═════════════════════════════════════════════════════════════ */}
      {tab === 'notes' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle>ملاحظات داخلية</SectionTitle>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={8}
            placeholder="ملاحظات خاصة بالشركة..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--b2)', background: 'var(--bg3)',
              color: 'var(--t1)', fontSize: 13, resize: 'vertical',
              boxSizing: 'border-box' as const,
              fontFamily: 'Tajawal, sans-serif',
            }}
          />
          <ActionBtn
            icon="ti-device-floppy" label="حفظ الملاحظات"
            onClick={() =>
              muts.updateNotes.mutate(
                { id: co.id, notes },
                {
                  onSuccess: () => flash$(true, 'تم الحفظ'),
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل الحفظ'),
                }
              )
            }
            loading={muts.updateNotes.isPending}
          />
        </div>
      )}

      {/* ══ DANGER ════════════════════════════════════════════════════════════ */}
      {tab === 'danger' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: '#ef44441a', border: '1px solid #ef444433',
            fontSize: 12, color: '#ef4444',
          }}>
            هذه الإجراءات لا يمكن التراجع عنها.
          </div>

          {/* ✅ seed أُضيفت في useCompanyMutations */}
          <ActionBtn
            icon="ti-database" label="بذر البيانات الأساسية"
            onClick={() =>
              muts.seed.mutate(co.id, {
                onSuccess: () => flash$(true, 'تم البذر بنجاح'),
                onError:   (e: any) => flash$(false, e?.message ?? 'فشل البذر'),
              })
            }
            loading={muts.seed.isPending}
          />

          <ActionBtn
            icon="ti-trash" label="حذف الشركة نهائياً" variant="danger"
            onClick={() => {
              if (!confirm(`حذف شركة "${co.name}" نهائياً؟`)) return;
              muts.remove.mutate(co.id, {
                onSuccess: () => close(true),
                onError:   (e: any) => flash$(false, e?.message ?? 'فشل الحذف'),
              });
            }}
            loading={muts.remove.isPending}
          />
        </div>
      )}
    </DrawerShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const iBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  border: '1px solid var(--b2)', background: 'none',
  cursor: 'pointer', color: 'var(--t3)', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--t4)', marginBottom: 6,
};
const sel: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box' as const,
};
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

## FILE: resources/js/components/charts/BarChart.tsx
```
```

## FILE: resources/js/components/charts/DonutChart.tsx
```
```

## FILE: resources/js/components/charts/LineChart.tsx
```
// resources/js/components/charts/LineChart.tsx
import React, { useMemo } from 'react'
import { cn } from '@/lib/cn'

interface DataPoint {
  label: string
  value: number
}

interface LineChartProps {
  data:          DataPoint[]
  height?:       number
  color?:        string
  fill?:         boolean
  showDots?:     boolean
  showGrid?:     boolean
  formatValue?:  (v: number) => string
  className?:    string
}

const W = 600

const LineChart: React.FC<LineChartProps> = ({
  data,
  height      = 200,
  color       = 'var(--blue)',
  fill        = true,
  showDots    = true,
  showGrid    = true,
  formatValue = (v) => v.toLocaleString('ar-DZ'),
  className   = '',
}) => {
  const [hovered, setHovered] = React.useState<number | null>(null)

  const { points, pathD, fillD, minVal, maxVal } = useMemo(() => {
    if (!data.length) return { points: [], pathD: '', fillD: '', minVal: 0, maxVal: 0 }

    const H      = height - 40
    const padL   = 48, padR = 16, padT = 16, padB = 24
    const chartW = W - padL - padR
    const chartH = H - padT - padB

    const values = data.map(d => d.value)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range  = maxVal - minVal || 1

    const points = data.map((d, i) => ({
      x: padL + (i / (data.length - 1 || 1)) * chartW,
      y: padT + chartH - ((d.value - minVal) / range) * chartH,
      ...d,
    }))

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const fillD = `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${padL} ${padT + chartH} Z`

    return { points, pathD, fillD, minVal, maxVal }
  }, [data, height])

  if (!data.length) {
    return (
      <div className={cn('flex items-center justify-center py-10 text-[14px] text-[var(--t4)]', className)}>
        لا توجد بيانات
      </div>
    )
  }

  return (
    <div className={cn('w-full overflow-hidden', className)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label="مخطط خطي">
        <defs>
          <linearGradient id="lc-fill-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && [0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y   = 16 + (1 - f) * (height - 40)
          const val = minVal + f * (maxVal - minVal)
          return (
            <g key={i}>
              <line
                x1={48} y1={y} x2={W - 16} y2={y}
                stroke="var(--b2)" strokeWidth="0.8" strokeDasharray="4 3"
              />
              <text x={44} y={y + 4} textAnchor="end" fontSize="11" fill="var(--t4)" fontFamily="inherit">
                {formatValue(val)}
              </text>
            </g>
          )
        })}

        {/* Fill area */}
        {fill && <path d={fillD} fill="url(#lc-fill-grad)" />}

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots — ✅ إزالة r المكرر */}
        {showDots && points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y}
              r={hovered === i ? 6 : 4}
              fill="var(--bg2)"
              stroke={color}
              strokeWidth="2"
              style={{ transition: 'r 0.1s' }}
            />
            <circle
              cx={p.x} cy={p.y} r="12"
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => (
          (data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && (
            <text
              key={i}
              x={p.x} y={height - 4}
              textAnchor="middle" fontSize="11"
              fill={hovered === i ? 'var(--t1)' : 'var(--t4)'}
              fontFamily="inherit"
            >
              {p.label}
            </text>
          )
        ))}

        {/* Tooltip */}
        {hovered !== null && points[hovered] && (() => {
          const p        = points[hovered]
          const tooltipW = 90
          const tooltipX = Math.min(Math.max(p.x - tooltipW / 2, 48), W - tooltipW - 16)
          const tooltipY = p.y - 48
          return (
            <g>
              <line x1={p.x} y1={16} x2={p.x} y2={height - 24} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <rect x={tooltipX} y={tooltipY} width={tooltipW} height={34} rx="6" fill="var(--t1)" opacity="0.9" />
              <text x={tooltipX + tooltipW / 2} y={tooltipY + 13} textAnchor="middle" fontSize="11" fill="var(--bg2)" fontFamily="inherit">
                {p.label}
              </text>
              <text x={tooltipX + tooltipW / 2} y={tooltipY + 27} textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--bg2)" fontFamily="inherit">
                {formatValue(p.value)}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

export default LineChart
```

## FILE: resources/js/components/charts/SparkLine.tsx
```
```

## FILE: resources/js/components/common/FiscalYearSelector.tsx
```
// resources/js/components/common/FiscalYearSelector.tsx
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { useFiscalYear } from '@/context/FiscalYearContext'
import type { FiscalYear } from '@/context/FiscalYearContext'

const toDateStr = (date: any): string => {
  if (!date) return ''
  const m = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

export default function FiscalYearSelector() {
  const { years, selected, loading, isReadOnly, selectYear } = useFiscalYear()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (loading) return (
    <div className="flex items-center gap-[6px] px-[10px] py-[5px] rounded-[var(--r2)] border border-[var(--b2)] bg-[var(--bg3)] text-[12px] text-[var(--t4)]">
      <i className="ti ti-loader-2 animate-spin" />
      تحميل...
    </div>
  )

  if (!selected) return null

  return (
    <div ref={ref} className="relative">
      {/* ─── زر رئيسي ─── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-[7px] px-3 py-[5px] rounded-[var(--r2)]',
          'border cursor-pointer text-[12.5px] font-sans text-[var(--t1)]',
          'transition-all duration-150',
          isReadOnly
            ? 'bg-[var(--redb)] border-[var(--redbo)]'
            : 'bg-[var(--bg3)] border-[var(--b3)] hover:bg-[var(--bg4)]',
        )}
      >
        {/* أيقونة الحالة */}
        <span className={cn(
          'w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0',
          selected.is_current ? 'bg-[var(--emb)]'
            : isReadOnly      ? 'bg-[var(--redb)]'
            :                   'bg-[var(--blueb)]',
        )}>
          <i className={cn(
            'ti text-[10px]',
            isReadOnly        ? 'ti-lock text-[var(--red)]'
              : selected.is_current ? 'ti-calendar-check text-[var(--em)]'
              :                       'ti-calendar text-[var(--blue)]',
          )} />
        </span>

        <span className="font-bold">س.م {selected.name}</span>

        {isReadOnly && (
          <span className="text-[10px] font-bold px-[6px] py-px rounded-[10px] bg-[var(--red)] text-white">
            للقراءة فقط
          </span>
        )}
        {selected.is_current && !isReadOnly && (
          <span className="text-[10px] font-bold px-[6px] py-px rounded-[10px] bg-[var(--em)] text-white">
            جارية
          </span>
        )}

        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'} text-[11px] text-[var(--t4)] me-0.5`} />
      </button>

      {/* ─── Dropdown ─── */}
      {open && (
        <div className={cn(
          'absolute top-[calc(100%+6px)] left-0 min-w-[280px] z-[9999]',
          'bg-[var(--bg2)] border border-[var(--b2)] rounded-[var(--r3)]',
          'shadow-[var(--shadow2)] overflow-hidden',
        )}>
          {/* Header */}
          <div className="flex items-center gap-[6px] px-[14px] py-[10px] border-b border-[var(--b1)] text-[11px] font-bold text-[var(--t4)]">
            <i className="ti ti-calendar-stats text-[var(--em)]" />
            اختيار السنة المالية
          </div>

          {/* القائمة */}
          <div className="max-h-[320px] overflow-y-auto">
            {years.map(year => {
              const isActive = selected.id === year.id
              return (
                <button
                  key={year.id}
                  onClick={() => { selectYear(year); setOpen(false) }}
                  className={cn(
                    'w-full text-right px-[14px] py-[10px]',
                    'flex items-center justify-between gap-2',
                    'border-none cursor-pointer font-sans text-[13px]',
                    'border-r-[3px] transition-colors duration-100',
                    'hover:bg-[var(--bg3)]',
                    isActive
                      ? 'bg-[var(--emb)] border-r-[var(--em)]'
                      : 'bg-transparent border-r-transparent',
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 font-bold text-[var(--t1)]">
                      {isActive && <i className="ti ti-check text-[12px] text-[var(--em)]" />}
                      سنة {year.name}
                    </div>
                    <div className="text-[11px] text-[var(--t4)] mt-0.5">
                      {toDateStr(year.start_date)} — {toDateStr(year.end_date)}
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    {year.is_current && (
                      <span className="text-[10px] font-bold px-[7px] py-0.5 rounded-[10px] bg-[var(--emb)] text-[var(--em)]">
                        جارية
                      </span>
                    )}
                    {year.is_closed && (
                      <span className="flex items-center gap-[3px] text-[10px] font-bold px-[7px] py-0.5 rounded-[10px] bg-[var(--redb)] text-[var(--red)]">
                        <i className="ti ti-lock text-[9px]" /> مقفلة
                      </span>
                    )}
                    {!year.is_closed && !year.is_current && (
                      <span className="text-[10px] font-bold px-[7px] py-0.5 rounded-[10px] bg-[var(--blueb)] text-[var(--blue)]">
                        مفتوحة
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-[14px] py-2 border-t border-[var(--b1)] text-[11px] text-[var(--t4)]">
            <i className="ti ti-info-circle me-1" />
            السنة المقفلة: للعرض فقط — لا يمكن التعديل
          </div>
        </div>
      )}
    </div>
  )
}
```

## FILE: resources/js/components/common/ReadOnlyBanner.tsx
```
// resources/js/components/common/ReadOnlyBanner.tsx
import { useFiscalYear } from '@/context/FiscalYearContext'

const toDateString = (d?: string | null): string => {
  if (!d) return '—'
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return '—'
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function ReadOnlyBanner() {
  const { selected, isReadOnly } = useFiscalYear()
  if (!isReadOnly || !selected) return null

  return (
    <div className="flex items-center gap-3 px-[18px] py-3 mb-[18px] rounded-[var(--r3)] bg-[var(--redb)] border border-[var(--redbo)]">
      {/* Icon */}
      <div className="w-9 h-9 rounded-[10px] flex-shrink-0 bg-[var(--red)] text-white flex items-center justify-center">
        <i className="ti ti-lock text-[18px]" />
      </div>

      {/* Text */}
      <div>
        <div className="text-[14px] font-extrabold text-[var(--red)]">
          سنة مالية مقفلة — وضع القراءة فقط
        </div>
        <div className="text-[12px] text-[var(--t2)] mt-[3px]">
          السنة المالية <strong>{selected.name}</strong> مقفلة بتاريخ{' '}
          {toDateString(selected.closed_at)}.
          لا يمكن إضافة أو تعديل أو حذف أي بيانات.
          {selected.closing_notes && (
            <span className="text-[var(--t3)] block mt-0.5">
              📝 {selected.closing_notes}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

## FILE: resources/js/components/index.ts
```
// ── UI Components (New) ──────────────────────────────────────────────────────
export { default as Tooltip }      from './ui/Tooltip';
export { default as Dropdown }     from './ui/Dropdown';
export { default as Drawer }       from './ui/Drawer';
export { default as Skeleton }     from './ui/Skeleton';
export { default as Breadcrumb }   from './ui/Breadcrumb';
export { default as Stepper }      from './ui/Stepper';
export { default as DatePicker }   from './ui/DatePicker';
export { default as FileUploader } from './ui/FileUploader';

// ── UI Components (Upgraded) ─────────────────────────────────────────────────
export { default as Pagination }   from './ui/Pagination';
export { default as Table }        from './ui/Table';
export { default as PageHeader }   from './ui/PageHeader';

// ── Form Components (New) ────────────────────────────────────────────────────
export { default as SelectInput }  from './forms/SelectInput';
export { TextArea, FormField, NumberInput } from './forms/FormInputs';

// ── Charts (New) ─────────────────────────────────────────────────────────────
export { default as LineChart }    from './charts/LineChart';

// ── Types ─────────────────────────────────────────────────────────────────────
export type { DropdownOption }     from './ui/Dropdown';
export type { BreadcrumbItem }     from './ui/Breadcrumb';
export type { StepperStep }        from './ui/Stepper';
export type { TableColumn }        from './ui/Table';
```

## FILE: resources/js/components/layouts/AdminLayout.tsx
```
// ════════════════════════════════════════════════
// components/layouts/AdminLayout.tsx
// Layout مستقل للسوبر أدمن — sidebar + topbar متطور
// ════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAdminDashboard } from '@/hooks/useAdmin';
import { useTheme } from '@/hooks/useTheme';

const NAV = [
  {
    section: 'الرئيسية',
    color: 'var(--red)',
    items: [
      { to: '/admin',          icon: 'ti-layout-dashboard', label: 'لوحة التحكم',  end: true  },
    ],
  },
  {
    section: 'إدارة المحتوى',
    color: 'var(--blue)',
    items: [
      { to: '/admin/companies', icon: 'ti-building-store',   label: 'الشركات',      badge: 'companies' },
      { to: '/admin/users',     icon: 'ti-users',            label: 'المستخدمون',   badge: 'users'     },
    ],
  },
  {
    section: 'الاشتراكات والخطط',
    color: 'var(--gold)',
    items: [
      { to: '/admin/plans',     icon: 'ti-credit-card',      label: 'الخطط'        },
      { to: '/admin/activity',  icon: 'ti-activity',         label: 'سجل النشاط'   },
    ],
  },
  {
    section: 'النظام والإعدادات',
    color: 'var(--purple)',
    items: [
      { to: '/admin/settings',  icon: 'ti-settings',         label: 'الإعدادات'    },
      { to: '/admin/reports',   icon: 'ti-chart-bar',        label: 'التقارير'     },
    ],
  },
];

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/admin':           { title: 'لوحة تحكم النظام',  sub: 'نظرة شاملة على كامل المنصة' },
  '/admin/companies': { title: 'إدارة الشركات',      sub: 'كل الشركات المسجلة في المنصة' },
  '/admin/users':     { title: 'إدارة المستخدمين',   sub: 'كل المستخدمين عبر الشركات'  },
  '/admin/plans':     { title: 'الخطط والاشتراكات',  sub: 'إدارة خطط وحدود المنصة'     },
  '/admin/activity':  { title: 'سجل النشاط',         sub: 'تتبع كل الأحداث والعمليات' },
  '/admin/settings':  { title: 'إعدادات النظام',     sub: 'إعدادات البنية التحتية'     },
  '/admin/reports':   { title: 'تقارير النظام',      sub: 'إحصائيات الاستخدام والنمو'  },
};

export default function AdminLayout() {
  const { user, logout }   = useAuth();
  const navigate            = useNavigate();
  const location            = useLocation();
  const { data: stats }     = useAdminDashboard();
  const { dark, toggle: toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const meta = PAGE_META[location.pathname] ?? { title: 'Super Admin', sub: '' };

  const badges: Record<string, number | undefined> = {
    companies: stats?.companies.total,
    users:     stats?.users.total,
  };

  return (
    <div
      style={{
        display: 'flex', minHeight: '100vh',
        background: 'var(--bg0)', direction: 'rtl',
        fontFamily: "'Tajawal', sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: collapsed ? 58 : 230,
          transition: 'width .22s cubic-bezier(.4,0,.2,1)',
          background: 'var(--bg2)',
          borderLeft: '1px solid var(--b2)',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflow: 'hidden',
          position: 'sticky', top: 0, height: '100vh',
        }}
      >
        <div style={{
          padding: '14px 12px 12px',
          borderBottom: '1px solid var(--b2)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#dc2626,#ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(220,38,38,.35)',
          }}>
            <i className="ti ti-shield-lock" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
                لوحة الإدارة
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                Super Admin Panel
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div style={{
            margin: '10px 10px 2px',
            padding: '10px 12px',
            background: 'rgba(220,38,38,.06)',
            border: '1px solid rgba(220,38,38,.15)',
            borderRadius: 10,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            flexShrink: 0,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                {stats?.companies.total ?? '—'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--t4)', marginTop: 2 }}>شركة</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(220,38,38,.15)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                {stats?.users.total ?? '—'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--t4)', marginTop: 2 }}>مستخدم</div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(group => (
            <div key={group.section} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '1px',
                  color: group.color, padding: '8px 10px 4px',
                  textTransform: 'uppercase',
                }}>
                  {group.section}
                </div>
              )}
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={(item as any).end}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center',
                    gap: 10, padding: '8px 10px', borderRadius: 8,
                    color: isActive ? '#dc2626' : 'var(--t3)',
                    background: isActive ? 'rgba(220,38,38,.08)' : 'transparent',
                    borderRight: isActive ? '2px solid #dc2626' : '2px solid transparent',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    textDecoration: 'none', marginBottom: 1,
                    transition: 'all .15s',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  })}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                      {(item as any).badge && badges[(item as any).badge] !== undefined && (
                        <span style={{
                          fontSize: 9.5, fontWeight: 800, padding: '2px 7px',
                          borderRadius: 20, background: '#dc2626', color: '#fff',
                          flexShrink: 0,
                        }}>
                          {badges[(item as any).badge]}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '10px 6px', borderTop: '1px solid var(--b2)', flexShrink: 0 }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'var(--t4)', fontSize: 12,
              cursor: 'pointer', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            <i className={`ti ${collapsed ? 'ti-layout-sidebar-right-expand' : 'ti-layout-sidebar-right-collapse'}`} style={{ fontSize: 16, flexShrink: 0 }} />
            {!collapsed && 'طي الشريط الجانبي'}
          </button>

          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 10px', borderRadius: 10,
              background: 'var(--bg3)', border: '1px solid var(--b2)',
              cursor: 'pointer', marginTop: 6,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg,#dc2626,#b45309)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {user?.name?.[0] ?? 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--t4)' }}>Super Admin</div>
              </div>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#10b981', flexShrink: 0,
                boxShadow: '0 0 5px rgba(16,185,129,.5)',
              }} />
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{
          height: 54, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(255,255,255,.92)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--b2)',
          flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 1px 6px rgba(0,0,0,.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
              background: 'rgba(220,38,38,.1)', color: '#dc2626', letterSpacing: '.5px',
            }}>
              SUPER ADMIN
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2 }}>
                {meta.title}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{meta.sub}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleTheme} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--t3)', fontSize: 15 }}>
              <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} />
            </button>

            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(v => !v)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--t3)', fontSize: 15, position: 'relative' }}>
                <i className="ti ti-bell" />
                {stats?.companies.suspended !== undefined && stats.companies.suspended > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg2)' }}>{stats.companies.suspended}</span>
                )}
              </button>
              {notifOpen && (
                <div style={{ position: 'absolute', top: 42, left: 0, width: 280, background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--b2)', fontSize: 12, fontWeight: 700, color: 'var(--t1)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>الإشعارات</span>
                    <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400 }}>وضع علامة مقروء</span>
                  </div>
                  {stats?.companies.suspended !== undefined && stats.companies.suspended > 0 && (
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--b2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(220,38,38,.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}><i className="ti ti-ban" /></div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{stats.companies.suspended} شركة موقوفة</div>
                        <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 2 }}>بحاجة للمراجعة والمتابعة</div>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '10px 14px', textAlign: 'center' }}><span style={{ fontSize: 11, color: 'var(--t4)' }}>لا توجد إشعارات إضافية</span></div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>{user?.name}</span>
              <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(220,38,38,.3)', background: 'transparent', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif' }}>
                <i className="ti ti-logout" /> خروج
              </button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/layouts/DashboardLayout.tsx
```
// resources/js/components/layouts/DashboardLayout.tsx
import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useAuth }       from '@/context/AuthContext'
import { useAppStore }   from '@/lib/store/appStore'
import { useFiscalYear } from '@/context/FiscalYearContext'
import { useTopbarTitle } from '@/hooks/useTopbarTitle'
import FiscalYearSelector from '@/components/common/FiscalYearSelector'
import CompanySwitcher    from '@/components/topbar/SuperAdminButton'
import NoFiscalYearModal  from '@/components/modals/SystemBootModal'

// ─── Nav groups (unchanged) ───────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [
      { href: 'dashboard', icon: 'ti-home',         name: 'لوحة التحكم' },
      { href: 'pos',        icon: 'ti-shopping-cart', name: 'نقطة البيع' },
    ],
  },
  {
    label: 'المبيعات',
    items: [
      { href: 'documents/FV', icon: 'ti-file-text',  name: 'الفواتير',  badge: 3 },
      { href: 'clients',      icon: 'ti-users',       name: 'العملاء'  },
    ],
  },
  {
    label: 'المخزون',
    items: [
      { href: 'inventory', icon: 'ti-package',    name: 'المخزون'  },
      { href: 'products',  icon: 'ti-list',        name: 'المنتجات' },
    ],
  },
  {
    label: 'المالية',
    items: [
      { href: 'finance',   icon: 'ti-building-bank', name: 'الخزينة'  },
      { href: 'expenses',  icon: 'ti-credit-card',   name: 'المصاريف' },
      { href: 'reports',   icon: 'ti-chart-bar',     name: 'التقارير' },
    ],
  },
  {
    label: 'الإعدادات',
    superAdminOnly: false,
    items: [
      { href: 'settings', icon: 'ti-settings', name: 'الإعدادات' },
    ],
  },
] as const

const LABEL_COLORS = [
  'var(--em)', 'var(--blue)', 'var(--purple)',
  'var(--gold)', 'var(--orange)', 'var(--red)', 'var(--teal)',
]

// ════════════════════════════════════════════════════════════
export default function DashboardLayout() {
  const { user, logout }      = useAuth()
  const { dark, toggleTheme } = useAppStore()
  const { activeCompany }     = useAppStore()
  const navigate              = useNavigate()
  const location              = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { years, selected: selectedYear, isLoading: fiscalLoading, refetch } = useFiscalYear()
  const fiscalState: 'loading' | 'noYear' | 'ready' =
    fiscalLoading        ? 'loading' :
    !activeCompany?.slug ? 'loading' :
    years.length === 0   ? 'noYear'  :
    selectedYear !== null ? 'ready'  : 'loading'

  const handleYearCreated = async () => { await refetch() }

  const currentPath = location.pathname.replace(/^\//, '') || 'dashboard'
  const meta        = useTopbarTitle()
  const userInitial = user?.name?.[0] ?? 'م'

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  return (
    <>
      {/* ════════ SIDEBAR ════════ */}
      <nav id="sidebar">
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-mark">ب</div>
          <div>
            <div className="sb-name">نظام المبيعات</div>
            <div className="sb-sub">إدارة متكاملة • الجزائر</div>
          </div>
        </div>

        {/* Company switcher */}
        <div className="px-[10px] py-1 border-b border-[var(--b1)]">
          <CompanySwitcher />
        </div>

        {/* Nav groups */}
        {NAV_GROUPS.filter(g => !(g as any).superAdminOnly).map((group, idx) => (
          <div className="sb-sec" key={group.label}>
            <div className="sb-lbl" style={{ color: LABEL_COLORS[idx] }}>{group.label}</div>
            {group.items.map(item => {
              const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
              return (
                <Link key={item.href} to={item.href} className={cn('sbi', isActive && 'on')}>
                  <span className="sbi-ic ic"><i className={`ti ${item.icon}`} /></span>
                  {item.name}
                  {'badge' in item && item.badge && (
                    <span className="sbi-badge">{item.badge}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}

        {/* Footer */}
        <div className="sb-foot">
          {/* User card */}
          <div className="flex items-center gap-[10px] px-3 py-[10px]">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-[10px] flex-shrink-0 bg-gradient-to-br from-[var(--blue)] to-[#60a5fa] flex items-center justify-center text-[15px] font-black text-white">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-extrabold text-[var(--t1)] truncate">
                {user?.name ?? 'المستخدم'}
              </div>
              <div className="text-[11px] text-[var(--t4)] mt-px">
                {(user as any)?.role ?? 'مدير النظام'}
              </div>
            </div>
            {/* Online dot */}
            <div
              className="w-2 h-2 rounded-full bg-[var(--em)] flex-shrink-0"
              style={{ boxShadow: '0 0 6px var(--em)' }}
              title="متصل"
            />
          </div>

          {/* Logout */}
          <div className="px-[10px] pb-3">
            <button
              onClick={logout}
              className={cn(
                'w-full flex items-center gap-[9px] px-[14px] py-[10px]',
                'bg-transparent border border-[rgba(239,68,68,.3)] rounded-[10px]',
                'text-[#ef4444] text-[13px] font-bold font-sans cursor-pointer',
                'transition-all duration-[180ms]',
                'hover:bg-[#ef4444] hover:border-[#ef4444] hover:text-white',
              )}
            >
              <i className="ti ti-logout text-[16px]" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ════════ MAIN ════════ */}
      <main id="main">
        {/* Topbar */}
        <div id="topbar">
          <div className="tb-info">
            <div className="tb-title">{meta.title}</div>
            <div className="tb-path">{meta.path}</div>
          </div>
          <div className="tb-actions">
            <FiscalYearSelector />
            <div className="srch">
              <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
              <input type="text" placeholder="بحث سريع..." />
            </div>
            <button className="ib" title="الإشعارات">
              <span className="ic ic-sm"><i className="ti ti-bell" /></span>
              <div className="ib-n">5</div>
            </button>
            <button className="ib" onClick={toggleTheme} title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}>
              <span className="ic ic-sm"><i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} /></span>
            </button>
            <button className="tb-btn p" onClick={() => navigate('pos')}>
              <span className="ic ic-xs"><i className="ti ti-plus" /></span>
              <span>فاتورة جديدة</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {fiscalState === 'loading' && (
            <div className="flex items-center justify-center h-[60vh] gap-3 text-[var(--t4)]">
              <i className="ti ti-loader text-[20px] text-[var(--em)] animate-spin" />
              <span className="text-[14px]">جارٍ تحميل بيانات السنة المالية...</span>
            </div>
          )}
          {fiscalState === 'noYear' && <NoFiscalYearModal onCreated={handleYearCreated} />}
          {fiscalState === 'ready'  && <Outlet />}
        </div>
      </main>

      {/* ════════ MOBILE NAV ════════ */}
      <div id="mob-nav">
        <div className="mob-tabs">
          <Link to="dashboard" className={cn('mt', currentPath === 'dashboard' && 'on')}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-home" /></span></div>
            <div className="mt-lbl">الرئيسية</div>
          </Link>
          <Link to="documents/FV" className={cn('mt', currentPath === 'documents/FV' && 'on')}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-file-text" /></span></div>
            <div className="mt-lbl">فواتير</div>
            <div className="mt-n">3</div>
          </Link>
          <div className="mt-fab" onClick={() => navigate('pos')}>
            <div className="fab-btn"><span className="ic"><i className="ti ti-shopping-cart" /></span></div>
            <div className="mt-lbl" style={{ fontSize: 9, marginTop: 2 }}>بيع</div>
          </div>
          <Link to="inventory" className={cn('mt', currentPath === 'inventory' && 'on')}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-package" /></span></div>
            <div className="mt-lbl">مخزون</div>
          </Link>
          <div className="mt" onClick={() => setDrawerOpen(true)}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-dots" /></span></div>
            <div className="mt-lbl">المزيد</div>
          </div>
        </div>
      </div>

      {/* ════════ MOBILE DRAWER ════════ */}
      <div id="mob-drawer" className={drawerOpen ? 'on' : ''} onClick={() => setDrawerOpen(false)}>
        <div className="mdb-bg" />
        <div className="mdb-panel" onClick={e => e.stopPropagation()}>
          <div className="mdb-handle" />
          <div className="mdb-title">التنقل السريع</div>
          <div className="mdb-grid">
            {[
              { href: 'pos',          icon: 'ti-shopping-cart', label: 'بيع'    },
              { href: 'inventory',    icon: 'ti-package',       label: 'مخزون'  },
              { href: 'finance',      icon: 'ti-building-bank', label: 'خزينة'  },
              { href: 'clients',      icon: 'ti-users',         label: 'عملاء'  },
              { href: 'documents/FV', icon: 'ti-file-text',     label: 'فواتير' },
              { href: 'expenses',     icon: 'ti-credit-card',   label: 'مصاريف' },
              { href: 'products',     icon: 'ti-list',          label: 'منتجات' },
              { href: 'reports',      icon: 'ti-chart-bar',     label: 'تقارير' },
            ].map(({ href, icon, label }) => (
              <div key={href} className="mdb-item" onClick={() => { navigate(href); setDrawerOpen(false) }}>
                <div className="mdb-ic"><span className="ic"><i className={`ti ${icon}`} /></span></div>
                <div className="mdb-lbl">{label}</div>
              </div>
            ))}
          </div>
          <div className="mdb-title mt-2">الحساب</div>
          <div className="mdb-row" onClick={() => { logout(); setDrawerOpen(false) }}>
            <span className="ic ic-sm"><i className="ti ti-logout" /></span>
            <span className="text-[13px] font-bold text-[var(--red)]">تسجيل الخروج</span>
          </div>
        </div>
      </div>
    </>
  )
}
```

## FILE: resources/js/components/layouts/POSLayout.tsx
```
```

## FILE: resources/js/components/modals/AdminBootModal.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// components/modals/AdminBootModal.tsx
//
// مودال إعداد النظام للسوبر أدمن — يظهر مرة واحدة عند أول دخول
// يتحقق من حالة البيانات العالمية ويثبّتها عبر:
//   GET  /api/v1/admin/system/status
//   POST /api/v1/admin/system/boot
//   POST /api/v1/admin/system/boot/wilayas
//   POST /api/v1/admin/system/boot/permissions
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import client from '@/lib/api/core/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemComponent {
  key:   string;
  label: string;
  icon:  string;
  done:  boolean;
  count: string;
}

interface SystemStatus {
  is_ready:   boolean;
  components: SystemComponent[];
}

type Phase = 'checking' | 'ready' | 'needs_setup' | 'installing' | 'done' | 'error';
type ItemStatus = 'pending' | 'installing' | 'done' | 'error' | 'skipped';

interface InstallStep {
  key:      string;
  label:    string;
  icon:     string;
  endpoint: string;  // POST endpoint نسبي
  status:   ItemStatus;
  message?: string;
  ms?:      number;
}

// الخطوات بالترتيب الصحيح
const INSTALL_STEPS: Omit<InstallStep, 'status'>[] = [
  {
    key:      'wilayas',
    label:    'الولايات والبلديات الجزائرية',
    icon:     'ti-map-pin',
    endpoint: '/api/v1/admin/system/boot/wilayas',
  },
  {
    key:      'permissions',
    label:    'الصلاحيات ودور مدير النظام',
    icon:     'ti-shield-check',
    endpoint: '/api/v1/admin/system/boot/permissions',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminBootModal({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase,   setPhase]   = useState<Phase>('checking');
  const [status,  setStatus]  = useState<SystemStatus | null>(null);
  const [steps,   setSteps]   = useState<InstallStep[]>(
    INSTALL_STEPS.map(s => ({ ...s, status: 'pending' }))
  );
  const [elapsed,       setElapsed]       = useState(0);
  const [currentLabel,  setCurrentLabel]  = useState('جارٍ فحص النظام...');
  const [doneCount,     setDoneCount]     = useState(0);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);

  const timerRef  = useRef<ReturnType<typeof setInterval>>();
  const startRef  = useRef(Date.now());

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const setStep = useCallback((key: string, patch: Partial<InstallStep>) => {
    setSteps(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s));
  }, []);

  // ── 1. فحص الحالة عند التحميل ───────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await client.get<SystemStatus>('/api/v1/admin/system/status');
        setStatus(res.data);

        if (res.data.is_ready) {
          clearInterval(timerRef.current);
          setPhase('ready');
          setCurrentLabel('النظام مُعدّ ✓');
          // انتقل تلقائياً بعد ثانية
          setTimeout(onComplete, 1000);
        } else {
          setPhase('needs_setup');
          setCurrentLabel('يلزم إعداد النظام أولاً');
        }
      } catch (e: any) {
        setErrorMsg(e?.response?.data?.message ?? 'تعذّر الاتصال بالخادم');
        setPhase('error');
        clearInterval(timerRef.current);
      }
    };

    check();
  }, [onComplete]);

  // ── 2. تثبيت البيانات العالمية ─────────────────────────────────────────
  const handleInstall = useCallback(async () => {
    setPhase('installing');
    startRef.current = Date.now();
    setElapsed(0);

    let done = 0;
    const errors: string[] = [];

    for (const step of INSTALL_STEPS) {
      setCurrentLabel(step.label);
      setStep(step.key, { status: 'installing' });

      // scroll into view
      setTimeout(() => {
        document.getElementById(`boot-step-${step.key}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);

      const t0 = Date.now();
      try {
        await client.post(step.endpoint);
        setStep(step.key, { status: 'done', ms: Date.now() - t0 });
        done++;
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? 'خطأ غير معروف';
        setStep(step.key, { status: 'error', message: msg });
        errors.push(`${step.label}: ${msg}`);
      }

      setDoneCount(d => d + 1);
      await new Promise(r => setTimeout(r, 200));
    }

    clearInterval(timerRef.current);

    if (errors.length === 0) {
      setPhase('done');
      setCurrentLabel('اكتمل الإعداد بنجاح ✓');
      setTimeout(onComplete, 1200);
    } else {
      setPhase('error');
      setErrorMsg(errors.join(' — '));
      setCurrentLabel(`اكتمل مع ${errors.length} أخطاء`);
    }
  }, [setStep, onComplete]);

  // ── حساب التقدم ──────────────────────────────────────────────────────────
  const TOTAL    = INSTALL_STEPS.length;
  const progress = phase === 'done'  ? 100
                 : phase === 'ready' ? 100
                 : Math.round((doneCount / TOTAL) * 100);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.80)', backdropFilter: 'blur(14px)',
      padding: 20, direction: 'rtl',
      animation: 'abFadeIn .25s ease',
    }}>
      <style>{`
        @keyframes abFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes abSlideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes abSpin     { to{transform:rotate(360deg)} }
        @keyframes abPulse    { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes abPop      {
          0%  { transform:scale(.7); opacity:0 }
          65% { transform:scale(1.1) }
          100% { transform:scale(1); opacity:1 }
        }
        @keyframes abShimmer {
          0%   { background-position:-400px 0 }
          100% { background-position: 400px 0 }
        }
        .ab-step:hover { background:var(--bg3); }
      `}</style>

      <div style={{
        background: 'var(--bg2)',
        borderRadius: 24,
        width: '100%', maxWidth: 500,
        border: '1px solid var(--b3)',
        boxShadow: '0 40px 100px rgba(0,0,0,.55)',
        overflow: 'hidden',
        animation: 'abSlideUp .3s cubic-bezier(.34,1.4,.64,1)',
      }}>

        {/* ══ Header ════════════════════════════════════════════════════════ */}
        <div style={{
          background: phase === 'done' || phase === 'ready'
            ? 'linear-gradient(135deg, #059669 0%, #065f46 100%)'
            : phase === 'error'
            ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
            : 'linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)',
          padding: '28px 28px 22px',
          position: 'relative', overflow: 'hidden',
          transition: 'background .5s',
        }}>
          {/* دوائر زخرفية */}
          <div style={{ position:'absolute', top:-60, left:-60, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-40, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }} />

          <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:16 }}>
            {/* أيقونة */}
            <div style={{
              width: 56, height: 56, borderRadius: 18, flexShrink: 0,
              background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, boxShadow: '0 4px 16px rgba(0,0,0,.2)',
            }}>
              {phase === 'checking'    && <i className="ti ti-loader-2" style={{ animation:'abSpin .8s linear infinite', color:'#fff', fontSize:26 }} />}
              {phase === 'needs_setup' && <i className="ti ti-settings-2" style={{ color:'#fff', fontSize:26 }} />}
              {phase === 'installing'  && <i className="ti ti-loader-2" style={{ animation:'abSpin .8s linear infinite', color:'#fff', fontSize:26 }} />}
              {phase === 'done'        && <i className="ti ti-circle-check-filled" style={{ color:'#fff', fontSize:26, animation:'abPop .35s cubic-bezier(.34,1.5,.64,1)' }} />}
              {phase === 'ready'       && <i className="ti ti-circle-check-filled" style={{ color:'#fff', fontSize:26 }} />}
              {phase === 'error'       && <i className="ti ti-alert-triangle-filled" style={{ color:'#fff', fontSize:26 }} />}
            </div>

            <div style={{ flex: 1, paddingTop: 2 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.6)', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
                إعداد النظام — مدير النظام
              </div>
              <div style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1.25, marginBottom:4 }}>
                {phase === 'checking'    && 'جارٍ فحص النظام...'}
                {phase === 'needs_setup' && 'يلزم إعداد البيانات الأولية'}
                {phase === 'installing'  && 'جارٍ تثبيت البيانات...'}
                {phase === 'done'        && 'اكتمل الإعداد بنجاح!'}
                {phase === 'ready'       && 'النظام جاهز!'}
                {phase === 'error'       && 'حدث خطأ أثناء الإعداد'}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.72)', lineHeight:1.5 }}>
                {phase === 'checking'    && 'يتحقق من البيانات العالمية...'}
                {phase === 'needs_setup' && 'الولايات والصلاحيات غير مثبتة — يجب تثبيتها مرة واحدة'}
                {phase === 'installing'  && `جارٍ التثبيت · ${elapsed}ث`}
                {phase === 'done'        && `اكتمل في ${elapsed} ثانية — جارٍ الانتقال...`}
                {phase === 'ready'       && 'البيانات العالمية مثبتة — جارٍ الانتقال...'}
                {phase === 'error'       && 'راجع التفاصيل أدناه'}
              </div>
            </div>
          </div>

          {/* شريط التقدم */}
          {(phase === 'installing' || phase === 'done' || phase === 'ready') && (
            <div style={{ marginTop: 20 }}>
              <div style={{
                height: 6, borderRadius: 99,
                background: 'rgba(255,255,255,.2)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: 'rgba(255,255,255,.9)',
                  width: `${progress}%`,
                  transition: 'width .5s cubic-bezier(.4,0,.2,1)',
                  boxShadow: '0 0 12px rgba(255,255,255,.5)',
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,.7)',
              }}>
                <span style={{ animation: phase === 'installing' ? 'abPulse 1.5s ease infinite' : 'none' }}>
                  {currentLabel}
                </span>
                <span style={{ fontWeight: 800, color: '#fff' }}>{progress}٪</span>
              </div>
            </div>
          )}
        </div>

        {/* ══ Body ══════════════════════════════════════════════════════════ */}
        <div style={{ padding: '16px 20px' }}>

          {/* ── حالة الفحص الأولي ─── */}
          {(phase === 'checking' || phase === 'needs_setup') && status && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', marginBottom: 10, letterSpacing: .5, textTransform: 'uppercase' }}>
                حالة المكونات العالمية
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {status.components.map(comp => (
                  <div key={comp.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 12,
                    background: comp.done ? 'var(--emb)' : 'var(--redb)',
                    border: `1px solid ${comp.done ? 'var(--embo)' : 'var(--redbo)'}`,
                    transition: 'all .2s',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: comp.done ? 'var(--em)' : 'var(--red)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`ti ${comp.done ? 'ti-check' : comp.icon}`} style={{ fontSize: 15, color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{comp.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t4)' }}>{comp.count}</div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 8px',
                      borderRadius: 99,
                      background: comp.done ? 'var(--em)' : 'var(--red)',
                      color: '#fff',
                    }}>
                      {comp.done ? 'جاهز' : 'مطلوب'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── خطوات التثبيت ─── */}
          {(phase === 'installing' || phase === 'done' || phase === 'error') && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', marginBottom: 10, letterSpacing: .5, textTransform: 'uppercase' }}>
                تقدم التثبيت
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {steps.map(step => (
                  <div
                    id={`boot-step-${step.key}`}
                    key={step.key}
                    className="ab-step"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      transition: 'background .15s',
                    }}
                  >
                    {/* أيقونة الحالة */}
                    <div style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {step.status === 'pending' && (
                        <div style={{ width:22, height:22, borderRadius:'50%', border:'2px solid var(--b3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <i className={`ti ${step.icon}`} style={{ fontSize:11, color:'var(--t4)' }} />
                        </div>
                      )}
                      {step.status === 'installing' && (
                        <i className="ti ti-loader-2" style={{ fontSize:18, color:'var(--em)', animation:'abSpin .7s linear infinite' }} />
                      )}
                      {step.status === 'done' && (
                        <div style={{
                          width:22, height:22, borderRadius:'50%',
                          background:'var(--em)', display:'flex', alignItems:'center', justifyContent:'center',
                          animation:'abPop .3s cubic-bezier(.34,1.5,.64,1)',
                        }}>
                          <i className="ti ti-check" style={{ fontSize:12, color:'#fff', fontWeight:900 }} />
                        </div>
                      )}
                      {step.status === 'error' && (
                        <div style={{
                          width:22, height:22, borderRadius:'50%',
                          background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <i className="ti ti-x" style={{ fontSize:11, color:'#fff' }} />
                        </div>
                      )}
                    </div>

                    {/* النص */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13, fontWeight:600,
                        color: step.status === 'installing' ? 'var(--t1)'
                             : step.status === 'done'       ? 'var(--t2)'
                             : step.status === 'error'      ? 'var(--red)'
                             : 'var(--t4)',
                      }}>
                        {step.label}
                      </div>
                      {step.status === 'installing' && (
                        <div style={{ height:3, borderRadius:99, marginTop:4, background:'var(--bg4)', overflow:'hidden' }}>
                          <div style={{
                            height:'100%', borderRadius:99, width:'60%',
                            background:'linear-gradient(90deg, transparent, var(--em), transparent)',
                            backgroundSize:'400px 100%',
                            animation:'abShimmer 1.2s linear infinite',
                          }} />
                        </div>
                      )}
                      {step.status === 'error' && step.message && (
                        <div style={{ fontSize:11, color:'var(--red)', marginTop:2 }}>{step.message}</div>
                      )}
                    </div>

                    {/* الوقت */}
                    {step.status === 'done' && step.ms !== undefined && (
                      <div style={{ fontSize:10, color:'var(--t4)', flexShrink:0 }}>
                        {step.ms > 0 ? `${step.ms}ms` : <span style={{ color:'var(--em)', fontSize:9, fontWeight:700 }}>فوري</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── رسالة خطأ عامة ─── */}
          {phase === 'error' && errorMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginTop: 8,
              background: 'var(--redb)', border: '1px solid var(--redbo)',
              fontSize: 12, color: 'var(--red)', lineHeight: 1.5,
            }}>
              <i className="ti ti-alert-circle" style={{ marginLeft: 6 }} />
              {errorMsg}
            </div>
          )}

          {/* ── تحذير إذا النظام في وضع checking ─── */}
          {phase === 'checking' && !status && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '32px 0', color: 'var(--t4)', gap: 10,
            }}>
              <i className="ti ti-loader-2" style={{ fontSize:20, animation:'abSpin .8s linear infinite' }} />
              <span style={{ fontSize:13 }}>جارٍ فحص حالة النظام...</span>
            </div>
          )}
        </div>

        {/* ══ Footer ════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '12px 20px 20px',
          borderTop: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ fontSize:11, color:'var(--t4)' }}>
            {phase === 'installing' && `${doneCount} / ${TOTAL} خطوة`}
            {phase === 'done'       && `${TOTAL} / ${TOTAL} خطوة — مكتمل`}
            {phase === 'ready'      && 'البيانات العالمية موجودة'}
            {phase === 'error'      && 'يمكنك إعادة المحاولة'}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            {/* زر التثبيت — يظهر فقط في needs_setup */}
            {phase === 'needs_setup' && (
              <button
                onClick={handleInstall}
                style={{
                  padding: '9px 20px', borderRadius: 12,
                  border: 'none', background: 'var(--em)', color: '#fff',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: 'var(--emglow)', transition: '.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <i className="ti ti-player-play-filled" style={{ fontSize:13 }} />
                تثبيت البيانات الآن
              </button>
            )}

            {/* زر إعادة المحاولة */}
            {phase === 'error' && (
              <>
                <button
                  onClick={() => {
                    setSteps(INSTALL_STEPS.map(s => ({ ...s, status: 'pending' })));
                    setDoneCount(0);
                    setElapsed(0);
                    setErrorMsg(null);
                    startRef.current = Date.now();
                    handleInstall();
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    border: 'none', background: 'var(--em)', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'Tajawal, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <i className="ti ti-refresh" style={{ fontSize:13 }} />
                  إعادة المحاولة
                </button>
                <button
                  onClick={onComplete}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    border: '1px solid var(--b3)', background: 'var(--bg3)',
                    color: 'var(--t3)', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                  }}
                >
                  تجاهل والمتابعة
                </button>
              </>
            )}

            {/* جارٍ الانتقال */}
            {(phase === 'done' || phase === 'ready') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: 'var(--emb)', border: '1px solid var(--embo)',
                fontSize: 12, fontWeight: 700, color: 'var(--em)',
              }}>
                <i className="ti ti-rocket" style={{ fontSize:13 }} />
                جارٍ الانتقال...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/modals/ClientModal.tsx
```
// resources/js/components/modals/ClientModal.tsx
import React, { useState, useEffect } from 'react'
import { Modal }  from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Alert }  from '@/components/ui/Alert'
import { Switch } from '@/components/ui/Misc'
import { Input, Select, FormField, FormGrid } from '@/components/ui/FormInputs'
import { Tabs }   from '@/components/ui/Misc'
import { useWilayas, useCommunes, useLegalForms, usePriceLevels } from '@/lib/api/endpoints/lookups'
import type { Party, Wilaya, Commune, LegalForm, PriceLevel } from '@/types'

interface ClientModalProps {
  open:         boolean
  party:        Party | null
  onClose:      () => void
  onSaved:      () => void
  isSubmitting?: boolean
  onSubmit:     (data: any) => Promise<void>
}

const TABS = [
  { key: '0', label: 'المعلومات الأساسية'  },
  { key: '1', label: 'الوثائق القانونية'   },
  { key: '2', label: 'المعلومات المالية'   },
  { key: '3', label: 'إعدادات إضافية'      },
]

const emptyForm = {
  name: '', commercial_name: '', code: '', activity: '',
  rc: '', nif: '', nis: '', ai: '', legal_form_id: null as number | null,
  capital_amount: 0, rc_date: '', address: '',
  commune_id:  null as number | null,
  wilaya_id:   null as number | null,
  phone: '', mobile: '', fax: '', email: '', bank_name: '', rib: '',
  initial_balance: 0, credit_limit: 0, credit_days: 30,
  default_price_level_id: null as number | null,
  is_tva_exempt: false, is_taxable: true, tax_option: null as string | null,
  cnas_number: '', tax_regime: null as string | null,
  is_final_consumer: false, is_vat_registered: false,
  vat_registration_date: '', active: true,
}

export default function ClientModal({
  open, party, onClose, onSaved, isSubmitting, onSubmit,
}: ClientModalProps) {
  const isEdit = !!party
  const [activeTab,        setActiveTab]        = useState('0')
  const [selectedWilayaId, setSelectedWilayaId] = useState<number | null>(null)
  const [error,            setError]            = useState('')
  const [success,          setSuccess]          = useState('')
  const [form,             setForm]             = useState(emptyForm)

  // ── Lookups ───────────────────────────────────────────────────────
  const { data: wilayasRaw  = [] } = useWilayas()
  const { data: legalForms  = [] } = useLegalForms()
  const { data: priceLevels = [] } = usePriceLevels()
  const { data: communes = [], isFetching: loadingCommunes } = useCommunes(selectedWilayaId)

  const wilayas: Wilaya[] = [...wilayasRaw].sort((a: any, b: any) => a.code - b.code)

  // ── Reset on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    if (party) {
      const ns = (v: any) => v == null ? '' : v
      const nn = (v: any, d = 0) => v ?? d
      const wId = party.wilaya_id ?? null
      setSelectedWilayaId(wId)
      setForm({
        ...emptyForm,
        name:                   ns(party.name),
        commercial_name:        ns(party.commercial_name),
        code:                   ns(party.code),
        activity:               ns(party.activity),
        rc:                     ns(party.rc),
        nif:                    ns(party.nif),
        nis:                    ns(party.nis),
        ai:                     ns(party.ai),
        address:                ns(party.address),
        phone:                  ns(party.phone),
        mobile:                 ns(party.mobile),
        fax:                    ns(party.fax),
        email:                  ns(party.email),
        bank_name:              ns(party.bank_name),
        rib:                    ns(party.rib),
        rc_date:                ns(party.rc_date),
        vat_registration_date:  ns(party.vat_registration_date),
        cnas_number:            ns(party.cnas_number),
        tax_regime:             ns(party.tax_regime),
        tax_option:             party.tax_option ?? null,
        capital_amount:         nn(party.capital_amount),
        initial_balance:        nn(party.initial_balance),
        credit_limit:           nn(party.credit_limit),
        credit_days:            nn(party.credit_days, 30),
        is_tva_exempt:          party.is_tva_exempt      ?? false,
        is_taxable:             party.is_taxable         ?? true,
        is_final_consumer:      party.is_final_consumer  ?? false,
        is_vat_registered:      party.is_vat_registered  ?? false,
        active:                 party.active !== false,
        wilaya_id:              wId,
        commune_id:             party.commune_id             ?? null,
        legal_form_id:          party.legal_form_id          ?? null,
        default_price_level_id: party.default_price_level_id ?? null,
      })
    } else {
      setForm(emptyForm)
      setSelectedWilayaId(null)
    }
    setError(''); setSuccess(''); setActiveTab('0')
  }, [open, party?.id])

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  const handleWilayaChange = (val: string) => {
    const id = val ? parseInt(val) : null
    setSelectedWilayaId(id)
    set('wilaya_id', id)
    set('commune_id', null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('اسم العميل مطلوب'); return }
    try {
      const n2 = (v: any) => v === '' ? null : v
      await onSubmit({
        ...form,
        party_type_id:         1,
        commercial_name:       n2(form.commercial_name),
        code:                  n2(form.code),
        activity:              n2(form.activity),
        rc:                    n2(form.rc),
        nif:                   n2(form.nif),
        nis:                   n2(form.nis),
        ai:                    n2(form.ai),
        address:               n2(form.address),
        phone:                 n2(form.phone),
        mobile:                n2(form.mobile),
        fax:                   n2(form.fax),
        email:                 n2(form.email),
        bank_name:             n2(form.bank_name),
        rib:                   n2(form.rib),
        rc_date:               n2(form.rc_date),
        vat_registration_date: n2(form.vat_registration_date),
        cnas_number:           n2(form.cnas_number),
        tax_regime:            n2(form.tax_regime),
        tax_option:            n2(form.tax_option),
      })
      setSuccess(isEdit ? 'تم تعديل العميل بنجاح' : 'تم إضافة العميل بنجاح')
      setTimeout(() => { onSaved(); onClose() }, 300)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'فشل الحفظ')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `تعديل — ${party?.name}` : 'إضافة عميل جديد'}
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isSubmitting}
            disabled={!form.name.trim()}
          >
            <i className="ti ti-device-floppy text-[13px]" />
            {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      {error   && <Alert variant="red"  className="mb-3">{error}</Alert>}
      {success && <Alert variant="em"   className="mb-3">{success}</Alert>}

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className="min-h-[440px]">

        {/* ── تبويب 0: المعلومات الأساسية ── */}
        {activeTab === '0' && (
          <FormGrid cols={3}>
            <FormField span={2}>
              <label className="text-[12px] font-bold text-[var(--t3)]">
                الاسم الكامل / الشركة <span className="text-[var(--red)]">*</span>
              </label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">الاسم التجاري</label>
              <Input value={form.commercial_name || ''} onChange={e => set('commercial_name', e.target.value)} />
            </FormField>

            <FormField span={3}>
              <label className="text-[12px] font-bold text-[var(--t3)]">العنوان</label>
              <Input value={form.address || ''} onChange={e => set('address', e.target.value)} />
            </FormField>

            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">الولاية</label>
              <Select value={form.wilaya_id ?? ''} onChange={e => handleWilayaChange(e.target.value)}>
                <option value="">-- اختر الولاية --</option>
                {wilayas.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.code} — {w.arabic_name || w.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">
                البلدية
                {loadingCommunes && selectedWilayaId && (
                  <i className="ti ti-loader-2 me-1 text-[11px] text-[var(--t4)] animate-spin" />
                )}
              </label>
              <Select
                value={form.commune_id ?? ''}
                onChange={e => set('commune_id', e.target.value ? parseInt(e.target.value) : null)}
                disabled={!selectedWilayaId || loadingCommunes}
              >
                <option value="">
                  {!selectedWilayaId ? '— اختر الولاية أولاً —'
                    : loadingCommunes ? 'جارٍ التحميل...'
                    : '-- اختر البلدية --'}
                </option>
                {communes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.arabic_name || c.name}{c.post_code ? ` (${c.post_code})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">رمز العميل</label>
              <Input value={form.code || ''} onChange={e => set('code', e.target.value)} placeholder="يُولد تلقائياً" />
            </FormField>

            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">الهاتف</label>
              <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">الجوال</label>
              <Input value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">الفاكس</label>
              <Input value={form.fax || ''} onChange={e => set('fax', e.target.value)} />
            </FormField>
            <FormField span={2}>
              <label className="text-[12px] font-bold text-[var(--t3)]">البريد الإلكتروني</label>
              <Input value={form.email || ''} onChange={e => set('email', e.target.value)} type="email" />
            </FormField>
            <FormField className="flex items-end">
              <label className="text-[12px] font-bold text-[var(--t3)] mb-1">حالة العميل</label>
              <div className="flex items-center gap-2 py-2">
                <Switch checked={form.active} onChange={v => set('active', v)} />
                <span className="text-[12.5px] text-[var(--t2)]">{form.active ? 'نشط' : 'غير نشط'}</span>
              </div>
            </FormField>

            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">النشاط</label>
              <Input value={form.activity || ''} onChange={e => set('activity', e.target.value)} />
            </FormField>
            <FormField span={2}>
              <label className="text-[12px] font-bold text-[var(--t3)]">الشكل القانوني</label>
              <Select value={form.legal_form_id ?? ''} onChange={e => set('legal_form_id', e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">-- اختر --</option>
                {legalForms.map((lf: any) => (
                  <option key={lf.id} value={lf.id}>{lf.name}</option>
                ))}
              </Select>
            </FormField>
          </FormGrid>
        )}

        {/* ── تبويب 1: الوثائق القانونية ── */}
        {activeTab === '1' && (
          <FormGrid cols={2}>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">رقم السجل التجاري (RC)</label>
              <Input value={form.rc || ''} onChange={e => set('rc', e.target.value)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">تاريخ السجل التجاري</label>
              <Input type="date" value={form.rc_date || ''} onChange={e => set('rc_date', e.target.value)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">NIF</label>
              <Input value={form.nif || ''} onChange={e => set('nif', e.target.value)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">NIS</label>
              <Input value={form.nis || ''} onChange={e => set('nis', e.target.value)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">AI</label>
              <Input value={form.ai || ''} onChange={e => set('ai', e.target.value)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">رأس المال</label>
              <Input type="number" value={form.capital_amount || ''} onChange={e => set('capital_amount', parseFloat(e.target.value) || 0)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">رقم CNAS</label>
              <Input value={form.cnas_number || ''} onChange={e => set('cnas_number', e.target.value)} />
            </FormField>
          </FormGrid>
        )}

        {/* ── تبويب 2: المعلومات المالية ── */}
        {activeTab === '2' && (
          <FormGrid cols={2}>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">الرصيد الافتتاحي (دج)</label>
              <Input type="number" value={form.initial_balance} onChange={e => set('initial_balance', parseFloat(e.target.value) || 0)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">سقف الائتمان (دج)</label>
              <Input type="number" value={form.credit_limit} onChange={e => set('credit_limit', parseFloat(e.target.value) || 0)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">أيام الائتمان</label>
              <Input type="number" value={form.credit_days} onChange={e => set('credit_days', parseInt(e.target.value) || 30)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">مستوى السعر</label>
              <Select value={form.default_price_level_id ?? ''} onChange={e => set('default_price_level_id', e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">-- الافتراضي --</option>
                {priceLevels.map((pl: any) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">اسم البنك</label>
              <Input value={form.bank_name || ''} onChange={e => set('bank_name', e.target.value)} />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">RIB</label>
              <Input value={form.rib || ''} onChange={e => set('rib', e.target.value)} />
            </FormField>
          </FormGrid>
        )}

        {/* ── تبويب 3: إعدادات إضافية ── */}
        {activeTab === '3' && (
          <div className="flex flex-col gap-4 py-2">
            {[
              { key: 'is_taxable',        label: 'خاضع للضريبة'           },
              { key: 'is_tva_exempt',     label: 'معفى من TVA'            },
              { key: 'is_final_consumer', label: 'مستهلك نهائي'           },
              { key: 'is_vat_registered', label: 'مسجل في منظومة الـ TVA' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-[var(--b1)]">
                <span className="text-[13px] text-[var(--t2)]">{label}</span>
                <Switch checked={(form as any)[key]} onChange={v => set(key, v)} />
              </div>
            ))}
            {form.is_vat_registered && (
              <FormField>
                <label className="text-[12px] font-bold text-[var(--t3)]">تاريخ التسجيل في TVA</label>
                <Input type="date" value={form.vat_registration_date || ''} onChange={e => set('vat_registration_date', e.target.value)} />
              </FormField>
            )}
          </div>
        )}

      </div>
    </Modal>
  )
}
```

## FILE: resources/js/components/modals/CompanyFormDrawer.tsx
```
// resources/js/components/modals/CompanyFormDrawer.tsx
import React, { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/cn'
import { useAuth } from '@/context/AuthContext'
import client from '@/lib/api/core/client'
import { Button }    from '@/components/ui/Button'
import { Alert }     from '@/components/ui/Alert'
import { Input, Textarea, FormField, FormGrid, Select } from '@/components/ui/FormInputs'
import { Switch }    from '@/components/ui/Misc'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Company {
  id: number; name: string; commercial_name?: string; slug: string
  email?: string; phone?: string; mobile?: string; address?: string
  nif?: string; nis?: string; rc?: string; ai?: string
  activity?: string; legal_form_id?: number; active?: boolean
  plan?: string; notes?: string; max_users?: number
  max_warehouses?: number; max_products?: number
}

interface Props {
  open:      boolean
  company?:  Company | null
  onClose:   () => void
  onSaved?:  (company: Company) => void
}

function extractErrorMessage(error: unknown, fallback = 'حدث خطأ'): string {
  if (!error) return fallback
  const e = error as any
  const errs = e?.response?.data?.errors
  if (errs && typeof errs === 'object') {
    const msgs = Object.values(errs).flat() as string[]
    if (msgs.length) return msgs[0]
  }
  return e?.response?.data?.message ?? e?.message ?? fallback
}

const TABS = [
  { key: 'basic', label: 'المعلومات الأساسية', icon: 'ti-building'          },
  { key: 'legal', label: 'الوثائق القانونية',  icon: 'ti-file-certificate'  },
] as const

type TabKey = typeof TABS[number]['key'] | 'admin'

// ─── Component ────────────────────────────────────────────────────────────────
export default function CompanyFormDrawer({ open, company, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const qc       = useQueryClient()
  const isEdit   = !!company
  const isSuperAdmin = (user as any)?.is_super_admin === true

  const nameRef = useRef<HTMLInputElement>(null)
  const [tab,   setTab]   = useState<TabKey>('basic')
  const [error, setError] = useState('')

  const initForm = () => ({
    name:            company?.name            ?? '',
    commercial_name: company?.commercial_name ?? '',
    email:           company?.email           ?? '',
    phone:           company?.phone           ?? '',
    mobile:          company?.mobile          ?? '',
    address:         company?.address         ?? '',
    activity:        company?.activity        ?? '',
    legal_form_id:   String(company?.legal_form_id ?? ''),
    active:          company?.active !== false,
    nif:             company?.nif   ?? '',
    nis:             company?.nis   ?? '',
    rc:              company?.rc    ?? '',
    ai:              company?.ai    ?? '',
    // super admin only
    plan:            company?.plan            ?? 'free',
    max_users:       String(company?.max_users       ?? ''),
    max_warehouses:  String(company?.max_warehouses  ?? ''),
    max_products:    String(company?.max_products    ?? ''),
    notes:           company?.notes           ?? '',
  })

  const [form, setForm] = useState(initForm)

  useEffect(() => {
    if (open) {
      setForm(initForm())
      setError('')
      setTab('basic')
      setTimeout(() => nameRef.current?.focus(), 80)
    }
  }, [open, company?.id])

  // keyboard close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  const f = <K extends keyof typeof form>(k: K) =>
    (v: (typeof form)[K]) => setForm(p => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: async () => {
      setError('')
      const basicPayload = {
        name:            form.name.trim(),
        commercial_name: form.commercial_name || undefined,
        email:           form.email    || undefined,
        phone:           form.phone    || undefined,
        mobile:          form.mobile   || undefined,
        address:         form.address  || undefined,
        activity:        form.activity || undefined,
        legal_form_id:   form.legal_form_id ? parseInt(form.legal_form_id) : undefined,
        nif:             form.nif || undefined,
        nis:             form.nis || undefined,
        rc:              form.rc  || undefined,
        ai:              form.ai  || undefined,
        active:          form.active,
      }
      const adminPayload = isSuperAdmin ? {
        plan:           form.plan,
        max_users:      form.max_users      ? parseInt(form.max_users)      : undefined,
        max_warehouses: form.max_warehouses ? parseInt(form.max_warehouses) : undefined,
        max_products:   form.max_products   ? parseInt(form.max_products)   : undefined,
        notes:          form.notes || undefined,
      } : {}

      if (isEdit) {
        const identifier = company!.slug
        const res = await client.put(`/companies/${identifier}`, basicPayload)
        const saved: Company = res.data?.data ?? res.data
        if (isSuperAdmin) {
          await client.patch(`/companies/${identifier}/plan`, adminPayload)
          if (adminPayload.notes !== undefined)
            await client.patch(`/companies/${identifier}/notes`, { notes: adminPayload.notes })
        }
        return saved
      } else {
        const res = await client.post('/companies', { ...basicPayload, ...adminPayload })
        return (res.data?.data ?? res.data) as Company
      }
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      onSaved?.(saved)
      onClose()
    },
    onError: (e: unknown) => {
      setError(extractErrorMessage(e, isEdit ? 'فشل تحديث الشركة' : 'فشل إنشاء الشركة'))
    },
  })

  if (!open) return null

  const allTabs = [
    ...TABS,
    ...(isSuperAdmin ? [{ key: 'admin' as const, label: 'إدارة (Super Admin)', icon: 'ti-shield' }] : []),
  ]

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-[6px] flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget && !mutation.isPending) onClose() }}
      >
        <div className="bg-[var(--bg2)] rounded-[var(--r4)] w-full max-w-[640px] border border-[var(--b3)] shadow-[0_24px_64px_rgba(0,0,0,.3)] max-h-[92vh] flex flex-col">

          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--b2)] flex-shrink-0">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--emb)] flex items-center justify-center text-[18px] text-[var(--em)] flex-shrink-0">
              <i className={`ti ${isEdit ? 'ti-building-cog' : 'ti-building-plus'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-extrabold text-[var(--t1)]">
                {isEdit ? `تعديل: ${company!.name}` : 'شركة جديدة'}
              </div>
              <div className="text-[11px] text-[var(--t4)] mt-px">
                {isEdit ? `slug: ${company!.slug}` : 'ملء البيانات الأساسية للبدء'}
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              className={cn(
                'w-[30px] h-[30px] rounded-[8px] border border-[var(--b2)]',
                'bg-[var(--bg3)] flex items-center justify-center',
                'text-[var(--t3)] text-[14px] cursor-pointer transition-all duration-150',
                'hover:bg-[var(--redb)] hover:text-[var(--red)]',
                'disabled:opacity-50',
              )}
            >
              <i className="ti ti-x" />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-[var(--b2)] px-5 flex-shrink-0 overflow-x-auto scrollbar-none">
            {allTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-[6px] px-4 py-[10px]',
                  'bg-transparent border-none text-[12px] font-bold cursor-pointer',
                  'border-b-2 -mb-px transition-colors duration-150 whitespace-nowrap font-sans',
                  tab === t.key
                    ? 'text-[var(--em)] border-[var(--em)]'
                    : 'text-[var(--t4)] border-transparent hover:text-[var(--t2)]',
                )}
              >
                <i className={`ti ${t.icon} text-[14px]`} />
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Body ── */}
          <div className="p-5 overflow-y-auto flex-1">
            {error && (
              <Alert variant="red" className="mb-4">
                <i className="ti ti-alert-circle" />
                {error}
                <button onClick={() => setError('')} className="ms-auto bg-transparent border-none text-inherit cursor-pointer text-[15px]">×</button>
              </Alert>
            )}

            {/* TAB: المعلومات الأساسية */}
            {tab === 'basic' && (
              <div className="flex flex-col gap-[14px]">
                <FormGrid cols={2}>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">اسم الشركة <span className="text-[var(--red)]">*</span></label>
                    <input
                      ref={nameRef}
                      value={form.name}
                      onChange={e => f('name')(e.target.value)}
                      placeholder="مثال: شركة الأمل للتجارة"
                      className="bg-[var(--bg2)] border border-[var(--b3)] rounded-[var(--r2)] px-[11px] py-2 text-[13px] text-[var(--t1)] outline-none font-sans w-full transition-all focus:border-[var(--em)] focus:shadow-[0_0_0_3px_var(--emb)]"
                    />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">الاسم التجاري</label>
                    <Input value={form.commercial_name} onChange={e => f('commercial_name')(e.target.value)} placeholder="Amel Trade" />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">البريد الإلكتروني</label>
                    <Input type="email" value={form.email} onChange={e => f('email')(e.target.value)} placeholder="info@company.dz" dir="ltr" />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">رقم الهاتف</label>
                    <Input value={form.phone} onChange={e => f('phone')(e.target.value)} placeholder="023 000 000" dir="ltr" />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">الموبايل</label>
                    <Input value={form.mobile} onChange={e => f('mobile')(e.target.value)} placeholder="0550 000 000" dir="ltr" />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">النشاط التجاري</label>
                    <Input value={form.activity} onChange={e => f('activity')(e.target.value)} placeholder="تجارة الجملة، صناعة..." />
                  </FormField>
                </FormGrid>

                <FormField>
                  <label className="text-[12px] font-bold text-[var(--t3)]">العنوان</label>
                  <Textarea value={form.address} onChange={e => f('address')(e.target.value)} placeholder="الشارع، الحي، الولاية..." rows={2} />
                </FormField>

                {/* حالة الشركة */}
                <div className="flex items-center gap-3 px-[14px] py-[10px] rounded-[10px] bg-[var(--bg3)] border border-[var(--b1)]">
                  <span className="text-[13px] font-bold text-[var(--t2)] flex-1">حالة الشركة</span>
                  <Switch checked={form.active} onChange={v => f('active')(v)} />
                  <span className={cn('text-[12px] font-bold min-w-[50px]', form.active ? 'text-[var(--em)]' : 'text-[var(--red)]')}>
                    {form.active ? 'نشطة' : 'موقوفة'}
                  </span>
                </div>
              </div>
            )}

            {/* TAB: الوثائق القانونية */}
            {tab === 'legal' && (
              <div className="flex flex-col gap-[14px]">
                <Alert variant="blue">
                  <i className="ti ti-info-circle" />
                  أدخل الأرقام الضريبية والتجارية الخاصة بالشركة (اختياري)
                </Alert>
                <FormGrid cols={2}>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">NIF — رقم التعريف الجبائي</label>
                    <Input value={form.nif} onChange={e => f('nif')(e.target.value)} placeholder="000000000000000" dir="ltr" />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">NIS — رقم الإحصاء</label>
                    <Input value={form.nis} onChange={e => f('nis')(e.target.value)} placeholder="000000000000000" dir="ltr" />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">RC — السجل التجاري</label>
                    <Input value={form.rc} onChange={e => f('rc')(e.target.value)} placeholder="00/00-000000B00" dir="ltr" />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">AI — مقالة الضريبة</label>
                    <Input value={form.ai} onChange={e => f('ai')(e.target.value)} placeholder="00000000000" dir="ltr" />
                  </FormField>
                </FormGrid>
                <FormField>
                  <label className="text-[12px] font-bold text-[var(--t3)]">الشكل القانوني</label>
                  <Select value={form.legal_form_id} onChange={e => f('legal_form_id')(e.target.value)}>
                    <option value="">اختر الشكل القانوني</option>
                    <option value="1">مؤسسة فردية</option>
                    <option value="2">SARL</option>
                    <option value="3">SPA</option>
                    <option value="4">SNC</option>
                    <option value="5">EURL</option>
                  </Select>
                </FormField>
              </div>
            )}

            {/* TAB: Super Admin */}
            {tab === 'admin' && isSuperAdmin && (
              <div className="flex flex-col gap-[14px]">
                <Alert variant="em">
                  <i className="ti ti-shield-check" />
                  هذه الإعدادات مرئية للـ Super Admin فقط
                </Alert>
                <FormField>
                  <label className="text-[12px] font-bold text-[var(--t3)]">خطة الاشتراك</label>
                  <Select value={form.plan} onChange={e => f('plan')(e.target.value)}>
                    <option value="free">مجاني</option>
                    <option value="starter">مبتدئ</option>
                    <option value="professional">احترافي</option>
                    <option value="enterprise">مؤسسي</option>
                  </Select>
                </FormField>
                <FormGrid cols={3}>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">حد المستخدمين</label>
                    <Input value={form.max_users} onChange={e => f('max_users')(e.target.value)} placeholder="3" dir="ltr" />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">حد المستودعات</label>
                    <Input value={form.max_warehouses} onChange={e => f('max_warehouses')(e.target.value)} placeholder="1" dir="ltr" />
                  </FormField>
                  <FormField>
                    <label className="text-[12px] font-bold text-[var(--t3)]">حد المنتجات</label>
                    <Input value={form.max_products} onChange={e => f('max_products')(e.target.value)} placeholder="500" dir="ltr" />
                  </FormField>
                </FormGrid>
                <FormField>
                  <label className="text-[12px] font-bold text-[var(--t3)]">ملاحظات (داخلية)</label>
                  <Textarea value={form.notes} onChange={e => f('notes')(e.target.value)} placeholder="ملاحظات للإدارة..." rows={3} />
                </FormField>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-[14px] border-t border-[var(--b2)] flex-shrink-0 flex gap-[10px] justify-end bg-[var(--bg3)] rounded-b-[var(--r4)]">
            <Button onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
            <Button
              variant="primary"
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!form.name.trim()}
            >
              <i className="ti ti-device-floppy text-[13px]" />
              {mutation.isPending
                ? (isEdit ? 'جارٍ الحفظ...' : 'جارٍ الإنشاء...')
                : (isEdit ? 'حفظ التغييرات' : 'إنشاء الشركة')}
            </Button>
          </div>

        </div>
      </div>
    </>
  )
}
```

## FILE: resources/js/components/modals/CreateCompanyModal.tsx
```
// resources/js/components/modals/CreateCompanyModal.tsx
// مودال إنشاء شركة — خطوتان: معلومات الشركة + السنة المالية
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn }          from '@/lib/cn'
import client          from '@/lib/api/core/client'
import { appActions }  from '@/lib/store/appStore'
import { Button }      from '@/components/ui/Button'
import { Alert }       from '@/components/ui/Alert'
import { Input, FormField, FormGrid } from '@/components/ui/FormInputs'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Company {
  id: number; name: string; slug: string
  commercial_name?: string; email?: string; phone?: string
  mobile?: string; address?: string; nif?: string; nis?: string
  rc?: string; ai?: string; activity?: string
}
interface FiscalYear { id: number; name: string; start_date: string; end_date: string }

interface Props {
  open:     boolean
  onClose:  () => void
  onDone?:  (company: Company, fy: FiscalYear) => void
}

const currentYear = new Date().getFullYear()

// ─── Shared sub-components ────────────────────────────────────────────────────

function GradientHeader({ step, onClose, onBack, icon, title, sub }: {
  step: 1 | 2; onClose?: () => void; onBack?: () => void
  icon: string; title: string; sub: string
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[var(--em)] to-[var(--em3)] px-6 py-[22px]">
      {/* Decorative circles */}
      <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-white/[.06]" />
      <div className="absolute -bottom-8 right-2 w-24 h-24 rounded-full bg-white/[.04]" />

      {/* Back / Close */}
      <div className="absolute top-[14px] left-4 flex gap-2">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 px-[10px] py-1 rounded-[20px] border border-white/25 bg-white/10 text-white text-[11px] font-bold font-sans cursor-pointer">
            <i className="ti ti-arrow-right text-[11px]" /> رجوع
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="w-[30px] h-[30px] rounded-full border-none bg-white/15 text-white cursor-pointer text-[16px] flex items-center justify-center backdrop-blur-[4px]">
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative mt-2">
        <div className="w-[46px] h-[46px] rounded-[13px] bg-white/20 backdrop-blur-[8px] flex items-center justify-center text-[22px] mb-[10px]">
          {icon}
        </div>
        <div className="text-[17px] font-black text-white mb-[3px]">{title}</div>
        <div className="text-[12px] text-white/75">{sub}</div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-[6px] mt-[14px]">
        <div className={cn('flex-1 h-[3px] rounded-[3px]', step >= 1 ? 'bg-white/90' : 'bg-white/30')} />
        <div className={cn('flex-1 h-[3px] rounded-[3px]', step >= 2 ? 'bg-white/90' : 'bg-white/30')} />
      </div>
      <div className="flex justify-between mt-[5px]">
        <span className={cn('text-[9px] font-bold', step === 1 ? 'text-white/90' : 'text-white/50')}>معلومات الشركة</span>
        <span className={cn('text-[9px] font-bold', step === 2 ? 'text-white/90' : 'text-white/50')}>السنة المالية</span>
      </div>
    </div>
  )
}

function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-extrabold text-[var(--t4)] uppercase tracking-[1.2px] mb-3 mt-1 pb-2 border-b border-[var(--b1)]">
      <i className={`ti ${icon} text-[13px] text-[var(--em)] opacity-70`} />
      {label}
    </div>
  )
}

// ─── Step 1: Company Info ──────────────────────────────────────────────────────
function StepCompany({ onNext, onClose }: { onNext: (c: Company) => void; onClose: () => void }) {
  const [name, setName]               = useState('')
  const [commercialName, setCommercial] = useState('')
  const [activity, setActivity]       = useState('')
  const [phone, setPhone]             = useState('')
  const [mobile, setMobile]           = useState('')
  const [email, setEmail]             = useState('')
  const [address, setAddress]         = useState('')
  const [nif, setNif]                 = useState('')
  const [nis, setNis]                 = useState('')
  const [rc, setRc]                   = useState('')
  const [ai, setAi]                   = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [showDocs, setShowDocs]       = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const handleSubmit = async () => {
    const n = name.trim()
    if (!n) { setError('اسم الشركة إلزامي'); return }
    setLoading(true); setError(null)
    try {
      const payload: Record<string, string> = { name: n }
      if (commercialName.trim()) payload.commercial_name = commercialName.trim()
      if (activity.trim()) payload.activity = activity.trim()
      if (phone.trim())    payload.phone    = phone.trim()
      if (mobile.trim())   payload.mobile   = mobile.trim()
      if (email.trim())    payload.email    = email.trim()
      if (address.trim())  payload.address  = address.trim()
      if (nif.trim())      payload.nif      = nif.trim()
      if (nis.trim())      payload.nis      = nis.trim()
      if (rc.trim())       payload.rc       = rc.trim()
      if (ai.trim())       payload.ai       = ai.trim()
      const res = await client.post('/companies', payload)
      onNext(res.data?.data ?? res.data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'فشل إنشاء الشركة')
    } finally { setLoading(false) }
  }

  return (
    <>
      <GradientHeader step={1} onClose={onClose} icon="🏢" title="إنشاء شركة جديدة" sub="أدخل بيانات شركتك — حقل الاسم إلزامي فقط" />
      <div className="px-[22px] py-5 overflow-y-auto max-h-[calc(85vh-200px)]">
        {error && <Alert variant="red" className="mb-4"><i className="ti ti-alert-circle" />{error}</Alert>}

        {/* Company name — prominent */}
        <div className="mb-[14px]">
          <label className="flex items-center gap-[6px] text-[12px] font-extrabold text-[var(--t2)] mb-[6px]">
            <i className="ti ti-building-store text-[var(--em)] text-[13px]" />
            اسم الشركة <span className="text-[var(--red)] text-[14px]">*</span>
            <span className="text-[9px] px-2 py-px rounded-[20px] bg-[var(--emb)] text-[var(--em)] font-bold ms-0.5">إلزامي</span>
          </label>
          <input
            ref={nameRef}
            value={name}
            onChange={e => { setName(e.target.value); setError(null) }}
            placeholder="مثال: شركة الأمل للتجارة والخدمات"
            className={cn(
              'w-full px-[14px] py-3 rounded-[11px] outline-none font-sans text-[14px] font-bold text-[var(--t1)]',
              'transition-all duration-150',
              name.trim()
                ? 'border-2 border-[var(--em)] bg-[var(--emb)] shadow-[0_0_0_3px_var(--emb)]'
                : 'border-2 border-[var(--b2)] bg-[var(--bg3)] focus:border-[var(--em)] focus:bg-[var(--emb)]',
            )}
          />
        </div>

        <FormGrid cols={2}>
          <FormField>
            <label className="text-[12px] font-bold text-[var(--t3)]"><i className="ti ti-certificate text-[var(--em)] me-1" />الاسم التجاري</label>
            <Input value={commercialName} onChange={e => setCommercial(e.target.value)} placeholder="الاسم التجاري (اختياري)" />
          </FormField>
          <FormField>
            <label className="text-[12px] font-bold text-[var(--t3)]"><i className="ti ti-briefcase text-[var(--em)] me-1" />النشاط / القطاع</label>
            <Input value={activity} onChange={e => setActivity(e.target.value)} placeholder="مثال: تجارة جملة" />
          </FormField>
        </FormGrid>

        <SectionTitle icon="ti-phone" label="معلومات التواصل" />
        <FormGrid cols={2}>
          <FormField>
            <label className="text-[12px] font-bold text-[var(--t3)]">الهاتف</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="023 xx xx xx" type="tel" dir="ltr" />
          </FormField>
          <FormField>
            <label className="text-[12px] font-bold text-[var(--t3)]">الجوال</label>
            <Input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="06 xx xx xx xx" type="tel" dir="ltr" />
          </FormField>
        </FormGrid>
        <FormField className="mb-3">
          <label className="text-[12px] font-bold text-[var(--t3)]">البريد الإلكتروني</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@company.dz" type="email" dir="ltr" />
        </FormField>
        <FormField className="mb-4">
          <label className="text-[12px] font-bold text-[var(--t3)]">العنوان</label>
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="الشارع، البلدية، الولاية" />
        </FormField>

        {/* Legal docs — collapsible */}
        <button
          onClick={() => setShowDocs(v => !v)}
          className={cn(
            'w-full px-3 py-[9px] rounded-[10px] border border-dashed border-[var(--b3)]',
            'bg-transparent text-[var(--t4)] text-[12px] font-bold cursor-pointer font-sans',
            'flex items-center justify-between transition-all duration-150',
            'hover:bg-[var(--bg3)] hover:text-[var(--t2)]',
            showDocs ? 'mb-[14px]' : 'mb-1',
          )}
        >
          <span className="flex items-center gap-[7px]">
            <i className="ti ti-file-text text-[13px]" />
            الوثائق القانونية والجبائية
            <span className="text-[9px] px-[6px] py-px rounded-[10px] bg-[var(--bg4)] text-[var(--t4)]">اختياري</span>
          </span>
          <i className={`ti ti-chevron-${showDocs ? 'up' : 'down'} text-[12px]`} />
        </button>

        {showDocs && (
          <div className="bg-[var(--bg3)] rounded-[12px] border border-[var(--b1)] p-[14px] pb-1 mb-[14px]">
            <SectionTitle icon="ti-license" label="الأرقام الجبائية" />
            <FormGrid cols={2}>
              {[
                { label: 'رقم NIF', val: nif, set: setNif, hint: 'رقم التعريف الجبائي' },
                { label: 'رقم NIS', val: nis, set: setNis, hint: 'رقم التعريف الإحصائي' },
                { label: 'رقم RC',  val: rc,  set: setRc  },
                { label: 'رقم AI',  val: ai,  set: setAi  },
              ].map(({ label, val, set, hint }) => (
                <FormField key={label}>
                  <label className="text-[12px] font-bold text-[var(--t3)]">{label}</label>
                  <Input value={val} onChange={e => set(e.target.value)} placeholder={hint ?? label} dir="ltr" />
                  {hint && <span className="text-[10px] text-[var(--t4)] mt-0.5">{hint}</span>}
                </FormField>
              ))}
            </FormGrid>
          </div>
        )}
      </div>

      <div className="px-[22px] py-3 border-t border-[var(--b1)] flex gap-[10px]">
        <Button onClick={onClose} className="flex-1 justify-center" size="lg">إلغاء</Button>
        <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={!name.trim()} className="flex-[2] justify-center" size="lg">
          {!loading && <><span>التالي: السنة المالية</span><i className="ti ti-arrow-left text-[14px]" /></>}
        </Button>
      </div>
    </>
  )
}

// ─── Step 2: Fiscal Year ───────────────────────────────────────────────────────
function StepFiscalYear({ company, onDone, onBack }: {
  company: Company; onDone: (fy: FiscalYear) => void; onBack: () => void
}) {
  const [yearNum,   setYearNum]   = useState(String(currentYear))
  const [startDate, setStart]     = useState(`${currentYear}-01-01`)
  const [endDate,   setEnd]       = useState(`${currentYear}-12-31`)
  const [useCustom, setUseCustom] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    const y = parseInt(yearNum)
    if (!isNaN(y) && y >= 2000 && y <= 2100 && !useCustom) {
      setStart(`${y}-01-01`); setEnd(`${y}-12-31`)
    }
  }, [yearNum, useCustom])

  const validYear = !isNaN(parseInt(yearNum)) && parseInt(yearNum) >= 2000 && parseInt(yearNum) <= 2100

  const handleCreate = async () => {
    if (!validYear) { setError('أدخل سنة صحيحة بين 2000 و 2100'); return }
    if (startDate >= endDate) { setError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية'); return }
    setLoading(true); setError(null)
    try {
      const res = await client.post(`/${company.slug}/fiscal-years`, {
        name: yearNum, start_date: startDate, end_date: endDate, is_current: true,
      }, { _skipSlug: true } as any)
      onDone(res.data?.data ?? res.data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'فشل إنشاء السنة المالية')
    } finally { setLoading(false) }
  }

  const quickYears = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <>
      <GradientHeader step={2} onBack={onBack} icon="🗓️" title="السنة المالية الأولى" sub={`لـ ${company.name}`} />
      <div className="px-[22px] py-5">
        <Alert variant="em" className="mb-4">
          <i className="ti ti-info-circle text-[15px] flex-shrink-0 mt-px" />
          <span>السنة المالية ضرورية للبدء بتسجيل الفواتير والحركات المالية. يمكنك إضافة سنوات أخرى لاحقاً.</span>
        </Alert>

        {error && <Alert variant="red" className="mb-4"><i className="ti ti-alert-circle" />{error}</Alert>}

        {/* Year picker */}
        <div className="mb-4">
          <label className="flex items-center gap-[5px] text-[11px] font-bold text-[var(--t3)] mb-[6px]">
            <i className="ti ti-calendar text-[var(--em)] text-[12px]" />السنة <span className="text-[var(--red)] text-[13px]">*</span>
          </label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {quickYears.map(y => (
              <button
                key={y}
                onClick={() => { setYearNum(String(y)); setError(null) }}
                className={cn(
                  'px-4 py-[7px] rounded-[20px] text-[13px] font-extrabold border-2 cursor-pointer font-sans transition-all duration-150',
                  yearNum === String(y)
                    ? 'border-[var(--em)] bg-[var(--em)] text-white shadow-[var(--emglow)]'
                    : 'border-[var(--b2)] bg-[var(--bg3)] text-[var(--t2)] hover:border-[var(--em)]',
                )}
              >
                {y}{y === currentYear && <span className="text-[8px] ms-1 opacity-80">الحالية</span>}
              </button>
            ))}
            <input
              type="number" value={yearNum} min={2000} max={2100} dir="ltr"
              onChange={e => { setYearNum(e.target.value); setError(null) }}
              className="w-[90px] px-[10px] py-[7px] rounded-[20px] border-2 border-[var(--b2)] bg-[var(--bg3)] text-[var(--t1)] text-[13px] font-bold outline-none font-mono focus:border-[var(--em)]"
            />
          </div>
        </div>

        {/* Custom dates toggle */}
        <button
          onClick={() => setUseCustom(v => !v)}
          className="flex items-center gap-2 text-[12px] font-bold text-[var(--t4)] mb-4 cursor-pointer bg-transparent border-none hover:text-[var(--t2)] transition-colors"
        >
          <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-all', useCustom ? 'bg-[var(--em)] border-[var(--em)]' : 'border-[var(--b3)]')}>
            {useCustom && <i className="ti ti-check text-[9px] text-white" />}
          </div>
          تحديد تواريخ مخصصة
        </button>

        {useCustom && (
          <FormGrid cols={2}>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">تاريخ البداية</label>
              <Input type="date" value={startDate} onChange={e => setStart(e.target.value)} dir="ltr" />
            </FormField>
            <FormField>
              <label className="text-[12px] font-bold text-[var(--t3)]">تاريخ النهاية</label>
              <Input type="date" value={endDate} onChange={e => setEnd(e.target.value)} dir="ltr" />
            </FormField>
          </FormGrid>
        )}

        {!useCustom && validYear && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--r2)] bg-[var(--bg3)] border border-[var(--b1)] text-[12px] text-[var(--t3)] font-mono">
            <i className="ti ti-calendar-check text-[var(--em)]" />
            {startDate} — {endDate}
          </div>
        )}
      </div>

      <div className="px-[22px] py-3 border-t border-[var(--b1)] flex gap-[10px]">
        <Button onClick={onBack} className="flex-1 justify-center" size="lg">رجوع</Button>
        <Button variant="primary" onClick={handleCreate} loading={loading} disabled={!validYear} className="flex-[2] justify-center" size="lg">
          {!loading && <><i className="ti ti-rocket text-[14px]" /><span>إنشاء وانطلاق</span></>}
        </Button>
      </div>
    </>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function CreateCompanyModal({ open, onClose, onDone }: Props) {
  const [step,    setStep]    = useState<1 | 2>(1)
  const [company, setCompany] = useState<Company | null>(null)

  useEffect(() => { if (open) { setStep(1); setCompany(null) } }, [open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  const handleCompanyCreated = (c: Company) => { setCompany(c); setStep(2) }

  const handleFiscalYearDone = useCallback((fy: FiscalYear) => {
    if (!company) return
    appActions.setActiveCompany({ id: company.id, name: company.name, slug: company.slug })
    onDone?.(company, fy)
    onClose()
  }, [company, onDone, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10002] bg-black/60 backdrop-blur-[6px] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--bg2)] rounded-[var(--r4)] w-full max-w-[500px] border border-[var(--b3)] shadow-[0_24px_64px_rgba(0,0,0,.35)] max-h-[90vh] flex flex-col overflow-hidden">
        {step === 1 && <StepCompany onNext={handleCompanyCreated} onClose={onClose} />}
        {step === 2 && company && (
          <StepFiscalYear company={company} onDone={handleFiscalYearDone} onBack={() => setStep(1)} />
        )}
      </div>
    </div>
  )
}
```

## FILE: resources/js/components/modals/DataSeedingModal.tsx
```
// ════════════════════════════════════════════════════════════════════
// components/modals/DataSeedingModal.tsx
// ✅ مصحح + تجربة بصرية جديدة:
//   - السيدر الجاري يظهر أعلى القائمة في بطاقة بارزة
//   - كل عنصر مكتمل يبقى مرئياً ويتراكم
//   - auto-scroll للعنصر النشط
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useRef, useEffect } from 'react';
import client from '@/lib/api/core/client';
import Modal from '@/components/ui/Modal';

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
      { key: 'treasury_accounts', label: 'حسابات الخزينة',   endpoint: 'treasury-accounts' },
      { key: 'payment_modes',     label: 'طرق الدفع',         endpoint: 'payment-modes' },
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
  const [phase, setPhase]           = useState<Phase>('select');
  const [enabled, setEnabled]       = useState<Set<string>>(
    () => new Set(SEED_GROUPS.filter(g => g.required || g.recommended).map(g => g.id))
  );
  const [logs, setLogs]             = useState<SeedLog[]>([]);
  const [totalDone, setTotalDone]   = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasErrors, setHasErrors]   = useState(false);
  const [currentKey, setCurrentKey] = useState('');

  // ref لكل سجل — للـ auto-scroll
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedGroups = SEED_GROUPS.filter(g => enabled.has(g.id));
  const selectedSeeds  = selectedGroups.flatMap(g => g.seeds);
  const progress = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;

  // scroll للعنصر النشط حين يتغير
  useEffect(() => {
    if (currentKey && itemRefs.current[currentKey]) {
      itemRefs.current[currentKey]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentKey]);

const handleApply = async () => {
  if (selectedSeeds.length === 0) { onComplete(); return; }
  setTotalCount(selectedSeeds.length);
  setTotalDone(0);
  setHasErrors(false);
  setPhase('applying');
  setLogs(selectedSeeds.map(s => ({ key: s.key, label: s.label, status: 'idle' })));

  let done = 0, errors = false;
  // الحصول على التوكن من localStorage
  const token = localStorage.getItem('auth_token');

  for (const seed of selectedSeeds) {
    setCurrentKey(seed.key);
    setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'running' } : l));
    try {
      // ✅ استخدام fetch مباشرة بدلاً من client.post
      const response = await fetch(`/api/v1/${companySlug}/seeds/${seed.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'فشل');
      }

      done++;
      setTotalDone(done);
      setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'done' } : l));
    } catch (err: any) {
      errors = true;
      done++;
      setTotalDone(done);
      setLogs(prev => prev.map(l =>
        l.key === seed.key
          ? { ...l, status: 'error', message: err?.message ?? 'فشل' }
          : l
      ));
    }
  }
  setCurrentKey('');
  setHasErrors(errors);
  setPhase('done');
};
  const toggleGroup = (id: string) => {
    const g = SEED_GROUPS.find(g => g.id === id);
    if (g?.required) return;
    setEnabled(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const totalSelected = selectedSeeds.length;
  const totalAll      = SEED_GROUPS.flatMap(g => g.seeds).length;

  // ─────────────────────────────────────────────────────────
  // PHASE: select
  // ─────────────────────────────────────────────────────────
  const renderSelect = () => (
    <div>
      {/* ملخص */}
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
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', marginBottom: 2 }}>{companyName}</div>
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
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: isOn ? 'var(--em)' : 'var(--bg4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}>
                <i className={`ti ${group.tabler}`} style={{ fontSize: 18, color: isOn ? '#fff' : 'var(--t4)' }} />
              </div>

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

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {isOn && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: 'var(--em)',
                    background: 'var(--emb)', padding: '2px 8px', borderRadius: 20,
                  }}>
                    {group.seeds.length}
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
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: isOn ? 'var(--em)' : 'var(--b3)',
                    position: 'relative', transition: 'background .2s', flexShrink: 0,
                  }}>
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

  // ─────────────────────────────────────────────────────────
  // PHASE: applying — التجربة البصرية الجديدة
  // ─────────────────────────────────────────────────────────
  const renderApplying = () => {
    const currentLog = logs.find(l => l.status === 'running');
    const doneLogs   = logs.filter(l => l.status === 'done' || l.status === 'error');
    const idleLogs   = logs.filter(l => l.status === 'idle');

    return (
      <div style={{ direction: 'rtl' }}>

        {/* ── شريط التقدم العلوي ── */}
        <div style={{
          background: 'var(--bg3)', borderRadius: 14, padding: '14px 18px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t4)', fontWeight: 600 }}>
              {totalDone} / {totalCount} عنصر
            </span>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--em)' }}>{progress}%</span>
          </div>
          <div style={{ height: 7, background: 'var(--b2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg, var(--em), var(--em) 80%, rgba(10,138,92,.4))',
              width: `${progress}%`,
              transition: 'width .5s cubic-bezier(.4,0,.2,1)',
              position: 'relative',
            }}>
              {/* نبضة عند نهاية الشريط */}
              <div style={{
                position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--em)',
                boxShadow: '0 0 0 3px var(--emb)',
                animation: 'pingPulse 1.2s ease infinite',
              }} />
            </div>
          </div>
        </div>

        {/* ── بطاقة السيدر النشط (الأهم — دائماً في الأعلى) ── */}
        {currentLog && (
          <div style={{
            borderRadius: 14,
            border: '2px solid var(--em)',
            background: 'var(--emb, rgba(10,138,92,.06))',
            padding: '14px 18px',
            marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 14,
            animation: 'slideInActive .3s cubic-bezier(.34,1.56,.64,1)',
            boxShadow: '0 0 0 4px var(--embo, rgba(10,138,92,.08))',
          }}>
            {/* دائرة نبض */}
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: 'var(--em)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 6px var(--emb)',
              animation: 'glowPulse 1.4s ease infinite',
            }}>
              <i className="ti ti-loader-2" style={{
                fontSize: 20, color: '#fff',
                animation: 'spin .8s linear infinite',
              }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 3, fontWeight: 600 }}>
                جارٍ التطبيق الآن...
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--t1)' }}>
                {currentLog.label}
              </div>
            </div>

            {/* مؤشر الخطوة */}
            <div style={{ textAlign: 'center', direction: 'ltr' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--em)', lineHeight: 1 }}>
                {totalDone + 1}
              </div>
              <div style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 700 }}>من {totalCount}</div>
            </div>
          </div>
        )}

        {/* ── قائمة العمليات المكتملة + المنتظرة ── */}
        <div style={{
          maxHeight: 240,
          overflowY: 'auto',
          borderRadius: 12,
          border: '1px solid var(--b1)',
        }}>
          {logs.map((log, i) => {
            const isRunning = log.status === 'running';
            // نخفي العنصر النشط من القائمة (يظهر في البطاقة أعلى)
            if (isRunning) return null;

            return (
              <div
                key={log.key}
                ref={el => { itemRefs.current[log.key] = el; }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                  borderBottom: i < logs.length - 1 ? '1px solid var(--b1)' : 'none',
                  opacity: log.status === 'idle' ? 0.45 : 1,
                  transition: 'opacity .3s, background .2s',
                  animation: log.status === 'done' || log.status === 'error'
                    ? 'itemComplete .35s cubic-bezier(.34,1.4,.64,1)'
                    : 'none',
                }}
              >
                {/* أيقونة الحالة */}
                <div style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background:
                    log.status === 'done'  ? 'var(--emb)'  :
                    log.status === 'error' ? 'var(--redb)' : 'var(--bg4)',
                  transition: 'background .2s',
                }}>
                  {log.status === 'done'  && <i className="ti ti-check" style={{ fontSize: 13, color: 'var(--em)' }} />}
                  {log.status === 'error' && <i className="ti ti-x"     style={{ fontSize: 13, color: 'var(--red)' }} />}
                  {log.status === 'idle'  && <i className="ti ti-circle" style={{ fontSize: 13, color: 'var(--b3)' }} />}
                </div>

                {/* اسم العنصر */}
                <span style={{
                  flex: 1, fontSize: 12,
                  fontWeight: log.status === 'done' ? 600 : 400,
                  color:
                    log.status === 'error' ? 'var(--red)' :
                    log.status === 'done'  ? 'var(--t2)'  : 'var(--t4)',
                  transition: 'color .2s',
                }}>
                  {log.label}
                </span>

                {/* رسالة خطأ أو علامة نجاح */}
                {log.status === 'error' && log.message && (
                  <span style={{
                    fontSize: 10, color: 'var(--red)', maxWidth: 130,
                    textAlign: 'left', opacity: .85, lineHeight: 1.3,
                  }}>
                    {log.message}
                  </span>
                )}
                {log.status === 'done' && (
                  <i className="ti ti-circle-check-filled" style={{ fontSize: 15, color: 'var(--em)', opacity: .7 }} />
                )}
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes spin          { to { transform: rotate(360deg); } }
          @keyframes pingPulse     { 0%,100% { box-shadow: 0 0 0 3px var(--emb); } 50% { box-shadow: 0 0 0 6px transparent; } }
          @keyframes glowPulse     { 0%,100% { box-shadow: 0 0 0 6px var(--emb); } 50% { box-shadow: 0 0 0 10px transparent; } }
          @keyframes slideInActive { from { opacity: 0; transform: translateY(-8px) scale(.97); } to { opacity: 1; transform: none; } }
          @keyframes itemComplete  { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
        `}</style>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // PHASE: done
  // ─────────────────────────────────────────────────────────
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
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--t1)', marginBottom: 6 }}>اكتمل مع بعض الأخطاء</div>
          <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 16 }}>بعض البيانات لم تُطبَّق، يمكنك إضافتها لاحقاً</div>
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
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--t1)', marginBottom: 6 }}>تم الإعداد بنجاح!</div>
          <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 20 }}>
            تم تطبيق <strong style={{ color: 'var(--em)' }}>{totalDone}</strong> عنصر بنجاح على شركة {companyName}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {[
              { label: 'المجموعات', value: selectedGroups.length, icon: 'ti-stack' },
              { label: 'العناصر',   value: totalDone,              icon: 'ti-database' },
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

  // ─────────────────────────────────────────────────────────
  // Footer
  // ─────────────────────────────────────────────────────────
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
            border: 'none',
            background: selectedSeeds.length > 0 ? 'var(--em)' : 'var(--b3)',
            color: selectedSeeds.length > 0 ? '#fff' : 'var(--t4)',
            fontSize: 13, fontWeight: 800,
            cursor: selectedSeeds.length > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: selectedSeeds.length > 0 ? 'var(--emglow)' : 'none',
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
```

## FILE: resources/js/components/modals/SystemBootModal.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// components/modals/SystemBootModal.tsx
//
// مودال تحميل مكونات النظام عند أول دخول للشركة
// يُعرض بعد اختيار السنة المالية وقبل navigate('/dashboard')
// يُنفذ prefetch لجميع الـ lookups حتى تكون جاهزة فور الدخول
//
// الاستخدام:
//   <SystemBootModal
//     companySlug={slug}
//     onComplete={() => navigate('/dashboard', { replace: true })}
//   />
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import client from '@/lib/api/core/client';

// ─── قائمة الموارد المُراد تحميلها مسبقاً ──────────────────────────────────
interface BootResource {
  key: string;          // queryKey الذي يُخزَّن به في React Query cache
  label: string;        // النص المعروض للمستخدم
  endpoint: string;     // المسار النسبي للـ API  (/{slug}/...)
  icon: string;         // tabler icon class
  group: string;        // مجموعة بصرية
  critical: boolean;    // إذا فشل → يُظهر warning لكن لا يوقف التحميل
}

const BOOT_RESOURCES: BootResource[] = [
  // ── مجموعة 1: أساسيات ────────────────────────────────────────────────────
  { key: 'currencies',                label: 'العملات',                    endpoint: 'currencies',                  icon: 'ti-currency-dollar',        group: 'أساسيات',        critical: true  },
  { key: 'tvas',                      label: 'نسب الضريبة TVA',            endpoint: 'tvas',                        icon: 'ti-receipt-tax',            group: 'أساسيات',        critical: true  },
  { key: 'units',                     label: 'وحدات القياس',               endpoint: 'units',                       icon: 'ti-ruler',                  group: 'أساسيات',        critical: true  },
  { key: 'price_levels',              label: 'مستويات الأسعار',            endpoint: 'price-levels',               icon: 'ti-tags',                   group: 'أساسيات',        critical: false },
  { key: 'payment_modes',             label: 'طرق الدفع',                  endpoint: 'payment-modes',              icon: 'ti-credit-card',            group: 'أساسيات',        critical: true  },

  // ── مجموعة 2: منتجات ─────────────────────────────────────────────────────
  { key: 'product_types',             label: 'أنواع المنتجات',             endpoint: 'product-types',              icon: 'ti-box',                    group: 'منتجات',         critical: false },
  { key: 'families',                  label: 'عائلات المنتجات',            endpoint: 'families',                   icon: 'ti-category',               group: 'منتجات',         critical: false },
  { key: 'brands',                    label: 'العلامات التجارية',          endpoint: 'brands',                     icon: 'ti-bookmark',               group: 'منتجات',         critical: false },
  { key: 'warehouses',                label: 'المستودعات',                 endpoint: 'warehouses',                 icon: 'ti-building-warehouse',     group: 'منتجات',         critical: true  },
  { key: 'inventory_valuation',       label: 'طرق تقييم المخزون',         endpoint: 'inventory-valuation-methods',icon: 'ti-chart-bar',              group: 'منتجات',         critical: false },

  // ── مجموعة 3: مالية ──────────────────────────────────────────────────────
  { key: 'treasury_account_types',    label: 'أنواع الخزينة',              endpoint: 'treasury-account-types',     icon: 'ti-building-bank',          group: 'مالية',          critical: false },
  { key: 'treasury_accounts',         label: 'حسابات الخزينة',            endpoint: 'treasury-accounts',          icon: 'ti-cash',                   group: 'مالية',          critical: true  },
  { key: 'expense_categories',        label: 'فئات المصاريف',              endpoint: 'expense-categories',         icon: 'ti-folder',                 group: 'مالية',          critical: false },

  // ── مجموعة 4: مستندات ────────────────────────────────────────────────────
  { key: 'document_types',            label: 'أنواع المستندات',            endpoint: 'document-types',             icon: 'ti-file-description',       group: 'مستندات',        critical: true  },
  { key: 'document_statuses',         label: 'حالات المستندات',            endpoint: 'document-statuses',          icon: 'ti-clipboard-check',        group: 'مستندات',        critical: false },
  { key: 'numbering_series',          label: 'سلاسل الترقيم',              endpoint: 'numbering-series',           icon: 'ti-list-numbers',           group: 'مستندات',        critical: false },

  // ── مجموعة 5: أطراف ──────────────────────────────────────────────────────
  { key: 'party_types',               label: 'أنواع الأطراف',              endpoint: 'party-types',                icon: 'ti-users',                  group: 'أطراف',          critical: false },

  // ── مجموعة 6: بيانات جغرافية ─────────────────────────────────────────────
  { key: 'wilayas',                   label: 'الولايات والبلديات',         endpoint: 'wilayas',                    icon: 'ti-map-pin',                group: 'جغرافيا',        critical: false },
];

const TOTAL = BOOT_RESOURCES.length;

// ─── ألوان المجموعات ──────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  'أساسيات':  'var(--em)',
  'منتجات':   'var(--blue)',
  'مالية':    'var(--gold)',
  'مستندات':  'var(--purple)',
  'أطراف':    'var(--teal)',
  'جغرافيا':  'var(--orange)',
};

// ─── نوع الحالة الفردية ───────────────────────────────────────────────────
type ItemStatus = 'pending' | 'loading' | 'done' | 'error' | 'skipped';

interface ItemState {
  status: ItemStatus;
  ms?: number;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SystemBootModal({
  companySlug,
  onComplete,
}: {
  companySlug: string;
  onComplete: () => void;
}) {
  const qc = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(BOOT_RESOURCES.map(r => [r.key, { status: 'pending' }]))
  );
  const [doneCount, setDoneCount]     = useState(0);
  const [currentLabel, setCurrentLabel] = useState('جارٍ التحضير...');
  const [phase, setPhase]             = useState<'loading' | 'done' | 'error'>('loading');
  const [errors, setErrors]           = useState<string[]>([]);
  const [elapsed, setElapsed]         = useState(0);
  const startRef  = useRef(Date.now());
  const timerRef  = useRef<ReturnType<typeof setInterval>>();
  const doneRef   = useRef(0);
  const listRef   = useRef<HTMLDivElement>(null);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Prefetch runner ──────────────────────────────────────────────────────
  const setItem = useCallback((key: string, patch: Partial<ItemState>) => {
    setItems(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const errs: string[] = [];

      for (const res of BOOT_RESOURCES) {
        if (cancelled) break;

        setCurrentLabel(res.label);
        setItem(res.key, { status: 'loading' });

        // Scroll active item into view
        setTimeout(() => {
          const el = document.getElementById(`boot-item-${res.key}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);

        const t0 = Date.now();
        try {
          // تحقق أولاً: هل البيانات موجودة في cache؟
          const cached = qc.getQueryData([res.key, companySlug]);
          if (cached) {
            setItem(res.key, { status: 'done', ms: 0 });
          } else {
            // endpoint يبدأ بـ slug الشركة إلا إذا كان wilayas (عالمي)
            const url = res.key === 'wilayas'
              ? `/wilayas`
              : `/${companySlug}/${res.endpoint}`;

            const data = await client.get(url, { params: { per_page: 500, no_paginate: 1 } });
            // خزّن في React Query cache مباشرة
            qc.setQueryData([res.key, companySlug], data.data);
            setItem(res.key, { status: 'done', ms: Date.now() - t0 });
          }
        } catch (e: any) {
          const msg = e?.response?.data?.message ?? e?.message ?? 'خطأ';
          setItem(res.key, { status: 'error' });
          errs.push(`${res.label}: ${msg}`);
        }

        doneRef.current += 1;
        setDoneCount(doneRef.current);

        // تأخير بسيط بين الطلبات لتجنب حجب الخادم
        await new Promise(r => setTimeout(r, 60));
      }

      if (!cancelled) {
        clearInterval(timerRef.current);
        setErrors(errs);
        setPhase(errs.length > 0 && errs.length === TOTAL ? 'error' : 'done');
        setCurrentLabel(errs.length === 0 ? 'اكتمل التحميل بنجاح ✓' : `اكتمل مع ${errs.length} تحذيرات`);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [companySlug, qc, setItem]);

  // ── Auto-proceed after done ──────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(onComplete, 900);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  const progress = Math.round((doneCount / TOTAL) * 100);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10050,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(12px)',
      padding: 20, direction: 'rtl',
      animation: 'bootFadeIn .25s ease',
    }}>
      <style>{`
        @keyframes bootFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes bootSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes bootPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes bootSpin { to{transform:rotate(360deg)} }
        @keyframes bootShimmer {
          0%   { background-position: -400px 0 }
          100% { background-position:  400px 0 }
        }
        @keyframes bootPop {
          0%   { transform:scale(.8); opacity:0 }
          60%  { transform:scale(1.12) }
          100% { transform:scale(1); opacity:1 }
        }
        @keyframes bootProgress {
          from { width: 0% }
        }
        .boot-item-row {
          display:flex; align-items:center; gap:10; padding:7px 12px;
          border-radius:10px; transition:background .15s;
        }
        .boot-item-row:hover { background: var(--bg3); }
      `}</style>

      <div style={{
        background: 'var(--bg2)',
        borderRadius: 24,
        width: '100%', maxWidth: 480,
        border: '1px solid var(--b3)',
        boxShadow: '0 32px 80px rgba(0,0,0,.45)',
        overflow: 'hidden',
        animation: 'bootSlideUp .3s cubic-bezier(.34,1.4,.64,1)',
      }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)',
          padding: '24px 28px 20px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* دوائر زخرفية */}
          <div style={{ position:'absolute', top:-50, left:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-30, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />

          <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:16 }}>
            {/* أيقونة */}
            <div style={{
              width:52, height:52, borderRadius:16, flexShrink:0,
              background:'rgba(255,255,255,.2)', backdropFilter:'blur(8px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:24, boxShadow:'0 4px 16px rgba(0,0,0,.2)',
            }}>
              {phase === 'done' ? '✅' : phase === 'error' ? '⚠️' : '⚡'}
            </div>

            <div style={{ flex:1 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#fff', marginBottom:4, lineHeight:1.2 }}>
                {phase === 'done'
                  ? 'النظام جاهز!'
                  : phase === 'error'
                  ? 'اكتمل مع تحذيرات'
                  : 'جارٍ تهيئة النظام'}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>
                {phase === 'loading'
                  ? `تحميل مكونات النظام لتجربة سلسة · ${elapsed}ث`
                  : `اكتمل في ${elapsed} ثانية`}
              </div>
            </div>
          </div>

          {/* شريط التقدم */}
          <div style={{ marginTop:20 }}>
            <div style={{
              height:6, borderRadius:99,
              background:'rgba(255,255,255,.2)',
              overflow:'hidden',
            }}>
              <div style={{
                height:'100%', borderRadius:99,
                background:'rgba(255,255,255,.9)',
                width:`${progress}%`,
                transition:'width .4s cubic-bezier(.4,0,.2,1)',
                boxShadow:'0 0 12px rgba(255,255,255,.5)',
              }} />
            </div>
            <div style={{
              display:'flex', justifyContent:'space-between',
              marginTop:6, fontSize:11, color:'rgba(255,255,255,.7)',
            }}>
              <span style={{ animation: phase==='loading' ? 'bootPulse 1.5s ease infinite' : 'none' }}>
                {currentLabel}
              </span>
              <span style={{ fontWeight:800, color:'#fff' }}>{progress}٪</span>
            </div>
          </div>
        </div>

        {/* ── قائمة العناصر ──────────────────────────────────────────────── */}
        <div
          ref={listRef}
          style={{
            maxHeight: 280, overflowY:'auto', padding:'12px 16px',
            scrollbarWidth:'thin',
          }}
        >
          {BOOT_RESOURCES.map((res) => {
            const state = items[res.key];
            const color = GROUP_COLORS[res.group] ?? 'var(--em)';
            return (
              <div
                id={`boot-item-${res.key}`}
                key={res.key}
                className="boot-item-row"
              >
                {/* أيقونة الحالة */}
                <div style={{ width:28, height:28, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {state.status === 'pending'  && <i className={`ti ${res.icon}`} style={{ fontSize:15, color:'var(--t4)' }} />}
                  {state.status === 'loading'  && <i className="ti ti-loader-2"   style={{ fontSize:15, color, animation:'bootSpin .7s linear infinite' }} />}
                  {state.status === 'done'     && (
                    <div style={{
                      width:22, height:22, borderRadius:'50%',
                      background:color, display:'flex', alignItems:'center', justifyContent:'center',
                      animation:'bootPop .3s cubic-bezier(.34,1.5,.64,1)',
                    }}>
                      <i className="ti ti-check" style={{ fontSize:12, color:'#fff', fontWeight:900 }} />
                    </div>
                  )}
                  {state.status === 'error'    && (
                    <div style={{
                      width:22, height:22, borderRadius:'50%',
                      background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <i className="ti ti-x" style={{ fontSize:11, color:'#fff' }} />
                    </div>
                  )}
                  {state.status === 'skipped'  && <i className="ti ti-minus" style={{ fontSize:13, color:'var(--t4)' }} />}
                </div>

                {/* النص */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:12, fontWeight:600,
                    color: state.status === 'loading' ? 'var(--t1)'
                         : state.status === 'done'    ? 'var(--t2)'
                         : state.status === 'error'   ? 'var(--red)'
                         : 'var(--t4)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {res.label}
                  </div>
                  {state.status === 'loading' && (
                    <div style={{
                      height:3, borderRadius:99, marginTop:3,
                      background:'var(--bg4)', overflow:'hidden',
                    }}>
                      <div style={{
                        height:'100%', borderRadius:99, width:'60%',
                        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                        backgroundSize:'400px 100%',
                        animation:'bootShimmer 1.2s linear infinite',
                      }} />
                    </div>
                  )}
                </div>

                {/* الوقت */}
                <div style={{ fontSize:10, color:'var(--t4)', flexShrink:0 }}>
                  {state.status === 'done' && state.ms !== undefined && state.ms > 0 && `${state.ms}ms`}
                  {state.status === 'done' && state.ms === 0 && <span style={{ color:'var(--em)', fontSize:9, fontWeight:700 }}>cache</span>}
                  {state.status === 'error' && <span style={{ color:'var(--red)', fontSize:9 }}>خطأ</span>}
                </div>

                {/* شارة المجموعة */}
                <div style={{
                  fontSize:9, fontWeight:700, padding:'1px 6px',
                  borderRadius:99, flexShrink:0,
                  background:`${color}22`, color,
                }}>
                  {res.group}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{
          padding:'12px 20px 18px',
          borderTop:'1px solid var(--b1)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
        }}>
          <div style={{ fontSize:11, color:'var(--t4)' }}>
            {doneCount} / {TOTAL} مكوّن
            {errors.length > 0 && (
              <span style={{ color:'var(--orange)', marginRight:8, fontWeight:700 }}>
                · {errors.length} تحذير
              </span>
            )}
          </div>

          {/* زر التخطي — يظهر بعد 3 ثواني فقط */}
          {phase === 'loading' && elapsed >= 3 && (
            <button
              onClick={onComplete}
              style={{
                padding:'6px 14px', borderRadius:10,
                border:'1px solid var(--b3)', background:'var(--bg3)',
                color:'var(--t3)', fontSize:11, fontWeight:700,
                cursor:'pointer', fontFamily:'Tajawal, sans-serif',
                transition:'all .13s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--em)'; e.currentTarget.style.color='var(--em)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--b3)'; e.currentTarget.style.color='var(--t3)'; }}
            >
              تخطي والدخول
            </button>
          )}

          {phase === 'done' && (
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 14px', borderRadius:10,
              background:'var(--emb)', border:'1px solid var(--embo)',
              fontSize:11, fontWeight:700, color:'var(--em)',
            }}>
              <i className="ti ti-rocket" style={{ fontSize:13 }} />
              جارٍ الانتقال...
            </div>
          )}

          {phase === 'error' && (
            <button
              onClick={onComplete}
              style={{
                padding:'6px 14px', borderRadius:10,
                border:'none', background:'var(--em)', color:'#fff',
                fontSize:11, fontWeight:700, cursor:'pointer',
                fontFamily:'Tajawal, sans-serif',
              }}
            >
              دخول رغم ذلك
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/sidebar/Sidebar.tsx
```
```

## FILE: resources/js/components/sidebar/SidebarItem.tsx
```
```

## FILE: resources/js/components/sidebar/SidebarSection.tsx
```
```

## FILE: resources/js/components/topbar/SuperAdminButton.tsx
```
// resources/js/components/topbar/SuperAdminButton.tsx
// CompanySwitcher — تبديل الشركة من الـ Sidebar
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useAuth } from '@/context/AuthContext'
import client from '@/lib/api/core/client'

const AV_GRADS = [
  'from-[#0a8a5c] to-[#0dbf84]',
  'from-[#1a4fd6] to-[#60a5fa]',
  'from-[#6920d4] to-[#a78bfa]',
  'from-[#b87d0a] to-[#fbbf24]',
  'from-[#0d7a8c] to-[#22d3ee]',
  'from-[#c43a0a] to-[#fb923c]',
]

const initials = (name: string) =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

export default function CompanySwitcher() {
  const { user, activeCompany, setActiveCompany } = useAuth() as any
  const navigate = useNavigate()
  const [open,      setOpen]      = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [loading,   setLoading]   = useState(false)
  const [switching, setSwitching] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const fetchCompanies = async () => {
    if (companies.length > 0) return
    setLoading(true)
    try {
      const res = await client.get('/companies')
      const raw = res.data?.data ?? res.data
      setCompanies(Array.isArray(raw) ? raw : (raw?.data ?? []))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const handleOpen = () => { setOpen(v => !v); fetchCompanies() }

  const handleSwitch = async (co: any) => {
    if (co.id === activeCompany?.id) { setOpen(false); return }
    setSwitching(co.id)
    try {
      await client.post('/companies/switch', { company_id: co.id })
      setActiveCompany({ id: co.id, name: co.name, slug: co.slug })
      setOpen(false)
      sessionStorage.removeItem('selected_fiscal_year')
      navigate('/onboarding', { replace: true })
    } catch { /* silent */ }
    finally { setSwitching(null) }
  }

  return (
    <div ref={ref} className="relative">
      {/* ─── Main button ─── */}
      <button
        onClick={handleOpen}
        title="تبديل الشركة"
        className={cn(
          'w-full border-none cursor-pointer px-3 py-[10px] rounded-[12px]',
          'bg-[var(--bg3)] hover:bg-[var(--bg4)] transition-colors duration-150',
          'outline-none font-sans block',
        )}
      >
        <div className="flex items-center gap-[10px] direction-rtl">
          {/* Company icon */}
          <div className="w-[38px] h-[38px] rounded-[10px] flex-shrink-0 bg-gradient-to-br from-[var(--em)] to-[var(--em3)] flex items-center justify-center text-[15px] font-black text-white">
            {(activeCompany?.name ?? '؟')[0]?.toUpperCase()}
          </div>
          {/* Name & slug */}
          <div className="flex-1 min-w-0 text-right">
            <div className="text-[13px] font-extrabold text-[var(--t1)] truncate leading-[1.3] mb-[3px]">
              {activeCompany?.name ?? 'اختر شركة'}
            </div>
            <div className="flex items-center gap-[3px] text-[10px] text-[var(--t4)] font-mono truncate">
              <i className="ti ti-building text-[9px]" />
              {activeCompany?.slug ?? '—'}
            </div>
          </div>
          <i className={cn('ti text-[12px] text-[var(--t4)] flex-shrink-0 transition-transform duration-200', open ? 'ti-chevron-up' : 'ti-chevron-down')} />
        </div>
      </button>

      {/* ─── Popover ─── */}
      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-[500] bg-[var(--bg2)] border border-[var(--b2)] rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,.3)] overflow-hidden direction-rtl">
          {/* Header */}
          <div className="flex items-center gap-[6px] px-[13px] py-[10px] border-b border-[var(--b1)]">
            <i className="ti ti-building-community text-[var(--em)] text-[13px]" />
            <span className="text-[11px] font-extrabold text-[var(--t3)] uppercase tracking-[.7px]">تبديل الشركة</span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="px-4 py-4 text-center text-[var(--t4)] text-[12px]">
              <i className="ti ti-loader animate-spin me-[6px]" />جارٍ التحميل...
            </div>
          )}

          {/* List */}
          {!loading && companies.map((co: any, i: number) => {
            const isActive    = co.id === activeCompany?.id
            const isSwitching = switching === co.id
            const suspended   = co.is_suspended
            const grad        = AV_GRADS[co.id % AV_GRADS.length]

            return (
              <button
                key={co.id}
                onClick={() => !suspended && handleSwitch(co)}
                disabled={suspended || isSwitching}
                className={cn(
                  'w-full px-[13px] py-[10px] flex items-center gap-[10px] direction-rtl',
                  'border-none border-b border-[var(--b1)] font-sans text-[13px]',
                  'border-r-[3px] transition-colors duration-150',
                  'last:border-b-0',
                  isActive    ? 'bg-[var(--emb)] border-r-[var(--em)] cursor-default'
                    : suspended ? 'opacity-50 cursor-not-allowed border-r-transparent'
                    :             'bg-transparent border-r-transparent hover:bg-[var(--bg3)] cursor-pointer',
                )}
              >
                {/* Avatar */}
                <div className={cn('w-[30px] h-[30px] rounded-[8px] flex-shrink-0 bg-gradient-to-br flex items-center justify-center text-[11px] font-black text-white', grad)}>
                  {initials(co.name)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 text-right">
                  <div className={cn('text-[12px] font-bold truncate', isActive ? 'text-[var(--em)]' : 'text-[var(--t1)]')}>
                    {co.name}
                    {suspended && <span className="text-[var(--red)] ms-[5px] text-[10px]">معلّقة</span>}
                  </div>
                  <div className="text-[10px] text-[var(--t4)] font-mono">{co.slug}</div>
                </div>
                {/* State icon */}
                {isSwitching
                  ? <i className="ti ti-loader animate-spin text-[var(--em)] text-[13px] flex-shrink-0" />
                  : isActive
                    ? <i className="ti ti-check text-[var(--em)] text-[13px] flex-shrink-0" />
                    : <i className="ti ti-arrow-left text-[var(--t4)] text-[11px] flex-shrink-0" />
                }
              </button>
            )
          })}

          {/* Footer — add company */}
          <button
            onClick={() => { setOpen(false); navigate('/onboarding') }}
            className={cn(
              'w-full px-[13px] py-[10px] flex items-center gap-[8px]',
              'border-none border-t border-[var(--b1)] bg-transparent',
              'text-[12px] font-bold text-[var(--em)] cursor-pointer font-sans',
              'hover:bg-[var(--emb)] transition-colors duration-150',
            )}
          >
            <i className="ti ti-plus text-[13px]" />
            إضافة شركة جديدة
          </button>
        </div>
      )}
    </div>
  )
}
```

## FILE: resources/js/components/topbar/Topbar.tsx
```
```

## FILE: resources/js/components/ui/Alert.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

type AlertVariant = 'em' | 'gold' | 'red' | 'blue'

const alertStyles: Record<AlertVariant, string> = {
  em:   'bg-[var(--emb)] border-[var(--embo)] text-[var(--em)]',
  gold: 'bg-[var(--goldb)] border-[var(--goldbo)] text-[var(--gold)]',
  red:  'bg-[var(--redb)] border-[var(--redbo)] text-[var(--red)]',
  blue: 'bg-[var(--blueb)] border-[var(--bluebo)] text-[var(--blue)]',
}

export function Alert({
  variant = 'em', icon, children, className,
}: {
  variant?: AlertVariant
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-[10px] px-[14px] py-[11px] rounded-[var(--r2)]',
        'text-[13px] leading-[1.5] mb-3 border',
        alertStyles[variant],
        className,
      )}
    >
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <div>{children}</div>
    </div>
  )
}
```

## FILE: resources/js/components/ui/App.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// App.tsx
//
// ترتيب Providers الصحيح:
//   QueryClientProvider
//     └── BrowserRouter
//           └── AuthProvider
//                 └── FiscalYearProvider
//                       └── AppRoutes
// ════════════════════════════════════════════════════════════════════════════
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient }               from '@/lib/api/core/queryClient';
import { connectSlugToInterceptor }  from '@/lib/api/core/client';
import { appActions }                from '@/lib/store/appStore';
import { AuthProvider }              from '@/context/AuthContext';
import { FiscalYearProvider }        from '@/context/FiscalYearContext';
import { AppRoutes }                 from '@/routes/index';

// CSS — ملف واحد فقط، يستورد theme.css تلقائياً
import '../css/app.css';

// ربط Zustand بالـ interceptor
connectSlugToInterceptor(() => appActions.getActiveSlug());

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <FiscalYearProvider>
            <AppRoutes />
          </FiscalYearProvider>
        </AuthProvider>
      </BrowserRouter>

      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
```

## FILE: resources/js/components/ui/Avatar.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

const gradients = [
  'from-[#0a8a5c] to-[#0dbf84]',
  'from-[#6920d4] to-[#a78bfa]',
  'from-[#1a4fd6] to-[#60a5fa]',
  'from-[#b87d0a] to-[#fbbf24]',
  'from-[#d42b2b] to-[#f87171]',
  'from-[#0d7a8c] to-[#67e8f9]',
  'from-[#c43a0a] to-[#fb923c]',
]

interface AvatarProps {
  name?: string
  index?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, index = 0, size = 'sm', className }: AvatarProps) {
  const initials = name ? name.slice(0, 2) : '؟'
  const grad = gradients[index % gradients.length]

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-extrabold text-white flex-shrink-0',
        `bg-gradient-to-br ${grad}`,
        size === 'xs' && 'w-6 h-6 text-[9px]',
        size === 'sm' && 'w-8 h-8 text-[12px]',
        size === 'md' && 'w-9 h-9 text-[13px]',
        size === 'lg' && 'w-11 h-11 text-[15px]',
        className,
      )}
    >
      {initials}
    </div>
  )
}
```

## FILE: resources/js/components/ui/Badge.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

type BadgeVariant = 'em' | 'red' | 'gold' | 'blue' | 'purple' | 'teal' | 'orange' | 'neutral' | 'indigo'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const badgeBase = [
  'inline-flex items-center gap-1',
  'px-[9px] py-[3px] rounded-[20px]',
  'text-[11px] font-bold border whitespace-nowrap',
].join(' ')

// Light mode
const badgeLight: Record<BadgeVariant, string> = {
  em:      'bg-[#dcfce7] text-[#15803d] border-[#86efac]',
  red:     'bg-[#fee2e2] text-[#c41c1c] border-[#fca5a5]',
  gold:    'bg-[#fef3c7] text-[#92400e] border-[#fcd34d]',
  blue:    'bg-[#dbeafe] text-[#1a40b8] border-[#93c5fd]',
  purple:  'bg-[#ede9fe] text-[#6520c4] border-[#c4b5fd]',
  teal:    'bg-[#cffafe] text-[#0d748c] border-[#67e8f9]',
  orange:  'bg-[#ffedd5] text-[#c43010] border-[#fdba74]',
  neutral: 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]',
  indigo:  'bg-[#e0e7ff] text-[#3730a3] border-[#a5b4fc]',
}

// Dark mode — via body.dark CSS vars in theme.css
const badgeDark: Record<BadgeVariant, string> = {
  em:      'body.dark:bg-[var(--emb)] body.dark:text-[var(--em2)] body.dark:border-[var(--embo)]',
  red:     'body.dark:bg-[var(--redb)] body.dark:text-[var(--red)] body.dark:border-[var(--redbo)]',
  gold:    'body.dark:bg-[var(--goldb)] body.dark:text-[var(--gold)] body.dark:border-[var(--goldbo)]',
  blue:    'body.dark:bg-[var(--blueb)] body.dark:text-[var(--blue)] body.dark:border-[var(--bluebo)]',
  purple:  'body.dark:bg-[var(--purb)] body.dark:text-[var(--purple)] body.dark:border-[var(--purbo)]',
  teal:    'body.dark:bg-[var(--tealb)] body.dark:text-[var(--teal)] body.dark:border-[var(--tealbo)]',
  orange:  'body.dark:bg-[var(--orb)] body.dark:text-[var(--orange)] body.dark:border-[var(--orbo)]',
  neutral: 'body.dark:bg-[var(--bg4)] body.dark:text-[var(--t3)] body.dark:border-[var(--b3)]',
  indigo:  'body.dark:bg-[var(--indigob)] body.dark:text-[var(--indigo)] body.dark:border-[var(--b3)]',
}

export function Badge({ variant = 'neutral', dot = true, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeBase, badgeLight[variant], className)}
      {...props}
    >
      {dot && (
        <span className="w-[5px] h-[5px] rounded-full bg-current opacity-75 flex-shrink-0" />
      )}
      {children}
    </span>
  )
}
```

## FILE: resources/js/components/ui/Button.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'default' | 'primary' | 'danger' | 'gold' | 'blue' | 'ghost'
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  loading?: boolean
}

const btnBase = [
  'inline-flex items-center gap-[6px]',
  'rounded-[var(--r2)] border font-bold cursor-pointer',
  'font-sans transition-all duration-150',
  'whitespace-nowrap select-none',
  'active:scale-[.97]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

const btnVariants: Record<ButtonVariant, string> = {
  default: 'bg-[var(--bg3)] border-[var(--b3)] text-[var(--t2)] hover:bg-[var(--bg4)] hover:text-[var(--t1)]',
  primary: 'bg-[var(--em)] border-[var(--em)] text-white shadow-[var(--emglow)] hover:bg-[var(--em2)]',
  danger:  'bg-[var(--redb)] border-[var(--redbo)] text-[var(--red)] hover:bg-[var(--red)] hover:text-white',
  gold:    'bg-[var(--goldb)] border-[var(--goldbo)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-white',
  blue:    'bg-[var(--blueb)] border-[var(--bluebo)] text-[var(--blue)] hover:bg-[var(--blue)] hover:text-white',
  ghost:   'bg-transparent border-transparent text-[var(--t3)] hover:bg-[var(--bg3)] hover:text-[var(--t1)]',
}

const btnSizes: Record<ButtonSize, string> = {
  xs: 'px-[9px] py-1 text-[11px]',
  sm: 'px-[11px] py-[5px] text-[12px]',
  md: 'px-[15px] py-2 text-[12.5px]',
  lg: 'px-5 py-[10px] text-[13.5px]',
}

export function Button({
  variant = 'default',
  size = 'md',
  full = false,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        btnBase,
        btnVariants[variant],
        btnSizes[size],
        full && 'w-full justify-center',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-[14px] h-[14px] border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      {children}
    </button>
  )
}
```

## FILE: resources/js/components/ui/Card.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--bg2)] border border-[var(--b2)] rounded-[var(--r3)] p-[18px]',
        'shadow-[var(--shadow)] transition-shadow duration-200',
        hover && 'hover:shadow-[var(--shadow2)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between mb-[14px] pb-3 border-b border-[var(--b1)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('text-[14px] font-extrabold text-[var(--t1)] flex items-center gap-[7px]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardSub({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-[11.5px] text-[var(--t4)]', className)} {...props}>
      {children}
    </p>
  )
}
```

## FILE: resources/js/components/ui/FormInputs.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

const inputBase = [
  'bg-[var(--bg2)] border border-[var(--b3)] rounded-[var(--r2)]',
  'px-[11px] py-2 text-[13px] text-[var(--t1)] outline-none',
  'font-sans w-full transition-[border-color_.15s,box-shadow_.15s]',
  'placeholder:text-[var(--t4)]',
  'focus:border-[var(--em)] focus:shadow-[0_0_0_3px_var(--emb)]',
  'dark:bg-[var(--bg3)]',
].join(' ')

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(inputBase, 'resize-vertical min-h-[70px]', className)}
      {...props}
    />
  )
}

export function Label({ className, children, required, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn('text-[12px] font-bold text-[var(--t3)] tracking-[.3px]', className)}
      {...props}
    >
      {children}
      {required && <span className="text-[var(--red)] ms-0.5">*</span>}
    </label>
  )
}

export function FormField({ className, children, span, ...props }: React.HTMLAttributes<HTMLDivElement> & { span?: 2 | 3 }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-[5px]',
        span === 2 && 'col-span-2',
        span === 3 && 'col-span-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function FormGrid({ cols = 2, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        'grid gap-3',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-3',
        'max-sm:grid-cols-1',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Input with suffix (e.g. "دج")
export function InputRow({ suffix, prefix, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & {
  suffix?: string; prefix?: string
}) {
  return (
    <div
      className={cn(
        'flex items-stretch border border-[var(--b3)] rounded-[var(--r2)] overflow-hidden',
        'bg-[var(--bg2)] transition-[border-color_.15s,box-shadow_.15s]',
        'focus-within:border-[var(--em)] focus-within:shadow-[0_0_0_3px_var(--emb)]',
        className,
      )}
      {...props}
    >
      {prefix && (
        <span className="flex items-center px-3 text-[12px] font-bold text-[var(--t4)] bg-[var(--bg3)] border-l border-[var(--b3)] flex-shrink-0">
          {prefix}
        </span>
      )}
      {children}
      {suffix && (
        <span className="flex items-center px-3 text-[12px] font-bold text-[var(--t4)] bg-[var(--bg3)] border-r border-[var(--b3)] flex-shrink-0">
          {suffix}
        </span>
      )}
    </div>
  )
}
```

## FILE: resources/js/components/ui/index.ts
```
/**
 * components/ui/index.ts
 * ══════════════════════════════════════════════════════════════
 * نقطة الاستيراد الوحيدة لكل مكونات الـ UI
 *
 * الاستخدام:
 *   import { Card, Button, Badge, Modal } from '@/components/ui'
 * ══════════════════════════════════════════════════════════════
 */

export { Card, CardHeader, CardTitle, CardSub }         from './Card'
export { Button }                                        from './Button'
export { Badge }                                         from './Badge'
export { KpiCard }                                       from './KpiCard'
export { Modal }                                         from './Modal'
export { TableWrapper, Table, Th, Tr, Td }               from './Table'
export { Alert }                                         from './Alert'
export { Avatar }                                        from './Avatar'
export {
  Input, Select, Textarea, Label,
  FormField, FormGrid, InputRow,
}                                                        from './FormInputs'
export {
  Switch, ProgressBar, EmptyState, PageHeader,
  Sep, DotSep, IconButton, Tabs, SummaryRow,
  Grid2, Grid3, Grid4, Grid65, KpiGrid,
}                                                        from './Misc'
```

## FILE: resources/js/components/ui/KpiCard.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

type KpiVariant = 'em' | 'gold' | 'red' | 'blue' | 'purple' | 'teal' | 'orange'

interface KpiCardProps {
  variant?: KpiVariant
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
  unit?: string
  sub?: React.ReactNode
  trend?: { value: string; up?: boolean }
  onClick?: () => void
  className?: string
}

const kpiIcBg: Record<KpiVariant, string> = {
  em:     'bg-[var(--emb)] text-[var(--em)]',
  gold:   'bg-[var(--goldb)] text-[var(--gold)]',
  red:    'bg-[var(--redb)] text-[var(--red)]',
  blue:   'bg-[var(--blueb)] text-[var(--blue)]',
  purple: 'bg-[var(--purb)] text-[var(--purple)]',
  teal:   'bg-[var(--tealb)] text-[var(--teal)]',
  orange: 'bg-[var(--orb)] text-[var(--orange)]',
}

// Maps to .kpi-em, .kpi-gold, etc. defined in theme.css @layer components
const kpiVariantClass: Record<KpiVariant, string> = {
  em:     'kpi-card kpi-em',
  gold:   'kpi-card kpi-gold',
  red:    'kpi-card kpi-red',
  blue:   'kpi-card kpi-blue',
  purple: 'kpi-card kpi-purp',
  teal:   'kpi-card kpi-teal',
  orange: 'kpi-card kpi-orng',
}

export function KpiCard({
  variant = 'em', icon, label, value, unit, sub, trend, onClick, className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        kpiVariantClass[variant],
        'bg-[var(--bg2)] border border-[var(--b2)] rounded-[var(--r3)] p-4',
        'shadow-[var(--shadow)] transition-all duration-[180ms]',
        'hover:-translate-y-0.5 hover:shadow-[var(--shadow2)]',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-[10px]">
        {icon && (
          <div className={cn(
            'kpi-ic w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-[15px]',
            kpiIcBg[variant],
          )}>
            {icon}
          </div>
        )}
        {trend && (
          <span className={cn(
            'text-[11px] font-bold px-2 py-[3px] rounded-[20px]',
            trend.up === true  && 'bg-[rgba(16,185,129,.12)] text-[#059669]',
            trend.up === false && 'bg-[var(--redb)] text-[var(--red)]',
            trend.up === undefined && 'bg-[var(--bg4)] text-[var(--t4)]',
          )}>
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-[11.5px] text-[var(--t3)] mb-[5px]">{label}</p>
      <div className="text-[22px] font-black text-[var(--t1)] leading-none tracking-tight">
        {unit && <span className="text-[12px] font-medium text-[var(--t4)] me-0.5">{unit}</span>}
        {value}
      </div>
      {sub && <p className="text-[11px] text-[var(--t4)] mt-1.5">{sub}</p>}
    </div>
  )
}
```

## FILE: resources/js/components/ui/Misc.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

// ════════════════════════════════════════════════════════════
// SWITCH
// ════════════════════════════════════════════════════════════
export function Switch({ checked, onChange, className }: {
  checked: boolean
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'switch-thumb relative w-[38px] h-[22px] rounded-[11px]',
        'border transition-all duration-[180ms] flex-shrink-0 cursor-pointer',
        checked ? 'bg-[var(--em)] border-[var(--em)]' : 'bg-[var(--bg5)] border-[var(--b3)]',
        checked && 'switch-on',
        className,
      )}
    />
  )
}

// ════════════════════════════════════════════════════════════
// PROGRESS BAR
// ════════════════════════════════════════════════════════════
export function ProgressBar({ value, color = 'em', className }: {
  value: number
  color?: 'em' | 'gold' | 'red' | 'blue'
  className?: string
}) {
  const fillColor = {
    em: 'bg-[var(--em)]', gold: 'bg-[var(--gold)]',
    red: 'bg-[var(--red)]', blue: 'bg-[var(--blue)]',
  }[color]

  return (
    <div className={cn('h-[5px] bg-[var(--bg4)] rounded-[4px] overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-[4px] transition-[width_.4s_ease]', fillColor)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════
export function EmptyState({ icon, title, sub, action }: {
  icon?: React.ReactNode
  title: string
  sub?: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-[50px] px-5">
      {icon && <div className="text-[42px] opacity-20 mb-3">{icon}</div>}
      <p className="text-[14px] text-[var(--t4)]">{title}</p>
      {sub    && <p className="text-[12px] text-[var(--t4)] mt-1.5">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PAGE HEADER
// ════════════════════════════════════════════════════════════
export function PageHeader({
  title, sub, actions, className,
}: {
  title: string
  sub?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between mb-5 gap-3 flex-wrap', className)}>
      <div>
        <h1 className="text-[20px] font-black text-[var(--t1)] mb-[3px]">{title}</h1>
        {sub && <p className="text-[12.5px] text-[var(--t4)]">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SEPARATOR
// ════════════════════════════════════════════════════════════
export function Sep({ className }: { className?: string }) {
  return <div className={cn('h-px bg-[var(--b1)] my-3', className)} />
}

export function DotSep() {
  return (
    <span className="inline-block w-[3px] h-[3px] rounded-full bg-[var(--t4)] mx-[5px] align-middle" />
  )
}

// ════════════════════════════════════════════════════════════
// ICON BUTTON (Topbar)
// ════════════════════════════════════════════════════════════
export function IconButton({
  badge, className, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { badge?: number }) {
  return (
    <button
      className={cn(
        'w-[34px] h-[34px] rounded-[var(--r2)] bg-[var(--bg3)] border border-[var(--b2)]',
        'flex items-center justify-center cursor-pointer',
        'text-[15px] text-[var(--t3)] transition-all duration-150 flex-shrink-0 relative',
        'hover:bg-[var(--bg4)] hover:text-[var(--t1)]',
        className,
      )}
      {...props}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'absolute -top-1 -right-1 w-4 h-4 rounded-full',
          'bg-[var(--red)] text-white text-[8.5px] font-extrabold',
          'flex items-center justify-center border-2 border-[var(--bg2)]',
        )}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

// ════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════
interface TabDef {
  key: string
  label: string
  icon?: React.ReactNode
  count?: number
}

export function Tabs({ tabs, active, onChange }: {
  tabs: TabDef[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex border-b border-[var(--b2)] mb-4 overflow-x-auto scrollbar-none">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-[9px] cursor-pointer text-[13px] font-bold',
            'border-b-2 -mb-px transition-colors duration-150 whitespace-nowrap select-none',
            'flex items-center gap-[6px]',
            tab.key === active
              ? 'text-[var(--em)] border-[var(--em)]'
              : 'text-[var(--t4)] border-transparent hover:text-[var(--t2)]',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-[9px] font-extrabold px-[5px] py-px rounded-[20px]',
              tab.key === active
                ? 'bg-[var(--emb)] text-[var(--em)]'
                : 'bg-[var(--bg4)] text-[var(--t4)]',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SUMMARY ROW
// ════════════════════════════════════════════════════════════
export function SummaryRow({ label, value, className }: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-[9px] border-b border-[var(--b1)] gap-2 last:border-b-0',
      className,
    )}>
      <span className="text-[12.5px] text-[var(--t3)]">{label}</span>
      <span className="text-[13px] font-bold text-[var(--t1)]">{value}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// GRID LAYOUTS
// ════════════════════════════════════════════════════════════
export function Grid2({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-2 gap-4 max-sm:grid-cols-1', className)} {...props}>{children}</div>
}
export function Grid3({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-3 gap-[14px] max-sm:grid-cols-1', className)} {...props}>{children}</div>
}
export function Grid4({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-4 gap-[14px] max-sm:grid-cols-2', className)} {...props}>{children}</div>
}
export function Grid65({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-[1.8fr_1fr] gap-4 max-sm:grid-cols-1', className)} {...props}>{children}</div>
}
export function KpiGrid({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-4 gap-[14px] mb-[18px] max-sm:grid-cols-2', className)} {...props}>{children}</div>
}
```

## FILE: resources/js/components/ui/Modal.tsx
```
import React, { useEffect } from 'react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  sub?: string
  size?: 'sm' | 'md' | 'lg'
  footer?: React.ReactNode
  footerLeft?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const sizeMap = { sm: 'max-w-[420px]', md: 'max-w-[580px]', lg: 'max-w-[700px]' }

export function Modal({
  open, onClose, title, sub, size = 'md', footer, footerLeft, children, className,
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/60 backdrop-blur-[6px]',
        'flex items-center justify-center z-[10001]',
        'p-4 transition-opacity duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
      )}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn(
          'bg-[var(--bg2)] border border-[var(--b3)] rounded-[var(--r4)]',
          'w-full shadow-[var(--shadow2)]',
          'max-h-[90vh] flex flex-col',
          'animate-[scale(.94)_translateY(8px)_to_scale(1)_translateY(0)]',
          sizeMap[size],
          // Mobile: full width bottom sheet
          'max-sm:max-w-full max-sm:rounded-[20px_20px_0_0] max-sm:max-h-[92vh]',
          className,
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--b2)] flex-shrink-0">
            <div>
              <div className="text-[15px] font-extrabold text-[var(--t1)]">{title}</div>
              {sub && <div className="text-[11.5px] text-[var(--t4)] mt-0.5">{sub}</div>}
            </div>
            <button
              onClick={onClose}
              className={cn(
                'w-7 h-7 rounded-[7px] bg-[var(--bg3)] border border-[var(--b2)]',
                'flex items-center justify-center text-[var(--t3)] text-[13px]',
                'cursor-pointer transition-all duration-150 flex-shrink-0',
                'hover:bg-[var(--redb)] hover:border-[var(--redbo)] hover:text-[var(--red)]',
              )}
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {(footer || footerLeft) && (
          <div className={cn(
            'px-5 py-[14px] border-t border-[var(--b2)] flex-shrink-0',
            'bg-[var(--bg3)] rounded-b-[var(--r4)]',
            'flex items-center justify-end gap-2',
            'max-sm:rounded-b-none',
          )}>
            {footerLeft && <div className="me-auto flex gap-2">{footerLeft}</div>}
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
```

## FILE: resources/js/components/ui/Table.tsx
```
import React from 'react'
import { cn } from '@/lib/cn'

export function TableWrapper({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('overflow-x-auto -webkit-overflow-scrolling-touch', className)} {...props}>
      {children}
    </div>
  )
}

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full border-collapse', className)} {...props}>
      {children}
    </table>
  )
}

export function Th({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-3 py-[9px] text-right text-[11px] font-extrabold',
        'text-[var(--t4)] tracking-[.6px] uppercase whitespace-nowrap',
        'bg-[var(--bg3)] border-b border-[var(--b2)]',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

type TdProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  strong?: boolean
  mono?: boolean
  color?: 'em' | 'red' | 'gold'
}

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-[var(--b1)] transition-colors duration-[120ms] cursor-pointer',
        'hover:bg-[var(--bg3)] last:border-b-0',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function Td({ strong, mono, color, className, children, ...props }: TdProps) {
  return (
    <td
      className={cn(
        'px-3 py-[11px] text-[13px] text-[var(--t2)] align-middle',
        strong && 'font-bold text-[var(--t1)]',
        mono   && 'font-mono text-[11.5px] text-[var(--t4)]',
        color === 'em'   && 'text-[var(--em)] font-bold',
        color === 'red'  && 'text-[var(--red)] font-semibold',
        color === 'gold' && 'text-[var(--gold)] font-semibold',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}
```

## FILE: resources/js/pos/components/Cart.tsx
```
// pos/components/Cart.tsx
import React, { useState } from 'react';
import type { Party } from '@/types';
import type { CartItem, CartTotals } from '@/types';
import { formatDZD } from '../utils/calculations';

interface CartProps {
  items:       CartItem[];
  totals:      CartTotals;
  client:      Party | null;
  customers:   Party[];
  onQty:       (id: string, qty: number) => void;
  onDiscount:  (id: string, pct: number) => void;
  onRemove:    (id: string) => void;
  onSetClient: (c: Party | null) => void;
  onHold:      () => void;
  onSell:      () => void;
  onNote:      () => void;
  onClear:     () => void;
  onHeld:      () => void;
}

type PriceMode = 'retail' | 'semi' | 'wholesale';

export default function Cart({
  items, totals, client, customers,
  onQty, onDiscount, onRemove, onSetClient,
  onHold, onSell, onNote, onClear, onHeld,
}: CartProps) {
  const [mode, setMode] = useState<PriceMode>('retail');

  const isEmpty = items.length === 0;

  return (
    <div className="pos-cart" id="pos-cart">

      {/* ── Cart header ── */}
      <div className="cart-top">
        <div className="cart-top-row">
          <div className="cart-ttl">
            <span className="ic ic-sm"><i className="ti ti-shopping-cart" /></span>
            السلة
            <span className={`cart-pill`}>{totals.items_count}</span>
          </div>
          <div className="cart-acts2">
            <button className="btn btn-xs" onClick={onHeld} title="المعلقة">
              <span className="ic ic-xs"><i className="ti ti-clock-pause" /></span>
            </button>
            <button className="btn btn-xs" onClick={onNote} title="ملاحظة">
              <span className="ic ic-xs"><i className="ti ti-notes" /></span>
            </button>
            <button
              className="btn btn-xs btn-r"
              onClick={onClear}
              disabled={isEmpty}
              title="مسح السلة"
            >
              <span className="ic ic-xs"><i className="ti ti-trash" /></span>
            </button>
          </div>
        </div>

        {/* Price mode */}
        <div className="cart-modes2">
          {(['retail','semi','wholesale'] as PriceMode[]).map(m => (
            <button
              key={m}
              className={`cmode ${mode === m ? 'on' : ''}`}
              onClick={() => setMode(m)}
            >
              <span className="ic ic-xs">
                <i className={`ti ${m === 'retail' ? 'ti-user' : m === 'semi' ? 'ti-packages' : 'ti-building-store'}`} />
              </span>
              {m === 'retail' ? 'تجزئة' : m === 'semi' ? 'نصف جملة' : 'جملة'}
            </button>
          ))}
        </div>

        {/* Client selector */}
        <div className="cart-client">
          <select
            value={client?.id ?? ''}
            onChange={e => {
              const id = Number(e.target.value);
              onSetClient(id ? (customers.find(c => c.id === id) ?? null) : null);
            }}
          >
            <option value="">👤 زبون عابر</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
                {(c.balance ?? 0) > 0 ? ` ⚠️ دين ${c.balance?.toLocaleString('fr-DZ')} دج` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Cart items ── */}
      <div className="cart-items-body" id="cart-items">
        {isEmpty ? (
          <div className="cart-empty">
            <div className="cart-empty-ic"><i className="ti ti-shopping-cart" /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t3)' }}>السلة فارغة</div>
            <div style={{ fontSize: '11.5px' }}>اضغط على منتج لإضافته</div>
          </div>
        ) : (
          items.map((item, idx) => (
            <CartItemRow
              key={item.id}
              item={item}
              index={idx + 1}
              onQty={onQty}
              onDiscount={onDiscount}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      {/* ── Fixed footer ── */}
      <div className="cart-foot">
        {/* Summary rows */}
        <div className="cart-sums">
          <div className="sum-row">
            <span className="sum-l">المجموع HT</span>
            <span className="sum-v">{formatDZD(totals.total_ht)}</span>
          </div>
          {totals.total_discount > 0 && (
            <div className="sum-row">
              <span className="sum-l" style={{ color: 'var(--red)' }}>خصم</span>
              <span className="sum-v" style={{ color: 'var(--red)' }}>- {formatDZD(totals.total_discount)}</span>
            </div>
          )}
          <div className="sum-row">
            <span className="sum-l">TVA (مجمّع)</span>
            <span className="sum-v">{formatDZD(totals.total_tva)}</span>
          </div>
          {totals.fiscal_stamp > 0 && (
            <div className="sum-row">
              <span className="sum-l">الطابع الجبائي</span>
              <span className="sum-v">+ {formatDZD(totals.fiscal_stamp)}</span>
            </div>
          )}
        </div>

        {/* Grand total */}
        <div className="grand-bar">
          <span className="grand-lbl">الإجمالي TTC</span>
          <span className="grand-val">
            <span className="gu">دج </span>
            <span>{(totals.total_ttc + totals.fiscal_stamp).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}</span>
          </span>
        </div>

        {/* Action buttons */}
        <div className="cart-btns2">
          <button className="btn-hold2" onClick={onHold} disabled={isEmpty} title="F5">
            <span className="ic ic-xs"><i className="ti ti-player-pause" /></span> تعليق
          </button>
          <button className="btn-sell2" onClick={onSell} disabled={isEmpty} title="F4">
            <span className="ic ic-xs"><i className="ti ti-circle-check" /></span> تأكيد البيع
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single cart item row ──────────────────────────
function CartItemRow({
  item, index, onQty, onDiscount, onRemove,
}: {
  item: CartItem;
  index: number;
  onQty:      (id: string, qty: number) => void;
  onDiscount: (id: string, pct: number) => void;
  onRemove:   (id: string) => void;
}) {
  const name = [item.product_name, item.variant_name].filter(Boolean).join(' — ');

  return (
    <div className="ci">
      <div className="ci-n">{index}</div>
      <div className="ci-body">
        <div className="ci-name" title={name}>{name}</div>
        <div className="ci-prow">
          <input
            type="number"
            className="ci-pinp"
            value={item.unit_price_ht}
            min={0}
            step={0.01}
            onChange={e => onDiscount(item.id, item.discount_percentage)}
            onBlur={e => {
              // price edit — via parent handler (simplified)
            }}
          />
          <span className="ci-punit">HT/{item.unit_symbol ?? 'قطعة'}</span>
          {item.discount_percentage > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--red)', marginRight: 'auto' }}>
              -{item.discount_percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Qty controls */}
      <div className="qc2">
        <button className="qb2" onClick={() => onQty(item.id, item.quantity - 1)}>−</button>
        <span className="qn2">{item.quantity}</span>
        <button className="qb2" onClick={() => onQty(item.id, item.quantity + 1)}>+</button>
      </div>

      {/* Total */}
      <span className="ci-sum" style={{ direction: 'ltr' }}>
        {item.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
      </span>

      {/* Delete */}
      <button className="ci-del" onClick={() => onRemove(item.id)} title="حذف">
        <span className="ic ic-xs"><i className="ti ti-x" /></span>
      </button>
    </div>
  );
}
```

## FILE: resources/js/pos/components/HeldCartsModal.tsx
```
// pos/components/HeldCartsModal.tsx
import React from 'react';
import type { HeldCart } from '@/types';
import { formatDZD } from '../utils/calculations';
import Modal from '@/components/ui/Modal';

interface HeldCartsModalProps {
  open:     boolean;
  carts:    HeldCart[];
  onClose:  () => void;
  onRestore:(id: string) => void;
  onDelete: (id: string) => void;
}

export default function HeldCartsModal({
  open, carts, onClose, onRestore, onDelete,
}: HeldCartsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="الفواتير المعلقة"
      subtitle={`${carts.length} معلقة`}
      size="sm"
      footer={<button className="btn" onClick={onClose}>إغلاق</button>}
    >
      <div style={{ padding: 0, margin: -20 }}>
        {carts.length === 0 ? (
          <div className="cart-empty" style={{ padding: 30 }}>
            <div className="cart-empty-ic" style={{ fontSize: 36 }}>
              <i className="ti ti-clock-pause" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t3)' }}>
              لا توجد فواتير معلقة
            </div>
          </div>
        ) : (
          carts.map(cart => (
            <div
              key={cart.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px', borderBottom: '1px solid var(--b1)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                  {cart.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                  {cart.items.length} صنف
                  {cart.client ? ` — ${cart.client.name}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--em)', direction: 'ltr', flexShrink: 0 }}>
                {formatDZD(cart.totals.total_ttc)}
              </div>
              <button
                className="btn btn-xs btn-p"
                onClick={() => { onRestore(cart.id); onClose(); }}
              >
                استرجاع
              </button>
              <button
                className="btn btn-xs btn-r"
                onClick={() => onDelete(cart.id)}
                title="حذف"
              >
                <span className="ic ic-xs"><i className="ti ti-trash" /></span>
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pos/components/PaymentModal.tsx
```
// pos/components/PaymentModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { CartTotals, Party, PaymentMode } from '@/types';
import { formatDZD, calcChange } from '../utils/calculations';

type PayMethod = 'cash' | 'cib' | 'ccp' | 'bank' | 'credit' | 'split';

interface PaymentModalProps {
  open:         boolean;
  totals:       CartTotals;
  client:       Party | null;
  paymentModes: PaymentMode[];
  onClose:      () => void;
  onConfirm:    (params: {
    paymentModeId:     number;
    treasuryAccountId?: number;
    amountPaid:        number;
    dueDate?:          string;
    note?:             string;
  }) => Promise<{ ok: boolean; message?: string }>;
}

const PAYMENT_BTNS: { method: PayMethod; icon: string; label: string }[] = [
  { method:'cash',   icon:'💵', label:'نقداً'   },
  { method:'cib',    icon:'💳', label:'CIB'     },
  { method:'ccp',    icon:'📮', label:'CCP'     },
  { method:'bank',   icon:'🏦', label:'تحويل'   },
  { method:'credit', icon:'📋', label:'آجل'     },
  { method:'split',  icon:'✂️', label:'مختلط'  },
];

export default function PaymentModal({
  open, totals, client, paymentModes, onClose, onConfirm,
}: PaymentModalProps) {
  const totalTtc  = totals.total_ttc + totals.fiscal_stamp;
  const [method,  setMethod]  = useState<PayMethod>('cash');
  const [given,   setGiven]   = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Split amounts
  const [splitCash, setSplitCash] = useState('');
  const [splitCib,  setSplitCib]  = useState('');
  const [splitCr,   setSplitCr]   = useState('');

  // Reset when opened
  useEffect(() => {
    if (open) {
      setGiven('');
      setError('');
      setMethod('cash');
      setSplitCash('');
      setSplitCib('');
      setSplitCr('');
    }
  }, [open]);

  // Numpad
  const np = useCallback((key: string) => {
    setGiven(prev => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      return prev + key;
    });
  }, []);

  const givenNum  = parseFloat(given || '0') || 0;
  const change    = calcChange(givenNum, totals.total_ttc, totals.fiscal_stamp);

  const splitSum  = (parseFloat(splitCash || '0') || 0)
                  + (parseFloat(splitCib  || '0') || 0)
                  + (parseFloat(splitCr   || '0') || 0);
  const splitDiff = splitSum - totalTtc;

  // Quick amounts
  const quickAmounts = [
    totalTtc,
    Math.ceil(totalTtc / 500) * 500,
    Math.ceil(totalTtc / 1000) * 1000,
    Math.ceil(totalTtc / 2000) * 2000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= totalTtc).slice(0, 4);

  const handleConfirm = async () => {
    setError('');
    let amountPaid = totalTtc;
    if (method === 'cash') amountPaid = givenNum || totalTtc;
    if (method === 'credit') amountPaid = 0;

    // Find payment mode id
    const modeMap: Record<PayMethod, string> = {
      cash: 'cash', cib: 'cib', ccp: 'ccp', bank: 'bank', credit: 'credit', split: 'mixed',
    };
    const pm = paymentModes.find(p => p.code === modeMap[method]) ?? paymentModes[0];

    setLoading(true);
    const res = await onConfirm({
      paymentModeId: pm?.id ?? 1,
      amountPaid,
      dueDate: method === 'credit' ? dueDate : undefined,
      note: note || undefined,
    });
    setLoading(false);

    if (!res.ok) { setError(res.message ?? 'فشل الحفظ'); return; }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="ov on">
      <div className="modal modal-sm" style={{ maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="m-hd" style={{ padding: '12px 16px' }}>
          <div>
            <div className="m-title">
              <span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check" /></span>
              تأكيد البيع
            </div>
            <div className="m-sub">
              {totals.lines_count} صنف — {totals.items_count} وحدة
            </div>
          </div>
          <div className="m-x" onClick={onClose}>
            <span className="ic ic-xs"><i className="ti ti-x" /></span>
          </div>
        </div>

        {/* Hero amount */}
        <div className="pay-amount-hero">
          <div className="pay-ttc-label">المبلغ الإجمالي TTC</div>
          <div className="pay-ttc-big">{formatDZD(totalTtc)}</div>
          <div className="pay-client-badge">
            <span className="ic ic-xs"><i className="ti ti-user" /></span>
            <span>{client?.name ?? 'زبون عابر'}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="pay-breakdown">
          <div className="pay-bd-c">
            <div className="pay-bd-l">HT</div>
            <div className="pay-bd-v">{formatDZD(totals.total_ht)}</div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">TVA</div>
            <div className="pay-bd-v">{formatDZD(totals.total_tva)}</div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">خصم</div>
            <div className="pay-bd-v" style={{ color: 'var(--red)' }}>
              {totals.total_discount > 0 ? `- ${formatDZD(totals.total_discount)}` : '—'}
            </div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">طابع</div>
            <div className="pay-bd-v">{totals.fiscal_stamp > 0 ? formatDZD(totals.fiscal_stamp) : '—'}</div>
          </div>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 'calc(95vh - 230px)' }}>

          {/* Payment method pills */}
          <div className="pay-m-grid">
            {PAYMENT_BTNS.map(({ method: m, icon, label }) => (
              <button
                key={m}
                className={`pmpill ${method === m ? 'on' : ''}`}
                onClick={() => setMethod(m)}
              >
                <span className="pmi">{icon}</span>{label}
              </button>
            ))}
          </div>

          {/* CASH */}
          {method === 'cash' && (
            <div>
              <div className="pay-cash-sec">
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', display: 'block', marginBottom: 6 }}>
                  المبلغ المُسلَّم
                </label>
                <input
                  type="number"
                  className="given-inp"
                  placeholder="0"
                  value={given}
                  onChange={e => setGiven(e.target.value)}
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              {/* Quick amounts */}
              <div className="qamts">
                {quickAmounts.map(v => (
                  <button key={v} className="qamt" onClick={() => setGiven(String(v))}>
                    {v.toLocaleString('fr-DZ')}
                  </button>
                ))}
              </div>
              {/* Change */}
              <div className="change-display">
                <span className="change-lbl2">الباقي للزبون</span>
                <span className="change-val2" style={{ color: change >= 0 ? 'var(--em)' : 'var(--red)' }}>
                  {formatDZD(change)}
                </span>
              </div>
              {/* Numpad */}
              <div className="numpad" id="numpad-grid">
                {['7','8','9','4','5','6','1','2','3'].map(k => (
                  <button key={k} className="npk" onClick={() => np(k)}>{k}</button>
                ))}
                <button className="npk del" onClick={() => np('del')}>
                  <span className="ic ic-xs"><i className="ti ti-backspace" /></span>
                </button>
                <button className="npk zero" onClick={() => np('0')}>0</button>
              </div>
            </div>
          )}

          {/* SPLIT */}
          {method === 'split' && (
            <div className="pay-split-sec" style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--t3)', marginBottom: 10 }}>
                الدفع المختلط
              </div>
              {[
                { label: 'نقداً', val: splitCash, set: setSplitCash },
                { label: 'CIB',   val: splitCib,  set: setSplitCib  },
                { label: 'آجل',   val: splitCr,   set: setSplitCr   },
              ].map(({ label, val, set }) => (
                <div className="split-row" key={label}>
                  <span className="split-lbl">{label}</span>
                  <input
                    type="number"
                    className="split-inp"
                    placeholder="0"
                    value={val}
                    onChange={e => set(e.target.value)}
                    inputMode="numeric"
                  />
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>دج</span>
                </div>
              ))}
              <div className="change-display">
                <span className="change-lbl2">الفارق</span>
                <span className="change-val2" style={{ color: Math.abs(splitDiff) < 1 ? 'var(--em)' : 'var(--red)' }}>
                  {formatDZD(splitDiff)}
                </span>
              </div>
            </div>
          )}

          {/* CREDIT */}
          {method === 'credit' && (
            <div className="pay-credit-sec" style={{ padding: '8px 14px' }}>
              <div className="al al-b" style={{ borderRadius: 'var(--r2)', marginBottom: 10 }}>
                <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-info-circle" /></span>
                <div>بيع آجل — سيُسجَّل في ديون العملاء تلقائياً عند التأكيد.</div>
              </div>
              <div className="fg">
                <label>تاريخ الاستحقاق</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* ELECTRONIC */}
          {(method === 'cib' || method === 'ccp' || method === 'bank') && (
            <div className="pay-credit-sec" style={{ padding: '8px 14px' }}>
              <div className="al al-g" style={{ borderRadius: 'var(--r2)' }}>
                <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-check" /></span>
                <div>الدفع الإلكتروني — المبلغ الكامل يُسدَّد مباشرة.</div>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="pay-note-sec" style={{ padding: '4px 14px 8px' }}>
            <label>ملاحظة على الفاتورة</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="اختياري..."
              style={{ width: '100%', padding: '6px 9px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'var(--bg3)', fontFamily: 'Tajawal,sans-serif', fontSize: '12.5px', outline: 'none' }}
            />
          </div>

          {error && (
            <div className="al al-r" style={{ margin: '0 14px 8px', borderRadius: 'var(--r2)', fontSize: 12 }}>
              <span className="ic ic-xs"><i className="ti ti-alert-circle" /></span>
              <div>{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <span className="ic ic-xs"><i className="ti ti-loader" /></span>
            ) : (
              <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
            )}
            {loading ? 'جاري الحفظ...' : 'تأكيد وطباعة'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/ProductCard.tsx
```
// pos/components/ProductCard.tsx
import React from 'react';
import type { ProductVariant } from '@/types';

interface ProductCardProps {
  variant: ProductVariant;
  qtyInCart: number;
  view: 'grid' | 'list';
  onClick: () => void;
}

function stockClass(stock: number | undefined, min: number): string {
  if (stock === undefined || stock === null) return 'ok';
  if (stock <= 0) return 'no';
  if (stock <= min) return 'lo';
  return 'ok';
}

function stockLabel(stock: number | undefined): string {
  if (stock === undefined || stock === null) return '';
  if (stock <= 0) return 'نفد';
  return `${stock} ${stock === 1 ? 'وحدة' : 'وحدة'}`;
}

export default function ProductCard({ variant, qtyInCart, view, onClick }: ProductCardProps) {
  const product   = variant.product;
  const stock     = variant.current_stock;
  const isOOS     = variant.manages_stock && (stock ?? 1) <= 0 && !variant.allow_negative_stock;
  const sc        = stockClass(stock ?? undefined, variant.min_stock_alert);
  const tvaRate   = variant.tva?.rate ?? 19;
  const priceTtc  = variant.default_selling_price_ht * (1 + tvaRate / 100);

  // pick icon / color based on family name
  const familyName = product?.family?.name ?? '';
  const { icon, color, bg } = familyStyle(familyName);

  const name = [product?.name, variant.variant_name].filter(Boolean).join(' — ');

  if (view === 'list') {
    return (
      <div
        className={`pc2 ${qtyInCart > 0 ? 'sel' : ''} ${isOOS ? 'oos' : ''}`}
        style={{ '--pc-color': color, '--pc-bg': bg } as React.CSSProperties}
        onClick={isOOS ? undefined : onClick}
      >
        {qtyInCart > 0 && <div className="pc2-badge">{qtyInCart}</div>}
        <div className="pc2-ic">
          <span className="ic ic-sm"><i className={`ti ${icon}`} /></span>
        </div>
        <div className="pc2-info">
          <div className="pc2-name">{name}</div>
          <div className="pc2-price" style={{ direction: 'ltr' }}>
            {priceTtc.toFixed(0)} دج
          </div>
          {variant.manages_stock && (
            <div className={`pc2-stock ${sc}`}>{stockLabel(stock ?? undefined)}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pc2 ${qtyInCart > 0 ? 'sel' : ''} ${isOOS ? 'oos' : ''}`}
      style={{ '--pc-color': color, '--pc-bg': bg } as React.CSSProperties}
      onClick={isOOS ? undefined : onClick}
    >
      {qtyInCart > 0 && <div className="pc2-badge">{qtyInCart}</div>}
      <div className="pc2-ic">
        <span className="ic ic-sm"><i className={`ti ${icon}`} /></span>
      </div>
      <div className="pc2-name">{name}</div>
      <div className="pc2-price" style={{ direction: 'ltr' }}>{priceTtc.toFixed(0)} دج</div>
      {variant.manages_stock && (
        <div className={`pc2-stock ${sc}`}>{stockLabel(stock ?? undefined)}</div>
      )}
    </div>
  );
}

// ── Family → icon/color mapping ────────────────────
function familyStyle(family: string): { icon: string; color: string; bg: string } {
  const f = family.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل'))    return { icon: 'ti-apple',         color: 'var(--em)',     bg: 'var(--emb)'   };
  if (f.includes('شراب') || f.includes('ماء'))  return { icon: 'ti-droplets',      color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('إلكترون'))                    return { icon: 'ti-device-mobile', color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('ملابس'))                      return { icon: 'ti-shirt',         color: 'var(--purple)', bg: 'var(--purb)'  };
  if (f.includes('صيانة'))                      return { icon: 'ti-tool',          color: 'var(--orange)', bg: 'var(--orb)'   };
  return { icon: 'ti-package', color: 'var(--em)', bg: 'var(--emb)' };
}
```

## FILE: resources/js/pos/components/Receipt.tsx
```
// pos/components/Receipt.tsx
import React from 'react';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD } from '../utils/calculations';
import Modal from '@/components/ui/Modal';

interface ReceiptProps {
  open:      boolean;
  items:     CartItem[];
  totals:    CartTotals;
  client:    Party | null;
  docNumber?: string;
  onClose:   () => void;
  onPrint:   () => void;
}

export default function Receipt({
  open, items, totals, client, docNumber, onClose, onPrint,
}: ReceiptProps) {
  const now = new Date().toLocaleDateString('fr-DZ');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="معاينة الفاتورة"
      size="md"
      footer={
        <>
          <button className="btn" onClick={onClose}>إغلاق</button>
          <button className="btn btn-p" onClick={onPrint}>
            <span className="ic ic-xs"><i className="ti ti-printer" /></span>
            طباعة
          </button>
        </>
      }
    >
      <div className="receipt-wrap" id="invoice-preview">
        {/* Header */}
        <div className="receipt-head">
          <div>
            <div className="receipt-logo">مؤسسة النور للتجارة</div>
            <div className="receipt-meta">
              NIF: 001234567890123 | RC: 29/00-0012345B05<br />
              ورقلة — الجزائر | 029 71 23 45
            </div>
          </div>
          <div className="receipt-num">
            <div>{docNumber ?? 'مسودة'}</div>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500, marginTop: 3 }}>
              التاريخ: {now}
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
              الزبون: {client?.name ?? 'عابر'}
            </div>
          </div>
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '4px 6px', textAlign: 'right' }}>البيان</th>
              <th style={{ padding: '4px 6px', textAlign: 'center' }}>الكمية</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', direction: 'ltr' }}>سعر HT</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', direction: 'ltr' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 6px' }}>
                  {item.product_name}
                  {item.variant_name && <span style={{ color: '#64748b' }}> — {item.variant_name}</span>}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                  {item.quantity} {item.unit_symbol}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', direction: 'ltr' }}>
                  {item.unit_price_ht.toFixed(2)} دج
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', direction: 'ltr', fontWeight: 700 }}>
                  {item.total_ht.toFixed(2)} دج
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="receipt-totals">
          <div className="receipt-totals-inner">
            <div className="receipt-row">
              <span>المجموع HT</span>
              <span>{formatDZD(totals.total_ht)}</span>
            </div>
            <div className="receipt-row">
              <span>TVA</span>
              <span>{formatDZD(totals.total_tva)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="receipt-row" style={{ color: '#dc2626' }}>
                <span>خصم</span>
                <span>- {formatDZD(totals.total_discount)}</span>
              </div>
            )}
            {totals.fiscal_stamp > 0 && (
              <div className="receipt-row">
                <span>الطابع الجبائي</span>
                <span>{formatDZD(totals.fiscal_stamp)}</span>
              </div>
            )}
            <div className="receipt-grand">
              <span>الإجمالي TTC</span>
              <span>{formatDZD(totals.total_ttc + totals.fiscal_stamp)}</span>
            </div>
          </div>
        </div>

        <div className="receipt-foot">
          شكراً لتعاملكم معنا — يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري
        </div>
      </div>
    </Modal>
  );
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

