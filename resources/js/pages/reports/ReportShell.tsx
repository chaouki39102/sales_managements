import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import AlertBar from '@/components/ui/AlertBar';
import { useActiveSlug } from '@/lib/store/appStore';

interface ReportShellProps {
  title: string;
  subtitle?: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  reportId: string;
  children?: React.ReactNode;
}

export default function ReportShell({ title, subtitle, isLoading, isError, refetch, reportId, children }: ReportShellProps) {
  const navigate = useNavigate();
  const slug = useActiveSlug();
  const exportUrl = (format: 'excel' | 'pdf') => `/api/v1/${slug}/reports/${reportId}?export=${format}`;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" icon={<i className="ti ti-arrow-right"/>} onClick={() => navigate('/reports')}>العودة</Button>
            <Button size="sm" icon={<i className="ti ti-download"/>} onClick={() => window.open(exportUrl('excel'), '_blank')}>تصدير Excel</Button>
            <Button size="sm" icon={<i className="ti ti-printer"/>} onClick={() => window.open(exportUrl('pdf'), '_blank')}>PDF</Button>
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
          {children ?? (
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
