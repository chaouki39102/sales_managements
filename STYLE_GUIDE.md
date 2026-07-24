# Style Guide — Sales Management System

Rules enforced across all CSS and component work. Every developer and AI agent must follow these.

---

## 1. CSS File Architecture (Import Order)

```
app.css
├── @import 'tailwindcss'          ← Tailwind reset (lowest priority)
├── @import 'theme/tokens.css'     ← CSS variables (design tokens)
├── @import 'theme/theme.css'      ← Dark theme overrides, global @keyframes
├── @import 'theme/layout.css'     ← Sidebar, topbar, page shell
├── @import 'theme/components.css' ← All UI components (buttons, modals, cards...)
├── @import 'theme/pages.css'      ← Page-specific styles
├── @import 'theme/pos.css'        ← POS-specific components
├── @import 'theme/pos-cart-v4.css'← POS cart
├── @import 'theme/pos-sessions-v2.css'
├── @import 'theme/modern-utilities.css'
├── @import 'theme/utilities.css'
├── @import 'theme/notifications.css'
└── @import 'theme/print-settings.css'
```

**Rule**: Never create new CSS files. All styles go in the appropriate file above based on scope.

---

## 2. CSS Variable System

### 2a. Variable Naming (Short-Form Only)

All CSS must use the short-form variables defined in `tokens.css`. Never use long-form names (`--color-text-primary`) in new code.

| Purpose | Variable | Light Value |
|---------|----------|-------------|
| **Backgrounds** | | |
| Page background | `--bg0` | `#e8eef7` |
| Body/main bg | `--bg1` | `#f0f4fa` |
| Card/surface bg | `--bg2` | `#ffffff` |
| Hover/secondary bg | `--bg3` | `#f5f8fd` |
| Tertiary bg | `--bg4` | `#eaf0f8` |
| Active/pressed bg | `--bg5` | `#dde5f0` |
| **Text** | | |
| Primary text | `--t1` | `#0d1b2a` |
| Secondary text | `--t2` | `#1e3a5f` |
| Tertiary text | `--t3` | `#4a6785` |
| Muted text | `--t4` | `#6e87a6` |
| **Borders** | | |
| Border subtle | `--b1` | `rgba(0,0,0,.05)` |
| Border default | `--b2` | `rgba(0,0,0,.08)` |
| Border strong | `--b3` | `rgba(0,0,0,.13)` |
| Border accent | `--b4` | `rgba(0,0,0,.20)` |
| **Accent Colors** | | |
| Emerald (primary) | `--em` | `#0a8a5c` |
| Emerald dark | `--em2` | `#077a50` |
| Emerald light | `--em3` | `#0dbf84` |
| Emerald bg | `--emb` | `rgba(10,138,92,.08)` |
| Emerald border | `--embo` | `rgba(10,138,92,.20)` |
| **Semantic Colors** | `--red`, `--green`, `--blue`, `--gold`, `--purple`, `--teal`, `--orange` | |
| + `--redb` / `--redbo` (bg/border), same pattern for all | | |
| **Shadows** | `--shadow`, `--shadow2`, `--shadow3` | |
| **Radii** | `--r1: 5px`, `--r2: 10px`, `--r3: 14px`, `--r4: 20px`, `--r5: 28px` | |
| **Type Scale** | `--fs-2xs: 10px` ... `--fs-2xl: 24px` | |
| **Timing** | `--d1: .15s`, `--d2: .25s` | |

**Rule**: When referencing a CSS variable, always use the short-form name. If a variable does not exist, add it to `tokens.css` (light theme + dark theme override).

### 2b. Dark Theme

Dark theme overrides are in `tokens.css` under `@media (prefers-color-scheme: dark)` / `.dark` class. Any new variable added to `:root` MUST have a corresponding dark override.

---

## 3. Class Naming Convention (BEM-ish + Prefix)

All class names use lowercase-kebab-case. Page-scoped classes are prefixed with a 2-4 letter abbreviation.

### Prefix Registry

