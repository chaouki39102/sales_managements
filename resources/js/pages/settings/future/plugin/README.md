# plugin/ — Plugin System

## Purpose
Preserves the plugin system prototype (`PluginRegistry.ts`, ~176 lines) defining a formal extension API for formula functions, themes, barcode types, chart types, custom components, and paper sizes.

## Expected Phase
**Phase 4 — Plugin System** (ADR roadmap)

## Contents
| File | Lines | Responsibility |
|------|-------|----------------|
| `PluginRegistry.ts` | 176 | `PluginManifest`, `PluginHooks` (onRegister, onUnregister, onCompile, onRender), extension point registration APIs |

## Relationship to Active Code
The current codebase uses direct registration APIs:
- `FormulaEngine.registerFunction()` — called by `AdvancedFunctions.ts` in `app.jsx`
- `ThemeSystem` — standalone class with 3 built-in presets

The plugin registry would add:
- Lifecycle hooks (onRegister, onUnregister, onTemplateCompile, onRenderStart, onRenderComplete)
- Centralized registry of all extension points
- Version checking and dependency resolution between plugins

## Limitations
- Prototype — no plugins were ever registered through this system.
- The direct-registration pattern (`FormulaEngine.registerFunction()`) is simpler and works for current needs.
- No plugin discovery mechanism (would need a plugin manifest file or API endpoint).
- No UI for managing plugins.
- Not aligned with any current or near-term requirement.
