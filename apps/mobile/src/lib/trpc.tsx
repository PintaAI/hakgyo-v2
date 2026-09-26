import type { AppRouter } from "@hakgyo/api";
import {
  CLIENT_HEADER,
  formatClientHeader,
  SYNC_PROTOCOL,
} from "@hakgyo/shared/mobile-sync";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import * as Updates from "expo-updates";
import { useState } from "react";
import SuperJSON from "superjson";

import { apiUrl } from "../config";
import { getAuthCookie } from "./auth-client";
import { createQueryClient } from "./query-client";

export const api = createTRPCReact<AppRouter>();

/**
 * Identifies this client to the server on every request: sync protocol,
 * Expo runtime version and OTA update id. The server rejects outdated
 * protocols with `UPGRADE_REQUIRED`. The bundle download (data layer) sends
 * the same header.
 */
export const clientHeaderValue = formatClientHeader({
  protocol: SYNC_PROTOCOL,
  runtime: Updates.runtimeVersion,
  update: Updates.updateId,
});

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          transformer: SuperJSON,
          url: `${apiUrl}/api/trpc`,
          async headers() {
            const cookie = await getAuthCookie();

            return {
              ...(cookie ? { cookie } : {}),
              "x-trpc-source": "expo-react-native",
              [CLIENT_HEADER]: clientHeaderValue,
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
