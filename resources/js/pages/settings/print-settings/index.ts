// ظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـ
// print-settings/index.ts ظ¤ Public API
//
// Consumers import ONLY from here:
//   import { PrintSettingsPage, PreviewSelector } from '@/pages/settings/print-settings';
// ظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـظـ

export { default as PrintSettingsPage } from './PrintSettingsPage';
export { default as PreviewSelector } from './components/PreviewSelector';

// Types ظ¤ consumers need access to these for template data
export * from './types';
export type { CompanyPreviewData } from './types';
