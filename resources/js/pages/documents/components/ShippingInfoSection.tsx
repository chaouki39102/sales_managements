import { inputStyle, labelStyle } from './DocumentUIPrimitives';
import type { ShippingInfo } from '../types/document.types';

interface ShippingInfoSectionProps {
  value:       ShippingInfo;
  deliveryDate: string;
  disabled?:   boolean;
  onChange:    (info: ShippingInfo) => void;
  onDeliveryDateChange: (date: string) => void;
}

export function ShippingInfoSection({
  value,
  deliveryDate,
  disabled = false,
  onChange,
  onDeliveryDateChange,
}: ShippingInfoSectionProps) {
  const set = (k: keyof ShippingInfo, v: string) => {
    onChange({ ...value, [k]: v || undefined });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      padding: '12px 14px',
      borderRadius: 'var(--r2)',
      background: 'color-mix(in srgb, var(--blue) 5%, var(--bg2))',
      border: '1px solid color-mix(in srgb, var(--blue) 18%, transparent)',
    }}>
      {/* صف العنوان */}
      <div style={{ gridColumn: 'span 2', fontSize: 11, fontWeight: 700, color: 'var(--blue)',
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <i className="ti ti-truck-delivery" style={{ fontSize: 13 }} />
        معلومات الشحن
      </div>

      {/* تاريخ التسليم */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>تاريخ التسليم</span>
        <input
          type="date"
          style={inputStyle()}
          value={deliveryDate}
          disabled={disabled}
          onChange={(e) => onDeliveryDateChange(e.target.value)}
        />
      </div>

      {/* العنوان */}
      <div style={{ gridColumn: 'span 2' }}>
        <span style={{ ...labelStyle, fontSize: 10 }}>عنوان التسليم</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.address ?? ''}
          disabled={disabled}
          onChange={(e) => set('address', e.target.value)}
          placeholder="العنوان الكامل للتسليم"
        />
      </div>

      {/* وسيلة النقل */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>وسيلة النقل</span>
        <select
          style={{ ...inputStyle(), cursor: disabled ? 'not-allowed' : 'pointer' }}
          value={value.transport_mode ?? ''}
          disabled={disabled}
          onChange={(e) => set('transport_mode', e.target.value)}
        >
          <option value="">— اختر —</option>
          <option value="company">سيارة الشركة</option>
          <option value="external">نقل خارجي</option>
          <option value="client">استلام من الزبون</option>
          <option value="courier">توصيل (كوريير)</option>
        </select>
      </div>

      {/* اسم السائق */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>اسم السائق</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.driver_name ?? ''}
          disabled={disabled}
          onChange={(e) => set('driver_name', e.target.value)}
          placeholder="اسم السائق"
        />
      </div>

      {/* لوحة المركبة */}
      <div>
        <span style={{ ...labelStyle, fontSize: 10 }}>لوحة المركبة</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.vehicle_plate ?? ''}
          disabled={disabled}
          onChange={(e) => set('vehicle_plate', e.target.value)}
          placeholder="رقم اللوحة"
        />
      </div>

      {/* ملاحظات السائق */}
      <div style={{ gridColumn: 'span 2' }}>
        <span style={{ ...labelStyle, fontSize: 10 }}>ملاحظات السائق</span>
        <input
          type="text"
          style={inputStyle()}
          value={value.driver_notes ?? ''}
          disabled={disabled}
          onChange={(e) => set('driver_notes', e.target.value)}
          placeholder="ملاحظات للتوصيل..."
        />
      </div>
    </div>
  );
}
