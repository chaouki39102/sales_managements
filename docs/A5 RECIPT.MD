Find where `DeliveryReceiptA5` is called from and how the `data` prop (UniversalDocumentData) is constructed/passed. Search in:
1. `UniversalPreview.tsx` - how it routes to DeliveryReceiptA5
2. How `data` is built before being passed to the preview components
3. Any `DocumentDataBuilder`, `fromPOSSnapshot`, `fromApiResponse`, or similar builders

Return full file paths, line numbers, and the relevant code that constructs the data object.
+ Thought: 101ms
✱Grep "DeliveryReceiptA5" (4 matches)
✱Grep "DocumentDataBuilder"
✱Grep "fromPOSSnapshot"
✱Grep "fromApiResponse"
+ Thought: 665ms
→Read resources\js\pages\settings\print-settings\components\preview\UniversalPreview.tsx
→Read resources\js\pages\settings\print-settings\components\preview\DeliveryReceiptA5.tsx
✱Grep "class DocumentDataBuilder"
✱Grep "UniversalDocumentData" in resources\js\reporting (64 matches)
+ Thought: 462ms
Now let me read the key files: the DocumentDataBuilder, the UniversalDocumentData type definition, and where UniversalPreview is consumed (to trace how data is built).
→Read resources\js\pages\settings\print-settings\types\data\DocumentDataBuilder.ts
→Read resources\js\pages\settings\print-settings\types\data\UniversalDocumentData.ts
✱Grep "from '@/reporting|from '.*reporting.*runtime|UniversalPrintPipeline|UniversalPreview" in resources\js (23 matches)
+ Thought: 572ms
Now let me read the UniversalPrintPipeline and the key callers to trace the full data flow:
→Read resources\js\pages\settings\print-settings\runtime\UniversalPrintPipeline.tsx
→Read resources\js\pages\settings\print-settings\components\PreviewSelector.tsx
→Read resources\js\pages\settings\print-settings\components\shared\TemplatePrintModal.tsx
→Read resources\js\pos\components\ProfessionalReceipt.tsx
+ Thought: 753ms
Now let me check how POSPage and the commercial document modal build their PipelineSource and CompanyInfo:
✱Grep "PipelineSource|posSaleSnapshot|receiptSource|fromPOSSnapshot|fromApiDocument" in resources\js\pages\pos (17 matches)
✱Grep "PipelineSource|fromApiDocument|CommercialDocumentModal" in resources\js\pages\documents (14 matches)
→Read resources\js\pages\settings\print-settings\types\data\index.ts
+ Thought: 1.2s
→Read resources\js\pages\pos\POSPage.tsx [offset=250, limit=40]
→Read resources\js\pages\pos\POSPage.tsx [offset=870, limit=30]
→Read resources\js\pages\pos\POSPage.tsx [offset=1430, limit=30]
→Read resources\js\pages\pos\POSKioskPage.tsx [offset=60, limit=60]
+ Thought: 387ms
→Read resources\js\pages\documents\CommercialDocumentModal\index.tsx
+ Thought: 596ms
Now let me find where mapCompany and companyInfo are defined, and the renderPreviewToHtml helper:
✱Grep "function mapCompany|export.*mapCompany" (1 match)
✱Grep "function mapCompany|export.*mapCompany" (1 match)
✱Grep "renderPreviewToHtml" (4 matches)
✱Grep "companyInfo.*=.*useMemo|const companyInfo" in resources\js\pages\documents\hooks (1 match)
+ Thought: 1.2s
→Read resources\js\pages\settings\print-settings\runtime\PrintRuntimeAdapter.tsx
→Read resources\js\pages\documents\hooks\useCommercialDocumentController.ts [offset=325, limit=30]
→Read resources\js\pages\settings\print-settings\runtime\renderPreviewToHtml.ts
→Read resources\js\pages\settings\print-settings\template-library\TemplateLibraryModal.tsx [offset=440, limit=30]
+ Thought: 415ms
Let me check the mock data used in the Template Library, and also the CompanyData type used in the preview:
→Read resources\js\pages\settings\print-settings\template-library\mockData.ts
→Read resources\js\pages\settings\print-settings\template-library\registry.ts
✱Grep "export interface CompanyData" in resources\js\pages\settings\print-settings\components\preview
+ Thought: 274ms
Let me also read the shared.tsx to see the CompanyData type definition and the POSPage snapshot construction:
✱Grep "CompanyData|export interface" in resources\js\pages\settings\print-settings\components\preview (1 match)
→Read resources\js\pages\pos\POSPage.tsx [limit=80, offset=70]
+ Thought: 204ms
→Read resources\js\pages\settings\print-settings\components\preview\shared.tsx [offset=85, limit=30]
+ Thought: 3ms
Here is a complete trace of how DeliveryReceiptA5 is called and how its data prop (UniversalDocumentData) is constructed and passed.
1. UniversalPreview.tsx -- Routing to DeliveryReceiptA5
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\components\preview\UniversalPreview.tsx
Lines 57-146:
The routing decision is on line 63:
const isDeliveryA5 = tpl.doc_type_code === 'BL' && tpl.paper_size === 'A5';
And the conditional render is on lines 125-141:
{isDeliveryA5 ? (
  <DeliveryReceiptA5 tpl={tpl} data={data} />      // line 126
) : (
  // ... standard section renderers (header, doc-info, items, totals, payments, footer)
)}
The data prop is typed as UniversalDocumentData (imported from ../../types/data on line 2) and is received directly from the UniversalPreviewProps interface (lines 20-23):
export interface UniversalPreviewProps {
  tpl:      PrintTemplate;
  data:     UniversalDocumentData;
}
UniversalPreview is a pure pass-through -- it does not transform the data object. Whatever the caller provides is what DeliveryReceiptA5 receives.
2. UniversalPrintPipeline -- The Central Data Builder
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\runtime\UniversalPrintPipeline.tsx
This is the single print pipeline that ALL consumers use. It constructs UniversalDocumentData from a PipelineSource union type and passes it to UniversalPreview.
Lines 35-39 -- PipelineSource type:
export type PipelineSource =
  | { type: 'api-document';    doc: Record<string, unknown>; options?: { prevBalance?: number; newBalance?: number } }
  | { type: 'pos-snapshot';    snapshot: POSSaleSnapshot }
  | { type: 'session-report';  session: Record<string, unknown> }
  | { type: 'prebuilt';        data: UniversalDocumentData };
