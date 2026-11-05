---
paths:
  - "resources/views/**"
  - "resources/css/**"
---

# Blade and CSS conventions

## Styling approach
Tailwind CSS is **not mandatory**. Use the styling system configured in the target project:
- **Tailwind CSS**: If configured (`tailwind.config.js` or `@tailwindcss/vite`), map Figma tokens to Tailwind config/`@theme` and use Tailwind utility classes and component classes in Blade templates, using arbitrary values/custom CSS only where exact pixel fidelity demands it.
  - Tailwind v4 (the Laravel 12 starter default) has no `tailwind.config.js`: declare Figma tokens in an `@theme` block in `resources/css/app.css` and load the CSS with `@vite`. It detects Blade files on its own; add an `@source` line only for a directory it does not scan, such as published pagination views. Check the project's installed version before assuming v3 or v4.
- **Bootstrap**: If configured, use Bootstrap's grid and utilities, overriding tokens with custom CSS or SCSS variables to match the Figma spec.
- **Custom CSS**: If neither is used, follow the plain CSS file layout below.

## Page container (strict)

Always use Bootstrap's `.container` for page content width, in every project and on every screen, whatever styling system is otherwise used. Each section's content sits inside one `.container` (a full-bleed background goes on the outer section element, with the `.container` inside it); never write a custom wrapper or a hand-rolled `max-width; margin: 0 auto` for this. If Bootstrap is not installed, install it and load its CSS before the project CSS. Bootstrap's default container widths do not match Figma, so override the container in one place (e.g. `.container { max-width: <Figma content width + side gutter>; --bs-gutter-x: <2 x Figma side padding>; }`) in a stylesheet loaded after Bootstrap, taking the numbers from the Figma frame, and confirm with `figma-check.mjs measure` that the content edge matches at every frame width. Bootstrap sets `max-width` per breakpoint, so the override has to win at each of them.

## No custom CSS that conflicts with Bootstrap

When a Bootstrap class is used for something (`.container`, `.row`, `.col-*`, `.d-flex`, `.btn`, spacing or text utilities), delete every custom CSS rule that does the same job or could clash with it: a custom wrapper with `max-width` and `margin: 0 auto`, a hand-written grid or flex row, a duplicate `.btn` or `.card`, and any rule that re-sets `display`, `padding`, `margin`, `width` or `gap` on an element that already carries the Bootstrap class. One concern has one source: Bootstrap's class or the custom class, never both. Never define a custom class with a Bootstrap class name (`.container`, `.row`, `.col`, `.btn`, `.card`, `.badge`, `.type-body`, `.d-*`, `.m-*`, `.p-*`) except the single deliberate token override of that class described above; name custom classes with a distinct prefix or name instead (e.g. `.type-body`, `.ui-button`). Before finishing a screen, search the CSS for rules that target a Bootstrap class name or style an element that also has a Bootstrap utility, and remove or merge them. After removing, re-run `measure` and the sweep, because Bootstrap's own values now apply.

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

## Shared text styles

One text style, one class: when the same font size, weight, line height and letter spacing appear in more than one section, define it once as a shared typography class (`.type-h1`, `.type-body`, `.type-caption`, named after the Figma text style) in `base.css` or `typography.css`, and reuse it in every section. Never re-declare `font-size` in each section's stylesheet. Section CSS only adds what is different (color, margin, alignment). The same applies to any repeated value set: spacing wrappers, container widths, section padding, and card or button styles become one class or component, not copies.

Before adding a rule to a section, search the existing CSS for the same values. If a class already has them, use it; if two sections need the same new value, create the shared class instead of two section-specific ones.

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

- Every component or screen you design or fix gets a Playwright sweep from 1920px down to 320px before it is called done, on a page that renders it: `node scripts/figma-check.mjs sweep --url <page> --also <breakpoint-widths> --out tmp/sweep`. Fix what it reports and run it again until it is clean.
- Desktop-first. The base styles are the widest Figma frame, and narrower layouts go in `max-width` media queries. This keeps designer-specified styles unconditional and puts anything derived inside a query where it is easy to find.
- Breakpoints come from the Figma frames. Switch to the narrower frame's layout at the width where the wider layout stops fitting, which is usually wider than the narrower frame itself. Record each chosen value as a derived decision.
- Follow the `figma-to-web:responsive-design` skill principles:
  - Use container queries (`@container`) for self-contained components (e.g. cards, sidebars, grid cells) so their responsive behavior is independent of viewport width.
  - Employ fluid typography (`clamp(...)`) and relative spacing where appropriate to smooth out transitions between distant breakpoint frames.
  - Ensure touch targets on interactive controls are at least 44x44px on mobile viewports.
  - Avoid fixed pixel widths that cause horizontal viewport overflow (`scrollWidth > innerWidth`).
