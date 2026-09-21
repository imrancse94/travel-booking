import { db } from '../db/index.js';
import { emailLogs } from '../db/schema.js';

/** Records the outcome of one outbound message. See services/emailService.js. */
export async function create(data) {
  const [row] = await db.insert(emailLogs).values(data).returning();
  return row;
}
