import Link from "next/link";
import { GraduationCapIcon } from "lucide-react";

import { User, type UserProps } from "~/components/user";
import { NavLinks } from "./nav-links";

export type NavItem = { href: string; label: string };

export function AppShell({
  title,
  nav,
  userMenu,
  children,
}: {
  title: string;
  nav?: NavItem[];
  userMenu?: UserProps;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 flex min-h-screen flex-col">
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Beranda Hakgyo"
          >
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6">
              <GraduationCapIcon className="size-4.5" />
            </span>
            <span className="text-lg font-bold tracking-tight">Hakgyo</span>
          </Link>

          <span
            className="bg-border/70 hidden h-6 w-px sm:block"
            aria-hidden="true"
          />
          <span className="text-muted-foreground hidden text-sm sm:block">
            {title}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-4">
            {nav?.length ? (
              <nav
                className="flex items-center gap-6"
                aria-label={`Navigasi ${title}`}
              >
                <NavLinks items={nav} variant="secondary" />
              </nav>
            ) : null}
            <User {...userMenu} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">
        {children}
      </main>
    </div>
  );
}
