# styling/ — Component-Level Style System

## Purpose
Preserves the multi-layer style system (`StyleSystem.ts`, ~262 lines) which defines a `ComponentStyle` interface with 80+ properties and a layered resolution engine (global → section → component → local).

## Contents
| File | Lines | Responsibility |
|------|-------|----------------|
| `StyleSystem.ts` | 262 | `ComponentStyle` interface (80+ properties), `StyleLayer` resolution, CSS variable generation, style preset management |

## Relationship to Active Code
The live `ThemeSystem` (`resources/js/reporting/core/theme/ThemeSystem.ts`, 337 lines) handles theme-level colors, fonts, and spacing with 3 presets. `StyleSystem` builds on top of `ThemeSystem` to add component-level styles. The current rendering (UniversalPreview) applies component styles inline rather than through a style system.

## Why Archived
The inline style approach in UniversalPreview is simpler and sufficient for current needs. The `ComponentStyle` concept was only ever used by the dead designer's `PropertyInspector` and `useDesignerStore`. The `StyleSystem` class (`styleSystem`) was never invoked.

## Limitations
- `ComponentStyle` interface may not cover all `PrintTemplate` properties (the PropertyInspector was noted as missing several).
- `'borderCollapse': 'collapse' as any` — type safety violation on line 277.
- No consumers in the current architecture — would need integration into the rendering path.
- If a future designer needs component-level styles, this file provides a foundation but would need updating.
