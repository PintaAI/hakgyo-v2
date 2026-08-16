import { expo } from "@better-auth/expo";
import { cimd } from "@better-auth/cimd";
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { jwt } from "better-auth/plugins";

import { env } from "~/env";
import { getManagedProfileImageKey } from "~/lib/profile-image";
import { getAccountDeletionBlockers } from "~/server/account/deletion";
import { db } from "~/server/db";

const mcpOAuthScopes = ["openid", "profile", "hakgyo:mcp", "offline_access"];
const mcpResource = `${env.APP_URL}/api/mcp`;

async function configureCimdClient(client: {
  clientId: string;
  scopes?: string[];
}) {
  if (!client.scopes?.length) {
    await db.oauthClient.update({
      where: { clientId: client.clientId },
      data: { scopes: mcpOAuthScopes },
    });
    client.scopes = [...mcpOAuthScopes];
  }

  await db.oauthClientResource.upsert({
    where: { id: `${client.clientId}::${mcpResource}` },
    create: {
      id: `${client.clientId}::${mcpResource}`,
      clientId: client.clientId,
      resourceId: mcpResource,
    },
    update: {},
  });
}

export const auth = betterAuth({
  baseURL: env.APP_URL,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const blockers = await getAccountDeletionBlockers(user.id);
        if (blockers[0]) {
          throw new APIError("BAD_REQUEST", { message: blockers.join(" ") });
        }
      },
      afterDelete: async (user) => {
        const key = getManagedProfileImageKey(user.image, user.id);
        if (!key) return;
        try {
          const [{ DeleteObjectCommand }, { r2, r2Bucket }] = await Promise.all(
            [import("@aws-sdk/client-s3"), import("~/server/r2")],
          );
          await r2.send(
            new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }),
          );
        } catch (error) {
          console.error("Failed to remove deleted user's profile image", error);
        }
      },
    },
  },
  socialProviders: {
    google: {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
    },
  },
  trustedOrigins: [
    "hakgyo://",
    "hakgyo://*",
    ...(env.NODE_ENV === "development" ? ["exp://", "exp://**"] : []),
  ],
  plugins: [
    jwt(),
    oauthProvider({
      loginPage: "/",
      consentPage: "/oauth/consent",
      scopes: mcpOAuthScopes,
      resources: [
        {
          identifier: mcpResource,
          name: "Hakgyo MCP",
          allowedScopes: ["hakgyo:mcp"],
          accessTokenTtl: 15 * 60,
        },
      ],
      grantTypes: ["authorization_code", "refresh_token"],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultScopes: ["openid", "profile", "hakgyo:mcp"],
      clientRegistrationAllowedScopes: ["offline_access"],
      silenceWarnings: { oauthAuthServerConfig: true },
    }),
    cimd({
      onClientCreated: ({ client }) => configureCimdClient(client),
      onClientRefreshed: ({ client }) => configureCimdClient(client),
    }),
    expo(),
  ],
});

export type Session = typeof auth.$Infer.Session;
