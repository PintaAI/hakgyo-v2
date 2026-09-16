import { z } from "zod";

export const landingSectionIds = [
  "courses",
  "about",
  "features",
  "testimonials",
  "faq",
  "contact",
] as const;
export type LandingSectionId = (typeof landingSectionIds)[number];

const reservedSlugs = new Set([
  "api",
  "auth",
  "catalog",
  "learn",
  "workspace",
  "oauth",
  "notifications",
  "docs",
  "invite",
  "onboarding",
  "organizations",
  "superadmin",
  "serwist",
  "theme-debug",
  "conversation-block-preview",
  "_next",
  "assets",
  "images",
  "fonts",
]);
export const organizationPublicSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine(
    (value) => !reservedSlugs.has(value),
    "This slug is reserved by Hakgyo",
  );

// No HTML, scripts, protocol-relative URLs, or arbitrary URL schemes in public links.
const webUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Enter an http:// or https:// URL");
const actionUrl = z.union([
  webUrl,
  z.literal("#courses"),
  z.literal("#contact"),
]);
const shortText = z.string().trim().max(160);
const section = z.enum(landingSectionIds);
export const landingDesignSchema = z.object({
  heroLayout: z.enum(["editorial", "split", "cover"]).default("editorial"),
  courseLayout: z.enum(["grid", "list"]).default("grid"),
  palette: z.enum(["brand", "paper", "ink"]).default("paper"),
  headingFont: z.enum(["brand", "serif", "sans"]).default("serif"),
  headingScale: z.number().min(0.8).max(1.3).default(1),
  spacing: z.enum(["compact", "balanced", "airy"]).default("balanced"),
  corners: z.enum(["sharp", "soft", "round"]).default("sharp"),
  imagePosition: z.number().min(0).max(100).default(50),
});
export type LandingDesign = z.infer<typeof landingDesignSchema>;
export const organizationLandingConfigSchema = z.object({
  design: landingDesignSchema.default(() => landingDesignSchema.parse({})),
  eyebrow: shortText,
  headline: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000),
  heroImageUrl: webUrl,
  ctaLabel: z.string().trim().min(1).max(60),
  ctaUrl: actionUrl,
  aboutTitle: shortText,
  aboutDescription: z.string().trim().max(5000),
  coursesTitle: shortText.default("Temukan kelas untukmu"),
  coursesDescription: z
    .string()
    .trim()
    .max(1000)
    .default("Pilih kelas yang sesuai dengan tujuan belajarmu."),
  testimonialsTitle: shortText.default("Cerita dari peserta"),
  faqTitle: shortText.default("Pertanyaan yang sering diajukan"),
  featuresTitle: shortText,
  features: z
    .array(
      z.object({ title: shortText, description: z.string().trim().max(600) }),
    )
    .max(12),
  testimonials: z
    .array(
      z.object({
        quote: z.string().trim().max(1200),
        name: shortText,
        role: shortText,
      }),
    )
    .max(12),
  faq: z
    .array(
      z.object({
        question: z.string().trim().max(240),
        answer: z.string().trim().max(2000),
      }),
    )
    .max(20),
  contactTitle: shortText,
  contactDescription: z.string().trim().max(1000),
  contactEmail: z.union([z.literal(""), z.email().max(254)]),
  contactUrl: webUrl,
  sectionOrder: z
    .array(section)
    .length(landingSectionIds.length)
    .refine(
      (value) => new Set(value).size === landingSectionIds.length,
      "Include each section exactly once",
    ),
  hiddenSections: z
    .array(section)
    .max(landingSectionIds.length)
    .refine(
      (value) => new Set(value).size === value.length,
      "Sections must be unique",
    ),
  selectedCourseIds: z
    .array(z.string().min(1).max(128))
    .max(200)
    .refine(
      (value) => new Set(value).size === value.length,
      "Courses must be unique",
    ),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170),
  socialImageUrl: webUrl,
});
export type OrganizationLandingConfig = z.infer<
  typeof organizationLandingConfigSchema
>;

export function createDefaultOrganizationLandingConfig(
  name: string,
): OrganizationLandingConfig {
  return {
    design: landingDesignSchema.parse({}),
    eyebrow: "Babak baru dimulai di sini",
    headline: `Bertumbuh bersama ${name}`.slice(0, 160),
    description:
      "Temukan kelas untuk membangun kepercayaan diri, membuka kemungkinan baru, dan melangkah menuju tujuanmu.",
    heroImageUrl: "",
    ctaLabel: "Jelajahi course",
    ctaUrl: "#courses",
    coursesTitle: "Temukan kelas untukmu",
    coursesDescription: "Pilih kelas yang sesuai dengan tujuan belajarmu.",
    testimonialsTitle: "Cerita dari peserta",
    faqTitle: "Pertanyaan yang sering diajukan",
    aboutTitle: "Langkah berikutnya, bersama",
    aboutDescription: "",
    featuresTitle: "Ruang untuk tumbuh lebih jauh",
    features: [],
    testimonials: [],
    faq: [],
    contactTitle: "Temukan langkah berikutnya",
    contactDescription:
      "Ada pertanyaan tentang kelas kami? Kami siap membantu.",
    contactEmail: "",
    contactUrl: "",
    sectionOrder: [...landingSectionIds],
    hiddenSections: [],
    selectedCourseIds: [],
    seoTitle: "",
    seoDescription: "",
    socialImageUrl: "",
  };
}
