const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { bus, snapshot } = require('./state');
const { getUpdateInfo, applyUpdate } = require('./updater');
const { load } = require('./config');

const { runAutopilot, stopAutopilot, getState: getAutopilotState, setSmsCode } = require('./autopilot');
const VERSION = require('../package.json').version;
const DASHBOARD_HTML = fs.readFileSync(path.join(__dirname, 'ui', 'dashboard.html'), 'utf-8');
const PORT = parseInt(process.env.UI_PORT || '3847', 10);

const cfg = load();

// ── Jeton d'accès ─────────────────────────────────────────────────────────────
// Le vrai jeton n'est PAS dans le code (repo public). La VA le colle une fois dans
// l'écran de réglage ; on le stocke en local (dossier userData de l'app).
const TOKEN_FILE = path.join(
  process.env.AC_USERDATA || path.dirname(process.execPath || __dirname),
  'ac-token.txt',
);
// token.local intégré au build (jamais commité) : le jeton par défaut livré avec l'app.
function bundledToken() {
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'token.local') : null,
    path.join(__dirname, '..', 'token.local'),
  ].filter(Boolean);
  for (const p of candidates) {
    try { const t = fs.readFileSync(p, 'utf-8').trim(); if (t) return t; } catch {}
  }
  return '';
}
function loadToken() {
  // 1. jeton saisi en local par la VA (priorité) ; 2. env ; 3. token.local du build ; 4. config
  try {
    const t = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
    if (t) return t;
  } catch {}
  return process.env.EXT_TOKEN || bundledToken() || cfg.extToken || '';
}
function saveToken(t) {
  try { fs.writeFileSync(TOKEN_FILE, String(t).trim(), 'utf-8'); return true; } catch { return false; }
}
let currentToken = loadToken();

let selectedBusiness = null;

const sseClients = new Set();

function broadcastState() {
  const data = { ...snapshot(), version: VERSION, update: getUpdateInfo(), autopilot: getAutopilotState() };
  const msg = `event: state\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

function broadcastLog(entry) {
  const msg = `event: log\ndata: ${JSON.stringify(entry)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

function proxyDashboard(req, res) {
  const target = new URL(cfg.dashboardBase + req.url);
  const mod = target.protocol === 'https:' ? https : http;

  // Lit le corps éventuel (PUT/POST) pour le retransmettre
  let reqBody = '';
  req.on('data', c => reqBody += c);
  req.on('end', () => {
    const options = {
      method: req.method,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      headers: {
        'x-ext-token': currentToken,
        'Content-Type': 'application/json',
      },
    };
    if (reqBody) options.headers['Content-Length'] = Buffer.byteLength(reqBody);

    const proxyReq = mod.request(options, (proxyRes) => {
      let body = '';
      proxyRes.on('data', c => body += c);
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(body);
      });
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    if (reqBody) proxyReq.write(reqBody);
    proxyReq.end();
  });
}

function start() {
  bus.on('update', broadcastState);
  bus.on('log', broadcastLog);

  const server = http.createServer(async (req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));

      const data = { ...snapshot(), version: VERSION, update: getUpdateInfo(), autopilot: getAutopilotState() };
      res.write(`event: state\ndata: ${JSON.stringify(data)}\n\n`);
      return;
    }

    if (req.url === '/api/config' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ hasToken: !!currentToken, dashboardBase: cfg.dashboardBase }));
      return;
    }

    if (req.url === '/api/token' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const { token } = JSON.parse(body);
          const t = String(token || '').trim();
          if (!t || t.length < 8) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'token trop court' }));
            return;
          }
          currentToken = t;
          saveToken(t);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid json' }));
        }
      });
      return;
    }

    if (req.url === '/api/update' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const ok = await applyUpdate();
      res.end(JSON.stringify({ ok }));
      return;
    }

    if (req.url === '/api/selection' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(selectedBusiness));
      return;
    }

    if (req.url === '/api/selection' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          selectedBusiness = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ ok: true }));
          bus.emit('update');
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'invalid json' }));
        }
      });
      return;
    }

    if (req.url === '/api/selection' && req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // ── Autopilot API ──
    if (req.url === '/api/autopilot/start' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const opts = body ? JSON.parse(body) : {};
          // Start autopilot in background
          runAutopilot({
            dashboardBase: cfg.dashboardBase,
            token: currentToken,
            goLoginApiPort: cfg.goLoginApiPort,
            ...opts,
          });
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ ok: true, message: 'Autopilot demarre' }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (req.url === '/api/autopilot/stop' && req.method === 'POST') {
      stopAutopilot();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.url === '/api/autopilot/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(getAutopilotState()));
      return;
    }

    if (req.url === '/api/autopilot/sms' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const { code } = JSON.parse(body);
          if (!code) throw new Error('code requis');
          setSmsCode(String(code).trim());
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (req.url.startsWith('/api/autopilot') && req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // Proxy dashboard API calls (GET + PUT/POST avec corps)
    if (req.url.startsWith('/api/ext/')) {
      return proxyDashboard(req, res);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(DASHBOARD_HTML);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  Dashboard local : http://localhost:${PORT}\n`);
  });

  return PORT;
}

function openBrowser(port) {
  const url = `http://localhost:${port}`;
  const { exec } = require('child_process');
  if (process.platform === 'darwin') exec(`open "${url}"`);
  else if (process.platform === 'win32') exec(`start "" "${url}"`);
  else exec(`xdg-open "${url}"`);
}

module.exports = { start, openBrowser };
