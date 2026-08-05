// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalDashboardPage.tsx — لوحة معلومات الزبون (مُحسّنة)
// ════════════════════════════════════════════════════════════════════════════
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalApi, type PortalOrderStatus } from '@/lib/api/portal/portal';
import {
  fmtMoney, fmtDate,
  StatusBadge, AnimatedCounter, ProgressBar, CreditBar,
  PortalLoading, PortalError,
} from './portalUtils';

const ORDER_STATUS_CLS: Record<PortalOrderStatus, string> = {
  pending:   'badge--gray',
  preparing: 'badge--y',
  confirmed: 'badge--b',
  processed: 'badge--purple',
  shipped:   'badge--z',
  delivered: 'badge--g',
  returned:  'badge--r',
  cancelled: 'badge--gray',
  completed: 'badge--g',
};

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

  const { balance, company, party, month, unpaid_total, recent_documents, recent_payments, orders, recent_orders } = data;
  const sign = balance.signed_balance;
  const paidDocs = recent_documents.filter(d => d.remaining_amount <= 0);
  const unpaidDocs = recent_documents.filter(d => d.remaining_amount > 0);
  const creditLimit = party.credit_limit || 0;
  const creditUsed = Math.abs(sign);
  const openOrders =
    (orders?.preparing ?? 0) +
    (orders?.confirmed ?? 0) +
    (orders?.processed ?? 0) +
    (orders?.shipped ?? 0);

  return (
    <>
      {/* ─── بطاقة الشركة ─── */}
      {company?.name && (
        <div className="portal-card portal-mb-20 portal-card--pad-sm">
          <div className="portal-inline--14">
            <div className="portal-logo portal-logo--sm">
              {(company.name || 'ش').charAt(0)}
            </div>
            <div className="portal-grow">
              <div className="portal-company-name">
                {company.commercial_name || company.name}
              </div>
              <div className="portal-company-sub">
                {[company.nif && `NIF: ${company.nif}`, company.phone, company.email].filter(Boolean).join(' • ') || '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── بطاقات KPI ─── */}
      <div className="portal-kpis">
        <div className="portal-kpi portal-kpi--em">
          <div className="portal-kpi-ic portal-kpi-ic--em"><i className="ti ti-scale" /></div>
          <div>
            <div className="portal-kpi-lb">الرصيد الحالي</div>
            <div className={`portal-kpi-v ${sign < 0 ? 'portal-red' : ''}`}>
              <AnimatedCounter value={sign} />
            </div>
            <div className="portal-kpi-s">
              {balance.balance_type === 'debit' ? 'مدين (بذمتك)' : 'دائن (لك)'}
            </div>
          </div>
        </div>

        <div className="portal-kpi portal-kpi--gold">
          <div className="portal-kpi-ic portal-kpi-ic--gold"><i className="ti ti-clock" /></div>
          <div>
            <div className="portal-kpi-lb">الديون غير المسددة</div>
            <div className="portal-kpi-v"><AnimatedCounter value={unpaid_total} /></div>
            <div className="portal-kpi-s">إجمالي الفواتير غير المسددة</div>
          </div>
        </div>

        <div className="portal-kpi portal-kpi--blue">
          <div className="portal-kpi-ic portal-kpi-ic--blue"><i className="ti ti-calendar-month" /></div>
          <div>
            <div className="portal-kpi-lb">مشتريات الشهر الجاري</div>
            <div className="portal-kpi-v"><AnimatedCounter value={month?.sales_total ?? 0} /></div>
            <div className="portal-kpi-s">{month?.date ? fmtDate(month.date) : '—'}</div>
          </div>
        </div>

        <div className="portal-kpi portal-kpi--red">
          <div className="portal-kpi-ic portal-kpi-ic--red"><i className="ti ti-user" /></div>
          <div>
            <div className="portal-kpi-lb">العميل</div>
            <div className="portal-kpi-v portal-kpi-v--sm">{party.name}</div>
            <div className="portal-kpi-s">
              {[party.nif && `NIF: ${party.nif}`, creditLimit > 0 && `سقف: ${fmtMoney(creditLimit)}`].filter(Boolean).join(' • ') || '—'}
            </div>
          </div>
        </div>

        <div className="portal-kpi portal-kpi--orders">
          <div className="portal-kpi-ic portal-kpi-ic--orders"><i className="ti ti-building-store" /></div>
          <div>
            <div className="portal-kpi-lb">طلبات السلع</div>
            <div className="portal-kpi-v"><AnimatedCounter value={orders?.total ?? 0} /></div>
            <div className={`portal-kpi-s ${openOrders > 0 ? 'portal-kpi-s--gold' : ''}`}>
              {openOrders > 0 ? `${openOrders} طلب قيد المعالجة` : 'لا توجد طلبات قيد المعالجة'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── شريط الائتمان + مقياس الرصيد ─── */}
      {creditLimit > 0 && (
        <div className="portal-card portal-mb-16 portal-card--pad-sm">
          <div className="portal-inline--8 portal-mb-10">
            <i className="ti ti-credit-card portal-em" />
            <span className="portal-sec-title">الاستهلاك الائتماني</span>
          </div>
          <CreditBar used={creditUsed} limit={creditLimit} />
        </div>
      )}

      {/* ─── أزرار الإجراءات السريعة ─── */}
      <div className="portal-actions portal-mb-20">
        <Link to={`${base}/orders`} className="portal-action portal-action--em">
          <i className="ti ti-building-store" />
          اطلب سلعة
        </Link>
        <Link to={`${base}/documents`} className="portal-action">
          <i className="ti ti-file-text" />
          استعرض المستندات
        </Link>
        <Link to={`${base}/statement`} className="portal-action">
          <i className="ti ti-report-money" />
          كشف الحساب
        </Link>
        <Link to={`${base}/payments`} className="portal-action">
          <i className="ti ti-wallet" />
          الدفعات
        </Link>
        <Link to={`${base}/profile`} className="portal-action">
          <i className="ti ti-user-circle" />
          الملف الشخصي
        </Link>
      </div>

      {/* ─── آخر المستندات + آخر الدفعات ─── */}
      <div className="portal-grid-col">

        {/* ─── آخر المستندات ─── */}
        <section className="portal-card">
          <div className="portal-card-hd">
            <h3><i className="ti ti-file-text" /> أحدث المستندات</h3>
            <Link to={`${base}/documents`} className="portal-card-link">
              عرض الكل <i className="ti ti-chevron-left" />
            </Link>
          </div>
          <div className="portal-card-bd portal-card-bd--flush">
            {recent_documents.length === 0 ? (
              <div className="portal-empty">
                <i className="ti ti-file-off" />
                لا توجد مستندات
              </div>
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
                        <td>
                          <Link className="tbl-link" to={`${base}/documents/${d.id}`}>
                            {d.document_number}
                          </Link>
                        </td>
                        <td className="tx-sm">{fmtDate(d.document_date)}</td>
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

        {/* ─── آخر الدفعات ─── */}
        <section className="portal-card">
          <div className="portal-card-hd">
            <h3><i className="ti ti-wallet" /> أحدث الدفعات</h3>
            <Link to={`${base}/payments`} className="portal-card-link">
              عرض الكل <i className="ti ti-chevron-left" />
            </Link>
          </div>
          <div className="portal-card-bd portal-card-bd--flush">
            {recent_payments.length === 0 ? (
              <div className="portal-empty">
                <i className="ti ti-wallet-off" />
                لا توجد دفعات
              </div>
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
                        <td className="tx-sm">{fmtDate(p.payment_date)}</td>
                        <td>{p.payment_mode}</td>
                        <td>
                          {p.direction === 'in'
                            ? <span className="badge badge--g"><i className="ti ti-arrow-down" /> وارد</span>
                            : <span className="badge badge--r"><i className="ti ti-arrow-up" /> صادر</span>}
                        </td>
                        <td className={`num ${p.direction === 'in' ? 'em' : 'ow'}`}>
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

      {/* ─── أحدث طلبات السلع ─── */}
      <section className="portal-card portal-mt-16">
        <div className="portal-card-hd">
          <h3><i className="ti ti-clipboard-list" /> أحدث طلبات السلع</h3>
          <Link to={`${base}/orders`} className="portal-card-link">
            عرض الكل <i className="ti ti-chevron-left" />
          </Link>
        </div>
        <div className="portal-card-bd portal-card-bd--flush">
          {!recent_orders || recent_orders.length === 0 ? (
            <div className="portal-empty">
              <i className="ti ti-clipboard-off" />
              لا توجد طلبات سلع بعد
              <div className="portal-mt-12">
                <Link to={`${base}/orders`} className="portal-btn portal-btn--em portal-btn--sm">
                  <i className="ti ti-plus" /> اطلب سلعة الآن
                </Link>
              </div>
            </div>
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>المرجع</th><th>التاريخ</th><th>المنتجات</th><th>الحالة</th><th>المبلغ (TTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_orders.map((o) => (
                    <tr key={o.id}>
                      <td className="num">{o.reference}</td>
                      <td className="tx-sm">{fmtDate(o.requested_at || o.created_at)}</td>
                      <td>{o.items_count} صنف</td>
                      <td>
                        <span className={`badge ${ORDER_STATUS_CLS[o.status]}`}>{o.status_label}</span>
                      </td>
                      <td className="num">{fmtMoney(o.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ─── ملخص سريع ─── */}
      <div className="portal-card portal-mt-16">
        <div className="portal-card-hd">
          <h3><i className="ti ti-chart-dots" /> ملخص سريع</h3>
        </div>
        <div className="portal-card-bd">
          <div className="portal-sum-grid">
            <div className="portal-sum-item">
              <div className="portal-sum-num portal-em">{recent_documents.length}</div>
              <div className="portal-sum-lbl">إجمالي المستندات</div>
            </div>
            <div className="portal-sum-item">
              <div className="portal-sum-num portal-green">{paidDocs.length}</div>
              <div className="portal-sum-lbl">مستندات مدفوعة</div>
            </div>
            <div className="portal-sum-item">
              <div className="portal-sum-num portal-red">{unpaidDocs.length}</div>
              <div className="portal-sum-lbl">مستندات غير مسددة</div>
            </div>
            <div className="portal-sum-item">
              <div className="portal-sum-num portal-blue">{recent_payments.length}</div>
              <div className="portal-sum-lbl">عدد الدفعات</div>
            </div>
          </div>
          {recent_documents.length > 0 && (
            <div className="portal-sum-ft">
              <div className="portal-sum-ft-row">
                <span className="portal-sum-ft-k">نسبة السداد</span>
                <span className="portal-sum-ft-v">
                  {recent_documents.length > 0 ? Math.round((paidDocs.length / recent_documents.length) * 100) : 0}%
                </span>
              </div>
              <ProgressBar
                value={paidDocs.length}
                max={recent_documents.length}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
