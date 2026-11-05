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

## 1. Read the design

Hand each screen to the `figma-to-web:figma-inspector` agent with its frame URLs and breakpoint labels. It writes the spec to `docs/design/<screen>.md`, with exact values and the node ID behind each one, and saves a 1x export of each frame to `docs/design/reference/`. Read the spec. Where it is silent or ambiguous on a value, query that node yourself; do not estimate.

For several screens, run the inspectors in parallel, then build the foundation from all the specs before building any screen, so the tokens are consistent across them.

## 2. Build the shared foundation

Map tokens from the spec's variables and styles (`colors`, `fonts`, `spacing`, `radii`, `shadows`):
- **Tailwind CSS setup**: extend `tailwind.config.js` or CSS `@theme` with the Figma tokens.
- **Bootstrap setup**: override Bootstrap SCSS/CSS custom properties or add token utility classes.
- **Custom CSS setup**: write `tokens.css` with custom properties (`--color-*`, `--font-*`, `--space-*`, etc.).

Then create Blade components for elements that are Figma components or recur. Add only what these screens use.

If tokens and components already exist, reuse them. When a Figma value contradicts an existing token, find out whether the design changed or the token was wrong before editing it, because other screens depend on it.

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
