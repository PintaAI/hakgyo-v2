import type { ReactNode } from "react";

import Link from "~/components/link";

import { landingContainer } from "./layout";

/** The page footer, on the primary colour of the closing slide. */
export function LandingFooter({
  note,
}: {
  /** Small print under the links, such as a licence attribution. */
  note?: ReactNode;
}) {
  return (
    <footer className={`${landingContainer} pb-8 sm:pb-10 lg:pb-24`}>
      <div className="border-primary-foreground/20 flex flex-col justify-between gap-4 border-t pt-6 text-sm sm:flex-row sm:items-center sm:gap-6 sm:pt-8">
        <p className="font-semibold tracking-[-0.04em]">hakgyo</p>
        <nav
          aria-label="Navigasi footer"
          className="flex flex-wrap gap-6 opacity-80"
        >
          <Link href="/catalog" className="hover:opacity-100">
            Katalog
          </Link>
          <Link href="/docs" className="hover:opacity-100">
            Panduan
          </Link>
          <Link href="/privacy" className="hover:opacity-100">
            Privasi
          </Link>
          <Link href="/terms" className="hover:opacity-100">
            Ketentuan
          </Link>
          <Link href="/support" className="hover:opacity-100">
            Bantuan
          </Link>
          <Link href="/auth" className="hover:opacity-100">
            Masuk
          </Link>
        </nav>
        <p className="opacity-70">© {new Date().getFullYear()} Hakgyo</p>
      </div>
      {note ? (
        <p className="mt-4 max-w-3xl text-xs leading-5 opacity-60">{note}</p>
      ) : null}
    </footer>
  );
}
