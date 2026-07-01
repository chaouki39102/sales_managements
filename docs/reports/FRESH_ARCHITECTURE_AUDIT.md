# Print Engine Architecture Audit — Fresh Evidence-Based Report (2026-07-01)

**Method:** Every claim verified by reading complete file contents (full files, not grep). All prior reports/AGENTS.md explicitly treated as stale.

---

## Claim 1 — Dual-write path (DB + legacy settings key)

**Verdict: FALSE** — No dual-write exists.

**Evidence:**
- Save flow: `PrintSettingsPage.tsx:186-196` calls `mutations.update.mutateAsync({ id, data })` → `printTemplatesApi.ts:57-59` calls `api.put('/print-templates/${id}', toApiPayload(tpl))`. Single DB write.
- `printTemplatesApi.ts:42-78` — All 8 methods use `/print-templates` endpoints exclusively.
- `PrintTemplateController.php:47-111` — `store()` and `update()` only write to `PrintTemplate` model (`print_templates` table). No secondary write.
- `SettingController.php:189-191` has `'print:templates'` and `'print:doc_configs'` in a whitelist for backwards-compatible dynamic settings keys. However, no code path writes templates via the settings endpoint — these whitelist entries exist solely so existing `Setting::set()` calls with `print:` prefix don't 422.
- `dbSaveTemplate` / `dbFetchTemplate`: Zero matches across all `.ts` and `.php` files.
- `printStoreService.ts`: Only manages `print:doc_configs` (printer assignments, not template data). Imported by `printStore.ts` for device-level printer selection.

**Verdict confirmed:** The template save flow is single-path — `/print-templates` API → `print_templates` table. No dual-write exists.

---

## Claim 2 — SessionStatsModal.tsx calls unimported hook

**Verdict: FALSE** — All hooks are properly imported.

**Evidence:**
`SessionStatsModal.tsx:1-8`:
```typescript
import React, { useState, useMemo } from 'react';
import { formatDZD } from '@/pos/utils/calculations';
import type { PosSession } from '@/lib/api/endpoints/posSession';
import { useActiveCompany } from '@/lib/store/appStore';
import { usePrintTemplatesList, mapCompany } from '@/pages/settings/print-settings/runtime';
import TemplatePrintModal from '@/pages/settings/print-settings/components/shared/TemplatePrintModal';
import { DocumentDataBuilder } from '@/pages/settings/print-settings/types/data';
```

Hook calls in the file:
- `Line 29`: `const companyInfo = mapCompany(useActiveCompany());` — both `mapCompany` and `useActiveCompany` are imported.
- `Line 42`: `const { data: reportTemplates = [] } = usePrintTemplatesList('RPT');` — imported from runtime barrel.
- Previously had `usePrintTemplates('RPT')` (the removed old designer hook) — **was** a runtime crash but is **currently** using `usePrintTemplatesList`.

**Verdict confirmed:** All hooks called are in the import block. No unimported hook calls.

---

## Claim 3 — Company-info mapping duplication

**Verdict: TRUE** — 1 remaining hardcoded-empty `ice`, plus 4 total mappings.

**Evidence — every occurrence:**

### Mapping 1 — `PrintRuntimeAdapter.tsx:26-38` (canonical `mapCompany`)
```typescript
export function mapCompany(ac) {
  name:    ac.name    ?? '',
  address: ac.address ?? '',
  phone:   ac.phone   ?? '',
  nif:     ac.nif     ?? '',
  rc:      ac.rc      ?? '',
  nis:     ac.nis     ?? '',
  ice:     (ac as any).ice ?? '',    // ← reads real value
  article: (ac as any).ai ?? '',
  logoUrl: (ac as any).avatar ?? null,
}
```

### Mapping 2 — `print-settings-adapter.tsx:34-43`
```typescript
name:    activeCompany.name    ?? '',
address: activeCompany.address ?? '',
phone:   activeCompany.phone   ?? '',
nif:     activeCompany.nif     ?? '',
rc:      activeCompany.rc      ?? '',
nis:     activeCompany.nis     ?? '',
ice:     (activeCompany as any).ice ?? '',    // ← NOW FIXED (was '' before)
article: (activeCompany as any).ai ?? '',
logoUrl: (activeCompany as any).avatar ?? null,
```

