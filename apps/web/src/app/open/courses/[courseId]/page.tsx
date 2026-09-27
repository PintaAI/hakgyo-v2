import type { Metadata } from "next";

import { AppHandoff } from "~/components/app-handoff";
import { QrCode } from "~/components/qr-code";
import { env } from "~/env";
import { appHandoffPath } from "~/lib/mobile-app";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";

export const metadata: Metadata = {
  title: "Lanjut di aplikasi Hakgyo",
  robots: { index: false, follow: false },
};

export default async function OpenCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ app?: string }>;
}) {
  const [{ courseId }, query, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);
  const userId = session?.user.id;

  // Course details are only shown to learners who can already open it; anyone
  // else still gets a working handoff without learning what the course is.
  const [course, accounts] = userId
    ? await Promise.all([
        db.course.findFirst({
          where: {
            id: courseId,
            enrollments: {
              some: { userId, status: { in: ["ACTIVE", "COMPLETED"] } },
            },
          },
          select: {
            title: true,
            thumbnailUrl: true,
            organization: { select: { name: true } },
          },
        }),
        db.account.findMany({
          where: { userId },
          select: { providerId: true },
        }),
      ])
    : [null, []];

  const pageUrl = new URL(appHandoffPath(courseId), env.APP_URL).toString();
  const signsInWithPassword = accounts.some(
    ({ providerId }) => providerId === "credential",
  );

  return (
    <AppHandoff
      courseId={courseId}
      pageUrl={pageUrl}
      appMissing={query.app === "missing"}
      course={
        course
          ? {
              title: course.title,
              thumbnailUrl: course.thumbnailUrl,
              organizationName: course.organization.name,
            }
          : null
      }
      account={
        session
          ? {
              email: session.user.email,
              method:
                !signsInWithPassword &&
                accounts.some(({ providerId }) => providerId === "google")
                  ? "google"
                  : "email",
            }
          : null
      }
      qrCode={
        <QrCode
          value={pageUrl}
          label="QR code untuk membuka halaman ini di HP"
          className="size-full"
        />
      }
    />
  );
}
