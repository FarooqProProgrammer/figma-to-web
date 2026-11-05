const msg = document.getElementById('msg');
const show = ({ connected }) => {
  document.body.className = connected ? 'ok' : 'bad';
  msg.textContent = connected ? `Connected to ${connected} MCP server${connected > 1 ? 's' : ''}` : 'Not connected';
};
const ask = (type) => chrome.runtime.sendMessage({ type }).then(show);
document.getElementById('retry').onclick = () => { msg.textContent = 'Connecting…'; ask('reconnect'); };
document.getElementById('copy').onclick = (e) => {
  navigator.clipboard.writeText('node mcp-chrome/ext-server.mjs');
  e.target.textContent = 'Copied';
};
ask('status');
