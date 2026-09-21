import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

// Thin wrapper around `pino`. Application code depends on this class, never
// on `pino` directly. `.raw` exposes the underlying pino instance only for
// interop with libraries that require a real pino logger (e.g. pino-http).
//
// When `filePath` is given, every log line is also appended (as JSON) to
// that file, in addition to the pretty console output used in development.
export class Logger {
  constructor(options = {}, filePath = null) {
    if (!filePath) {
      this.raw = pino(options);
      return;
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const targets = [{ target: 'pino/file', level: options.level || 'info', options: { destination: filePath, mkdir: true } }];
    if (options.transport?.target === 'pino-pretty') {
      targets.push({ target: 'pino-pretty', level: options.level || 'info', options: options.transport.options });
    }

    const { transport: _transport, ...rest } = options;
    this.raw = pino({ ...rest, transport: { targets } });
  }

  info(...args) {
    this.raw.info(...args);
  }

  warn(...args) {
    this.raw.warn(...args);
  }

  error(...args) {
    this.raw.error(...args);
  }

  debug(...args) {
    this.raw.debug(...args);
  }

  fatal(...args) {
    this.raw.fatal(...args);
  }
}
