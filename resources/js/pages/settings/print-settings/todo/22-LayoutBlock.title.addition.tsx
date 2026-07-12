// ════════════════════════════════════════════════════════════════════════════
// أضف إلى types/domain.ts: حقلين اختياريين على LayoutBlock (لعنوان الصندوق —
// اسم الشركة الكبير، أو "بيانات العميل" فوق صفوف الصندوق)
// ════════════════════════════════════════════════════════════════════════════
//
// في interface LayoutBlock الموجود، أضف:
//
//   titleField?: string;      // معرّف حقل من PrintFieldRegistry، يُعرض كعنوان كبير فوق rows
//   titleStyle?: CellStyle;
//
// ════════════════════════════════════════════════════════════════════════════
// أضف إلى preview/HeaderColumns.tsx: دالة عرض العنوان + استدعاؤها قبل renderLayoutRows
// ════════════════════════════════════════════════════════════════════════════

/*
import { printFieldResolver } from '../../services';

function renderBlockTitle(col: LayoutBlock, data: UniversalDocumentData, tpl: PrintTemplate) {
  if (!col.titleField) return null;
  const value = printFieldResolver.resolve(col.titleField, data, tpl);
  if (!value) return null;
  return (
    <div style={{ marginBottom: 4, ...cellStyleCss(col.titleStyle) }}>
      {String(value)}
    </div>
  );
}

// داخل renderHeaderColumns، قبل {renderLayoutRows(col.rows, data, tpl)}:
//   {renderBlockTitle(col, data, tpl)}
//   {renderLayoutRows(col.rows, data, tpl)}
*/
