import type { inferRouterOutputs } from "@trpc/server";

import { appCourseItemDeepLink } from "~/lib/mobile-app";
import type { AppRouter } from "~/server/api/root";

/**
 * How a tool changes Hakgyo data, mapped to MCP tool annotations:
 * - `read` only reads;
 * - `add` creates new records without touching existing ones;
 * - `change` overwrites existing values, so clients should confirm it first.
 */
export type McpToolEffect = "read" | "add" | "change";

export type McpDomainTool = {
  action: string;
  name: string;
  title: string;
  description: string;
  effect: McpToolEffect;
  /** Reaches a service outside Hakgyo, such as Zoom, or publishes to the public web. */
  external?: boolean;
};

const blockCatalogGuidance =
  "Call get_material_block_catalog first and send content as BlockNote editor.document JSON for the current catalog version.";
const tugasGuidance =
  "Tugas (ASSESSMENT items) cannot be taken here: never answer them for the learner; share the item's appUrl so they open it in the Hakgyo mobile app.";

/**
 * The allowlisted tRPC procedures exposed as MCP tools, one tool per action.
 * Destructive deletes, invite secrets, upload URLs and learner Tugas attempts
 * are deliberately absent.
 */
export const mcpDomainTools = {
  account: [
    {
      action: "deletionBlockers",
      name: "get_account_deletion_blockers",
      title: "Check account deletion blockers",
      description:
        "List what currently prevents the signed-in user from deleting their Hakgyo account, such as organizations they still own. Does not delete anything.",
      effect: "read",
    },
    {
      action: "updateProfile",
      name: "update_my_profile",
      title: "Update my profile",
      description:
        "Change the signed-in user's display name or profile image URL. Only the fields you send are changed.",
      effect: "change",
    },
  ],
  organization: [
    {
      action: "create",
      name: "create_organization",
      title: "Create organization",
      description:
        "Create a new Hakgyo organization (a school or class provider) with the signed-in user as its owner.",
      effect: "add",
    },
    {
      action: "list",
      name: "list_my_organizations",
      title: "List my organizations",
      description:
        "List the organizations the signed-in user is a member of, with their role in each.",
      effect: "read",
    },
    {
      action: "get",
      name: "get_organization",
      title: "Get organization",
      description:
        "Read one organization's profile and settings, such as enrollment mode and permission mode.",
      effect: "read",
    },
    {
      action: "getDashboardAnalytics",
      name: "get_organization_analytics",
      title: "Get organization analytics",
      description:
        "Summarize an organization's members, content, courses, cohorts and enrollments. Requires the OWNER or ADMIN role.",
      effect: "read",
    },
    {
      action: "update",
      name: "update_organization_settings",
      title: "Update organization settings",
      description:
        "Change an organization's name, slug, default enrollment mode, permission mode, or whether teachers can create courses. Only the fields you send are changed.",
      effect: "change",
    },
    {
      action: "listMembers",
      name: "list_organization_members",
      title: "List organization members",
      description:
        "List an organization's staff members (owners, admins and teachers), optionally filtered by name, email or role. Results are paginated with cursor.",
      effect: "read",
    },
    {
      action: "addMember",
      name: "add_organization_member",
      title: "Add organization member",
      description:
        "Add an existing Hakgyo user, found by email, to an organization as OWNER, ADMIN or TEACHER. Fails when no account uses that email.",
      effect: "add",
    },
    {
      action: "updateMemberRole",
      name: "change_member_role",
      title: "Change member role",
      description:
        "Change an organization member's role to OWNER, ADMIN or TEACHER. Use membershipId from list_organization_members. Confirm with the user first.",
      effect: "change",
    },
    {
      action: "getZoomConnectionStatus",
      name: "get_zoom_connection_status",
      title: "Get Zoom connection status",
      description:
        "Check whether an organization has a Zoom account connected for scheduling cohort meetings.",
      effect: "read",
    },
  ],
  course: [
    {
      action: "list",
      name: "list_organization_courses",
      title: "List organization courses",
      description:
        "List the courses an organization's staff can manage, including drafts. For courses the user studies, use list_my_courses.",
      effect: "read",
    },
    {
      action: "get",
      name: "get_course",
      title: "Get course",
      description:
        "Read a managed course's settings and kurikulum (modules and their items).",
      effect: "read",
    },
    {
      action: "create",
      name: "create_course",
      title: "Create course",
      description:
        "Create a course in an organization. ownerMembershipId is the owning teacher's membershipId from get_current_user or list_organization_members. Courses start as DRAFT; status PUBLISHED lists the course, its thumbnail and price on Hakgyo's public catalog and the organization's public pages. Price is what learners pay the organization in Hakgyo; nothing is sold through this tool. Confirm with the user before publishing.",
      effect: "add",
      external: true,
    },
    {
      action: "update",
      name: "update_course",
      title: "Update course",
      description:
        "Change a course's title, description, price, enrollment mode, progression mode, owner, or DRAFT/PUBLISHED status. Only the fields you send are changed. Publishing, or editing a published course, changes what anyone can see on Hakgyo's public catalog and the organization's public pages, so confirm with the user first.",
      effect: "change",
      external: true,
    },
  ],
  content: [
    {
      action: "getCurriculumReadiness",
      name: "get_curriculum_readiness",
      title: "Check kurikulum readiness",
      description:
        "Check which course items learners can open and why the others are hidden or not ready, with the lessons that depend on each item.",
      effect: "read",
    },
    {
      action: "createModule",
      name: "create_module",
      title: "Create module",
      description: "Add a module (a kurikulum section) to the end of a course.",
      effect: "add",
    },
    {
      action: "updateModule",
      name: "update_module",
      title: "Update module",
      description: "Rename a course module or change its description.",
      effect: "change",
    },
    {
      action: "reorderModules",
      name: "reorder_modules",
      title: "Reorder modules",
      description:
        "Set the order of a course's modules. Send every module id of the course in the new order.",
      effect: "change",
    },
    {
      action: "createItem",
      name: "add_module_item",
      title: "Add item to module",
      description:
        "Place an existing material, Tugas (assessment) or kosakata (vocabulary) set into a module as a new item.",
      effect: "add",
    },
    {
      action: "updateItem",
      name: "update_module_item",
      title: "Update module item",
      description:
        "Publish or unpublish a module item, or point it at a different material, Tugas or kosakata set.",
      effect: "change",
    },
    {
      action: "reorderItems",
      name: "reorder_module_items",
      title: "Reorder module items",
      description:
        "Set the order of a module's items. Send every item id of the module in the new order.",
      effect: "change",
    },
    {
      action: "listMaterials",
      name: "list_materials",
      title: "List materials",
      description:
        "List the learning materials (lessons) in an organization's content library.",
      effect: "read",
    },
    {
      action: "countMaterials",
      name: "count_materials",
      title: "Count materials",
      description:
        "Count the learning materials in an organization's content library.",
      effect: "read",
    },
    {
      action: "getMaterial",
      name: "get_material",
      title: "Get material",
      description:
        "Read one learning material, including its BlockNote content, attached files and completion requirements.",
      effect: "read",
    },
    {
      action: "createMaterial",
      name: "create_material",
      title: "Create material",
      description: `Create a learning material (lesson) in an organization's content library. ${blockCatalogGuidance}`,
      effect: "add",
    },
    {
      action: "updateMaterial",
      name: "update_material",
      title: "Update material",
      description: `Change a learning material's title, description, content or requirement policy. Sent content replaces the whole document. ${blockCatalogGuidance}`,
      effect: "change",
    },
    {
      action: "attachMaterialAsset",
      name: "attach_material_file",
      title: "Attach file to material",
      description:
        "Attach an already uploaded organization file (assetId) to a learning material.",
      effect: "add",
    },
    {
      action: "createRequirement",
      name: "add_material_requirement",
      title: "Add material requirement",
      description:
        "Require learners to finish a Tugas (optionally with a minimum score) or practice a kosakata set before a material counts as complete.",
      effect: "add",
    },
    {
      action: "reorderRequirements",
      name: "reorder_material_requirements",
      title: "Reorder material requirements",
      description:
        "Set the order of a material's requirements. Send every requirement id in the new order.",
      effect: "change",
    },
    {
      action: "listVocabularySets",
      name: "list_vocabulary_sets",
      title: "List kosakata sets",
      description:
        "List an organization's kosakata (vocabulary) sets, optionally filtered by title.",
      effect: "read",
    },
    {
      action: "getVocabularySet",
      name: "get_vocabulary_set",
      title: "Get kosakata set",
      description: "Read a kosakata (vocabulary) set with its entries.",
      effect: "read",
    },
    {
      action: "createVocabularySet",
      name: "create_vocabulary_set",
      title: "Create kosakata set",
      description:
        "Create an empty kosakata (vocabulary) set in an organization.",
      effect: "add",
    },
    {
      action: "updateVocabularySet",
      name: "update_vocabulary_set",
      title: "Update kosakata set",
      description:
        "Rename a kosakata (vocabulary) set or change its description.",
      effect: "change",
    },
    {
      action: "createVocabularyEntry",
      name: "add_vocabulary_entry",
      title: "Add kosakata entry",
      description:
        "Add a word or phrase with its definition and optional examples to a kosakata (vocabulary) set.",
      effect: "add",
    },
    {
      action: "updateVocabularyEntry",
      name: "update_vocabulary_entry",
      title: "Update kosakata entry",
      description:
        "Change a kosakata entry's term, definition, examples or attached audio and image. Only the fields you send are changed.",
      effect: "change",
    },
  ],
  cohort: [
    {
      action: "list",
      name: "list_cohorts",
      title: "List cohorts",
      description:
        "List a course's cohorts (study groups), optionally filtered by name or status. Results are paginated with cursor.",
      effect: "read",
    },
    {
      action: "get",
      name: "get_cohort",
      title: "Get cohort",
      description:
        "Read a cohort's schedule, capacity, enrollment settings and staff.",
      effect: "read",
    },
    {
      action: "create",
      name: "create_cohort",
      title: "Create cohort",
      description:
        "Create a cohort (study group) for a course. startsAt and endsAt are ISO 8601 date-times.",
      effect: "add",
    },
    {
      action: "update",
      name: "update_cohort",
      title: "Update cohort",
      description:
        "Change a cohort's name, schedule, status, price, capacity or enrollment mode. Only the fields you send are changed.",
      effect: "change",
    },
    {
      action: "addStaff",
      name: "add_cohort_staff",
      title: "Add cohort staff",
      description:
        "Assign an organization member, found by email, to a cohort as INSTRUCTOR or ASSISTANT.",
      effect: "add",
    },
    {
      action: "updateStaff",
      name: "change_cohort_staff_role",
      title: "Change cohort staff role",
      description:
        "Switch a cohort staff member between INSTRUCTOR and ASSISTANT.",
      effect: "change",
    },
    {
      action: "listMeetings",
      name: "list_cohort_meetings",
      title: "List cohort meetings",
      description:
        "List a cohort's scheduled, running and past meetings. Results are paginated with cursor.",
      effect: "read",
    },
    {
      action: "createMeeting",
      name: "schedule_cohort_meeting",
      title: "Schedule cohort meeting",
      description:
        "Schedule a Zoom meeting for a cohort through the organization's connected Zoom account. With notify, learners are notified. startsAt is an ISO 8601 date-time.",
      effect: "add",
      external: true,
    },
    {
      action: "updateMeeting",
      name: "update_cohort_meeting",
      title: "Update cohort meeting",
      description:
        "Change a scheduled cohort meeting's title, agenda, time or duration, and update the Zoom meeting to match. With notify, learners are told about the change.",
      effect: "change",
      external: true,
    },
  ],
  enrollment: [
    {
      action: "enrollOpenCourse",
      name: "enroll_in_open_course",
      title: "Enroll in open course",
      description:
        "Enroll the signed-in user in a free, published course that accepts open enrollment.",
      effect: "add",
    },
    {
      action: "listInvites",
      name: "list_enrollment_invites",
      title: "List enrollment invites",
      description:
        "List a course's or cohort's enrollment invite links and their usage. Invite secrets are not returned.",
      effect: "read",
    },
    {
      action: "getInvite",
      name: "get_enrollment_invite",
      title: "Get enrollment invite",
      description:
        "Read one enrollment invite's target, limits and usage. The invite secret is not returned.",
      effect: "read",
    },
    {
      action: "listCourseEnrollments",
      name: "list_course_enrollments",
      title: "List course enrollments",
      description:
        "List learners enrolled in a course, optionally filtered by name, email or status. Results are paginated with cursor.",
      effect: "read",
    },
    {
      action: "listCohortEnrollments",
      name: "list_cohort_enrollments",
      title: "List cohort enrollments",
      description:
        "List learners enrolled in a cohort, optionally filtered by name, email or status. Results are paginated with cursor.",
      effect: "read",
    },
    {
      action: "setCourseEnrollment",
      name: "set_course_enrollment",
      title: "Set course enrollment",
      description:
        "Enroll a learner in a course by email, or change their enrollment status (for example to CANCELLED) and expiry. Confirm with the user before cancelling access.",
      effect: "change",
    },
    {
      action: "setCohortEnrollment",
      name: "set_cohort_enrollment",
      title: "Set cohort enrollment",
      description:
        "Enroll a learner in a cohort by email, or change their enrollment status (for example to CANCELLED). Confirm with the user before cancelling access.",
      effect: "change",
    },
  ],
  learning: [
    {
      action: "listMyCourses",
      name: "list_my_courses",
      title: "List my courses",
      description:
        "List the courses the signed-in user is enrolled in as a learner, optionally within one organization.",
      effect: "read",
    },
    {
      action: "getCourseOutline",
      name: "get_my_course_outline",
      title: "Get my course outline",
      description: `Read an enrolled course's modules and items with the learner's progress and which items are unlocked. ${tugasGuidance}`,
      effect: "read",
    },
    {
      action: "getCourseItem",
      name: "get_my_course_item",
      title: "Get my course item",
      description: `Read an enrolled course item: a material's lesson content or a kosakata set's words. ${tugasGuidance}`,
      effect: "read",
    },
    {
      action: "markContentProgress",
      name: "mark_item_progress",
      title: "Mark item progress",
      description:
        "Record that the signed-in learner started (IN_PROGRESS) or finished (COMPLETED) a material or kosakata item. COMPLETED is only accepted once the item's requirements are met and cannot be undone, so confirm with the learner before marking an item COMPLETED. Does not apply to Tugas.",
      effect: "change",
    },
    {
      action: "setProgressionMode",
      name: "set_course_progression_mode",
      title: "Set course progression mode",
      description:
        "Choose whether learners can open a course's items in any order (OPEN) or must finish them in sequence (SEQUENTIAL). Requires permission to manage the course.",
      effect: "change",
    },
  ],
  assessment: [
    {
      action: "list",
      name: "list_assessments",
      title: "List Tugas",
      description:
        "List the Tugas (assessments) in an organization's content library.",
      effect: "read",
    },
    {
      action: "get",
      name: "get_assessment",
      title: "Get Tugas",
      description:
        "Read a Tugas (assessment) with its settings, questions and answer options, and whether it is live.",
      effect: "read",
    },
    {
      action: "getLiveStatus",
      name: "get_assessment_live_status",
      title: "Get Tugas live status",
      description:
        "Show where a Tugas is live for learners. A live Tugas is read-only; duplicate it to make changes.",
      effect: "read",
    },
    {
      action: "create",
      name: "create_assessment",
      title: "Create Tugas",
      description:
        "Create a Tugas (assessment) with its passing score, attempt limit, time limit and shuffle settings. Add questions with add_assessment_question.",
      effect: "add",
    },
    {
      action: "duplicate",
      name: "duplicate_assessment",
      title: "Duplicate Tugas",
      description:
        "Copy a Tugas with all its questions and options into a new, editable Tugas.",
      effect: "add",
    },
    {
      action: "update",
      name: "update_assessment",
      title: "Update Tugas",
      description:
        "Change a Tugas's title, instructions or settings. Only the fields you send are changed. Fails while the Tugas is live.",
      effect: "change",
    },
    {
      action: "createQuestion",
      name: "add_assessment_question",
      title: "Add Tugas question",
      description:
        "Add a SINGLE_CHOICE, MULTIPLE_CHOICE or WRITTEN question to a Tugas. Add choices with add_question_option.",
      effect: "add",
    },
    {
      action: "updateQuestion",
      name: "update_assessment_question",
      title: "Update Tugas question",
      description:
        "Change a Tugas question's type, prompt, explanation or points. Only the fields you send are changed.",
      effect: "change",
    },
    {
      action: "createOption",
      name: "add_question_option",
      title: "Add question option",
      description:
        "Add an answer choice to a choice question and mark whether it is correct.",
      effect: "add",
    },
    {
      action: "updateOption",
      name: "update_question_option",
      title: "Update question option",
      description: "Change an answer choice's text or whether it is correct.",
      effect: "change",
    },
    {
      action: "listAttemptsNeedingReview",
      name: "list_attempts_needing_review",
      title: "List attempts needing review",
      description:
        "List submitted Tugas attempts with written answers waiting for a teacher's score, optionally filtered by Tugas, cohort or learner. Results are paginated with cursor.",
      effect: "read",
    },
    {
      action: "reviewAttempt",
      name: "review_attempt",
      title: "Review attempt",
      description:
        "Score a submitted attempt's written answers and leave feedback for the learner. Show the scores to the user and confirm before saving.",
      effect: "change",
    },
  ],
} as const satisfies Record<string, readonly McpDomainTool[]>;

export type McpDomain = keyof typeof mcpDomainTools;

export const mcpDomainActions = Object.fromEntries(
  Object.entries(mcpDomainTools).map(([domain, tools]) => [
    domain,
    tools.map((tool) => tool.action),
  ]),
) as Record<McpDomain, string[]>;

export function getMcpToolAnnotations(tool: McpDomainTool) {
  return {
    readOnlyHint: tool.effect === "read",
    destructiveHint: tool.effect === "change",
    idempotentHint: tool.effect !== "add",
    openWorldHint: tool.external ?? false,
  };
}

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

/**
 * Secrets and record-keeping metadata never returned to the model. Results
 * should carry only what answers the user's request.
 */
const privateResultFields = new Set([
  "accessToken",
  "clientSecret",
  "createdByMembershipId",
  "deletedAt",
  "etag",
  "inviteToken",
  "joinUrl",
  "objectKey",
  "refreshToken",
  "startUrl",
  "token",
  "updatedAt",
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
      .map(([key, entry]) => [
        // Prisma relation counts read better as plain `counts`.
        key === "_count" ? "counts" : key,
        sanitizeMcpResult(entry),
      ]),
  );
}