Lines 53-76 -- The useMemo that builds data:
const data: UniversalDocumentData = useMemo(() => {
  switch (source.type) {
    case 'prebuilt':        return source.data;
    case 'api-document':    return DocumentDataBuilder.fromApiDocument(source.doc, company ?? {} as CompanyInfo, source.options);
    case 'pos-snapshot':    return DocumentDataBuilder.fromPOSSnapshot(source.snapshot, company ?? {} as CompanyInfo);
    case 'session-report':  return DocumentDataBuilder.fromSessionReport(source.session, company ?? {} as CompanyInfo);
    default:                return DocumentDataBuilder.empty();
  }
}, [source, company]);
Then on line 72, the built data is passed to UniversalPreview:
<UniversalPreview tpl={template} data={data} />
There is also a parallel path for popup printing via renderPipelineToPopup (lines 118-139) which uses the standalone buildData() function (lines 141-148) -- identical logic:
function buildData(source: PipelineSource, company: CompanyInfo | null): UniversalDocumentData {
  switch (source.type) {
    case 'prebuilt':       return source.data;
    case 'api-document':   return DocumentDataBuilder.fromApiDocument(source.doc, company ?? {} as CompanyInfo, source.options);
    case 'pos-snapshot':   return DocumentDataBuilder.fromPOSSnapshot(source.snapshot, company ?? {} as CompanyInfo);
    case 'session-report': return DocumentDataBuilder.fromSessionReport(source.session, company ?? {} as CompanyInfo);
    default:               return DocumentDataBuilder.empty();
  }
}
3. DocumentDataBuilder -- The 3 Builder Methods
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\types\data\DocumentDataBuilder.ts
3a. fromApiDocument() (lines 181-220)
Builds UniversalDocumentData from a full CommercialDocument API response. Used by commercial document printing (TemplatePrintModal, batch print).
fromApiDocument(doc: ApiDocument, company: CompanyInfo, options?: { prevBalance?; newBalance? }): UniversalDocumentData {
  const lines  = buildLinesFromApi(doc.lines ?? []);
  const totals = buildTotalsFromApi(doc, lines);
  // Balance from backend SSOT (doc.balance_data), fallback to options
  return {
    doc: buildDocInfo(doc), company, party: buildPartyFromApi(doc.party),
    warehouse: buildWarehouseFromApi(doc.warehouse), session: null,
    lines, totals, taxBreakdown: buildTaxBreakdown(lines),
    payments: buildPaymentsFromApi(doc.payments ?? []),
    balance, currency: buildCurrencyFromApi(doc.currency), computed: {},
  };
}
3b. fromPOSSnapshot() (lines 226-275)
Builds UniversalDocumentData from a POSSaleSnapshot. Used by POS printing (POSPage, POSKioskPage).
fromPOSSnapshot(snapshot: POSSaleSnapshot, company: CompanyInfo, sessionInfo?: SessionInfo | null): UniversalDocumentData {
  const lines = buildLinesFromSnapshot(snapshot.items);
  const totals: DocumentTotals = {
    totalHt: snapshot.totals.total_ht, totalTva: snapshot.totals.total_tva,
    totalTtc: snapshot.totals.total_ttc, fiscalStamp: snapshot.totals.fiscal_stamp,
    totalDiscount: snapshot.totals.total_discount, paid: snapshot.totals.paid,
    change: snapshot.totals.change, remaining: snapshot.totals.remaining,
  };
  return {
    doc: { number: snapshot.docNumber, date: snapshot.docDate, typeCode: 'POS', ... },
    company, party: snapshot.client ? { name: ..., nif: ..., ... } : null,
    session: sessionInfo ?? null, warehouse: null,
    lines, totals, taxBreakdown: buildTaxBreakdown(lines),
    payments: snapshot.payments.map(p => ({ mode: p.mode, amount: p.amount })),
    balance: buildBalance(snapshot.prevBalance, snapshot.newBalance),
    currency: { code: 'DZD', symbol: 'دج', rate: 1 }, computed: {},
  };
}
3c. fromSessionReport() (lines 290-372)
Builds UniversalDocumentData from a POS session report. Used for session report printing.
3d. empty() (line 281-283)
Returns emptyDocumentData() -- a structurally valid but empty data object for preview placeholders.
4. All Callers That Feed Data to DeliveryReceiptA5
4a. POSPage -- POS Receipt (pos-snapshot path)
File: D:\xampp\htdocs\sales-management\resources\js\pages\pos\POSPage.tsx
- Line 259: const [receiptSnapshot, setReceiptSnapshot] = useState<POSSaleSnapshot | null>(null);
- Lines 266-269: Wraps snapshot into PipelineSource:
const receiptSource = useMemo((): PipelineSource | null => {
  if (!receiptSnapshot) return null;
  return { type: 'pos-snapshot', snapshot: receiptSnapshot };
}, [receiptSnapshot]);
- Line 870: Company mapped via mapCompany:
const companyData: CompanyPreviewData | null = useMemo(() => mapCompany(company), [company]);
- Lines 1438-1450: Passes to ProfessionalReceipt:
<ProfessionalReceipt template={posTemplate} company={companyData} source={receiptSource} ... />
- Lines 887-888: For thermal direct print, builds data inline:
const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? { name: '' });
const result = await printThermalViaWebUSBFromTemplate(posTemplate, data, resolvedDocNum);
4b. POSKioskPage -- Kiosk Receipt (pos-snapshot path)
File: D:\xampp\htdocs\sales-management\resources\js\pages\pos\POSKioskPage.tsx
- Lines 75-106: Builds POSSaleSnapshot from raw cart data:
const posSaleSnapshot = useMemo((): POSSaleSnapshot | null => {
  // ...maps receiptSnapshot items, totals, payments
}, [receiptSnapshot, lastDocNum]);
- Lines 108-111: Wraps into PipelineSource:
const receiptSource = useMemo((): PipelineSource | null => {
  if (!posSaleSnapshot) return null;
  return { type: 'pos-snapshot', snapshot: posSaleSnapshot };
}, [posSaleSnapshot]);
- Lines 248-250: For thermal print:
const data = DocumentDataBuilder.fromPOSSnapshot(snap, companyData ?? {} as any);
4c. CommercialDocumentModal -- Commercial Document Print (api-document path)
File: D:\xampp\htdocs\sales-management\resources\js\pages\documents\CommercialDocumentModal\index.tsx
- Line 335 (in useCommercialDocumentController.ts): Company info:
const companyInfo = mapCompany(useActiveCompany());
- Lines 509-521: Passes raw API document to TemplatePrintModal:
<TemplatePrintModal
  open={printModalOpen}
  document={existingDocument as Record<string, unknown>}
  company={companyInfo as any}
  template={selectedTemplate || undefined}
  templates={printTemplates}
  docTypeCode={docCode}
