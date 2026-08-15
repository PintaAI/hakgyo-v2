"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "./app-shell";

const styles = {
  primary:
    "text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm aria-[current=page]:bg-muted aria-[current=page]:text-foreground",
  secondary:
    "text-muted-foreground hover:text-foreground focus-visible:ring-ring relative -mb-px border-b-2 border-transparent py-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none aria-[current=page]:border-primary aria-[current=page]:text-foreground",
};

export function NavLinks({
  items,
  variant,
}: {
  items: NavItem[];
  variant: keyof typeof styles;
}) {
  const pathname = usePathname();
  const activeHref = items
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return items.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={activeHref === item.href ? "page" : undefined}
      className={styles[variant]}
    >
      {item.label}
    </Link>
  ));
}
