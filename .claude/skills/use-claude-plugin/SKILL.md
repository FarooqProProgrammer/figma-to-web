---
name: use-claude-plugin
description: Adapt, bridge, install, and execute Claude Code plugins and skills in Google Antigravity. Use whenever the user asks to use, import, convert, or run a Claude plugin or skill in Antigravity, adapt Claude Code extensions or MCP configs, or configure dual-compatibility between Claude Code and Antigravity.
---

# Use Claude Plugin in Antigravity

This skill enables Google Antigravity to discover, adapt, install, and execute plugins, skills, MCP servers, and commands created for Anthropic's **Claude Code** agent.

Both Antigravity and Claude Code share the open agent skills architecture (Markdown runbooks with YAML frontmatter, progressive disclosure, and Model Context Protocol servers). With minimal bridging, virtually any Claude Code plugin can run natively in Antigravity.

---

## Quick Reference: Component Mapping

| Claude Code Component | Antigravity Equivalent | Action Required |
| :--- | :--- | :--- |
| **`skills/<name>/SKILL.md`** | `.agents/skills/<name>/SKILL.md` or `skills/` | **100% compatible**. Index the path in `.agents/skills.json` or copy into `.agents/skills/`. |
| **`plugin.json` (or `.claude-plugin/`)** | `.agents/` workspace config or global `~/.gemini/config/plugins/` | Extract `mcpServers` and `skills` paths. |
| **MCP Servers (`mcpServers`, `.mcp.json`)** | `.agents/mcp_config.json` | Copy the `mcpServers` object into `.agents/mcp_config.json`. |
| **Commands (`commands/<name>.md`)** | `AGENT.md` / `AGENTS.md` Quick Reference | Map command triggers in `AGENT.md`/`AGENTS.md` or invoke the skill directly. |
| **Rules (`.claude/rules/*.md`)** | `AGENTS.md`, `GEMINI.md`, or `.agents/rules/*.md` | Copy rule files into `.agents/rules/` or incorporate into `AGENTS.md`. |
| **`${CLAUDE_PLUGIN_ROOT}`** | Relative paths or project root | Replace with relative paths or environment fallback in scripts. |

---

## 1. Automated Adaptation (Recommended)

Run the included adapter script to inspect a target Claude plugin and automatically configure Antigravity:

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

### Method A: Workspace Dual-Compatibility (Both Agents in One Repo)
Use this when you want a repository to work simultaneously in Claude Code and Google Antigravity (like this workspace):

1. **Keep Claude structures**:
   - Keep `.claude-plugin/plugin.json`, `skills/`, `commands/`, and `rules/`.
2. **Add Antigravity discovery configuration**:
   - Create `.agents/skills.json` pointing to skill directories:
     ```json
     {
       "entries": [
         { "path": "skills" },
         { "path": ".agents/skills" }
       ]
     }
     ```
3. **Bridge MCP Servers**:
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
4. **Bridge Commands & Auto-Activation**:
   - Claude exposes `commands/<name>.md` as `/name`. In Antigravity, add a quick reference table and auto-activation rule in `AGENT.md` and `AGENTS.md`:
     ```markdown
     ## Slash Commands Quick Reference
     - `/<name>` -> Trigger workflow from `commands/<name>.md` or `skills/<name>/SKILL.md`
     ```

---

### Method B: Standalone Skill Import (Extract a Single Skill)
If you only need one specific skill from a Claude plugin:

1. Copy the skill directory from the Claude plugin (`skills/<skill-name>/`) into `.agents/skills/<skill-name>/` (workspace) or `~/.gemini/config/skills/<skill-name>/` (global).
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
- **In Node.js scripts**: Use standard Node.js root resolution:
  ```javascript
  import path from 'node:path';
  const root = process.env.ANTIGRAVITY_PLUGIN_ROOT 
            || process.env.CLAUDE_PLUGIN_ROOT 
            || path.resolve('.');
  ```

### Handling Shell Differences on Windows
- Claude Code default instructions often assume a Unix bash shell (`cat > /tmp/...`, `source ...`).
- In Google Antigravity on Windows, the default shell is **PowerShell**.
- **Fix**: Convert shell scripts or multi-command bash chains to Node.js scripts (`.mjs`) or PowerShell equivalents (`Get-Content`, `Set-Content`, etc.).

---

## 4. Verification Checklist

After adapting a Claude plugin:
- [ ] **Discovery**: Does Antigravity list the skill under available skills?
- [ ] **Frontmatter**: Does `SKILL.md` contain lowercase hyphenated `name` and descriptive `description`?
- [ ] **MCP Servers**: Are MCP servers defined in `.agents/mcp_config.json` responding when called?
- [ ] **Path Resolution**: Do all referenced scripts and examples exist and execute without missing path errors?
- [ ] **Testing**: Run a prompt matching the skill's trigger description to confirm progressive activation.

For more detailed architectural mapping, see [claude-to-antigravity.md](./references/claude-to-antigravity.md).
