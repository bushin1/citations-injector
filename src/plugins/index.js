const log = require('../log');

// Registered plugins — add new ones here
const PLUGIN_MODULES = [
  require('./citations-panel'),
];

function loadAll(config) {
  const plugins = [];

  for (const mod of PLUGIN_MODULES) {
    if (!mod.name || !mod.build) {
      log.warn(`Plugin ignoré (interface invalide)`);
      continue;
    }

    const compiled = mod.build(config);
    plugins.push({
      name: compiled.name || mod.name,
      match: compiled.match || (() => true),
      compiledScript: compiled.script,
    });

    log.ok(`Plugin chargé: ${mod.name}`);
  }

  return plugins;
}

module.exports = { loadAll };
