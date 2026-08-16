import { Skeleton } from "~/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f2efe6] text-[#163f35]">
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-14 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
        <section>
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="mt-12 h-3 w-40" />
          <Skeleton className="mt-5 h-16 w-full max-w-2xl" />
          <Skeleton className="mt-3 h-16 w-2/3" />
          <Skeleton className="mt-7 h-5 w-full max-w-lg" />
          <Skeleton className="mt-2 h-5 w-4/5 max-w-lg" />
          <div className="mt-10 flex flex-wrap gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </section>

        <div className="w-full max-w-sm justify-self-center">
          <Skeleton className="h-[26rem] w-full rounded-3xl" />
        </div>
      </div>
    </main>
  );
}
