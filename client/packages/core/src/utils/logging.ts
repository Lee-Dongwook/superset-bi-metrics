const console =
  typeof window !== "undefined" ? window.console || {} : globalThis.console;
const log = console.log || (() => {});

const logger = {
  log,
  debug: console.debug || log,
  info: console.info || log,
  warn: console.warn || log,
  error: console.error || log,
  trace: console.trace || log,
  table: console.table || log,
};

export default logger;
