import { tagResults } from "@hakgyo/shared";

import { StudyCard } from "~/components/learner/assessment/assessment-ui";
import { Progress } from "~/components/ui/progress";

/**
 * Results of a graded attempt per question tag ("Rambu K3: 1 dari 2 benar"), grouped by type,
 * topic and level. Built from points and answer scores only, so Tryouts show it too.
 */
export function TagResults({
  questions,
  answers,
}: {
  questions: ReadonlyArray<{ id: string; points: number; tags: string[] }>;
  answers: ReadonlyArray<{
    questionId: string;
    autoScore?: number | null;
    manualScore?: number | null;
  }>;
}) {
  const groups = tagResults(questions, answers);
  if (!groups.length) return null;
  return (
    <StudyCard>
      <h2 className="text-xl font-black">Hasil per tipe soal</h2>
      {groups.map((group) => (
        <section key={group.group} className="grid gap-3">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {group.label}
          </h3>
          <ul className="grid gap-3">
            {group.rows.map((row) => (
              <li key={row.tag} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 font-medium">{row.label}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {row.correct} dari {row.total} benar
                  </span>
                </div>
                <Progress
                  aria-label={`${row.label}: ${row.correct} dari ${row.total} benar`}
                  value={row.total ? (row.correct / row.total) * 100 : 0}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </StudyCard>
  );
}
