type EnrollmentMode = "OPEN" | "INVITE_ONLY";

/** A cohort's own price, or the course price when it does not set one. */
export function effectiveCohortPrice(
  cohort: { price: number | null },
  course: { price: number },
) {
  return cohort.price ?? course.price;
}

/** Cohort override, then course override, then the organization default. */
export function effectiveCohortEnrollmentMode(
  cohort: { enrollmentMode: EnrollmentMode | null },
  course: { enrollmentMode: EnrollmentMode | null },
  organization: { defaultEnrollmentMode: EnrollmentMode },
) {
  return (
    cohort.enrollmentMode ??
    course.enrollmentMode ??
    organization.defaultEnrollmentMode
  );
}

/** Class cohorts learners can still join: open or running, not ended. */
export function isCohortJoinable(
  cohort: {
    status: string;
    endsAt: Date | null;
    defaultForCourseId: string | null;
  },
  now: Date,
) {
  return (
    cohort.defaultForCourseId === null &&
    (cohort.status === "OPEN" || cohort.status === "IN_PROGRESS") &&
    (cohort.endsAt === null || cohort.endsAt > now)
  );
}

export type CohortJoinBlocker =
  | "COHORT_UNAVAILABLE"
  | "INVITE_REQUIRED"
  | "ALREADY_ENROLLED"
  | "IN_OTHER_CLASS"
  | "FULL"
  | "PAYMENT_NOT_CONFIGURED";

/**
 * Why a learner cannot start joining a cohort, or null when they can. A
 * valid invite stands in for open enrollment; capacity counts members only,
 * so unpaid checkouts never hold a seat.
 */
export function getCohortJoinBlocker(input: {
  joinable: boolean;
  coursePublished: boolean;
  enrollmentMode: EnrollmentMode;
  hasValidInvite: boolean;
  alreadyEnrolled: boolean;
  /** The learner already takes another running class of the course. */
  inOtherClass: boolean;
  capacity: number | null;
  memberCount: number;
  price: number;
  hasPaymentMethod: boolean;
}): CohortJoinBlocker | null {
  if (!input.joinable || !input.coursePublished) return "COHORT_UNAVAILABLE";
  if (input.alreadyEnrolled) return "ALREADY_ENROLLED";
  if (input.inOtherClass) return "IN_OTHER_CLASS";
  if (input.enrollmentMode !== "OPEN" && !input.hasValidInvite) {
    return "INVITE_REQUIRED";
  }
  if (input.capacity !== null && input.memberCount >= input.capacity) {
    return "FULL";
  }
  if (input.price > 0 && !input.hasPaymentMethod) {
    return "PAYMENT_NOT_CONFIGURED";
  }
  return null;
}

export const cohortJoinBlockerMessages: Record<CohortJoinBlocker, string> = {
  COHORT_UNAVAILABLE: "Kelas ini tidak sedang menerima peserta.",
  INVITE_REQUIRED: "Kelas ini hanya bisa diikuti melalui undangan.",
  ALREADY_ENROLLED: "Kamu sudah terdaftar di kelas ini.",
  IN_OTHER_CLASS:
    "Kamu masih terdaftar di kelas lain untuk course ini. Satu course hanya bisa diikuti di satu kelas pada saat yang sama.",
  FULL: "Kuota kelas ini sudah penuh.",
  PAYMENT_NOT_CONFIGURED:
    "Penyelenggara belum mengatur metode pembayaran. Hubungi penyelenggara.",
};
