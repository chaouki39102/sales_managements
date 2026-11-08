# Deviations & Open Questions (Phase 30 v2)

All CONFIRM items that could not be closed, with what is needed to close them and who decides.

## Deviations

| Item | Status | Finding | Action Needed | Decides |
|------|--------|---------|---------------|---------|
| QZ Tray | CONFIRM | Mentioned in requirements but not present in codebase/package.json | Determine if QZ is actually needed or if task requirement refers to future state | Owner |
| Browsershot/Puppeteer | CONFIRM | Not installed in composer.json or node_modules | Install/verify for C4 spike or use alternative (custom puppeteer-core script) | Owner/Spike |
| @fontsource packages | CONFIRM | No static or variable fontsource packages installed; using Google Fonts | Install static @fontsource packages for required fonts per C1/C2 | Owner |
| Apache/XAMPP config | CONFIRM | httpd.conf, max_execution_time, Windows account unknown | Inspect httpd.conf and php.ini; determine Chrome launch capability by Apache account | Owner/Spike |
| config/printing.php | CONFIRM | File doesn't exist | Create with derived values from spike (max_concurrent_renders, timeouts) | Owner/Spike |
| Chrome as renderer confirmation | CONFIRM | Stated in requirements but needs verification in this environment | Verify Chrome installation and accessibility | Owner/Spike |

## Open Questions

| Question | Context | Needed To Close | Decides |
|----------|---------|-----------------|---------|
| Which non-breaking space codepoint (U+00A0 or U+202F)? | C5 - number formatting | Check existing invoices and confirm with owner | Owner |
| preferCssPageSize vs format() for Browsershot? | C3 - page size | Test in spike with installed browsershot equivalent | Spike |
| Type3 vs FontFile detection method on Windows? | C1 - font doctor | Identify available PDF text extraction tool on Windows | Owner/Spike |
| Apache thread count formula | C6 - concurrency | Read httpd.conf (MaxRequestWorkers/ThreadsPerChild) | Owner/Spike |
| Floyd-Steinberg vs threshold default for thermal? | C7 - thermal quality | Test both on Golden Sheet per printer model | Spike/Owner |
| Alternative to browsershot for single-session rendering? | C4 | Evaluate puppeteer-core custom script vs sentinel approach | Spike |
