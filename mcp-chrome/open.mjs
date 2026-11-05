import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
const c = new Client({ name: 'open', version: '0' });
await c.connect(new StdioClientTransport({ command: 'node', args: ['ext-server.mjs'] }));
const call = async (name, arguments_ = {}) => (await c.callTool({ name, arguments: arguments_ })).content[0];
let r;
for (let i = 0; i < 15; i++) { r = await call('tabs_context'); if (!/not connected/.test(r.text)) break; await new Promise((x) => setTimeout(x, 1000)); }
console.log(r.text);
if (/not connected/.test(r.text)) process.exit(1);
console.log(await call('tabs_create', { url: process.argv[2] }).then((x) => x.text));
const tabs = (await call('tabs_context')).text; console.log(tabs);
const s = await call('computer', { action: 'screenshot' });
fs.writeFileSync('shot.png', Buffer.from(s.data, 'base64'));
console.log((await call('read_page', { filter: 'interactive' })).text.slice(0, 1500));
process.exit(0);
