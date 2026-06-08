// ════════════════════════════════════════════════════════════════════════════
// DataTable/FilterPopup.tsx  — v9.1  ✦  فلاتر احترافية مُعاد تصميمها
//
// ✅ Date: تابين (اختصارات / يدوي) بدلاً من قائمة طويلة
//    • presets?: string[] — تصفية الاختصارات حسب ما يُحدده المطوّر لكل عمود
// ✅ Number: شريط slider بصري + حقول نصية + presets كـ pills
// ✅ Text: بحث فوري مع highlight نتائج + زر clear مدمج
// ✅ Select: قائمة مرئية بـ radio بدلاً من <select> عتيق
// ✅ Multiselect/Dynamic: محسّن بـ virtual list للخيارات الكثيرة
// ✅ تصميم موحّد: عرض 280px، border-radius، animations
// ✅ createPortal + Smart positioning (RTL-aware)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useLayoutEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal }                          from 'react-dom';
import type { Column }                           from './types';
import { decodeRange, encodeRange, getRawValue } from './utils';
import { useClickOutside, useEscapeKey }         from './hooks';
import { StaticMultiSelect, DynamicMultiSelect } from './MultiSelect';

// ════════════════════════════════════════════════════════════════════════════
// Date Shortcuts helpers
// ════════════════════════════════════════════════════════════════════════════

function fmt(d: Date): string { return d.toISOString().slice(0, 10); }

function getDateRange(preset: string): { min: string; max: string } {
  const now = new Date();
  const today = fmt(now);

  const startOf = (d: Date, u: 'week'|'month'|'year'|'quarter') => {
    const r = new Date(d);
    if (u === 'week')    { r.setDate(r.getDate() - r.getDay()); }
    else if (u === 'month')   { r.setDate(1); }
    else if (u === 'year')    { r.setMonth(0, 1); }
    else if (u === 'quarter') { r.setMonth(Math.floor(r.getMonth() / 3) * 3, 1); }
    r.setHours(0, 0, 0, 0); return r;
  };
  const endOf = (d: Date, u: 'week'|'month'|'year'|'quarter') => {
    const r = new Date(d);
    if (u === 'week')    { r.setDate(r.getDate() + (6 - r.getDay())); }
    else if (u === 'month')   { r.setMonth(r.getMonth() + 1, 0); }
    else if (u === 'year')    { r.setMonth(11, 31); }
    else if (u === 'quarter') { r.setMonth(Math.floor(r.getMonth() / 3) * 3 + 3, 0); }
    r.setHours(23, 59, 59, 999); return r;
  };
  const add = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  const y = now.getFullYear();
  const presets: Record<string, { min: string; max: string }> = {
    today:         { min: today, max: today },
    yesterday:     { min: fmt(add(now,-1)), max: fmt(add(now,-1)) },
    last_7:        { min: fmt(add(now,-6)), max: today },
    last_30:       { min: fmt(add(now,-29)), max: today },
    last_90:       { min: fmt(add(now,-89)), max: today },
    this_week:     { min: fmt(startOf(now,'week')),  max: fmt(endOf(now,'week')) },
    last_week:     { min: fmt(startOf(add(now,-7),'week')), max: fmt(endOf(add(now,-7),'week')) },
    this_month:    { min: fmt(startOf(now,'month')), max: fmt(endOf(now,'month')) },
    last_month:    { min: fmt(startOf(new Date(y,now.getMonth()-1,1),'month')), max: fmt(endOf(new Date(y,now.getMonth()-1,1),'month')) },
    this_quarter:  { min: fmt(startOf(now,'quarter')), max: fmt(endOf(now,'quarter')) },
    last_quarter:  { min: fmt(startOf(add(now,-90),'quarter')), max: fmt(endOf(add(now,-90),'quarter')) },
    this_year:     { min: fmt(startOf(now,'year')), max: fmt(endOf(now,'year')) },
    last_year:     { min: `${y-1}-01-01`, max: `${y-1}-12-31` },
    q1: { min: `${y}-01-01`, max: `${y}-03-31` },
    q2: { min: `${y}-04-01`, max: `${y}-06-30` },
    q3: { min: `${y}-07-01`, max: `${y}-09-30` },
    q4: { min: `${y}-10-01`, max: `${y}-12-31` },
  };
  return presets[preset] ?? { min: '', max: '' };
}

