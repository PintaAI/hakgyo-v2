import type { AppRouter } from "../../../apps/web/src/server/api/root";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

export type { AppRouter };
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type {
  NotificationType,
  NotifyPayload,
  PushPlatform,
} from "./notifications";
