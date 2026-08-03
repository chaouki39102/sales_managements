// ════════════════════════════════════════════════════════════════════════════
// pages/portal/portalUtils.tsx — أدوات عرض مشتركة لصفحات البوابة
// ════════════════════════════════════════════════════════════════════════════

export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 }).format(v) + ' دج';
}

export function fmtMoneySigned(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  const s = new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 }).format(Math.abs(v));
  return (v < 0 ? '- ' : '') + s + ' دج';
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── شارة حالة المستند ──────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="badge badge--z">—</span>;
  const key = status.toLowerCase();
  const cls = key.includes('مدفو') || key.includes('paid') ? 'badge--g'
    : key.includes('جزئي') || key.includes('partial') ? 'badge--y'
    : key.includes('مسودة') || key.includes('draft') ? 'badge--b'
    : key.includes('ملغي') || key.includes('cancel') ? 'badge--r'
    : 'badge--z';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function DirBadge({ direction }: { direction: 'in' | 'out' }) {
  return direction === 'in'
    ? <span className="badge badge--g"><i className="ti ti-arrow-down" /> وارد</span>
    : <span className="badge badge--r"><i className="ti ti-arrow-up" /> صادر</span>;
}

// ─── شارة حالة حساب البوابة (admin) ─────────────────────────────────────────
export function ActiveBadge({ active }: { active: boolean }) {
  return active
    ? <span className="badge badge--g">مفعّل</span>
    : <span className="badge badge--r">معطّل</span>;
}

// ─── ترقيم الصفحات ──────────────────────────────────────────────────────────
interface PagerProps {
  page: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
  onChange: (page: number) => void;
}

export function Pager({ page, lastPage, total, from, to, onChange }: PagerProps) {
  if (lastPage <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(lastPage, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="portal-pager">
      <div className="portal-pager-info">
        عرض {from} – {to} من {total} سجل
      </div>
      <div className="portal-pager-btns">
        <button className="portal-pgbtn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <i className="ti ti-chevron-right" />
        </button>
        {pages.map((p) => (
          <button key={p} className={`portal-pgbtn${p === page ? ' on' : ''}`} onClick={() => onChange(p)}>
            {p}
          </button>
        ))}
        <button className="portal-pgbtn" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>
          <i className="ti ti-chevron-left" />
        </button>
      </div>
    </div>
  );
}

// ─── حالة التحميل / فارغ / خطأ ──────────────────────────────────────────────
export function PortalLoading({ text = 'جاري التحميل...' }: { text?: string }) {
  return (
    <div className="portal-loading">
      <i className="ti ti-loader animate-spin" style={{ fontSize: 26, color: 'var(--em)' }} />
      {text}
    </div>
  );
}

export function PortalEmpty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="portal-empty">
      <i className={`ti ${icon}`} />
      <div>{text}</div>
    </div>
  );
}

export function PortalError({ message }: { message: string }) {
  return (
    <div className="portal-err">
      <i className="ti ti-alert-circle" />
      {message}
    </div>
  );
}