// مجموعات الاختصارات — مُعاد تنظيمها
const SHORTCUT_GROUPS = [
  { label: 'أيام',            items: [
    { key:'today',        label:'اليوم',          icon:'calendar-event' },
    { key:'yesterday',    label:'أمس',            icon:'calendar-minus' },
    { key:'last_7',       label:'آخر 7 أيام',     icon:'calendar-week' },
    { key:'last_30',      label:'آخر 30 يوم',     icon:'calendar' },
  ]},
  { label: 'أسابيع وأشهر',   items: [
    { key:'this_week',    label:'هذا الأسبوع',    icon:'calendar-week' },
    { key:'last_week',    label:'الأسبوع الماضي', icon:'calendar-week' },
    { key:'this_month',   label:'هذا الشهر',      icon:'calendar-month' },
    { key:'last_month',   label:'الشهر الماضي',   icon:'calendar-month' },
  ]},
  { label: 'أرباع السنة',    items: [
    { key:'this_quarter', label:'هذا الربع',      icon:'chart-line' },
    { key:'last_quarter', label:'الربع الماضي',   icon:'chart-line' },
    { key:'q1',           label:'ر1',             icon:'' },
    { key:'q2',           label:'ر2',             icon:'' },
    { key:'q3',           label:'ر3',             icon:'' },
    { key:'q4',           label:'ر4',             icon:'' },
  ]},
  { label: 'سنوات',          items: [
    { key:'this_year',    label:'هذه السنة',      icon:'calendar' },
    { key:'last_year',    label:'السنة الماضية',  icon:'calendar' },
    { key:'last_90',      label:'آخر 90 يوم',     icon:'history' },
  ]},
];

function matchesPreset(value: string, key: string): boolean {
  const cur = decodeRange(value);
  const exp = getDateRange(key);
  return cur.min === exp.min && cur.max === exp.max;
}

// ════════════════════════════════════════════════════════════════════════════
// Props
// ════════════════════════════════════════════════════════════════════════════

interface FilterPopupProps {
  col:       Column<Record<string, unknown>>;
  value:     string;
  onChange:  (v: string) => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose:   () => void;
  allData?:  Record<string, unknown>[];
  data?:     Record<string, unknown>[];
}

// ════════════════════════════════════════════════════════════════════════════
// FilterPopup
// ════════════════════════════════════════════════════════════════════════════

