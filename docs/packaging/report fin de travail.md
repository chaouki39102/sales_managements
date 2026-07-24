- Thought: 416ms
Let me carefully plan and execute all 6 steps. First, let me understand the codebase structure.
# Todos
[•] STEP 1 — Migration: Add packaging_units_snapshot column
[ ] STEP 2 — Model: CommercialDocumentLinefillable, cast, accessor
[ ] STEP 3 — createDocumentLines(): freeze snapshot
[ ] STEP 4 — createStockMovements(): use snapshot for baseQty
[ ] STEP 5 — Validation rule for lines.*.quantity
[ ] STEP 6 — Regression grep report (read-only)
[ ] Build + test verification
[ ] Deliverable summary
+ Thought: 7ms
STEP 1 — Migration
$ php artisan make:migration add_packaging_units_snapshot_to_commercial_document_lines
INFO  Migration [C:\xampp\htdocs\sales_managements\database\migrations\2026_07_24_094853_add_packaging_units_snapshot_to_commercial_document_lines.php] created successfully.
+ Thought: 25.9s
✱Glob "database/migrations/2026_07_24_094853_add_packaging_units_snapshot*" (1 match)
+ Thought: 316ms
→Read database\migrations\2026_07_24_094853_add_packaging_units_snapshot_to_commercial_document_lines.php 
+ Thought: 6ms
←Edit database\migrations\2026_07_24_094853_add_packaging_units_snapshot_to_commercial_document_lines.php 
+ Thought: 8ms
→Read database\migrations\2026_07_24_094853_add_packaging_units_snapshot_to_commercial_document_lines.php 
+ Thought: 7ms
# Wrote database\migrations\2026_07_24_094853_add_packaging_units_snapshot_to_commercial_document_lines.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->decimal('packaging_units_snapshot', 15, 4)->nullable()->after('packaging_id')
                ->comment('Frozen ProductPackaging.quantity at time of sale — never recompute from live packaging row');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('commercial_document_lines', function (Blueprint $table) {
            $table->dropColumn('packaging_units_snapshot');
        });
    }
};

+ Thought: 5ms
$ php artisan migrate
INFO  Running migrations.  

  2026_07_24_094853_add_packaging_units_snapshot_to_commercial_document_lines .......................... 383.78ms DONE
+ Thought: 6ms
$ php artisan db:show commercial_document_lines 2>&1 | Select-String "packaging_units_snapshot"
(no output)
+ Thought: 160ms
$ php artisan tinker --execute="DB::select('DESCRIBE commercial_document_lines'); foreach(DB::select('DESCRIBE commercial_document_lines') as \$r) { if(str_contains(\$r->Field, 'packaging')) echo \$r->Field . ' | ' . \$r->Type . ' | ' . \$r->Null . PHP_EOL; }"
PARSE ERROR  PHP Parse error: Syntax error, unexpected T_NS_SEPARATOR in vendor\psy\psysh\src\Exception\ParseErrorException.php on line 44.
+ Thought: 145ms
$ php artisan tinker --execute="foreach(DB::select('DESCRIBE commercial_document_lines') as $r) { echo $r->Field . ' | ' . $r->Type . ' | ' . $r->Null . PHP_EOL; }" 2>&1
PARSE ERROR  PHP Parse error: Syntax error, unexpected ')' in vendor\psy\psysh\src\Exception\ParseErrorException.php on line 44.
+ Thought: 407ms
$ php -r "require 'vendor/autoload.php'; $app = require_once 'bootstrap/app.php'; $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap(); $cols = DB::select('DESCRIBE commercial_document_lines'); foreach($cols as $c) echo $c->Field . ' | ' . $c->Type . ' | ' . $c->Null . PHP_EOL;"
PHP Parse error:  syntax error, unexpected token "=", expecting end of file in Command line code on line 1

Parse error: syntax error, unexpected token "=", expecting end of file in Command line code on line 1
+ Thought: 2.7s
# Wrote tmp_describe.php
<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$rows = DB::select('DESCRIBE commercial_document_lines');
foreach ($rows as $r) {
    echo $r->Field . ' | ' . $r->Type . ' | Null:' . $r->Null . PHP_EOL;
}

