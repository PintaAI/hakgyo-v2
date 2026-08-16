export function getRequestedUserInfoClaims(value: string | undefined) {
  if (!value) return [];

  try {
    const claims = JSON.parse(value) as unknown;
    if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
      return [];
    }
    const userinfo = (claims as Record<string, unknown>).userinfo;
    if (!userinfo || typeof userinfo !== "object" || Array.isArray(userinfo)) {
      return [];
    }
    return Object.keys(userinfo).sort();
  } catch {
    return [];
  }
}
