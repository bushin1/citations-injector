function ts() {
  return new Date().toLocaleTimeString('fr-FR', { hour12: false });
}

module.exports = {
  info:  (msg) => console.log(`[${ts()}]  ${msg}`),
  ok:    (msg) => console.log(`[${ts()}] [+] ${msg}`),
  warn:  (msg) => console.log(`[${ts()}] [!] ${msg}`),
  arrow: (msg) => console.log(`[${ts()}]  > ${msg}`),
  gone:  (msg) => console.log(`[${ts()}] [-] ${msg}`),
};
