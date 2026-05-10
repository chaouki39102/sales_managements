// ════════════════════════════════════════════════════════════
// pages/admin/AdminCompaniesPage.tsx
// صفحة إدارة الشركات — بيانات حقيقية — مصححة بالكامل
// ════════════════════════════════════════════════════════════
import { useState, useMemo, useCallback } from 'react';
import { useAdminCompanies, useAdminCompanyMutations, useAdminCompanyUsers } from '@/hooks/useAdmin';
import type { AdminCompany } from '@/types/admin';

// ─── Constants ───────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي',
  enterprise: 'مؤسسة', custom: 'مخصص',
};
const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1', professional: '#0ea5e9',
  enterprise: '#f59e0b', custom: '#8b5cf6',
};
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

// ─── Status helper ────────────────────────────────────────────
function statusInfo(co: AdminCompany) {
  if (co.is_suspended)  return { label: 'معلّقة',   color: '#ef4444', bg: '#ef44441a', icon: 'ti-lock' };
  if (!co.active)       return { label: 'غير نشطة', color: '#6b7280', bg: '#6b72801a', icon: 'ti-minus-circle' };
  if (co.verified_at)   return { label: 'موثّقة',   color: '#10b981', bg: '#10b9811a', icon: 'ti-rosette-discount-check' };
  return                       { label: 'نشطة',     color: '#10b981', bg: '#10b9811a', icon: 'ti-circle-check' };
}

