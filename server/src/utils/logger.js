const isTest = process.env.NODE_ENV === 'test';

const logger = {
  info: (msg, meta) => {
    if (isTest) return;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}${metaStr}`);
  },
  warn: (msg, meta) => {
    if (isTest) return;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}${metaStr}`);
  },
  error: (msg, meta) => {
    if (isTest) return;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}${metaStr}`);
  },
  debug: (msg, meta) => {
    if (isTest || process.env.DEBUG !== 'true') return;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.debug(`[DEBUG] [${new Date().toISOString()}] ${msg}${metaStr}`);
  }
};

module.exports = logger;

