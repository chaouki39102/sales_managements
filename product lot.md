I need to understand the full purchase → product lot lifecycle in this codebase. Please find and return the content/structure of these areas:

1. **Backend Purchase Flow**: How does creating a purchase document work? Look at `CommercialDocumentService` for purchase-specific logic. Does creating a purchase auto-create product lots? Search for `ProductLot` creation in services, observers, or jobs.

2. **ProductLot Model**: Read `app/Models/ProductLot.php` — what fields are fillable, any relationships, observers?

3. **ProductLot Migration**: Find the migration file for `product_lots` table to see the full schema.

4. **Purchase Document Frontend**: How does the POS or document creation UI handle purchases? Look at `CommercialDocumentModal` or `ProfessionalPaymentModal` or any purchase-specific UI.

5. **Product Lots Tab**: Read `resources/js/pages/inventory/ProductLotsTab.tsx` to see the current UI for managing lots.

6. **Stock Display**: How does inventory display stock? Look at `StockTab.tsx` and any stock-at related code to understand how stock is currently shown (total vs per-lot).

7. **Backend ProductLot Controller**: Find the controller for product lots (`ProductLotController.php`) to understand what API endpoints exist.

8. **Backend routes**: Search routes/api.php for product-lot routes.

Return ALL file paths with their key content/structure. Be thorough - read full files where needed.
+ Thought: 238ms
I'll conduct a thorough search across all 8 areas. Let me start with parallel searches to locate all relevant files.
✱Glob "app/Models/ProductLot.php" (1 match)
✱Glob "app/Http/Controllers/Api/V1/ProductLot*" (1 match)
✱Glob "database/migrations/*product_lot*" (1 match)
✱Glob "resources/js/pages/inventory/*" (6 matches)
✱Grep "ProductLot" in app (40 matches)
✱Grep "product.lot|product-lot|product_lots" in routes (8 matches)
✱Glob "app/Services/CommercialDocumentService.php" (1 match)
✱Glob "resources/js/pages/**/CommercialDocumentModal*" 
✱Glob "resources/js/pages/**/ProfessionalPaymentModal*" 
✱Glob "resources/js/pages/inventory/StockTab*" (1 match)
✱Grep "ProductLot|product.lot|product_lots" in resources\js (32 matches)
+ Thought: 93ms
Good, I've located all the key files. Now let me read them all in parallel.
→Read app\Models\ProductLot.php 
→Read app\Http\Controllers\Api\V1\ProductLotController.php 
→Read database\migrations\2026_04_28_184501_create_product_lots_table.php 
→Read app\Observers\StockMovementObserver.php 
→Read app\Services\CommercialDocumentService.php 
→Read app\Services\ProductLotService.php 
→Read app\Http\Resources\ProductLotResource.php 
→Read app\Policies\ProductLotPolicy.php 
→Read resources\js\pages\inventory\ProductLotsTab.tsx 
→Read resources\js\pages\inventory\StockTab.tsx 
→Read resources\js\pages\inventory\InventoryPage.tsx 
→Read app\Services\InventoryValuationService.php 
+ Thought: 361ms
Now let me read the remaining critical files: the frontend document creation, API endpoints, routes context, StockMovement model, and the stock-at service.
→Read resources\js\pages\documents\hooks\useDocumentForm.ts [offset=800, limit=80]
→Read resources\js\lib\api\endpoints\inventory.ts 
→Read resources\js\lib\api\core\types.ts [offset=350, limit=80]
→Read routes\api.php [offset=280, limit=20]
→Read routes\api.php [offset=484, limit=15]
→Read app\Models\StockMovement.php 
→Read app\Services\InventoryStockService.php 
→Read resources\js\pages\documents\utils\document.utils.ts [offset=260, limit=30]
→Read resources\js\pages\documents\types\document.types.ts [offset=35, limit=65]
→Read app\Http\Requests\StoreProductLotRequest.php 
→Read app\Http\Requests\UpdateProductLotRequest.php 
→Read app\Models\CommercialDocumentLine.php [offset=75, limit=20]
+ Thought: 673ms
Let me check a few more files to complete the picture: the Product model for has_lots, the document form for purchase handling, and the BaseApiController for CRUD inheritance.
✱Grep "has_lots|lot_number|stock_lot_id" in app\Models (18 matches)
✱Grep "isPurchase|is_purchase|affects_stock_direction" in resources\js\pages\documents (100 matches)
→Read resources\js\pages\documents\hooks\useDocumentForm.ts [limit=50, offset=1]
→Read app\Models\Product.php [limit=30, offset=195]
→Read app\Core\Services\BaseService.php [limit=60, offset=1]
✱Grep "auto_create_lot_on_purchase" in app (3 matches)
→Read resources\js\lib\api\endpoints\documents.ts [limit=30, offset=120]
+ Thought: 338ms
Let me get the final piece - the document form submission where lot_number_new is passed for purchases.
→Read resources\js\pages\documents\hooks\useDocumentForm.ts [limit=80, offset=1170]
→Read resources\js\pages\documents\hooks\useCommercialDocumentController.ts [limit=60, offset=40]
→Read resources\js\pages\documents\hooks\useDocumentForm.ts [limit=40, offset=895]
+ Thought: 227ms
Let me check the PURCHASE_CODES constant and the ComputeLineService for the purchase lot logic.
→Read resources\js\pages\documents\hooks\useCommercialDocumentController.ts [limit=40, offset=1]
→Read app\Services\ComputeLineService.php 
→Read app\Http\Controllers\Api\V1\SettingController.php [limit=15, offset=178]
+ Thought: 12ms
Let me get the PURCHASE_CODES constant definition.
✱Grep "PURCHASE_CODES" in resources\js\pages\documents\types (1 match)
+ Thought: 407ms
Now I have the complete picture. Here is the full analysis of the purchase-to-product-lot lifecycle.
Complete Purchase → Product Lot Lifecycle
1. Backend Purchase Flow (CommercialDocumentService)
File: D:\xampp\htdocs\sales-management\app\Services\CommercialDocumentService.php (808 lines)
Purchase document creation is indistinguishable from sale creation in terms of code path. The same CommercialDocumentService handles all document types. The system determines whether a document "affects stock" via the DocumentType.affects_stock_direction field (positive = purchase/in, negative = sale/out).
Creation flow:
1. beforeCreate() (line 68-153): Sets company_id, generates document_number (e.g. BCF-2026-000001), resolves numbering series, defaults warehouse/currency/fiscal_year from Settings, validates tenant relations, and immediately marks the document as validated (no draft state).
2. afterCreate() (line 161-188): Calls createDocumentLines(), then recalculateTotals(), then createStockMovements() if the document type has a non-zero affects_stock_direction.
3. createDocumentLines() (line 428-501): For each line, validates products are active, applies TVA exemption rules, computes line totals, and saves the line. Critically, stock_lot_id is passed through from the request (line 493) but lot_number_new is NOT handled here -- it flows to the StockMovement.
4. createStockMovements() (line 599-675): For each document line, creates a StockMovement record. The lot_number from the line data is passed to the StockMovement (line 669). This is the trigger that auto-creates a ProductLot via the observer.
5. afterUpdate() (line 245-275): On document edit, deletes old stock movements, re-creates lines and movements.
Key detail: The service does NOT directly create ProductLot records. It creates StockMovements, which then trigger the StockMovementObserver.
2. ProductLot Auto-Creation (The Observer)
File: D:\xampp\htdocs\sales-management\app\Observers\StockMovementObserver.php (184 lines)
This is the central mechanism for lot creation:
StockMovement created → StockMovementObserver::created()
  → if direction > 0 (incoming/purchase):
     → check Setting 'auto_create_lot_on_purchase' (defaults true)
     → if true: createProductLot()
