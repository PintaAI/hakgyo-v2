import type { AppRouter } from "@hakgyo/api";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import SuperJSON from "superjson";

import { apiUrl } from "../config";
import { getAuthCookie } from "./auth-client";
import { createQueryClient } from "./query-client";

export const api = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          transformer: SuperJSON,
          url: `${apiUrl}/api/trpc`,
          headers() {
            const cookie = getAuthCookie();

            return {
              ...(cookie ? { cookie } : {}),
              "x-trpc-source": "expo-react-native",
            };
          },
          fetch(url, options) {
            return fetch(url, { ...options, credentials: "omit" });
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  );
}
