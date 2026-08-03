// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalDocumentDetailPage.tsx — تفاصيل مستند (سطور + دفعات)
// ════════════════════════════════════════════════════════════════════════════
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';
import { fmtMoney, fmtMoneySigned, fmtDate, StatusBadge, PortalLoading, PortalError } from './portalUtils';

export default function PortalDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const docId = Number(id);

  const { data: doc, isLoading, isError, error } = useQuery({
    queryKey: ['portal', 'document', docId],
    queryFn: () => portalApi.document(docId),
    enabled: !!docId && Number.isFinite(docId),
  });

  if (isLoading) return <PortalLoading />;
  if (isError || !doc) return <PortalError message={error instanceof Error ? error.message : 'تعذر تحميل المستند'} />;

  return (
    <>
      <div className="portal-doc-hd">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/portal/documents" className="portal-btn" style={{ padding: '7px 10px' }}>
            <i className="ti ti-chevron-right" />
          </Link>
          <div>
            <h2>{doc.document_number}</h2>
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>{doc.type_name}</div>
          </div>
        </div>
        <StatusBadge status={doc.status_name} />
      </div>

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
          <div className="v" style={{ color: 'var(--em)' }}>{fmtMoney(doc.paid_amount)}</div>
        </div>
        <div className="portal-stmt-item">
          <div className="k">المتبقي</div>
          <div className="v" style={{ color: doc.remaining_amount > 0 ? 'var(--red)' : 'var(--t1)' }}>{fmtMoney(doc.remaining_amount)}</div>
        </div>
      </div>

      <section className="portal-card portal-sec">
        <div className="portal-card-hd">
          <h3><i className="ti ti-list-details" /> سطور المستند</h3>
        </div>
        {doc.lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--t4)', fontSize: 12.5 }}>لا توجد سطور</div>
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
                      {l.pack_qty && l.pack_qty > 1 ? ` × ${l.pack_qty}` : ''}
                    </td>
                    <td className="num">{fmtMoney(l.unit_price_ht)}</td>
                    <td className="num">{l.total_discount_amount > 0 ? `- ${fmtMoney(l.total_discount_amount)}` : '—'}</td>
                    <td className="num">{l.tva_rate}%</td>
                    <td className="num">{fmtMoney(l.total_ht)}</td>
                    <td className="num">{fmtMoney(l.total_ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="portal-card portal-sec" style={{ marginTop: 18 }}>
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
          <div className="sr" style={{ borderBottom: 'none' }}>
            <span className="sr-l" style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>الصافي للدفع</span>
            <span className="sr-v num" style={{ color: 'var(--em)', fontSize: 16 }}>{fmtMoney(doc.net_to_pay)}</span>
          </div>
        </div>
      </section>

      <section className="portal-card portal-sec" style={{ marginTop: 18 }}>
        <div className="portal-card-hd">
          <h3><i className="ti ti-wallet" /> الدفعات المرتبطة</h3>
        </div>
        {doc.payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--t4)', fontSize: 12.5 }}>لا توجد دفعات مرتبطة</div>
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
                    <td className="num" style={{ color: 'var(--em)' }}>{fmtMoneySigned(p.amount)}</td>
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
