import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

import { shouldRetryQuery } from "@hakgyo/shared";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Mutations invalidate what they change, so data stays fresh for 5
        // minutes before a mount or tab focus refetches it. Every refetch is a
        // function call; queries that must track other users poll instead.
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
