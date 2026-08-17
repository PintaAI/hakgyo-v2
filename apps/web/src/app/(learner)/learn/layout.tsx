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
      title="Pembelajaran"
      nav={[
        { href: "/learn/courses", label: "Course saya" },
        { href: "/catalog", label: "Katalog" },
      ]}
    >
      {children}
    </AppShell>
  );
}
