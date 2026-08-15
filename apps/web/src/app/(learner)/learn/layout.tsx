import { AppShell } from "~/components/layout/app-shell";
import { requireSession } from "~/server/auth/dal";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
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
