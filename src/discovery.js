const http = require('http');

function httpGetJson(url, timeout = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function fromGoLogin(apiPort) {
  const profiles = await httpGetJson(`http://localhost:${apiPort}/browser/v1/profiles`);
  if (!Array.isArray(profiles)) return [];
  return profiles.filter(p => p.debugPort).map(p => p.debugPort);
}

async function probePort(port) {
  const info = await httpGetJson(`http://127.0.0.1:${port}/json/version`, 500);
  return info && info.webSocketDebuggerUrl ? port : null;
}

async function scan(config) {
  const ports = await fromGoLogin(config.goLoginApiPort);
  if (ports.length > 0) return ports;

  if (config.debugPorts.length > 0) {
    const results = await Promise.all(config.debugPorts.map(probePort));
    return results.filter(Boolean);
  }

  return [];
}

module.exports = { scan };
