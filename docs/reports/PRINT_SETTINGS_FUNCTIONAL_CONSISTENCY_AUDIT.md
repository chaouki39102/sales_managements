# Print Settings — Phase 11 Functional Consistency Audit

## Audit 1: Registry Validation

**Status**: ✅ PASS (3 fixes applied)

| Check | Result |
|-------|--------|
| Total registry entries | 144 |
| Missing `defaultValue` | 0 |
| Missing `supportedDocs` | 0 |
| Missing `supportedPapers` | 0 |
| Invalid `category` | 0 |
| Invalid `component` | 0 |
| `key` mismatch with object key | 0 |
| `dependsOn` target found in registry | 26/26 |
| PrintTemplate fields not in registry | 3 (`template_version`, `created_at`, `updated_at` — metadata, intentional) |
| Registry entries not in PrintTemplate | 0 |

**Bug fixed**: `isSettingVisible()` at `SettingsRegistry.ts:247` did NOT check `dependsOn`. The `dependsOn` field existed in metadata but was never consumed by the visibility engine. Children of toggles (e.g., `company_name_text` when `show_company_name` is false) appeared in the UI regardless.

**Fix**: Added dependsOn check for toggle parents. When a setting has `dependsOn` pointing to a toggle-component parent, and that parent's value is falsy in the current template, the child is hidden. Applied to 25 toggle-dependent entries.

**Edge case**: `barcode_custom_text` depends on `barcode_content` (pills, not toggle). The fix skips non-toggle dependsOn. The section code handles this manually.

---

## Audit 2: Visibility Matrix

**Status**: ✅ PASS

The registry defines 4 document-type groups and 3 paper-type groups:

```
ALL_DOCS (12):       FV, BL, DEV, BCC, AA, FA, BR, AV, DDP, BT, POS, RPT
COMMERCIAL_DOCS (8): FV, BL, DEV, BCC, AA, FA, BR, AV
POS_DOCS (2):        POS, RPT
WAREHOUSE_DOCS (2):  DDP, BT
REPORT_DOC (1):      RPT

ALL_PAPERS (4):      80mm, 58mm, A4, A5
THERMAL (2):         80mm, 58mm
PAGE (2):            A4, A5
```

### Settings gated by doc type

| Group | Settings | Count |
|-------|----------|-------|
| COMMERCIAL_DOCS | `show_delivery_address`, `show_payment_term`, `show_fiscal_stamp`, `show_bank_details`, `bank_details_text` | 5 |
| POS_DOCS | `show_session` | 1 |
| REPORT_DOC | `show_report_header`, `report_header_text`, `show_report_footer`, `report_footer_text`, `show_charts`, `chart_type`, `chart_title`, `group_by`, `sort_by`, `sort_direction`, `show_report_period`, `show_report_cashier`, `show_report_summary_cards`, `show_report_payment_breakdown`, `show_report_top_products`, `report_col_widths`, `report_col_headers` | 17 |

### Settings gated by paper type

| Group | Settings | Count |
|-------|----------|-------|
| THERMAL | `paper_width_mm` | 1 |
| PAGE | `page_orientation`, `show_bank_details`, `bank_details_text` | 3 |

### No visibility bugs found
- `paper_width_mm` correctly restricted to thermal (80mm, 58mm)
- `page_orientation` correctly restricted to page (A4, A5)
- `chart_type` correctly restricted to RPT
- `show_session` correctly restricted to POS/RPT
- All COMMERCIAL settings correctly hidden for POS, DDP, BT, RPT

---

## Audit 3: Dependency Audit

**Status**: ✅ FIXED

Before fix: `isSettingVisible()` ignored `dependsOn`. Children of disabled toggles appeared in UI.

After fix: 25 toggle-dependent settings are auto-hidden when parent toggle is off.

