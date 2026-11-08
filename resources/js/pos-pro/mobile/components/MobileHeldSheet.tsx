// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/components/MobileHeldSheet.tsx — Sheet السلال المعلقة
// ════════════════════════════════════════════════════════════════════════════
import type { PosProState } from '@/pos-pro/hooks/usePosProDiscounts';
import { money } from '../mobileFormat';
import PPMSheet from './PPMSheet';

export interface MobileHeldSheetProps {
  open: boolean;
  onClose: () => void;
  heldCarts: PosProState['heldCarts'];
  onRestore: (id: string) => void;
}

export default function MobileHeldSheet({ open, onClose, heldCarts, onRestore }: MobileHeldSheetProps) {
  return (
    <PPMSheet
      open={open}
      title="سلال معلقة"
      onClose={onClose}
    >
      <div className="ppm-held-body">
        {heldCarts.length === 0 ? (
          <div className="ppm-held-empty">
            <i className="ti ti-basket-pause" />
            <span>لا توجد سلال معلقة</span>
          </div>
        ) : (
          heldCarts.map((hc) => (
            <div key={hc.id} className="ppm-held-row">
              <div className="ppm-info">
                <span className="ppm-n">{hc.label ?? 'سلة'}</span>
                <span className="ppm-s">
                  {hc.items?.length ?? 0} أصناف — {money(hc.totals?.total_ttc ?? 0)} دج
                </span>
              </div>
              <button
                onClick={() => onRestore(hc.id)}
              >
                <i className="ti ti-refresh" /> استرجاع
              </button>
            </div>
          ))
        )}
      </div>
    </PPMSheet>
  );
}
