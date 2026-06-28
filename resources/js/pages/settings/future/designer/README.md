# designer/ — Visual Drag-and-Drop Template Designer

## Purpose
Preserves the experimental visual template designer built during Phase 0. This is an 8-component prototype (~2,196 lines) implementing a full drag-and-drop editing surface for `PrintTemplate` documents.

## Expected Phase
**Phase 3 — Designer Canvas** (ADR roadmap, ~3 weeks estimated)

## Components
| File | Lines | Responsibility |
|------|-------|----------------|
| `ReportDesigner.tsx` | 114 | Main orchestrator — 3-panel layout composing toolbar, canvas, property inspector, and component tree |
| `DesignerCanvas.tsx` | 267 | Drag-and-drop editing surface with pan/zoom, grid, rulers, snap-to-grid, rubber-band selection |
| `DesignerToolbar.tsx` | 166 | Toolbar with undo/redo, zoom controls, grid/snap/ruler toggles, add section, copy/paste, save |
| `PropertyInspector.tsx` | 238 | Right-side property editor — position, size, typography, colors, border, shadow, data binding |
| `ComponentTree.tsx` | 173 | Hierarchical tree view of canvas elements with selection, reorder, visibility/lock toggles |
| `DesignerElement.tsx` | 205 | Single draggable/resizable element with 8 resize handles, rotation, selection highlight |
| `DesignerConverter.ts` | 519 | Bidirectional conversion between `PrintTemplate` and `DesignerElement[]` (20+ element types) |
| `useDesignerStore.ts` | 514 | Zustand store: elements map, multi-select, clipboard, undo/redo, drag state, zoom/pan, 50+ actions |
| `CommandHistory.ts` | 80 | Undo/redo stack with batch grouping, composite commands — used by the designer store |

## Limitations
- Was a Phase 0 prototype — never rendered by any route or integrated into the Print Settings page.
- `DesignerConverter.ts` must be updated to match the current `PrintTemplate` canonical type (properties may have changed).
- Depends on `StyleSystem` (in `future/styling/`) for `ComponentStyle` types — these may need reconciliation with the current inline style approach.
- The route at `/settings/print/designer` currently shows a removal notice placeholder.
- No keyboard shortcut system, no element snap-to-content, no multi-page support.
- The `useDesignerStore` uses Zustand — currently the Print Settings page uses `useImmer`.
