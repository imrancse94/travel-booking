import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import logger from '../config/logger.js';

export const requestLogger = pinoHttp({
  logger: logger.raw,
  genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return { method: req.method, url: req.url, id: req.id };
    },
  },
  autoLogging: {
    ignore: (req) => req.url === '/api/v1/health',
  },
});
