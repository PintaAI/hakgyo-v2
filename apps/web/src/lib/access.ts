export const organizationRoles = ["OWNER", "ADMIN", "TEACHER"] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export function isOrganizationRole(
  value: string | null | undefined,
): value is OrganizationRole {
  return organizationRoles.some((role) => role === value);
}

const allOrganizationRoles: readonly OrganizationRole[] = organizationRoles;
export const organizationManagerRoles: readonly OrganizationRole[] = [
  "OWNER",
  "ADMIN",
];
const workspaceSectionRoles: Readonly<
  Record<string, readonly OrganizationRole[]>
> = {
  dashboard: organizationManagerRoles,
  members: organizationManagerRoles,
  reviews: allOrganizationRoles,
  settings: organizationManagerRoles,
};

export const routeAccess = {
  signInPath: "/auth",
  postSignInPath: "/auth/continue",
  signedInFallbackPath: "/onboarding",
  protectedPrefixes: [
    "/auth/continue",
    "/docs",
    "/learn",
    "/onboarding",
    "/organizations",
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
    organizationSlug: segments[1],
    allowedRoles:
      (section && routeAccess.workspace.sectionRoles[section]) ??
      routeAccess.workspace.defaultRoles,
  };
}

export function getWorkspaceFallback(
  organizationSlug: string,
  role: OrganizationRole,
) {
  const section = routeAccess.workspace.roleFallbackSection[role];
  return `/workspace/${organizationSlug}/${section}`;
}

const redirectParsingBase = "https://redirect.invalid";

export function getSafeRedirectPath(
  value: string | null | undefined,
  disallowedPaths: readonly string[] = [],
) {
  if (
    !value ||
    !/^\/(?!\/)/.test(value) ||
    /[\\\u0000-\u001f\u007f]/.test(value) ||
    /%5c/i.test(value) ||
    value.length > 4096
  ) {
    return null;
  }

  const resolved = URL.parse(value, redirectParsingBase);
  if (
    resolved?.origin !== redirectParsingBase ||
    disallowedPaths.includes(resolved.pathname)
  ) {
    return null;
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export function getPostSignInPath(redirectTo?: string | null) {
  return getSafeRedirectPath(redirectTo) ?? routeAccess.postSignInPath;
}
