import Image from "next/image";
import Link from "next/link";

import { cn } from "~/lib/utils";

/** The Hakgyo logo and wordmark, linking home. */
export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Hakgyo, beranda"
      className={cn(
        "inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-0.06em]",
        className,
      )}
    >
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={36}
        height={36}
        className="size-9 rounded-lg"
      />
      hakgyo
    </Link>
  );
}
