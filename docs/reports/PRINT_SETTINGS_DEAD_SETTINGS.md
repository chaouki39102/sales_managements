# Print Settings — Dead/Unused Code Analysis

**Date:** 2026-06-29  
**Scope:** `resources/js/pages/settings/print-settings/`  
**Commit:** current working tree (Phase 10 audit state)

---

## 1. PrintTemplate Interface Properties With No Editor Control

After full cross-referencing of `types/domain.ts` (165+ properties) against all 7 section files, `TemplateControls.tsx`, `PrintSettingsPage.tsx`, and the report accordion:

| Property | Status | Notes |
|----------|--------|-------|
| All `show_*`, `override_*`, `col_*`, formatting, totals, footer, barcode, QR, signature, rules, report properties | ✅ Has editor | Every property in the interface has a corresponding control in one of the 7 section files or the report accordion |
| `doc_type_code` | ⚠️ Indirect | Only settable at creation via sidebar nav; no control changes it on an existing template. **Intentional** — templates are per-doc-type |
| `is_default` | ⚠️ Indirect | Set via `TinyBtn` star action, not a standard form field |
| `is_active` | ⚠️ Indirect | Toggled via `TinyBtn` eye icon, not a standard form field |
| `company_name_text` | ⚠️ Misplaced | Rendered in the "بيانات المؤسسة" override section (HeaderSection.tsx:143), NOT under the `show_company_name` toggle where users would expect it. **Usability gap, not dead** |

**Verdict:** Zero orphaned interface properties. Every `PrintTemplate` key is editable through some UI path.

---

## 2. Default Value Discrepancies: `createDefaultTemplate()` vs `SettingsRegistry`

| Key | `defaults.ts` | `SettingsRegistry.ts` | Mismatch? |
|-----|---------------|-----------------------|-----------|
| `name` | `'القالب الافتراضي'` | `'قالب جديد'` | ❌ **Minor** — different default name |
| `is_default` | `true` | `false` | ❌ **Minor** — defaults.ts creates default templates as default; registry treats them as non-default |
| `show_session` | `docTypeCode === 'POS'` | `false` (constant) | ❌ **Minor** — defaults.ts is smart (POS=true); registry always false |
| `logo_source` | `'company'` | `'company'` | ✅ Match |
| `logo_size` | `56` | `56` | ✅ Match |
| `logo_border_radius` | `50` | `50` | ✅ Match |
| `show_company_name` | `true` | `true` | ✅ Match |
| `show_total_ttc` | `true` | `true` | ✅ Match |
| `total_ttc_font_size` | `14` | `14` | ✅ Match |
| `total_border_style` | `'double'` | `'double'` | ✅ Match |
| `show_amount_in_words` | `false` | `false` | ✅ Match |
| `alternating_color` | `'#f5f5f5'` | `'#f5f5f5'` | ✅ Match |
| (170+ other keys) | — | — | ✅ Match for all others checked |

**Discrepancies found:**
- `name`: `defaults.ts` = `'القالب الافتراضي'`, registry = `'قالب جديد'` → **Registry wins** (used by template library)
- `is_default`: `defaults.ts` = `true`, registry = `false` → **Design difference**: one creates default templates, registry describes the generic state
- `show_session`: `defaults.ts` = `true` for POS, registry = `false` → **Registry should match** defaults.ts logic

**Verdict:** 3 minor mismatches, none causing bugs because the merge logic in `PrintSettingsPage.tsx` uses `defaults.ts` values (line 127-129), not registry defaults. The registry defaults are metadata for UI reset behaviors, not runtime values.

---

## 3. Backend Database Fields

**Migration (`database/migrations/2026_06_27_003909_create_print_templates_table.php`):**

| Column | Type | Status |
|--------|------|--------|
| `id` | bigint, PK | ✅ Active |
| `company_id` | FK → companies | ✅ Active |
| `name` | string(255) | ✅ Active |
| `doc_type_code` | string(10) | ✅ Active (indexed with company_id) |
| `paper_size` | string(10), default `'80mm'` | ✅ Active |
| `is_default` | boolean, default `false` | ✅ Active |
| `is_active` | boolean, default `true` | ✅ Active |
| `config` | longText, nullable | ✅ Active (contains 170+ JSON settings) |
| `created_at` | timestamp | ✅ Active |
| `updated_at` | timestamp | ✅ Active |

