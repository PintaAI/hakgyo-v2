"use client";

import { useState } from "react";
import { tagLabel } from "@hakgyo/shared";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  LibraryIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import Link from "~/components/link";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { EmptyState } from "~/components/ui/empty-state";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Overview = RouterOutputs["superadmin"]["bank"]["overview"];
type Status = "DRAFT" | "REVIEW" | "LIVE" | "RETIRED";

const statusTabs: Array<{ status: Status; label: string }> = [
  { status: "REVIEW", label: "Perlu review" },
  { status: "DRAFT", label: "Draf" },
  { status: "LIVE", label: "Siap dipakai" },
  { status: "RETIRED", label: "Pensiun" },
];

/** What a selection in each tab can move to. */
const actions: Record<Status, Array<{ to: Status; label: string }>> = {
  DRAFT: [
    { to: "REVIEW", label: "Kirim ke review" },
    { to: "RETIRED", label: "Pensiunkan" },
  ],
  REVIEW: [
    { to: "LIVE", label: "Setujui" },
    { to: "DRAFT", label: "Kembalikan ke draf" },
    { to: "RETIRED", label: "Pensiunkan" },
  ],
  LIVE: [
    { to: "REVIEW", label: "Kembalikan ke review" },
    { to: "RETIRED", label: "Pensiunkan" },
  ],
  RETIRED: [{ to: "REVIEW", label: "Kirim ke review" }],
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

          <section className="space-y-3">
            <div className="flex gap-1 overflow-x-auto">
              {statusTabs.map((tab) => (
                <Button
                  key={tab.status}
                  onClick={() => {
                    setStatus(tab.status);
                    setSelected(new Set());
                  }}
                  size="sm"
                  variant={tab.status === status ? "default" : "ghost"}
                >
                  {tab.label}
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
                <ul className="divide-y border-y sm:rounded-lg sm:border">
                  {rows.map((question) => {
                    const type = question.tags.find((tag) =>
                      tag.startsWith("eps:"),
                    );
                    const level = levelOf(question.tags);
                    const incomplete =
                      question.optionCount !== 4 || question.correctCount !== 1;
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
                              {incomplete ? (
                                <Badge variant="destructive">
                                  {question.optionCount} pilihan,{" "}
                                  {question.correctCount} benar
                                </Badge>
                              ) : null}
                            </span>
                            <span className="line-clamp-2 block text-sm">
                              {question.preview || "(soal tanpa teks)"}
                            </span>
                          </span>
                        </label>
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
                {actions[status].map((action) => (
                  <Button
                    key={action.to}
                    disabled={setBankStatus.isPending}
                    onClick={() => void move(action.to)}
                    size="sm"
                    variant={action.to === "RETIRED" ? "outline" : "default"}
                  >
                    {action.label}
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
