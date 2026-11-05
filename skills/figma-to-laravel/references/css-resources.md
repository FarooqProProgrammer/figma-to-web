# CSS and responsive design resources

Read these when a CSS or layout decision is not covered by the rules. Check browser support on Can I Use / MDN before relying on a newer feature.

## Writing good CSS
- [MDN: CSS reference and guides](https://developer.mozilla.org/en-US/docs/Web/CSS) - the authoritative reference for properties, specificity and the cascade.
- [web.dev Learn CSS](https://web.dev/learn/css) - free course: cascade, specificity, layout, logical properties.
- [MDN: Cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) - `@layer` order and how it interacts with unlayered styles.
- [MDN: CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting) - native nesting and its specificity behaviour.
- [BEM naming](https://getbem.com/naming/) - block__element--modifier, keeps specificity flat.
- [CSS Tricks: Almanac](https://css-tricks.com/almanac/) - short, practical property and selector write-ups.
- [CSS architecture (DEV)](https://dev.to/nickbenksim/css-architecture-how-to-write-scalable-and-clean-code-42e0) - scalable structure, nesting limits.
- [Cascading CSS layers (DEV)](https://dev.to/nickbenksim/cascading-css-layers-layer-taking-specificity-under-control-4foj) - taking specificity under control.

## Responsive design
- [web.dev Learn Responsive Design](https://web.dev/learn/design) - viewport, media queries, fluid layouts, images, accessibility.
- [MDN: Responsive design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_design) - media queries, flexible grids, mobile-first.
- [MDN: Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) - component-level responsiveness.
- [MDN: clamp()](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp) - fluid type and spacing.
- [Utopia fluid type and space calculator](https://utopia.fyi/) - generates `clamp()` scales between two viewport widths.
- [Every Layout](https://every-layout.dev/) - intrinsic layout primitives that need few breakpoints.
- [web.dev: 5 CSS snippets for 2024](https://web.dev/articles/5-css-snippets-every-front-end-developer-should-know-in-2024) - subgrid, container queries, `:has()`, `text-wrap`.

## Support checks
- [Can I use](https://caniuse.com/) - browser support tables.
- [MDN browser compatibility data](https://developer.mozilla.org/en-US/docs/Web/CSS) - the compat table at the bottom of each page.
