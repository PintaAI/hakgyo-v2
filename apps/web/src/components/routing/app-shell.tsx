import Link from "next/link";

import { NavLinks } from "./nav-links";

export type NavItem = { href: string; label: string };

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 min-h-screen">
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-5 py-4">
          <Link href="/" className="font-bold tracking-tight">
            Hakgyo
          </Link>
          <span className="text-muted-foreground text-sm">{title}</span>
          <nav
            className="ml-auto flex flex-wrap gap-1"
            aria-label={`${title} navigation`}
          >
            <NavLinks items={nav} variant="primary" />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}

export function Subnav({
  nav,
  children,
}: {
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav
        className="mb-6 flex flex-wrap gap-2 border-b pb-4"
        aria-label="Section navigation"
      >
        <NavLinks items={nav} variant="secondary" />
      </nav>
      {children}
    </div>
  );
}
