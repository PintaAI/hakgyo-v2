import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Plus } from "lucide-react";
import {
  createOrganizationThemeTokens,
  DEFAULT_ORGANIZATION_THEME,
} from "~/lib/organization-theme";
import type { PublicOrganizationLanding } from "~/server/organization-landing/service";
import type { LandingSectionId } from "~/lib/organization-landing";
import { cn } from "~/lib/utils";
import styles from "./organization-landing.module.css";

export type OrganizationLandingPageData = Pick<
  PublicOrganizationLanding,
  "organization" | "config" | "courses"
>;
const fontFamilies = {
  geist: "var(--font-geist-sans)",
  inter: "var(--font-inter)",
  poppins: "var(--font-poppins)",
  merriweather: "var(--font-merriweather)",
  jetbrains: "var(--font-jetbrains-mono)",
};
function priceLabel(price: number, currency: string) {
  if (!price) return "Gratis";
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

export function OrganizationLandingPage({
  data,
  preview = false,
}: {
  data: OrganizationLandingPageData;
  preview?: boolean;
}) {
  const { organization, config } = data;
  const design = config.design;
  const theme =
    organization.themeEnabled && organization.theme
      ? organization.theme
      : DEFAULT_ORGANIZATION_THEME;
  const tokens = createOrganizationThemeTokens(
    theme,
    design.palette === "ink" ? "dark" : "light",
  );
  const courses = config.hiddenSections.includes("courses")
    ? []
    : config.selectedCourseIds.length
      ? config.selectedCourseIds.flatMap((id) =>
          data.courses.filter((c) => c.id === id),
        )
      : data.courses;
  const visible = (id: LandingSectionId) => !config.hiddenSections.includes(id);
  const heroImage =
    config.heroImageUrl ||
    courses.find((course) => course.thumbnailUrl)?.thumbnailUrl;
  const style = {
    "--lp-bg": design.palette === "paper" ? "#f5f2eb" : tokens.background,
    "--lp-fg": design.palette === "paper" ? "#252b28" : tokens.foreground,
    "--lp-muted":
      design.palette === "paper" ? "#6f756e" : tokens.mutedForeground,
    "--lp-accent": tokens.primary,
    "--lp-on-accent": tokens.primaryForeground,
    "--lp-line": design.palette === "paper" ? "#d8dbd1" : tokens.border,
    "--lp-heading":
      design.headingFont === "serif"
        ? "var(--font-merriweather), Georgia, serif"
        : design.headingFont === "sans"
          ? "var(--font-inter), sans-serif"
          : fontFamilies[theme.font],
    "--lp-body": fontFamilies[theme.font],
    "--lp-scale": design.headingScale,
    "--lp-space":
      design.spacing === "compact"
        ? "56px"
        : design.spacing === "airy"
          ? "120px"
          : "88px",
    "--lp-radius":
      design.corners === "sharp"
        ? "0px"
        : design.corners === "soft"
          ? "12px"
          : "28px",
    "--lp-position": `${design.imagePosition}%`,
    colorScheme: design.palette === "ink" ? "dark" : "light",
  } as CSSProperties;
  const sectionHasContent = {
    courses: true,
    about: !!config.aboutDescription,
    features: !!config.features.length,
    testimonials: !!config.testimonials.length,
    faq: !!config.faq.length,
    contact: true,
  };
  const visibleSections = config.sectionOrder.filter(
    (id) => visible(id) && (preview || sectionHasContent[id]),
  );
  const heading = (
    section: LandingSectionId,
    label: string,
    title: string,
    description?: string,
  ) => (
    <div className={styles.sectionHeading}>
      <p className={styles.kicker}>
        <span>
          {String(visibleSections.indexOf(section) + 1).padStart(2, "0")}
        </span>
        {label}
      </p>
      <h2>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
  const empty = (label: string) =>
    preview ? (
      <p className={styles.empty}>Klik bagian ini untuk menambahkan {label}.</p>
    ) : null;
  const sections: Record<LandingSectionId, ReactNode> = {
    courses: (
      <>
        {heading(
          "courses",
          "Pilihan kelas",
          config.coursesTitle,
          config.coursesDescription,
        )}
        <div
          className={cn(
            styles.courses,
            design.courseLayout === "list" && styles.courseList,
          )}
        >
          {courses.map((course, index) => (
            <Link
              href={`/catalog/${course.id}`}
              key={course.id}
              className={styles.course}
            >
              <div className={styles.courseImage}>
                {course.thumbnailUrl ? (
                  <Image
                    src={course.thumbnailUrl}
                    alt=""
                    width={720}
                    height={540}
                    unoptimized
                  />
                ) : (
                  <div className={styles.coursePoster}>
                    <span>{organization.name}</span>
                    <span className={styles.posterLetter}>
                      {course.title
                        .split(" ")
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span>PROGRAM {String(index + 1).padStart(2, "0")}</span>
                  </div>
                )}
              </div>
              <div className={styles.courseBody}>
                <div className={styles.courseMeta}>
                  <span>COURSE / {String(index + 1).padStart(2, "0")}</span>
                  <span>{priceLabel(course.price, course.currency)}</span>
                </div>
                <h3>{course.title}</h3>
                {course.description && <p>{course.description}</p>}
                <span className={styles.courseLink}>
                  Lihat program <ArrowUpRight size={18} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        {!courses.length && (
          <p className={styles.empty}>
            Program baru sedang disiapkan. Hubungi kami untuk informasi kelas
            berikutnya.
          </p>
        )}
      </>
    ),
    about:
      config.aboutDescription || preview ? (
        <div className={styles.about}>
          {heading("about", "Tentang kami", config.aboutTitle)}
          <div>
            <div className={styles.story}>
              {config.aboutDescription || empty("cerita organisasi")}
            </div>
            <div className={styles.signature}>
              {organization.logoUrl ? (
                <Image
                  src={organization.logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                />
              ) : (
                <span className={styles.monogram}>{organization.name[0]}</span>
              )}
              <span>
                {organization.name}
                <small>Belajar, bersama.</small>
              </span>
            </div>
          </div>
        </div>
      ) : null,
    features:
      config.features.length || preview ? (
        <>
          {heading("features", "Pendekatan kami", config.featuresTitle)}
          <div className={styles.features}>
            {config.features.map((item, index) => (
              <article key={index}>
                <span className={styles.featureNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          {!config.features.length && empty("keunggulan")}
        </>
      ) : null,
    testimonials:
      config.testimonials.length || preview ? (
        <>
          {heading("testimonials", "Dari peserta", config.testimonialsTitle)}
          <div className={styles.quotes}>
            {config.testimonials.map((item, index) => (
              <figure key={index}>
                <span className={styles.quoteMark}>“</span>
                <blockquote>{item.quote}</blockquote>
                <figcaption>
                  {item.name}
                  <small>{item.role}</small>
                </figcaption>
              </figure>
            ))}
          </div>
          {!config.testimonials.length && empty("testimoni")}
        </>
      ) : null,
    faq:
      config.faq.length || preview ? (
        <div className={styles.faq}>
          {heading("faq", "Informasi kelas", config.faqTitle)}
          <div>
            {config.faq.map((item, index) => (
              <details key={index}>
                <summary>
                  {item.question}
                  <Plus size={18} />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
            {!config.faq.length && empty("pertanyaan umum")}
          </div>
        </div>
      ) : null,
    contact: (
      <div className={styles.contact}>
        <p className={styles.kicker}>MULAI DARI SINI</p>
        <h2>{config.contactTitle}</h2>
        <div className={styles.contactBottom}>
          <p>{config.contactDescription}</p>
          {config.contactUrl || config.contactEmail ? (
            <a
              className={styles.contactLink}
              href={config.contactUrl || `mailto:${config.contactEmail}`}
            >
              Mari bicara <ArrowUpRight />
            </a>
          ) : (
            visible("courses") && (
              <a className={styles.contactLink} href="#courses">
                Temukan kelasmu <ArrowUpRight />
              </a>
            )
          )}
        </div>
        {config.contactEmail && config.contactUrl && (
          <a className={styles.email} href={`mailto:${config.contactEmail}`}>
            {config.contactEmail}
          </a>
        )}
      </div>
    ),
  };
  return (
    <div
      className={styles.page}
      style={style}
      data-landing-preview={preview || undefined}
    >
      <a className={styles.skip} href="#landing-content">
        Lewati ke konten
      </a>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a className={styles.brand} href={`/${organization.slug}`}>
            {organization.logoUrl ? (
              <Image
                src={organization.logoUrl}
                alt=""
                width={40}
                height={40}
                unoptimized
              />
            ) : (
              <span className={styles.monogram}>
                {organization.name.slice(0, 1)}
              </span>
            )}
            <span>{organization.name}</span>
          </a>
          <nav aria-label="Navigasi organisasi">
            {visible("about") && config.aboutDescription && (
              <a href="#about">Tentang kami</a>
            )}
            {visible("courses") && (
              <a href="#courses">
                Program <ArrowUpRight size={15} />
              </a>
            )}
          </nav>
        </header>
        <main id="landing-content">
          <section
            tabIndex={preview ? 0 : undefined}
            aria-label={preview ? "Edit Hero" : undefined}
            data-landing-section="hero"
            id="hero"
            className={cn(
              styles.hero,
              styles[design.heroLayout],
              !heroImage && styles.withoutImage,
            )}
          >
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>
                <span className={styles.dot} />
                {config.eyebrow || organization.name}
              </p>
              <h1
                data-edit-field="headline"
                contentEditable={preview ? "plaintext-only" : undefined}
                suppressContentEditableWarning
                aria-label={preview ? "Edit judul langsung" : undefined}
              >
                {config.headline}
              </h1>
              <div className={styles.heroBottom}>
                <p
                  data-edit-field="description"
                  contentEditable={preview ? "plaintext-only" : undefined}
                  suppressContentEditableWarning
                  aria-label={preview ? "Edit deskripsi langsung" : undefined}
                >
                  {config.description}
                </p>
                <a className={styles.cta} href={config.ctaUrl || "#courses"}>
                  {config.ctaLabel}
                  <ArrowUpRight size={20} />
                </a>
              </div>
            </div>
            {heroImage ? (
              <div className={styles.heroImage}>
                <Image
                  src={heroImage}
                  alt={`Belajar bersama ${organization.name}`}
                  width={1600}
                  height={1100}
                  unoptimized
                  priority
                />
                <span className={styles.imageCaption}>
                  {organization.name} <ArrowDown size={16} />
                </span>
              </div>
            ) : (
              <div className={styles.typographicArt} aria-hidden="true">
                <span>{organization.name}</span>
                <strong>
                  {organization.name
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")}
                </strong>
                <span>
                  RUANG UNTUK BERTUMBUH <ArrowUpRight size={26} />
                </span>
              </div>
            )}
            <div className={styles.heroIndex}>
              <span>{organization.name.toUpperCase()}</span>
              <span>
                {courses.length
                  ? `${String(courses.length).padStart(2, "0")} PROGRAM TERSEDIA`
                  : "TEMUKAN LANGKAH BERIKUTNYA"}
              </span>
              <ArrowDown size={16} />
            </div>
          </section>
          {config.sectionOrder.map(
            (id) =>
              visible(id) &&
              sections[id] && (
                <section
                  tabIndex={preview ? 0 : undefined}
                  aria-label={preview ? `Edit ${id}` : undefined}
                  key={id}
                  id={id}
                  data-landing-section={id}
                  className={cn(
                    styles.section,
                    id === "contact" && styles.contactSection,
                  )}
                >
                  {sections[id]}
                </section>
              ),
          )}
        </main>
        <footer className={styles.footer}>
          <a className={styles.footerBrand} href={`/${organization.slug}`}>
            {organization.name}
            <ArrowUpRight />
          </a>
          <div>
            <span>
              © {new Date().getFullYear()} {organization.name}
            </span>
            <Link href="/">Made with Hakgyo</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
