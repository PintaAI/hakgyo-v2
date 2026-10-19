"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isMaintenanceExemptPath } from "~/lib/maintenance-paths";

/**
 * Rendered by the root layout during `full` maintenance only: shows `page`
 * instead of the route's content, except on the sign-in and superadmin pages.
 * Layouts cannot read the pathname on the server, hence a client component.
 */
export function MaintenanceGate({
  page,
  children,
}: {
  page: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return isMaintenanceExemptPath(pathname) ? children : page;
}