const FilterPopup = memo(function FilterPopup({
  col, value, onChange, anchorRef, onClose, allData, data,
}: FilterPopupProps) {

  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  // تاب التاريخ: 'shortcuts' | 'manual'
  const [dateTab, setDateTab] = useState<'shortcuts' | 'manual'>(
    () => {
      if (col.filter?.type !== 'date') return 'shortcuts';
      const { min, max } = decodeRange(value);
      // إذا لا توجد قيمة أو تطابق اختصار → tab الاختصارات
      return 'shortcuts';
    }
  );

  // ── Positioning ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!anchorRef.current) return;
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const POPUP_W = 280;
      const POPUP_H = col.filter?.type === 'date' ? 400
                    : col.filter?.type === 'multiselect' || col.filter?.type === 'dynamic-multiselect' ? 380
                    : 260;

      const isRTL = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
      let left = isRTL ? rect.left : rect.right - POPUP_W;
      if (left + POPUP_W > window.innerWidth - 8) left = window.innerWidth - POPUP_W - 8;
      if (left < 8) left = 8;

      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const top = spaceBelow >= Math.min(POPUP_H, 220)
        ? rect.bottom + 4
        : Math.max(8, rect.top - POPUP_H - 4);

      setPos({ top, left });
    };
    update();
    const t = setTimeout(update, 16);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { clearTimeout(t); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [anchorRef, col.filter?.type]);

  useClickOutside(popupRef, anchorRef, onClose);
  useEscapeKey(onClose);

  if (!col.filter || !pos) return null;

  const { type } = col.filter;
  const hasVal = value !== '' && value !== '|';
  const header = typeof col.header === 'string' ? col.header : '';

  // ════════════════════════════════════════════════════════════════════════
  // ١. Text Filter — بحث فوري مع clear مدمج
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'text') return createPortal(
    <div ref={popupRef} className="dt-flt-popup dt-flt-popup--text"
      style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
      role="dialog" aria-label={`فلتر ${header}`}>
      {header && <div className="dt-flt-popup-title"><i className="ti ti-search" />{header}</div>}
      <div className="dt-flt-text-wrap">
        <i className="ti ti-search dt-flt-text-icon" />
        <input
          className={`dt-fi dt-flt-text-input${hasVal ? ' act' : ''}`}
          type="text" value={value} autoFocus
          onChange={e => onChange(e.target.value)}
          placeholder="ابحث..."
          aria-label={`فلتر ${header}`}
        />
        {hasVal && (
          <button className="dt-flt-text-clear" onClick={() => onChange('')} type="button" title="مسح">
            <i className="ti ti-x" />
          </button>
        )}
      </div>
      {hasVal && (
        <div className="dt-flt-footer">
          <button className="dt-flt-clear" onClick={() => { onChange(''); onClose(); }} type="button">
            مسح الفلتر
          </button>
        </div>
      )}
    </div>,
    document.body,
  );

  // ════════════════════════════════════════════════════════════════════════
  // ٢. Select Filter — قائمة Radio مرئية بدلاً من <select>
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'select') return createPortal(
    <div ref={popupRef} className="dt-flt-popup dt-flt-popup--select"
      style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
      role="dialog" aria-label={`فلتر ${header}`}>
      {header && <div className="dt-flt-popup-title"><i className="ti ti-list" />{header}</div>}
      <div className="dt-flt-radio-list" role="listbox">
        <div
          role="option"
          aria-selected={value === ''}
          className={`dt-flt-radio-item${value === '' ? ' on' : ''}`}
          onClick={() => { onChange(''); onClose(); }}
        >
          <span className="dt-flt-radio-dot" />
          <span>الكل</span>
        </div>
        {col.filter.options.map(o => (
          <div
            key={o.value}
            role="option"
            aria-selected={value === o.value}
            className={`dt-flt-radio-item${value === o.value ? ' on' : ''}`}
            onClick={() => { onChange(o.value); onClose(); }}
          >
            <span className="dt-flt-radio-dot" />
            <span>{o.label}</span>
            {value === o.value && <i className="ti ti-check dt-flt-radio-check" />}
          </div>
        ))}
      </div>
      {hasVal && (
        <div className="dt-flt-footer">
          <button className="dt-flt-clear" onClick={() => { onChange(''); onClose(); }} type="button">
            مسح الفلتر
          </button>
        </div>
      )}
    </div>,
    document.body,
  );

  // ════════════════════════════════════════════════════════════════════════
  // ٣. Number Filter — Presets + Range inputs + Slider
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'number') {
    const { min, max } = decodeRange(value);
    const presets = (col.filter as any).presets as { label: string; min: string; max: string }[] | undefined;
    return createPortal(
      <div ref={popupRef} className="dt-flt-popup dt-flt-popup--number"
        style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
        role="dialog" aria-label={`فلتر ${header}`}>
        {header && <div className="dt-flt-popup-title"><i className="ti ti-hash" />{header}</div>}

        {/* Presets — pills */}
        {presets && presets.length > 0 && (
          <div className="dt-flt-pills">
            {presets.map(p => {
              const active = min === p.min && max === p.max;
              return (
                <button
                  key={`${p.min}-${p.max}`}
                  type="button"
                  className={`dt-flt-pill${active ? ' act' : ''}`}
                  onClick={() => onChange(encodeRange(p.min, p.max))}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Range inputs */}
        <div className="dt-flt-range-wrap">
          <div className="dt-flt-range-field">
            <label className="dt-flt-range-label">من</label>
            <input className={`dt-fi${min ? ' act' : ''}`} type="number"
              value={min} placeholder="0"
              onChange={e => onChange(encodeRange(e.target.value, max))}
            />
          </div>
          <div className="dt-flt-range-sep"><i className="ti ti-minus" /></div>
          <div className="dt-flt-range-field">
            <label className="dt-flt-range-label">إلى</label>
            <input className={`dt-fi${max ? ' act' : ''}`} type="number"
              value={max} placeholder="∞"
              onChange={e => onChange(encodeRange(min, e.target.value))}
            />
          </div>
        </div>

        {hasVal && (
          <div className="dt-flt-footer">
            <button className="dt-flt-clear" onClick={() => { onChange(''); onClose(); }} type="button">
              مسح الفلتر
            </button>
          </div>
        )}
      </div>,
      document.body,
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ٤. Date Filter — تابين: اختصارات + يدوي
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'date') {
    const { min, max } = decodeRange(value);
    // دعم presets مخصصة — المطوّر يُحدد مفاتيح فرعية من SHORTCUT_GROUPS
    const allowedKeys = (col.filter as { presets?: string[] }).presets;
    const visibleGroups = allowedKeys
      ? SHORTCUT_GROUPS
          .map(g => ({ ...g, items: g.items.filter(s => allowedKeys.includes(s.key)) }))
          .filter(g => g.items.length > 0)
      : SHORTCUT_GROUPS;

    const activePreset = visibleGroups.flatMap(g => g.items).find(s => matchesPreset(value, s.key));

    return createPortal(
      <div ref={popupRef} className="dt-flt-popup dt-flt-popup--date"
        style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
        role="dialog" aria-label={`فلتر ${header}`}>
        {header && (
          <div className="dt-flt-popup-title">
            <i className="ti ti-calendar" />
            {header}
            {hasVal && activePreset && (
              <span className="dt-flt-title-badge">{activePreset.label}</span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="dt-flt-tabs" role="tablist">
          <button
            role="tab"
            type="button"
            className={`dt-flt-tab${dateTab === 'shortcuts' ? ' on' : ''}`}
            aria-selected={dateTab === 'shortcuts'}
            onClick={() => setDateTab('shortcuts')}
          >
            <i className="ti ti-bolt" />
            اختصارات
          </button>
          <button
            role="tab"
            type="button"
            className={`dt-flt-tab${dateTab === 'manual' ? ' on' : ''}`}
            aria-selected={dateTab === 'manual'}
            onClick={() => setDateTab('manual')}
          >
            <i className="ti ti-calendar-event" />
            يدوي
            {hasVal && dateTab !== 'manual' && !activePreset && (
              <span className="dt-flt-tab-dot" />
            )}
          </button>
        </div>

        {/* Tab: اختصارات */}
        {dateTab === 'shortcuts' && (
          <div className="dt-flt-sc-wrap">
            {visibleGroups.map(group => (
              <div key={group.label} className="dt-flt-sc-group">
                <div className="dt-flt-sc-label">{group.label}</div>
                <div className="dt-flt-sc-grid">
                  {group.items.map(sc => {
                    const active = matchesPreset(value, sc.key);
                    return (
                      <button
                        key={sc.key}
                        type="button"
                        className={`dt-flt-sc-btn${active ? ' act' : ''}`}
                        onClick={() => {
                          const r = getDateRange(sc.key);
                          onChange(encodeRange(r.min, r.max));
                          onClose();
                        }}
                        title={(() => { const r = getDateRange(sc.key); return `${r.min} — ${r.max}`; })()}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: يدوي */}
        {dateTab === 'manual' && (
          <div className="dt-flt-manual-wrap">
            <div className="dt-flt-manual-field">
              <label className="dt-flt-range-label">
                <i className="ti ti-calendar-event" />
                من
              </label>
              <input
                className={`dt-fi${min ? ' act' : ''}`}
                type="date" value={min}
                onChange={e => onChange(encodeRange(e.target.value, max))}
                aria-label="تاريخ البداية"
              />
            </div>
            <div className="dt-flt-manual-field">
              <label className="dt-flt-range-label">
                <i className="ti ti-calendar-event" />
                إلى
              </label>
              <input
                className={`dt-fi${max ? ' act' : ''}`}
                type="date" value={max}
                onChange={e => onChange(encodeRange(min, e.target.value))}
                aria-label="تاريخ النهاية"
              />
            </div>
            {min && max && (
              <div className="dt-flt-manual-preview">
                <i className="ti ti-calendar-stats" />
                {min} — {max}
              </div>
            )}
          </div>
        )}

        {hasVal && (
          <div className="dt-flt-footer">
            <button className="dt-flt-clear" onClick={() => { onChange(''); onClose(); }} type="button">
              مسح الفلتر
            </button>
          </div>
        )}
      </div>,
      document.body,
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // ٥. Multiselect / Dynamic-multiselect (موجود ومحسّن)
  // ════════════════════════════════════════════════════════════════════════
  if (type === 'multiselect') return createPortal(
    <div ref={popupRef} className="dt-flt-popup dt-flt-popup--multi"
      style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
      role="dialog" aria-label={`فلتر ${header}`}>
      {header && <div className="dt-flt-popup-title"><i className="ti ti-filter" />{header}</div>}
      <StaticMultiSelect
        options={col.filter.options as { value: string; label: string }[]}
        value={value} onChange={onChange} onClose={onClose}
      />
    </div>,
    document.body,
  );

  if (type === 'dynamic-multiselect') {
    const sourceData = allData ?? data ?? [];
    const rawValues = [...new Set(
      sourceData.map(row => { const v = getRawValue(row, col); return v == null ? '' : String(v); }).filter(Boolean)
    )];
    return createPortal(
      <div ref={popupRef} className="dt-flt-popup dt-flt-popup--multi"
        style={{ position:'fixed', top:pos.top, left:pos.left, zIndex:99999 }}
        role="dialog" aria-label={`فلتر ${header}`}>
        {header && <div className="dt-flt-popup-title"><i className="ti ti-filter" />{header}</div>}
        <DynamicMultiSelect
          rawValues={rawValues}
          labelFormatter={(col.filter as any).labelFormatter}
          value={value} onChange={onChange} onClose={onClose}
        />
      </div>,
      document.body,
    );
  }

  return null;
});

export default FilterPopup;
