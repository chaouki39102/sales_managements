# Print Templates API Review

## Overview

A review of the 10 Print Template API endpoints, the backend controller (`PrintTemplateController.php`), the frontend API client (`printTemplatesApi.ts`), and the contracts layer (`ApiClient.ts`, `TemplateRepository.ts`).

---

## Endpoint Documentation

### `GET /print-templates`

| Field | Detail |
|---|---|
| **Method** | GET |
| **Path** | `/{company}/print-templates` |
| **Purpose** | List all templates for the current company, optionally filtered by document type. |
| **Controller** | `PrintTemplateController::index()` |
| **Middleware** | `auth:sanctum`, `company` |
| **Request Params** | `?doc_type_code=string` (optional) — filter by document type code (e.g. `FV`, `POS`) |
| **Response Format** | `{ status, message, timestamp, data: PrintTemplate[] }` — full list, ordered by `is_default DESC`, `created_at DESC` |
| **Validation** | None on request params |
| **Status Codes** | 200 success, 500 server error |
| **Issues** | Returns ALL templates — no pagination. If a company has 50+ templates, payload grows unbounded. Frontend `list()` falls through both Array and `{ data }` shapes due to inconsistent backend responses; uses `.data ?? []` fallback. |

---

### `GET /print-templates/{id}`

| Field | Detail |
|---|---|
| **Method** | GET |
| **Path** | `/{company}/print-templates/{id}` |
| **Purpose** | Fetch a single template by ID |
| **Controller** | `PrintTemplateController::show()` |
| **Request Format** | Path param `id` (integer) |
| **Response Format** | `{ status, message, timestamp, data: PrintTemplate }` |
| **Validation** | None — `findOrFail()` throws 404 |
| **Status Codes** | 200 success, 404 not found, 500 server error |
| **Issues** | None |

---

### `POST /print-templates`

| Field | Detail |
|---|---|
| **Method** | POST |
| **Path** | `/{company}/print-templates` |
| **Purpose** | Create a new template |
| **Controller** | `PrintTemplateController::store()` |
| **Request Format** | JSON body: `{ name (required), doc_type_code (required), paper_size (required), is_default (optional bool), is_active (optional bool), config (optional object) }` |
| **Response Format** | `{ status, message, timestamp, data: PrintTemplate }` |
| **Validation** | `name`: required, string, max:255; `doc_type_code`: required, string, max:10; `paper_size`: required, string, max:10; `is_default`: boolean; `is_active`: boolean; `config`: nullable array. On failure → 422 with `{ status: "error", code: "ERROR", message }` |
| **Status Codes** | 201 created, 422 validation error, 500 server error |
| **Issues** | No DTO/FormRequest — uses `$request->all()` with inline Validator. `config` defaults to `[]` if not provided or not array. The model's `$fillable` is overly permissive: `config` is the only scoped field alongside the 4 required fields; any extra body fields (e.g. `company_id`) could be mass-assigned (mitigated by `HasCompany` trait auto-setting `company_id`). |

---

### `PUT /print-templates/{id}`

| Field | Detail |
|---|---|
| **Method** | PUT |
| **Path** | `/{company}/print-templates/{id}` |
| **Purpose** | Update an existing template |
| **Controller** | `PrintTemplateController::update()` |
| **Request Format** | JSON body: `{ name (sometimes), doc_type_code (sometimes), paper_size (sometimes), is_default (bool), is_active (bool), config (nullable object) }` |
| **Response Format** | `{ status, message, timestamp, data: PrintTemplate }` |
| **Validation** | Same as `store` but all fields `sometimes`. `is_default`: boolean (only fires if present). |
| **Status Codes** | 200 success, 404 not found, 422 validation error, 500 server error |
| **Issues** | Uses `find()` + manual 404 (not `findOrFail`) — this was the original bug location where a 404 triggered auto-creation. **Fixed**: now returns proper 404. `config` field: if present but not array, it is unset (silently ignored). No partial patch support for `config` keys — the entire `config` object must be sent. The frontend `toApiPayload()` flattens all non-system properties into a single `config` object, meaning every PUT sends the full template state as config, which is correct but wasteful. |

---

### `DELETE /print-templates/{id}`

