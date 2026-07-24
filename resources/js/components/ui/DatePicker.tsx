import React, { useState, useRef, useEffect, useId } from 'react';

interface DatePickerProps {
  value?: string; // ISO date: YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

const DAYS = ['أح', 'إث', 'ث', 'أر', 'خ', 'ج', 'س'];
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;
}
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'اختر تاريخاً',
  error,
  min,
  max,
  disabled = false,
  clearable = true,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(value ? parseInt(value.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.split('-')[1]) - 1 : today.getMonth());
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChange(iso);
    setOpen(false);
  };

  const isDisabled = (iso: string) => {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const days = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: days}, (_, i) => i + 1)];

  return (
    <div className={`dp-wrapper ${className}`} ref={ref}>
      {label && <label className="dp-label" htmlFor={id}>{label}</label>}

      <button
        id={id}
        type="button"
        className={`dp-trigger ${open ? 'open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <svg className="dp-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1 7h14" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span className={!value ? 'dp-placeholder' : ''}>{value ? formatDisplay(value) : placeholder}</span>
        {clearable && value && !disabled && (
          <span className="dp-clear" onClick={e => { e.stopPropagation(); onChange(''); }}>✕</span>
        )}
      </button>

      {error && <span className="dp-error">{error}</span>}

      {open && (
        <div className="dp-calendar" role="dialog" aria-label="تقويم">
          {/* Navigation */}
          <div className="dp-nav">
            <button type="button" className="dp-nav-btn" onClick={prevMonth}>‹</button>
            <span className="dp-nav-title">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="dp-nav-btn" onClick={nextMonth}>›</button>
          </div>

          {/* Day headers */}
          <div className="dp-grid">
            {DAYS.map(d => <div key={d} className="dp-day-header">{d}</div>)}
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isSel = iso === value;
              const isToday = iso === todayISO();
              const isDis = isDisabled(iso);
              return (
                <button
                  key={day}
                  type="button"
                  className={`dp-day ${isSel ? 'selected' : ''} ${isToday && !isSel ? 'today' : ''} ${isDis ? 'disabled' : ''}`}
                  onClick={() => !isDis && selectDay(day)}
                  disabled={isDis}
                  aria-label={iso}
                  aria-pressed={isSel}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="dp-footer">
            <button type="button" className="dp-today-btn" onClick={() => {
              const t = todayISO();
              if (!isDisabled(t)) { onChange(t); setOpen(false); }
            }}>اليوم</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DatePicker;
