---
name: use-claude-plugin
description: Adapt, bridge, install, and execute Claude Code plugins, skills, commands, agents, and MCP configurations in Codex, OpenCode, or Google Antigravity. Use whenever the user asks to use, import, convert, or run a Claude plugin or skill in these agents, adapt Claude Code extensions or MCP configs, or configure a repository for multiple coding agents.
---

# Use Claude Plugins in Codex, OpenCode, and Antigravity

This skill helps Codex, OpenCode, and Google Antigravity reuse components created for Anthropic's **Claude Code** agent. Choose the target agent first: skills are usually portable, while plugin manifests, MCP settings, commands, hooks, and agent definitions need target-specific wiring.

Codex and Claude Code both support skills built around `SKILL.md` with YAML frontmatter. A Claude Code plugin is not itself a drop-in Codex plugin; reuse its portable content and translate configuration and runtime assumptions explicitly.

---

## Quick Reference: Component Mapping

| Claude Code Component | Target mapping | Action Required |
| :--- | :--- | :--- |
| **`skills/<name>/SKILL.md`** | `.agents/skills/<name>/SKILL.md` or `skills/` | **100% compatible**. Index the path in `.agents/skills.json` or copy into `.agents/skills/`. |
| **`plugin.json` (or `.claude-plugin/`)** | `.agents/` workspace config or global `~/.gemini/config/plugins/` | Extract `mcpServers` and `skills` paths. |
| **MCP Servers (`mcpServers`, `.mcp.json`)** | `.agents/mcp_config.json` | Copy the `mcpServers` object into `.agents/mcp_config.json`. |
| **Commands (`commands/<name>.md`)** | `AGENT.md` / `AGENTS.md` Quick Reference | Map command triggers in `AGENT.md`/`AGENTS.md` or invoke the skill directly. |
| **Rules (`.claude/rules/*.md`)** | `AGENTS.md`, `GEMINI.md`, or `.agents/rules/*.md` | Copy rule files into `.agents/rules/` or incorporate into `AGENTS.md`. |
| **`${CLAUDE_PLUGIN_ROOT}`** | Relative paths or project root | Replace with relative paths or environment fallback in scripts. |
| **`skills/<name>/SKILL.md`** | Codex `.agents/skills/<name>/SKILL.md` | Usually reusable; review instructions for Claude-only tools and paths. |
| **Claude plugin manifest / marketplace** | No direct Codex equivalent | Read the manifest as source metadata; install or invoke the skill and tools using Codex conventions. |
| **`.mcp.json` / plugin `mcpServers`** | Codex MCP configuration | Configure the server through Codex settings/config; do not assume `.mcp.json` is loaded automatically. |
| **Claude commands** | Codex skills or `AGENTS.md` guidance | Convert reusable workflows into skills; place repository-wide rules in `AGENTS.md`. |
| **Claude hooks** | Codex-supported config/hooks, where available | Check the installed Codex version and supported hook events; do not copy `hooks.json` blindly. |
| **Claude skills and MCP configs** | OpenCode skills, `opencode.json[c]`, commands, agents, and plugins | Translate to OpenCode conventions; see [claude-to-opencode.md](./references/claude-to-opencode.md). |

---

## 1. Automated Adaptation (Recommended)

Run the included adapter script only when the target is Antigravity. It does not configure Codex:

```bash
# Run against the current project
node .agents/skills/use-claude-plugin/scripts/adapt-claude-plugin.mjs .

# Or run against an external Claude plugin repository/directory
node .agents/skills/use-claude-plugin/scripts/adapt-claude-plugin.mjs /path/to/claude-plugin
```

The script:
1. Detects `plugin.json` and parses metadata.
2. Discovers all skills in `skills/`, `.claude/skills/`, and `.agents/skills/`.
3. Discovers MCP server configs in `plugin.json` or `.mcp.json`.
4. Updates `.agents/skills.json` to index skill discovery paths.
5. Generates `.agents/mcp_config.json` with all discovered MCP servers.

---

## 2. Manual Integration Workflows

### Method A: Workspace Dual-Compatibility
Use this when you want a repository to work in Claude Code and another agent:

1. **Keep Claude structures**:
   - Keep `.claude-plugin/plugin.json`, `skills/`, `commands/`, and `rules/`.
2. **For Antigravity**, add its discovery configuration as documented below.
3. **For Codex**, put shared skills under `.agents/skills/<skill-name>/SKILL.md` and repository guidance in `AGENTS.md`. Codex discovers skills from `.agents/skills`; no Antigravity `.agents/skills.json` is needed.
4. **Configure MCP per target agent**. For Codex, add server settings using the active Codex configuration mechanism (user or project config supported by the installed version). Do not copy `.mcp.json` and assume Codex will import it.
5. **Bridge commands** by turning useful Claude command workflows into skills or documenting them in `AGENTS.md`. Keep Claude-specific frontmatter and tool calls out of shared instructions unless guarded by a target-specific note.