| Field | Detail |
|---|---|
| **Method** | DELETE |
| **Path** | `/{company}/print-templates/{id}` |
| **Purpose** | Delete a template |
| **Controller** | `PrintTemplateController::destroy()` |
| **Request Format** | Path param `id` |
| **Response Format** | `{ status, message, timestamp, data: null }` |
| **Validation** | `findOrFail()` |
| **Status Codes** | 200 success (with message "تم حذف القالب"), 404 not found, 500 server error |
| **Issues** | Returns a 200 with `data: null` rather than 204 No Content, which is REST convention. Frontend `delete()` returns `Promise<void>` so the response body is discarded anyway. Soft-delete not implemented — data is permanently lost. |

---

### `POST /print-templates/{id}/set-default`

| Field | Detail |
|---|---|
| **Method** | POST |
| **Path** | `/{company}/print-templates/{id}/set-default` |
| **Purpose** | Set a template as default for its document type |
| **Controller** | `PrintTemplateController::setDefault()` |
| **Request Format** | Path param `id`; no body |
| **Response Format** | `{ status, message, timestamp, data: PrintTemplate }` |
| **Validation** | `findOrFail()` |
| **Status Codes** | 200 success, 404 not found, 500 server error |
| **Issues** | The model's `saving()` boot hook automatically unsets `is_default` on all other templates of the same `doc_type_code`. This works for both `store` and direct `setDefault`. However, `setDefault` does NOT nest this in a DB transaction — if the save fails after the bulk update, the other templates would already have `is_default=false` but the target template would not be saved. |

---

### `POST /print-templates/{id}/duplicate`

| Field | Detail |
|---|---|
| **Method** | POST |
| **Path** | `/{company}/print-templates/{id}/duplicate` |
| **Purpose** | Duplicate a template |
| **Controller** | `PrintTemplateController::duplicate()` |
| **Request Format** | JSON body: `{ name (optional, defaults to "نسخة من {name}") }` |
| **Response Format** | `{ status, message, timestamp, data: PrintTemplate }` |
| **Validation** | `findOrFail()`; `name` extracted via `$request->input()` |
| **Status Codes** | 201 created, 404 not found, 500 server error |
| **Issues** | Uses `$original->replicate()` which copies ALL attributes including `created_at`/`updated_at`. These are overwritten on save by Eloquent, but any custom timestamps (if added later) would persist. The duplicated template has `is_default=false` hardcoded. |

---

### `POST /print-templates/upload-logo`

| Field | Detail |
|---|---|
| **Method** | POST |
| **Path** | `/{company}/print-templates/upload-logo` |
| **Purpose** | Upload a logo image file |
| **Controller** | `PrintTemplateController::uploadLogo()` |
| **Request Format** | `multipart/form-data` with field `logo` (file) |
| **Response Format** | `{ status, message, timestamp, data: { path, url } }` |
| **Validation** | `logo`: required, image, mimes:jpeg,png,jpg,gif,webp, max:2048KB. On failure → 422. |
| **Status Codes** | 200 success, 422 validation error, 500 server error |
| **Issues** | No ownership cleanup — old uploads for the same template are not deleted from storage. The `print-logos` directory accumulates orphan files over time. No association with specific template ID — the response returns `{ path, url }` and the frontend stores `url` in `custom_logo_url`. |

---

### `GET /print-templates/library`

| Field | Detail |
|---|---|
| **Method** | GET |
| **Path** | `/{company}/print-templates/library` |
| **Purpose** | Fetch available pre-built template definitions from the template library |
| **Controller** | `PrintTemplateController::library()` |
| **Request Format** | No body or params |
| **Response Format** | `{ status, message, timestamp, data: LibraryMeta[] }` where each meta has `id, name, name_ar, description, description_ar, document_type, paper_size, category, subcategory, tags, version, revision, country, author, read_only` |
| **Validation** | None |
| **Status Codes** | 200 success, 500 server error |
| **Issues** | No pagination. Currently only 3 templates exist in `TemplateLibraryService` — but if the library grows to 50+, the payload will be large. The metadata is hardcoded in a PHP array (`TemplateLibraryService::$templates`), which is not cacheable independently from the class file. Frontend `library()` handles both bare array and `{ data }` shape (same as `list()`). |

