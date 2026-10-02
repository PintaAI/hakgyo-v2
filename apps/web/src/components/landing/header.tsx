import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { BrandLink } from "~/components/brand/brand-link";
import { ThemeToggle } from "~/components/theme-toggle";
import { buttonVariants } from "~/components/ui/button";

import { landingContainer } from "./layout";

/** The page header, laid over the opening slide. */
export function LandingHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div
        className={`${landingContainer} flex h-16 items-center justify-between gap-4 sm:h-20`}
      >
        <BrandLink />
        <nav
          aria-label="Navigasi utama"
          className="text-muted-foreground hidden items-center gap-8 text-sm md:flex"
        >
          <a href="#solusi" className="hover:text-foreground transition-colors">
            Fitur
          </a>
          <a
            href="#untuk-siapa"
            className="hover:text-foreground transition-colors"
          >
            Untuk siapa
          </a>
          <a href="#ai" className="hover:text-foreground transition-colors">
            AI
          </a>
          <a href="#faq" className="hover:text-foreground transition-colors">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/auth"
            className={buttonVariants({
              variant: "outline",
              className: "h-9 gap-2 px-3.5 sm:h-10 sm:gap-3 sm:px-5",
            })}
          >
            Masuk <ArrowUpRightIcon aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
