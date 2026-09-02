type LogLevel = 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

function sanitize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : value.stack,
    };
  }
  return value;
}

function write(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = {
    level,
    event,
    at: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(context).map(([key, value]) => [key, sanitize(value)])),
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info: (event: string, context?: LogContext) => write('info', event, context),
  warn: (event: string, context?: LogContext) => write('warn', event, context),
  error: (event: string, context?: LogContext) => write('error', event, context),
};

export function trackApiError(route: string, error: unknown, context: LogContext = {}) {
  logger.error('api.error', { route, error, ...context });
}

export function trackRateLimit(scope: string, key: string) {
  logger.warn('rate_limit.blocked', { scope, key });
}
