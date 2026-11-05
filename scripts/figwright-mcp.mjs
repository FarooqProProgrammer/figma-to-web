// Starts the Figwright MCP server (https://github.com/awdr74100/figwright) on stdio.
// The version is pinned so a new release never runs unreviewed. When you raise it,
// install the Figma plugin from the same release, because the two halves ship together.
import { spawn } from 'node:child_process';

const args = ['-y', '@figwright/mcp@0.7.0'];
// npx is a .cmd shim on Windows, which only cmd.exe can start.
const windows = process.platform === 'win32';
const child = spawn(windows ? 'cmd.exe' : 'npx', windows ? ['/c', 'npx', ...args] : args, { stdio: 'inherit' });
child.on('error', (error) => {
  console.error(`Could not start Figwright: ${error.message}. Is Node 20.19 or later on PATH?`);
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 1));
