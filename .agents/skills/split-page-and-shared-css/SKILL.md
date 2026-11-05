---
name: split-page-and-shared-css
description: Organize a Laravel project's CSS so that styles unique to one page live in a CSS file named after that page, and styles used by more than one page live in separate shared files. Make sure to use this skill whenever you create or edit a page's CSS, add a new screen, notice the same rule repeated in two page stylesheets, find page-specific rules inside a shared file, or are asked to clean up, split, merge or reorganize CSS, even if the user never says "shared".
---

# Page CSS and shared CSS, kept apart

Two kinds of CSS, two kinds of files. A page file holds only what that page alone needs. A shared file holds what two or more pages (or components) use. Mixing them is what makes CSS hard to change: you edit a "home" rule and the pricing page breaks, or you copy the same rule into three pages and they drift apart. It also keeps each page's stylesheet small, which helps First Contentful Paint.

## The layout

```
resources/css/
  app.css                  imports the shared files only, never a page file
  tokens.css               shared: colors, type scale, spacing, radii, shadows
  base.css                 shared: reset, element defaults, @font-face
  typography.css           shared: text classes (.type-h1, .type-body, ...)
  layout.css               shared: the .container override, section spacing
  components/<name>.css    shared: one file per Blade component
  screens/<page>.css       unique to one page, named after the page
```

A page file is named exactly like its view and route: `home.blade.php` and `screens/home.css`, `pricing.blade.php` and `screens/pricing.css`. For a nested page, mirror the folder: `screens/account/billing.css`.

## Decide where a rule goes

Ask: is this used on more than one page, or could it be?

- **One page only** → that page's file. Prefix its class names with the page name (`.home-hero`, `.home-hero__title`) so a page rule can never leak onto another page.
- **Two or more pages** → a shared file: a button, card or badge is a component file, a text style is `typography.css`, a width or spacing wrapper is `layout.css`, a color or size is a token in `tokens.css`.
- **A second page needs a rule that is in the first page's file** → move it to the right shared file in the same change and delete it from the page file. Never copy it.

A page file never restyles a shared component. If a page needs a different look, add a variant to the component (`.button--ghost`) so every page can use it.

## Wire each page to its own file

Load shared CSS once through `app.css`, and each page's file only on that page:

```blade
@push('styles')
    @vite('resources/css/screens/home.css')
@endpush
```

The layout prints `@stack('styles')` in the head after `@vite('resources/css/app.css')`. Add every page file to the `input` array in `vite.config.js` so it builds. A page that loads another page's file is a bug.

## Splitting an existing stylesheet

1. List every selector in the current file and where it is used (`grep` the Blade views).
2. Mark each one: unique to one page, or shared.
3. Create the shared files and the page files, and move the rules. Keep the original order within each file so the cascade does not change.
4. Wire Blade and `vite.config.js` as above, then build.
5. Check nothing moved visually: run `figma-check.mjs compare` for each page at its frame widths, and `sweep` from 1920 down to 320. Any difference means a rule landed in the wrong file or the order changed.
6. Search all page files for identical declaration blocks; each match belongs in a shared file.

## Before you finish

- Every page has its own `screens/<page>.css` and no page rule sits in a shared file.
- No rule appears in two page files.
- Shared files contain nothing that mentions one page's name.
- `app.css` imports no `screens/` file.
- Comments follow the `code-comments` skill: a header saying what the file is and, for a page file, the Figma frame it comes from.
