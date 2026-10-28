"use client";

import { useState, type ReactNode } from "react";
import { epsTagVocabulary, type epsTopicSlugs, tagLabel } from "@hakgyo/shared";
import { epsTaxonomy } from "@hakgyo/shared/eps-taxonomy";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  ImageIcon,
  LibraryIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import Link from "~/components/link";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { EmptyState } from "~/components/ui/empty-state";
import { cn } from "~/lib/utils";
import {
  bankReadinessProblem,
  bankStatusLabels,
  bankTransitions,
  MAX_BANK_BATCH,
  type BankStatus,
} from "~/lib/bank-status";
import { api, type RouterOutputs } from "~/trpc/react";

type Overview = RouterOutputs["superadmin"]["bank"]["overview"];
type Status = BankStatus;

const topicTags = epsTagVocabulary.filter((entry) => entry.group === "topik");

/** Tabs, review queue first. */
const statusTabs: Status[] = ["REVIEW", "DRAFT", "LIVE", "RETIRED"];

const moveLabels: Record<Status, string> = {
  DRAFT: "Kembalikan ke draf",
  REVIEW: "Kirim ke review",
  LIVE: "Setujui",
  RETIRED: "Pensiunkan",
};

function levelOf(tags: readonly string[]) {
  const level = tags.find((tag) => tag.startsWith("level:"));
  return level ? tagLabel(level) : null;
}

/**
 * The superadmin bank area (docs/eps-question-generator.md section 6): coverage per question type
 * against the pilot targets, and the review queue where questions move DRAFT → REVIEW → LIVE or
 * are retired. Questions are written in the ordinary editor of the bank assessment.
 */
