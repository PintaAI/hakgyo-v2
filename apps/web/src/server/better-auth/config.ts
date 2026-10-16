import { expo } from "@better-auth/expo";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { after } from "next/server";

import { env } from "~/env";
import { getManagedProfileImageKey } from "~/lib/profile-image";
import { getAccountDeletionBlockers } from "~/server/account/deletion";
import { appleBundleIds } from "~/server/better-auth/apple";
import { routeVerificationLink } from "~/server/better-auth/verification-link";
import { db } from "~/server/db";
import { sendEmail } from "~/server/email/send";
import {
  existingAccountEmail,
  passwordResetEmail,
  verificationEmail,
} from "~/server/email/templates";
import { ensureHangeulMasteryEnrollment } from "~/server/foundation/hangeul-mastery";

const mcpOAuthScopes = ["openid", "profile", "hakgyo:mcp", "offline_access"];
const mcpResource = `${env.APP_URL}/api/mcp`;

/**
 * Runs Better Auth's background work, including every email send, after the
 * response. Awaiting Resend would make password reset requests for registered
 * emails measurably slower than for unknown ones. Outside a Next.js request
 * (scripts, tests) `after` throws, so the task just runs unawaited.
 */
function runAfterResponse(task: Promise<unknown>) {
  const settled = task.catch((error: unknown) => {
    console.error("Better Auth background task failed", error);
  });
  try {
    after(settled);
  } catch {
    void settled;
  }
}

export const auth = betterAuth({
  baseURL: env.APP_URL,
  advanced: {
    // Load session + user in one query instead of two sequential lookups.
    database: { joins: true },
    backgroundTasks: { handler: runAfterResponse },
  },
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  session: {
    // Every page render and API call reads the session. The signed cookie
    // cache answers those without a database query for 5 minutes, so a revoked
    // session or a suspension can take up to that long to apply. nextCookies
    // (below) lets tRPC requests re-issue it and extend the session.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureHangeulMasteryEnrollment(user.id);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { suspendedAt: true, deletedAt: true },
          });
          if (user?.suspendedAt || user?.deletedAt) {
            throw new APIError("FORBIDDEN", {
              message: "Akun ini tidak aktif.",
            });
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Sign-up creates no session until the address is confirmed. Google and
    // Apple already report verified emails, and the seeded accounts are verified.
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    // A reset usually means the old password may be known to someone else.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        passwordResetEmail({ to: user.email, name: user.name, url }),
      );
    },
    // Opening the reset link proves the user owns the inbox.
    onPasswordReset: async ({ user }) => {
      if (user.emailVerified) return;
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    },
    // Sign-up answers an existing email like a new one so it does not reveal
    // which addresses are registered; tell the owner instead.
    onExistingUserSignUp: async ({ user }) => {
      await sendEmail(
        existingAccountEmail({
          to: user.email,
          name: user.name,
          signInUrl: `${env.APP_URL}/auth`,
          resetUrl: `${env.APP_URL}/auth/forgot-password`,
        }),
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // A signed-in unverified user can never exist, so also resend on a blocked
    // sign-in; it covers lost or expired links.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }, request) => {
      await sendEmail(
        verificationEmail({
          to: user.email,
          name: user.name,
          url: routeVerificationLink(url, request),
        }),
      );
    },
  },
  user: {
    // Returned with every session so request auth can reject inactive accounts without another query.
    additionalFields: {
      suspendedAt: { type: "date", required: false, input: false },
      deletedAt: { type: "date", required: false, input: false },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const blockers = await getAccountDeletionBlockers(user.id);
        if (blockers[0]) {
          throw new APIError("BAD_REQUEST", { message: blockers.join(" ") });
        }
      },
      afterDelete: async (user) => {
        const { disableAllUserTargets } =
          await import("~/server/notifications/dispatch");
        await disableAllUserTargets(user.id, "account deleted").catch(
          (error) => {
            console.error("Failed to disable push targets on delete", error);
          },
        );
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
    // Native Sign in with Apple only: the iOS app sends Apple's identity
    // token, which is verified against the app bundle IDs. No web redirect
    // flow, so no client secret is needed here.
    apple: {
      clientId: appleBundleIds[0],
      clientSecret: "",
      audience: [...appleBundleIds],
    },
  },
  trustedOrigins: [
    "hakgyo://",
    "hakgyo://*",
    ...(env.NODE_ENV === "development" ? ["exp://", "exp://**"] : []),
  ],
  plugins: [
    // Server-side getSession calls discard the `set-auth-jwt` header, and signing it costs a JWKS
    // read plus a signature per request. MCP/OAuth token signing is unaffected.
    jwt({ disableSettingJwtHeader: true }),
    mcp({
      // The sign-in page must keep the signed OAuth query in its URL so the
      // client can resume authorization after sign-in.
      loginPage: "/auth",
      consentPage: "/oauth/consent",
      resource: mcpResource,
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
      clientRegistrationDefaultScopes: ["openid", "profile", "hakgyo:mcp"],
      clientRegistrationAllowedScopes: ["offline_access"],
    }),
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
    }),
    expo(),
    // Writes cookies refreshed by server-side getSession calls (tRPC, route
    // handlers) to the response. Must stay last.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
