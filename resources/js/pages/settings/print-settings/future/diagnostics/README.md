# diagnostics/ — Runtime Performance Diagnostics

## Purpose
Preserves the runtime diagnostics system (`DiagnosticsService.ts` + `DiagnosticsPanel.tsx`, ~177 lines) for measuring rendering performance.

## Contents
| File | Lines | Responsibility |
|------|-------|----------------|
| `DiagnosticsService.ts` | 50 | Captures pipeline metrics, computes render/formula/rule/layout timings, memory estimates |
| `DiagnosticsPanel.tsx` | 127 | React UI panel showing timing bars, component/memory counts, warnings, history graph |

## Why Archived
The diagnostics system was built for the pipeline architecture which was never used. Metrics depend on `RenderingPipeline` which was also dead. No runtime diagnostics are currently tracked or displayed.

## Limitations
- All metrics are stubs that read from the never-run `RenderingPipeline`.
- `(performance as any).memory?.usedJSHeapSize` uses a non-standard API.
- The UI panel was never rendered by any page.
- Would need a complete rework to measure the actual rendering path (UniversalPreview's inline render).
- Low priority — no near-term roadmap item requires runtime performance diagnostics.
