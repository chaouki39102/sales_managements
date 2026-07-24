import React, { useState, useRef, useEffect, useId } from 'react';

export interface DropdownOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string | number | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  clearable?: boolean;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  disabled = false,
  label,
  error,
  clearable = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opt: DropdownOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  return (
    <div className={`dropdown-wrapper ${className}`} ref={ref}>
      {label && <label className="dropdown-label" htmlFor={id}>{label}</label>}

      <button
        id={id}
        type="button"
        className={`dropdown-trigger ${open ? 'open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`dropdown-trigger__value ${!selected ? 'placeholder' : ''}`}>
          {selected?.icon && <span className="dropdown-trigger__icon">{selected.icon}</span>}
          {selected ? selected.label : placeholder}
        </span>
        <span className="dropdown-trigger__actions">
          {clearable && value && (
            <span className="dropdown-clear" onClick={handleClear} aria-label="مسح">✕</span>
          )}
          <span className={`dropdown-chevron ${open ? 'rotated' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </span>
      </button>

      {error && <span className="dropdown-error">{error}</span>}

      {open && (
        <ul className="dropdown-menu" role="listbox">
          {options.map(opt => (
            <li
              key={opt.value}
              className={`dropdown-item ${opt.value === value ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt)}
            >
              {opt.icon && <span className="dropdown-item__icon">{opt.icon}</span>}
              {opt.label}
              {opt.value === value && (
                <svg className="dropdown-item__check" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </li>
          ))}
          {options.length === 0 && (
            <li className="dropdown-empty">لا توجد خيارات</li>
          )}
        </ul>
      )}

    </div>
  );
};

export default Dropdown;
