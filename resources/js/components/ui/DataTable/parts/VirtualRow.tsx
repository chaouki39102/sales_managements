// DataTable/parts/VirtualRow.tsx — memoised virtual-scroll row wrapper

import React, { memo } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// VirtualRow — صف بيانات معزول كـ memo مستقل
//
// الهدف: عند تحرك virtual scroll يتغير visibleRange فقط،
//        وهذا يُعيد render الـ parent. بدون memo كل الصفوف
//        المرئية تُعاد كاملاً حتى لو بياناتها لم تتغير.
//
// المقارنة: areEqual يدوية تتحقق فقط من:
//   • تغيير بيانات الصف نفسه (rowData)
//   • تغيير حالة التحديد / التوسيع / التعديل
//   • تغيير Range Selection
//   • تغيير التنسيق الشرطي
//   الـ visibleRange/offsetY لا تُسبب re-render للصف إذا بياناته ثابتة
// ════════════════════════════════════════════════════════════════════════════

interface VirtualRowProps {
  rowNode:    React.ReactNode;
  /** renderFn: يُستدعى بدلاً من rowNode إذا مُرِّر — يمنع حساب rowNode في الأب */
  renderFn?:  () => React.ReactNode;
  rowDataKey: string | number;  // row key للمقارنة في areEqual
  dataHash?:  string;           // hash للبيانات — تغييره يُجبر إعادة Render
  isSelected: boolean;
  isExpanded: boolean;
  isEditing:  boolean;          // أي خلية في هذا الصف تُعدَّل
  isActive:   boolean;          // keyboard nav
  inRange:    boolean;          // range selection يشمل هذا الصف
}

// areEqual: مقارنة يدوية — يُعاد render الصف فقط عند تغيير حقيقي
function virtualRowAreEqual(prev: VirtualRowProps, next: VirtualRowProps): boolean {
  return (
    prev.rowDataKey === next.rowDataKey &&
    prev.dataHash    === next.dataHash    &&
    prev.isSelected === next.isSelected &&
    prev.isExpanded === next.isExpanded &&
    prev.isEditing  === next.isEditing  &&
    prev.isActive   === next.isActive   &&
    prev.inRange    === next.inRange
  );
}

const VirtualRow = memo(function VirtualRow({ rowNode, renderFn }: VirtualRowProps) {
  // renderFn: يُستدعى فقط عند تغيير حقيقي في البيانات (بعد areEqual يمر)
  return <>{renderFn ? renderFn() : rowNode}</>;
}, virtualRowAreEqual);

export default VirtualRow;
