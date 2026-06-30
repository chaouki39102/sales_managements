# Print Settings — Complete End-to-End State Flow

> **Module**: `resources/js/pages/settings/print-settings/`  
> **Backend**: `app/Models/PrintTemplate.php`, `app/Http/Controllers/Api/V1/PrintTemplateController.php`  
> **Database**: `print_templates` table, `config` JSON column  
> **Date**: 2026-06-29

---

## Mermaid Diagram

```mermaid
flowchart TD
    DB[("MySQL<br/>print_templates<br/>config JSON")]

    subgraph Backend [Laravel Backend]
        M[PrintTemplate Model<br/>casts, accessor, boot()]
        C[PrintTemplateController<br/>CRUD + library]
        R[Routes api.php<br/>10 endpoints]
        TLS[TemplateLibraryService<br/>3 built-in templates]
    end

    subgraph Network [API Layer]
        API["JSON Response<br/>{ id, name, ..., config: {} }"]
    end

    subgraph Frontend [React SPA]
        subgraph DI [Dependency Injection]
            AC[ApiClient<br/>abstract HTTP]
            CTX[PrintSettingsContext<br/>HostDependencies]
        end

        subgraph RQ [React Query]
            QH["usePrintTemplates()<br/>staleTime: 5min"]
            QM["usePrintTemplateMutations()<br/>auto-invalidate"]
        end

        subgraph State [Page State]
            INIT["useEffect → merge API + defaults"]
            LST["localTpl: PrintTemplate<br/>(useState)"]
            HIST["historyRef<br/>undo/redo stack"]
        end

        subgraph UI [Editor]
            TC["TemplateControls<br/>visibility-gated sections"]
            SEC["HeaderSection, ItemsSection,<br/>TotalsSection, ..."]
            SR[SettingsRegistry<br/>~120 setting metas]
            PV[PropertyVisibilityService<br/>filter by doc + paper]
        end

        subgraph Preview [Preview]
            PS["PreviewSelector<br/>data conversion boundary"]
            UP["UniversalPreview<br/>thermal / A4 / A5"]
        end

        subgraph Serializer [Serialization]
            TAP["toApiPayload()<br/>splits top-level + config"]
            FAR["fromApiResponse()<br/>flattens config onto object"]
            MTD["mergeTemplateWithDefaults()<br/>fills missing keys"]
        end
    end

    DB -->|"SELECT *"| M
    M -->|"json_decode(config)"| C
    TLS -->|"getFlatPayload()"| C
    C -->|"JSON"| R
    R -->|"HTTP 200"| API

    API -->|"GET /print-templates"| AC
    AC -->|"response.data"| QH
    QH -->|"templates[]"| INIT
    INIT -->|"merged = {...defaults, ...api}"| LST

    LST -->|"tpl prop"| TC
    TC -->|"isPropertyVisible()"| SR
    SR -->|"supportedDocs + supportedPapers"| PV
    TC -->|"update(key, val)"| LST

    LST -->|"tpl prop"| PS
    PS -->|"UniversalDocumentData"| UP

    LST -->|"handleSave"| TAP
    TAP -->|"{ name, ..., config }"| QM
    QM -->|"PUT /print-templates/{id}"| AC
    AC --> C
    C -->|"$template->save()"| M
    M -->|"INSERT/UPDATE"| DB

    DB -->|"refetch"| QH
    QH -->|"fresh data"| FAR
    FAR -->|"spread config"| MTD
    MTD -->|"merged"| LST
```

---

## Step-by-Step Flow

### 1. Database — MySQL `print_templates` Table

**Schema** (`database/migrations/2026_06_27_003909_create_print_templates_table.php`):

| Column         | Type                     | Notes                            |
|----------------|--------------------------|----------------------------------|
| `id`           | bigint (PK)              | auto-increment                   |
| `company_id`   | bigint (FK → companies)  | cascading delete                 |
| `name`         | varchar(255)             | user-visible template name       |
| `doc_type_code`| varchar(10)              | e.g. `FV`, `POS`, `BL`           |
| `paper_size`   | varchar(10)              | `80mm`, `58mm`, `A4`, `A5`       |
| `is_default`   | boolean                  | single default per doc_type_code  |
| `is_active`    | boolean                  | toggle enable/disable             |
| `config`       | longText (JSON)          | **ALL** template properties      |
| `created_at`   | timestamp                | Eloquent managed                 |
| `updated_at`   | timestamp                | Eloquent managed                 |

