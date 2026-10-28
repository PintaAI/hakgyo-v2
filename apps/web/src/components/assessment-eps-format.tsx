"use client";

import {
  blueprintIssueText,
  checkBlueprint,
  epsTopikBlueprint,
} from "@hakgyo/shared";
import { CheckIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { useDialogs } from "~/components/ui/use-dialogs";
import { api, type RouterOutputs } from "~/trpc/react";

type Assessment = RouterOutputs["assessment"]["get"];

/** How many issues a section lists before "dan N lainnya". */
const SHOWN_ISSUES = 6;

/**
 * "Format EPS-TOPIK" in the assessment settings (docs/eps-topik-simulation.md section 5.9): applies
 * the preset, and checks the questions against the blueprint (type, level and work-topic share)
 * once the assessment has its two sections.
 */
export function EpsFormatPanel({
  assessment,
  readOnly,
  beforeApply,
  onApplied,
}: {
  assessment: Assessment;
  readOnly: boolean;
  /** Saves pending edits before the preset rewrites settings. */
  beforeApply: () => Promise<unknown>;
  /** Called after the preset is applied, to reload the editor from the server. */
  onApplied: () => Promise<void> | void;
}) {
  const apply = api.assessment.applyEpsTopikPreset.useMutation();
  const utils = api.useUtils();
  const { confirm, dialogs } = useDialogs();
  const blueprintSections = epsTopikBlueprint.sections;
  // There is no stored marker: two sections named like the blueprint's, or EPS type tags on the
  // questions, mean the assessment follows the format.
  const applied =
    assessment.sections.length === blueprintSections.length &&
    (assessment.sections.every(
      (section, index) => section.title === blueprintSections[index]?.title,
    ) ||
      assessment.questions.some((question) =>
        question.tags.some((tag) => tag.startsWith("eps:")),
      ));
  const reports = applied
    ? checkBlueprint(
        epsTopikBlueprint,
        assessment.sections.map((section) =>
          assessment.questions.filter(
            (question) => question.sectionId === section.id,
          ),
        ),
      )
    : [];

  async function applyPreset() {
    const confirmed = await confirm({
      title: "Terapkan format EPS-TOPIK?",
      description:
        "Tugas dibagi menjadi Membaca (25 menit, bebas berpindah soal) dan Mendengar (25 menit, soal berganti sendiri, audio diputar otomatis dua kali dengan waktu menjawab 7 detik). Setiap soal bernilai 2,5 poin, soal dan pilihan jawaban tidak diacak, dan batas nilai Manufaktur 60% serta Sektor lain 45% dipasang. Pengaturan dan petunjuk kedua bagian serta poin semua soal ditimpa. Tanpa bagian, 20 soal pertama masuk Membaca dan sisanya Mendengar. Semua pengaturan tetap bisa diubah sesudahnya.",
      confirmLabel: "Terapkan",
    });
    if (!confirmed) return;
    try {
      await beforeApply();
      await apply.mutateAsync({ assessmentId: assessment.id });
      await utils.assessment.get.invalidate({ assessmentId: assessment.id });
      await onApplied();
      toast.success("Format EPS-TOPIK diterapkan.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Format belum diterapkan.",
      );
    }
  }

  return (
    <div className="grid gap-3">
      <div>
        <h3 className="text-sm font-semibold">Format EPS-TOPIK</h3>
        <p className="text-muted-foreground text-xs">
          Untuk tryout atau pemantapan: 40 soal dalam bagian Membaca dan
          Mendengar seperti ujian EPS-TOPIK ({epsTopikBlueprint.version}).
        </p>
      </div>
      {readOnly ? null : (
        <Button
          disabled={apply.isPending}
          onClick={() => void applyPreset()}
          size="sm"
          type="button"
          variant="outline"
        >
          {apply.isPending ? (
            <LoaderCircleIcon
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          {applied ? "Terapkan ulang format" : "Terapkan format EPS-TOPIK"}
        </Button>
      )}
      {reports.map((report) => {
        const issues = report.issues;
        return (
          <div className="grid gap-1.5" key={report.key}>
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              {issues.length === 0 && report.workShareOk ? (
                <CheckIcon className="size-3.5 text-emerald-600" />
              ) : (
                <TriangleAlertIcon className="size-3.5 text-amber-600" />
              )}
              {report.title}: {report.found} dari {report.expected} soal
            </p>
            {issues.length ? (
              <ul className="text-muted-foreground grid gap-1 text-xs">
                {issues.slice(0, SHOWN_ISSUES).map((issue, index) => (
                  <li key={index}>{blueprintIssueText(issue)}</li>
                ))}
                {issues.length > SHOWN_ISSUES ? (
                  <li>dan {issues.length - SHOWN_ISSUES} catatan lainnya.</li>
                ) : null}
              </ul>
            ) : null}
            <p className="text-muted-foreground text-xs">
              Soal pekerjaan, K3 dan lembaga:{" "}
              {Math.round(report.workShare * 100)}% (sasaran{" "}
              {Math.round(epsTopikBlueprint.workTopics.minShare * 100)}–
              {Math.round(epsTopikBlueprint.workTopics.maxShare * 100)}%).
            </p>
          </div>
        );
      })}
      {dialogs}
    </div>
  );
}
