// Email sender. Currently logs the code to the server console (local dev /
// VDS without SMTP). To enable real email, set SMTP_* env vars and the
// nodemailer branch will send through your relay (Gmail, Postfix, etc).

const nodemailer = (function () {
  try { return require('nodemailer'); } catch (e) { return null; }
})();

const FROM = process.env.MAIL_FROM || 'USL <noreply@ultimateshittylist.space>';
const SITE_NAME = 'Ultimate Shitty List';

function buildTransporter() {
  if (!nodemailer) return null;
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  }
  return null;
}

const transporter = buildTransporter();

function sendVerificationCode(toEmail, code) {
  const subject = SITE_NAME + ' — confirm your email';
  const text =
    'Welcome to ' + SITE_NAME + '!\n\n' +
    'Your verification code is: ' + code + '\n\n' +
    'This code expires in 15 minutes. If you did not register, ignore this email.';

  // Always log to console so it works without SMTP configured.
  console.log('[mailer] verification code for ' + toEmail + ': ' + code);

  if (!transporter) {
    return Promise.resolve({ sent: false, reason: 'no-smtp-configured', code: code });
  }
  return transporter.sendMail({ from: FROM, to: toEmail, subject: subject, text: text })
    .then(function (info) { return { sent: true, info: info, code: code }; })
    .catch(function (err) { return { sent: false, reason: String(err && err.message || err), code: code }; });
}

module.exports = { sendVerificationCode };
