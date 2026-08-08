# FISCAL QR SPEC — v1 Payload (Fiscal e-invoicing QR)

> Status: **2026-08-08** — the Algerian DGI has **not** published an official QR payload
> specification yet. Decree 21-98 mandated e-invoicing, but the DGI currently steers toward
> structured XML (UBL / UN-CEFACT) and a future "unique validation code" that may ride a QR.
> The field order / separators standard is therefore **not finalised**.
>
> Until the official spec lands, this project emits a **versioned, machine-readable JSON v1
> payload** (the same approach as the legacy `QRCodeService`, extended with DGI-relevant
> identifiers) so every FV / POS document is QR-ready and migration to the official format is
> a **single version bump** (`FiscalInvoiceQrService::VERSION`).
>
> ⚠️ ALWAYS re-check https://e-invoicing.dz and DGI guidance before bumping to an official
> schema. Nothing here is a substitute for a future DGI-issued standard.

---

## 1. Payload schema (v1)

The QR matrix encodes the UTF-8 **JSON string** produced by
`App\Services\FiscalInvoiceQrService::dataString($document)`.

```jsonc
{
  "v": 1,                          // payload version (int)
  "seller": {                      // from the document's OWN company record
    "name":    "El Houda Emballage",
    "nif":     "21656494498789",   // شركة — NIF (9–15 digits, string)
    "nis":     "65484897897897",   // NIS (string)
    "ai":      "3912052464",       // A.I. — n° d'article d'imposition (string)
    "rc":      "65454848787",      // Registre de Commerce (string)
    "address": "الزقم الوادي"      // (string, UTF-8)
  },
  "buyer": {                       // from the document's party record
    "name": "شوقي",
    "nif":  ""                     // empty when the buyer has no NIF
  },
  "invoice": {
    "number": "FV-2026-000001",    // generated document_number
    "date":   "2026-08-05",        // Y-m-d (local date)
    "type":   "FV"                 // document type code (FV / POS)
  },
  "amounts": {                     // ALL rounded to 2 decimals (floats)
    "ht":       1550,              // total_ht
    "tva":      0,                 // total_tva
    "discount": 0,                 // total_discount
    "stamp":    0,                 // total_stamp
    "ttc":      1550,              // total_ttc
    "net":      1550               // net_to_pay (ttc + stamp)
  },
  "hash": "8aadfda6…ad9ca2"        // sha256 over fiscal fields (see §3)
}
```

### Field rules (determinism)

- The payload is **fully deterministic** given the document: same doc ⇒ same byte string.
- Amounts are `round((float) $value, 2)` — two-decimal DZD.
- Dates are `document_date->format('Y-m-d')`.
- Identifiers always come from the document's **own** `company` / `party` records, never the
  global config fallback (config `app.company_*` is used ONLY when the company record lacks a
  field).
- Encoded with `json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)`, i.e.
  **UTF-8 with no `\/` escaping** — a scanner must decode UTF-8 correctly.
- QR rendering options (both encoders): error correction **M**, UTF-8, no margin padding.

## 2. JSON number semantics (important, not a bug)

PHP's `json_encode` of `1550.0` emits `1550` (JSON has a single number type). A decoder that
`json_decode`s will therefore see an **int** `1550` where the builder returned a **float**
`1550.0`. The numeric value is identical; consumers must compare amounts **numerically**
(loose equality), never with strict type equality. The backend round-trip test uses Pest's
loose `toEqual` for exactly this reason.

## 3. Integrity hash

```
hash = sha256( document_number | YYYYMMDD | type_code | ht | tva | ttc )
```
where `|` is a literal pipe and the amounts are `round(x, 2)` stringified. Changing any input
changes the hash, so the payload cannot be silently edited after the fact. The hash is
**self-referential validation only** — it is not a cryptographic signature and does not prove
authenticity (that requires a future DGI signature scheme).

## 4. Known-good test vector

Generated 2026-08-08 from the real document **FV-2026-000001** (doc id 310, company
`el-houda-emballage-6a5e589dc1cfe`). This string is the EXACT content encoded in the QR:

```
{"v":1,"seller":{"name":"El Houda Emballage","nif":"21656494498789","nis":"65484897897897","ai":"3912052464","rc":"65454848787","address":"الزقم الوادي"},"buyer":{"name":"شوقي","nif":""},"invoice":{"number":"FV-2026-000001","date":"2026-08-05","type":"FV"},"amounts":{"ht":1550,"tva":0,"discount":0,"stamp":0,"ttc":1550,"net":1550},"hash":"8aadfda645bc025aefa8c44663e2d919d83ac1ca690d8cac9f7e771f60ad9ca2"}
```

## 5. Validation procedure

| Check | Where | Result (2026-08-08) |
|-------|-------|---------------------|
| `buildData` shape + version | `tests/Feature/FiscalInvoiceQrServiceTest.php` | PASS — v=1, seller/buyer/invoice/amounts present |
| `dataString` valid JSON, round-trips through `parse` (loose equality) | same test | PASS |
| `validateData` rejects missing fields / unknown version | same test | PASS |
| `svgBase64` returns a non-trivial base64 SVG | same test | PASS |
| **QR decodes back to the exact string** (independent decoder `jsqr`), exact + damage-tolerant | `__tests__/fiscal-qr-scan.spec.ts` | PASS — 2/2 (incl. M-level damage recovery) |
| QR renders in preview/print via the `qrcode` npm lib | `__tests__/fiscalqr.pw.spec.ts` | PASS |
| Official DGI validator app | **NOT RUN** — DGI has not released one; re-check https://e-invoicing.dz |

Regenerate the vector for any real document:

```bash
php artisan tinker --execute="$doc = App\Models\CommercialDocument::where('document_number','FV-2026-000001')->first(); echo app(App\Services\FiscalInvoiceQrService::class)->dataString($doc);"
```

Re-prove scannability (any payload):

```bash
npx vitest run resources/js/pages/settings/print-settings/__tests__/fiscal-qr-scan.spec.ts
```

## 6. Migration path to an official schema

1. When DGI publishes a spec, update `FiscalInvoiceQrService::buildData` and bump `VERSION`.
2. Keep the builder the single source of truth — preview (`FiscalQR`), ESC/POS
   (`EscPosBuilder::qrCode`), and the PDF (`exportPdf.ts`) all consume the same
   `qrcode_content` from the document API; they never re-assemble the payload.
3. Re-run the validation matrix in §5 and refresh this doc's test vector.
