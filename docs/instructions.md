# Adding a New Print Template — Full Pipeline Guide

## Overview

A new print template requires changes at 4 layers:

```
[1] DocType code  →  [2] DB seed  →  [3] API config  →  [4] Frontend type + defaults
```

The rendering is automatic — once a template is stored in the database, `PreviewSelector` loads it via `usePrintTemplates(docTypeCode)`, and `UniversalPreview` renders it using the 177 `PrintTemplate` properties. No new component is needed.

---

## Step 1 — Register the DocType Code

Two `DOC_TYPE_LIST` arrays must stay in sync — one in the reporting framework, one in the settings types.

### `resources/js/reporting/core/domain/PrintTemplate.ts` (lines 35-48)

```ts
export const DOC_TYPE_LIST = [
  // ... existing codes ...
  { code: 'BC', name: 'Bons de Caisse', category: 'sales' },  // ← add new
] as const;
```

### `resources/js/pages/settings/print-settings/types.ts` (lines 24-37)

```ts
export const DOC_TYPE_LIST = [
  // ... identical list in the same order ...
  { code: 'BC', name: 'Bons de Caisse', category: 'sales' },  // ← add new
] as const;
```

Both files must match exactly — `DocTypeCode` is derived from the array, so TypeScript will enforce the union.

---

## Step 2 — Database Migration

Create a new migration or seed file. The `print_templates` table has this schema:

```php
Schema::create('print_templates', function (Blueprint $table) {
    $table->id();
    $table->foreignId('company_id')->constrained()->cascadeOnDelete();
    $table->string('name');
    $table->string('doc_type_code', 10);      // ← your new code: 'BC'
    $table->string('paper_size', 10)->default('80mm');
    $table->boolean('is_default')->default(false);
    $table->boolean('is_active')->default(true);
    $table->longText('config')->nullable();    // ← JSON blob ~ 170 properties
    $table->timestamps();
    $table->index(['company_id', 'doc_type_code']);
});
```

The `config` column stores all `PrintTemplate` properties (everything except `id`, `name`, `doc_type_code`, `paper_size`, `is_default`, `is_active`). The frontend spreads it via `fromApiResponse()`:

```ts
// printTemplatesApi.ts:39-40
return {
    id, name, doc_type_code, paper_size, is_default, is_active,
    ...(r.config ?? {}),   // ← all 170 properties land here
} as PrintTemplate;
```

---

## Step 3 — Seed Default Templates

Create a seeder that inserts templates for each paper size for the new doc type:

```php
use App\Models\PrintTemplate;

function seedTemplate($companyId, $code, $name, $paperSize, $config) {
    PrintTemplate::create([
        'company_id'    => $companyId,
        'name'          => $name,
        'doc_type_code' => $code,
        'paper_size'    => $paperSize,
        'is_default'    => true,
        'is_active'     => true,
        'config'        => $config,
    ]);
}

// Default config for 'BC' templates
$bcDefaults = [
    'paper_width_mm'        => 80,
    'margin_top'            => 3,
    'margin_bottom'         => 3,
    'margin_sides'          => 3,
    'base_font_size'        => 10,
    'font_family'           => 'tajawal',
    'show_logo'             => true,
    'show_company_name'     => true,
    'title_text'            => 'Bons de Caisse',
    'show_doc_number'       => true,
    'show_date'             => true,
    'show_time'             => false,
    'show_cashier'          => true,
    'show_client'           => true,
    'col_order'             => ['name', 'quantity', 'price', 'total'],
    'col_show'              => ['name' => true, 'quantity' => true, 'price' => true, 'total' => true],
    'col_widths'            => ['name' => 40, 'quantity' => 15, 'price' => 22, 'total' => 23],
    'col_headers'           => ['name' => 'البيان', 'quantity' => 'الكمية', 'price' => 'السعر', 'total' => 'الإجمالي'],
    'show_total_ht'         => true,
    'show_total_tva'        => true,
    'show_total_ttc'        => true,
    'total_border_style'    => 'double',
    'show_paid_amount'      => true,
    'show_change'           => true,
    'show_thank_you'        => true,
    'thank_you_text'        => 'شكراً لزيارتكم!',
    'show_barcode'          => true,
    'barcode_content'       => 'doc-number',
    'show_header_section'   => true,
    'show_doc_info_section' => true,
    'show_items_section'    => true,
    'show_totals_section'   => true,
    'show_footer_section'   => true,
    'rules'                 => [],
    // ... all other PrintTemplate properties with sensible defaults
];
```

