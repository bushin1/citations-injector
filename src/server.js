const http = require('http');
const fs = require('fs');
const path = require('path');
const { bus, snapshot } = require('./state');

const VERSION = require('../package.json').version;
const DASHBOARD_HTML = fs.readFileSync(path.join(__dirname, 'ui', 'dashboard.html'), 'utf-8');
const PORT = parseInt(process.env.UI_PORT || '3847', 10);

const sseClients = new Set();

function broadcastState() {
  const data = { ...snapshot(), version: VERSION };
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

function start() {
  bus.on('update', broadcastState);
  bus.on('log', broadcastLog);

  const server = http.createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));

      const data = { ...snapshot(), version: VERSION };
      res.write(`event: state\ndata: ${JSON.stringify(data)}\n\n`);
      return;
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
