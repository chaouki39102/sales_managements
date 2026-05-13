// pages/inventory/InventoryPage.tsx
import React, { useState } from 'react';
import { useQuery }       from '@tanstack/react-query';
import { useWarehouses, useFamilies } from '@/lib/api/endpoints/lookups';
import apiClient from '@/lib/api/core/client';
import { useModal }       from '@/hooks/useModal';
import PageHeader         from '@/components/ui/PageHeader';
import Card               from '@/components/ui/Card';
import Badge              from '@/components/ui/Badge';
import Button             from '@/components/ui/Button';
import Modal              from '@/components/ui/Modal';
import KpiCard            from '@/components/ui/KpiCard';
import ProgressBar        from '@/components/ui/ProgressBar';
import AlertBar           from '@/components/ui/AlertBar';

import type { ProductVariant } from '@/types';

export default function InventoryPage() {
  const [search, setSearch]   = useState('');
  const [familyId, setFamily] = useState<number | null>(null);
  const [statusFilter, setStatus] = useState('');

  const stockIn  = useModal();
  const stockOut = useModal();

  const { data: lowStock } = useLowStockVariants();
  const { data: families } = useFamilies();
  const { data: warehouses } = useWarehouses();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'variants', search, familyId, statusFilter],
    queryFn:  () => variantsApi.list({ search: search || undefined, page: 1 }).then(r => r.data),
    staleTime: 30_000,
  });

  const variants = data?.data ?? [];
  const meta     = data?.meta;

  const outOfStock = lowStock?.filter(v => (v.current_stock ?? 0) <= 0).length ?? 0;
  const lowStockCount = lowStock?.filter(v => {
    const s = v.current_stock ?? 0;
    return s > 0 && s <= v.min_stock_alert;
  }).length ?? 0;

  return (
    <div className="page on" id="p-inventory">

      <PageHeader
        title="إدارة المخزون"
        subtitle={`تتبع الكميات والقيمة — ${warehouses?.[0]?.name ?? 'المستودع الرئيسي'}`}
        actions={
          <>
            <Button variant="primary" size="sm" icon={<i className="ti ti-download"/>} onClick={stockIn.openModal}>
              إدخال مخزون
            </Button>
            <Button variant="warning" size="sm" icon={<i className="ti ti-upload"/>} onClick={stockOut.openModal}>
              إخراج
            </Button>
            <Button size="sm" icon={<i className="ti ti-clipboard-list"/>}>طلب شراء</Button>
            <Button size="sm" icon={<i className="ti ti-table-export"/>}>تصدير</Button>
          </>
        }
      />

      {(outOfStock > 0 || lowStockCount > 0) && (
        <AlertBar variant="red">
          <strong>تحذير!</strong> — {outOfStock > 0 && `${outOfStock} منتج نفد تماماً`}
          {outOfStock > 0 && lowStockCount > 0 && ' و'}
          {lowStockCount > 0 && `${lowStockCount} منتج بالحد الأدنى`}
          . يُنصح بالطلب الفوري.
        </AlertBar>
      )}

      {/* KPIs */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <KpiCard variant="green"  icon="ti-coin"           label="قيمة المخزون الكلي"  value="451,820" unit="دج" sub="بسعر الشراء" />
        <KpiCard variant="red"    icon="ti-alert-circle"   label="منتجات نفدت"         value={outOfStock}          sub="تحتاج طلب عاجل" />
        <KpiCard variant="gold"   icon="ti-alert-triangle" label="منتجات منخفضة"       value={lowStockCount}        sub="دون الحد الأدنى" />
        <KpiCard variant="blue"   icon="ti-package"        label="إجمالي الأصناف"      value={meta?.total ?? '…'} sub={`${variants.filter(v => (v.current_stock ?? 0) > 0).length} متوفر`} />
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input type="text" placeholder="ابحث بالاسم أو الباركود..." style={{ width: '100%' }}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ width: 130 }} onChange={e => setFamily(e.target.value ? Number(e.target.value) : null)}>
          <option value="">كل الفئات</option>
          {families?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select style={{ width: 140 }}>
          <option value="">كل المستودعات</option>
          {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select style={{ width: 140 }} onChange={e => setStatus(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="ok">جيد</option>
          <option value="low">منخفض</option>
          <option value="out">نفد</option>
        </select>
      </div>

      {/* Table */}
      <Card noHeader style={{ padding: 0 }}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الفئة</th>
                <th>الكمية</th>
                <th>الحد الأدنى</th>
                <th>سعر الشراء</th>
                <th>سعر البيع TTC</th>
                <th>الهامش</th>
                <th>القيمة الإجمالية</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--t4)' }}>جاري التحميل...</td></tr>
              ) : variants.map(v => {
                const stock     = v.current_stock ?? 0;
                const minStock  = v.min_stock_alert;
                const isOOS     = v.manages_stock && stock <= 0;
                const isLow     = v.manages_stock && stock > 0 && stock <= minStock;
                const buyPrice  = v.last_purchase_price;
                const sellHt    = v.default_selling_price_ht;
                const tvaRate   = v.tva?.rate ?? 19;
                const sellTtc   = sellHt * (1 + tvaRate / 100);
                const margin    = sellHt > 0 ? ((sellHt - buyPrice) / sellHt * 100) : 0;
                const totalVal  = stock * buyPrice;
                const pct       = minStock > 0 ? Math.min(100, (stock / (minStock * 2)) * 100) : 100;

                return (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--em)', flexShrink: 0 }}>
                          <i className="ti ti-package"/>
                        </div>
                        <div>
                          <div className="s">{v.product?.name ?? '—'}</div>
                          <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>
                            {v.barcode ?? v.ref ?? '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><Badge variant="warning" noDot>{v.product?.family?.name ?? '—'}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 800, color: isOOS ? 'var(--red)' : isLow ? 'var(--gold)' : 'var(--t1)' }}>
                            {v.manages_stock ? stock : '∞'}
                          </div>
                          {v.manages_stock && (
                            <div style={{ marginTop: 3 }}>
                              <ProgressBar value={pct} color={isOOS ? 'var(--red)' : isLow ? 'var(--gold)' : 'var(--em)'} height={3} />
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>{v.unit?.symbol ?? 'قطعة'}</span>
                      </div>
                    </td>
                    <td className="m" style={{ color: 'var(--t4)' }}>{minStock > 0 ? minStock : '—'}</td>
                    <td className="m">{buyPrice.toFixed(2)} دج</td>
                    <td className="e">{sellTtc.toFixed(0)} دج</td>
                    <td style={{ color: margin > 20 ? 'var(--em)' : margin > 0 ? 'var(--gold)' : 'var(--red)', fontWeight: 700 }}>
                      {margin > 0 ? `+${margin.toFixed(1)}%` : '—'}
                    </td>
                    <td className="m">{totalVal > 0 ? totalVal.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' دج' : '—'}</td>
                    <td>
                      <Badge variant={isOOS ? 'danger' : isLow ? 'warning' : 'success'}>
                        {isOOS ? 'نفد' : isLow ? 'منخفض' : 'جيد'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <Button size="xs" variant="primary" icon={<i className="ti ti-plus"/>} onClick={stockIn.openModal} title="إدخال" />
                        <Button size="xs" icon={<i className="ti ti-history"/>} title="حركات" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stock In Modal */}
      <StockMovementModal
        open={stockIn.open}
        onClose={stockIn.closeModal}
        type="in"
        variants={variants}
      />
      <StockMovementModal
        open={stockOut.open}
        onClose={stockOut.closeModal}
        type="out"
        variants={variants}
      />
    </div>
  );
}

function StockMovementModal({ open, onClose, type, variants }: {
  open: boolean; onClose: () => void;
  type: 'in' | 'out'; variants: ProductVariant[];
}) {
  const [variantId, setVariantId] = useState('');
  const [qty,       setQty]       = useState('');
  const [price,     setPrice]     = useState('');
  const [notes,     setNotes]     = useState('');

  return (
    <Modal
      open={open} onClose={onClose} size="sm"
      title={type === 'in' ? 'إدخال مخزون' : 'إخراج مخزون'}
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button variant={type === 'in' ? 'primary' : 'warning'} icon={<i className={`ti ${type === 'in' ? 'ti-download' : 'ti-upload'}`}/>}>
            تأكيد
          </Button>
        </>
      }
    >
      <div className="fgrid">
        <div className="fg s2">
          <label className="req">المنتج</label>
          <select value={variantId} onChange={e => setVariantId(e.target.value)}>
            <option value="">— اختر منتجاً —</option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.product?.name}{v.variant_name ? ` — ${v.variant_name}` : ''}
                {v.manages_stock ? ` (مخزون: ${v.current_stock ?? 0})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label className="req">الكمية</label>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" min={0.001} inputMode="decimal" />
        </div>
        {type === 'in' && (
          <div className="fg">
            <label>سعر الشراء HT</label>
            <div className="inp-row">
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
              <div className="inp-suf">دج</div>
            </div>
          </div>
        )}
        <div className="fg s2">
          <label>ملاحظة</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="سبب الحركة..." />
        </div>
      </div>
    </Modal>
  );
}
