// resources/js/pages/pos/POSPage.tsx
// ════════════════════════════════════════════════════════════════════════════
// هذا الملف يُبيِّن التعديلات المطلوبة على POSPage الموجود
// أضف / استبدل الأقسام الموسومة بـ ✅ SESSION
// ════════════════════════════════════════════════════════════════════════════

// ── [1] IMPORTS — أضف هذه ──────────────────────────────────────────────────
import OpenSessionModal  from '@/pos/components/OpenSessionModal';
import CloseSessionModal from '@/pos/components/CloseSessionModal';
import SessionStatsModal from '@/pos/components/SessionStatsModal';
import {
  useCurrentPosSession,
  useOpenSession,
  useCloseSession,
  useIncrementSession,
  buildIncrementInput,
  type PosSession,
} from '@/lib/api/endpoints/posSession';
import { useFiscalYears } from '@/lib/api/endpoints/fiscalYears';

// ── [2] داخل POSPage() — أضف بعد تعريف slug وfiscalYear ────────────────────

/*
  // ✅ SESSION — الجلسة الحالية من DB
  const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
  const { data: fyData }   = useFiscalYears();
  const fiscalYearsList    = fyData?.years ?? [];

  const openSessionMut  = useOpenSession();
  const closeSessionMut = useCloseSession(currentSession?.id ?? null);
  const incrementMut    = useIncrementSession(currentSession?.id ?? null);

  const [showCloseSession, setShowCloseSession] = useState(false);
  const [sessionError,     setSessionError]     = useState<string | null>(null);

  const handleOpenSession = async (data: {
    warehouse_id: number; fiscal_year_id: number;
    opening_cash: number; opening_note?: string;
  }) => {
    setSessionError(null);
    try {
      await openSessionMut.mutateAsync(data);
    } catch (e: any) {
      setSessionError(e?.message ?? 'فشل فتح الجلسة');
    }
  };

  const handleCloseSession = async (data: {
    closing_cash_counted: number; closing_note?: string;
  }) => {
    try {
      await closeSessionMut.mutateAsync(data);
      setShowCloseSession(false);
      toast.success('تم إغلاق الجلسة بنجاح');
    } catch (e: any) {
      toast.error(e?.message ?? 'فشل إغلاق الجلسة');
    }
  };
*/

// ── [3] في handleCompleteSale — استبدل pos.incrementSession(...) بهذا ────────

/*
  // ✅ SESSION — احذف: pos.incrementSession(...)
  // ✅ SESSION — أضف بعد documentsApi.create() ينجح:

  if (currentSession?.id) {
    incrementMut.mutate(
      buildIncrementInput({
        items:            currentItems,
        totalHt:          snapshot.totals.total_ht,
        totalTva:         snapshot.totals.total_tva,
        totalFiscalStamp: snapshot.totals.fiscal_stamp,
        totalDiscount:    snapshot.totals.total_discount,
        grandTotal:       snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp,
        payments: apiPayments.map(p => ({
          payment_mode_id: p.payment_mode_id,
          amount:          p.amount,
        })),
      }),
    );
  }
*/

// ── [4] JSX — أضف مباشرة أول شيء داخل <div className="pos-wrap ..."> ───────

/*
  // ✅ SESSION — نافذة فتح الجلسة (إلزامية)
  {!sessionLoading && !currentSession && (
    <OpenSessionModal
      warehouses={warehouses ?? []}
      fiscalYears={fiscalYearsList}
      defaultWarehouseId={defaultWarehouse?.id}
      defaultFiscalYearId={fiscalYear?.id}
      isLoading={openSessionMut.isPending}
      error={sessionError}
      onOpen={handleOpenSession}
    />
  )}

  // ✅ SESSION — نافذة إغلاق الجلسة
  {showCloseSession && currentSession && (
    <CloseSessionModal
      session={currentSession}
      isLoading={closeSessionMut.isPending}
      error={closeSessionMut.error?.message ?? null}
      onClose={() => setShowCloseSession(false)}
      onConfirm={handleCloseSession}
    />
  )}
*/

// ── [5] JSX — استبدل modal === 'session' بهذا ──────────────────────────────

/*
  // ✅ SESSION
  {modal === 'session' && currentSession && (
    <SessionStatsModal
      session={currentSession}
      onClose={() => setModal('none')}
      onEndSession={() => { setModal('none'); setShowCloseSession(true); }}
    />
  )}
*/

// ── [6] JSX — في POSTopBar استبدل sessionInvoices/sessionSales ─────────────

/*
  <POSTopBar
    // ✅ SESSION — استبدل:
    //   sessionInvoices={pos.sessionInvoices}
    //   sessionSales={pos.sessionSales}
    // بـ:
    session={currentSession}
    // ... باقي الـ props كما هي
    onSettings={() => setModal('settings')}
  />
*/

// ── [7] api.php — أضف داخل Route::prefix('{company}') ─────────────────────

/*
  Route::prefix('pos-sessions')->group(function () {
      Route::get('current',              [PosSessionController::class, 'current']);
      Route::post('/',                   [PosSessionController::class, 'open']);
      Route::post('{session}/increment', [PosSessionController::class, 'increment']);
      Route::post('{session}/close',     [PosSessionController::class, 'close']);
      Route::get('/',                    [PosSessionController::class, 'index']);
      Route::get('{session}',            [PosSessionController::class, 'show']);
  });
*/

// ── [8] POSKioskPage — نفس التعديلات [2] و[3] و[4] ─────────────────────────
// استبدل pos.incrementSession في handleCompleteSale بـ incrementMut.mutate(...)
// أضف OpenSessionModal بنفس الطريقة

export {}; // يمنع خطأ TypeScript لملف بدون export حقيقي
