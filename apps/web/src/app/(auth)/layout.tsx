import { AppShell } from "~/components/routing/app-shell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell title="Account" nav={[{ href: "/catalog", label: "Catalog" }]}>
      {children}
    </AppShell>
  );
}