**Data format**: `config` stores all ~120 PrintTemplate properties (margins, colors, toggles, column configs, rules) as a flat JSON object. The structural columns (`name`, `doc_type_code`, `paper_size`, `is_default`, `is_active`) are indexed for filtering; everything else lives in `config`.

**Failure points**:
- JSON syntax corruption in `config` → `json_decode` returns `null` → model accessor falls back to `[]` → all settings reset to defaults silently
- `company_id` FK constraint violation if company is deleted before templates

---

### 2. Laravel Model — `PrintTemplate.php`

**File**: `app/Models/PrintTemplate.php:1-58`

**Key behaviors**:

| Mechanism | Code | Effect |
|-----------|------|--------|
| `$casts` | `'config' => 'array'` | Laravel auto-encodes/decodes JSON on read/write |
| `$casts` | `'is_default' => 'boolean'`, `'is_active' => 'boolean'` | Ensures proper boolean types |
| `$fillable` | 7 fields (company_id, name, doc_type_code, paper_size, is_default, is_active, config) | Mass-assignment protection |
| **Custom accessor** | `getConfigAttribute(?string $value): array` | `json_decode($value ?? '{}', true)` → falls back to `[]` if invalid |
| **Boot saving** | Ensures only one `is_default = true` per `doc_type_code` | Auto-unflags others on save |

**Transformation**: On read, the `config` longText is `json_decode`'d → array. On write, array is `json_encode`'d → string. All other columns map 1:1.

**Failure points**:
- Custom accessor conflicts with the Eloquent `array` cast — both are active. The accessor's `json_decode` runs **after** the cast (Laravel runs accessors last). Since the cast already converts the value to array, the accessor receives `?string $value` but actually gets an array, so `$value ?? '{}'` never triggers the fallback for valid data.
- Boot handler's `where('id', '!=', $model->id)` silently skips new models with `null` id — safe but worth noting.

---

### 3. Controller — `PrintTemplateController.php`

**File**: `app/Http/Controllers/Api/V1/PrintTemplateController.php:1-213`

**Endpoints**:

| Method | Route | Purpose |
|--------|-------|---------|
| `index` | `GET /print-templates` | List templates, optional `?doc_type_code=` filter |
| `show` | `GET /print-templates/{id}` | Single template |
| `store` | `POST /print-templates` | Create — validates `name`, `doc_type_code`, `paper_size` |
| `update` | `PUT /print-templates/{id}` | Partial update via `$template->fill($data)` |
| `destroy` | `DELETE /print-templates/{id}` | Soft/hard delete |
| `setDefault` | `POST /print-templates/{id}/set-default` | Sets `is_default = true` (uses boot handler) |
| `duplicate` | `POST /print-templates/{id}/duplicate` | `replicate()` with new name, `is_default = false` |
| `uploadLogo` | `POST /print-templates/upload-logo` | Image upload to `storage/app/public/print-logos/` |
| `library` | `GET /print-templates/library` | `TemplateLibraryService::getMetadata()` |
| `installLibrary` | `POST /print-templates/library/install` | `getFlatPayload(templateId)` → `PrintTemplate::create()` |

**Validation**:
- `config` is validated as `nullable|array` — the structure itself is **not** validated (no nested rules). Any valid JSON array is accepted.
- `doc_type_code` is validated as `required|string|max:10` — no check against the 12 known doc types.

**Failure points**:
- `config` validation is shallow: any array passes. A payload with missing properties will create a template with null values for those properties on the PHP side, but the Eloquent `array` cast will store whatever was sent. Defaults are applied only on the frontend.
- `update` accepts `config: null` and will store `null` in the DB (overwriting existing config) since `$fillable` allows it.

---

### 4. API — Routes and JSON Response

**File**: `routes/api.php:579-590`

```
Route::group(['prefix' => '{company}/api/v1', 'middleware' => ['auth:sanctum']], function () {
    // ... (lines 579-590)
});
```

**JSON response format** (via `BaseApiController::successResponse()`):