### Mapping 3 — `POSPage.tsx:655-667` ← STILL BUGGY
```typescript
name:    company.name    ?? '',
address: company.address ?? '',
phone:   company.phone   ?? '',
nif:     company.nif     ?? '',
rc:      company.rc      ?? '',
nis:     company.nis     ?? '',
ice:     '',                                    // ← HARDCODED EMPTY
article: company.ai      ?? '',
logoUrl: company.avatar  ?? null,
```

### Mapping 4 — `CommercialDocumentModal/index.tsx:357` (FIXED)
Calls `mapCompany(useActiveCompany())` — uses canonical mapping.

### Mapping 5 — `SessionStatsModal.tsx:29` (FIXED)
Calls `mapCompany(useActiveCompany())` — uses canonical mapping.

### Mapping 6 — `BatchPrintModal.tsx:74` (FIXED)
Calls `mapCompany(useActiveCompany())` — uses canonical mapping.

**Diff analysis — `ice` field only:**
| File | Line | ice value | Status |
|------|------|-----------|--------|
| `PrintRuntimeAdapter.tsx:37` | `(ac as any).ice ?? ''` | ✅ Reads real value |
| `print-settings-adapter.tsx:41` | `(activeCompany as any).ice ?? ''` | ✅ FIXED (was `''`) |
| **`POSPage.tsx:664`** | **`''`** | **❌ HARDCODED EMPTY** |
| CommercialDocumentModal | `mapCompany()` | ✅ Canonical |
| SessionStatsModal | `mapCompany()` | ✅ Canonical |
| BatchPrintModal | `mapCompany()` | ✅ Canonical |

**Type note:** `CompanyPreviewData` (type used by POSPage.tsx at line 655, defined in `live-data.ts:34-44`) is structurally identical to `CompanyData` (defined in `shared.tsx:80-91`). Both have the same 9 fields with the same types. They could be unified but do not cause a runtime difference.

---

## Claim 4 — Default template resolution duplication

**Verdict: TRUE** — Two separate logic paths.

**Evidence:**

### Path A — `PrintSettingsPage.tsx:121-136` (editing)
```typescript
useEffect(() => {
  if (templates.length > 0) {
    const tpl = templates.find(t => t.is_default) ?? templates[0];  // <-- prefers is_default
    setSelectedTplId(tpl.id);
    setLocalTpl(normalizeTemplate(tpl, activeDoc, tpl.paper_size));
  } else {
    setLocalTpl(normalizeTemplate({ id: null, doc_type_code: activeDoc, name: 'قالب جديد' }, activeDoc));
  }
}, [templates, activeDoc]);
```

### Path B — `TemplateResolver.ts:12-28` (printing)
```typescript
export function resolveTemplate(templates, docTypeCode, paperSize?) {
  const matching = templates.filter(t => t.doc_type_code === docTypeCode && t.is_active);
  if (matching.length === 0) return undefined;
  if (paperSize) return matching.find(t => t.paper_size === paperSize) ?? matching[0];
  return matching[0];   // <-- no is_default check
}
```

### Path C — `usePrintSettings.ts:110-112` (POS)
```typescript
const resolved = resolveTemplate(templates, docTypeCode, size !== 'none' ? size : '80mm');
const template = resolved ?? createDefaultTemplate(docTypeCode, '80mm');
```
Uses Path B (TemplateResolver), with a fallback to `createDefaultTemplate` if no match.

**Behavioral difference:**
- Path A checks `is_default` explicitly — picks the default, or first if none flagged.
- Path B returns the first active match (API sorts by `is_default DESC, created_at DESC` per `PrintTemplateController.php:27-29`).

In practice, both resolve to the same template because the API returns defaults first. But if a template has `is_active=true` and comes before the default in the sorted result (e.g. by `created_at`), Path B could pick a non-default template that Path A would skip.

---

## Claim 5 — UniversalPreview `company` prop

**Verdict: PARTIALLY TRUE** — `company` is NOT in `UniversalPreviewProps` but IS passed by 1 remaining caller.

**Evidence:**

### Prop type — `UniversalPreview.tsx:18-21`
```typescript
export interface UniversalPreviewProps {
  tpl:      PrintTemplate;
  data:     UniversalDocumentData;
}
```
No `company` field. The component destructures `{ tpl, data }` only (line 57). Any additional props are silently ignored by React.

