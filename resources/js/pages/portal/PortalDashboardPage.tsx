// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalDashboardPage.tsx — لوحة معلومات الزبون
// ════════════════════════════════════════════════════════════════════════════
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import { fmtMoney, fmtMoneySigned, fmtDate, StatusBadge, PortalLoading, PortalError } from './portalUtils';

export default function PortalDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const base = `/portal/${slug}`;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['portal', slug, 'dashboard'],
    queryFn: portalApi.dashboard,
    staleTime: 30_000,
  });

  if (isLoading) return <PortalLoading />;
  if (isError || !data) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل البيانات'} />;

  const { balance, company, party, month, unpaid_total, recent_documents, recent_payments } = data;
  const sign = balance.signed_balance;

  return (
    <>
      {company?.name && (
        <div className="portal-card" style={{ marginBottom: 18, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="portal-logo" style={{ width: 40, height: 40, fontSize: 15 }}>
              {(company.name || 'ش').charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{company.commercial_name || company.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--t4)' }}>
                {[company.nif && `NIF: ${company.nif}`, company.phone, company.email].filter(Boolean).join(' • ') || '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="portal-kpis">
        <div className="portal-kpi">
          <div className="portal-kpi-ic portal-kpi-ic--em"><i className="ti ti-scale" /></div>
          <div>
            <div className="portal-kpi-lb">الرصيد الحالي</div>
            <div className="portal-kpi-v" style={{ color: sign < 0 ? 'var(--red)' : 'var(--t1)' }}>
              {fmtMoneySigned(sign)}
            </div>
            <div className="portal-kpi-s">
              {balance.balance_type === 'debit' ? 'مدين (بذمتك)' : 'دائن (لك)'}
            </div>
          </div>
        </div>

        <div className="portal-kpi">
          <div className="portal-kpi-ic portal-kpi-ic--gold"><i className="ti ti-clock" /></div>
          <div>
            <div className="portal-kpi-lb">الديون غير المسددة</div>
            <div className="portal-kpi-v">{fmtMoney(unpaid_total)}</div>
            <div className="portal-kpi-s">إجمالي الفواتير غير المسددة</div>
          </div>
        </div>

        <div className="portal-kpi">
          <div className="portal-kpi-ic portal-kpi-ic--blue"><i className="ti ti-calendar-month" /></div>
          <div>
            <div className="portal-kpi-lb">مشتريات الشهر الجاري</div>
            <div className="portal-kpi-v">{fmtMoney(month?.sales_total)}</div>
            <div className="portal-kpi-s">{month?.date ? fmtDate(month.date) : '—'}</div>
          </div>
        </div>

        <div className="portal-kpi">
          <div className="portal-kpi-ic portal-kpi-ic--red"><i className="ti ti-user" /></div>
          <div>
            <div className="portal-kpi-lb">العميل</div>
            <div className="portal-kpi-v" style={{ fontSize: 14 }}>{party.name}</div>
            <div className="portal-kpi-s">{[party.nif && `NIF: ${party.nif}`, party.credit_limit > 0 && `سقف ائتمان: ${fmtMoney(party.credit_limit)}`].filter(Boolean).join(' • ') || '—'}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <section className="portal-card">
          <div className="portal-card-hd">
            <h3><i className="ti ti-file-text" /> أحدث المستندات</h3>
            <Link to={`${base}/documents`} style={{ fontSize: 12, color: 'var(--em)', fontWeight: 700, textDecoration: 'none' }}>
              عرض الكل <i className="ti ti-chevron-left" style={{ fontSize: 10 }} />
            </Link>
          </div>
          <div className="portal-card-bd" style={{ padding: 0 }}>
            {recent_documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--t4)', fontSize: 12.5 }}>لا توجد مستندات</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>الرقم</th><th>التاريخ</th><th>النوع</th><th>الحالة</th><th>المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_documents.map((d) => (
                      <tr key={d.id}>
                        <td><Link className="tbl-link" to={`${base}/documents/${d.id}`}>{d.document_number}</Link></td>
                        <td>{fmtDate(d.document_date)}</td>
                        <td>{d.type_name}</td>
                        <td><StatusBadge status={d.status_name} /></td>
                        <td className="num">{fmtMoney(d.net_to_pay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="portal-card">
          <div className="portal-card-hd">
            <h3><i className="ti ti-wallet" /> أحدث الدفعات</h3>
            <Link to={`${base}/payments`} style={{ fontSize: 12, color: 'var(--em)', fontWeight: 700, textDecoration: 'none' }}>
              عرض الكل <i className="ti ti-chevron-left" style={{ fontSize: 10 }} />
            </Link>
          </div>
          <div className="portal-card-bd" style={{ padding: 0 }}>
            {recent_payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--t4)', fontSize: 12.5 }}>لا توجد دفعات</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>الرقم</th><th>التاريخ</th><th>الوسيلة</th><th>الاتجاه</th><th>المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_payments.map((p) => (
                      <tr key={p.id}>
                        <td className="num">{p.payment_number}</td>
                        <td>{fmtDate(p.payment_date)}</td>
                        <td>{p.payment_mode}</td>
                        <td>
                          {p.direction === 'in'
                            ? <span className="badge badge--g"><i className="ti ti-arrow-down" /> وارد</span>
                            : <span className="badge badge--r"><i className="ti ti-arrow-up" /> صادر</span>}
                        </td>
                        <td className="num" style={{ color: p.direction === 'in' ? 'var(--em)' : 'var(--red)' }}>
                          {fmtMoney(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
