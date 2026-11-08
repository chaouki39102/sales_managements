// DataTable/parts/dialogs/ShortcutsDialog.tsx — keyboard shortcuts overlay
// Extracted verbatim from DataTable.tsx (no behaviour change).

import type { DataTableState } from '../../internal/useDataTableState';

export default function ShortcutsDialog<T>({ s }: { s: DataTableState<T> }) {
  const { enableSmartFilter, setShortcutsOpen } = s;

  return (
    <div className="dt-overlay" role="presentation" aria-hidden="true">
      <div
        className="dt-dialog dt-shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="اختصارات لوحة المفاتيح"
        style={{ maxWidth: 480 }}
      >
        <div className="dt-dialog-header">
          <span className="dt-dialog-title">
            <i className="ti ti-keyboard" />
            اختصارات لوحة المفاتيح
          </span>
          <button
            className="dt-dialog-close"
            onClick={() => setShortcutsOpen(false)}
            type="button"
            aria-label="إغلاق"
          >
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="dt-dialog-body" style={{ padding: '12px 16px' }}>
          <table className="dt-shortcuts-table">
            <tbody>
              <tr><td><kbd>?</kbd></td><td>إظهار/إخفاء الاختصارات</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>F</kbd></td><td>بحث سريع</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>E</kbd></td><td>تصدير</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>حفظ الفلتر</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd></td><td>حفظ العرض</td></tr>
              <tr><td><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></td><td>التنقل بين الخلايا</td></tr>
              <tr><td><kbd>Enter</kbd></td><td>تعديل الخلايا / فتح السطر</td></tr>
              <tr><td><kbd>Escape</kbd></td><td>إلغاء التعديل / إغلاق النافذة</td></tr>
              <tr><td><kbd>Space</kbd></td><td>تحديد السطر</td></tr>
              <tr><td><kbd>Ctrl</kbd>+<kbd>A</kbd></td><td>تحديد الكل</td></tr>
              <tr><td><kbd>Home</kbd></td><td>العمود الأول</td></tr>
              <tr><td><kbd>End</kbd></td><td>العمود الأخير</td></tr>
              {enableSmartFilter && <tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd></td><td>فلتر ذكي (NL)</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="dt-dialog-footer">
          <button className="dt-tbtn" onClick={() => setShortcutsOpen(false)} type="button">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
