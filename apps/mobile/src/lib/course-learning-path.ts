export type LearningPathItem = {
  id: string;
  title: string;
  isCompleted: boolean;
};

export type LearningPathModule = {
  id: string;
  title: string;
  access: "LOCKED" | "AVAILABLE" | "COMPLETED";
  isCompleted: boolean;
  items: LearningPathItem[];
};

export type LearningPathCourse = { modules: LearningPathModule[] };

export function getCourseResumeItem(course: LearningPathCourse) {
  return course.modules
    .filter((module) => module.access !== "LOCKED")
    .flatMap((module) => module.items)
    .find((item) => !item.isCompleted);
}

export function getLearningPath(course: LearningPathCourse, itemId: string) {
  const moduleIndex = course.modules.findIndex((module) =>
    module.items.some((item) => item.id === itemId),
  );
  const module = course.modules[moduleIndex];
  if (!module || module.access === "LOCKED") return undefined;
  const itemIndex = module.items.findIndex((item) => item.id === itemId);
  const allItems = course.modules.flatMap((entry) => entry.items);
  const available = course.modules
    .filter((entry) => entry.access !== "LOCKED")
    .flatMap((entry) => entry.items);
  const currentIndex = available.findIndex((item) => item.id === itemId);
  // Finish gaps in this module before moving on, even when opened out of order.
  const nextItem =
    module.items.slice(itemIndex + 1).find((item) => !item.isCompleted) ??
    module.items.find((item) => item.id !== itemId && !item.isCompleted) ??
    available.slice(currentIndex + 1).find((item) => !item.isCompleted) ??
    available.find((item) => item.id !== itemId && !item.isCompleted) ??
    available[currentIndex + 1];
  return {
    module,
    moduleIndex,
    itemIndex,
    item: module.items[itemIndex]!,
    completedCount: module.items.filter((item) => item.isCompleted).length,
    courseCompleted:
      allItems.length > 0 && allItems.every((item) => item.isCompleted),
    nextItem,
    nextModule: course.modules.find((entry) =>
      entry.items.some((item) => item.id === nextItem?.id),
    ),
  };
}

export function getLearningMilestone(
  before: LearningPathCourse,
  after: LearningPathCourse,
  itemId: string,
) {
  const previous = getLearningPath(before, itemId);
  const current = getLearningPath(after, itemId);
  if (
    !previous ||
    !current ||
    previous.module.isCompleted ||
    !current.module.isCompleted
  )
    return undefined;
  const unlockedModule = after.modules.find(
    (module) =>
      module.access !== "LOCKED" &&
      before.modules.some(
        (entry) => entry.id === module.id && entry.access === "LOCKED",
      ),
  );
  return {
    moduleTitle: current.module.title,
    courseCompleted: current.courseCompleted,
    unlockedModuleTitle: unlockedModule?.title,
    nextItem: current.courseCompleted ? undefined : current.nextItem,
  };
}
