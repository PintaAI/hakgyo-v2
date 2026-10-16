import { env } from "~/env";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Also what development prints when Resend is not configured. */
  text: string;
};

/**
 * Sends one transactional email through Resend. Without `RESEND_API_KEY` and
 * `EMAIL_FROM`, development prints the message so links can be followed from the
 * server log; production throws so a misconfigured deploy fails loudly.
 */
export async function sendEmail(email: OutgoingEmail) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    if (env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY and EMAIL_FROM are not configured.");
    }
    console.info(
      `[email] To: ${email.to}\n[email] Subject: ${email.subject}\n${email.text}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
    // Sends run after the response, but a hung request would still hold the
    // function open.
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Resend rejected the email (${response.status}): ${await response.text()}`,
    );
  }
}
