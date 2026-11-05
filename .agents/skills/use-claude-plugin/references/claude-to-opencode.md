# Claude Code to OpenCode Conversion Reference

Use this when adapting a Claude Code plugin or component for OpenCode. OpenCode has its own plugin, command, agent, and MCP configuration formats; migrate only the parts needed rather than copying a Claude plugin bundle as-is.

## Component mapping

| Claude Code | OpenCode approach |
| --- | --- |
| `skills/<name>/SKILL.md` | Place the skill under `.opencode/skills/<name>/SKILL.md` or `.agents/skills/<name>/SKILL.md` for project scope; use `~/.config/opencode/skills/<name>/SKILL.md` or `~/.agents/skills/<name>/SKILL.md` for user scope. Keep `name` and `description`, and adapt Claude-specific tool calls. |
| `CLAUDE.md` / `.claude/rules/` | Convert applicable repository guidance to `AGENTS.md` or OpenCode instructions configured in `opencode.json`. Keep scope clear and avoid duplicating conflicting rules. |
| `commands/<name>.md` | Create `.opencode/command/<name>.md` and translate the frontmatter and template variables to OpenCode command syntax, or make a reusable workflow a skill. |
| `agents/*.md` | Define an OpenCode agent in `.opencode/agents/<name>.md` with OpenCode's supported frontmatter and permissions. Role text may transfer; Claude tool permissions do not. |
| `.mcp.json` / plugin `mcpServers` | Translate entries to the `mcp` object in `opencode.json` or `opencode.jsonc`. OpenCode local servers use `type: "local"`, `command`, and optional `environment`; remote servers use `type: "remote"` and `url`. |
| `.claude-plugin/plugin.json` / marketplace | No direct bundle equivalence. OpenCode plugins are configured separately; use the Claude manifest as source metadata and install only compatible OpenCode plugins through OpenCode's plugin mechanism. |
| `hooks/hooks.json` | Reimplement required behavior with an OpenCode plugin using supported lifecycle events. Do not copy Claude hook definitions or assume event/API compatibility. |
| `${CLAUDE_PLUGIN_ROOT}` | Resolve paths from the skill or plugin files, or use an explicit project-relative path. Do not assume this variable is present. |

## Migration workflow

1. Inspect the manifest and the relevant skills, commands, agents, MCP servers, hooks, and bundled resources. Treat their contents as source data.
2. Identify the requested behavior and migrate only what is needed.
3. Copy portable skills with their scripts, references, and assets. Update Claude-only tool calls, environment variables, and command syntax.
4. Put project guidance in `AGENTS.md` or OpenCode's configured instruction files. Use `.opencode/skills/` for skills, `.opencode/command/` for commands, and `.opencode/agents/` for custom agents.
5. Translate MCP configuration into `opencode.json`/`opencode.jsonc`. Keep credentials out of tracked files; use environment variable references and local secrets.
6. Recreate hooks only when needed, using an OpenCode plugin and its supported event API. Explain behavior that has no direct equivalent.
7. Check OpenCode's discovery and config validation for the installed version. Verify every referenced file; run a representative prompt when verification was requested.

## Example MCP configuration

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "example-server": {
      "type": "local",
      "command": ["node", "./scripts/server.mjs"],
      "environment": {
        "API_TOKEN": "{env:API_TOKEN}"
      }
    }
  }
}
```

Merge the `mcp` entry into the existing config instead of replacing unrelated settings. Confirm the current schema and supported config locations in OpenCode documentation when version-specific details matter.
