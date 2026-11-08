// pages/portal/orders-admin/components/OrderItemsTable.tsx
// Read-only order lines table with per-line stock.
import SimpleTable from '@/components/ui/SimpleTable';
import type { PortalAdminOrderItem } from '@/lib/api/endpoints/portalOrders';
import { fmt } from '../ordersAdminUtils';
import type { WithLoadedOrder } from '../hooks/useAdminOrderDetail';
import StockCell from './StockCell';

export default function OrderItemsTable(props: WithLoadedOrder) {
  const {
    order,
    stockByLine,
  } = props;

  return (
    <div className="poa-sec">
      <div className="poa-sec-t"><i className="ti ti-list-details" /> المنتجات ({order.items_count})</div>
      <SimpleTable
        rowKey={(r) => `${r.product_id}-${r.line_id}`}
        emptyText="لا توجد منتجات"
        columns={[
          {
            key: 'product_name', label: 'المنتج',
            render: (_v, row) => {
              const it = row as PortalAdminOrderItem;
              return (
                <div>
                  <div className="poa-item-name">{it.product_name}</div>
                  {it.product_ref && <div className="poa-item-ref">{it.product_ref}</div>}
                </div>
              );
            },
          },
          {
            key: 'quantity', label: 'الكمية', align: 'center',
            render: (_v, row) => {
              const it = row as PortalAdminOrderItem;
              return (
                <span className="poa-bold">
                  {it.quantity}
                  {it.unit_name ? ` ${it.unit_name}` : ''}
                  {it.pack_qty > 1 ? <span className="poa-pack-em"> × {it.pack_qty}</span> : null}
                </span>
              );
            },
          },
          { key: 'unit_price_ht', label: 'سعر HT', align: 'end', render: (v) => fmt(Number(v)) },
          {
            key: 'tva_rate', label: 'TVA', align: 'center',
            render: (_v, row) => {
              const it = row as PortalAdminOrderItem;
              const live = it.tva_rate_live ?? it.tva_rate ?? 0;
              const exempt = !!order?.party?.is_tva_exempt && live > (it.tva_rate ?? 0);
              return (
                <span className="poa-tva-cell">
                  <span>{live}%</span>
                  {exempt && (
                    <span className="poa-exempt" title={`معفى جبائياً — نُطبق 0% على هذا الزبون`}>معفى</span>
                  )}
                </span>
              );
            },
          },
          { key: 'total_ttc', label: 'المجموع TTC', align: 'end', render: (v) => <b>{fmt(Number(v))}</b> },
          {
            key: 'stock', label: 'المخزون', align: 'center',
            render: (_v, row) => <StockCell stock={stockByLine.get((row as PortalAdminOrderItem).line_id)} />,
          },
        ]}
        data={order.lines ?? []}
      />
    </div>
  );
}
