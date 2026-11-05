---
description: Read Figma frames and update the shared CSS tokens and Blade components, without building a screen
argument-hint: <figma-url> [more URLs]
---

Read the Figma design at: $ARGUMENTS

Do the setup and steps 1 and 2 of the `figma-to-web:figma-to-laravel` skill only: have the `figma-to-web:figma-inspector` agent write the design spec, then create or update `resources/css/tokens.css` and the shared Blade components from it. Build no screen.

Report the tokens and components added or changed, and any Figma value that contradicts an existing token. Read the design through the Figwright MCP server only. If no Figma URL appears above, use the frame currently selected in Figma, and ask if nothing is selected.
