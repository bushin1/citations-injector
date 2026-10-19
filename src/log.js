const { addLog } = require('./state');

function ts() {
  return new Date().toLocaleTimeString('fr-FR', { hour12: false });
}

function emit(level, prefix, msg) {
  console.log(`[${ts()}] ${prefix} ${msg}`);
  addLog(level, msg);
}

module.exports = {
  info:  (msg) => emit('info', ' ', msg),
  ok:    (msg) => emit('ok', '[+]', msg),
  warn:  (msg) => emit('warn', '[!]', msg),
  arrow: (msg) => emit('inject', ' > ', msg),
  gone:  (msg) => emit('gone', '[-]', msg),
};
