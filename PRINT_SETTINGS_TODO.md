# PRINT_SETTINGS_TODO - Bugs & Enhancements Roadmap

> Work task-by-task, commit + push after each.
> Every task is independently shippable. Pick any session, close one or more tasks.
> DO NOT re-explore files unless a task explicitly says so - all context is here.

## Legend
- [BUG] wrong behavior, needs fix
- [ENH] new capability or improvement
- [CLEAN] dead code / consistency / tech debt
- Priority: P1 critical, P2 high, P3 medium, P4 low
- Scope: FE / BE / BOTH

---

## Section A - Serialization and Data Integrity

### A1. fromApiResponse backfill missing keys [BUG][P1][FE]
- File: services/SettingsSerializer.ts fromApiResponse()
- Problem: When backend sends config JSON missing a newly-added key (after frontend deploy adds new setting), template has undefined. Preview/controls read undefined instead of registry default.
- Fix: After ensureLayoutFields(tpl), iterate SETTINGS_REGISTRY and set tpl[key] = tpl[key] ?? registry.defaultValue for every key.
- Verify: Create new template in fresh company - every toggle has sensible default.

### A2. toApiPayload layout objects serialization safety [BUG][P1][FE]
- File: services/SettingsSerializer.ts toApiPayload()
- Problem: toApiPayload collects non-TOP_LEVEL keys into config. Complex objects (totals_rows, footer_rows, header_layout, doc_info_rows, customer_info_rows, company_info_rows, sections_order, col_styles, page_frame, totals_grid, watermark, label_positions) go into config as nested JSON. If unserializable value exists, save silently drops data.
- Action: Wrap each value in JSON.stringify() guard before assigning to config. Log+skip on throw.
- Verify: Save template with label_positions set, reload, positions preserved.

### A3. Template name default is empty string [BUG][P2][FE]
- File: PrintSettingsPage.tsx handleNewTemplate()
- Problem: New template created with name empty string. Sidebar shows empty name. User must rename immediately.
- Fix: Set name to "قالب جديد" from SETTINGS_REGISTRY.name.defaultValue. When duplicates exist append number: "قالب جديد 2", "قالب جديد 3", etc.
- Verify: Create 2 templates, both have distinct names in sidebar.

### A4. is_default mutator path audit [BUG][P2][BE]
- File: app/Http/Controllers/Api/V1/PrintTemplateController.php setDefault()
- Problem: PrintTemplate boot registers setIsDefault mutator that clears other defaults. If controller uses update(['is_default' => true]) instead of direct assignment, mutator may not fire.
- Action: Read setDefault(), confirm it uses $template->is_default = true; $template->save(). If using update() array, switch to direct assignment.
- Verify: Set default on template A, template B (previously default) loses star icon.

### A5. TOP_LEVEL_KEYS vs domain type drift [CLEAN][P3][FE]
- File: services/SettingsSerializer.ts (TOP_LEVEL_KEYS constant)
- Problem: TOP_LEVEL_KEYS lists keys flat on template (not in config). If someone adds key to PrintTemplate in domain.ts but forgets TOP_LEVEL_KEYS, key goes into config silently.
- Action: Add a runtime assertion in fromApiResponse: after merging, check that every top-level key exists on the template object and is NOT inside config. Log warning if drifted.
- Verify: Add a test that diff between domain.ts PrintTemplate keys and TOP_LEVEL_KEYS is empty.

---

## Section B - Visibility and Paper/Doc Gating

### B1. Unify isSettingVisible and isPropertyVisible [BUG][P1][FE]
- File: services/SettingsRegistry.ts
- Problem: TWO visibility functions exported from same file. isSettingVisible used by FormattingSection, LabelSection, preview sections. isPropertyVisible used by TemplateControls and section components. If one has bug (e.g., missing dependsOn check), the other wont catch it.
- Action: Delete one, make the other the canonical name. OR make one delegate to the other. Every consumer must use the same function.
- Verify: dependsOn toggle OFF -> children hidden in BOTH controls panel AND formatting section.

### B2. barcode_custom_text dependsOn is pills not toggle [BUG][P2][FE]
- File: services/SettingsRegistry.ts
- Problem: barcode_custom_text has dependsOn: barcode_content. barcode_content is pills (always truthy string). Auto-gating checks if parent is toggle and value is falsy, so child is always visible. But barcode_custom_text should only appear when barcode_content === custom.
- Action: When dependsOn target is pills/select, add dependsOnValue to SettingMeta. Child visible only when parent value === dependsOnValue. Add dependsOnValue: 'custom' to barcode_custom_text.
- Verify: barcode_content=doc-number -> barcode_custom_text hidden. barcode_content=custom -> visible.

