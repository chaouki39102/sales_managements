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
