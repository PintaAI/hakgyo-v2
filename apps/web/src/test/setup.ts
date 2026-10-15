// Preloaded for every `bun test` run through bunfig.toml.
import { mock } from "bun:test";
import { AsyncLocalStorage } from "node:async_hooks";

// Next.js picks its AsyncLocalStorage from `globalThis` once, when its
// async-local-storage module is first evaluated, and otherwise falls back to
// a stub that throws. `next dev`/`next start` install the global first; under
// `bun test` nothing does, so whichever test loaded Next.js first decided it
// for the whole run.
const scope = globalThis as { AsyncLocalStorage?: typeof AsyncLocalStorage };
scope.AsyncLocalStorage ??= AsyncLocalStorage;

// `server-only` throws outside React Server Components. Tests import server
// modules directly, so treat it as the empty marker module it is.
void mock.module("server-only", () => ({}));
