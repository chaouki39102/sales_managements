// resources/js/pos/utils/printUtils.ts
// طباعة مباشرة بدون معاينة — يفتح نافذة مؤقتة ويُرسلها للطابعة

export interface PrintDirectOptions {
  html: string;
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

function openPrintWindow(html: string, paperWidthMm: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) {
      reject(new Error('فشل فتح نافذة الطباعة — تأكد من السماح بالنوافذ المنبثقة'));
      return;
    }

    let resolved = false;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>إيصال</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    body { margin: 0; padding: 10px; display: flex; justify-content: center; background: #fff; font-family: 'Tajawal', sans-serif; }
    @page { margin: 0; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>${html}
  <script>
    function doPrint() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() { setTimeout(doPrint, 200); });
    } else {
      setTimeout(doPrint, 600);
    }
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
