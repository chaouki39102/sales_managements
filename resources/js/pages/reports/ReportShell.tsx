import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import AlertBar from '@/components/ui/AlertBar';

interface ReportShellProps {
  title: string;
  subtitle?: string;
  description?: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  reportId: string;
  children?: React.ReactNode;
}

export default function ReportShell({ title, subtitle, description, isLoading, isError, refetch, children }: ReportShellProps) {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title={title}
        description={description ?? subtitle}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" icon={<i className="ti ti-arrow-right"/>} onClick={() => navigate('/reports')}>العودة</Button>
            <Button size="sm" icon={<i className="ti ti-refresh"/>} onClick={refetch}>تحديث</Button>
          </div>
        }
      />
      {isLoading ? (
        <div className="empty" style={{ padding: 60 }}>
          <div className="empty-ic"><i className="ti ti-loader"/></div>
          <div className="empty-tx">جاري تحميل التقرير...</div>
        </div>
      ) : isError ? (
        <AlertBar variant="red">
          فشل تحميل التقرير.{' '}
          <button onClick={refetch} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>إعادة المحاولة</button>
        </AlertBar>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {React.Children.count(children) > 0 ? children : (
            <div className="empty" style={{ padding: 40 }}>
              <div className="empty-ic"><i className="ti ti-file-off"/></div>
              <div className="empty-tx">لا توجد بيانات متاحة لهذه الفترة</div>
              <div className="empty-sub">جرب تغيير السنة المالية أو معايير التقرير</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
