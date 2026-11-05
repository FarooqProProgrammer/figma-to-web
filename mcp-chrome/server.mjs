#!/usr/bin/env node
// Local Chrome-control MCP server (stdio). No sign-in, works with any MCP client.
// Env: CHROME_CDP_URL=http://127.0.0.1:9222 attaches to your running Chrome
//      (start it with --remote-debugging-port=9222); otherwise launches installed Chrome.
//      CHROME_HEADLESS=1 for headless. CHROME_PATH to override the executable.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chromium } from 'playwright-core';
import { z } from 'zod';

let context;
const getContext = async () => {
  if (context) return context;
  const cdp = process.env.CHROME_CDP_URL;
  if (cdp) {
    const browser = await chromium.connectOverCDP(cdp);
    context = browser.contexts()[0] ?? (await browser.newContext());
  } else {
    context = await chromium.launchPersistentContext(
      process.env.CHROME_PROFILE ?? new URL('./.profile', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
      { channel: process.env.CHROME_PATH ? undefined : 'chrome', executablePath: process.env.CHROME_PATH,
        headless: process.env.CHROME_HEADLESS === '1', viewport: null });
  }
  context.on('close', () => { context = undefined; });
  return context;
};
const page = async (i) => {
  const pages = (await getContext()).pages();
  const p = pages[i ?? pages.length - 1] ?? (await context.newPage());
  return p;
};

const text = (t) => ({ content: [{ type: 'text', text: String(t) }] });
const server = new McpServer({ name: 'mcp-chrome', version: '0.1.0' });
const tab = z.number().int().optional().describe('Tab index from tabs_list; default = last tab');
const tool = (name, description, shape, fn) =>
  server.tool(name, description, shape, async (a) => {
    try { return await fn(a); } catch (e) { return { isError: true, content: [{ type: 'text', text: e.message }] }; }
  });

tool('tabs_list', 'List open tabs', {}, async () =>
  text((await getContext()).pages().map((p, i) => `${i}: ${p.url()}`).join('\n') || '(no tabs)'));
tool('tab_new', 'Open a new tab, optionally at a URL', { url: z.string().optional() }, async ({ url }) => {
  const p = await (await getContext()).newPage();
  if (url) await p.goto(url);
  return text(`opened ${p.url()}`);
});
tool('tab_close', 'Close a tab', { tab }, async ({ tab }) => { await (await page(tab)).close(); return text('closed'); });
tool('navigate', 'Go to a URL', { url: z.string(), tab }, async ({ url, tab }) => {
  const p = await page(tab); await p.goto(url); return text(`${p.url()} — ${await p.title()}`);
});
tool('read_page', 'Accessibility-tree snapshot of the page (use selectors/roles from it)', { tab }, async ({ tab }) =>
  text(await (await page(tab)).locator('body').ariaSnapshot()));
tool('get_page_text', 'Visible text of the page', { tab }, async ({ tab }) =>
  text(await (await page(tab)).innerText('body')));
tool('find', 'Find elements by text; returns count and first matches', { text: z.string(), tab }, async ({ text: t, tab }) => {
  const l = (await page(tab)).getByText(t);
  const n = await l.count();
  const out = [];
  for (let i = 0; i < Math.min(n, 10); i++) out.push(`${i}: ${(await l.nth(i).innerText()).slice(0, 100)}`);
  return text(`${n} match(es)\n${out.join('\n')}`);
});
// target = CSS selector, or "text=Sign up" / "role=button[name='Go']" (Playwright selector syntax)
const target = z.string().describe('Playwright selector: CSS, text=..., role=button[name="X"]');
tool('click', 'Click an element', { target, tab }, async ({ target, tab }) => {
  await (await page(tab)).locator(target).first().click(); return text('clicked');
});
tool('type', 'Fill text into an input; submit=true presses Enter', { target, value: z.string(), submit: z.boolean().optional(), tab },
  async ({ target, value, submit, tab }) => {
    const l = (await page(tab)).locator(target).first();
    await l.fill(value); if (submit) await l.press('Enter'); return text('typed');
  });
tool('press_key', 'Press a key, e.g. Enter, Control+A', { key: z.string(), tab }, async ({ key, tab }) => {
  await (await page(tab)).keyboard.press(key); return text('pressed');
});
tool('scroll', 'Scroll by pixels', { dy: z.number(), tab }, async ({ dy, tab }) => {
  await (await page(tab)).mouse.wheel(0, dy); return text('scrolled');
});
tool('evaluate', 'Run a JavaScript expression in the page and return the JSON result', { expression: z.string(), tab },
  async ({ expression, tab }) => text(JSON.stringify(await (await page(tab)).evaluate(expression), null, 2)));
tool('screenshot', 'Screenshot of the viewport (or full page)', { fullPage: z.boolean().optional(), tab }, async ({ fullPage, tab }) => {
  const buf = await (await page(tab)).screenshot({ fullPage });
  return { content: [{ type: 'image', data: buf.toString('base64'), mimeType: 'image/png' }] };
});
tool('resize', 'Resize the viewport', { width: z.number(), height: z.number(), tab }, async ({ width, height, tab }) => {
  await (await page(tab)).setViewportSize({ width, height }); return text(`${width}x${height}`);
});
tool('wait_for', 'Wait for text to appear or a number of ms', { text: z.string().optional(), ms: z.number().optional(), tab },
  async ({ text: t, ms, tab }) => {
    const p = await page(tab);
    if (t) await p.getByText(t).first().waitFor(); else await p.waitForTimeout(ms ?? 1000);
    return text('done');
  });

await server.connect(new StdioServerTransport());
