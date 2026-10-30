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
    shortNote: "TestFlight",
    href: mobileAppStoreLinks.testFlight,
    icon: <SmartphoneIcon className="size-6 shrink-0" aria-hidden="true" />,
  },
  {
    platform: "Android",
    note: "Unduh file APK",
    shortNote: "File APK",
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
  compact = false,
  className,
  ...props
}: ComponentProps<"div"> & {
  /** For buttons on the primary colour. */
  inverted?: boolean;
  /** Two equal buttons side by side, named by platform only. */
  compact?: boolean;
}) {
  return (
    <div
      {...props}
      className={cn(
        compact
          ? "grid grid-cols-2 gap-2 sm:gap-3"
          : "grid gap-2 sm:flex sm:flex-wrap sm:gap-3",
        className,
      )}
    >
      {downloads.map(({ platform, note, shortNote, href, icon }) =>
        href ? (
          <a
            key={platform}
            href={href}
            className={cn(
              "focus-visible:ring-ring/50 flex items-center gap-3 rounded-xl transition-colors outline-none focus-visible:ring-[3px]",
              compact
                ? "h-12 gap-2.5 px-3.5 sm:h-16 sm:gap-3 sm:px-5"
                : "h-14 px-5 sm:h-16 sm:min-w-56 sm:px-6",
              inverted
                ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                : "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            {icon}
            <span className="min-w-0 text-left leading-tight">
              <span
                className={cn(
                  "block opacity-70 sm:text-xs",
                  compact ? "text-[10px]" : "text-[11px]",
                )}
              >
                {compact ? shortNote : note}
              </span>
              <span
                className={cn(
                  "block font-semibold sm:text-lg",
                  compact ? "text-[15px]" : "text-base",
                )}
              >
                {compact ? platform : `Unduh untuk ${platform}`}
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
