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
export { default as SimpleTable }                        from './SimpleTable'
export { Alert }                                         from './Alert'
export { default as Avatar }                             from './Avatar'
export { default as ConfirmDialog }                      from './ConfirmDialog'
export {
  Input, Select, Textarea, Label,
  FormField, FormGrid, InputRow,
}                                                        from './FormInputs'
export {
  Switch, ProgressBar, EmptyState,
  Sep, DotSep, IconButton, Tabs, SummaryRow,
  Grid2, Grid3, Grid4, Grid65, KpiGrid,
}                                                        from './Misc'
export { FloatingTooltip }                               from './FloatingTooltip'
export { FileTree }                                      from './FileTree'
export type { FileTreeElement, FileTreeProps }            from './FileTree'
export { PinnedList }                                    from './PinnedList'
export type { PinnedListItem, PinnedListProps }           from './PinnedList'
