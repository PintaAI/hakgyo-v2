type OutlineModules = {
  modules: ReadonlyArray<{
    items: ReadonlyArray<{ id: string; type: string }>;
  }>;
};

/**
 * Where a material sits in its course: its chapter number and its place among the chapter's
 * materials (vocabulary sets and tugas are not counted), from the course outline.
 */
export function materialPosition(
  outline: OutlineModules | undefined,
  courseItemId: string,
) {
  const modules = outline?.modules ?? [];
  const moduleIndex = modules.findIndex((module) =>
    module.items.some((item) => item.id === courseItemId),
  );
  if (moduleIndex < 0) return null;
  const materials = modules[moduleIndex]!.items.filter(
    (item) => item.type === "MATERIAL",
  );
  const index = materials.findIndex((item) => item.id === courseItemId);
  if (index < 0) return null;
  return {
    chapter: moduleIndex + 1,
    index: index + 1,
    total: materials.length,
  };
}
