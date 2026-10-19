const puppeteer = require('puppeteer-core');
const log = require('./log');

const connectedBrowsers = new Map();
const injectedPages = new Set();

function isSkippable(url) {
  return !url || url === 'about:blank' ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('devtools://');
}

async function injectPluginsIntoPage(page, plugins, port) {
  const url = page.url();
  if (isSkippable(url)) return;

  for (const plugin of plugins) {
    const pageKey = `${port}:${plugin.name}:${url}`;
    if (injectedPages.has(pageKey)) continue;
    if (plugin.match && !plugin.match(url)) continue;

    try {
      await page.evaluate(plugin.compiledScript);
      injectedPages.add(pageKey);
      log.arrow(`${plugin.name} → ${url.slice(0, 70)}`);
    } catch {}
  }
}

async function connectAndInject(port, plugins) {
  if (connectedBrowsers.has(port)) return;

  try {
    const browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${port}`,
      defaultViewport: null,
    });

    connectedBrowsers.set(port, browser);
    log.ok(`Connecté au navigateur sur le port ${port}`);

    const pages = await browser.pages();
    for (const page of pages) {
      await injectPluginsIntoPage(page, plugins, port);
      watchNavigation(page, plugins, port);
    }

    browser.on('targetcreated', async (target) => {
      if (target.type() !== 'page') return;
      try {
        const page = await target.page();
        if (!page) return;
        page.on('domcontentloaded', () => injectPluginsIntoPage(page, plugins, port));
        watchNavigation(page, plugins, port);
      } catch {}
    });

    browser.on('disconnected', () => {
      log.gone(`Navigateur déconnecté (port ${port})`);
      connectedBrowsers.delete(port);
      for (const key of injectedPages) {
        if (key.startsWith(port + ':')) injectedPages.delete(key);
      }
    });
  } catch (err) {
    log.warn(`Connexion échouée port ${port}: ${err.message}`);
  }
}

function watchNavigation(page, plugins, port) {
  page.on('domcontentloaded', () => injectPluginsIntoPage(page, plugins, port));
}

module.exports = { connectAndInject };
