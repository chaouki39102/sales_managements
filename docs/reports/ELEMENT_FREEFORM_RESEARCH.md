# ELEMENT_FREEFORM_RESEARCH — Element-level freeform designer (A4)

Living research notes. Read THIS first before re-reading any source file.
Append new confirmed facts as you learn them.

## Objective (locked)
True WYSIWYG drag-and-drop on the live preview for fine-grained elements across
all template types. TO-DO ORDER (ship each fully before starting the next):
1. `header.logo` only (ElementPosition + elementPositions + Pos.tsx + minimal designer) — DONE phase
2. Rest of header (title, company info, columns)
3. Doc-info, items, totals, payments, footer (one section per commit)
4. RPT report split (separate phase)
5. STK / thermal (last)

Design == print by construction: both the designer and the runtime render the
SAME `UniversalPreview` tree; the freeform wrapper (`Pos`) lives inside the
shared section renderers.

## Confirmed facts

### domain.ts (`resources/js/pages/settings/print-settings/types/domain.ts`, 485 lines)
- `sections_order?: SectionMeta[]` ~L349, `positions?: Partial<Record<SectionTarget, SectionPosition>>` ~L350, `totals_grid?: TotalsGridConfig` ~L351.
- `label_positions: Record<string, StickerElementGeometry>` ~L440 (STK block).
- `PrintTemplate` interface ends ~L460.
- `SectionTarget` ~L462; `SectionMeta` L464-473 (`key: SectionTarget; visible: boolean; order: number`).
- `SectionPosition` L477-481 = `{ x: number; y: number; width: number }` —
  **x = % from the RIGHT edge (RTL), y = % from the top, width = % of content width**. No rotate.
- `TotalsGridConfig` L514-521 (`columns` + `summaryRows`).
- MUST add `ElementKey` + `ElementPosition` (same shape as SectionPosition) BEFORE `PrintTemplate`, and `element_positions?: Partial<Record<ElementKey, ElementPosition>>` on the interface.

### layoutMigration.ts (services/, 226 lines)
- `ensureLayoutFields(tpl: PrintTemplate): PrintTemplate` at L210-226 — single entry point called from `SettingsSerializer.fromApiResponse()`. Builds `result = {...tpl, totals_rows, footer_rows, header_layout, doc_info_rows, customer_info_rows, company_info_rows, sections_order, col_styles, page_frame, totals_grid, watermark}` each with `?? default` fallback.
- ADD `element_positions: tpl.element_positions ?? {}` here.
- `buildDefaultSectionsOrder()` L198-207 (6 sections header→footer).
- `buildDefaultTotalsRows`/`buildDefaultFooterRows`/`buildDefaultHeaderLayout`/`buildDefaultDocInfoRows`/`buildDefaultCustomerInfoRows`/`buildDefaultCompanyInfoRows` exist above.

### SettingsSerializer.ts (services/)
- `toApiPayload(tpl: Partial<PrintTemplate>)` L45; `fromApiResponse(r)` L76. Delegates normalizers; `ensureLayoutFields` is called from `fromApiResponse`. `positions`/`sections_order` are passed through via `...tpl` spread (not registry-whitelisted), so `element_positions` will survive without serializer changes.

### HeaderSection.tsx (components/preview/, 235 lines)
- `renderPageHeader(tpl, data, paperWidth)` — A4 path: `gap = header_columns_gap ?? 30`, `clientCardW = client_card_width ?? 50`, `docInfoW = 100 - clientCardW - (gap>0?1:0)`.
- `logoAndTitle` fragment: `{tpl.show_logo && renderLogo(tpl, data)}` ~L139, then title `div` (`title_size + (isA4?4:2)`, `title_bold` 900/400, `title_color`, textAlign `tpl.title_align`, marginBottom isA4?12:8).
- `show_company_name` block L108-119 (align, company_name_size, bold→900, color, marginBottom 3, Tajawal); `renderCompanyInfo(tpl, data, true)` ~L120; `header_custom_text` ~L121-125; `Separator(header_separator)` ~L126.
- `header_layout` branch starts ~L156 (columns mode — HeaderColumns.tsx is a separate full-75-line component).
- WRAP the logo call with `<Pos dragKey="header.logo" tpl={tpl}>`.

### UniversalPreview.tsx (183 lines)
- Paper size math ~L88-100: `paperWidth` = thermal `paper_width_mm*3.78`, A4 794/1123, stickers via `stickerDims`.
- `.ps-preview-wrapper` ~L114-128: RTL, fontFamily, fontSize, lineHeight, padding from margins, **`position: relative`** — the containing block for `Pos` absolute boxes (percentages anchor to its padding box).
- Inside `PageFrame`: DeliveryReceiptA5 special-case; StickerLabel loop (STK); `FreeformSections` when `isFreeformTpl`; else ordered `SECTION_RENDERERS` + `renderReport`.
- Watermark absolute overlay after PageFrame.

