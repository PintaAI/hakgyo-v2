import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import {
  getManagedOrganizationLogoKey,
  getOrganizationLogoPrefix,
  parseOrganizationLogoKey,
} from "~/lib/organization-logo";
import { db } from "~/server/db";
import { r2, r2Bucket } from "~/server/r2";

const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ organizationId: string; fileName: string }>;
  },
) {
  const { organizationId, fileName } = await params;
  const key = `${getOrganizationLogoPrefix(organizationId)}${fileName}`;
  if (!parseOrganizationLogoKey(key, organizationId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { logoUrl: true },
  });
  if (
    getManagedOrganizationLogoKey(organization?.logoUrl, organizationId) !== key
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const downloadUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      ResponseContentDisposition: "inline",
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
  const response = NextResponse.redirect(downloadUrl);
  response.headers.set(
    "Cache-Control",
    `public, max-age=${DOWNLOAD_URL_TTL_SECONDS}, stale-while-revalidate=60`,
  );
  return response;
}
