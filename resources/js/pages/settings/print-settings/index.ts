// ════════════════════════════════════════════════════════════════════════════
// print-settings/index.ts — Public API
//
// Consumers import ONLY from here:
//   import { PrintSettingsPage, PreviewSelector } from '@/pages/settings/print-settings';
// ════════════════════════════════════════════════════════════════════════════

export { default as PrintSettingsPage } from './PrintSettingsPage';
export { default as PreviewSelector } from './components/PreviewSelector';

// Types — consumers need access to these for template data
export * from './types';
export type { ReceiptLiveData, CompanyPreviewData } from './types';