/>
4d. TemplatePrintModal -- Bridge to Pipeline (api-document or prebuilt path)
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\components\shared\TemplatePrintModal.tsx
- Lines 124-128: Builds PipelineSource:
const source = useMemo(() => {
  if (overrideData) return { type: 'prebuilt' as const, data: overrideData };
  if (document) return { type: 'api-document' as const, doc: document, company };
  return null;
}, [overrideData, document, company]);
- Line 162: Passes to pipeline:
<UniversalPrintPipeline source={source} template={tpl} company={company} />
4e. ProfessionalReceipt -- POS Preview Modal
File: D:\xampp\htdocs\sales-management\resources\js\pos\components\ProfessionalReceipt.tsx
- Line 53: Receives source as a prop and passes straight through:
<UniversalPrintPipeline source={source} template={template} company={company} />
4f. PreviewSelector -- Print Settings Page Preview
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\components\PreviewSelector.tsx
- Line 26: Passes data directly (or falls back to emptyDocumentData()):
<UniversalPreview tpl={tpl} data={data ?? emptyDocumentData()} />
4g. TemplateLibraryModal -- Library Preview (mock data)
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\template-library\TemplateLibraryModal.tsx
- Lines 456-459: Uses hardcoded mock data for library card previews:
<UniversalPreview tpl={entry.createConfig()} data={mockDataRef.current!} company={null} />
The mock data comes from:
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\template-library\mockData.ts
- Lines 5-123: getMockDocumentData() returns a hardcoded UniversalDocumentData with sample company, party, 3 items, totals, tax breakdown, and payments.
5. CompanyInfo / CompanyData Construction
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\runtime\PrintRuntimeAdapter.tsx
Lines 26-46 -- mapCompany() is the single function that converts the Zustand useActiveCompany() store into CompanyData:
export function mapCompany(ac: ReturnType<typeof useActiveCompany>): CompanyData | null {
  if (!ac) return null;
  return {
    name: ac.name ?? '', commercialName: (ac as any).commercial_name ?? '',
    address: ac.address ?? '', phone: ac.phone ?? '', mobile: ac.mobile ?? '',
    fax: ac.fax ?? '', email: ac.email ?? '', nif: ac.nif ?? '',
    rc: ac.rc ?? '', nis: ac.nis ?? '', article: (ac as any).ai ?? '',
    activity: ac.activity ?? '', capital: (ac as any).capital_amount ?? '',
    bankName: (ac as any).bank_name ?? '', rib: ac.rib ?? '',
    logoUrl: ac.avatar ?? null,
  };
}
The CompanyData interface is defined at:
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\components\preview\shared.tsx, lines 90-107.
Note: CompanyData (preview-layer type) has all string fields. CompanyInfo (in UniversalDocumentData.ts, lines 39-57) has string | null fields. The DocumentDataBuilder accepts CompanyInfo and mapCompany returns CompanyData. The pipeline bridges them via company ?? {} as CompanyInfo.
6. UniversalDocumentData Type Definition
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\types\data\UniversalDocumentData.ts
Lines 249-280:
export interface UniversalDocumentData {
  doc:          DocumentInfo;        // number, date, type, status
  company:      CompanyInfo;         // company details
  party?:       PartyInfo | null;    // customer/supplier
  warehouse?:   WarehouseInfo | null;
  session?:     SessionInfo | null;  // POS session
  lines:        DocumentLine[];      // items
  totals:       DocumentTotals;      // HT, TVA, TTC, stamp, paid, change, remaining
  taxBreakdown: TaxRate[];           // per-rate TVA breakdown
  payments:     Payment[];           // payment methods used
  balance?:     BalanceInfo | null;  // party balance snapshot
  currency?:    CurrencyInfo;
  report?:      ReportSummary | null;// session report data
  computed:     Record<string, unknown>; // FormulaEngine results
}
Summary: The Complete Data Flow to DeliveryReceiptA5
POSPage / POSKioskPage / CommercialDocumentModal / TemplateLibraryModal
  │
  ├─ POS path: POSSaleSnapshot → { type: 'pos-snapshot', snapshot }
  ├─ Doc path: raw API doc    → { type: 'api-document', doc }
  ├─ Session:  session data   → { type: 'session-report', session }
  └─ Pre-built: already typed → { type: 'prebuilt', data }
  │
  ▼
