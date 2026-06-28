# rules/ — Advanced Rule Engine

## Purpose
Preserves the advanced rule engine (`RulesEngineAdvanced.ts`, ~284 lines) which extends the basic `RulesEngine` with nested rule chains, rule groups, debug tracing, simulation, and rule templates.

## Expected Phase
**Phase 3 — Rules Enhancement** (after basic rules are stable)

## Contents
| File | Lines | Responsibility |
|------|-------|----------------|
| `RulesEngineAdvanced.ts` | 284 | Nested if/else-if/else rules, AND/OR rule groups, LRU cache, debug step tracer, what-if simulation, rule template library |

## Relationship to Active Code
The basic `RulesEngine` (`resources/js/reporting/core/engines/RulesEngine.ts`, 122 lines) handles show/hide/highlight/disable rules and is actively used by `UniversalPreview`. `RulesEngineAdvanced` extends that with:
- `NestedRule` — children with `elseIf`/`else` branches
- `RuleGroup` — combiners with AND/OR logic
- Debug mode — per-step timing and trace output
- Simulation — override context values for "what-if" testing
- Rule templates — reusable named rule configurations

## Limitations
- Imports from the live `RulesEngine` and `FormulaEngine` — must stay in sync if those APIs change.
- The `applyAction()` method is public on `RulesEngine` specifically for this extension (labeled `// ── Public (used by RulesEngineAdvanced) ────────────────────────────────────`).
- No UI component exists for nested rule editing — `RulesSection.tsx` would need extension.
- The debug/simulation features need a UI (e.g., a debug panel in the print settings page).
