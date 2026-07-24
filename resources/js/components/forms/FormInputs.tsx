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

    </div>
  );
};
