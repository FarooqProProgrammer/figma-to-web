/**
 * adapt-claude-plugin.mjs
 * 
 * Inspects a Claude Code plugin directory and generates or updates Google Antigravity
 * configuration files (.agents/skills.json, .agents/mcp_config.json, and AGENTS.md bridge notes).
 * 
 * Usage:
 *   node adapt-claude-plugin.mjs [path-to-claude-plugin] [--global]
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const targetDir = path.resolve(process.argv[2] || '.');
const isGlobal = process.argv.includes('--global');

console.log(`\n🔍 Inspecting Claude plugin in: ${targetDir}`);

// 1. Locate plugin manifest
const manifestCandidates = [
  path.join(targetDir, '.claude-plugin', 'plugin.json'),
  path.join(targetDir, 'plugin.json')
];

let manifest = null;
let manifestPath = null;
for (const cand of manifestCandidates) {
  if (fs.existsSync(cand)) {
    try {
      manifest = JSON.parse(fs.readFileSync(cand, 'utf8'));
      manifestPath = cand;
      break;
    } catch (e) {
      console.warn(`⚠️ Warning: Failed to parse ${cand}: ${e.message}`);
    }
  }
}

if (manifest) {
  console.log(`✅ Found plugin manifest: ${path.relative(targetDir, manifestPath)}`);
  console.log(`   Name: ${manifest.name || 'unnamed'}`);
  console.log(`   Version: ${manifest.version || 'unknown'}`);
} else {
  console.log(`ℹ️ No explicit plugin.json found. Scanning directory structure directly.`);
}

// 2. Discover skills
const skillDirs = [];
const possibleSkillRoots = [
  path.join(targetDir, 'skills'),
  path.join(targetDir, '.claude', 'skills'),
  path.join(targetDir, '.agents', 'skills')
];

for (const root of possibleSkillRoots) {
  if (fs.existsSync(root) && fs.statSync(root).isDirectory()) {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const skillMd = path.join(root, ent.name, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          skillDirs.push({
            name: ent.name,
            root: path.relative(targetDir, root).replace(/\\/g, '/'),
            fullPath: skillMd
          });
        }
      }
    }
  }
}

console.log(`📦 Discovered ${skillDirs.length} skill(s):`);
for (const s of skillDirs) {
  console.log(`   - ${s.name} (${s.root}/${s.name})`);
}

// 3. Discover MCP servers
let mcpServers = {};
if (manifest && manifest.mcpServers) {
  mcpServers = { ...manifest.mcpServers };
}

const claudeMcpFile = path.join(targetDir, '.mcp.json');
if (fs.existsSync(claudeMcpFile)) {
  try {
    const mcpData = JSON.parse(fs.readFileSync(claudeMcpFile, 'utf8'));
    if (mcpData.mcpServers) {
      mcpServers = { ...mcpServers, ...mcpData.mcpServers };
    }
  } catch (e) {
    console.warn(`⚠️ Warning: Failed to parse .mcp.json: ${e.message}`);
  }
}

// Check existing .agents/mcp_config.json
const existingAgentMcp = path.join(targetDir, '.agents', 'mcp_config.json');
if (fs.existsSync(existingAgentMcp)) {
  try {
    const mcpData = JSON.parse(fs.readFileSync(existingAgentMcp, 'utf8'));
    if (mcpData.mcpServers) {
      mcpServers = { ...mcpServers, ...mcpData.mcpServers };
    }
  } catch (e) {
    // ignore
  }
}

console.log(`🔌 Discovered ${Object.keys(mcpServers).length} MCP server(s): ${Object.keys(mcpServers).join(', ') || 'none'}`);

// 4. Discover commands
const commandsDir = path.join(targetDir, 'commands');
const commands = [];
if (fs.existsSync(commandsDir) && fs.statSync(commandsDir).isDirectory()) {
  const files = fs.readdirSync(commandsDir);
  for (const f of files) {
    if (f.endsWith('.md')) {
      commands.push(path.basename(f, '.md'));
    }
  }
}
console.log(`⚡ Discovered ${commands.length} slash command(s): ${commands.join(', ') || 'none'}`);

// 5. Generate or update Antigravity files
const agentsDir = path.join(targetDir, '.agents');
if (!fs.existsSync(agentsDir)) {
  fs.mkdirSync(agentsDir, { recursive: true });
}

// 5a. .agents/skills.json
const skillsJsonPath = path.join(agentsDir, 'skills.json');
let existingSkillsJson = { entries: [] };
if (fs.existsSync(skillsJsonPath)) {
  try {
    existingSkillsJson = JSON.parse(fs.readFileSync(skillsJsonPath, 'utf8'));
    if (!Array.isArray(existingSkillsJson.entries)) {
      existingSkillsJson.entries = [];
    }
  } catch (e) {
    existingSkillsJson = { entries: [] };
  }
}

const uniqueRoots = new Set(existingSkillsJson.entries.map(e => e.path));
for (const s of skillDirs) {
  uniqueRoots.add(s.root);
}

// Ensure default skills folders are registered
if (fs.existsSync(path.join(targetDir, 'skills'))) uniqueRoots.add('skills');
if (fs.existsSync(path.join(targetDir, '.agents', 'skills'))) uniqueRoots.add('.agents/skills');

const updatedSkillsJson = {
  entries: Array.from(uniqueRoots).map(p => ({ path: p }))
};

fs.writeFileSync(skillsJsonPath, JSON.stringify(updatedSkillsJson, null, 2) + '\n', 'utf8');
console.log(`\n📝 Updated ${path.relative(targetDir, skillsJsonPath)} with skill search paths.`);

// 5b. .agents/mcp_config.json
if (Object.keys(mcpServers).length > 0) {
  const mcpConfigPath = path.join(agentsDir, 'mcp_config.json');
  const mcpOutput = { mcpServers };
  fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpOutput, null, 2) + '\n', 'utf8');
  console.log(`📝 Generated ${path.relative(targetDir, mcpConfigPath)} with MCP server configs.`);
}

console.log(`\n✨ Claude Plugin adapter check complete!`);
console.log(`   To trigger skills in Antigravity:`);
console.log(`   - Ensure skills are indexed in .agents/skills.json`);
console.log(`   - Reference commands in AGENTS.md / AGENT.md for auto-activation`);
