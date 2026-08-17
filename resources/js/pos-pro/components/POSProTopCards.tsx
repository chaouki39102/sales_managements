// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProTopCards.tsx
//
// بطاقتا أعلى صفحة POS PRO:
//   • TotalCard   — الإجمالي البارز للفاتورة (أوضح عنصر في الشاشة).
//   • CustomerCard — الزبون الحالي: الصورة/الأحرف، الاسم، الرصيد الحقيقي
//     (عبر /party-balances/{id} — يُلغى كاشه تلقائياً بعد كل بيع)، سقف الائتمان،
//     جهات الاتصال، المستوى السعري/NIF/الإعفاء من TVA.
// ════════════════════════════════════════════════════════════════════════════
import { formatDZD } from '@/pos/utils/calculations';
import { useParty } from '@/lib/api/endpoints/parties';
import { usePartyBalance } from '@/lib/api/endpoints/partyBalances';
import { buildWhatsAppLink } from '@/lib/wa';
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
  const { data: party }       = useParty(client?.id ?? null);
  const { data: balanceData } = usePartyBalance(client?.id ?? null);

  // الرصيد الحقيقي من /party-balances/{id} — يُحدَّث تلقائياً بعد إتمام البيع
  // وعند تغيير/إنشاء زبون (يُلغى كاشه في onSelect/onCreate). لا نعتمد أبداً على
  // client.balance / party.balance لأن PartyResource لا يصرّفهما.
  const balance     = balanceData?.current_balance ?? 0;
  const creditLimit = Number(client?.credit_limit ?? 0);
  const priceLevel  = party?.default_price_level?.name ?? client?.default_price_level?.name;
  const isCash      = client?.slug === 'client-cash';
  const isDebtor    = balance > 0.009;
  const overCredit  = creditLimit > 0 && balance >= creditLimit;
  const creditUsed  = creditLimit > 0 ? Math.min(100, Math.max(0, (balance / creditLimit) * 100)) : 0;
  const phone       = client?.mobile ?? client?.phone;

  return (
    <div className={`pp-cust-card${isCash ? ' pp-cust-card--cash' : ''}`}>
      <div className="pp-cust-head">
        <div className="pp-avatar-wrap">
          <button
            type="button"
            className={`pp-avatar${isDebtor ? ' pp-avatar--debt' : ''}`}
            onClick={onOpenCustomers}
            aria-label="تغيير الزبون"
          >
            {client?.avatar ? <img src={client.avatar} alt="" /> : initials(client?.name ?? 'زبون الصندوق')}
          </button>
          <span className="pp-avatar-hint"><i className="ti ti-user-swap" /> تغيير الزبون</span>
        </div>
        <div className="pp-cust-id">
          <div className="pp-cust-name">
            <span className="pp-cust-name-txt">{client?.name ?? 'زبون الصندوق'}</span>
            {isCash && <span className="pp-cust-badge"><i className="ti ti-cash" /> الصندوق</span>}
          </div>
          <div className="pp-cust-meta">
            {priceLevel && <span title="مستوى السعر"><i className="ti ti-tags" /> {priceLevel}</span>}
            {client?.nif && <span title="رقم التعريف الجبائي"><i className="ti ti-id-badge" /> {client.nif}</span>}
            {client?.is_tva_exempt && <span className="exempt" title="معفى من ضريبة القيمة المضافة"><i className="ti ti-shield-check" /> معفى من TVA</span>}
          </div>
        </div>
      </div>

      {(phone || client?.email || client?.address) && (
        <div className="pp-cust-contact">
          {phone && (() => {
            const waLink = buildWhatsAppLink(phone, '');
            return waLink
              ? <a href={waLink} target="_blank" rel="noopener noreferrer" title="مراسلة واتساب" style={{ color: '#25D366' }}><i className="ti ti-brand-whatsapp" /> {phone}</a>
              : <span><i className="ti ti-phone" /> {phone}</span>;
          })()}
          {client?.email && <a href={`mailto:${client.email}`} title="بريد"><i className="ti ti-mail" /> {client.email}</a>}
          {client?.address && <span title="العنوان"><i className="ti ti-map-pin" /> {client.address}</span>}
        </div>
      )}

      <div className="pp-cust-stats">
        <div className={`pp-stat pp-stat--balance${isDebtor ? ' debt' : ''}`}>
          <span className="pp-stat-label">{isDebtor ? 'مطلوب منه' : 'الرصيد'}</span>
          <strong dir="ltr">{formatDZD(balance)}</strong>
        </div>
        <div className="pp-stat">
          <span className="pp-stat-label">سقف الائتمان</span>
          <strong dir="ltr">{creditLimit > 0 ? formatDZD(creditLimit) : '—'}</strong>
        </div>
      </div>

      {creditLimit > 0 && (
        <div className={`pp-cust-credit${overCredit ? ' over' : ''}`}>
          <div className="pp-cust-credit-bar"><span style={{ width: `${creditUsed}%` }} /></div>
          <div className="pp-cust-credit-meta">
            <span dir="ltr">مستعمل {formatDZD(Math.min(balance, creditLimit))}</span>
            <span dir="ltr">متبقّي {formatDZD(Math.max(0, creditLimit - balance))}</span>
          </div>
        </div>
      )}
    </div>
  );
}
