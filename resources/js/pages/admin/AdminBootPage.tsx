// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminBootPage.tsx
//
// صفحة خاصة بالسوبر أدمن — يصل إليها بعد أول دخول
// تعرض AdminBootModal مباشرة وعند اكتماله تنقله لـ /admin/dashboard
//
// Route: /admin/boot  (في RequireSuperAdmin guard)
// ════════════════════════════════════════════════════════════════════════════
import { useNavigate } from 'react-router-dom';
import AdminBootModal from '@/components/modals/AdminBootModal';

export default function AdminBootPage() {
  const navigate = useNavigate();

  return (
    // خلفية بسيطة تحت المودال
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <AdminBootModal
        onComplete={() => navigate('/admin/dashboard', { replace: true })}
      />
    </div>
  );
}
