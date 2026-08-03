// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalPaymentsPage.tsx — قائمة دفعات الزبون (ترحيل)
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import { fmtMoney, fmtDate, DirBadge, Pager, PortalLoading, PortalError, PortalEmpty } from './portalUtils';

export default function PortalPaymentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal', 'payments', page],
    queryFn: () => portalApi.payments(page, 15),
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <PortalLoading />;
  if (isError || !data) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل الدفعات'} />;

  const { data: rows, meta } = data;
  const from = meta.per_page * (meta.current_page - 1) + 1;
  const to = Math.min(meta.per_page * meta.current_page, meta.total);

  return (
    <section className="portal-card">
      <div className="portal-card-hd">
        <h3><i className="ti ti-wallet" /> الدفعات</h3>
      </div>
      {rows.length === 0 ? (
        <PortalEmpty icon="ti-wallet" text="لا توجد دفعات" />
      ) : (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>الرقم</th><th>التاريخ</th><th>الوسيلة</th><th>المرجع</th><th>الاتجاه</th><th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="num">{p.payment_number}</td>
                  <td>{fmtDate(p.payment_date)}</td>
                  <td>{p.payment_mode}</td>
                  <td>{p.reference || '—'}</td>
                  <td><DirBadge direction={p.direction} /></td>
                  <td className="num" style={{ color: p.direction === 'in' ? 'var(--em)' : 'var(--red)' }}>
                    {fmtMoney(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <Pager page={meta.current_page} lastPage={meta.last_page} total={meta.total} from={from} to={to} onChange={setPage} />
      )}
    </section>
  );
}
