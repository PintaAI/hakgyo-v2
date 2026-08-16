import { Hanken_Grotesk, Inter } from "next/font/google";

import { CoursesLibrary } from "~/components/courses-library";
import { cn } from "~/lib/utils";
import { requireOrganizationMembershipBySlug } from "~/server/auth/dal";
import { api } from "~/trpc/server";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId: organizationSlug } = await params;
  const membership =
    await requireOrganizationMembershipBySlug(organizationSlug);
  const courses = await api.course.list({
    organizationId: membership.organizationId,
  });

  return (
    <div
      className={cn(
        hanken.variable,
        inter.variable,
        "mx-auto w-full max-w-6xl font-[family-name:var(--font-inter)]",
      )}
    >
      <CoursesLibrary
        courses={courses}
        organizationSlug={organizationSlug}
        role={membership.role}
      />
    </div>
  );
}
