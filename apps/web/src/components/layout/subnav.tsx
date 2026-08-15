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