**Important**: Every property from the `PrintTemplate` type must be present in the `config` JSON. Missing properties will be `undefined` on the frontend and may cause rendering issues. Use `createDefaultTemplate('BC', '80mm')` as reference — it returns the complete 177-property object.

---

## Step 4 — Frontend Default Template Factory

The `createDefaultTemplate()` function in `PrintTemplate.ts` (line 262) sets defaults per `docTypeCode`. Update it if your new type needs unique defaults:

```ts
export function createDefaultTemplate(
  docTypeCode: DocTypeCode = 'POS',
  paperSize:   PaperSize   = '80mm',
  name = 'القالب الافتراضي',
): PrintTemplate {
  return {
    // ...
    title_text: docTypeCode === 'POS' ? 'إيصال بيع'
              : docTypeCode === 'BC'  ? 'Bons de Caisse'
              :                         'فاتورة بيع',
    // ...
  };
}
```

The UI in `PrintSettingsPage` calls `createDefaultTemplate()` when creating a new template, so all defaults are applied client-side before the first save.

---

## Step 5 — API Payload Mapping

The `PrintTemplateController` accepts a flat payload with a `config` array. The frontend `toApiPayload()` function splits fields:

```ts
function toApiPayload(tpl: Partial<PrintTemplate>): Record<string, unknown> {
  const {
    id, name, doc_type_code, paper_size, is_default, is_active,
    created_at, updated_at,
    ...config                              // ← everything else goes into config
  } = tpl as PrintTemplate;
  return { name, doc_type_code, paper_size, is_default, is_active, config };
}
```

The API route (in `routes/api.php`) should follow the existing pattern:

```php
Route::apiResource('print-templates', PrintTemplateController::class);
```

## Step 6 — Document Data Builder (Rendering)

When rendering, the document data must be mapped into `UniversalDocumentData`. If the new document type has unique API response fields:

### Extend the source interface in `DocumentDataBuilder.ts`:

```ts
interface ApiDocument {
  // ... existing fields ...
  // No changes needed if the API already returns standard fields
}
```

### If custom mapping is needed, add a new builder method:

```ts
static fromApiDocument(
  doc:     ApiDocument,
  company: CompanyInfo,
): UniversalDocumentData {
  return {
    doc: {
      number:   doc.document_number ?? '',
      date:     doc.document_date   ?? '',
      dueDate:  doc.due_date        ?? null,
      time:     null,
      typeCode: doc.document_type?.code ?? '',
      typeName: doc.document_type?.name ?? '',
      status:   doc.document_status?.code ?? 'validated',
    },
    company,
    party:     buildPartyFromApi(doc.party),
    lines:     buildLinesFromApi(doc.lines ?? []),
    totals:    buildTotalsFromApi(doc, lines),
    payments:  buildPaymentsFromApi(doc.payments ?? []),
    balance:   { previous: 0, current: 0 },
    currency:  null,
    warehouse: null,
    session:   null,
    taxBreakdown: [],
    computed:     {},
    report:       null,
  };
}
```

---

## Step 7 — Rules Engine (Optional Default Rules)

Seed default rules for the new doc type in the `config.rules` array:

```json
{
  "rules": [
    {
      "id": "hide-client-info-bc",
      "condition": "docTypeCode === 'BC'",
      "action": "show",
      "target": "client-section",
      "priority": 10
    }
  ]
}
```

Rules are evaluated by `RulesEngine.evaluate()` in `UniversalPreview`. The `sectionVisible()` and `sectionHighlight()` functions consume the result.

---

## Summary Checklist

| Step | File(s) | Action |
|---|---|---|
| 1 | `PrintTemplate.ts:35-48`, `types.ts:24-37` | Add code to `DOC_TYPE_LIST` |
| 2 | `database/migrations/` | Migration already exists; no changes needed |
| 3 | `database/seeders/` | New seeder inserting rows with full 177-prop config |
| 4 | `PrintTemplate.ts:262-426` | Update `createDefaultTemplate()` if unique defaults needed |
| 5 | `PrintTemplateController.php`, `printTemplatesApi.ts` | No changes — generic CRUD already works |
| 6 | `DocumentDataBuilder.ts` | Add builder method if API shape differs |
| 7 | Any seeder | Seed `config.rules` with default visibility rules |
| 8 | **Build** | Run `npm run build` — TypeScript enforces `DocTypeCode` union |
