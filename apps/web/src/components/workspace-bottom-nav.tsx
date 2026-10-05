"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  MenuIcon,
} from "lucide-react";

import { useSidebar } from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";

const itemClassName =
  "text-muted-foreground aria-[current=page]:text-foreground flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors";

/** Phone-only tab bar for the main workspace sections. The sidebar stays
 * reachable through the "Menu" tab for everything else. */
export function WorkspaceBottomNav({
  organizationSlug,
}: {
  organizationSlug: string;
}) {
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();
  const root = `/workspace/${organizationSlug}`;
  const items = [
    {
      title: "Dashboard",
      href: `${root}/dashboard`,
      icon: LayoutDashboardIcon,
    },
    { title: "Kurikulum", href: `${root}/courses`, icon: BookOpenIcon },
    {
      title: "Bahan ajar",
      href: `${root}/library/materials`,
      match: `${root}/library`,
      icon: LibraryIcon,
    },
    { title: "Review", href: `${root}/reviews`, icon: ClipboardCheckIcon },
  ];

  // The landing page editor is a full-screen surface with its own header.
  if (pathname.startsWith(`${root}/landing-page`)) return null;

  return (
    <nav
      aria-label="Navigasi utama"
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {items.map((item) => {
          const match = item.match ?? item.href;
          const active =
            !openMobile &&
            (pathname === match || pathname.startsWith(`${match}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={itemClassName}
            >
              <item.icon
                className={cn("size-5", active && "text-primary")}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-current={openMobile ? "page" : undefined}
          className={itemClassName}
        >
          <MenuIcon className="size-5" strokeWidth={1.75} />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