**Orphaned columns:** None. Every column has a consumer in the model, controller, and frontend.

**`config` JSON details:**
- The model casts `config` as `array` (`PrintTemplate.php:28`) and has a `getConfigAttribute` accessor (`PrintTemplate.php:35-39`) that defaults to `[]`.
- On save, the controller validates `config` as `nullable|array` and fills `[]` if null.
- The `$attributes` default `'config' => '{}'` ensures new records have valid JSON.

---

## 4. API Endpoints — Usage Audit

**`api/printTemplatesApi.ts` — methods:**

| Method | Endpoint | Frontend Consumers | Status |
|--------|----------|-------------------|--------|
| `list(docTypeCode?)` | `GET /print-templates` | `usePrintTemplates` (page + 3 external modules) | ✅ Active |
| `show(id)` | `GET /print-templates/{id}` | `usePrintTemplate` (exported but **unused**) | ❌ **Dead export** |
| `create(tpl)` | `POST /print-templates` | `mutations.create` → handleSave | ✅ Active |
| `update(id, tpl)` | `PUT /print-templates/{id}` | `mutations.update` → handleSave, handleToggleActive | ✅ Active |
| `delete(id)` | `DELETE /print-templates/{id}` | `mutations.remove` → confirmDelete | ✅ Active |
| `setDefault(id)` | `POST /print-templates/{id}/set-default` | `mutations.setDefault` → handleSetDefault | ✅ Active |
| `duplicate(id, name)` | `POST /print-templates/{id}/duplicate` | `mutations.duplicate` → handleDuplicate | ✅ Active |
| `library()` | `GET /print-templates/library` | TemplateLibraryModal | ✅ Active |
| `installLibrary(tplId)` | `POST /print-templates/library/install` | `mutations.installLibrary` → handleInstallLibrary | ✅ Active |
| `uploadLogo(file)` | `POST /print-templates/upload-logo` | HeaderSection → handleLogoUpload | ✅ Active |

**`PrintTemplateController.php` — methods:**

| Method | Route | Frontend Consumer | Status |
|--------|-------|-------------------|--------|
| `index` | `GET /api/{slug}/print-templates` | `usePrintTemplates` | ✅ Active |
| `show` | `GET /api/{slug}/print-templates/{id}` | `usePrintTemplate` (unused) | ❌ **Dead route** |
| `store` | `POST /api/{slug}/print-templates` | mutations.create | ✅ Active |
| `update` | `PUT /api/{slug}/print-templates/{id}` | mutations.update | ✅ Active |
| `destroy` | `DELETE /api/{slug}/print-templates/{id}` | mutations.remove | ✅ Active |
| `setDefault` | `POST /api/{slug}/print-templates/{id}/set-default` | mutations.setDefault | ✅ Active |
| `duplicate` | `POST /api/{slug}/print-templates/{id}/duplicate` | mutations.duplicate | ✅ Active |
| `uploadLogo` | `POST /api/{slug}/print-templates/upload-logo` | HeaderSection | ✅ Active |
| `library` | `GET /api/{slug}/print-templates/library` | TemplateLibraryModal | ✅ Active |
| `installLibrary` | `POST /api/{slug}/print-templates/library/install` | mutations.installLibrary | ✅ Active |

**Dead route:** `GET /api/{slug}/print-templates/{id}` → `show()` method. No consumer calls it. Despite being exported and re-exported, `usePrintTemplate(id)` is never invoked by any component.

