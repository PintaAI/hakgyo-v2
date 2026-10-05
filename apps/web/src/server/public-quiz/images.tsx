import { ImageResponse } from "next/og";
import sharp from "sharp";

import {
  DEFAULT_ORGANIZATION_THEME,
  parseOrganizationTheme,
} from "~/lib/organization-theme";

// ---------------------------------------------------------------------------
// Assets

// An old Safari user agent makes Google Fonts answer with TrueType, which Satori can read.
const FONT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1";
const FONT_FAMILIES = [
  {
    name: "Plus Jakarta Sans",
    family: "Plus+Jakarta+Sans",
    weights: [500, 800],
  },
  // Hangul (and anything else Plus Jakarta Sans lacks) falls back to Noto Sans KR.
  { name: "Noto Sans KR", family: "Noto+Sans+KR", weights: [500, 800] },
] as const;

type FontOption = {
  name: string;
  data: ArrayBuffer;
  weight: 500 | 800;
  style: "normal";
};

async function loadFontSubset(family: string, weight: number, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
    { headers: { "User-Agent": FONT_USER_AGENT } },
  ).then((response) => (response.ok ? response.text() : ""));
  const url = /src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/.exec(
    css,
  )?.[1];
  if (!url) return null;
  const response = await fetch(url);
  return response.ok ? response.arrayBuffer() : null;
}

/**
 * Font subsets holding just the glyphs of `text`, so images get real weights and Hangul
 * without bundling multi-megabyte fonts. Falls back to the default font when offline.
 */
async function loadFonts(text: string): Promise<FontOption[]> {
  const glyphs = [...new Set(text)].join("");
  const loaded = await Promise.all(
    FONT_FAMILIES.flatMap((font) =>
      font.weights.map(async (weight) => {
        const data = await loadFontSubset(font.family, weight, glyphs).catch(
          () => null,
        );
        return data
          ? { name: font.name, data, weight, style: "normal" as const }
          : null;
      }),
    ),
  );
  return loaded.filter((font) => font !== null);
}

const logoCache = new Map<string, Promise<string | null>>();

/** The organization logo as a PNG data URL (Satori cannot draw WebP), or null. */
function loadLogo(url: string | null) {
  if (!url) return Promise.resolve(null);
  let logo = logoCache.get(url);
  if (!logo) {
    logo = fetch(url)
      .then(async (response) => {
        if (!response.ok) return null;
        const png = await sharp(Buffer.from(await response.arrayBuffer()))
          .resize(256, 256, { fit: "contain", background: "#ffffff" })
          .flatten({ background: "#ffffff" })
          .png()
          .toBuffer();
        return `data:image/png;base64,${png.toString("base64")}`;
      })
      .catch(() => null);
    if (logoCache.size > 200) logoCache.clear();
    logoCache.set(url, logo);
  }
  return logo;
}

function shade(hex: string, amount: number) {
  const channel = (start: number) =>
    Math.round(Number.parseInt(hex.slice(start, start + 2), 16) * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function palette(theme: unknown) {
  // Same default as the app, so unthemed organizations look alike everywhere.
  const primary = (parseOrganizationTheme(theme) ?? DEFAULT_ORGANIZATION_THEME)
    .primary;
  return {
    primary,
    deep: shade(primary, 0.55),
    background: `linear-gradient(145deg, ${shade(primary, 0.6)} 0%, ${shade(primary, 0.25)} 55%, ${primary} 100%)`,
  };
}

// ---------------------------------------------------------------------------
// Building blocks

function Glow({
  size,
  top,
  left,
}: {
  size: number;
  top: number;
  left: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: size,
        background:
          "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
      }}
    />
  );
}

