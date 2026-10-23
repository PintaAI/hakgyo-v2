import { cn } from "~/lib/utils";

/** The Hangeul Mastery medal: a gold disc with 한 inside a fine ring. */
export function HangeulMasteryMedal({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_6px_18px_-6px] shadow-amber-600/60",
        className,
      )}
    >
      <span className="absolute inset-1 rounded-full border border-amber-50/70" />
      <span className="text-[26px] leading-none font-black text-amber-950">
        한
      </span>
    </span>
  );
}

/**
 * Shown when the Hangeul Mastery course is completed: the badge is earned and
 * the course leaves the learner's lists unless they chose to keep it. A
 * learner who kept it had the badge already (the switch appears only after
 * mastery), so the badge is not called new then.
 */
export function HangeulMasteryCompletionNote({
  hidden = true,
  className,
}: {
  /** Whether the course is now hidden from the learner's lists. */
  hidden?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4",
        className,
      )}
    >
      <HangeulMasteryMedal />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[11px] font-bold tracking-[1.5px] text-amber-700 uppercase dark:text-amber-300">
          {hidden ? "Lencana baru" : "Lencana"}
        </p>
        <p className="text-base leading-5 font-black">Hangeul Mastery</p>
        <p className="text-muted-foreground text-sm leading-5">
          {hidden
            ? "Kurikulum ini sekarang disembunyikan dari daftar kurikulummu. Tampilkan lagi kapan saja lewat Pengaturan."
            : "Kurikulum ini tetap tampil karena kamu memilih menampilkannya di Pengaturan."}
        </p>
      </div>
    </div>
  );
}
