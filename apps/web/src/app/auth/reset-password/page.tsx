import type { Metadata } from "next";

import { ResetPasswordForm } from "~/components/auth-recovery";
import { FlowShell } from "~/components/brand/flow-shell";
import { ThemeToggle } from "~/components/theme-toggle";

export const metadata: Metadata = {
  title: "Kata sandi baru",
  description: "Pilih kata sandi baru untuk akun Hakgyo Anda.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  return (
    <FlowShell action={<ThemeToggle />}>
      <div className="mx-auto w-full max-w-[29rem] pt-2 sm:pt-10">
        <ResetPasswordForm token={token} invalid={Boolean(error)} />
      </div>
    </FlowShell>
  );
}
