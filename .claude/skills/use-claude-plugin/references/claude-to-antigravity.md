# Claude Code to Google Antigravity Conversion Reference

This reference explains the architectural differences and migration patterns between Claude Code plugins and Google Antigravity configurations.

---

## 1. Structural Comparison

| Component | Claude Code | Google Antigravity | Compatibility / Adaptation Notes |
| :--- | :--- | :--- | :--- |
| **Plugin Root Manifest** | `.claude-plugin/plugin.json` or `plugin.json` | `~/.gemini/config/plugins/<name>/plugin.json` or Workspace `.agents/` | In workspace mode, Antigravity uses `.agents/skills.json` and `.agents/mcp_config.json`. Global Antigravity plugins use `plugin.json`. |
| **Skills Definition** | `skills/<name>/SKILL.md` | `skills/<name>/SKILL.md` or `.agents/skills/<name>/SKILL.md` | **100% Syntax Compatible**. Both use identical YAML frontmatter (`name` and `description`). Antigravity supports progressive disclosure. |
| **MCP Servers** | `mcpServers` in `plugin.json` or `.mcp.json` | `.agents/mcp_config.json` or `~/.gemini/config/mcp_config.json` | **100% Spec Compatible**. Standard MCP format (`command`, `args`, `env`). |
| **Rules & Instructions** | `.claude/rules/*.md` or `CLAUDE.md` | `AGENTS.md`, `GEMINI.md`, or `.agents/rules/*.md` | Antigravity automatically loads `AGENTS.md` and `GEMINI.md` hierarchically from the workspace. |
| **Slash Commands** | `commands/<name>.md` with frontmatter | Slash commands mapped in `AGENT.md` / `AGENTS.md` | Claude Code exposes `commands/<name>.md` directly as `/command-name`. In Antigravity, map them in the commands table in `AGENTS.md`. |
| **Agents / Subagents** | `agents/<name>.md` | `agents/<name>.md` or `define_subagent` / `invoke_subagent` | Prompts and roles map directly; adjust tool permissions to Antigravity's API. |
| **Hooks** | `hooks.json` (event triggers) | `hooks.json` (supported in Antigravity plugin bundles) | Event lifecycle hooks can run shell commands before/after actions. |

---

## 2. Environment Variables & Path Resolution

### The `${CLAUDE_PLUGIN_ROOT}` Variable
Claude Code injects an environment variable `${CLAUDE_PLUGIN_ROOT}` pointing to the installed plugin root directory.
In Antigravity:
1. **Prefer Relative Paths**: In markdown files and script calls, use paths relative to the workspace root or skill directory:
   ```markdown
   <!-- Claude style -->
   node "${CLAUDE_PLUGIN_ROOT}/scripts/check.mjs"

   <!-- Antigravity / Dual-compatible style -->
   node scripts/check.mjs
   ```
2. **Environment Fallback in Scripts**: In Node.js or bash scripts, provide a fallback:
   ```javascript
   const pluginRoot = process.env.ANTIGRAVITY_PLUGIN_ROOT || process.env.CLAUDE_PLUGIN_ROOT || path.resolve('.');
   ```

---

## 3. Windows Shell Considerations

- **Claude Code**: Often assumes a Unix-like Bash environment (`curl`, `cat`, `source /tmp/...`).
- **Antigravity on Windows**: Defaults to PowerShell.
- **Rule for cross-compatibility**:
  - Prefer Node.js (`node script.mjs`) or Python scripts for cross-platform execution rather than shell scripts (`.sh`).
  - When bash is necessary, verify execution mode or provide PowerShell / Node alternatives.

---

## 4. Dual-Compatibility Pattern

To make a single repository work out-of-the-box in **both** Claude Code and Google Antigravity:

```text
my-plugin-repo/
├── .claude-plugin/
│   └── plugin.json            # Read by Claude Code marketplace / CLI
├── .agents/
│   ├── skills.json            # Registers skills search paths for Antigravity
│   └── mcp_config.json        # Configures MCP servers for Antigravity
├── skills/                    # Shared skills folder
│   └── my-skill/
│       └── SKILL.md
├── commands/                  # Slash commands for Claude Code & Antigravity
│   └── do-task.md
├── AGENT.md                   # Antigravity project instructions & command quick reference
├── AGENTS.md                  # Synced instructions for Antigravity
└── README.md                  # Setup guides for both Antigravity and Claude Code
```
