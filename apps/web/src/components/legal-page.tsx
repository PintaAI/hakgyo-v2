import type { ReactNode } from "react";

import { BrandLink } from "~/components/brand/brand-link";
import { landingContainer } from "~/components/landing/layout";
import { ThemeToggle } from "~/components/theme-toggle";

/** Shared layout for the privacy, terms and support pages. */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh">
      <header
        className={`${landingContainer} flex h-16 items-center justify-between gap-4 sm:h-20`}
      >
        <BrandLink />
        <ThemeToggle />
      </header>
      <main
        className={`${landingContainer} text-muted-foreground grid max-w-3xl gap-10 pt-8 pb-24 text-[15px] leading-7 sm:pt-14 2xl:max-w-3xl`}
      >
        <div className="grid gap-3">
          <h1 className="text-foreground text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
            {title}
          </h1>
          {intro}
        </div>
        {children}
      </main>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-foreground text-xl font-medium tracking-[-0.03em]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-2 pl-5">{children}</ul>;
}

export function EmailLink({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="text-foreground font-medium underline underline-offset-4"
    >
      {email}
    </a>
  );
}