function Brand({
  logo,
  name,
  size,
  center = false,
}: {
  logo: string | null;
  name: string;
  size: number;
  center?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        gap: size * 0.32,
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          width={size}
          height={size}
          style={{ borderRadius: size * 0.26, background: "white" }}
          alt=""
        />
      ) : (
        <div
          style={{
            display: "flex",
            width: size,
            height: size,
            borderRadius: size * 0.26,
            background: "white",
            color: "#111",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.48,
            fontWeight: 800,
          }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div
        style={{
          display: "flex",
          fontSize: size * 0.44,
          fontWeight: 800,
          color: "white",
        }}
      >
        {name}
      </div>
    </div>
  );
}

function ScoreRing({
  value,
  size,
  stroke,
  color,
  track,
  textColor,
  label,
}: {
  value: number;
  size: number;
  stroke: number;
  color: string;
  track: string;
  textColor: string;
  label: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(circumference * value) / 100} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          color: textColor,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: size * 0.36,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -size * 0.012,
          }}
        >
          {value}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: size * 0.075,
            fontWeight: 500,
            opacity: 0.6,
            marginTop: size * 0.03,
            letterSpacing: size * 0.006,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function Pill({
  children,
  fontSize,
  background,
  color,
}: {
  children: React.ReactNode;
  fontSize: number;
  background: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: fontSize * 0.4,
        background,
        color,
        borderRadius: 999,
        padding: `${fontSize * 0.5}px ${fontSize * 1.05}px`,
        fontSize,
        fontWeight: 800,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function rankText(rank: number | null, participants: number) {
  return rank ? `Peringkat ${rank} dari ${participants} peserta` : null;
}

// ---------------------------------------------------------------------------
// Quiz link preview

export async function renderPublicQuizPreview(input: {
  title: string;
  organizationName: string;
  logoUrl: string | null;
  questionCount: number;
  timeLimitMinutes: number | null;
  participants: number;
  theme: unknown;
}) {
  const colors = palette(input.theme);
  const meta = [
    `${input.questionCount} soal`,
    input.timeLimitMinutes ? `${input.timeLimitMinutes} menit` : null,
    input.participants ? `${input.participants} peserta` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const cta = "Mainkan sekarang";
  const options = ["Pilihan A", "Pilihan B", "Pilihan C"];
  const [fonts, logo] = await Promise.all([
    loadFonts(
      `${input.title}${input.organizationName}${meta}${cta}QUIZ ONLINESoal 1Tanpa daftar · Ada leaderboard→ABC/0123456789`,
    ),
    loadLogo(input.logoUrl),
  ]);
  const titleSize = input.title.length > 42 ? 56 : 70;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: colors.background,
        fontFamily: "Plus Jakarta Sans, Noto Sans KR",
        color: "white",
        overflow: "hidden",
      }}
    >
      <Glow size={720} top={-320} left={-200} />
      <Glow size={620} top={260} left={760} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 700,
          padding: "64px 0 64px 72px",
        }}
      >
        <Brand logo={logo} name={input.organizationName} size={64} />
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex" }}>
            <Pill
              fontSize={20}
              background="rgba(255,255,255,0.16)"
              color="white"
            >
              QUIZ ONLINE
            </Pill>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: titleSize,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: -1.5,
            }}
          >
            {input.title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 500,
              opacity: 0.78,
            }}
          >
            {meta}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Pill fontSize={26} background="white" color={colors.deep}>
            {cta} →
          </Pill>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 500,
              opacity: 0.7,
              whiteSpace: "nowrap",
            }}
          >
            Tanpa daftar · Ada leaderboard
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: 380,
            padding: 32,
            borderRadius: 32,
            background: "white",
            color: "#18181b",
            transform: "rotate(-4deg)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 18,
              fontWeight: 800,
              color: colors.primary,
            }}
          >
            <div style={{ display: "flex" }}>Soal 1</div>
            <div style={{ display: "flex", opacity: 0.5 }}>
              1/{input.questionCount}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              height: 10,
              borderRadius: 10,
              background: "#eceef1",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "28%",
                borderRadius: 10,
                background: colors.primary,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              height: 18,
              width: "86%",
              marginTop: 8,
              borderRadius: 9,
              background: "#e4e6ea",
            }}
          />
          <div
            style={{
              display: "flex",
              height: 18,
              width: "58%",
              borderRadius: 9,
              background: "#e4e6ea",
              marginBottom: 6,
            }}
          />
          {options.map((option, index) => {
            const chosen = index === 1;
            return (
              <div
                key={option}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 18,
                  border: chosen
                    ? `3px solid ${colors.primary}`
                    : "3px solid #eceef1",
                  background: chosen ? `${colors.primary}14` : "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 800,
                    background: chosen ? colors.primary : "#f1f2f4",
                    color: chosen ? "white" : "#71717a",
                  }}
                >
                  {chosen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        fill="none"
                        stroke="white"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    "ABC"[index]
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    height: 14,
                    width: chosen ? 170 : 140 - index * 20,
                    borderRadius: 7,
                    background: chosen ? `${colors.primary}55` : "#e4e6ea",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, fonts },
  );
}

// ---------------------------------------------------------------------------
// Result images

