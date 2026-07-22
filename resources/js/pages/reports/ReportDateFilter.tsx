import React from 'react';

interface ReportDateFilterProps {
  fromDate: string;
  toDate: string;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function today(): Date { return new Date(); }

function daysAgo(n: number): Date {
  const d = new Date(); d.setDate(d.getDate() - n); return d;
}

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 6 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfYear(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

function prevMonthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function prevMonthEnd(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 0);
}

const PRESETS = [
  { label: 'اليوم',       icon: 'ti ti-calendar-day',     getRange: () => [fmt(today()), fmt(today())] },
  { label: 'أمس',         icon: 'ti ti-calendar-minus',    getRange: () => [fmt(daysAgo(1)), fmt(daysAgo(1))] },
  { label: 'هذا الأسبوع', icon: 'ti ti-calendar-week',     getRange: () => [fmt(startOfWeek()), fmt(today())] },
  { label: 'هذا الشهر',   icon: 'ti ti-calendar-month',    getRange: () => [fmt(startOfMonth()), fmt(today())] },
  { label: 'الشهر الماضي', icon: 'ti ti-calendar-event',    getRange: () => [fmt(prevMonthStart()), fmt(prevMonthEnd())] },
  { label: 'هذا العام',   icon: 'ti ti-calendar-date',     getRange: () => [fmt(startOfYear()), fmt(today())] },
] as const;

export default function ReportDateFilter({ fromDate, toDate, onChangeFrom, onChangeTo }: ReportDateFilterProps) {
  const applyPreset = (getRange: () => readonly [string, string]) => {
    const [from, to] = getRange();
    onChangeFrom(from);
    onChangeTo(to);
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>من:</span>
          <input type="date" className="form-control" style={{ width: 160 }} value={fromDate} onChange={e => onChangeFrom(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>إلى:</span>
          <input type="date" className="form-control" style={{ width: 160 }} value={toDate} onChange={e => onChangeTo(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {PRESETS.map(p => {
          const [pFrom, pTo] = p.getRange();
          const active = fromDate === pFrom && toDate === pTo;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.getRange)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 20,
                border: active ? '1px solid var(--em, #3b82f6)' : '1px solid var(--b2, #e5e7eb)',
                background: active ? 'var(--em, #3b82f6)' : 'var(--bg2, #f9fafb)',
                color: active ? '#fff' : 'var(--t2, #374151)',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Tajawal', sans-serif",
                cursor: 'pointer',
                transition: 'all .12s',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              <i className={p.icon} style={{ fontSize: 12 }} />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
