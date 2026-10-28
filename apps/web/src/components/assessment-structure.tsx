"use client";

import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LayersIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { useDialogs } from "~/components/ui/use-dialogs";
import {
  getBlockNotePlainLines,
  getBlockNotePlainText,
  plainTextToBlockNote,
} from "~/lib/blocknote/document";
import {
  formatScore,
  PACED_DEFAULT_ANSWER_SECONDS,
  PACED_DEFAULT_QUESTION_SECONDS,
  parseScoreInput,
} from "@hakgyo/shared";
import { api, type RouterOutputs } from "~/trpc/react";

type Assessment = RouterOutputs["assessment"]["get"];
type Section = Assessment["sections"][number];

/** Sections as the learner sees them, each with its questions in order. */
export function sectionLayout(assessment: Assessment) {
  if (!assessment.sections.length) {
    return [
      {
        sectionId: null as string | null,
        questionIds: assessment.questions.map(({ id }) => id),
      },
    ];
  }
  return assessment.sections.map(
    (
      section,
    ): {
      sectionId: string | null;
      questionIds: string[];
    } => ({
      sectionId: section.id,
      questionIds: assessment.questions
        .filter((question) => question.sectionId === section.id)
        .map(({ id }) => id),
    }),
  );
}

/** A section's instructions as plain lines (they are stored as BlockNote paragraphs). */
function instructionsText(section: Section) {
  return getBlockNotePlainLines(section.instructions);
}

function instructionsDocument(text: string) {
  return text.trim() ? plainTextToBlockNote(text) : null;
}

type Navigation = Section["navigation"];

const navigationLabels: Record<Navigation, string> = {
  FREE: "Bebas",
  FORWARD_ONLY: "Maju saja",
  PACED: "Diatur sistem",
};

const navigationHints: Record<Navigation, string> = {
  FREE: "Murid bisa pindah ke soal mana saja dan mengubah jawaban.",
  FORWARD_ONLY: "Soal yang sudah dilewati tidak bisa dibuka lagi.",
  PACED:
    "Soal berganti sendiri: audio diputar otomatis, lalu waktu menjawab berjalan. Seperti bagian mendengar EPS-TOPIK.",
};

/** A whole number field: null when empty, NaN when not a whole number in range. */
function parseWhole(text: string, min: number, max: number) {
  if (!text.trim()) return null;
  const value = Number(text.trim());
  return Number.isInteger(value) && value >= min && value <= max ? value : NaN;
}

const wholeText = (value: number | null) =>
  value === null ? "" : String(value);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Perubahan belum tersimpan.";
}

