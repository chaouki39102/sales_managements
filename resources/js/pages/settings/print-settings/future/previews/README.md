# previews/ — Legacy Per-Format Preview Components

## Purpose
Preserves the legacy per-format preview components (`A4Preview.tsx`, `A5Preview.tsx`, `ReceiptPreview.tsx`, ~1,240 lines) which were the original rendering engines for A4, A5, and thermal receipt formats before `UniversalPreview` unified them.

## Contents
| File | Lines | Responsibility |
|------|-------|----------------|
| `A4Preview.tsx` | 468 | Legacy A4 document preview with HTML table layout, custom `A4Data` interface |
| `A5Preview.tsx` | 287 | Legacy A5 document preview, similar to A4Preview for half-page format |
| `ReceiptPreview.tsx` | 460 | Legacy thermal receipt preview (80mm/58mm) with compact layout, payment breakdown, barcode |

## Why Preserved
These files represent the Phase 1 approach to multi-format preview rendering. While `UniversalPreview` now handles all formats in a unified engine, these legacy implementations contain domain knowledge about format-specific layout that may be useful for reference.

## Relationship to Active Code
- `UniversalPreview` (`resources/js/reporting/components/preview/UniversalPreview.tsx`) is the single active rendering engine.
- `PreviewSelector.tsx` always renders `UniversalPreview` — it no longer routes to these legacy previews.
- These files were briefly restored during Phase 6.5 (Section Integration + Legacy Wiring) with a `useLegacy` toggle, but that toggle has since been removed.

## Limitations
- Each file has its own data interface (`A4Data`, `A5Data`, `PreviewTotals`) separate from the canonical `UniversalDocumentData` — requires manual conversion.
- Use HTML table layouts rather than the flexbox/table hybrid approach in `UniversalPreview`.
- No longer imported or referenced by any production code.
- Would need significant rework to align with the current `PrintTemplate` canonical type.
