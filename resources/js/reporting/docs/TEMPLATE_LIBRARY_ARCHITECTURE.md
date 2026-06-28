# Template Library — Architecture Guide

## Overview

The Template Library provides built-in print templates as immutable system assets.
Users browse the library, preview templates, and install editable copies.

## Architecture Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React/TypeScript)                    │
│  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │  Template     │  │  Config Layers    │  │  Layout Sections │  │
│  │  Registry     │  │  (PaperConfig,    │  │  (HeaderSection, │  │
│  │  (discovery)  │  │   Typography,     │  │   ItemsTable,    │  │
│  │               │  │   Header, Table,  │  │   Totals, Footer)│  │
│  │  register()   │  │   Totals, Footer) │  │                  │  │
│  │  search()     │  │                   │  │  (reusable       │  │
│  │  getByDocType │  │  (typed builders) │  │   components)    │  │
│  └──────┴───────┘  └────────┴──────────┘  └────────┴─────────┘  │
│         │                  │                       │             │
│         └──────────────────┴───────────────────────┘             │
│                              │                                    │
│                    ┌─────────▼──────────┐                        │
│                    │  TemplateLibrary   │                        │
│                    │  Modal             │                        │
│                    │                    │                        │
│                    │  - search          │                        │
│                    │  - filters         │                        │
│                    │  - favorites       │                        │
│                    │  - recently used   │                        │
│                    │  - preview (Univ.) │                        │
│                    │  - install         │                        │
│                    └─────────┬──────────┘                        │
│                              │ send template_id only             │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                  Backend (Laravel/PHP)                          │
│                    ┌─────────▼──────────┐                       │
│                    │  PrintTemplate     │                       │
│                    │  Controller         │                       │
│                    │                     │                       │
│                    │  GET /library       │                       │
│                    │  POST /install      │                       │
│                    └─────────┬──────────┘                       │
│                              │                                   │
│                    ┌─────────▼──────────┐                       │
│                    │  TemplateLibrary   │                       │
│                    │  Service            │                       │
│                    │                     │  (source of truth    │
│                    │  getMetadata()      │   for template        │
│                    │  getFlatPayload()   │   configurations)    │
│                    │  exists()           │                       │
│                    └─────────┬──────────┘                       │
│                              │                                   │
│                    ┌─────────▼──────────┐                       │
│                    │  PrintTemplate     │                       │
│                    │  Model              │                       │
│                    │                     │  (user's editable    │
│                    │  print_templates    │   copy)              │
│                    │  table              │                       │
│                    └────────────────────┘                       │
└──────────────────────────────────────────────────────────────────┘
```

## TemplateRegistry (Frontend)

The `TemplateRegistry` is the single entry point for discovering built-in templates.

### Key methods:

| Method | Description |
|--------|-------------|
| `register(entry)` | Register a template |
| `get(id)` | Get template by ID |
| `getAll()` | List all templates |
| `search(query)` | Full-text search across name, description, tags |
| `getByDocType(code)` | Filter by document type |
| `getByPaperSize(size)` | Filter by paper size |
| `getByCategory(cat)` | Filter by category |
| `getByTag(tag)` | Filter by tag |
| `getCategories()` | Get all unique categories |
| `getTags()` | Get all unique tags |
| `getPaperSizes()` | Get all unique paper sizes |
| `getDocTypes()` | Get all unique document types |

### Adding a new template

```typescript
import { templateRegistry, buildTemplate, createMeta } from '@/reporting';

templateRegistry.register({
  meta: createMeta({
    id: 'my-template',
    name: 'My Template',
    nameAr: 'قالبي',
    description: '...',
    descriptionAr: '...',
    documentType: 'FV',
    paperSize: 'A4',
    tags: ['tag1', 'tag2'],
  }),
  createConfig: () => buildTemplate('قالبي', 'FV', 'A4', {
    // optional overrides
    title_text: 'فاتورة مخصصة',
  }),
});
```

No router changes, no UI changes, no switch statements needed.

## Configuration Layers

Templates are built from composable config layers:

| Layer | File | Purpose |
|-------|------|---------|
| `PaperConfig` | `config/PaperConfig.ts` | Margins, page orientation, paper width |
| `TypographyConfig` | `config/TypographyConfig.ts` | Font sizes, families, alignments |
| `HeaderConfig` | `config/HeaderConfig.ts` | Logo, company info visibility |
| `TableConfig` | `config/TableConfig.ts` | Column definitions, headers, widths |
| `TotalsConfig` | `config/TotalsConfig.ts` | Totals visibility, TVA, fiscal stamp |
| `FooterConfig` | `config/FooterConfig.ts` | Footer text, barcode, QR, signatures |

Named constants in `constants.ts` replace all magic numbers.

## Installation Flow

1. User clicks "New Template" → modal opens
2. User previews templates via `UniversalPreview` + mock data
3. User clicks "Install" on a template card
4. Frontend sends `POST { template_id: "dz-invoice-a4" }` to backend
5. Backend `TemplateLibraryService` looks up the built-in config
6. Backend creates a new `PrintTemplate` record (editable copy)
7. Frontend receives the saved template, selects it, opens in editor
8. Install history + recently used list updated

## Versioning

Every template has:
- `version` (semver, e.g. "1.0.0")
- `revision` (integer, bumped on config changes)
- `layoutEngineVersion` (tracks compatible UniversalPreview version)

When a template is installed, a snapshot of its config is saved.
Future engine upgrades will not modify installed templates.

## Categories & Tags

Categories are derived from document type codes:

| DocType | Category | Name |
|---------|----------|------|
| FV | invoices | الفواتير |
| BL | delivery-notes | وصل تسليم |
| DEV | quotes | عروض الأسعار |
| POS | pos | إيصالات نقاط البيع |
| FA, BR, AV | purchase | أوامر الشراء |
| DDP, BT | warehouse | المستودعات |

Tags are free-form metadata used for filtering and search.

## Favorites & History

Stored in `localStorage`:
- `template_library_favorites`: Set of template IDs
- `template_library_recent`: Last 5 installed template IDs
- `template_library_history`: Last 20 install entries with timestamps

## Performance

- `UniversalPreview` is lazy-loaded via `React.lazy()`
- Mock document data is cached in a ref (never recreated)
- Template list filtering uses `useMemo` with explicit dependencies
- Template registry is initialized once (ref guard)

## Extending the Library

### Adding a new built-in template:

1. Create config layers or use `buildTemplate()` with overrides
2. Register in `registerBuiltinTemplates()` in `registry.ts`
3. Add metadata + config to `TemplateLibraryService.php`
4. Build passes — done

No routes, no UI modifications, no switch statements required.

### Adding a new document type:

1. Add to `DOC_TYPE_LIST` in `PrintTemplate.ts`
2. Add to `categoryFromDocType()` in `categories.ts`
3. Add templates for the new type
