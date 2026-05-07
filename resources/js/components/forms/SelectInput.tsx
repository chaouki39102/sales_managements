import React, { useId } from 'react';

interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

interface SelectInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  value?: string | number;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
}

const SelectInput: React.FC<SelectInputProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder,
  error,
  hint,
  disabled,
  required,
  className = '',
  ...rest
}) => {
  const id = useId();

  return (
    <div className={`select-wrapper ${className}`}>
      {label && (
        <label className="select-label" htmlFor={id}>
          {label}
          {required && <span className="select-required">*</span>}
        </label>
      )}
      <div className="select-control">
        <select
          id={id}
          className={`select-field ${error ? 'has-error' : ''}`}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="select-chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      {hint && !error && <p className="select-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="select-error" role="alert">{error}</p>}

      <style>{`
        .select-wrapper { display: flex; flex-direction: column; gap: 4px; }
        .select-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); display: flex; align-items: center; gap: 2px; }
        .select-required { color: var(--color-text-danger, #ef4444); }
        .select-control { position: relative; }
        .select-field {
          width: 100%; padding: 8px 36px 8px 12px; appearance: none;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; cursor: pointer;
          font-size: 14px; color: var(--color-text-primary);
          transition: border-color .15s, box-shadow .15s;
          outline: none;
        }
        .select-field:focus { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent); }
        .select-field.has-error { border-color: var(--color-text-danger, #ef4444); }
        .select-field:disabled { opacity: .5; cursor: not-allowed; }
        .select-chevron {
          position: absolute; inset-inline-end: 10px; top: 50%; transform: translateY(-50%);
          display: flex; pointer-events: none; color: var(--color-text-secondary);
        }
        .select-hint { margin: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .select-error { margin: 0; font-size: 12px; color: var(--color-text-danger, #ef4444); }
      `}</style>
    </div>
  );
};

export default SelectInput;
