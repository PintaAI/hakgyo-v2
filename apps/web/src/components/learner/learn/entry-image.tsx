"use client";

import Image from "next/image";

import { useAssetDownloadUrl } from "~/components/asset-download-url";
import { cn } from "~/lib/utils";

const variants = {
  grid: { box: "h-28 w-full rounded-xl", width: 320, height: 112 },
  list: { box: "size-14 rounded-xl", width: 56, height: 56 },
  detail: { box: "h-44 w-full rounded-2xl", width: 640, height: 176 },
} as const;

export function EntryImage({
  assetId,
  variant,
  label = "",
}: {
  assetId: string;
  variant: keyof typeof variants;
  label?: string;
}) {
  const { url, failed } = useAssetDownloadUrl(assetId);
  const { box, width, height } = variants[variant];
  if (failed) return null;
  if (!url) return <div className={cn("bg-muted", box)} />;
  return (
    <Image
      src={url}
      alt={label}
      width={width}
      height={height}
      unoptimized
      className={cn("object-cover", box)}
    />
  );
}
