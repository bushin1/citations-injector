#!/usr/bin/env node

const { load, validate } = require('./config');
const { scan } = require('./discovery');
const { connectAndInject } = require('./injector');
const { loadAll } = require('./plugins');
const { start } = require('./server');
const { state, setPlugins } = require('./state');
const { checkForUpdate } = require('./updater');
const log = require('./log');

const VERSION = require('../package.json').version;

async function run() {
  console.log(`\n  ╔══════════════════════════════════╗`);
  console.log(`  ║     Allo Chantiers  v${VERSION}       ║`);
  console.log(`  ╚══════════════════════════════════╝\n`);

  const config = validate(load());
  state.startedAt = Date.now();

  const plugins = loadAll(config);
  if (plugins.length === 0) {
    log.warn('Aucun plugin chargé.');
    process.exit(1);
  }
  setPlugins(plugins);

  start();

  checkForUpdate();

  log.info(`Dashboard: ${config.dashboardBase}`);
  log.info(`Token:     ${config.extToken.slice(0, 8)}…`);
  log.info(`${plugins.length} plugin(s) actif(s)`);
  log.info('En attente de navigateurs GoLogin…');

  while (true) {
    try {
      const ports = await scan(config);
      for (const port of ports) {
        await connectAndInject(port, plugins);
      }
    } catch (err) {
      log.warn(`Erreur scan: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, config.pollInterval));
  }
}

run().catch((err) => {
  log.warn(`Fatal: ${err.message}`);
  process.exit(1);
});
