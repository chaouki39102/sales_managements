// components/ui/SearchInput.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;   // fires after debounce
  placeholder?: string;
  debounce?: number;                     // ms, default 300
  loading?: boolean;
  clearable?: boolean;
  width?: string | number;
  autoFocus?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/* Minimal inline SVG icons to avoid Tabler dependency issues */
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconLoader = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default function SearchInput({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'بحث...',
  debounce = 300,
  loading = false,
  clearable = true,
  width = 220,
  autoFocus = false,
  disabled = false,
}: SearchInputProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState('');
  const value = isControlled ? controlledValue : internalValue;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* autoFocus */
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  /* Debounced search callback */
  const fireSearch = useCallback((v: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!onSearch) return;
    timerRef.current = setTimeout(() => onSearch(v), debounce);
  }, [onSearch, debounce]);

  /* Cleanup on unmount */
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!isControlled) setInternalValue(v);
    onChange?.(v);
    fireSearch(v);
  }

  function handleClear() {
    if (!isControlled) setInternalValue('');
    onChange?.('');
    onSearch?.('');
    if (timerRef.current) clearTimeout(timerRef.current);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') handleClear();
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch?.(value);
    }
  }

  return (
    <>
      <div
        className={`srch${disabled ? ' srch--disabled' : ''}`}
        style={{ width }}
      >
        {/* Leading icon: spinner when loading, search otherwise */}
        <span className={`srch-ic${loading ? ' srch-ic--loading' : ''}`}>
          {loading ? <IconLoader /> : <IconSearch />}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className="w-full"
        />

        {/* Clear button */}
        {clearable && value.length > 0 && !loading && (
          <button className="srch-clear" onClick={handleClear} tabIndex={-1} aria-label="مسح">
            <IconX />
          </button>
        )}
      </div>
    </>
  );
}
