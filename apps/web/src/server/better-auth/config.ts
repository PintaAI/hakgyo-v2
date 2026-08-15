import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "~/env";
import { getManagedProfileImageKey } from "~/lib/profile-image";
import { getAccountDeletionBlockers } from "~/server/account/deletion";
import { db } from "~/server/db";

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
  plugins: [expo()],
});

export type Session = typeof auth.$Infer.Session;
