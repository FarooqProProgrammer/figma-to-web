---
paths:
  - "app/**"
  - "routes/**"
  - "database/**"
  - "tests/**"
  - "docs/**"
---

# Laravel, tests and docs conventions

## Routes and controllers

- A screen with no data uses `Route::view`. A screen with data gets a controller that passes the view exactly what it renders.
- Name every route. Views link with `route()`, never a hard-coded path.
- Validate input in a Form Request.

## Design fixtures

A screen with data needs a fixture that reproduces the content shown in the Figma frame: the same text, the same number of items, the same images. Put it in a seeder or factory state named after the screen. The fidelity check and the tests run against this fixture, because a pixel comparison between the designer's sample content and different data proves nothing.

## Error handling

- A missing record is a 404 through route model binding, not a null check in the view.
- A failed form submission redisplays the screen with `old()` values and `@error` messages.
- When a data source a screen depends on fails, catch it, log it, and render the screen's empty or error state. The visitor should never see a stack trace or a half-rendered page.
- If the design has no error or empty state, build a minimal one from existing tokens and mark it as a derived decision.

## Tests

- One feature test per screen in `tests/Feature/Screens/<Name>Test.php`: the route returns 200, the landmarks and headings are present, the key content appears in order (`assertSeeInOrder`), and each error path behaves as described above. Call `$this->withoutVite()` so the tests run without a front-end build.
- Responsive behaviour is tested in a browser with Laravel Dusk, in `tests/Browser/<Name>ResponsiveTest.php`, because feature tests see markup and not layout. At each breakpoint width, assert that the page has no horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`) and that the layout change for that breakpoint happened (for example, two columns that should stack now have different `top` values). Dusk runs headless Chrome, which can be sized down to mobile widths; a normal desktop Chrome window stops shrinking at roughly 500px.

## Docs

- `docs/design/<screen>/` holds the design spec: `spec.md`, `tokens.json`, `components.json`, individual section node styling JSON files in `sections/<name>.json`, and 1x reference PNG exports in `reference/<screen>-<width>.png`. All of these are input extracted directly from Figma: update them by re-reading Figma, never by hand to match the code.
- `docs/screens/<screen>.md` documents the implementation: the Figma link and node ID for each breakpoint, the files that make up the screen, the components it uses, its breakpoints, its derived decisions, its unresolved deviations, and the pixel-diff percentage at each frame width from the last verification.
- `README.md` explains how to install, run the app, and run the feature and browser tests.
