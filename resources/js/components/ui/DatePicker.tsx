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

      <style>{`
        .dp-wrapper { position: relative; display: flex; flex-direction: column; gap: 4px; z-index: 2000; }
        .dp-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .dp-trigger {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; width: 100%;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; cursor: pointer;
          font-size: 14px; color: var(--color-text-primary);
          transition: border-color .15s, box-shadow .15s;
          text-align: start;
        }
        .dp-trigger:hover:not(.disabled) { border-color: var(--color-border-primary); }
        .dp-trigger.open { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent); }
        .dp-trigger.has-error { border-color: var(--color-text-danger, #ef4444); }
        .dp-trigger.disabled { opacity: .5; cursor: not-allowed; }
        .dp-icon { color: var(--color-text-secondary); flex-shrink: 0; }
        .dp-placeholder { color: var(--color-text-tertiary); flex: 1; }
        .dp-trigger span:not(.dp-placeholder):not(.dp-clear) { flex: 1; }
        .dp-clear { font-size: 11px; color: var(--color-text-secondary); padding: 2px 4px; border-radius: 4px; line-height: 1; margin-inline-start: auto; }
        .dp-clear:hover { color: var(--color-text-primary); background: var(--color-background-secondary); }
        .dp-error { font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .dp-calendar {
          position: absolute; top: calc(100% + 4px); left: 0; z-index: 1000;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 10px; padding: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          min-width: 260px;
          animation: dp-open .12s ease;
        }
        @keyframes dp-open { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
        .dp-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .dp-nav-btn { background: none; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 18px; color: var(--color-text-secondary); line-height: 1; }
        .dp-nav-btn:hover { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .dp-nav-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
        .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dp-day-header { text-align: center; font-size: 11px; font-weight: 500; color: var(--color-text-tertiary); padding: 4px 0; }
        .dp-day {
          display: flex; align-items: center; justify-content: center;
          height: 32px; border-radius: 6px; border: none; background: none;
          font-size: 13px; cursor: pointer; color: var(--color-text-primary);
          transition: background .1s, color .1s;
        }
        .dp-day:hover:not(.disabled) { background: var(--color-background-secondary); }
        .dp-day.today { font-weight: 600; color: var(--color-text-info, #3b82f6); }
        .dp-day.today::after { content:''; display:block; width:4px; height:4px; background: currentColor; border-radius:50%; position:absolute; bottom:3px; }
        .dp-day.today { position: relative; }
        .dp-day.selected { background: var(--color-text-info, #3b82f6); color: #fff; font-weight: 500; }
        .dp-day.disabled { opacity: .3; cursor: not-allowed; }
        .dp-footer { margin-top: 8px; border-top: 1px solid var(--color-border-tertiary); padding-top: 8px; display: flex; justify-content: center; }
        .dp-today-btn { background: none; border: none; font-size: 13px; cursor: pointer; color: var(--color-text-info, #3b82f6); font-weight: 500; padding: 4px 8px; border-radius: 6px; }
        .dp-today-btn:hover { background: var(--color-background-secondary); }
      `}</style>
    </div>
  );
};

export default DatePicker;
