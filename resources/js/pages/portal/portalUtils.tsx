// ════════════════════════════════════════════════════════════════════════════
// pages/portal/portalUtils.tsx — أدوات عرض مشتركة لصفحات البوابة
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PortalOrder } from '@/lib/api/portal/portal';
import { fmtMoney, fmtMoneySigned, fmtMoneyShort, fmtDate } from '@/lib/format';

export { fmtMoney, fmtMoneySigned, fmtMoneyShort, fmtDate };

// ─── لون تمييز ثابت لكل منتج ────────────────────────────────────────────────
// كل بطاقة منتج (وسطر السلة المطابق لها) تأخذ لوناً ثابتاً ومميزاً — مشتق من
// رقم هوية المنتج نفسه (وليس عشوائياً)، لذلك نفس المنتج يبقى بنفس اللون في كل
// مكان يظهر فيه (الكتالوج، السلة، المراجعة). الألوان من نظام التصميم نفسه.
const ACCENT_VARS: readonly [string, string][] = [
  ['--em', '--emb'],
  ['--gold', '--goldb'],
  ['--blue', '--blueb'],
  ['--purple', '--purb'],
  ['--teal', '--tealb'],
  ['--orange', '--orb'],
  ['--indigo', '--indigob'],
];

export function accentStyleFor(id: number | string): CSSProperties {
  const n = typeof id === 'number' ? id : Array.from(String(id)).reduce((s, c) => s + c.charCodeAt(0), 0);
  const [main, bg] = ACCENT_VARS[Math.abs(n) % ACCENT_VARS.length];
  return {
    ['--prod-accent' as string]: `var(${main})`,
    ['--prod-accent-bg' as string]: `var(${bg})`,
  } as CSSProperties;
}

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-DZ', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(d: string | null | undefined): string {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} ي`;
  return fmtDate(d);
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

// ─── أيقونة نوع المستند ────────────────────────────────────────────────────
export function DocTypeIcon({ code }: { code: string }) {
  const map: Record<string, { cls: string; icon: string }> = {
    FV:  { cls: 'portal-doc-icon--fv',  icon: 'ti-file-invoice' },
    AV:  { cls: 'portal-doc-icon--av',  icon: 'ti-file-x' },
    POS: { cls: 'portal-doc-icon--pos', icon: 'ti-point-of-sale' },
    FA:  { cls: 'portal-doc-icon--fa',  icon: 'ti-file-check' },
  };
  const m = map[code] ?? { cls: 'portal-doc-icon--default', icon: 'ti-file' };
  return <div className={`portal-doc-icon ${m.cls}`}><i className={`ti ${m.icon}`} /></div>;
}

// ─── عداد متحرك ────────────────────────────────────────────────────────────
export function AnimatedCounter({ value, duration = 800, prefix = '', suffix = '' }: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 2 }).format(display);
  return <span className="portal-counter">{prefix}{formatted}{suffix}</span>;
}

// ─── شريط التقدم ────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="portal-progress">
      <div
        className="portal-progress-fill"
        style={{ width: `${pct}%`, background: color || undefined }}
      />
    </div>
  );
}

// ─── مقياس الرصيد (SVG Gauge) ──────────────────────────────────────────────
export function BalanceGauge({ value, max, label }: {
  value: number;
  max: number;
  label: string;
}) {
  const clampedMax = Math.max(max, 1);
  const ratio = Math.min(Math.abs(value) / clampedMax, 1);
  const r = 60;
  const cx = 80;
  const cy = 72;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - ratio);
  const color = value < 0 ? 'var(--red)' : 'var(--em)';

  return (
    <div className="portal-gauge-wrap">
      <div className="portal-gauge">
        <svg viewBox="0 0 160 80">
          <path
            className="portal-gauge-bg"
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          />
          <path
            className="portal-gauge-fill"
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
          <text x={cx} y={cy - 8} className="portal-gauge-val">{fmtMoneyShort(value)}</text>
        </svg>
      </div>
      <div className="portal-gauge-label">{label}</div>
    </div>
  );
}

// ─── Sparkline (CSS bars) ──────────────────────────────────────────────────
export function Sparkline({ values, color = 'var(--em)' }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="portal-sparkline">
      {values.map((v, i) => (
        <div
          key={i}
          className="portal-sparkline-bar"
          style={{
            height: `${(v / max) * 100}%`,
            background: color,
          }}
        />
      ))}
    </div>
  );
}

// ─── شريط الائتمان ─────────────────────────────────────────────────────────
export function CreditBar({ used, limit }: { used: number; limit: number }) {
  if (limit <= 0) return null;
  const pct = Math.min(Math.abs(used) / limit * 100, 100);
  const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--gold)' : 'var(--em)';
  return (
    <>
      <div className="portal-credit-bar">
        <div className="portal-credit-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="portal-credit-meta">
        <span>{fmtMoneyShort(used)} مستعمل</span>
        <span>{fmtMoneyShort(limit)} سقف</span>
      </div>
    </>
  );
}

// ─── خطوات الحالة ──────────────────────────────────────────────────────────
export function StatusSteps({ steps }: { steps: { label: string; done: boolean; active?: boolean }[] }) {
  return (
    <div className="portal-steps">
      {steps.map((s, i) => (
        <div key={i} className={`portal-step ${s.done ? 'portal-step--done' : ''} ${s.active ? 'portal-step--active' : ''}`}>
          <div className="portal-step-dot">
            {s.done ? <i className="ti ti-check" /> : i + 1}
          </div>
          <span className="portal-step-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
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
      <div className="portal-loading-dots">
        <span /><span /><span />
      </div>
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

// ─── واتساب ─────────────────────────────────────────────────────────────────
// Re-export from shared utility for backward-compat.
export { normalizeWaPhone, buildWhatsAppLink } from '@/lib/wa';

// رسالة ملخصة لطلب (مرجع + حالة + تاريخ + عدد أصناف + مجموع + ملاحظات).
export function waOrderMessage(order: PortalOrder): string {
  const lines = [
    'السلام عليكم، إليكم طلبي:',
    `الطلب: ${order.reference}`,
    `الحالة: ${order.status_label}`,
    `التاريخ: ${fmtDate(order.requested_at || order.created_at)}`,
    `عدد الأصناف: ${order.items_count}`,
    `المجموع: ${fmtMoney(order.total_ttc)}`,
  ];
  if (order.notes) lines.push(`ملاحظات: ${order.notes}`);
  return lines.join('\n');
}