### Call sites:

| File | Line | Passes `company`? | Status |
|------|------|-------------------|--------|
| `UniversalPrintPipeline.tsx:84` | `<UniversalPreview tpl={template} data={data} />` | ❌ No | ✅ Clean |
| `renderPipelineToPopup.tsx:138` | `<UniversalPreview tpl={template} data={data} />` | ❌ No | ✅ Clean (removed in Fix #6) |
| `TemplatePrintModal.tsx:193` | `<UniversalPreview tpl={tpl} data={data} />` | ❌ No | ✅ Fixed (was `company={company}` before M2 fix) |
| **`PreviewSelector.tsx:23`** | **`<UniversalPreview tpl={tpl} data={data ?? null} company={company ?? null} />`** | **✅ Yes** | **❌ Passes ignored prop** |
| TemplatePrintModal.tsx handlePrint (popup) | `React.createElement(UniversalPreview, { tpl, data })` | ❌ No | ✅ Clean |

**Only PreviewSelector remains** — `PreviewSelector.tsx:23` passes `company` but UniversalPreview ignores it.

---

## Claim 6 — FieldRegistry vs PrintFieldRegistry

**Verdict: PARTIALLY TRUE** — Both exist but do NOT diverge behaviorally.

**Evidence:**

### `services/FieldRegistry.ts:1-234`
- Export: `fieldRegistry = new FieldRegistry(ALL_FIELDS)`
- Purpose: **Descriptive catalog** for the reporting framework (formulas, rules, field discovery for the Report Designer)
- No resolver logic — pure lookup table with 61+ field definitions
- `amountInWords` entry at line 220: `{ path: 'computed.amountInWords', label: 'المبلغ كتابة', group: 'computed', type: 'string' }`

### `services/PrintFieldRegistry.ts:1-181`
- Export: `printFieldRegistry = new PrintFieldRegistry(PRINT_FIELDS)`
- Purpose: **Identifier-based registry** for the print preview rendering (template-aware field resolution)
- Has `sourcePath: 'computed.amountInWords'` and `settingKey: 'show_amount_in_words'`
- The actual value is computed in `PrintFieldResolver.ts:73-76`:
  ```typescript
  if (fieldId === 'totals.amountInWords') {
    const total = data.totals?.totalTtc ?? 0;
    return numberToArabicWords(total);
  }
  ```
  This is a **hardcoded branch** — does NOT follow `sourcePath`.

### Both are exported from `services/index.ts:1-4,13-16`:
```typescript
export { fieldRegistry } from './FieldRegistry';
export { PRINT_FIELDS, printFieldRegistry } from './PrintFieldRegistry';
export { printFieldResolver } from './PrintFieldResolver';
```

### Behavioral analysis for `amountInWords`:
- **FieldRegistry path**: `getField('computed.amountInWords')` → returns metadata `{ path, label, group, type }`. No computation. Used only by the reporting framework for formula evaluation.
- **PrintFieldRegistry path**: `printFieldResolver.resolve('totals.amountInWords', data, tpl)` → goes to `PrintFieldResolver.ts:73-76` → reads `data.totals.totalTtc` → calls `numberToArabicWords(total)`. This is the computation used by all preview sections.
- **Result**: Both paths coexist but do NOT diverge. FieldRegistry is passive metadata; PrintFieldResolver has the actual computation. They serve different consumers (reporting formulas vs print rendering).

---

## Claim 7 — Backend config validation

**Verdict: TRUE** — `'config' => 'nullable|array'` is the entire validation.

**Evidence:**

`PrintTemplateController.php:57` (store):
```php
'config' => 'nullable|array',
```

`PrintTemplateController.php:92` (update):
```php
'config' => 'nullable|array',
```

No schema validation: no required keys, no structural checks, no type constraints on values, no migration/version checking. An empty array `[]`, a partial config `{ show_logo: true }`, or arbitrary JSON are all equally accepted.

`PrintTemplate.php:37-41` — `getConfigAttribute()` accessor just decodes JSON and returns array (or empty array on failure):
```php
public function getConfigAttribute($value): array {
    if (is_null($value) || $value === 'null') return [];
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}
```

The frontend `SettingsRegistry.ts:1-280` defines the full schema with defaults for 144+ settings, but this is purely client-side. The backend trusts whatever the frontend sends with zero structural validation.

---

## Claim 8 — `templateHooks` dead field

**Verdict: FALSE** (currently not present — was previously true but has been cleaned up).

**Evidence:**
- `contracts/HostContext.ts:1-12` — No `templateHooks` field in `HostDependencies`. Currently has `{ apiClient, notifier, printTemplatesApi, company, slug }`. Clean.
- `contracts/TemplateRepository.ts:1-16` — No `TemplateRepositoryHooks` interface. Only `PrintTemplatesApi` remains. Clean.
- `providers/PrintSettingsContext.tsx:1-24` — No `useTemplateHooks()` export. Exports `{ useHost, useApiClient, useNotifier, usePrintTemplatesApi, useCompany, useSlug }`. Clean.
- `print-settings-adapter.tsx:29-46` — No `templateHooks: null as any` line. Clean.

**History:** The `templateHooks` field was previously defined and injected as `null as any`, with an accessor `useTemplateHooks()` that would return `null` if called. This was dead code — no consumer ever called `useTemplateHooks()`. It has been removed from all 4 files.

---

## Claim 9 — Distinct print-popup-window implementations

**Verdict: TRUE** — 3 remaining implementations with differing sizing, timing, and rendering strategies.

**Evidence:**

| # | File:Line | Width | Height | Font Loading | Print Trigger | Render Strategy |
|---|-----------|-------|--------|--------------|---------------|-----------------|
| 1 | `UniversalPrintPipeline.tsx:82-117` — `openPrintPopup` | Dynamic (passed as arg) | Dynamic (passed as arg) | `fonts.ready` + 200ms (fallback 600ms) | Inline script (`doPrint()`) | `ReactDOM.createRoot` + `<UniversalPreview>` |
| 2 | `printUtils.ts:28-73` — `openPrintWindow` | Fixed 400 | Fixed 600 | `fonts.ready` + 200ms (fallback 600ms) | Inline script (`doPrint()`) | Raw HTML string via `document.write` (no React) |
| 3 | `PrintSettingsPage.tsx:312-345` — `handleTestPrint` | `Math.round(mmW*3.78)+60` capped 900 | Fixed 700 | `await fonts.ready` + rAF + 400ms (async/await) | Manual `win.print()` call (not inline) | `ReactDOM.createRoot` + `PreviewSelector` (NOT UniversalPreview) |

**Previously removed:**
- TemplatePrintModal's `handlePrint` had its own popup — migrated to `openPrintPopup()` (Fix #5).
- BatchPrintModal's `printDocument` had its own popup — migrated to `renderPipelineToPopup()` (Fix #4).

**Key differences:**
- #1 (shared) vs #2 (POS fallback): Same font-loading strategy but #2 uses raw HTML string (pre-rendered), has no React, fixed 400×600 sizing, and uses `unload` event + 5s timeout for promise resolution instead of `onafterprint`.
- #3 (designer test print) is fundamentally different: uses `PreviewSelector` (wraps UniversalPreview but also accepts a `company` prop), uses async/await with manual `win.print()` call (not inline script), and has a unique timing sequence (fonts.ready → rAF → 400ms).

---

## Claim 10 — Pipeline component usage across consumers

**Verdict: PARTIALLY TRUE** — Most consumers share `UniversalPreview`, but not all go through `UniversalPrintPipeline`.

**Evidence — per consumer:**

| Consumer | Pipeline Path | File:Line | Shares Pipeline? |
|----------|--------------|-----------|------------------|
| **POSPage (thermal)** | `buildReceiptBytesFromTemplate` → `buildReceiptBytes` (ESC/POS bytes) | POSPage.tsx:741 | ❌ No — direct ESC/POS byte generation, no React rendering |
| **POSPage (non-thermal fallback)** | `renderPreviewToHtml` → `printReceiptDirect` → `openPrintWindow` (raw HTML popup) | POSPage.tsx:732-757 | ❌ No — pre-renders to HTML string, injects into raw popup |
| **POSPage (preview modal)** | `ProfessionalReceipt` → `<UniversalPrintPipeline>` | POSPage.tsx:1124-1135 | ✅ Yes — uses full pipeline |
| **POSKioskPage (thermal)** | `printThermalViaWebUSBFromTemplate` (ESC/POS bytes) | POSKioskPage.tsx:198 | ❌ No — direct bytes |
| **POSKioskPage (preview)** | `ProfessionalReceipt` → `<UniversalPrintPipeline>` | POSKioskPage.tsx:340 | ✅ Yes |
| **CommercialDocumentModal** | `renderPipelineToPopup` (shared pipeline popup) | CommercialDocumentModal/index.tsx:370 | ✅ Yes — uses shared pipeline |
| **BatchPrintModal** | `renderPipelineToPopup` (shared pipeline popup) | BatchPrintModal.tsx:52 | ✅ Yes — uses shared pipeline |
| **SessionStatsModal** | Builds data with `DocumentDataBuilder.fromSessionReport` → passes to `TemplatePrintModal` → renders `<UniversalPreview>` directly | SessionStatsModal.tsx:43-47 + TemplatePrintModal.tsx:193 | ⚠️ Partial — uses `UniversalPreview` but NOT `UniversalPrintPipeline`. Data is pre-built outside the pipeline, then passed directly to TemplatePrintModal which renders UniversalPreview in both the inline preview and the print popup. |
| **PrintSettingsPage (test print)** | `handleTestPrint` → custom popup with `PreviewSelector` | PrintSettingsPage.tsx:312-345 | ❌ No — uses `PreviewSelector` (not `UniversalPreview` directly, not `UniversalPrintPipeline`) |

**Data-building duplication:**
- `UniversalPrintPipeline` has internal `buildData()` function (UniversalPrintPipeline.tsx:142-149) that routes by source type.
- `SessionStatsModal.tsx:43-47` builds data externally with `DocumentDataBuilder.fromSessionReport()` before passing to TemplatePrintModal.
- `POSPage.tsx:740` builds data externally with `DocumentDataBuilder.fromPOSSnapshot()` for the thermal path.
- `CommercialDocumentModal/index.tsx:370` builds data via `renderPipelineToPopup` which calls the internal `buildData()`.

---

## Confirmed Issues — Ranked

### HIGH

#### H1 — `POSPage.tsx:664` hardcoded empty `ice`
- **File:** `resources/js/pages/pos/POSPage.tsx:664`
- **Problem:** `ice: ''` is hardcoded instead of reading the real company value. Same bug that was fixed in `print-settings-adapter.tsx:41` (was `ice: ''`, now `(ac as any).ice ?? ''`).
- **Fix:** Change `ice: '',` to `ice: company.ice ?? '',` or use `mapCompany(useActiveCompany())` from the runtime barrel.

### MEDIUM

#### M1 — `PreviewSelector.tsx:23` passes ignored `company` prop to UniversalPreview
- **File:** `resources/js/pages/settings/print-settings/components/PreviewSelector.tsx:23`
- **Problem:** `<UniversalPreview tpl={tpl} data={data ?? null} company={company ?? null} />` — `company` is not in `UniversalPreviewProps`. Silently ignored by React. Also note `data ?? null` — UniversalPreview expects `UniversalDocumentData`, not `null`, though it currently works since React ignores the mismatch.
- **Fix:** Remove `company={company ?? null}` from the JSX.

#### M2 — Two default-template resolution paths (PrintSettingsPage.tsx vs TemplateResolver.ts)
- **Files:** `PrintSettingsPage.tsx:123`, `TemplateResolver.ts:12-28`
- **Problem:** PrintSettingsPage checks `t.is_default` explicitly; TemplateResolver returns `matching[0]` without checking `is_default`. Behaviorally identical in practice (API sorts defaults first), but code is duplicated and semantically different.
- **Fix:** Either make TemplateResolver also check `is_default`, or make PrintSettingsPage use `resolveTemplate()`.

#### M3 — No backend config schema validation
- **Files:** `PrintTemplateController.php:57,92`
- **Problem:** `'config' => 'nullable|array'` with zero structural validation. Any JSON shape accepted. Future schema changes (add/rename/remove keys) have no migration path.
- **Note:** This may be intentional (loosely-coupled frontend/backend), but means corrupt config data can be persisted without detection.

#### M4 — `POSPage.tsx` has its own inline company mapping (same structure, one bug)
- **File:** `resources/js/pages/pos/POSPage.tsx:655-667`
- **Problem:** 9-line inline mapping that duplicates `mapCompany()` from `PrintRuntimeAdapter.tsx:26-38`. Contains the `ice: ''` hardcoded bug.
- **Fix:** Replace with `const companyData = mapCompany(useActiveCompany());` — this also requires importing `mapCompany` from runtime barrel and potentially changing the type from `CompanyPreviewData` to `CompanyData` (structurally identical).

### LOW

#### L1 — SessionStatsModal bypasses UniversalPrintPipeline
- **Files:** `SessionStatsModal.tsx:43-47`, `TemplatePrintModal.tsx:193`, `UniversalPrintPipeline.tsx`
- **Problem:** SessionStatsModal builds `UniversalDocumentData` externally via `DocumentDataBuilder.fromSessionReport()`, then passes it to `TemplatePrintModal`. TemplatePrintModal renders `<UniversalPreview>` directly. This bypasses `UniversalPrintPipeline`'s orchestration and internal `buildData()` function. Data-building logic exists in two places: in `buildData()` (UniversalPrintPipeline.tsx:142-149) and in `SessionStatsModal.tsx:43-47`.
- **Fix:** Make SessionStatsModal use `UniversalPrintPipeline` instead of TemplatePrintModal, or add a `'prebuilt'` source type to the pipeline (which already exists at UniversalPrintPipeline.tsx:48: `{ type: 'prebuilt'; data: UniversalDocumentData }`).

#### L2 — 3 distinct popup implementations remain
- **Files:** `UniversalPrintPipeline.tsx:82-117` (shared), `printUtils.ts:28-73` (POS fallback), `PrintSettingsPage.tsx:312-345` (designer test print)
- **Problem:** Different sizing strategies (dynamic vs 400×600 vs mm-based capped 900), different font-loading timing (200ms/600ms vs 200ms/600ms vs fonts.ready+rAF+400ms), different render strategies (React+UniversalPreview vs raw HTML vs React+PreviewSelector).
- **Note:** Complete consolidation would require changing the designer test print to use `openPrintPopup` + `UniversalPreview` instead of `PreviewSelector`, and making the POS fallback use `renderPreviewToHtml` + `openPrintPopup` instead of its own `openPrintWindow`.

#### L3 — FieldRegistry and PrintFieldRegistry dual-registry architecture
- **Files:** `services/FieldRegistry.ts`, `services/PrintFieldRegistry.ts`
- **Problem:** Both are exported from `services/index.ts`. FieldRegistry is passive metadata (descriptive catalog). PrintFieldRegistry has resolver logic. Both define field metadata for overlapping domains (reporting vs print). No behavioral divergence but confusing architecture.
- **Note:** Would require a significant refactor to merge — FieldRegistry is used by the reporting framework (formulas, rules expressions), while PrintFieldRegistry is used by the preview rendering. They serve different consumers.

#### L4 — `printStore.ts` exports `dbSaveDocConfigs` / `dbFetchDocConfigs` that delegate to `printStoreService.ts`
- **Files:** `pos/store/printStore.ts:20-21`, `settings/print-settings/services/printStoreService.ts`
- **Problem:** These are re-exports that wrap the same API calls with a trivial adapter. Not a duplication of logic, but unnecessary indirection.
- **Note:** Very low priority — the delegation is intentional (encapsulation boundary between POS store and settings service).

---

## Summary Table

| # | Claim | Verdict | Current Issues |
|---|-------|---------|----------------|
| 1 | Dual-write path | FALSE | None |
| 2 | SessionStatsModal unimported hooks | FALSE | None (was fixed) |
| 3 | Company mapping duplication | TRUE | **H1** — POSPage.tsx:664 ice='' |
| 4 | Default template resolution duplication | TRUE | **M2** — Two paths diverge |
| 5 | UniversalPreview company prop | PARTIALLY TRUE | **M1** — PreviewSelector passes ignored prop |
| 6 | FieldRegistry vs PrintFieldRegistry | PARTIALLY TRUE | L3 — Dual architecture, no behavioral divergence |
| 7 | Backend config validation | TRUE | **M3** — No schema validation |
| 8 | templateHooks dead field | FALSE (cleaned) | None |
| 9 | Distinct popup implementations | TRUE | **L2** — 3 remain |
| 10 | Pipeline usage across consumers | PARTIALLY TRUE | **L1** — SessionStatsModal bypasses pipeline |
