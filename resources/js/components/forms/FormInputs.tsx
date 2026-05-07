import React, { useId } from 'react';

// ─── TextArea ───────────────────────────────────────────────────────────────

interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  autoResize?: boolean;
  className?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  value = '',
  onChange,
  label,
  error,
  hint,
  maxLength,
  autoResize = false,
  required,
  disabled,
  rows = 4,
  placeholder,
  className = '',
  ...rest
}) => {
  const id = useId();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize) {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    }
    onChange(e.target.value);
  };

  return (
    <div className={`ta-wrapper ${className}`}>
      {label && (
        <label className="ta-label" htmlFor={id}>
          {label}{required && <span className="ta-required">*</span>}
        </label>
      )}
      <textarea
        id={id}
        className={`ta-field ${error ? 'has-error' : ''}`}
        value={value}
        onChange={handleChange}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        aria-invalid={!!error}
        {...rest}
      />
      <div className="ta-footer">
        {(hint || error) && (
          <span className={error ? 'ta-error' : 'ta-hint'}>{error ?? hint}</span>
        )}
        {maxLength && (
          <span className="ta-counter">{value.length} / {maxLength}</span>
        )}
      </div>

      <style>{`
        .ta-wrapper { display: flex; flex-direction: column; gap: 4px; }
        .ta-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .ta-required { color: var(--color-text-danger, #ef4444); margin-inline-start: 2px; }
        .ta-field {
          width: 100%; padding: 8px 12px; resize: vertical;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; font-size: 14px; font-family: inherit;
          color: var(--color-text-primary); line-height: 1.5; outline: none;
          transition: border-color .15s, box-shadow .15s;
          box-sizing: border-box;
        }
        .ta-field:focus { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info,#3b82f6) 15%, transparent); }
        .ta-field.has-error { border-color: var(--color-text-danger, #ef4444); }
        .ta-field:disabled { opacity: .5; cursor: not-allowed; resize: none; }
        .ta-footer { display: flex; justify-content: space-between; align-items: center; }
        .ta-hint { font-size: 12px; color: var(--color-text-tertiary); }
        .ta-error { font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .ta-counter { font-size: 12px; color: var(--color-text-tertiary); margin-inline-start: auto; }
      `}</style>
    </div>
  );
};


// ─── FormField ──────────────────────────────────────────────────────────────

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required,
  children,
  htmlFor,
  className = '',
}) => {
  const id = useId();
  const fieldId = htmlFor ?? id;

  return (
    <div className={`ff-wrapper ${className}`}>
      {label && (
        <label className="ff-label" htmlFor={fieldId}>
          {label}
          {required && <span className="ff-required">*</span>}
        </label>
      )}
      <div className="ff-control">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<{ id?: string; 'aria-invalid'?: boolean }>, {
              id: fieldId,
              'aria-invalid': !!error,
            })
          : children}
      </div>
      {hint && !error && <p className="ff-hint">{hint}</p>}
      {error && <p className="ff-error" role="alert">{error}</p>}

      <style>{`
        .ff-wrapper { display: flex; flex-direction: column; gap: 4px; }
        .ff-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); display: inline-flex; align-items: center; gap: 2px; }
        .ff-required { color: var(--color-text-danger, #ef4444); }
        .ff-control { display: flex; flex-direction: column; }
        .ff-hint  { margin: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .ff-error { margin: 0; font-size: 12px; color: var(--color-text-danger, #ef4444); }
      `}</style>
    </div>
  );
};


// ─── NumberInput ─────────────────────────────────────────────────────────────

interface NumberInputProps {
  value?: number | string;
  onChange: (value: number | '') => void;
  label?: string;
  error?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value = '',
  onChange,
  label,
  error,
  hint,
  min,
  max,
  step = 1,
  precision,
  prefix,
  suffix,
  placeholder = '0',
  disabled = false,
  required,
  className = '',
}) => {
  const id = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') { onChange(''); return; }
    const parsed = precision !== undefined ? parseFloat(parseFloat(raw).toFixed(precision)) : parseFloat(raw);
    if (!isNaN(parsed)) onChange(parsed);
  };

  const increment = () => {
    const current = typeof value === 'number' ? value : 0;
    const next = current + step;
    if (max === undefined || next <= max) onChange(next);
  };
  const decrement = () => {
    const current = typeof value === 'number' ? value : 0;
    const next = current - step;
    if (min === undefined || next >= min) onChange(next);
  };

  return (
    <div className={`ni-wrapper ${className}`}>
      {label && (
        <label className="ni-label" htmlFor={id}>
          {label}{required && <span className="ni-required">*</span>}
        </label>
      )}
      <div className={`ni-control ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}>
        {prefix && <span className="ni-affix ni-prefix">{prefix}</span>}
        <button type="button" className="ni-step" onClick={decrement} disabled={disabled || (min !== undefined && (typeof value === 'number' ? value : 0) <= min)} aria-label="تقليل">−</button>
        <input
          id={id}
          type="number"
          className="ni-field"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          aria-invalid={!!error}
        />
        <button type="button" className="ni-step" onClick={increment} disabled={disabled || (max !== undefined && (typeof value === 'number' ? value : 0) >= max)} aria-label="زيادة">+</button>
        {suffix && <span className="ni-affix ni-suffix">{suffix}</span>}
      </div>
      {hint && !error && <p className="ni-hint">{hint}</p>}
      {error && <p className="ni-error">{error}</p>}

      <style>{`
        .ni-wrapper { display: flex; flex-direction: column; gap: 4px; }
        .ni-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .ni-required { color: var(--color-text-danger, #ef4444); margin-inline-start: 2px; }
        .ni-control {
          display: flex; align-items: center;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; overflow: hidden;
          transition: border-color .15s, box-shadow .15s;
        }
        .ni-control:focus-within:not(.disabled) { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info,#3b82f6) 15%, transparent); }
        .ni-control.has-error { border-color: var(--color-text-danger, #ef4444); }
        .ni-control.disabled { opacity: .5; }
        .ni-step {
          flex-shrink: 0; width: 34px; height: 36px; border: none;
          background: var(--color-background-secondary); color: var(--color-text-secondary);
          font-size: 16px; cursor: pointer; line-height: 1;
          transition: background .1s, color .1s;
          display: flex; align-items: center; justify-content: center;
        }
        .ni-step:hover:not(:disabled) { background: var(--color-border-tertiary); color: var(--color-text-primary); }
        .ni-step:disabled { opacity: .4; cursor: not-allowed; }
        .ni-step:first-of-type { border-inline-end: 1px solid var(--color-border-tertiary); }
        .ni-step:last-of-type  { border-inline-start: 1px solid var(--color-border-tertiary); }
        .ni-field {
          flex: 1; padding: 8px 6px; border: none; outline: none;
          background: transparent; font-size: 14px; text-align: center;
          color: var(--color-text-primary); font-family: inherit;
          -moz-appearance: textfield;
        }
        .ni-field::-webkit-outer-spin-button,
        .ni-field::-webkit-inner-spin-button { -webkit-appearance: none; }
        .ni-affix { padding: 0 10px; font-size: 13px; color: var(--color-text-secondary); background: var(--color-background-secondary); align-self: stretch; display: flex; align-items: center; }
        .ni-prefix { border-inline-end: 1px solid var(--color-border-tertiary); }
        .ni-suffix { border-inline-start: 1px solid var(--color-border-tertiary); }
        .ni-hint  { margin: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .ni-error { margin: 0; font-size: 12px; color: var(--color-text-danger, #ef4444); }
      `}</style>
    </div>
  );
};
