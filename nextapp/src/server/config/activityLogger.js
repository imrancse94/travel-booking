import path from 'node:path';
import { Logger } from '../lib/Logger.js';
import { env } from './env.js';
import { dateStamp } from './logger.js';

export const LOGS_DIR = path.join(process.cwd(), 'logs');

/** `logs/YYYY-MM-DD-activity.log` -- one file per day, matching -app/-sql. */
export function activityLogPath(date = new Date()) {
  return path.join(LOGS_DIR, `${dateStamp(date)}-activity.log`);
}

/**
 * Who did what, kept apart from the request and SQL streams.
 *
 * Its own file for three reasons: the admin panel reads it directly and should
 * not have to sift request noise out of it, it is the stream with the longest
 * retention interest, and it can be rotated or shipped on its own schedule.
 *
 * Rotation is resolved PER WRITE, not at import. A server started on Monday and
 * still running on Wednesday would otherwise append three days of activity into
 * Monday's file -- which defeats a day-wise log entirely, and would mean the
 * admin panel's date picker showed days with nothing in them.
 *
 * Written as JSON lines with no pretty transport even in development: this file
 * is parsed, not read by eye.
 */
const writers = new Map();

function writerForToday() {
  const day = dateStamp();
  let writer = writers.get(day);
  if (!writer) {
    writer = new Logger({ level: 'info', base: undefined }, activityLogPath());
    // Yesterday's writer is dropped once the day turns; pino's file transport
    // flushes on its own, and holding every past day would leak descriptors.
    writers.clear();
    writers.set(day, writer);
  }
  return writer;
}

export const activityLogger = env.isTest
  ? new Logger({ level: 'silent' })
  : { info: (...args) => writerForToday().info(...args) };

export default activityLogger;
