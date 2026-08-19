import { describe, expect, test } from "bun:test";

import {
  canAccessLearningContent,
  getCohortCapabilities,
  getCourseCapabilities,
  hasPermission,
  type CourseScope,
} from "./permissions";

const outsideScope: CourseScope = {
  organizationRole: undefined,
  permissionMode: "ADVANCED",
  isCourseOwner: false,
  isCourseEditor: false,
  isCohortStaff: false,
};

describe("organization permissions", () => {
  test("owner and admin manage the organization", () => {
    expect(hasPermission("OWNER", "organization.manage")).toBe(true);
    expect(hasPermission("ADMIN", "organization.manage")).toBe(true);
  });

  test("teacher has only base creation and review permissions", () => {
    expect(hasPermission("TEACHER", "organization.manage")).toBe(false);
    expect(hasPermission("TEACHER", "organization.members.manage")).toBe(false);
    expect(hasPermission("TEACHER", "asset.create")).toBe(true);
    expect(hasPermission("TEACHER", "course.create")).toBe(true);
    expect(hasPermission("TEACHER", "assessment.review")).toBe(true);
  });
});

describe("course capabilities", () => {
  test("organization managers and course owner have full course access", () => {
    for (const scope of [
      { ...outsideScope, organizationRole: "ADMIN" as const },
      { ...outsideScope, isCourseOwner: true },
    ]) {
      expect(getCourseCapabilities(scope)).toEqual({
        view: true,
        manage: true,
        manageContent: true,
        viewCohorts: true,
        viewAllCohorts: true,
        manageAllCohorts: true,
        manageCohortInvites: true,
        createCohort: true,
        usesAdvancedPermissions: true,
      });
    }
    expect(
      getCourseCapabilities({ ...outsideScope, organizationRole: "ADMIN" })
        .manageCohortInvites,
    ).toBe(true);
  });

  test("course editor edits curriculum without managing course settings", () => {
    expect(
      getCourseCapabilities({ ...outsideScope, isCourseEditor: true }),
    ).toEqual({
      view: true,
      manage: false,
      manageContent: true,
      viewCohorts: false,
      viewAllCohorts: false,
      manageAllCohorts: false,
      manageCohortInvites: false,
      createCohort: false,
      usesAdvancedPermissions: true,
    });
  });

  test("cohort staff can view the course and assigned cohorts only", () => {
    expect(
      getCourseCapabilities({ ...outsideScope, isCohortStaff: true }),
    ).toEqual({
      view: true,
      manage: false,
      manageContent: false,
      viewCohorts: true,
      viewAllCohorts: false,
      manageAllCohorts: false,
      manageCohortInvites: false,
      createCohort: false,
      usesAdvancedPermissions: true,
    });
  });

  test("simple mode gives every organization member full course access", () => {
    expect(
      getCourseCapabilities({
        ...outsideScope,
        organizationRole: "TEACHER",
        permissionMode: "SIMPLE",
      }),
    ).toEqual({
      view: true,
      manage: true,
      manageContent: true,
      viewCohorts: false,
      viewAllCohorts: false,
      manageAllCohorts: false,
      manageCohortInvites: false,
      createCohort: true,
      usesAdvancedPermissions: false,
    });
  });

  test("simple mode admin can only manage cohort invites", () => {
    const course = getCourseCapabilities({
      ...outsideScope,
      organizationRole: "ADMIN",
      permissionMode: "SIMPLE",
    });
    expect(course).toMatchObject({
      view: true,
      manage: false,
      manageContent: false,
      viewCohorts: true,
      viewAllCohorts: true,
      manageAllCohorts: false,
      manageCohortInvites: true,
      createCohort: false,
    });
    expect(getCohortCapabilities({ course })).toMatchObject({
      view: true,
      update: false,
      delete: false,
      manageStaff: false,
      manageLearners: false,
      manageInvites: true,
      manageMeetings: false,
    });
  });
});

describe("cohort capabilities", () => {
  const scopedCourse = getCourseCapabilities({
    ...outsideScope,
    isCohortStaff: true,
  });

  test("instructor manages cohort operations but not staff or deletion", () => {
    expect(
      getCohortCapabilities({ course: scopedCourse, staffRole: "INSTRUCTOR" }),
    ).toEqual({
      view: true,
      update: true,
      delete: false,
      manageStaff: false,
      manageLearners: true,
      manageInvites: true,
      manageMeetings: true,
      reviewAssessments: true,
    });
  });

  test("assistant manages learners and can only view other operations", () => {
    expect(
      getCohortCapabilities({ course: scopedCourse, staffRole: "ASSISTANT" }),
    ).toEqual({
      view: true,
      update: false,
      delete: false,
      manageStaff: false,
      manageLearners: true,
      manageInvites: false,
      manageMeetings: false,
      reviewAssessments: false,
    });
  });

  test("course manager has every cohort capability", () => {
    const capabilities = getCohortCapabilities({
      course: getCourseCapabilities({ ...outsideScope, isCourseOwner: true }),
    });
    expect(Object.values(capabilities).every(Boolean)).toBe(true);
  });

  test("assigned staff has full cohort operations in simple mode except assignments", () => {
    const capabilities = getCohortCapabilities({
      course: getCourseCapabilities({
        ...outsideScope,
        organizationRole: "TEACHER",
        permissionMode: "SIMPLE",
        isCohortStaff: true,
      }),
      staffRole: "ASSISTANT",
    });
    expect(capabilities).toEqual({
      view: true,
      update: true,
      delete: true,
      manageStaff: false,
      manageLearners: true,
      manageInvites: true,
      manageMeetings: true,
      reviewAssessments: true,
    });
  });
});

describe("learning access", () => {
  test("enrollment requires published course and item", () => {
    expect(
      canAccessLearningContent({
        ...outsideScope,
        hasActiveEnrollment: true,
        isCoursePublished: true,
        isItemPublished: true,
      }),
    ).toBe(true);
    expect(
      canAccessLearningContent({
        ...outsideScope,
        hasActiveEnrollment: true,
        isCoursePublished: false,
        isItemPublished: true,
      }),
    ).toBe(false);
  });

  test("course editor and cohort staff can access draft learning content", () => {
    for (const scope of [
      { ...outsideScope, isCourseEditor: true },
      { ...outsideScope, isCohortStaff: true },
    ]) {
      expect(
        canAccessLearningContent({
          ...scope,
          hasActiveEnrollment: false,
          isCoursePublished: false,
          isItemPublished: false,
        }),
      ).toBe(true);
    }
  });
});
