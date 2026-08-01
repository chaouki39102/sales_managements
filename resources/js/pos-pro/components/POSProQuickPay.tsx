// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProQuickPay.tsx
//
// صف الدفع السريع — أزرار ضغطة واحدة بجانب الإجمالي: "نقداً" و"بطاقة".
// كل زر يبيع الفاتورة كاملة بوسيلة الدفع المحددة دون فتح مودال الدفع
// (نفس سلوك quickCashAction: silent / preview / print).
// ════════════════════════════════════════════════════════════════════════════
import type { PaymentMode } from '@/types';

interface Props {
  cashMode: PaymentMode | null;
  cardMode: PaymentMode | null;
  disabled: boolean;
  onCash:   () => void;
  onCard:   () => void;
}

export default function POSProQuickPay({ cashMode, cardMode, disabled, onCash, onCard }: Props) {
  return (
    <div className="pp-quickpay">
      <button
        type="button"
        className="pp-quickpay-btn pp-quickpay-btn--cash"
        onClick={onCash}
        disabled={disabled || !cashMode}
        title={cashMode ? `بيع كامل بالدفع النقدي (${cashMode.name})` : 'لا توجد وسيلة دفع نقدية'}
      >
        <i className="ti ti-bolt" />
        <span>نقداً</span>
        <em>{cashMode?.name ?? '—'}</em>
      </button>
      <button
        type="button"
        className="pp-quickpay-btn pp-quickpay-btn--card"
        onClick={onCard}
        disabled={disabled || !cardMode}
        title={cardMode ? `بيع كامل بالبطاقة (${cardMode.name})` : 'لا توجد وسيلة دفع بالبطاقة'}
      >
        <i className="ti ti-credit-card" />
        <span>بطاقة</span>
        <em>{cardMode?.name ?? '—'}</em>
      </button>
    </div>
  );
}
