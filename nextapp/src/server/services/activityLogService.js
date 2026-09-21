import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { ValidationError } from '../utils/errors.js';
import { LOGS_DIR } from '../config/activityLogger.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// A hard ceiling on how many lines one request will read. The files are
// append-only and can reach megabytes; without this an admin hitting a busy
// day's log would tie up the event loop parsing all of it.
const MAX_SCANNED_LINES = 50_000;

/**
 * Resolves a `YYYY-MM-DD` to its log file.
 *
 * The date is validated against a strict pattern and the result is checked to
 * be inside LOGS_DIR, so a crafted `date` cannot walk out of the logs
 * directory and read arbitrary files.
 */
function resolveLogFile(date, suffix = 'activity') {
  if (!DATE_RE.test(String(date))) {
    throw new ValidationError('date must be in YYYY-MM-DD format');
  }
  const file = path.resolve(LOGS_DIR, `${date}-${suffix}.log`);
  if (!file.startsWith(path.resolve(LOGS_DIR) + path.sep)) {
    throw new ValidationError('Invalid log date');
  }
  return file;
}

/** The days that actually have an activity log, newest first. */
export async function listAvailableDates() {
  let entries;
  try {
    entries = await fsp.readdir(LOGS_DIR);
  } catch {
    return [];
  }
  return entries
    .map((name) => /^(\d{4}-\d{2}-\d{2})-activity\.log$/.exec(name)?.[1])
    .filter(Boolean)
    .sort()
    .reverse();
}

/** pino writes epoch millis; the API speaks ISO. */
function normalise(entry) {
  return {
    time: entry.time ? new Date(entry.time).toISOString() : null,
    action: entry.action ?? null,
    method: entry.method ?? null,
    path: entry.path ?? null,
    status: entry.status ?? null,
    outcome: entry.outcome ?? null,
    durationMs: entry.durationMs ?? null,
    userId: entry.userId ?? null,
    userEmail: entry.userEmail ?? null,
    roles: entry.roles ?? [],
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
    requestId: entry.requestId ?? null,
    body: entry.body ?? null,
    params: entry.params ?? null,
    query: entry.query ?? null,
  };
}

function matches(entry, { search, outcome, method, userEmail, status }) {
  if (outcome && entry.outcome !== outcome) return false;
  if (method && entry.method !== method) return false;
  if (status && Number(entry.status) !== Number(status)) return false;
  if (userEmail && !String(entry.userEmail || '').toLowerCase().includes(userEmail.toLowerCase())) return false;

  if (search) {
    // Searched across the fields an operator would actually look in, rather
    // than the whole serialised line -- that would match on field names and
    // timestamps and make every query noisy.
    const haystack = [entry.action, entry.path, entry.userEmail, entry.ip, entry.requestId, (entry.roles || []).join(' ')]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(search.toLowerCase())) return false;
  }
  return true;
}

/**
 * Reads one day's activity log, filters it, and returns a page of entries
 * newest-first.
 *
 * Streamed line by line: the file is JSON-lines, so it never has to be held in
 * memory in full, and a corrupt line is skipped rather than failing the request.
 */
export async function listActivityLogs({
  date,
  search,
  outcome,
  method,
  userEmail,
  status,
  page = 1,
  limit = 50,
} = {}) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const file = resolveLogFile(targetDate);

  if (!fs.existsSync(file)) {
    return { items: [], total: 0, page, limit, date: targetDate, truncated: false };
  }

  const stream = fs.createReadStream(file, { encoding: 'utf8' });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const matched = [];
  let scanned = 0;
  let truncated = false;

  for await (const line of lines) {
    if (!line.trim()) continue;
    scanned += 1;
    if (scanned > MAX_SCANNED_LINES) {
      truncated = true;
      break;
    }
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // a half-written final line while the app is still appending
    }
    if (entry.type !== 'activity') continue;
    const normalised = normalise(entry);
    if (matches(normalised, { search, outcome, method, userEmail, status })) {
      matched.push(normalised);
    }
  }
  lines.close();
  stream.destroy();

  // Newest first, which is what an operator wants when opening the page.
  matched.reverse();

  const start = (Number(page) - 1) * Number(limit);
  return {
    items: matched.slice(start, start + Number(limit)),
    total: matched.length,
    page: Number(page),
    limit: Number(limit),
    date: targetDate,
    truncated,
  };
}

export default { listActivityLogs, listAvailableDates };