---

### `POST /print-templates/library/install`

| Field | Detail |
|---|---|
| **Method** | POST |
| **Path** | `/{company}/print-templates/library/install` |
| **Purpose** | Install a library template into the company's templates |
| **Controller** | `PrintTemplateController::installLibrary()` |
| **Request Format** | JSON body: `{ template_id (required, string, max:50) }` |
| **Response Format** | `{ status, message, timestamp, data: PrintTemplate }` |
| **Validation** | `template_id`: required, string, max:50; `TemplateLibraryService::exists()` check → 404 if not found; `getFlatPayload()` failure → 500 |
| **Status Codes** | 201 created, 422 validation error, 404 template not found in library, 500 payload failure / server error |
| **Issues** | `getFlatPayload()` merges `name, doc_type_code, paper_size, is_default, is_active, config` as flat DB columns. The library's `is_default` is always `false` in the config — install never automatically makes the template default. |

---

## Backend Model: `PrintTemplate.php`

| Aspect | Detail |
|---|---|
| **Table** | `print_templates` |
| **Fillable** | `company_id, name, doc_type_code, paper_size, is_default, is_active, config` |
| **Casts** | `is_default` → boolean, `is_active` → boolean, `config` → array |
| **Default Attributes** | `config` → `'{}'` |
| **Accessor** | `getConfigAttribute()`: decodes JSON string to array; returns `[]` on failure (replaces old null return) |
| **Boot Hook** | `saving()`: if `is_default=true`, unsets `is_default` on all other templates of the same `doc_type_code` |
| **Trait** | `HasCompany` — auto-sets `company_id` from the `company` middleware |

---

## Contracts Layer

### `ApiClient.ts`

```typescript
interface ApiClient {
  get<T>(url, params?): Promise<T>
  post<T>(url, data?): Promise<T>
  put<T>(url, data?): Promise<T>
  patch<T>(url, data?): Promise<T>
  delete(url): Promise<void>
  upload<T>(url, fd, onProgress?): Promise<T>
}
```

**Issues**:
- Generic `T` makes response type-safety dependent on each call site.
- `delete()` returns `Promise<void>` — no way to read response body.
- No error type or standardized error union.

### `TemplateRepository.ts`

```typescript
interface PrintTemplatesApi {
  list(docTypeCode?): Promise<PrintTemplate[]>
  show(id): Promise<PrintTemplate>
  create(tpl): Promise<PrintTemplate>
  update(id, tpl): Promise<PrintTemplate>
  delete(id): Promise<void>
  setDefault(id): Promise<PrintTemplate>
  duplicate(id, newName): Promise<PrintTemplate>
  library(): Promise<LibraryItem[]>
  installLibrary(templateId): Promise<PrintTemplate>
  uploadLogo(file, onProgress?): Promise<{ path, url }>
}
```

**Issues**:
- `library()` returns a generic `{ id, name, paper_size }[]` shape — the actual `LibraryApiResponse` type from `template-library/types.ts` has 15+ fields. The interface is outdated.
- Return types are raw domain models rather than DTOs — means a change in the backend response shape requires changing both the client parser and the interface.

---

## Frontend API Client: `printTemplatesApi.ts`

| Function | Establishes | Issues |
|---|---|---|
| `createPrintTemplatesApi(api)` | Factory that returns `PrintTemplatesApi` from an `ApiClient` | — |
| `toApiPayload(tpl)` | Splits `id/name/doc_type_code/paper_size/is_default/is_active` from config, wraps rest as `config` | Hardcodes `'FV'` and `'80mm'` as fallback defaults |
| `fromApiResponse(r)` | Merges `r.config` spread onto root | Casts with `as PrintTemplate` — all extra config keys are type-unsafe |
| `list()` | Filters response through `.data ?? []` fallback | Necessitated by inconsistent backend response shapes |
| `usePrintTemplates(docTypeCode?)` | React Query hook | Has `keepPreviousData` with `staleTime: 5min` — ensures fast tab switching |
| `usePrintTemplateMutations()` | Returns `{ create, update, remove, setDefault, duplicate, installLibrary }` | After every mutation, invalidates the entire query key for the slug |

---

## Response Format

All endpoints follow the standardized format from `ApiResponders`:

