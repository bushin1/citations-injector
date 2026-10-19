#!/usr/bin/env node

const { load, validate } = require('./config');
const { scan } = require('./discovery');
const { connectAndInject } = require('./injector');
const { loadAll } = require('./plugins');
const log = require('./log');

const VERSION = require('../package.json').version;

async function run() {
  console.log(`\n  ╔══════════════════════════════════╗`);
  console.log(`  ║   Citations Injector  v${VERSION}     ║`);
  console.log(`  ╚══════════════════════════════════╝\n`);

  const config = validate(load());

  log.info(`Dashboard: ${config.dashboardBase}`);
  log.info(`Token:     ${config.extToken.slice(0, 8)}…`);
  log.info(`Poll:      ${config.pollInterval}ms`);

  const plugins = loadAll(config);
  if (plugins.length === 0) {
    log.warn('Aucun plugin chargé. Vérifie src/plugins/');
    process.exit(1);
  }

  log.info(`${plugins.length} plugin(s) actif(s)\n`);
  log.info('En attente de navigateurs GoLogin…\n');

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
