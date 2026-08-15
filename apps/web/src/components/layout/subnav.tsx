import { NavLinks } from "./nav-links";
import type { NavItem } from "./app-shell";

export function Subnav({
  nav,
  children,
}: {
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div
      data-subnav
      className="[&:has(>[data-subnav])>[data-subnav-rail]]:hidden"
    >
      <div
        data-subnav-rail
        className="mb-8 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <nav
          className="border-border flex min-w-max items-center gap-6 border-b"
          aria-label="Section navigation"
        >
          <NavLinks items={nav} variant="secondary" />
        </nav>
      </div>
      {children}
    </div>
  );
}
