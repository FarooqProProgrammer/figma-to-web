---
name: bem
description: >
  Comprehensive BEM + SASS methodology skill. Use this skill whenever the user
  asks about BEM naming, SASS architecture with BEM, writing BEM-compliant SCSS,
  auditing existing SCSS for BEM violations, organizing SASS projects with BEM,
  or any front-end styling task involving SCSS/SASS and the BEM methodology
  (Block-Element-Modifier). This includes requests about component-based CSS,
  scalable CSS architecture, SASS partials organization, CSS naming conventions,
  refactoring CSS to BEM, and reviewing SCSS code quality. Also use when the
  user mentions ITCSS combined with BEM, utility classes in BEM context, or
  responsive design patterns in BEM.
license: Complete terms in LICENSE.txt
metadata:
  version: 1.0
  author: Marcos Cazaux
---

# BEM + SASS Skill

This skill provides comprehensive guidance for writing, auditing, and
architecting SASS/SCSS following the **BEM (Block-Element-Modifier)**
methodology as defined at [getbem.com](https://getbem.com).

It serves two modes:

1. **Generator mode** — write new SCSS code following BEM conventions.
2. **Auditor mode** — review existing SCSS code and report BEM violations.

---

## Core BEM Rules (from getbem.com)

### Block

A standalone entity meaningful on its own.

- Name: lowercase Latin letters, digits, and hyphens.
- CSS class only — **no tag names or IDs** as selectors.
- Example: `.block`, `.opinions-box`, `.form`

### Element

A part of a block with no standalone meaning. Semantically tied to its block.

- Name: block name + `__` + element name.
- Never nest elements in naming: `.block__elem1__elem2` is **wrong**.
  Flatten: `.block__elem1`, `.block__elem2`.
- Example: `.block__elem`, `.form__input`, `.form__submit`

### Modifier

A flag on a block or element that changes appearance, behavior, or state.

- Name: block or element name + `--` + modifier name.
- Always keep the original class: `<div class="block block--mod">`.
- Semantic names preferred over visual names (use `.block--large` not
  `.block--font-size-18px`).
- Example: `.block--mod`, `.block__elem--mod`, `.form--theme-xmas`

### Mix

Two or more blocks on the same DOM node.

```html
<div class="menu__item button"></div>
```

Each block keeps its own namespace.

---

## SASS Best Practices with BEM

### 1. Nesting — Responsible Only

Use `&` for elements and modifiers, but keep nesting **max 3 levels deep**.

```scss
// ✅ Correct BEM nesting
.block {
  &__element {
    // element styles
  }

  &--modifier {
    // modifier styles
  }

  // Block-level modifier affects elements
  &--modifier &__element {
    // element style override when block has modifier
  }
}

// ❌ Never nest elements inside elements
.block {
  &__wrapper {
    &__inner {
      // WRONG — creates .block__wrapper__inner
    }
  }
}

// ✅ Correct: flatten
.block__wrapper {
}
.block__inner {
}
```

### 2. Blocks are Independent

Each block must work anywhere on the page. **No external dependencies**.

```scss
// ✅ Correct
.block {
  display: flex;
}

// ❌ Wrong — depends on parent
.parent .block {
  display: flex;
}
```

### 3. No Tag or ID Selectors

```scss
// ✅ Correct
.button {
}

// ❌ Wrong
button.button {
}
#submit-button {
}
div.button {
}
```

### 4. Self-Reset Pattern

Each block resets itself rather than relying on a global reset:

```scss
.block {
  @include reset-list; // or inline reset

  &__item {
    @include reset-list-item;
  }
}
```

### 5. Block Modifier Affecting Elements

Use nested selectors when a block-level modifier affects its elements:

```scss
.form {
  background: white;

  &--theme-xmas &__input {
    background: red;
    color: white;
  }

  &__input {
    border: 1px solid #ccc;
  }
}
```

### 6. Utility Mixes (not global modifiers)

Combine independent blocks on the same node instead of global modifier
classes:

```html
<div class="block visible"></div>
<!-- Prefer: -->
<div class="block visibility-visibility"></div>
```

---

## File Architecture

For a full SASS + BEM project, organize styles as follows:

```
styles/
├── settings/
│   ├── _colors.scss
│   ├── _typography.scss
│   └── _spacing.scss
├── tools/
│   ├── _mixins.scss
│   └── _functions.scss
├── generic/
│   └── _reset.scss
├── elements/
│   └── _headings.scss
├── blocks/
│   ├── _button.scss
│   ├── _form.scss
│   ├── _card.scss
│   └── _navigation.scss
├── utilities/
│   └── _helpers.scss
└── main.scss
```

Each block is a self-contained partial in `blocks/`. No block references
another block's selectors.

### Example block file: `blocks/_card.scss`

```scss
.card {
  background: white;
  border-radius: 8px;
  padding: 16px;

  &__image {
    width: 100%;
    border-radius: 8px 8px 0 0;
  }

  &__title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 12px;
  }

  &__description {
    font-size: 0.875rem;
    color: #666;
    margin-top: 8px;
  }

  &__cta {
    display: inline-block;
    padding: 8px 16px;
    background: blue;
    color: white;
    border-radius: 4px;

    &--disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  &--featured {
    border: 2px solid gold;

    .card__title {
      color: gold;
    }
  }
}
```

---

## Generator Mode

When the user asks you to **write** or **generate** SCSS:

1. Identify the component(s) the user describes.
2. Name the block using kebab-case.
3. List its elements (flattened — never `block__elem1__elem2`).
4. List its modifiers (semantic names).
5. Produce SCSS following all rules above.
6. Suggest a file name for the partial.

### Output format

```scss
// blocks/_component-name.scss

.component-name {
  // base

  &__element {
    //
  }

  &--modifier {
    //
  }
}
```

---

## Auditor Mode

When the user asks you to **review**, **audit**, or **check** SCSS code:

1. Scan for BEM naming violations.
2. Check nesting depth (warn if > 3 levels).
3. Flag any tag/ID selectors mixed with BEM classes.
4. Flag global modifier classes.
5. Flag non-semantic modifier names (e.g., `--font-size-18px`).
6. Flag element-of-element patterns (e.g., `block__elem1__elem2`).
7. Flag missing base class on modified nodes.
8. Flag nested selectors that break block independence.
9. Report each issue with file:line and suggested fix.

### Report format

```
## BEM Audit Report

### Violations Found

1. **Tag selector with BEM class** — `button.card__cta` at line 23
   - Fix: Remove `button.` — use `.card__cta` only.

2. **Element-of-element naming** — `.card__wrapper__inner` at line 45
   - Fix: Flatten to `.card__wrapper`, `.card__inner`.

3. **Missing base class** — `<div class="card--featured">` at line 67
   - Fix: Use `<div class="card card--featured">`.

4. **Non-semantic modifier** — `.card--margin-top-20px` at line 89
   - Fix: Use semantic name like `.card--spacious`.

### Summary
- Total violations: 4
- Critical: 1
- Warnings: 3
```

---

## Mixins & Functions for BEM

Include these utility mixins in the skill's guidance:

```scss
// Responsive breakpoints
@mixin respond-to($breakpoint) {
  @if $breakpoint == 'sm' {
    @media (min-width: 576px) {
      @content;
    }
  } @else if $breakpoint == 'md' {
    @media (min-width: 768px) {
      @content;
    }
  } @else if $breakpoint == 'lg' {
    @media (min-width: 992px) {
      @content;
    }
  } @else if $breakpoint == 'xl' {
    @media (min-width: 1200px) {
      @content;
    }
  }
}

// List reset mixin
@mixin reset-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

// Visually hidden (accessible)
@mixin visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

---

## Common BEM Patterns

### Responsive block

```scss
.product-card {
  display: grid;
  grid-template-columns: 1fr;

  @include respond-to('md') {
    grid-template-columns: 1fr 1fr;
  }

  &__image {
    /* ... */
  }
  &__title {
    /* ... */
  }
}
```

### Theming via modifiers

```scss
.alert {
  padding: 12px 16px;
  border-radius: 4px;

  &--success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
  }

  &--error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
  }

  &--warning {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
  }
}
```

### State modifiers

```scss
.modal {
  display: none;

  &--open {
    display: block;
  }

  &--animating {
    transition: opacity 0.3s ease;
  }
}
```
