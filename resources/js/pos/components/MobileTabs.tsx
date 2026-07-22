
interface MobileTabsProps {
  activeTab: 'products' | 'cart';
  onTab: (t: 'products' | 'cart') => void;
  itemsCount: number; totalTtc: number; isEmpty: boolean; onSell: () => void;
}

export default function MobileTabs({
  activeTab, onTab, itemsCount, totalTtc, isEmpty, onSell,
}: MobileTabsProps) {
  return (
    <div className="pos-mob-tabs">
      <button className={`pmt ${activeTab === 'products' ? 'on' : ''}`} onClick={() => onTab('products')}>
        <div className="pmt-ic"><i className="ti ti-package" /></div>
        <span>منتجات</span>
      </button>
      <button className={`pmt ${activeTab === 'cart' ? 'on' : ''}`} onClick={() => onTab('cart')}>
        <div className="pmt-ic"><i className="ti ti-shopping-cart" /></div>
        {itemsCount > 0 && <div className="pmt-badge">{itemsCount}</div>}
        <span>السلة</span>
      </button>
      <button className="pmt-sell-btn" onClick={onSell} disabled={isEmpty}>
        <i className="ti ti-circle-check" />
        {isEmpty ? 'السلة فارغة' : `دفع ${totalTtc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج`}
      </button>
    </div>
  );
}
