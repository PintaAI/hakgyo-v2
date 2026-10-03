import Image from "next/image";
import Link from "next/link";

import { cn } from "~/lib/utils";

/** The Hakgyo app icon. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt=""
      width={36}
      height={36}
      className={cn("size-9 shrink-0 rounded-lg", className)}
    />
  );
}

/** The Hakgyo logo and wordmark, linking home. */
export function BrandLink({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Hakgyo, beranda"
      className={cn(
        "inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-0.06em]",
        className,
      )}
    >
      <BrandMark className={markClassName} />
      hakgyo
    </Link>
  );
}
