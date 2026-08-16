import { headers } from "next/headers";

import { OAuthConsent } from "~/components/oauth-consent";
import { getRequestedUserInfoClaims } from "~/lib/oauth-claims";
import { auth } from "~/server/better-auth";
import { requireSession } from "~/server/auth/dal";

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{
    claims?: string;
    client_id?: string;
    scope?: string;
  }>;
}) {
  const [query, requestHeaders] = await Promise.all([searchParams, headers()]);
  await requireSession();

  const clientId = query.client_id ?? "Unknown OAuth client";
  const scopes = (query.scope ?? "hakgyo:mcp").split(" ").filter(Boolean);
  let clientName = "AI client";

  if (query.client_id) {
    const client = await auth.api.getOAuthClientPublic({
      headers: requestHeaders,
      query: { client_id: query.client_id },
    });
    if (typeof client.client_name === "string") {
      clientName = client.client_name;
    }
  }

  return (
    <OAuthConsent
      claims={query.claims}
      clientId={clientId}
      clientName={clientName}
      scopes={scopes}
      userInfoClaims={getRequestedUserInfoClaims(query.claims)}
    />
  );
}
