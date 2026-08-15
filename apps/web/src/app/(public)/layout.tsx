import { AppShell } from "~/components/layout/app-shell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell title="Public">{children}</AppShell>;
}
