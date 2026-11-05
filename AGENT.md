# Figma to Web (Antigravity Agent Instructions)

> **Auto-Activation Rule**: Whenever the user provides a `figma.com` URL or asks to build, extract tokens, verify fidelity, or audit responsiveness for screens/components, **automatically activate and follow** the `figma-to-laravel` skill and plugin workflow documented below.

---

## 1. Plugin Overview & Purpose

This workspace implements **Figma to Web**: turning Figma frames into production Laravel Blade screens with plain, semantic CSS. Every property must match the Figma design to within **one pixel** at each breakpoint frame's width, verified by automated headless Chrome measurements and pixel-diff testing.

- **Stack**: Laravel + Blade, semantic HTML5, CSS (Tailwind CSS if configured, Bootstrap, or custom CSS), vanilla JS (only when interactivity requires it). **Tailwind CSS is NOT mandatory** — use Tailwind CSS if configured in the project, or use custom CSS / Bootstrap based on project setup.
- **Skill Definition**: [`skills/figma-to-laravel/SKILL.md`](file:///d:/ai%20agent/figma-to-web/skills/figma-to-laravel/SKILL.md)
- **Pixel-Perfect Verification**: [`pixel-perfect-ui`](file:///d:/ai%20agent/figma-to-web/.agents/skills/pixel-perfect-ui/SKILL.md) (autonomous iterative visual comparison and precision auditing)
- **Responsive Architecture**: [`responsive-design`](file:///d:/ai%20agent/figma-to-web/.agents/skills/responsive-design/SKILL.md) (fluid typography, container queries, and mobile-first scaling between Figma frames)
- **CSS Translation Reference**: [`skills/figma-to-laravel/references/figma-to-css.md`](file:///d:/ai%20agent/figma-to-web/skills/figma-to-laravel/references/figma-to-css.md)

---

## 2. Core Operational Workflow

When tasked with building or updating a screen:

### Step 1: Extract Figma Section Stylings to JSON & Generate Spec
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
  └── reference/                  # 1x PNG reference exports per frame width
      ├── <screen>-1440.png
      └── <screen>-375.png
  ```
  Each section JSON (`sections/<section-name>.json`) captures:
  - Exact `nodeId`, positioning, and auto layout (`direction`, `gap`, `padding`, `alignItems`, `justifyContent`, sizing modes).
  - Complete typography definitions (family, weight, size, exact line-height ratio, letter-spacing, text content).
  - Fills (colors, gradients), strokes (border width, color, position), border radii per corner, opacity, blend modes, and effects (box shadows, blurs).
  - Bound design tokens.
- Use the **Figwright MCP server** (`@figwright/mcp`, local WebSocket on `127.0.0.1:3055` connected to the Figwright plugin in the Figma desktop app).
- **Read-Only Guardrail**: Only invoke read tools (`get_design_context`, `token_map`, `component_map`, `icon_map`, `get_screenshot`, `design_diff`). Never alter the Figma file.
- Inspect the design using the role defined in [`agents/figma-inspector.md`](file:///d:/ai%20agent/figma-to-web/agents/figma-inspector.md).
- Export 1x reference images to `docs/design/<screen>/reference/<screen>-<width>.png` (or `docs/design/reference/`).
- Output the design specification to `docs/design/<screen>/spec.md` (or `docs/design/<screen>.md`).

### Step 2: Build Reusable Foundation & Primitives First (Mandatory Before Screens)
- **Strict Foundation Rule**: Never build individual sections or views with hardcoded values. Extract and implement the shared foundation at the top level first:
  1. **Global Tokens** (`resources/css/tokens.css` or Tailwind `@theme` or Bootstrap variables):
     - Colors (`--color-*`), Typography scale (`--font-*` with `rem` sizes, `calc()` line-height ratios, `em` letter-spacing), Spacing (`--space-*`), Border Radii (`--radius-*`), and Elevation/Shadows (`--shadow-*`).
  2. **Base Styles** (`resources/css/base.css`):
     - Box-sizing reset, font antialiasing (`-webkit-font-smoothing: antialiased`), body defaults, and baseline element typography.
     - **Page container (strict)**: always use Bootstrap's `.container` for content width in every section, with its width and gutter overridden once to match the Figma content width; no custom wrappers.
     - **No Bootstrap conflicts**: where a Bootstrap class is used, delete the custom CSS that duplicates or clashes with it (custom wrappers, grids, `.btn`, `.card`, margins or padding on elements already carrying a utility). Never name a custom class like a Bootstrap class; use a distinct prefix.
     - **Shared text classes**: if the same font size/style is used in more than one section, define one reusable class (e.g. `.type-h2`, `.type-body`) and reuse it everywhere; never repeat `font-size` per section. Same for any repeated spacing, container or card style.
  3. **Reusable Blade Components & Primitives**:
     - Buttons (`<x-button>`, `.btn`, `.btn--primary`, `.btn--outline`, focus/active states), Badges/Pills (`<x-badge>`), Form Controls (inputs, selects), and Cards (`<x-card>`).
  - Screen views must consume these reusable tokens and components rather than re-declaring them.

### Step 3: Implement Screen & Responsive Reflow
- **Build-section QA (desktop to mobile)**: build one section at a time; after each, QA it at the widest frame (`compare` + `measure`), add its narrower-frame rules, then sweep 1920px down to 320px and finish at mobile before starting the next section.
- **QA screenshots**: each QA pass saves a screenshot at every dimension tested to `qa/<screen>/<section>/w<width>.png` (`sweep --out qa/<screen>/<section> --all --selector <section>`), including widths that pass.
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

### Step 5: Verify Fidelity & Sweep Responsiveness
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
- **Every component or screen you design or fix gets this sweep before it is called done**: Playwright (through `figma-check.mjs sweep`) from 1920px down to 320px, on a page that renders it. Fix what it reports and run it again until it is clean.
- Follow the auditing criteria defined in [`agents/fidelity-verifier.md`](file:///d:/ai%20agent/figma-to-web/agents/fidelity-verifier.md) and [`agents/responsive-auditor.md`](file:///d:/ai%20agent/figma-to-web/agents/responsive-auditor.md).

### Step 6: Save Baseline & Final Report
- Call Figwright's `design_diff` to store the baseline node state.
- Report all files changed, breakpoints covered, derived decisions, unresolved deviations with rationale, and pixel-diff percentage.

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

