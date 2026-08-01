// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProSessionDrawer.tsx
//
// مودال الجلسة الحالية لـ POS PRO: ملخص الجلسة (المستودع، البداية، المبيعات،
// الإيصالات، تفاصيل الدفع) + إغلاق الجلسة بعد إدخال المبلغ النقدي المعدود.
// يعتمد على useCurrentPosSession/useCloseSession (نفس واجهة POS الكلاسيكي).
// ════════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import { formatDZD } from '@/pos/utils/calculations';
import { useCloseSession } from '@/lib/api/endpoints/posSession';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import { useActiveCompany } from '@/lib/store/appStore';
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
import TemplatePrintModal from '@/pages/settings/print-settings/components/shared/TemplatePrintModal';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
import type { Warehouse } from '@/types';

interface Props {
  session: PosSession | null;
  warehouses: Warehouse[];
  warehouseId: number | null;
  onWarehouseChange: (id: number) => void;
  onClose: () => void;
  onClosed?: () => void;
}

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return s; }
}

export default function POSProSessionDrawer({ session, warehouses, warehouseId, onWarehouseChange, onClose, onClosed }: Props) {
  const closeMut = useCloseSession(session?.id ?? null);
  const [counted, setCounted] = useState('');
  const [note, setNote]       = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const companyInfo = mapCompany(useActiveCompany());
  const { data: reportTemplates = [] } = usePrintTemplatesList('RPT');

  const reportData = useMemo(
    () => companyInfo ? DocumentDataBuilder.fromSessionReport(session as unknown as Record<string, unknown>, companyInfo) : null,
    [session, companyInfo],
  );

  if (!session) return null;

  const totalPayments = (session.payments ?? []).reduce((s, p) => s + p.amount, 0);

  const handleClose = async () => {
    const n = parseFloat(counted);
    if (!Number.isFinite(n) || n < 0) {
      setError('أدخل المبلغ النقدي المعدود (رقم صحيح أو عشري)');
      return;
    }
    setError(null);
    try {
      await closeMut.mutateAsync({
        closing_cash_counted: n,
        closing_note:         note.trim() || undefined,
      });
      toast.success('تم إغلاق الجلسة');
      onClosed?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل إغلاق الجلسة');
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="الجلسة الحالية"
      subtitle={session.warehouse?.name}
      size="md"
      resizable={false}
      footer={
        closeMut.isPending ? (
          <span className="pp-session-closing"><i className="ti ti-loader animate-spin" /> جارٍ الإغلاق…</span>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPrintOpen(true)}
              disabled={!reportData}
            >
              <i className="ti ti-printer" />
              طباعة تقرير الجلسة
            </button>
            <button type="button" className="btn btn-b" onClick={handleClose} disabled={!session}>
              <i className="ti ti-lock-square" />
              إغلاق الجلسة
            </button>
          </>
        )
      }
    >
      <div className="pp-session">
        <div className="pp-session-grid">
          <div><span>الفتح</span><strong>{fmtDate(session.opened_at)}</strong></div>
          <div><span>الكاشير</span><strong>{session.user?.name}</strong></div>
          <div><span>المستودع</span><strong>{session.warehouse?.name}</strong></div>
          <div><span>الرصيد الافتتاحي</span><strong dir="ltr">{formatDZD(session.opening_cash)}</strong></div>
          <div><span>الفواتير</span><strong>{session.invoices_count}</strong></div>
          <div><span>المرتجعات</span><strong>{session.returns_count}</strong></div>
          <div><span>صافي المبيعات</span><strong dir="ltr">{formatDZD(session.net_sales)}</strong></div>
          <div><span>TVA</span><strong dir="ltr">{formatDZD(session.total_tva)}</strong></div>
          <div><span>الطابع الجبائي</span><strong dir="ltr">{formatDZD(session.total_fiscal_stamp)}</strong></div>
          <div><span>الخصومات</span><strong dir="ltr">{formatDZD(session.total_discount)}</strong></div>
        </div>

        {warehouses.length > 0 && (
          <label className="pp-session-wh">
            <span>المستودع النشط للبيع</span>
            <select
              value={warehouseId ?? ''}
              onChange={(e) => onWarehouseChange(Number(e.target.value))}
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
        )}

        {(session.payments?.length ?? 0) > 0 && (
          <div className="pp-session-pays">
            <div className="pp-session-sec">تفاصيل الدفع</div>
            {session.payments!.map(p => (
              <div key={p.payment_mode_id}>
                <span>{p.payment_mode?.name ?? p.payment_mode_id}</span>
                <strong dir="ltr">{formatDZD(p.amount)}</strong>
                <em>{p.count} عملية</em>
              </div>
            ))}
          </div>
        )}

        <div className="pp-session-close">
          <div className="pp-session-sec">إغلاق الجلسة</div>
          <div className="pp-session-close-expected">
            <span>مجموع الدفعات</span>
            <strong dir="ltr">{formatDZD(totalPayments)}</strong>
          </div>
          <label className="pp-session-field">
            <span>المبلغ النقدي المعدود</span>
            <input
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
            />
          </label>
          <label className="pp-session-field">
            <span>ملاحظة الإغلاق</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="اختياري"
            />
          </label>
          {error && <div className="pp-session-error">{error}</div>}
        </div>
      </div>
      </Modal>

      {reportData && companyInfo && (
        <TemplatePrintModal
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          data={reportData}
          company={companyInfo}
          templates={reportTemplates}
          docTypeCode="RPT"
        />
      )}
    </>
  );
}
