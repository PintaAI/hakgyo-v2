/**
 * Pages that stay reachable during `full` maintenance: signing in (so a
 * superadmin can get a session) and the superadmin area.
 */
const MAINTENANCE_EXEMPT_PREFIXES = ["/auth", "/superadmin"];

export function isMaintenanceExemptPath(pathname: string | null) {
  if (!pathname) return false;
  return MAINTENANCE_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
