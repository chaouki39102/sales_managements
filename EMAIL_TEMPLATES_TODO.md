# EMAIL_TEMPLATES_TODO.md — قوالب البريد (Email Templates) Feature Roadmap

> **Purpose**: cross-PC / cross-session task file for the email-template feature shipped on 2026-09-10.
> **Convention**: commit + push after EACH task (AGENTS.md global rule). Verify before committing:
> `npx tsc --noEmit` · `npm test` (vitest) · `npm run build` (0 errors) · SW MATCH
> (`(Get-FileHash public/sw.js).Hash -eq (Get-FileHash public/build/sw.js).Hash`) · `vendor\bin\pest.bat` for backend changes (PHP 8.3+ at `C:\xampp\php84`, never XAMPP's 8.0).
> UI text is Arabic. Respond to the user in English.

---

## Status (2026-09-12)

- **Todos 1–8 COMPLETE** — backend CRUD + MailTab manager (1–5b), send-modal upgrade on shared `Modal` with template picker + placeholders + PDF toggle (6), wired into documents list + document view + invoices page (7), verified + pushed (8).
- Git log: Todo 6/7/8 verification green under commit `e6d3268` (pushed to `origin/main`); this doc update follows.

---

## COMPLETED ✅

### Todo 1 — Migration + model
- `database/migrations/2026_09_10_000001_create_email_templates_table.php` — `email_templates`: company_id, doc_type_code (nullable), name, subject, body, is_active, is_default; single active default per company+doc_type enforced in the model boot hook.
- `app/Models/EmailTemplate.php` — `$fillable`, casts (`config` json where used), company scope via `HasCompany` trait, `booted()` single-default hook.

### Todo 2 — Seeder
- `database/seeders/EmailTemplateSeeder.php` — seeds one generic Arabic template per company; wired into `CompanySeeder::seedCommon()` (and `DatabaseSeeder`) so new + existing companies get it.
- After re-seeding run: `php artisan db:seed --class=EmailTemplateSeeder` + `php artisan cache:clear`.

### Todo 3 — Frontend API client + hooks
- `resources/js/lib/api/endpoints/emailTemplates.ts` (barrel export at `resources/js/lib/api/index.ts:71`):
  - `useEmailTemplates()` — all templates (no per-tenant staleness issue: company data).
  - `useEmailTemplatesList(docTypeCode?: string)` (:66) — filtered by doc type; **accepts `string | null`** (use `useActiveSlug()` return type).
  - `useEmailTemplateMutations()` (:90) — `create`/`update`/`delete`/`setDefault` via `.mutateAsync` (payload builder `toApiPayload`).
  - `usePlaceholders()` (:122) — returns `{ key, label }[]` / placeholder labels for the editor chips.
  - Query keys accept `slug: string | null`; `update` accepts `({ id, ...data }: Partial<EmailTemplate> & { id: number })`.

### Todo 4 — Backend service + placeholders
- `app/Services/EmailTemplateService.php` — resolution order: exact `doc_type_code` (active, default → newest) → generic (`doc_type_code = null`) → null. `placeholderLabels()` returns the `{{key}}`/`{key}` substitution map.
- `app/Services/DocumentPrintService.php` + `app/Support/ArabicGlyphShaper.php` + `resources/views/documents/pdf.blade.php` — dompdf RTL A4 PDF renderer with Arabic glyph shaping (already wired into `DocumentMailService::generatePdf`).

### Todo 5 — Controller + routes
- `app/Http/Controllers/Api/V1/EmailTemplateController.php` — index/show/store/update/destroy/set-default; writes gated `can(PERMISSION.MANAGE_SETTINGS)` (route middleware), reads open to company members.
- `routes/api.php:844–856` — `email-templates` resource; **route order matters**: `email-templates/placeholders` (:848) registered BEFORE `email-templates/{id}` (:849) or Laravel intercepts `placeholders` as `{id}`. All writes under `can:manage_settings`.

### Todo 5b — Settings → Mail UI (`resources/js/pages/settings/tabs/MailTab.tsx`)
- New `قوالب البريد` card (:872 → ConfirmDialog render :1293), default-import `ConfirmDialog from "@/components/ui/ConfirmDialog"` (:25), list from `useEmailTemplates()` (:165), placeholder chips (:928), per-row `TplToggle` (active/default) (:1067/:1204/:1222), permission lock hint (:1264).
- Shared UI contracts in use: `Toggle`/`Field`/`Seg` from `./_shared.tsx`, `Button` from `@/components/ui/Button`, `useConfirm` + `<ConfirmDialog {...confirmDialogProps} />` (`@/hooks/useConfirm`, `@/components/ui/ConfirmDialog`).

---

## COMPLETED ✅ — Todo 6: Upgrade the send-mail modal (template picker + subject/body + PDF toggle)

### Frontend — `resources/js/pages/documents/components/SendDocumentMailModal.tsx`
Current state: OLD simple version — a `message`-only textarea, inline-styled native overlay (not the shared `Modal`), directly calls `apiPost('/documents/${documentId}/send-mail', { message })`. Props: `documentId`, `documentNumber`, `partyName?`, `partyEmail?`, `onClose`.

Required upgrade:
1. **Rebuild on the shared UI contracts** (project rule: modals go through `@/components/ui/Modal` — never hand-roll an overlay; modal gets scroll-lock/Escape for free).
2. **Template picker** — a select populated from `useEmailTemplatesList(docTypeCode)` (the doc's resolved doc-type code; fall back to generic). Design as a pill/seg with «عام (كل الأنواع)» fallback. Could reuse the `TplToggle`/seg pattern from MailTab.
3. **Subject + body fields** — default to the selected template's `subject`/`body` (fill when the template changes and the user hasn't manually edited — keep a "touched" flag). `usePlaceholders()` chips should be available to insert `{{...}}` tokens into subject/body.
4. **Attach-PDF toggle** (default ON) — when OFF, the payload omits `attach_pdf: true`.
5. **Payload** → `POST /documents/{id}/send-mail` with `{ template_id?: number, subject, body, attach_pdf: boolean, message? }` (keep `message` for backward compat OR drop it — controller decides; see backend).

### Backend — `app/Http/Controllers/Api/V1/DocumentMailController.php` + `app/Services/DocumentMailService.php`
Current state: `send()` validates only `message` (nullable|string|max:5000) and calls `DocumentMailService::sendToParty($document, $message)`. `sendToParty` composes subject `"مستند {document_number}"`, a hardcoded `defaultMessage()` body, and always attaches the PDF via `DocumentPrintService::generatePdf`.

Required upgrade:
- Accept `template_id`, `subject`, `body`, `attach_pdf` (bool). Resolve the template through `EmailTemplateService::resolveTemplate($companyId, $docTypeCode)`; when `subject`/`body` are absent use the template's `subject`/`body` (templates use `{{...}}` placeholders — render them, e.g. resolve via `str_replace` in the service). When `attach_pdf` is false, skip the PDF attach.
- Keep caller contract: return true/false; controller maps false → 400 with the Arabic "no party email" message; keep the `internal_notes` audit append in `logSend()`.
- Do NOT break the existing single caller (CommercialDocumentsPage) — either keep `message` accepted or update the caller in the same effort.

---

## COMPLETED ✅ — Todo 7: Wire send-mail into more entry points

Currently the ONLY entry point is `CommercialDocumentsPage.tsx` (import `:60`, usage `:2296`).

- **`resources/js/pages/documents/DocumentViewModal.tsx`** (refs ~:373 handle, ~:2174 render) — add an «إرسال بالبريد» action (mail icon button) opening `SendDocumentMailModal` for the viewed document. The modal needs a party email; the doc response already includes party (email/`is_tva_exempt` etc.) — verify the serialized party carries `email`.
- **Invoices page** (`resources/js/pages/invoices/...`) — the invoices grid/rows should get the same mail action (grep for existing row-action buttons/`ActionBtn` pattern in `CommercialDocumentsPage.tsx:1735` and mirror it).
- Check the POS receipt / session lists only if requested — keep scope to admin documents pages for now.

---

## COMPLETED ✅ — Todo 8: Verify + commit + push

1. `npx tsc --noEmit` — 0 errors.
2. `npm test` — all suites green.
3. `npm run build` — 0 errors; **SW MATCH** (compare `public/sw.js` vs `public/build/sw.js` hashes) and root `public/sw.js` committed with the build.
4. Backend touched → `vendor\bin\pest.bat` green + `php -l` on touched files.
5. `git add` ONLY this feature's files (see below), `git commit`, `git push`.

---

## Commit hygiene

- Do NOT stage unrelated pre-existing working-tree edits: `resources/js/pages/settings/print-settings/sections/DocumentSection.tsx`, `.../HeaderSection.tsx`, `resources/js/pages/settings/report-designer/reportMutations.ts` (leftover uncommitted work owned by another task line).
- Feature file set (everything since `9e189df`):
  - Modified: `database/seeders/CompanySeeder.php`, `database/seeders/DatabaseSeeder.php`, `resources/js/lib/api/index.ts`, `resources/js/pages/settings/tabs/MailTab.tsx`, `routes/api.php`
  - New: `app/Http/Controllers/Api/V1/EmailTemplateController.php`, `app/Models/EmailTemplate.php`, `app/Services/DocumentPrintService.php`, `app/Services/EmailTemplateService.php`, `app/Support/ArabicGlyphShaper.php`, `database/migrations/2026_09_10_000001_create_email_templates_table.php`, `database/seeders/EmailTemplateSeeder.php`, `resources/js/lib/api/endpoints/emailTemplates.ts`, `resources/views/documents/` (pdf.blade.php)
  - This file: `EMAIL_TEMPLATES_TODO.md`

## Key file map
- `routes/api.php:844–856` — email-templates routes (placeholders BEFORE `{id}`).
- `resources/js/lib/api/endpoints/emailTemplates.ts` — client + hooks (:66 List, :80 All, :90 Mutations, :122 Placeholders).
- `resources/js/pages/settings/tabs/MailTab.tsx` — template manager UI (:872 card → :1293 ConfirmDialog).
- `resources/js/pages/settings/print-settings/types/domain.ts:128–142` — `DOC_TYPE_LIST` (field `name`; generic = null) for the doc-type select.
- `app/Services/EmailTemplateService.php` — resolution order + `placeholderLabels()`.
- `resources/js/pages/documents/components/SendDocumentMailModal.tsx` — Todo 6 target (old message-only version).
- `app/Http/Controllers/Api/V1/DocumentMailController.php`, `app/Services/DocumentMailService.php` — Todo 6 backend (only `message` today; `sendToParty($document, ?string $customMessage)`; PDF attach unconditional).
- `resources/js/pages/documents/DocumentViewModal.tsx` — Todo 7 wiring target.