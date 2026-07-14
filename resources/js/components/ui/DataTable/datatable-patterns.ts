// ════════════════════════════════════════════════════════════════════════════
// datatable-patterns.ts — أنماط SmartFilter الخاصة بـ ERP الجزائري
//
// هذه الأنماط مفصولة عمداً عن مكتبة DataTable العامة لأنها تحتوي
// مصطلحات وحقول خاصة بهذا المشروع (overdue_days، party.name، إلخ).
//
// الاستخدام:
//   import { ERP_FILTER_PATTERNS } from './datatable-patterns';
//   useSmartFilter(columns, onFilter, ERP_FILTER_PATTERNS)
// ════════════════════════════════════════════════════════════════════════════

import type { SmartFilterPattern } from './hooks';

export const ERP_FILTER_PATTERNS: SmartFilterPattern[] = [
  // ── فواتير متأخرة ──────────────────────────────────────────────────────
  {
    regex: /فاتورة(?:ات)?\s+(?:متأخرة\s+)?أكثر\s+من\s+(\d+)\s+يوم/,
    field: 'overdue_days',
    operator: 'gt',
    valueType: 'number',
  },
  {
    regex: /(?:تأخر|مضى)\s+أكثر\s+من\s+(\d+)\s+يوم/,
    field: 'overdue_days',
    operator: 'gt',
    valueType: 'number',
  },

  // ── مقارنات رقمية عامة ─────────────────────────────────────────────────
  {
    regex: /أقل\s+من\s+(\d[\d\s]*)(?:\s+دج)?(?:\s+(?:في|للحقل)\s+([^\s]+))?/,
    field: '$2',
    operator: 'lt',
    valueType: 'number',
  },
  {
    regex: /أكثر\s+من\s+(\d[\d\s]*)(?:\s+دج)?(?:\s+(?:في|للحقل)\s+([^\s]+))?/,
    field: '$2',
    operator: 'gt',
    valueType: 'number',
  },
  {
    regex: /بين\s+(\d[\d\s]*)\s+و(?:الى|إلى)?\s+(\d[\d\s]*)/,
    field: 'range',
    operator: 'between',
    valueType: 'number',
  },

  // ── طرف / زبون / مورد ──────────────────────────────────────────────────
  {
    regex: /(?:الزبون|الزبون|الطرف|المورد)\s+(?:اسمه\s+)?["']?([^"'\s]+)["']?/,
    field: 'party.name',
    operator: 'contains',
    valueType: 'string',
  },

  // ── الحالة ─────────────────────────────────────────────────────────────
  {
    regex: /(?:الحالة|الوضع)\s+["']?([^"'\s]+)["']?/,
    field: 'document_status.name',
    operator: 'eq',
    valueType: 'string',
  },
  {
    regex: /(?:مؤكد|مسودة|ملغى|مدفوع|جزئي)/,
    field: 'document_status.name',
    operator: 'contains',
    valueType: 'string',
  },

  // ── المخزن / المستودع ──────────────────────────────────────────────────
  {
    regex: /(?:المخزن|المستودع)\s+["']?([^"'\s]+)["']?/,
    field: 'warehouse.name',
    operator: 'contains',
    valueType: 'string',
  },

  // ── الفرز ──────────────────────────────────────────────────────────────
  {
    regex: /(?:رتب|فرز|صنّف)\s+(?:حسب\s+)?([^\s]+)\s+(تصاعدي|تنازلي|الأحدث|الأقدم)/,
    field: '$1',
    operator: 'sort',
    valueType: 'string',
  },
];