| Prefix | Scope | Example |
|--------|-------|---------|
| `pcard-` | POS product card | `pcard-in-cart`, `pcard-img` |
| `pgrid-` | POS product grid | `pgrid--xs`, `pgrid--sm` |
| `prow-` | POS product list row | `prow-incart-qty`, `prow-ttc` |
| `cr-` | Cart row | `cr-pkg-badge` |
| `ch-` | Cart header | `ch-badge` |
| `si-` | Session info | `si-stat` |
| `qsm-` | Qty set modal | `qsm-body` |
| `ret-` | Returns modal | `ret-row` |
| `pr-` | Professional receipt | `pr-section` |
| `pay-` | Payment modal | `pay-row` |
| `dp-` | Date picker | `dp-open`, `dp-day` |
| `srch-` | Search input | `srch-wrap` |
| `ta-` | Textarea | `ta-field` |
| `ff-` | Form field | `ff-label` |
| `ni-` | Number input | `ni-field` |
| `fu-` | File uploader | `fu-zone` |
| `pg-` | Pagination | `pg-btn` |
| `breadcrumb-` | Breadcrumb | `breadcrumb-item` |
| `dropdown-` | Dropdown | `dropdown-menu` |
| `drawer-` | Drawer | `drawer-overlay` |
| `stepper-` | Stepper | `stepper-step` |
| `select-` | Select input | `select-menu` |
| `audit-` | Audit log page | `audit-table` |
| `alert-` | Alerts page | `alert-row` |
| `recon-` | Bank reconciliation | `recon-panel` |
| `plt-` | Product lots tab | `plt-row` |
| `lkp-` | Lookup page | `lkp-card` |
| `cdp-` | Commercial docs page | `cdp-filters` |
| `lc-` | Line chart | `lc-tooltip` |

**Rule**: Every new CSS class must be prefixed if it belongs to a specific page/component. Shared UI elements (`btn`, `modal`, `card`) use unprefixed names in `components.css`.

---

## 4. Where to Put CSS

| Content | File |
|---------|------|
| Shared UI components (buttons, modals, cards, inputs) | `components.css` |
| POS product grid/card/cart | `pos.css` |
| POS session management | `pos-sessions-v2.css` |
| POS cart v4 | `pos-cart-v4.css` |
| Page-specific layouts (audit, alerts, reconciliation) | `components.css` (appended with prefix) |
| Dark theme overrides | `tokens.css` (`:root` dark section) |
| Animations shared across files | `theme.css` (global section) |
| **Never**: new files | — |

**Rule**: No new CSS files. Append to the appropriate existing file.

---

## 5. Inline `<style>` Tags in TSX

Only **two** files are permitted to have `<style>{...}</style>` blocks:

1. **`PrintSettingsPage.tsx`** — generates dynamic print CSS from template data
2. **`UniversalPrintPipeline.tsx`** — generates thermal receipt CSS at runtime

All other TSX files must NOT contain `<style>` blocks. Extract CSS to external files.

**Rule**: If you need to add styles to a component, add them to the appropriate `.css` file using the class naming convention (section 3). Never add `<style>` tags in new components.

---

## 6. `style={{}}` Inline Styles in JSX

Inline `style={{}}` attributes are permitted ONLY for:

- **Dynamic values** that depend on runtime data (e.g., `transform: translateY(${px}px)`)
- **Layout positioning** that varies per instance (e.g., `width: ${calc}%`, `top: ${offset}px`)
- **Virtual scrolling** positioning (absolute top/width/transform)

**Forbidden** for:
- Colors, backgrounds, borders, shadows — use CSS classes + variables
- Fixed dimensions, padding, margin — use CSS classes
- Font sizes, weights — use CSS classes + `--fs-*` variables

**Rule**: Prefer CSS classes over inline styles. If a value is static or can be expressed via a CSS variable, use a class instead.

---

## 7. Spacing & Sizing Rules

- **Gap/padding/margin**: Always include units (`px`, `em`, `%`). Never use bare numbers like `gap: 10` — always `gap: 10px`.
- **Font sizes**: Use the `--fs-*` type scale. Avoid arbitrary sizes like `11px` unless the scale doesn't cover the need.
- **Border radii**: Use `--r1` through `--r5`. Avoid arbitrary values.
- **Shadows**: Use `--shadow`, `--shadow2`, `--shadow3`. Custom shadows are allowed but must include comments.
- **Colors**: Always use `var(--xxx)`. Never hardcode hex/rgb values in component CSS (only in `tokens.css`).

---

## 8. `@keyframes` Rules

