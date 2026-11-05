// Live responsive run in your real Chrome via the extension (cursor + glow visible).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
const url = process.argv[2];
const c = new Client({ name: 'live', version: '0' });
await c.connect(new StdioClientTransport({ command: 'node', args: ['ext-server.mjs'] }));
const call = async (name, a = {}) => { const r = (await c.callTool({ name, arguments: a })).content[0]; if (r.text?.includes('is not a function')) throw new Error('Reload the extension at chrome://extensions'); return r; };
let r;
for (let i = 0; i < 20; i++) { r = await call('tabs_context'); if (!/not connected/.test(r.text)) break; await new Promise((x) => setTimeout(x, 1000)); }
if (/not connected/.test(r.text)) { console.log('extension not connected'); process.exit(1); }
await call('tabs_create', { url });
fs.mkdirSync('../qa/home/live', { recursive: true });
const probe = `JSON.stringify({vw:innerWidth,scrollW:document.documentElement.scrollWidth,over:document.documentElement.scrollWidth-innerWidth,small:[...document.querySelectorAll('a,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<44||r.width<44)&&getComputedStyle(e).visibility!=='hidden'}).length})`;
for (const [w, h] of [[375, 812], [320, 640], [768, 1024], [1440, 900]]) {
  await call('emulate', { width: w, height: h });
  await new Promise((x) => setTimeout(x, 800));
  console.log(w, (await call('javascript_tool', { text: probe })).text);
  const s = await call('computer', { action: 'screenshot' });
  fs.writeFileSync(`../qa/home/live/w${w}.png`, Buffer.from(s.data, 'base64'));
  if (w === 375) { // drive the mobile menu live, with the cursor
    const m = (await call('find', { query: 'menu' })).text; console.log('menu find:', m.split('\n')[0]);
    const ref = m.match(/\[(ref_\d+)\]/)?.[1];
    if (ref) { await call('computer', { action: 'left_click', ref }); await new Promise((x) => setTimeout(x, 700));
      fs.writeFileSync('../qa/home/live/w375-menu.png', Buffer.from((await call('computer', { action: 'screenshot' })).data, 'base64')); }
    await call('computer', { action: 'scroll', scroll_direction: 'down', scroll_amount: 10, coordinate: [180, 400] });
    await new Promise((x) => setTimeout(x, 800));
    fs.writeFileSync('../qa/home/live/w375-scrolled.png', Buffer.from((await call('computer', { action: 'screenshot' })).data, 'base64'));
  }
}
await call('emulate', { width: 0 });
console.log('console errors:', (await call('read_console_messages', { onlyErrors: true })).text.slice(0, 400));
process.exit(0);
