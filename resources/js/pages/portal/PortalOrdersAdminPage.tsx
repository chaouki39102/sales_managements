// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalOrdersAdminPage.tsx — طلبات بوابة الزبائن (لوحة الإدارة)
//
// خط التحويل: قائمة → تفاصيل → تحرير الأسطر (إضافة/تعديل/حذف + تحقق مخزون)
//             → تغيير الحالة → تحويل إلى فاتورة (FV)
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import type React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SimpleTable from '@/components/ui/SimpleTable';
import { useNotification } from '@/hooks/useNotification';
import { useConfirm } from '@/hooks/useConfirm';
import { useVariantSearch } from '@/lib/api/endpoints/products';
import type { ProductVariant } from '@/lib/api/core/types';
import {
  usePortalOrders,
  usePortalOrderDetail,
  usePortalOrderStatusUpdate,
  usePortalOrderConvert,
  usePortalOrderLinesUpdate,
  PORTAL_ORDER_STATUSES,
  type PortalAdminOrder,
  type PortalAdminOrderItem,
  type PortalAdminStockInfo,
  type PortalOrderConvertResult,
} from '@/lib/api/endpoints/portalOrders';
import type { PortalOrderStatus } from '@/lib/api/portal/portal';
import OrderPipeline, { PORTAL_ORDER_PIPELINE } from './OrderPipeline';

const fmt = (n: number) =>
  n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_VARIANT: Record<PortalOrderStatus, 'warning' | 'info' | 'success' | 'danger' | 'purple' | 'gray' | 'orange'> = {
  preparing: 'warning',
  confirmed: 'info',
  processed: 'purple',
  shipped:   'orange',
  delivered: 'success',
  returned:  'danger',
  cancelled: 'gray',
};

const inputStyle: React.CSSProperties = {
  width: 76,
  padding: '6px 8px',
  borderRadius: 'var(--r2)',
  border: '1px solid var(--b3)',
  background: 'var(--bg1)',
  color: 'var(--t1)',
  fontSize: 12.5,
  fontFamily: 'Tajawal, sans-serif',
  textAlign: 'center',
  outline: 'none',
};

interface DraftLine {
  line_id:       number | null;
  product_id:    number;
  product_name:  string;
  product_ref:   string | null;
  unit_name:     string | null;
  quantity:      number;
  packaging_id:  number | null;
  pack_qty:      number;
}

function StockCell({ stock }: { stock: PortalAdminStockInfo | undefined }) {
  if (!stock) return <span style={{ color: 'var(--t4)', fontSize: 11 }}>—</span>;
  if (stock.available === null) return <span style={{ color: 'var(--t4)', fontSize: 11 }}>لا يدير مخزوناً</span>;
  const ok = stock.sufficient !== false;
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
      <span style={{ color: ok ? 'var(--g, #16a34a)' : 'var(--red, #dc2626)' }}>
        <i className={`ti ${ok ? 'ti-circle-check' : 'ti-alert-triangle'}`} style={{ marginLeft: 3 }} />
        {fmt(stock.available)}
      </span>
      <div style={{ color: 'var(--t4)', fontWeight: 500, fontSize: 10, marginTop: 2 }}>
        مطلوب {fmt(stock.required)}
      </div>
    </div>
  );
}

