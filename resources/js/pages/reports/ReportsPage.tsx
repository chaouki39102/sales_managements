import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import AlertBar from '@/components/ui/AlertBar';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { REPORT_CARDS, QuickReportCard } from './helpers';

export default function ReportsPage() {
  const { selectedYear } = useFiscalYear();
  const navigate = useNavigate();

  return (
    <div className="page on" id="p-reports">
      <PageHeader
        title="التقارير والإحصائيات"
        subtitle={`جميع التقارير المالية والإدارية — السنة: ${selectedYear?.name || '—'}`}
      />
      <div className="kpis" style={{ marginBottom: 24 }}>
        <KpiCard variant="green"  icon="ti-file-text" label="إجمالي التقارير" value={REPORT_CARDS.length}/>
        <KpiCard variant="blue"   icon="ti-clock"     label="آخر تحديث"       value="قبل لحظات"/>
        <KpiCard variant="purple" icon="ti-star"      label="التقرير الشامل"  value="جديد"/>
      </div>
      {selectedYear?.is_closed && (
        <AlertBar variant="gold">السنة المالية {selectedYear.name} مقفلة — التقارير للعرض فقط.</AlertBar>
      )}
      <div className="g2" style={{ marginBottom: 20 }}>
        {REPORT_CARDS.map(report => (
          <QuickReportCard key={report.id} report={report} onSelect={() => navigate(report.href)}/>
        ))}
      </div>
      <Card title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-info-circle"/></span> معلومات عن التقارير</>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--t3)' }}>
          {[
            'جميع التقارير تدعم التصدير بصيغ Excel و PDF',
            'التقرير الشامل يجمع البيانات من المبيعات والمشتريات والهومش في مكان واحد',
            'يمكن تصفية التقارير حسب السنة المالية المختارة من الشريط العلوي',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <i className="ti ti-check" style={{ color: 'var(--em)', flexShrink: 0, marginTop: 3 }}/>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
