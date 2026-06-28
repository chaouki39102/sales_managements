import { useState, useRef, useCallback, useEffect } from 'react';
import { fieldRegistry } from '@/reporting';
import { formulaEngine } from '@/reporting';

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showFieldPicker?: boolean;
  width?: string;
}

const FUNCTIONS = ['IF', 'SUM', 'AVG', 'ROUND', 'CONCAT', 'FORMAT', 'TODAY', 'MIN', 'MAX', 'COUNT'];

function insertAtCursor(input: HTMLInputElement, text: string) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  const newValue = before + text + after;
  const cursorPos = start + text.length;
  return { newValue, cursorPos };
}

export default function FormulaEditor({
  value,
  onChange,
  label,
  placeholder,
  showFieldPicker = true,
  width,
}: FormulaEditorProps) {
  const [validation, setValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const filteredGroups = useRef(fieldRegistry.getAllGroups());

  const doValidate = useCallback((expr: string) => {
    if (!expr.trim()) {
      setValidation(null);
      return;
    }
    const result = formulaEngine.validate(expr);
    setValidation(result);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      onChange(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doValidate(v), 300);
    },
    [onChange, doValidate],
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    doValidate(value);
  }, [value, doValidate]);

  const insertText = useCallback(
    (text: string) => {
      if (!inputRef.current) {
        onChange(value + text);
        return;
      }
      const { newValue, cursorPos } = insertAtCursor(inputRef.current, text);
      onChange(newValue);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [onChange, value],
  );

  const handleFieldPick = useCallback(
    (path: string) => {
      insertText(path);
      setPickerOpen(false);
      setSearchQuery('');
    },
    [insertText],
  );

  const handleFunctionPick = useCallback(
    (fn: string) => {
      insertText(`${fn}()`);
    },
    [insertText],
  );

  // Close picker on click outside
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node) && !(e.target as HTMLElement)?.closest?.('[data-picker-toggle]')) {
        setPickerOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  // Escape closes picker
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPickerOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pickerOpen]);

  // Ctrl+Space opens picker
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();
        setPickerOpen(p => !p);
      }
    },
    [],
  );

  // Update filtered groups on search
  useEffect(() => {
    if (!pickerOpen) return;
    if (!searchQuery.trim()) {
      filteredGroups.current = fieldRegistry.getAllGroups();
    } else {
      const results = fieldRegistry.search(searchQuery);
      const groupMap = new Map<string, typeof results>();
      results.forEach(f => {
        const list = groupMap.get(f.group) ?? [];
        list.push(f);
        groupMap.set(f.group, list);
      });
      filteredGroups.current = fieldRegistry
        .getAllGroups()
        .filter(g => groupMap.has(g.id))
        .map(g => ({ ...g, fields: groupMap.get(g.id)! }));
    }
  }, [searchQuery, pickerOpen]);

  const inputWidth = width || '100%';

  const styles: Record<string, React.CSSProperties> = {
    wrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      position: 'relative',
    },
    input: {
      width: inputWidth,
      padding: '5px 8px',
      borderRadius: 4,
      border: '1px solid var(--b2, #d0d0d0)',
      fontSize: 13,
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
      paddingRight: validation ? 24 : 8,
    },
    pickerBtn: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      border: '1px solid var(--b2, #d0d0d0)',
      background: 'var(--bg, #fff)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      lineHeight: 1,
      color: 'var(--t2, #555)',
      flexShrink: 0,
    },
    validationIcon: {
      position: 'absolute' as const,
      right: showFieldPicker ? 36 : 6,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 16,
      height: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none' as const,
    },
    dropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'var(--bg, #fff)',
      border: '1px solid var(--b2, #d0d0d0)',
      borderRadius: 6,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      marginTop: 4,
      maxHeight: 300,
      display: 'flex',
      flexDirection: 'column' as const,
    },
    searchInput: {
      width: '100%',
      padding: '8px 10px',
      border: 'none',
      borderBottom: '1px solid var(--b2, #d0d0d0)',
      fontSize: 12,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    groupLabel: {
      padding: '6px 10px',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--t3, #888)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      background: 'var(--b1, #f8f8f8)',
      borderBottom: '1px solid var(--b2, #d0d0d0)',
    },
    fieldItem: {
      padding: '6px 10px',
      cursor: 'pointer',
      fontSize: 12,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--b1, #f0f0f0)',
      transition: 'background 0.15s',
    },
    fieldPath: {
      fontSize: 10,
      color: 'var(--t3, #999)',
      fontFamily: 'monospace',
    },
    fieldType: {
      fontSize: 9,
      color: 'var(--t3, #999)',
      background: 'var(--b1, #f0f0f0)',
      padding: '1px 5px',
      borderRadius: 3,
      marginLeft: 4,
    },
    chipsRow: {
      display: 'inline-flex',
      flexWrap: 'wrap' as const,
      gap: 4,
      marginTop: 4,
    },
    chip: {
      display: 'inline-flex',
      padding: '2px 8px',
      borderRadius: 12,
      background: 'var(--b1, #e8e8e8)',
      cursor: 'pointer',
      fontSize: 11,
      color: 'var(--t2, #555)',
      border: 'none',
      fontFamily: 'monospace',
      transition: 'background 0.15s',
    },
    errorTooltip: {
      fontSize: 10,
      color: '#d32f2f',
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      marginTop: 2,
      padding: '2px 6px',
      background: '#fff',
      border: '1px solid #ffcdd2',
      borderRadius: 3,
      whiteSpace: 'nowrap' as const,
      zIndex: 10,
    },
  };

  const groups = filteredGroups.current;

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 12, marginBottom: 3, color: 'var(--t2, #555)' }}>
          {label}
        </label>
      )}
      <div style={styles.wrapper}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            style={styles.input}
            value={value}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'اكتب تعبيراً...'}
          />
          {validation && (
            <span style={styles.validationIcon} title={validation.valid ? 'صحيح' : validation.error}>
              {validation.valid ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#4caf50" />
                  <path d="M5 8.5L7 10.5L11 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#f44336" />
                  <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </span>
          )}
          {validation && !validation.valid && validation.error && (
            <div style={styles.errorTooltip}>{validation.error}</div>
          )}
        </div>
        {showFieldPicker && (
          <button
            data-picker-toggle
            style={{
              ...styles.pickerBtn,
              background: pickerOpen ? 'var(--b1, #eee)' : 'var(--bg, #fff)',
              borderColor: pickerOpen ? 'var(--a, #1976d2)' : 'var(--b2, #d0d0d0)',
            }}
            onClick={() => {
              setPickerOpen(p => !p);
              if (!pickerOpen) setSearchQuery('');
            }}
            title="اختيار حقل (Ctrl+Space)"
            type="button"
          >
            <i className="ti ti-list-search" style={{ fontSize: 16 }} />
          </button>
        )}
        {pickerOpen && showFieldPicker && (
          <div ref={pickerRef} style={styles.dropdown}>
            <input
              style={styles.searchInput}
              placeholder="ابحث عن حقل..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setPickerOpen(false);
                  setSearchQuery('');
                }
              }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {groups.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--t3, #999)' }}>
                  لا توجد نتائج
                </div>
              )}
              {groups.map(group => (
                <div key={group.id}>
                  <div style={styles.groupLabel}>{group.label}</div>
                  {group.fields.map(field => (
                    <div
                      key={field.path}
                      style={styles.fieldItem}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--b1, #f0f0f0)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                      onClick={() => handleFieldPick(field.path)}
                    >
                      <span>
                        <span>{field.label}</span>
                        <span style={styles.fieldType}>{field.type}</span>
                      </span>
                      <span style={styles.fieldPath}>{field.path}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {focused && (
        <div style={styles.chipsRow}>
          {FUNCTIONS.map(fn => (
            <button
              key={fn}
              type="button"
              style={styles.chip}
              onClick={() => handleFunctionPick(fn)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--b2, #d0d0d0)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--b1, #e8e8e8)';
              }}
            >
              {fn}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