| Parent | Children Gated |
|--------|---------------|
| `show_logo` | `logo_source`, `logo_size`, `logo_align`, `logo_border_radius`, `custom_logo_url` |
| `show_company_name` | `company_name_text`, `company_name_size`, `company_name_bold`, `company_name_align`, `company_name_color` |
| `show_col_header` | `table_header_bold`, `table_header_bg`, `table_header_color` |
| `alternating_rows` | `alternating_color` |
| `show_bank_details` | `bank_details_text` |
| `show_thank_you` | `thank_you_text`, `thank_you_size`, `thank_you_color` |
| `show_returns_policy` | `returns_policy_text` |
| `show_barcode` | `barcode_content` |
| `show_qr` | `qr_content` |
| `show_report_header` | `report_header_text` |
| `show_report_footer` | `report_footer_text` |
| `show_charts` | `chart_type`, `chart_title` |

**Not auto-gated** (dependsOn non-toggle parent): `barcode_custom_text` → `barcode_content`. Handled manually in FooterSection.

---

## Audit 4: Paper Compatibility

**Status**: ✅ PASS

All paper-specific gates are correct:
- `paper_width_mm` — only for THERMAL. ✓
- `page_orientation` — only for PAGE. ✓
- `bank_details_text` — only for PAGE + COMMERCIAL_DOCS. ✓

No thermal-only setting appears on page sizes.
No page-only setting appears on thermal sizes.

---

## Audit 5: Dead Settings Audit

**Status**: ✅ PASS (0 dead visual settings)

5 settings never read in preview: `id`, `name`, `doc_type_code`, `is_default`, `is_active`. These are metadata-only, NOT dead. They control template identity and API behavior.

139 settings are consumed by preview components. Zero coverage gaps.

---

## Audit 6: Duplicate Settings Audit

**Status**: ✅ FIXED

**Before**: `show_cashier` and `show_report_cashier` both had identical labels ("Show Cashier" / "إظهار الكاشير").

**Fix**: `show_report_cashier` now reads "Show Cashier in Report" / "إظهار الكاشير في التقرير".

No other duplicate labels found.

---

## Audit 7: Full Lifecycle — Empirical Verification Plan

For each of the 144 settings, verify 8 lifecycle stages. Below is the sampling strategy:

### Phase A: Critical 30 (test EVERY ONE)
The following settings have complex behavior and MUST be tested individually:

**Toggles with children** (10): `show_logo`, `show_company_name`, `show_col_header`, `alternating_rows`, `show_bank_details`, `show_thank_you`, `show_returns_policy`, `show_barcode`, `show_qr`, `show_charts`

**Paper-specific** (4): `paper_width_mm`, `page_orientation`, `paper_size` switch between 80mm/A4

**Doc-specific** (5): `show_session`, `show_fiscal_stamp`, `show_delivery_address`, `chart_type`, `show_report_cashier`

**Column manager** (5): `col_order`, `col_show`, `col_widths`, `col_headers`, `col_aligns`

**Save/load critical** (6): `name`, `paper_size`, `title_text`, `footer_legal_text`, `rules`, `is_default`

### Phase B: Representative 60 (test group behavior)
Test 1-2 settings from each category to verify category-level visibility.

### Phase C: Regression spot-check (test 20 random)
Random selection to catch edge cases.

### Test procedure for each setting
```
1. LOAD:      Open page → verify control value matches DB
2. CONTROL:   Change value → verify control reflects new value
3. PREVIEW:   Verify preview reflects the change immediately
4. SAVE:      Click Save → verify success notification
5. RELOAD:    Refresh page → verify value persisted
6. UNDO:      Change value → Ctrl+Z → verify previous value restored
7. EXPORT:    Export JSON → verify field present in file
8. IMPORT:    Import JSON → verify field restored correctly
```

---

## Audit 8: State Synchronization Map

