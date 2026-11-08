// SectionHeader — icon + title + subtitle header for a tab section

export default function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--b2)', marginBottom: 4 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: 'var(--em)' }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}
