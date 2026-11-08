// ════════════════════════════════════════════════════════════════════════════
// pages/pos/components/POSProductsPanel.tsx
//
// Left panel of POSPage: search bar, filter panel, category tabs, product grid
// and the cart-width resizer.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import ProductSearchBar         from '@/pos/components/ProductSearchBar';
import FilterPanel              from '@/pos/components/FilterPanel';
import CategoryTabs             from '@/pos/components/CategoryTabs';
import ProductGrid              from '@/pos/components/ProductGrid';
import PanelResizer             from '@/pos/components/PanelResizer';
import type { ViewMode, GridSize } from '@/pos/utils/posHelpers';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PosAggregatedLookups } from '@/lib/api/endpoints/lookups';
import type { ProductVariant } from '@/types';
import type { PosState } from '../hooks/posPageTypes';
import type { PosFilterState } from '../hooks/usePosProductFilter';

export interface POSProductsPanelProps {
  pos: PosState;
  settings: POSSettings;
  setSettings: (patch: Partial<POSSettings>) => void;
  slug: string | null;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  gridSize: GridSize;
  setGridSize: (g: GridSize) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  filters: PosFilterState;
  showFilter: boolean;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;
  filteredVariants: ProductVariant[];
  allVariants: ProductVariant[];
  families: React.ComponentProps<typeof CategoryTabs>['families'];
  familyCounts: Map<number, number>;
  loadingAll: boolean;
  highlightedIndex: number;
  setHighlightedIndex: (i: number) => void;
  handleEnter: () => void;
  handleArrowUp: () => void;
  handleArrowDown: () => void;
  handleSearchEscape: () => void;
  handleAddItem: (v: ProductVariant) => void;
  handleQtyChange: (variantId: number, qty: number) => void;
  onAddManual: () => void;
  onBarcodeScan: () => void;
  toggleQuickItem: (v: ProductVariant) => void;
  isQuickItem: (variantId: number) => boolean;
  priceLevelsList: PosAggregatedLookups['priceLevels'];
  selectedPriceLevelId: number | null;
  dbDefaultPriceLevelId: number | null;
  allowNegSetting: boolean;
  rawQuery: string;
  scannedId: number | null;
  handleResizerMouseDown: (e: React.MouseEvent) => void;
}

export default function POSProductsPanel(props: POSProductsPanelProps) {
  const {
    pos, settings, setSettings, slug, view, setView, gridSize, setGridSize, searchRef, filters,
    showFilter, setShowFilter, filteredVariants, allVariants, families, familyCounts, loadingAll,
    highlightedIndex, setHighlightedIndex, handleEnter, handleArrowUp, handleArrowDown, handleSearchEscape,
    handleAddItem, handleQtyChange, onAddManual, onBarcodeScan, toggleQuickItem, isQuickItem,
    priceLevelsList, selectedPriceLevelId, dbDefaultPriceLevelId, allowNegSetting, rawQuery, scannedId,
    handleResizerMouseDown,
  } = props;
  const {
    sortBy, setSortBy, filterActive,
    filterInStock, setFilterInStock, filterLowStock, setFilterLowStock,
    filterMinPrice, setFilterMinPrice, filterMaxPrice, setFilterMaxPrice,
    filterPerPage, setFilterPerPage,
  } = filters;

  return (
    <div className="pos-left">
      <ProductSearchBar
        query={pos.searchQuery} onQuery={pos.setSearch}
        view={view} gridSize={gridSize}
        onView={setView} onGridSize={setGridSize}
        onFilter={() => setShowFilter(s => !s)} filterActive={filterActive}
        inputRef={searchRef} sortBy={sortBy} onSort={setSortBy}
        resultsCount={filteredVariants.length}
        onEnterFirst={handleEnter}
        highlightedIndex={highlightedIndex}
        onArrowUp={handleArrowUp}
        onArrowDown={handleArrowDown}
        onEscape={handleSearchEscape}
        keyboardNavEnabled={settings.keyboardNav}
        slug={slug}
        clearSearchOnAdd={settings.clearSearchOnAdd}
        onToggleClearSearch={() => setSettings({ clearSearchOnAdd: !settings.clearSearchOnAdd })}
        onBarcodeScan={onBarcodeScan}
      />
      {showFilter && (
        <FilterPanel
          inStock={filterInStock}   onInStock={setFilterInStock}
          lowStock={filterLowStock} onLowStock={setFilterLowStock}
          minPrice={filterMinPrice} onMinPrice={setFilterMinPrice}
          maxPrice={filterMaxPrice} onMaxPrice={setFilterMaxPrice}
          perPage={filterPerPage} onPerPage={setFilterPerPage}
          onReset={() => { setFilterInStock(false); setFilterLowStock(false); setFilterMinPrice(''); setFilterMaxPrice(''); }}
        />
      )}
      <CategoryTabs families={families} selected={pos.selectedCategory} onSelect={pos.setCategory}
        counts={familyCounts} totalCount={allVariants.length}
      />
      <ProductGrid
        variants={filteredVariants} view={view} gridSize={gridSize}
        loading={loadingAll}
        onAdd={handleAddItem} onAddManual={onAddManual}
        highlightedIndex={highlightedIndex}
        onHighlightIndexChange={setHighlightedIndex}
        onPin={toggleQuickItem} isPinned={isQuickItem}
        priceLevels={priceLevelsList} selectedPriceLevelId={selectedPriceLevelId}
        defaultPriceLevelId={dbDefaultPriceLevelId}
        cartItems={pos.items} allowNegativeStock={allowNegSetting}
        showStock={settings.showStockOnCard}
        priceDisplayMode={settings.priceDisplayMode}
        onQty={handleQtyChange}
        searchQuery={rawQuery}
        scannedId={scannedId}
      />
      <PanelResizer onMouseDown={handleResizerMouseDown} />
    </div>
  );
}
