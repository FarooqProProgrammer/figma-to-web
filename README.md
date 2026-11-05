# Figma to Web

A Claude Code plugin that builds Laravel Blade screens with plain CSS from Figma frames, then checks them against the design with measurements and a pixel diff at every breakpoint.

## What it does

1. Reads the Figma frames through the [Figwright](https://github.com/awdr74100/figwright) MCP server, which the plugin starts for you, and writes an exact design spec, plus a 1x reference image of each frame.
2. Builds CSS tokens and Blade components from the design's variables and styles.
3. Builds each screen at its widest frame, then adds the narrower layouts.
4. Verifies the result in headless Chrome: fonts loaded, every element within one pixel of the spec, a pixel diff against the Figma export, and a sweep from 320px to 1920px for overflow, clipped text and overlap.
5. Reports the breakpoints covered, every derived decision, and every deviation it could not resolve.

Text is the one accepted difference. Figma and browsers rasterise glyphs differently, so text edges differ by a fringe of pixels even when every metric is equal.

## Requirements

- Claude Code.
- The Figma desktop app, to import the Figwright plugin. The free Figma tier is enough; no Dev Mode seat is needed.
- Node 20.19 or later (or 22.12 or later), for Figwright and the checking script.
- Google Chrome or Microsoft Edge, for the checking script.
- PHP, Composer and a Laravel app (the skill scaffolds one if the folder has none).

## Install

From a local copy:

```
claude plugin marketplace add "D:\ai agent\figma-to-web"
claude plugin install figma-to-web@figma-to-web-marketplace
```

Or load it for one session without installing:

```
claude --plugin-dir "D:\ai agent\figma-to-web"
```

The checking script needs its dependencies once per install. It prints the exact command when they are missing:

```
npm install --prefix "<plugin folder>/scripts"
```

## Set up Figwright

The plugin's `.mcp.json` starts the Figwright server (`@figwright/mcp`, pinned to 0.7.0 in `scripts/figwright-mcp.mjs`). Figwright reaches Figma through its own Figma plugin, which you install once:

1. Download the plugin zip for the same version from the [Figwright releases](https://github.com/awdr74100/figwright/releases) and unzip it.
2. In the Figma desktop app, choose **Menu → Plugins → Development → Import plugin from manifest…** and pick the unzipped `manifest.json`.
3. Open the design file and run **Plugins → Development → Figwright**. The panel shows **Connected**.

Keep the Figwright panel open (or use its **Run in background** button) while Claude works. The server and the Figma plugin ship together, so when you raise the pinned version, replace the Figma plugin with the one from the same release.

Figwright runs entirely on your machine, over a WebSocket on `127.0.0.1:3055`. It can edit Figma files as well as read them. This plugin's skill and agents are told to read only, and Claude Code's tool approvals are what enforce that, so do not blanket-approve Figwright's write tools.

## Use

| Command | What it does |
|---|---|
| `/figma-to-web:build-screen <figma-url>…` | Builds one screen end to end, one URL per breakpoint frame |
| `/figma-to-web:extract-tokens <figma-url>…` | Builds only the tokens and shared components |
| `/figma-to-web:verify-fidelity <screen>` | Measures and pixel-diffs a screen against its frames, and fixes deviations |
| `/figma-to-web:check-responsive <screen>` | Sweeps a screen across widths and fixes what breaks |

Sharing a figma.com URL and asking for it to be built also triggers the skill. With no URL, the commands use the frame selected in Figma.

## What is in the plugin

| Path | Purpose |
|---|---|
| `skills/figma-to-laravel/SKILL.md` | The order of work, from reading the design to the final report |
| `skills/figma-to-laravel/references/figma-to-css.md` | How each Figma property becomes CSS, and what cannot match |
| `agents/figma-inspector.md` | Reads Figma and writes the spec and reference images |
| `agents/fidelity-verifier.md` | Independent check of a screen against its frames; reports only |
| `agents/responsive-auditor.md` | Independent sweep across viewport widths; reports only |
| `commands/` | The four slash commands above |
| `rules/` | Project conventions. Plugins cannot ship rules, so the skill copies these into the project's `.claude/rules/` on first use |
| `scripts/figma-check.mjs` | The checking script: `compare`, `measure` and `sweep` |
| `.mcp.json`, `scripts/figwright-mcp.mjs` | Start the Figwright MCP server, on Windows, macOS and Linux |

## The checking script

It can be run by hand against any URL:

```
node scripts/figma-check.mjs compare --url http://127.0.0.1:8000/pricing --width 1440 --ref docs/design/reference/pricing-1440.png --out tmp/diff
node scripts/figma-check.mjs measure --url http://127.0.0.1:8000/pricing --width 1440 --selectors ".hero__title,.button"
node scripts/figma-check.mjs sweep   --url http://127.0.0.1:8000/pricing --also 767,768,769 --out tmp/sweep
```

- `compare` saves `rendered.png` and `diff.png`, and prints the mismatch percentage and the regions of the page that differ.
- `measure` prints each element's position, size and computed styles, and whether each font family is really available.
- `sweep` prints, for each width with a problem, the elements causing horizontal overflow, clipped content and overlapping siblings.

Run its self-test with `npm test` inside `scripts/`.

## What goes into your project

- `.claude/rules/figma-*.md`: the conventions, copied from the plugin.
- `docs/design/`: the spec and reference image for each screen.
- `docs/screens/`: how each screen is built, with its derived decisions and unresolved deviations.
- The Laravel code: routes, controllers, Blade views and components, CSS, feature tests and Dusk tests.

## Assumptions

- The stack is Laravel, Blade and plain CSS bundled by Vite, with no CSS framework.
- CSS is desktop-first: the widest frame is the base and narrower layouts are `max-width` queries.
- Laravel Dusk is used for the project's responsive tests.