export default function PortalOrdersAdminPage() {
  const qc = useQueryClient();
  const notify = useNotification();

  const [status, setStatus] = useState<PortalOrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [nextStatus, setNextStatus] = useState<PortalOrderStatus>('preparing');
  const [convertResult, setConvertResult] = useState<PortalOrderConvertResult['sale'] | null>(null);

  // ── Editor state ──────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [addQuery, setAddQuery] = useState('');
  const [addQty, setAddQty] = useState(1);

  const perPage = 15;

  const { data, isLoading } = usePortalOrders({ page, per_page: perPage, status });
  const detail = usePortalOrderDetail(detailId);
  const updateStatus = usePortalOrderStatusUpdate();
  const convert = usePortalOrderConvert();
  const linesMut = usePortalOrderLinesUpdate();
  const { confirm, confirmDialogProps } = useConfirm();

  const productSearch = useVariantSearch(addQuery);

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const from = meta ? meta.per_page * (meta.current_page - 1) + 1 : 0;
  const to = meta ? Math.min(meta.per_page * meta.current_page, meta.total) : 0;

  const order = detail.data;
  const stockByLine = new Map((order?.stock ?? []).map((s) => [s.line_id, s]));
  // مرحلة التحليل: يبقى التحرير متاحاً في قيد الاعداد/مؤكد/تم المعالجة فقط —
  // بمجرد «الشحن» يغلق التحرير (الواجهة والخدمة معاً).
  const canEdit = !!order && !['shipped', 'delivered', 'returned', 'cancelled'].includes(order.status);
  // لا تحويل قبل التأكيد ولا بعد التسليم/الإرجاع/الإلغاء.
  const cannotConvert = !!order && ['preparing', 'delivered', 'returned', 'cancelled'].includes(order.status);
  const convertTitle = order?.status === 'preparing'
    ? 'يجب تأكيد الطلب أولاً (من الزبون أو من المسؤول) قبل تحويله إلى فاتورة'
    : order?.status === 'delivered' ? 'تم تحويل هذا الطلب مسبقاً'
    : order?.status === 'returned' ? 'لا يمكن تحويل طلب مرتجع'
    : order?.status === 'cancelled' ? 'لا يمكن تحويل طلب ملغى' : undefined;

  const openDetail = (o: PortalAdminOrder) => {
    setDetailId(o.id);
    setNextStatus(o.status);
    setConvertResult(null);
    setEditing(false);
  };

  const closeDetail = () => {
    setDetailId(null);
    setEditing(false);
    setDraft([]);
  };

  const startEditing = () => {
    if (!order) return;
    setDraft((order.items ?? []).map((it: PortalAdminOrderItem) => ({
      line_id:       it.line_id,
      product_id:    it.product_id,
      product_name:  it.product_name,
      product_ref:   it.product_ref,
      unit_name:     it.unit_name,
      quantity:      it.quantity,
      packaging_id:  it.packaging_id,
      pack_qty:      it.pack_qty,
    })));
    setEditing(true);
  };

  const addProduct = (v: ProductVariant) => {
    const pack = v.packagings?.find((p) => p.is_default);
    setDraft((d) => [...d, {
      line_id:      null,
      product_id:   v.product_id,
      product_name: v.product?.name ?? v.ref,
      product_ref:  v.ref ?? v.product?.ref ?? null,
      unit_name:    v.unit?.symbol ?? null,
      quantity:     addQty > 0 ? addQty : 1,
      packaging_id: null,
      pack_qty:     pack?.quantity ?? 1,
    }]);
    setAddQuery('');
    setAddQty(1);
  };

  const saveLines = () => {
    if (!detailId) return;
    const payload = draft
      .filter((l) => l.quantity > 0 || l.line_id !== null)
      .map((l) => (
        l.line_id !== null
          ? { line_id: l.line_id, quantity: Math.max(0, l.quantity) }
          : { product_id: l.product_id, quantity: Math.max(1, l.quantity) }
      ));
    if (payload.length === 0) {
      notify.error('أضف منتجاً واحداً على الأقل قبل الحفظ');
      return;
    }
    linesMut.mutate(
      { id: detailId, lines: payload },
      {
        onSuccess: () => {
          setEditing(false);
          setDraft([]);
          notify.success('تم حفظ أسطر الطلب');
        },
        onError: (e: Error) => notify.error(e.message || 'تعذر حفظ الأسطر'),
      },
    );
  };

  const applyStatus = (statusArg?: PortalOrderStatus) => {
    if (!detailId) return;
    updateStatus.mutate(
      { id: detailId, status: statusArg ?? nextStatus },
      {
        onSuccess: () => {
          notify.success('تم تحديث حالة الطلب');
          qc.invalidateQueries({ queryKey: ['portal-orders'] });
        },
        onError: (e: Error) => notify.error(e.message || 'تعذر تحديث الحالة'),
      },
    );
  };

  // الخطوة التالية المقترحة في خط الأنابيب (الطريقة الاحترافية):
  //   قيد الاعداد → مؤكد → تم المعالجة → الشحن → تم التسليم → (مرتجع)
  const NEXT_STEP: Partial<Record<PortalOrderStatus, PortalOrderStatus>> = {
    preparing: 'confirmed',
    confirmed: 'processed',
    processed: 'shipped',
    shipped:   'delivered',
    delivered: 'returned',
  };
  const quickNext = order
    ? PORTAL_ORDER_PIPELINE.find((s) => s.value === NEXT_STEP[order.status]) ?? null
    : null;

  const handleConvert = async () => {
    if (!detailId) return;
    const ok = await confirm(
      'سيتم تحويل هذا الطلب إلى فاتورة بيع (FV) — تُفعَّل حركة المخزون والطابع الجبائي وقيود الرصيد ولا يمكن التراجع. متابعة؟',
      { title: 'تحويل الطلب إلى فاتورة', confirmText: 'تحويل الآن', variant: 'warning', icon: 'ti-file-invoice' },
    );
    if (!ok) return;
    convert.mutate(
      { id: detailId },
      {
        onSuccess: (res) => {
          setConvertResult(res.sale);
          notify.success(`تم التحويل — الفاتورة ${res.sale.document_number}`);
          qc.invalidateQueries({ queryKey: ['portal-orders'] });
        },
        onError: (e: Error) => notify.error(e.message || 'تعذر تحويل الطلب إلى فاتورة'),
      },
    );
  };

  const statusTabs: { key: PortalOrderStatus | ''; label: string }[] = [
    { key: '', label: 'الكل' },
    ...PORTAL_ORDER_STATUSES.map((s) => ({ key: s.value, label: s.label })),
  ];

  const productResults = (addQuery.trim().length >= 2 ? productSearch.data?.data ?? [] : []).filter(
    (v) => !draft.some((l) => l.line_id === null && l.product_id === v.product_id),
  );

  return (
    <div>
      <PageHeader
        title="طلبات بوابة الزبائن"
        subtitle="وصل طلب سلعة المرسل من زبائن البوابة — تابع وحلّل الطلبات وحوّلها إلى فواتير"
      />

      {/* ── Filter Tabs ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: '0 20px', flexWrap: 'wrap' }}>
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatus(tab.key); setPage(1); }}
            style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all .15s',
              background: status === tab.key ? 'var(--em)' : 'var(--bg2)',
              color: status === tab.key ? '#fff' : 'var(--t3)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 20px' }}>
        <SimpleTable
          isLoading={isLoading}
          emptyText="لا توجد طلبات"
          columns={[
            { key: 'reference', label: 'المرجع', render: (v) => <span style={{ fontWeight: 700, direction: 'ltr' }}>{v as string}</span> },
            { key: 'requested_at', label: 'التاريخ', render: (v) => <span style={{ color: 'var(--t3)' }}>{fmtDate(v as string)}</span> },
            {
              key: 'party', label: 'الزبون',
              render: (_v, row) => (row as any).party?.name ?? '—',
            },
            { key: 'items_count', label: 'الأسطر', render: (v) => <span style={{ color: 'var(--t3)' }}>{v as number}</span> },
            { key: 'total_ttc', label: 'المجموع TTC', render: (v) => <span style={{ fontWeight: 700 }}>{fmt(Number(v))}</span> },
            {
              key: 'status', label: 'الحالة',
              render: (_v, row) => (
                <Badge variant={STATUS_VARIANT[(row as any).status as PortalOrderStatus]}>
                  {(row as any).status_label}
                </Badge>
              ),
            },
            {
              key: 'id', label: '',
              render: (_v, row) => (
                <button
                  onClick={(e) => { e.stopPropagation(); openDetail(row as PortalAdminOrder); }}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                    border: '1px solid var(--b3)', background: 'var(--bg2)', color: 'var(--t2)',
                    cursor: 'pointer',
                  }}
                >
                  التفاصيل
                </button>
              ),
            },
          ]}
          data={orders}
          rowKey="id"
          onRowClick={(row) => openDetail(row as PortalAdminOrder)}
        />

        {/* ── Pagination ──────────────────────────────────────────────── */}
        {meta && meta.total > perPage && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 4px 4px', fontSize: 12, color: 'var(--t4)', fontWeight: 600,
          }}>
            <span>عرض {from} – {to} من {meta.total} طلب</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                disabled={meta.current_page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={pgBtnStyle(meta.current_page <= 1)}
              >
                <i className="ti ti-chevron-right" />
              </button>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage(p => p + 1)}
                style={pgBtnStyle(meta.current_page >= meta.last_page)}
              >
                <i className="ti ti-chevron-left" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────── */}
      <Modal
        open={!!detailId}
        onClose={closeDetail}
        title="تفاصيل طلب"
        subtitle={order?.reference}
        size="lg"
        footer={
          editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={saveLines}
                disabled={linesMut.isPending}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--r2)',
                  background: 'var(--em)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
                }}
              >
                {linesMut.isPending ? <><i className="ti ti-loader animate-spin" /> جاري الحفظ...</> : <><i className="ti ti-device-floppy" /> حفظ الأسطر</>}
              </button>
              <button
                onClick={() => { setEditing(false); setDraft([]); }}
                disabled={linesMut.isPending}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--r2)',
                  background: 'var(--bg2)', color: 'var(--t2)', border: '1px solid var(--b3)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Tajawal, sans-serif',
                }}
              >
                إلغاء
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {canEdit && (
                <button
                  onClick={startEditing}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--r2)',
                    background: 'var(--bg2)', color: 'var(--em)', border: '1px solid var(--b3)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
                  }}
                >
                  <i className="ti ti-edit" /> تحرير الأسطر
                </button>
              )}
              <button
                onClick={handleConvert}
                disabled={convert.isPending || cannotConvert}
                title={convertTitle}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--r2)',
                  background: 'var(--gold)', color: '#fff', border: 'none',
                  cursor: convert.isPending ? 'progress' : 'pointer', fontSize: 13, fontWeight: 700,
                  fontFamily: 'Tajawal, sans-serif', opacity: convert.isPending || cannotConvert ? 0.5 : 1,
                }}
              >
                {convert.isPending
                  ? <><i className="ti ti-loader animate-spin" /> جاري التحويل...</>
                  : <><i className="ti ti-file-invoice" /> تحويل إلى فاتورة</>}
              </button>
              {quickNext && (
                <button
                  onClick={() => applyStatus(quickNext.value)}
                  disabled={updateStatus.isPending}
                  title={`الخطوة التالية في خط الأنابيب: ${quickNext.label}`}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--r2)',
                    background: 'color-mix(in srgb, var(--em) 12%, white)', color: 'var(--em)',
                    border: '1px solid color-mix(in srgb, var(--em) 40%, white)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <i className="ti ti-arrow-left" />
                  {quickNext.label === 'مرتجع' ? 'إرجاع الطلب' : `الخطوة: ${quickNext.label}`}
                </button>
              )}
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as PortalOrderStatus)}
                style={{
                  padding: '7px 10px', borderRadius: 'var(--r2)',
                  border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)',
                  fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                }}
              >
                {PORTAL_ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                onClick={() => applyStatus()}
                disabled={updateStatus.isPending}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--r2)',
                  background: 'var(--em)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
                }}
              >
                {updateStatus.isPending ? 'جاري الحفظ...' : 'حفظ الحالة'}
              </button>
            </div>
          )
        }
      >
        {detail.isLoading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>جاري التحميل...</div>
        ) : order ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Party */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8,
              background: 'var(--bg2)', borderRadius: 'var(--r2)', padding: '12px 14px',
              border: '1px solid var(--b1)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                <i className="ti ti-user" style={{ marginLeft: 4, color: 'var(--em)' }} />
                {order.party?.name ?? '—'}
              </div>
              {order.party?.code && (
                <div style={{ fontSize: 12, color: 'var(--t4)' }}>رمز: {order.party.code}</div>
              )}
              {order.requested_at && (
                <div style={{ fontSize: 12, color: 'var(--t4)' }}>أُرسل في: {fmtDate(order.requested_at)}</div>
              )}
              <Badge variant={STATUS_VARIANT[order.status]}>{order.status_label}</Badge>
            </div>

            {/* Pipeline */}
            <div style={{ background: 'var(--bg1)', border: '1px solid var(--b1)', borderRadius: 'var(--r2)', padding: '6px 10px' }}>
              <OrderPipeline status={order.status} />
            </div>

            {/* ── Lines (read-only) ─────────────────────────────────────── */}
            {!editing && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: 'var(--t4)', fontSize: 11, textAlign: 'start' }}>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>المنتج</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>الكمية</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>سعر HT</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>TVA</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>المخزون</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>المجموع TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((it) => (
                    <tr key={`${it.product_id}-${it.line_id}`} style={{ borderBottom: '1px solid var(--b1)' }}>
                      <td style={{ padding: '8px', fontWeight: 700, color: 'var(--t1)' }}>
                        {it.product_name}
                        {it.product_ref ? <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 400 }}>{it.product_ref}</div> : null}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {it.quantity}{it.unit_name ? ` ${it.unit_name}` : ''}
                        {it.pack_qty > 1 ? <span style={{ color: 'var(--em)', fontSize: 10.5 }}> × {it.pack_qty}</span> : null}
                      </td>
                      <td style={{ padding: '8px' }}>{fmt(it.unit_price_ht)}</td>
                      <td style={{ padding: '8px' }}>{it.tva_rate}%</td>
                      <td style={{ padding: '8px' }}><StockCell stock={stockByLine.get(it.line_id)} /></td>
                      <td style={{ padding: '8px', fontWeight: 700 }}>{fmt(it.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Lines editor ─────────────────────────────────────────── */}
            {editing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>
                    <i className="ti ti-edit" style={{ marginLeft: 5, color: 'var(--em)' }} />
                    تحرير الأسطر
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>
                    الأسعار تُحتسب من الخادم — الكمية 0 تحذف السطر
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ color: 'var(--t4)', fontSize: 11, textAlign: 'start' }}>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>المنتج</th>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>الكمية</th>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>المخزون المتاح</th>
                      <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.map((l, i) => {
                      const stock = l.line_id !== null ? stockByLine.get(l.line_id) : undefined;
                      const insufficient = stock && stock.available !== null && l.quantity * l.pack_qty > stock.available;
                      return (
                        <tr key={l.line_id ?? `new-${i}`} style={{ borderBottom: '1px solid var(--b1)' }}>
                          <td style={{ padding: '8px', fontWeight: 700, color: 'var(--t1)' }}>
                            {l.product_name}
                            {l.product_ref ? <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 400 }}>{l.product_ref}</div> : null}
                            {l.pack_qty > 1 ? <span style={{ color: 'var(--em)', fontSize: 10.5 }}> تعبئة × {l.pack_qty}</span> : null}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={l.quantity}
                              onChange={(e) => {
                                const q = Number(e.target.value);
                                setDraft((d) => d.map((x, xi) => (xi === i ? { ...x, quantity: Number.isFinite(q) ? q : 0 } : x)));
                              }}
                              style={{ ...inputStyle, borderColor: insufficient ? 'var(--red, #dc2626)' : 'var(--b3)' }}
                            />
                            {l.unit_name ? <span style={{ marginRight: 4, color: 'var(--t4)' }}>{l.unit_name}</span> : null}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <StockCell stock={stock} />
                            {insufficient && (
                              <div style={{ color: 'var(--red, #dc2626)', fontSize: 10.5, fontWeight: 700, marginTop: 2 }}>
                                الكمية تتجاوز المخزون المتاح
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button
                              onClick={() => setDraft((d) => d.filter((_, xi) => xi !== i))}
                              title="حذف السطر"
                              style={{
                                border: 'none', background: 'none', cursor: 'pointer',
                                color: 'var(--red, #dc2626)', padding: 4, fontSize: 15,
                              }}
                            >
                              <i className="ti ti-trash" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {draft.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '18px', textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
                          لا توجد أسطر — أضف منتجاً من الأسفل
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* ── Add product ───────────────────────────────────────── */}
                <div style={{
                  border: '1px dashed var(--b3)', borderRadius: 'var(--r2)', padding: 10,
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t4)' }}>
                    <i className="ti ti-plus" style={{ marginLeft: 4, color: 'var(--em)' }} />
                    إضافة منتج للطلب
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      placeholder="ابحث بالاسم أو المرجع..."
                      style={{
                        flex: 1, minWidth: 180, padding: '7px 10px', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)',
                        fontSize: 12.5, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value) || 1)}
                      style={{ ...inputStyle, width: 64 }}
                      title="الكمية"
                    />
                  </div>
                  {addQuery.trim().length >= 2 && (
                    <div style={{
                      maxHeight: 180, overflowY: 'auto', border: '1px solid var(--b1)',
                      borderRadius: 'var(--r2)', background: 'var(--bg2)',
                    }}>
                      {productResults.length === 0 && !productSearch.isLoading && (
                        <div style={{ padding: 12, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
                          لا توجد منتجات مطابقة
                        </div>
                      )}
                      {productSearch.isLoading && (
                        <div style={{ padding: 12, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
                          جاري البحث...
                        </div>
                      )}
                      {productResults.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => addProduct(v)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '8px 10px', border: 'none',
                            borderBottom: '1px solid var(--b1)', background: 'none',
                            cursor: 'pointer', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif',
                            color: 'var(--t1)', textAlign: 'start',
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>
                            {v.product?.name ?? v.ref}
                            <span style={{ color: 'var(--t4)', fontWeight: 500, fontSize: 11, marginRight: 6 }}>
                              {v.ref}{v.unit?.symbol ? ` · ${v.unit.symbol}` : ''}
                            </span>
                          </span>
                          <span style={{ color: 'var(--em)', fontWeight: 700, fontSize: 12 }}>
                            {fmt(v.default_selling_price_ht)} دج
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Totals ───────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12.5 }}>
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600 }}>المجموع HT</div>
                <div style={{ fontWeight: 800, color: 'var(--t1)' }}>{fmt(order.total_ht)}</div>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600 }}>TVA</div>
                <div style={{ fontWeight: 800, color: 'var(--t1)' }}>{fmt(order.total_tva)}</div>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600 }}>المجموع TTC</div>
                <div style={{ fontWeight: 800, color: 'var(--em)' }}>{fmt(order.total_ttc)}</div>
              </div>
            </div>

            {order.notes && (
              <div style={{
                background: 'var(--goldb, #fff7ed)', borderRadius: 10, padding: '10px 12px',
                fontSize: 12.5, color: 'var(--t2)', fontWeight: 600,
              }}>
                <i className="ti ti-message" style={{ marginLeft: 4, color: 'var(--gold)' }} />
                ملاحظات الزبون: {order.notes}
              </div>
            )}

            {convertResult && (
              <div style={{
                background: 'var(--gb, #ecfdf5)', border: '1px solid var(--b3)',
                borderRadius: 10, padding: '12px 14px', fontSize: 13,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ fontWeight: 800, color: 'var(--g, #16a34a)' }}>
                  <i className="ti ti-circle-check" style={{ marginLeft: 6 }} />
                  تم التحويل بنجاح — أمر الزبون أصبح فاتورة بيع
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: 'var(--t2)', fontWeight: 600 }}>
                  <span style={{ direction: 'ltr', fontWeight: 800, color: 'var(--t1)' }}>
                    {convertResult.document_number}
                  </span>
                  <span style={{ color: 'var(--t4)' }}>بتاريخ {fmtDate(convertResult.document_date)}</span>
                  <span style={{ color: 'var(--t4)' }}>الصافي للدفع</span>
                  <b>{fmt(convertResult.net_to_pay)} DZD</b>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
            الطلب غير موجود
          </div>
        )}
      </Modal>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

function pgBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 30, height: 30, borderRadius: 8, border: '1px solid var(--b1)',
    background: 'var(--bg2)', color: 'var(--t2)', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  };
}
