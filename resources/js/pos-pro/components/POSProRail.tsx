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
  onScrollToCart: () => void;
}

export default function POSProRail({
  canSell, isBusy, onOpenProducts, onPay, onQuickPay, onSession, sessionAvailable, onScrollToCart,
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
        onClick={onScrollToCart}
        title="مرّر إلى السلة"
      >
        <i className="ti ti-shopping-cart-down" />
        <span>السلة</span>
      </button>

      {isBusy && (
        <div className="pp-rail-busy">
          <i className="ti ti-loader animate-spin" />
        </div>
      )}
    </aside>
  );
}
