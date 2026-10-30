import { mobileAppStoreLinks } from "~/lib/mobile-app";
import { cn } from "~/lib/utils";

/**
 * App Store and Google Play links, or "Segera hadir" placeholders while
 * `mobileAppStoreLinks` has no URL for a store. Before the store listings
 * exist, the badges link to the TestFlight beta and the Android APK.
 */
export function StoreBadges({ className }: { className?: string }) {
  const stores = [
    mobileAppStoreLinks.appStore || !mobileAppStoreLinks.testFlight
      ? {
          name: "App Store",
          action: "Unduh di",
          href: mobileAppStoreLinks.appStore,
        }
      : {
          name: "TestFlight",
          action: "Beta iPhone di",
          href: mobileAppStoreLinks.testFlight,
        },
    mobileAppStoreLinks.playStore || !mobileAppStoreLinks.androidApk
      ? {
          name: "Google Play",
          action: "Unduh di",
          href: mobileAppStoreLinks.playStore,
        }
      : {
          name: "Unduh APK",
          action: "Beta Android",
          href: mobileAppStoreLinks.androidApk,
        },
  ];

  return (
    <div className={cn("mt-2 grid grid-cols-2 gap-2", className)}>
      {stores.map((store) =>
        store.href ? (
          <a
            key={store.name}
            href={store.href}
            className="bg-foreground text-background rounded-lg px-3 py-2 leading-tight"
          >
            <span className="block text-[10px] opacity-70">{store.action}</span>
            <span className="block text-sm font-semibold">{store.name}</span>
          </a>
        ) : (
          <span
            key={store.name}
            aria-disabled="true"
            className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-2 leading-tight"
          >
            <span className="block text-[10px]">Segera hadir di</span>
            <span className="block text-sm font-semibold">{store.name}</span>
          </span>
        ),
      )}
    </div>
  );
}
