// ════════════════════════════════════════════════════════════════════════════
// DataTable/DataTable.tsx  —  v10.5
//
// ✅ v10.5:
//    • إصلاح: فلاتر/بحث محفوظان في الرابط (URL State) للجداول server-paged
//      — عند إعادة فتح الصفحة كانت القيم تُسترجَع إلى الواجهة لكن لا تُرسَل إلى
//      onFilterChange/onSearchChange إطلاقاً → الجدول يفتح بدون أي فلترة.
//      الآن تُدفع الحالة الأولية إلى المستدعي مرة واحدة عند التركيب.
//
// ✅ كل ميزات v9 محفوظة بالكامل:
//    • Virtual Scrolling
//    • Column Reorder (سحب وإفلات)
//    • Multi‑Column Sort (فرز بأعمدة متعددة)
//    • URL State (حفظ الحالة في الرابط)
//    • Column Resize (تغيير عرض الأعمدة)
//    • Filter Popup (بوابة إلى document.body)
//
// ✅ ميزات v10:
//    • Row Grouping (تجميع الصفوف + collapse/expand + إجماليات جزئية)
//    • Column Pinning الديناميكي (تثبيت أعمدة من الرأس أو قائمة الأعمدة)
//    • Keyboard Navigation (أسهم / Tab / F2 / Enter / Escape)
//    • Batch Edit + Undo/Redo (تعديل دفعي + Ctrl+Z/Y)
//    • Cell Validation (تحقق من الخلايا مع رسائل خطأ)
//    • Conditional Formatting (تلوين شرطي)
//
// ✅ ميزات جديدة إضافية (AG Grid مستوى احترافي):
//    • Copy/Paste من Excel (لصق خلايا من جدول بيانات)
//    • Excel Export حقيقي (.xlsx مع تنسيق)
//    • Smart Filter باللغة العربية (تحليل جمل طبيعية)
//    • Saved Views (حفظ واسترجاع العروض في localStorage)
//    • Context Menu (قائمة النقر الأيمن)
//
// ✅ v10.2: Tree Data، Column Groups، Range Selection، ErrorBoundary
//
// ✅ v10.3:
//    • VirtualRow كـ memo مستقل بمقارنة عميقة — scroll لا يُعيد render الصفوف
//
// ✅ v10.4:
//    • onRowDoubleClick (نقر مزدوج على الصف)
//    • autoFitAll (توسيط كل الأعمدة بعرض محتواها)
//    • تصدير المحدد فقط (Export Selected Rows)
//    • emptyNode / loadingNode (Overlays مخصصة)
//    • Sparkline (مخطط مصغّر SVG — re-export مستقل)
//    • pinTopRows / pinBottomRows (تثبيت صفوف أعلى/أسفل — غير virtual)
// ════════════════════════════════════════════════════════════════════════════

import type { DataTableProps } from './types';
import ContextMenu from './ContextMenu';
import { useDataTableState } from './internal/useDataTableState';
import ToolbarLeft from './parts/toolbar/ToolbarLeft';
import ToolbarRight from './parts/toolbar/ToolbarRight';
import QuickFilterBar from './parts/QuickFilterBar';
import BulkBar from './parts/BulkBar';
import DesktopTable from './parts/table/DesktopTable';
import MobileCards from './parts/MobileCards';
import PaginationFooter from './parts/PaginationFooter';
import VirtualFooter from './parts/VirtualFooter';
import BatchEditBar from './parts/BatchEditBar';
import SmartFilterDialog from './parts/dialogs/SmartFilterDialog';
import SaveViewDialog from './parts/dialogs/SaveViewDialog';
import './datatable.css';
import ShortcutsDialog from './parts/dialogs/ShortcutsDialog';

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
//
// State & handlers live in ./internal (useDataTableState); markup lives in
// ./parts. This file only composes them.
// ════════════════════════════════════════════════════════════════════════════

export function DataTable<T = Record<string, unknown>>(props: DataTableProps<T>) {
  const s = useDataTableState(props);
  const {
    batch, batchEdit, bulkActions, closeMenu, compact,
    contextMenuItems, defaultContextMenuItems, enableContextMenu, enableQuickFilter, enableSavedViews,
    enableSmartFilter, error, isVirtual, kbHandleKeyDown, keyboardNav,
    menuState, qfIsOpen, saveViewDialogOpen, selectable, selectedKeys,
    shortcutsOpen, smartFilterOpen, toolbarRef,
  } = s;

  return (
    <div
      className={`dt-v7${compact ? ' compact' : ''}`}
      tabIndex={keyboardNav ? 0 : undefined}
      onKeyDown={keyboardNav ? kbHandleKeyDown : undefined}
    >
      {/* ══ TOOLBAR ═════════════════════════════════════════════════════════ */}
      <div ref={toolbarRef} className="dt-toolbar">
        <ToolbarLeft s={s} />

        <ToolbarRight s={s} />
      </div>

      {/* ══ QUICK FILTER BAR ═════════════════════════════════════════════════ */}
      {enableQuickFilter && qfIsOpen && (
        <QuickFilterBar s={s} />
      )}

      {/* ══ BULK BAR ════════════════════════════════════════════════════════ */}
      {selectable && selectedKeys.size > 0 && bulkActions && (
        <BulkBar s={s} />
      )}

      {/* ══ ERROR ══════════════════════════════════════════════════════════ */}
      {error && (
        <div className="dt-error" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ══ TABLE — Desktop ═════════════════════════════════════════════════ */}
      <DesktopTable s={s} />

      {/* ══ CARDS — Mobile ══════════════════════════════════════════════════ */}
      <MobileCards s={s} />

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      {!isVirtual && (
        <PaginationFooter s={s} />
      )}

      {/* Virtual footer */}
      {isVirtual && (
        <VirtualFooter s={s} />
      )}

      {/* ══ BATCH EDIT BAR ════════════════════════════════════════════════════ */}
      {batchEdit && batch.hasPending && (
        <BatchEditBar s={s} />
      )}

      {/* 🆕 CONTEXT MENU */}
      {enableContextMenu && menuState.visible && menuState.context && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          items={(contextMenuItems || defaultContextMenuItems)(menuState.context)}
          context={menuState.context}
          onClose={closeMenu}
        />
      )}

      {/* 🆕 SMART FILTER DIALOG */}
      {enableSmartFilter && smartFilterOpen && (
        <SmartFilterDialog s={s} />
      )}

      {/* 🆕 SAVE VIEW DIALOG */}
      {enableSavedViews && saveViewDialogOpen && (
        <SaveViewDialog s={s} />
      )}

      {/* 🆕 KEYBOARD SHORTCUTS OVERLAY (? key) */}
      {shortcutsOpen && (
        <ShortcutsDialog s={s} />
      )}
    </div>
  );
}

export { default as DataTableErrorBoundary } from './parts/DataTableErrorBoundary';

export default DataTable;