```json
{
  "data": {
    "id": 1,
    "name": "قالب POS افتراضي",
    "doc_type_code": "POS",
    "paper_size": "80mm",
    "is_default": true,
    "is_active": true,
    "config": {
      "margin_top": 3,
      "show_logo": true,
      "title_text": "إيصال بيع",
      "...": "..."
    },
    "created_at": "2026-06-27T10:00:00Z",
    "updated_at": "2026-06-29T15:30:00Z"
  }
}
```

The `data` wrapper is applied by `successResponse()`. When listing, `data` is an array.

**Failure points**:
- If `config` is `null` in the DB, the response includes `"config": null` — the frontend `fromApiResponse()` handles this with `r.config ?? {}`.
- The `BaseApiController` response format must be consumed by the frontend's `api.get()` which extracts the inner data.

---

### 5. React Query — `usePrintTemplates` Hook

**File**: `api/printTemplatesApi.ts:97-170`

**Query key factory**:
```typescript
printTemplateKeys = {
  all:     (slug)              => [slug, 'print-templates'],
  list:    (slug, code?)       => [slug, 'print-templates', 'list', code],
  detail:  (slug, id)          => [slug, 'print-templates', id],
}
```

**`usePrintTemplates(docTypeCode?)`**:
- Calls `createPrintTemplatesApi(apiClient).list(docTypeCode)`
- `staleTime: 5 * 60_000` (5 minutes) — avoids re-fetching on every keystroke
- `placeholderData: keepPreviousData` — retains old data while fetching new doc type
- `enabled: !!slug` — query only fires when slug is available

**`usePrintTemplateMutations()`**:
- Creates `update`, `create`, `remove`, `setDefault`, `duplicate`, `installLibrary` mutations
- On success, `invalidateAll()` — calls `qc.invalidateQueries({ queryKey: [slug, 'print-templates'] })`
- This causes list re-fetch for the entire module
- `update` also calls `invalidateOne()` — optimistically sets the detail cache, then invalidates list

**Cache invalidation flow**:
```
mutationFn succeeds → onSuccess callback
  → invalidate queries matching [slug, 'print-templates']
  → usePrintTemplates() re-fetches from API
  → useEffect in PrintSettingsPage fires
  → localTpl updated
```

**Failure points**:
- `keepPreviousData` can cause stale data display after a mutation (solved by invalidation)
- `staleTime: 5min` means edits from other sessions won't appear until manual refetch or after 5 minutes
- `invalidateAll()` triggers re-fetch for **all** doc types, not just the active one (minor performance concern)

---

### 6. Context — PrintSettingsContext Provider

**File**: `providers/PrintSettingsContext.tsx:1-25`

**Interface**:
```typescript
interface HostDependencies {
  apiClient: ApiClient;
  notifier: Notifier;
  printTemplatesApi: PrintTemplatesApi;
  templateHooks: TemplateRepositoryHooks;
  company: CompanyData | null;
  slug: string | null;
}
```

**Consumers**:
- `useApiClient()` → `apiClient` — used for direct API calls (e.g., fetching preview documents)
- `useNotifier()` → `notifier` — toast/notification system (sonner-based)
- `usePrintTemplatesApi()` → `printTemplatesApi` — injected into React Query hooks
- `useCompany()` → `company` — company data for preview (name, address, NIF, logo)
- `useSlug()` → `slug` — company slug for query keys

**Where dependencies are injected**:  
The `PrintSettingsPage` is wrapped by a parent component that provides `PrintSettingsProvider` with all dependencies. This makes the module self-contained and testable.

**Failure points**:
- `useHost()` throws if `PrintSettingsProvider` is missing — strict enforcement is intentional
- `slug` can be `null` — all queries check `enabled: !!slug`

---

### 7. State — `PrintSettingsPage.tsx` `localTpl`

**File**: `PrintSettingsPage.tsx:68-142`

**Initialization** (`useEffect` on `templates + activeDoc`):

```typescript
useEffect(() => {
  if (templates.length > 0) {
    const tpl = templates.find(t => t.is_default) ?? templates[0];
    setSelectedTplId(tpl.id);
    const defaults = createDefaultTemplate(activeDoc, tpl.paper_size);
    // Merge: API values win, defaults fill gaps
    const merged: PrintTemplate = {} as PrintTemplate;
    for (const k of Object.keys(defaults)) {
      (merged as any)[k] = (tpl as any)[k] !== undefined
        ? (tpl as any)[k]
        : (defaults as any)[k];
    }
    merged.id = tpl.id;
    setLocalTpl(merged);
    setIsDirty(false);
  } else {
    setSelectedTplId(null);
    setLocalTpl(createDefaultTemplate(activeDoc)); // brand new
    setIsDirty(true);
  }
}, [templates, activeDoc]);
```

