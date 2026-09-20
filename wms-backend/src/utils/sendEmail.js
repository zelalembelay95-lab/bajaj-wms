/**
 * Sends email via Gmail's own SMTP server, using an ordinary Gmail account
 * (no domain, no third-party email service, no cost). Requires that Gmail
 * account to have an "App Password" generated for it — see README.md for
 * the exact steps (2-Step Verification must be on first; Google requires
 * it before an App Password can be created).
 *
 * Free Gmail accounts cap at ~500 sends/day, far more than this app's
 * PO-notification volume needs.
 *
 * Failure handling: email sending NEVER throws — a misconfigured or down
 * mail account should never block or fail the actual business action
 * (creating a PO). Errors are logged and swallowed.
 */
const nodemailer = require("nodemailer");

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`GMAIL_USER/GMAIL_APP_PASSWORD not set — skipped email "${subject}" to ${Array.isArray(to) ? to.join(", ") : to}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_FROM_NAME ? `"${process.env.GMAIL_FROM_NAME}" <${process.env.GMAIL_USER}>` : process.env.GMAIL_USER,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email send error:", err.message);
  }
}

module.exports = { sendEmail };