+ Thought: 4ms
$ php tmp_describe.php
Illuminate\Database\QueryException 

  SQLSTATE[HY000]: General error: 1 near "DESCRIBE": syntax error (Connection: sqlite, Database: C:\xampp\htdocs\sales_managements\database\database.sqlite, SQL: DESCRIBE commercial_document_lines)

  at vendor\laravel\framework\src\Illuminate\Database\Connection.php:857
    853▕             $exceptionType = ($isUniqueConstraintError = $this->isUniqueConstraintError($e))
    854▕                 ? UniqueConstraintViolationException::class
    855▕                 : QueryException::class;
    856▕ 
  ➜ 857▕             $exception = new $exceptionType(
…
Click to expand
+ Thought: 790ms
SQLite — need to use PRAGMA table_info:
# Wrote tmp_describe.php
<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$rows = DB::select('PRAGMA table_info(commercial_document_lines)');
foreach ($rows as $r) {
    echo $r->name . ' | ' . $r->type . ' | nullable:' . ($r->notnull === 0 ? 'YES' : 'NO') . PHP_EOL;
}

+ Thought: 395ms
$ php tmp_describe.php
id | INTEGER | nullable:NO
company_id | INTEGER | nullable:NO
commercial_document_id | INTEGER | nullable:NO
product_id | INTEGER | nullable:NO
line_order | INTEGER | nullable:NO
description | TEXT | nullable:YES
quantity | numeric | nullable:NO
delivered_quantity | numeric | nullable:NO
returned_quantity | numeric | nullable:NO
unit_price_ht | numeric | nullable:NO
…
Click to expand
+ Thought: 578ms
STEP 1 VERIFICATION ✅ — packaging_units_snapshot | numeric | nullable:YES — column exists after packaging_id.
# Todos
[✓] STEP 1 — Migration: Add packaging_units_snapshot column
[•] STEP 2 — Model: CommercialDocumentLinefillable, cast, accessor
[ ] STEP 3 — createDocumentLines(): freeze snapshot
[ ] STEP 4 — createStockMovements(): use snapshot for baseQty
[ ] STEP 5 — Validation rule for lines.*.quantity
[ ] STEP 6 — Regression grep report (read-only)
[ ] Build + test verification
[ ] Deliverable summary
+ Thought: 457ms
STEP 2 — Model: CommercialDocumentLine.php
→Read app\Models\CommercialDocumentLine.php 
+ Thought: 621ms
← Edit app\Models\CommercialDocumentLine.php
    'is_auto_split',
    'parent_line_id',
    'line_attributes',
    'packaging_id',
    'packaging_units_snapshot',
];

protected $casts = [
    'additional_costs' => 'array',
+ Thought: 249ms
← Edit app\Models\CommercialDocumentLine.php
'total_additional_cost' => 'decimal:4',
'total_discount_amount' => 'decimal:4',
'line_order' => 'integer',
'quantity' => 'decimal:3',
'packaging_units_snapshot' => 'decimal:4',
'delivered_quantity' => 'decimal:3',
'returned_quantity' => 'decimal:3',
'unit_price_ht' => 'decimal:4',
'cost_price_ht' => 'decimal:4',
+ Thought: 7ms
Now add the accessor near getRemainingQuantity():
← Edit app\Models\CommercialDocumentLine.php
    public function scopeParentLines(Builder $query): Builder { return $query->whereNull('parent_line_id'); }
    public function scopeChildLines(Builder $query): Builder { return $query->whereNotNull('parent_line_id'); }

    public function getRemainingQuantity(): float { return $this->quantity - $this->delivered_quantity - $this->returned_quantity; }
    public function getBaseQuantityAttribute(): float { return round((float) $this->quantity * (float) ($this->packaging_units_snapshot ?? 1), 4); }
    public function isFullyDelivered(): bool { return $this->getRemainingQuantity() <= 0; }
    public function hasDiscount(): bool { return $this->discount_percentage > 0 || $this->discount_amount > 0; }
}
+ Thought: 4ms
STEP 2 VERIFICATION:
# Wrote tmp_describe.php
<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$fillable = (new App\Models\CommercialDocumentLine)->getFillable();
echo "packaging_units_snapshot in fillable: " . (in_array('packaging_units_snapshot', $fillable) ? 'YES' : 'NO') . PHP_EOL;
echo "All fillable: " . implode(', ', $fillable) . PHP_EOL;

