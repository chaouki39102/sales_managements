# Phase 30 v2 Changelog

All changes tagged with `<!-- v2: C# -->` as required. Document edits only.

## Changes

### C1. Variable vs static fonts <!-- v2: C1 -->
- **Before:** No distinction between variable/static fonts specified
- **After:** Require STATIC fontsource packages (`@fontsource/*`), forbid `@fontsource-variable/*`. print:doctor must check for Type3 fonts and validate Arabic text extraction. Marked CONFIRM pending spike.

### C2. Weight matrix <!-- v2: C2 -->
- **Before:** Fixed weight list [400, 700] assumed
- **After:** Add `FONT_WEIGHT_MATRIX` table filled from actual installed package files; `verifyFonts` iterates per-family matrix; template editor only offers available weights; Golden Sheet test for unavailable weights. Marked CONFIRM (no fontsource installed).

### C3. Page size conflict <!-- v2: C3 -->
- **Before:** Global `@page { size: A4 }` in shared print CSS
- **After:** Remove global @page, inject per-template/paper size from SSOT, use correct Browsershot mechanism, add gate testing dz-invoice-a4 (210x297mm) and dz-delivery-a5 (148x210mm).

### C4. Single browser session per render <!-- v2: C4 -->
- **Before:** Assumed single session
- **After:** Investigate browsershot evaluate/waitForFunction behavior; error detection in same page load; test for exactly 1 request to /print/render/{token} and 1 to /print/data/{token}; evaluate alternatives in spike.

### C5. Number formatting <!-- v2: C5 -->
- **Before:** `Intl.NumberFormat('en-US')` comma grouping
- **After:** Specify space grouping with non-breaking space (U+00A0 or U+202F), RTL isolation for negatives/percentages, Vitest cases added.

### C6. Timeouts and concurrency <!-- v2: C6 -->
- **Before:** No explicit time budget/concurrency limits documented
- **After:** Time budget (25+25s) fitting PHP/Apache limits, set_time_limit on print routes, max_concurrent_renders derived from Apache threads in config/printing.php, print:doctor concurrency test.

### C7. Thermal quality <!-- v2: C7 -->
- **Before:** Fixed threshold 160 only
- **After:** Per-printer binarization (threshold|floyd-steinberg), minimum font size/weight, dot width presets (384,512,576), Golden Sheet test on all thermal models.

### C8. Fix wrong fallback claim <!-- v2: C8 -->
- **Before:** Popup fallback guarantees correct Arabic
- **After:** Popup is last safety net depending on font loading; must use same self-hosted fontsource bundle, await document.fonts.ready, verify fonts before window.print().

### C9. Audit additions <!-- v2: C9 -->
- **Before:** Basic audit
- **After:** Added checks for frontend dompdf.js/jspdf/html2pdf/html2canvas, Apache thread config/max_execution_time/Windows account/Chrome launch, installed versions of browsershot/puppeteer/QZ Tray/@fontsource (static/variable).
