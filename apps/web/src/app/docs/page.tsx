import { notFound, redirect } from "next/navigation";

import { getUserDocs } from "~/lib/user-docs";

export default async function DocsPage() {
  const firstDoc = (await getUserDocs())[0];
  if (!firstDoc) notFound();
  redirect(`/docs/${firstDoc.slug}`);
}
