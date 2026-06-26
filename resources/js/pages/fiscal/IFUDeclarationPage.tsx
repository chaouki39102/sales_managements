import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import KpiCard from '@/components/ui/KpiCard';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import { useModal } from '@/hooks/useModal';
import { useIFUDeclaration, useIFUHistory, useTaxManagementMutations } from '@/lib/api/endpoints/taxManagement';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';

export default function IFUDeclarationPage() {
  const fiscalYear = useSelectedFiscalYear();
  const [formType, setFormType] = useState<'g12' | 'g12bis'>('g12');

  const { data: declaration, isLoading } = useIFUDeclaration(fiscalYear?.id ?? null);
  const { data: history } = useIFUHistory(fiscalYear?.id ?? null);
  const mutations = useTaxManagementMutations();
  const submitModal = useModal();
  const payModal = useModal();
  const [saving, setSaving] = useState(false);

  if (isLoading) return <Skeleton variant="card" rows={6} />;

  const latestPeriod = history?.find(h => h.form_type === formType);
  const currentStatus = latestPeriod?.status ?? 'draft';
  const statusVariant = currentStatus === 'paid' ? 'success' : currentStatus === 'submitted' ? 'info' : 'warning';

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await mutations.saveIFUPeriod.mutateAsync({
        fiscal_year_id: fiscalYear!.id,
        form_type: formType,
        status: 'submitted',
        ifu_subsidized: declaration?.ifu_subsidized ?? 0,
        ifu_other: declaration?.ifu_other ?? 0,
        ifu_total: declaration?.ifu_total ?? 0,
        ifu_minimum: declaration?.ifu_minimum ?? 0,
        amount_due: declaration?.amount_due ?? 0,
      } as any);
      submitModal.closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    setSaving(true);
    try {
      await mutations.saveIFUPeriod.mutateAsync({
        fiscal_year_id: fiscalYear!.id,
        form_type: formType,
        status: 'paid',
        ifu_subsidized: declaration?.ifu_subsidized ?? 0,
        ifu_other: declaration?.ifu_other ?? 0,
        ifu_total: declaration?.ifu_total ?? 0,
        ifu_minimum: declaration?.ifu_minimum ?? 0,
        amount_due: declaration?.amount_due ?? 0,
      } as any);
      payModal.closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    const rows = [
      ['IFU مواد مدعمة', declaration?.ifu_subsidized ?? 0],
      ['IFU مواد أخرى', declaration?.ifu_other ?? 0],
      ['الحد الأدنى IFU', declaration?.ifu_minimum ?? 0],
      ['المبلغ المستحق', declaration?.amount_due ?? 0],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IFU_${formType.toUpperCase()}_${fiscalYear?.label ?? 'N'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page on" id="p-ifu">
      <PageHeader
        title="تصريح IFU"
        subtitle={`الضريبة الجزافية الوحيدة — ${fiscalYear?.label ?? ''}`}
        actions={
          <>
            <Button size="sm" variant={formType === 'g12' ? 'primary' : 'default'} onClick={() => setFormType('g12')}>
              G12 — تقديري
            </Button>
            <Button size="sm" variant={formType === 'g12bis' ? 'primary' : 'default'} onClick={() => setFormType('g12bis')}>
              G12 مكرر — نهائي
            </Button>
          </>
        }
      />

      <div className="kpis" style={{ marginBottom: 20 }}>
        <KpiCard variant="green" icon="ti-package" label="IFU مواد مدعمة"
          value={declaration?.ifu_subsidized?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} unit="دج" />
        <KpiCard variant="blue" icon="ti-shopping-cart" label="IFU مواد أخرى"
          value={declaration?.ifu_other?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} unit="دج" />
        <KpiCard variant="orange" icon="ti-calculator" label="الحد الأدنى IFU"
          value={declaration?.ifu_minimum?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} unit="دج" />
        <KpiCard variant="red" icon="ti-currency-dinar" label="المستحق"
          value={declaration?.amount_due?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} unit="دج" />
      </div>

      <div className="g2" style={{ marginBottom: 20 }}>
        <Card title={`تفاصيل ${formType === 'g12' ? 'G12 التقديري' : 'G12 مكرر النهائي'}`}
          subtitle={`السنة: ${fiscalYear?.label ?? ''}`}>
          <div className="sr"><span className="sr-l">IFU على المواد المدعمة <span style={{ color: 'var(--t4)', fontSize: 11 }}>({declaration?.config_info?.subsidized?.doc_codes?.join('، ') ?? 'FA, BR'}، {declaration?.config_info?.subsidized?.base_type === 'margin' ? 'هامش' : declaration?.config_info?.subsidized?.base_type === 'revenue' ? 'إيرادات' : 'مشتريات'})</span></span>
            <span className="sr-v">{declaration?.ifu_subsidized?.toLocaleString('fr-DZ') ?? '0'} دج
              <span style={{ color: 'var(--t4)', fontSize: 11, marginRight: 6 }}>({((declaration?.config_info?.subsidized?.rate ?? 0.05) * 100).toFixed(1)}%)</span>
            </span></div>
          <div className="sr"><span className="sr-l">IFU على المواد الأخرى <span style={{ color: 'var(--t4)', fontSize: 11 }}>({declaration?.config_info?.other_goods?.doc_codes?.join('، ') ?? 'FA, BR'}، {declaration?.config_info?.other_goods?.base_type === 'margin' ? 'هامش' : declaration?.config_info?.other_goods?.base_type === 'revenue' ? 'إيرادات' : 'مشتريات'})</span></span>
            <span className="sr-v">{declaration?.ifu_other?.toLocaleString('fr-DZ') ?? '0'} دج
              <span style={{ color: 'var(--t4)', fontSize: 11, marginRight: 6 }}>({((declaration?.config_info?.other_goods?.rate ?? 0.05) * 100).toFixed(1)}%)</span>
            </span></div>
          <div className="sr"><span className="sr-l">IFU على الخدمات <span style={{ color: 'var(--t4)', fontSize: 11 }}>({declaration?.config_info?.services?.doc_codes?.join('، ') ?? 'FA'}، {declaration?.config_info?.services?.base_type === 'margin' ? 'هامش' : declaration?.config_info?.services?.base_type === 'revenue' ? 'إيرادات' : 'مشتريات'})</span></span>
            <span className="sr-v">{declaration?.summary?.ifu_services?.toLocaleString('fr-DZ') ?? '0'} دج
              <span style={{ color: 'var(--t4)', fontSize: 11, marginRight: 6 }}>({((declaration?.config_info?.services?.rate ?? 0.12) * 100).toFixed(1)}%)</span>
            </span></div>
          <div className="sr"><span className="sr-l">إجمالي IFU</span>
            <span className="sr-v" style={{ color: 'var(--orange)' }}>{declaration?.ifu_total?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
          <div className="sr"><span className="sr-l">الحد الأدنى القانوني</span>
            <span className="sr-v">{declaration?.ifu_minimum?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
          <div style={{ borderTop: '1px solid var(--b3)', paddingTop: 12, marginTop: 4 }}>
            <div className="sr">
              <span className="sr-l" style={{ fontWeight: 800, color: 'var(--t1)' }}>المبلغ المستحق للدفع</span>
              <span className="sr-v" style={{ fontSize: 18, fontWeight: 900, color: 'var(--red)' }}>
                {declaration?.amount_due?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} دج
              </span>
            </div>
          </div>
        </Card>

        <Card title="مواعيد الدفع">
          {declaration?.payment_schedule ? (
            <>
              <div className="sr">
                <span className="sr-l">القسط الأول ({declaration.payment_schedule.tranche1_pct}%)</span>
                <span className="sr-v">
                  {declaration.payment_schedule.tranche1_amount?.toLocaleString('fr-DZ')} دج
                  <span style={{ color: 'var(--t4)', fontSize: 11, marginRight: 6 }}>
                    قبل {declaration.payment_schedule.tranche1_deadline}
                  </span>
                </span>
              </div>
              <div className="sr">
                <span className="sr-l">القسط الثاني ({declaration.payment_schedule.tranche2_pct}%)</span>
                <span className="sr-v">
                  {declaration.payment_schedule.tranche2_amount?.toLocaleString('fr-DZ')} دج
                  <span style={{ color: 'var(--t4)', fontSize: 11, marginRight: 6 }}>
                    قبل {declaration.payment_schedule.tranche2_deadline}
                  </span>
                </span>
              </div>
              <div className="sr">
                <span className="sr-l">القسط الثالث ({declaration.payment_schedule.tranche3_pct}%)</span>
                <span className="sr-v">
                  {declaration.payment_schedule.tranche3_amount?.toLocaleString('fr-DZ')} دج
                  <span style={{ color: 'var(--t4)', fontSize: 11, marginRight: 6 }}>
                    قبل {declaration.payment_schedule.tranche3_deadline}
                  </span>
                </span>
              </div>
              <div className="sr">
                <span className="sr-l">G12 BIS (تصريح نهائي)</span>
                <span className="sr-v" style={{ color: 'var(--em)', fontWeight: 700 }}>
                  قبل {declaration.payment_schedule.g12bis_deadline}
                </span>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--t4)' }}>لا توجد بيانات</p>
          )}
          <div style={{ borderTop: '1px solid var(--b3)', paddingTop: 12, marginTop: 4 }}>
            <div className="sr">
              <span className="sr-l">الحالة</span>
              <span className="sr-v">
            <Badge variant={statusVariant}>
                  {currentStatus === 'paid' ? 'مدفوع' : currentStatus === 'submitted' ? 'مقدم' : 'مسودة'}
                </Badge>
              </span>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
        <Card title="سابق التصريحات" subtitle={`IFU للأعوام السابقة`}>
          <div className="tw">
            <table>
              <thead><tr><th>السنة</th><th>النموذج</th><th>المبلغ</th><th>الحالة</th><th>تاريخ التقديم</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.year ?? '—'}</td>
                    <td>{h.form_type?.toUpperCase()}</td>
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
        <p>سيتم تقديم إقرار {formType === 'g12' ? 'G12 التقديري' : 'G12 مكرر النهائي'} للسنة {fiscalYear?.label}.</p>
        <div className="sr"><span className="sr-l">المبلغ المستحق</span><span className="sr-v">{declaration?.amount_due?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
      </Modal>

      <Modal open={payModal.open} onClose={payModal.closeModal} size="sm"
        title="تأكيد تسجيل الدفع"
        footer={<><Button onClick={payModal.closeModal}>إلغاء</Button><Button variant="primary" loading={saving} onClick={handlePay}>تأكيد الدفع</Button></>}>
        <p>سيتم تسجيل دفع {formType === 'g12' ? 'G12 التقديري' : 'G12 مكرر النهائي'} للسنة {fiscalYear?.label}.</p>
        <div className="sr"><span className="sr-l">المبلغ</span><span className="sr-v">{declaration?.amount_due?.toLocaleString('fr-DZ') ?? '0'} دج</span></div>
      </Modal>
    </div>
  );
}
