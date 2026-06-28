# Future — Engineering Archive

This directory preserves engineering work that is not currently active but is expected to be reused in future phases of the ERP Report Designer Framework. Files here are **not exported** from the public API, **not imported** by any production code, and **not included** in the production runtime bundle.

## Purpose
- Preserve previous engineering investment for future roadmap phases.
- Keep the production codebase clean by isolating inactive code.
- Provide context about why each module was preserved and when it is expected to be used.

## Directories
| Directory | Source | Lines | Roadmap Phase |
|-----------|--------|-------|---------------|
| `designer/` | Visual drag-and-drop template designer | ~2,196 | Phase 3 — Designer Canvas |
| `rules/` | Advanced rule engine (nested rules, groups, debug) | ~284 | Phase 3 — Rules Enhancement |
| `plugin/` | Plugin system for extensions | ~176 | Phase 4 — Plugin System |
| `compiler/` | Template compilation pipeline stage | ~191 | Archived — concept superseded |
| `pipeline/` | 6-stage rendering orchestration pipeline | ~92 | Archived — concept superseded |
| `diagnostics/` | Runtime performance diagnostics | ~177 | On hold — low priority |
| `styling/` | Component-level style system | ~262 | Archived — inline styles win |
| `previews/` | Legacy per-format preview components | ~1,240 | Superseded by UniversalPreview |

## Rules
- Do **not** export any module from this directory in the public API.
- Do **not** import anything from this directory in production code.
- Do **not** delete files without approval — they represent prior engineering work.
- If a file is revived for a future phase, move it out of `future/` into the appropriate active directory and wire it into the public API.
