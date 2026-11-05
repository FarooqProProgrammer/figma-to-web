# Figma-to-web project

This project turns Figma designs into production Laravel screens. A screen is done when it matches its Figma frame to within one pixel at each frame's width and stays intact at every width in between, from desktop down to 320px. Both halves count: a screen that is perfect at 1440px and overflows at 600px is not done.

## Stack

- Laravel with Blade for views, layouts and data wiring.
- Page container: always Bootstrap's `.container` for content width, on every screen (see "Page container" in the frontend rules).
- Bootstrap conflicts: where a Bootstrap class is used, remove the custom CSS that duplicates or clashes with it, and never reuse Bootstrap class names for custom classes (see "No custom CSS that conflicts with Bootstrap" in the frontend rules).
- HTML and CSS styling: Tailwind CSS is **not mandatory**. Use Tailwind CSS if configured in the project (`tailwind.config.js`, `@tailwindcss/vite`, etc.). Otherwise, use **custom CSS** (custom properties and media queries) or **Bootstrap**, matching whatever the project environment provides.
- Vanilla JavaScript, and only where a screen's behaviour needs it (a menu toggle, for example).
- CSS is bundled by Laravel's default Vite setup.

There was no existing code or design system when this project started, so the tokens and components here are derived from the Figma file alone. Say so when reporting.

## Source of truth

The Figma file decides every measurement, color and type style. Read it through the Figwright MCP server, which the figma-to-web plugin provides, and through no other Figma server, so every screen is read the same way. Prefer the design's variables and styles over raw values, and raw values over anything estimated from a screenshot. If Figwright is not connected, say so and stop: a screen built from guesses looks finished and is not.

Figwright can also edit the Figma file. Building screens only reads it: never call a tool that changes the design unless the user asks for that change.

## What "matches" means

A screen matches its frame when all of these hold at the frame's width, checked with the figma-to-web plugin's `figma-check` script and not by eye:

1. Every font family the design uses is loaded.
2. Every element's position and size is within one pixel of the spec, and its computed styles equal the spec.
3. A pixel diff against the Figma export shows only thin anti-aliasing fringes around text and curves. A solid region of difference is a deviation, however small the overall percentage.

Text never matches pixel for pixel, because Figma and browsers rasterise glyphs differently. That is the one accepted difference; everything else is fixed or reported.

## Scope

Build the screens that were asked for. Add a token or component only when one of those screens uses it. Leave unrelated code alone.

## Foundation before screens

Always establish the reusable foundation first:
1. Extract design tokens (colors, typography, spacing, radii, shadows) into `tokens.css` or the project's theme config.
2. Build base element defaults and typography in `base.css`, including one shared class per repeated text style (see "Shared text styles" in the frontend rules).
3. Create reusable UI primitives (buttons, badges, inputs, cards) as Blade components before building screen sections.
No section may hardcode values or recreate component patterns that belong in the foundation.

## Derived decisions

Anything the design does not specify (a breakpoint with no frame, an error state, a hover style) is a derived decision. Mark it in the code with a comment starting `derived:` and list it in the screen's doc, so a designer can review every one by searching for that word.

## Reporting

End each screen build with: the files created or changed, the breakpoints covered, the assumptions made, the derived decisions, and every deviation from the design that could not be resolved, with its reason. Report a failed or skipped verification as exactly that.