export type ResultCard = {
  quizTitle: string;
  organizationName: string;
  logoUrl: string | null;
  theme: unknown;
  name: string;
  score: number;
  maxScore: number;
  durationSeconds: number;
  rank: number | null;
  participants: number;
  /** Shown on story images, whose links are not clickable: `hakgyo.id/org/quiz/code`. */
  quizLink: string;
};

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes} mnt ${seconds % 60} dtk` : `${seconds} dtk`;
}

/** A participant's score as a 1200×630 link preview or a 1080×1920 story image. */
export async function renderPublicQuizResult(
  card: ResultCard,
  format: "preview" | "story",
) {
  const colors = palette(card.theme);
  const percentage = card.maxScore
    ? Math.round((card.score / card.maxScore) * 100)
    : 0;
  const rank = rankText(card.rank, card.participants);
  const stats = `${card.score}/${card.maxScore} poin  ·  ${formatSeconds(card.durationSeconds)}`;
  const challenge = "Berani kalahkan skorku?";
  const [fonts, logo] = await Promise.all([
    loadFonts(
      `${card.quizTitle}${card.organizationName}${card.name}${percentage}${rank ?? ""}${stats}${challenge}${card.quizLink}SKORQUIZ ONLINEMainkan quiznya →0123456789`,
    ),
    loadLogo(card.logoUrl),
  ]);

  if (format === "preview") {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: colors.background,
          fontFamily: "Plus Jakarta Sans, Noto Sans KR",
          color: "white",
          overflow: "hidden",
        }}
      >
        <Glow size={720} top={-320} left={-200} />
        <Glow size={560} top={240} left={780} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 700,
            padding: "64px 0 64px 72px",
          }}
        >
          <Brand logo={logo} name={card.organizationName} size={64} />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 500,
                opacity: 0.75,
              }}
            >
              {card.quizTitle}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: -1.5,
              }}
            >
              {card.name} dapat skor {percentage}
            </div>
            {rank ? (
              <div style={{ display: "flex" }}>
                <Pill
                  fontSize={24}
                  background="rgba(255,255,255,0.16)"
                  color="white"
                >
                  {rank}
                </Pill>
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex" }}>
            <Pill fontSize={26} background="white" color={colors.deep}>
              {challenge} →
            </Pill>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: 34,
              borderRadius: 999,
              background: "white",
              boxShadow: "0 40px 80px rgba(0,0,0,0.35)",
            }}
          >
            <ScoreRing
              value={percentage}
              size={330}
              stroke={26}
              color={colors.primary}
              track="#eceef1"
              textColor="#18181b"
              label="SKOR"
            />
          </div>
        </div>
      </div>,
      { width: 1200, height: 630, fonts },
    );
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        background: colors.background,
        fontFamily: "Plus Jakarta Sans, Noto Sans KR",
        color: "white",
        overflow: "hidden",
        // Stories overlay their own header and reply bar near the top and bottom edges.
        padding: "230px 90px 300px",
      }}
    >
      <Glow size={1100} top={-380} left={-420} />
      <Glow size={900} top={1280} left={420} />
      <Brand logo={logo} name={card.organizationName} size={88} center />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          marginTop: 56,
          flexShrink: 0,
          padding: "56px 56px 52px",
          borderRadius: 64,
          background: "white",
          color: "#18181b",
          boxShadow: "0 60px 120px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 4,
            color: colors.primary,
          }}
        >
          QUIZ ONLINE
        </div>
        <div
          style={{
            display: "flex",
            textAlign: "center",
            justifyContent: "center",
            fontSize: card.quizTitle.length > 32 ? 46 : 56,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1,
            marginTop: 18,
          }}
        >
          {card.quizTitle}
        </div>
        <div style={{ display: "flex", marginTop: 52 }}>
          <ScoreRing
            value={percentage}
            size={380}
            stroke={30}
            color={colors.primary}
            track="#eceef1"
            textColor="#18181b"
            label="SKOR"
          />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 54,
            fontWeight: 800,
            marginTop: 44,
          }}
        >
          {card.name}
        </div>
        {rank ? (
          <div style={{ display: "flex", marginTop: 22 }}>
            <Pill
              fontSize={32}
              background={`${colors.primary}18`}
              color={colors.deep}
            >
              {rank}
            </Pill>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 500,
            color: "#71717a",
            marginTop: 26,
          }}
        >
          {stats}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 58,
          fontWeight: 800,
          lineHeight: 1.25,
          marginTop: 56,
          flexShrink: 0,
          letterSpacing: -1,
        }}
      >
        {challenge}
      </div>
      <div style={{ display: "flex", marginTop: 34 }}>
        <Pill fontSize={30} background="white" color={colors.deep}>
          {card.quizLink}
        </Pill>
      </div>
    </div>,
    { width: 1080, height: 1920, fonts },
  );
}
