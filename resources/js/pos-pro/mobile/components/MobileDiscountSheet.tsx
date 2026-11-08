// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/components/MobileDiscountSheet.tsx — Sheet خصم الفاتورة
// ════════════════════════════════════════════════════════════════════════════
import { money } from '../mobileFormat';
import PPMSheet from './PPMSheet';

export interface MobileDiscountSheetProps {
  open: boolean;
  onClose: () => void;
  discMode: 'pct' | 'amount';
  setDiscMode: (m: 'pct' | 'amount') => void;
  discValue: string;
  setDiscValue: (v: string) => void;
  invDiscPct: number;
  invDisc: number;
  onConfirm: () => void;
  onRemove: () => void;
}

export default function MobileDiscountSheet({
  open, onClose, discMode, setDiscMode, discValue, setDiscValue, invDiscPct, invDisc, onConfirm, onRemove,
}: MobileDiscountSheetProps) {
  return (
    <PPMSheet
      open={open}
      title="خصم الفاتورة"
      onClose={onClose}
    >
      <div className="ppm-disc-body">
        <div className="ppm-disc-toggle">
          <button className={discMode === 'pct' ? 'on' : ''} onClick={() => setDiscMode('pct')}>
            <i className="ti ti-percentage" /> نسبة %
          </button>
          <button className={discMode === 'amount' ? 'on' : ''} onClick={() => setDiscMode('amount')}>
            <i className="ti ti-currency-dinar" /> مبلغ دج
          </button>
        </div>
        <div className="ppm-disc-presets">
          {[5, 10, 15, 20, 30, 50].map((p) => (
            <button key={p} className={invDiscPct === p ? 'on' : ''} onClick={() => setDiscValue(String(p))}>
              {p}%
            </button>
          ))}
        </div>
        <div className="ppm-disc-custom">
          <i className="ti ti-edit" />
          <input
            inputMode="decimal"
            placeholder={discMode === 'pct' ? 'نسبة مئوية 0-100' : 'المبلغ بالدينار'}
            value={discValue}
            onChange={(e) => setDiscValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); }}
          />
        </div>
        {invDiscPct > 0 && (
          <button className="ppm-disc-apply danger" onClick={onRemove}>
            <i className="ti ti-trash" /> إزالة الخصم الحالي ({invDiscPct}% / {money(invDisc)})
          </button>
        )}
        <button className="ppm-disc-apply" onClick={onConfirm}>
          تطبيق الخصم
        </button>
      </div>
    </PPMSheet>
  );
}
