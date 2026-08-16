import { Skeleton } from "~/components/ui/skeleton";

export default function OAuthConsentLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2efe6] px-6 py-12 text-[#163f35]">
      <section className="w-full max-w-lg rounded-[2rem] border border-emerald-950/10 bg-[#fffaf0] p-8 shadow-[0_24px_80px_rgba(50,65,58,0.14)]">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-9 w-3/4" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-11/12" />
        <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      </section>
    </main>
  );
}
