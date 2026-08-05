// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalDocumentDetailPage.tsx — تفاصيل مستند (مُحسّن)
// ════════════════════════════════════════════════════════════════════════════
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import {
  fmtMoney, fmtMoneySigned, fmtDate,
  StatusBadge, ProgressBar, StatusSteps, DocTypeIcon,
  PortalLoading, PortalError,
} from './portalUtils';

export default function PortalDocumentDetailPage() {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const docId = Number(id);
  const base = `/portal/${slug}`;

  const { data: doc, isLoading, isError, error } = useQuery({
    queryKey: ['portal', slug, 'document', docId],
    queryFn: () => portalApi.document(docId),
    enabled: !!docId && Number.isFinite(docId),
  });

  if (isLoading) return <PortalLoading />;
  if (isError || !doc) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل المستند'} />;

  const paidPct = doc.net_to_pay > 0 ? Math.round((doc.paid_amount / doc.net_to_pay) * 100) : (doc.paid_amount > 0 ? 100 : 0);
  const isReturned = doc.type_code === 'AV';
  const isFullyPaid = doc.remaining_amount <= 0;
  const isPartial = doc.paid_amount > 0 && !isFullyPaid;

  const statusSteps = [
    { label: 'إنشاء', done: true },
    { label: 'تأكيد', done: !isReturned },
    { label: isFullyPaid ? 'سداد كامل' : isPartial ? 'سداد جزئي' : 'بانتظار السداد', done: isFullyPaid, active: isPartial },
  ];

  return (
    <>
      {/* ─── رأس المستند ─── */}
      <div className="portal-doc-hd">
        <div className="portal-inline--14">
          <Link to={`${base}/documents`} className="portal-btn portal-btn--icon">
            <i className="ti ti-chevron-right" />
          </Link>
          <DocTypeIcon code={doc.type_code} />
          <div>
            <h2>{doc.document_number}</h2>
            <div className="portal-doc-sub">{doc.type_name}</div>
          </div>
        </div>
        <div className="portal-inline">
          <StatusBadge status={doc.status_name} />
          <button
            className="portal-print-btn"
            onClick={() => window.print()}
          >
            <i className="ti ti-printer" />
            طباعة
          </button>
        </div>
      </div>

      {/* ─── خطوات الحالة ─── */}
      <div className="portal-card portal-mb-16">
        <div className="portal-card-bd">
          <StatusSteps steps={statusSteps} />
        </div>
      </div>

      {/* ─── معلومات المستند ─── */}
      <div className="portal-doc-meta">
        <div className="portal-stmt-item">
          <div className="k">التاريخ</div>
          <div className="v md">{fmtDate(doc.document_date)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">تاريخ الاستحقاق</div>
          <div className="v md">{doc.due_date ? fmtDate(doc.due_date) : '—'}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">المبلغ الإجمالي (TTC)</div>
          <div className="v">{fmtMoney(doc.net_to_pay)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">المدفوع</div>
          <div className="v ok">{fmtMoney(doc.paid_amount)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">المتبقي</div>
          <div className={`v ${doc.remaining_amount > 0 ? 'ow' : 't1'}`}>{fmtMoney(doc.remaining_amount)}</div>
        </div>
      </div>

      {/* ─── شريط السداد ─── */}
      <div className="portal-card portal-mb-20">
        <div className="portal-card-bd">
          <div className="portal-between portal-mb-8">
            <span className="portal-doc-prog-title">
              <i className="ti ti-trending-up portal-em" />
              تقدم السداد
            </span>
            <span className={`portal-doc-prog-pct ${isFullyPaid ? 'portal-green' : isPartial ? 'portal-gold' : 'portal-red'}`}>
              {paidPct}%
            </span>
          </div>
          <ProgressBar
            value={doc.paid_amount}
            max={doc.net_to_pay}
            color={isFullyPaid ? '#059669' : isPartial ? 'var(--gold)' : undefined}
          />
          <div className="portal-between portal-mt-6">
            <span className="portal-doc-prog-meta">مدفوع: {fmtMoney(doc.paid_amount)}</span>
            <span className="portal-doc-prog-meta">الإجمالي: {fmtMoney(doc.net_to_pay)}</span>
          </div>
        </div>
      </div>

      {/* ─── المنتجات ─── */}
      <section className="portal-card portal-sec">
        <div className="portal-card-hd">
          <h3><i className="ti ti-list-details" /> المنتجات ({doc.lines.length})</h3>
        </div>
        {doc.lines.length === 0 ? (
          <div className="portal-empty-inline">
            <i className="ti ti-shopping-cart portal-empty-ic" />
            لا توجد سطور
          </div>
        ) : (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>#</th><th>المنتج</th><th>الكمية</th><th>السعر HT</th><th>الخصم</th><th>TVA %</th><th>المجموع HT</th><th>المجموع TTC</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((l, i) => (
                  <tr key={l.id}>
                    <td className="num ix">{i + 1}</td>
                    <td>
                      <div className="b">{l.product_name}</div>
                      {l.ref && <div className="sm">{l.ref}</div>}
                    </td>
                    <td className="num">
                      {l.quantity}
                      {l.pack_qty && l.pack_qty > 1 ? <span className="sm"> × {l.pack_qty}</span> : ''}
                    </td>
                    <td className="num">{fmtMoney(l.unit_price_ht)}</td>
                    <td className="num">{l.total_discount_amount > 0 ? <span className="ow">- {fmtMoney(l.total_discount_amount)}</span> : '—'}</td>
                    <td className="num">{l.tva_rate}%</td>
                    <td className="num">{fmtMoney(l.total_ht)}</td>
                    <td className="num bold">{fmtMoney(l.total_ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── ملخص المبالغ ─── */}
      <section className="portal-card portal-sec portal-mt-20">
        <div className="portal-card-hd">
          <h3><i className="ti ti-calculator" /> ملخص المبالغ</h3>
        </div>
        <div className="portal-card-bd">
          <div className="sr"><span className="sr-l">المجموع قبل الضريبة (HT)</span><span className="sr-v num">{fmtMoney(doc.total_ht)}</span></div>
          <div className="sr"><span className="sr-l">الخصم</span><span className="sr-v num">{fmtMoney(doc.total_discount)}</span></div>
          <div className="sr"><span className="sr-l">الضريبة (TVA)</span><span className="sr-v num">{fmtMoney(doc.total_tva)}</span></div>
          {doc.total_stamp > 0 && (
            <div className="sr"><span className="sr-l">الطابع الجبائي</span><span className="sr-v num">{fmtMoney(doc.total_stamp)}</span></div>
          )}
          <div className="sr portal-sr-total">
            <span className="sr-l total">الصافي للدفع</span>
            <span className="sr-v num total">{fmtMoney(doc.net_to_pay)}</span>
          </div>
          <div className="sr"><span className="sr-l">المدفوع</span><span className="sr-v num ok">{fmtMoney(doc.paid_amount)}</span></div>
          <div className="sr"><span className="sr-l">المتبقي</span><span className={`sr-v num ${doc.remaining_amount > 0 ? 'ow' : 't1'}`}>{fmtMoney(doc.remaining_amount)}</span></div>
          {doc.previous_balance != null && (
            <div className="sr"><span className="sr-l">الرصيد قبل المستند</span><span className="sr-v num">{fmtMoneySigned(doc.previous_balance)}</span></div>
          )}
          {doc.new_balance != null && (
            <div className="sr">
              <span className="sr-l total">الرصيد بعد المستند</span>
              <span className={`sr-v num total ${doc.new_balance < 0 ? 'ow' : 'ok'}`}>{fmtMoneySigned(doc.new_balance)}</span>
            </div>
          )}
        </div>
      </section>

      {/* ─── الدفعات المرتبطة ─── */}
      <section className="portal-card portal-sec portal-mt-20">
        <div className="portal-card-hd">
          <h3><i className="ti ti-wallet" /> الدفعات المرتبطة ({doc.payments.length})</h3>
        </div>
        {doc.payments.length === 0 ? (
          <div className="portal-empty-inline">
            <i className="ti ti-wallet-off portal-empty-ic" />
            لا توجد دفعات مرتبطة
          </div>
        ) : (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>التاريخ</th><th>الوسيلة</th><th>المرجع</th><th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {doc.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.date)}</td>
                    <td>{p.payment_mode}</td>
                    <td>{p.reference || '—'}</td>
                    <td className="num pos">{fmtMoneySigned(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
