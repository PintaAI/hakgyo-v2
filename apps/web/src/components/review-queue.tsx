"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2Icon, ChevronLeftIcon, ChevronRightIcon, LoaderCircleIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { api, type RouterOutputs } from "~/trpc/react";

type Detail = RouterOutputs["assessment"]["getReviewAttempt"];
type Kind = "CHAPTER" | "QUICK_ASSESSMENT" | "TRYOUT";
type Status = "IN_REVIEW" | "GRADED" | "IN_PROGRESS";
const statusLabel = { IN_REVIEW: "Perlu review", SUBMITTED: "Terkirim", GRADED: "Selesai", IN_PROGRESS: "Mengerjakan" };
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(contentText).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";
  if ("text" in value && typeof value.text === "string") return value.text;
  return [("content" in value ? value.content : null), ("children" in value ? value.children : null)].map(contentText).filter(Boolean).join("\n");
}

export function AssessmentReviewDetail({ attemptId, onDone }: { attemptId: string; onDone?: () => void }) {
  const query = api.assessment.getReviewAttempt.useQuery({ attemptId });
  if (query.isPending) return <p role="status" className="py-10 text-center">Memuat jawaban…</p>;
  if (query.error) return <div role="alert" className="space-y-3 py-6"><p>{query.error.message}</p><Button onClick={() => void query.refetch()}>Coba lagi</Button></div>;
  return <AttemptDetail key={query.data.id} attempt={query.data} onDone={onDone} />;
}

