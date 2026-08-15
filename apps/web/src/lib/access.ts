export const organizationRoles = ["OWNER", "ADMIN", "TEACHER"] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export const organizationRoleHeader = "x-hakgyo-organization-role";

export function isOrganizationRole(
  value: string | null | undefined,
): value is OrganizationRole {
  return organizationRoles.some((role) => role === value);
}

const allOrganizationRoles: readonly OrganizationRole[] = organizationRoles;
const organizationManagers: readonly OrganizationRole[] = ["OWNER", "ADMIN"];
const workspaceSectionRoles: Readonly<
  Record<string, readonly OrganizationRole[]>
> = {
  dashboard: organizationManagers,
  members: organizationManagers,
  reviews: organizationManagers,
  settings: organizationManagers,
};

export const routeAccess = {
  signInPath: "/",
  postSignInPath: "/auth/continue",
  signedInFallbackPath: "/catalog",
  protectedPrefixes: [
    "/account",
    "/auth/continue",
    "/invite",
    "/learn",
    "/workspace",
  ],
  workspace: {
    defaultRoles: allOrganizationRoles,
    sectionRoles: workspaceSectionRoles,
    roleFallbackSection: {
      OWNER: "dashboard",
      ADMIN: "dashboard",
      TEACHER: "courses",
    } satisfies Record<OrganizationRole, string>,
  },
} as const;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedRoute(pathname: string) {
  return routeAccess.protectedPrefixes.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

export function getWorkspaceRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "workspace" || !segments[1]) return null;

  const section = segments[2];
  return {
    organizationId: segments[1],
    allowedRoles:
      (section && routeAccess.workspace.sectionRoles[section]) ??
      routeAccess.workspace.defaultRoles,
  };
}

export function getWorkspaceFallback(
  organizationId: string,
  role: OrganizationRole,
) {
  const section = routeAccess.workspace.roleFallbackSection[role];
  return `/workspace/${organizationId}/${section}`;
}

export function getSafeRedirectPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%5c/i.test(value) ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  const baseUrl = new URL("https://redirect.hakgyo.invalid");
  const resolved = new URL(value, baseUrl);
  if (resolved.origin !== baseUrl.origin) return null;

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export function getPostSignInPath(redirectTo?: string | null) {
  return getSafeRedirectPath(redirectTo) ?? routeAccess.postSignInPath;
}
