import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useActiveSlug } from '@/lib/store/appStore';
import { KB_DEFAULTS, normalizeEventKey, type KbOverrides } from '@/pos/hooks/useKeyboardMap';
import { readOverrides, saveOverrides, addShortcut, removeShortcut } from '@/pos/hooks/useKeyboardMap';
import Modal from '@/components/ui/Modal';

interface KeyboardHelpModalProps {
  onClose: () => void;
}

interface ShortcutItem {
  action: string;
  desc: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

// function _keyLabel(key: string): string {
//   const map: Record<string, string> = {
//     NumpadAdd: 'Num+',
//     NumpadSubtract: 'Num-',
//     ArrowUp: '↑',
//     ArrowDown: '↓',
//     Escape: 'Esc',
//   };
//   return map[key] ?? key;
// }

/* Build display string from combo: "Ctrl+Alt+K" → ["Ctrl","Alt","K"] → "Ctrl+Alt+K" (no change needed) */
function comboDisplay(combo: string): string {
  return combo;
}

export default function KeyboardHelpModal({ onClose }: KeyboardHelpModalProps) {
  const slug = useActiveSlug();

  const [overrides, setOverrides] = useState<KbOverrides>(() => readOverrides(slug));
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveOverrides(slug, overrides);
  }, [overrides, slug]);

  /* ─── Shortcut groups ─────────────────────────────────────────────────── */

  const groups: ShortcutGroup[] = [
    {
      title: 'الوظائف الرئيسية',
      items: [
        { action: 'searchFocus', desc: 'تركيز شريط البحث' },
        { action: 'payment', desc: 'فتح مودال الدفع' },
        { action: 'holdCart', desc: 'تعليق الفاتورة الحالية' },
        { action: 'heldCarts', desc: 'الفواتير المعلقة' },
        { action: 'preview', desc: 'معاينة / طباعة' },
        { action: 'clearCart', desc: 'مسح السلة' },
        { action: 'newSale', desc: 'فاتورة جديدة' },
      ],
    },
    {
      title: 'أدوات إضافية',
      items: [
        { action: 'kbHelp', desc: 'هذه المساعدة' },
        { action: 'filter', desc: 'لوحة الفلتر' },
        { action: 'manualProduct', desc: 'إضافة منتج يدوي' },
        { action: 'sessionStats', desc: 'إحصاءات الجلسة' },
        { action: 'fullscreen', desc: 'وضع الشاشة الكاملة' },
        { action: 'directPrint', desc: 'طباعة مباشرة' },
        { action: 'sessionInvoices', desc: 'فواتير الجلسة' },
        { action: 'settings', desc: 'إعدادات نقاط البيع' },
        { action: 'toggleQuickbar', desc: 'إظهار/إخفاء الشريط السريع' },
        { action: 'kioskMode', desc: 'وضع الكشك' },
        { action: 'closeSession', desc: 'إغلاق الجلسة' },
      ],
    },
    {
      title: 'التنقل والعرض',
      items: [
        { action: 'toggleHeld', desc: 'التنقل بين السلة والمعلقة' },
        { action: 'quickSearch', desc: 'البحث السريع' },
        { action: 'gridView', desc: 'عرض الشبكة' },
        { action: 'listView', desc: 'عرض القائمة' },
        { action: 'zoomIn', desc: 'تكبير الشبكة' },
        { action: 'zoomOut', desc: 'تصغير الشبكة' },
        { action: 'quickCat', desc: 'تصنيف سريع' },
      ],
    },
    {
      title: 'السلة',
      items: [
        { action: 'focusCart', desc: 'التركيز على السلة والتنقل بينها وبين البحث' },
        { action: 'focusClient', desc: 'اختيار / إضافة زبون' },
        { action: 'qtyUp', desc: 'زيادة كمية آخر صنف' },
        { action: 'qtyDown', desc: 'إنقاص كمية آخر صنف' },
        { action: 'deleteItem', desc: 'حذف الصنف المحدد من السلة' },
        { action: 'confirmPayment', desc: 'تأكيد الدفع وإتمام الفاتورة' },
        { action: 'undoClear', desc: 'تراجع عن مسح السلة' },
      ],
    },
    {
      title: 'إجراءات سريعة',
      items: [
        { action: 'enterSearch', desc: 'إضافة أول نتيجة بحث' },
        { action: 'escape', desc: 'إغلاق المودال / مسح البحث' },
        { action: 'quickCash', desc: 'دفع سريع نقدي (Full Cash)' },
        { action: 'openDrawer', desc: 'فتح درج النقود' },
      ],
    },
  ];

  /* ─── Helpers ──────────────────────────────────────────────────────────── */

  /** Get all currently assigned shortcuts across ALL actions */
  // function _allAssignedShortcuts(): Map<string, string> {
  //   const map = new Map<string, string>();
  //   for (const g of groups) {
  //     for (const item of g.items) {
  //       const combos = overrides[item.action] ?? [];
  //       for (const c of combos) {
  //         map.set(c, item.desc);
  //       }
  //     }
  //   }
  //   return map;
  // }

  /** Get the effective shortcuts for an action (overrides first, then default) */
  function getShortcuts(action: string): string[] {
    const arr = overrides[action];
    if (arr && arr.length > 0) return arr;
    const def = KB_DEFAULTS[action];
    return def ? [def] : [];
  }

  /** Check if combo is used by a different action (not the current one) */
  function findConflict(combo: string, excludeAction: string): string | null {
    for (const g of groups) {
      for (const item of g.items) {
        if (item.action === excludeAction) continue;
        const combos = overrides[item.action] ?? [];
        if (combos.includes(combo)) return item.desc;
        // Also check defaults if not overridden
        if (combos.length === 0 && KB_DEFAULTS[item.action] === combo) return item.desc;
      }
    }
    return null;
  }

  const descForAction = useCallback((action: string): string => {
    for (const g of groups) {
      for (const item of g.items) {
        if (item.action === action) return item.desc;
      }
    }
    return action;
  }, []);

  /* ─── Recording mode ───────────────────────────────────────────────────── */

  const startAdd = useCallback((action: string) => {
    setEditingAction(action);
    setListening(true);
    setConflict(null);
  }, []);

  useEffect(() => {
    if (editingAction && listening) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => captureRef.current?.focus());
    }
  }, [editingAction, listening]);

  const handleKeyCapture = useCallback((e: React.KeyboardEvent) => {
    if (!listening || !editingAction) return;
    e.preventDefault();
    e.stopPropagation();

    const combo = normalizeEventKey(e as unknown as KeyboardEvent);

    // Skip modifier-only keys
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    // Escape or Delete/Backspace while recording = cancel
    if (combo === 'Escape' || combo === 'Delete' || combo === 'Backspace') {
      setEditingAction(null);
      setListening(false);
      setConflict(null);
      return;
    }

    const conflictDesc = findConflict(combo, editingAction);
    if (conflictDesc) {
      setConflict(conflictDesc);
      return;
    }

    setConflict(null);
    setOverrides(prev => addShortcut(prev, editingAction, combo));
    setEditingAction(null);
    setListening(false);
  }, [listening, editingAction]);

  const removeAction = useCallback((action: string, combo: string) => {
    setConflict(null);
    setOverrides(prev => removeShortcut(prev, action, combo));
  }, []);

  const resetAll = useCallback(() => {
    setOverrides({});
    setConflict(null);
    setEditingAction(null);
    setListening(false);
  }, []);

  /* ─── Render ───────────────────────────────────────────────────────────── */

  return (
    <Modal open onClose={onClose} title="تخصيص الاختصارات" size="lg"
      footer={<button className="btn" onClick={onClose} type="button">إغلاق</button>}>
      <div onKeyDown={handleKeyCapture} tabIndex={-1} ref={el => { if (el) (captureRef as any).current = el; }}>
        {/* Recording banner */}
        {listening && editingAction && (
          <div className="al al-i" style={{ marginBottom: 12 }}>
            <i className="ti ti-keyboard" /> اضغط المفتاح — &ldquo;<b>{descForAction(editingAction)}</b>&rdquo; — <b>Esc</b> للإلغاء
          </div>
        )}

        {/* Conflict warning */}
        {conflict && (
          <div className="al al-r" style={{ marginBottom: 12 }}>
            <i className="ti ti-alert-triangle" /> هذا المفتاح مستخدم بالفعل لـ &ldquo;<b>{conflict}</b>&rdquo;
          </div>
        )}

        {/* Reset button */}
        {Object.keys(overrides).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <button className="btn btn-xs btn-w" onClick={resetAll} type="button">
              <i className="ti ti-refresh" /> إعادة ضبط الكل
            </button>
          </div>
        )}

        {/* Groups */}
        <div className="kb-help-groups">
          {groups.map(g => (
            <div key={g.title} className="kb-group">
              <div className="kb-group-title">{g.title}</div>
              <div className="kb-help-grid">
                {g.items.map(item => {
                  const combos = getShortcuts(item.action);
                  const isEditing = editingAction === item.action;
                  const _isDefault = overrides[item.action]?.length === 0 || !overrides[item.action]; void _isDefault;
                  return (
                    <div key={item.action} className={`kb-help-row ${isEditing ? 'kb-edit-on' : ''}`}>
                      <span className="kb-desc">{item.desc}</span>
                      <div className="kb-shortcut-group">
                        {/* Existing key badges */}
                        {combos.map((combo, idx) => (
                          <kbd key={`${combo}-${idx}`} className="kb-key kb-key-badge">
                            <span>{comboDisplay(combo)}</span>
                            {!isEditing && (
                              <button
                                className="kb-key-remove"
                                onClick={(e) => { e.stopPropagation(); removeAction(item.action, combo); }}
                                title="إزالة"
                              >
                                ✕
                              </button>
                            )}
                          </kbd>
                        ))}

                        {/* Recording placeholder */}
                        {isEditing && (
                          <kbd className="kb-key kb-capture kb-capture-mini" ref={captureRef}>
                            <i className="ti ti-plus" style={{ fontSize: 10 }} /> انتظر...
                          </kbd>
                        )}

                        {/* Add button (hidden while recording this action) */}
                        {!isEditing && (
                          <button
                            className="kb-add-btn"
                            onClick={() => startAdd(item.action)}
                            title="إضافة اختصار"
                          >
                            <i className="ti ti-plus" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
