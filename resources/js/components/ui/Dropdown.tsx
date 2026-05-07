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

      <style>{`
        .dropdown-wrapper { position: relative; display: flex; flex-direction: column; gap: 4px; }
        .dropdown-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .dropdown-trigger {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 8px 12px; gap: 8px;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; cursor: pointer;
          font-size: 14px; color: var(--color-text-primary);
          transition: border-color 0.15s, box-shadow 0.15s;
          text-align: start;
        }
        .dropdown-trigger:hover:not(.disabled) { border-color: var(--color-border-primary); }
        .dropdown-trigger.open { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent); }
        .dropdown-trigger.has-error { border-color: var(--color-text-danger, #ef4444); }
        .dropdown-trigger.disabled { opacity: 0.5; cursor: not-allowed; }
        .dropdown-trigger__value { display: flex; align-items: center; gap: 6px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dropdown-trigger__value.placeholder { color: var(--color-text-tertiary); }
        .dropdown-trigger__actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .dropdown-clear { font-size: 11px; color: var(--color-text-secondary); padding: 2px 4px; border-radius: 4px; line-height: 1; }
        .dropdown-clear:hover { color: var(--color-text-primary); background: var(--color-background-secondary); }
        .dropdown-chevron { display: flex; color: var(--color-text-secondary); transition: transform 0.2s; }
        .dropdown-chevron.rotated { transform: rotate(180deg); }
        .dropdown-error { font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .dropdown-menu {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 1000;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; list-style: none; margin: 0; padding: 4px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          max-height: 240px; overflow-y: auto;
          animation: dropdown-open 0.12s ease;
        }
        @keyframes dropdown-open {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dropdown-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 6px;
          font-size: 14px; cursor: pointer; color: var(--color-text-primary);
          transition: background 0.1s;
        }
        .dropdown-item:hover:not(.disabled) { background: var(--color-background-secondary); }
        .dropdown-item.selected { color: var(--color-text-info, #3b82f6); font-weight: 500; }
        .dropdown-item.disabled { opacity: 0.4; cursor: not-allowed; }
        .dropdown-item__icon { display: flex; flex-shrink: 0; }
        .dropdown-item__check { margin-inline-start: auto; color: var(--color-text-info, #3b82f6); }
        .dropdown-empty { padding: 12px 10px; text-align: center; color: var(--color-text-tertiary); font-size: 13px; }
      `}</style>
    </div>
  );
};

export default Dropdown;
