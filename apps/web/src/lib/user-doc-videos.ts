import type { UserDocAudience } from "~/lib/user-doc-audiences";

export type UserDocVideo = {
  /** Public Cloudflare R2 URL of the MP4 file. */
  src: string;
  poster?: string;
  /** For example "2 menit". */
  durationLabel?: string;
};

/**
 * Intro videos per guide page, keyed by `audience/slug`. Pages without an
 * entry show a "coming soon" placeholder.
 */
export const userDocVideos: Partial<Record<string, UserDocVideo>> = {};

export function getUserDocVideo(audience: UserDocAudience, slug: string) {
  return userDocVideos[`${audience}/${slug}`] ?? null;
}