### Data flow
```
API Response
  │
  ▼
printTemplatesApi.fromApiResponse()
  ├── spread r.config into raw
  └── normalizeTemplate(raw, docType, paperSize)
        │
        ▼
SettingsSerializer.normalizeTemplate()
  ├── spread partial (user values take precedence)
  ├── fill missing from SETTINGS_REGISTRY (registry defaults)
  ├── set template_version = 2
  ├── set paper_width_mm from paper_size (thermal override)
  ├── ensure name, doc_type_code, paper_size non-empty
  │
  ▼
React Query cache (templates[])
  │
  ▼
PrintSettingsPage.useEffect() / onClick / handleImport
  │
  ▼
normalizeTemplate(tpl, activeDoc, tpl.paper_size) ← idempotent safety net
  │
  ▼
localTpl (useState)
  │
  ├──► update(key, val) → pushHistory → setLocalTpl({...prev, [key]: val})
  │
  ├──► TemplateControls
  │     └── isSettingVisible(key, docType, paperSize, tpl) ← now checks dependsOn
  │           └── Section renders control
  │               └── control onChange → update(key, val)
  │
  └──► PreviewSelector
        └── UniversalPreview reads tpl.* directly
              └── preview renders using values

Save:
  localTpl
    │
    ▼
  mutations.update.mutateAsync({ id, data: localTpl })
    │
    ▼
  printTemplatesApi.toApiPayload(localTpl)
    ├── strips: id, name, doc_type_code, paper_size,
    │           is_default, is_active, template_version,
    │           created_at, updated_at
    └── nests rest as config: { show_logo, ... }
          │
          ▼
        API → Controller → Model → DB
```

### Known safe checkpoints

| Checkpoint | What it ensures |
|-----------|----------------|
| `normalizeTemplate` at API layer | Every API response fills missing defaults |
| `normalizeTemplate` at page useEffect | Safety net for React Query cache misses |
| `normalizeTemplate` at template select | Safety net for template switch |
| `normalizeTemplate` at import | Imported JSON gets defaults |
| `isSettingVisible(tpl)` after fix | depdensOn gates work |
| `toApiPayload` strips top-level fields | Config nesting correct |
| `fromApiResponse` spreads config | Config unnesting correct |

### Potential failure points

1. **Race condition**: `useEffect` depends on `templates` and `activeDoc`. If `activeDoc` changes before `templates` for new doc type loads, `normalizeTemplate` might use stale doc type. Guard: `activeDoc` in dependency array.

2. **React Query stale cache**: If `templatesRaw` from cache is stale, `normalizeTemplate` fills defaults that might differ from DB. Guard: `staleTime: 5 min` for templates.

3. **`paper_width_mm` override in `update`**: `PrintSettingsPage.tsx:178-181` also overrides `paper_width_mm` when `update('paper_size', val)` is called. This is redundant with `normalizeTemplate` but ensures instant response. Could be removed.

---

## Summary of Changes in This Phase

| Change | Location | Impact |
|--------|----------|--------|
| `isSettingVisible` now checks `dependsOn` for toggle parents | `SettingsRegistry.ts:247` | Hides 25 dependent settings when parent toggle is OFF |
| Pass `tpl` to `isSettingVisible` in all 7 sections | `HeaderSection.tsx` through `FormattingSection.tsx`, plus `TemplateControls.tsx` | Enables dependsOn check |
| Pass `tpl` through `isPropertyVisible` facade | `PropertyVisibilityService.ts` | Consistent API |
| Fixed duplicate labels | `SettingsRegistry.ts` — `show_report_cashier` | Differentiated from `show_cashier` |
| State sync documentation | This report | Full trace of API→DB→UI flow |

### Files changed in this phase

| File | Change |
|------|--------|
| `services/SettingsRegistry.ts` | `isSettingVisible` now accepts `tpl` param, checks `dependsOn` for toggle parents; fixed duplicate label |
| `services/PropertyVisibilityService.ts` | `isPropertyVisible` passes through `tpl` |
| `sections/HeaderSection.tsx` | Passes `tpl` to `sec()` |
| `sections/DocumentSection.tsx` | Passes `tpl` to `sec()` |
| `sections/ItemsSection.tsx` | Passes `tpl` to `sec()` |
| `sections/TotalsSection.tsx` | Passes `tpl` to `sec()` |
| `sections/PaymentsSection.tsx` | Passes `tpl` to `sec()` |
| `sections/FooterSection.tsx` | Passes `tpl` to `sec()` |
| `sections/FormattingSection.tsx` | Passes `tpl` to `sec()` |
| `components/TemplateControls.tsx` | Passes `tpl` to `sec()` |

### Build status
`npm run build` — **0 errors**, 1,031 modules
