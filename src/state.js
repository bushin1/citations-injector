const EventEmitter = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(20);

const state = {
  browsers: new Map(),
  pages: new Map(),
  logs: [],
  plugins: [],
  startedAt: null,
};

function addLog(level, msg) {
  const entry = { ts: Date.now(), level, msg };
  state.logs.push(entry);
  if (state.logs.length > 200) state.logs.shift();
  bus.emit('log', entry);
  bus.emit('update');
}

function setBrowser(port, info) {
  state.browsers.set(port, { port, ...info, connectedAt: Date.now() });
  bus.emit('update');
}

function removeBrowser(port) {
  state.browsers.delete(port);
  for (const [key] of state.pages) {
    if (key.startsWith(port + ':')) state.pages.delete(key);
  }
  bus.emit('update');
}

function addPage(port, plugin, url) {
  const key = `${port}:${plugin}:${url}`;
  state.pages.set(key, { port, plugin, url, injectedAt: Date.now() });
  bus.emit('update');
}

function setPlugins(list) {
  state.plugins = list.map(p => p.name);
}

function snapshot() {
  return {
    uptime: state.startedAt ? Date.now() - state.startedAt : 0,
    browsers: Array.from(state.browsers.values()),
    pages: Array.from(state.pages.values()),
    plugins: state.plugins,
    logs: state.logs.slice(-50),
  };
}

module.exports = { bus, state, addLog, setBrowser, removeBrowser, addPage, setPlugins, snapshot };
