export type CoursePublicationStatus = "DRAFT" | "PUBLISHED";

/**
 * Whether a newly attached item starts visible. Items only default to visible
 * in a published course, and never when the item is already known to be not
 * ready (the server rejects creating a visible item that is not ready).
 */
export function defaultCourseItemPublished(
  status: CoursePublicationStatus,
  notReadyReason: string | null = null,
) {
  return status === "PUBLISHED" && !notReadyReason;
}

type PlacementReadiness = {
  ready: boolean;
  reasons: ReadonlyArray<{ message: string }>;
};

/**
 * Why a resource about to be attached to a module is known to be not ready,
 * or null when nothing is known against it. Uses what the client already has:
 * the assessment's question count and the readiness of existing placements of
 * the same resource in the module (readiness never crosses modules).
 */
export function knownNotReadyReason(input: {
  type: "MATERIAL" | "ASSESSMENT" | "VOCABULARY_SET";
  questionCount?: number;
  placementsInModule: readonly PlacementReadiness[];
}) {
  if (input.type === "VOCABULARY_SET") return null;
  if (input.type === "ASSESSMENT" && input.questionCount === 0) {
    return "Tugas ini belum memiliki soal.";
  }
  const notReady = input.placementsInModule.find(
    (placement) => !placement.ready,
  );
  return notReady?.reasons[0]?.message ?? null;
}
