import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveSlug } from '@/lib/store/appStore';
import { readOverrides, KB_DEFAULTS, normalizeEventKey } from '@/pos/hooks/useKeyboardMap';

interface KeyboardHelpModalProps {
  onClose: () => void;
}

interface ShortcutItem {
  action: string;
  defaultKey: string;
  desc: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

function keyLabel(key: string): string {
  const map: Record<string, string> = {
    'NumpadAdd': 'Num+',
    'NumpadSubtract': 'Num-',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'Escape': 'Esc',
  };
  return map[key] ?? key;
}

export default function KeyboardHelpModal({ onClose }: KeyboardHelpModalProps) {
  const slug = useActiveSlug();

  const [editing, setEditing] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>(() => readOverrides(slug));
  const [conflict, setConflict] = useState<string | null>(null);
  const captureRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!slug) return;
    try {
      localStorage.setItem(`pos-kb-override-${slug}`, JSON.stringify(overrides));
    } catch {}
  }, [overrides, slug]);

  const groups: ShortcutGroup[] = [
    {
      title: 'الوظائف الرئيسية',
      items: [
        { action: 'searchFocus', defaultKey: 'F2', desc: 'تركيز شريط البحث' },
        { action: 'payment', defaultKey: 'F4', desc: 'فتح مودال الدفع' },
        { action: 'holdCart', defaultKey: 'F5', desc: 'تعليق الفاتورة الحالية' },
        { action: 'heldCarts', defaultKey: 'F7', desc: 'الفواتير المعلقة' },
        { action: 'preview', defaultKey: 'F9', desc: 'معاينة / طباعة' },
        { action: 'clearCart', defaultKey: 'F12', desc: 'مسح السلة' },
      ],
    },
    {
      title: 'أدوات إضافية',
      items: [
        { action: 'kbHelp', defaultKey: 'F1', desc: 'هذه المساعدة' },
        { action: 'filter', defaultKey: 'F3', desc: 'لوحة الفلتر' },
        { action: 'manualProduct', defaultKey: 'F6', desc: 'إضافة منتج يدوي' },
        { action: 'sessionStats', defaultKey: 'F8', desc: 'إحصاءات الجلسة' },
        { action: 'fullscreen', defaultKey: 'F11', desc: 'وضع الشاشة الكاملة' },
        { action: 'directPrint', defaultKey: 'Ctrl+P', desc: 'طباعة مباشرة' },
      ],
    },
    {
      title: 'التنقل والعرض',
      items: [
        { action: 'quickSearch', defaultKey: 'Ctrl+F', desc: 'البحث السريع' },
        { action: 'gridView', defaultKey: 'Ctrl+ArrowUp', desc: 'عرض الشبكة' },
        { action: 'listView', defaultKey: 'Ctrl+ArrowDown', desc: 'عرض القائمة' },
        { action: 'zoomIn', defaultKey: 'Ctrl+=', desc: 'تكبير الشبكة' },
        { action: 'zoomOut', defaultKey: 'Ctrl+-', desc: 'تصغير الشبكة' },
        { action: 'quickCat', defaultKey: 'Alt+1..9', desc: 'تصنيف سريع' },
      ],
    },
    {
      title: 'السلة والأصناف',
      items: [
        { action: 'qtyUp', defaultKey: 'NumpadAdd', desc: 'زيادة كمية آخر صنف' },
        { action: 'qtyDown', defaultKey: 'NumpadSubtract', desc: 'إنقاص كمية آخر صنف' },
        { action: 'deleteItem', defaultKey: 'Delete', desc: 'حذف الصنف المحدد' },
        { action: 'enterSearch', defaultKey: 'Enter', desc: 'إضافة أول نتيجة' },
        { action: 'escape', defaultKey: 'Escape', desc: 'إغلاق المودال / مسح البحث' },
        { action: 'confirmPayment', defaultKey: 'Ctrl+Enter', desc: 'تأكيد الدفع' },
      ],
    },
    {
      title: 'الماسح الضوئي',
      items: [
        { action: 'barcode', defaultKey: 'Barcode', desc: 'ينشّط تلقائياً بمسح الباركود' },
        { action: 'charBuffer', defaultKey: 'أي حرف', desc: 'يُجمع في buffer 300ms' },
        { action: 'barcodeEnter', defaultKey: 'Enter', desc: 'تأكيد الباركود وإضافة الصنف' },
      ],
    },
  ];

  function displayKey(item: ShortcutItem): string {
    return overrides[item.action] ?? item.defaultKey;
  }

  function isDuplicate(action: string, newKey: string): string | null {
    for (const g of groups) {
      for (const item of g.items) {
        if (item.action === action) continue;
        if (displayKey(item) === newKey) return item.desc;
      }
    }
    return null;
  }

  const startEdit = useCallback((action: string) => {
    setEditing(action);
    setListening(true);
    setConflict(null);
  }, []);

  useEffect(() => {
    if (editing) captureRef.current?.focus();
  }, [editing]);

  const handleKeyCapture = useCallback((e: React.KeyboardEvent) => {
    if (!listening || !editing) return;
    e.preventDefault();
    e.stopPropagation();

    const combo = normalizeEventKey(e as unknown as KeyboardEvent);
    if (combo === 'Escape') {
      setEditing(null);
      setListening(false);
      setConflict(null);
      return;
    }

    const dup = isDuplicate(editing, combo);
    if (dup) {
      setConflict(dup);
      return;
    }

    setConflict(null);
    setOverrides(prev => {
      const next = { ...prev, [editing]: combo };
      const defKey = KB_DEFAULTS[editing];
      if (combo === defKey) {
        delete next[editing];
      }
      return next;
    });
    setEditing(null);
    setListening(false);
  }, [listening, editing]);

  function resetAll() {
    setOverrides({});
    setConflict(null);
    setEditing(null);
    setListening(false);
  }

  return (
    <div className="ov on" onClick={onClose}
      onKeyDown={handleKeyCapture}
      tabIndex={-1}
      ref={el => el?.focus()}
    >
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="m-hd">
          <div className="m-title"><i className="ti ti-keyboard" style={{ marginLeft: 6 }} /> تخصيص الاختصارات</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {Object.keys(overrides).length > 0 && (
              <button className="btn btn-xs btn-w" onClick={resetAll} type="button">
                <i className="ti ti-refresh" /> إعادة ضبط
              </button>
            )}
            <div className="m-x" onClick={onClose}><i className="ti ti-x" /></div>
          </div>
        </div>
        <div className="m-body">
          {listening && editing && (
            <div className="al al-i" style={{ marginBottom: 12 }}>
              <i className="ti ti-keyboard" /> اضغط المفتاح الذي تريد تعيينه لـ "<b>{groups.flatMap(g => g.items).find(i => i.action === editing)?.desc}</b>" — <b>Esc</b> للإلغاء
            </div>
          )}
          {conflict && (
            <div className="al al-r" style={{ marginBottom: 12 }}>
              <i className="ti ti-alert-triangle" /> هذا المفتاح مستخدم بالفعل لـ "<b>{conflict}</b>"
            </div>
          )}
          <div className="kb-help-groups">
            {groups.map(g => (
              <div key={g.title} className="kb-group">
                <div className="kb-group-title">{g.title}</div>
                <div className="kb-help-grid">
                  {g.items.map(s => {
                    const cur = displayKey(s);
                    const isEditing = editing === s.action;
                    return (
                      <div key={s.action} className={`kb-help-row ${isEditing ? 'kb-edit-on' : ''}`}>
                        {isEditing ? (
                          <kbd className="kb-key kb-capture" ref={captureRef}>
                            <i className="ti ti-corner-down-left" style={{ fontSize: 12 }} /> انتظر...
                          </kbd>
                        ) : (
                          <kbd
                            className="kb-key kb-key-clickable"
                            onClick={() => startEdit(s.action)}
                            title="اضغط لتعديل الاختصار"
                          >
                            {keyLabel(cur)}
                            <i className="ti ti-edit" style={{ fontSize: 9, marginRight: 3 }} />
                          </kbd>
                        )}
                        <span className="kb-desc">{s.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="m-foot">
          <button className="btn" onClick={onClose} type="button">إغلاق</button>
        </div>
      </div>
    </div>
  );
}