export function SuperadminBank({ initialData }: { initialData: Overview }) {
  const utils = api.useUtils();
  const overview = api.superadmin.bank.overview.useQuery(undefined, {
    initialData,
  });
  const data = overview.data;
  const [bankId, setBankId] = useState(data.banks[0]?.id ?? null);
  const bank = data.banks.find(({ id }) => id === bankId) ?? data.banks[0];
  const [status, setStatus] = useState<Status>("REVIEW");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const questions = api.superadmin.bank.questions.useQuery(
    { assessmentId: bank?.id ?? "", status },
    { enabled: Boolean(bank) },
  );
  const join = api.superadmin.bank.joinSystemOrganization.useMutation();
  const create = api.superadmin.bank.create.useMutation();
  const setBankStatus = api.superadmin.bank.setStatus.useMutation();

  async function refresh() {
    await Promise.all([
      utils.superadmin.bank.overview.invalidate(),
      utils.superadmin.bank.questions.invalidate(),
    ]);
  }

  async function move(to: Status) {
    if (!bank || !selected.size) return;
    try {
      const result = await setBankStatus.mutateAsync({
        assessmentId: bank.id,
        questionIds: [...selected],
        status: to,
      });
      setSelected(new Set());
      await refresh();
      if (result.skipped.length) {
        const numbers = new Map(
          (questions.data ?? []).map((question) => [
            question.id,
            question.position + 1,
          ]),
        );
        toast.warning(
          `${result.moved} soal dipindah. ${result.skipped.length} tidak: ${result.skipped
            .slice(0, 3)
            .map(
              (entry) => `no. ${numbers.get(entry.questionId)} ${entry.reason}`,
            )
            .join("; ")}${result.skipped.length > 3 ? "; …" : ""}.`,
        );
      } else {
        toast.success(`${result.moved} soal dipindah.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memindah.");
    }
  }

  const rows = questions.data ?? [];
  const allSelected =
    rows.length > 0 && rows.every(({ id }) => selected.has(id));

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
        <h1 className="text-3xl font-semibold tracking-tight">Bank soal</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Soal EPS-TOPIK milik Hakgyo. Tulis dan edit soal di editor tugas; di
          sini soal ditinjau dan disetujui sebelum dipakai paket pemantapan.
        </p>
      </header>

      {!data.canEdit ? (
        <section className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Untuk menulis dan mengedit soal bank, gabung ke organisasi Hakgyo
            sebagai pemilik.
          </p>
          <Button
            disabled={join.isPending}
            onClick={async () => {
              try {
                await join.mutateAsync();
                await refresh();
                toast.success("Kamu sekarang pemilik organisasi Hakgyo.");
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Gagal bergabung.",
                );
              }
            }}
          >
            {join.isPending ? (
              <LoaderCircleIcon
                className="animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            Gabung ke organisasi Hakgyo
          </Button>
        </section>
      ) : null}

      {!bank ? (
        <EmptyState
          icon={LibraryIcon}
          title="Belum ada bank soal"
          description="Buat bank, lalu tulis soal di editornya."
          action={
            <Button
              disabled={!data.canEdit || create.isPending}
              onClick={async () => {
                try {
                  await create.mutateAsync({ title: "Bank soal EPS-TOPIK" });
                  await refresh();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Gagal membuat bank.",
                  );
                }
              }}
            >
              Buat bank soal
            </Button>
          }
        />
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {data.banks.length > 1 ? (
                data.banks.map((entry) => (
                  <Button
                    key={entry.id}
                    onClick={() => {
                      setBankId(entry.id);
                      setSelected(new Set());
                    }}
                    size="sm"
                    variant={entry.id === bank.id ? "default" : "outline"}
                  >
                    {entry.title}
                  </Button>
                ))
              ) : (
                <h2 className="text-lg font-semibold">{bank.title}</h2>
              )}
              <span className="text-muted-foreground text-sm">
                {bank.total} soal
              </span>
              {data.canEdit && data.organizationSlug ? (
                <Link
                  href={`/workspace/${data.organizationSlug}/library/assessments/${bank.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "ml-auto",
                  )}
                >
                  Buka di editor
                  <ExternalLinkIcon data-icon="inline-end" />
                </Link>
              ) : null}
            </div>
            <div>
              <h3 className="text-sm font-semibold">Cakupan per tipe</h3>
              <p className="text-muted-foreground text-xs">
                Sasaran pilot: cukup untuk {data.pilotPackages} paket berbeda.
              </p>
            </div>
            <ul className="divide-y border-y sm:rounded-lg sm:border">
              {bank.types.map((row) => (
                <li
                  key={row.type}
                  className="flex items-center gap-3 px-1 py-2 text-sm sm:px-3"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {row.type === "untagged"
                      ? "Tanpa label tipe"
                      : tagLabel(row.type)}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums",
                      row.target && row.counts.LIVE >= row.target
                        ? "text-emerald-600"
                        : "text-foreground",
                    )}
                  >
                    {row.counts.LIVE}
                    {row.target ? `/${row.target}` : ""}
                  </span>
                  <span className="text-muted-foreground w-28 text-right text-xs tabular-nums">
                    review {row.counts.REVIEW} · draf {row.counts.DRAFT}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <AiDraftForm
            bankId={bank.id}
            onDone={async () => {
              setStatus("DRAFT");
              setSelected(new Set());
              await refresh();
            }}
          />

          <section className="space-y-3">
            <div className="flex gap-1 overflow-x-auto">
              {statusTabs.map((tab) => (
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
                </Button>
              ))}
            </div>
            {questions.isPending ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Memuat soal…
              </p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Tidak ada soal di sini.
              </p>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm">
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
                    Hanya {MAX_BANK_BATCH} soal pertama yang tampil.
                  </p>
                ) : null}
                <ul className="divide-y border-y sm:rounded-lg sm:border">
                  {rows.map((question) => {
                    const type = question.tags.find((tag) =>
                      tag.startsWith("eps:"),
                    );
                    const level = levelOf(question.tags);
                    const problem = bankReadinessProblem(question);
                    return (
                      <li key={question.id}>
                        <label className="flex items-start gap-3 px-1 py-3 sm:px-3">
                          <Checkbox
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
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                              <span>No. {question.position + 1}</span>
                              {type ? <span>· {tagLabel(type)}</span> : null}
                              {level ? <span>· {level}</span> : null}
                              {question.groupId ? (
                                <span>· kelompok</span>
                              ) : null}
                              {problem && status !== "RETIRED" ? (
                                <Badge variant="destructive">{problem}</Badge>
                              ) : null}
                            </span>
                            <span className="line-clamp-2 block text-sm">
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
                        </label>
                        {question.illustrated && status !== "RETIRED" ? (
                          <BankImageActions
                            question={question}
                            onDone={refresh}
                          />
                        ) : null}
                        {question.hasScript && status !== "RETIRED" ? (
                          <BankAudioActions
                            question={question}
                            onDone={refresh}
                          />
                        ) : null}
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
                <span className="text-sm font-medium">
                  {selected.size} dipilih
                </span>
                {bankTransitions[status].map((to) => (
                  <Button
                    key={to}
                    disabled={setBankStatus.isPending}
                    onClick={() => void move(to)}
                    size="sm"
                    variant={to === "RETIRED" ? "outline" : "default"}
                  >
                    {to === "REVIEW" && status === "LIVE"
                      ? "Kembalikan ke review"
                      : moveLabels[to]}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}

type Question = RouterOutputs["superadmin"]["bank"]["questions"][number];

/** Draws a question's missing pictures one at a time (each call is one image). */
function BankImageActions({
  question,
  onDone,
}: {
  question: Question;
  onDone: () => Promise<void>;
}) {
  const generate = api.superadmin.bank.generateImage.useMutation();
  const [working, setWorking] = useState(false);
  const missingOptions = question.optionsAreImages
    ? question.optionImages.flatMap((hasImage, index) =>
        hasImage ? [] : [index],
      )
    : [];
  const needsPrompt =
    Boolean(question.mediaBrief) && !question.media.promptHasImage;
  if (!needsPrompt && !missingOptions.length) return null;

  async function draw(targets: Array<number | undefined>) {
    setWorking(true);
    try {
      for (const optionIndex of targets) {
        await generate.mutateAsync({ questionId: question.id, optionIndex });
      }
      toast.success(
        "Gambar dibuat. Periksa gambarnya sebelum menyetujui soal.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gambar gagal dibuat.",
      );
    } finally {
      setWorking(false);
      await onDone();
    }
  }

  return (
    <div className="flex flex-wrap gap-2 px-1 pb-3 pl-8 sm:px-3 sm:pl-10">
      {needsPrompt ? (
        <Button
          disabled={working}
          onClick={() => void draw([undefined])}
          size="xs"
          variant="outline"
        >
          {working ? (
            <LoaderCircleIcon
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <ImageIcon data-icon="inline-start" />
          )}
          Gambar soal (AI)
        </Button>
      ) : null}
      {missingOptions.length ? (
        <Button
          disabled={working}
          onClick={() => void draw(missingOptions)}
          size="xs"
          variant="outline"
        >
          {working ? (
            <LoaderCircleIcon
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <ImageIcon data-icon="inline-start" />
          )}
          Gambar {missingOptions.length} pilihan (AI)
        </Button>
      ) : null}
    </div>
  );
}

const levels = [
  { value: "mudah", label: "Mudah" },
  { value: "sedang", label: "Sedang" },
  { value: "sulit", label: "Sulit" },
] as const;

/**
 * "Buat draf dengan AI" (docs/eps-question-generator.md section 6): type, count, level and
 * optional topic, keywords and book chapter; the drafts land in Draf with their check flags.
 */
function AiDraftForm({
  bankId,
  onDone,
}: {
  bankId: string;
  onDone: () => Promise<void>;
}) {
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
        assessmentId: bankId,
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
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              {epsTaxonomy.map((entry) => (
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
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
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
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
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
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
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

const audioJobLabels: Record<string, string> = {
  PENDING: "Audio menunggu PC",
  RUNNING: "Audio sedang dibuat",
  DONE: "Audio sudah dibuat",
  FAILED: "Audio gagal",
};

/**
 * Audio for a listening question: queue it for the PC (VoxCPM2), or make it with OpenAI now. Jobs
 * that wait more than two hours go to OpenAI by themselves.
 */
function BankAudioActions({
  question,
  onDone,
}: {
  question: Question;
  onDone: () => Promise<void>;
}) {
  const request = api.superadmin.bank.requestAudio.useMutation();
  const now = api.superadmin.bank.generateAudioNow.useMutation();
  const job = question.audioJob;
  const waiting = job?.status === "PENDING" || job?.status === "RUNNING";
  const done = question.media.hasAudio;
  const busy = request.isPending || now.isPending;

  async function run(action: "queue" | "now") {
    try {
      if (action === "queue") {
        await request.mutateAsync({ questionId: question.id });
        toast.success("Audio masuk antrean PC.");
      } else {
        await now.mutateAsync({ questionId: question.id });
        toast.success(
          "Audio dibuat dengan suara AI cloud. Dengarkan sebelum menyetujui soal.",
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Audio gagal dibuat.",
      );
    } finally {
      await onDone();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 pb-3 pl-8 text-xs sm:px-3 sm:pl-10">
      {job ? (
        <span
          className={
            job.status === "FAILED"
              ? "text-destructive"
              : "text-muted-foreground"
          }
        >
          {audioJobLabels[job.status]}
          {job.provider
            ? ` (${job.provider === "VOXCPM" ? "PC" : "cloud"})`
            : ""}
          {job.status === "FAILED" && job.error ? `: ${job.error}` : ""}
        </span>
      ) : null}
      {!done && !waiting ? (
        <Button
          disabled={busy}
          onClick={() => void run("queue")}
          size="xs"
          variant="outline"
        >
          Buat audio (PC)
        </Button>
      ) : null}
      {!done && job?.status !== "RUNNING" ? (
        <Button
          disabled={busy}
          onClick={() => void run("now")}
          size="xs"
          variant="ghost"
        >
          {now.isPending ? (
            <LoaderCircleIcon
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          Buat dengan cloud sekarang
        </Button>
      ) : null}
    </div>
  );
}
