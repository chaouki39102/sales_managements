// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePosReceiptTemplate.ts
//
// The POS print template with the POS-settings receipt overrides applied
// (company name / second header line / footer / QR). Shared by POSPage and
// POSProPage.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import type { POSSettings } from '@/pos/hooks/usePOSSettings';
import type { PrintTemplate } from '@/pages/settings/print-settings/types/domain';

type ReceiptOverrideSettings = Pick<POSSettings, 'receiptCompanyName' | 'receiptHeader2' | 'receiptFooter' | 'receiptShowQr'>;

export function usePosReceiptTemplate(
  template: PrintTemplate | null,
  settings: ReceiptOverrideSettings,
): PrintTemplate | null {
  return useMemo(() => {
    if (!template) return null;
    const overrides: Partial<typeof template> = {};
    let changed = false;
    if (settings.receiptCompanyName) {
      const name = settings.receiptHeader2
        ? `${settings.receiptCompanyName}\n${settings.receiptHeader2}`
        : settings.receiptCompanyName;
      overrides.company_name_text = name;
      changed = true;
    } else if (settings.receiptHeader2) {
      overrides.company_name_text = settings.receiptHeader2;
      changed = true;
    }
    if (settings.receiptFooter) {
      overrides.footer_line1 = settings.receiptFooter;
      changed = true;
    }
    if (settings.receiptShowQr !== undefined) {
      overrides.show_qr = settings.receiptShowQr;
      changed = true;
    }
    if (!changed) return template;
    return { ...template, ...overrides };
  }, [template, settings.receiptCompanyName, settings.receiptHeader2, settings.receiptFooter, settings.receiptShowQr]);
}
