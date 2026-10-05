import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { TRPCError } from "@trpc/server";

import { OrganizationThemeBootstrap } from "~/components/organization-theme-bootstrap";
import { PublicQuizPlayer } from "~/components/public-quiz/public-quiz-player";
import { env } from "~/env";
import { parseOrganizationTheme } from "~/lib/organization-theme";
import { db } from "~/server/db";
import {
  getPublicQuiz,
  recordPublicQuizView,
} from "~/server/public-quiz/service";

// Closing a quiz must take effect immediately.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgSlug: string; quizSlug: string }> };

const loadQuiz = cache(async (organizationSlug: string, slug: string) => {
  try {
    return await getPublicQuiz(db, { organizationSlug, slug });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
});

// Link previews (WhatsApp, Instagram, search engines) fetch the page but are not visitors.
const CRAWLER_PATTERN =
  /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|headless/i;

function quizUrl(organizationSlug: string, slug: string) {
  return new URL(`/${organizationSlug}/quiz/${slug}`, env.APP_URL).toString();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, quizSlug } = await params;
  const quiz = await loadQuiz(orgSlug, quizSlug);
  const title = `${quiz.title} · ${quiz.organization.name}`;
  const description =
    quiz.description ??
    `Quiz online ${quiz.questionCount} soal dari ${quiz.organization.name}. Tanpa daftar akun, langsung masuk leaderboard.`;
  const url = quizUrl(quiz.organization.slug, quiz.slug);
  // The preview image comes from the colocated opengraph-image route.
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: quiz.organization.name,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicQuizPage({ params }: Props) {
  const { orgSlug, quizSlug } = await params;
  const quiz = await loadQuiz(orgSlug, quizSlug);
  const userAgent = (await headers()).get("user-agent") ?? "";
  if (userAgent && !CRAWLER_PATTERN.test(userAgent)) {
    after(() =>
      recordPublicQuizView(db, quiz.id).catch((error: unknown) =>
        console.error("Failed to record a public quiz view", error),
      ),
    );
  }
  const theme = quiz.organization.theme
    ? parseOrganizationTheme(quiz.organization.theme)
    : null;
  return (
    <>
      <OrganizationThemeBootstrap theme={theme} />
      <PublicQuizPlayer
        quiz={quiz}
        shareUrl={quizUrl(quiz.organization.slug, quiz.slug)}
      />
    </>
  );
}
