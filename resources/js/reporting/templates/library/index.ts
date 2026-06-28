// ─── Registry (single source of truth) ──────────────────────────────────────
export { templateRegistry, registerBuiltinTemplates, buildTemplate, createMeta } from './registry';
// ─── Modal ──────────────────────────────────────────────────────────────────
export { default as TemplateLibraryModal } from './TemplateLibraryModal';
// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  LibraryTemplateEntry, LibraryTemplateMeta, LibraryApiResponse,
  TemplateVersion, TemplateTags, TemplateCategory,
  LibraryFilterState, FavoriteEntry, InstallHistoryEntry,
} from './types';
// ─── Constants ──────────────────────────────────────────────────────────────
export * from './constants';
// ─── Config layers ──────────────────────────────────────────────────────────
export {
  paperConfig, typographyConfig, headerConfig,
  INVOICE_COLUMNS, DELIVERY_COLUMNS, DELIVERY_A5_COLUMNS,
  INVOICE_TOTALS, DELIVERY_TOTALS, DELIVERY_A5_TOTALS,
  INVOICE_FOOTER, DELIVERY_FOOTER, DELIVERY_A5_FOOTER,
} from './config';
export type {
  PaperConfig, TypographyConfig, HeaderConfig,
  TableConfig, TotalsConfig, FooterConfig,
} from './config';
// ─── Categories ─────────────────────────────────────────────────────────────
export { TEMPLATE_CATEGORIES, ALL_TAGS, categoryFromDocType } from './categories';
export type { TagSlug } from './categories';
// ─── Mock data (for preview only) ───────────────────────────────────────────
export { getMockDocumentData } from './mockData';
