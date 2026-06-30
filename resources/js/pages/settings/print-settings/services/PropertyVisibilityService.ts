import type { DocTypeCode, PaperSize, PrintTemplate, SettingMeta } from '../types';
import { isSettingVisible, getVisibleSettings } from './SettingsRegistry';

export type { SettingMeta, PropertyCategory } from './SettingsRegistry';

const THERMAL_SIZES: PaperSize[] = ['80mm', '58mm'];
const PAGE_SIZES: PaperSize[] = ['A4', 'A5'];

export function isReportDoc(code: DocTypeCode): boolean {
  return code === 'RPT';
}

export function isInvoiceDoc(code: DocTypeCode): boolean {
  return ['FV', 'BL', 'DEV', 'BCC', 'FA', 'BR', 'AV', 'AA'].includes(code);
}

export function isThermalPaper(size: PaperSize): boolean {
  return THERMAL_SIZES.includes(size);
}

export function isPagePaper(size: PaperSize): boolean {
  return PAGE_SIZES.includes(size);
}

export function isPropertyVisible(
  key: string,
  docType: DocTypeCode,
  paperSize: PaperSize,
  tpl?: Partial<PrintTemplate>,
): boolean {
  return isSettingVisible(key, docType, paperSize, tpl);
}

export function getSectionProperties(tpl: PrintTemplate): Record<string, boolean> {
  return {
    show_header_section: tpl.show_header_section,
    show_doc_info_section: tpl.show_doc_info_section,
    show_items_section: tpl.show_items_section,
    show_totals_section: tpl.show_totals_section,
    show_payments_section: tpl.show_payments_section,
    show_footer_section: tpl.show_footer_section,
  };
}

export function getFilteredMeta(docType: DocTypeCode, paperSize: PaperSize): SettingMeta[] {
  return getVisibleSettings(docType, paperSize);
}
