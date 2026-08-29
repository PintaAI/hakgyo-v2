type StatLoaders = Record<string, () => Promise<number>>;

export type FetchedStats<T extends StatLoaders> = {
  [Key in keyof T]: Awaited<ReturnType<T[Key]>>;
};

/**
 * Runs independent stat queries concurrently while preserving their names and
 * inferred result types.
 */
export async function fetchStats<const T extends StatLoaders>(
  loaders: T,
): Promise<FetchedStats<T>> {
  const entries = Object.entries(loaders) as Array<[keyof T, T[keyof T]]>;
  const resolved = await Promise.all(
    entries.map(async ([key, load]) => [key, await load()] as const),
  );

  return Object.fromEntries(resolved) as FetchedStats<T>;
}
