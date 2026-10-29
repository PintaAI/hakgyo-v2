"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  blueprintTypes,
  epsTagVocabulary,
  epsTopikBlueprint,
  type epsTopicSlugs,
  tagLabel,
} from "@hakgyo/shared";
import { epsTaxonomy } from "@hakgyo/shared/eps-taxonomy";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import Link from "~/components/link";
import {
  BankAudioActions,
  BankImageActions,
} from "~/components/superadmin-bank-media";
import {
  bankMoveLabel,
  bankQuestionHref,
  useMoveBankQuestions,
} from "~/components/superadmin-bank-status";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import {
  bankReadinessProblem,
  bankStatusLabels,
  bankTransitions,
  MAX_BANK_BATCH,
  type BankStatus,
} from "~/lib/bank-status";
import { api } from "~/trpc/react";

type Status = BankStatus;

const topicTags = epsTagVocabulary.filter((entry) => entry.group === "topik");

/** Tabs, review queue first. The page prefetches the review queue (`{ status: "REVIEW" }`). */
const bankStatusTabs: Status[] = ["REVIEW", "DRAFT", "LIVE", "RETIRED"];

function levelOf(tags: readonly string[]) {
  const level = tags.find((tag) => tag.startsWith("level:"));
  return level ? tagLabel(level) : null;
}

function typeLabel(type: string) {
  return type === "untagged" ? "Tanpa label tipe" : tagLabel(type);
}

const selectClassName =
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm";

/**
 * The superadmin bank area (docs/eps-question-generator.md section 6): coverage per question type
 * against the pilot targets, the review queue where questions move DRAFT → REVIEW → LIVE or are
 * retired, and the way into each question's editor. The bank is system data, not an assessment:
 * organizations get set soal generated from its LIVE questions.
 */
