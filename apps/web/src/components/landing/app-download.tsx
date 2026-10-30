import type { ComponentProps } from "react";
import Image from "next/image";
import { SmartphoneIcon } from "lucide-react";

import { mobileAppStoreLinks } from "~/lib/mobile-app";
import { cn } from "~/lib/utils";

/**
 * The beta installs, one button per platform. iPhone has no logo: Apple's
 * guidelines forbid the standalone Apple logo, and its App Store badge may
 * only link to the App Store.
 */
const downloads = [
  {
    platform: "iPhone",
    note: "Beta lewat TestFlight",
    href: mobileAppStoreLinks.testFlight,
    icon: <SmartphoneIcon className="size-6 shrink-0" aria-hidden="true" />,
  },
  {
    platform: "Android",
    note: "Unduh file APK",
    href: mobileAppStoreLinks.androidApk,
    icon: (
      <Image
        src="/brands/android-head.svg"
        alt=""
        width={152}
        height={89}
        className="h-auto w-7 shrink-0"
      />
    ),
  },
];

/** Download buttons for the learner app, each with its platform's mark. */
export function AppDownloadButtons({
  inverted = false,
  className,
  ...props
}: ComponentProps<"div"> & {
  /** For buttons on the primary colour. */
  inverted?: boolean;
}) {
  return (
    <div
      {...props}
      className={cn("grid gap-2 sm:flex sm:flex-wrap sm:gap-3", className)}
    >
      {downloads.map(({ platform, note, href, icon }) =>
        href ? (
          <a
            key={platform}
            href={href}
            className={cn(
              "focus-visible:ring-ring/50 flex h-14 items-center gap-3 rounded-xl px-5 transition-colors outline-none focus-visible:ring-[3px] sm:h-16 sm:min-w-56 sm:px-6",
              inverted
                ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                : "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            {icon}
            <span className="text-left leading-tight">
              <span className="block text-[11px] opacity-70 sm:text-xs">
                {note}
              </span>
              <span className="block text-base font-semibold sm:text-lg">
                Unduh untuk {platform}
              </span>
            </span>
          </a>
        ) : null,
      )}
    </div>
  );
}

/** Attribution the Android robot's Creative Commons licence requires. */
export const androidRobotAttribution =
  "The Android robot is reproduced or modified from work created and shared by Google and used according to terms described in the Creative Commons 3.0 Attribution License.";
