import { describe, expect, test } from "bun:test";

import {
  canAccessLearningContent,
  canManageCohort,
  canManageContent,
  canManageCourse,
  hasPermission,
} from "./permissions";

const outsideScope = {
  organizationRole: undefined,
  isCourseOwner: false,
  isCohortStaff: false,
};

describe("organization permissions", () => {
  test("owner and admin can manage the organization", () => {
    expect(hasPermission("OWNER", "organization.manage")).toBe(true);
    expect(hasPermission("ADMIN", "organization.manage")).toBe(true);
  });

  test("teacher cannot manage organization or members", () => {
    expect(hasPermission("TEACHER", "organization.manage")).toBe(false);
    expect(hasPermission("TEACHER", "organization.members.manage")).toBe(
      false,
    );
    expect(hasPermission("TEACHER", "asset.create")).toBe(true);
    expect(hasPermission("TEACHER", "course.create")).toBe(true);
  });
});

describe("resource scope", () => {
  test("roles do not grant access outside their organization", () => {
    expect(canManageCourse(outsideScope)).toBe(false);
    expect(canManageCohort(outsideScope)).toBe(false);
    expect(canManageContent(outsideScope)).toBe(false);
  });

  test("teacher only manages a course they own", () => {
    expect(
      canManageCourse({
        organizationRole: "TEACHER",
        isCourseOwner: true,
        isCohortStaff: false,
      }),
    ).toBe(true);
    expect(
      canManageCourse({
        organizationRole: "TEACHER",
        isCourseOwner: false,
        isCohortStaff: false,
      }),
    ).toBe(false);
  });

  test("assigned teacher can manage cohort but not course content", () => {
    const assignedTeacher = {
      organizationRole: "TEACHER" as const,
      isCourseOwner: false,
      isCohortStaff: true,
    };
    expect(canManageCohort(assignedTeacher)).toBe(true);
    expect(canManageContent(assignedTeacher)).toBe(false);
  });
});

describe("learning access", () => {
  test("unenrolled student cannot read or take action", () => {
    expect(
      canAccessLearningContent({
        ...outsideScope,
        hasActiveEnrollment: false,
        isCoursePublished: true,
        isItemPublished: true,
      }),
    ).toBe(false);
  });

  test("enrollment cannot expose draft course or item", () => {
    expect(
      canAccessLearningContent({
        ...outsideScope,
        hasActiveEnrollment: true,
        isCoursePublished: false,
        isItemPublished: true,
      }),
    ).toBe(false);
    expect(
      canAccessLearningContent({
        ...outsideScope,
        hasActiveEnrollment: true,
        isCoursePublished: true,
        isItemPublished: false,
      }),
    ).toBe(false);
  });

  test("active enrollment grants access to published content", () => {
    expect(
      canAccessLearningContent({
        ...outsideScope,
        hasActiveEnrollment: true,
        isCoursePublished: true,
        isItemPublished: true,
      }),
    ).toBe(true);
  });
});
