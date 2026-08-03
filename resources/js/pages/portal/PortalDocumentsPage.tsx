// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalDocumentsPage.tsx — قائمة مستندات الزبون (ترحيل)
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import { fmtMoney, fmtDate, StatusBadge, Pager, PortalLoading, PortalError, PortalEmpty } from './portalUtils';

export default function PortalDocumentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal', 'documents', page],
    queryFn: () => portalApi.documents(page, 15),
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <PortalLoading />;
  if (isError || !data) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل المستندات'} />;

  const { data: rows, meta } = data;
  const from = meta.per_page * (meta.current_page - 1) + 1;
  const to = Math.min(meta.per_page * meta.current_page, meta.total);

  return (
    <section className="portal-card">
      <div className="portal-card-hd">
        <h3><i className="ti ti-file-text" /> المستندات</h3>
      </div>
      {rows.length === 0 ? (
        <PortalEmpty icon="ti-file-text" text="لا توجد مستندات" />
      ) : (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>الرقم</th><th>التاريخ</th><th>النوع</th><th>الاستحقاق</th><th>الحالة</th><th>المبلغ (TTC)</th><th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td><Link className="tbl-link" to={`/portal/documents/${d.id}`}>{d.document_number}</Link></td>
                  <td>{fmtDate(d.document_date)}</td>
                  <td>{d.type_name}</td>
                  <td>{d.due_date ? fmtDate(d.due_date) : '—'}</td>
                  <td><StatusBadge status={d.status_name} /></td>
                  <td className="num">{fmtMoney(d.net_to_pay)}</td>
                  <td className="num">{fmtMoney(d.remaining_amount)}</td>
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