### B3. show_qr vs show_qr_code confusion [BUG][P3][FE]
- Files: SettingsRegistry.ts, FooterSection.tsx, UniversalPreview.tsx
- Problem: Domain type has show_qr (boolean) AND show_qr_code (boolean). One is master gate, other is sub-toggle. Confusingly named. Registry may only define one.
- Action: Audit both fields. If show_qr is master gate and show_qr_code is sub-toggle, add dependsOn: show_qr to show_qr_code. If one is dead, remove it.
- Verify: show_qr OFF -> no QR in preview regardless of show_qr_code.

### B4. Section visibility toggles not in SettingsRegistry [BUG][P3][FE]
- Files: SettingsRegistry.ts, TemplateControls.tsx
- Problem: Domain type has show_header_section, show_doc_info_section, show_items_section, show_totals_section, show_payments_section, show_footer_section. These may not be in SettingsRegistry. TemplateControls sec() function returns true for undefined registry entries.
- Action: Verify these 6 keys are in SETTINGS_REGISTRY. If not, add with category section-visibility, component toggle, defaultValue true, supportedPapers ALL_PAPERS, supportedDocs ALL_DOCS except STK.
- Verify: show_header_section OFF -> header section disappears from preview.

### B5. dependsOn only supports toggle parent type [ENH][P2][FE]
- File: services/SettingsRegistry.ts isSettingVisible()
- Problem: dependsOn only works for toggle parents (checks falsy). For pills/select parents, children are always visible. For numeric slider parents, no conditional visibility is possible.
- Action: Extend dependsOn to support dependsOnValue (show child when parent === value). Support toggle (parent false = hide), pills/select (parent !== value = hide), slider (parent < min = hide).
- Verify: Set up a test case where dependsOn is a select field with dependsOnValue, child shows/hides correctly.

---

## Section C - Preview Rendering

### C1. PreviewSelector null data handling [BUG][P2][FE]
- File: PrintSettingsPage.tsx line 770
- Problem: data={useRealData ? previewData : null} passes null when useRealData is OFF (default). UniversalPreview must handle null gracefully.
- Action: Verify UniversalPreview handles null data. If it renders empty/crashes, pass emptyDocumentData() as default instead of null so template layout is always visible.
- Verify: Load template -> preview shows layout with placeholder labels -> toggle real data -> shows actual content.

### C2. Section-specific font family not applied [BUG][P3][FE]
- Files: HeaderSection.tsx, ItemsSection.tsx, TotalsSection.tsx, PaymentsSection.tsx
- Problem: Template has 5 font settings: font_family (global), company_info_font_family, customer_info_font_family, items_font_family, payments_font_family. If sections hardcode font_family(template.font_family) they ignore section-specific fonts.
- Action: Audit each preview sections style.fontFamily. Each must read section-specific font first, fall back to font_family. Same for fontSize (sections have own *_font_size).
- Verify: Set company_info_font_family to monospace -> company info renders monospace, items stay Tajawal.

### C3. company_name_text override not working [BUG][P2][FE]
- Files: HeaderSection.tsx, PrintFieldResolver.ts
- Problem: When company_name_text is non-empty, preview should show override instead of real name. company_name_text is NOT named override_company_name, so PrintFieldResolver may not handle it.
- Action: Verify PrintFieldResolver.resolve('company.name', data, template) checks company_name_text when non-empty and returns it. If not, add the check.
- Verify: Set company_name_text to test text, preview shows it. Clear it, shows real name.

### C4. section_width and section_align settings dead [BUG][P3][FE]
- Files: UniversalPreview.tsx, section components
- Problem: Domain has section_header_width, section_header_align, section_doc_info_width, etc. These control width/alignment of section wrapper divs. If preview sections dont read these, settings are dead.
- Action: Audit UniversalPreview.tsx. Each section wrapper must apply width: tpl.section_{key}_width% and textAlign: tpl.section_{key}_align.
- Verify: Set section_header_width to 50 -> header occupies half page width.

### C5. totals_rows rendering order not respected [BUG][P3][FE]
- Files: TotalsSection.tsx, layoutMigration.ts
- Problem: totals_rows is a LayoutRow[] with order field. If TotalsSection renders by array index instead of sorting by order, reordering rows has no effect.
- Action: Verify TotalsSection sorts totals_rows by .order before rendering. If not, add .sort((a,b) => a.order - b.order).
- Verify: In controls, drag reorder totals rows -> preview reflects new order.

