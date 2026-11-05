import path from 'node:path';
import { Logger } from '../lib/Logger.js';
import { env } from './env.js';
import { dateStamp } from './logger.js';

const LOGS_DIR = path.join(process.cwd(), 'logs');

// Dedicated, file-only logger for Drizzle query events (see db/index.js).
// Kept separate from the main app logger so SQL noise never drowns out
// request/business-event logs, and so each can be rotated/shipped independently.
export const sqlLogger = env.isTest
  ? new Logger({ level: 'silent' })
  : new Logger({ level: 'info' }, path.join(LOGS_DIR, `${dateStamp()}-sql.log`));

export default sqlLogger;
