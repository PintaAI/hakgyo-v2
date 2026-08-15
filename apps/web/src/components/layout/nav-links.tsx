"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "./app-shell";

const styles = {
  primary:
    "text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-2 text-sm aria-[current=page]:bg-muted aria-[current=page]:text-foreground",
  secondary:
    "bg-background ring-border hover:bg-muted rounded-md px-3 py-2 text-sm shadow-sm ring-1 aria-[current=page]:bg-foreground aria-[current=page]:text-background",
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
