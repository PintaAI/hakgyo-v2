import { timingSafeEqual } from "node:crypto";

import {
  whatsappConfig,
  WEBHOOK_SECRET_HEADER,
} from "~/server/whatsapp/config";
import { guardRoute } from "~/server/maintenance";
import { applyConnectionUpdate } from "~/server/whatsapp/connection";

export const runtime = "nodejs";

function isAuthorized(request: Request, secret: string) {
  const expected = Buffer.from(secret);
  const actual = Buffer.from(request.headers.get(WEBHOOK_SECRET_HEADER) ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

type WebhookBody = {
  event?: string;
  instance?: string;
  data?: { state?: string; wuid?: string | null };
};

/**
 * Evolution API webhook (docs/whatsapp.md). Instances subscribe to
 * CONNECTION_UPDATE only; anything else is acknowledged and ignored. The
 * secret header is set on each instance when Hakgyo creates it.
 */
async function handler(request: Request) {
  const config = whatsappConfig();
  if (!config || !isAuthorized(request, config.webhookSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  // Evolution API sends "connection.update"; configs use CONNECTION_UPDATE.
  const event = body.event?.replace(/[.-]/g, "_").toUpperCase();
  if (event === "CONNECTION_UPDATE" && body.instance) {
    await applyConnectionUpdate({
      instanceName: body.instance,
      state: body.data?.state,
      wuid: body.data?.wuid,
    });
  }
  return Response.json({ ok: true });
}

// Connection updates are stored, so the webhook waits while writes are blocked.
export const POST = guardRoute("write", handler);
