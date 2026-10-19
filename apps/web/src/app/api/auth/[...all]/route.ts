import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "~/server/better-auth";
import { guardRoute } from "~/server/maintenance";

const handlers = toNextJsHandler(auth.handler);

// Blocked in `full` maintenance only: sign-in keeps working in `read_only`
// even though it writes sessions. A migration that touches the auth tables
// (user, session, account, verification) needs `full`.
export const GET = guardRoute("read", handlers.GET);
export const POST = guardRoute("read", handlers.POST);
