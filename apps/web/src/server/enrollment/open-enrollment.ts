type OpenEnrollmentCourse = {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  price: number;
  enrollmentMode: "OPEN" | "INVITE_ONLY" | null;
  organization: { defaultEnrollmentMode: "OPEN" | "INVITE_ONLY" };
};

type ExistingEnrollment = {
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  source: "OPEN" | "INVITE" | "PURCHASE" | "MANUAL" | "COHORT";
  expiresAt: Date | null;
};

type OpenEnrollmentUpdate = {
  status?: "ACTIVE";
  source: "OPEN";
  completedAt?: null;
  expiresAt: null;
};

export function getOpenEnrollmentRejection(course: OpenEnrollmentCourse) {
  if (course.status !== "PUBLISHED") return "COURSE_NOT_PUBLISHED" as const;
  if (
    (course.enrollmentMode ?? course.organization.defaultEnrollmentMode) !==
    "OPEN"
  ) {
    return "INVITE_REQUIRED" as const;
  }
  if (course.price > 0) return "PAYMENT_REQUIRED" as const;
  return null;
}

export function getOpenEnrollmentUpdate(
  enrollment: ExistingEnrollment | null,
  now: Date,
): OpenEnrollmentUpdate | null {
  const hasCurrentAccess =
    enrollment !== null &&
    (enrollment.status === "ACTIVE" || enrollment.status === "COMPLETED") &&
    (enrollment.expiresAt === null || enrollment.expiresAt > now);

  if (hasCurrentAccess) {
    return enrollment.source === "COHORT"
      ? { source: "OPEN", expiresAt: null }
      : null;
  }

  return {
    status: "ACTIVE",
    source: "OPEN",
    completedAt: null,
    expiresAt: null,
  };
}
