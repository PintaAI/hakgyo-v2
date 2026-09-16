import { db } from "~/server/db";
import { getPublicOrganizationLanding } from "~/server/organization-landing/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const landing = await getPublicOrganizationLanding({ db, slug });
  // Revocation and course visibility changes take effect on the next request.
  return Response.json(landing ?? { error: "Landing page not found" }, {
    status: landing ? 200 : 404,
    headers: { "Cache-Control": "no-store" },
  });
}