function AttemptDetail({ attempt, onDone }: { attempt: Detail; onDone?: () => void }) {
  const utils = api.useUtils();
  const review = api.assessment.reviewAttempt.useMutation();
  const written = attempt.answers.filter(a => a.question.type === "WRITTEN");
  const canReview = attempt.status === "IN_REVIEW" && !attempt.invalidated && attempt.assessmentEvent?.status !== "CANCELLED";
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(written.map(a => [a.id, a.manualScore?.toString() ?? ""])));
  const [feedback, setFeedback] = useState<Record<string, string>>(() => Object.fromEntries(written.map(a => [a.id, contentText(a.feedback)])));
  const [error, setError] = useState("");
  const [showChoices, setShowChoices] = useState(!canReview);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const answers = written.map(a => ({ answerId: a.id, score: Number(scores[a.id]), feedback: feedback[a.id]?.trim() ?? "" }));
    if (written.some(a => !scores[a.id]?.trim() || !Number.isInteger(Number(scores[a.id])) || Number(scores[a.id]) < 0 || Number(scores[a.id]) > a.question.points)) {
      setError("Isi skor setiap jawaban dalam batas poin."); return;
    }
    setError("");
    try {
      await review.mutateAsync({ attemptId: attempt.id, answers });
      await Promise.all([
        utils.assessment.invalidate(), utils.assessmentEvent.invalidate(),
        utils.learning.invalidate(), utils.organization.invalidate(),
      ]);
      toast.success("Review selesai. Nilai dan feedback sekarang tersedia untuk siswa.");
      onDone?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Review gagal disimpan."); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <div className="space-y-2 border-b pb-4">
      <div className="flex flex-wrap gap-2"><Badge>{attempt.context.label}</Badge><Badge variant="outline">{attempt.invalidated ? "Dibatalkan untuk siswa" : statusLabel[attempt.status]}</Badge></div>
      <h2 className="text-xl font-semibold">{attempt.context.title}</h2>
      <p className="text-sm">{attempt.user.name} · {attempt.user.email}</p>
      <p className="text-muted-foreground text-sm">{attempt.context.course.title} · {attempt.context.cohort?.name ?? "Course"} · Bab: {attempt.context.moduleTitle}</p>
      <p className="text-muted-foreground text-xs">Percobaan #{attempt.attemptNumber}{attempt.submittedAt ? ` · Dikirim ${date.format(attempt.submittedAt)}` : ""}{attempt.gradedAt ? ` · Dinilai ${date.format(attempt.gradedAt)}` : ""}</p>
      {attempt.status === "GRADED" && attempt.score !== null ? <p className="text-lg font-semibold">{attempt.score} / {attempt.maxScore} · {attempt.passed ? "Lulus" : "Belum lulus"} · {attempt.grading === "AUTOMATIC" ? "Dinilai otomatis" : "Dinilai pengajar"}</p> : null}
      {canReview ? <p className="text-sm">Nilai {written.length} jawaban tertulis. Soal pilihan sudah dinilai otomatis. Selesaikan review untuk menerbitkan nilai akhir dan feedback.</p> : null}
    </div>
    {canReview ? <Button type="button" variant="outline" onClick={() => setShowChoices(v => !v)}>{showChoices ? "Fokus jawaban tertulis" : "Lihat juga soal pilihan & skor otomatis"}</Button> : null}
    {attempt.questions.filter(q => showChoices || q.type === "WRITTEN").map((question) => {
      const answer = attempt.answers.find(a => a.questionId === question.id);
      const index = attempt.questions.findIndex(q => q.id === question.id);
      return <section key={question.id} className="space-y-3 rounded-lg border p-4">
        <p className="text-muted-foreground text-xs">Soal {index + 1} · {question.points} poin · {question.type === "WRITTEN" ? "Tertulis" : "Otomatis"}</p>
        <p className="whitespace-pre-wrap font-medium">{contentText(question.prompt)}</p>
        {question.type === "WRITTEN" ? <p className="bg-muted/40 rounded-md p-3 text-sm whitespace-pre-wrap">{contentText(answer?.content) || "Tidak dijawab"}</p>
          : <div className="space-y-2">{question.options.map(option => <div key={option.id} className="rounded border p-2 text-sm">
            <span className="mr-2 font-semibold">{answer?.selectedOptions.some(s => s.optionId === option.id) ? "✓ Pilihan siswa · " : ""}{option.isCorrect ? "Kunci benar" : ""}</span>{contentText(option.content)}
          </div>)}{!answer?.selectedOptions.length ? <p className="text-sm">Tidak dijawab</p> : null}</div>}
        {canReview && question.type === "WRITTEN" && answer ? <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
          <div className="space-y-2"><Label htmlFor={`score-${answer.id}`}>Skor / {question.points}</Label><Input id={`score-${answer.id}`} type="number" min={0} max={question.points} step={1} required value={scores[answer.id] ?? ""} onChange={e => setScores(s => ({ ...s, [answer.id]: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor={`feedback-${answer.id}`}>Feedback untuk siswa</Label><Textarea id={`feedback-${answer.id}`} value={feedback[answer.id] ?? ""} onChange={e => setFeedback(f => ({ ...f, [answer.id]: e.target.value }))} /></div>
        </div> : <>
          <p className="text-sm font-medium">Skor: {answer?.manualScore ?? answer?.autoScore ?? (attempt.status === "GRADED" ? 0 : "—")} / {question.points}</p>
          {answer?.feedback ? <p className="bg-muted/40 rounded-md p-3 text-sm whitespace-pre-wrap">{contentText(answer.feedback)}</p> : null}
          {answer?.reviewedBy ? <p className="text-muted-foreground text-xs">Direview oleh {answer.reviewedBy.user.name}</p> : null}
        </>}
      </section>;
    })}
    {error ? <p role="alert" className="text-destructive text-sm">{error}</p> : null}
    {canReview ? <div className="bg-background sticky bottom-0 flex justify-end border-t py-4"><Button type="submit" disabled={review.isPending}>{review.isPending ? <LoaderCircleIcon className="animate-spin" /> : <CheckCircle2Icon />}Selesaikan review & terbitkan nilai</Button></div> : null}
  </form>;
}

export function ReviewQueue({ organizationId, courseId, cohortId, cohortName, eventId }: { organizationId: string; courseId?: string; cohortId?: string; cohortName?: string; eventId?: string }) {
  const cohortScoped = Boolean(cohortId);
  const [status, setStatus] = useState<Status | "ALL">("IN_REVIEW");
  const [kind, setKind] = useState<Kind | "ALL">("ALL");
  const [course, setCourse] = useState(courseId ?? "");
  const [cohort, setCohort] = useState(cohortId ?? "");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const input = { organizationId, courseId: courseId ?? (course || undefined), cohortId: cohortId ?? (cohort || undefined), eventId, kind: !cohortScoped && kind !== "ALL" ? kind : undefined, status: status === "ALL" ? undefined : status, search: appliedSearch || undefined, page, limit: 20 };
  const query = api.assessment.listAttempts.useQuery(input, { refetchInterval: 30_000 });
  const filters = api.assessment.getRegisterFilters.useQuery(
    { organizationId },
    { enabled: !cohortScoped },
  );
  const data = query.data;
  const selectClass = "border-input bg-background h-10 rounded-md border px-3 text-sm";
  return <div className="space-y-5">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">{cohortName ? `Asesmen · ${cohortName}` : "Hasil & review asesmen"}</h1><p className="text-muted-foreground text-sm">Pantau semua pengerjaan, lihat hasil otomatis, dan review jawaban tertulis. Data diperbarui setiap 30 detik.</p></header>
    <div className="grid grid-cols-3 gap-3">
      {(["IN_REVIEW", "GRADED", "IN_PROGRESS"] as const).map(value => <button key={value} type="button" aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }} className={`rounded-lg border p-4 text-left ${status === value ? "border-primary bg-primary/5" : ""}`}><span className="text-muted-foreground text-xs">{statusLabel[value]}</span><strong className="mt-1 block text-2xl">{data?.counts[value] ?? "—"}</strong></button>)}
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setAppliedSearch(search.trim()); setPage(1); }}><Input aria-label="Cari siswa atau asesmen" placeholder="Nama, email, asesmen…" value={search} onChange={e => setSearch(e.target.value)} /><Button type="submit" variant="outline" aria-label="Cari"><SearchIcon className="size-4" /></Button></form>
      {!cohortScoped ? <>
        <select aria-label="Jenis asesmen" className={selectClass} value={kind} onChange={e => { setKind(e.target.value as Kind | "ALL"); setPage(1); }}><option value="ALL">Semua jenis</option><option value="CHAPTER">Asesmen bab</option><option value="QUICK_ASSESSMENT">On-demand · cohort</option><option value="TRYOUT">Tryout · course</option></select>
        {!courseId ? <select aria-label="Course" className={selectClass} value={course} onChange={e => { setCourse(e.target.value); setCohort(""); setPage(1); }}><option value="">Semua course</option>{filters.data?.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select> : null}
        <select aria-label="Cohort" className={selectClass} value={cohort} onChange={e => { setCohort(e.target.value); setPage(1); }}><option value="">Semua cohort</option>{filters.data?.cohorts.filter(c => !(courseId ?? course) || c.courseId === (courseId ?? course)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <Button variant="outline" onClick={() => { setStatus("ALL"); setPage(1); }}>Semua status</Button>
      </> : null}
    </div>
    {query.isPending ? <p role="status" className="py-12 text-center">Memuat asesmen…</p> : query.error ? <div role="alert" className="space-y-3"><p>{query.error.message}</p><Button onClick={() => void query.refetch()}>Coba lagi</Button></div> : !data?.items.length ? <div className="rounded-lg border border-dashed p-10 text-center"><p className="font-medium">{cohortScoped ? "Tidak ada pengerjaan untuk status ini" : "Tidak ada pengerjaan dalam filter ini"}</p><p className="text-muted-foreground mt-2 text-sm">{status === "IN_REVIEW" ? "Lihat tab Selesai untuk hasil yang dinilai otomatis atau sudah direview." : cohortScoped ? "Pilih status lain untuk melihat pengerjaan lainnya." : "Ubah filter untuk melihat pengerjaan lainnya."}</p></div> : <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-muted/40"><tr>{["Siswa", "Asesmen & konteks", "Status", "Nilai", "Waktu", "Aksi"].map(t => <th key={t} className="p-3 font-medium">{t}</th>)}</tr></thead><tbody>{data.items.map(attempt => <tr key={attempt.id} className="border-t">
      <td className="p-3"><p className="font-medium">{attempt.user.name}</p><p className="text-muted-foreground text-xs">{attempt.user.email}</p></td>
      <td className="min-w-56 p-3"><Badge variant="outline">{attempt.context.label}</Badge><p className="mt-1 font-medium">{attempt.context.title}</p><p className="text-muted-foreground text-xs">{attempt.context.course.title} · {attempt.context.cohort?.name ?? "Course"} · {attempt.context.moduleTitle}</p><p className="text-muted-foreground text-xs">Percobaan #{attempt.attemptNumber}</p></td>
      <td className="p-3"><Badge variant="secondary">{attempt.invalidated ? "Tidak valid" : attempt.assessmentEvent?.status === "CANCELLED" ? "Dibatalkan" : statusLabel[attempt.status]}</Badge>{attempt.status === "GRADED" ? <p className="text-muted-foreground mt-1 text-xs">{attempt.grading === "AUTOMATIC" ? "Dinilai otomatis" : "Review pengajar"}</p> : null}</td>
      <td className="whitespace-nowrap p-3">{attempt.score !== null ? <>{attempt.score}/{attempt.maxScore}<p className="text-muted-foreground text-xs">{attempt.passed ? "Lulus" : "Belum lulus"}</p></> : "—"}</td>
      <td className="whitespace-nowrap p-3 text-xs">{date.format(attempt.submittedAt ?? attempt.startedAt)}</td>
      <td className="p-3"><Button size="sm" variant="outline" onClick={() => setSelected(attempt.id)}>{attempt.status === "IN_REVIEW" && !attempt.invalidated && attempt.assessmentEvent?.status !== "CANCELLED" ? "Review" : "Lihat detail"}</Button></td>
    </tr>)}</tbody></table></div>}
    <div className="flex items-center justify-between gap-3"><p className="text-muted-foreground text-sm">{data?.total ?? 0} pengerjaan · Halaman {page} / {Math.max(1, data?.pageCount ?? 1)}</p><div className="flex gap-2"><Button aria-label="Halaman sebelumnya" variant="outline" disabled={page <= 1 || query.isFetching} onClick={() => setPage(p => p - 1)}><ChevronLeftIcon /></Button><Button aria-label="Halaman berikutnya" variant="outline" disabled={!data || page >= data.pageCount || query.isFetching} onClick={() => setPage(p => p + 1)}><ChevronRightIcon /></Button></div></div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(undefined); }}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Detail pengerjaan</DialogTitle><DialogDescription>Periksa jawaban dan hasil satu siswa.</DialogDescription></DialogHeader>{selected ? <AssessmentReviewDetail attemptId={selected} onDone={() => { setSelected(undefined); if (data?.items.length === 1 && page > 1) setPage(p => p - 1); }} /> : null}</DialogContent></Dialog>
  </div>;
}
