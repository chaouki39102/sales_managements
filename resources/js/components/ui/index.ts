/**
 * components/ui/index.ts
 * ══════════════════════════════════════════════════════════════
 * نقطة الاستيراد الوحيدة لكل مكونات الـ UI
 *
 * الاستخدام:
 *   import { Card, Button, Badge, Modal } from '@/components/ui'
 * ══════════════════════════════════════════════════════════════
 */

export { default as Card }                               from './Card'
export { default as Button }                             from './Button'
export { default as Badge }                              from './Badge'
export { default as KpiCard }                            from './KpiCard'
export { default as Modal }                              from './Modal'
export { default as Table }                              from './Table'
export { Alert }                                         from './Alert'
export { default as Avatar }                             from './Avatar'
export { default as ConfirmDialog }                      from './ConfirmDialog'
export { default as ConfirmDeleteModal }                 from './ConfirmDeleteModal'
export {
  Input, Select, Textarea, Label,
  FormField, FormGrid, InputRow,
}                                                        from './FormInputs'
export {
  Switch, ProgressBar, EmptyState, PageHeader,
  Sep, DotSep, IconButton, Tabs, SummaryRow,
  Grid2, Grid3, Grid4, Grid65, KpiGrid,
}                                                        from './Misc'
