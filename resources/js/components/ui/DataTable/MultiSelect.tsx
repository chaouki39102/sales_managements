// ════════════════════════════════════════════════════════════════════════════
// DataTable/MultiSelect.tsx  —  v8.2
// (لا تغييرات جوهرية – آلية المزامنة تعمل لأن المكون يُعاد تحميله)
// ════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';

interface BaseMultiSelectProps {
  value:    string;
  onChange: (csv: string) => void;
  onClose:  () => void;
}

interface StaticMultiSelectProps extends BaseMultiSelectProps {
  options: readonly { value: string; label: string }[];
}

export const StaticMultiSelect = memo(function StaticMultiSelect({
  options, value, onChange, onClose,
}: StaticMultiSelectProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(
    () => value ? value.split(',').filter(Boolean) : [],
  );
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTempSelected(value ? value.split(',').filter(Boolean) : []);
  }, [value]);

  const filtered = useMemo(
    () => search ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) : [...options],
    [options, search],
  );

  const toggle = useCallback((val: string) => {
    setTempSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }, []);

  const selectAll = useCallback(() => setTempSelected(options.map(o => o.value)), [options]);
  const clearAll = useCallback(() => setTempSelected([]), []);
  const apply = useCallback(() => { onChange(tempSelected.join(',')); onClose(); }, [tempSelected, onChange, onClose]);
  const clear = useCallback(() => { onChange(''); onClose(); }, [onChange, onClose]);

  return (
    <MultiSelectShell
      options={filtered}
      selected={tempSelected}
      search={search}
      onSearch={setSearch}
      onToggle={toggle}
      onSelectAll={selectAll}
      onClearAll={clearAll}
      onApply={apply}
      onClear={clear}
      selectedCount={tempSelected.length}
    />
  );
});

interface DynamicMultiSelectProps extends BaseMultiSelectProps {
  rawValues:       string[];
  labelFormatter?: (v: string) => string;
}

export const DynamicMultiSelect = memo(function DynamicMultiSelect({
  rawValues, labelFormatter, value, onChange, onClose,
}: DynamicMultiSelectProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(
    () => value ? value.split(',').filter(Boolean) : [],
  );
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTempSelected(value ? value.split(',').filter(Boolean) : []);
  }, [value]);

  const allOptions = useMemo(
    () => rawValues.slice().sort((a, b) => a.localeCompare(b, 'ar')).map(v => ({ value: v, label: labelFormatter ? labelFormatter(v) : v })),
    [rawValues, labelFormatter],
  );

  const filtered = useMemo(() => search ? allOptions.filter(o => o.label.includes(search)) : allOptions, [allOptions, search]);

  const toggle = useCallback((val: string) => {
    setTempSelected(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }, []);

  const selectAll = useCallback(() => setTempSelected(allOptions.map(o => o.value)), [allOptions]);
  const clearAll = useCallback(() => setTempSelected([]), []);
  const apply = useCallback(() => { onChange(tempSelected.join(',')); onClose(); }, [tempSelected, onChange, onClose]);
  const clear = useCallback(() => { onChange(''); onClose(); }, [onChange, onClose]);

  return (
    <MultiSelectShell
      options={filtered}
      selected={tempSelected}
      search={search}
      onSearch={setSearch}
      onToggle={toggle}
      onSelectAll={selectAll}
      onClearAll={clearAll}
      onApply={apply}
      onClear={clear}
      selectedCount={tempSelected.length}
      searchPlaceholder="بحث في الخيارات..."
    />
  );
});

interface ShellProps {
  options:           { value: string; label: string }[];
  selected:          string[];
  search:            string;
  onSearch:          (v: string) => void;
  onToggle:          (v: string) => void;
  onSelectAll:       () => void;
  onClearAll:        () => void;
  onApply:           () => void;
  onClear:           () => void;
  selectedCount:     number;
  searchPlaceholder?: string;
}

const MultiSelectShell = memo(function MultiSelectShell({
  options, selected, search, onSearch, onToggle,
  onSelectAll, onClearAll, onApply, onClear,
  selectedCount, searchPlaceholder = 'بحث...',
}: ShellProps) {
  return (
    <>
      <div className="dt-ms-controls">
        <button className="dt-ms-ctrl-btn" onClick={onSelectAll} disabled={options.length === 0}>
          <i className="ti ti-check" /> تحديد الكل
        </button>
        <button className="dt-ms-ctrl-btn" onClick={onClearAll} disabled={selectedCount === 0}>
          <i className="ti ti-square" /> إلغاء الكل
        </button>
      </div>

      <div className="dt-ms-search-wrap">
        <input className="dt-fi" type="text" placeholder={searchPlaceholder} value={search} onChange={e => onSearch(e.target.value)} autoFocus />
        <i className="ti ti-search dt-ms-search-icon" />
      </div>

      <div className="dt-ms-list" role="listbox" aria-multiselectable="true">
        {options.map(opt => {
          const isOn = selected.includes(opt.value);
          return (
            <div
              key={opt.value}
              role="option"
              aria-selected={isOn}
              className={`dt-ms-item${isOn ? ' on' : ''}`}
              onClick={() => onToggle(opt.value)}
              onKeyDown={e => e.key === 'Enter' && onToggle(opt.value)}
              tabIndex={0}
            >
              <span className="dt-ms-check"><i className={`ti ${isOn ? 'ti-checkbox-checked' : 'ti-checkbox'}`} /></span>
              <span className="dt-ms-label" title={opt.label}>{opt.label}</span>
            </div>
          );
        })}
        {options.length === 0 && <div className="dt-ms-empty">{search ? `لا نتائج لـ "${search}"` : 'لا توجد خيارات'}</div>}
      </div>

      <div className="dt-flt-footer dt-flt-footer-between">
        <span className="dt-ms-selected-count">{selectedCount > 0 ? `${selectedCount} محدد` : 'لا يوجد تحديد'}</span>
        <div className="dt-ms-footer-actions">
          <button className="dt-flt-clear" onClick={onClear}>مسح الفلتر</button>
          <button className="dt-ms-apply" onClick={onApply} disabled={selectedCount === 0}>تطبيق</button>
        </div>
      </div>
    </>
  );
});
