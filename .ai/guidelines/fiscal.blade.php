{{--
┌─────────────────────────────────────────────────────────────────────┐
│  Algerian Fiscal Law — CRITICAL RULES (NEVER VIOLATE)              │
│  File: .ai/guidelines/fiscal.blade.php                             │
└─────────────────────────────────────────────────────────────────────┘

These rules reflect actual Algerian law. Generating code that contradicts
them is a legal compliance error, not just a style issue.


═══════════════════════════════════════════════════════════
TAP — ABOLISHED
═══════════════════════════════════════════════════════════

TAP (Taxe sur l'Activité Professionnelle) was abolished by LF 2024 Article 14.

❌ NEVER generate any TAP-related: fields, calculations, UI elements, reports
✅ TAPCalculator.php exists in Services/Tax/ — it is LEGACY CODE, do not reference or expand it
✅ The correct tax chain is: HT → TVA → Timbre Fiscal (when applicable)


═══════════════════════════════════════════════════════════
TVA (Taxe sur la Valeur Ajoutée)
═══════════════════════════════════════════════════════════

TVA rates managed in: Model Tva, table `tvas`, seeded by TvaSeeder
Standard Algerian rates: 0%, 9%, 19% (standard), others may exist
is_default flag indicates the default rate for new products
All price calculations use HT (Hors Taxe) as the base
TVA amount = price_ht × tva_rate / 100
TTC (Toutes Taxes Comprises) = HT + TVA


═══════════════════════════════════════════════════════════
TIMBRE FISCAL — LF 2025 Progressive Barème
═══════════════════════════════════════════════════════════

Handled by: FiscalStampCalculator (app/Services/Tax/FiscalStampCalculator.php)
            FiscalStampService (app/Services/FiscalStampService.php)
            Model: FiscalStamp, table `fiscal_stamps`

Progressive barème (LF 2025):
  ≤ 300 DZD          → 0 DZD (exempt)
  301 – 30,000 DZD   → 1 DZD per 100 DZD (1%)
  30,001 – 100,000 DZD → 1.5 DZD per 100 DZD (1.5%)
  > 100,000 DZD      → 2 DZD per 100 DZD (2%)

Electronic payments → fully exempt (0 DZD regardless of amount)

❌ Do NOT use a flat Timbre Fiscal rate
❌ Do NOT apply Timbre to electronic payments


═══════════════════════════════════════════════════════════
FISCAL DECLARATIONS
═══════════════════════════════════════════════════════════

Régime Réel     → G50 declaration (monthly/quarterly TVA)
Régime Forfaitaire / IFU → G12 / G12 bis (NOT G50)

❌ Never generate G50-related code for Forfaitaire regime
❌ Never confuse the two regimes


═══════════════════════════════════════════════════════════
FISCAL YEAR
═══════════════════════════════════════════════════════════

Model: FiscalYear — one active fiscal year per company (is_current = 1)
FiscalYearClosureService (app/Services/Accounting/) — handles year-end closure
BelongsToFiscalYear trait — all financial models carry fiscal_year_id
ResolvesFiscalYear trait — resolves current fiscal year from context

CRITICAL: seedCurrentStock() must filter by is_current = 1 on fiscal year.
          Never aggregate opening_quantity across all fiscal years.


═══════════════════════════════════════════════════════════
DOCUMENT TYPES & CONVERSION CHAIN
═══════════════════════════════════════════════════════════

Document types seeded by DocumentTypeSeeder (per company).
Conversion rules: table `document_type_conversions` (Model: DocumentTypeConversion)
Seeded by: DocumentTypeConversionSeeder
Service: DocumentConversionService

Standard Algerian commercial document chain:
  BC (Bon de Commande) → BL (Bon de Livraison) → FV (Facture de Vente)
  DEV (Devis) → BL or FV (conversion path — no is_proforma field)

❌ is_proforma field was REMOVED (migration 2026_06_21_201646_drop_is_proforma_from_commercial_documents)
✅ Use DocumentTypeConversion table for all conversion logic
✅ DocumentConversionService handles all conversion operations

Document statuses seeded by DocumentStatusSeeder.
DocumentBaseOperation: defines valid operations per document type.
--}}
