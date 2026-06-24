// ════════════════════════════════════════════════════════════════════════════
// POSPage.tsx — التعديلات المطلوبة لنظام الجلسات
// اجعل ملف POSPage.tsx الكامل يحتوي على هذه الإضافات
// ════════════════════════════════════════════════════════════════════════════

// 1. أضف هذه الـ imports في أعلى الملف:
// ─────────────────────────────────────────────────────────────────────────────
import OpenSessionModal  from '@/pos/components/OpenSessionModal';
import CloseSessionModal from '@/pos/components/CloseSessionModal';
import SessionStatsModal from '@/pos/components/SessionStatsModal';
import {
  useCurrentPosSession,
  useOpenSession,
  useCloseSession,
  useIncrementSession,
  buildIncrementInput,
} from '@/lib/api/endpoints/posSession';
import { useFiscalYears } from '@/lib/api/endpoints/fiscalYears';
// ─────────────────────────────────────────────────────────────────────────────

// 2. داخل POSPage() أضف هذه الأسطر (بعد تعريف slug):
// ─────────────────────────────────────────────────────────────────────────────
const { data: currentSession, isLoading: sessionLoading } = useCurrentPosSession();
const { data: fiscalYearsData }  = useFiscalYears();
const openSessionMut             = useOpenSession();
const closeSessionMut            = useCloseSession(currentSession?.id ?? null);
const incrementMut               = useIncrementSession(currentSession?.id ?? null);
const [showCloseSession, setShowCloseSession] = useState(false);
const [sessionError,     setSessionError]     = useState<string | null>(null);

const fiscalYears = fiscalYearsData?.years ?? [];

const handleOpenSession = async (data: {
  warehouse_id:   number;
  fiscal_year_id: number;
  opening_cash:   number;
  opening_note?:  string;
}) => {
  setSessionError(null);
  try {
    await openSessionMut.mutateAsync(data);
  } catch (e: any) {
    setSessionError(e?.message ?? 'فشل فتح الجلسة');
  }
};

const handleCloseSession = async (data: {
  closing_cash_counted: number;
  closing_note?:        string;
}) => {
  try {
    await closeSessionMut.mutateAsync(data);
    setShowCloseSession(false);
    toast.success('تم إغلاق الجلسة بنجاح');
  } catch (e: any) {
    toast.error(e?.message ?? 'فشل إغلاق الجلسة');
  }
};
// ─────────────────────────────────────────────────────────────────────────────

// 3. في handleCompleteSale — أضف بعد سطر pos.incrementSession(...):
// ─────────────────────────────────────────────────────────────────────────────
if (currentSession?.id) {
  incrementMut.mutate(
    buildIncrementInput({
      items:            currentItems,
      totalHt:          snapshot.totals.total_ht,
      totalTva:         snapshot.totals.total_tva,
      totalFiscalStamp: snapshot.totals.fiscal_stamp,
      totalDiscount:    snapshot.totals.total_discount + invoiceDiscountAmount,
      grandTotal:       snapshot.totals.total_ttc + snapshot.totals.fiscal_stamp,
      payments:         apiPayments.map(p => ({
        payment_mode_id: p.payment_mode_id,
        amount:          p.amount,
      })),
    }),
    // لا نُعطِّل البيع إذا فشل تسجيل الجلسة — silent fail
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// 4. في JSX — أضف مباشرة داخل <div className="pos-wrap ...">
//    قبل أي شيء آخر:
// ─────────────────────────────────────────────────────────────────────────────
{/* جلسة مطلوبة — تظهر هذه النافذة إذا لم تكن هناك جلسة مفتوحة */}
{!sessionLoading && !currentSession && (
  <OpenSessionModal
    warehouses={warehouses ?? []}
    fiscalYears={fiscalYears}
    defaultWarehouseId={defaultWarehouse?.id}
    defaultFiscalYearId={fiscalYear?.id}
    isLoading={openSessionMut.isPending}
    error={sessionError}
    onOpen={handleOpenSession}
  />
)}

{/* نافذة إغلاق الجلسة */}
{showCloseSession && currentSession && (
  <CloseSessionModal
    session={currentSession}
    isLoading={closeSessionMut.isPending}
    error={closeSessionMut.error?.message ?? null}
    onClose={() => setShowCloseSession(false)}
    onConfirm={handleCloseSession}
  />
)}
// ─────────────────────────────────────────────────────────────────────────────

// 5. استبدل modal === 'session' بهذا:
// ─────────────────────────────────────────────────────────────────────────────
{modal === 'session' && currentSession && (
  <SessionStatsModal
    session={currentSession}
    onClose={() => setModal('none')}
    onEndSession={() => {
      setModal('none');
      setShowCloseSession(true);
    }}
  />
)}
// ─────────────────────────────────────────────────────────────────────────────

// 6. في POSTopBar — استبدل sessionInvoices/sessionSales بقيم من currentSession:
// ─────────────────────────────────────────────────────────────────────────────
<POSTopBar
  sessionInvoices={currentSession?.invoices_count ?? 0}
  sessionSales={currentSession?.net_sales ?? 0}
  // ... باقي الـ props كما هي
/>
// ─────────────────────────────────────────────────────────────────────────────

// 7. في api.php — أضف routes الجلسات داخل Route::prefix('{company}'):
// ─────────────────────────────────────────────────────────────────────────────
/*
Route::prefix('pos-sessions')->group(function () {
    Route::get('current',                [PosSessionController::class, 'current']);
    Route::post('/',                     [PosSessionController::class, 'open']);
    Route::post('{session}/increment',   [PosSessionController::class, 'increment']);
    Route::post('{session}/close',       [PosSessionController::class, 'close']);
    Route::get('/',                      [PosSessionController::class, 'index']);
    Route::get('{session}',              [PosSessionController::class, 'show']);
});
*/
// ─────────────────────────────────────────────────────────────────────────────
