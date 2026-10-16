import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppPreferencesBootstrap } from "~/components/app-preferences-bootstrap";
import {
  docPreviewNames,
  isDocPreviewName,
} from "~/components/user-doc-previews/names";
import { DocPreviewHost } from "~/components/user-doc-previews/preview-host";

export const metadata: Metadata = {
  title: "Pratinjau panduan",
  robots: { index: false, follow: false },
};

// Every page is prerendered; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return docPreviewNames.map((name) => ({ name }));
}

/**
 * One interactive UI preview for the guide, loaded inside an iframe by
 * `UserDocPreviewFrame`. It renders the real component with in-memory data.
 */
export default async function DocPreviewPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  if (!isDocPreviewName(name)) notFound();

  return (
    <main className="bg-background min-h-0">
      {/* Backdrop blur renders ghosted copies inside the scaled iframe. */}
      <style>{`[data-slot$="-overlay"]{backdrop-filter:none!important}`}</style>
      <AppPreferencesBootstrap />
      <DocPreviewHost name={name} />
    </main>
  );
}