**Key characteristics**:
- `localTpl` is a **flat** `PrintTemplate` object with all ~120 properties at the top level (not nested under `config`)
- The `PrintTemplate` type (`types/domain.ts:29-193`) defines all ~120 properties explicitly
- `update(key, val)` (line 174) is a single setter: `setLocalTpl(prev => ({ ...prev, [key]: val }))`
- Undo/redo via `historyRef` — max 60 history entries, shallow clone on each push
- `paper_size` changes auto-set `paper_width_mm` (80mm → 80, 58mm → 58)

**Transformation from API response**:
```
API JSON (nested: { id, name, config: { ... } })
  → fromApiResponse() flattens: { id, name, ..., ...r.config }
  → mergeTemplateWithDefaults() fills missing keys
  → localTpl: flat PrintTemplate
```

**Failure points**:
- The merge loop iterates over `Object.keys(defaults)` — if a new property is added to `PrintTemplate` but not to `createDefaultTemplate()`, it won't be merged and will stay `undefined`
- Shallow clone in undo/redo: nested objects (e.g., `col_widths`, `rules`) are shared references, not deep copies — mutations through `update()` replace the whole key so this is safe, but direct mutation of nested properties would corrupt history

---

### 8. Editor Controls — Section Components & Visibility Gating

**Files**: `components/TemplateControls.tsx`, `sections/*.tsx`, `services/SettingsRegistry.ts`

**Architecture**:

```
PrintSettingsPage
  └── TemplateControls (renders section visibility toggles + accordion sections)
        ├── HeaderSectionControls      ← gated by show_header_section
        ├── DocumentSectionControls    ← gated by show_doc_info_section
        ├── ItemsSectionControls       ← gated by show_items_section
        ├── TotalsSectionControls      ← gated by show_totals_section
        ├── PaymentsSectionControls    ← gated by show_payments_section
        ├── FooterSectionControls      ← gated by show_footer_section
        ├── FormattingSectionControls  ← always shown
        ├── RulesSection               ← always shown
        └── Report inline controls     ← gated by doc_type_code === 'RPT'
```

**SettingsRegistry** (`services/SettingsRegistry.ts:46-222`):
- Defines ~120 `SettingMeta` entries with: `key`, `labelAr`, `category`, `component`, `defaultValue`, `supportedPapers`, `supportedDocs`, `dependsOn`, `options`
- Each setting is tagged with exactly which document types and paper sizes it applies to
- Example: `show_bank_details` → `supportedPapers: ['A4', 'A5']`, `supportedDocs: COMMERCIAL_DOCS`

**PropertyVisibilityService** (`services/PropertyVisibilityService.ts:1-46`):
- `isPropertyVisible(key, docType, paperSize)` → checks `supportedDocs.includes(docType) && supportedPapers.includes(paperSize)`
- `getFilteredMeta(docType, paperSize)` → returns all visible settings for current context

**Usage in TemplateControls**:
```typescript
const sec = (k: string) => isPropertyVisible(k, docType, paperSize);
// ...
{sec('show_header_section') && (
  <Section id="s-header" ...>
    <HeaderSectionControls tpl={tpl} update={update} company={company} />
  </Section>
)}
```

**Each section component** renders only the settings relevant to its category:
- `HeaderSectionControls`: logo toggles, size, alignment, company name, info fields (all gated by `dependsOn`)
- `ItemsSectionControls`: column order/visibility/widths via `ColumnManager`, font size, table styling
- `ItemsSectionControls` also implements **HTML5 Drag & Drop** for column reordering with visual drop indicators

**Depends-on gating** (on each field):
```typescript
// TemplateControls renders:
<Toggle value={tpl.show_logo} onChange={v => update('show_logo', v)} label="إظهار الشعار" />
{tpl.show_logo && (                           // ← conditional render
  <Slider value={tpl.logo_size} onChange={v => update('logo_size', v)} ... />
)}
```

