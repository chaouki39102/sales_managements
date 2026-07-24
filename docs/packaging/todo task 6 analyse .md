Search the codebase at C:\xampp\htdocs\sales_managements for ALL places that read `commercial_document_lines.quantity` (or `->quantity` on a CommercialDocumentLine instance, or `lines.quantity` in SQL/Raw queries) and assume it is a base-unit count. 

Search in:
- app/ (PHP backend — Services, Controllers, Models, Resources, Reports, etc.)
- resources/js/ (TypeScript/JS frontend — any calculation, display, or API query referencing line.quantity)

For each match found, return:
1. The exact file path and line number
2. The relevant code snippet (1-3 lines of context)
3. Whether it needs to switch to `$line->base_quantity` (or the SQL equivalent `quantity * COALESCE(packaging_units_snapshot, 1)`) to remain correct after the packaging_units_snapshot fix

Be thorough — check:
- PHP: `->quantity`, `$line->quantity`, `lines.quantity`, `line.quantity`
- JS/TS: `.quantity`, `line.quantity`, `item.quantity`
- Raw SQL: any query that references the quantity column from commercial_document_lines

Do NOT search for `->quantity` on Product, StockMovement, or other non-line models. Only CommercialDocumentLine quantity references.

Return a complete table with all matches.
+ Thought: 520ms
✱Grep "\bquantity\b" in app (100 matches)
✱Grep "\bquantity\b" in resources\js (100 matches)
+ Thought: 600ms
Let me now narrow down to specifically CommercialDocumentLine quantity references, and understand the model/schema first.
✱Glob "**/CommercialDocumentLine*.php" in app (6 matches)
✱Grep "commercial_document_lines.*quantity|line.*quantity|lines.*quantity|cdl\.quantity" in app (45 matches)
✱Grep "base_quantity|packaging_units_snapshot" in app (6 matches)
+ Thought: 2.2s
Now let me read the key files to understand the exact semantics and identify which usages treat quantity as base-unit count:
→Read app\Models\CommercialDocumentLine.php 
→Read app\Http\Resources\CommercialDocumentLineResource.php 
→Read app\Observers\CommercialDocumentLineObserver.php 
+ Thought: 11.5s
Let me now read the key service and frontend files in detail:
→Read app\Services\CommercialDocumentService.php [offset=455, limit=120]
→Read app\Services\CommercialDocumentService.php [offset=660, limit=80]
→Read app\Services\CommercialDocumentService.php [offset=840, limit=50]
+ Thought: 11.7s
Now let me read the frontend document utils and key line quantity usages:
→Read resources\js\pages\documents\utils\document.utils.ts 
→Read resources\js\pages\documents\types\document.types.ts [offset=25, limit=50]
+ Thought: 42.1s
Now let me check the frontend code that sends quantity to the backend, and the observer comment's claim:
✱Grep "quantity.*:.*line\.quantity|quantity.*:.*\.quantity|'quantity'.*:" in resources\js (39 matches)
→Read resources\js\pages\pos\POSPage.tsx [limit=40, offset=685]
→Read resources\js\pages\pos\POSPage.tsx [limit=40, offset=980]
+ Thought: 3.3s
Let me check the POS cart item types and the critical sending functions:
→Read resources\js\pages\documents\hooks\useCommercialDocumentController.ts [limit=50, offset=480]
✱Grep "interface CartItem|type CartItem" in resources\js (1 match)
→Read resources\js\pages\documents\hooks\useDocumentForm.ts [limit=50, offset=830]
+ Thought: 3.8s
Let me find the actual submission payload in the document form:
→Read resources\js\pages\documents\hooks\useDocumentForm.ts [limit=60, offset=910]
→Read resources\js\lib\api\core\types.ts [limit=50, offset=650]
→Read resources\js\pages\pos\POSKioskPage.tsx [limit=30, offset=200]
+ Thought: 2.3s
Let me find the actual save/submit function in the document form and controller:
✱Grep "quantity.*_packQty|quantity.*packQty|quantity.*pack" in resources\js\pages\documents (15 matches)
→Read resources\js\pages\documents\hooks\useDocumentForm.ts [limit=80, offset=970]
+ Thought: 394ms
✱Grep "submit|save|store|create.*document|apiPayload|toApiPayload|buildPayload" in resources\js\pages\documents (34 matches)
→Read resources\js\pages\documents\hooks\useDocumentForm.ts [limit=100, offset=245]
+ Thought: 188ms
→Read resources\js\pages\documents\hooks\useDocumentForm.ts [limit=120, offset=1130]
+ Thought: 52.2s
Now I have a clear picture of the data model. Let me now read all the remaining service files to get complete context:
→Read app\Services\DocumentReturnService.php 
→Read app\Services\DocumentConversionService.php [limit=80, offset=60]
→Read app\Services\DashboardService.php [limit=40, offset=80]
+ Thought: 7ms
→Read app\Services\DashboardService.php [limit=40, offset=130]
→Read app\Services\CustomerInsightService.php [limit=40, offset=90]
→Read app\Services\ProductSuggestionService.php [limit=40, offset=15]
+ Thought: 270ms
→Read app\Services\PartyBalanceService.php [limit=40, offset=250]
→Read app\Services\PartyBalanceService.php [limit=40, offset=360]
→Read app\Services\PartyBalanceService.php [limit=50, offset=440]
+ Thought: 28ms
→Read app\Services\PartyBalanceService.php [limit=40, offset=555]
→Read app\Services\ReportService.php [limit=30, offset=48]
→Read app\Services\ReportService.php [limit=30, offset=75]
+ Thought: 368ms
→Read app\Services\ReportService.php [limit=20, offset=195]
→Read app\Services\ReportService.php [limit=20, offset=348]
→Read app\Services\ReportService.php [limit=20, offset=530]
+ Thought: 240ms
→Read app\Services\ReportService.php [limit=20, offset=745]
→Read app\Services\ReportService.php [limit=20, offset=796]
→Read app\Services\ReportService.php [limit=20, offset=990]
+ Thought: 309ms
→Read app\Services\ReportService.php [limit=15, offset=1150]
→Read app\Services\ReportService.php [limit=15, offset=1245]
→Read app\Services\ReportService.php [limit=15, offset=1320]
+ Thought: 393ms
→Read app\Services\Fiscal\SubsidizedSalesService.php [limit=30, offset=150]
→Read app\Services\Fiscal\IFUDeclarationService.php [limit=30, offset=190]
→Read app\Services\Fiscal\IFUDeclarationService.php [limit=30, offset=240]
+ Thought: 30ms
Let me now check the remaining backend services and frontend files:
→Read app\Services\DocumentMailService.php [limit=20, offset=58]
→Read app\Services\ImportService.php [limit=15, offset=225]
→Read app\Http\Requests\StoreCommercialDocumentRequest.php [limit=30, offset=55]
+ Thought: 451ms
→Read app\Services\FiscalYearClosureService.php [limit=30, offset=200]
→Read app\Services\Accounting\FiscalYearClosureService.php [limit=30, offset=190]
→Read app\Services\ReportService.php [limit=20, offset=555]
+ Thought: 259ms
→Read app\Services\ReportService.php [limit=30, offset=1555]
→Read app\Services\ReportService.php [limit=20, offset=625]
→Read resources\js\pages\documents\CommercialDocumentsPage.tsx [limit=30, offset=278]
+ Thought: 169ms
→Read resources\js\pages\invoices\InvoicesPage.tsx [limit=30, offset=833]
→Read resources\js\pages\invoices\InvoicesPage.tsx [limit=30, offset=995]
→Read resources\js\pages\invoices\InvoicesPage.tsx [limit=30, offset=1130]
+ Thought: 6ms
→Read resources\js\pages\invoices\InvoicesPage.tsx [limit=30, offset=1178]
→Read resources\js\pages\documents\QuickSaleModal.tsx [limit=40, offset=510]
→Read resources\js\pages\debts\TransactionHistoryModal.tsx [limit=20, offset=270]
+ Thought: 534ms
→Read resources\js\pages\pos\POSPage.tsx [limit=25, offset=776]
→Read resources\js\pages\pos\POSPage.tsx [limit=15, offset=1090]
→Read resources\js\pages\pos\POSPage.tsx [limit=15, offset=1428]
+ Thought: 7ms
→Read resources\js\pages\settings\print-settings\types\data\DocumentDataBuilder.ts [limit=30, offset=455]
→Read resources\js\pages\documents\components\ReturnDocumentModal.tsx [limit=20, offset=30]
→Read resources\js\lib\api\endpoints\partyBalances.ts [limit=20, offset=168]
+ Thought: 140ms
→Read resources\js\pages\settings\print-settings\types\data\DocumentDataBuilder.ts [limit=15, offset=484]
→Read resources\js\pages\settings\print-settings\types\data\UniversalDocumentData.ts [limit=30, offset=100]
→Read resources\js\lib\api\endpoints\documents.ts [limit=50, offset=38]
+ Thought: 211ms
→Read app\Http\Controllers\Api\V1\DocumentComputeController.php [limit=30, offset=125]
→Read resources\js\pages\pos\POSKioskPage.tsx [limit=20, offset=76]
→Read resources\js\pages\pos\POSKioskPage.tsx [limit=15, offset=340]
+ Thought: 8ms
→Read resources\js\pages\debts\TransactionHistoryModal.tsx [limit=15, offset=780]
→Read resources\js\pages\documents\QuickSaleModal.tsx [limit=15, offset=620]
→Read resources\js\pages\documents\QuickSaleModal.tsx [limit=15, offset=1420]
+ Thought: 444ms
→Read app\Http\Requests\UpdateCommercialDocumentRequest.php 
→Read resources\js\pages\documents\components\BulkImportModal.tsx [limit=20, offset=98]
→Read resources\js\lib\api\endpoints\posSession.ts [limit=15, offset=198]
+ Thought: 10ms
Now let me check the complete CommercialDocumentLineResource to see if it exposes base_quantity:
→Read app\Http\Resources\CommercialDocumentLineResource.php 
→Read app\Services\ComputeLineService.php [limit=70, offset=1]
+ Thought: 268ms
Now let me verify the StockMovement model's quantity to understand the full picture:
✱Grep "class StockMovement" in app\Models (2 matches)
→Read app\Models\StockMovement.php [limit=30, offset=1]
+ Thought: 40.7s
Now I have a complete picture. Let me also verify the delivered_quantity / returned_quantity semantics:
→Read app\Models\CommercialDocumentLine.php [limit=10, offset=93]
✱Grep "returned_quantity|delivered_quantity" in app (12 matches)
+ Thought: 36.2s
Now I have a complete understanding. Let me compile the comprehensive table. Let me first check one more thing - how the frontend POS sends quantity vs. the document form:
→Read resources\js\pages\pos\POSPage.tsx [limit=20, offset=986]
+ Thought: 44.4s
Now I have enough information to compile the complete audit. Here is the comprehensive table of all commercial_document_lines.quantity references.
Key Semantics
Before the table, here is the data model:
Field	Meaning
quantity (DB column)	Raw quantity as stored — what the frontend sends. For POS: packaging units. For document form: already multiplied by _packQty before sending (see buildPayload).
packaging_units_snapshot	Frozen ProductPackaging.quantity at time of sale
$line->base_quantity (accessor)	quantity * (packaging_units_snapshot ?? 1)
SQL equivalent	cdl.quantity * COALESCE(cdl.packaging_units_snapshot, 1)
The frontend buildPayload() (useDocumentForm.ts:1171) sends effectiveQty = calc.baseQty = line.quantity * packQty, so the DB quantity column already holds base units for document-form-created lines. The POS (POSPage.tsx:993) sends i.quantity directly (the cart's display quantity, which is packaging-level).
This inconsistency is the core of the problem. For POS-created lines, quantity = packaging count; for document-form-created lines, quantity = base units. The getBaseQuantityAttribute() accessor (quantity * packaging_units_snapshot) is correct for POS lines but double-counts for document-form lines.
Complete Audit Table
PHP Backend — Eloquent Model Access
#	File	Line	Code	Uses base_quantity?	Needs fix?
1	app/Models/CommercialDocumentLine.php	96	$this->quantity - $this->delivered_quantity - $this->returned_quantity	No	YES — getRemainingQuantity() should subtract base quantities to stay consistent. If delivered_quantity and returned_quantity are also stored at the same level as quantity, this is internally consistent but semantically wrong if callers expect base units. Flag for review.
2	app/Models/CommercialDocumentLine.php	97	getBaseQuantityAttribute(): return round($this->quantity * ($this->packaging_units_snapshot ?? 1), 4)	This IS the fix	No — this is the canonical accessor
3	app/Observers/CommercialDocumentLineObserver.php	59	$qty = (float) ($line->quantity ?? 0); then line 72: $gross = $qty * $price;	No	YES — The observer computes total_ht = quantity * unit_price_ht. If quantity is packaging-level (POS path), this gives wrong total_ht. Should use $line->base_quantity to compute gross, OR ensure unit_price_ht is always at the same level as quantity.
4	app/Services/CommercialDocumentService.php	490	'quantity' => (float) $lineData['quantity']	No (store)	OK — stores whatever the caller sends
5	app/Services/CommercialDocumentService.php	508	$qty = (float) ($line['quantity'] ?? 0); in computeLineTotals	No	YES — Same issue as #3. computeLineTotals computes gross = qty * price. Should use the base quantity if unit_price_ht is per base unit.
6	app/Services/CommercialDocumentService.php	675-676	round((float) $line->quantity * (float) $line->packaging_units_snapshot, 4) / (float) $line->quantity	Converts to baseQty	Already correct — this IS the quantity → baseQty conversion
7	app/Services/CommercialDocumentService.php	856	->sum('quantity') on StockMovement (not cdl)	N/A	OK — StockMovement quantity is always base units (set by createStockMovements line 723)
8	app/Services/CommercialDocumentService.php	866	->sum('quantity') on StockMovement (not cdl)	N/A	OK — same as #7
PHP Backend — Document Return & Conversion
#	File	Line	Code	Uses base_quantity?	Needs fix?
9	app/Services/DocumentReturnService.php	51-52	$maxReturnable = $sourceLine->quantity - $sourceLine->returned_quantity	No	YES — If a packaged item has quantity=2 (cartons) and returned_quantity=1, this shows maxReturnable=1 but it should be 12 base units returned. Must use base_quantity and ensure returned_quantity is also tracked in base units.
10	app/Services/DocumentReturnService.php	54	if ($returnLine['quantity'] > $maxReturnable)	No	YES — Same units mismatch as #9
11	app/Services/DocumentReturnService.php	64	'quantity' => $returnLine['quantity']	No	OK — pass-through to create(), caller's responsibility
12	app/Services/DocumentReturnService.php	92	->increment('returned_quantity', $returnLine['quantity'])	No	YES — If the return quantity is in base units but returned_quantity was tracked in packaging units (or vice versa), this is inconsistent. Must align units.
13	app/Services/DocumentReturnService.php	97	$l->returned_quantity >= $l->quantity	No	YES — Compares returned_quantity against quantity. If both are in the same (packaging-level) units, this is internally consistent. But callers may expect base-unit semantics. Flag for review.
14	app/Services/DocumentConversionService.php	79	'quantity' => $line->quantity	No	YES — Copies raw quantity to new document. For POS-created lines (packaging-level), the new document will also have packaging-level quantity, but the document form will interpret it as base units. Should copy base_quantity to ensure consistency.
15	app/Services/DocumentConversionService.php	110	$sourceLine->increment('delivered_quantity', $sourceLine->quantity)	No	YES — Increments delivered_quantity by packaging-level quantity. If delivered_quantity is tracked in base units (as getRemainingQuantity() assumes), this is wrong.
16	app/Services/DocumentConversionService.php	115	$l->delivered_quantity >= $l->quantity	No	YES — Same units comparison issue as #13
PHP Backend — SQL/Raw Queries (cdl.quantity)
#	File	Line	Code	Uses base_quantity?	Needs fix?
17	app\Services\ReportService.php	57	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as doc_cost_ht	No	YES — Cost computation uses raw quantity. If cost_price_ht is per base unit, the product is wrong for POS lines. Should use cdl.quantity * COALESCE(cdl.packaging_units_snapshot, 1) for the quantity factor.
18	app\Services\ReportService.php	81	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty	No	YES — Reporting total quantity sold. For POS lines, quantity is packaging-level. Should use base_quantity to report consistent base-unit counts.
19	app\Services\ReportService.php	83	SUM(... cdl.quantity * cdl.cost_price_ht ...) as total_cost	No	YES — Same cost issue as #17
20	app\Services\ReportService.php	203	SUM(CASE WHEN dt.code = 'AA' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty	No	YES — Same as #18 (debit notes)
21	app\Services\ReportService.php	356	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty	No	YES — Same as #18 (another report context)
22	app\Services\ReportService.php	540	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_sold	No	YES — Product stock report, quantity sold
23	app\Services\ReportService.php	542	SUM(... cdl.quantity * cdl.cost_price_ht ...) as sales_cost	No	YES — Same cost issue as #17
24	app\Services\ReportService.php	752	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty	No	YES — Same as #18
25	app\Services\ReportService.php	804	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty	No	YES — Same as #18
26	app\Services\ReportService.php	806	SUM(... cdl.quantity * cdl.cost_price_ht ...) as total_cost	No	YES — Same cost issue as #17
27	app\Services\ReportService.php	997	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty	No	YES — Same as #18
28	app\Services\ReportService.php	999	SUM(... cdl.quantity * cdl.cost_price_ht ...) as total_cost	No	YES — Same cost issue as #17
29	app\Services\ReportService.php	1158	SUM(cdl.quantity) as total_qty	No	YES — Total quantity without doc-type sign logic
30	app\Services\ReportService.php	1251	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END)	No	YES — Sales cost computation
31	app\Services\ReportService.php	1327	SUM(cdl.quantity) as total_qty	No	YES — Same as #29
32	app\Services\PartyBalanceService.php	267	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as doc_cost_ht	No	YES — Cost computation for party balance
33	app\Services\PartyBalanceService.php	373	SUM(... cdl.quantity ...) as total_quantity	No	YES — Product quantity for party balance report
34	app\Services\PartyBalanceService.php	456	SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as sale_qty	No	YES — Sale quantity for cost/margin
35	app\Services\PartyBalanceService.php	457	SUM(... cdl.quantity * cdl.cost_price_ht ...) as cost_ht	No	YES — Same cost issue as #17
36	app\Services\PartyBalanceService.php	565	'cdl.quantity' in select	No	YES — Fetches raw quantity for line display/cost computation. Line 583: $qty = (float) $line->quantity; used in $lineCost = $sign * $qty * $cost.
37	app\Services\PartyBalanceService.php	583	$qty = (float) $line->quantity; then $lineCost = $sign * $qty * $cost;	No	YES — Cost computation
38	app\Services\DashboardService.php	89	SUM(quantity) as total_qty (on CommercialDocumentLine)	No	YES — Top products total quantity
39	app\Services\CustomerInsightService.php	106	SUM(commercial_document_lines.quantity) as total_qty	No	YES — Customer top products qty
40	app\Services\ProductSuggestionService.php	25	SUM(commercial_document_lines.quantity) as total_qty	No	YES — Product suggestion ranking by qty
41	app\Services\Fiscal\SubsidizedSalesService.php	162	SUM(cdl.quantity * cdl.unit_price_ht) as total_revenue	No	YES — Revenue computation. If unit_price_ht is per base unit, raw quantity gives wrong revenue for POS lines.
42	app\Services\Fiscal\SubsidizedSalesService.php	163	SUM(cdl.quantity) as total_qty	No	YES — Total qty for subsidized sales
43	app\Services\Fiscal\IFUDeclarationService.php	199	COALESCE(cdl.quantity, 0) * cdl.unit_price_ht	No	YES — IFU base amount. If unit_price_ht is per base unit, raw quantity gives wrong result for POS lines.
44	app\Services\Fiscal\IFUDeclarationService.php	248	COALESCE(cdl.quantity, 0) * cdl.unit_price_ht	No	YES — Same as #43 (margin computation)
45	app\Services\Accounting\FiscalYearClosureService.php	200	THEN quantity (on stock_movements, not cdl)	N/A	OK — StockMovement quantity is always base units
46	app\Services\FiscalYearClosureService.php	212-213	sm.quantity (on stock_movements, not cdl)	N/A	OK — StockMovement quantity is always base units
PHP Backend — Validation & Requests
#	File	Line	Code	Uses base_quantity?	Needs fix?
47	app\Http\Requests\StoreCommercialDocumentRequest.php	65-74	'lines.*.quantity' => ['required', 'numeric', 'min:0.0001', ...] fractional check	No	REVIEW — The validation checks if quantity is fractional for non-weight, non-packaging products. If quantity will always be packaging-level after the fix, this check may need to apply to base_quantity instead (e.g., 1.5 cartons might be valid even if each carton contains integer bottles).
48	app\Http\Requests\UpdateCommercialDocumentRequest.php	55-64	Same fractional validation as #47	No	REVIEW — Same as #47
PHP Backend — Other
#	File	Line	Code	Uses base_quantity?	Needs fix?
49	app\Http\Resources\CommercialDocumentLineResource.php	19	'quantity' => $this->quantity	No	YES — API resource only exposes raw quantity. The frontend must either: (a) also expose base_quantity, or (b) the frontend must multiply by packaging_units_snapshot itself. Currently the DocumentDataBuilder.ts:485 does this division on the frontend. Consider adding 'base_quantity' => $this->base_quantity to the resource.
50	app\Services\DocumentMailService.php	66	"{$line->quantity} × {$line->unit_price_ht} دج"	No	YES — Display in email. If quantity is packaging-level, this shows wrong "2 × 100" instead of "24 × 100". Should use $line->base_quantity or display both.
51	app\Http\Controllers\Api\V1\DocumentComputeController.php	133	'lines.*.quantity' => 'required|numeric|min:0.001' (return validation)	No	OK — validates input format, not units
PHP Backend — Non-CDL quantity (excluded from scope)
File	Line	Table	Notes
InventoryValuationService.php	43-46, 64-165	stock_movements.quantity	Excluded — SM quantity is always base units
FiscalYearClosureService.php	212-221	stock_movements.quantity	Excluded — SM quantity is always base units
Accounting/FiscalYearClosureService.php	200-203	stock_movements.quantity	Excluded — SM quantity is always base units
InventoryReportService.php	40-42, 90	stock_movements.quantity	Excluded — SM quantity is always base units
ReportService.php	567, 635, 1561, 1578-1580, 1593	stock_movements.quantity	Excluded — SM quantity is always base units
DashboardService.php	147, 152	stock_movements.quantity	Excluded — SM quantity is always base units
ComputeLineService.php	25, 54, 60	$input['quantity'] / $packaging->quantity	Excluded — input parameter / ProductPackaging, not cdl
ImportService.php	231	'quantity' => 1 (packaging creation)	Excluded — ProductPackaging creation
StockMovementResource.php	23	$this->quantity	Excluded — SM resource
ProductPackagingResource.php	18	$this->quantity	Excluded — ProductPackaging resource
TypeScript/JavaScript Frontend — Document Lines
#	File	Line	Code	Uses base_quantity?	Needs fix?
52	resources/js/pages/documents/utils/document.utils.ts	7	Comment: quantity = وحدات أساسية دائماً	N/A (comment)	YES — Comment says "quantity = base units always" which is wrong for POS lines. Should document the actual dual semantics.
53	resources/js/pages/documents/utils/document.utils.ts	121	const baseQty = Math.round(line.quantity * packQty * 1_000_000) / 1_000_000	No	REVIEW — Frontend LineItem.quantity = display qty (packaging units), multiplied by packQty to get baseQty. This is correct for the frontend's internal model. But note: line.quantity here is the frontend display quantity, not the DB column.
54	resources/js/pages/documents/utils/document.utils.ts	296	const baseQty = Math.round(line.quantity * (line._packQty > 1 ? line._packQty : 1) * 1000) / 1000	No	OK — Stock validation, correctly computes baseQty from frontend display qty
55	resources/js/pages/documents/hooks/useDocumentForm.ts	254, 258, 313	Comments: quantity = وحدات أساسية / quantity = عدد العبوات = db.quantity / packQty	N/A	REVIEW — Comments are internally contradictory (line 254 says "base units", line 258 says "display units"). The code at line 313 does displayQty = dbQty / packQty, confirming DB stores base units.
56	resources/js/pages/documents/hooks/useDocumentForm.ts	842, 925, 980	quantity: L.quantity / quantity: patch.quantity / quantity: line.quantity ?? 1	No	OK — Frontend line quantity (display/packaging units) passed to compute endpoint
57	resources/js/pages/documents/hooks/useDocumentForm.ts	1171, 1183	const effectiveQty = calc.baseQty; / quantity: effectiveQty	Converts to base	OK — buildPayload correctly sends base units to backend
58	resources/js/pages/documents/hooks/useCommercialDocumentController.ts	495	quantity: l.quantity * (l._packQty || 1)	Converts to base	OK — Export correctly computes base units
59	resources/js/pages/documents/CommercialDocumentsPage.tsx	286	const qty = Number(line.quantity ?? 1)	No	YES — Used for DeliveryProgressBar quantity. If DB quantity is base units, this is correct. If it's packaging-level (POS lines), this shows wrong delivery progress. Should use a consistent unit.
60	resources/js/pages/documents/CommercialDocumentsPage.tsx	293	{String(line.quantity ?? "")}	No	REVIEW — Displays raw DB quantity in the table. Should display base units for consistency.
61	resources/js/pages/documents/CommercialDocumentsPage.tsx	297	quantity={qty} on DeliveryProgressBar	No	YES — Passes raw quantity to delivery progress. Same issue as #59.
62	resources/js/pages/documents/components/ReturnDocumentModal.tsx	31	const qty = Number(l.quantity ?? 0)	No	YES — Filters returnable lines by comparing qty > returned. If quantity is packaging-level but returned_quantity is base-level (or vice versa), this is wrong.
63	resources/js/pages/documents/components/ReturnDocumentModal.tsx	40	max_quantity: Number(l.quantity ?? 0) - Number(l.returned_quantity ?? 0)	No	YES — Same units mismatch as #62.
64	resources/js/pages/documents/components/ReturnDocumentModal.tsx	41	return_qty: Number(l.quantity ?? 0) - Number(l.returned_quantity ?? 0)	No	YES — Same as #63.
65	resources/js/pages/documents/QuickSaleModal.tsx	47	quantity: number (QuickLine type)	N/A	OK — Type definition
66	resources/js/pages/documents/QuickSaleModal.tsx	515	const lineHt = l.price * l.quantity	No	REVIEW — QuickSale sends quantity directly to backend (line 627: quantity: l.quantity). The backend observer then computes total_ht = quantity * unit_price_ht. If QuickSale's l.quantity is packaging-level but unit_price_ht is per base unit, total_ht is wrong.
67	resources/js/pages/documents/QuickSaleModal.tsx	538, 543-544	if (l.quantity <= 0) / l.quantity > prod.current_stock	No	YES — Stock validation compares l.quantity against current_stock. If l.quantity is packaging-level but current_stock is base units, this comparison is wrong.
68	resources/js/pages/documents/QuickSaleModal.tsx	627	quantity: l.quantity	No	YES — Sends raw quantity to backend without base-unit conversion. Unlike the document form's buildPayload, this doesn't multiply by packQty.
69	resources/js/pages/documents/QuickSaleModal.tsx	1426	const ht = l.price * l.quantity	No	YES — Same issue as #66 (calcLine helper)
70	resources/js/pages/documents/types/document.types.ts	188	quantity: number (LineItem type)	N/A	OK — Type definition. The frontend's LineItem.quantity = display/packaging units.
71	resources/js/pages/documents/components/BulkImportModal.tsx	106	quantity: r.quantity	No	OK — Sets frontend line quantity from import (display units)
72	resources/js/pages/documents/components/LineCard.tsx	171, 200	line.quantity - 1 / line.quantity + 1	No	OK — Increments/decrements display quantity
TypeScript/JavaScript Frontend — POS Path
#	File	Line	Code	Uses base_quantity?	Needs fix?
73	resources/js/pages/pos/POSPage.tsx	694	quantity: Number(line.quantity) (re-opening doc)	No	REVIEW — Reads raw DB quantity into cart. If DB has base units (from document form), cart shows base-unit count. If DB has packaging count (from POS), cart shows packaging count. Inconsistent.
74	resources/js/pages/pos/POSPage.tsx	785-786	sellingHt: i.unit_price_ht * i.quantity / costHt: cost * i.quantity	No	YES — Margin calculation. If i.quantity is packaging-level and unit_price_ht is per base unit, this is wrong.
75	resources/js/pages/pos/POSPage.tsx	993	quantity: i.quantity (sending to API)	No	YES — POS sends raw cart quantity without multiplying by packQty. If unit_price_ht is per base unit, the backend total_ht = quantity * unit_price_ht will be wrong for packaged items.
76	resources/js/pages/pos/POSPage.tsx	1001-1004	l.quantity * l.unit_price_ht * (1 - l.discount_percentage / 100)	No	YES — Client-side total_ht calculation. Same issue as #75.
77	resources/js/pages/pos/POSPage.tsx	1099	qty: i.quantity (receipt snapshot)	No	YES — Receipt displays raw quantity. If it's packaging-level, receipt shows "2 × 1200" instead of "24 × 100".
78	resources/js/pages/pos/POSPage.tsx	1435	qty: i.quantity (another receipt snapshot)	No	YES — Same as #77
79	resources/js/pages/pos/POSKioskPage.tsx	86	qty: i.quantity (receipt snapshot)	No	YES — Same as #77
80	resources/js/pages/pos/POSKioskPage.tsx	209	quantity: i.quantity (sending to API)	No	YES — Same as #75, Kiosk path
81	resources/js/pages/pos/POSKioskPage.tsx	348	×{item.quantity} (cart display)	No	REVIEW — Display only. Shows whatever the cart's quantity is.
82	resources/js/pos/components/CartRow.tsx	509	{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}	No	REVIEW — Display only.
TypeScript/JavaScript Frontend — Invoices Page
#	File	Line	Code	Uses base_quantity?	Needs fix?
83	resources/js/pages/invoices/InvoicesPage.tsx	841	{line.quantity}	No	REVIEW — Displays raw DB quantity. Should display base units.
84	resources/js/pages/invoices/InvoicesPage.tsx	1005-1008	l.unit_price_ht * l.quantity * (1 - l.discount_percentage / 100)	No	YES — Local totals computation. If l.quantity is packaging-level and unit_price_ht is per base unit, HT is wrong.
85	resources/js/pages/invoices/InvoicesPage.tsx	1138-1141	line.unit_price_ht * line.quantity * (1 - line.discount_percentage / 100) * (1 + line.tva_rate / 100)	No	YES — TTC computation for line display. Same issue as #84.
86	resources/js/pages/invoices/InvoicesPage.tsx	1187, 1199-1202	value={line.quantity} / quantity: +e.target.value	No	OK — Input field for quantity
TypeScript/JavaScript Frontend — API Types & Transforms
#	File	Line	Code	Uses base_quantity?	Needs fix?
87	resources/js/lib/api/endpoints/documents.ts	46	quantity: number in DocumentLineInput	N/A	OK — Type definition
88	resources/js/lib/api/endpoints/documents.ts	61, 75	quantity: number in ComputeLineInput / ComputeLineResult	N/A	OK — Compute types
89	resources/js/lib/api/endpoints/partyBalances.ts	177	quantity: Number(l.quantity ?? 0)	No	REVIEW — Maps raw backend quantity. Depends on what the API returns.
90	resources/js/pages/debts/TransactionHistoryModal.tsx	275	quantity: line.quantity	No	REVIEW — Passes raw quantity for display
91	resources/js/pages/debts/TransactionHistoryModal.tsx	787	{fmtNumber(line.quantity)} × {fmtNumber(line.unit_price_ht)} دج	No	YES — Displays qty × price. If quantity is packaging-level but unit_price_ht is per base unit, display is wrong.
TypeScript/JavaScript Frontend — Print Pipeline
#	File	Line	Code	Uses base_quantity?	Needs fix?
92	resources/js/pages/settings/print-settings/types/data/DocumentDataBuilder.ts	485	quantity: (() => { const pq = line.packaging?.quantity; return pq ? num(line.quantity) / Number(pq) : num(line.quantity); })()	Divides by packQty	YES — Assumes DB quantity is base units and divides by packQty to get display quantity for printing. For POS lines where quantity is already packaging-level, this double-divides (e.g., 2 / 12 = 0.17). Should use a consistent source of truth.
93	resources/js/pages/settings/print-settings/services/PrintFieldResolver.ts	136	quantity: 'item.quantity'	No	REVIEW — Maps field ID to data path. The resolved value depends on what DocumentDataBuilder puts in item.quantity (#92).
TypeScript/JavaScript Frontend — Dashboard & Reports
#	File	Line	Code	Uses base_quantity?	Needs fix?
94	resources/js/lib/api/endpoints/dashboard.ts	12	quantity: number in TopProduct interface	N/A	OK — Type definition (mirrors backend)
95	resources/js/lib/api/endpoints/reports.ts	612	quantity: number in stock movement type	N/A	OK — Stock movement type
96	resources/js/lib/api/endpoints/posSession.ts	74, 205	quantity: number / quantity: i.quantity	No	REVIEW — Session items track quantity as-is from cart.
TypeScript/JavaScript Frontend — Document Types
#	File	Line	Code	Uses base_quantity?	Needs fix?
97	resources/js/pages/documents/types/document.types.ts	39	quantity: number in Packaging interface	N/A	OK — This is ProductPackaging.quantity (units per package), not cdl.quantity
98	resources/js/pages/documents/types/document.types.ts	188	quantity: number in line type	N/A	OK — Frontend line quantity (display/packaging units)
99	resources/js/pages/documents/types/document.types.ts	265	{ key: 'quantity', label: 'الكمية', w: 75, fixed: true }	N/A	OK — Column config
TypeScript/JavaScript Frontend — Print Settings Types
#	File	Line	Code	Uses base_quantity?
100	resources/js/pages/settings/print-settings/types/data/UniversalDocumentData.ts	109	`quantity: number	 
▣  Explore · Big Pickle
Explore(4 of 4)103.3K (52%)Parent up
