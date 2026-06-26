ll done. Let me summarize the changes.
اكتمل الربط. إليك ملخص كل الملفات التي أُنشئت/عُدِّلت:
ملفات جديدة
resources/js/pos/hooks/usePrintSettings.ts — hook يقرأ localStorage ويوفّر template, isPrintEnabled, copies, paperWidth, selectedPrinter, docConfig
resources/js/pos/hooks/useReceiptRenderer.ts — hook يستخدم ReactDOMServer.renderToStaticMarkup لبناء HTML الإيصال بدون DOM
resources/js/pos/utils/printUtils.ts — printReceiptDirect() يفتح نافذة مخفية، يحقن HTML، وينفذ window.print() مع @page { size: Xmm auto }
ملفات معدّلة
types.ts — أضيف ReceiptLiveData interface (يدعم items, totals, client, docNumber, ...)
ReceiptPreview.tsx — أضيف prop liveData → buildReceiptData() يمزج liveData مع MOCK fallback; كل المكوّنات الداخلية (DocInfoSection, ItemsSection, TotalsSection, PaymentsSection, FooterSection) تستقبل data بدلاً من MOCK
POSPage.tsx — 4 تغييرات:
1. استدعاء usePrintSettings('FV') و useReceiptRenderer()
2. استدعاء handlePrintDirect() يبني HTML بـ buildHtml() ويطبّع بـ printReceiptDirect()
3. بعد handleCompleteSale: إذا autoPrint → يطبع مباشرة (بعد 300ms)، إذا showPreview → يفتح المودال، إذا لا → setModal('none')
4. onPrint في ProfessionalReceipt يستخدم handlePrintDirect بدل window.print()
سلوك الطباعة
autoPrint + isPrintEnabled: يطبع بدون أي مودال وسيط
showPreview فقط: يفتح مودال ProfessionalReceipt كالمعتاد
لا autoPrint ولا showPreview: فقط toast نجاح
زر "طباعة" داخل المودال: يستخدم handlePrintDirect مع بيانات الـ receiptSnapshot
▣  Build · Big Pickle · 5m 19s
