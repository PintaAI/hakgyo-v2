export const mcpDomainActions = {
  account: ["deletionBlockers", "updateProfile"],
  organization: [
    "create",
    "list",
    "get",
    "getDashboardAnalytics",
    "update",
    "listMembers",
    "addMember",
    "updateMemberRole",
    "getZoomConnectionStatus",
  ],
  course: ["list", "get", "create", "update"],
  content: [
    "createModule",
    "updateModule",
    "reorderModules",
    "createItem",
    "updateItem",
    "reorderItems",
    "listMaterials",
    "getMaterial",
    "createMaterial",
    "updateMaterial",
    "attachMaterialAsset",
    "createRequirement",
    "reorderRequirements",
    "listVocabularySets",
    "createVocabularySet",
    "updateVocabularySet",
    "createVocabularyEntry",
    "updateVocabularyEntry",
    "reorderVocabularyEntries",
  ],
  cohort: [
    "list",
    "get",
    "create",
    "update",
    "addStaff",
    "updateStaff",
    "listMeetings",
    "createMeeting",
    "updateMeeting",
  ],
  enrollment: [
    "enrollOpenCourse",
    "listInvites",
    "getInvite",
    "listCourseEnrollments",
    "listCohortEnrollments",
    "setCourseEnrollment",
    "setCohortEnrollment",
  ],
  learning: [
    "listMyCourses",
    "getCourseOutline",
    "getCourseItem",
    "markContentProgress",
    "setProgressionMode",
  ],
  assessment: [
    "list",
    "get",
    "create",
    "update",
    "createQuestion",
    "updateQuestion",
    "createOption",
    "updateOption",
    "getForCourseItem",
    "startAttempt",
    "saveAnswers",
    "submitAttempt",
    "getMyAttempt",
    "listAttemptsNeedingReview",
    "reviewAttempt",
  ],
} as const;

export type McpDomain = keyof typeof mcpDomainActions;

export function normalizeMcpProcedureInput(input: {
  action: string;
  domain: McpDomain;
  procedureInput: Record<string, unknown>;
}) {
  if (
    input.domain !== "cohort" ||
    !["create", "update", "createMeeting", "updateMeeting"].includes(
      input.action,
    )
  ) {
    return input.procedureInput;
  }

  const normalized = { ...input.procedureInput };
  for (const field of ["startsAt", "endsAt"] as const) {
    const value = normalized[field];
    if (typeof value === "string") normalized[field] = new Date(value);
  }
  return normalized;
}

const privateResultFields = new Set([
  "accessToken",
  "clientSecret",
  "deletedAt",
  "etag",
  "inviteToken",
  "joinUrl",
  "objectKey",
  "refreshToken",
  "startUrl",
  "token",
  "uploadedByUserId",
  "zoomMeetingId",
  "zoomMeetingUuid",
]);

export function sanitizeMcpResult(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeMcpResult);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !privateResultFields.has(key))
      .map(([key, entry]) => [key, sanitizeMcpResult(entry)]),
  );
}