### shared.tsx (481 lines) — full read
- `CompanyData` (commercialName, address, phone, mobile, fax, email, nif, rc, nis, article, capital, bankName, rib, activity, logoUrl).
- `DocRow`, `TotalRow`, `InfoRow`, `SectionWrap`, `boxBorderCss`, `cellStyleCss`, `formatFieldValue`.
- `renderLayoutRows(rows, tpl, options)` — `LayoutRowPair`/`LayoutRowLine`/`LayoutColumnCell`, `FieldStyleOverride`, `RenderLayoutRowsOptions.sectionAlign`.
- `COMPANY_FIELD_LABEL_SETTING`, `CUSTOMER_FIELD_LABEL_SETTING`.

### previewHelpers.ts (111 lines) — full read
- `SECTION_DIM_SETTINGS` (6 keys), `sectionWidthPct`, `sectionAlign`, `isFreeformTpl(tpl)` (A4 only, non-RPT/STK, positions present), `sectionPositionOf`.

### A4DesignerStage.tsx (352 lines) — section-level designer (the model to mirror)
- Constants: `DESIGN_W=900`, `DESIGN_H=1273`, `PAPER_W=793.8`, `MIN_WIDTH=8`, `ZOOM_MIN/MAX/STEP`, `SNAP_PCT=5`, `ALL_TARGETS`, `SECTION_LABELS`, `autoPos(tpl,key,index,visible.length)`.
- `getSavedPos` via `liveRef` key match else `sectionPositionOf ?? autoPos`.
- `commit()` builds next from saved + autoPos for visible non-live + live.pos → `onPositionsChangeRef.current(next)`; `commitRef` pattern.
- `startDrag`: pointer capture, guard `closest('button, a, input, select, textarea, .moveable-control-box')`, `dragRef {pointerId, active, startX/Y, key, startPos}`.
- `handlePointerMove`: `dx=(e.clientX-d.startX)/zoomRef.current` (dy likewise).
- Resize formulas: `wPct = max(MIN_WIDTH, min(100, (e.width/DESIGN_W)*100))`; `rightPx = e.drag.beforeTranslate[0] + e.width`; `xPct = 100-(rightPx/DESIGN_W)*100` clamp `[0, 100-wPct]`; `yPct = el.offsetTop/DESIGN_H*100`.
- Live state via refs; commit-on-end keeps undo history clean. Moveable controls stay in the flow wrapper; zoom via `transform: scale`.

### Pos wrapper design (decided — CORRECTED, supersedes any PositionedLayer plan)
- NO `PositionedLayer`, NO `ELEMENT_RENDERERS` registry needed.
- `Pos` renders children in-place: saved position → `position:absolute; top:y%; right:x%; width:width%; boxSizing:border-box`; else inline in flow (original style merged). ALWAYS emits `data-drag-key` (even unpositioned, so first-drag discovery works).
- Containing block = `.ps-preview-wrapper` (position:relative). Absolute = removed from flow (parent height div shrinks, no double space).
- Combined section-freeform + element positions = unsupported combo; the element designer forces flow mode by stripping `positions` from the tpl clone it renders.

### Element keys (planned, ~18-20 for A4)
`header.logo`, `header.title`, `header.company-name`, `header.company-info`, `header.custom-text`, `header.doc-info`, `header.columns`; `doc-info.client-card`, `doc-info.delivery-card`; `items.table`; `totals.block`; `payments.block`; footer: `footer.bank-details`, `footer.lines`, `footer.returns-policy`, `footer.thank-you`, `footer.legal`, `footer.barcode`, `footer.qr`, `footer.signatures`, `footer.stamp`.

### PrintSettingsPage.tsx (884 lines)
- `update(key, val)` generic → `setLocalTpl` + pushHistory + isDirty (L181-198); `handleSave` upsert `mutations.update.mutateAsync({id, data: localTpl})` (L200-212).
- `onPositionsChange={(pos) => update('positions', pos)}` L846 (A4DesignerStage mount).
- A4 Designer toggle button ~L747-769: gate `A4 && !sticker && doc_type !== 'RPT'`; toggles `designerActive`, disables `puckComposerActive`; labels «تصميم الحر»/«عرض المعاينة».
- Puck toggle ~L771-794 (gate adds `!isFreeformTpl(localTpl)`).
- Preview area swap ~L816-868: puckComposerActive → A4DesignerStage (designerActive) → else `PreviewSelector` inside ErrorBoundary + boxShadow wrapper.
- Toolbar styles via `toolBtnStyle`.

## Verification routine (before every commit)
`npx tsc --noEmit` clean · vitest green · `npm run build` 0 errors · SW MATCH
(root `public/sw.js` hash == `public/build/sw.js` hash). Pest if PHP touched.