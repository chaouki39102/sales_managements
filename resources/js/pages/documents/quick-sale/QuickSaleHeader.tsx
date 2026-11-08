// pages/documents/quick-sale/QuickSaleHeader.tsx
export default function QuickSaleHeader({ isPending, onClose }: { isPending: boolean; onClose: () => void }) {
  return (
    <div
      style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--b1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background:
          'linear-gradient(135deg, var(--em) 0%, color-mix(in srgb, var(--em) 70%, var(--blue)) 100%)',
        borderRadius: 'var(--r3) var(--r3) 0 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--r2)',
            background: 'rgba(255,255,255,.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i className="ti ti-bolt" style={{ fontSize: 18, color: 'white' }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>بيع سريع</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>
            فاتورة بيع (FV) — رقم الوثيقة يُولَّد تلقائياً — <kbd>F8</kbd> للحفظ
          </div>
        </div>
      </div>
      <button
        onClick={!isPending ? onClose : undefined}
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,.3)',
          background: 'rgba(255,255,255,.15)',
          color: 'white',
          cursor: isPending ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <i className="ti ti-x" style={{ fontSize: 14 }} />
      </button>
    </div>
  );
}
