import { describe, expect, test } from "bun:test";

import { passwordResetEmail, verificationEmail } from "./templates";

describe("account emails", () => {
  test("escape the recipient name and link in HTML", () => {
    const email = verificationEmail({
      to: "a@example.com",
      name: '<script>alert("x")</script>',
      url: "https://hakgyo.id/api/auth/verify-email?token=a&callbackURL=%2F",
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("token=a&amp;callbackURL");
  });

  test("keep the raw link in the plain-text body", () => {
    const url = "https://hakgyo.id/api/auth/reset-password/abc?callbackURL=%2F";
    const email = passwordResetEmail({
      to: "a@example.com",
      name: "Sari",
      url,
    });

    expect(email.text).toContain(url);
    expect(email.subject).toContain("kata sandi");
  });
});