**Recommendation:** Remove `usePrintTemplate` (singular) from `api/printTemplatesApi.ts`, the route, and `reporting/index.ts`. Or keep it as a preserved public API (it's a legitimate pattern for external consumers — 0 cost to maintain).

---

## 5. Unused Components

All components in `components/` are imported and rendered. However:

| File | Usage | Status |
|------|-------|--------|
| `Accordion.tsx` | Imported by `TemplateControls.tsx` | ✅ Active |
| `ChartSection.tsx` | Imported by `components/index.ts` (barrel), used by preview | ✅ Active |
| `ColumnManager.tsx` | Imported by `PrintSettingsPage.tsx` (type only) | ✅ Active (type used) |
| `DeleteConfirmModal.tsx` | Imported by `PrintSettingsPage.tsx` | ✅ Active |
| `ErrorBoundary.tsx` | Imported by `PrintSettingsPage.tsx` | ✅ Active |
| `FormulaEditor.tsx` | Imported by `RulesSection.tsx` | ✅ Active |
| `ImagePreviewModal.tsx` | Imported by `HeaderSection.tsx` | ✅ Active |
| `PreviewSelector.tsx` | Imported by `PrintSettingsPage.tsx` | ✅ Active |
| `QuickNav.tsx` | Imported by `PrintSettingsPage.tsx` | ✅ Active |
| `RulesSection.tsx` | Imported by `TemplateControls.tsx` | ✅ Active |
| `TemplateControls.tsx` | Imported by `PrintSettingsPage.tsx` | ✅ Active |
| `TinyBtn.tsx` | Imported by `PrintSettingsPage.tsx` | ✅ Active |
| `ui.tsx` | Imported by 10+ files | ✅ Active |

---

## 6. Unused Imports / Dead Exports

### Dead: `sections/index.ts` (entire file)
- **File:** `sections/index.ts` (8 lines, 8 exports)
- **Problem:** Zero imports across the entire codebase. TemplateControls imports directly from individual section files (`./sections/HeaderSection`, etc.), bypassing the barrel.
- **Contains broken export:** `ToggleSwitch` is exported but does NOT exist in `ToggleSwitch.tsx` (the file only exports `Toggle`, `SliderField`, `Section`, `ColorToggle`).
- **Why it doesn't break the build:** The file is never imported, so the broken export is never resolved.
- **Action:** ❌ **Remove file.** Or fix the barrel export to `Toggle` and start using consistent imports.

### Dead: `ColorToggle` in `sections/ToggleSwitch.tsx`
- **Defined at:** `ToggleSwitch.tsx:44`
- **Problem:** Exported from the file but never imported anywhere.
- **Action:** ❌ **Remove.** It's a trivial wrapper around `Toggle` with no added value.

### Dead: `mergeTemplateWithDefaults` in `services/SettingsSerializer.ts`
- **Defined at:** `SettingsSerializer.ts:57-66`
- **Problem:** Exported but never imported or called anywhere. The merge logic is implemented inline in `PrintSettingsPage.tsx` (lines 127-129 and 317-321).
- **Action:** ❌ **Remove.**

### Dead: `usePrintTemplate` (singular) in `api/printTemplatesApi.ts`
- **Defined at:** `printTemplatesApi.ts:109-118`
- **Problem:** Exported, re-exported through `reporting/index.ts`, but never called by any consumer. All template consumers use the list variant (`usePrintTemplates`).
- **Action:** ⚠️ **Remove or preserve as public API.** If external modules may need it, it costs nothing to keep. If not, remove the hook, controller method, and route.

### Semi-dead: `dbCopyTemplate`, `dbSaveDocConfigs`, `dbFetchDocConfigs` in `services/printStoreService.ts`
- **Defined at:** `printStoreService.ts:43,55,60`
- **Usage:** NOT used within print-settings module. Used externally by `pos/hooks/usePrintSettings.ts`.
- **Re-exported from:** `services/index.ts` (for external consumption through the barrel).
- **Action:** ✅ **Keep.** These are legacy POS compatibility functions that still have external consumers.

---

## Summary: Actionable Dead Code

| Item | File | Lines | Action |
|------|------|-------|--------|
| `sections/index.ts` | `sections/index.ts` | 8 | ❌ Remove (unused barrel with broken export) |
| `ColorToggle` | `sections/ToggleSwitch.tsx:44` | 3 | ❌ Remove |
| `mergeTemplateWithDefaults` | `services/SettingsSerializer.ts:57-66` | 10 | ❌ Remove |
| `usePrintTemplate` (singular hook) | `api/printTemplatesApi.ts:109-118` | 10 | ⚠️ Remove or preserve |
| `show()` → `GET /.../{id}` route | `PrintTemplateController.php:37-45` | 9 | ⚠️ Remove route if hook removed |

**Total dead lines:** ~40 (plus the route + controller method).  
**Risk:** Low. These are all isolated exports with no internal consumers.
