import { QueryClient } from "@tanstack/react-query";

import { shouldRetryQuery } from "@hakgyo/shared";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Server state is hydrated from SQLite and refreshed only by an
        // explicit sync checkpoint or a screen-level manual retry.
        staleTime: Infinity,
        gcTime: 1000 * 60 * 60 * 24 * 30,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
    },
  });
