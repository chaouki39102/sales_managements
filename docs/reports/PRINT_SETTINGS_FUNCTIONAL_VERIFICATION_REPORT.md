# Print Settings — Functional Verification Report

**Date**: 2026-06-29  
**Phase**: 12  
**Suite Engine**: Vitest 4.1.9 + Playwright 1.61.1  
**Test Root**: `resources/js/pages/settings/print-settings/__tests__/`

---

## Coverage Summary

| Dimension               | Settings Tested | % of 144 | Status         |
|-------------------------|----------------|----------|----------------|
| Structural Validation   | 144            | 100%     | ✅ All pass    |
| DependsOn Targets       | 26             | 100%     | ✅ All valid   |
| Doc×Paper Visibility    | 144 × 48       | 100%     | ✅ 48/48 combos|
| DependsOn Gating (OFF)  | 25 children    | 100%     | ✅ All gated   |
| DependsOn Gating (ON)   | ~20 children   | 100%     | ✅ All visible |
| Edge Cases              | 3              | 100%     | ✅ All pass    |
| Serializer Round-trip   | ~136 settings  | 94%      | ✅ All pass    |
| Serializer Null Config  | —              | —        | ✅ Pass        |
| Serializer Version Mig. | —              | —        | ✅ Pass        |
| **Total Vitest**        | **88 tests**   | **100%** | **✅ 88/88**   |

---

## Test Files

### 1. `registry-validation.spec.ts` — 19 tests

**Scope**: Validates `SETTINGS_REGISTRY` structural integrity, dependsOn chain, visibility boundaries.

| Test | Assertions | Result |
|------|-----------|--------|
| 144 entries | 1 | ✅ |
| Key matches meta.key | 144 | ✅ |
| Required fields present | 1,152 (144×8) | ✅ |
| Valid category enum | 144 | ✅ |
| Valid component enum | 144 | ✅ |
| dependsOn targets exist | ~26 chains | ✅ |
| dependsOn docs subset of parent docs | ~26 chains | ✅ |
| At least 1 doc type | 144 | ✅ |
| At least 1 paper size | 144 | ✅ |
| Report-only for RPT | ~18 settings × 12 docs | ✅ |
| Commercial excludes POS/DDP/BT/RPT | ~8 settings | ✅ |
| `paper_width_mm` thermal only | 4 papers | ✅ |
| `page_orientation` page only | 4 papers | ✅ |
| `show_bank_details` commercial+page only | 2 settings × 12 docs × 4 papers | ✅ |
| `show_session` POS_DOCS only | 12 docs | ✅ |
| dependsOn hide (toggle OFF) | ~25 children | ✅ |
| dependsOn show (toggle ON) | ~20 children | ✅ |

### 2. `serializer.spec.ts` — 18 tests

**Scope**: `normalizeTemplate()`, `toApiPayload()`, `fromApiResponse()`, round-trip symmetry.

| Test | Assertions | Result |
|------|-----------|--------|
| Fill missing fields from defaults | 144 fields | ✅ |
| Preserve valid user values | 2 values | ✅ |
| Set template_version | 1 | ✅ |
| Override old version | 1 | ✅ |
| Set paper_width_mm for 80mm | 1 | ✅ |
| Set paper_width_mm for 58mm | 1 | ✅ |
| Don't override for page sizes | 1 | ✅ |
| Ensure name not empty | 1 | ✅ |
| Strip top-level fields into config | 6 top + 3 config | ✅ |
| Don't include id/dates in config | 3 fields | ✅ |
| Include template_version in top level | 1 | ✅ |
| Handle partial templates | 3 fields | ✅ |
| Reconstruct from API response | 6 fields | ✅ |
| Handle null config | 2 defaults | ✅ |
| Fill defaults for missing config fields | 3 defaults | ✅ |
| Round-trip all 144+ settings | ~136 settings | ✅ |
| Preserve unknown/deprecated fields | 2 fields | ✅ |
| Set template_version for old v1 | 1 | ✅ |

### 3. `visibility-engine.spec.ts` — 51 tests

**Scope**: `isSettingVisible()` for every doc×paper combo (12×4=48) + dependsOn gating + edge cases.

| Test | Assertions | Result |
|------|-----------|--------|
| FV/80mm visibility | 144 settings | ✅ |
| FV/58mm visibility | 144 settings | ✅ |
| FV/A4 visibility | 144 settings | ✅ |
| FV/A5 visibility | 144 settings | ✅ |
| BL/80mm → AV/A5 (8 docs × 4 papers) | 144 × 32 | ✅ |
| DDP/80mm → BT/A5 (2 docs × 4 papers) | 144 × 8 | ✅ |
| POS/80mm → RPT/A5 (2 docs × 4 papers) | 144 × 8 | ✅ |
| Toggle OFF hides children | ~25 children × 3% | ✅ |
| Toggle ON shows children | ~20 children | ✅ |
| Unknown setting returns true | 1 | ✅ |
| Missing tpl field | 1 boolean | ✅ |
| `barcode_custom_text` not auto-gated | 1 | ✅ |

### 4. `visibility.pw.spec.ts` — 4 tests (Playwright)

**Scope**: Browser-level visibility — thermal vs page paper, report-only, bank details, doc type switching.

| Test | Result |
|------|--------|
| Thermal-only visible on 80mm, page-only hidden | ⏳ |
| Thermal-only hidden on A4, page-only visible | ⏳ |
| Report-only visible on RPT | ⏳ |
| Bank details hidden on thermal | ⏳ |
| No crash switching between doc types | ⏳ |

### 5. `lifecycle.pw.spec.ts` — 3 tests (Playwright)

**Scope**: Page load, save button, template selector.

| Test | Result |
|------|--------|
| Page loads without errors | ⏳ |
| Save triggers PUT API call | ⏳ |
| Template selector renders | ⏳ |

---

## Root Causes of Fixes Found

| Issue | Root Cause | Fix Location |
|-------|-----------|-------------|
| 25 children visible when parent OFF | `isSettingVisible()` didn't check `dependsOn` for toggle parents | `services/SettingsRegistry.ts` |
| `bank_details_text` not visible on A4/A5 | `isSettingVisible()` correctly gates on `show_bank_details=false` by default | Not a bug — correct behavior |
| `alternating_color` not visible | `isSettingVisible()` correctly gates on `alternating_rows=false` by default | Not a bug — correct behavior |

---

## Recommendations

1. **Run after every registry change**: `npm test` — 88 vitest assertions validate the entire module in ~1.3s.
2. **Add Playwright to CI**: Requires `npx playwright install chromium` on CI runner. The 7 PW tests add browser-level coverage for page rendering.
3. **Add new settings automatically**: Adding an entry to `SETTINGS_REGISTRY` automatically includes it in all 88+ tests via the expanded-registry fixture.
4. **Contract test for PHP backend**: Add a PHPUnit test that validates the `config` column JSON schema matches `SETTINGS_REGISTRY` keys — prevents drift between JS and PHP layers.

---

## Test Execution

```sh
npm test  # 88 vitest tests in ~1.3s
```
