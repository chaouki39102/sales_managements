# Print Settings — Database Schema Review

**Date:** 2026-06-29  
**Table:** `print_templates`  
**Migration:** `database/migrations/2026_06_27_003909_create_print_templates_table.php`  
**Model:** `app\Models\PrintTemplate.php`

---

## 1. Current Schema

```sql
CREATE TABLE print_templates (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id    BIGINT UNSIGNED NOT NULL,
    name          VARCHAR(255) NOT NULL,
    doc_type_code VARCHAR(10) NOT NULL,
    paper_size    VARCHAR(10) NOT NULL DEFAULT '80mm',
    is_default    TINYINT(1) NOT NULL DEFAULT 0,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    config        LONGTEXT NULL,
    created_at    TIMESTAMP NULL,
    updated_at    TIMESTAMP NULL,

    INDEX idx_company_doc_type (company_id, doc_type_code),
    CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
```

**Indexes:**
- `PRIMARY` — `id`
- `idx_company_doc_type` — `(company_id, doc_type_code)` (covering the primary query pattern)

**Foreign keys:**
- `company_id` → `companies(id)` `ON DELETE CASCADE`

---

## 2. Strengths

### 2.1 Flexible JSON Storage (`config` column)
All 170+ `PrintTemplate` properties live in a single `LONGTEXT` JSON column. This avoids a migration per setting.

**Benefits:**
- Adding a new UI setting requires only frontend changes: add to `PrintTemplate`, `createDefaultTemplate()`, `SettingsRegistry`, and section file → zero database changes.
- The model's `$casts = ['config' => 'array']` and `getConfigAttribute` accessor handle serialization transparently.
- Old templates with missing keys are safe — the frontend merge logic (`mergeTemplateWithDefaults` pattern) fills in defaults.

### 2.2 Simple, Documented Columns
The 7 fixed columns (`name`, `doc_type_code`, `paper_size`, `is_default`, `is_active`, `company_id`, timestamps) cover all relational query needs. Every query pattern fits within 1-2 indexed columns.

### 2.3 Good Query Performance
- `company_id + doc_type_code` composite index covers all `list()` calls.
- `show($id)` uses primary key lookup.
- No full-table scans in production query paths.

---

## 3. Weaknesses

### 3.1 No Foreign Key Constraint on `doc_type_code`
The `doc_type_code` column stores document type codes (`'FV'`, `'BL'`, `'POS'`, etc.) as a plain string with no FK to a `document_types` reference table. If the frontend sends an invalid code, the database accepts it.

**Risk:** Low. The frontend constrains choices via `DOC_TYPE_LIST` and the controller validates `required|string|max:10`. But data integrity is not enforced at the DB level.

### 3.2 No Indexing on `config` Values
No JSON index on `config` keys (e.g., `paper_size` inside the JSON). If future queries need to filter by a config property (e.g., "all templates with `show_logo = true`"), a full table scan is required.

**Risk:** Currently none. All queries filter by the indexed `company_id + doc_type_code`.

### 3.3 `config` is Nullable
The migration uses `longText('config')->nullable()`. Although the model accessor defaults to `[]`:

```php
public function getConfigAttribute(?string $value): array
{
    return is_array(json_decode($value ?? '{}', true))
        ? json_decode($value ?? '{}', true) : [];
}
```

And the `$attributes` array sets a default:

```php
protected $attributes = ['config' => '{}'];
```

**Risk:** Low. The model layer handles null/missing correctly. But raw DB queries (`DB::raw('...')`) or direct `$table->config` access could return `null` without the accessor.

### 3.4 No `template_version` Tracking
There is no `version` or `schema_version` column. When the frontend `PrintTemplate` interface changes (properties added/removed), old stored configs in the database become inconsistent until the next save+merge cycle.

**Risk:** Low. The frontend merge logic compensates for missing keys (uses `createDefaultTemplate()` as fallback). But removed keys stay in the JSON forever as orphaned data.

### 3.5 No Seeder for Default Templates
No `PrintTemplateSeeder` exists in `database/seeders/`. Fresh installations have zero print templates until the user creates them through the UI or installs from the template library.

---

## 4. Recommendations

### 4.1 Make `config` NON NULL with `'{}'` Default (Migration)

```php
$table->longText('config')->default('{}');
```