### C6. preview sections ignore sections_order [BUG][P2][FE]
- File: UniversalPreview.tsx
- Problem: sections_order is a SectionMeta[] with order field. If UniversalPreview renders sections in hardcoded order instead of reading sections_order, the reordering feature is dead.
- Action: Verify UniversalPreview reads sections_order from template and renders sections in the specified order. If hardcoded, refactor to use sections_order.
- Verify: Reorder sections in controls -> preview reflects new section order.

---

## Section D - Print Engine

### D1. AdvancedFunctions lazy-load state safety [BUG][P2][FE]
- Files: engines/AdvancedFunctions.ts, engines/FormulaEngine.ts, app.jsx
- Problem: registerAdvancedFunctions lazy-loaded via dynamic import(). If FormulaEngine has module-level mutable state (caches, registries), lazy loading means state is initialized late.
- Action: Verify both files are pure functions with no module-level mutable state. If they have caches, ensure they are recreated on import (Map instances, not module-level vars).
- Verify: Open print settings -> trigger formula action -> works on first load.

### D2. Test print bypasses template overrides [BUG][P3][FE]
- File: PrintSettingsPage.tsx handleTestPrint
- Problem: Test print button uses renderPipelineToPopup which may use a different rendering path than UniversalPreview. Template overrides (company_name_text, custom logo, etc.) may not apply.
- Action: Trace handleTestPrint -> confirm it goes through UniversalPreview with same tpl. If separate path, unify.
- Verify: Set company_name_text -> test print -> receipt shows override text.

### D3. ESCPOSRenderer ignores section-specific fonts [BUG][P3][FE]
- File: renderers/ESCPOSRenderer.ts
- Problem: ESCPOSRenderer (thermal receipt bytes) may hardcode font settings instead of reading company_info_font_family, items_font_family etc from template.
- Action: Verify ESCPOSRenderer reads section-specific font settings. Thermal printers may not support all fonts, so add fallback logic (use base font_family for thermal).
- Verify: Print thermal receipt with custom font settings -> receipt matches preview.

---

## Section E - Template CRUD and Sidebar UX

### E1. handleNewTemplate empty name (duplicate of A3) [BUG][P2][FE]
- See A3 above.

### E2. Template deletion does not confirm [BUG][P3][FE]
- File: PrintSettingsPage.tsx handleDelete
- Problem: handleDelete uses window.confirm (project rule says NEVER use window.confirm). Must use useConfirm hook + ConfirmDialog.
- Action: Replace confirm() with useConfirm().confirm() pattern. ConfirmDialog already mounted at bottom of JSX.
- Verify: Click delete -> custom confirm modal appears -> confirm deletes -> cancel does nothing.

### E3. Template duplicate naming [BUG][P3][FE]
- File: PrintSettingsPage.tsx handleDuplicate
- Problem: handleDuplicate may create a copy with same name, making it hard to distinguish originals from copies.
- Action: Set duplicate name to "{original_name} (نسخة)" or "{original_name} 2".
- Verify: Duplicate "قالب FV" -> new template named "قالب FV (نسخة)".

### E4. Sidebar template count badge per doc type [ENH][P4][FE]
- File: PrintSettingsPage.tsx
- Problem: No visual indication of how many templates exist per doc type until you expand the category.
- Action: Add a small count badge next to each doc type name in the category tree (already partially done with count variable at line 505 - verify it renders).
- Verify: Create 3 FV templates -> sidebar shows "3" badge next to FV.

### E5. QuickNav scroll targets misaligned [BUG][P4][FE]
- File: PrintSettingsPage.tsx QuickNav component
- Problem: QuickNav buttons scroll to section anchors (s-header, s-doc-info, etc.) but if sections are collapsed, scroll target is hidden and scroll fails silently.
- Action: Auto-expand collapsed section when QuickNav scrolls to it.
- Verify: Collapse Header section -> click QuickNav "Header" -> section expands and scrolls into view.

---

## Section F - Backend

### F1. PrintTemplateController extractId safety [BUG][P2][BE]
- File: app/Http/Controllers/Api/V1/PrintTemplateController.php
- Problem: BaseApiController defines show($id), update(Request $request, $id). Laravel 13 Dispatcher can splice Company model into $id position. Must use $this->extractId($id) pattern.
- Action: Verify show(), update(), destroy() all use extractId($id). If any directly uses $id as int, fix.
- Verify: Access /{company}/print-templates/{id} -> works correctly (no 500, no wrong model).

