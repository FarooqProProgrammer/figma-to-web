// MCP Chrome Bridge: connects to every local mcp-chrome ext-server (ports 8765-8768)
// and runs the commands it sends. Only ever talks to 127.0.0.1.
const PORTS = Array.from({ length: 4 }, (_, i) => 8765 + i);
const socks = new Map();
const logs = { console: new Map(), net: new Map() };
const attached = new Set();
const push = (store, tabId, item) => {
  const a = store.get(tabId) ?? store.set(tabId, []).get(tabId);
  a.push(item);
  if (a.length > 500) a.shift();
};

// ---------- connection ----------
function connect(port) {
  if (socks.has(port)) return;
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  socks.set(port, ws);
  ws.onopen = () => chrome.action.setBadgeText({ text: 'ON' });
  ws.onmessage = async (e) => {
    const { id, method, params } = JSON.parse(e.data);
    try {
      if (!/^tabs_|resize_window/.test(method)) fx(await tabOf(params?.tabId), 'active');
      ws.send(JSON.stringify({ id, result: await handlers[method](params ?? {}) }));
    } catch (err) {
      ws.send(JSON.stringify({ id, error: String(err?.message ?? err) }));
    }
  };
  ws.onclose = () => {
    if (socks.get(port) === ws) socks.delete(port);
    if (![...socks.values()].some((s) => s.readyState === 1)) chrome.action.setBadgeText({ text: '' });
  };
}
// chrome.storage.local "ports" overrides the default range (used by the e2e test to stay isolated).
const scan = async () => ((await chrome.storage.local.get('ports')).ports ?? PORTS).forEach(connect);
chrome.storage.onChanged.addListener(scan);
scan();
setInterval(scan, 15000); // each failed probe is logged by Chrome, so keep this slow and the range small
// Pings keep the MV3 worker alive while connected.
setInterval(() => socks.forEach((s) => s.readyState === 1 && s.send('{"ping":1}')), 20000);
chrome.alarms.create('scan', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(scan);

// ---------- debugger (input, screenshots, console, network) ----------
chrome.debugger.onDetach.addListener(({ tabId }) => attached.delete(tabId));
chrome.debugger.onEvent.addListener(({ tabId }, method, p) => {
  if (method === 'Runtime.consoleAPICalled')
    push(logs.console, tabId, { type: p.type, text: p.args.map((a) => a.value ?? a.description ?? '').join(' ') });
  else if (method === 'Runtime.exceptionThrown')
    push(logs.console, tabId, { type: 'error', text: p.exceptionDetails.exception?.description ?? p.exceptionDetails.text });
  else if (method === 'Network.requestWillBeSent')
    push(logs.net, tabId, { id: p.requestId, method: p.request.method, url: p.request.url });
  else if (method === 'Network.responseReceived') {
    const r = logs.net.get(tabId)?.find((x) => x.id === p.requestId);
    if (r) r.status = p.response.status;
  }
});
async function dbg(tabId, method, params) {
  if (!attached.has(tabId)) {
    await chrome.debugger.attach({ tabId }, '1.3');
    attached.add(tabId);
    await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable');
    await chrome.debugger.sendCommand({ tabId }, 'Network.enable');
  }
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

// ---------- helpers ----------
// Default tab = the one the agent last opened/used, so it never hijacks the tab you are reading.
// Falls back to the active tab if the agent has not touched any tab yet (or it was closed).
let agentTab;
const tabOf = async (id) => {
  if (id != null) return (agentTab = id);
  if (agentTab != null && (await chrome.tabs.get(agentTab).catch(() => null))) return agentTab;
  return (agentTab = (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0].id);
};
async function loaded(tabId) {
  for (let i = 0; i < 60; i++) {
    if ((await chrome.tabs.get(tabId)).status === 'complete') return;
    await new Promise((r) => setTimeout(r, 250));
  }
}

// Runs in the page (isolated world; refs persist between calls). Must be self-contained.
function pageOp(op, a) {
  const S = (window.__mcp ??= { map: new Map(), ids: new WeakMap(), n: 0 });
  const ref = (el) => {
    let k = S.ids.get(el);
    if (!k) {
      k = 'ref_' + ++S.n;
      S.ids.set(el, k);
      S.map.set(k, new WeakRef(el));
    }
    return k;
  };
  const get = (k) => {
    const el = S.map.get(k)?.deref();
    if (!el?.isConnected) throw new Error(`${k} not found; call read_page or find again`);
    return el;
  };
  const TAG = { a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', img: 'img', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', nav: 'navigation', main: 'main', header: 'banner', footer: 'contentinfo' };
  const role = (el) =>
    el.getAttribute('role') ||
    (el.tagName === 'INPUT' ? { checkbox: 'checkbox', radio: 'radio', button: 'button', submit: 'button' }[el.type] ?? 'textbox' : TAG[el.tagName.toLowerCase()]) ||
    '';
  const name = (el) =>
    (el.getAttribute('aria-label') || el.labels?.[0]?.innerText || el.alt || el.placeholder || el.title || el.innerText || el.value || '')
      .trim().replace(/\s+/g, ' ').slice(0, 80);
  const interactive = (el) =>
    /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName) || el.isContentEditable || el.hasAttribute('onclick') ||
    /button|link|checkbox|tab|menuitem|switch|textbox|combobox/.test(el.getAttribute('role') || '');
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  if (op === 'text') return document.body.innerText;
  if (op === 'tree') {
    const out = [];
    let size = 0;
    const walk = (el, d) => {
      if (size > 30000 || !visible(el)) return;
      const r = role(el);
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (interactive(el) || (a.filter !== 'interactive' && (r || hasText))) {
        const line = `${' '.repeat(d)}${r || el.tagName.toLowerCase()} "${name(el)}" [${ref(el)}]${el.href ? ' href=' + el.href : ''}${el.type ? ' type=' + el.type : ''}${el.value && el.tagName !== 'BUTTON' ? ' value=' + String(el.value).slice(0, 40) : ''}`;
        out.push(line);
        size += line.length;
      }
      for (const c of el.children) walk(c, d + 1);
    };
    walk(document.body, 0);
    return out.join('\n') || '(empty)';
  }
  if (op === 'find') {
    const q = a.query.toLowerCase();
    return (
      [...document.querySelectorAll('*')]
        .filter((el) => visible(el) && (interactive(el) || role(el) || el.children.length === 0) &&
          `${name(el)} ${role(el)} ${el.tagName} ${el.id} ${el.className?.baseVal ?? el.className}`.toLowerCase().includes(q))
        .slice(0, 20)
        .map((el) => `[${ref(el)}] ${role(el) || el.tagName.toLowerCase()} "${name(el)}"`)
        .join('\n') || 'no matches'
    );
  }
  if (op === 'center') {
    const el = get(a.ref);
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }
  if (op === 'input') {
    const el = get(a.ref);
    if (el.tagName === 'SELECT') {
      const o = [...el.options].find((o) => o.value === a.value || o.text === a.value);
      if (!o) throw new Error('option not found');
      el.value = o.value;
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = a.value === true || a.value === 'true';
    } else {
      const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
      el.focus();
      set ? set.call(el, a.value) : (el.textContent = a.value);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return 'set';
  }
  if (op === 'scrollTo') {
    get(a.ref).scrollIntoView({ block: 'center' });
    return 'scrolled';
  }
}
const page = async (tabId, op, a = {}) =>
  (await chrome.scripting.executeScript({ target: { tabId: await tabOf(tabId) }, func: pageOp, args: [op, a] }))[0].result;

const KEYS = { Enter: 13, Tab: 9, Escape: 27, Backspace: 8, Delete: 46, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Home: 36, End: 35, PageUp: 33, PageDown: 34, Space: 32 };
const CMD = { a: 'selectAll', c: 'copy', v: 'paste', x: 'cut', z: 'undo' };
async function key(tabId, combo) {
  const mods = { alt: 1, ctrl: 2, control: 2, meta: 4, cmd: 4, shift: 8 };
  for (const k of combo.split(/\s+/)) {
    const parts = k.split('+');
    let main = parts.pop();
    const m = parts.reduce((s, p) => s | (mods[p.toLowerCase()] ?? 0), 0);
    main = main.toLowerCase() === 'space' ? 'Space' : main.length === 1 ? (m & 8 ? main.toUpperCase() : main.toLowerCase()) : main[0].toUpperCase() + main.slice(1);
    const vk = KEYS[main] ?? main.toUpperCase().charCodeAt(0);
    const ch = main.length === 1 && !(m & 7) ? main : main === 'Enter' ? '\r' : main === 'Space' ? ' ' : undefined;
    const base = { modifiers: m, key: main === 'Space' ? ' ' : main, windowsVirtualKeyCode: vk };
    await dbg(tabId, 'Input.dispatchKeyEvent', { type: ch ? 'keyDown' : 'rawKeyDown', ...base, text: ch, commands: m & 6 && CMD[main] ? [CMD[main]] : undefined });
    await dbg(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }
}
// Visual feedback drawn in the page (shadow DOM, click-through): glowing border while the
// agent is active, an animated cursor that glides to each target, and a click ripple.
function fxOp(kind, x, y) {
  let host = document.getElementById('__mcp_fx');
  if (!host) {
    host = document.createElement('div');
    host.id = '__mcp_fx';
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
    const r = host.attachShadow({ mode: 'closed' });
    r.innerHTML = `<style>
      @keyframes hue{to{filter:hue-rotate(360deg)}}
      @keyframes ring{from{transform:translate(-50%,-50%) scale(.2);opacity:.9}to{transform:translate(-50%,-50%) scale(2.2);opacity:0}}
      .glow{position:fixed;inset:0;opacity:0;transition:opacity .4s;box-shadow:inset 0 0 0 3px #7c5cff,inset 0 0 38px 6px rgba(124,92,255,.55),inset 0 0 90px 10px rgba(0,200,255,.25);animation:hue 4s linear infinite}
      .cur{position:fixed;left:0;top:0;width:26px;height:26px;opacity:0;transition:left .35s cubic-bezier(.22,1,.36,1),top .35s cubic-bezier(.22,1,.36,1),opacity .3s;filter:drop-shadow(0 2px 6px rgba(124,92,255,.8));animation:hue 4s linear infinite}
      .rip{position:fixed;width:46px;height:46px;border-radius:50%;border:3px solid #00c8ff;background:rgba(124,92,255,.25);animation:ring .6s ease-out forwards}
    </style><div class="glow"></div>
    <svg class="cur" viewBox="0 0 24 24"><path d="M3 2l7 19 3-8 8-3z" fill="#7c5cff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    document.documentElement.append(host);
    host.__r = r;
  }
  const r = host.__r, glow = r.querySelector('.glow'), cur = r.querySelector('.cur');
  if (kind === 'hide') { clearTimeout(host.__t); glow.style.opacity = cur.style.opacity = 0; return; }
  glow.style.opacity = 1;
  clearTimeout(host.__t);
  host.__t = setTimeout(() => { glow.style.opacity = 0; cur.style.opacity = 0; }, 4000);
  if (x != null) { cur.style.left = x + 'px'; cur.style.top = y + 'px'; cur.style.opacity = 1; }
  if (kind === 'click') {
    const d = document.createElement('div');
    d.className = 'rip'; d.style.left = x + 'px'; d.style.top = y + 'px';
    r.append(d); setTimeout(() => d.remove(), 700);
  }
}
const fx = (tabId, kind, x, y) =>
  chrome.scripting.executeScript({ target: { tabId }, func: fxOp, args: [kind, x ?? null, y ?? null] }).catch(() => {});
const mouse = async (tabId, type, x, y, extra = {}) => {
  if (type === 'mouseMoved' && extra.button == null) { await fx(tabId, 'move', x, y); await new Promise((r) => setTimeout(r, 380)); }
  if (type === 'mousePressed') fx(tabId, 'click', x, y);
  return dbg(tabId, 'Input.dispatchMouseEvent', { type, x, y, button: 'none', ...extra });
};
async function click(tabId, x, y, button, count) {
  await mouse(tabId, 'mouseMoved', x, y);
  for (let i = 1; i <= count; i++) {
    await mouse(tabId, 'mousePressed', x, y, { button, clickCount: i });
    await mouse(tabId, 'mouseReleased', x, y, { button, clickCount: i });
  }
}

// ---------- commands (names match the server's tools) ----------
const handlers = {
  async tabs_context() {
    return (await chrome.tabs.query({})).map((t) => `${t.id}${t.active ? '*' : ''}: ${t.title} — ${t.url}`).join('\n');
  },
  async tabs_create({ url }) {
    const t = await chrome.tabs.create({ url: url ?? 'about:blank' });
    agentTab = t.id;
    await loaded(t.id);
    return `tab ${t.id}`;
  },
  async tabs_close({ tabId }) {
    const id = await tabOf(tabId);
    await chrome.tabs.remove(id);
    attached.delete(id);
    return 'closed';
  },
  async navigate({ url, tabId }) {
    const id = await tabOf(tabId);
    if (url === 'back') await chrome.tabs.goBack(id);
    else if (url === 'forward') await chrome.tabs.goForward(id);
    else await chrome.tabs.update(id, { url: /^[a-z]+:/i.test(url) ? url : 'https://' + url });
    await loaded(id);
    const t = await chrome.tabs.get(id);
    return `${t.url} — ${t.title}`;
  },
  read_page: ({ tabId, filter }) => page(tabId, 'tree', { filter }),
  get_page_text: ({ tabId }) => page(tabId, 'text'),
  find: ({ query, tabId }) => page(tabId, 'find', { query }),
  form_input: ({ ref, value, tabId }) => page(tabId, 'input', { ref, value }),
  async computer({ action, tabId, coordinate, start_coordinate, ref, text, scroll_direction, scroll_amount, duration }) {
    const id = await tabOf(tabId);
    let [x, y] = coordinate ?? [];
    if (ref && action !== 'scroll_to') ({ x, y } = await page(id, 'center', { ref }));
    switch (action) {
      case 'screenshot': {
        const v = (await dbg(id, 'Page.getLayoutMetrics')).cssVisualViewport;
        await fx(id, 'hide'); // keep the glow/cursor out of the picture
        const s = await dbg(id, 'Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: v.clientWidth, height: v.clientHeight, scale: 1 } });
        return { image: s.data };
      }
      case 'left_click': await click(id, x, y, 'left', 1); break;
      case 'right_click': await click(id, x, y, 'right', 1); break;
      case 'double_click': await click(id, x, y, 'left', 2); break;
      case 'triple_click': await click(id, x, y, 'left', 3); break;
      case 'hover': await mouse(id, 'mouseMoved', x, y); break;
      case 'type': await dbg(id, 'Input.insertText', { text }); break;
      case 'key': await key(id, text); break;
      case 'scroll': {
        const n = (scroll_amount ?? 3) * 100;
        const d = scroll_direction ?? 'down';
        await mouse(id, 'mouseWheel', x ?? 200, y ?? 200, { deltaX: d === 'left' ? -n : d === 'right' ? n : 0, deltaY: d === 'up' ? -n : d === 'down' ? n : 0 });
        break;
      }
      case 'scroll_to': await page(id, 'scrollTo', { ref }); break;
      case 'left_click_drag': {
        const [sx, sy] = start_coordinate;
        await mouse(id, 'mouseMoved', sx, sy);
        await mouse(id, 'mousePressed', sx, sy, { button: 'left', clickCount: 1 });
        await mouse(id, 'mouseMoved', x, y, { button: 'left' });
        await mouse(id, 'mouseReleased', x, y, { button: 'left', clickCount: 1 });
        break;
      }
      case 'wait': await new Promise((r) => setTimeout(r, Math.min(duration ?? 1, 30) * 1000)); break;
      default: throw new Error('unknown action ' + action);
    }
    return `${action} done`;
  },
  async javascript_tool({ text, tabId }) {
    const r = await dbg(await tabOf(tabId), 'Runtime.evaluate', { expression: text, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return JSON.stringify(r.result.value ?? r.result.description ?? null);
  },
  async read_console_messages({ tabId, pattern, onlyErrors, clear, limit }) {
    const id = await tabOf(tabId);
    await dbg(id, 'Runtime.enable');
    let a = logs.console.get(id) ?? [];
    if (onlyErrors) a = a.filter((m) => m.type === 'error');
    if (pattern) a = a.filter((m) => new RegExp(pattern).test(m.text));
    if (clear) logs.console.set(id, []);
    return a.slice(-(limit ?? 100)).map((m) => `[${m.type}] ${m.text}`).join('\n') || '(none; capture starts when first used on a tab)';
  },
  async read_network_requests({ tabId, urlPattern, clear, limit }) {
    const id = await tabOf(tabId);
    await dbg(id, 'Runtime.enable');
    let a = logs.net.get(id) ?? [];
    if (urlPattern) a = a.filter((r) => r.url.includes(urlPattern));
    if (clear) logs.net.set(id, []);
    return a.slice(-(limit ?? 100)).map((r) => `${r.status ?? '...'} ${r.method} ${r.url}`).join('\n') || '(none; capture starts when first used on a tab)';
  },
  async resize_window({ width, height, tabId }) {
    const t = await chrome.tabs.get(await tabOf(tabId));
    await chrome.windows.update(t.windowId, { width, height, state: 'normal' });
    return `${width}x${height}`;
  },
};
