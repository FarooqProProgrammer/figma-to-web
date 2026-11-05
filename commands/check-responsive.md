---
description: Sweep a screen or component from 1920px down to 320px for overflow, clipping and overlap, and fix what is found
argument-hint: <screen-name>
---

Check the responsiveness of the screen: $ARGUMENTS

Run the `figma-to-web:responsive-auditor` agent on it. If no screen is named above, run one agent for each screen in `docs/screens/`, in parallel.

Fix every problem the agent reports, marking any new derived CSS with a `derived:` comment, then run the agent again to confirm. Finish with the list of what was fixed, the width ranges affected, and anything that remains.
