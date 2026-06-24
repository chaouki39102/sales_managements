import React, { useState, useRef, useEffect, useCallback } from 'react';
import usePOSSmartSearch from '@/lib/pos/hooks/usePOSSmartSearch';
import type { ProductVariant } from '@/lib/api/core/types';

interface ProductSearchBarEnhancedProps {
  variants: ProductVariant[];
  families?: Array<{ id: number; name: string; _count?: { products: number } }>;
  onSelectVariant: (variant: ProductVariant) => void;
  onQueryChange?: (query: string) => void;
  maxSuggestions?: number;
  className?: string;
}

const MAX_VISIBLE = 8;

export default function ProductSearchBarEnhanced({
  variants,
  families,
  onSelectVariant,
  onQueryChange,
  maxSuggestions = MAX_VISIBLE,
  className = '',
}: ProductSearchBarEnhancedProps) {
  const {
    query, setQuery, results, isSearching,
    totalResults,
  } = usePOSSmartSearch(variants, families, { maxResults: maxSuggestions });

  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [results.results]);

  const handleSelect = useCallback((variant: ProductVariant) => {
    onSelectVariant(variant);
    setQuery('');
    setShowDropdown(false);
    inputRef.current?.focus();
  }, [onSelectVariant, setQuery]);

  const handleInputChange = useCallback((val: string) => {
    setQuery(val);
    onQueryChange?.(val);
    if (val.trim()) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [setQuery, onQueryChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || results.results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault();
        handleSelect(results.results[0]?.variant);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, results.results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const selected = results.results[highlightedIndex];
        if (selected) handleSelect(selected.variant);
        break;
      }
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  }, [showDropdown, results.results, query, highlightedIndex, handleSelect]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showDropdown && highlightedIndex >= 0) {
      const el = dropdownRef.current?.querySelector(`[data-hl-idx="${highlightedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, showDropdown]);

  const suggestionItems = results.results.slice(0, maxSuggestions);

  return (
    <div className={`psbe-wrap ${className}`} style={{ position: 'relative' }}>
      <div className={`psbe-inp ${isFocused ? 'psbe-focus' : ''}`}>
        <i className="ti ti-search" style={{ fontSize: 14, color: 'var(--t4)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => { setIsFocused(true); if (query.trim()) setShowDropdown(true); }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث بالاسم أو الباركود أو الرمز..."
          autoComplete="off"
        />
        {isSearching && (
          <i className="ti ti-loader spin" style={{ fontSize: 14, color: 'var(--t4)', flexShrink: 0 }} />
        )}
        {query && !isSearching && (
          <button className="psbe-clear" onClick={() => { setQuery(''); setShowDropdown(false); inputRef.current?.focus(); }}>
            <i className="ti ti-x" />
          </button>
        )}
      </div>

      {showDropdown && suggestionItems.length > 0 && (
        <div className={`psbe-drop ${!families ? 'psbe-drop--simple' : ''}`} ref={dropdownRef}>
          {families ? (
            groupByFamily(suggestionItems).map(group => (
              <div key={group.familyId} className="psbe-grp">
                <div className="psbe-grp-hd">{group.familyName}</div>
                {group.items.map((item, idx) => (
                  <div
                    key={item.variant.id}
                    className={`psbe-item ${highlightedIndex === item.globalIdx ? 'psbe-hl' : ''}`}
                    data-hl-idx={item.globalIdx}
                    onMouseDown={() => handleSelect(item.variant)}
                    onMouseEnter={() => setHighlightedIndex(item.globalIdx)}
                  >
                    <span className="psbe-item-name">{item.variant.product?.name}{item.variant.variant_name ? ` — ${item.variant.variant_name}` : ''}</span>
                    <span className="psbe-item-price">{formatPrice(item.variant)}</span>
                  </div>
                ))}
              </div>
            ))
          ) : (
            suggestionItems.map((item, idx) => (
              <div
                key={item.variant.id}
                className={`psbe-item ${highlightedIndex === idx ? 'psbe-hl' : ''}`}
                data-hl-idx={idx}
                onMouseDown={() => handleSelect(item.variant)}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <span className="psbe-item-name">{item.variant.product?.name}{item.variant.variant_name ? ` — ${item.variant.variant_name}` : ''}</span>
                <span className="psbe-item-price">{formatPrice(item.variant)}</span>
              </div>
            ))
          )}
          <div className="psbe-footer">
            <span>{totalResults} نتيجة</span>
            <span className="psbe-nav-hint">
              {highlightedIndex + 1}/{suggestionItems.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function groupByFamily(items: Array<{ variant: ProductVariant; score: number; matchType: string }>) {
  const map = new Map<string, { familyId: number; familyName: string; items: Array<{ variant: ProductVariant; score: number; matchType: string; globalIdx: number }> }>();
  items.forEach((item, globalIdx) => {
    const fName = item.variant.product?.family?.name ?? 'أخرى';
    const fId = item.variant.product?.family?.id ?? 0;
    if (!map.has(fName)) map.set(fName, { familyId: fId, familyName: fName, items: [] });
    map.get(fName)!.items.push({ ...item, globalIdx });
  });
  return Array.from(map.values());
}

function formatPrice(variant: ProductVariant): string {
  const price = variant.prices?.[0]?.price_ttc ?? variant.product?.price_ttc ?? 0;
  return new Intl.NumberFormat('ar-DZ', { style: 'decimal', maximumFractionDigits: 2 }).format(Number(price)) + ' د.ج';
}

