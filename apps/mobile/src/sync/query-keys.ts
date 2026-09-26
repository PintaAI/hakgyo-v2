/**
 * React Query keys shared by the sync engine (writer) and the screen hooks
 * (readers). The engine writes with `queryClient.setQueryData`; hooks read
 * with `useQuery` whose `queryFn` loads from SQLite on a cache miss.
 */
export const syncQueryKeys = {
  /** Per-user learner index for an organization scope ("all" = every org). */
  index: (scope: string) => ["mobileSync", "index", scope] as const,
  /** Course structure (modules/items) — small, kept in memory. */
  bundleStructure: (courseId: string) =>
    ["mobileSync", "bundleStructure", courseId] as const,
  /** Course content (materials/vocab/assessments) — loaded lazily. */
  bundleContent: (courseId: string) =>
    ["mobileSync", "bundleContent", courseId] as const,
  /** Map of courseItemId → courseId across all local bundles. */
  itemCourseMap: () => ["mobileSync", "itemCourseMap"] as const,
  /** Persisted small tRPC results (resumable attempts, vocab progress...). */
  query: (queryKey: string) => ["mobileSync", "query", queryKey] as const,
} as const;

export function indexScope(organizationId: string | null | undefined) {
  return organizationId ?? "all";
}
