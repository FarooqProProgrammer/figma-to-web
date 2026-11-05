# MCP Chrome: agent guide

Controls the user's real Chrome (logged-in sessions, real tabs) from any MCP client. No sign-in. Server: `ext-server.mjs`, browser side: `extension/`.

## 1. Setup (once)

1. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → `mcp-chrome/extension`.
2. Register the server in your MCP client (stdio):

```json
{ "mcpServers": { "chrome-ext": { "command": "node", "args": ["D:\\ai agent\\figma-to-web\\mcp-chrome\\ext-server.mjs"] } } }
```

3. First run: `cd mcp-chrome && npm install`.

Check: extension badge shows green **ON**. Red **OFF** / "Not connected" = no server is running; click the extension icon → **Reconnect**. If a tool returns *"Chrome extension not connected"*, Chrome is closed, the extension isn't loaded, or the server isn't running. Tell the user; don't retry in a loop.

Reload the extension (chrome://extensions → reload icon) after any change to `extension/`. A tool error like `handlers[method] is not a function` means the extension is older than the server.

## 2. Tools

All tools take an optional `tabId`. Default tab = the tab **you** last opened or used, so you never hijack the tab the user is reading. Open your own tab first.

| Tool | Use |
|---|---|
| `tabs_context` | List tabs: `id[*]: title — url` (`*` = active). |
| `tabs_create {url}` | Open a tab; it becomes your default. |
| `tabs_close` | Close a tab. |
| `navigate {url}` | URL, or `back` / `forward`. Waits for load. |
| `read_page {filter}` | Element tree with `[ref_N]` ids. `filter: "interactive"` = only clickable/typeable. |
| `get_page_text` | Visible text. Cheapest way to read content. |
| `find {query}` | Elements matching text, role, label or id → refs. Plain substring, not AI. |
| `form_input {ref, value}` | Set input / select (by value or label) / checkbox (`true`/`false`). Fires input+change events. |
| `computer {action, ...}` | Real mouse/keyboard via CDP (below). |
| `javascript_tool {text}` | Run JS in the page (awaited); result returned as JSON. |
| `read_console_messages` | `{pattern, onlyErrors, clear, limit}` |
| `read_network_requests` | `{urlPattern, clear, limit}` → `status METHOD url` |
| `emulate {width, height}` | Phone/tablet viewport on one tab, window untouched. `width: 0` resets. |
| `resize_window {width, height}` | Resizes the user's real window. Avoid; prefer `emulate`. |

`computer` actions: `screenshot`, `left_click`, `right_click`, `double_click`, `triple_click`, `hover`, `type` (`text`), `key` (`text`: `Enter`, `ctrl+a`, `Tab Tab`), `scroll` (`scroll_direction`, `scroll_amount` in notches, optional `coordinate`), `scroll_to` (`ref`), `left_click_drag` (`start_coordinate` → `coordinate`), `wait` (`duration` seconds, max 30).
Target with `ref` (preferred; auto-scrolls into view) or `coordinate: [x, y]` in CSS px from the latest screenshot.

## 3. How to work

1. `tabs_create {url}` (own tab).
2. Read: `get_page_text` for content, `read_page {filter:"interactive"}` for things to act on. Refs persist until the page re-renders; if you get *"ref_N not found"*, call `read_page`/`find` again.
3. Act: `form_input` for fields, `computer left_click {ref}` for buttons/links, `key Enter` to submit.
4. Verify with a `screenshot` or `get_page_text` after each meaningful step. Don't assume a click worked.
5. Debug: `read_console_messages {onlyErrors:true}` and `read_network_requests {urlPattern:"/api"}`. Capture starts the **first time** you call them on a tab, so call once early (before the action) if you need history.

Responsive check recipe:

```
emulate {width:375,height:812} → javascript_tool "document.documentElement.scrollWidth - innerWidth" (>0 = horizontal overflow)
→ screenshot → repeat for 320, 768, 1440 → emulate {width:0}
```

The user sees a glowing border and an animated cursor while you work; both fade ~4 s after your last action and are hidden during screenshots.

## 4. Limits and etiquette

- You act in the user's real, logged-in browser. Don't click Buy / Delete / Send / Sign Out or submit forms with real data unless asked. Prefer reading over acting.
- Chrome shows a "debugging this browser" banner on tabs you drive. That is expected.
- Not available: `chrome://` pages, `about:blank`, `data:` URLs (script injection is blocked; use a real http(s) page or `localhost`), content inside iframes (refs are top-frame only).
- No file upload, GIF recording, or tab groups.
- `type` inserts text into the focused element; click the field first. For React/Vue inputs prefer `form_input`.
- If two browsers have the extension, commands go to whichever connected last.
- Several agents can run at once (servers use ports 8765–8768); they share the same Chrome and each keeps its own default tab.

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| "Chrome extension not connected" | Load/reload extension, keep Chrome open, make sure the server is running; click **Reconnect** in the popup. |
| "Cannot access contents of url …" | Page type blocked (see limits). Navigate to an http(s) page. |
| "ref_N not found" | Page changed; `read_page` / `find` again. |
| Click lands on the wrong thing | `screenshot` first; use `ref` instead of coordinates. |
| Timeout (45 s) | Page is busy or a dialog is open; take a screenshot, then retry once. |

Tests: `node e2e.mjs` (isolated browser), `node popup-test.mjs`, `node live.mjs <url>` (runs in the user's real Chrome).
