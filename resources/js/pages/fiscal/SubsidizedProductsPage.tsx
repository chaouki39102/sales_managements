import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleTable from '@/components/ui/SimpleTable';
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
          value={(summary?.totals as any)?.total_violations?.toString() ?? (summary?.totals?.violations_count?.toString() ?? '0')} sub="مواد تتجاوز السعر الأقصى" />
      </div>

      {/* Violations */}
      {violations && violations.length > 0 && (
        <Card title="مخالفات الأسعار" subtitle="مواد بيعت بأكثر من السعر الأقصى القانوني" style={{ marginBottom: 20 }}>
          <SimpleTable
            columns={[
              { key: 'product_label', label: 'المنتج' },
              { key: 'qty_sold', label: 'الكمية', className: 'm' },
              { key: 'weighted_avg_sell_price', label: 'سعر البيع', render: (v) => <span className="e">{(v as number)?.toLocaleString('fr-DZ')} دج</span> },
              { key: 'pmp', label: 'السعر الأقصى', render: (v) => <span className="e">{(v as number)?.toLocaleString('fr-DZ')} دج</span> },
            ]}
            data={violations}
            rowKey="id"
            emptyText="لا توجد مخالفات"
          />
        </Card>
      )}

      {/* Details */}
      <Card title="تفاصيل المواد المدعمة" subtitle="الهامش و IFU لكل مادة">
        <style>{`.tw-row-violation{background:rgba(255,0,0,.05)}`}</style>
        <SimpleTable
          columns={[
            { key: 'product_label', label: 'المنتج' },
            { key: 'qty_sold', label: 'الكمية', className: 'm' },
            { key: 'weighted_avg_sell_price', label: 'متوسط سعر البيع', className: 'm', render: (v) => `${(v as number)?.toLocaleString('fr-DZ')} دج` },
            { key: 'pmp', label: 'PMP', className: 'm', render: (v) => `${(v as number)?.toLocaleString('fr-DZ')} دج` },
            { key: 'total_revenue', label: 'الإيرادات', className: 'm', render: (v) => `${(v as number)?.toLocaleString('fr-DZ')} دج` },
            { key: 'total_purchase_cost', label: 'تكلفة الشراء', className: 'm', render: (v) => `${(v as number)?.toLocaleString('fr-DZ')} دج` },
            { key: 'margin', label: 'الهامش', render: (v) => {
              const cls = (v as number) >= 0 ? 'e' : 'r';
              return <span className={cls}>{(v as number)?.toLocaleString('fr-DZ')} دج</span>;
            }},
            { key: 'ifu_due', label: 'IFU', render: (v) => <span className="e">{(v as number)?.toLocaleString('fr-DZ')} دج</span> },
            { key: 'price_violation', label: 'حالة السعر', render: (v) => v ? <Badge variant="danger">مخالف</Badge> : <Badge variant="success">مطابق</Badge> },
            { key: '_actions', label: '', render: (_, row) => {
              const s = row as SubsidizedSalesSummary;
              return (
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
              );
            }},
          ]}
          data={summary?.summaries ?? []}
          rowKey="id"
          rowClassName={(row) => (row as SubsidizedSalesSummary).price_violation ? 'tw-row-violation' : ''}
          emptyText="لا توجد بيانات"
        />
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
      pmp: purchasePriceAvg,
      actual_sell_price: actualSellPrice,
      total_margin: totalMargin,
      ifu_amount: ifuAmount,
      price_violation: priceViolation,
    } as any);
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
