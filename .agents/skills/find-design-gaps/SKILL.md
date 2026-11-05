---
name: find-design-gaps
description: Audit a Figma screen (through its extracted spec in docs/design/<screen>/ or live through Figwright read tools) for gaps and inconsistencies that would stop a pixel-exact build, and write them to docs/design/<screen>/gaps.md before any Blade or CSS is written. Use whenever the user says design gaps, missing states, design review before build, "what is missing in this Figma", "check the design is complete", or hands over a Figma URL to build and the spec has not been gap-checked yet, even if they never say "gaps".
---

# Find design gaps

A build is only as exact as its spec. A value the design never defined (a hover colour, a mobile frame, a bound token) gets guessed in code, and guesses are what the pixel diff later catches. Find them first, cheaply, while the designer can still answer.

Read-only: use Figwright read tools only (`get_design_context`, `token_map`, `component_map`, `icon_map`, `get_screenshot`). Never edit the Figma file. Prefer the already-extracted `docs/design/<screen>/` files; read Figma only for what they lack. If a node cannot be read, report it as a gap; never fill it from memory.

## What to check

Check each category and record only real findings, with the node ID or section and the frames involved.

1. **Breakpoints.** Is there a frame for every width the project needs (at least desktop and mobile)? Do the frames contain the same sections in the same order? Anything that exists in one frame only (hidden, reordered, renamed) is a finding.
2. **States.** Missing states are the most common handoff gap: every state the designer leaves out becomes a question or a developer's guess. For each interactive component (button, link, input, card, nav item, tab) check the eight states: default, hover, focus, active, disabled, loading, error, success; add selected where it applies. Check `component_map` variants first and list the missing ones per component.
   - **Content states** per list, table, form and data block: empty (does it say what to do next?), loading (does the page keep its structure?), error (does it name the failed operation and a recovery?), and one realistic extreme (longest name, very long text, zero and many items).
   - A static file cannot show business rules (expired data, timeouts, validation messages, permission differences). Flag any component that clearly needs them and has no note.
3. **Tokens and consistency.** Colours, type styles, spacing, radii and shadows not bound to a variable or style. If a raw value is within a few units of a token, name the likely token; do not bind it. Also look for the usual design-system drift: detached component instances (a frame that looks like a component but is plain layers), overridden properties that differ from the master, and instances of an outdated component version. Ask whether each detachment is intentional.
4. **Type.** Line height set to Auto, missing letter-spacing, text with a font that is not in the file's styles, text that is clipped or truncated in the frame, and text styles used only once.
5. **Spacing.** Section gaps and paddings that differ by 1 to 4px between neighbours or frames (likely mistakes), and gaps that have no auto-layout source. Cross-check with the "Section gaps" part of the spec.
6. **Layout.** Nodes outside auto layout, fixed heights on text containers, absolute positions inside auto layout, overlapping nodes, and widths that exceed the frame.
7. **Assets.** Images without a defined crop or aspect ratio, icons that are raster, missing alt-text candidates, illustrations with no export, and image fills with no mobile version.
8. **Content.** Placeholder text (lorem ipsum, "Label", "Text"), missing legal or empty-state copy, and dynamic content with only one example (list with one item, no long-name case).
9. **Interaction and motion.** Links with no destination noted, prototype flows to missing frames, animated nodes (`get_motion_context`) with no timing.
10. **Accessibility.** Text contrast below WCAG AA (4.5:1, or 3:1 for large text), touch targets under 44x44px on the mobile frame, and focus styles that are not drawn. Disabled and error states need markup (`aria-disabled`, `aria-invalid`, `aria-busy` for loading regions); note them as derived decisions, since Figma does not draw them.
11. **Freshness.** Are the frames the latest version? Building from a stale frame is only noticed at QA. Compare the frame's node IDs and last-modified state with the spec, and with the `design_diff` baseline when one exists.

## How to run it

- Run the check after the spec is extracted and before any code: a gap found now costs one question, and the same gap found after the build costs a rework.
- Use real extremes, not only the happy path: an empty account, a slow or failed request, the longest string. The design must show or note each one.
- Resolve every gap one of two ways: the designer answers it, or it is recorded as a documented known gap with a proposed default. Never leave one silent.
- Re-run it when the Figma file changes, as drift between file and build is a standing gap, not a one-time one.

## Output

Write `docs/design/<screen>/gaps.md`:

```markdown
# Design gaps: <screen>
Frames checked: <name, node ID, width>

## Blocking (build cannot be exact without an answer)
| # | Category | Where (node ID) | Gap | Question for the designer |

## Decide-and-record (build can continue; the default is a derived decision)
| # | Category | Where | Gap | Proposed default |

## Notes (cosmetic or low risk)
```

- **Blocking** means a missing frame, missing state of a core component, or content that decides layout. **Decide-and-record** means a safe default exists (e.g. focus ring from the brand colour); mark it `/* derived: ... */` in the CSS later.
- Keep one row per gap, one question per row, answerable by the designer in a sentence.

## Finish

Reply with the path to `gaps.md`, the counts per section, and the blocking questions only. If there are none, say so. Do not start the build while blocking gaps are unanswered, unless the user says to proceed with the proposed defaults.

## Sources behind these checks

Mostly vendor and community guides, so treat the exact numbers as conventions, not standards.
- [Design handoff problems (Figr)](https://figr.design/blog/design-to-dev-handoff-problems) and [Design handoff checklist (Eleken)](https://www.eleken.co/blog-posts/design-handoff-checklist): missing states and undocumented logic are the top gaps.
- [Design QA checklist (21st.dev)](https://21st.dev/blog/design-qa-checklist) and [8-state checklist (Hallmark)](https://instagit.com/Nutlope/hallmark/hallmark-8-state-checklist-interactive-components/): the state list and content states.
- [Design system audits (Figma)](https://www.figma.com/solutions/design-system-audits/): visual consistency, detached and outdated components.
