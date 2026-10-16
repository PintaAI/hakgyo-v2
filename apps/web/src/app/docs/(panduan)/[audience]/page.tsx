import { notFound, redirect } from "next/navigation";

import {
  isUserDocAudience,
  userDocAudiences,
  userDocHref,
} from "~/lib/user-doc-audiences";
import { getUserDocs } from "~/lib/user-docs";

export function generateStaticParams() {
  return userDocAudiences.map(({ id }) => ({ audience: id }));
}

export default async function DocsAudiencePage({
  params,
}: {
  params: Promise<{ audience: string }>;
}) {
  const { audience } = await params;
  if (!isUserDocAudience(audience)) notFound();

  const firstDoc = (await getUserDocs(audience))[0];
  if (!firstDoc) notFound();
  redirect(userDocHref(audience, firstDoc.slug));
}
