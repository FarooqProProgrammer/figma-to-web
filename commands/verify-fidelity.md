---
description: Measure and pixel-diff an implemented screen against its Figma frames at every breakpoint, and fix deviations over one pixel
argument-hint: <screen-name>
---

Verify the screen: $ARGUMENTS

Run the `figma-to-web:fidelity-verifier` agent on it. If no screen is named above, run one agent for each screen in `docs/screens/`, in parallel. If a screen has no spec in `docs/design/`, run `figma-to-web:figma-inspector` for it first.

Fix every deviation the agent reports, using `${CLAUDE_PLUGIN_ROOT}/skills/figma-to-laravel/references/figma-to-css.md` for the correct translation, then run the agent again to confirm. Stop when it comes back clean or when two rounds make no progress on a deviation. Record anything you cannot fix in `docs/screens/<screen>.md` with its reason, and finish with the list of what was fixed, what remains, and the pixel-diff percentage at each frame width.
