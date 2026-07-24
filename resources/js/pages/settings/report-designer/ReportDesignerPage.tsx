import { useNavigate } from 'react-router-dom';

export default function ReportDesignerPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: 'var(--bg3)', gap: 16, padding: 32,
    }}>
      <i className="ti ti-tools-off" style={{ fontSize: 48, color: 'var(--t4)' }} />
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--t3)' }}>
        مصمم القوالب المتقدم
      </span>
      <span style={{ fontSize: 14, color: 'var(--t4)', textAlign: 'center', maxWidth: 360 }}>
        تمت إزالة هذه الأداة التجريبية. يمكنك تعديل القوالب من صفحة إعدادات الطباعة.
      </span>
      <button
        onClick={() => navigate('/settings/print')}
        style={{
          padding: '8px 24px', borderRadius: 6, border: 'none',
          background: 'var(--blue)', color: '#fff', cursor: 'pointer',
          fontSize: 13, fontFamily: 'Tajawal, sans-serif', fontWeight: 600,
        }}
      >
        <i className="ti ti-settings" style={{ marginLeft: 6 }} />
        الذهاب إلى إعدادات الطباعة
      </button>
    </div>
  );
}