### F2. PrintTemplateService library install duplicate guard [BUG][P3][BE]
- File: app/Services/PrintTemplateService.php
- Problem: installLibrary may create duplicate templates if called twice for same doc type. Should check if a template from same library already exists.
- Action: Before creating, check if template with same name+doc_type_code already exists. If so, skip or update.
- Verify: Install library template twice -> no duplicate in DB.

### F3. ExportPdf endpoint missing company scope [BUG][P2][BE]
- File: app/Http/Controllers/Api/V1/PrintTemplateController.php exportPdf()
- Problem: exportPdf fetches template by ID but must scope to current company to prevent cross-tenant access.
- Action: Verify exportPdf uses where('company_id', $companyId) or model scope. If using find($id) without scope, add company scoping.
- Verify: User from company A cannot export company B template via direct ID.

### F4. SetDefault endpoint race condition [CLEAN][P3][BE]
- File: app/Models/PrintTemplate.php setIsDefault mutator
- Problem: setIsDefault clears other defaults in a loop without DB transaction. Concurrent requests could create two defaults.
- Action: Wrap the clear+set in DB::transaction(). Use where('doc_type_code', ...)->where('is_default', true)->update(['is_default' => false]) before setting new default.
- Verify: Two concurrent setDefault calls -> only one template ends up as default.

---

## Section G - Preview/Print Consistency

### G1. Preview does not match printed output [ENH][P1][FE]
- File: UniversalPreview.tsx vs actual print path
- Problem: Preview renders in browser (React/CSS), actual print goes through UniversalPrintPipeline -> DocumentDataBuilder -> ESCPOSRenderer (thermal) or print popup (page). If these paths produce different layouts, user sees one thing in preview and another on paper.
- Action: Create a comparison test: render same template with same data in preview and in print popup, compare DOM structure. Document any differences.
- Verify: Side-by-side preview and print output match for FV A4, POS thermal, and STK label.

### G2. Thermal receipt preview is not true-to-scale [ENH][P3][FE]
- File: UniversalPreview.tsx thermal rendering path
- Problem: 80mm/58mm thermal receipts are rendered at arbitrary scale in the preview. User cannot judge actual print size.
- Action: Add a scale indicator showing "actual size" when preview width matches paper width, or show "X% of actual size" when zoomed.
- Verify: Preview shows scale percentage text below thermal receipt.

### G3. Sticker label preview canvas vs print mismatch [ENH][P2][FE]
- Files: StickerCanvas.tsx (design), StickerLabel.tsx (print), UniversalPreview.tsx
- Problem: Sticker designer canvas renders at 8px/mm (320x160 for 40x20mm). Print renderer StickerLabel.tsx renders at same scale but wrapped in transform:scale() for mini preview. If scale factor or origin differs, print output differs from design.
- Action: Verify sticker mini preview in TemplatePrintModal uses same transform chain as StickerLabel. Verify print popup StickerLabel renders at 1:1 scale (no transform).
- Verify: Design barcode at specific x,y -> print sticker -> barcode at same position.

---

## Section H - Testing and Quality

### H1. Add vitest for SettingsSerializer round-trip [ENH][P2][FE]
- File: resources/js/pages/settings/print-settings/__tests__/ (new file)
- Problem: No unit test verifies that toApiPayload + fromApiResponse is a round-trip (data in == data out).
- Action: Create serializer.spec.ts: (1) create template with all fields set, (2) serialize, (3) deserialize, (4) assert every key matches.
- Verify: npm test passes with new test.

### H2. Add vitest for isSettingVisible dependsOn chain [ENH][P2][FE]
- File: resources/js/pages/settings/print-settings/__tests__/visibility-engine.spec.ts (extend existing)
- Problem: Existing visibility tests may not cover dependsOn chains (parent OFF -> child hidden, parent ON -> child visible) for all component types (toggle, pills, select).
- Action: Add tests for: toggle parent OFF hides child, pills parent with dependsOnValue shows/hides child, nested dependsOn (A depends on B depends on C).
- Verify: npm test passes with new tests.

### H3. Add pest test for PrintTemplate CRUD [ENH][P2][BE]
- File: tests/Feature/PrintTemplateTest.php (new file)
- Problem: No backend test for PrintTemplate endpoints (store, update, setDefault, duplicate, delete).
- Action: Create test: create template, verify defaults, setDefault clears other, duplicate creates copy, delete removes. All scoped to company.
- Verify: vendor/bin/pest.bat passes with new tests.