function SectionForm({
  section,
  onDone,
}: {
  section: Section;
  onDone: () => void;
}) {
  const utils = api.useUtils();
  const update = api.assessment.updateSection.useMutation();
  const [title, setTitle] = useState(section.title);
  const initialInstructions = instructionsText(section);
  const initialMinutes = section.timeLimitSeconds
    ? formatScore(section.timeLimitSeconds / 60)
    : "";
  const [instructions, setInstructions] = useState(initialInstructions);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [shuffle, setShuffle] = useState(section.shuffleQuestions);
  const [navigation, setNavigation] = useState(section.navigation);
  const [lockAnswers, setLockAnswers] = useState(section.lockAnswers);
  const [allowEarlyFinish, setAllowEarlyFinish] = useState(
    section.allowEarlyFinish,
  );
  const [maxPlays, setMaxPlays] = useState(wholeText(section.audioMaxPlays));
  const [autoplay, setAutoplay] = useState(section.audioAutoplay);
  const [gapSeconds, setGapSeconds] = useState(
    String(section.audioRepeatGapSeconds),
  );
  const [answerSeconds, setAnswerSeconds] = useState(
    wholeText(section.pacedAnswerSeconds),
  );
  const [questionSeconds, setQuestionSeconds] = useState(
    wholeText(section.pacedQuestionSeconds),
  );
  const paced = navigation === "PACED";
  const parsedMaxPlays = parseWhole(maxPlays, 1, 10);
  const parsedGap = parseWhole(gapSeconds, 0, 30);
  const parsedAnswerSeconds = parseWhole(answerSeconds, 1, 300);
  const parsedQuestionSeconds = parseWhole(questionSeconds, 5, 1_800);
  // The gap only counts while its field shows.
  const gapShown = paced || autoplay;
  const rulesValid =
    !Number.isNaN(parsedMaxPlays) &&
    (!gapShown || (parsedGap !== null && !Number.isNaN(parsedGap))) &&
    !Number.isNaN(parsedAnswerSeconds) &&
    !Number.isNaN(parsedQuestionSeconds);
  // Minutes may have decimals (90 seconds is 1,5); stored as whole seconds.
  const parsedSeconds = minutes.trim()
    ? Math.round(parseScoreInput(minutes) * 60)
    : null;
  const minutesValid =
    parsedSeconds === null ||
    (Number.isFinite(parsedSeconds) &&
      parsedSeconds >= 60 &&
      parsedSeconds <= 14_400);

  const valid = Boolean(title.trim()) && minutesValid && rulesValid;

  async function save() {
    if (!valid) return;
    try {
      await update.mutateAsync({
        sectionId: section.id,
        title: title.trim(),
        // Untouched fields are not sent, so rich instructions written elsewhere (MCP) and exact
        // second limits survive a rename.
        ...(instructions === initialInstructions
          ? {}
          : { instructions: instructionsDocument(instructions) }),
        ...(minutes === initialMinutes
          ? {}
          : { timeLimitSeconds: parsedSeconds }),
        shuffleQuestions: shuffle,
        navigation,
        lockAnswers,
        allowEarlyFinish,
        audioMaxPlays: parsedMaxPlays,
        audioAutoplay: autoplay,
        ...(gapShown && parsedGap !== null && !Number.isNaN(parsedGap)
          ? { audioRepeatGapSeconds: parsedGap }
          : {}),
        pacedAnswerSeconds: parsedAnswerSeconds,
        pacedQuestionSeconds: parsedQuestionSeconds,
      });
      await utils.assessment.get.invalidate({
        assessmentId: section.assessmentId,
      });
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`section-title-${section.id}`}>Nama bagian</Label>
        <Input
          id={`section-title-${section.id}`}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`section-instructions-${section.id}`}>
          Petunjuk bagian{" "}
          <span className="text-muted-foreground font-normal">(opsional)</span>
        </Label>
        <Textarea
          id={`section-instructions-${section.id}`}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Ditampilkan sebelum murid mulai bagian ini."
          value={instructions}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`section-minutes-${section.id}`}>
          Batas waktu bagian (menit)
        </Label>
        <Input
          aria-invalid={!minutesValid}
          className="w-28"
          id={`section-minutes-${section.id}`}
          inputMode="numeric"
          onChange={(event) => setMinutes(event.target.value)}
          placeholder="Tanpa batas"
          value={minutes}
        />
        {!minutesValid ? (
          <p className="text-destructive text-xs">
            Isi 1 sampai 240 menit, atau kosongkan.
          </p>
        ) : null}
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="block font-medium">Acak soal di bagian ini</span>
          <span className="text-muted-foreground block text-xs">
            Urutan diacak di dalam bagian saja.
          </span>
        </span>
        <Switch checked={shuffle} onCheckedChange={setShuffle} />
      </label>
      <div className="grid gap-1.5">
        <Label htmlFor={`section-navigation-${section.id}`}>
          Perpindahan soal
        </Label>
        <Select
          value={navigation}
          onValueChange={(value) => {
            if (value) setNavigation(value);
          }}
        >
          <SelectTrigger
            className="w-44"
            id={`section-navigation-${section.id}`}
          >
            <SelectValue>{navigationLabels[navigation]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(navigationLabels) as Navigation[]).map((value) => (
              <SelectItem key={value} value={value}>
                {navigationLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {navigationHints[navigation]}
        </p>
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="block font-medium">Kunci jawaban pertama</span>
          <span className="text-muted-foreground block text-xs">
            Pilihan pertama di soal pilihan tunggal tidak bisa diganti.
          </span>
        </span>
        <Switch checked={lockAnswers} onCheckedChange={setLockAnswers} />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="block font-medium">Boleh selesai lebih awal</span>
          <span className="text-muted-foreground block text-xs">
            Murid bisa menekan &quot;Selesai bagian ini&quot; sebelum waktunya
            habis.
          </span>
        </span>
        <Switch
          checked={allowEarlyFinish}
          onCheckedChange={setAllowEarlyFinish}
        />
      </label>
      <div className="grid gap-1.5">
        <Label htmlFor={`section-plays-${section.id}`}>
          Batas putar audio per soal
        </Label>
        <Input
          aria-invalid={Number.isNaN(parsedMaxPlays)}
          className="w-28"
          id={`section-plays-${section.id}`}
          inputMode="numeric"
          onChange={(event) => setMaxPlays(event.target.value)}
          placeholder={paced ? "1" : "Tanpa batas"}
          value={maxPlays}
        />
        <p
          className={
            Number.isNaN(parsedMaxPlays)
              ? "text-destructive text-xs"
              : "text-muted-foreground text-xs"
          }
        >
          {Number.isNaN(parsedMaxPlays)
            ? "Isi 1 sampai 10, atau kosongkan."
            : "Dengan batas, audio tidak bisa digeser atau dijeda."}
        </p>
      </div>
      {paced ? null : (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-medium">Putar audio otomatis</span>
            <span className="text-muted-foreground block text-xs">
              Audio mulai sendiri saat soal tampil, sampai batas putar.
            </span>
          </span>
          <Switch checked={autoplay} onCheckedChange={setAutoplay} />
        </label>
      )}
      {gapShown ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`section-gap-${section.id}`}>
            Jeda sebelum diputar lagi (detik)
          </Label>
          <Input
            aria-invalid={parsedGap === null || Number.isNaN(parsedGap)}
            className="w-28"
            id={`section-gap-${section.id}`}
            inputMode="numeric"
            onChange={(event) => setGapSeconds(event.target.value)}
            value={gapSeconds}
          />
        </div>
      ) : null}
      {paced ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`section-answer-${section.id}`}>
              Waktu menjawab setelah audio (detik)
            </Label>
            <Input
              aria-invalid={Number.isNaN(parsedAnswerSeconds)}
              className="w-28"
              id={`section-answer-${section.id}`}
              inputMode="numeric"
              onChange={(event) => setAnswerSeconds(event.target.value)}
              placeholder={String(PACED_DEFAULT_ANSWER_SECONDS)}
              value={answerSeconds}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`section-question-${section.id}`}>
              Waktu soal tanpa audio (detik)
            </Label>
            <Input
              aria-invalid={Number.isNaN(parsedQuestionSeconds)}
              className="w-28"
              id={`section-question-${section.id}`}
              inputMode="numeric"
              onChange={(event) => setQuestionSeconds(event.target.value)}
              placeholder={String(PACED_DEFAULT_QUESTION_SECONDS)}
              value={questionSeconds}
            />
          </div>
        </div>
      ) : null}
      {!rulesValid ? (
        <p className="text-destructive text-xs">
          Periksa angka audio dan waktu: jeda 0 sampai 30 detik, waktu menjawab
          1 sampai 300 detik, waktu soal 5 sampai 1.800 detik.
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button onClick={onDone} size="sm" type="button" variant="ghost">
          Batal
        </Button>
        <Button
          disabled={!valid || update.isPending}
          onClick={() => void save()}
          size="sm"
          type="button"
        >
          {update.isPending ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : null}
          Simpan bagian
        </Button>
      </div>
    </div>
  );
}

