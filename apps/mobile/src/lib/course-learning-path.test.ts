import { describe, expect, test } from "bun:test";
import {
  getCourseResumeItem,
  getLearningMilestone,
  getLearningPath,
  type LearningPathCourse,
  type LearningPathModule,
} from "./course-learning-path";

function module(
  id: string,
  completed: boolean[],
  access: LearningPathModule["access"] = "AVAILABLE",
): LearningPathModule {
  return {
    id,
    title: `Module ${id}`,
    access,
    isCompleted: completed.length > 0 && completed.every(Boolean),
    items: completed.map((isCompleted, index) => ({
      id: `${id}${index}`,
      title: `Material ${id}${index}`,
      isCompleted,
    })),
  };
}

describe("mobile learning path", () => {
  test("resumes at the first unfinished accessible activity", () => {
    const course = {
      modules: [module("a", [true, false]), module("b", [false], "LOCKED")],
    };
    expect(getCourseResumeItem(course)?.id).toBe("a1");
    expect(getLearningPath(course, "a0")?.nextItem?.id).toBe("a1");
  });
  test("finishes gaps in the current module before moving to another module", () => {
    const course = {
      modules: [module("a", [false, true]), module("b", [false])],
    };
    expect(getLearningPath(course, "a1")?.nextItem?.id).toBe("a0");
  });
  test("never sends the learner into a locked module", () => {
    const course = {
      modules: [module("a", [true]), module("b", [false], "LOCKED")],
    };
    expect(getLearningPath(course, "a0")?.nextItem).toBeUndefined();
    expect(getCourseResumeItem(course)).toBeUndefined();
  });
  test("celebrates only a newly completed module and a confirmed unlock", () => {
    const before = {
      modules: [module("a", [true, false]), module("b", [false], "LOCKED")],
    };
    const after = {
      modules: [module("a", [true, true], "COMPLETED"), module("b", [false])],
    };
    expect(getLearningMilestone(before, after, "a1")).toEqual({
      moduleTitle: "Module a",
      courseCompleted: false,
      unlockedModuleTitle: "Module b",
      nextItem: after.modules[1]!.items[0],
    });
    expect(getLearningPath(after, "a1")?.nextItem?.id).toBe("b0");
    expect(getLearningMilestone(after, after, "a1")).toBeUndefined();
  });
  test("does not invent an unlock for open courses", () => {
    const before = { modules: [module("a", [false]), module("b", [false])] };
    const after = { modules: [module("a", [true]), module("b", [false])] };
    expect(
      getLearningMilestone(before, after, "a0")?.unlockedModuleTitle,
    ).toBeUndefined();
    expect(getLearningMilestone(before, after, "a0")?.nextItem?.id).toBe("b0");
  });
  test("does not celebrate when completion requirements are still unmet", () => {
    const before = { modules: [module("a", [false, false])] };
    const after = { modules: [module("a", [true, false])] };
    expect(getLearningMilestone(before, after, "a0")).toBeUndefined();
  });
  test("completes the course even if the last unfinished item was opened out of order", () => {
    const before = { modules: [module("a", [false, true])] };
    const after = { modules: [module("a", [true, true])] };
    expect(getLearningMilestone(before, after, "a0")).toMatchObject({
      courseCompleted: true,
      nextItem: undefined,
    });
    expect(getCourseResumeItem(after)).toBeUndefined();
    // Revisiting completed content still allows reading the following material.
    expect(getLearningPath(after, "a0")?.nextItem?.id).toBe("a1");
    expect(getLearningPath(after, "a1")?.nextItem).toBeUndefined();
  });
  test("skips empty modules without guessing that they have unlocked", () => {
    const course = {
      modules: [module("a", [true]), module("empty", []), module("b", [false])],
    };
    expect(getLearningPath(course, "a0")?.nextItem?.id).toBe("b0");
    expect(getLearningPath(course, "a0")?.nextModule?.id).toBe("b");
  });
  test("stops a stale screen when its module becomes locked", () => {
    const course = { modules: [module("a", [false, false], "LOCKED")] };
    expect(getLearningPath(course, "a0")).toBeUndefined();
  });
  test("handles an empty outline and removed items", () => {
    const course: LearningPathCourse = { modules: [] };
    expect(getLearningPath(course, "missing")).toBeUndefined();
    expect(getCourseResumeItem(course)).toBeUndefined();
    expect(getLearningMilestone(course, course, "missing")).toBeUndefined();
  });
});
