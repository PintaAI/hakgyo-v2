"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import {
  answerHasContent,
  assessmentContentAssetIds,
  canFinishSection,
  createLogEntry,
  formatScoreOutOf,
  isForwardOnly,
  MAX_LOG_ENTRIES_PER_WRITE,
  pacedQuestionEndsAt,
  questionAudioSources,
  sectionAudioPolicy,
  sectionTimeline,
  sectionView,
  type AttemptLogEntry,
  type TimelineEntry,
} from "@hakgyo/shared";

import Link from "~/components/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button, buttonVariants } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { assessmentTerminalResult } from "~/lib/learner/assessment-state";
import {
  isQuestionAnswered,
  type QuestionStatus,
} from "~/lib/learner/question-progress";
import { formatRemaining } from "~/lib/learner/question-progress";
import { onPageHidden } from "~/lib/page-hidden";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { RichContent } from "../practice/rich-content";
import {
  AssessmentMediaStatus,
  useAssessmentMediaPreload,
} from "./assessment-media";
import {
  AssessmentOption,
  AssessmentQuestion,
  QuestionNavigator,
  StudyCard,
} from "./assessment-ui";
import { ScoreBandResults } from "~/components/learner/assessment/score-band-results";
import { TagResults } from "~/components/learner/assessment/tag-results";
import { SectionIntro } from "~/components/learner/assessment/section-intro";
import {
  AssessmentAudioPlayer,
  useAttemptAudio,
} from "~/components/learner/assessment/assessment-audio-player";
import { AssessmentResultReview } from "./assessment-result-review";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];
type Attempt = RouterOutputs["assessment"]["getMyAttempt"];
type Answer = {
  questionId: string;
  content?: string;
  optionIds: string[];
};

// Results wait on a teacher review or on the event closing, which can take
// hours, so waiting for one polls slowly.
const AWAITING_REVIEW_POLL_MS = 60_000;

// Audio of the content itself, hidden while a section plays it through the controlled player.
const hiddenContentAudio =
  // Important: BlockNote's styles are not in a cascade layer, so they beat Tailwind's utilities.
  "[&_[data-content-type=assetAudio]]:hidden! [&_[data-content-type=audio]]:hidden!";

/** Device time shifted by the measured offset to the server's clock. */
function correctedNow(offsetMs: number) {
  return new Date(Date.now() + offsetMs);
}

