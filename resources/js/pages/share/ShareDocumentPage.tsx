// ════════════════════════════════════════════════════════════════════════════
// pages/share/ShareDocumentPage.tsx — عرض وثيقة عامة بالتوكن (بدون مصادقة)
//
// يُستعمل من رابط المشاركة المُولّد عبر POST /documents/{id}/share.
// الصفحة مستقلة — لا تحتاج DashboardLayout ولا auth ولا slug.
// ════════════════════════════════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiGet } from '@/lib/api/core/client';

interface ShareDocumentData {
  document_number: string;
  document_date: string | null;
  due_date: string | null;
  status: string | null;
  party_name: string | null;
  party_nif: string | null;
  party_phone: string | null;
  warehouse_name: string | null;
  document_type: string | null;
  document_type_code: string | null;
  reference: string | null;
  notes: string | null;
  lines: {
    id: number;
    product_name: string;
    product_ref: string | null;
    quantity: number;
    unit_price_ht: number;
    discount_percentage: number;
    tva_rate: number;
    total_ht: number;
    total_tva: number;
    total_ttc: number;
    unit: string | null;
  }[];
  total_ht: number;
  total_tva: number;
  total_discount: number;
  total_stamp: number;
  total_ttc: number;
  paid_amount: number;
  remaining_amount: number;
  expires_at: string | null;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function ShareDocumentPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['share-doc', token],
    queryFn: () => apiGet<ShareDocumentData>(`/share/${token}`),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="share-page">
        <div className="share-loading">
          <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 32 }} />
          <p>جاري تحميل بيانات الوثيقة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const msg = error instanceof Error ? error.message : 'رابط المشاركة غير صالح أو انتهت صلاحيته.';
    return (
      <div className="share-page">
        <div className="share-error">
          <i className="ti ti-alert-triangle" style={{ fontSize: 48, color: 'var(--r)' }} />
          <h2>خطأ</h2>
          <p>{msg}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isSale = ['FV', 'POS', 'AV'].includes(data.document_type_code ?? '');

  return (
    <div className="share-page">
      <div className="share-card">
        {/* Header */}
        <div className="share-header">
          <div className="share-doc-type">{data.document_type ?? data.document_type_code}</div>
          <h1 className="share-doc-number">{data.document_number}</h1>
          {data.document_date && (
            <div className="share-doc-date">
              <i className="ti ti-calendar" /> {data.document_date}
              {data.due_date && <span> — تاريخ الاستحقاق: {data.due_date}</span>}
            </div>
          )}
          {data.status && <span className="share-status-badge">{data.status}</span>}
        </div>

        {/* Party + Warehouse */}
        <div className="share-info-row">
          {data.party_name && (
            <div className="share-info-block">
              <span className="share-info-label">{isSale ? 'الزبون' : 'المورد'}</span>
              <span className="share-info-value">{data.party_name}</span>
              {data.party_nif && <span className="share-info-sub">NIF: {data.party_nif}</span>}
              {data.party_phone && <span className="share-info-sub">هاتف: {data.party_phone}</span>}
            </div>
          )}
          {data.warehouse_name && (
            <div className="share-info-block">
              <span className="share-info-label">المستودع</span>
              <span className="share-info-value">{data.warehouse_name}</span>
            </div>
          )}
        </div>

        {/* Lines table */}
        <div className="share-table-wrap">
          <table className="share-table">
            <thead>
              <tr>
                <th>#</th>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الخصم %</th>
                <th>TVA %</th>
                <th>المجموع TTC</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line, i) => (
                <tr key={line.id}>
                  <td>{i + 1}</td>
                  <td>
                    <span>{line.product_name}</span>
                    {line.product_ref && <span className="share-ref">{line.product_ref}</span>}
                  </td>
                  <td>{line.quantity} {line.unit ?? ''}</td>
                  <td>{fmtMoney(line.unit_price_ht)}</td>
                  <td>{line.discount_percentage > 0 ? `${line.discount_percentage}%` : '—'}</td>
                  <td>{line.tva_rate}%</td>
                  <td className="share-bold">{fmtMoney(line.total_ttc)}</td>
                </tr>
              ))}
              {data.lines.length === 0 && (
                <tr><td colSpan={7} className="share-empty">لا توجد أسطر</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="share-totals">
          <div className="share-totals-row">
            <span>المجموع HT</span>
            <span>{fmtMoney(data.total_ht)}</span>
          </div>
          <div className="share-totals-row">
            <span>ضريبة القيمة المضافة TVA</span>
            <span>{fmtMoney(data.total_tva)}</span>
          </div>
          {data.total_discount > 0 && (
            <div className="share-totals-row share-red">
              <span>الخصم</span>
              <span>-{fmtMoney(data.total_discount)}</span>
            </div>
          )}
          {data.total_stamp > 0 && (
            <div className="share-totals-row">
              <span>الختم الجبائي</span>
              <span>{fmtMoney(data.total_stamp)}</span>
            </div>
          )}
          <div className="share-totals-row share-total-final">
            <span>الإجمالي TTC</span>
            <span>{fmtMoney(data.total_ttc)}</span>
          </div>
          {data.paid_amount > 0 && (
            <>
              <div className="share-totals-row">
                <span>المدفوع</span>
                <span className="share-green">{fmtMoney(data.paid_amount)}</span>
              </div>
              <div className="share-totals-row share-total-final">
                <span>المتبقي</span>
                <span className={data.remaining_amount > 0 ? 'share-red' : 'share-green'}>
                  {fmtMoney(data.remaining_amount)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="share-notes">
            <i className="ti ti-note" /> {data.notes}
          </div>
        )}

        {/* Footer */}
        <div className="share-footer">
          <span>تم الإنشاء عبر نظام POSDZ</span>
          {data.expires_at && (
            <span>صالح حتى: {new Date(data.expires_at).toLocaleDateString('ar-DZ')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
