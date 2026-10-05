import { ImageResponse } from "next/og";

import { parseOrganizationTheme } from "~/lib/organization-theme";

const FALLBACK_PRIMARY = "#0f766e";

function primaryColor(theme: unknown) {
  return parseOrganizationTheme(theme)?.primary ?? FALLBACK_PRIMARY;
}

/** Link preview of a public quiz: its title, organization and a call to play. */
export function renderPublicQuizPreview(input: {
  title: string;
  organizationName: string;
  questionCount: number;
  theme: unknown;
}) {
  const primary = primaryColor(input.theme);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: primary,
        color: "white",
      }}
    >
      <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>
        {input.organizationName}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 30, opacity: 0.85 }}>
          Quiz online · {input.questionCount} soal
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          {input.title}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            display: "flex",
            background: "white",
            color: primary,
            borderRadius: 999,
            padding: "16px 36px",
            fontSize: 32,
            fontWeight: 800,
          }}
        >
          Main sekarang
        </div>
        <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>
          Tanpa daftar akun · Ada leaderboard
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}

export type ResultCard = {
  quizTitle: string;
  organizationName: string;
  theme: unknown;
  name: string;
  score: number;
  maxScore: number;
  rank: number | null;
};

/**
 * A participant's score, as a 1200×630 link preview or a 1080×1920 image for stories.
 */
export function renderPublicQuizResult(
  card: ResultCard,
  format: "preview" | "story",
) {
  const primary = primaryColor(card.theme);
  const story = format === "story";
  const percentage = card.maxScore
    ? Math.round((card.score / card.maxScore) * 100)
    : 0;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: story ? "center" : "flex-start",
        textAlign: story ? "center" : "left",
        // Stories overlay their own header and reply bar near the top and bottom edges.
        padding: story ? "260px 110px 320px" : 72,
        background: primary,
        color: "white",
      }}
    >
      <div
        style={{ display: "flex", fontSize: story ? 44 : 32, opacity: 0.85 }}
      >
        {card.organizationName}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: story ? "center" : "flex-start",
          gap: story ? 36 : 16,
        }}
      >
        <div style={{ display: "flex", fontSize: story ? 52 : 34 }}>
          {card.name} dapat skor
        </div>
        <div
          style={{
            display: "flex",
            fontSize: story ? 320 : 180,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {percentage}
        </div>
        <div
          style={{ display: "flex", fontSize: story ? 48 : 32, opacity: 0.9 }}
        >
          {card.rank ? `Peringkat #${card.rank} · ` : ""}
          {card.quizTitle}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          background: "white",
          color: primary,
          borderRadius: 999,
          padding: story ? "28px 56px" : "16px 36px",
          fontSize: story ? 42 : 32,
          fontWeight: 800,
        }}
      >
        Berani coba? Kalahkan skornya!
      </div>
    </div>,
    story ? { width: 1080, height: 1920 } : { width: 1200, height: 630 },
  );
}
