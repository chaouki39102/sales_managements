/**
 * components/ui/index.ts
 * ══════════════════════════════════════════════════════════════
 * نقطة الاستيراد الوحيدة لكل مكونات الـ UI
 *
 * الاستخدام:
 *   import { Card, Button, Badge, Modal } from '@/components/ui'
 * ══════════════════════════════════════════════════════════════
 */

export { Card, CardHeader, CardTitle, CardSub }         from './Card'
export { Button }                                        from './Button'
export { Badge }                                         from './Badge'
export { KpiCard }                                       from './KpiCard'
export { Modal }                                         from './Modal'
export { TableWrapper, Table, Th, Tr, Td }               from './Table'
export { Alert }                                         from './Alert'
export { Avatar }                                        from './Avatar'
export {
  Input, Select, Textarea, Label,
  FormField, FormGrid, InputRow,
}                                                        from './FormInputs'
export {
  Switch, ProgressBar, EmptyState, PageHeader,
  Sep, DotSep, IconButton, Tabs, SummaryRow,
  Grid2, Grid3, Grid4, Grid65, KpiGrid,
}                                                        from './Misc'
