// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalOrdersAdminPage.tsx — طلبات بوابة الزبائن (لوحة الإدارة)
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
import {
  usePortalOrders,
  usePortalOrderDetail,
  usePortalOrderStatusUpdate,
  usePortalOrderConvert,
  PORTAL_ORDER_STATUSES,
  type PortalAdminOrder,
  type PortalOrderConvertResult,
} from '@/lib/api/endpoints/portalOrders';
import type { PortalOrderStatus } from '@/lib/api/portal/portal';

const fmt = (n: number) =>
  n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_VARIANT: Record<PortalOrderStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  pending:    'warning',
  processing: 'info',
  completed:  'success',
  cancelled:  'danger',
};

export default function PortalOrdersAdminPage() {
  const qc = useQueryClient();
  const notify = useNotification();

  const [status, setStatus] = useState<PortalOrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [nextStatus, setNextStatus] = useState<PortalOrderStatus>('pending');
  const [convertResult, setConvertResult] = useState<PortalOrderConvertResult['sale'] | null>(null);

  const perPage = 15;

  const { data, isLoading } = usePortalOrders({ page, per_page: perPage, status });
  const detail = usePortalOrderDetail(detailId);
  const updateStatus = usePortalOrderStatusUpdate();
  const convert = usePortalOrderConvert();
  const { confirm, confirmDialogProps } = useConfirm();

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const from = meta ? meta.per_page * (meta.current_page - 1) + 1 : 0;
  const to = meta ? Math.min(meta.per_page * meta.current_page, meta.total) : 0;

  const openDetail = (o: PortalAdminOrder) => {
    setDetailId(o.id);
    setNextStatus(o.status);
    setConvertResult(null);
  };

  const applyStatus = () => {
    if (!detailId) return;
    updateStatus.mutate(
      { id: detailId, status: nextStatus },
      {
        onSuccess: () => {
          notify.success('تم تحديث حالة الطلب');
          qc.invalidateQueries({ queryKey: ['portal-orders'] });
        },
        onError: (e: Error) => notify.error(e.message || 'تعذر تحديث الحالة'),
      },
    );
  };

  const startProcessing = () => {
    if (!detailId) return;
    updateStatus.mutate(
      { id: detailId, status: 'processing' },
      {
        onSuccess: () => {
          setNextStatus('processing');
          notify.success('تم بدء تجهيز الطلب');
          qc.invalidateQueries({ queryKey: ['portal-orders'] });
        },
        onError: (e: Error) => notify.error(e.message || 'تعذر تحديث الحالة'),
      },
    );
  };

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
          setNextStatus('completed');
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

  return (
    <div>
      <PageHeader
        title="طلبات بوابة الزبائن"
        subtitle="وصل طلب سلعة المرسل من زبائن البوابة — تابع وحالّ الطلبات"
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
        onClose={() => setDetailId(null)}
        title="تفاصيل طلب"
        subtitle={detail.data?.reference}
        size="lg"
        footer={
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {detail.data?.status === 'pending' && (
                <button
                  onClick={startProcessing}
                  disabled={updateStatus.isPending}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--r2)',
                    background: 'var(--em)', color: '#fff', border: 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    fontFamily: 'Tajawal, sans-serif', opacity: updateStatus.isPending ? 0.6 : 1,
                  }}
                >
                  {updateStatus.isPending
                    ? <><i className="ti ti-loader animate-spin" /> جاري الحفظ...</>
                    : <><i className="ti ti-package-import" /> بدء التجهيز</>}
                </button>
              )}
              <button
                onClick={handleConvert}
                disabled={
                  convert.isPending ||
                  detail.data?.status === 'completed' ||
                  detail.data?.status === 'cancelled'
                }
                title={
                  detail.data?.status === 'completed' ? 'تم تحويل هذا الطلب مسبقاً' :
                  detail.data?.status === 'cancelled' ? 'لا يمكن تحويل طلب ملغى' : undefined
                }
                style={{
                  padding: '8px 14px', borderRadius: 'var(--r2)',
                  background: 'var(--gold)', color: '#fff', border: 'none',
                  cursor: convert.isPending ? 'progress' : 'pointer', fontSize: 13, fontWeight: 700,
                  fontFamily: 'Tajawal, sans-serif', opacity: convert.isPending ||
                    detail.data?.status === 'completed' ||
                    detail.data?.status === 'cancelled' ? 0.5 : 1,
                }}
              >
                {convert.isPending
                  ? <><i className="ti ti-loader animate-spin" /> جاري التحويل...</>
                  : <><i className="ti ti-file-invoice" /> تحويل إلى فاتورة</>}
              </button>
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
                onClick={applyStatus}
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
          </>
        }
      >
        {detail.isLoading ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>جاري التحميل...</div>
        ) : detail.data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Party */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8,
              background: 'var(--bg2)', borderRadius: 'var(--r2)', padding: '12px 14px',
              border: '1px solid var(--b1)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                <i className="ti ti-user" style={{ marginLeft: 4, color: 'var(--em)' }} />
                {detail.data.party?.name ?? '—'}
              </div>
              {detail.data.party?.code && (
                <div style={{ fontSize: 12, color: 'var(--t4)' }}>رمز: {detail.data.party.code}</div>
              )}
              {detail.data.requested_at && (
                <div style={{ fontSize: 12, color: 'var(--t4)' }}>أُرسل في: {fmtDate(detail.data.requested_at)}</div>
              )}
              <Badge variant={STATUS_VARIANT[detail.data.status]}>{detail.data.status_label}</Badge>
            </div>

            {/* Lines */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: 'var(--t4)', fontSize: 11, textAlign: 'start' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>المنتج</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>الكمية</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>سعر HT</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>TVA</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>المجموع TTC</th>
                </tr>
              </thead>
              <tbody>
                {(detail.data.items ?? []).map((it, i) => (
                  <tr key={`${it.product_id}-${i}`} style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '8px', fontWeight: 700, color: 'var(--t1)' }}>
                      {it.product_name}
                      {it.product_ref ? <div style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 400 }}>{it.product_ref}</div> : null}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {it.quantity}{it.unit_name ? ` ${it.unit_name}` : ''}
                    </td>
                    <td style={{ padding: '8px' }}>{fmt(it.unit_price_ht)}</td>
                    <td style={{ padding: '8px' }}>{it.tva_rate}%</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{fmt(it.total_ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
              fontSize: 12.5,
            }}>
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600 }}>المجموع HT</div>
                <div style={{ fontWeight: 800, color: 'var(--t1)' }}>{fmt(detail.data.total_ht)}</div>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600 }}>TVA</div>
                <div style={{ fontWeight: 800, color: 'var(--t1)' }}>{fmt(detail.data.total_tva)}</div>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ color: 'var(--t4)', fontSize: 11, fontWeight: 600 }}>المجموع TTC</div>
                <div style={{ fontWeight: 800, color: 'var(--em)' }}>{fmt(detail.data.total_ttc)}</div>
              </div>
            </div>

            {detail.data.notes && (
              <div style={{
                background: 'var(--goldb, #fff7ed)', borderRadius: 10, padding: '10px 12px',
                fontSize: 12.5, color: 'var(--t2)', fontWeight: 600,
              }}>
                <i className="ti ti-message" style={{ marginLeft: 4, color: 'var(--gold)' }} />
                ملاحظات الزبون: {detail.data.notes}
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
