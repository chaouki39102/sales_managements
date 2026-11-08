// ════════════════════════════════════════════════════════════════════════════
// pos-pro/mobile/components/CustomerPreview.tsx
// CustomerPreview — بطاقة الزبون المحدد حالياً
// ════════════════════════════════════════════════════════════════════════════
import { money } from '../mobileFormat';

export default function CustomerPreview({
  name,
  phone,
  balance,
  isDebtor,
}: {
  name: string;
  phone?: string | null;
  balance: number;
  isDebtor: boolean;
}) {
  return (
    <div className={`ppm-c-avatar${isDebtor ? ' debtor' : ''}`}>
      <span className="ppm-c-avatar-ic"><i className="ti ti-user" /></span>
      <div className="ppm-c-info">
        <span className="ppm-c-name">{name}</span>
        {phone && <span className="ppm-c-phone">{phone}</span>}
      </div>
      <div className="ppm-c-balance">
        <span className="ppm-l">الرصيد</span>
        <span className={`ppm-v ppm-mono${isDebtor ? ' debtor' : ''}`}>{money(balance)} دج</span>
      </div>
    </div>
  );
}
