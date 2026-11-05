---
name: code-comments
description: Write clear comments in the Blade, CSS, PHP and JavaScript this plugin produces so that any developer, including a beginner, can understand what each file and section is for and why non-obvious code is written that way. Use whenever you create or edit a Blade view or component, a stylesheet, a controller, a test or a script, and when reviewing code for readability.
---

# Code comments

Goal: someone who has never seen this screen opens a file and understands it in a minute. Comments say **what this part is**, **where it comes from in Figma**, and **why** anything surprising is written the way it is. They do not narrate obvious code.

Write in plain, short sentences. One idea per comment. Explain any term a beginner may not know.

## 1. Every file starts with a header

Say what the file is, which screen it belongs to, and the Figma source.

```css
/* Home screen styles.
   Figma: home, frames 1440 (node 12:34) and 375 (node 12:90).
   Uses shared tokens from tokens.css and shared text classes from base.css. */
```

```blade
{{-- Hero section of the home screen (Figma node 12:50).
     Uses: <x-button>, .type-h1, .container. --}}
```

```php
/**
 * Test for the home screen route.
 * Checks the page loads and shows the hero text from the Figma frame.
 */
```

## 2. Label every section

In CSS and Blade, put a banner above each section so the file can be scanned like a table of contents. Include the Figma node ID.

```css
/* ===== Hero (node 12:50) ===== */
/* ===== Pricing cards (node 12:210) ===== */
```

Keep the order of sections the same as the page, top to bottom.

## 3. Explain the why, not the what

Comment on anything a reader would otherwise have to work out or might "fix" by mistake:

- A value that is **derived**, not in Figma: `/* derived: no 768 frame, stack columns below 900px */`
- A fix for a layout trap: `/* min-width: 0 lets this flex child shrink; without it long text causes sideways scroll */`
- A fidelity detail: `/* line-height is the exact Figma ratio (22/14); a rounded number drifts down the page */`
- A deliberate override: `/* Overrides Bootstrap's container width to match the Figma content width (1200px) */`
- Anything that cannot match Figma, and why (corner smoothing, Display P3 colors, glyph anti-aliasing).
- A shared class or component: say what it is for and when to use it.

```css
/* One text style for all section headings (Figma style "Heading/H2"). Reuse it; do not set font-size per section. */
.type-h2 { ... }
```

## 4. Components and functions

- A Blade component starts with a comment listing its props and variants.
- A PHP method or JavaScript function gets one line saying what it returns or does, plus anything it assumes.
- A script such as `figma-check.mjs` gets a short comment above each command or function: what it measures, what the output means.

```blade
{{-- <x-button>
     Props: variant = primary | secondary | outline, size = sm | md | lg
     Adds focus and hover styles; pass extra classes with the normal class attribute. --}}
```

## 5. Do not write these

- Comments that repeat the code: `/* red text */ color: red;`
- Commented-out code. Delete it; Git keeps the history.
- Change history or chat context: "previously", "fixed per request", "AI:".
- Numbers that go stale: "currently 3 cards", "takes about 2 seconds".
- Long essays. If it needs a paragraph, put it in `docs/screens/<screen>.md` and link to it.

## 6. Keep comments true

A wrong comment is worse than none. When you change code, change its comment in the same edit. If a comment says a node ID or a value, it must match the code and the spec.

## Before you finish

For each file you wrote or edited:

1. It has a header with what it is and the Figma source.
2. Each section has a banner, in page order.
3. Every derived value, workaround and override has a short "why".
4. No obvious, stale or commented-out-code comments remain.
5. A newcomer could say what the file does after reading only the comments.
