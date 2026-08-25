import nodemailer from 'nodemailer';

// Thin wrapper around `nodemailer`. Application code depends on this class,
// never on `nodemailer` directly.
export class MailTransport {
  constructor({ host, port, secure, user, password }) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? port === 465,
      auth: user ? { user, pass: password } : undefined,
    });
  }

  async send({ from, to, subject, html, text }) {
    return this.transporter.sendMail({ from, to, subject, html, text });
  }
}
