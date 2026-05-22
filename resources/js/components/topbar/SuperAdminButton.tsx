// components/topbar/SuperAdminButton.tsx
// ✅ يستخدم نفس isSuperAdmin المُعرَّف في DashboardLayout (السطر 532)
//    user?.roles?.some((r: any) => r.name === 'super-admin')

import { useNavigate } from 'react-router-dom';
import { useAuth }     from '@/context/AuthContext';

export default function SuperAdminButton() {
  const { user }  = useAuth() as any;
  const navigate  = useNavigate();

  // نفس منطق DashboardLayout بالضبط
  const isSuperAdmin: boolean =
    user?.roles?.some((r: { name: string }) => r.name === 'super-admin') ?? false;

  if (!isSuperAdmin) return null;

  return (
    <button
      onClick={() => navigate('/admin')}
      title="لوحة تحكم النظام"
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:          6,
        padding:     '5px 10px',
        borderRadius: 8,
        border:      '1px solid var(--redbo)',
        background:  'var(--redb)',
        color:       'var(--red)',
        cursor:      'pointer',
        fontSize:     12,
        fontWeight:   600,
        fontFamily:  'Tajawal, sans-serif',
        transition:  'all .15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)';
        (e.currentTarget as HTMLButtonElement).style.color      = '#fff';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--redb)';
        (e.currentTarget as HTMLButtonElement).style.color      = 'var(--red)';
      }}
    >
      <i className="ti ti-shield-lock" style={{ fontSize: 15 }} />
      <span>Admin</span>
    </button>
  );
}
