// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/components/MobileCartList.tsx — قائمة السلة (واجهة الهاتف)
// ════════════════════════════════════════════════════════════════════════════
import type { CartItem } from '@/types';
import CartLine from './CartLine';

export interface MobileCartListProps {
  items: CartItem[];
  justAddedId: string | null;
  onClear: () => void;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onDiscount: (id: string, pct: number) => void;
  onDiscountAmount: (id: string, amount: number) => void;
}

export default function MobileCartList({
  items, justAddedId, onClear, onRemove, onUpdateQty, onDiscount, onDiscountAmount,
}: MobileCartListProps) {
  return (
    <div className="ppm-cart">
      <div className="ppm-cart-hd">
        <h1>السلة</h1>
        {items.length > 0 && (
          <div className="ppm-c-actions">
            <span className="ppm-count">{items.length} أصناف</span>
            <button
              className="ppm-clear"
              onClick={onClear}
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        )}
      </div>

      <div className="ppm-cart-scroll">
        {items.length === 0 ? (
          <div className="ppm-cart-empty">
            <i className="ti ti-basket-off" />
            <span className="ppm-t">السلة فارغة</span>
            <span className="ppm-s">اضغط «منتجات» لإضافة أصناف</span>
          </div>
        ) : (
          items.map((item) => (
            <CartLine
              key={item.id}
              item={item}
              isJustAdded={item.id === justAddedId}
              stockBadge={null}
              onRemove={() => onRemove(item.id)}
              onQtyUp={() => onUpdateQty(item.id, item.quantity + 1)}
              onQtyDown={() => {
                if (item.quantity <= 1) onRemove(item.id);
                else onUpdateQty(item.id, item.quantity - 1);
              }}
              onDiscount={onDiscount}
              onDiscountAmount={onDiscountAmount}
            />
          ))
        )}
      </div>
    </div>
  );
}
