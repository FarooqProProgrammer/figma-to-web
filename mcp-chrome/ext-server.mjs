#!/usr/bin/env node
// MCP server (stdio) that drives your real Chrome through the extension/ bridge. No sign-in.
// Listens on 127.0.0.1:8765 (next free port up to 8774, so several agents can run at once).
// Only chrome-extension:// origins may connect, so web pages cannot hijack the socket.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer } from 'ws';
import { z } from 'zod';

let sock;
const pending = new Map();
let nextId = 0;

function listen(port = 8765) {
  const wss = new WebSocketServer({ host: '127.0.0.1', port, verifyClient: ({ origin }) => /^chrome-extension:\/\//.test(origin ?? '') });
  wss.on('error', (e) => (e.code === 'EADDRINUSE' && !process.env.MCP_CHROME_PORT && port < 8768 ? listen(port + 1) : console.error(e)));
  wss.on('connection', (ws) => {
    sock = ws;
    ws.on('message', (m) => {
      const r = JSON.parse(m);
      const p = pending.get(r.id);
      if (!p) return; // ping
      pending.delete(r.id);
      r.error ? p.rej(new Error(r.error)) : p.res(r.result);
    });
    ws.on('close', () => { if (sock === ws) sock = null; });
  });
}

const call = (method, params) => new Promise((res, rej) => {
  if (!sock) return rej(new Error('Chrome extension not connected. Load mcp-chrome/extension in chrome://extensions (Developer mode) and keep Chrome open.'));
  const id = ++nextId;
  const t = setTimeout(() => { pending.delete(id); rej(new Error('timeout')); }, 45000);
  pending.set(id, { res: (v) => { clearTimeout(t); res(v); }, rej: (e) => { clearTimeout(t); rej(e); } });
  sock.send(JSON.stringify({ id, method, params }));
});

const server = new McpServer({ name: 'mcp-chrome-ext', version: '0.1.0' });
const tabId = z.number().int().optional().describe('Tab id from tabs_context; default = active tab');
const tool = (name, description, shape) => server.tool(name, description, { ...shape, tabId }, async (a) => {
  try {
    const r = await call(name, a);
    return r?.image
      ? { content: [{ type: 'image', data: r.image, mimeType: 'image/png' }] }
      : { content: [{ type: 'text', text: String(r) }] };
  } catch (e) {
    return { isError: true, content: [{ type: 'text', text: e.message }] };
  }
});

tool('tabs_context', 'List open tabs (id, title, url; * = active)', {});
tool('tabs_create', 'Open a new tab', { url: z.string().optional() });
tool('tabs_close', 'Close a tab', {});
tool('navigate', 'Go to a URL, or "back" / "forward"', { url: z.string() });
tool('read_page', 'Page tree with ref ids for elements; filter=interactive for only clickable/typeable', { filter: z.enum(['all', 'interactive']).optional() });
tool('get_page_text', 'Visible text of the page', {});
tool('find', 'Find elements by text, role, label or id; returns refs', { query: z.string() });
tool('form_input', 'Set a form control (input/select/checkbox) by ref', { ref: z.string(), value: z.union([z.string(), z.boolean()]) });
tool('computer', 'Mouse/keyboard/screenshot. Coordinates are CSS px from the latest screenshot; ref can replace coordinate.', {
  action: z.enum(['screenshot', 'left_click', 'right_click', 'double_click', 'triple_click', 'hover', 'type', 'key', 'scroll', 'scroll_to', 'left_click_drag', 'wait']),
  coordinate: z.tuple([z.number(), z.number()]).optional(),
  start_coordinate: z.tuple([z.number(), z.number()]).optional(),
  ref: z.string().optional(),
  text: z.string().optional().describe('Text to type, or key combo like "Enter", "ctrl+a", "Tab Tab"'),
  scroll_direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  scroll_amount: z.number().optional(),
  duration: z.number().optional().describe('seconds, max 30'),
});
tool('javascript_tool', 'Run JavaScript in the page (awaited), returns the JSON result', { text: z.string() });
tool('read_console_messages', 'Console output captured since first use on the tab', { pattern: z.string().optional(), onlyErrors: z.boolean().optional(), clear: z.boolean().optional(), limit: z.number().optional() });
tool('read_network_requests', 'Network requests captured since first use on the tab', { urlPattern: z.string().optional(), clear: z.boolean().optional(), limit: z.number().optional() });
tool('resize_window', 'Resize the browser window', { width: z.number(), height: z.number() });

listen(Number(process.env.MCP_CHROME_PORT) || 8765); // MCP_CHROME_PORT pins one port (tests)
await server.connect(new StdioServerTransport());
