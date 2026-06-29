export const toolBtnStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 'var(--r1)', fontSize: 13,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t3)', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
};

export function TinyBtn({ icon, color, title, onClick, loading, disabled }: {
  icon: string; color: string; title: string; onClick: () => void;
  loading?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={loading ? undefined : onClick}
      title={loading ? 'جاري…' : title}
      type="button"
      disabled={disabled || loading}
      style={{
        padding: '4px 5px', border: 'none', background: 'transparent',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        color: (disabled || loading) ? 'var(--t4)' : color,
        fontSize: 11, lineHeight: 1, opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        : <i className={`ti ${icon}`} />}
    </button>
  );
}
