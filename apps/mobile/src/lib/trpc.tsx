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
import { Platform } from "react-native";
import SuperJSON from "superjson";

import { apiUrl } from "../config";
import { getAuthCookie, rememberAuthCookies } from "./auth-client";
import { createQueryClient } from "./query-client";

export const api = createTRPCReact<AppRouter>();

/**
 * Identifies this client to the server on every request: sync protocol,
 * Expo runtime version, OTA update id and platform. The server rejects
 * outdated protocols with `UPGRADE_REQUIRED` and records which builds are in
 * use (`MobileClientVersion`). The bundle download (data layer) sends the
 * same header without the platform.
 */
export const clientHeaderValue = formatClientHeader({
  protocol: SYNC_PROTOCOL,
  runtime: Updates.runtimeVersion,
  update: Updates.updateId,
  platform: Platform.OS,
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
          async fetch(url, options) {
            const response = await fetch(url, {
              ...options,
              credentials: "omit",
            });
            void rememberAuthCookies(response.headers.get("set-cookie"));
            return response;
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
