/**
 * Sends email via Resend (resend.com) — a single POST request over fetch,
 * deliberately not using their SDK to keep this backend's dependency list
 * small. Free tier: 3,000 emails/month, no credit card required.
 *
 * IMPORTANT — sandbox sending limit: until you verify your own domain in
 * Resend, the default sender (`onboarding@resend.dev`) can only deliver to
 * the email address on your Resend account itself, not to arbitrary staff
 * inboxes. For real multi-recipient notifications (this app's use case —
 * notifying every Manager/Admin), verify a domain in the Resend dashboard
 * (Domains → Add Domain → add the DNS records it gives you) and set
 * RESEND_FROM_EMAIL to an address on that domain. Takes a few minutes,
 * still free.
 *
 * Failure handling: email sending NEVER throws — a down/misconfigured email
 * provider should never block or fail the actual business action (creating
 * a PO). Errors are logged and swallowed.
 */
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set — skipped email "${subject}" to ${Array.isArray(to) ? to.join(", ") : to}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Bajaj WMS <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Email send failed (${res.status}):`, body);
    }
  } catch (err) {
    console.error("Email send error:", err);
  }
}

module.exports = { sendEmail };
