// Toggle — switch with label

export default function Toggle({
  checked, onChange, label, disabled,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', opacity: disabled ? 0.5 : 1 }}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: 'relative',
          background: checked ? 'var(--em)' : 'var(--b3)', transition: 'background .2s',
          flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </div>
      {label && <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>}
    </label>
  );
}
