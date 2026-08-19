import { Subnav } from "~/components/layout/subnav";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const root = `/workspace/${organizationSlug}/library`;
  const sectionLabels: Record<string, string> = {
    materials: "Materi",
    vocabulary: "Kosakata",
    assessments: "Tugas",
  };
  return (
    <Subnav
      nav={["materials", "vocabulary", "assessments"].map((section) => ({
        href: `${root}/${section}`,
        label: sectionLabels[section] ?? section,
      }))}
    >
      {children}
    </Subnav>
  );
}
