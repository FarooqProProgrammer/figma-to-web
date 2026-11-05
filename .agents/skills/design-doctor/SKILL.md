---
name: design-doctor
description: Diagnose why a built Laravel/Blade screen does not match its Figma frame and prescribe the exact CSS fix. Runs the figma-check compare, measure, sweep and fcp commands, groups the symptoms into root causes, and writes a ranked diagnosis to docs/screens/<screen>-diagnosis.md. Use whenever the user says the page looks different from Figma, pixel diff is high, spacing or font is off, mobile is broken, overflow, "fix the deviations", "why does this not match", or asks for a design check-up on a built screen, even if they never say "doctor".
---

# Design doctor

`find-design-gaps` examines the design before the build. This skill examines the **built page** after it: symptoms in, root cause and fix out. A pixel diff with 40 red regions usually has two or three causes; fixing symptoms one by one wastes rounds and creates new drift.

The page must be running and a reference image must exist (`docs/design/<screen>/reference/<screen>-<width>.png`). If either is missing, say so and stop. Never diagnose from the code alone: only measurements count.

## 1. Take the vitals

For each Figma frame width, using `node scripts/figma-check.mjs`:

1. `compare --url <page> --width <w> --ref <reference> --out tmp/diff` for mismatched pixels, size match and diff regions.
2. `measure --url <page> --width <w> --selectors "<selectors of the regions>"` for geometry, computed styles and missing fonts.
3. `sweep --url <page> --also <frame widths> --out tmp/sweep` from 1920px down to 320px for overflow, clipping and overlap.
4. `fcp --url <page> --width 375` for the 1.8 s budget, only when the user's question includes speed or the build is final.

Compare the measured values with `docs/design/<screen>/sections/*.json`, not with the screenshot by eye.

## 2. Find the root cause, not the symptom

Walk the first (topmost, then leftmost) diff region and ask which cause explains the most other regions. Use this order, since each cause produces many symptoms:

| Symptom | Likely root cause | Check |
|---|---|---|
| Everything below a point is shifted by the same px | A single wrong height, margin or section gap above it | Cumulative offset: the first region where `y` differs |
| Text wraps differently, heights differ by whole lines | Font fallback, wrong weight, or line-height rounded | `measure` fonts list `available: false`; compare line-height ratio with `calc(a / b)` |
| Every text block a little heavy or wide | Missing antialiasing lines, or letter-spacing in px not em | `base.css`; computed letter-spacing |
| Content width off by the same amount on both sides | `.container` width or gutter not overridden to the Figma content width | Container rect vs frame content width |
| Boxes 1 to 2px off | Stroke counted outside or inside, or `box-sizing` | Figma stroke position vs border and `box-sizing` |
| Different gaps between neighbours only | Two mechanisms for section gaps (flex gap plus padding), or margin collapse | See the `match-section-gaps` skill |
| Colours off slightly | Hardcoded hex, opacity stacked on a parent, gradient stops | Computed colour vs token |
| Mobile fine, one width in between broken | Breakpoint set at the narrow frame's width, not where the wide layout stops fitting | Sweep problems list: first failing width |
| Horizontal scroll | Fixed width, `100vw`, or a flex child that cannot shrink | Sweep offender selector |
| Custom CSS fights a Bootstrap class | Clashing wrapper, `.btn` or `.card` rules | The `rules/figma-frontend.md` Bootstrap-conflict rule |
| Images soft, layout shift, slow paint | Missing width/height, oversized file, no `fetchpriority` on the hero | The "Images" and FCP rules |

Use `${CLAUDE_PLUGIN_ROOT}/skills/figma-to-laravel/references/figma-to-css.md` for how a Figma property should be written in CSS.

## 3. Write the diagnosis

`docs/screens/<screen>-diagnosis.md`:

```markdown
# Diagnosis: <screen>
Measured at: <widths>   Mismatch before: <% per width>

## Findings (most cause-rich first)
### 1. <root cause in one sentence>
- Evidence: <measured vs Figma values, selector, width>
- Explains: <how many diff regions / which sections>
- Fix: <the CSS or Blade change, file and selector>
- Risk: <what else this touches>

## Left alone (and why)
```

Findings are ordered by how many symptoms they explain. Every finding has measured evidence and one concrete fix. A cause you cannot confirm with a measurement is listed under "Left alone" as unconfirmed, never as a fix.

## 4. Treat, then re-check

Apply the fixes only if the user asked to fix (otherwise stop at the diagnosis). Apply one root cause at a time and re-run `compare` and `measure` after each: a fix that raises the mismatch is reverted. After the last fix, run the sweep 1920px to 320px until it is clean, and report the mismatch before and after per width. Stop after two rounds with no progress on a region and record it with the rationale, as the verification loop requires.

Do not edit the Figma file; use only read tools if you need to re-read a node.