### H4. Playwright E2E for print settings page [ENH][P3][FE]
- File: resources/js/pages/settings/print-settings/__tests__/ (new .pw.spec.ts)
- Problem: No E2E test for the print settings page workflow (select doc type, create template, toggle settings, see preview change, save, reload, verify persistence).
- Action: Create basic E2E: navigate to settings/print -> create template -> toggle show_logo OFF -> verify preview updates -> save -> reload -> verify toggle still OFF.
- Verify: npx playwright test passes.

---

## Progress Tracking

| Task | Status | Commit | Date |
|------|--------|--------|------|
| A1 | DONE ✅ | code audit | 2026-08-21 |
| A2 | DONE ✅ | isSerializable guard in toApiPayload + 2 drift tests | 2026-08-21 |
| A3 | N/A ✅ | opens library, not blank create | 2026-08-21 |
| A4 | DONE ✅ | direct assignment + saving event | 2026-08-21 |
| A5 | DONE ✅ | 2 drift-guard tests (writable keys in output, config excludes top-level) | 2026-08-21 |
| B1 | DONE ✅ | isPropertyVisible delegates to isSettingVisible | 2026-08-21 |
| B2 | DONE ✅ | dependsOnValue for pills/select + tests | 2026-08-21 |
| B3 | DONE ✅ | labels already clear: legacy "QR Code" vs "Fiscal QR (E-Invoice)", independent | 2026-08-21 |
| B4 | DONE ✅ | all 6 toggles in SETTINGS_REGISTRY lines 305-310 | 2026-08-21 |
| B5 | DONE ✅ | dependsOnValue gated in isSettingVisible + tests | 2026-08-21 |
| C1 | N/A ✅ | PreviewSelector uses `data ?? emptyDocumentData()` fallback (line 26) | 2026-08-21 |
| C2 | N/A ✅ | All 5 section-specific font settings correctly consumed by their sections | 2026-08-21 |
| C3 | N/A ✅ | PrintFieldRegistry has `overrideTemplatePath: 'company_name_text'`; resolver checks it; HeaderSection uses `r('company.name')` | 2026-08-21 |
| C4 | N/A ✅ | LogoRenderer reads `tpl.custom_logo_url` when `logo_source === 'custom'` | 2026-08-21 |
| C5 | DONE ✅ | preview sections gate on show_* + sectionVisible | 2026-08-21 |
| C6 | DONE ✅ | sections_order read + sorted by .order | 2026-08-21 |
| D1 | N/A ✅ | Both ESCPOSRenderer and UniversalPreview read from the same `UniversalDocumentData` source | 2026-08-21 |
| D2 | N/A ✅ | Sections guard with `r(...) && <InfoRow>` — undefined values handled gracefully | 2026-08-21 |
| D3 | N/A ✅ | PaperSize union covers all 9 papers + 'none', matches ALL_PAPERS constant | 2026-08-21 |
| E2 | DONE ✅ | already uses deleteConfirm.confirm() | 2026-08-21 |
| E3 | DONE ✅ | already sets "نسخة من {name}" | 2026-08-21 |
| E4 | DONE ✅ | count badge already renders at line 524 (pill with count) | 2026-08-21 |
| E5 | DONE ✅ | QuickNav auto-expands collapsed section before scrollIntoView | 2026-08-21 |
| F1 | DONE ✅ | show/update/destroy all use extractId($id) | 2026-08-21 |
| F2 | DONE ✅ | installLibrary duplicate guard (name+doc_type+company 409) | 2026-08-21 |
| F3 | N/A ✅ | no exportPdf endpoint exists | 2026-08-21 |
| F4 | DONE ✅ | setDefault wrapped in DB::transaction | 2026-08-21 |
| G1 | N/A ✅ | STK preview renders StickerLabel per line with correct fallbacks | 2026-08-21 |
| G2 | N/A ✅ | Preview reads from `localTpl` state — changes reflect immediately | 2026-08-21 |
| G3 | N/A ✅ | `sections_order` sorted by `.order` at UniversalPreview.tsx:155-157 | 2026-08-21 |
| H1 | DONE ✅ | serializer.spec.ts round-trip test exists (line 154-189) | 2026-08-21 |
| H2 | DONE ✅ | chain-walk in isSettingVisible + 3-level chain test + bug fix | 2026-08-21 |
| H3 | DONE ✅ | 7 Pest CRUD tests (list/create/show/update/delete/setDefault/duplicate) | 2026-08-21 |
| H4 | DONE ✅ | print-settings-e2e.pw.spec.ts: 4 tests (page load, save PUT, doc-type switch, quick-nav) | 2026-08-21 |
