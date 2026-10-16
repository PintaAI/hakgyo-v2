"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { toast } from "sonner";

import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";

/* eslint-disable @typescript-eslint/no-explicit-any -- procedure inputs are validated by the real components */
export type MockQueries<State> = Record<
  string,
  (state: State, input: any) => unknown
>;
export type MockMutations<State> = Record<
  string,
  (state: State, input: any) => unknown
>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type MockBackend<State> = {
  createState: () => State;
  queries: MockQueries<State>;
  mutations?: MockMutations<State>;
};

export const previewOnlyMessage =
  "Ini hanya pratinjau. Perubahan tidak disimpan.";

/**
 * A terminating tRPC link that answers every procedure from in-memory preview
 * data. Nothing is sent to the server. Mutations change the in-memory state,
 * so the real components show the result after they invalidate their queries.
 */
function mockLink<State>(
  backend: MockBackend<State>,
  state: State,
): TRPCLink<AppRouter> {
  return () =>
    ({ op }) =>
      observable((observer) => {
        let cancelled = false;
        const respond = () => {
          if (cancelled) return;
          try {
            let data: unknown;
            if (op.type === "query") {
              const query = backend.queries[op.path];
              if (!query) {
                throw new Error(`Data pratinjau belum ada untuk ${op.path}`);
              }
              data = query(state, op.input);
            } else if (op.type === "mutation") {
              const mutation = backend.mutations?.[op.path];
              if (!mutation) {
                toast.info(previewOnlyMessage);
                throw new Error(previewOnlyMessage);
              }
              data = mutation(state, op.input);
            } else {
              throw new Error("Langganan tidak didukung di pratinjau");
            }
            observer.next({
              result: { type: "data", data: structuredClone(data) },
            });
            observer.complete();
          } catch (error) {
            observer.error(
              TRPCClientError.from(
                error instanceof Error ? error : new Error(String(error)),
              ),
            );
          }
        };
        // Answer asynchronously like a real request, so loading states and
        // invalidation behave the same way.
        const timer = window.setTimeout(respond, 60);
        return () => {
          cancelled = true;
          window.clearTimeout(timer);
        };
      });
}

export function MockTRPCProvider<State>({
  backend,
  children,
}: {
  backend: MockBackend<State>;
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    api.createClient({ links: [mockLink(backend, backend.createState())] }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  );
}
