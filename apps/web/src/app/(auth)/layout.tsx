import { AppShell } from "~/components/layout/app-shell";
import { requireSession } from "~/server/auth/dal";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <AppShell title="Settings">{children}</AppShell>;
}
