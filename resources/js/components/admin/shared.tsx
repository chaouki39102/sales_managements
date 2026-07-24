// components/admin/shared.tsx
// مكونات مشتركة خفيفة لوحة الأدمن

// ─── Avatar ───────────────────────────────────────────────────────────────────

const GRADS = [
  'linear-gradient(135deg,#0a8a5c,#0dbf84)',
  'linear-gradient(135deg,#1a4fd6,#60a5fa)',
  'linear-gradient(135deg,#6920d4,#a78bfa)',
  'linear-gradient(135deg,#b87d0a,#fbbf24)',
  'linear-gradient(135deg,#c43a0a,#fb923c)',
];

export const grad   = (id: number) => GRADS[id % GRADS.length];
export const inits  = (n: string)  =>
  n.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
export const fmtDate= (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-DZ') : '—';
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('ar-DZ', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

interface AvatarProps { id: number; name: string; size?: number; radius?: number | string; }
export function Avatar({ id, name, size = 32, radius = '50%' }: AvatarProps) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: grad(id), flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff',
    }}>
      {inits(name)}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

interface SBProps { active: boolean; suspended?: boolean; size?: number; }
export function StatusBadge({ active, suspended, size = 11 }: SBProps) {
  const label = suspended ? 'موقوف' : active ? 'نشط' : 'معطل';
  const color = suspended ? '#f59e0b' : active ? '#10b981' : '#6b7280';
  return (
    <span style={{
      fontSize: size, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: color + '22', color,
    }}>{label}</span>
  );
}

// ─── DrawerShell ──────────────────────────────────────────────────────────────

interface DrawerProps {
  open:     boolean;
  onClose:  () => void;
  title:    React.ReactNode;
  subtitle?: string;
  badge?:   React.ReactNode;
  children: React.ReactNode;
  width?:   number;
}
export function DrawerShell({ open, onClose, title, subtitle, badge, children, width = 500 }: DrawerProps) {
  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,.45)', direction: 'rtl' }}
    >
      <div style={{ width, maxWidth: '100vw', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,.2)', maxHeight: '100vh', animation: 'slideInRight .22s ease' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {badge}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--t4)', padding: 4, lineHeight: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

export interface TabDef { key: string; label: string; icon: string; }
interface TabBarProps { tabs: TabDef[]; active: string; onChange: (k: string) => void; }
export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', padding: '0 16px', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '9px 12px', border: 'none', background: 'none',
          borderBottom: active === t.key ? '2px solid var(--em)' : '2px solid transparent',
          color: active === t.key ? 'var(--em)' : 'var(--t3)',
          fontWeight: active === t.key ? 700 : 500,
          fontSize: 12, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        }}>
          <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />{t.label}
        </button>
      ))}
    </div>
  );
}

// ─── FlashBar ─────────────────────────────────────────────────────────────────

export function FlashBar({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div style={{
      padding: '8px 20px', fontSize: 12, fontWeight: 600,
      background: ok ? '#10b9811a' : '#ef44441a',
      color: ok ? '#10b981' : '#ef4444',
    }}>
      {ok ? '✓' : '✗'} {msg}
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--b1)' }}>
      <span style={{ width: 130, fontSize: 12, color: 'var(--t4)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────

interface ABProps {
  icon: string; label: string; onClick: () => void;
  variant?: 'default' | 'danger' | 'success'; disabled?: boolean; loading?: boolean;
}
export function ActionBtn({ icon, label, onClick, variant = 'default', disabled, loading }: ABProps) {
  const colors = {
    default: { bg: 'var(--bg3)', border: 'var(--b2)',      color: 'var(--t2)' },
    danger:  { bg: '#ef44440d', border: '#ef444433',       color: '#ef4444'   },
    success: { bg: '#10b9810d', border: '#10b98133',       color: '#10b981'   },
  }[variant];
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 14px', borderRadius: 8, border: `1px solid ${colors.border}`,
        background: colors.bg, color: colors.color,
        fontSize: 12, fontWeight: 700, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? .6 : 1, fontFamily: 'Tajawal, sans-serif',
        flex: 1,
      }}
    >
      <i className={`ti ${loading ? 'ti-loader' : icon}`} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
      {label}
    </button>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t4)' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 32, display: 'block', marginBottom: 10, opacity: .3 }} />
      <p style={{ margin: 0, fontSize: 13 }}>{text}</p>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <i className="ti ti-loader" style={{ fontSize: 24, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}