+ Thought: 67ms
$ php tmp_describe.php
packaging_units_snapshot in fillable: YES
All fillable: company_id, commercial_document_id, product_id, line_order, description, quantity, delivered_quantity, returned_quantity, unit_price_ht, cost_price_ht, discount_percentage, discount_amount, additional_costs, total_additional_cost, total_discount_amount, tva_rate, total_ht, total_tva, total_ttc, stock_lot_id, is_auto_split, parent_line_id, line_attributes, packaging_id, packaging_units_snapshot
+ Thought: 140ms
STEP 2 VERIFICATION ✅ — packaging_units_snapshot is present in fillable.
STEP 3 — createDocumentLines(): freeze snapshot
→Read app\Services\CommercialDocumentService.php [limit=40, offset=455]
+ Thought: 618ms
← Edit app\Services\CommercialDocumentService.php
        $lineData['tva_rate'] = $rule['rate'];
    }
}

// Freeze the packaging-to-base-unit conversion factor at time of sale.
// Must NEVER be re-derived from the live ProductPackaging row after this point —
// if ProductPackaging.quantity changes later, this line keeps its original value.
$packagingUnitsSnapshot = null;
if (!empty($lineData['packaging_id'])) {
    $packaging = \App\Models\ProductPackaging::find((int) $lineData['packaging_id']);
    if (!$packaging) {
        throw new BusinessRuleException(
            'وحدة التعبئة المحدَّدة في السطر ' . ($order + 1) . ' غير موجودة.',
            422
        );
    }
    $packagingUnitsSnapshot = (float) $packaging->quantity;
}

$totals = $this->computeLineTotals($lineData);