**Consistency guarantee**: The `SettingsRegistry` is the **single source of truth** for:
1. What properties exist
2. What their defaults are
3. Which doc types / paper sizes they apply to
4. What UI component to render for each

If a property key is added to the `PrintTemplate` type but not to `SETTINGS_REGISTRY`, it will never appear in the UI. If added to the registry but not the type, TypeScript will flag it.

**Failure points**:
- `dependsOn` logic is **ad-hoc** (individual `&&` checks in JSX) — no centralized dependency resolution
- Section controls must manually check each `dependsOn` before rendering a field; a missed check means the field shows even when its dependency is off
- The `isPropertyVisible()` function checks doc/paper compatibility but does **not** check `dependsOn` — that's done ad-hoc in JSX

---

### 9. Preview — `PreviewSelector` → `UniversalPreview`

**Files**: `components/PreviewSelector.tsx`, `components/preview/UniversalPreview.tsx`

**Data flow**:

```
localTpl (flat PrintTemplate) ─┐
companyData (from context) ────┤
                                ├──→ PreviewSelector
liveData / overrideData ───────┘       │
                                       │ useMemo:
                                       │   overrideData? → return
                                       │   liveData?     → fromLegacy()
                                       │   else          → emptyDocumentData()
                                       ▼
                              UniversalPreview
                              { tpl, data, company }
```

**PreviewSelector** is the data conversion boundary:
- Accepts optional `overrideData` (real API document data) or `liveData` (legacy ReceiptLiveData)
- If neither provided, renders with `emptyDocumentData()` (mock data with placeholders)
- Always produces `UniversalDocumentData` — the canonical data contract

**UniversalPreview** handles all paper sizes via layout switching:
- Thermal (`80mm`, `58mm`): flexbox layout with CSS columns
- Page (`A4`, `A5`): HTML `<table>` layout with simulated page breaks
- Respects `show_*_section` booleans — conditionally renders header/document/items/totals/payments/footer sections
- Applies `table_header_color`, `alternating_color`, `total_ttc_color`, `totals_align` (fixed in Phase 10 restoration)
- Evaluates `RulesEngine` rules — show/hide/highlight/disable actions based on runtime conditions

**Failure points**:
- `emptyDocumentData()` returns static mock data — preview quality depends on mock data quality
- `fromLegacy()` adapter must keep pace with any changes to `ReceiptLiveData`
- Preview rendering is synchronous and can lag with complex templates (mitigated in Phase 10 by removing `useDeferredValue`)

---

### 10. Save — `toApiPayload` → API PUT → Database

**Flow**:

```
1. User clicks save
2. handleSave() (PrintSettingsPage.tsx:187-229)
   ├── if localTpl.id exists → update mutation
   │     └── toApiPayload(localTpl) → { name, doc_type_code, paper_size, is_default, is_active, config }
   │           └── config = everything EXCEPT top-level fields
   ├── if 404 (deleted by another session) → create mutation
   └── if no id → create mutation
3. Mutation success → invalidateAll() → re-fetch list
4. After API save → dbSaveTemplate() (POS legacy sync)
5. toast success/error via notifier
```

**`toApiPayload()`** transformation (dual implementations — same logic):

```typescript
// In SettingsSerializer.ts (service layer):
function toApiPayload(tpl: Partial<PrintTemplate>): TemplatePayload {
  const { id, name, doc_type_code, paper_size, is_default, is_active,
          created_at, updated_at, ...config } = tpl as PrintTemplate;
  return { name, doc_type_code, paper_size, is_default, is_active, config };
}
```

This destructures the **flat** `PrintTemplate` object back into the **nested** API format. The top-level columns go to their columns; everything else goes to `config`.

**Duplicate implementations**: `printTemplatesApi.ts:17-31` has an identical `toApiPayload()` function, and `services/SettingsSerializer.ts:13-27` has another. Both do the same thing. The API module's version is what actually runs during save.

**Database write**: Eloquent's `array` cast re-encodes `config` to JSON string → stored in `longText` column.

**POS legacy sync**: After the primary API save, `dbSaveTemplate()` writes to the POS store's print configuration. If this fails, the primary save is **not** rolled back — the user gets an error toast but the template is already saved.

