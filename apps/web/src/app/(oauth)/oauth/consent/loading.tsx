import { FlowShell, surfaceCard } from "~/components/brand/flow-shell";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export default function OAuthConsentLoading() {
  return (
    <FlowShell className="grid place-items-center pt-2 sm:pt-12">
      <section className={cn(surfaceCard, "w-full max-w-lg p-5 sm:p-8")}>
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-9 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-11/12" />
        <Skeleton className="mt-6 h-40 w-full rounded-xl" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </section>
    </FlowShell>
  );
}
