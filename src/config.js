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
    // Jamais de vrai jeton dans le code (repo). Il vient de l'env, d'un fichier local
    // (token.local intégré au build), ou de l'écran de connexion. Voir server.js loadToken().
    extToken:      process.env.EXT_TOKEN || '',
    pollInterval:  parseInt(process.env.POLL_INTERVAL || '3000', 10),
    goLoginApiPort: parseInt(process.env.GOLOGIN_API_PORT || '36912', 10),
    debugPorts:    process.env.DEBUG_PORTS
      ? process.env.DEBUG_PORTS.split(',').map(Number).filter(Boolean)
      : [],
  };
}

function validate(config) {
  // Le jeton n'est plus requis ici : il est résolu par server.js (token.local intégré,
  // fichier local saisi par la VA, ou env). Si absent, l'app affiche l'écran de connexion.
  return config;
}

module.exports = { load, validate };
