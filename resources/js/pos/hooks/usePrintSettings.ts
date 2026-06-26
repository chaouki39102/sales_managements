// resources/js/pos/hooks/usePrintSettings.ts
// يقرأ إعدادات الطباعة من localStorage ويوفر دالة الطباعة المباشرة

import { useMemo } from 'react';
import type { DocumentPrintConfig, ReceiptTemplate80mm } from '@/pages/settings/print-settings/types';
import { defaultTemplate } from '@/pages/settings/print-settings/types';

const DOC_CONFIGS_KEY  = 'erp_doc_print_configs';
const TEMPLATE_KEY_FN  = (code: string, size: string) => `erp_print_tpl_${code}_${size}`;
const PRINTERS_KEY     = 'erp_printers';

export function usePrintSettings(docTypeCode: string) {
  const docConfig = useMemo<DocumentPrintConfig | null>(() => {
    try {
      const stored = localStorage.getItem(DOC_CONFIGS_KEY);
      if (!stored) return null;
      const configs: DocumentPrintConfig[] = JSON.parse(stored);
      return configs.find(c => c.docTypeCode === docTypeCode) ?? null;
    } catch { return null; }
  }, [docTypeCode]);

  const template = useMemo<ReceiptTemplate80mm>(() => {
    if (!docConfig?.paperSize || docConfig.paperSize === 'none') return defaultTemplate();
    try {
      const key    = TEMPLATE_KEY_FN(docTypeCode, docConfig.paperSize);
      const stored = localStorage.getItem(key);
      if (!stored) return defaultTemplate();
      return { ...defaultTemplate(), ...JSON.parse(stored) };
    } catch { return defaultTemplate(); }
  }, [docConfig, docTypeCode]);

  const selectedPrinter = useMemo(() => {
    try {
      const printers = JSON.parse(localStorage.getItem(PRINTERS_KEY) ?? '[]');
      if (docConfig?.printerId) {
        return printers.find((p: any) => p.id === docConfig.printerId) ?? null;
      }
      return printers.find((p: any) => p.isDefault) ?? printers[0] ?? null;
    } catch { return null; }
  }, [docConfig]);

  const isPrintEnabled = !!(docConfig?.enabled && docConfig.paperSize !== 'none');
  const copies = docConfig?.copies ?? 1;
  const paperWidth = template.paperWidth ?? 80;

  return {
    docConfig,
    template,
    selectedPrinter,
    isPrintEnabled,
    copies,
    paperWidth,
  };
}