$document->lines()->create([
    'company_id'             => $document->company_id,
+ Thought: 402ms
← Edit app\Services\CommercialDocumentService.php
'unit_price_ht'          => (float) $lineData['unit_price_ht'],
'discount_percentage'    => (float) ($lineData['discount_percentage'] ?? 0),
'tva_rate'               => (float) ($lineData['tva_rate'] ?? 0),
'packaging_id'           => $lineData['packaging_id'] ?? null,
'packaging_units_snapshot' => $packagingUnitsSnapshot,
'stock_lot_id'           => $lineData['stock_lot_id'] ?? null,
'line_attributes'        => $this->buildLineAttributes($lineData),
'total_ht'               => $totals['total_ht'],
'discount_amount'        => $totals['discount_amount'],
+ Thought: 4ms
STEP 3 VERIFICATION:
$ php -l app/Services/CommercialDocumentService.php
No syntax errors detected in app/Services/CommercialDocumentService.php
+ Thought: 499ms
✱Grep "packagingUnitsSnapshot|packaging_units_snapshot" in app\Services (3 matches)
+ Thought: 134ms
STEP 3 VERIFICATION ✅ — 3 references: initialization, assignment, and create() key.
STEP 4 — createStockMovements(): use snapshot for baseQty
→Read app\Services\CommercialDocumentService.php [limit=100, offset=655]
+ Thought: 903ms
Now replace line 674 and fix the StockMovement::create keys:
← Edit app\Services\CommercialDocumentService.php
foreach ($document->lines as $line) {
    if (!$line->product_id || !$line->product) continue;

    $product = $line->product;
    $baseQty = (float) $line->quantity;
    $baseQty = ($line->packaging_id && $line->packaging_units_snapshot)
        ? round((float) $line->quantity * (float) $line->packaging_units_snapshot, 4)
        : (float) $line->quantity;

    // ── التحقق من المخزون قبل إنشاء الحركة ─────────────────────────
    $shouldCheckStock = false;
    if ($direction < 0 && $product->manages_stock) {
+ Thought: 73ms
Now fix quantity and total_price in StockMovement::create:
← Edit app\Services\CommercialDocumentService.php
'product_id'                  => $line->product_id,
'stock_movement_type_id'      => $stockMovementTypeId,
'commercial_document_id'      => $document->id,
'commercial_document_line_id' => $line->id,
'quantity'                    => (float) $line->quantity,
'quantity'                    => $baseQty,
'unit_price'                  => (float) $line->unit_price_ht,
'cost_price'                  => $costPrice,
'total_price'                 => round((float) $line->quantity * $costPrice, 4),
'total_price'                 => round($baseQty * $costPrice, 4),
'movement_date'               => $document->document_date,
'price_source'                => $direction < 0 ? 'sale' : 'purchase',
'lot_number'                  => $line->line_attributes['lot_number'] ?? $line->lot_number ?? null,
'manufacturing_date'          => $line->line_attributes['manufacturing_date'] ?? null,
+ Thought: 173ms
Now grep for remaining raw $line->quantity in the function:
✱Grep "\$line->quantity" in app\Services (2 matches)
+ Thought: 695ms
Only 2 remaining — both inside the $baseQty computation itself. No raw $line->quantity leaks elsewhere.
$ php -l app/Services/CommercialDocumentService.php
No syntax errors detected in app/Services/CommercialDocumentService.php
+ Thought: 8ms
STEP 4 VERIFICATION ✅ — $baseQty uses snapshot conversion, StockMovement::create uses $baseQty for both quantity and total_price.
# Todos
[✓] STEP 1 — Migration: Add packaging_units_snapshot column
[✓] STEP 2 — Model: CommercialDocumentLinefillable, cast, accessor
[✓] STEP 3 — createDocumentLines(): freeze snapshot
[✓] STEP 4 — createStockMovements(): use snapshot for baseQty
[•] STEP 5 — Validation rule for lines.*.quantity
[ ] STEP 6 — Regression grep report (read-only)
[ ] Build + test verification
[ ] Deliverable summary
+ Thought: 7ms
STEP 5 — Validation rule for lines.*.quantity
✱Grep "lines\.\*\.quantity" in app\Http\Requests (5 matches)
+ Thought: 410ms
→Read app\Http\Requests\StoreCommercialDocumentRequest.php [limit=60, offset=55]
+ Thought: 8ms
Now let me read the Update request too:
→Read app\Http\Requests\UpdateCommercialDocumentRequest.php [limit=50, offset=40]
+ Thought: 701ms
Now let me check if is_sold_by_weight exists on products:
✱Grep "is_sold_by_weight" in app\Models 
✱Grep "is_sold_by_weight" in database\migrations 
+ Thought: 543ms
is_sold_by_weight does NOT exist — will stub as ?? false as instructed.
Before — current rule at StoreCommercialDocumentRequest.php:65:
'lines.*.quantity' => 'required|numeric|min:0.001|max:9999999',
Apply to StoreCommercialDocumentRequest:
← Edit app\Http\Requests\StoreCommercialDocumentRequest.php

// ── الأسطر ───────────────────────────────────────────────
'lines'                            => 'required|array|min:1',
'lines.*.product_id'               => 'required|integer|exists:products,id',
'lines.*.quantity'                 => 'required|numeric|min:0.001|max:9999999',
'lines.*.quantity'                 => ['required', 'numeric', 'min:0.0001', function ($attr, $value, $fail) use ($request) {
    $index       = (int) explode('.', $attr)[1];
    $packagingId = $request->input("lines.$index.packaging_id");
    $product     = \App\Models\Product::find($request->input("lines.$index.product_id"));

    if ($product && !($product->is_sold_by_weight ?? false) && !$packagingId) {
        if (abs(round($value) - $value) > 0.0001) {
            $fail("لا يمكن بيع كمية كسرية من وحدة أساسية: {$product->name}");
        }
    }
}],
'lines.*.unit_price_ht'            => 'required|numeric|min:0|max:9999999999',
'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
'lines.*.discount_amount'          => 'nullable|numeric|min:0',
'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
+ Thought: 348ms
Now UpdateCommercialDocumentRequest:
← Edit app\Http\Requests\UpdateCommercialDocumentRequest.php
'lines'                            => 'sometimes|array|min:1',

// ✅ required_with:lines — الحقول إلزامية فقط إذا أُرسلت lines
'lines.*.product_id'               => 'required_with:lines|integer|exists:products,id',
'lines.*.quantity'                 => 'required_with:lines|numeric|min:0.001|max:9999999',
'lines.*.quantity'                 => ['required_with:lines', 'numeric', 'min:0.0001', function ($attr, $value, $fail) use ($request) {
    $index       = (int) explode('.', $attr)[1];
    $packagingId = $request->input("lines.$index.packaging_id");
    $product     = \App\Models\Product::find($request->input("lines.$index.product_id"));

    if ($product && !($product->is_sold_by_weight ?? false) && !$packagingId) {
        if (abs(round($value) - $value) > 0.0001) {
            $fail("لا يمكن بيع كمية كسرية من وحدة أساسية: {$product->name}");
        }
    }
}],
'lines.*.unit_price_ht'            => 'required_with:lines|numeric|min:0|max:9999999999',
'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
'lines.*.description'              => 'nullable|string|max:1000',
+ Thought: 113ms
$ php -l app/Http/Requests/StoreCommercialDocumentRequest.php; php -l app/Http/Requests/UpdateCommercialDocumentRequest.php
No syntax errors detected in app/Http/Requests/StoreCommercialDocumentRequest.php
No syntax errors detected in app/Http/Requests/UpdateCommercialDocumentRequest.php
+ Thought: 168ms
STEP 5 VERIFICATION ✅ — Both request files pass syntax check. Rule replaces max:9999999 with custom closure (no upper bound needed), min:0.001 → min:0.0001.
# Todos
[✓] STEP 1 — Migration: Add packaging_units_snapshot column
[✓] STEP 2 — Model: CommercialDocumentLinefillable, cast, accessor
[✓] STEP 3 — createDocumentLines(): freeze snapshot
[✓] STEP 4 — createStockMovements(): use snapshot for baseQty
[✓] STEP 5 — Validation rule for lines.*.quantity
[•] STEP 6 — Regression grep report (read-only)
[ ] Build + test verification
[ ] Deliverable summary
+ Thought: 4ms
STEP 6 — Regression grep report (read-only)
✓Explore Task — Grep all quantity usage
↳ 91 toolcalls · 14m 3s
ctrl+x down view subagents
+ Thought: 550ms
Excellent — comprehensive regression report returned. Now build + test:
# Todos
[✓] STEP 1 — Migration: Add packaging_units_snapshot column
[✓] STEP 2 — Model: CommercialDocumentLinefillable, cast, accessor
[✓] STEP 3 — createDocumentLines(): freeze snapshot
[✓] STEP 4 — createStockMovements(): use snapshot for baseQty
[✓] STEP 5 — Validation rule for lines.*.quantity
[✓] STEP 6 — Regression grep report (read-only)
[•] Build + test verification
[ ] Deliverable summary
+ Thought: 11ms
$ Remove-Item tmp_describe.php
(no output)
$ php -l app/Models/CommercialDocumentLine.php; php -l app/Services/CommercialDocumentService.php; php -l app/Http/Requests/StoreCommercialDocumentRequest.php; php -l app/Http/Requests/UpdateCommercialDocumentRequest.php
No syntax errors detected in app/Models/CommercialDocumentLine.php
No syntax errors detected in app/Services/CommercialDocumentService.php
No syntax errors detected in app/Http/Requests/StoreCommercialDocumentRequest.php
No syntax errors detected in app/Http/Requests/UpdateCommercialDocumentRequest.php
+ Thought: 189ms
All 4 PHP files pass syntax check. Now frontend:
$ npm run build 2>&1
> build
> vite build

vite v8.0.10 building client environment for production...

transforming...✓ 1108 modules transformed.
rendering chunks...
computing gzip size...
public/build/manifest.json                                   65.70 kB │ gzip:   6.62 kB
public/build/assets/tabler-icons-CKaxJfX3.woff2             457.38 kB
public/build/assets/tabler-icons-KWc1JFMo.woff              785.78 kB
…
Click to expand
+ Thought: 14ms
Build: 0 errors, 1108 modules. Tests:
$ npm test 2>&1
> test
> vitest run


 RUN  v4.1.9 C:/xampp/htdocs/sales_managements


 Test Files  6 passed (6)
      Tests  160 passed (160)
   Start at  10:15:07
…
Click to expand
+ Thought: 213ms
All 160 tests pass. Now deliverable summary:
# Todos
[✓] STEP 1 — Migration: Add packaging_units_snapshot column
[✓] STEP 2 — Model: CommercialDocumentLinefillable, cast, accessor
[✓] STEP 3 — createDocumentLines(): freeze snapshot
[✓] STEP 4 — createStockMovements(): use snapshot for baseQty
[✓] STEP 5 — Validation rule for lines.*.quantity
[✓] STEP 6 — Regression grep report (read-only)
[✓] Build + test verification
[✓] Deliverable summary
+ Thought: 12ms
DELIVERABLE — Packaging Quantity Snapshot & Stock Deduction Fix
1. Files Changed
database/migrations/2026_07_24_094853_add_packaging_units_snapshot_to_commercial_document_lines.php (NEW)
// BEFORE: empty up/down
// AFTER:
up(): $table->decimal('packaging_units_snapshot', 15, 4)->nullable()->after('packaging_id')
down(): $table->dropColumn('packaging_units_snapshot')
app/Models/CommercialDocumentLine.php
// $fillable — BEFORE: 'packaging_id',
// $fillable — AFTER:  'packaging_id', 'packaging_units_snapshot',

// $casts — BEFORE: 'quantity' => 'decimal:3', 'delivered_quantity' => ...
// $casts — AFTER:  'quantity' => 'decimal:3', 'packaging_units_snapshot' => 'decimal:4', 'delivered_quantity' => ...

// BEFORE (line 94):
public function getRemainingQuantity(): float { ... }
public function isFullyDelivered(): bool { ... }
// AFTER (line 95 — new accessor inserted between):
public function getRemainingQuantity(): float { ... }
public function getBaseQuantityAttribute(): float { return round((float) $this->quantity * (float) ($this->packaging_units_snapshot ?? 1), 4); }
public function isFullyDelivered(): bool { ... }
app/Services/CommercialDocumentService.php — createDocumentLines()
// BEFORE (line 466-467):
            }

            $totals = $this->computeLineTotals($lineData);

// AFTER (line 466-481):
            }

            // Freeze the packaging-to-base-unit conversion factor at time of sale.
            $packagingUnitsSnapshot = null;
            if (!empty($lineData['packaging_id'])) {
                $packaging = \App\Models\ProductPackaging::find((int) $lineData['packaging_id']);
                if (!$packaging) {
                    throw new BusinessRuleException(
                        'وحدة التعبئة المحدَّدة في السطر ' . ($order + 1) . ' غير موجودة.',
                        422
                    );
                }
                $packagingUnitsSnapshot = (float) $packaging->quantity;
            }

            $totals = $this->computeLineTotals($lineData);
// BEFORE (line 479-480):
                'packaging_id'           => $lineData['packaging_id'] ?? null,
                'stock_lot_id'           => $lineData['stock_lot_id'] ?? null,
// AFTER:
                'packaging_id'           => $lineData['packaging_id'] ?? null,
                'packaging_units_snapshot' => $packagingUnitsSnapshot,
                'stock_lot_id'           => $lineData['stock_lot_id'] ?? null,
app/Services/CommercialDocumentService.php — createStockMovements()
// BEFORE (line 674):
            $baseQty = (float) $line->quantity;
// AFTER:
            $baseQty = ($line->packaging_id && $line->packaging_units_snapshot)
                ? round((float) $line->quantity * (float) $line->packaging_units_snapshot, 4)
                : (float) $line->quantity;
// BEFORE (line 721, 724):
                'quantity'    => (float) $line->quantity,
                ...
                'total_price' => round((float) $line->quantity * $costPrice, 4),
// AFTER:
                'quantity'    => $baseQty,
                ...
                'total_price' => round($baseQty * $costPrice, 4),
app/Http/Requests/StoreCommercialDocumentRequest.php
// BEFORE (line 65):
'lines.*.quantity' => 'required|numeric|min:0.001|max:9999999',
// AFTER:
'lines.*.quantity' => ['required', 'numeric', 'min:0.0001', function ($attr, $value, $fail) use ($request) {
    $index       = (int) explode('.', $attr)[1];
    $packagingId = $request->input("lines.$index.packaging_id");
    $product     = \App\Models\Product::find($request->input("lines.$index.product_id"));
    if ($product && !($product->is_sold_by_weight ?? false) && !$packagingId) {
        if (abs(round($value) - $value) > 0.0001) {
            $fail("لا يمكن بيع كمية كسرية من وحدة أساسية: {$product->name}");
        }
    }
}],
app/Http/Requests/UpdateCommercialDocumentRequest.php
Same pattern as Store, with 'required_with:lines' prefix preserved.
2. Verification Commands
Step	Command	Result
1	PRAGMA table_info(commercial_document_lines)	packaging_units_snapshot | numeric | nullable:YES ✅
2	(new CommercialDocumentLine)->getFillable()	packaging_units_snapshot present ✅
3	php -l app/Services/CommercialDocumentService.php	0 syntax errors ✅
4	grep $line->quantity in createStockMovements()	Only 2 hits — both inside the $baseQty conversion itself ✅
5	php -l both Request files	0 syntax errors ✅
—	php -l all 4 PHP files	0 errors ✅
—	npm run build	0 errors, 1108 modules ✅
—	npm test	160/160 pass ✅
3. Step 6 — Regression Grep Report
CRITICAL — Must fix (quantities used for computation, not just display)
#	File	Line
1	CommercialDocumentLine.php:94	getRemainingQuantity()
2	CommercialDocumentLineObserver.php:59,72	total_ht = quantity * unit_price_ht
3	CommercialDocumentService.php:508	computeLineTotals: gross = qty * price
4	DocumentReturnService.php:51-52,54,92,97	Return quantity comparisons
5	DocumentConversionService.php:79,110,115	Copies raw quantity + delivery increment
6	ReportService.php (lines 57,81,83,203,356,540,542,752,804,806,997,999,1158,1251,1327)	~15 SQL queries
7	PartyBalanceService.php (lines 267,373,456,457,565,583)	~6 SQL queries
8	DashboardService.php:89	SUM(quantity) as total_qty
9	CustomerInsightService.php:106	SUM(cdl.quantity) as total_qty
10	ProductSuggestionService.php:25	SUM(cdl.quantity) as total_qty
11	SubsidizedSalesService.php:162-163	Revenue + qty
12	IFUDeclarationService.php:199,248	cdl.quantity * cdl.unit_price_ht
13	DocumentMailService.php:66	{$line->quantity} × {$line->unit_price_ht}
Frontend — Must fix
#	File	Line
14	ReturnDocumentModal.tsx:31,40,41	l.quantity - l.returned_quantity
15	POSPage.tsx:993,1001-1004,1099,1435	Sends raw i.quantity to API + margin calc
16	POSKioskPage.tsx:209,86,348	Same as POSPage
17	InvoicesPage.tsx:1005-1008,1138-1141	unit_price_ht * quantity
18	DocumentDataBuilder.ts:485	quantity: line.quantity / packQty
19	QuickSaleModal.tsx:538,627,1426	Stock check + API call with raw qty
OK — No fix needed
Category	Files
StockMovement queries	InventoryValuationService, InventoryReportService, FiscalYearClosureService
Frontend type defs	document.types.ts, documents.ts
Frontend display-only	CartRow.tsx, LineCard.tsx
4. is_sold_by_weight Status
DOES NOT EXIST in the codebase. Stubbed as ?? false in both validation closures. This is a follow-up dependency — when weight-based selling is implemented, the products table needs an is_sold_by_weight boolean column, and these two validation closures need to be updated to use the real column value.
CRITICAL ARCHITECTURAL NOTE from the regression report: There is a dual-semantic inconsistency in how quantity is stored:
- Document form path (useDocumentForm.ts:1171): buildPayload() sends effectiveQty = line.quantity × packQty → DB quantity = base units
- POS path (POSPage.tsx:993): sends i.quantity directly → DB quantity = packaging units
This means $line->base_quantity (quantity × packaging_units_snapshot) is correct for POS lines but double-counts for document-form lines (which already store base units). The packaging_units_snapshot column being NULL for document-form lines (since they don't set packaging_id) makes the accessor return quantity × 1 = quantity, which is correct. But this relies on document-form lines always having packaging_id = NULL — if a future feature sends packaging_id with already-multiplied quantity, the accessor will double-count. This should be documented and tested.
▣  Build · Big Pickle · 27m 55s
Build·Big PickleOpenCode Zen
C:\xampp\htdocs\sales_managements
