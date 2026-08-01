// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProRail.tsx
//
// شريط الإجراءات الرأسي — يمين صفحة POS PRO (الأول في ترتيب DOM فيقف يمين
// RTL). يضم الإجراءات الأساسية للكاشير:
//   • منتجات      — فتح منتقي المنتجات (زر رئيسي كبير).
//   • الدفع (Pay) — فتح مودال الدفع مع الزبون.
//   • دفع سريع    — زر ذهبي: بيع نقدي بضغطة واحدة بدون مودال.
//   • فتح السلة   — تمرير إلى السلة (اختصار تمرير عند السلات الطويلة).
// ════════════════════════════════════════════════════════════════════════════
interface Props {
  canSell:      boolean;
  isBusy:       boolean;
  onOpenProducts: () => void;
  onPay:        () => void;
  onQuickPay:   () => void;
  onSession:    () => void;
  sessionAvailable: boolean;
  onHold:       () => void;
  onHeld:       () => void;
  heldCount:    number;
  onReturns:    () => void;
  onHelp:       () => void;
  onScrollToCart: () => void;
  onManual:     () => void;
  onSessionInvoices: () => void;
  onFullscreen: () => void;
  onOpenDrawer: () => void;
  onSettings:   () => void;
}

export default function POSProRail({
  canSell, isBusy, onOpenProducts, onPay, onQuickPay, onSession, sessionAvailable,
  onHold, onHeld, heldCount, onReturns, onHelp, onScrollToCart,
  onManual, onSessionInvoices, onFullscreen, onOpenDrawer, onSettings,
}: Props) {
  return (
    <aside className="pp-rail">
      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--primary"
        onClick={onOpenProducts}
      >
        <i className="ti ti-package" />
        <span>المنتجات</span>
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--pay"
        onClick={onPay}
        disabled={!canSell || isBusy}
        title={canSell ? 'فتح نافذة الدفع' : 'أضف منتجات أولاً'}
      >
        <i className="ti ti-cash-register" />
        <span>الدفع</span>
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--gold"
        onClick={onQuickPay}
        disabled={!canSell || isBusy}
        title="بيع نقدي بضغطة واحدة"
      >
        <i className="ti ti-bolt" />
        <span>دفع سريع</span>
      </button>

      <div className="pp-rail-sep" />

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost"
        onClick={onManual}
        title="إضافة صنف يدوي بدون منتج"
      >
        <i className="ti ti-square-plus" />
        <span>يدوي</span>
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost"
        onClick={onHold}
        disabled={!canSell}
        title="تعليق الفاتورة الحالية"
      >
        <i className="ti ti-clock-pause" />
        <span>تعليق</span>
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost pp-rail-btn--badge"
        onClick={onHeld}
        title="الفواتير المعلقة"
      >
        <i className="ti ti-list-check" />
        <span>المعلقة</span>
        {heldCount > 0 && <em className="pp-rail-badge">{heldCount}</em>}
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost"
        onClick={onReturns}
        title="مرتجع من فاتورة"
      >
        <i className="ti ti-receipt-refund" />
        <span>مرتجع</span>
      </button>

      <div className="pp-rail-sep" />

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost"
        onClick={onSession}
        disabled={!sessionAvailable}
        title={sessionAvailable ? 'الجلسة الحالية' : 'لا توجد جلسة مفتوحة'}
      >
        <i className="ti ti-report-money" />
        <span>الجلسة</span>
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost"
        onClick={onSessionInvoices}
        disabled={!sessionAvailable}
        title="فواتير الجلسة الحالية"
      >
        <i className="ti ti-receipt-2" />
        <span>فواتير الجلسة</span>
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost"
        onClick={onScrollToCart}
        title="مرّر إلى السلة"
      >
        <i className="ti ti-shopping-cart-down" />
        <span>السلة</span>
      </button>

      <div className="pp-rail-sep" />

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost"
        onClick={onOpenDrawer}
        title="فتح درج النقود"
      >
        <i className="ti ti-cash" />
        <span>الدرج</span>
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost"
        onClick={onFullscreen}
        title="ملء الشاشة"
      >
        <i className="ti ti-arrows-maximize" />
        <span>ملء الشاشة</span>
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost"
        onClick={onSettings}
        title="إعدادات نقطة البيع"
      >
        <i className="ti ti-settings" />
        <span>الإعدادات</span>
      </button>

      <button
        type="button"
        className="pp-rail-btn pp-rail-btn--ghost pp-rail-btn--help"
        onClick={onHelp}
        title="تخصيص الاختصارات (F1)"
      >
        <i className="ti ti-keyboard" />
        <span>مساعدة</span>
      </button>

      {isBusy && (
        <div className="pp-rail-busy">
          <i className="ti ti-loader animate-spin" />
        </div>
      )}
    </aside>
  );
}
