# Figma to Web (Antigravity Agent Instructions)

> **Auto-Activation Rule**: Whenever the user provides a `figma.com` URL or asks to build, extract tokens, verify fidelity, or audit responsiveness for screens/components, **automatically activate and follow** the `figma-to-laravel` skill and plugin workflow documented below.

---

## 1. Plugin Overview & Purpose

This workspace implements **Figma to Web**: turning Figma frames into production Laravel Blade screens with pixel precision and clean, semantic CSS. Every property must match the Figma design to within **one pixel** at each breakpoint frame's width, verified by automated headless Chrome measurements and pixel-diff testing.

- **Stack**: Laravel + Blade, semantic HTML5, CSS (Tailwind CSS if configured, Bootstrap, or custom CSS), vanilla JS (only when interactivity requires it). **Tailwind CSS is NOT mandatory** — use Tailwind CSS if configured in the project, or use custom CSS / Bootstrap based on project setup.
- **Skill Definition**: [`skills/figma-to-laravel/SKILL.md`](file:///d:/ai%20agent/figma-to-web/skills/figma-to-laravel/SKILL.md)
- **Pixel-Perfect Verification**: [`pixel-perfect-ui`](file:///d:/ai%20agent/figma-to-web/.agents/skills/pixel-perfect-ui/SKILL.md) (autonomous iterative visual comparison and precision auditing)
- **Responsive Architecture**: [`responsive-design`](file:///d:/ai%20agent/figma-to-web/.agents/skills/responsive-design/SKILL.md) (fluid typography, container queries, and mobile-first scaling between Figma frames)
- **Design Diagnostics**: [`design-doctor`](file:///d:/ai%20agent/figma-to-web/.agents/skills/design-doctor/SKILL.md) (diagnose why a built screen does not match Figma, root-cause analysis before editing CSS)
- **Gap Auditing**: [`find-design-gaps`](file:///d:/ai%20agent/figma-to-web/.agents/skills/find-design-gaps/SKILL.md) (audit Figma specs for missing frames, states, and tokens before building)
- **Modern CSS Standards**: [`good-css`](file:///d:/ai%20agent/figma-to-web/.agents/skills/good-css/SKILL.md) and [`css`](file:///d:/ai%20agent/figma-to-web/.agents/skills/css/SKILL.md) (flat specificity, zero `!important`, container queries, modern layout techniques)
- **Custom Skills Suite** (`.agents/skills/`):
  - `match-section-gaps`: Vertical section spacing matching Figma within 1px.
  - `split-page-and-shared-css`: Strict separation of page-specific CSS from shared CSS.
  - `extract-asset-from-figwright`: Extract and optimize SVGs and raster assets into `public/images/<screen>/`.
  - `code-comments`: Structured header and section banner commenting standards across Blade, CSS, and PHP.
  - `use-claude-plugin`: Adapt, bridge, and execute Claude Code plugins, skills, and MCP configs in Antigravity.
  - `bootstrap-*` suite: Complete Bootstrap 6 setup and customization skills (`bootstrap-v6-install`, `bootstrap-vite`, `bootstrap-webpack`, `bootstrap-parcel`, `bootstrap-npm`, `bootstrap-color-system`, `bootstrap-component`, `bootstrap-component-js`, `bootstrap-utility-api`, `bootstrap-v4-v6-migration`, `bootstrap-v5-v6-migration`).
- **CSS Translation Reference**: [`skills/figma-to-laravel/references/figma-to-css.md`](file:///d:/ai%20agent/figma-to-web/skills/figma-to-laravel/references/figma-to-css.md)
- **CSS & Responsive Reading List**: [`skills/figma-to-laravel/references/css-resources.md`](file:///d:/ai%20agent/figma-to-web/skills/figma-to-laravel/references/css-resources.md) (MDN, web.dev, Utopia, Can I use)
- **Plugin Flow (start and end)**: [`docs/plugin-flow.md`](file:///d:/ai%20agent/figma-to-web/docs/plugin-flow.md)

---

## 2. Core Operational Workflow

When tasked with building or updating a screen:

### Step 1: Extract Figma Section Stylings to JSON, Extract Assets & Audit Gaps
- **Mandatory First Step**: Before writing any Blade view or CSS code, extract the node styling of each section for every page into structured JSON files with a clean folder structure:
  ```text
  docs/design/<screen>/
  ├── spec.md                     # Markdown summary spec
  ├── tokens.json                 # Colors, typography, spacing, shadows, radii tokens
  ├── components.json             # Components and variants map
  ├── sections/                   # Individual section node styling JSON files
  │   ├── header.json
  │   ├── hero.json
  │   ├── features.json
  │   ├── pricing.json
  │   ├── cta.json
  │   └── footer.json
  ├── reference/                  # 1x PNG reference exports per frame width
  │   ├── <screen>-1440.png
  │   └── <screen>-375.png
  └── gaps.md                     # Pre-build design gaps audit
  ```
  Each section JSON (`sections/<section-name>.json`) captures:
  - Exact `nodeId`, positioning, and auto layout (`direction`, `gap`, `padding`, `alignItems`, `justifyContent`, sizing modes).
  - Complete typography definitions (family, weight, size, exact line-height ratio, letter-spacing, text content).
  - Fills (colors, gradients), strokes (border width, color, position), border radii per corner, opacity, blend modes, and effects (box shadows, blurs).
  - Bound design tokens and variables.
- Use the **Figwright MCP server** (`@figwright/mcp`, local WebSocket on `127.0.0.1:3055` connected to the Figwright plugin in the Figma desktop app).
- **Read-Only Guardrail**: Only invoke read tools (`get_design_context`, `token_map`, `component_map`, `icon_map`, `get_screenshot`, `design_diff`, `save_image_fills`). Never alter the Figma file.
- Inspect the design using the role defined in [`agents/figma-inspector.md`](file:///d:/ai%20agent/figma-to-web/agents/figma-inspector.md).
- Export 1x reference images to `docs/design/<screen>/reference/<screen>-<width>.png`.
- Output the design specification to `docs/design/<screen>/spec.md`.
- **Extract Assets**: Use the [`extract-asset-from-figwright`](file:///d:/ai%20agent/figma-to-web/.agents/skills/extract-asset-from-figwright/SKILL.md) skill to export vector icons and logos as SVG, and raster photos as optimized modern formats (AVIF/WebP) into `public/images/<screen>/`.
- **Gap Check (Strict Gate)**: Run the [`find-design-gaps`](file:///d:/ai%20agent/figma-to-web/.agents/skills/find-design-gaps/SKILL.md) skill on the spec and write `docs/design/<screen>/gaps.md`. Do not start the build while blocking gaps are unanswered, unless the user accepts the proposed defaults.

### Step 2: Build Reusable Foundation & Primitives First (Mandatory Before Screens)
- **Strict Foundation Rule**: Never build individual sections or views with hardcoded values. Extract and implement the shared foundation at the top level first:
  1. **Global Tokens** (`resources/css/tokens.css` or Tailwind `@theme` or Bootstrap variables):
     - Colors (`--color-*`), Typography scale (`--font-*` with `rem` sizes, `calc()` line-height ratios, `em` letter-spacing), Spacing (`--space-*`), Border Radii (`--radius-*`), and Elevation/Shadows (`--shadow-*`).
  2. **Base Styles** (`resources/css/base.css`):
     - Box-sizing reset, font antialiasing (`-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`), body defaults, and baseline element typography.
     - **Page container (strict)**: Always use Bootstrap's `.container` for content width in every section, with its width and gutter overridden once to match the Figma content width; no custom wrappers.
     - **No Bootstrap conflicts**: Where a Bootstrap class is used (`.container`, `.row`, `.col-*`, `.d-flex`, `.btn`, utilities), delete the custom CSS that duplicates or clashes with it (custom wrappers, hand-written flex/grids, `.btn`, `.card`, margins or padding on elements already carrying a utility). Never name a custom class like a Bootstrap class; use a distinct prefix.
     - **Shared text classes**: If the same font size/style is used in more than one section, define one reusable class (e.g. `.type-h1`, `.type-h2`, `.type-body`, `.type-caption`) and reuse it everywhere; never repeat `font-size` per section. Same for any repeated spacing, container, or card style.
     - **Modern CSS standards**: Follow [`good-css`](file:///d:/ai%20agent/figma-to-web/.agents/skills/good-css/SKILL.md) and [`css`](file:///d:/ai%20agent/figma-to-web/.agents/skills/css/SKILL.md) — flat specificity, no `!important`, CSS custom properties for repeated values, and `:focus-visible` styles on all interactive elements.
  3. **Reusable Blade Components & Primitives**:
     - Buttons (`<x-button>`, `.btn`, `.btn--primary`, `.btn--outline`, focus/active states), Badges/Pills (`<x-badge>`), Form Controls (inputs, selects), and Cards (`<x-card>`).
  - Screen views must consume these reusable tokens and components rather than re-declaring them.

### Step 3: Implement Screen & Responsive Reflow
- **Build-section QA (desktop to mobile)**: Build one section at a time; after each, QA it at the widest frame (`compare` + `measure`), add its narrower-frame rules, then sweep 1920px down to 320px and finish at mobile before starting the next section.
- **QA screenshots**: Each QA pass saves a screenshot at every dimension tested to `qa/<screen>/<section>/w<width>.png` (`sweep --out qa/<screen>/<section> --all --selector <section>`), including widths that pass.
- **Section Spacing**: Follow [`match-section-gaps`](file:///d:/ai%20agent/figma-to-web/.agents/skills/match-section-gaps/SKILL.md) — vertical gap between sections matches Figma to within 1px at every frame width, using one single mechanism (`--section-gap` / `--section-pad-y`), never margins between sections.
- **CSS Architecture**: Follow [`split-page-and-shared-css`](file:///d:/ai%20agent/figma-to-web/.agents/skills/split-page-and-shared-css/SKILL.md) — page-specific styles live in `resources/css/screens/<page>.css` (prefixed with the page name), and shared styles live in shared files (`tokens.css`, `base.css`, `typography.css`, `layout.css`, `components/<name>.css`).
- **Code Comments**: Follow [`code-comments`](file:///d:/ai%20agent/figma-to-web/.agents/skills/code-comments/SKILL.md) — file header comment (purpose and Figma node), section banners (`/* --- Section: <Name> [Node: <id>] --- */`), and short rationale comments on any derived values or workarounds.
- **Image Optimization (Fast Loading)**:
  - Vectors as SVGs; raster art as AVIF/WebP with fallback via `<picture>`.
  - Responsive `srcset` and accurate `sizes`.
  - Explicit `width` and `height` attributes to avoid layout shifts (CLS).
  - Lazy loading (`loading="lazy" decoding="async"`) below the fold.
  - Above the fold: hero image is never lazy, marked with `fetchpriority="high"`.
- Implement the widest Figma frame first in `resources/views/screens/<name>.blade.php` and `resources/css/screens/<name>.css`.
- Add routes in `routes/web.php` and controllers if data is required.
- Write a design fixture/seeder reproducing the exact Figma frame data for faithful pixel diffing.
- Add narrower layouts inside `@media (max-width: ...px)` queries. Integrate the [`responsive-design`](file:///d:/ai%20agent/figma-to-web/.agents/skills/responsive-design/SKILL.md) skill:
  - Use container queries (`@container`) for self-contained components.
  - Employ fluid typography and spacing where appropriate to avoid abrupt jumps between distant breakpoints.
  - Maintain 44x44px minimum mobile touch targets.
  - Mark any derived layout decisions with `/* derived: ... */`.

### Step 4: Write Tests & Documentation
- Write Feature test in `tests/Feature/Screens/<Name>Test.php` calling `$this->withoutVite()`.
- Write Laravel Dusk responsive test in `tests/Browser/<Name>ResponsiveTest.php`.
- Document implementation details in `docs/screens/<screen>.md`.

### Step 5: Verify Fidelity, Run Diagnostics & Sweep Responsiveness
- Run headless Chrome checks via `scripts/figma-check.mjs`:
  ```bash
  # Pixel diff comparison
  node scripts/figma-check.mjs compare --url http://127.0.0.1:8000/<route> --width <width> --ref docs/design/reference/<screen>-<width>.png --out tmp/diff

  # Selector geometry and computed style measurement
  node scripts/figma-check.mjs measure --url http://127.0.0.1:8000/<route> --width <width> --selectors "<selectors>"

  # First Contentful Paint (strict: must pass the 1.8 s budget on throttled mobile)
  node scripts/figma-check.mjs fcp --url http://127.0.0.1:8000/<route> --width 375

  # Viewport width sweep (Playwright, 1920px down to 320px)
  node scripts/figma-check.mjs sweep --url http://127.0.0.1:8000/<route> --also <breakpoint-widths> --out tmp/sweep
  ```
- **Diagnostics with `design-doctor`**: If the screen does not match Figma or deviations exceed 1px, run the [`design-doctor`](file:///d:/ai%20agent/figma-to-web/.agents/skills/design-doctor/SKILL.md) skill before editing CSS. It runs `compare`, `measure`, `sweep`, and `fcp`, determines the root cause, and writes a ranked diagnosis to `docs/screens/<screen>-diagnosis.md`.
- Plugin self-checks (in `scripts/`): `npm test` (tool self-test) and `npm run test:responsive` (Playwright responsive cases: sweep 1920px to 320px, stacking, 44px targets, container width).
- **Mandatory Sweep**: Every component or screen designed or fixed gets this sweep before it is called done: Playwright (through `figma-check.mjs sweep`) from 1920px down to 320px. Fix what it reports and run it again until it is clean.
- Follow the auditing criteria defined in [`agents/fidelity-verifier.md`](file:///d:/ai%20agent/figma-to-web/agents/fidelity-verifier.md) and [`agents/responsive-auditor.md`](file:///d:/ai%20agent/figma-to-web/agents/responsive-auditor.md).

### Step 6: Save Baseline & Final Report
- Call Figwright's `design_diff` to store the baseline node state.
- Report all files changed, breakpoints covered, derived decisions (`derived:`), unresolved deviations with rationale, and pixel-diff percentage.

---

## 3. Slash Commands Quick Reference

Map user commands to the corresponding workflow:
- `/figma-to-web:build-screen <figma-url>...` -> Implement screen end-to-end ([commands/build-screen.md](file:///d:/ai%20agent/figma-to-web/commands/build-screen.md))
- `/figma-to-web:extract-tokens <figma-url>...` -> Extract tokens & shared components only ([commands/extract-tokens.md](file:///d:/ai%20agent/figma-to-web/commands/extract-tokens.md))
- `/figma-to-web:verify-fidelity <screen>` -> Measure & diff rendered screen against Figma ([commands/verify-fidelity.md](file:///d:/ai%20agent/figma-to-web/commands/verify-fidelity.md))
- `/figma-to-web:setup-figwright` -> Install and verify the Figwright MCP server and Figma plugin ([commands/setup-figwright.md](file:///d:/ai%20agent/figma-to-web/commands/setup-figwright.md))
- `/figma-to-web:check-responsive <screen>` -> Sweep viewport widths 1920px down to 320px ([commands/check-responsive.md](file:///d:/ai%20agent/figma-to-web/commands/check-responsive.md))

---

## 4. Coding & Architecture Rules

Always enforce the rules defined in `rules/`:
- **General Project Conventions**: [`rules/figma-project.md`](file:///d:/ai%20agent/figma-to-web/rules/figma-project.md)
- **Frontend & CSS Conventions**: [`rules/figma-frontend.md`](file:///d:/ai%20agent/figma-to-web/rules/figma-frontend.md)
- **Laravel, Tests & Documentation**: [`rules/figma-laravel.md`](file:///d:/ai%20agent/figma-to-web/rules/figma-laravel.md)
