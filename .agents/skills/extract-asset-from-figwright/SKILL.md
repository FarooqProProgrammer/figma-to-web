---
name: extract-asset-from-figwright
description: Extract images, photos, logos, icons and illustrations from a Figma design through the Figwright MCP server and save them into the Laravel project (public/images/<screen>/) in the right format, ready to use in Blade. Make sure to use this skill whenever the user asks to export, download, pull, save or extract assets, images, icons, SVGs, logos or photos from Figma, or when a screen being built from a Figma frame shows grey placeholder boxes, missing images or hand-drawn icons, even if the user never says "asset".
---

# Extract assets from Figma (Figwright)

Layout and text from Figma carry no pixels. A photo, logo or icon that is not exported turns into a grey box or a badly redrawn shape, which is usually the biggest visible gap against the design. This skill fetches those pixels and saves them where the screen can use them.

Use only Figwright's read tools. `save_image_fills` and `save_screenshots` write files on this machine, not in Figma. Never call `import_image`, `import_svg`, `set_image_fill` or any other tool that changes the Figma file.

## 1. Find what to export

Read the screen's `docs/design/<screen>/sections/*.json` (or call `get_design_context`) and list every visual-only node: image fills, vectors, boolean operations, icon instances, logos and illustrations. Logos and brand marks are always exported, never typed by hand.

## 2. Pick the tool for each node

| Node | Tool | Why |
|---|---|---|
| Has an `IMAGE` fill (photo, product shot) | `save_image_fills` with `nodeIds` and `outDir` | Saves the original upload with no crop, scale or mask baked in. It reports each fill's `scaleMode` and intrinsic size, so CSS reproduces the crop. Reused images are saved once. |
| Image fill with `filtersApplied: true`, or a mask or gradient overlay CSS cannot reproduce | `save_screenshots`, `format: PNG`, `scale: 2` | The original bytes do not carry Figma's color adjustments, so export the composited look. The default scale is 1 and ships blurry on dense screens. |
| Vector, icon or icon instance | `icon_map` first | If it matches a file the project already has, reuse that file. |
| Icon with no match | `save_screenshots`, `format: SVG` | Fresh SVG only when nothing exists to reuse. |
| Illustration or anything else flat | `save_screenshots`, `format: SVG` if vector, otherwise PNG at `scale: 2` | |

If a result has `path: null` or `images: []`, the node has no resolvable image: do not invent a file, fall back to a screenshot or skip it. If an export is `empty: true`, the node rendered nothing (hidden, clipped, off-canvas): do not ship the blank file. Re-export its `mainComponent` if the instance has art, otherwise skip it.

## 3. Save and name

Save into `public/images/<screen>/`, icons in `public/images/<screen>/icons/`. Name files in kebab-case from the layer name (`hero-photo.jpg`, `logo-mark.svg`), never `Frame 1234`. Then write `docs/design/<screen>/assets.json`, one entry per file: `nodeId`, `file`, `kind` (photo, icon, logo, illustration), intrinsic size, rendered size in the frame, `scaleMode` and how to crop it. This is how the Blade view and later checks find the right file.

## 4. Optimize

Follow the "Images (fast loading)" rule in the frontend rules: photos to AVIF and WebP with the original as fallback and a few widths for `srcset`, SVGs minified. Optimizing must not change the rendered size; the `width` and `height` attributes come from the file's intrinsic size.

## 5. Use them in Blade

- `scaleMode` `FILL` is `object-fit: cover`, `FIT` is `contain`, `CROP` uses the fill's transform (see the Figma-to-CSS reference).
- A single-color icon is an inline SVG using `currentColor`, so the element's CSS `color` sets it. An `<img>` cannot be recolored. Multi-color logos and illustrations render as they are.
- `alt` text for meaningful images, `alt=""` for decoration. Use the shared component or `.container` and text classes from the foundation, not new one-off styles.

## 6. Check

Confirm every file in `assets.json` exists and opens, then run `figma-check.mjs compare` for the screen. A placeholder gone but a shifted layout means the rendered size or crop is wrong, not the file.

Report the files saved, any nodes skipped and why, and which icons were reused from the project.
