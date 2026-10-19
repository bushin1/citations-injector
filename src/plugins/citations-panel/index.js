const fs = require('fs');
const path = require('path');

const SCRIPT_RAW = fs.readFileSync(path.join(__dirname, 'panel.js'), 'utf-8');

module.exports = {
  name: 'citations-panel',
  description: 'Auto-remplissage NAP depuis le dashboard Citations',

  build(config) {
    const script = SCRIPT_RAW
      .replace('__DASHBOARD_BASE__', config.dashboardBase)
      .replace('__EXT_TOKEN__', config.extToken);

    return {
      name: 'citations-panel',
      script,
    };
  },
};
