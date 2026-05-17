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
