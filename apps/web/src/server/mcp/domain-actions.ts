import type { inferRouterOutputs } from "@trpc/server";

import { appCourseItemDeepLink } from "~/lib/mobile-app";
import type { AppRouter } from "~/server/api/root";

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
    "getCurriculumReadiness",
    "createModule",
    "updateModule",
    "reorderModules",
    "createItem",
    "updateItem",
    "reorderItems",
    "listMaterials",
    "countMaterials",
    "getMaterial",
    "createMaterial",
    "updateMaterial",
    "attachMaterialAsset",
    "createRequirement",
    "reorderRequirements",
    "listVocabularySets",
    "getVocabularySet",
    "createVocabularySet",
    "updateVocabularySet",
    "createVocabularyEntry",
    "updateVocabularyEntry",
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
    "getLiveStatus",
    "create",
    "duplicate",
    "update",
    "createQuestion",
    "updateQuestion",
    "createOption",
    "updateOption",
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

type LearningOutputs = inferRouterOutputs<AppRouter>["learning"];

/**
 * Tugas are taken only in the mobile app, so learning results give every
 * assessment item an `appUrl` deep link for the client to hand the learner.
 */
export function addAssessmentAppLinks(input: {
  action: string;
  domain: McpDomain;
  result: unknown;
}): unknown {
  if (input.domain !== "learning" || !input.result) return input.result;

  if (input.action === "getCourseOutline") {
    const outline = input.result as LearningOutputs["getCourseOutline"];
    return {
      ...outline,
      modules: outline.modules.map((module) => ({
        ...module,
        items: module.items.map((item) =>
          item.type === "ASSESSMENT"
            ? { ...item, appUrl: appCourseItemDeepLink(outline.id, item.id) }
            : item,
        ),
      })),
    };
  }

  if (input.action === "getCourseItem") {
    const item = input.result as NonNullable<LearningOutputs["getCourseItem"]>;
    const courseId = item.module.courseId;
    return {
      ...item,
      ...(item.type === "ASSESSMENT" && {
        appUrl: appCourseItemDeepLink(courseId, item.id),
      }),
      material: item.material && {
        ...item.material,
        requiredActivities: item.material.requiredActivities.map((activity) =>
          activity.type === "ASSESSMENT"
            ? {
                ...activity,
                appUrl: appCourseItemDeepLink(courseId, activity.courseItemId),
              }
            : activity,
        ),
      },
      embeddedResources: {
        ...item.embeddedResources,
        assessments: item.embeddedResources.assessments.map((assessment) => ({
          ...assessment,
          appUrl: appCourseItemDeepLink(courseId, assessment.courseItemId),
        })),
      },
    };
  }

  return input.result;
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
