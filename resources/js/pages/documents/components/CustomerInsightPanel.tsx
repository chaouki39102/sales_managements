import { InfoPanel } from './DocumentUIPrimitives';
import { fmtDZD } from '../utils/document.utils';
import type { CustomerInsightsData } from '../hooks/useCustomerInsights';

interface CustomerInsightPanelProps {
  insights:  CustomerInsightsData | null | undefined;
  isLoading: boolean;
}

export function CustomerInsightPanel({ insights, isLoading }: CustomerInsightPanelProps) {
  if (isLoading) {
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 'var(--r2)',
        background: 'var(--bg3)', border: '1px solid var(--b2)',
        marginTop: 8, display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: 'var(--t4)',
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 13 }} />
        جاري تحميل تحليلات المتعامل...
      </div>
    );
  }

  if (!insights || !insights.party_id) return null;

  const {
    last_documents, document_count,
    monthly_avg_invoice, avg_payment_days, top_products,
  } = insights;

  const docLen = last_documents?.length ?? 0;

  return (
    // ✅ كانت CollapsiblePanel محلية بنفس هذا الملف — أصبحت الآن InfoPanel
    // المشتركة من DocumentUIPrimitives، بدون أي تغيير في السلوك أو الشكل الظاهر.
    <InfoPanel title="تحليلات المتعامل" icon="ti-chart-bar" defaultOpen={false}>
      {/* الإحصائيات */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <StatChip label="عدد المستندات" value={String(document_count)} icon="ti-file-description" />
        {monthly_avg_invoice !== null && (
          <StatChip label="متوسط شهري" value={`${fmtDZD(monthly_avg_invoice)} دج`} icon="ti-calculator" />
        )}
        {avg_payment_days !== null && (
          <StatChip
            label="متوسط السداد"
            value={`${avg_payment_days > 0 ? '+' : ''}${avg_payment_days} يوم`}
            icon="ti-clock"
            color={avg_payment_days > 0 ? 'var(--red)' : 'var(--green)'}
          />
        )}
      </div>

      {/* آخر المستندات */}
      {docLen > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: 'var(--t4)', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className="ti ti-history" style={{ fontSize: 10 }} />
            آخر المستندات
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {last_documents.map((doc) => {
              const isOverdue = doc.status === 'overdue';
              const isUnpaid  = doc.remaining_amount > 0.01 && !isOverdue;
              return (
                <div key={doc.id} style={{
                  padding: '6px 8px', borderRadius: 'var(--r1)',
                  background: 'var(--bg2)', border: '1px solid var(--b1)',
                  fontSize: 11, display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <i className="ti ti-file" style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.document_number}
                    </span>
                    <span style={{ color: 'var(--t4)', fontSize: 10 }}>{doc.type_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {fmtDZD(doc.net_to_pay)} دج
                    </span>
                    {isOverdue && (
                      <span style={{
                        padding: '1px 5px', borderRadius: 99, fontSize: 9,
                        background: 'var(--redb)', color: 'var(--red)', fontWeight: 700,
                      }}>
                        متأخر
                      </span>
                    )}
                    {isUnpaid && (
                      <span style={{
                        padding: '1px 5px', borderRadius: 99, fontSize: 9,
                        background: 'var(--orangeb)', color: 'var(--orange)', fontWeight: 700,
                      }}>
                        غير مسدد
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* المنتجات الأكثر شراء */}
      {top_products && top_products.length > 0 && (
        <div>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: 'var(--t4)', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className="ti ti-star" style={{ fontSize: 10 }} />
            المنتجات الأكثر شراءً
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {top_products.map((p, i) => (
              <div key={p.id} style={{
                padding: '5px 8px', borderRadius: 'var(--r1)',
                background: 'var(--bg2)', border: '1px solid var(--b1)',
                fontSize: 11, display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: i === 0 ? 'var(--gold)' : 'var(--bg3)',
                    color: i === 0 ? 'white' : 'var(--t4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  {p.ref && <span style={{ color: 'var(--t4)', fontSize: 10, flexShrink: 0 }}>({p.ref})</span>}
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: 'var(--t3)' }}>
                  {p.total_qty} وحدة · {fmtDZD(p.total_amount)} دج
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </InfoPanel>
  );
}

function StatChip({ label, value, icon, color }: {
  label: string; value: string; icon: string; color?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5, flex: '1 0 auto',
      padding: '5px 10px', borderRadius: 'var(--r1)',
      background: 'var(--bg3)', border: '1px solid var(--b2)',
      fontSize: 11,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 11, color: color ?? 'var(--t4)' }} />
      <span style={{ color: 'var(--t4)' }}>{label}:</span>
      <span style={{ fontWeight: 700, color: color ?? 'var(--t2)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}