**Failure points**:
- `toApiPayload` assumes all non-excluded properties belong in `config` — if a new top-level column is added to the DB schema but not excluded, it will end up in `config` instead
- `dbSaveTemplate()` failure does not abort the primary save — POS may use stale template data
- Race condition: rapid saves could cause stale `localTpl` to overwrite newer data (mitigated by `isSaving` guard)

---

### 11. Reload — API GET → `fromApiResponse` → React Query → Context → `localTpl`

**Flow**:

```
1. User clicks another template OR doc type changes
2. usePrintTemplates(activeDoc) triggers via dependency change
3. React Query checks staleTime → if > 5min, fetches from API
   └── api.get('/print-templates', { doc_type_code: activeDoc })
4. Controller::index() returns JSON
5. createPrintTemplatesApi().list() → .then(r => r.data.map(fromApiResponse))
6. fromApiResponse() converts nested → flat:
       const base = { id, name, doc_type_code, ... };
       const config = r.config ?? {};
       for (const key of Object.keys(config)) {
         base[key] = config[key];   // spread config onto flat object
       }
       return base;
7. React Query cache updated → templates array changes
8. useEffect([templates, activeDoc]) fires:
       const tpl = templates.find(t => t.is_default) ?? templates[0];
       const defaults = createDefaultTemplate(activeDoc, tpl.paper_size);
       const merged = {};
       for (const k of Object.keys(defaults)) {
         merged[k] = tpl[k] !== undefined ? tpl[k] : defaults[k];
       }
       setLocalTpl(merged);
9. localTpl change triggers re-render:
       → TemplateControls re-renders with new values
       → PreviewSelector re-renders preview
```

**`fromApiResponse()`** transformation (dual implementations):

```typescript
// In printTemplatesApi.ts:33-45:
function fromApiResponse(r: PrintTemplateApiResponse): PrintTemplate {
  return {
    id: r.id, name: r.name, doc_type_code: r.doc_type_code as DocTypeCode,
    paper_size: r.paper_size as PrintTemplate['paper_size'],
    is_default: r.is_default, is_active: r.is_active,
    ...(r.config ?? {}),   // ← wildcard spread
  } as PrintTemplate;
}
```

The **`...r.config`** spread is the critical transformation step — it converts the nested JSON config into a flat object that matches the `PrintTemplate` type. This reverse operation mirrors `toApiPayload()`.

**`mergeTemplateWithDefaults()`** (service layer):
```typescript
function mergeTemplateWithDefaults(saved, defaults): PrintTemplate {
  for (const k of Object.keys(defaults)) {
    merged[k] = saved[k] !== undefined ? saved[k] : defaults[k];
  }
}
```

This ensures that:
- If a property exists in the API response, it wins
- If a property is missing from the API (e.g., added by a newer version), the default fills in
- If a property is `null`/`undefined` in the API, the default fills in

**Failure points**:
- The wildcard spread `...r.config` bypasses type safety — if `config` contains properties that don't exist on `PrintTemplate`, they silently become part of the state object without TypeScript errors
- If `config` is missing a property, the `mergeTemplateWithDefaults()` ensures it gets a default — but the `fromApiResponse()` object first creates a partial object that gets overridden in the merge step
- `keepPreviousData` in `usePrintTemplates` means that after switching doc types, the user briefly sees templates from the **previous** doc type until the new data arrives

---

## SettingsRegistry Consistency Role

The `SettingsRegistry` (`services/SettingsRegistry.ts`) is the **central catalog** that constrains the entire system:

| Concern | How Registry Ensures Consistency |
|---------|-----------------------------------|
| **Property existence** | Every key in `SETTINGS_REGISTRY` must correspond to a `PrintTemplate` property (TypeScript enforced via `keyof PrintTemplate`) |
| **Default values** | Registry defines `defaultValue` per property — used by `createDefaultTemplate()` which drives `mergeTemplateWithDefaults()` |
| **Doc type filtering** | Each setting declares `supportedDocs: DocTypeCode[]` — `isPropertyVisible()` hides settings irrelevant to the current doc type |
| **Paper size filtering** | Each setting declares `supportedPapers: PaperSize[]` — column manager hides for thermal, bank details hide for 58mm |
| **UI component selection** | `component` field maps each property to its editor (`toggle`, `slider`, `color`, `select`, etc.) |
| **Dependency expression** | `dependsOn` links conditional fields to their parent toggle — though enforcement is JSX-level, the metadata exists for future centralized validation |
| **Options enum** | `options` constrains select/pills values — prevents invalid states (e.g., `align: 'left'` on a toggle-only field) |

