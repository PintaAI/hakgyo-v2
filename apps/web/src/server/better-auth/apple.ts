import { createPrivateKey, sign } from "node:crypto";

import { env } from "~/env";

/** Bundle IDs of the iOS apps that sign in with Apple natively. */
export const appleBundleIds = [
  "com.rorez.hakgyo",
  "com.rorez.hakgyo.dev",
] as const;

const appleOrigin = "https://appleid.apple.com";

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

/** ES256 client secret JWT for Apple's token and revoke endpoints. */
function createAppleClientSecret(clientId: string) {
  if (!env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(
    JSON.stringify({ alg: "ES256", kid: env.APPLE_KEY_ID }),
  );
  const payload = base64url(
    JSON.stringify({
      iss: env.APPLE_TEAM_ID,
      iat: now,
      exp: now + 5 * 60,
      aud: appleOrigin,
      sub: clientId,
    }),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n")),
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${payload}.${base64url(signature)}`;
}

async function postAppleForm(path: string, body: Record<string, string>) {
  const response = await fetch(`${appleOrigin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!response.ok) {
    throw new Error(
      `Apple ${path} failed with ${response.status}: ${await response.text()}`,
    );
  }
  return response;
}

/**
 * Exchanges a fresh Sign in with Apple authorization code for tokens and
 * revokes them, as App Review requires when an Apple-linked account is
 * deleted (TN3194).
 */
export async function revokeAppleAuthorization(
  authorizationCode: string,
  clientId: string,
) {
  const clientSecret = createAppleClientSecret(clientId);
  if (!clientSecret) {
    console.error(
      "Apple token revocation skipped: APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY are not set",
    );
    return { revoked: false };
  }
  const tokenResponse = await postAppleForm("/auth/token", {
    client_id: clientId,
    client_secret: clientSecret,
    code: authorizationCode,
    grant_type: "authorization_code",
  });
  const tokens = (await tokenResponse.json()) as {
    refresh_token?: string;
    access_token?: string;
  };
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token) throw new Error("Apple did not return a token to revoke");
  await postAppleForm("/auth/revoke", {
    client_id: clientId,
    client_secret: clientSecret,
    token,
    token_type_hint: tokens.refresh_token ? "refresh_token" : "access_token",
  });
  return { revoked: true };
}