UniversalPrintPipeline (line 54-67)
  │  useMemo(() => switch(source.type) → DocumentDataBuilder.*)
  │
  ▼
DocumentDataBuilder (lines 181-373)
  ├─ .fromApiDocument(doc, company)   → UniversalDocumentData
  ├─ .fromPOSSnapshot(snapshot, company) → UniversalDocumentData
  ├─ .fromSessionReport(session, company) → UniversalDocumentData
  └─ .empty()                         → UniversalDocumentData
  │
  ▼
UniversalPreview (line 126)
  │  isDeliveryA5 = doc_type_code === 'BL' && paper_size === 'A5'
  │
  ▼
DeliveryReceiptA5({ tpl, data })     ← receives UniversalDocumentData directly
DeliveryReceiptA5 is only rendered when tpl.doc_type_code === 'BL' AND tpl.paper_size === 'A5'. The data object is built by DocumentDataBuilder (in DocumentDataBuilder.ts) and passed unchanged through UniversalPrintPipeline -> UniversalPreview -> DeliveryReceiptA5.

Search the codebase for how `UniversalDocumentData.totals` is populated. Look in:
1. `resources/js/pages/settings/print-settings/types/data.ts` - the type definition for `UniversalDocumentData` and its `totals` field
2. How `totalTtc` is computed or assigned in the data flow from API to renderer
3. Any `mapCompany`, `mapTotals`, `fromApiResponse`, or similar data-mapping functions that build the `UniversalDocumentData` object