- A media query changes only what differs. When a narrower layout stops using a flex property the wider one set (`flex`, `align-self`, a fixed width), reset it explicitly, or it leaks through the cascade.
- Custom properties cannot be used in media query conditions. List the breakpoints in a comment at the top of `tokens.css` and repeat the literal values in each query.
- Above the widest frame, the content keeps the frame's width and centers.
- Do not put a fixed height on anything that contains text. The frame's height is a result of its content at that width, and fixing it clips the text at narrower widths.

## First Contentful Paint (strict)

First Contentful Paint must be fast on every screen. The budget is **1.8 s or less on throttled mobile** (1.6 Mbps, 150 ms RTT, 4x CPU slowdown, cold cache), measured with `node scripts/figma-check.mjs fcp --url <page> --width 375` and again at the widest frame. The command fails when the median of three runs is over budget; a screen is not finished while it fails. Run it on a production build (`npm run build`, not the Vite dev server) and after `php artisan optimize`.

- **Server-render everything above the fold** in Blade. No content that waits for JavaScript to appear.
- **No render-blocking JavaScript**: scripts are `defer` or `type="module"`, and none sit in the head without it. Load Bootstrap's JavaScript only when a component on the page needs it. No third-party scripts, widgets or trackers above the fold.
- **Small CSS**: one stylesheet through `@vite`, nothing unused. If Bootstrap is used only for `.container` and the grid, build only those Bootstrap partials, not the whole `bootstrap.css`. No CSS `@import` chains that load files one after another.
- **Fonts**: self-hosted `woff2`, `font-display: swap`, only the weights the page uses, and `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the one or two used above the fold. `preconnect` to any third-party origin that cannot be avoided. Re-check text widths after font loading changes, because fidelity depends on the right font.
- **Above-the-fold images** follow the Images rule: not lazy, `fetchpriority="high"` on the hero, correct size, modern format.
- **Delivery**: Brotli or gzip on, long-lived cache headers for hashed Vite assets, and no redirects before the page.
- When FCP is over budget, find the cause before changing anything: open the throttled load in the browser, look at what blocks the first paint (CSS, a font, a script, the HTML response), fix that, and run `fcp` again.

## Images (fast loading)

Optimizing an image must never change how big it renders: the displayed box still matches the Figma frame, and `compare` and `measure` are re-run after any image change.

- **Format**: icons, logos and illustrations that are vectors in Figma are SVG. Photos and raster art are served as AVIF with WebP and the original JPEG/PNG as fallbacks, through `<picture>` with `<source type="image/avif">`, then `image/webp`, then the `<img>`. Never ship a raw multi-megabyte export.
- **Size**: export or generate widths that match the rendered size at the frame widths (and 2x for retina), then let the browser choose with `srcset` (width descriptors) and an accurate `sizes`. Keep to a few variants, for example 480, 768, 1200 and 1920 wide. Do not serve a 3000px file into a 400px box.
- **Dimensions**: every `<img>` has `width` and `height` attributes (the file's intrinsic size) and CSS `max-width: 100%; height: auto`, so the browser reserves space and the page does not shift while images load.
- **Below the fold**: `loading="lazy"` and `decoding="async"`. This needs the `width`/`height` above, or the page jumps as images arrive.
- **Above the fold**: the hero or first visible image (usually the Largest Contentful Paint element) is never lazy. Give it `fetchpriority="high"`, and preload it when its URL is known early. Use `fetchpriority="high"` on one or two images at most. Confirm which element is the LCP before optimizing; it can be a heading.
- **Backgrounds**: a decorative image set with CSS `background-image` cannot use `srcset`; use an `<img>` or `<picture>` with `object-fit: cover` for any image that carries weight, and `image-set()` only for small decoration.
- **Laravel**: do the resizing and conversion at build time or on upload, not on every request: Intervention Image (resize, `webp`/`avif` encoding) and then Spatie `image-optimizer` (compression only, no conversion), or Spatie Media Library conversions for uploaded media. Static design assets can be converted once and committed under `public/images/<screen>/`.
- **Alt text**: `alt` stays as in the Markup rules; `alt=""` for decoration.

## Markup

Semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per screen, heading levels in order, `alt` text on meaningful images and `alt=""` on decorative ones, links for navigation and buttons for actions, and a visible `:focus-visible` style on everything interactive.
