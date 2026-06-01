// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/InventoryPage.tsx
// ════════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import StockTab          from './StockTab';
import OpeningBalanceTab from './OpeningBalanceTab';

const TABS = [
  { key: 'stock',   label: 'المخزون الحالي',    icon: 'ti-packages' },
  { key: 'opening', label: 'الرصيد الافتتاحي',  icon: 'ti-flag-2'   },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function InventoryPage() {
  const [tab, setTab] = useState<TabKey>('stock');

  return (
    <div style={{ padding: '24px', fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}>

      {/* ── عنوان الصفحة ── */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'var(--emb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-building-warehouse" style={{ fontSize: 20, color: 'var(--em)' }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--t1)' }}>
            إدارة المخزون
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--t4)' }}>
            متابعة الأرصدة والحركات والرصيد الافتتاحي
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: '2px solid var(--b1)',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontFamily: 'Tajawal, sans-serif',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? 'var(--em)' : 'var(--t3)',
              borderBottom: tab === t.key ? '2px solid var(--em)' : '2px solid transparent',
              marginBottom: -2, transition: 'all .15s',
            }}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── محتوى ── */}
      {tab === 'stock'   && <StockTab />}
      {tab === 'opening' && <OpeningBalanceTab />}

    </div>
  );
}
