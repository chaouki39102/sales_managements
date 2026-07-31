// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProTopCards.tsx
//
// بطاقتا أعلى صفحة POS PRO:
//   • TotalCard   — الإجمالي البارز للفاتورة (أوضح عنصر في الشاشة).
//   • CustomerCard — الزبون الحالي: الصورة/الأحرف، الاسم، الرصيد، الإحصائيات.
// بيانات الزبون التفصيلية (الرصيد/الإجماليات/مستوى السعر) تجلب عبر useParty.
// ════════════════════════════════════════════════════════════════════════════
import { formatDZD } from '@/pos/utils/calculations';
import { useParty } from '@/lib/api/endpoints/parties';
import type { CartTotals, Party } from '@/types';

// ─── TotalCard ────────────────────────────────────────────────────────────────

interface TotalCardProps {
  totals:          CartTotals;
  adjustedTotal:   number;
  invoiceDiscPct:  number;
}

export function TotalCard({ totals, adjustedTotal, invoiceDiscPct }: TotalCardProps) {
  return (
    <div className="pp-total-card">
      <div className="pp-total-label">
        <i className="ti ti-cash" />
        إجمالي الفاتورة
      </div>
      <div className="pp-total-value" dir="ltr">{formatDZD(adjustedTotal)}</div>
      <div className="pp-total-meta">
        <span><i className="ti ti-box" /> {totals.lines_count} صنف</span>
        <span><i className="ti ti-list-numbers" /> {totals.items_count} وحدة</span>
        {invoiceDiscPct > 0 && <span className="pp-total-disc"><i className="ti ti-percentage" /> {invoiceDiscPct}%</span>}
      </div>
      <div className="pp-total-breakdown">
        <div><span>المجموع HT</span><strong dir="ltr">{formatDZD(totals.total_ht)}</strong></div>
        <div><span>الخصم</span><strong dir="ltr">-{formatDZD(totals.total_discount + (totals.invoice_discount_amount ?? 0))}</strong></div>
        <div><span>TVA</span><strong dir="ltr">{formatDZD(totals.total_tva)}</strong></div>
        <div><span>الطابع الجبائي</span><strong dir="ltr">{formatDZD(totals.fiscal_stamp)}</strong></div>
      </div>
    </div>
  );
}

// ─── CustomerCard ──────────────────────────────────────────────────────────────

interface CustomerCardProps {
  client:         Party | null;
  onOpenCustomers: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? '') + (parts[1][0] ?? '');
}

export function CustomerCard({ client, onOpenCustomers }: CustomerCardProps) {
  const { data: party } = useParty(client?.id ?? null);

  const balance    = party?.balance ?? client?.balance ?? 0;
  const totalSales = party?.total_sales ?? client?.total_sales ?? 0;
  const priceLevel = party?.default_price_level?.name;

  const isDebtor = balance > 0.009;

  return (
    <div className="pp-cust-card">
      <div className="pp-cust-head">
        <div className={`pp-avatar${isDebtor ? ' pp-avatar--debt' : ''}`}>
          {client?.avatar ? <img src={client.avatar} alt="" /> : initials(client?.name ?? 'زبون نقدي')}
        </div>
        <div className="pp-cust-id">
          <div className="pp-cust-name">{client?.name ?? 'زبون نقدي'}</div>
          <div className="pp-cust-meta">
            {priceLevel && <span><i className="ti ti-tags" /> {priceLevel}</span>}
            {client?.nif && <span><i className="ti ti-id-badge" /> {client.nif}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-secondary pp-cust-change" onClick={onOpenCustomers}>
          <i className="ti ti-users" />
          تغيير الزبون
        </button>
      </div>
      <div className="pp-cust-stats">
        <div className={`pp-stat pp-stat--balance${isDebtor ? ' debt' : ''}`}>
          <span className="pp-stat-label">{isDebtor ? 'مطلوب منه' : 'الرصيد'}</span>
          <strong dir="ltr">{formatDZD(balance)}</strong>
        </div>
        <div className="pp-stat">
          <span className="pp-stat-label">إجمالي المبيعات</span>
          <strong dir="ltr">{formatDZD(totalSales)}</strong>
        </div>
      </div>
    </div>
  );
}
