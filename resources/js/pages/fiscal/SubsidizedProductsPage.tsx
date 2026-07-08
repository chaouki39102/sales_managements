import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import KpiCard from '@/components/ui/KpiCard';
import Modal from '@/components/ui/Modal';
import { Input, Select, FormField } from '@/components/ui/FormInputs';
import Skeleton from '@/components/ui/Skeleton';
import { useModal } from '@/hooks/useModal';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { ConfirmDialog } from '@/components/ui';
import { useSubsidizedSummary, useSubsidizedViolations, useTaxManagementMutations, type SubsidizedSalesSummary } from '@/lib/api/endpoints/taxManagement';
import { useSelectedFiscalYear } from '@/lib/api/endpoints/fiscalYears';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `شهر ${i + 1}` }));

export default function SubsidizedProductsPage() {
  const fiscalYear = useSelectedFiscalYear();
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [editing, setEditing] = useState<SubsidizedSalesSummary | null>(null);

  const editModal = useModal();
  const { data: summary, isLoading } = useSubsidizedSummary(fiscalYear?.id ?? null, month);
  const { data: violations } = useSubsidizedViolations(fiscalYear?.id ?? null);
  const mutations = useTaxManagementMutations();
  const deleteConfirm = useConfirm();
  const notify = useNotification();

  if (isLoading) return <Skeleton variant="card" rows={6} />;

  return (
    <div className="page on" id="p-subsidized-products">
      <PageHeader
        title="المواد المدعمة"
        subtitle={`حساب الهامش و IFU — ${fiscalYear?.label ?? ''}`}
        actions={
          <>
            <Select value={month ?? ''} onChange={e => setMonth(e.target.value ? Number(e.target.value) : undefined)} style={{ width: 130 }}>
              <option value="">كل الأشهر</option>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
            <Button size="sm" icon={<i className="ti ti-calculator" />}
              onClick={() => mutations.computeSubsidizedSales.mutate({ fiscalYearId: fiscalYear!.id, month })}>
              حساب
            </Button>
          </>
        }
      />

      {/* KPI */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <KpiCard variant="green" icon="ti-arrow-up" label="إجمالي الهامش"
          value={summary?.totals?.total_margin?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} unit="دج" />
        <KpiCard variant="red" icon="ti-calculator" label="IFU المستحق"
          value={summary?.totals?.total_ifu?.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) ?? '0'} unit="دج" />
        <KpiCard variant="orange" icon="ti-alert-triangle" label="مخالفات"
          value={summary?.totals?.total_violations?.toString() ?? '0'} sub="مواد تتجاوز السعر الأقصى" />
      </div>

      {/* Violations */}
      {violations && violations.length > 0 && (
        <Card title="مخالفات الأسعار" subtitle="مواد بيعت بأكثر من السعر الأقصى القانوني" style={{ marginBottom: 20 }}>
          <div className="tw">
            <table>
              <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر البيع</th><th>السعر الأقصى</th></tr></thead>
              <tbody>
                {violations.map((v) => (
                  <tr key={v.id}>
                    <td>{v.product_label}</td>
                    <td>{v.qty_sold}</td>
                    <td className="e">{v.weighted_avg_sell_price?.toLocaleString('fr-DZ')} دج</td>
                    <td className="e">{v.pmp?.toLocaleString('fr-DZ')} دج</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Details */}
      <Card title="تفاصيل المواد المدعمة" subtitle="الهامش و IFU لكل مادة">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>متوسط سعر البيع</th>
                <th>PMP</th>
                <th>الإيرادات</th>
                <th>تكلفة الشراء</th>
                <th>الهامش</th>
                <th>IFU</th>
                <th>حالة السعر</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {summary?.summaries?.map((s) => (
                <tr key={s.id} style={s.price_violation ? { background: 'rgba(255,0,0,0.05)' } : undefined}>
                  <td>{s.product_label}</td>
                  <td className="m">{s.qty_sold}</td>
                  <td className="m">{s.weighted_avg_sell_price?.toLocaleString('fr-DZ')} دج</td>
                  <td className="m">{s.pmp?.toLocaleString('fr-DZ')} دج</td>
                  <td className="m">{s.total_revenue?.toLocaleString('fr-DZ')} دج</td>
                  <td className="m">{s.total_purchase_cost?.toLocaleString('fr-DZ')} دج</td>
                  <td className={s.margin >= 0 ? 'e' : 'r'}>{s.margin?.toLocaleString('fr-DZ')} دج</td>
                  <td className="e">{s.ifu_due?.toLocaleString('fr-DZ')} دج</td>
                  <td>{s.price_violation ? <Badge variant="danger">مخالف</Badge> : <Badge variant="success">مطابق</Badge>}</td>
                  <td>
                    <div className="ac">
                      <button className="btn btn-icon btn-ghost" title="تعديل"
                        onClick={() => { setEditing(s); editModal.openModal(); }}>
                        <i className="ti ti-pencil" />
                      </button>
                      <button className="btn btn-icon btn-ghost c-r" title="حذف"
                        onClick={async () => { if (await deleteConfirm.confirm('تأكيد حذف هذه المادة؟')) mutations.deleteSubsidizedRow.mutate(s.id, { onSuccess: () => notify.success('تم الحذف') }); }}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={editModal.closeModal} title="تعديل المادة المدعمة">
        {editing && (
          <EditSubsidizedForm
            row={editing}
            onSave={(data) => {
              mutations.updateSubsidizedRow.mutate(
                { id: editing.id, data },
                { onSuccess: () => { editModal.closeModal(); setEditing(null); } },
              );
            }}
            onCancel={editModal.closeModal}
            saving={mutations.updateSubsidizedRow.isPending}
          />
        )}
      </Modal>
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}

function EditSubsidizedForm({
  row, onSave, onCancel, saving,
}: {
  row: SubsidizedSalesSummary;
  onSave: (data: Partial<SubsidizedSalesSummary>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [qtySold, setQtySold] = useState(row.qty_sold);
  const [purchasePriceAvg, setPurchasePriceAvg] = useState(row.pmp);
  const [actualSellPrice, setActualSellPrice] = useState(row.weighted_avg_sell_price);
  const [totalMargin, setTotalMargin] = useState(row.margin);
  const [ifuAmount, setIfuAmount] = useState(row.ifu_due);
  const [priceViolation, setPriceViolation] = useState(row.price_violation);

  const handleSave = () => {
    onSave({
      qty_sold: qtySold,
      purchase_price_avg: purchasePriceAvg,
      actual_sell_price: actualSellPrice,
      total_margin: totalMargin,
      ifu_amount: ifuAmount,
      price_violation: priceViolation,
    });
  };

  return (
    <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="المنتج" required>
          <Input value={row.product_label} disabled />
        </FormField>
        <FormField label="الكمية">
          <Input type="number" value={qtySold} onChange={e => setQtySold(Number(e.target.value))} />
        </FormField>
        <FormField label="متوسط سعر البيع">
          <Input type="number" value={actualSellPrice} onChange={e => setActualSellPrice(Number(e.target.value))} />
        </FormField>
        <FormField label="PMP">
          <Input type="number" value={purchasePriceAvg} onChange={e => setPurchasePriceAvg(Number(e.target.value))} />
        </FormField>
        <FormField label="الهامش الإجمالي">
          <Input type="number" value={totalMargin} onChange={e => setTotalMargin(Number(e.target.value))} />
        </FormField>
        <FormField label="IFU المستحق">
          <Input type="number" value={ifuAmount} onChange={e => setIfuAmount(Number(e.target.value))} />
        </FormField>
        <FormField label="مخالفة السعر">
          <label className="checkbox-label">
            <input type="checkbox" checked={priceViolation} onChange={e => setPriceViolation(e.target.checked)} />
            <span>سعر بيع يتجاوز السعر الأقصى</span>
          </label>
        </FormField>
      </div>
      <div className="form-actions" style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
      </div>
    </form>
  );
}
