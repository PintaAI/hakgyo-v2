import { AuthPanel } from "~/components/auth-panel";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f2efe6] text-[#163f35]">
      <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[#e9c46a]/35 blur-3xl" />
      <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full bg-[#7fb4a3]/25 blur-3xl" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-14 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
        <section>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e76f51] text-xl font-black text-white shadow-[8px_8px_0_#163f35]">
            H
          </div>
          <p className="mt-12 text-xs font-bold tracking-[0.28em] text-[#9b5b3d] uppercase">
            Hakgyo / learn together
          </p>
          <h1 className="mt-5 max-w-2xl text-5xl leading-[0.98] font-black tracking-[-0.05em] sm:text-7xl">
            Your school,
            <span className="block text-[#e76f51]">within reach.</span>
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#52665f]">
            One secure account for the Hakgyo web and mobile experience, powered
            by Better Auth and a shared type-safe API.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-xs font-bold tracking-wide uppercase">
            <span className="rounded-full border border-emerald-950/15 px-4 py-2">
              Next.js
            </span>
            <span className="rounded-full border border-emerald-950/15 px-4 py-2">
              Expo
            </span>
            <span className="rounded-full border border-emerald-950/15 px-4 py-2">
              tRPC
            </span>
          </div>
        </section>

        <AuthPanel />
      </div>
    </main>
  );
}
