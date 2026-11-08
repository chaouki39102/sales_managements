// pages/portal/orders-admin/components/StockCell.tsx
import type { PortalAdminStockInfo } from '@/lib/api/endpoints/portalOrders';
import { fmt } from '../ordersAdminUtils';

// ── شارة مخزون السطر (صف واحد مضغوط: متاح بالمستودع / إجمالاً / مطلوب) ──────
export default function StockCell({ stock }: { stock?: PortalAdminStockInfo }) {
  if (!stock) return <span className="poa-stk na"><i className="ti ti-minus" /> —</span>;
  if (stock.available === null) {
    return <span className="poa-stk na"><i className="ti ti-package-off" /> لا يدير مخزوناً</span>;
  }
  const ok = stock.sufficient !== false;
  const okAll = stock.sufficient_all !== false;
  return (
    <div
      className={`poa-stk-c ${ok && okAll ? 'ok' : 'bad'}`}
      title={`بالمستودع ${fmt(stock.available)} · إجمالاً ${fmt(stock.available_all ?? 0)} · مطلوب ${fmt(stock.required)}`}
    >
      <i className={`ti ${ok ? 'ti-box' : 'ti-alert-triangle'}`} />
      <span className="poa-stk-c-avail">{fmt(stock.available)}</span>
      {stock.available_all !== null && stock.available_all !== stock.available && (
        <span className="poa-stk-sub">/ إجمالاً {fmt(stock.available_all)}</span>
      )}
      <span className="poa-stk-sub">· مطلوب {fmt(stock.required)}</span>
    </div>
  );
}
