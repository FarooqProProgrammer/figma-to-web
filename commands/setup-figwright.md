---
description: Install and verify Figwright (the Figma MCP server and its Figma plugin) so the plugin can read designs
---

Set up Figwright (https://github.com/awdr74100/figwright). It has two halves that ship together: the MCP server (`@figwright/mcp`, started by this plugin through `scripts/figwright-mcp.mjs`) and a Figma plugin that you import into the Figma desktop app.

1. Check Node: `node --version` must be 20.19 or later (or 22.12 or later). If not, stop and tell the user to upgrade; Node 18, 21 and 22.0 to 22.11 do not work.
2. Check the server resolves: `npm view @figwright/mcp@0.7.0 version`. The version is pinned in `scripts/figwright-mcp.mjs`; if you raise it, the Figma plugin must come from the same release.
3. Tell the user to install the Figma plugin themselves, because it needs the Figma desktop app: download `figwright-plugin-v0.7.0.zip` from https://github.com/awdr74100/figwright/releases/latest, unzip it, then **Menu → Plugins → Development → Import plugin from manifest…** and pick `manifest.json`.
4. Tell the user to open the design and run **Plugins → Development → Figwright** until it shows **Connected**.
5. Call the Figwright `ping` tool to confirm the link. If the server is not listed, ask the user to run `/mcp`, pick **figwright** and choose **Reconnect**. If `ping` says the plugin is not connected, repeat step 4.

Report what passed and what the user still has to do. Do not edit the Figma file: this plugin only uses Figwright's read tools.
