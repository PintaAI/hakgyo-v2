import Link from "next/link";

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
    <div className="bg-muted/30 min-h-screen">
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-5 py-4">
          <Link href="/" className="font-bold tracking-tight">
            Hakgyo
          </Link>
          <span className="text-muted-foreground text-sm">{title}</span>
          <nav
            className="ml-auto flex flex-wrap items-center gap-1"
            aria-label={`${title} navigation`}
          >
            {nav?.length ? <NavLinks items={nav} variant="primary" /> : null}
            <User {...userMenu} />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
