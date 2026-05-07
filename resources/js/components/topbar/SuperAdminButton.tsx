// ════════════════════════════════════════════════
// components/topbar/SuperAdminButton.tsx
// زر الوصول السريع للوحة تحكم السوبر أدمن
// أضفه في Topbar.tsx بجانب أزرار الأيقونات
// ════════════════════════════════════════════════
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function SuperAdminButton() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin =
    (user as any)?.roles?.some((r: any) => r.name === 'super-admin') ||
    (user as any)?.role === 'super_admin';

  if (!isSuperAdmin) return null;

  return (
    <button
      onClick={() => navigate('/admin')}
      title="لوحة تحكم النظام"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 8,
        border: '1px solid #ef444433', background: '#ef44440d',
        color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      }}
    >
      <i className="ti ti-shield-lock" style={{ fontSize: 15 }} />
      <span>Admin</span>
    </button>
  );
}