// ─── Sub-components ───────────────────────────────────────────
function StatusBadge({ co }: { co: AdminCompany }) {
  const s = statusInfo(co);
  return (
    <span style={{
      fontSize: 10, padding: '3px 8px', borderRadius: 10, fontWeight: 700,
      background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <i className={`ti ${s.icon}`} style={{ fontSize: 11 }} />
      {s.label}
    </span>
  );
}

// ─── Drawer tabs ─────────────────────────────────────────────
type DrawerTab = 'info' | 'plan' | 'users' | 'notes' | 'actions';

function DrawerTabBar({ active, onChange }: { active: DrawerTab; onChange: (t: DrawerTab) => void }) {
  const tabs: { key: DrawerTab; label: string; icon: string }[] = [
    { key: 'info',    label: 'المعلومات', icon: 'ti-info-circle' },
    { key: 'plan',    label: 'الخطة',     icon: 'ti-credit-card' },
    { key: 'users',   label: 'المستخدمون', icon: 'ti-users' },
    { key: 'notes',   label: 'ملاحظات',   icon: 'ti-notes' },
    { key: 'actions', label: 'إجراءات',   icon: 'ti-settings' },
  ];
  return (
    <div style={{
      display: 'flex', borderBottom: '1px solid var(--b2)',
      padding: '0 16px', gap: 2, flexShrink: 0,
    }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: '9px 12px', border: 'none', background: 'transparent',
            borderBottom: active === t.key ? '2px solid #dc2626' : '2px solid transparent',
            color: active === t.key ? '#dc2626' : 'var(--t3)',
            fontWeight: active === t.key ? 700 : 500,
            fontSize: 11.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: "'Tajawal', sans-serif",
            transition: 'all .15s',
          }}
        >
          <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Drawer Panel ─────────────────────────────────────────────
function CompanyDrawer({
  co, onClose, muts, onSuccess,
}: {
  co: AdminCompany;
  onClose: () => void;
  muts: ReturnType<typeof useAdminCompanyMutations>;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>('info');
  const [notes, setNotes] = useState(co.notes ?? '');
  const [planForm, setPlanForm] = useState({
    plan: co.plan,
    max_users: co.max_users ?? 0,
    max_products: co.max_products ?? 0,
    max_warehouses: co.max_warehouses ?? 0,
  });
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const { data: usersData, isLoading: usersLoading } = useAdminCompanyUsers(co.id, tab === 'users');

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setLoading(key);
    setMsg(null);
    try {
      await fn();
      setMsg({ type: 'ok', text: 'تمت العملية بنجاح' });
      onSuccess();
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.response?.data?.message ?? 'حدث خطأ' });
    } finally {
      setLoading(null);
    }
  };

  const planColor = PLAN_COLORS[co.plan] ?? '#6b7280';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', justifyContent: 'flex-start',
    }}>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(2px)' }}
      />

      {/* Drawer */}
      <div style={{
        position: 'relative', width: 480, height: '100vh',
        background: 'var(--bg2)', display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 32px rgba(0,0,0,.18)',
        animation: 'slideIn .22s cubic-bezier(.4,0,.2,1)',
        zIndex: 201,
      }}>
        <style>{`
          @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
          .drw-inp { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--b2);
            background: var(--bg1); color: var(--t1); font-size: 12px; font-family: 'Tajawal',sans-serif;
            outline: none; }
          .drw-inp:focus { border-color: #dc2626; }
          .drw-lbl { font-size: 11px; color: var(--t4); margin-bottom: 4px; font-weight: 600; }
          .drw-field { margin-bottom: 12px; }
          .act-btn { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 9px;
            border: 1px solid var(--b2); background: var(--bg1); color: var(--t2); font-size: 12px;
            font-weight: 700; cursor: pointer; width: 100%; font-family: 'Tajawal',sans-serif;
            transition: all .15s; margin-bottom: 8px; text-align: right; }
          .act-btn:hover { background: var(--bg3); }
          .act-btn.red { border-color: #ef44441a; background: #ef44441a; color: #ef4444; }
          .act-btn.red:hover { background: #ef4444; color: #fff; }
          .act-btn.green { border-color: #10b9811a; background: #10b9811a; color: #10b981; }
          .act-btn.green:hover { background: #10b981; color: #fff; }
          .act-btn.blue { border-color: #0ea5e91a; background: #0ea5e91a; color: #0ea5e9; }
          .act-btn.blue:hover { background: #0ea5e9; color: #fff; }
          .act-btn.gold { border-color: #f59e0b1a; background: #f59e0b1a; color: #f59e0b; }
          .act-btn.gold:hover { background: #f59e0b; color: #fff; }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '16px 18px', borderBottom: '1px solid var(--b2)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: avColor(co.id),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {initials(co.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {co.name}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>/{co.slug}</span>
              <StatusBadge co={co} />
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 700,
                background: planColor + '1a', color: planColor,
              }}>
                {PLAN_LABELS[co.plan] ?? co.plan}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, border: '1px solid var(--b2)',
              background: 'var(--bg1)', cursor: 'pointer', color: 'var(--t3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div style={{
            margin: '8px 16px 0', padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: msg.type === 'ok' ? '#10b9811a' : '#ef44441a',
            color: msg.type === 'ok' ? '#10b981' : '#ef4444',
            border: `1px solid ${msg.type === 'ok' ? '#10b98130' : '#ef444430'}`,
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <i className={`ti ${msg.type === 'ok' ? 'ti-check' : 'ti-alert-circle'}`} />
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <DrawerTabBar active={tab} onChange={setTab} />

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

          {/* ── TAB: المعلومات ─────────────────────────────── */}
          {tab === 'info' && (
            <div>
              {[
                { label: 'الاسم التجاري', value: co.commercial_name },
                { label: 'البريد الإلكتروني', value: co.email },
                { label: 'الهاتف', value: co.phone },
                { label: 'العنوان', value: co.address },
                { label: 'النشاط التجاري', value: co.activity },
                { label: 'المالك', value: co.owner?.name ? `${co.owner.name} (${co.owner.email})` : null },
                { label: 'تاريخ الإنشاء', value: co.created_at ? new Date(co.created_at).toLocaleDateString('ar-DZ') : null },
                { label: 'آخر تعديل', value: (co as any).updated_at ? new Date((co as any).updated_at).toLocaleDateString('ar-DZ') : null },
                { label: 'المستخدمون', value: `${co.users_count ?? 0} / ${co.max_users}` },
                { label: 'المنتجات (الحد)', value: co.max_products === 0 ? 'غير محدود' : co.max_products?.toLocaleString('ar') },
                { label: 'المستودعات (الحد)', value: co.max_warehouses === 0 ? 'غير محدود' : co.max_warehouses },
                { label: 'رقم NIF', value: co.nif },
                { label: 'رقم NIS', value: co.nis },
                { label: 'رقم RC', value: co.rc },
              ].filter(f => f.value !== null && f.value !== undefined && f.value !== '').map(f => (
                <div key={f.label} style={{
                  display: 'flex', gap: 10, padding: '9px 0',
                  borderBottom: '1px solid var(--b1)', alignItems: 'flex-start',
                }}>
                  <span style={{ width: 140, fontSize: 11, color: 'var(--t4)', fontWeight: 600, flexShrink: 0 }}>
                    {f.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500, wordBreak: 'break-word' }}>
                    {f.value}
                  </span>
                </div>
              ))}

              {/* سبب التعليق إن وُجد */}
              {co.is_suspended && (co as any).suspension_reason && (
                <div style={{
                  marginTop: 14, padding: '10px 14px', borderRadius: 9,
                  background: '#ef44441a', border: '1px solid #ef444430',
                }}>
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>
                    <i className="ti ti-alert-circle" style={{ marginLeft: 5 }} />
                    سبب التعليق
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t2)' }}>{(co as any).suspension_reason}</div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: الخطة ─────────────────────────────────── */}
          {tab === 'plan' && (
            <div>
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 16,
                background: (PLAN_COLORS[co.plan] ?? '#6b7280') + '12',
                border: `1px solid ${(PLAN_COLORS[co.plan] ?? '#6b7280')}30`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <i className="ti ti-credit-card" style={{ fontSize: 18, color: PLAN_COLORS[co.plan] ?? '#6b7280' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                    الخطة الحالية: {PLAN_LABELS[co.plan] ?? co.plan}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>
                    {co.users_count} / {co.max_users} مستخدم مستخدَم
                  </div>
                </div>
              </div>

              <div className="drw-field">
                <div className="drw-lbl">تغيير الخطة</div>
                <select
                  className="drw-inp"
                  value={planForm.plan}
                  onChange={e => setPlanForm(p => ({ ...p, plan: e.target.value }))}
                >
                  {Object.entries(PLAN_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'حد المستخدمين', key: 'max_users', hint: '0 = غير محدود' },
                  { label: 'حد المنتجات', key: 'max_products', hint: '0 = غير محدود' },
                  { label: 'حد المستودعات', key: 'max_warehouses', hint: '0 = غير محدود' },
                ].map(f => (
                  <div key={f.key} className="drw-field" style={{ marginBottom: 0 }}>
                    <div className="drw-lbl">{f.label}</div>
                    <input
                      type="number"
                      className="drw-inp"
                      min={0}
                      value={planForm[f.key as keyof typeof planForm]}
                      onChange={e => setPlanForm(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                    />
                    <div style={{ fontSize: 9.5, color: 'var(--t4)', marginTop: 3 }}>{f.hint}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => run('plan', () => muts.changePlan.mutateAsync({
                  id: co.id, ...planForm,
                }))}
                disabled={loading === 'plan'}
                style={{
                  width: '100%', padding: '10px', borderRadius: 9, border: 'none',
                  background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading === 'plan'
                  ? <><i className="ti ti-loader spin" /> جارٍ الحفظ...</>
                  : <><i className="ti ti-check" /> حفظ الخطة</>
                }
              </button>
            </div>
          )}

          {/* ── TAB: المستخدمون ────────────────────────────── */}
          {tab === 'users' && (
            <div>
              {usersLoading
                ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t4)' }}>
                    <i className="ti ti-loader spin" style={{ fontSize: 22 }} />
                  </div>
                : ((usersData as any)?.data ?? usersData ?? []).length === 0
                ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t4)', fontSize: 13 }}>
                    لا يوجد مستخدمون
                  </div>
                : ((usersData as any)?.data ?? usersData ?? []).map((u: any) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    borderRadius: 9, border: '1px solid var(--b1)', marginBottom: 7,
                    background: 'var(--bg1)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{u.name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{u.email}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                      <span style={{
                        fontSize: 9.5, padding: '2px 7px', borderRadius: 8, fontWeight: 700,
                        background: (u.pivot?.active ?? u.active) ? '#10b9811a' : '#ef44441a',
                        color: (u.pivot?.active ?? u.active) ? '#10b981' : '#ef4444',
                      }}>
                        {(u.pivot?.active ?? u.active) ? 'نشط' : 'معطّل'}
                      </span>
                      {u.pivot?.role && (
                        <span style={{ fontSize: 9.5, color: 'var(--t4)' }}>{u.pivot.role}</span>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* ── TAB: الملاحظات ─────────────────────────────── */}
          {tab === 'notes' && (
            <div>
              <div className="drw-field">
                <div className="drw-lbl">ملاحظات السوبر أدمن (داخلية — لا تُعرض للشركة)</div>
                <textarea
                  className="drw-inp"
                  rows={8}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="أضف ملاحظات عن هذه الشركة..."
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button
                onClick={() => run('notes', () => muts.updateNotes.mutateAsync({ id: co.id, notes }))}
                disabled={loading === 'notes'}
                style={{
                  width: '100%', padding: '10px', borderRadius: 9, border: 'none',
                  background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading === 'notes'
                  ? <><i className="ti ti-loader spin" /> جارٍ الحفظ...</>
                  : <><i className="ti ti-notes" /> حفظ الملاحظات</>
                }
              </button>
            </div>
          )}

          {/* ── TAB: الإجراءات ─────────────────────────────── */}
          {tab === 'actions' && (
            <div>
              {/* تفعيل / إيقاف */}
              {co.active && !co.is_suspended ? (
                <button
                  className="act-btn red"
                  onClick={() => run('deactivate', () => muts.deactivate.mutateAsync(co.id))}
                  disabled={loading === 'deactivate'}
                >
                  {loading === 'deactivate' ? <i className="ti ti-loader spin" /> : <i className="ti ti-player-stop" style={{ fontSize: 15 }} />}
                  إيقاف الشركة
                </button>
              ) : (
                <button
                  className="act-btn green"
                  onClick={() => run('activate', () => muts.activate.mutateAsync(co.id))}
                  disabled={loading === 'activate'}
                >
                  {loading === 'activate' ? <i className="ti ti-loader spin" /> : <i className="ti ti-player-play" style={{ fontSize: 15 }} />}
                  تفعيل الشركة
                </button>
              )}

              {/* تعليق / رفع التعليق */}
              {!co.is_suspended ? (
                <div>
                  {!showSuspendForm ? (
                    <button
                      className="act-btn red"
                      onClick={() => setShowSuspendForm(true)}
                    >
                      <i className="ti ti-lock" style={{ fontSize: 15 }} />
                      تعليق الشركة
                    </button>
                  ) : (
                    <div style={{
                      padding: '12px', borderRadius: 9, border: '1px solid #ef444430',
                      background: '#ef44441a', marginBottom: 8,
                    }}>
                      <div className="drw-lbl" style={{ color: '#ef4444' }}>سبب التعليق (مطلوب)</div>
                      <textarea
                        className="drw-inp"
                        rows={3}
                        value={suspendReason}
                        onChange={e => setSuspendReason(e.target.value)}
                        placeholder="أدخل سبب التعليق..."
                        style={{ marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            if (!suspendReason.trim()) return;
                            run('suspend', () => muts.suspend.mutateAsync({ id: co.id, reason: suspendReason }));
                          }}
                          disabled={loading === 'suspend' || !suspendReason.trim()}
                          style={{
                            flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                            background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 12,
                            cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
                          }}
                        >
                          {loading === 'suspend' ? <i className="ti ti-loader spin" /> : 'تأكيد التعليق'}
                        </button>
                        <button
                          onClick={() => setShowSuspendForm(false)}
                          style={{
                            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--b2)',
                            background: 'var(--bg2)', color: 'var(--t2)', cursor: 'pointer',
                            fontFamily: "'Tajawal', sans-serif", fontSize: 12,
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  className="act-btn green"
                  onClick={() => run('unsuspend', () => muts.unsuspend.mutateAsync(co.id))}
                  disabled={loading === 'unsuspend'}
                >
                  {loading === 'unsuspend' ? <i className="ti ti-loader spin" /> : <i className="ti ti-lock-open" style={{ fontSize: 15 }} />}
                  رفع التعليق
                </button>
              )}

              {/* توثيق / إلغاء توثيق */}
              {!co.verified_at ? (
                <button
                  className="act-btn blue"
                  onClick={() => run('verify', () => muts.verify.mutateAsync(co.id))}
                  disabled={loading === 'verify'}
                >
                  {loading === 'verify' ? <i className="ti ti-loader spin" /> : <i className="ti ti-rosette-discount-check" style={{ fontSize: 15 }} />}
                  توثيق الشركة
                </button>
              ) : (
                <button
                  className="act-btn gold"
                  onClick={() => run('unverify', () => muts.unverify.mutateAsync(co.id))}
                  disabled={loading === 'unverify'}
                >
                  {loading === 'unverify' ? <i className="ti ti-loader spin" /> : <i className="ti ti-rosette-discount-check-off" style={{ fontSize: 15 }} />}
                  إلغاء التوثيق
                </button>
              )}

              {/* Impersonate */}
              <button
                className="act-btn blue"
                onClick={() => run('imp', async () => {
                  const res = await muts.impersonate.mutateAsync(co.id);
                  if (res?.token) {
                    localStorage.setItem('auth_token', res.token);
                    window.location.href = `/dashboard`;
                  }
                })}
                disabled={loading === 'imp'}
              >
                {loading === 'imp' ? <i className="ti ti-loader spin" /> : <i className="ti ti-user-scan" style={{ fontSize: 15 }} />}
                الدخول كمسؤول الشركة
              </button>

              {/* حذف */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--b1)' }}>
                <button
                  className="act-btn red"
                  onClick={() => {
                    if (window.confirm(`هل أنت متأكد من حذف "${co.name}" نهائياً؟`)) {
                      run('delete', () => muts.deleteCompany.mutateAsync(co.id));
                    }
                  }}
                  disabled={loading === 'delete'}
                >
                  {loading === 'delete' ? <i className="ti ti-loader spin" /> : <i className="ti ti-trash" style={{ fontSize: 15 }} />}
                  حذف الشركة نهائياً
                </button>
                <p style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 6 }}>
                  ⚠️ هذا الإجراء لا يمكن التراجع عنه
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Main Page
// ════════════════════════════════════════════════
export default function AdminCompaniesPage() {
  // ── State ─────────────────────────────────────────────────
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [plan,   setPlan]       = useState('');
  const [sortBy, setSortBy]     = useState<'created_at' | 'name' | 'users_count'>('created_at');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [page,   setPage]       = useState(1);
  const [selected, setSelected] = useState<AdminCompany | null>(null);

  // ── Query params (memoized) ───────────────────────────────
  const params = useMemo(() => ({
    search:   search   || undefined,
    status:   (status  || undefined) as any,
    plan:     plan     || undefined,
    sort_by:  sortBy,
    sort_dir: sortDir,
    page,
    per_page: 20,
  }), [search, status, plan, sortBy, sortDir, page]);

  // ── Data ──────────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch } = useAdminCompanies(params);
  const companies = data?.data ?? [];
  const meta      = data?.meta;
  const muts      = useAdminCompanyMutations();

  // ── Handlers ──────────────────────────────────────────────
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  }, [refetch]);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <i className="ti ti-arrows-sort" style={{ fontSize: 11, opacity: .4 }} />;
    return <i className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} style={{ fontSize: 11, color: '#dc2626' }} />;
  };

  // ── CSS ───────────────────────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    page: { maxWidth: 1300, margin: '0 auto' },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
    filterBar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
    inp: {
      padding: '7px 11px', borderRadius: 8, border: '1px solid var(--b2)',
      background: 'var(--bg2)', color: 'var(--t1)', fontSize: 12,
      fontFamily: "'Tajawal', sans-serif", outline: 'none',
    },
    tableWrap: { background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 12, overflow: 'hidden' },
    th: {
      padding: '10px 13px', textAlign: 'right' as const, color: 'var(--t4)',
      fontWeight: 600, borderBottom: '1px solid var(--b2)', background: 'var(--bg1)',
      fontSize: 11, whiteSpace: 'nowrap' as const, cursor: 'pointer', userSelect: 'none' as const,
    },
    td: { padding: '11px 13px', borderBottom: '1px solid var(--b1)', color: 'var(--t2)', verticalAlign: 'middle' as const },
  };

  return (
    <div style={s.page}>
      <style>{`
        .ctrow:hover td { background: var(--bg1); cursor: pointer; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fi:focus { border-color: #dc2626; outline: none; }
        .pg-btn { padding: 5px 12px; border-radius: 7px; border: 1px solid var(--b2);
          background: var(--bg2); cursor: pointer; font-size: 12px; color: var(--t2);
          font-family: 'Tajawal',sans-serif; }
        .pg-btn:disabled { opacity: .4; cursor: default; }
        .pg-btn.on { background: #dc2626; color: #fff; border-color: #dc2626; font-weight: 700; }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t1)', margin: 0 }}>
            إدارة الشركات
          </h1>
          <p style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>
            {meta?.total !== undefined ? `${meta.total} شركة في المنصة` : 'جارٍ التحميل...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => refetch()}
            style={{ ...s.inp, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: '1px solid var(--b2)' }}
          >
            <i className={`ti ti-refresh ${isLoading ? 'spin' : ''}`} style={{ fontSize: 14 }} />
            تحديث
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} style={s.filterBar}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 200,
          background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 8,
          padding: '7px 11px',
        }}>
          <i className="ti ti-search" style={{ color: 'var(--t4)', fontSize: 14, flexShrink: 0 }} />
          <input
            className="fi"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الـ slug أو البريد..."
            style={{
              border: 'none', outline: 'none', fontSize: 12, color: 'var(--t1)',
              background: 'transparent', width: '100%', fontFamily: "'Tajawal', sans-serif",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 0 }}
            >
              <i className="ti ti-x" style={{ fontSize: 13 }} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          className="fi"
          style={s.inp}
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="suspended">معلّقة</option>
          <option value="inactive">غير نشطة</option>
          <option value="verified">موثّقة</option>
          <option value="unverified">غير موثّقة</option>
        </select>

        {/* Plan filter */}
        <select
          className="fi"
          style={s.inp}
          value={plan}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
        >
          <option value="">كل الخطط</option>
          {Object.entries(PLAN_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <button
          type="submit"
          style={{
            padding: '7px 16px', borderRadius: 8, border: 'none',
            background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
          }}
        >
          <i className="ti ti-search" style={{ marginLeft: 5 }} />
          بحث
        </button>
      </form>

      {/* Error */}
      {isError && (
        <div style={{
          padding: '12px 16px', borderRadius: 9, marginBottom: 14,
          background: '#ef44441a', border: '1px solid #ef444430',
          fontSize: 12, color: '#ef4444', display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 16 }} />
          <span>
            تعذّر تحميل الشركات.{' '}
            {(error as any)?.response?.data?.message ?? (error as any)?.message ?? 'خطأ غير متوقع'}
          </span>
          <button
            onClick={() => refetch()}
            style={{
              marginRight: 'auto', padding: '4px 12px', borderRadius: 7,
              border: '1px solid #ef4444', background: 'transparent', color: '#ef4444',
              cursor: 'pointer', fontSize: 11, fontFamily: "'Tajawal', sans-serif",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Table */}
      <div style={s.tableWrap}>
        {isLoading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--t4)' }}>
            <i className="ti ti-loader spin" style={{ fontSize: 28, display: 'block', marginBottom: 10, color: '#dc2626' }} />
            جارٍ تحميل الشركات...
          </div>
        ) : companies.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--t4)' }}>
            <i className="ti ti-building-off" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: .4 }} />
            لا توجد شركات تطابق هذا البحث
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={s.th}>
                    <span
                      onClick={() => handleSort('name')}
                      style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      الشركة <SortIcon col="name" />
                    </span>
                  </th>
                  <th style={s.th}>المالك</th>
                  <th style={s.th}>الخطة</th>
                  <th style={s.th}>
                    <span
                      onClick={() => handleSort('users_count')}
                      style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      المستخدمون <SortIcon col="users_count" />
                    </span>
                  </th>
                  <th style={s.th}>الحالة</th>
                  <th style={s.th}>
                    <span
                      onClick={() => handleSort('created_at')}
                      style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      تاريخ الإنشاء <SortIcon col="created_at" />
                    </span>
                  </th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {companies.map(co => {
                  const planColor = PLAN_COLORS[co.plan] ?? '#6b7280';
                  return (
                    <tr
                      key={co.id}
                      className="ctrow"
                      onClick={() => setSelected(co)}
                    >
                      <td style={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                            background: avColor(co.id),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, color: '#fff',
                          }}>
                            {initials(co.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                              {co.name}
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>/{co.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                          {co.owner?.name ?? <span style={{ color: 'var(--t4)' }}>—</span>}
                        </div>
                        {co.owner?.email && (
                          <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{co.owner.email}</div>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={{
                          fontSize: 10.5, padding: '3px 9px', borderRadius: 7, fontWeight: 700,
                          background: planColor + '18', color: planColor,
                        }}>
                          {PLAN_LABELS[co.plan] ?? co.plan}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                            {co.users_count ?? 0}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--t4)' }}>/ {co.max_users}</span>
                          {co.max_users > 0 && (
                            <div style={{
                              flex: 1, height: 4, background: 'var(--bg3)',
                              borderRadius: 2, overflow: 'hidden', minWidth: 40,
                            }}>
                              <div style={{
                                width: `${Math.min(100, ((co.users_count ?? 0) / co.max_users) * 100)}%`,
                                height: '100%', background: planColor, borderRadius: 2,
                              }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={s.td}><StatusBadge co={co} /></td>
                      <td style={s.td}>
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                          {co.created_at ? new Date(co.created_at).toLocaleDateString('ar-DZ') : '—'}
                        </div>
                      </td>
                      <td style={s.td} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelected(co)}
                          style={{
                            padding: '5px 12px', borderRadius: 7,
                            border: '1px solid var(--b2)', background: 'var(--bg1)',
                            cursor: 'pointer', fontSize: 11.5, color: 'var(--t2)',
                            fontFamily: "'Tajawal', sans-serif", fontWeight: 600,
                            transition: 'all .15s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#dc2626';
                            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#dc2626';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg1)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--t2)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--b2)';
                          }}
                        >
                          إدارة
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--b2)',
            display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center',
          }}>
            <button
              className="pg-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <i className="ti ti-chevron-right" />
            </button>

            {Array.from({ length: Math.min(7, meta.last_page) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  className={`pg-btn ${p === page ? 'on' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}

            {meta.last_page > 7 && <span style={{ color: 'var(--t4)', fontSize: 12 }}>...</span>}

            <button
              className="pg-btn"
              disabled={page === meta.last_page}
              onClick={() => setPage(p => p + 1)}
            >
              <i className="ti ti-chevron-left" />
            </button>

            <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 8 }}>
              {meta.from}–{meta.to} من {meta.total}
            </span>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <CompanyDrawer
          co={selected}
          onClose={() => setSelected(null)}
          muts={muts}
          onSuccess={() => { refetch(); }}
        />
      )}
    </div>
  );
}
