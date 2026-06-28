# compiler/ — Template Compilation

## Purpose
Preserves the report compiler (`ReportCompiler.ts`, ~191 lines) which compiles a `PrintTemplate` + `UniversalDocumentData` into a structured `CompiledReport`.

## Contents
| File | Lines | Responsibility |
|------|-------|----------------|
| `ReportCompiler.ts` | 191 | Template → `CompiledReport` with compiled sections, columns, totals, footer. Version 2 format with timestamps. |

## Why Archived
The compilation concept was superseded by direct template interpretation. `UniversalPreview` reads `PrintTemplate` properties inline without an intermediate compiled representation. The compiler was only ever consumed by the dead `RenderingPipeline` and has no consumers in the current architecture.

## Limitations
- The `CompiledReport` types duplicate information already present in `PrintTemplate` + `UniversalDocumentData`.
- Has 3 `as any` casts bypassing TypeScript on report toggle key mapping (lines 175-179).
- The compiled output format was never validated against the actual rendering path.
- If a compilation step is ever needed in the future, this file provides a foundation but would need significant rework.
