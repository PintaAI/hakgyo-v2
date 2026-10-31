export { HANGEUL_MASTERY_COURSE_ID } from "@hakgyo/shared/hangeul";

export const HAKGYO_SYSTEM_ORGANIZATION_ID = "hakgyo-system-organization";

/**
 * The two linked Pola Bahasa curricula (scripts/pola-bahasa, docs/pola-bahasa.md). The ids are derived from the
 * manifest's course keys by scripts/pola-bahasa/ids.ts and never change.
 */
export const POLA_KOREA_INDO_COURSE_ID = "pb-korea-indo";
export const POLA_INDO_KOREA_COURSE_ID = "pb-indo-korea";
export const POLA_BAHASA_COURSE_IDS = [
  POLA_KOREA_INDO_COURSE_ID,
  POLA_INDO_KOREA_COURSE_ID,
] as const;
