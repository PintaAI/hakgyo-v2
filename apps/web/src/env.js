import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    // Bearer token the scheduled GitHub workflow sends to /api/cron/* routes. Optional so a deploy
    // without it still builds; cron routes reject every request until set.
    CRON_SECRET: z.string().min(1).optional(),
    APP_URL: z
      .string()
      .url()
      .refine((url) => !url.endsWith("/"), {
        message: "APP_URL must not have a trailing slash",
      })
      .refine(
        (value) => {
          const url = new URL(value);
          return url.pathname === "/" && !url.search && !url.hash;
        },
        { message: "APP_URL must be an origin without a path, query, or hash" },
      )
      .refine(
        (value) =>
          process.env.NODE_ENV !== "production" ||
          new URL(value).protocol === "https:",
        { message: "APP_URL must use HTTPS in production" },
      ),
    BETTER_AUTH_GOOGLE_CLIENT_ID: z.string(),
    BETTER_AUTH_GOOGLE_CLIENT_SECRET: z.string(),
    // Sign in with Apple key, used to revoke Apple tokens when an account is deleted.
    APPLE_TEAM_ID: z.string().min(1).optional(),
    APPLE_KEY_ID: z.string().min(1).optional(),
    APPLE_PRIVATE_KEY: z.string().min(1).optional(),
    SUPERADMIN_EMAILS: z.string().default(""),
    // Token from the OpenAI plugin dashboard, served at /.well-known/openai-apps-challenge to
    // verify that we own the MCP server domain. The route returns 404 until set.
    OPENAI_APPS_CHALLENGE_TOKEN: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ELEVENLABS_API_KEY: z.string().min(1).optional(),
    // Resend API key and the verified sender used for account emails (verification, password reset).
    // Required in production: Better Auth only logs a failed send, so a missing key would otherwise
    // tell users an email is on its way that never arrives. Development logs the email instead.
    RESEND_API_KEY:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    EMAIL_FROM:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    // Max connections per server instance in the Neon adapter pool.
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    CLOUDFLARE_R2_ENDPOINT: z.string().url(),
    CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
    CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1),
    CLOUDFLARE_R2_PUBLIC_URL: z
      .string()
      .url()
      .default("https://pub-3fd0ad0a99684361b69ca3270ed168c8.r2.dev"),
    ZOOM_CLIENT_ID: z.string().min(1),
    ZOOM_CLIENT_SECRET: z.string().min(1),
    ZOOM_TOKEN_ENCRYPTION_KEY: z.string().base64(),
    // WhatsApp groups for cohorts through Hakgyo's Evolution API server (docs/whatsapp.md).
    // Optional: the WhatsApp integration stays hidden until all four are set.
    EVOLUTION_API_URL: z
      .string()
      .url()
      .refine((url) => !url.endsWith("/"), {
        message: "EVOLUTION_API_URL must not have a trailing slash",
      })
      .optional(),
    EVOLUTION_API_KEY: z.string().min(1).optional(),
    WHATSAPP_WEBHOOK_SECRET: z.string().min(16).optional(),
    WHATSAPP_TOKEN_ENCRYPTION_KEY: z.string().base64().optional(),
    VAPID_PRIVATE_KEY: z.string().min(1).optional(),
    VAPID_CONTACT_EMAIL: z.string().email().optional(),
    EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
    // Maintenance mode (docs/maintenance.md), read through `~/server/maintenance`. Change on
    // Vercel and redeploy to toggle.
    MAINTENANCE_MODE: z
      .enum(["off", "scheduled", "read_only", "full"])
      .default("off"),
    MAINTENANCE_MESSAGE: z.string().trim().min(1).max(500).optional(),
    MAINTENANCE_STARTS_AT: z.string().datetime({ offset: true }).optional(),
    MAINTENANCE_UNTIL: z.string().datetime({ offset: true }).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    APP_URL: process.env.APP_URL,
    BETTER_AUTH_GOOGLE_CLIENT_ID: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID,
    BETTER_AUTH_GOOGLE_CLIENT_SECRET:
      process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
    APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
    APPLE_KEY_ID: process.env.APPLE_KEY_ID,
    APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
    SUPERADMIN_EMAILS: process.env.SUPERADMIN_EMAILS,
    OPENAI_APPS_CHALLENGE_TOKEN: process.env.OPENAI_APPS_CHALLENGE_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
    CLOUDFLARE_R2_ENDPOINT: process.env.CLOUDFLARE_R2_ENDPOINT,
    CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY:
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    CLOUDFLARE_R2_PUBLIC_URL: process.env.CLOUDFLARE_R2_PUBLIC_URL,
    ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET,
    ZOOM_TOKEN_ENCRYPTION_KEY: process.env.ZOOM_TOKEN_ENCRYPTION_KEY,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
    WHATSAPP_WEBHOOK_SECRET: process.env.WHATSAPP_WEBHOOK_SECRET,
    WHATSAPP_TOKEN_ENCRYPTION_KEY: process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_CONTACT_EMAIL: process.env.VAPID_CONTACT_EMAIL,
    EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN,
    MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
    MAINTENANCE_MESSAGE: process.env.MAINTENANCE_MESSAGE,
    MAINTENANCE_STARTS_AT: process.env.MAINTENANCE_STARTS_AT,
    MAINTENANCE_UNTIL: process.env.MAINTENANCE_UNTIL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
