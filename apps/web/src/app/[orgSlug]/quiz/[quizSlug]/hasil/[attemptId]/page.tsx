import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "~/components/ui/button";
import { OrganizationThemeBootstrap } from "~/components/organization-theme-bootstrap";
import { parseOrganizationTheme } from "~/lib/organization-theme";
import { loadResultCard } from "./card";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ orgSlug: string; quizSlug: string; attemptId: string }>;
};

function percentage(card: { score: number; maxScore: number }) {
  return card.maxScore ? Math.round((card.score / card.maxScore) * 100) : 0;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const card = await loadResultCard(await params);
  if (!card) notFound();
  const title = `${card.name} dapat skor ${percentage(card)} di ${card.quizTitle}`;
  return {
    title: { absolute: title },
    description: `Quiz online dari ${card.organizationName}. Berani kalahkan skornya?`,
    robots: { index: false, follow: true },
    openGraph: { type: "website", title, siteName: card.organizationName },
    twitter: { card: "summary_large_image", title },
  };
}

/** Where a shared result links to: the score, and an invitation to take the quiz. */
export default async function PublicQuizResultPage({ params }: Props) {
  const resolved = await params;
  const card = await loadResultCard(resolved);
  if (!card) notFound();
  return (
    <>
      <OrganizationThemeBootstrap theme={parseOrganizationTheme(card.theme)} />
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <p className="text-muted-foreground font-semibold">
          {card.organizationName}
        </p>
        <div className="bg-primary/10 ring-primary/40 flex w-full flex-col items-center gap-2 rounded-[20px] p-8 ring-1">
          <p className="text-muted-foreground text-sm">
            {card.name} dapat skor
          </p>
          <p className="text-7xl font-black tabular-nums">{percentage(card)}</p>
          <p className="text-muted-foreground text-sm">
            {card.rank ? `Peringkat #${card.rank} · ` : ""}
            {card.quizTitle}
          </p>
        </div>
        <Link
          href={`/${resolved.orgSlug}/quiz/${resolved.quizSlug}`}
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          Coba quiz ini
        </Link>
        <p className="text-muted-foreground text-xs">
          Tanpa daftar akun. Langsung masuk leaderboard.
        </p>
      </main>
    </>
  );
}
