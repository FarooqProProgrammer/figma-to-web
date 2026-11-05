---
paths:
  - "resources/views/**"
  - "resources/css/**"
---

# Blade and CSS conventions

## Styling approach
Tailwind CSS is **not mandatory**. Use the styling system configured in the target project:
- **Tailwind CSS**: If configured (`tailwind.config.js` or `@tailwindcss/vite`), map Figma tokens to Tailwind config/`@theme` and use Tailwind utility classes and component classes in Blade templates, using arbitrary values/custom CSS only where exact pixel fidelity demands it.
- **Bootstrap**: If configured, use Bootstrap's grid and utilities, overriding tokens with custom CSS or SCSS variables to match the Figma spec.
- **Custom CSS**: If neither is used, follow the plain CSS file layout below.

## File layout (for custom CSS projects)

```
resources/css/
  app.css                  only @import lines, in the order below
  tokens.css               custom properties from Figma variables and styles
  base.css                 reset, element defaults, @font-face
  components/<name>.css    one file per Blade component
  screens/<name>.css       one file per screen
resources/views/
  components/layout.blade.php     shared page shell, used as <x-layout>
  components/<name>.blade.php     anonymous Blade components
  screens/<name>.blade.php        one view per screen
public/images/<screen>/    assets exported from Figma
```

A component's Blade file, CSS file and root class share one name: `button.blade.php`, `components/button.css`, `.button`. Variants are props that map to modifier classes (`.button--primary`). Declare props with `@props` and pass through `$attributes->merge()` so callers can add classes and ARIA attributes.

Make something a component when it is a component in Figma or appears in more than one place. Everything else stays as markup in the screen's view.

## Reusable Styles & Primitives First

**Mandatory Sequence**: All reusable styles must be extracted and declared at the top level before implementing any individual page section:
1. **Design Tokens**: Every color, font style, spacing unit, corner radius, and shadow used in Figma must be declared in `tokens.css` (or Tailwind `@theme`). Never hardcode hex codes or raw pixel sizes inside section stylesheets.
2. **Base Styles**: Element defaults, resets, and font antialiasing are set once in `base.css`.
3. **Component Primitives**: Elements that recur across screens or sections (buttons, badges, pills, form inputs, cards) must be built as standalone Blade components (`resources/views/components/`) and component styles (`resources/css/components/`) before page-level views are written. Sections must simply consume these components.

## Tokens

Name tokens after the Figma variable or style they come from: `--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`. Component and screen CSS refers to tokens for anything Figma defines as a variable or style. A one-off measurement that the design does not tokenise (an illustration's width, say) stays a literal value next to its use.

## Base styles

`base.css` sets `box-sizing: border-box` on everything, removes default margins, and sets `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` on `body`. Figma draws text with grayscale anti-aliasing, and without these two lines text on macOS looks heavier than the design.

## Units

- Font sizes in `rem` (Figma px ÷ 16), so the reader's browser font setting still applies while the default rendering is identical.
- Line height as the exact ratio, written `calc(22 / 14)` rather than a rounded decimal. A rounded ratio drifts by a fraction of a pixel per line, which adds up down a page.
- Letter spacing given as a percentage becomes `em` (percent ÷ 100).
- Other dimensions in `px`, as Figma gives them.

How each Figma property becomes CSS (auto layout, strokes, fills, effects, text, images) is in the figma-to-web plugin's `figma-to-css.md` reference, which the `figma-to-laravel` skill loads.

## Responsive

- Desktop-first. The base styles are the widest Figma frame, and narrower layouts go in `max-width` media queries. This keeps designer-specified styles unconditional and puts anything derived inside a query where it is easy to find.
- Breakpoints come from the Figma frames. Switch to the narrower frame's layout at the width where the wider layout stops fitting, which is usually wider than the narrower frame itself. Record each chosen value as a derived decision.
- Follow the [`responsive-design`](file:///C:/Users/farooq/.agents/skills/responsive-design/SKILL.md) skill principles:
  - Use container queries (`@container`) for self-contained components (e.g. cards, sidebars, grid cells) so their responsive behavior is independent of viewport width.
  - Employ fluid typography (`clamp(...)`) and relative spacing where appropriate to smooth out transitions between distant breakpoint frames.
  - Ensure touch targets on interactive controls are at least 44x44px on mobile viewports.
  - Avoid fixed pixel widths that cause horizontal viewport overflow (`scrollWidth > innerWidth`).
- A media query changes only what differs. When a narrower layout stops using a flex property the wider one set (`flex`, `align-self`, a fixed width), reset it explicitly, or it leaks through the cascade.
- Custom properties cannot be used in media query conditions. List the breakpoints in a comment at the top of `tokens.css` and repeat the literal values in each query.
- Above the widest frame, the content keeps the frame's width and centers.
- Do not put a fixed height on anything that contains text. The frame's height is a result of its content at that width, and fixing it clips the text at narrower widths.

## Markup

Semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per screen, heading levels in order, `alt` text on meaningful images and `alt=""` on decorative ones, links for navigation and buttons for actions, and a visible `:focus-visible` style on everything interactive.
