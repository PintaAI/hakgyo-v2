import {
  maintenanceSchedule,
  type MaintenanceState,
} from "@hakgyo/shared/mobile-sync";

import { Headline, Kicker, leadText } from "~/components/brand/typography";
import { cn } from "~/lib/utils";

/** Shown instead of a page's content during `full` maintenance. */
export function MaintenancePage({ state }: { state: MaintenanceState }) {
  const schedule = maintenanceSchedule(state);
  return (
    <main className="grid min-h-[60svh] place-items-center px-5 py-10 sm:min-h-[70svh] sm:py-16">
      <section className="w-full max-w-2xl text-center">
        <Kicker className="justify-center">Pemeliharaan</Kicker>
        <Headline
          as="h1"
          title="Hakgyo sedang dalam pemeliharaan."
          className="mt-3 sm:mt-5"
        />
        <p className={cn(leadText, "mx-auto mt-4")}>
          {state.message ??
            "Kami sedang memperbarui sistem, jadi Hakgyo untuk sementara tidak dapat diakses. Progres belajar kamu aman."}
        </p>
        {schedule ? (
          <p className="text-muted-foreground mx-auto mt-3 text-sm">
            {schedule}
          </p>
        ) : null}
        <p className="text-muted-foreground mx-auto mt-6 text-sm">
          Pengguna aplikasi Hakgyo tetap bisa belajar dari materi yang sudah
          tersimpan; progresnya disinkronkan setelah pemeliharaan selesai.
        </p>
      </section>
    </main>
  );
}
