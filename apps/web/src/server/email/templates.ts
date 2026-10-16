import type { OutgoingEmail } from "~/server/email/send";

type AccountEmailInput = {
  to: string;
  name: string;
  url: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(input: {
  heading: string;
  name: string;
  intro: string;
  action: string;
  url: string;
  outro: string;
}): Pick<OutgoingEmail, "html" | "text"> {
  const name = escapeHtml(input.name);
  const url = escapeHtml(input.url);
  const html = `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 24px;font-size:14px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#78716c;">Hakgyo</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapeHtml(input.heading)}</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Halo ${name},</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">${escapeHtml(input.intro)}</p>
        <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#1c1917;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(input.action)}</a></p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#57534e;">Jika tombol tidak berfungsi, salin tautan ini ke browser:</p>
        <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${url}" style="color:#57534e;">${url}</a></p>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#78716c;">${escapeHtml(input.outro)}</p>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = `Halo ${input.name},\n\n${input.intro}\n\n${input.action}: ${input.url}\n\n${input.outro}`;
  return { html, text };
}

export function verificationEmail({
  to,
  name,
  url,
}: AccountEmailInput): OutgoingEmail {
  return {
    to,
    subject: "Verifikasi email akun Hakgyo",
    ...layout({
      heading: "Verifikasi email Anda",
      name,
      intro:
        "Terima kasih sudah mendaftar di Hakgyo. Konfirmasi alamat email ini untuk mulai menggunakan akun Anda.",
      action: "Verifikasi email",
      url,
      outro:
        "Jika Anda tidak merasa membuat akun Hakgyo, abaikan email ini. Tautan berlaku selama 1 jam.",
    }),
  };
}

export function passwordResetEmail({
  to,
  name,
  url,
}: AccountEmailInput): OutgoingEmail {
  return {
    to,
    subject: "Atur ulang kata sandi Hakgyo",
    ...layout({
      heading: "Atur ulang kata sandi",
      name,
      intro:
        "Kami menerima permintaan untuk mengatur ulang kata sandi akun Hakgyo Anda. Klik tombol di bawah untuk memilih kata sandi baru.",
      action: "Atur ulang kata sandi",
      url,
      outro:
        "Jika Anda tidak meminta ini, abaikan email ini; kata sandi Anda tidak berubah. Tautan berlaku selama 1 jam.",
    }),
  };
}

export function existingAccountEmail({
  to,
  name,
  signInUrl,
  resetUrl,
}: {
  to: string;
  name: string;
  signInUrl: string;
  resetUrl: string;
}): OutgoingEmail {
  return {
    to,
    subject: "Email ini sudah terdaftar di Hakgyo",
    ...layout({
      heading: "Anda sudah punya akun",
      name,
      intro:
        "Ada yang mencoba membuat akun Hakgyo baru dengan email ini, padahal email ini sudah terdaftar. Masuk dengan akun yang sudah ada untuk melanjutkan.",
      action: "Masuk ke Hakgyo",
      url: signInUrl,
      outro: `Lupa kata sandi, atau biasanya masuk dengan Google? Buat kata sandi baru di ${resetUrl}. Jika bukan Anda yang mencoba mendaftar, abaikan email ini.`,
    }),
  };
}
