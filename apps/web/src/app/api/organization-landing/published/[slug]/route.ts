import { db } from "~/server/db";
import {
  landingDocumentResponse,
  landingNotFoundResponse,
} from "~/server/organization-landing/response";
import { renderPublishedLanding } from "~/server/organization-landing/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  // Unpublishing and course visibility changes take effect on the next request.
  const document = await renderPublishedLanding({ db, slug });
  return document
    ? landingDocumentResponse(document)
    : landingNotFoundResponse();
}
