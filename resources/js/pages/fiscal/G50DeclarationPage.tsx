import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import KpiCard from '@/components/ui/KpiCard';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import { useModal } from '@/hooks/useModal';
import { useG50Declaration, useG50History, useTaxManagementMutations } from '@/lib/api/endpoints/taxManagement';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';

const MONTHS = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export default function G50DeclarationPage() {
  const fiscalYear = useSelectedFiscalYear();
  const currentMonth = new Date().getMonth();
  const [month, setMonth] = useState(currentMonth + 1);

  const { data: declaration, isLoading } = useG50Declaration(fiscalYear?.id ?? null, month);
  const { data: history } = useG50History(fiscalYear?.id ?? null);
  const mutations = useTaxManagementMutations();
  const submitModal = useModal();
  const payModal = useModal();
  const [saving, setSaving] = useState(false);

  if (isLoading) return <Skeleton variant="card" rows={6} />;

  const latestPeriod = history?.find(h => h.month === month);
  const currentStatus = latestPeriod?.status ?? 'draft';
  const _statusVariant = currentStatus === 'paid' ? 'success' : currentStatus === 'submitted' ? 'info' : 'warning';

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await mutations.saveG50Period.mutateAsync({
        fiscal_year_id: fiscalYear!.id,
        month,
        status: 'submitted',
        form_type: 'g50',
        tva_collectee: declaration?.tva_collectee ?? 0,
        tva_deductible: declaration?.tva_deductible ?? 0,
        tva_carry_fwd: declaration?.tva_carry_fwd ?? 0,
        tva_net: declaration?.tva_net ?? 0,
        tva_due: declaration?.tva_due ?? 0,
        amount_due: declaration?.amount_due ?? 0,
        timbre_fiscal: declaration?.timbre_fiscal ?? 0,
      } as any);
      submitModal.closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    setSaving(true);
    try {
      await mutations.saveG50Period.mutateAsync({
        fiscal_year_id: fiscalYear!.id,
        month,
        status: 'paid',
        form_type: 'g50',
        tva_collectee: declaration?.tva_collectee ?? 0,
        tva_deductible: declaration?.tva_deductible ?? 0,
        tva_carry_fwd: declaration?.tva_carry_fwd ?? 0,
        tva_net: declaration?.tva_net ?? 0,
        tva_due: declaration?.tva_due ?? 0,
        amount_due: declaration?.amount_due ?? 0,
        timbre_fiscal: declaration?.timbre_fiscal ?? 0,
      } as any);
      payModal.closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    const rows = [
      ['TVA محصلة', declaration?.tva_collectee ?? 0],
      ['TVA قابلة للخصم', declaration?.tva_deductible ?? 0],
      ['المرحّل', declaration?.tva_carry_fwd ?? 0],
      ['الطابع الجبائي', declaration?.timbre_fiscal ?? 0],
      ['المبلغ المستحق', declaration?.amount_due ?? 0],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `G50_${month}_${fiscalYear?.label ?? 'N'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page on" id="p-g50">
      <PageHeader
        title="تصريح G50"
        subtitle={`TVA الشهري — ${fiscalYear?.label ?? ''}`}
        actions={
          <>
            <select className="fi" value={month} onChange={(e) => setMonth(Number(e.target.value))}
              style={{ maxWidth: 160, marginLeft: 8 }}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </>
        }
      />

      <div className="kpis" style={{ marginBottom: 20 }}>
        <KpiCard variant="green" icon="ti-arrow-up-circle" label="TVA محصلة"
          value={declaration?.tva_collectee?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} unit="دج" />
        <KpiCard variant="blue" icon="ti-arrow-down-circle" label="TVA قابلة للخصم"
          value={declaration?.tva_deductible?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} unit="دج" />
        <KpiCard variant="red" icon="ti-calculator" label="صافي المستحق"
          value={declaration?.tva_net?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} unit="دج" />
        <KpiCard variant="purple" icon="ti-file-check" label="الحالة"
          value={currentStatus === 'paid' ? 'مدفوع' : currentStatus === 'submitted' ? 'مقدم' : 'مسودة'}
          sub={currentStatus === 'paid' ? 'مدفوع' : currentStatus === 'submitted' ? 'مقدم' : '—'} />
      </div>

      <div className="g2" style={{ marginBottom: 20 }}>
        <Card title="تفاصيل الإقرار" subtitle={`${MONTHS[month - 1]} ${fiscalYear?.label ?? ''}`}>
          <div className="sr"><span className="sr-l">رقم الإقرار</span><span className="sr-v">G50-{month}-{fiscalYear?.label}</span></div>
          <div className="sr"><span className="sr-l">TVA محصلة</span><span className="sr-v" style={{ color: 'var(--em)' }}>{declaration?.tva_collectee?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
          <div className="sr"><span className="sr-l">TVA قابلة للخصم</span><span className="sr-v" style={{ color: 'var(--blue)' }}>{declaration?.tva_deductible?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
          <div className="sr"><span className="sr-l">المرحّل</span><span className="sr-v">{declaration?.tva_carry_fwd?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
           <div className="sr"><span className="sr-l">الطابع الجبائي</span><span className="sr-v">{declaration?.timbre_total?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
          <div style={{ borderTop: '1px solid var(--b3)', paddingTop: 12, marginTop: 4 }}>
            <div className="sr">
              <span className="sr-l" style={{ fontWeight: 800, color: 'var(--t1)' }}>المبلغ المستحق</span>
              <span className="sr-v" style={{ fontSize: 18, fontWeight: 900, color: 'var(--red)' }}>
                {declaration?.total_due?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} دج
              </span>
            </div>
          </div>
        </Card>

        <Card title="الإجراءات">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button variant="primary" size="sm" icon={<i className="ti ti-send" />}
              disabled={currentStatus === 'submitted' || currentStatus === 'paid'}
              onClick={submitModal.openModal}>
              تقديم الإقرار
            </Button>
            <Button variant="primary" size="sm" icon={<i className="ti ti-currency-dinar" />}
              disabled={currentStatus === 'paid'}
              onClick={payModal.openModal}>
              تسجيل الدفع
            </Button>
            <Button size="sm" icon={<i className="ti ti-printer" />} onClick={handlePrint}>طباعة</Button>
            <Button size="sm" icon={<i className="ti ti-file-export" />} onClick={handleExport}>تصدير Excel</Button>
          </div>
        </Card>
      </div>

      {history && history.length > 0 && (
        <Card title="سابق التصريحات" subtitle="G50 للأشهر السابقة">
          <div className="tw">
            <table>
              <thead><tr><th>الشهر</th><th>المبلغ</th><th>الحالة</th><th>تاريخ التقديم</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{MONTHS[(h.month ?? 1) - 1]}</td>
                    <td className="m">{h.amount_due?.toLocaleString('fr-DZ')} دج</td>
                    <td><Badge variant={h.status === 'paid' ? 'success' : h.status === 'submitted' ? 'info' : 'warning'}>
                      {h.status === 'paid' ? 'مدفوع' : h.status === 'submitted' ? 'مقدم' : 'مسودة'}
                    </Badge></td>
                    <td>{h.submitted_at ? new Date(h.submitted_at).toLocaleDateString('ar-DZ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={submitModal.open} onClose={submitModal.closeModal} size="sm"
        title="تأكيد تقديم الإقرار"
        footer={<><Button onClick={submitModal.closeModal}>إلغاء</Button><Button variant="primary" loading={saving} onClick={handleSubmit}>تأكيد التقديم</Button></>}>
        <p>سيتم تقديم إقرار G50 لشهر {MONTHS[month - 1]} {fiscalYear?.label}.</p>
        <div className="sr"><span className="sr-l">المبلغ المستحق</span><span className="sr-v">{declaration?.amount_due?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
      </Modal>

      <Modal open={payModal.open} onClose={payModal.closeModal} size="sm"
        title="تأكيد تسجيل الدفع"
        footer={<><Button onClick={payModal.closeModal}>إلغاء</Button><Button variant="primary" loading={saving} onClick={handlePay}>تأكيد الدفع</Button></>}>
        <p>سيتم تسجيل دفع إقرار G50 لشهر {MONTHS[month - 1]} {fiscalYear?.label}.</p>
        <div className="sr"><span className="sr-l">المبلغ</span><span className="sr-v">{declaration?.amount_due?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
      </Modal>
    </div>
  );
}