Return the full file paths, line numbers, and relevant code snippets for each finding.
+ Thought: 146ms
✱Grep "UniversalDocumentData" (64 matches)
✱Grep "UniversalDocumentData" (73 matches)
✱Grep "mapTotals|mapCompany|fromApiResponse.*UniversalDocumentData|fromDocument|fromApiDocument|buildDocumentData|DocumentDataBuilder" (40 matches)
✱Grep "totalTtc" (100 matches)
+ Thought: 621ms
Let me now read the key files in full.
→Read resources\js\pages\settings\print-settings\types\data\UniversalDocumentData.ts
→Read resources\js\pages\settings\print-settings\types\data\DocumentDataBuilder.ts
→Read resources\js\pages\settings\print-settings\runtime\PrintRuntimeAdapter.tsx
→Read resources\js\pages\settings\print-settings\runtime\UniversalPrintPipeline.tsx
+ Thought: 723ms
Now let me check the PrintFieldResolver for how totalTtc is resolved at the renderer level, and the POS calculations that produce the POSSaleSnapshot.totals.
→Read resources\js\pages\settings\print-settings\services\PrintFieldResolver.ts
→Read resources\js\pos\utils\calculations.ts
→Read resources\js\pages\settings\print-settings\components\preview\TotalsSection.tsx
+ Thought: 525ms
Let me also look at how handleCompleteSale builds the snapshot in POSPage, and how the backend totals flow into fromApiDocument.
✱Grep "handleCompleteSale|posSaleSnapshot|POSSaleSnapshot" in resources\js\pages\pos (17 matches)
✱Grep "totals.*total_ttc|total_ttc.*totals" (3 matches)
+ Thought: 996ms
→Read resources\js\pages\pos\POSPage.tsx [offset=1030, limit=80]
→Read app\Services\CommercialDocumentService.php [offset=480, limit=60]
✱Grep "class CommercialDocument\b" in app\Models (1 match)
+ Thought: 527ms
→Read app\Models\CommercialDocument.php
✱Grep "computeDocumentTotals|computeTotals|calculateTotals" in app (6 matches)
+ Thought: 629ms
→Read app\Services\CommercialDocumentService.php [limit=60, offset=545]
✱Grep "balance_data|total_ttc|total_ht" in app\Http (16 matches)
+ Thought: 367ms
→Read app\Http\Resources\CommercialDocumentResource.php
→Read resources\js\pages\settings\print-settings\services\PrintFieldRegistry.ts [limit=40, offset=113]
+ Thought: 662ms
→Read resources\js\pages\settings\print-settings\services\PrintFieldRegistry.ts [limit=30, offset=100]
+ Thought: 137ms
Here are the complete findings organized by your three questions.
1. Type Definition: UniversalDocumentData.totals
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\types\data\UniversalDocumentData.ts
The totals field is typed as DocumentTotals (line 263):
// Line 249-263
export interface UniversalDocumentData {
  doc:          DocumentInfo;
  company:      CompanyInfo;
  party?:       PartyInfo | null;
  warehouse?:   WarehouseInfo | null;
  session?:     SessionInfo | null;
  lines:        DocumentLine[];
  totals:       DocumentTotals;          // <-- line 263
  taxBreakdown: TaxRate[];
  payments:     Payment[];
  balance?:     BalanceInfo | null;
  currency?:    CurrencyInfo;
  report?:      ReportSummary | null;
  computed:     Record<string, unknown>;
}
The DocumentTotals interface is defined at lines 144-157:
// Lines 144-157
export interface DocumentTotals {
  totalHt:       number;
  totalTva:      number;
  totalTtc:      number;          // <-- the field in question
  fiscalStamp:   number;
  totalDiscount: number;
  paid:          number;
  change:        number;
  remaining:     number;
}
The empty-document factory initializes all to 0 (lines 317-326):
// Lines 317-326 (inside emptyDocumentData())
totals: {
  totalHt:       0,
  totalTva:      0,
  totalTtc:      0,
  fiscalStamp:   0,
  totalDiscount: 0,
  paid:          0,
  change:        0,
  remaining:     0,
},
2. How totalTtc is Computed / Assigned in the Data Flow
There are three distinct data pipelines that populate totals.totalTtc, and one renderer-resolution layer that reads it.
Pipeline A: API Document (fromApiDocument)
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\types\data\DocumentDataBuilder.ts
Backend computation — app\Services\CommercialDocumentService.php, lines 551-578:
// Lines 551-578 — recalculateTotals()
private function recalculateTotals(CommercialDocument $document): void
{
    $document->load('lines');
    $totalHt       = (float) $document->lines->sum('total_ht');
    $totalTva      = (float) $document->lines->sum('total_tva');
    $totalDiscount = (float) $document->lines->sum('discount_amount');
    $totalTtc      = $totalHt + $totalTva;                          // <-- line 558

    $totalStamp = 0.0;
    try {
        $totalStamp = (float) app(FiscalStampCalculator::class)->calculate($document);
    } catch (\Throwable $e) { ... }

    $netToPay = $totalTtc + $totalStamp;

    $document->updateQuietly([
        'total_ht'         => round($totalHt,       2),
        'total_tva'        => round($totalTva,       2),
        'total_discount'   => round($totalDiscount,  2),
        'total_stamp'      => round($totalStamp,     2),
        'total_ttc'        => round($totalTtc,       2),             // <-- stored in DB
        'net_to_pay'       => round($netToPay,       2),
        'remaining_amount' => round($netToPay,       2),
    ]);
}
Per-line computation is at lines 504-522:
// Lines 504-522 — computeLineTotals()
private function computeLineTotals(array $line): array
{
    $qty     = (float) ($line['quantity']            ?? 0);
    $price   = (float) ($line['unit_price_ht']       ?? 0);
    $discPct = (float) ($line['discount_percentage'] ?? 0);
    $tvaRate = (float) ($line['tva_rate']            ?? 0);

    $gross    = $qty * $price;
    $discount = $gross * ($discPct / 100);
    $ht       = $gross - $discount;
    $tva      = $ht * ($tvaRate / 100);

    return [
        'total_ht'        => round($ht,       2),
        'discount_amount' => round($discount,  2),
        'total_tva'       => round($tva,       2),
        'total_ttc'       => round($ht + $tva, 2),                 // <-- per-line TTC
    ];
}
API serialization — app\Http\Resources\CommercialDocumentResource.php, line 32:
// Line 32
'total_ttc' => $this->total_ttc,
Note: The API resource returns total_ttc as a flat top-level field on the document object (not nested under a totals key). The resource also returns flat total_ht, total_tva, etc.
Frontend mapping — DocumentDataBuilder.ts, lines 515-531 (buildTotalsFromApi):
// Lines 515-531
function buildTotalsFromApi(doc: ApiDocument, lines: DocumentLine[]): DocumentTotals {
  // Prefer backend-computed totals; fall back to summing lines
  const t = doc.totals;
  return {
    totalHt:       t?.total_ht       ?? lines.reduce((s, l) => s + l.totalHt,  0),
    totalTva:      t?.total_tva      ?? lines.reduce((s, l) => s + l.totalTva, 0),
    totalTtc:      t?.total_ttc      ?? lines.reduce((s, l) => s + l.totalTtc, 0),  // <-- line 524
    fiscalStamp:   t?.fiscal_stamp   ?? 0,
    totalDiscount: t?.total_discount ?? lines.reduce((s, l) => s + l.discountAmt, 0),
    paid:          t?.paid           ?? 0,
    change:        t?.change         ?? 0,
    remaining:     t?.remaining      ?? 0,
  };
}
The ApiDocument interface (lines 109-119) expects doc.totals as an optional nested object:
// Lines 109-119
totals?: {
  total_ht?:       number;
  total_tva?:      number;
  total_ttc?:      number;
  fiscal_stamp?:   number;
  total_discount?: number;
  paid?:           number;
  change?:         number;
  remaining?:      number;
} | null;
The per-line fallback computes totalTtc at line 440:
// Lines 433-443 (buildLineFromApi)
const totalHt   = line.total_ht ?? 0;
const totalTva  = line.total_tva  ?? totalHt * tvaRate;
const totalTtc  = line.total_ttc  ?? totalHt + totalTva;   // <-- line 440
Called from fromApiDocument at line 190:
// Lines 188-219
fromApiDocument(doc, company, options?): UniversalDocumentData {
  const lines  = buildLinesFromApi(doc.lines ?? []);
  const totals = buildTotalsFromApi(doc, lines);
  // ... balance logic ...
  return {
    doc: buildDocInfo(doc),
    company,
    // ...
    lines,
    totals,        // <-- totals.totalTtc populated here
    // ...
  };
},
Pipeline B: POS Snapshot (fromPOSSnapshot)
POS frontend calculation — resources/js/pos/utils/calculations.ts, lines 45-84 (calcTotals):
// Lines 45-84
export function calcTotals(items: CartItem[], invoiceDiscountPct = 0, fiscalStampEnabled = true): CartTotals {
  let totalHt       = 0;
  let totalTva      = 0;
  let totalDiscount = 0;

  for (const item of items) {
    totalHt       += item.total_ht;
    totalTva      += item.total_ht * (item.tva_rate / 100);
    totalDiscount += item.discount_amount;
  }

  const invoiceDiscountAmount = totalHt > 0 ? totalHt * invoiceDiscountPct / 100 : 0;
  const adjTotalHt  = totalHt - invoiceDiscountAmount;
  const adjTotalTva = /* pro-rata discount per item share */;
  const totalTtc     = adjTotalHt + adjTotalTva;            // <-- line 70
  const fiscalStamp  = fiscalStampEnabled ? calcFiscalStamp(totalTtc) : 0;

  return {
    total_ht:    Math.round(adjTotalHt  * 100) / 100,
    total_tva:   Math.round(adjTotalTva * 100) / 100,
    total_ttc:   Math.round(totalTtc    * 100) / 100,       // <-- line 76
    fiscal_stamp: fiscalStamp,
    // ...
  };
}
POSPage builds the snapshot — resources/js/pages/pos/POSPage.tsx, lines 1044-1063:
// Lines 1044-1063
const fullSnapshot: POSSaleSnapshot = {
  items: snapshot.items.map(i => ({ /* mapping */ })),
  totals: {
    ...snapshot.totals,
    total_ht:  effectiveTotalHt,
    total_tva: effectiveTotalTva,
    total_ttc: effectiveTotalTtc,     // <-- line 1059
    paid:      totalPaid,
    change:    invoiceChange,
    remaining: invoiceRemaining,
  },
  docNumber: res.document_number,
  // ...
};
DocumentDataBuilder.fromPOSSnapshot — DocumentDataBuilder.ts, lines 226-275:
// Lines 226-241
fromPOSSnapshot(snapshot, company, sessionInfo?): UniversalDocumentData {
  const lines  = buildLinesFromSnapshot(snapshot.items);
  const totals: DocumentTotals = {
    totalHt:       snapshot.totals.total_ht,
    totalTva:      snapshot.totals.total_tva,
    totalTtc:      snapshot.totals.total_ttc,        // <-- line 235
    fiscalStamp:   snapshot.totals.fiscal_stamp,
    totalDiscount: snapshot.totals.total_discount,
    paid:          snapshot.totals.paid,
    change:        snapshot.totals.change,
    remaining:     snapshot.totals.remaining,
  };
  // ... returns { ..., totals, ... }
},
Per-line fallback for POS items is at lines 469-497 (buildLinesFromSnapshot):
// Lines 469-497
function buildLinesFromSnapshot(items): DocumentLine[] {
  return items.map((item, i) => {
    const tvaRate  = item.tva_rate ?? 0;
    const totalHt  = item.total_ht ?? 0;
    const totalTva = totalHt * tvaRate;
    return {
      // ...
      totalTtc:     totalHt + totalTva,               // <-- line 492
      // ...
    };
  });
}
Pipeline C: Session Report (fromSessionReport)
DocumentDataBuilder.fromSessionReport — DocumentDataBuilder.ts, lines 290-372:
// Lines 290-331
fromSessionReport(session, company): UniversalDocumentData {
  const grossSales = Number(session.gross_sales ?? 0);
  // ...
  return {
    // ...
    totals: {
      totalHt:       0,                                    // <-- line 322 (always 0)
      totalTva:      Number(session.total_tva ?? 0),
      totalTtc:      grossSales,                           // <-- line 324
      fiscalStamp:   Number(session.total_fiscal_stamp ?? 0),
      totalDiscount: Number(session.total_discount ?? 0),
      paid:          grossSales,
      change:        0,
      remaining:     0,
    },
    // ...
  };
},
3. Data-Mapping Functions (mapCompany, DocumentDataBuilder, etc.)
mapCompany
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\runtime\PrintRuntimeAdapter.tsx, lines 26-46
This maps the Zustand activeCompany store to CompanyData (used by preview components). It does not touch totals -- it only maps company fields:
// Lines 26-46
export function mapCompany(ac: ReturnType<typeof useActiveCompany>): CompanyData | null {
  if (!ac) return null;
  return {
    name:            ac.name            ?? '',
    commercialName:  (ac as any).commercial_name ?? '',
    address:         ac.address         ?? '',
    phone:           ac.phone           ?? '',
    mobile:          ac.mobile          ?? '',
    fax:             ac.fax             ?? '',
    email:           ac.email           ?? '',
    nif:             ac.nif             ?? '',
    rc:              ac.rc              ?? '',
    nis:             ac.nis             ?? '',
    article:         (ac as any).ai     ?? '',
    activity:        ac.activity        ?? '',
    capital:         (ac as any).capital_amount ?? '',
    bankName:        (ac as any).bank_name ?? '',
    rib:             ac.rib             ?? '',
    logoUrl:         ac.avatar          ?? null,
  };
}
Exported from the runtime barrel at:
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\runtime\index.ts, line 24
export { mapCompany } from './PrintRuntimeAdapter';
DocumentDataBuilder (the main data-mapping module)
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\types\data\DocumentDataBuilder.ts
Four builder methods, each producing a complete UniversalDocumentData:
Method	Line	Source	How totals.totalTtc is set
fromApiDocument()	181	Backend API response	doc.totals.total_ttc (backend SSOT, falls back to summing line-level totalTtc)
fromPOSSnapshot()	226	POS client-side cart	snapshot.totals.total_ttc (from calcTotals())
fromSessionReport()	290	POS session data	grossSales (= session.gross_sales)
empty()	281	Preview placeholder	0
Exported from the types barrel at:
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\types\data\index.ts, line 20
export { DocumentDataBuilder } from './DocumentDataBuilder';
UniversalPrintPipeline (orchestrator)
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\runtime\UniversalPrintPipeline.tsx
Routes PipelineSource to the correct DocumentDataBuilder method (lines 54-67 and 141-148):
// Lines 54-67
const data: UniversalDocumentData = useMemo(() => {
  switch (source.type) {
    case 'prebuilt':         return source.data;
    case 'api-document':     return DocumentDataBuilder.fromApiDocument(source.doc, company, source.options);
    case 'pos-snapshot':     return DocumentDataBuilder.fromPOSSnapshot(source.snapshot, company);
    case 'session-report':   return DocumentDataBuilder.fromSessionReport(source.session, company);
    default:                 return DocumentDataBuilder.empty();
  }
}, [source, company]);
PrintFieldRegistry + PrintFieldResolver (canonical field access layer)
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\services\PrintFieldRegistry.ts, line 112
The totals.ttc field ID maps to sourcePath: 'totals.totalTtc':
// Line 112
{ id: 'totals.ttc', label: 'المجموع TTC', group: 'totals', type: 'currency',
  sourcePath: 'totals.totalTtc', settingKey: 'show_total_ttc', align: 'right', visibleByDefault: true },