**Success:**
```json
{
  "status": "success",
  "message": "تم جلب القوالب",
  "timestamp": "2026-06-29T10:00:00.000000Z",
  "data": [ /* single or array */ ]
}
```

**Error:**
```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "القالب غير موجود",
  "timestamp": "2026-06-29T10:00:00.000000Z"
}
```

**Validation Error:**
```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "خطأ في البيانات المدخلة",
  "timestamp": "2026-06-29T10:00:00.000000Z",
  "errors": { "name": ["حقل الاسم مطلوب"] }
}
```

Note: The `errorResponse()` in `PrintTemplateController` bypasses `BaseApiController::buildErrorResponse()` — when the inline Validator fails at line 60 (`PrintTemplateController.php:60`), it calls `$this->errorResponse($validator->errors()->first(), 422)` which returns `{ status: "error", code: "ERROR" }` (default code), not the structured `{ code: "VALIDATION_ERROR", errors: {...} }` that `buildErrorResponse()` would produce. This means controller-level validation errors have a **different code and shape** than those handled by `handleError()`.

---

## Issues Already Fixed

1. **`update()` no longer auto-creates on 404**: The `update()` method previously used `findOrFail()` which threw an exception caught by `handleError()` returning a 404. The old version had a bug where `PrintTemplate::find($id)` returned null and the code would proceed with `new PrintTemplate()` — creating a template on a PUT to a non-existent ID. **Fixed** by returning 404 explicitly with `$this->errorResponse('القالب غير موجود', 404)`.

2. **Model `config` accessor returns `[]` instead of null**: The `getConfigAttribute()` accessor now returns `[]` for invalid/missing JSON, which prevents null-pointer issues in the frontend's `fromApiResponse()` where `...(r.config ?? {})` expects an object.

---

## Recommendations

### 1. Add Pagination to `GET /print-templates`
- Use `->paginate()` with a default of 50 per page.
- Frontend already handles `{ data }` vs raw-array ambiguity — add `page` param support to `list()`.

### 2. Add Pagination to `GET /print-templates/library`
- If the library grows beyond 50 entries, pagination will be necessary.
- Currently 3 templates — no urgency, but architect for growth.

### 3. Standardize Error Response Format
The controller's inline validator (`store`, `update`) produces:
```json
{ "status": "error", "code": "ERROR", "message": "حقل الاسم مطلوب" }
```
But `BaseApiController::buildErrorResponse()` for validation errors produces:
```json
{ "status": "error", "code": "VALIDATION_ERROR", "message": "خطأ في البيانات المدخلة", "errors": {...} }
```
**Fix**: Replace inline Validator with a FormRequest class to ensure consistent error shape and code for all validation failures.

### 4. Introduce Response DTOs
Currently the entire `config` blob is spread onto the root `PrintTemplate` type. This means:
- No type safety on template settings
- No migration path if `config` structure changes
- The frontend `fromApiResponse()` uses `as PrintTemplate` which hides all mismatches

**Fix**: Define typed DTOs for `store`/`update` responses (e.g. `PrintTemplateResponse` with typed config fields).

### 5. Add `DELETE /print-templates/{id}` as 204 No Content
Change the response from `200 { data: null }` to `204 No Content` with no body, following REST convention. The frontend already discards the body.

### 6. Use DB Transaction for `setDefault`
The `saving()` boot hook is not wrapped in a transaction. If multiple templates are being updated (setting one to default, unsetting others), a failure mid-way leaves the system in an inconsistent state.

### 7. Add Logo Cleanup on Upload
Delete the old logo from storage when a new one is uploaded for the same template, or implement a periodic cleanup task for orphaned `print-logos/` files.

### 8. Update `TemplateRepository` Interface
The `library()` return type `{ id, name, paper_size }[]` does not match the actual payload (`LibraryApiResponse` with 10+ fields). Update to use the proper type.

### 9. Rate Limiting
Add `throttle` middleware to mutation endpoints (`POST`, `PUT`, `DELETE`) to prevent abuse. This is consistent with the auth routes which already use throttling.

### 10. Audit Logging
Consider adding audit trail entries for template CRUD operations. The system already has `AuditController` — template mutations should be logged for compliance.
