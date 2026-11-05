# Figma to Web

An agentic plugin and workflow for **Google Antigravity** and **Claude Code** that turns Figma frames into production Laravel Blade screens with pixel precision, verified against the design with automated measurements and pixel-diff testing at every breakpoint.

---

## What It Does

1. **Extracts Section Node Styling to JSON First**: Reads Figma frames through the [Figwright](https://github.com/awdr74100/figwright) MCP server and exports the exact styling, layout, typography, fills, and effects of every page section into structured JSON files (`docs/design/<screen>/sections/<name>.json`), along with design tokens and 1x reference images.
2. **Flexible Styling Setup**:
   - **Tailwind CSS is NOT mandatory**: If the target project uses Tailwind CSS (`tailwind.config.js` or `@tailwindcss/vite`), it maps Figma tokens to `@theme`/tailwind config and uses utility classes.
   - **Bootstrap**: If configured, it leverages Bootstrap's grid and components with custom token overrides.
   - **Plain Custom CSS**: If no framework is configured, it generates clean, semantic CSS (`resources/css/tokens.css`, `components/*.css`, `screens/*.css`) using modern vanilla CSS best practices (`good-css` and `css` skills).
3. **Responsive & Adaptive Architecture**: Builds the widest frame desktop-first, then applies `@media (max-width)` queries and container queries (`@container`), leveraging fluid typography and touch-target accessibility from the integrated `responsive-design` skill.
4. **Automated Fidelity & Responsive Verification**: Tests fonts, verifies element geometry to within 1 pixel via headless Chrome, performs pixel-diff comparisons against Figma 1x exports, and sweeps viewport widths (320px to 1920px) for overflow, overlap, and clipped text.
5. **Baseline Diff & Full Reporting**: Saves baseline node states with Figwright's `design_diff` and reports all breakpoints covered, derived decisions, and pixel-diff metrics.

---

## Requirements

- **Google Antigravity** or **Claude Code**.
- **Figma desktop app** with the Figwright plugin imported (free Figma tier is sufficient; no Dev Mode seat needed).
- **Node.js** 20.19+ or 22.12+.
- **Google Chrome** or **Microsoft Edge** (for headless pixel checks and responsive sweeps).
- **PHP 8.2+**, **Composer**, and a Laravel application (the skill scaffolds one if missing).

---

## Installation & Auto-Loading

### In Google Antigravity
This repository is pre-configured to auto-load in Antigravity:
- [`AGENT.md`](AGENT.md) and [`AGENTS.md`](AGENTS.md) automatically instruct the agent to trigger the `figma-to-laravel` workflow whenever a Figma URL or build task is provided.
- [`.agents/skills.json`](.agents/skills.json) indexes the skill catalog.
- [`.agents/mcp_config.json`](.agents/mcp_config.json) connects Antigravity to the Figwright MCP server.

### In Claude Code
From a local copy:
```bash
claude plugin marketplace add "D:\ai agent\figma-to-web"
claude plugin install figma-to-web@figma-to-web-marketplace
```

Or run for a single session:
```bash
claude --plugin-dir "D:\ai agent\figma-to-web"
```

Install checking script dependencies once:
```bash
npm install --prefix scripts
```

---

## Figwright Setup

The plugin starts the Figwright MCP server (`@figwright/mcp`) over a local WebSocket on `127.0.0.1:3055`.

1. Download the Figwright plugin zip from [Figwright Releases](https://github.com/awdr74100/figwright/releases) and unzip it.
2. In the Figma desktop app: **Menu → Plugins → Development → Import plugin from manifest…** and select `manifest.json`.
3. Open your Figma design and launch **Plugins → Development → Figwright** (status will display **Connected**).
4. Keep Figwright running in the background. The plugin interacts with Figwright strictly using **read-only** tools.

---

## Commands & Skills

| Command / Trigger | What It Does |
|---|---|
| `/figma-to-web:build-screen <figma-url>…` | Builds one screen end to end, one URL per breakpoint frame |
| `/figma-to-web:extract-tokens <figma-url>…` | Extracts tokens, section JSONs, and shared components |
| `/figma-to-web:verify-fidelity <screen>` | Measures and pixel-diffs a screen against its Figma frames |
| `/figma-to-web:check-responsive <screen>` | Sweeps viewport widths (320px–1920px) and catches breaking layouts |

*Pasting a `figma.com` URL in chat also auto-triggers the workflow.*

---

## Design Artifacts Folder Structure

Before writing Blade views or stylesheets, the plugin creates a structured design directory:

```text
docs/design/<screen>/
├── spec.md                     # Markdown summary spec
├── tokens.json                 # Colors, typography, spacing, shadows, radii tokens
├── components.json             # Components & variants map
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

---

## Verification Tooling (`scripts/figma-check.mjs`)

You can execute headless Chrome checks manually or via the verification agents:

```bash
# 1. Pixel diff against Figma 1x export
node scripts/figma-check.mjs compare --url http://127.0.0.1:8000/pricing --width 1440 --ref docs/design/reference/pricing-1440.png --out tmp/diff

# 2. Measure geometry and computed styles
node scripts/figma-check.mjs measure --url http://127.0.0.1:8000/pricing --width 1440 --selectors ".hero__title,.button"

# 3. Viewport width sweep (320px to 1920px)
node scripts/figma-check.mjs sweep --url http://127.0.0.1:8000/pricing --also 767,768,769 --out tmp/sweep
```

---

## Integrated Skills

- [`skills/figma-to-laravel/`](skills/figma-to-laravel/SKILL.md): Core end-to-end Figma to Laravel Blade conversion.
- [`.agents/skills/pixel-perfect-ui/`](.agents/skills/pixel-perfect-ui/SKILL.md): Autonomous iterative visual validation loop and precision discrepancy auditing.
- [`.agents/skills/good-css/`](.agents/skills/good-css/SKILL.md): Modern plain CSS techniques (fluid `clamp()`, logical properties, clean layout patterns).
- [`.agents/skills/css/`](.agents/skills/css/SKILL.md): Semantic HTML5 standards and maintainable CSS architecture.
- [`responsive-design`](file:///C:/Users/farooq/.agents/skills/responsive-design/SKILL.md): Container queries, fluid spacing, and mobile touch-target accessibility.
