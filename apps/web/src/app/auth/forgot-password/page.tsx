import type { Metadata } from "next";

import { ForgotPasswordForm } from "~/components/auth-recovery";
import { FlowShell } from "~/components/brand/flow-shell";
import { ThemeToggle } from "~/components/theme-toggle";

export const metadata: Metadata = {
  title: "Lupa kata sandi",
  description: "Atur ulang kata sandi akun Hakgyo Anda.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <FlowShell action={<ThemeToggle />}>
      <div className="mx-auto w-full max-w-[29rem] pt-2 sm:pt-10">
        <ForgotPasswordForm />
      </div>
    </FlowShell>
  );
}
