---
name: match-section-gaps
description: Make the vertical gap between page sections equal to the gap in the Figma design, at every frame width, and prove it by measurement. Make sure to use this skill whenever you build, restyle or review a page made of stacked sections (hero, features, pricing, footer), whenever sections look too close together or too far apart, or when asked to match spacing, padding or gaps to Figma, even if the user only says "spacing looks off".
---

# Match section gaps to Figma

The space between sections is the first thing that looks wrong when a page is nearly right: a few pixels per section add up to a page that feels different. The gap in the browser must equal the gap in Figma, within one pixel, at each frame width.

## 1. Read the gap from Figma

Do not guess it from a screenshot. For each pair of neighbouring sections, find which of these Figma uses, in the section JSONs or `get_design_context`:

- **The page frame is auto layout**: the gap is the frame's item spacing (`gap`), and each section's own padding is inside the section.
- **Sections have their own top and bottom padding** and touch each other (full-width backgrounds side by side): the visible gap is padding, there is no item spacing.
- **No auto layout**: the gap is `next.y - (prev.y + prev.height)`. If the sections do not all agree, list each one.

Write the gap for every pair, at every frame width, into `docs/design/<screen>/spec.md` under Layout. A gap that differs between frames is a design fact, not a bug.

## 2. Build it with one mechanism

Use exactly one of these per page, matching what Figma does. Using both doubles the gap.

- **Stack with gap**: the page wrapper is `display: flex; flex-direction: column; gap: var(--section-gap)`. Sections carry no outer margin.
- **Section padding**: each section has `padding-block: var(--section-pad-y)` and no outer margin, no wrapper gap.

Rules that keep it exact:

- The value is a token from Figma (`--section-gap`, `--section-pad-y` in `tokens.css`), and the one class that applies it (`.page-sections` or `.section`) lives in the shared `layout.css`. Do not type the number in each section.
- A section whose gap differs from the rest sets the token on itself (`--section-pad-y: 4rem`) in its page file; it does not add a margin.
- Avoid vertical margins between sections: margins collapse and make the gap smaller than written. Do not add Bootstrap `my-*`, `py-*` or `mt-*` utilities to sections as well as the shared class.
- Narrower frames: set the narrower value inside the `max-width` block for that frame. Between frames, keep the nearest frame's value, or a `clamp()` marked `derived:`.
- The `.container` only controls width. It must add no vertical space.

## 3. Prove it

Run `node scripts/figma-check.mjs measure --url <page> --width <frame width> --selectors "<section 1>,<section 2>,..."` for every frame width. For each neighbouring pair compute `next.top - prev.bottom` from the reported rectangles and compare with the gap in the spec. Anything off by more than 1px is a bug: find which of margin, padding or gap is adding or losing the difference, fix it, and measure again. Save a QA screenshot per width as the build-section QA step says.

When sections have visible backgrounds, the measured gap between boxes is 0 even though Figma shows a spacing inside each: compare the content edges (the first and last child inside each section) instead of the section boxes.

## Before you finish

- Every pair of neighbouring sections was measured at every frame width and is within 1px.
- One mechanism (gap or padding) is used; no section has both.
- Gap values are tokens; no raw pixel number is repeated across sections.
- Differences from Figma, if any, are in `docs/screens/<screen>.md` with the reason.
