// pages/documents/quick-sale/QuickSaleTopFields.tsx
// الصف الأول: الزبون + التاريخ + المستودع
import SearchSelect from './SearchSelect';
import ErrMsg from './ErrMsg';
import { lblStyle, inpStyle } from './quickSale.styles';

interface QuickSaleTopFieldsProps {
  parties: Record<string, unknown>[];
  partyId: string;
  setPartyId: (id: string) => void;
  getPartyLabel: (p: Record<string, unknown>) => string;
  docDate: string;
  setDocDate: (d: string) => void;
  warehouseId: string;
  setWarehouseId: (id: string) => void;
  warehouses: Record<string, unknown>[];
  errors: Record<string, string>;
  isPending: boolean;
}

export default function QuickSaleTopFields({
  parties, partyId, setPartyId, getPartyLabel, docDate, setDocDate,
  warehouseId, setWarehouseId, warehouses, errors, isPending,
}: QuickSaleTopFieldsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      <div>
        <div style={lblStyle}>الزبون</div>
        <SearchSelect
          items={parties as any}
          value={partyId}
          onChange={setPartyId}
          getLabel={getPartyLabel as any}
          placeholder="— بيع نقدي —"
          disabled={isPending}
        />
      </div>
      <div>
        <div style={lblStyle}>التاريخ</div>
        <input
          type="date"
          value={docDate}
          onChange={e => setDocDate(e.target.value)}
          style={inpStyle()}
          disabled={isPending}
        />
      </div>
      <div>
        <div style={lblStyle}>
          المستودع <span style={{ color: 'var(--red)' }}>*</span>
        </div>
        <select
          value={warehouseId}
          onChange={e => setWarehouseId(e.target.value)}
          style={inpStyle(!!errors.warehouse_id)}
          disabled={isPending}
        >
          <option value="">— اختر —</option>
          {warehouses.map(w => (
            <option key={String(w.id)} value={String(w.id)}>
              {String(w.name)}
              {w.is_default ? ' ★' : ''}
            </option>
          ))}
        </select>
        {errors.warehouse_id && <ErrMsg msg={errors.warehouse_id} />}
      </div>
    </div>
  );
}
