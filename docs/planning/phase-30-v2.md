# Phase 30 — Arabic-safe printing pipeline (v2)

> Amendment to Phase 30 with corrections C1–C9 applied. Document edits only. No application code modified.

## Status
- **Version:** v2
- **Renderer:** Chrome as single renderer [EVIDENCE: `resources/js/pages/settings/print-settings/runtime/UniversalPrintPipeline.tsx:1-157` documents Chrome/print pipeline; no alternative renderer enforced in runtime code]
- **Thermal:** QZ on the user's machine [EVIDENCE: step0-audit — `grep` across repo returned no QZ references; `package.json` has no `qz-tray`; see `docs/step0-audit-report.md:74-79`]
- **Routes:** signed routes [EVIDENCE: `docs/step0-audit-report.md:110` — mentioned in requirements/context; not directly verifiable from codebase state]
- **Client URLs:** no client-supplied URL [EVIDENCE: stated in requirements; enforced by design per pipeline architecture]
- **dompdf:** kept behind per-company flag until replacement verified [EVIDENCE: `app/Services/DocumentPrintService.php:1-64` uses `barryvdh/laravel-dompdf`; `composer.json:10` lists `barryvdh/laravel-dompdf`; `docs/step0-audit-report.md:47-57`]
- **Popup fallback:** remains [EVIDENCE: `resources/js/pages/settings/print-settings/runtime/UniversalPrintPipeline.tsx:1-157` + fallback design]

## C1. Variable vs static fonts (P1 2.1, P5 item 5) <!-- v2: C1 -->
- **Requirement:** Require STATIC fontsource packages (`@fontsource/*`), forbid `@fontsource-variable/*`. [EVIDENCE: step0-audit `package.json` has no `fontsource` matches — `docs/step0-audit-report.md:82-85`]
- **Reason:** Chrome may embed variable fonts in PDF as Type 3, so the `/FontFile2|3` scan in print:doctor can fail even when rendering is correct. [CONFIRM - needs spike verification]
- **print:doctor update:** accept embedded fonts via FontFile/FontFile2/FontFile3 AND, if Type3 is found, require that text extraction of the PDF returns the expected Arabic sample (use a tool available on Windows; name it and verify it exists). Fail if neither holds. [CONFIRM]
- **Current state:** No @fontsource packages installed (static or variable). [EVIDENCE: `docs/step0-audit-report.md:82-85`]
- **Font loading:** Google Fonts loaded via `resources/views/app.blade.php` (non-blocking pattern noted). [EVIDENCE: codebase state per Phase 36/AGENTS context]