createProductLot() method (line 98-148):
- Takes the StockMovement's unit_price as purchase_price
- Calculates legal_selling_price = purchase_price * 1.05 (5% legal margin)
- Uses lot_number from the movement if user provided one, otherwise generates LOT-{productCode}-{YYYYMMDD}-{sequence}
- Ensures uniqueness of lot number within the company
- Creates ProductLot with original_quantity = remaining_quantity = movement.quantity
- Links back: movement.updateQuietly(['stock_lot_id' => $lot->id])
- Links the CommercialDocumentLine to the lot as well (line 140-145)
For outgoing movements (sales, direction < 0):
- No lot creation
- Instead, calls updateLotBalancesAfterSale() if using FIFO/LIFO valuation, which decrements remaining_quantity on the oldest/newest lots
Setting controlling this behavior:
- auto_create_lot_on_purchase (boolean, company-scoped) -- defined in D:\xampp\htdocs\sales-management\app\Http\Controllers\Api\V1\SettingController.php:183
3. ProductLot Model
File: D:\xampp\htdocs\sales-management\app\Models\ProductLot.php (99 lines)
Fillable fields:
'company_id', 'lot_number', 'product_id', 'warehouse_id',
'manufacturing_date', 'expiration_date', 'purchase_date',
'purchase_price', 'legal_selling_price', 'margin_percentage',
'original_quantity', 'remaining_quantity', 'stock_movement_id',
'supplier_lot_number', 'active'
Casts: All dates, 4-decimal prices/quantities, boolean active
Computed attributes (appended): is_depleted (remaining_qty <= 0), is_expired (expiration_date is past)
Accessors: total_cost (original_qty * purchase_price), remaining_value (remaining_qty * purchase_price)
Relationships:
- product() → BelongsTo Product
- warehouse() → BelongsTo Warehouse
- stockMovement() → BelongsTo StockMovement (the movement that created this lot)
- commercialDocumentLines() → HasMany CommercialDocumentLine (via stock_lot_id)
- stockMovements() → HasMany StockMovement (via stock_lot_id)
Scopes: available (remaining > 0 & active), depleted, expired, expiringSoon($days), fifoOrder
Methods: decreaseQuantity($qty), increaseQuantity($qty), isExpiringSoon($days)
Traits: HasStandardizedConfiguration, HasCompany, SoftDeletes
Search/Filter: searchable on lot_number, supplier_lot_number; filterable by product_id, warehouse_id, active
4. ProductLot Migration (Schema)
File: D:\xampp\htdocs\sales-management\database\migrations\2026_04_28_184501_create_product_lots_table.php (53 lines)
Full schema:
Column	Type	Notes
id	bigint (auto)	PK
company_id	FK → companies	cascadeOnDelete
lot_number	varchar(50)	indexed, unique with company_id
product_id	FK → products	restrictOnDelete
warehouse_id	FK → warehouses	restrictOnDelete
manufacturing_date	date, nullable	indexed
expiration_date	date, nullable	indexed
purchase_date	date	indexed
purchase_price	decimal(15,4)	 
legal_selling_price	decimal(15,4)	 
margin_percentage	decimal(8,4)	default 5.00
original_quantity	decimal(15,4)	 
remaining_quantity	decimal(15,4)	indexed
is_depleted	boolean	stored/computed column (MySQL); plain default (SQLite)
total_cost	decimal(15,4)	stored as original_quantity * purchase_price (MySQL)
remaining_value	decimal(15,4)	stored as remaining_quantity * purchase_price (MySQL)
stock_movement_id	bigint, nullable	"FK to be added later" (comment)
supplier_lot_number	varchar(100), nullable	 
active	boolean	default true, indexed
timestamps + softDeletes	 	 
Constraints:
- UNIQUE(company_id, lot_number) named product_lots_company_lot_unique
- CHECK(remaining_quantity >= 0 AND remaining_quantity <= original_quantity) (MySQL only)
- Composite indexes: idx_fifo_lookup on (company_id, product_id, warehouse_id, is_depleted, purchase_date) and idx_active_stock on (company_id, active, remaining_quantity)
5. Purchase Document Frontend
No dedicated purchase UI file exists. Purchases share the same CommercialDocumentModal as sales. The differentiation happens via:
File: D:\xampp\htdocs\sales-management\resources\js\pages\documents\types\document.types.ts:9
export const PURCHASE_CODES = new Set(['DDP', 'BCF', 'BR', 'FA', 'AA']);
File: D:\xampp\htdocs\sales-management\resources\js\pages\documents\hooks\useCommercialDocumentController.ts:52
const isPurchase = PURCHASE_CODES.has(docCode);
Purchase-specific behaviors in useDocumentForm.ts:
1. Lot assignment for SALES (line 821-824): When selecting a product on a sale document, the first available lot is auto-assigned:
if (!isPurchase && product.has_lots) {
  const firstLot = (product.lots ?? []).find((lt) => lt.remaining_quantity > 0);
  L.stock_lot_id = firstLot ? String(firstLot.id) : '';
}
2. Lot number for PURCHASES (line 1182): When submitting a purchase, the lot_number_new field is sent:
...(isPurchase && line.lot_number_new ? { lot_number: line.lot_number_new } : {}),
3. Stock validation skipped for purchases (line 289 of document.utils.ts):
if (isPurchase || !product.manages_stock) return { ok: true };
4. Quantity discounts skipped for purchases (line 904 of useDocumentForm.ts):
if (L._product && !isPurchase) { /* resolve quantity discount */ }
5. ComputeLineService (D:\xampp\htdocs\sales-management\app\Services\ComputeLineService.php:84): For purchases, unit price comes from product.purchase_price_ht or current_cost_price, not from price levels.
6. Document API includes lots (D:\xampp\htdocs\sales-management\resources\js\lib\api\endpoints\documents.ts:130): The lines.product.lots relationship is included when fetching documents.
Line items also have:
- stock_lot_id — links to an existing lot (used for sales)
- lot_number — new lot number string (used for purchases, passed to StockMovement)
6. Product Lots Tab (Inventory UI)
File: D:\xampp\htdocs\sales-management\resources\js\pages\inventory\ProductLotsTab.tsx (361 lines)
Features:
- KPI cards: Total lots, Active, Depleted, Expiring Soon (30 days)
- Search: By lot number or product name
- Paginated table (15 per page) with columns: Lot #, Product, Warehouse, Original Qty, Remaining Qty (with progress bar), Purchase Date, Expiration Date, Status, Actions
- CRUD modals: Create/Edit lot with fields: lot_number, product_id, warehouse_id, supplier_lot_number, manufacturing_date, expiration_date, purchase_date, purchase_price, margin_percentage, legal_selling_price (auto-calculated), original_quantity
- Status badges: depleted (gray), expired (danger), expiring soon (warning), inactive (gray), active (success)
- Delete with confirmation dialog
- API hooks: Uses useProductLots() from inventory.ts, and useInventoryMutations() for CRUD
Status logic (line 26-35):
remaining <= 0  → "فارغة" (depleted)
expiration < now → "منتهية" (expired)
expiration < now+30d → "تنتهي قريباً" (expiring)
!active → "غير نشطة" (inactive)
otherwise → "نشطة" (active)
7. Stock Display
File: D:\xampp\htdocs\sales-management\resources\js\pages\inventory\StockTab.tsx (441 lines)
StockTab shows TOTAL stock per product (NOT per-lot). It queries GET /inventory/stock-at which returns aggregated data:
- Columns: Product, Family, Unit, Opening, In, Out, Current Stock, Min Alert, Total Value, Status
- Status logic: current_stock <= 0 → "نافد" (out), <= min_stock_alert → "منخفض" (low), otherwise "جيد" (ok)
- KPI cards: Filter by status (all/out/low/ok)
- Filters: Search by name/ref, warehouse dropdown, fiscal year badge
- Client-side pagination (25 per page default)
- Totals row in footer
Backend stock-at service: D:\xampp\htdocs\sales-management\app\Services\InventoryStockService.php (181 lines)
The getStockAt() method computes:
current_stock = opening_quantity + total_in - total_out
Using two LEFT JOIN subqueries (opening_balances_stock + stock_movements). Results are cached for 30 seconds. This is purely aggregate — no per-lot breakdown in the stock view.
StockAtRow interface (from D:\xampp\htdocs\sales-management\resources\js\lib\api\endpoints\inventory.ts:85-99):
interface StockAtRow {
  id, name, ref, opening_quantity, total_in, total_out,
  current_stock, min_stock_alert, current_cost_price,
  total_value, manages_stock, family?, unit?
}
8. Backend ProductLot Controller
File: D:\xampp\htdocs\sales-management\app\Http\Controllers\Api\V1\ProductLotController.php (52 lines)
Extends BaseApiController (inherits standard CRUD: index, show, store, update, destroy).
Custom endpoints:
- available() — returns lots with remaining_quantity > 0 and active = true
- expiring($days) — returns lots expiring within N days (default 30)
Service: D:\xampp\htdocs\sales-management\app\Services\ProductLotService.php (12 lines) — minimal wrapper extending BaseService.
Form Requests:
- D:\xampp\htdocs\sales-management\app\Http\Requests\StoreProductLotRequest.php — validates lot_number (unique per product+company), product_id, warehouse_id, dates, prices, quantity
- D:\xampp\htdocs\sales-management\app\Http\Requests\UpdateProductLotRequest.php — validates lot_number (unique, ignore self), prices. Note: remaining_quantity is NOT editable directly — changes only through stock movements
9. Backend Routes
File: D:\xampp\htdocs\sales-management\routes\api.php
Read-only routes (lines 287-290, public to authenticated users):
GET    /product-lots/available    → ProductLotController@available
GET    /product-lots/expiring     → ProductLotController@expiring
GET    /product-lots              → ProductLotController@index
GET    /product-lots/{lot}        → ProductLotController@show
Write routes (lines 490-492, require permission):
POST   /product-lots              → ProductLotController@store
PUT    /product-lots/{lot}        → ProductLotController@update
DELETE /product-lots/{lot}        → ProductLotController@destroy
Policy: D:\xampp\htdocs\sales-management\app\Policies\ProductLotPolicy.php — uses permission gates: view_any_product_lot, view_product_lot, create_product_lot, update_product_lot, delete_product_lot, restore_product_lot, force_delete_product_lot
10. Complete Lifecycle Summary
┌─────────────────────────────────────────────────────────────────────┐
│ PURCHASE DOCUMENT CREATION                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Frontend: useDocumentForm                                          │
│    → isPurchase = PURCHASE_CODES.has('DDP','BCF','BR','FA','AA')   │
│    → User enters line with product, qty, unit_price, lot_number_new│
│    → buildPayload() sends: { lines: [..., lot_number] }           │
│                                                                     │
│  Backend: CommercialDocumentService::beforeCreate()                 │
│    → Validates, sets status=validated, generates doc_number        │
│                                                                     │
│  Backend: CommercialDocumentService::afterCreate()                  │
│    → createDocumentLines()                                         │
│       → Saves stock_lot_id if provided                             │
│    → recalculateTotals()                                           │
│    → createStockMovements()  ← KEY STEP                            │
│       → Creates StockMovement with lot_number from line            │
│       → direction = +1 (purchase/incoming)                         │
│                                                                     │
│  StockMovementObserver::created()  ← TRIGGER                       │
│    → direction > 0 → check 'auto_create_lot_on_purchase' setting   │
│    → createProductLot()                                            │
│       → Generates LOT-{code}-{date}-{seq} or uses user lot_number │
│       → ProductLot::create({ purchase_price, qty, ... })          │
│       → movement.stock_lot_id = lot.id                             │
│       → line.stock_lot_id = lot.id                                 │
│    → updateCostAfterPurchase() (weighted average update)           │
│    → updateStockBalanceAfter()                                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ SALE DOCUMENT CREATION (lot consumption)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Frontend: useDocumentForm                                          │
│    → Auto-assigns first available lot: stock_lot_id                │
│    → Stock validation checks remaining_quantity                    │
│                                                                     │
│  Backend: same flow, but direction < 0                              │
│    → StockMovement created with direction = -1                     │
│    → Observer: updateLotBalancesAfterSale() (FIFO/LIFO)            │
│       → Decrements remaining_quantity on oldest/newest lots        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ STOCK DISPLAY (InventoryPage)                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  StockTab: Shows TOTAL per product (opening + in - out)            │
│            No per-lot breakdown in this view                        │
│                                                                     │
│  ProductLotsTab: Lists ALL lots with remaining_quantity, status    │
│                  Manual CRUD available                              │
│                  Shows per-lot remaining vs original               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ PRODUCT MODEL (has_lots flag)                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Product has 'has_lots' boolean (fillable + cast)                  │
│  Product.lots() → HasMany ProductLot                               │
│  ComputeLineService loads lots with remaining > 0, sorted by       │
│  expiration_date, and returns lot_suggestions[] with top 5        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
All Files Referenced
#	File	Role
1	app/Services/CommercialDocumentService.php	Purchase/sale document CRUD, stock movement creation
2	app/Observers/StockMovementObserver.php	Auto-creates ProductLot on incoming movements
3	app/Models/ProductLot.php	Lot model with relationships, scopes, computed fields
4	database/migrations/2026_04_28_184501_create_product_lots_table.php	Full schema definition
5	app/Http/Controllers/Api/V1/ProductLotController.php	CRUD + available/expiring endpoints
6	app/Services/ProductLotService.php	Thin service wrapper (BaseService)
7	app/Http/Resources/ProductLotResource.php	API response transformer
8	app/Http/Requests/StoreProductLotRequest.php	Store validation rules
9	app/Http/Requests/UpdateProductLotRequest.php	Update validation rules
10	app/Policies/ProductLotPolicy.php	Permission gates
11	app/Services/InventoryValuationService.php	FIFO/LIFO lot consumption, PMP updates
12	app/Services/InventoryStockService.php	Stock-at query (aggregate, cached 30s)
13	app/Services/ComputeLineService.php	Line computation, lot_suggestions for sales
14	app/Models/StockMovement.php	Movement model with stock_lot_id FK
15	app/Models/CommercialDocumentLine.php	Line model with stock_lot_id FK
16	app/Models/Product.php	has_lots flag, lots() relationship
17	routes/api.php (lines 287-290, 490-492)	All product-lot API routes
18	resources/js/pages/inventory/InventoryPage.tsx	Tab container (stock/lots/opening)
19	resources/js/pages/inventory/StockTab.tsx	Aggregate stock display (total per product)
20	resources/js/pages/inventory/ProductLotsTab.tsx	Lot management UI (CRUD, status, search)
21	resources/js/lib/api/endpoints/inventory.ts	Frontend API hooks (useProductLots, mutations)
22	resources/js/lib/api/core/types.ts (line 361-382)	TypeScript ProductLot interface
23	resources/js/pages/documents/hooks/useDocumentForm.ts	Document form: lot assignment for sales, lot_number for purchases
24	resources/js/pages/documents/hooks/useCommercialDocumentController.ts	PURCHASE_CODES detection
25	resources/js/pages/documents/types/document.types.ts	PURCHASE_CODES set, Product.lot interface
26	resources/js/pages/documents/utils/document.utils.ts	Stock validation (skipped for purchases)
27	resources/js/lib/api/endpoints/documents.ts (line 130)	Includes lines.product.lots in API
▣  Explore · Big Pickle · 2m 25s
Explore(6 of 7)92.5K (46%)
