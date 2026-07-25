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
  DrawerShell, TabBar, Avatar, StatusBadge,
  ActionBtn, InfoRow, SectionTitle, EmptyState, Spinner,
  fmtDate,
} from '../shared';
import type { TabDef } from '../shared';
import { companiesApi } from '@/lib/api/admin';
import { useCompanyMutations } from '@/hooks/admin';
import type { AdminCompany, AdminUser } from '@/types/admin';
import { useNotification } from '@/hooks/useNotification';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui';

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
  const notify = useNotification();
  const deleteConfirm = useConfirm();

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
                  onSuccess: () => { notify.success( 'تم رفع التعليق'); close(true); },
                  onError:   (e: any) => notify.error( e?.message ?? 'فشل رفع التعليق'),
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
                  onSuccess: () => { notify.success( 'تم الإيقاف'); close(true); },
                  onError:   (e: any) => notify.error( e?.message ?? 'فشل الإيقاف'),
                })}
                loading={muts.deactivate.isPending}
              />
            ) : (
              <ActionBtn
                icon="ti-check" label="تفعيل" variant="success"
                onClick={() => muts.activate.mutate(co.id, {
                  onSuccess: () => { notify.success( 'تم التفعيل'); close(true); },
                  onError:   (e: any) => notify.error( e?.message ?? 'فشل التفعيل'),
                })}
                loading={muts.activate.isPending}
              />
            )}

            {/* ✅ verify/unverify — id بدل slug */}
            {!co.verified_at ? (
              <ActionBtn
                icon="ti-shield-check" label="توثيق" variant="success"
                onClick={() => muts.verify.mutate(co.id, {
                  onSuccess: () => { notify.success( 'تم التوثيق'); close(true); },
                  onError:   (e: any) => notify.error( e?.message ?? 'فشل التوثيق'),
                })}
                loading={muts.verify.isPending}
              />
            ) : (
              <ActionBtn
                icon="ti-shield-off" label="إلغاء التوثيق"
                onClick={() => muts.unverify.mutate(co.id, {
                  onSuccess: () => { notify.success( 'تم الإلغاء'); close(true); },
                  onError:   (e: any) => notify.error( e?.message ?? 'فشل إلغاء التوثيق'),
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
                        onSuccess: () => { notify.success( 'تم التعليق'); close(true); },
                        onError:   (e: any) => notify.error( e?.message ?? 'فشل التعليق'),
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
                        if (!await deleteConfirm.confirm(`إزالة ${u.name}؟`)) return;
                        await companiesApi.removeUser(co.id, u.id);
                        refetchMembers();
                        notify.success( 'تم الإزالة');
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
                  onSuccess: () => { notify.success( 'تم تغيير الخطة'); close(true); },
                  onError:   (e: any) => notify.error( e?.message ?? 'فشل تغيير الخطة'),
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
                  onSuccess: () => notify.success( 'تم الحفظ'),
                  onError:   (e: any) => notify.error( e?.message ?? 'فشل الحفظ'),
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
                onSuccess: () => notify.success( 'تم البذر بنجاح'),
                onError:   (e: any) => notify.error( e?.message ?? 'فشل البذر'),
              })
            }
            loading={muts.seed.isPending}
          />

          <ActionBtn
            icon="ti-trash" label="حذف الشركة نهائياً" variant="danger"
            onClick={async () => {
              if (!await deleteConfirm.confirm(`حذف شركة "${co.name}" نهائياً؟`)) return;
              muts.remove.mutate(co.id, {
                onSuccess: () => close(true),
                onError:   (e: any) => notify.error( e?.message ?? 'فشل الحذف'),
              });
            }}
            loading={muts.remove.isPending}
          />
        </div>
      )}
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
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