## C2. Weight matrix (P1 2.1, 2.6, 3.1) <!-- v2: C2 -->
- **FONT_WEIGHT_MATRIX:** Must be added next to `FONT_STACK` with family → available weights. [CONFIRM - needs implementation]
- **Population rule:** Fill ONLY by listing the weight files that actually exist in the installed `node_modules/@fontsource/<family>` packages (cite directory listing). If not installed, write "to be filled from installed package in P1" instead of guessing. [EVIDENCE: rule from task requirements]
- **Current state:** No @fontsource packages installed [EVIDENCE: `docs/step0-audit-report.md:82-85`]
- **verifyFonts:** Must iterate the matrix per family, not a fixed [400, 700]. [CONFIRM]
- **Template editor:** Must only offer weights present in the matrix. [CONFIRM]
- **Golden Sheet:** Must use only weights available for each family (no 900 where it doesn't exist) plus one test asserting that an unavailable weight is rejected/clamped instead of synthesized. [CONFIRM]

## C3. Page size conflict (P1 2.2, P2 3.3) <!-- v2: C3 -->
- **Remove global @page:** Remove the global `@page { size: A4 }` from the shared print CSS. [CONFIRM]
- **Per-template injection:** Page size is injected per template/paper (A4, A5, orientation) from one source of truth. [CONFIRM]
- **Browsershot:** Must use matching mechanism (preferCssPageSize vs format()) so CSS and Browsershot can never disagree. [CONFIRM - Browsershot not installed]
- **Gate:** Render `dz-invoice-a4` and `dz-delivery-a5`, read PDF page boxes, assert 210x297 mm and 148x210 mm (tolerance 1 mm). [CONFIRM]

## C4. Single browser session per render (P2 3.3) <!-- v2: C4 -->
- **Investigation required:** `Browsershot::evaluate()` after `waitForFunction()` is suspected to start a second page load. Check installed spatie/browsershot source (vendor path + line). Report how evaluate/waitForFunction/pdf actually execute. [EVIDENCE: `docs/step0-audit-report.md:67-72` — not installed in composer.json/package.json; `node_modules` has no puppeteer*]
- **Single-session requirement:** Error detection must happen in the SAME page load that produces the PDF. [CONFIRM]
- **Acceptable options:** custom Node script on puppeteer-core, a sentinel the entry renders (e.g. `data-print-error`) that makes the render fail deterministically, or another single-session approach. [CONFIRM]
- **Test:** Exactly ONE request to `/print/render/{token}` and ONE to `/print/data/{token}` per render (verify via logging or counter). [CONFIRM]

## C5. Number formatting (P1 2.4) <!-- v2: C5 -->
- **Grouping:** `Intl.NumberFormat('en-US')` yields comma grouping. Specify exact output the invoices use (space grouping, dot decimal). Implement via explicit replacement with a NON-BREAKING space. [CONFIRM - need to check existing invoices]
- **Space character:** State which code point (U+00A0 or U+202F) and CONFIRM with owner; check how current invoices render it. [CONFIRM]
- **RTL isolation:** Negative numbers and percentages inside RTL text must be isolated (`unicode-bidi: isolate` and/or LRM) so `-12 500.00` never moves its sign. Add to `formatNumber` or sibling `formatAmountDisplay`, in the one formatter only. [CONFIRM]
- **Vitest cases:** 1893386.66, 0, -12500, 0.5, 12.05, 19%, and an RTL-embedded negative. [CONFIRM]

## C6. Timeouts and concurrency on Apache/XAMPP (P2 3.3, config/printing.php) <!-- v2: C6 -->
- **Time budget:** slot wait (25 s) + render (25 s) + PDF must fit inside PHP `max_execution_time` and Apache's timeout. Require `set_time_limit` on print routes only, budget derived from config values. [EVIDENCE: CLI `max_execution_time` = 0 from `php -r "echo ini_get('max_execution_time');"`; php.ini loaded is `D:\xampp\php\php.ini` line 407: `max_execution_time=120` — `docs/step0-audit-report.md:9-16`]
- **Thread consumption:** Chrome calls back into same Apache, so one render consumes >= 3 worker threads (original request + render + data + assets). Require `max_concurrent_renders` derived from real Apache thread count: read from actual httpd config (path + value), add to `config/printing.php`. [EVIDENCE: httpd-mpm.conf contains directives for prefork/worker/event/winnt (`docs/step0-audit-report.md:18-36`); active MPM not determinable statically → UNREADABLE per rules]
- **print:doctor:** Must report `max_execution_time`, Apache thread setting (if readable else "unreadable"), and run N parallel renders (N = max_concurrent_renders + 1) to prove extra one gets `RENDER_BUSY` cleanly and nothing deadlocks. [CONFIRM]
- **config/printing.php:** Must exist with derived values from spike. [EVIDENCE: `Test-Path config/printing.php` = False (`docs/step0-audit-report.md:88-93`)]

## C7. Thermal quality (P4) <!-- v2: C7 -->
- **Binarization:** Replace fixed threshold 160 as only binarization. Add per-printer option `binarization: 'threshold' | 'floyd-steinberg'` (default decided in spike), plus minimum font size and minimum weight for thermal templates. [CONFIRM]
- **Dot width:** Make dot width a per-printer profile with explicit presets (384, 512, 576) instead of two hardcoded values; mark which physical models need which as CONFIRM. [CONFIRM]
- **Gate:** Golden Sheet printed with both binarization modes on every thermal model; record winner per model. [CONFIRM]

## C8. Fix the wrong fallback claim (Section 0, P3) <!-- v2: C8 -->
- **Rephrase:** The popup is the last safety net but depends on fonts actually loading in the user's browser. [CONFIRM]
- **Requirements:** Popup must use the SAME self-hosted fontsource bundle and `await document.fonts.ready` (and verify fonts) before calling `window.print()`. Add to P1 2.1 and P3. [EVIDENCE: no fontsource bundle currently (`docs/step0-audit-report.md:82-85`)]

## C9. Audit additions (Section 1) <!-- v2: C9 -->
1. Also check `node_modules` and `package.json` for frontend `dompdf.js` (or similar: jspdf, html2pdf, html2canvas) and list who imports them. Do not delete. [EVIDENCE: `package.json:26` has `"dompdf.js": "^2.0.0"`, `Select-String` for imports returned no matches (`docs/step0-audit-report.md:59-64`)]
2. Also record Apache thread config, `max_execution_time`, Windows account running Apache, whether Chrome can be launched by that account. [EVIDENCE: php.ini/CLI in `docs/step0-audit-report.md:9-16`; Apache MPM directives in `docs/step0-audit-report.md:18-36` (active MPM UNREADABLE); whoami `desktop-h8shjo5\pc`, no Apache service found via filter, Chrome launch capability by Apache account UNREADABLE (`docs/step0-audit-report.md:38-43`)]
3. Installed versions of spatie/browsershot, puppeteer, QZ Tray, and installed `@fontsource` packages (static vs variable). [EVIDENCE: none installed/found (`docs/step0-audit-report.md:67-85`)]

## ArabicGlyphShaper impact
- [EVIDENCE: `app/Support/ArabicGlyphShaper.php:1-233` defines `ArabicGlyphShaper`; `app/Services/DocumentPrintService.php:7,15,48` uses it to shape HTML before dompdf]
- If dompdf is disabled for Arabic-safe Chrome path, this service/call path may become unused or need handling. [CONFIRM]

## P2-spike (before P2) <!-- v2: C4,C6 -->
**Goal:** Prove feasibility on the REAL Apache/XAMPP server before any P2 code.

**Test setup:**
- Minimal route + minimal HTML with Arabic + one fontsource font (if available) or current font, signed URL on loopback.
- Measure: success, total time, one-session behavior (C4), Type3 vs FontFile (C1), page size (C3), behavior under N+1 parallel requests (C6), behavior when started from Apache service account.

**Output:** Table of results with raw logs. **Go/No-Go line at the end. P2 does not start without GO.**

## PASS/FAIL/UNVERIFIED for C1–C9
- C1: UNVERIFIED (no fontsource installed; needs spike) [EVIDENCE: `docs/step0-audit-report.md:82-85`]
- C2: UNVERIFIED (no fontsource packages to read weight matrix from) [EVIDENCE: `docs/step0-audit-report.md:82-85`]
- C3: UNVERIFIED (needs implementation + gate testing)
- C4: UNVERIFIED (browsershot not installed; needs investigation) [EVIDENCE: `docs/step0-audit-report.md:67-72`]
- C5: UNVERIFIED (needs to check existing invoices for formatting)
- C6: UNVERIFIED (no config/printing.php, Apache config/active MPM/thread count/Windows account unclear) [EVIDENCE: `docs/step0-audit-report.md:18-43,88-93`]
- C7: UNVERIFIED (needs spike testing)
- C8: UNVERIFIED (no fontsource bundle currently) [EVIDENCE: `docs/step0-audit-report.md:82-85`]
- C9: PARTIAL (items checked against codebase; runtime details need confirmation) [EVIDENCE: `docs/step0-audit-report.md:1-119`]