File: D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\services\PrintFieldResolver.ts, lines 40-78
The resolver resolves totals.ttc by following sourcePath: 'totals.totalTtc' on the UniversalDocumentData object via getByPath(data, def.sourcePath) at line 77:
// Lines 40-78
resolve(fieldId, data, template?): any {
  const def = this.getField(fieldId);
  if (!def) return undefined;

  // 1) Template override
  if (template && def.overrideTemplatePath) { ... }

  // 2) Footer/static fields
  if (fieldId === 'footer.thankYou') { ... }
  // ...

  // 3) Computed fields
  if (fieldId === 'totals.amountInWords') {
    const total = data.totals?.totalTtc ?? 0;
    return numberToArabicWords(total);
  }

  // 4) Simple data path — totals.ttc → getByPath(data, 'totals.totalTtc')
  return getByPath(data, def.sourcePath);
}
Callers that build UniversalDocumentData from page components
Caller	File
POSPage	resources/js/pages/pos/POSPage.tsx
POSKioskPage	resources/js/pages/pos/POSKioskPage.tsx
SessionStatsModal	resources/js/pos/components/SessionStatsModal.tsx
PrintSettingsPage	resources/js/pages/settings/print-settings/PrintSettingsPage.tsx
useCommercialDocumentController	resources/js/pages/documents/hooks/useCommercialDocumentController.ts
BatchPrintModal	resources/js/pages/documents/components/BatchPrintModal.tsx
Summary: The Complete totalTtc Data Flow
Backend (PHP)
  CommercialDocumentService::computeLineTotals()     →  line.total_ttc = ht + tva
  CommercialDocumentService::recalculateTotals()     →  doc.total_ttc  = sum(line.ht) + sum(line.tva)
  CommercialDocumentResource::toArray()              →  JSON { total_ttc: <value> }
       ↓
Frontend API response (flat fields: total_ht, total_tva, total_ttc, total_stamp, ...)
       ↓
DocumentDataBuilder.fromApiDocument()
  → buildTotalsFromApi(doc, lines)
    → prefers doc.totals.total_ttc (backend SSOT)
    → falls back to lines.reduce((s,l) => s + l.totalTtc, 0)
       ↓
UniversalDocumentData.totals.totalTtc    ← THE CANONICAL FIELD
       ↓
PrintFieldRegistry  { id: 'totals.ttc', sourcePath: 'totals.totalTtc' }
PrintFieldResolver  → getByPath(data, 'totals.totalTtc')
       ↓
Renderer (TotalsSection, ItemsSection, FooterSection, ESC/POS, etc.)

