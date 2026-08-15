import { AppShell } from "~/components/layout/app-shell";

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      title="Learning"
      nav={[
        { href: "/learn/courses", label: "My courses" },
        { href: "/catalog", label: "Catalog" },
        { href: "/account", label: "Account" },
      ]}
    >
      {children}
    </AppShell>
  );
}
