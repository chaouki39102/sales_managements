// ════════════════════════════════════════════════════════════════════════════
// pages/inventory/InventoryPage.tsx
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import StockTab          from './StockTab';
import OpeningBalanceTab from './OpeningBalanceTab';
import ProductLotsTab    from './ProductLotsTab';
import MovementsTab      from './MovementsTab';

const TABS = [
  { key: 'stock',     label: 'المخزون الحالي',    icon: 'ti-packages'          },
  { key: 'lots',      label: 'دفعات المنتجات',    icon: 'ti-barcode'           },
  { key: 'movements', label: 'الحركات',            icon: 'ti-arrows-exchange'   },
  { key: 'opening',   label: 'الرصيد الافتتاحي',  icon: 'ti-flag-2'            },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function InventoryPage() {
  const [tab, setTab] = useState<TabKey>('stock');

  return (
    <div className="page on" id="p-inventory">

      <PageHeader
        title="إدارة المخزون"
        description="متابعة الأرصدة والحركات والرصيد الافتتاحي"
        tabs={
          <div style={{ display: 'flex', gap: 4 }}>
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
        }
      />

      {/* ── محتوى ── */}
      {tab === 'stock'     && <StockTab />}
      {tab === 'lots'      && <ProductLotsTab />}
      {tab === 'movements' && <MovementsTab />}
      {tab === 'opening'   && <OpeningBalanceTab />}

    </div>
  );
}
