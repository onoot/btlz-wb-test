import log4js from 'log4js';

log4js.configure({
  appenders: {
    out: { type: 'stdout' },
  },
  categories: {
    default: { appenders: ['out'], level: 'info' },
  },
});

const logger = log4js.getLogger();

logger.error = (...args: any[]) => {
  const formatted = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.message}\n${arg.stack}`;
    }
    return arg;
  });
  //@ts-ignore
  log4js.getLogger().error(...formatted);
};

export { logger };