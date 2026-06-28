# pipeline/ — Rendering Pipeline

## Purpose
Preserves the orchestrated rendering pipeline (`RenderingPipeline.ts`, ~92 lines) which defined a 6-stage pipeline: validate → compile → optimize → layout → paginate → render.

## Contents
| File | Lines | Responsibility |
|------|-------|----------------|
| `RenderingPipeline.ts` | 92 | 6-stage pipeline with per-stage metrics, `PipelineStage`, `PipelineMetrics`, `PipelineResult`, `PipelineContext` types |

## Why Archived
The pipeline concept was an early architectural vision that was bypassed by the actual implementation. `UniversalPreview` renders directly from `PrintTemplate` properties — no pipeline abstraction is needed. The pipeline also has a bug: it calls `rulesEngine.evaluateAll()` which does not exist on the real `RulesEngine`.

## Limitations
- **Bug**: calls `rulesEngine.evaluateAll()` (line 98) — this method does not exist on `RulesEngine`. Only `evaluate()` exists.
- **Bug**: `render()` method is a stub returning `null as any` (line 106).
- `run()` was never called anywhere in the codebase.
- Imports `layoutEngine` but never uses it (unused import).
- If a pipeline is ever needed, it should be designed from the current rendering path, not revived from this prototype.
