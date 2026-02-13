import pino, { Logger } from 'pino';
import { createRequire } from 'module';
import { getRequestId } from '../middleware/requestId.js';

const isDev = process.env.NODE_ENV !== 'production';
const require = createRequire(import.meta.url);

function canUsePrettyTransport(): boolean {
  if (!isDev) return false;

  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    // In production installs, dev dependencies may be omitted.
    return false;
  }
}

const prettyTransport = canUsePrettyTransport()
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: prettyTransport,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  serializers: {
    error: pino.stdSerializers.err,
    err: pino.stdSerializers.err,
  },
});

/**
 * Logger proxy that automatically includes request ID from async local storage
 */
function createLoggerProxy(): Logger {
  return new Proxy(baseLogger, {
    get(target, prop) {
      const value = target[prop as keyof Logger];

      // Intercept logging methods to add request ID
      if (typeof value === 'function' && ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop as string)) {
        return (...args: unknown[]) => {
          const requestId = getRequestId();
          const method = value.bind(target) as (...args: unknown[]) => void;

          if (requestId) {
            // If first arg is an object, merge requestId into it
            if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
              args[0] = { requestId, ...args[0] };
            } else if (args.length === 1 && typeof args[0] === 'string') {
              // If only a message string, add requestId object
              args = [{ requestId }, args[0]];
            } else {
              // Prepend requestId object
              args = [{ requestId }, ...args];
            }
          }

          return method(...args);
        };
      }

      return value;
    },
  }) as Logger;
}

export const logger = createLoggerProxy();
export { baseLogger };
export default logger;
