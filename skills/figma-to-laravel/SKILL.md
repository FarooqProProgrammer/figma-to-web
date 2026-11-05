---
name: figma-to-laravel
description: Implement Figma frames as Laravel Blade screens using Tailwind CSS (if configured), Bootstrap, or custom CSS, matching the design to the pixel at every breakpoint and proving it with measurements and a pixel diff. Use when the user shares a figma.com URL or asks to build, implement or update a screen, page or component from a Figma design.
---

# Figma to Laravel

Turn one screen's Figma frames into a Blade view, its CSS (using Tailwind CSS if configured, Bootstrap, or custom CSS), its tests and its docs. The bar is every measurable property within one pixel of the Figma frame at that frame's width, and nothing overflowing, clipping or overlapping at any width in between. "Looks right" is not evidence: the screen is finished when the checking script says so.

## Before you start

- **Conventions.** Read the three files in `${CLAUDE_PLUGIN_ROOT}/rules/` and `${CLAUDE_SKILL_DIR}/references/figma-to-css.md`. If the project's `.claude/rules/` does not already hold the three rule files, copy them there, so they keep applying to later edits made without this skill. A plugin cannot install rules by itself.
- **Figwright.** The design is read through the Figwright MCP server that ships with this plugin, and through no other Figma server, even when one is connected. Figwright reads the file that is open in Figma with the Figwright plugin running, so call its `ping` first. If the server is missing or the plugin is not connected, stop and tell the user to open the file in Figma and run **Plugins → Development → Figwright**; the plugin's README has the one-time setup. Only read: Figwright can also edit the Figma file, and nothing in this workflow changes the design.
- **The frames.** You need at least one frame, and you need to know which frame is which breakpoint. A frame is named by its URL (`node-id=12-34` in the URL is node `12:34`) or is the current selection in Figma. If neither was given, ask. Do not build from a description or a pasted screenshot.
- **A Laravel app and styling configuration.** If there is no `artisan` file, scaffold one. `composer create-project` refuses a non-empty directory, so if the folder already holds files, create the app in a temporary sibling folder and move its contents in.
  - **Tailwind CSS is NOT mandatory.** Check the project setup: if Tailwind CSS is configured (e.g., `tailwind.config.js`, `@tailwindcss/vite`, or Tailwind packages in `package.json`), use Tailwind CSS.
  - If the project is configured with **Bootstrap**, use Bootstrap alongside custom CSS overrides for exact token values.
  - If neither is configured, use **custom plain CSS**. Never force-remove Tailwind if the project or user configured it.
- **PHP, Composer and Node.** If any is missing, tell the user before writing code. Without a running app nothing can be verified, and unverified code must not be reported as matching the design.
- **The checking script.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/figma-check.mjs"` screenshots, pixel-diffs, measures and sweeps a page in headless Chrome. If it reports a missing dependency, run the `npm install` command it prints.

## 1. Extract Figma section node stylings to JSON & generate specs

**First and foremost, before writing any Blade or CSS code**: For every page/screen in Figma, inspect and extract the complete node styling of each section and save them into structured JSON files within a dedicated folder hierarchy:

```text
docs/design/<screen>/
├── spec.md                     # High-level screen spec & breakpoint hierarchy
├── tokens.json                 # Extracted variables (colors, typography, spacing, shadows, radii)
├── components.json             # Component variants and property mappings
├── sections/                   # Individual section node styling JSONs
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

Each section JSON (`sections/<section-name>.json`) must capture the exact Figma node properties:
- **Node Metadata**: `nodeId`, `name`, section hierarchy.
- **Geometry & Auto Layout**: `width`, `height`, `direction` (row/column), `gap`, `padding` (top, right, bottom, left), `alignItems`, `justifyContent`, `wrap`, and sizing modes (`hug`, `fill`, `fixed`).
- **Typography**: Font family, font weight, font size (px), exact line-height ratio, letter spacing, text alignment, and text content.
- **Fills & Strokes**: Solid/gradient fills, stroke width, stroke position (inside/outside/center), border radii per corner, opacity, and blend modes.
- **Effects**: Box shadows, drop shadows, background blurs, layer blurs.
- **Bound Variables**: Any Figma tokens linked to properties.

Hand each screen to the `figma-to-web:figma-inspector` agent with its frame URLs and breakpoint labels to generate this folder structure, JSON files, spec, and 1x reference images. Where a value is silent or ambiguous, query that node yourself; do not estimate.

For several screens, run the inspectors in parallel, then build the foundation from all the specs before building any screen, so the tokens are consistent across them.

## 2. Build the reusable foundation & tokens first (MANDATORY BEFORE SCREENS)

**Strict Rule**: Never implement individual page sections or views before extracting and establishing the shared foundation. All recurring styles, design tokens, and UI primitives must live at the top level so sections consume them without duplicating or hardcoding raw values.

### A. Global Design Tokens
Extract all Figma variables and styles into a single source of truth:
- **Colors**: Brand primaries, neutrals, background, surface, borders, status colors, and gradients (`--color-*`).
- **Typography Scale**: Font families, weights, font sizes (in `rem`), exact line-height ratios (`calc(...)`), letter spacing (`em`), and text colors for headings (H1–H6), body, captions, and links.
- **Spacing Scale**: Consistent spacing scale for margins, paddings, and gaps (`--space-1`, `--space-2`, `--space-4`, etc.).
- **Border Radii**: Corner curves for buttons, cards, badges, and modals (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`).
- **Elevation & Shadows**: Box shadows, drop shadows, and blur filters (`--shadow-sm`, `--shadow-md`, `--shadow-lg`).