Antigravity discovery configuration:
   - Create `.agents/skills.json` pointing to skill directories:
     ```json
     {
       "entries": [
         { "path": "skills" },
         { "path": ".agents/skills" }
       ]
     }
     ```
Bridge MCP Servers:
   - If the Claude plugin defines MCP servers in `.mcp.json` or `plugin.json`, create `.agents/mcp_config.json`:
     ```json
     {
       "mcpServers": {
         "<server-name>": {
           "command": "node",
           "args": ["scripts/server.mjs"]
         }
       }
     }
     ```
Bridge Commands & Auto-Activation:
   - Claude exposes `commands/<name>.md` as `/name`. In Antigravity, add a quick reference table and auto-activation rule in `AGENT.md` and `AGENTS.md`:
     ```markdown
     ## Slash Commands Quick Reference
     - `/<name>` -> Trigger workflow from `commands/<name>.md` or `skills/<name>/SKILL.md`
     ```

---

### Method B: Standalone Skill Import (Extract a Single Skill)
If you only need one specific skill from a Claude plugin, copy it with its referenced resources to `.agents/skills/<skill-name>/` for Codex or this workspace's Antigravity skill directory. For Codex, user-wide skills can live under `$HOME/.agents/skills/<skill-name>/`.

1. Copy the skill directory from the Claude plugin (`skills/<skill-name>/`) into the target agent's skill directory.
2. Verify that the skill's `SKILL.md` has valid YAML frontmatter:
   ```yaml
   ---
   name: skill-name
   description: Clear description of what the skill does and when to activate it.
   ---
   ```
3. If the skill uses relative helper scripts in `scripts/`, ensure those scripts are copied alongside `SKILL.md`.

---

### Method C: Global Antigravity Plugin Installation
To install the Claude plugin as a global Antigravity plugin for all workspaces on your machine:

1. Create a directory in `~/.gemini/config/plugins/<plugin-name>/`.
2. Create `plugin.json` in that directory:
   ```json
   {
     "name": "<plugin-name>",
     "description": "<Description>",
     "skills": ["./skills/"]
   }
   ```
3. Copy or symlink the `skills/`, `agents/`, and `mcp_config.json` files into `~/.gemini/config/plugins/<plugin-name>/`.
4. In Antigravity chat, run `/plugin` to view and enable the newly installed plugin.

---

## 3. Resolving Runtime & Environment Differences

### Handling `${CLAUDE_PLUGIN_ROOT}`
Claude Code scripts often refer to `${CLAUDE_PLUGIN_ROOT}` to locate assets or dependencies.
- **In Markdown instructions**: Change `node "${CLAUDE_PLUGIN_ROOT}/scripts/foo.mjs"` to `node scripts/foo.mjs` (relative to workspace root) or link with `[foo.mjs](./scripts/foo.mjs)`.
- **In Node.js scripts**: Resolve paths from the script's own location or provide an explicit target-specific root. For Antigravity scripts, a fallback can be:
  ```javascript
  import path from 'node:path';
  const root = process.env.ANTIGRAVITY_PLUGIN_ROOT 
            || process.env.CLAUDE_PLUGIN_ROOT 
            || path.resolve('.');
  ```

### Handling Shell Differences on Windows
- Claude Code default instructions often assume a Unix bash shell (`cat > /tmp/...`, `source ...`).
- On Windows, Codex may use PowerShell or another configured shell; Antigravity commonly uses PowerShell.
- Prefer portable Node.js or Python scripts, or give shell-specific alternatives when the runtime matters.

---

## 4. Verification Checklist

After adapting a Claude plugin:
- [ ] **Discovery**: Does the selected agent list the skill under available skills?
- [ ] **Frontmatter**: Does `SKILL.md` contain lowercase hyphenated `name` and descriptive `description`?
- [ ] **MCP Servers**: Is the server configured in the selected agent's supported settings and responding when called?
- [ ] **Path Resolution**: Do all referenced scripts and examples exist and execute without missing path errors?
- [ ] **Testing**: Run a prompt matching the skill's trigger description to confirm progressive activation.

For detailed mappings, see [claude-to-antigravity.md](./references/claude-to-antigravity.md), [claude-to-codex.md](./references/claude-to-codex.md), and [claude-to-opencode.md](./references/claude-to-opencode.md).