**What the Registry does NOT do**:
- Validate that all `PrintTemplate` properties are registered (could add properties to `types/domain.ts` without adding them to the registry)
- Validate API payloads (no server-side registry exists)
- Enforce dependency chains automatically

---

## Summary of All Transformations

| Direction | Transformation | File | Lines |
|-----------|---------------|------|-------|
| DB → Model | `longText JSON` → `array` via Eloquent `array` cast + custom accessor | `PrintTemplate.php` | 25-39 |
| Model → JSON Response | Eloquent serialization (casts applied automatically) | `BaseApiController` | — |
| API JSON → React Query | `response.data` extracted by `apiClient` | `printTemplatesApi.ts` | 51-54 |
| Nest → Flat | `fromApiResponse()` spreads `config` onto root object | `printTemplatesApi.ts` | 33-45 |
| Missing defaults fill | `mergeTemplateWithDefaults()` fills gaps from `createDefaultTemplate()` | `SettingsSerializer.ts` | 57-67 |
| Flat → Nest | `toApiPayload()` destructures top-level fields from config | `printTemplatesApi.ts` / `SettingsSerializer.ts` | 17-31 / 13-27 |
| Legacy → Universal | `DocumentDataBuilder.fromLegacy()` / `fromApiDocument()` | `types/data/DocumentDataBuilder.ts` | — |
| Editor ↔ State | `update(key, val)` → `setLocalTpl({ ...prev, [key]: val })` | `PrintSettingsPage.tsx` | 174-185 |
| Visibility gate | `isPropertyVisible(key, docType, paperSize)` | `PropertyVisibilityService.ts` | 25-31 |
| Preivew render | `localTpl` (flat) → `PreviewSelector` → `UniversalPreview` | `components/PreviewSelector.tsx` | 14-22 |

## Key Files Reference

| File | Role |
|------|------|
| `app/Models/PrintTemplate.php` | Eloquent model — casts, accessor, boot hook |
| `app/Http/Controllers/Api/V1/PrintTemplateController.php` | 10 CRUD + library endpoints |
| `app/Services/TemplateLibraryService.php` | 3 built-in Algeria templates, `getFlatPayload()` |
| `routes/api.php:579-590` | Route definitions |
| `database/migrations/2026_06_27_003909_create_print_templates_table.php` | Table schema |
| `resources/js/pages/settings/print-settings/types/domain.ts` | Canonical `PrintTemplate` type (120+ properties) |
| `resources/js/pages/settings/print-settings/types/defaults.ts` | `createDefaultTemplate()` factory |
| `resources/js/pages/settings/print-settings/types/api.ts` | `PrintTemplateApiResponse` (nested type) |
| `resources/js/pages/settings/print-settings/services/SettingsRegistry.ts` | 120 setting metas, query helpers |
| `resources/js/pages/settings/print-settings/services/SettingsSerializer.ts` | `toApiPayload()`, `fromApiResponse()`, `mergeTemplateWithDefaults()` |
| `resources/js/pages/settings/print-settings/services/PropertyVisibilityService.ts` | Doc/paper gating predicates |
| `resources/js/pages/settings/print-settings/api/printTemplatesApi.ts` | `createPrintTemplatesApi()`, React Query hooks |
| `resources/js/pages/settings/print-settings/contracts/` | All interfaces (ApiClient, TemplateRepository, HostContext, Notifier) |
| `resources/js/pages/settings/print-settings/providers/PrintSettingsContext.tsx` | DI context for host dependencies |
| `resources/js/pages/settings/print-settings/PrintSettingsPage.tsx` | Main page — state, save, preview orchestration |
| `resources/js/pages/settings/print-settings/components/TemplateControls.tsx` | Section visibility + accordion layout |
| `resources/js/pages/settings/print-settings/sections/` | Individual section editors (Header, Items, Totals, etc.) |
| `resources/js/pages/settings/print-settings/components/PreviewSelector.tsx` | Data conversion boundary → UniversalPreview |
| `resources/js/pages/settings/print-settings/components/preview/UniversalPreview.tsx` | Universal renderer (thermal + page) |
