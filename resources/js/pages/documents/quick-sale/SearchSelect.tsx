// pages/documents/quick-sale/SearchSelect.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { inpStyle } from './quickSale.styles';

export interface SearchSelectProps<T extends Record<string, unknown>> {
  items: T[];
  value: string;
  onChange: (id: string, item?: T) => void;
  getLabel: (item: T) => string;
  getSub?: (item: T) => string | null;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onEnter?: () => void;
}
export default function SearchSelect<T extends Record<string, unknown>>({
  items,
  value,
  onChange,
  getLabel,
  getSub,
  placeholder,
  disabled,
  error,
  inputRef,
  onEnter,
}: SearchSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const finalInputRef = inputRef || internalInputRef;

  const selected = items.find(i => String(i.id) === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i => getLabel(i).toLowerCase().includes(q));
  }, [items, query, getLabel]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: T) => {
    onChange(String(item.id), item);
    setOpen(false);
    setQuery('');
    // بعد اختيار المنتج، ننتقل إلى حقل الكمية (يتم التعامل معه من خلال المكون الأب)
    setTimeout(() => {
      if ((finalInputRef as any).current) {
        const quantityInput = (finalInputRef as any).current.closest('tr')?.querySelector('input[type="number"]') as HTMLInputElement;
        quantityInput?.focus();
      }
    }, 50);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length > 0 && query.trim()) {
      e.preventDefault();
      handleSelect(filtered[0]);
    } else if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          ...inpStyle(error),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            color: selected ? 'var(--t1)' : 'var(--t4)',
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selected ? getLabel(selected) : placeholder}
        </span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {selected && (
            <button
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--t4)',
                padding: '0 2px',
                fontSize: 12,
              }}
            >
              <i className="ti ti-x" />
            </button>
          )}
          <i
            className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ color: 'var(--t4)', fontSize: 12 }}
          />
        </div>
      </div>

      {open && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            left: 0,
            zIndex: 900,
            background: 'var(--bg1)',
            border: '1px solid var(--b3)',
            borderRadius: 'var(--r2)',
            boxShadow: 'var(--shadow2)',
            marginTop: 2,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--b1)' }}>
            <input
              ref={finalInputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="بحث..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '5px 8px',
                borderRadius: 'var(--r1)',
                border: '1px solid var(--b3)',
                background: 'var(--bg2)',
                color: 'var(--t1)',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'Tajawal, sans-serif',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '10px 12px',
                  color: 'var(--t4)',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                لا توجد نتائج
              </div>
            ) : (
              filtered.slice(0, 60).map(item => {
                const sub = getSub?.(item);
                return (
                  <div
                    key={String(item.id)}
                    onClick={() => handleSelect(item)}
                    style={{
                      padding: '7px 12px',
                      cursor: 'pointer',
                      background: String(item.id) === value ? 'var(--emb)' : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--b1)',
                    }}
                    onMouseEnter={e => {
                      if (String(item.id) !== value)
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg2)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background =
                        String(item.id) === value ? 'var(--emb)' : 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--t1)' }}>{getLabel(item)}</span>
                    {sub && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--t4)',
                          flexShrink: 0,
                          marginRight: 8,
                        }}
                      >
                        {sub}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
