const path = require('path');

function load() {
  // .env alongside the binary (or cwd)
  try {
    const dotenv = require('dotenv');
    const envPath = path.join(process.pkg ? path.dirname(process.execPath) : __dirname, '..', '.env');
    dotenv.config({ path: envPath });
  } catch {}

  return {
    dashboardBase: process.env.DASHBOARD_BASE || 'https://dashboard.allo-chantiers.com',
    extToken:      process.env.EXT_TOKEN || '1a1d267d9077770b4e04a6651cf970c3154fb4ad69460b1d',
    pollInterval:  parseInt(process.env.POLL_INTERVAL || '3000', 10),
    goLoginApiPort: parseInt(process.env.GOLOGIN_API_PORT || '36912', 10),
    debugPorts:    process.env.DEBUG_PORTS
      ? process.env.DEBUG_PORTS.split(',').map(Number).filter(Boolean)
      : [],
  };
}

function validate(config) {
  if (!config.extToken) {
    console.error('[!] EXT_TOKEN requis. Crée un fichier .env à côté de l\'exécutable.');
    process.exit(1);
  }
  return config;
}

module.exports = { load, validate };