/**
 * "Bagian & urutan": the assessment's sections (name, instructions, time limit, shuffle) and the
 * order of every question within them. Changes to sections save at once; the question order
 * saves with "Simpan urutan".
 */
export function AssessmentStructureSheet({
  assessment,
  readOnly,
}: {
  assessment: Assessment;
  readOnly: boolean;
}) {
  const utils = api.useUtils();
  const { confirm, prompt, dialogs } = useDialogs();
  const createSection = api.assessment.createSection.useMutation();
  const deleteSection = api.assessment.deleteSection.useMutation();
  const arrange = api.assessment.arrangeQuestions.useMutation();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [layout, setLayout] = useState(() => sectionLayout(assessment));
  const [dirty, setDirty] = useState(false);
  const numbers = new Map(
    assessment.questions.map((question, index) => [question.id, index + 1]),
  );
  const previews = new Map(
    assessment.questions.map((question) => [
      question.id,
      getBlockNotePlainText(question.prompt).slice(0, 80) ||
        "(soal tanpa teks)",
    ]),
  );
  const groupedIds = new Set(
    assessment.questions.flatMap((question) =>
      question.groupId ? [question.id] : [],
    ),
  );
  const sectionTitles = new Map(
    assessment.sections.map((section) => [section.id, section.title]),
  );

  async function refresh() {
    await utils.assessment.get.invalidate({ assessmentId: assessment.id });
    const fresh = await utils.assessment.get.fetch({
      assessmentId: assessment.id,
    });
    setLayout(sectionLayout(fresh));
    setDirty(false);
  }

  /** Adding or deleting a section reloads the order; ask before unsaved moves are lost. */
  async function keepUnsavedOrder() {
    if (!dirty) return false;
    return !(await confirm({
      title: "Buang urutan yang belum disimpan?",
      description:
        "Perubahan urutan soal belum disimpan dan akan hilang. Klik Simpan urutan dulu jika ingin menyimpannya.",
      confirmLabel: "Buang dan lanjutkan",
      destructive: true,
    }));
  }

  async function addSection() {
    if (await keepUnsavedOrder()) return;
    const values = await prompt({
      title: "Tambah bagian",
      description: assessment.sections.length
        ? "Bagian baru ditambahkan di akhir. Pindahkan soal ke sana lewat daftar di bawah."
        : "Semua soal yang sudah ada masuk ke bagian pertama ini.",
      fields: [
        {
          name: "title",
          label: "Nama bagian",
          defaultValue: assessment.sections.length ? "" : "Membaca",
        },
      ],
    });
    if (!values?.title?.trim()) return;
    try {
      await createSection.mutateAsync({
        assessmentId: assessment.id,
        title: values.title.trim(),
      });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function removeSection(section: Section) {
    if (await keepUnsavedOrder()) return;
    const others = assessment.sections.filter(({ id }) => id !== section.id);
    const ok = await confirm({
      title: `Hapus bagian ${section.title}?`,
      description: others.length
        ? "Soal di bagian ini dipindahkan ke bagian sebelumnya (atau berikutnya). Soalnya tidak terhapus."
        : "Ini bagian terakhir: tugas kembali tanpa bagian. Soalnya tidak terhapus.",
      confirmLabel: "Hapus bagian",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSection.mutateAsync({ sectionId: section.id });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  /**
   * Moves a question one place up or down. At the edge of its section it moves into the
   * neighbouring section (also an empty one) instead: to that section's end going up, its start
   * going down.
   */
  function moveQuestion(questionId: string, offset: -1 | 1) {
    setLayout((current) => {
      const groupIndex = current.findIndex((group) =>
        group.questionIds.includes(questionId),
      );
      const group = current[groupIndex];
      if (!group) return current;
      const index = group.questionIds.indexOf(questionId);
      const target = index + offset;
      const next = current.map((entry) => ({
        ...entry,
        questionIds: [...entry.questionIds],
      }));
      if (target >= 0 && target < group.questionIds.length) {
        const ids = next[groupIndex]!.questionIds;
        [ids[index], ids[target]] = [ids[target]!, ids[index]!];
        return next;
      }
      const neighbour = next[groupIndex + offset];
      if (!neighbour) return current;
      next[groupIndex]!.questionIds.splice(index, 1);
      if (offset < 0) neighbour.questionIds.push(questionId);
      else neighbour.questionIds.unshift(questionId);
      return next;
    });
    setDirty(true);
  }

  function moveSection(sectionId: string | null, offset: -1 | 1) {
    setLayout((current) => {
      const index = current.findIndex((group) => group.sectionId === sectionId);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setDirty(true);
  }

  function setQuestionSection(questionId: string, sectionId: string) {
    setLayout((current) =>
      current.map((group) => ({
        ...group,
        questionIds:
          group.sectionId === sectionId
            ? [
                ...group.questionIds.filter((id) => id !== questionId),
                questionId,
              ]
            : group.questionIds.filter((id) => id !== questionId),
      })),
    );
    setDirty(true);
  }

  async function saveOrder() {
    try {
      const result = await arrange.mutateAsync({
        assessmentId: assessment.id,
        sections: layout,
      });
      await refresh();
      toast.success(
        result.detachedFromGroups
          ? `Urutan soal disimpan. ${result.detachedFromGroups} soal keluar dari kelompoknya karena tidak lagi berurutan.`
          : "Urutan soal disimpan.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const sectioned = assessment.sections.length > 0;
  const totalSeconds = assessment.sections.reduce(
    (total, section) => total + (section.timeLimitSeconds ?? 0),
    0,
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setLayout(sectionLayout(assessment));
          setDirty(false);
          setEditingId(null);
        }
      }}
    >
      <SheetTrigger
        render={<Button size="sm" type="button" variant="outline" />}
      >
        <LayersIcon data-icon="inline-start" />
        Bagian & urutan
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Bagian & urutan soal</SheetTitle>
          <SheetDescription>
            Bagi tugas menjadi bagian dengan petunjuk dan waktunya sendiri,
            misalnya Membaca dan Mendengar, lalu atur urutan soal.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Bagian</h3>
              <Button
                disabled={readOnly || createSection.isPending}
                onClick={() => void addSection()}
                size="sm"
                type="button"
                variant="outline"
              >
                <PlusIcon />
                Tambah bagian
              </Button>
            </div>
            {sectioned ? (
              <ul className="divide-y border-y">
                {assessment.sections.map((section) =>
                  editingId === section.id ? (
                    <li key={section.id} className="py-3">
                      <SectionForm
                        onDone={() => setEditingId(null)}
                        section={section}
                      />
                    </li>
                  ) : (
                    <li
                      key={section.id}
                      className="flex items-center gap-2 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{section.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {
                            assessment.questions.filter(
                              (question) => question.sectionId === section.id,
                            ).length
                          }{" "}
                          soal ·{" "}
                          {section.timeLimitSeconds
                            ? `${formatScore(section.timeLimitSeconds / 60)} menit`
                            : "tanpa batas waktu"}
                          {section.shuffleQuestions ? " · diacak" : ""}
                          {section.navigation === "FREE"
                            ? ""
                            : ` · ${navigationLabels[section.navigation].toLowerCase()}`}
                          {section.lockAnswers ? " · jawaban dikunci" : ""}
                          {section.audioMaxPlays
                            ? ` · audio ${section.audioMaxPlays}×`
                            : ""}
                        </p>
                      </div>
                      <Button
                        aria-label={`Ubah bagian ${section.title}`}
                        disabled={readOnly}
                        onClick={() => setEditingId(section.id)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        aria-label={`Hapus bagian ${section.title}`}
                        disabled={readOnly || deleteSection.isPending}
                        onClick={() => void removeSection(section)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon />
                      </Button>
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                Tugas ini belum punya bagian. Semua soal dikerjakan sebagai satu
                kesatuan dengan satu batas waktu.
              </p>
            )}
            {sectioned && totalSeconds ? (
              <p className="text-muted-foreground text-xs">
                Total waktu bagian: {formatScore(totalSeconds / 60)} menit.
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Urutan soal</h3>
            {layout.map((group, groupIndex) => (
              <div key={group.sectionId ?? "all"} className="space-y-2">
                {group.sectionId ? (
                  <div className="flex items-center gap-1">
                    <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-semibold tracking-wide uppercase">
                      {sectionTitles.get(group.sectionId)}
                    </p>
                    <Button
                      aria-label="Pindahkan bagian ke atas"
                      disabled={readOnly || groupIndex === 0}
                      onClick={() => moveSection(group.sectionId, -1)}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      aria-label="Pindahkan bagian ke bawah"
                      disabled={readOnly || groupIndex === layout.length - 1}
                      onClick={() => moveSection(group.sectionId, 1)}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <ArrowDownIcon />
                    </Button>
                  </div>
                ) : null}
                {group.questionIds.length ? (
                  <ol className="divide-y border-y">
                    {group.questionIds.map((questionId) => (
                      <li
                        key={questionId}
                        className="flex items-center gap-2 py-2"
                      >
                        <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded text-xs tabular-nums">
                          {numbers.get(questionId)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {groupedIds.has(questionId) ? (
                            <span className="text-primary mr-1 text-xs font-semibold">
                              Kelompok ·
                            </span>
                          ) : null}
                          {previews.get(questionId)}
                        </span>
                        {sectioned ? (
                          <Select
                            disabled={readOnly}
                            value={group.sectionId ?? undefined}
                            onValueChange={(value) => {
                              if (value) setQuestionSection(questionId, value);
                            }}
                          >
                            <SelectTrigger
                              aria-label="Bagian soal"
                              className="w-28"
                              size="sm"
                            >
                              <SelectValue>
                                {sectionTitles.get(group.sectionId ?? "")}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent align="end">
                              {assessment.sections.map((section) => (
                                <SelectItem key={section.id} value={section.id}>
                                  {section.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                        <Button
                          aria-label="Pindahkan soal ke atas"
                          disabled={readOnly}
                          onClick={() => moveQuestion(questionId, -1)}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowUpIcon />
                        </Button>
                        <Button
                          aria-label="Pindahkan soal ke bawah"
                          disabled={readOnly}
                          onClick={() => moveQuestion(questionId, 1)}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowDownIcon />
                        </Button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
                    Belum ada soal di bagian ini.
                  </p>
                )}
              </div>
            ))}
            <p className="text-muted-foreground text-xs">
              Nomor soal mengikuti urutan baru setelah disimpan.
            </p>
          </section>
        </div>
        <SheetFooter className="bg-popover sticky bottom-0 border-t">
          <Button
            disabled={readOnly || !dirty || arrange.isPending}
            onClick={() => void saveOrder()}
            type="button"
          >
            {arrange.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : null}
            Simpan urutan
          </Button>
        </SheetFooter>
        {dialogs}
      </SheetContent>
    </Sheet>
  );
}
