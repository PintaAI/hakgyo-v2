import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

import { shouldRetryQuery } from "@hakgyo/shared";

export const createQueryClient = () => {
  const queryClient: QueryClient = new QueryClient({
    // After any successful mutation, mark every cached query stale without
    // refetching it. Screens visited later load fresh data even when the
    // mutation didn't invalidate their queries; the current screen still
    // relies on the mutation's own invalidation.
    mutationCache: new MutationCache({
      onSuccess: () => queryClient.invalidateQueries({ refetchType: "none" }),
    }),
    defaultOptions: {
      queries: {
        // Data stays fresh for 5 minutes before a mount or tab focus refetches
        // it. Every refetch is a function call; queries that must track other
        // users poll instead.
        staleTime: 5 * 60 * 1000,
        retry: shouldRetryQuery,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
  return queryClient;
};