export function AssessmentAttempt({
  courseId,
  courseItemId,
  assessment: initialAssessment,
  attempt: initialAttempt,
  serverTime,
}: {
  courseId: string;
  courseItemId: string;
  assessment: Assessment;
  attempt: Attempt;
  serverTime: Date;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const attemptQuery = api.assessment.getMyAttempt.useQuery(
    { attemptId: initialAttempt.id },
    {
      initialData: initialAttempt,
      refetchInterval: (query) =>
        query.state.data?.status === "IN_REVIEW" ||
        query.state.data?.status === "SUBMITTED"
          ? AWAITING_REVIEW_POLL_MS
          : false,
    },
  );
  const attempt = attemptQuery.data;
  // Poll only while the result can still change: pending review, or a graded quick assessment
  // whose answers are revealed once its event closes.
  const assessmentQuery = api.assessment.getForCourseItem.useQuery(
    { courseItemId, attemptId: attempt.id },
    {
      initialData: initialAssessment,
      refetchInterval: (query) =>
        attempt.status === "IN_REVIEW" ||
        attempt.status === "SUBMITTED" ||
        (attempt.status === "GRADED" &&
          query.state.data?.event?.type === "QUICK_ASSESSMENT" &&
          query.state.data.event.status === "OPEN")
          ? AWAITING_REVIEW_POLL_MS
          : false,
    },
  );
  const assessment = assessmentQuery.data;
  // Grading changes what getForCourseItem reveals; refresh it once when a review completes
  // instead of polling it after the attempt is graded.
  const previousStatus = useRef(attempt.status);
  useEffect(() => {
    const wasPendingReview =
      previousStatus.current === "IN_REVIEW" ||
      previousStatus.current === "SUBMITTED";
    previousStatus.current = attempt.status;
    if (wasPendingReview && attempt.status === "GRADED") {
      void utils.assessment.getForCourseItem.invalidate({
        courseItemId,
        attemptId: attempt.id,
      });
    }
  }, [attempt.id, attempt.status, courseItemId, utils]);

  // Questions show one at a time: fetch every question's media up front so later questions do
  // not depend on the connection.
  const media = useAssessmentMediaPreload(
    assessmentContentAssetIds(assessment),
    attempt.status === "IN_PROGRESS",
  );
  const [selected, setCurrent] = useState(0);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(
      attempt.answers.map((answer) => [
        answer.questionId,
        {
          questionId: answer.questionId,
          content:
            typeof answer.content === "string" ? answer.content : undefined,
          optionIds: answer.selectedOptions.map(
            (selection) => selection.optionId,
          ),
        },
      ]),
    ),
  );
  const initialSeconds = assessment.timeLimitMinutes
    ? Math.max(
        0,
        Math.floor(
          ((assessment.attemptDeadline?.getTime() ??
            attempt.startedAt.getTime() +
              assessment.timeLimitMinutes * 60_000) -
            serverTime.getTime()) /
            1000,
        ),
      )
    : null;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(initialSeconds);
  // Device clock corrected to the server's (render time), for log entries and section timers.
  const [clockOffset] = useState(() => serverTime.getTime() - Date.now());
  // Sections: their starts and ends from the server plus the ones made here, and a ticking clock.
  const sectioned = assessment.sections.length > 0;
  const [localSectionEntries, setLocalSectionEntries] = useState<
    TimelineEntry[]
  >([]);
  const [now, setNow] = useState(serverTime);
  // Section rules (docs/eps-topik-simulation.md section 5.6) on top of what the server counted:
  // the furthest position reached per section and plays per question, both absolute so a
  // refetched server count never adds to them.
  const [reached, setReached] = useState<Record<string, number>>({});
  const [localPlays, setLocalPlays] = useState<Record<string, number>>({});
  // Paced sections: when the question on screen showed and when its audio finished.
  const [pacedClock, setPacedClock] = useState<{
    questionId: string;
    shownAt: Date;
    audioEndedAt: Date | null;
  } | null>(null);
  const attemptAudio = useAttemptAudio();
  const [dirty, setDirty] = useState(false);
  const progress = api.assessment.recordProgress.useMutation();
  const submit = api.assessment.submitAttempt.useMutation();
  // Progress-log entries not yet stored by the server, oldest first (see `assessment-runtime.ts`
  // in @hakgyo/shared). Autosave sends them in order; the server skips ones it already has.
  const pendingEntries = useRef<AttemptLogEntry[]>([]);
  const nextSeq = useRef(assessment.progressSeq + 1);
  // Entries up to this seq are in a running write and must not be edited in place.
  const sendingThroughSeq = useRef(0);
  // True while submit sends the last entries, so no answer can change in between.
  const [finalizing, setFinalizing] = useState(false);
  // Requests an immediate save from handlers (the autosave is an effect event).
  const [flushRequest, setFlushRequest] = useState(0);
  const answersRef = useRef(answers);
  const autosaveRun = useRef<Promise<void> | null>(null);
  // Set for the whole submit flow so repeated clicks and pending autosave timers can't race it.
  const submitting = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  const eventEndedIncomplete = Boolean(
    assessment.event &&
    assessment.event.status !== "OPEN" &&
    attempt.status === "IN_PROGRESS",
  );
  const isFinished = attempt.status !== "IN_PROGRESS" || eventEndedIncomplete;
  const expired = secondsLeft === 0;
  const busy = submit.isPending || finalizing;

  // Sections run one after another (shared timeline, docs/eps-topik-simulation.md section 4.2).
  const timeline = sectioned
    ? sectionTimeline({
        sections: assessment.sections,
        startedAt: attempt.startedAt,
        attemptDeadline: assessment.attemptDeadline,
        entries: [...assessment.sectionEntries, ...localSectionEntries],
        now,
      })
    : null;
  const view = timeline ? sectionView(timeline) : null;
  const activeSection =
    view && view.mode !== "done" ? assessment.sections[view.index] : undefined;
  const sectionIndexes = assessment.questions.flatMap((entry, index) =>
    !activeSection || entry.sectionId === activeSection.id ? [index] : [],
  );
  const forwardOnly = isForwardOnly(activeSection?.navigation);
  const paced = activeSection?.navigation === "PACED";
  const furthestInSection = activeSection
    ? Math.max(
        assessment.questionProgress.furthest[activeSection.id] ?? -1,
        reached[activeSection.id] ?? -1,
      )
    : -1;
  // The shown question stays inside the running section, and in a forward-only one never before
  // the furthest question reached (derived, not corrected in an effect).
  const selectedPosition = Math.max(0, sectionIndexes.indexOf(selected));
  const current = activeSection
    ? (sectionIndexes[
        forwardOnly
          ? Math.max(selectedPosition, furthestInSection)
          : selectedPosition
      ] ?? selected)
    : selected;
  const question = assessment.questions[current];
  const playsOf = (questionId: string) =>
    Math.max(
      assessment.questionProgress.plays[questionId] ?? 0,
      localPlays[questionId] ?? 0,
    );
  const audioPolicy = sectionAudioPolicy(activeSection);
  const audioSources =
    question && audioPolicy ? questionAudioSources(question) : [];
  const statuses: QuestionStatus[] = assessment.questions.map((entry) =>
    isQuestionAnswered(answers[entry.id]) ? "answered" : "unanswered",
  );
  const answeredCount = statuses.filter(
    (status) => status === "answered",
  ).length;
  const total = assessment.questions.length;
  const positionInSection = sectionIndexes.indexOf(current);
  const isLastSection =
    !view ||
    view.mode === "done" ||
    view.index === assessment.sections.length - 1;
  const sectionSecondsLeft =
    view?.mode === "answering" && view.deadlineAt
      ? Math.max(
          0,
          Math.floor((view.deadlineAt.getTime() - now.getTime()) / 1000),
        )
      : null;
  const introSecondsLeft =
    view?.mode === "intro"
      ? Math.max(
          0,
          Math.ceil((view.autoStartAt.getTime() - now.getTime()) / 1000),
        )
      : 0;
  const sectionStatuses = sectionIndexes.map((index) => statuses[index]!);
  const sectionAnswered = sectionStatuses.filter(
    (status) => status === "answered",
  ).length;
  // Forward-only sections cannot wrap around to earlier questions.
  const nextUnansweredInSection =
    sectionIndexes.find(
      (index, position) =>
        position > positionInSection && statuses[index] === "unanswered",
    ) ??
    (forwardOnly
      ? undefined
      : sectionIndexes.find((index) => statuses[index] === "unanswered"));
  const pacedEndsAt =
    paced && activeSection && question && pacedClock?.questionId === question.id
      ? pacedQuestionEndsAt({
          section: activeSection,
          hasAudio: audioSources.length > 0,
          shownAt: pacedClock.shownAt,
          audioEndedAt: pacedClock.audioEndedAt,
        })
      : null;
  const [finishSectionOpen, setFinishSectionOpen] = useState(false);
  const autoSubmitTried = useRef(false);
  // The paced section whose end was logged, so a tick does not log it twice.
  const pacedEndedSection = useRef<string | null>(null);

  const pushEntry = (
    kind: AttemptLogEntry["kind"],
    fields: Omit<AttemptLogEntry, "seq" | "kind" | "clientAt">,
  ) => {
    const pending = pendingEntries.current;
    const last = pending.at(-1);
    // Typing a written answer edits the same unsent entry instead of adding one per keystroke.
    if (
      kind === "ANSWERED" &&
      last?.kind === "ANSWERED" &&
      last.questionId === fields.questionId &&
      last.seq > sendingThroughSeq.current
    ) {
      pending[pending.length - 1] = createLogEntry(
        last.seq,
        kind,
        fields,
        correctedNow(clockOffset),
      );
    } else {
      const entry = createLogEntry(
        nextSeq.current++,
        kind,
        fields,
        correctedNow(clockOffset),
      );
      pending.push(entry);
      if (kind === "SECTION_STARTED" || kind === "SECTION_ENDED") {
        setLocalSectionEntries((entries) => [
          ...entries,
          { kind, sectionId: fields.sectionId, at: new Date(entry.clientAt) },
        ]);
      }
    }
  };

  /** Shows a question and records how far its section got (forward-only sections stay there). */
  const goTo = (index: number) => {
    setCurrent(index);
    const sectionId = assessment.questions[index]?.sectionId;
    const position = sectionIndexes.indexOf(index);
    if (sectionId && position >= 0) {
      setReached((value) => ({
        ...value,
        [sectionId]: Math.max(value[sectionId] ?? -1, position),
      }));
    }
    // A forward-only position must reach the server before a reload could reopen an earlier
    // question. Saving a moment later also carries the new question's first play.
    if (forwardOnly && position > positionInSection) {
      window.setTimeout(() => setFlushRequest((value) => value + 1), 2000);
    }
  };

  const recordPlay = (questionId: string) => {
    setLocalPlays((value) => ({
      ...value,
      [questionId]: Math.max(value[questionId] ?? 0, playsOf(questionId)) + 1,
    }));
    pushEntry("AUDIO_PLAYED", { questionId });
  };

  const audioFinished = (questionId: string) => {
    const endedAt = correctedNow(clockOffset);
    setPacedClock((clock) =>
      clock?.questionId === questionId
        ? { ...clock, audioEndedAt: clock.audioEndedAt ?? endedAt }
        : { questionId, shownAt: endedAt, audioEndedAt: endedAt },
    );
  };

  const editAnswer = (
    questionId: string,
    update: (current: Record<string, Answer>) => Answer,
  ) => {
    const next = update(answersRef.current);
    answersRef.current = { ...answersRef.current, [questionId]: next };
    pushEntry("ANSWERED", {
      questionId,
      optionIds: next.optionIds,
      ...(next.content === undefined ? {} : { content: next.content }),
    });
    setDirty(true);
    setAnswers(answersRef.current);
  };

  /** Sends every pending entry in order; throws when a write fails (entries stay pending). */
  const sendPendingEntries = async () => {
    while (pendingEntries.current.length) {
      const batch = pendingEntries.current.slice(0, MAX_LOG_ENTRIES_PER_WRITE);
      const maxSent = batch.at(-1)!.seq;
      sendingThroughSeq.current = maxSent;
      let result;
      try {
        result = await progress.mutateAsync({
          attemptId: attempt.id,
          entries: batch,
        });
      } finally {
        sendingThroughSeq.current = 0;
      }
      if (result.settled) {
        pendingEntries.current = [];
        break;
      }
      // Entries pushed during the write have higher seqs and stay pending.
      pendingEntries.current = pendingEntries.current.filter(
        (entry) => entry.seq > maxSent,
      );
      const skipped = batch.filter(
        // Every kind but shown questions, which only feed time statistics.
        (entry) =>
          entry.seq <= result.previousSeq && entry.kind !== "QUESTION_SHOWN",
      );
      if (skipped.length) {
        // Another tab or device had already written these sequence numbers (or a retry after a
        // lost response): resend the answers after the server's sequence.
        nextSeq.current = Math.max(nextSeq.current, result.lastSeq + 1);
        pendingEntries.current = [
          ...skipped.map((entry) => ({ ...entry, seq: nextSeq.current++ })),
          ...pendingEntries.current.map((entry) => ({
            ...entry,
            seq: nextSeq.current++,
          })),
        ];
      }
    }
    setDirty(pendingEntries.current.some((entry) => entry.kind === "ANSWERED"));
  };

  const submitAssessment = async () => {
    if (submitting.current || submit.isPending || isFinished) return;
    submitting.current = true;
    setFinalizing(true);
    try {
      // Let a running autosave finish so it cannot overwrite the final save with older content.
      await autosaveRun.current;
      // Everything else is already stored by autosave; send what is left.
      let savedLate = false;
      if (pendingEntries.current.length) {
        try {
          await sendPendingEntries();
        } catch (error) {
          const code =
            typeof error === "object" &&
            error !== null &&
            "data" in error &&
            typeof error.data === "object" &&
            error.data !== null &&
            "code" in error.data
              ? error.data.code
              : undefined;
          if (code !== "PRECONDITION_FAILED") throw error;
          savedLate = true;
        }
      }
      const result = await submit.mutateAsync({ attemptId: attempt.id });
      await Promise.all([
        utils.assessment.getMyAttempt.invalidate({ attemptId: attempt.id }),
        utils.assessment.getForCourseItem.invalidate({
          courseItemId,
          attemptId: attempt.id,
        }),
        utils.assessment.listMyAttemptHistory.invalidate(),
        utils.assessmentEvent.invalidate(),
        utils.gamification.getMySummary.invalidate(),
        utils.learning.invalidate(),
      ]);
      toast.success(
        savedLate || result.expired
          ? "Waktu habis. Jawaban yang tersimpan telah dikirim untuk dinilai."
          : result.status === "IN_REVIEW"
            ? "Jawaban dikirim untuk diperiksa."
            : "Tugas berhasil dinilai.",
      );
      // Like the app, land on the event (score and leaderboard) or the item.
      router.replace(
        assessment.event
          ? `/learn/assessments/${assessment.event.id}`
          : `/learn/${courseId}/items/${courseItemId}`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Jawaban gagal dikirim.",
      );
    } finally {
      submitting.current = false;
      setFinalizing(false);
    }
  };
  const onTimeExpired = useEffectEvent(() => {
    void submitAssessment();
  });

  useEffect(() => {
    if (secondsLeft === null || isFinished) return;
    if (secondsLeft <= 0) {
      onTimeExpired();
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((value) =>
        value === null ? null : Math.max(0, value - 1),
      );
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, isFinished]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const flushAutosave = useEffectEvent(() => {
    // One save at a time so an older payload can never land after a newer one.
    if (autosaveRun.current || submitting.current) return;
    autosaveRun.current = (async () => {
      try {
        await sendPendingEntries();
      } catch {
        // Submission still performs a final save and reports any error. Section starts and ends
        // move the clock, so they are retried soon instead of waiting for the next answer.
        if (
          pendingEntries.current.some(
            (entry) =>
              entry.kind === "SECTION_STARTED" ||
              entry.kind === "SECTION_ENDED",
          )
        ) {
          window.setTimeout(() => setFlushRequest((value) => value + 1), 5000);
        }
      } finally {
        autosaveRun.current = null;
      }
    })();
  });

  // Each save is a server call: wait for a pause in answering, but save at
  // least every 30 seconds while answers keep coming. Submitting saves
  // everything; hiding or closing the tab and leaving the page save at once.
  const firstUnsavedAt = useRef<number | null>(null);
  useEffect(() => {
    if (isFinished || expired || !pendingEntries.current.length) {
      firstUnsavedAt.current = null;
      return;
    }
    firstUnsavedAt.current ??= Date.now();
    const wait = Math.min(3000, firstUnsavedAt.current + 30_000 - Date.now());
    const timer = window.setTimeout(
      () => {
        firstUnsavedAt.current = null;
        flushAutosave();
      },
      Math.max(0, wait),
    );
    return () => window.clearTimeout(timer);
  }, [answers, isFinished, expired]);

  useEffect(() => {
    const unsubscribe = onPageHidden(() => flushAutosave());
    return () => {
      unsubscribe();
      flushAutosave();
    };
  }, []);

  // A new question starts at its top, like the app's scroll reset.
  // Log which question is on screen, for time per question in the staff analysis. It rides along
  // with the next autosave instead of costing a request of its own.
  const shownQuestionId = question?.id;
  const lastShownQuestionId = useRef<string | null>(null);
  const logQuestionShown = useEffectEvent((questionId: string) => {
    // Effects can run twice for one view (React strict mode); log a question once per visit.
    if (
      isFinished ||
      expired ||
      (sectioned && view?.mode !== "answering") ||
      lastShownQuestionId.current === questionId
    ) {
      return;
    }
    lastShownQuestionId.current = questionId;
    pushEntry("QUESTION_SHOWN", { questionId });
  });
  const viewMode = view?.mode;
  useEffect(() => {
    if (shownQuestionId) logQuestionShown(shownQuestionId);
  }, [shownQuestionId, viewMode]);

  // Sections: tick the clock, keep the question inside the running section, and submit once the
  // last section has ended.
  const onSectionTick = useEffectEvent(() => {
    const tickAt = correctedNow(clockOffset);
    setNow(tickAt);
    // The last section's time ran out: submit, like the single timer does.
    const tickView = sectionView(
      sectionTimeline({
        sections: assessment.sections,
        startedAt: attempt.startedAt,
        attemptDeadline: assessment.attemptDeadline,
        entries: [...assessment.sectionEntries, ...localSectionEntries],
        now: tickAt,
      }),
    );
    // Once: a failed submit shows a retry button instead of retrying every second.
    if (tickView.mode === "done" && !isFinished && !autoSubmitTried.current) {
      autoSubmitTried.current = true;
      void submitAssessment();
    }
    // Paced sections move on by themselves once the question's time is up.
    if (
      !paced ||
      !activeSection ||
      !question ||
      busy ||
      tickView.mode !== "answering" ||
      tickView.sectionId !== activeSection.id
    ) {
      return;
    }
    if (pacedClock?.questionId !== question.id) {
      setPacedClock({
        questionId: question.id,
        shownAt: tickAt,
        audioEndedAt: null,
      });
      return;
    }
    if (!pacedEndsAt || tickAt < pacedEndsAt) return;
    if (positionInSection < sectionIndexes.length - 1) {
      goTo(sectionIndexes[positionInSection + 1]!);
    } else if (pacedEndedSection.current !== activeSection.id) {
      // The last question's time is up: the section ends (the server allows it once the last
      // question was shown).
      pacedEndedSection.current = activeSection.id;
      pushEntry("SECTION_ENDED", { sectionId: activeSection.id });
      setFlushRequest((value) => value + 1);
    }
  });
  useEffect(() => {
    if (!sectioned || isFinished) return;
    const timer = window.setInterval(onSectionTick, 1000);
    return () => window.clearInterval(timer);
  }, [sectioned, isFinished]);

  // Section starts and ends save at once (they move the clock); handlers request it through state
  // because the autosave is an effect event.
  useEffect(() => {
    if (flushRequest) flushAutosave();
  }, [flushRequest]);

  const startSection = () => {
    if (view?.mode !== "intro" || busy) return;
    // The tap lets the section's audio play by itself afterwards.
    attemptAudio.unlock();
    pushEntry("SECTION_STARTED", { sectionId: view.sectionId });
    setFlushRequest((value) => value + 1);
  };
  const finishSection = () => {
    if (view?.mode !== "answering" || busy) return;
    pushEntry("SECTION_ENDED", { sectionId: view.sectionId });
    setFlushRequest((value) => value + 1);
  };

  const firstQuestion = useRef(true);
  useEffect(() => {
    if (firstQuestion.current) {
      firstQuestion.current = false;
      return;
    }
    top.current?.scrollIntoView({ block: "start" });
  }, [current]);

  const chooseOption = (optionId: string) => {
    if (!question || busy || expired || isFinished || answerLocked) return;
    editAnswer(question.id, (currentAnswers) => {
      const existing = currentAnswers[question.id]?.optionIds ?? [];
      const optionIds =
        question.type === "SINGLE_CHOICE"
          ? [optionId]
          : existing.includes(optionId)
            ? existing.filter((id) => id !== optionId)
            : [...existing, optionId];
      return { questionId: question.id, optionIds };
    });
  };

  // A locked section keeps the first choice of a single-choice question.
  const answerLocked = Boolean(
    activeSection?.lockAnswers &&
    question?.type === "SINGLE_CHOICE" &&
    answerHasContent(answers[question.id] ?? {}),
  );

  const leaveHref = assessment.event
    ? `/learn/assessments/${assessment.event.id}`
    : `/learn/${courseId}/items/${courseItemId}`;

  if (isFinished) {
    const result = assessmentTerminalResult(attempt);
    const inReview = result?.status !== "GRADED";
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Link
          href={leaveHref}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "text-muted-foreground -ml-2 self-start",
          )}
        >
          <ArrowLeftIcon />
          {assessment.event ? "Kembali ke event" : "Kembali ke tugas"}
        </Link>
        <StudyCard>
          <span className="bg-primary/10 text-primary flex size-16 items-center justify-center self-center rounded-full text-2xl font-black">
            ✓
          </span>
          <h1 className="text-center text-2xl font-black">
            {eventEndedIncomplete
              ? "Attempt tidak selesai"
              : inReview
                ? "Menunggu review"
                : "Tugas sudah direview"}
          </h1>
          {eventEndedIncomplete ? (
            <p className="text-muted-foreground text-center text-sm leading-5">
              Event telah ditutup sebelum jawaban kamu dikirim.
            </p>
          ) : result && !inReview ? (
            <>
              <p className="text-muted-foreground text-center text-lg">
                Skor: {formatScoreOutOf(result.score, result.maxScore)}
              </p>
              <ScoreBandResults
                bands={assessment.scoreBands}
                className="mx-auto w-full max-w-xs"
                maxScore={result.maxScore}
                score={result.score}
              />
              {assessment.sectionResults.length ? (
                <ul className="mx-auto grid w-full max-w-xs gap-1.5 text-sm">
                  {assessment.sections.map((section) => {
                    const sectionResult = assessment.sectionResults.find(
                      (entry) => entry.sectionId === section.id,
                    );
                    return sectionResult ? (
                      <li
                        key={section.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span>{section.title}</span>
                        <span className="tabular-nums">
                          {formatScoreOutOf(
                            sectionResult.score,
                            sectionResult.maxScore,
                          )}
                        </span>
                      </li>
                    ) : null;
                  })}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground text-center text-sm leading-5">
              Hasil lengkap kamu akan muncul di sini setelah pengajar selesai
              mereviewnya.
            </p>
          )}
        </StudyCard>

        {/* Scores are withheld (null) for invalidated or cancelled participations. */}
        {result &&
        !inReview &&
        !eventEndedIncomplete &&
        attempt.score !== null ? (
          <TagResults
            answers={attempt.answers}
            questions={assessment.questions}
          />
        ) : null}

        <AssessmentResultReview assessment={assessment} attempt={attempt} />

        {assessment.event ? (
          <Link
            href={`/learn/assessments/${assessment.event.id}`}
            className={buttonVariants({ size: "lg" })}
          >
            Lihat skor & leaderboard
          </Link>
        ) : null}
      </div>
    );
  }

  if (!question) {
    return (
      <p className="text-muted-foreground py-16 text-center">
        Tugas ini belum memiliki soal.
      </p>
    );
  }
  const answer = answers[question.id];
  const isLast = current === total - 1;
  const isLastInSection = positionInSection === sectionIndexes.length - 1;

  return (
    <div
      ref={top}
      className="mx-auto flex w-full max-w-2xl scroll-mt-20 flex-col gap-4"
    >
      <header className="flex items-center gap-3">
        <Link
          href={leaveHref}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label="Keluar dari tugas"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{assessment.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {assessment.context.label} · Percobaan #{attempt.attemptNumber}
            {attempt.cohort ? ` · ${attempt.cohort.name}` : ""}
          </p>
        </div>
      </header>

      {media.progress &&
      (media.progress.failed.length > 0 ||
        media.progress.ready < media.progress.total) ? (
        <AssessmentMediaStatus
          progress={media.progress}
          onRetry={media.retry}
        />
      ) : null}

      {view?.mode === "done" ? (
        <StudyCard>
          <h2 className="text-xl font-black">Semua bagian selesai</h2>
          <p className="text-muted-foreground text-sm">
            {busy
              ? "Jawaban kamu sedang dikirim…"
              : "Jawaban kamu belum terkirim. Periksa koneksi, lalu kirim lagi."}
          </p>
          <Button
            size="lg"
            disabled={busy}
            onClick={() => void submitAssessment()}
          >
            {busy ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : null}
            Kirim tugas
          </Button>
        </StudyCard>
      ) : view?.mode === "intro" && activeSection ? (
        <SectionIntro
          busy={busy}
          instructions={activeSection.instructions}
          onStart={startSection}
          position={view.index + 1}
          questionCount={sectionIndexes.length}
          secondsToAutoStart={introSecondsLeft}
          sectionCount={assessment.sections.length}
          timeLimitSeconds={activeSection.timeLimitSeconds}
          title={activeSection.title}
        />
      ) : (
        <>
          {activeSection && sectionSecondsLeft !== null ? (
            <p
              aria-live={sectionSecondsLeft === 0 ? "polite" : "off"}
              className={cn(
                "text-sm font-bold tabular-nums",
                sectionSecondsLeft < 60 ? "text-destructive" : "text-primary",
              )}
            >
              {activeSection.title} · {formatRemaining(sectionSecondsLeft)}{" "}
              tersisa
            </p>
          ) : activeSection ? (
            <p className="text-primary text-sm font-bold">
              {activeSection.title}
            </p>
          ) : secondsLeft !== null ? (
            <p
              aria-live={expired ? "polite" : "off"}
              className={cn(
                "text-sm font-bold tabular-nums",
                expired || secondsLeft < 60
                  ? "text-destructive"
                  : "text-primary",
              )}
            >
              {expired
                ? "Waktu habis · kirim jawaban yang tersimpan"
                : `${formatRemaining(secondsLeft)} tersisa`}
            </p>
          ) : null}

          <AssessmentQuestion
            current={current}
            total={total}
            answered={answeredCount}
            onOpen={() => setNavigatorOpen(true)}
            disabled={busy}
          >
            {/* Controlled audio replaces the content's own players. */}
            <div className={cn(audioPolicy && hiddenContentAudio)}>
              <RichContent content={question.prompt} />
            </div>
          </AssessmentQuestion>

          {audioPolicy && audioSources.length ? (
            <AssessmentAudioPlayer
              key={question.id}
              audio={attemptAudio}
              disabled={busy || expired}
              onFinished={() => audioFinished(question.id)}
              onPlayStarted={() => recordPlay(question.id)}
              playsUsed={playsOf(question.id)}
              policy={audioPolicy}
              sources={audioSources}
            />
          ) : null}
          {pacedEndsAt ? (
            <p
              aria-live="off"
              className="text-muted-foreground text-sm font-semibold tabular-nums"
            >
              {positionInSection < sectionIndexes.length - 1
                ? "Soal berikutnya"
                : "Bagian selesai"}{" "}
              dalam{" "}
              {formatRemaining(
                Math.max(
                  0,
                  Math.ceil((pacedEndsAt.getTime() - now.getTime()) / 1000),
                ),
              )}
            </p>
          ) : null}

          <p className="text-sm font-bold">
            {question.type === "WRITTEN"
              ? "Tulis jawaban kamu"
              : question.type === "MULTIPLE_CHOICE"
                ? "Pilih semua jawaban yang benar"
                : "Pilih satu jawaban"}
          </p>
          {question.type === "WRITTEN" ? (
            <StudyCard>
              <Textarea
                aria-label={`Jawaban soal ${current + 1}`}
                value={answer?.content ?? ""}
                disabled={busy || expired}
                onChange={(event) => {
                  const content = event.target.value;
                  editAnswer(question.id, () => ({
                    questionId: question.id,
                    content,
                    optionIds: [],
                  }));
                }}
                placeholder="Tulis jawaban kamu…"
                className="min-h-32 resize-y border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
              />
            </StudyCard>
          ) : (
            <div
              role={question.type === "SINGLE_CHOICE" ? "radiogroup" : "group"}
              className="flex flex-col gap-3"
            >
              {question.options.map((option, optionIndex) => (
                <AssessmentOption
                  key={option.id}
                  index={optionIndex}
                  selected={answer?.optionIds.includes(option.id) ?? false}
                  multiple={question.type === "MULTIPLE_CHOICE"}
                  disabled={busy || expired || answerLocked}
                  onPress={() => chooseOption(option.id)}
                >
                  <div className={cn(audioPolicy && hiddenContentAudio)}>
                    <RichContent content={option.content} />
                  </div>
                </AssessmentOption>
              ))}
            </div>
          )}

          <p className="text-muted-foreground text-xs leading-5">
            {paced
              ? "Soal berganti sendiri setelah waktunya habis. "
              : forwardOnly
                ? "Soal yang sudah dilewati tidak bisa dibuka lagi. "
                : ""}
            {activeSection?.lockAnswers
              ? "Pilihan pertama kamu langsung dikunci."
              : forwardOnly
                ? "Jawaban bisa diubah selama soal masih tampil."
                : "Kamu bisa mengubah jawaban sampai mengirimnya."}{" "}
            Jawaban tersimpan otomatis selama kamu mengerjakan.
            {secondsLeft !== null || sectionSecondsLeft !== null
              ? " Timer tetap berjalan meski kamu keluar."
              : ""}
          </p>

          <div className="border-border flex flex-col gap-3 border-t pt-4">
            <div className="flex gap-3">
              {positionInSection > 0 && !forwardOnly ? (
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => goTo(sectionIndexes[positionInSection - 1]!)}
                >
                  Sebelumnya
                </Button>
              ) : null}
              {!paced &&
              (!isLastInSection ||
                (nextUnansweredInSection !== undefined &&
                  nextUnansweredInSection !== current)) ? (
                <Button
                  className="flex-1"
                  disabled={busy}
                  onClick={() =>
                    goTo(
                      isLastInSection
                        ? nextUnansweredInSection!
                        : sectionIndexes[positionInSection + 1]!,
                    )
                  }
                >
                  {isLastInSection
                    ? "Soal belum dijawab berikutnya →"
                    : "Berikutnya →"}
                </Button>
              ) : null}
            </div>
            {!expired ? (
              <p
                aria-live="polite"
                className="text-muted-foreground flex items-center justify-center gap-1.5 text-center text-xs"
              >
                {dirty || progress.isPending ? (
                  "Menyimpan jawaban…"
                ) : (
                  <>
                    <CheckIcon className="size-3" /> Jawaban tersimpan
                  </>
                )}
              </p>
            ) : null}
            {!isLastSection && activeSection ? (
              canFinishSection(activeSection) &&
              (isLastInSection || sectionAnswered === sectionIndexes.length) ? (
                <Button
                  size="lg"
                  disabled={busy}
                  onClick={() => setFinishSectionOpen(true)}
                >
                  Selesai bagian ini
                </Button>
              ) : null
            ) : // A last section that may not end early ends with its time.
            activeSection &&
              !canFinishSection(activeSection) ? null : expired ||
              isLast ||
              answeredCount === total ? (
              <Button
                size="lg"
                disabled={busy}
                onClick={() => setConfirmOpen(true)}
              >
                {busy ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : null}
                {busy
                  ? "Menyimpan…"
                  : answeredCount === total
                    ? "Kirim tugas"
                    : `Kirim · ${answeredCount}/${total} dijawab`}
              </Button>
            ) : null}
          </div>

          <QuestionNavigator
            open={navigatorOpen}
            onOpenChange={setNavigatorOpen}
            title={activeSection?.title ?? assessment.title}
            current={Math.max(0, positionInSection)}
            statuses={sectionStatuses}
            onSelect={(index) => {
              // Paced sections move by themselves; forward-only ones only ahead.
              if (busy || paced || (forwardOnly && index < positionInSection))
                return false;
              goTo(sectionIndexes[index] ?? current);
              return true;
            }}
          />
        </>
      )}
      <AlertDialog open={finishSectionOpen} onOpenChange={setFinishSectionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Selesaikan {activeSection?.title}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {sectionAnswered} dari {sectionIndexes.length} soal di bagian ini
              dijawab. Bagian yang sudah selesai tidak bisa dibuka lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction onClick={finishSection}>
              Selesai bagian
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim tugas?</AlertDialogTitle>
            <AlertDialogDescription>
              {expired
                ? "Waktu habis. Hanya jawaban yang sudah tersimpan di server yang dapat dinilai."
                : `${answeredCount} dari ${total} soal dijawab. Jawaban yang dikirim tidak dapat diubah.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitAssessment()}>
              Kirim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
