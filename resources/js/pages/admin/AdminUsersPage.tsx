// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminUsersPage.tsx — النسخة الخارقة
// ✅ Drawer شامل + impersonate + reset password + toggle + companies
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin';
import { adminKeys } from '@/lib/api/core/queryKeys';
import { tokenStorage } from '@/lib/api/core/client';
import { useDebounce } from '@/hooks/useDebounce';
import type { AdminUser, AdminCompany } from '@/types/admin';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short', year: 'numeric' });

const AV_GRAD = [
  'linear-gradient(135deg,#0a8a5c,#0dbf84)',
  'linear-gradient(135deg,#1a4fd6,#60a5fa)',
  'linear-gradient(135deg,#6920d4,#a78bfa)',
  'linear-gradient(135deg,#b87d0a,#fbbf24)',
  'linear-gradient(135deg,#c43a0a,#fb923c)',
];
const avGrad = (id: number) => AV_GRAD[id % AV_GRAD.length];

// ─── UserDrawer ───────────────────────────────────────────────────────────────
type UTab = 'info' | 'companies' | 'password' | 'danger';

function UserDrawer({ user, onClose }: { user: AdminUser; onClose: (refresh?: boolean) => void }) {
  const qc   = useQueryClient();
  const [tab,   setTab]   = useState<UTab>('info');
  const [busy,  setBusy]  = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pwd,   setPwd]   = useState('');
  const [pwd2,  setPwd2]  = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: userCompanies, isLoading: coLoading } = useQuery({
    queryKey: adminKeys.users.detail(user.id),
    queryFn:  () => adminApi.getUserCompanies(user.id),
    enabled:  tab === 'companies',
    staleTime: 60_000,
  });

  const run = async (key: string, fn: () => Promise<unknown>, msg: string, refresh = true) => {
    setBusy(key); setFlash(null);
    try {
      await fn();
      setFlash({ ok: true, msg });
      if (refresh) {
        qc.invalidateQueries({ queryKey: adminKeys.users.list() });
        setTimeout(() => onClose(true), 1200);
      }
    } catch (e: any) {
      setFlash({ ok: false, msg: e?.message ?? 'حدث خطأ' });
    } finally { setBusy(null); }
  };

  const handleImpersonate = async () => {
    setBusy('imp'); setFlash(null);
    try {
      const res: any = await adminApi.impersonate(user.id);
      const token = res?.token ?? res?.data?.token;
      if (token) {
        tokenStorage.set(token);
        window.location.href = '/dashboard';
      }
    } catch (e: any) {
      setFlash({ ok: false, msg: e?.message ?? 'فشل الانتحال' });
      setBusy(null);
    }
  };

  const handleResetPwd = async () => {
    if (pwd !== pwd2) { setFlash({ ok: false, msg: 'كلمتا المرور غير متطابقتين' }); return; }
    if (pwd.length < 8) { setFlash({ ok: false, msg: 'يجب أن تكون 8 أحرف على الأقل' }); return; }
    await run('pwd', () => adminApi.resetPassword(user.id, pwd), 'تم تغيير كلمة المرور بنجاح', false);
    setPwd(''); setPwd2('');
  };

  const TABS: { key: UTab; label: string; icon: string }[] = [
    { key: 'info',      label: 'المعلومات', icon: 'ti-info-circle'  },
    { key: 'companies', label: 'الشركات',   icon: 'ti-building'     },
    { key: 'password',  label: 'كلمة المرور', icon: 'ti-key'       },
    { key: 'danger',    label: 'إجراءات',   icon: 'ti-bolt'         },
  ];

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '8px 11px',
    borderRadius: 8, border: '1.5px solid var(--b2)',
    background: 'var(--bg1)', color: 'var(--t1)',
    fontSize: 13, fontFamily: 'Tajawal,sans-serif', outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999, display: 'flex',
      justifyContent: 'flex-end', background: 'rgba(0,0,0,.5)', direction: 'rtl',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: 480, background: 'var(--bg2)', display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 32px rgba(0,0,0,.2)', maxHeight: '100vh',
        animation: 'slideInRight .2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--b2)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0, background: 'var(--bg3)',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: avGrad(user.id), display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 800,
          }}>{user.name?.[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>{user.email}</div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: user.active ? 'var(--greenb)' : 'var(--redb)',
            color: user.active ? 'var(--green)' : 'var(--red)',
          }}>{user.active ? 'نشط' : 'معطل'}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: user.is_approved ? 'var(--greenb)' : 'var(--goldb)',
            color: user.is_approved ? 'var(--green)' : 'var(--gold)',
          }}>{user.is_approved ? 'مفعّل' : 'بانتظار التفعيل'}</span>
          <button onClick={() => onClose()} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--t4)', lineHeight: 1, padding: 4,
          }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Flash */}
        {flash && (
          <div style={{
            padding: '9px 20px', fontSize: 12, fontWeight: 700, flexShrink: 0,
            background: flash.ok ? 'var(--greenb)' : 'var(--redb)',
            color: flash.ok ? 'var(--green)' : 'var(--red)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className={`ti ${flash.ok ? 'ti-check' : 'ti-alert-circle'}`} />{flash.msg}
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--b2)',
          padding: '0 14px', flexShrink: 0, background: 'var(--bg3)',
        }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 12px', border: 'none', background: 'none',
              borderBottom: tab === t.key ? '2px solid var(--red)' : '2px solid transparent',
              color: tab === t.key ? 'var(--red)' : 'var(--t3)',
              fontWeight: tab === t.key ? 700 : 500, fontSize: 11.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              whiteSpace: 'nowrap', fontFamily: "'Tajawal',sans-serif",
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

          {/* INFO */}
          {tab === 'info' && (
            <div>
              {[
                ['الاسم',        user.name],
                ['البريد',       user.email],
                ['الدور',        user.role ?? '—'],
                ['الهاتف',       user.phone ?? '—'],
                ['الشركات',      String(user.companies_count ?? 0)],
                ['الحالة',       user.active ? 'نشط' : 'معطل'],
                ['التفعيل',     user.is_approved ? 'مفعّل' : 'بانتظار التفعيل'],
                ['آخر دخول',    user.last_login_at ? fmtDate(user.last_login_at) : '—'],
                ['تاريخ الإنشاء', fmtDate(user.created_at)],
              ].map(([k, v]) => (
                <div key={String(k)} style={{
                  display: 'flex', gap: 12, padding: '9px 0',
                  borderBottom: '1px solid var(--b1)',
                }}>
                  <span style={{ width: 120, fontSize: 12, color: 'var(--t4)', flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* COMPANIES */}
          {tab === 'companies' && (
            <div>
              {coLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t4)' }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin .8s linear infinite' }} />
                </div>
              ) : (
                <div>
                  {((userCompanies as any) ?? []).length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: 'var(--t4)' }}>
                      هذا المستخدم لا ينتمي لأي شركة
                    </div>
                  ) : ((userCompanies as any) ?? []).map((co: AdminCompany) => (
                    <div key={co.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 0', borderBottom: '1px solid var(--b1)',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: avGrad(co.id), display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 800,
                      }}>
                        {co.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{co.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t4)' }}>/{co.slug}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: co.active ? 'var(--greenb)' : 'var(--redb)',
                        color: co.active ? 'var(--green)' : 'var(--red)',
                      }}>{co.active ? 'نشطة' : 'معطلة'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASSWORD */}
          {tab === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                padding: '10px 14px', borderRadius: 9,
                  background: 'var(--goldb)', border: '1px solid #f59e0b30',
                  fontSize: 12, color: 'var(--gold)', fontWeight: 600,
              }}>
                <i className="ti ti-alert-triangle" style={{ marginLeft: 6 }} />
                ستنتهي جميع جلسات المستخدم الحالية فور تغيير كلمة المرور
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>
                  كلمة المرور الجديدة
                </label>
                <input type="password" style={inp} value={pwd}
                  onChange={e => setPwd(e.target.value)} placeholder="8 أحرف على الأقل" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', display: 'block', marginBottom: 5 }}>
                  تأكيد كلمة المرور
                </label>
                <input type="password" style={inp} value={pwd2}
                  onChange={e => setPwd2(e.target.value)} placeholder="أعد الكتابة" />
              </div>
              <button
                disabled={!pwd || busy === 'pwd'}
                onClick={handleResetPwd}
                style={{
                  padding: '11px 18px', borderRadius: 9, border: 'none',
                  background: pwd ? 'var(--gold)' : '#6b7280', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: pwd ? 'pointer' : 'not-allowed',
                  fontFamily: 'Tajawal,sans-serif', display: 'flex',
                  alignItems: 'center', gap: 6, justifyContent: 'center',
                }}>
                {busy === 'pwd'
                  ? <><i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} /> جارٍ التغيير...</>
                  : <><i className="ti ti-key" /> تغيير كلمة المرور</>}
              </button>
            </div>
          )}

          {/* DANGER */}
          {tab === 'danger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Impersonate */}
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                border: '1px solid #6366f125', background: '#6366f108',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginBottom: 6 }}>
                  <i className="ti ti-user-swap" style={{ marginLeft: 6 }} />
                  دخول بهوية هذا المستخدم
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 10, lineHeight: 1.5 }}>
                  ستنتقل لوحة التحكم وتعمل باسم هذا المستخدم. يمكنك الخروج لاحقاً.
                </div>
                <button
                  disabled={busy === 'imp'}
                  onClick={handleImpersonate}
                  style={{
                    padding: '9px 16px', borderRadius: 8, border: 'none',
                    background: '#6366f1', color: '#fff', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Tajawal,sans-serif', width: '100%',
                    display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                  }}>
                  {busy === 'imp'
                    ? <><i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} /> جارٍ الدخول...</>
                    : <><i className="ti ti-user-swap" /> دخول كـ {user.name}</>}
                </button>
              </div>

              {/* Toggle Active */}
              <button
                disabled={busy === 'toggle'}
                onClick={() => run('toggle', () => adminApi.toggleActive(user.id),
                  user.active ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم'
                )}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${user.active ? 'var(--redb)' : 'var(--greenb)'}`,
                  background: user.active ? 'var(--redb)' : 'var(--greenb)',
                  cursor: 'pointer', textAlign: 'right', width: '100%',
                  fontFamily: 'Tajawal,sans-serif',
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: user.active ? 'var(--redb)' : 'var(--greenb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: user.active ? 'var(--red)' : 'var(--green)', fontSize: 17,
                }}>
                  {busy === 'toggle'
                    ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
                    : <i className={`ti ${user.active ? 'ti-user-off' : 'ti-user-check'}`} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: user.active ? 'var(--red)' : 'var(--green)' }}>
                    {user.active ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                    {user.active ? 'لن يتمكن من تسجيل الدخول' : 'استعادة وصول المستخدم'}
                  </div>
                </div>
              </button>

              {/* Toggle Approval */}
              <button
                disabled={busy === 'approval'}
                onClick={() => run('approval', () => adminApi.toggleApproval(user.id),
                  user.is_approved ? 'تم إلغاء تفعيل الحساب' : 'تم تفعيل الحساب'
                )}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${user.is_approved ? 'var(--goldb)' : 'var(--greenb)'}`,
                  background: user.is_approved ? 'var(--goldb)' : 'var(--greenb)',
                  cursor: 'pointer', textAlign: 'right', width: '100%',
                  fontFamily: 'Tajawal,sans-serif',
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: user.is_approved ? 'var(--goldb)' : 'var(--greenb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: user.is_approved ? 'var(--gold)' : 'var(--green)', fontSize: 17,
                }}>
                  {busy === 'approval'
                    ? <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
                    : <i className={`ti ${user.is_approved ? 'ti-user-off' : 'ti-user-check'}`} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: user.is_approved ? 'var(--gold)' : 'var(--green)' }}>
                    {user.is_approved ? 'إلغاء تفعيل الحساب' : 'تفعيل الحساب'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                    {user.is_approved ? 'سيتم منع المستخدم من تسجيل الدخول' : 'السماح للمستخدم بتسجيل الدخول'}
                  </div>
                </div>
              </button>

              {/* Delete */}
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  style={{
                    padding: '12px 14px', borderRadius: 10,
                    border: '1px solid var(--redb)', background: 'var(--redb)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    color: 'var(--red)', fontFamily: 'Tajawal,sans-serif',
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                  }}>
                  <i className="ti ti-trash" /> حذف المستخدم نهائياً
                </button>
              ) : (
                <div style={{
                  padding: '14px 16px', borderRadius: 10,
                  border: '1px solid var(--redb)', background: 'var(--redb)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>
                    هل أنت متأكد من حذف &ldquo;{user.name}&rdquo;؟
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 12 }}>
                    هذا الإجراء لا يمكن التراجع عنه. سيتم حذف المستخدم وكل بياناته.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowConfirm(false)} style={{
                      flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--b2)',
                      background: 'var(--bg3)', color: 'var(--t3)', fontSize: 12,
                      cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
                    }}>إلغاء</button>
                    <button
                      disabled={busy === 'delete'}
                      onClick={() => run('delete', () => adminApi.deleteUser(user.id), 'تم حذف المستخدم')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                        background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
                      }}>
                      {busy === 'delete' ? 'جاري الحذف...' : 'حذف نهائياً'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [search, setSearch]   = useState('');
  const [role,   setRole]     = useState('');
  const [active, setActive]   = useState('');
  const [page,   setPage]     = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const dSearch = useDebounce(search, 400);

  const params = useMemo(() => ({
    search: dSearch || undefined,
    role:   role    || undefined,
    active: active  || undefined,
    page, per_page: 20,
  }), [dSearch, role, active, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: adminKeys.users.list(params as any),
    queryFn:  () => adminApi.getUsers(params as any),
    staleTime: 60_000,
    placeholderData: (prev: any) => prev,
  });

  const users: AdminUser[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--t1)' }}>إدارة المستخدمين</div>
          <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 2 }}>
            {meta ? `${meta.total} مستخدم` : '—'}
          </div>
        </div>
        <button className="btn" onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-refresh" /> تحديث
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--t4)', fontSize: 14, pointerEvents: 'none',
          }} />
          <input type="text" placeholder="ابحث بالاسم أو البريد..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%', padding: '8px 34px 8px 11px', borderRadius: 9, boxSizing: 'border-box',
              border: '1.5px solid var(--b2)', background: 'var(--bg1)', color: 'var(--t1)',
              fontSize: 13, fontFamily: 'Tajawal,sans-serif', outline: 'none',
            }} />
        </div>
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} style={{
          padding: '8px 12px', borderRadius: 9, border: '1.5px solid var(--b2)',
          background: 'var(--bg1)', color: 'var(--t1)', fontSize: 13,
          fontFamily: 'Tajawal,sans-serif', cursor: 'pointer', outline: 'none',
        }}>
          <option value="">كل الأدوار</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="user">مستخدم</option>
        </select>
        <select value={active} onChange={e => { setActive(e.target.value); setPage(1); }} style={{
          padding: '8px 12px', borderRadius: 9, border: '1.5px solid var(--b2)',
          background: 'var(--bg1)', color: 'var(--t1)', fontSize: 13,
          fontFamily: 'Tajawal,sans-serif', cursor: 'pointer', outline: 'none',
        }}>
          <option value="">كل الحالات</option>
          <option value="1">نشط</option>
          <option value="0">معطل</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 14, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--t4)' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin .8s linear infinite', display: 'block', marginBottom: 8 }} />
            جارٍ التحميل...
          </div>
        ) : isError ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>تعذّر التحميل</div>
            <button className="btn btn-p" onClick={() => refetch()}>إعادة المحاولة</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--b1)' }}>
                  {['المستخدم', 'الدور', 'الشركات', 'الحالة', 'التفعيل', 'تاريخ الإنشاء', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', fontSize: 11.5, fontWeight: 700,
                      color: 'var(--t4)', textAlign: 'right', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
                      <i className="ti ti-users" style={{ fontSize: 30, display: 'block', marginBottom: 8, opacity: .5 }} />
                      لا يوجد مستخدمون
                    </td>
                  </tr>
                ) : users.map(u => (
                  <tr key={u.id}
                    style={{ borderBottom: '1px solid var(--b1)', transition: 'background .1s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    onClick={() => setSelected(u)}
                  >
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: avGrad(u.id), display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 800,
                        }}>{u.name?.[0]?.toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--t4)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                        background: u.role === 'super_admin' ? 'var(--redb)' : 'var(--purb)',
                        color: u.role === 'super_admin' ? 'var(--red)' : 'var(--purple)',
                      }}>{u.role ?? 'user'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--t2)' }}>
                      {u.companies_count ?? 0}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                        background: u.active ? 'var(--greenb)' : 'var(--b2)',
                        color: u.active ? 'var(--green)' : 'var(--t3)',
                      }}>{u.active ? 'نشط' : 'معطل'}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                        background: u.is_approved ? 'var(--greenb)' : 'var(--goldb)',
                        color: u.is_approved ? 'var(--green)' : 'var(--gold)',
                      }}>{u.is_approved ? 'مفعّل' : 'بانتظار'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                      {fmtDate(u.created_at)}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(u); }}
                        style={{
                          padding: '5px 12px', borderRadius: 7, border: '1px solid var(--b2)',
                          background: 'var(--bg3)', color: 'var(--t3)', fontSize: 11.5,
                          cursor: 'pointer', fontFamily: 'Tajawal,sans-serif', fontWeight: 600,
                        }}>
                        إدارة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--b1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'var(--t4)' }}>
              الصفحة {meta.current_page} من {meta.last_page}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: '←', disabled: page === 1, onClick: () => setPage(p => p - 1) },
                { label: '→', disabled: page === meta.last_page, onClick: () => setPage(p => p + 1) },
              ].map((btn, i) => (
                <button key={i} disabled={btn.disabled} onClick={btn.onClick}
                  className="btn btn-xs">{btn.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <UserDrawer
          user={selected}
          onClose={(refresh) => { setSelected(null); if (refresh) refetch(); }}
        />
      )}


    </div>
  );
}
