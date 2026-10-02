"use client";

import { FlameIcon } from "lucide-react";

import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { getStreakProgressDays } from "~/lib/learner/gamification";
import { api } from "~/trpc/react";

export function WeeklyStreak() {
  const query = api.gamification.getMySummary.useQuery();
  const data = query.data;

  if (!data) {
    return query.isError ? (
      <p role="alert" className="text-destructive text-sm">
        Streak belum bisa dimuat.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => void query.refetch()}
        >
          Coba lagi
        </button>
      </p>
    ) : (
      <Skeleton className="h-24 w-full rounded-2xl" />
    );
  }

  const days = getStreakProgressDays(data.weeklyActivity);

  return (
    <section aria-label="Streak mingguan" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">
          Streak {data.summary.currentStreak} hari
        </h2>
        <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-bold tabular-nums">
          {data.weeklyActivity.xp.toLocaleString("id-ID")} XP minggu ini
        </span>
      </div>
      <ol className="flex">
        {days.map((day) => (
          <li
            key={day.dateKey}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <span className="text-muted-foreground text-[10px] font-bold uppercase">
              {day.weekday}
            </span>
            <span
              role="img"
              aria-label={`${day.weekday} ${day.dateNumber}, ${
                day.active
                  ? "aktivitas streak selesai"
                  : day.future
                    ? "akan datang"
                    : "tidak ada aktivitas"
              }`}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border",
                day.today ? "border-foreground" : "border-transparent",
                day.active ? "bg-primary/10" : "bg-muted",
              )}
            >
              {day.active ? (
                <FlameIcon className="text-primary size-[18px] fill-current" />
              ) : (
                <span
                  className={cn(
                    "text-muted-foreground text-xs font-bold",
                    day.future && "opacity-40",
                  )}
                >
                  {day.dateNumber}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
