// components/admin/CompanyDrawer/index.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DrawerShell, TabBar, Avatar, StatusBadge, ActionBtn,
  InfoRow, SectionTitle, EmptyState, Spinner, fmtDate,
} from '../shared';
import type { TabDef } from '../shared';
import { companiesApi, plansApi } from '@/lib/api/admin';
import { useCompanyMutations } from '@/hooks/admin';
import { useNotification } from '@/hooks/useNotification';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui';
import type { AdminCompany, AdminUser, AdminPlan } from '@/types/admin';

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
  const deleteConfirm = useConfirm();
  const notify = useNotification();
  const close = (refresh = false) => onClose(refresh);

  const { data: plans = [] } = useQuery<AdminPlan[]>({
    queryKey: ['admin', 'plans'],
    queryFn:  () => plansApi.list(),
    staleTime: 60_000,
  });

  const planMap = Object.fromEntries(plans.map(p => [p.key, p]));

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
        notify.success(successMsg);
        if (refreshOnSuccess) close(true);
      },
      onError: (e: unknown) => notify.error(errMsg(e)),
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
      notify.error(errMsg(e));
    }
  };

  const handleRemoveUser = async (u: AdminUser) => {
    if (!await deleteConfirm.confirm(`إزالة ${u.name}؟`)) return;
    try {
      await companiesApi.removeUser(co.id, u.id);
      refetchMembers();
      notify.success('تم إزالة المستخدم');
    } catch (e) {
      notify.error(errMsg(e));
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
              onChange={e => {
                const p = planMap[e.target.value];
                setPlanForm(f => ({
                  ...f,
                  plan: e.target.value,
                  max_users:      p?.max_users      ?? f.max_users,
                  max_products:   p?.max_products   ?? f.max_products,
                  max_warehouses: p?.max_warehouses ?? f.max_warehouses,
                }));
              }}
              style={sel}
            >
              {plans.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
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
            onClick={async () => {
              if (!await deleteConfirm.confirm(`حذف شركة "${co.name}" نهائياً؟`)) return;
              muts.remove.mutate(co.id, {
                onSuccess: () => close(true),
                onError:   (e: unknown) => notify.error(errMsg(e)),
              });
            }}
            loading={muts.remove.isPending} />
        </div>
      )}
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
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