export function SuperadminBank() {
  const router = useRouter();
  const utils = api.useUtils();
  const overview = api.superadmin.bank.overview.useQuery();
  const [status, setStatus] = useState<Status>("REVIEW");
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const questions = api.superadmin.bank.questions.useQuery(
    type ? { status, type } : { status },
  );
  const createQuestion = api.superadmin.bank.createQuestion.useMutation();
  const { move, isPending: moving } = useMoveBankQuestions();

  async function refresh() {
    await Promise.all([
      utils.superadmin.bank.overview.invalidate(),
      utils.superadmin.bank.questions.invalidate(),
    ]);
  }

  async function moveSelected(to: Status) {
    if (!selected.size) return;
    const previews = new Map(
      rows.map((question) => [question.id, question.preview]),
    );
    const result = await move([...selected], to, (questionId) => {
      const preview = previews.get(questionId);
      return preview
        ? `“${preview.length > 30 ? `${preview.slice(0, 30)}…` : preview}”`
        : "soal";
    });
    if (result) setSelected(new Set());
  }

  async function newQuestion() {
    try {
      const created = await createQuestion.mutateAsync({});
      await utils.superadmin.bank.overview.invalidate();
      router.push(bankQuestionHref(created.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Soal gagal dibuat.",
      );
    }
  }

  const data = overview.data;
  const rows = questions.data ?? [];
  const allSelected =
    rows.length > 0 && rows.every(({ id }) => selected.has(id));
  const statusTotals = data
    ? data.types.reduce<Record<Status, number>>(
        (totals, row) => {
          for (const tab of bankStatusTabs) totals[tab] += row.counts[tab];
          return totals;
        },
        { DRAFT: 0, REVIEW: 0, LIVE: 0, RETIRED: 0 },
      )
    : null;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 pb-32 sm:px-6 sm:py-10">
      <header className="space-y-3 border-b pb-6">
        <Link
          href="/superadmin"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2",
          )}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Superadmin
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Bank soal</h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Soal EPS-TOPIK milik Hakgyo. Tulis, periksa dan setujui soal di
              sini. LPK membuat set soal pemantapan dari soal yang sudah siap
              dipakai; perubahan di bank hanya berlaku untuk set soal yang
              dibuat sesudahnya.
            </p>
          </div>
          <Button
            disabled={createQuestion.isPending}
            onClick={() => void newQuestion()}
          >
            {createQuestion.isPending ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            Soal baru
          </Button>
        </div>
      </header>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Cakupan per tipe</h2>
          <p className="text-muted-foreground text-xs">
            {data
              ? `${data.total} soal di bank. Target min. adalah jumlah soal siap pakai agar LPK bisa membuat ${data.pilotPackages} set soal tanpa soal yang sama. Boleh lebih: makin banyak soal, makin bervariasi set soalnya. Ketuk tipe untuk menyaring daftar.`
              : "Memuat cakupan…"}
          </p>
        </div>
        {data ? (
          <ul className="divide-y border-y sm:rounded-lg sm:border">
            {data.types.map((row) => (
              <li key={row.type}>
                <button
                  className={cn(
                    "hover:bg-muted/40 flex w-full items-center gap-3 px-1 py-2 text-left text-sm transition-colors sm:px-3",
                    type === row.type && "bg-muted/60",
                  )}
                  onClick={() => {
                    setType((current) =>
                      current === row.type ? "" : row.type,
                    );
                    setSelected(new Set());
                  }}
                  type="button"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{typeLabel(row.type)}</span>
                    {row.counts.REVIEW || row.counts.DRAFT ? (
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {[
                          row.counts.REVIEW
                            ? `${row.counts.REVIEW} perlu review`
                            : "",
                          row.counts.DRAFT ? `${row.counts.DRAFT} draf` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end whitespace-nowrap tabular-nums">
                    <span
                      className={cn(
                        row.target && row.counts.LIVE >= row.target
                          ? "text-emerald-600"
                          : "text-foreground",
                      )}
                    >
                      {row.counts.LIVE} siap
                    </span>
                    {row.target ? (
                      <span className="text-muted-foreground text-xs">
                        target min. {row.target}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <AiDraftForm
        onDone={async () => {
          setStatus("DRAFT");
          setSelected(new Set());
          await refresh();
        }}
      />

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {bankStatusTabs.map((tab) => (
              <Button
                key={tab}
                onClick={() => {
                  setStatus(tab);
                  setSelected(new Set());
                }}
                size="sm"
                variant={tab === status ? "default" : "ghost"}
              >
                {bankStatusLabels[tab]}
                {statusTotals ? (
                  <span className="tabular-nums opacity-70">
                    {statusTotals[tab]}
                  </span>
                ) : null}
              </Button>
            ))}
          </div>
          <label className="sm:w-64">
            <span className="sr-only">Tipe soal</span>
            <select
              className={selectClassName}
              onChange={(event) => {
                setType(event.target.value);
                setSelected(new Set());
              }}
              value={type}
            >
              <option value="">Semua tipe</option>
              {(data?.types ?? []).map((row) => (
                <option key={row.type} value={row.type}>
                  {typeLabel(row.type)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {questions.isPending ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Memuat soal…
          </p>
        ) : questions.isError ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-destructive text-sm">
              {questions.error.message}
            </p>
            <Button
              onClick={() => void questions.refetch()}
              size="sm"
              variant="outline"
            >
              Coba lagi
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Tidak ada soal di sini.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2 px-1 text-sm sm:px-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) =>
                  setSelected(
                    checked ? new Set(rows.map(({ id }) => id)) : new Set(),
                  )
                }
              />
              Pilih semua ({rows.length})
            </label>
            {rows.length >= MAX_BANK_BATCH ? (
              <p className="text-muted-foreground text-xs">
                Hanya {MAX_BANK_BATCH} soal terbaru yang tampil.
              </p>
            ) : null}
            <ul className="divide-y border-y sm:rounded-lg sm:border">
              {rows.map((question) => {
                const epsType = question.tags.find((tag) =>
                  tag.startsWith("eps:"),
                );
                const level = levelOf(question.tags);
                const problem = bankReadinessProblem(question);
                const retired = question.status === "RETIRED";
                return (
                  <li key={question.id}>
                    <div className="flex items-start gap-3 px-1 py-3 sm:px-3">
                      <Checkbox
                        aria-label="Pilih soal ini"
                        checked={selected.has(question.id)}
                        className="mt-0.5"
                        onCheckedChange={(checked) =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (checked) next.add(question.id);
                            else next.delete(question.id);
                            return next;
                          })
                        }
                      />
                      <Link
                        className="group/row focus-visible:ring-ring/50 -my-1 flex min-w-0 flex-1 items-start gap-2 rounded-md py-1 outline-none focus-visible:ring-3"
                        href={bankQuestionHref(question.id)}
                      >
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                            <span>
                              {epsType ? tagLabel(epsType) : "Tanpa label tipe"}
                            </span>
                            {level ? <span>· {level}</span> : null}
                            {question.groupId ? <span>· kelompok</span> : null}
                            {problem && !retired ? (
                              <Badge variant="destructive">{problem}</Badge>
                            ) : null}
                          </span>
                          <span className="group-hover/row:text-primary line-clamp-2 block text-sm transition-colors">
                            {question.preview || "(soal tanpa teks)"}
                          </span>
                          {question.flags.length ? (
                            <span className="block text-xs text-amber-700 dark:text-amber-400">
                              {question.flags
                                .map((flag) => flag.message)
                                .join(" ")}
                            </span>
                          ) : null}
                          {question.mediaBrief ? (
                            <span className="text-muted-foreground block text-xs">
                              Gambar: {question.mediaBrief}
                            </span>
                          ) : null}
                        </span>
                        <ChevronRightIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      </Link>
                    </div>
                    {retired ? null : (
                      <>
                        <BankImageActions
                          className="px-1 pb-3 pl-8 sm:px-3 sm:pl-10"
                          onDone={refresh}
                          question={question}
                        />
                        <BankAudioActions
                          className="px-1 pb-3 pl-8 sm:px-3 sm:pl-10"
                          onDone={refresh}
                          question={question}
                        />
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {selected.size ? (
        <div className="bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t px-4 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{selected.size} dipilih</span>
            {bankTransitions[status].map((to) => (
              <Button
                key={to}
                disabled={moving}
                onClick={() => void moveSelected(to)}
                size="sm"
                variant={to === "RETIRED" ? "outline" : "default"}
              >
                {bankMoveLabel(status, to)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}

/** Types some slot of the blueprint takes; drafts of other types would never reach a set. */
const draftTypes = epsTaxonomy.filter((entry) =>
  blueprintTypes(epsTopikBlueprint).has(entry.tag),
);

const levels = [
  { value: "mudah", label: "Mudah" },
  { value: "sedang", label: "Sedang" },
  { value: "sulit", label: "Sulit" },
] as const;

/**
 * "Buat draf dengan AI" (docs/eps-question-generator.md section 6): type, count, level and
 * optional topic, keywords and book chapter; the drafts land in Draf with their check flags.
 */
function AiDraftForm({ onDone }: { onDone: () => Promise<void> }) {
  const create = api.superadmin.bank.createDrafts.useMutation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("eps:R8");
  const [count, setCount] = useState("5");
  const [level, setLevel] =
    useState<(typeof levels)[number]["value"]>("sedang");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [chapter, setChapter] = useState("");
  const [model, setModel] = useState<"gpt-5.4" | "gpt-5.4-mini">("gpt-5.4");

  async function submit() {
    try {
      const result = await create.mutateAsync({
        type,
        count: Number(count),
        level,
        topic: topic ? (topic as (typeof epsTopicSlugs)[number]) : undefined,
        keywords: keywords
          .split(/[,،、]/)
          .map((word) => word.trim())
          .filter(Boolean),
        chapter: chapter ? Number(chapter) : undefined,
        model,
      });
      toast.success(
        `${result.created} draf dibuat${result.flagged ? `, ${result.flagged} perlu diperhatikan` : ""}. Periksa bahasa Koreanya sebelum mengirim ke review.`,
      );
      await onDone();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Draf gagal dibuat.",
      );
    }
  }

  return (
    <section className="space-y-3 border-y py-4 sm:rounded-lg sm:border sm:px-4">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-sm font-semibold"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Buat draf dengan AI
        <span className="text-muted-foreground text-xs font-normal">
          {open ? "Tutup" : "Buka"}
        </span>
      </button>
      {open ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipe soal">
            <select
              className={selectClassName}
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              {draftTypes.map((entry) => (
                <option key={entry.tag} value={entry.tag}>
                  {entry.code} · {entry.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jumlah (1–5)">
            <Input
              inputMode="numeric"
              max={5}
              min={1}
              onChange={(event) => setCount(event.target.value)}
              type="number"
              value={count}
            />
          </Field>
          <Field label="Tingkat">
            <select
              className={selectClassName}
              onChange={(event) => setLevel(event.target.value as typeof level)}
              value={level}
            >
              {levels.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Topik (opsional)">
            <select
              className={selectClassName}
              onChange={(event) => setTopic(event.target.value)}
              value={topic}
            >
              <option value="">Bebas</option>
              {topicTags.map((entry) => (
                <option
                  key={entry.tag}
                  value={entry.tag.slice("topik:".length)}
                >
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kata kunci (opsional, pisahkan dengan koma)">
            <Input
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="안전모, 장갑"
              value={keywords}
            />
          </Field>
          <Field label="Bab buku (opsional)">
            <Input
              inputMode="numeric"
              onChange={(event) => setChapter(event.target.value)}
              placeholder="Misalnya 12"
              type="number"
              value={chapter}
            />
          </Field>
          <Field label="Model">
            <select
              className={selectClassName}
              onChange={(event) => setModel(event.target.value as typeof model)}
              value={model}
            >
              <option value="gpt-5.4">gpt-5.4 (diperiksa gpt-5.4-mini)</option>
              <option value="gpt-5.4-mini">
                gpt-5.4-mini (diperiksa gpt-5.4)
              </option>
            </select>
          </Field>
          <div className="flex items-end sm:col-span-2">
            <Button
              className="w-full sm:w-auto"
              disabled={
                create.isPending || !(Number(count) >= 1 && Number(count) <= 5)
              }
              onClick={() => void submit()}
            >
              {create.isPending ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : null}
              {create.isPending ? "Menulis draf…" : "Buat draf"}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs sm:col-span-2">
            AI menulis soal baru dari kartu tipe soal, lalu model kedua
            menjawabnya tanpa kunci. Semua draf tetap harus diperiksa sebelum
            dipakai.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
