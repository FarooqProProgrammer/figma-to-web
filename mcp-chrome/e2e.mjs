import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { chromium } from 'playwright-core';
import assert from 'node:assert';
import http from 'node:http';
const web = http.createServer((q, r) => r.setHeader('content-type', 'text/html').end('<input id=a placeholder=Name><button onclick="document.title=a.value">Go</button><script>console.log("hi")</script>')).listen(0);
const url = `http://127.0.0.1:${web.address().port}/`;
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
const c = new Client({ name: 't', version: '0' });
await c.connect(new StdioClientTransport({ command: 'node', args: ['ext-server.mjs'], env: { ...process.env, MCP_CHROME_PORT: '9333' } }));
const ext = path.resolve('extension');
const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'mcpx-')), {
  channel: 'chrome', headless: false, ignoreDefaultArgs: ['--disable-extensions'],
  args: ['--enable-unsafe-extension-debugging'],
});
const cdp = await ctx.browser().newBrowserCDPSession();
console.log('loaded', await cdp.send('Extensions.loadUnpacked', { path: ext }));
const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
await sw.evaluate(() => chrome.storage.local.set({ ports: [9333] })); // isolate from your real Chrome
const call = async (name, args = {}) => (await c.callTool({ name, arguments: args })).content[0];
let r;
for (let i = 0; i < 20; i++) { r = await call('tabs_context'); if (!/not connected/.test(r.text)) break; await new Promise((x) => setTimeout(x, 1000)); }
console.log('ctx:', r.text);
assert(!/not connected/.test(r.text), 'extension never connected');
await call('navigate', { url });
const tree = await call('read_page', { filter: 'interactive' });
console.log(tree.text);
const ref = tree.text.match(/textbox.*\[(ref_\d+)\]/)[1];
await call('form_input', { ref, value: 'bob' });
const btn = tree.text.match(/button "Go" \[(ref_\d+)\]/)[1];
await call('computer', { action: 'left_click', ref: btn });
console.log('title:', (await call('javascript_tool', { text: 'document.title' })).text);
console.log('fx overlay:', (await call('javascript_tool', { text: "!!document.getElementById('__mcp_fx')" })).text);
console.log('shot:', (await call('computer', { action: 'screenshot' })).type);
console.log('console:', (await call('read_console_messages')).text);
await ctx.close(); await c.close(); web.close(); process.exit(0);
