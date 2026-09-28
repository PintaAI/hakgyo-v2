import { z } from "zod";

/** Longest owner-editable copy field; shared by the validator and the editor. */
export const MAX_LANDING_FIELD_LENGTH = 2_000;

const reservedSlugs = new Set([
  "api",
  "auth",
  "catalog",
  "learn",
  "workspace",
  "oauth",
  "notifications",
  "docs",
  "invite",
  "onboarding",
  "open",
  "organizations",
  "superadmin",
  "serwist",
  "theme-debug",
  "conversation-block-preview",
  "_next",
  "assets",
  "images",
  "fonts",
]);
export const organizationPublicSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine(
    (value) => !reservedSlugs.has(value),
    "This slug is reserved by Hakgyo",
  );
