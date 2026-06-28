# TASK
Implement a built-in Print Template Library on top of the existing Print Settings system.

IMPORTANT:

DO NOT redesign the current print settings module.

DO NOT replace the existing architecture.

DO NOT create a new print engine.

The current system is already production-ready and contains:

- Print Templates
- Universal Preview
- Print Template CRUD
- Template API
- Live Preview
- Print Settings
- Universal Document Builder
- Existing database structure

Your task is to EXTEND the existing system without breaking anything.

The implementation must be fully backward compatible.

------------------------------------------------------------

# GOAL

Instead of creating an empty template when the user clicks "New Template",

the system should open a Template Library similar to professional ERP systems.

Examples:

- Odoo
- ERPNext
- Microsoft Dynamics
- SAP Business One

The user should simply choose a ready-made template and install it.

------------------------------------------------------------

# REQUIRED BUILT-IN TEMPLATES

Create the following built-in templates:

1.

Algerian Invoice A4

Reference:
FV A4 image

2.

Algerian Delivery Note A4

Reference:
BL A4 image

3.

Algerian Delivery Note A5

Reference:
BL A5 image

These templates must visually match the provided reference images as closely as possible.

Do NOT create simplified versions.

Do NOT approximate the layouts.

------------------------------------------------------------

# REFERENCE IMAGES

Treat the provided images as visual design specifications.

Analyze every visible element, including:

- Margins
- Spacing
- Typography
- Font sizes
- Borders
- Rounded rectangles
- Header alignment
- Company information placement
- Customer information placement
- Document title
- Items table
- Column widths
- Totals section
- Footer
- Signature area
- QR Code position
- Barcode position
- Legal text
- Page numbering
- Empty spaces
- Visual proportions

Rebuild the layouts entirely using React components.

DO NOT use the images themselves.

------------------------------------------------------------

# STRICTLY FORBIDDEN

Do NOT use:

- PNG backgrounds
- JPG backgrounds
- Canvas
- SVG screenshots
- PDF snapshots
- Static HTML copied from images

Everything must be rendered dynamically using React.

------------------------------------------------------------

# COMPONENT ARCHITECTURE

Every visual section must be an independent reusable component.

Examples:

Header

CompanyInformation

CustomerInformation

DocumentTitle

ItemsTable

TotalsSection

Footer

SignatureArea

QRCode

Barcode

LegalText

Watermark

Every component must receive its data through props.

Nothing should contain hardcoded business data.

------------------------------------------------------------

# TEMPLATE ARCHITECTURE

Create a new module:

resources/js/reporting/templates/library

Inside it create:

InvoiceA4DZ.ts

DeliveryA4DZ.ts

DeliveryA5DZ.ts

Each file must export:

- template metadata
- default configuration
- layout definition
- default styling
- supported paper size
- supported document types

Avoid mixing layout and configuration.

------------------------------------------------------------

# CONFIGURATION

The layout must be entirely configuration-driven.

Dimensions, spacing, typography, borders and visibility must come from configuration objects.

Avoid magic numbers wherever possible.

Future templates should require only configuration changes, not layout rewrites.

------------------------------------------------------------

# BACKEND

Add a new API endpoint:

GET

/print-templates/library

Response example:

[
    {
        "id": "...",
        "name": "...",
        "description": "...",
        "document_type": "...",
        "paper_size": "...",
        "preview": "...",
        "category": "...",
        "read_only": true
    }
]

------------------------------------------------------------

Add another endpoint:

POST

/print-templates/library/{id}/install

This endpoint must:

- load the built-in template
- copy it into print_templates
- create a normal editable template
- return the created template

Do NOT duplicate manually.

Implement a real installation process.

------------------------------------------------------------

# BUILT-IN TEMPLATES

Built-in templates are system assets.

They must NOT be stored:

- inside database seeders
- inside migrations
- inside JSON files
- inside print_templates table

They should exist as immutable system templates.

Users never edit them directly.

------------------------------------------------------------

# INSTALLATION FLOW

When the user clicks

"New Template"

open a modal dialog.

Display professional cards.

Each card contains:

- Live Preview
- Template Name
- Description
- Supported document type
- Paper size
- Install button

------------------------------------------------------------

# PREVIEW

Do NOT use screenshots.

Do NOT generate preview images.

Use the existing UniversalPreview component.

Render every preview using mock document data.

The preview must be a real rendered template.

------------------------------------------------------------

# AFTER INSTALLATION

Immediately:

1. Install template

2. Refresh templates list

3. Open the newly created template inside the existing editor

No additional user actions should be required.

------------------------------------------------------------

# EDITING

Built-in templates are read-only.

After installation, the created copy becomes fully editable.

Users always edit their own copies.

The original system templates never change.

------------------------------------------------------------

# DESIGN QUALITY

The three templates should reproduce the reference layouts with extremely high visual fidelity.

Pay attention to:

- exact proportions
- table alignment
- spacing
- typography hierarchy
- visual balance
- section placement
- border thickness
- margins
- whitespace

Target a visual accuracy as close as possible to the provided references.

------------------------------------------------------------

# IMPORTANT

Before writing any code:

Study the entire existing Print Settings module.

Understand:

- PrintTemplate model
- UniversalPreview
- UniversalDocumentData
- Template API
- Current CRUD flow
- Existing configuration system
- Reporting architecture

Reuse the current architecture.

Do not introduce parallel systems.

Do not break any existing API contracts.

Do not modify existing public interfaces unless absolutely necessary.

------------------------------------------------------------

# FINAL REQUIREMENTS

Your implementation must:

- compile successfully
- pass TypeScript checks
- pass Laravel checks
- produce zero build errors
- introduce no regressions
- preserve full backward compatibility

Only implement the new Template Library and integrate it cleanly into the existing system.

Quality expectations should match enterprise ERP software standards.