### Shared animations (defined once in `components.css` GLOBAL KEYFRAMES section)

| Name | Purpose |
|------|---------|
| `spin` | Loading spinner rotation |
| `fadeInPop` | Modal/card entrance |
| `slideInRight` | Slide-in panel |
| `fadein` | Generic fade |
| `slideup` | Generic slide up |
| `popIn` | Scale-in effect |
| `floatY` | Gentle float |
| `shimmer` | Skeleton loading |

**Rule**: Never redefine a shared `@keyframes`. Use the existing name. If you need a new animation, add it to the GLOBAL KEYFRAMES section in `components.css`.

### Component-scoped animations

Scoped animations (e.g., `dp-open`, `qtyBump`, `badgeScaleIn`) are defined near their consuming rule in the same file. Use a unique name prefixed with the component abbreviation to avoid collisions.

---

## 9. Grid Size Modifiers (POS)

POS product grid supports 4 sizes: `xs`, `sm`, `md` (default), `lg`.

Modifier classes: `.pgrid--xs`, `.pgrid--sm`, `.pgrid--lg`

Each size has specific overrides for:
- Card dimensions, font sizes, spacing
- Badge sizes (in-cart, stock, discount)
- Action button sizes
- Column count caps (`MAX_COLS: { xs: 8, sm: 6, md: 5, lg: 4 }`)

**Rule**: When adding new POS components, always include `--xs`, `--sm`, and `--lg` modifier variants. Test at all 4 grid sizes.

---

## 10. Component Patterns

### React Component Structure

```
resources/js/
├── components/
│   ├── ui/              ← Shared UI (Button, Modal, Input, Card, etc.)
│   ├── forms/           ← Form-specific (SelectInput, FormInputs)
│   ├── modals/          ← Feature modals (ClientModal, CreateCompanyModal)
│   ├── layouts/         ← Layout shells (DashboardLayout)
│   ├── admin/           ← Admin-specific shared
│   └── charts/          ← Chart components
├── pages/
│   ├── {feature}/       ← One folder per feature area
│   └── {feature}/{Page}.tsx
├── pos/
│   ├── components/      ← POS-specific components
│   ├── utils/           ← POS utilities
│   └── hooks/           ← POS hooks
└── hooks/               ← Global hooks
```

### Export Rules

- Components export as **default** from their file
- Barrel `index.ts` re-exports are only used where import convenience matters
- Hooks use the `use` prefix

---

## 11. Accessibility & RTL

- **Direction**: All POS components must support RTL (`direction: rtl` applied at grid/list container level).
- **Focus visible**: Use `outline` or `box-shadow` for focus states. Never remove focus indicators without providing an alternative.
- **Contrast**: Text on colored backgrounds must meet WCAG AA (4.5:1 for body text). Badges with `--em` background always use `#fff` text + optional `text-shadow`.
- **Pointer events**: Non-interactive overlay elements must have `pointer-events: none`.

---

## 12. Animation & Transition Rules

- **Duration**: Use `--d1` (.15s) for micro-interactions, `--d2` (.25s) for page transitions. Never exceed .4s for UI feedback.
- **Easing**: `cubic-bezier(.4,0,.2,1)` for standard, `ease-out` for entrances, `ease-in` for exits.
- **Reduced motion**: Check `@media (prefers-reduced-motion: reduce)` for critical animations if needed.
- **Badge animations**: Use `badgeScaleIn` (defined in `pos.css`) for quantity badges.

---

## 13. Validation Checklist (Before Submitting)

- [ ] CSS uses only short-form variables from `tokens.css`
- [ ] Dark mode has corresponding overrides for any new variables
- [ ] Class names follow prefix convention (no unscoped names for page-specific styles)
- [ ] No `<style>` blocks in TSX (except PrintSettings/UniversalPrintPipeline)
- [ ] No inline `style={{}}` for static values
- [ ] All gap/padding/margin values include units (`px`)
- [ ] `@keyframes` only defined in GLOBAL section or prefixed with component name
- [ ] POS components have `--xs`, `--sm`, `--lg` modifier variants
- [ ] Build passes (`npm run build` — 0 errors)
- [ ] Tests pass (`npm test` — all green)
- [ ] CSS brace validation passes (balanced `{}` pairs)
