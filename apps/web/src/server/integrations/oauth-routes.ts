import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { requireOrganizationPermission } from "~/server/authorization";
import { db } from "~/server/db";

// Shared by the Zoom and Google Meet connect/callback route handlers, which
// run outside tRPC and so must turn permission errors into responses.

/** The acting membership, or null when the user may not manage integrations. */
export async function findIntegrationManager(input: {
  organizationId: string;
  userId: string;
}) {
  try {
    return await requireOrganizationPermission({
      ...input,
      permission: "organization.manage",
    });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "FORBIDDEN") return null;
    throw error;
  }
}

export function integrationForbiddenResponse() {
  return new NextResponse(
    "You cannot manage integrations for this organization",
    {
      status: 403,
    },
  );
}

export async function redirectToIntegrationSettings(
  organizationId: string,
  query: Record<string, string>,
) {
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { slug: true },
  });
  const url = new URL(
    `/workspace/${encodeURIComponent(organization.slug)}/settings/integrations`,
    env.APP_URL,
  );
  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, value);
  }
  return NextResponse.redirect(url);
}
