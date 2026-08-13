import { AppShell } from "~/components/routing/app-shell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      title="Public"
      nav={[
        { href: "/catalog", label: "Catalog" },
        { href: "/sign-in", label: "Sign in" },
      ]}
    >
      {children}
    </AppShell>
  );
}
