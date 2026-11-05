# Figma to CSS

How each Figma property becomes CSS, and where the two cannot agree. Most fidelity bugs come from a small number of these translations, so check this before writing a rule from memory.

## Auto layout

Auto layout is flexbox. Direction is `flex-direction`, item spacing is `gap`, padding is `padding`, and clip content is `overflow: hidden`.

| Figma | CSS |
|---|---|
| Primary axis: start, center, end, space between | `justify-content: flex-start`, `center`, `flex-end`, `space-between` |
| Counter axis: start, center, end, baseline | `align-items: flex-start`, `center`, `flex-end`, `baseline` |
| Gap set to Auto | `justify-content: space-between` |
| Wrap | `flex-wrap: wrap`, with the counter-axis spacing as the other gap (`row-gap` in a row) |
| Negative gap | negative margin on the children; `gap` cannot be negative |
| Min and max width or height | `min-width`, `max-width`, `min-height`, `max-height` |
| Grid flow | CSS grid with the same tracks |

A child's sizing depends on which axis it is on:

| Child sizing | Along the parent's direction | Across it |
|---|---|---|
| Fill container | `flex: 1 1 0` | `align-self: stretch` |
| Fixed | the size, plus `flex-shrink: 0` | the size |
| Hug contents | nothing | nothing |

- The `0` basis in `flex: 1 1 0` matters. With the default `auto` basis, fill children share space by content size, and a text-heavy child squeezes an empty image box beside it.
- Add `min-width: 0` to a fill child that holds long text or an image. Flex items refuse to shrink below their content by default, which is the usual cause of overflow at narrow widths.
- A child that fills across the axis and also has a maximum size takes `width: 100%` with `max-width` (or the height equivalents) so the parent's alignment still positions it once the maximum applies.
- "Auto" width or height in Figma's panel means hug, not fill.

A child set to ignore auto layout is `position: absolute` inside a `position: relative` parent. Its constraints give the insets: left and right together stretch it, center is `left: 50%` with a translate, and scale is percentages.

Frames without auto layout, and groups, give only coordinates. Do not turn every coordinate into an absolute position, because such a screen cannot reflow. Where the children plainly form a row or a column, build that with flexbox and record it as a derived decision. Keep absolute positioning for decoration that overlaps other content.

## Strokes

Figma changed auto layout in 2026 to match CSS. In frames created since then, an inside stroke takes up space like a border, and center and outside strokes take none, like an outline. Older frames carry a per-frame setting that includes or excludes strokes from layout, so read that setting; do not assume.

| Figma stroke | CSS |
|---|---|
| Inside, included in layout | `border` |
| Inside, excluded from layout | `box-shadow: inset 0 0 0 <width> <color>`, or `outline` with `outline-offset: -<width>` when child content would cover the shadow |
| Center | `outline` with `outline-offset` of minus half the width |
| Outside | `outline`, or `box-shadow: 0 0 0 <width> <color>` |
| Different widths per side | per-side `border`, or per-side inset shadows when excluded from layout |

Using `border` for a stroke that is excluded from layout makes the content box smaller than the design by the stroke width on each side. Dashed strokes with a set dash and gap length cannot be matched by `border-style: dashed`; use an SVG and report it.

## Fills

- With several fills, the first CSS background is the top layer. Check the order against the frame's screenshot, because Figma's data lists them bottom first.
- Skip fills and effects whose visibility is off.
- Fill opacity belongs in the color's alpha. Layer opacity is `opacity`. They are separate; do not multiply them into one.
- Gradient angles in Figma and CSS use different zero points. Take the direction from the generated code in the design context or from the gradient's handle positions, never from a raw angle. Angular gradients are `conic-gradient`. Diamond gradients have no CSS equivalent.
- Image fill modes: fill is `object-fit: cover`, fit is `contain`, crop is `cover` with an `object-position` (or export the node with the crop baked in), and tile is a repeating background.
- If the file's color profile is Display P3, the hex values are P3 values and look duller when used as sRGB. Report it.

## Effects

| Figma | CSS |
|---|---|
| Drop shadow on a filled box | `box-shadow: x y blur spread color` |
| Drop shadow on text | `text-shadow` (no spread) |
| Drop shadow on a vector, a transparent image, or a frame with no fill | `filter: drop-shadow()` (no spread) |
| Inner shadow | `box-shadow: inset …` |
| Layer blur | `filter: blur()` |
| Background blur | `backdrop-filter: blur()`, which needs a partly transparent fill to show |
| Blend mode | `mix-blend-mode`; pass through is the default |
| Rotation | `transform: rotate()` |

- List several shadows in the same order as Figma's panel, top first.
- Take blur radii from the generated code, not from the number in Figma's panel. The two use different scales.
- Check the direction of a rotation: positive angles turn counter-clockwise in Figma and clockwise in CSS.
- Corner smoothing (the iOS squircle) has no CSS equivalent. Use a plain `border-radius` and report it, or export the shape as SVG.
- Noise, texture and glass effects are exported as images.

## Text

- Figma names weights. Thin is 100, ExtraLight 200, Light 300, Regular 400, Medium 500, SemiBold 600, Bold 700, ExtraBold 800, Black 900. Italic is `font-style`, separate from the weight.
- Text color is the text node's fill. A gradient fill on text is `background-clip: text` with a transparent `color`.
- Line height in pixels or percent becomes a unitless ratio. Line height Auto becomes `normal`, which every browser computes from the font's own metrics; record it as a gap and confirm the text box's height by measurement.
- Text case is `text-transform`. Strikethrough is `text-decoration: line-through`.
- Paragraph spacing is the margin between `<p>` elements. Paragraph indent is `text-indent`.
- A text node with mixed styles becomes one element with `<span>`s.
- Vertical trim (cap height to baseline) is `text-box: trim-both cap alphabetic`. It is supported in Chrome and Edge 133 and Safari 18.2 onward; check Firefox before relying on it, and record it as a derived decision.
- OpenType features are `font-feature-settings`, and variable-font axes are `font-variation-settings`.

Resizing mode decides wrapping:

| Figma text resizing | CSS |
|---|---|
| Auto width | no width; add `white-space: nowrap` only for labels that must stay on one line, such as buttons and navigation |
| Auto height | the width from its layout, height from content |
| Fixed size | the width; leave the height to the content and align vertically with flexbox on the parent |
| Truncate | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, or `-webkit-line-clamp` for a line limit |

If text wraps at a different word from the frame at the frame's own width, the font is not the same font (a fallback, a different version, a wrong weight) or the letter spacing is wrong. Fix that cause. Do not add `<br>` to force the break, because it breaks every other width.

## Assets

- Vector layers are exported as SVG. Use `currentColor` in an icon whose color changes with state.
- Raster images: use the original upload with `object-fit` to reproduce the crop, or export the node at 2x with the crop baked in. Set `width` and `height` attributes.
- Do not redraw an illustration in CSS.

## What will not match

Report these; do not spend rounds on them:

- Glyph anti-aliasing. Figma and each browser rasterise text differently, so text edges differ by a fringe of pixels even when every metric is equal.
- Corner smoothing, diamond gradients, and dashed strokes with custom dash lengths.
- Line height Auto, where the browser's `normal` differs from Figma's value.
- Display P3 colors rendered in sRGB.
