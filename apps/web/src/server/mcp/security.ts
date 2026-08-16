export function validateMcpRequestBoundary(
  request: Request,
  canonicalResource: string,
) {
  const canonical = new URL(canonicalResource);
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const effectiveHost = forwardedHost ?? requestUrl.host;

  if (effectiveHost !== canonical.host) return "Invalid host";
  if (origin && origin !== canonical.origin) return "Invalid origin";
  return null;
}
