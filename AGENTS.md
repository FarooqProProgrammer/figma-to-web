# Figma to Web (Antigravity Agent Instructions)

> **Auto-Activation Rule**: Whenever the user provides a `figma.com` URL or asks to build, extract tokens, verify fidelity, or audit responsiveness for screens/components, **automatically activate and follow** the `figma-to-laravel` skill and plugin workflow documented below.

---

## 1. Plugin Overview & Purpose

This workspace implements **Figma to Web**: turning Figma frames into production Laravel Blade screens with plain, semantic CSS. Every property must match the Figma design to within **one pixel** at each breakpoint frame's width, verified by automated headless Chrome measurements and pixel-diff testing.

- **Stack**: Laravel + Blade, semantic HTML5, CSS (Tailwind CSS if configured, Bootstrap, or custom CSS), vanilla JS (only when interactivity requires it). **Tailwind CSS is NOT mandatory** — use Tailwind CSS if configured in the project, or use custom CSS / Bootstrap based on project setup.
- **Skill Definition**: [`skills/figma-to-laravel/SKILL.md`](file:///d:/ai%20agent/figma-to-web/skills/figma-to-laravel/SKILL.md)
- **Responsive Architecture**: [`responsive-design`](file:///C:/Users/farooq/.agents/skills/responsive-design/SKILL.md) (fluid typography, container queries, and mobile-first scaling between Figma frames)
- **CSS Translation Reference**: [`skills/figma-to-laravel/references/figma-to-css.md`](file:///d:/ai%20agent/figma-to-web/skills/figma-to-laravel/references/figma-to-css.md)

---

## 2. Core Operational Workflow

When tasked with building or updating a screen:

### Step 1: Inspect Figma & Generate Spec
- Use the **Figwright MCP server** (`@figwright/mcp`, local WebSocket on `127.0.0.1:3055` connected to the Figwright plugin in the Figma desktop app).
- **Read-Only Guardrail**: Only invoke read tools (`get_design_context`, `token_map`, `component_map`, `icon_map`, `get_screenshot`, `design_diff`). Never alter the Figma file.
- Inspect the design using the role defined in [`agents/figma-inspector.md`](file:///d:/ai%20agent/figma-to-web/agents/figma-inspector.md).
- Export 1x reference images to `docs/design/reference/<screen>-<width>.png`.
- Output the design specification to `docs/design/<screen>.md`.

### Step 2: Build Tokens & Shared Components
- Build `resources/css/tokens.css` from the spec variables and styles (`--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`).
- Font sizes in `rem` (`px / 16`), line heights as exact ratios (`calc(22 / 14)`), letter spacing in `em` (`percent / 100`), other dimensions in `px`.
- Build reusable Blade components (`resources/views/components/<name>.blade.php` and `resources/css/components/<name>.css`).

### Step 3: Implement Screen & Responsive Reflow
- Implement the widest Figma frame first in `resources/views/screens/<name>.blade.php` and `resources/css/screens/<name>.css`.
- Add routes in `routes/web.php` and controllers if data is required.
- Write a design fixture/seeder reproducing the exact Figma frame data for faithful pixel diffing.
- Add narrower layouts inside `@media (max-width: ...px)` queries. Integrate the [`responsive-design`](file:///C:/Users/farooq/.agents/skills/responsive-design/SKILL.md) skill:
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

  # Viewport width sweep (320px to 1920px)
  node scripts/figma-check.mjs sweep --url http://127.0.0.1:8000/<route> --also <breakpoint-widths> --out tmp/sweep
  ```
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
- `/figma-to-web:check-responsive <screen>` -> Sweep viewport widths 320px-1920px ([commands/check-responsive.md](file:///d:/ai%20agent/figma-to-web/commands/check-responsive.md))

---

## 4. Coding & Architecture Rules

Always enforce the rules defined in `rules/`:
- **General Project Conventions**: [`rules/figma-project.md`](file:///d:/ai%20agent/figma-to-web/rules/figma-project.md)
- **Frontend & CSS Conventions**: [`rules/figma-frontend.md`](file:///d:/ai%20agent/figma-to-web/rules/figma-frontend.md)
- **Laravel, Tests & Documentation**: [`rules/figma-laravel.md`](file:///d:/ai%20agent/figma-to-web/rules/figma-laravel.md)

