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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to={`${base}/documents`} className="portal-btn" style={{ padding: '8px 10px', borderRadius: 10 }}>
            <i className="ti ti-chevron-right" />
          </Link>
          <DocTypeIcon code={doc.type_code} />
          <div>
            <h2>{doc.document_number}</h2>
            <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 2 }}>{doc.type_name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
      <div className="portal-card" style={{ marginBottom: 16 }}>
        <div className="portal-card-bd">
          <StatusSteps steps={statusSteps} />
        </div>
      </div>

      {/* ─── معلومات المستند ─── */}
      <div className="portal-doc-meta">
        <div className="portal-stmt-item">
          <div className="k">التاريخ</div>
          <div className="v" style={{ fontSize: 13 }}>{fmtDate(doc.document_date)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">تاريخ الاستحقاق</div>
          <div className="v" style={{ fontSize: 13 }}>{doc.due_date ? fmtDate(doc.due_date) : '—'}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">المبلغ الإجمالي (TTC)</div>
          <div className="v">{fmtMoney(doc.net_to_pay)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">المدفوع</div>
          <div className="v" style={{ color: '#059669' }}>{fmtMoney(doc.paid_amount)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">المتبقي</div>
          <div className="v" style={{ color: doc.remaining_amount > 0 ? 'var(--red)' : 'var(--t1)' }}>{fmtMoney(doc.remaining_amount)}</div>
        </div>
      </div>

      {/* ─── شريط السداد ─── */}
      <div className="portal-card" style={{ marginBottom: 20 }}>
        <div className="portal-card-bd">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t2)' }}>
              <i className="ti ti-trending-up" style={{ color: 'var(--em)', marginLeft: 6 }} />
              تقدم السداد
            </span>
            <span style={{
              fontSize: 14, fontWeight: 900, color: isFullyPaid ? '#059669' : isPartial ? 'var(--gold)' : 'var(--red)',
            }}>
              {paidPct}%
            </span>
          </div>
          <ProgressBar
            value={doc.paid_amount}
            max={doc.net_to_pay}
            color={isFullyPaid ? '#059669' : isPartial ? 'var(--gold)' : undefined}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)' }}>مدفوع: {fmtMoney(doc.paid_amount)}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)' }}>الإجمالي: {fmtMoney(doc.net_to_pay)}</span>
          </div>
        </div>
      </div>

      {/* ─── المنتجات ─── */}
      <section className="portal-card portal-sec">
        <div className="portal-card-hd">
          <h3><i className="ti ti-list-details" /> المنتجات ({doc.lines.length})</h3>
        </div>
        {doc.lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 28, color: 'var(--t4)', fontSize: 12.5 }}>
            <i className="ti ti-shopping-cart" style={{ fontSize: 32, opacity: .15, display: 'block', marginBottom: 10 }} />
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
                    <td className="num" style={{ color: 'var(--t4)' }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{l.product_name}</div>
                      {l.ref && <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{l.ref}</div>}
                    </td>
                    <td className="num">
                      {l.quantity}
                      {l.pack_qty && l.pack_qty > 1 ? <span style={{ fontSize: 10.5, color: 'var(--t4)' }}> × {l.pack_qty}</span> : ''}
                    </td>
                    <td className="num">{fmtMoney(l.unit_price_ht)}</td>
                    <td className="num">{l.total_discount_amount > 0 ? <span style={{ color: 'var(--red)' }}>- {fmtMoney(l.total_discount_amount)}</span> : '—'}</td>
                    <td className="num">{l.tva_rate}%</td>
                    <td className="num">{fmtMoney(l.total_ht)}</td>
                    <td className="num" style={{ fontWeight: 800 }}>{fmtMoney(l.total_ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── ملخص المبالغ ─── */}
      <section className="portal-card portal-sec" style={{ marginTop: 20 }}>
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
            <span className="sr-l" style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>الصافي للدفع</span>
            <span className="sr-v num" style={{ color: 'var(--em)', fontSize: 16 }}>{fmtMoney(doc.net_to_pay)}</span>
          </div>
          <div className="sr"><span className="sr-l">المدفوع</span><span className="sr-v num" style={{ color: '#059669' }}>{fmtMoney(doc.paid_amount)}</span></div>
          <div className="sr"><span className="sr-l">المتبقي</span><span className="sr-v num" style={{ color: doc.remaining_amount > 0 ? 'var(--red)' : 'var(--t1)' }}>{fmtMoney(doc.remaining_amount)}</span></div>
          {doc.previous_balance != null && (
            <div className="sr"><span className="sr-l">الرصيد قبل المستند</span><span className="sr-v num">{fmtMoneySigned(doc.previous_balance)}</span></div>
          )}
          {doc.new_balance != null && (
            <div className="sr" style={{ borderBottom: 'none' }}>
              <span className="sr-l" style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>الرصيد بعد المستند</span>
              <span className="sr-v num" style={{ color: doc.new_balance < 0 ? 'var(--red)' : '#059669', fontSize: 16 }}>{fmtMoneySigned(doc.new_balance)}</span>
            </div>
          )}
        </div>
      </section>

      {/* ─── الدفعات المرتبطة ─── */}
      <section className="portal-card portal-sec" style={{ marginTop: 20 }}>
        <div className="portal-card-hd">
          <h3><i className="ti ti-wallet" /> الدفعات المرتبطة ({doc.payments.length})</h3>
        </div>
        {doc.payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 28, color: 'var(--t4)', fontSize: 12.5 }}>
            <i className="ti ti-wallet-off" style={{ fontSize: 32, opacity: .15, display: 'block', marginBottom: 10 }} />
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
                    <td className="num" style={{ color: '#059669' }}>{fmtMoneySigned(p.amount)}</td>
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
