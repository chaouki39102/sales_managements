// resources/js/pos/utils/printUtils.ts
// طباعة مباشرة بدون معاينة — يفتح نافذة مؤقتة ويُرسلها للطابعة

import { PRINT_BASE_CSS } from '@/pages/settings/print-settings/runtime/UniversalPrintPipeline';

export interface PrintDirectOptions {
  html: string;
  /** Paper width in mm (80 / 58 for receipts, 210 / 148 for A4 / A5). */
  paperWidth: number;
  copies?: number;
  printerName?: string | null;
  onDone?: () => void;
  onError?: (e: Error) => void;
}

export async function printReceiptDirect(opts: PrintDirectOptions): Promise<void> {
  const { html, paperWidth, copies = 1, onDone, onError } = opts;

  try {
    for (let i = 0; i < copies; i++) {
      await openPrintWindow(html, paperWidth);
      if (i < copies - 1) await sleep(400);
    }
    onDone?.();
  } catch (e) {
    onError?.(e as Error);
  }
}

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=Cairo:wght@400;600;700;800&family=Almarai:wght@400;700;800&display=swap';

/**
 * The HTML comes from renderPreviewToHtml (static markup), so UniversalPreview's
 * effects never ran: no @page size, no CSS reset. This print document supplies
 * both. Before, a receipt printed centred on a Letter/A4 sheet with 10px of
 * padding and the last table column clipped.
 *
 *  - fixed sheets (A4 / A5): @page is that sheet.
 *  - receipts (80 / 58 mm): @page is the roll width × the measured receipt
 *    height, so the whole receipt is ONE continuous page — no blank sheet and
 *    no cut in the middle of the items.
 */
function openPrintWindow(html: string, paperWidthMm: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) {
      reject(new Error('فشل فتح نافذة الطباعة — تأكد من السماح بالنوافذ المنبثقة'));
      return;
    }

    let resolved = false;
    const w = Number(paperWidthMm) > 0 ? Number(paperWidthMm) : 80;
    const fixedH = w === 210 ? 297 : w === 148 ? 210 : 0;

    win.document.write(`<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>إيصال</title>
  <link href="${FONTS_HREF}" rel="stylesheet"/>
  <style>
    ${PRINT_BASE_CSS}
    .ps-preview-wrapper { margin: 0 !important; box-shadow: none !important; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
    .ps-preview-wrapper tr, .ps-preview-wrapper img { break-inside: avoid; }
    @media screen { body { background: #eee; } .ps-preview-wrapper { margin: 10px auto !important; } }
  </style>
  <style id="page-size">@page { size: ${w}mm ${fixedH || 297}mm; margin: 0; }</style>
</head>
<body>${html}
  <script>
    var FIXED_H = ${fixedH};
    var W_MM = ${w};
    function isReady() {
      var imgs = document.getElementsByTagName('img');
      for (var i = 0; i < imgs.length; i++) { if (!imgs[i].complete) return false; }
      return true;
    }
    function sizePage() {
      if (FIXED_H) return;
      var el = document.querySelector('.ps-preview-wrapper') || document.body.firstElementChild;
      if (!el) return;
      var hMm = Math.ceil(el.scrollHeight / (96 / 25.4)) + 2;
      document.getElementById('page-size').textContent =
        '@page { size: ' + W_MM + 'mm ' + hMm + 'mm; margin: 0; }';
    }
    function doPrint() {
      sizePage();
      window.focus();
      window.print();
      setTimeout(function() { window.close(); }, 500);
    }
    var started = Date.now();
    (function waitReady() {
      if (isReady() || Date.now() - started > 8000) {
        var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        var timeout = new Promise(function(r) { setTimeout(r, 4000); });
        Promise.race([fontsReady, timeout]).then(function() { setTimeout(doPrint, 200); });
      } else {
        setTimeout(waitReady, 100);
      }
    })();
  </script>
</body>
</html>`);

    win.document.close();

    win.addEventListener('unload', () => {
      if (!resolved) { resolved = true; resolve(); }
    });

    setTimeout(() => {
      if (!resolved) { resolved = true; resolve(); }
    }, 5000);
  });
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
