import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function ReportDesignerPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: '#f0f2f5', gap: 16, padding: 32,
    }}>
      <i className="ti ti-tools-off" style={{ fontSize: 48, color: '#bbb' }} />
      <span style={{ fontSize: 18, fontWeight: 700, color: '#555' }}>
        مصمم القوالب المتقدم
      </span>
      <span style={{ fontSize: 14, color: '#888', textAlign: 'center', maxWidth: 360 }}>
        تمت إزالة هذه الأداة التجريبية. يمكنك تعديل القوالب من صفحة إعدادات الطباعة.
      </span>
      <button
        onClick={() => navigate('/settings/print')}
        style={{
          padding: '8px 24px', borderRadius: 6, border: 'none',
          background: '#1890ff', color: '#fff', cursor: 'pointer',
          fontSize: 13, fontFamily: 'Tajawal, sans-serif', fontWeight: 600,
        }}
      >
        <i className="ti ti-settings" style={{ marginLeft: 6 }} />
        الذهاب إلى إعدادات الطباعة
      </button>
    </div>
  );
}