**Implementation according to project stack**:
- **Tailwind CSS**: Extend `tailwind.config.js` or CSS `@theme` block with all Figma tokens.
- **Bootstrap**: Override Bootstrap SCSS/CSS variables (`$theme-colors`, `$font-sizes`, `--bs-*`) or add utility token mappings.
- **Custom CSS**: Write `resources/css/tokens.css` with `:root` CSS custom properties.

### B. Base Styles (`resources/css/base.css`)
- Global `box-sizing: border-box` reset.
- Body defaults: background color, default typography, `-webkit-font-smoothing: antialiased`, and `-moz-osx-font-smoothing: grayscale`.
- Heading and paragraph default margins and font hierarchies.

### C. Reusable UI Primitives (Blade Components)
Before writing any screen view, build the reusable Blade components and component stylesheets for elements that appear across multiple sections:
- **Buttons** (`<x-button variant="primary|secondary|outline" size="sm|md|lg">`): Shared `.btn` styles, modifier classes, hover/active/focus-visible states.
- **Badges / Chips / Pills** (`<x-badge variant="...">`).
- **Form Controls** (Inputs, textareas, selects, checkboxes with consistent focus and validation states).
- **Cards & Shells** (`<x-card>` containers with standard padding, border, and shadow).
- **Icons & Avatars**: Reusable SVG icon components or asset helpers.

If tokens and components already exist in the codebase, reuse them. When a Figma value contradicts an existing token, determine whether the design was updated or the token was inaccurate before altering it.

## 3. Build the screen at the widest frame

Add the route, the controller if the screen has data, the Blade view and styling (via Tailwind utility classes, Bootstrap classes, or dedicated `screens/<name>.css`). Translate auto layout into flexbox as the reference describes; do not reproduce coordinates, since auto layout is what tells you how the screen should reflow. Export assets through Figwright into `public/images/<screen>/`: `save_image_fills` gives the original uploaded images, and `icon_map` finds icons the project already has before any are exported again.

Render the frame's own content. If the screen has data, write the design fixture now, so the page shows the same text, item counts and images as the frame. Without it the comparison in step 6 measures the content, not your CSS.

Check as you go. After each major section, run the script's `compare` against the frame's reference image and fix what the diff shows before building the next section. Differences are cheap to find while they are few.

## 4. Make it responsive

For each narrower frame, add a `max-width` block that changes only what differs from the wider layout. Integrate the **`responsive-design`** skill (`~/.agents/skills/responsive-design/SKILL.md`) for intermediate widths and component adaptation:

- **Figma breakpoint mappings**: Anchor layout switches at widths dictated by the Figma frames.
- **Fluid & Adaptive principles** (from `responsive-design` skill):
  - Use container queries (`@container`) for self-contained components that adapt across different grid columns or viewport widths.
  - Apply fluid values and clamp scales where appropriate to prevent abrupt jumps between distant breakpoints.
  - Ensure mobile touch targets meet the 44x44px accessibility baseline.
  - Avoid fixed pixel widths that trigger horizontal scrolling or overflow (`overflow-x`).
- **Conservative derivation**: Where the designer gave no frame for a breakpoint, derive it conservatively:
  - Keep type styles and tokens from the nearest frame that exists.
  - Stack multi-column auto layouts in reading order.
  - Let "fill" elements shrink, and keep "fixed" elements fixed until they no longer fit.
  - Introduce no visual style the design does not already contain.

Mark each derived block with a `derived:` comment and list it in the screen's doc.

## 5. Write the tests and docs

Write the feature test, the Dusk responsive test, `docs/screens/<screen>.md`, and the README section on running the app and tests, as the rules describe.

## 6. Verify

Run the tests. Then start the `figma-to-web:fidelity-verifier` and `figma-to-web:responsive-auditor` agents in parallel. They are independent checks that measure the running screen themselves, and they only report, so the fixes are yours.

Fix what they find and run them again. Stop when both come back clean, or when two rounds have made no progress on a deviation. Such a deviation goes in the screen's doc with its reason. It is reported, never quietly accepted, and the reference's last section lists the few kinds that are expected.

## 7. Report

Once the screen matches, call Figwright's `design_diff` on each frame's node to save a baseline. When the design changes later, the same call returns what changed, node by node, so only the affected code is edited.

Finish with the report described in the project rules: files, breakpoints covered, assumptions, derived decisions, unresolved deviations, and the pixel-diff percentage at each frame width.
