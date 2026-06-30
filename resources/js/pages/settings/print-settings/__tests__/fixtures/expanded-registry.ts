import type { SettingMeta } from '../../services/SettingsRegistry';
import { SETTINGS_REGISTRY } from '../../services/SettingsRegistry';

const ALL_DOCS: readonly string[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS', 'RPT'];
const COMMERCIAL_DOCS: readonly string[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV'];
const POS_DOCS: readonly string[] = ['POS', 'RPT'];
const WAREHOUSE_DOCS: readonly string[] = ['DDP', 'BT'];
const REPORT_DOC: readonly string[] = ['RPT'];
const NON_REPORT_DOCS: readonly string[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS'];

const THERMAL: readonly string[] = ['80mm', '58mm'];
const PAGE: readonly string[] = ['A4', 'A5'];
const ALL_PAPERS: readonly string[] = ['80mm', '58mm', 'A4', 'A5'];

const CONST_EXPANSIONS: Record<string, readonly string[]> = {
  ALL_DOCS, COMMERCIAL_DOCS, POS_DOCS, WAREHOUSE_DOCS, REPORT_DOC, NON_REPORT_DOCS,
  THERMAL, PAGE, ALL_PAPERS,
};

export function expand(value: readonly string[] | string[]): string[] {
  const result: string[] = [];
  for (const v of value) {
    if (CONST_EXPANSIONS[v]) {
      result.push(...CONST_EXPANSIONS[v]);
    } else {
      result.push(v);
    }
  }
  return [...new Set(result)];
}

export interface ExpandedSetting extends SettingMeta {
  expandedDocs: string[];
  expandedPapers: string[];
}

export function getExpandedRegistry(): ExpandedSetting[] {
  return Object.entries(SETTINGS_REGISTRY).map(([key, meta]) => ({
    ...meta,
    expandedDocs: expand(meta.supportedDocs as unknown as string[]),
    expandedPapers: expand(meta.supportedPapers as unknown as string[]),
  }));
}

export const ALL_DOC_TYPES = [...ALL_DOCS];
export const ALL_PAPER_SIZES = [...ALL_PAPERS];
export const SETTING_COUNT = Object.keys(SETTINGS_REGISTRY).length;