**Why:** Removes the nullable ambiguity. The model already handles it, but the schema should reflect the actual business rule: "every template has a config, even if empty."

**Safety:** Backwards compatible. Existing `NULL` values will be coerced by the accessor; new rows will have `'{}'`.

---

### 4.2 Add `template_version` Column

```php
$table->string('template_version', 20)->default('1.0')->after('is_active');
```

**Why:** Enables future schema migrations:

```php
public function getConfigAttribute(?string $value): array
{
    $config = json_decode($value ?? '{}', true) ?? [];
    if ($this->template_version !== config('print.current_version')) {
        $config = $this->migrateConfig($config, $this->template_version);
        $this->template_version = config('print.current_version');
    }
    return $config;
}
```

**Safety:** Additive. Existing rows get `'1.0'` by default.

---

### 4.3 Create `database/seeders/PrintTemplateSeeder.php`

```php
class PrintTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $companies = Company::all();
        foreach ($companies as $company) {
            foreach (['FV', 'BL', 'POS'] as $code) {
                PrintTemplate::create([
                    'company_id'    => $company->id,
                    'name'          => "قالب {$code} افتراضي",
                    'doc_type_code' => $code,
                    'paper_size'    => $code === 'POS' ? '80mm' : 'A4',
                    'is_default'    => true,
                    'is_active'     => true,
                    'config'        => createDefaultTemplate($code),
                ]);
            }
        }
    }
}
```

**Why:** Fresh installs should have working templates out of the box.

---

### 4.4 Consider a `template_settings` Pivot Table for Report-Specific Settings

Currently, ALL 170+ settings (including report-specific fields like `show_charts`, `group_by`, `report_col_widths`) live in the same JSON blob. For the `RPT` doc type, consider:

```php
Schema::create('template_report_settings', function (Blueprint $table) {
    $table->foreignId('print_template_id')->constrained()->cascadeOnDelete();
    $table->string('group_by')->nullable();
    $table->string('sort_by')->nullable();
    $table->enum('sort_direction', ['asc', 'desc'])->default('asc');
    $table->boolean('show_charts')->default(true);
    $table->enum('chart_type', ['bar', 'pie'])->default('bar');
    // ... 15 more report fields
    $table->timestamps();
});
```

**Why:** Separates the report-specific concern from the print layout concern. Makes `RPT` templates cleaner and enables DB-level queries on report settings.

**Cost vs Benefit:** Marginal benefit for current usage (only RPT type uses report fields). Not recommended unless report templates grow to 50%+ of all templates.

---

### 4.5 Add a Check Constraint on `doc_type_code`

```php
$table->string('doc_type_code', 10);
// Add after migration using raw SQL:
DB::statement("ALTER TABLE print_templates ADD CONSTRAINT chk_doc_type_code CHECK (doc_type_code IN ('FV','BL','DEV','BCC','AA','FA','BR','AV','DDP','BT','POS','RPT'))");
```

**Why:** Prevents orphan/invalid doc type codes from reaching the database.

**Safety:** Backwards compatible if existing data is clean (manual verification recommended).

---

## 5. Migration Safety

| Migration | Backwards Compatible? | Data Loss Risk | Notes |
|-----------|----------------------|----------------|-------|
| `config` default `'{}'` | ✅ Yes | None | Additive; existing NULLs handled by accessor |
| Add `template_version` | ✅ Yes | None | Additive column |
| Check constraint on `doc_type_code` | ✅ Yes (if data clean) | None | Reject future invalid inserts only |
| `template_settings` pivot | ✅ Yes | None | Additive new table |

**Rollback plan:** All recommendations are additive. Revert by dropping the added column/table/constraint via a `down()` method.

---

## 6. Summary

| Aspect | Grade | Notes |
|--------|-------|-------|
| Schema clarity | 8/10 | Simple, well-indexed, easy to understand |
| Data integrity | 6/10 | No FK on doc_type_code, nullable config |
| Extensibility | 9/10 | JSON config makes adding settings trivial |
| Migration readiness | 4/10 | No versioning; seeding missing |
| Query performance | 9/10 | All queries covered by existing indexes |
| Overall | 7/10 | Good for current scale, minor hardening needed |

**Urgent actions:** None.  
**Recommended (low effort, high value):** Add `template_version` column + create `PrintTemplateSeeder`.  
**Optional (medium effort):** Check constraint on `doc_type_code`.
