// ════════════════════════════════════════════════════════════════════════════
// PHASE 0 — MIGRATION PATCHES
// ════════════════════════════════════════════════════════════════════════════
//
// Principle: **Zero breaking changes to existing code.**
// Phase 0 is purely additive — new files, new alias, one bugfix.
// All migration of existing consumers (POSPage, ProfessionalReceipt, types.ts
// re-exports) happens in Phase 1+.
//
// هذا الملف يوثّق التغييرات المطلوبة على الملفات الموجودة.
// كل تعديل مصحوب بـ:
//   - الملف المستهدف
//   - السطر / الجزء المتأثر
//   - الكود القديم (BEFORE)
//   - الكود الجديد (AFTER)
//   - السبب
//
// ════════════════════════════════════════════════════════════════════════════

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATCH 1 — Fix dual-save bug (ONLY urgent change in Phase 0)
File: resources/js/pages/settings/PrintSettingsPage.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEM:
  handleSave() writes to BOTH backends:
    1. printTemplatesApi.save(tpl)     → print_templates DB table (legacy)
    2. dbSaveTemplate(tpl)             → settings table (what POS reads)
  If step 1 fails, step 2 may not run → POS uses stale template.
  If step 2 fails silently, POS uses stale template with no error shown.

BEFORE (inside PrintSettingsPage.tsx handleSave):
  ────────────────────────────────────────────────
  // Save to both backends
  const saved = await printTemplatesApi.save(template);
  await dbSaveTemplate(template);
  ────────────────────────────────────────────────

AFTER:
  ────────────────────────────────────────────────
  // Phase 0: settings table is the single source of truth.
  // print_templates table is legacy — no new writes.
  await dbSaveTemplate(template);
  // Optionally: invalidate React Query cache for print templates
  queryClient.invalidateQueries({ queryKey: printTemplateKeys.all(slug ?? '') });
  ────────────────────────────────────────────────

  NOTE: Keep the `import { printTemplatesApi }` if it's still used
  for READING (listing templates for migration display). Remove only
  the SAVE call.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATCH 2 — Replace MOCK fallback with emptyDocumentData() in A5Preview.tsx
File: resources/js/pages/settings/print-settings/A5Preview.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEM:
  A5Preview defines MOCK_COMPANY and MOCK at the top of the file.
  buildData() falls back to MOCK when liveData is null/undefined.
  This means a misconfigured call could render demo data to a customer.

BEFORE:
  ────────────────────────────────────────────────
  const MOCK_COMPANY: CompanyData = { name: 'سوبيرات الوفرة', ... };
  const MOCK = { number: 'FV-2025-001770', ... };

  function buildData(tpl, liveData) {
    if (!liveData) return MOCK;   // ← dangerous fallback
    ...
  }

  function getCompany(tpl, api?) {
    return {
      name: tpl.company_name_text || api?.name || MOCK_COMPANY.name, // ← MOCK
      ...
    };
  }
  ────────────────────────────────────────────────

AFTER:
  ────────────────────────────────────────────────
  // Remove all MOCK / MOCK_COMPANY constants.
  import { emptyDocumentData } from '@/reporting';

  function buildData(tpl: PrintTemplate, liveData?: ReceiptLiveData | null) {
    if (!liveData) return emptyDocumentData();  // renders empty, not fake data
    ...
  }

  function getCompany(tpl: PrintTemplate, api?: CompanyData | null): CompanyData {
    return {
      name:    tpl.company_name_text || api?.name    || '',   // no MOCK fallback
      address: tpl.override_address  || api?.address  || '',
      phone:   tpl.override_phone    || api?.phone   || '',
      nif:     tpl.override_nif      || api?.nif     || '',
      rc:      tpl.override_rc       || api?.rc      || '',
      nis:     tpl.override_nis      || api?.nis     || '',
      ice:     tpl.override_ice      || api?.ice     || '',
      article: tpl.override_article  || api?.article || '',
      logoUrl: api?.logoUrl ?? null,
    };
  }
  ────────────────────────────────────────────────

  NOTE: emptyDocumentData() returns a deterministic empty shape
  ('—' strings, 0 numbers, empty arrays). It does NOT use new Date().
  The component renders cleanly with no user-visible data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATCH 3 — Replace MOCK fallback with emptyDocumentData() in A4Preview.tsx
File: resources/js/pages/settings/print-settings/A4Preview.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Same pattern as Patch 2. Replace MOCK/MOCK_COMPANY with emptyDocumentData()
and empty string fallbacks.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATCH 4 — Do NOT modify types.ts in Phase 0
File: resources/js/pages/settings/print-settings/types.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RATIONALE:
  types.ts defines ReceiptLiveData, TemplateLiveData, PrintTemplate, etc.
  Making it re-export from @/reporting is Phase 1 work. In Phase 0, the
  reporting framework lives alongside existing types with NO coupling.

  Phase 0:
    - Old code imports from types.ts → unchanged behavior
    - New code imports from @/reporting → uses UniversalDocumentData
    - Two independent type systems coexist

  Phase 1:
    - types.ts becomes a thin re-export shim (export * from '@/reporting')
    - All old imports continue to work via the alias
    - UniversalDocumentData becomes canonical

ACTION: NO CHANGE in Phase 0.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATCH 5 — Do NOT modify POSPage.tsx or ProfessionalReceipt.tsx in Phase 0
File: resources/js/pages/pos/POSPage.tsx
      resources/js/pos/components/ProfessionalReceipt.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RATIONALE:
  POSPage builds receiptLiveData in the legacy snake_case shape and
  passes it to ProfessionalReceipt → PreviewSelector → A4/A5/ReceiptPreview.
  These consumers all expect the legacy shape.

  Migrating them to UniversalDocumentData requires updating every component
  in the chain. This is Phase 2 work (after UniversalPreview exists).

  For Phase 0:
    - POSPage continues building the legacy shape (unchanged)
    - ProfessionalReceipt continues receiving the legacy shape (unchanged)
    - DocumentDataBuilder.fromPOSSnapshot() is available for NEW code only

  Future use (Phase 2):
    ────────────────────────────────────────────────
    import { DocumentDataBuilder } from '@/reporting';

    const receiptData = DocumentDataBuilder.fromPOSSnapshot(
      { ...snap, docNumber: lastDocNum },
      company,
      { id: sessionId, code: sessionCode }
    );
    ────────────────────────────────────────────────

ACTION: NO CHANGE in Phase 0.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATCH 6 — Add @/reporting alias to vite.config.js
File: vite.config.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEFORE:
  ────────────────────────────────────────────────
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './resources/js'),
    },
  },
  ────────────────────────────────────────────────

AFTER:
  ────────────────────────────────────────────────
  resolve: {
    alias: {
      '@':             path.resolve(__dirname, './resources/js'),
      '@/reporting':   path.resolve(__dirname, './resources/js/reporting/index.ts'),
    },
  },
  ────────────────────────────────────────────────

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PATCH 7 — One-time DB migration: print_templates → settings
Script: database/seeders/MigratePrintTemplatesToSettings.php
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run ONCE after deploying Phase 0.
Reads all rows from print_templates table, writes each to settings table
using key format: print:templates:{company_id}:{doc_type_code}:{id}
Then marks the print_templates rows as migrated (add migrated_at column).

See: database/seeders/MigratePrintTemplatesToSettings.php (produced separately)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

// This file is documentation only — no runnable code.
// Apply each patch manually to the target files listed above.
export {};
