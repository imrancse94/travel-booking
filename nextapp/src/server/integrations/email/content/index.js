import { welcome } from './welcome.js';
import { emailVerification } from './emailVerification.js';
import { passwordReset } from './passwordReset.js';
import { bookingConfirmation } from './bookingConfirmation.js';
import { bookingCancellation } from './bookingCancellation.js';
import { paymentReceipt } from './paymentReceipt.js';
import { refundProcessed } from './refundProcessed.js';
import { invoice } from './invoice.js';
import { checkInReminder } from './checkInReminder.js';

export { renderLayout } from './layout.js';

// One file per email (content only: subject/title/bodyHtml). The shared
// header/footer/brand wrapper lives in layout.js and is applied once, in
// emailService.js, so branding never needs to be touched per-template.
export const emailContent = {
  welcome,
  emailVerification,
  passwordReset,
  bookingConfirmation,
  bookingCancellation,
  paymentReceipt,
  refundProcessed,
  invoice,
  checkInReminder,
};

export default emailContent;
