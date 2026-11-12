"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import {
  answerHasContent,
  assessmentContentAssetIds,
  groupRanges,
  canFinishSection,
  createLogEntry,
  isForwardOnly,
  MAX_LOG_ENTRIES_PER_WRITE,
  pacedQuestionEndsAt,
  questionAudioSources,
  sectionAudioPolicy,
  sectionRules,
  sectionTimeline,
  sectionView,
  stimulusPlaysWith,
  unseenNotice,
  unseenQuestions,
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
import {
  isQuestionAnswered,
  type QuestionStatus,
} from "~/lib/learner/question-progress";
import { formatRemaining } from "~/lib/learner/question-progress";
import { onPageHidden } from "~/lib/page-hidden";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  AssessmentMediaStatus,
  useAssessmentMediaPreload,
} from "./assessment-media";
import { QuestionNavigator, StudyCard } from "./assessment-ui";
import { SectionIntro } from "~/components/learner/assessment/section-intro";
import { QuizNav } from "../quiz/quiz-nav";
import { QuizPager } from "../quiz/quiz-pager";
import { QuizQuestion } from "../quiz/quiz-question";
import { QuizStatusDots } from "../quiz/quiz-status-dots";
import {
  AssessmentAudioPlayer,
  useAttemptAudio,
} from "~/components/learner/assessment/assessment-audio-player";

type Assessment = RouterOutputs["assessment"]["getForCourseItem"];
type Attempt = RouterOutputs["assessment"]["getMyAttempt"];
type Answer = {
  questionId: string;
  content?: string;
  optionIds: string[];
};

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
  /** The course item of the attempt; null for attempts of library events. */
  courseItemId: string | null;
  assessment: Assessment;
  attempt: Attempt;
  serverTime: Date;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  // A finished attempt leaves for its tugas or event screen, which shows the
  // result, so nothing here waits for a review.
  const attemptQuery = api.assessment.getMyAttempt.useQuery(
    { attemptId: initialAttempt.id },
    { initialData: initialAttempt },
  );
  const attempt = attemptQuery.data;
  // A finished attempt leaves for its tugas or event screen, which shows the
  // result, so nothing here waits for a review.
  const assessmentQueryOptions = { initialData: initialAssessment };
  // Attempts of library events have no course item and load through the attempt alone.
  const itemAssessmentQuery = api.assessment.getForCourseItem.useQuery(
    { courseItemId: courseItemId ?? "", attemptId: attempt.id },
    { ...assessmentQueryOptions, enabled: courseItemId !== null },
  );
  const attemptAssessmentQuery = api.assessment.getForAttempt.useQuery(
    { attemptId: attempt.id },
    { ...assessmentQueryOptions, enabled: courseItemId === null },
  );
  const assessment = courseItemId
    ? itemAssessmentQuery.data
    : attemptAssessmentQuery.data;
  const leaveHref = assessment.event
    ? `/learn/assessments/${assessment.event.id}`
    : courseItemId
      ? `/learn/${courseId}/items/${courseItemId}`
      : `/learn/${courseId}`;
  const invalidateAssessment = useCallback(
    () =>
      courseItemId
        ? utils.assessment.getForCourseItem.invalidate({
            courseItemId,
            attemptId: attempt.id,
          })
        : utils.assessment.getForAttempt.invalidate({ attemptId: attempt.id }),
    [attempt.id, courseItemId, utils],
  );

  // Questions show one at a time: fetch every question's media up front so later questions do
  // not depend on the connection.
  const media = useAssessmentMediaPreload(
    assessmentContentAssetIds(assessment),
    attempt.status === "IN_PROGRESS",
  );
  const [selected, setCurrent] = useState(0);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  // Questions the learner has had in view, for the status dots and the list.
  const [seenQuestionIds, setSeenQuestionIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
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
    question && audioPolicy
      ? questionAudioSources(
          question,
          stimulusPlaysWith(assessment.questions, current, assessment.groups),
        )
      : [];
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
  // Questions never opened that the learner can still open: finishing offers
  // to go to them first (the button itself always shows).
  const unseen = unseenQuestions({
    indexes: sectionIndexes,
    current,
    navigation: activeSection?.navigation,
    isSeen: (index) =>
      seenQuestionIds.has(assessment.questions[index]?.id ?? ""),
  });
  const firstUnseen = unseen[0];
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
        invalidateAssessment(),
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
      router.replace(leaveHref);
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
  // Adjusted while rendering, so the dots show the question as opened at once.
  if (
    shownQuestionId &&
    (!sectioned || viewMode === "answering") &&
    !seenQuestionIds.has(shownQuestionId)
  ) {
    setSeenQuestionIds(new Set(seenQuestionIds).add(shownQuestionId));
  }

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

  /** Answers on the question in view; the neighbouring pages are inert. */
  const chooseOption = (
    page: Assessment["questions"][number],
    optionId: string,
  ) => {
    if (
      page.id !== question?.id ||
      busy ||
      expired ||
      isFinished ||
      isAnswerLocked(page)
    )
      return;
    editAnswer(page.id, (currentAnswers) => {
      const existing = currentAnswers[page.id]?.optionIds ?? [];
      const optionIds =
        page.type === "SINGLE_CHOICE"
          ? [optionId]
          : existing.includes(optionId)
            ? existing.filter((id) => id !== optionId)
            : [...existing, optionId];
      return { questionId: page.id, optionIds };
    });
  };
  const writeAnswer = (questionId: string, content: string) => {
    if (questionId !== question?.id || busy || expired || isFinished) return;
    editAnswer(questionId, () => ({ questionId, content, optionIds: [] }));
  };

  // A locked section keeps the first choice of a single-choice question.
  const isAnswerLocked = (page: Assessment["questions"][number]) =>
    Boolean(
      activeSection?.lockAnswers &&
      page.type === "SINGLE_CHOICE" &&
      answerHasContent(answers[page.id] ?? {}),
    );

  // A finished attempt (just submitted, or graded meanwhile) leaves for its
  // tugas or event screen, which shows the result in full.
  const leaveForResult = isFinished && !eventEndedIncomplete;
  useEffect(() => {
    if (leaveForResult) router.replace(leaveHref);
  }, [leaveForResult, leaveHref, router]);

  // "Selesaikan tryout", "Selesaikan latihan" or "Selesaikan tugas".
  const kindLabel =
    assessment.event?.type === "TRYOUT"
      ? "tryout"
      : assessment.event
        ? "latihan"
        : "tugas";

  if (eventEndedIncomplete) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <StudyCard className="items-center rounded-2xl text-center">
          <h1 className="text-2xl font-black">Attempt tidak selesai</h1>
          <p className="text-muted-foreground text-sm leading-5">
            Event telah ditutup sebelum jawaban kamu dikirim.
          </p>
          <Link
            href={leaveHref}
            className={buttonVariants({
              size: "lg",
              className: "self-stretch",
            })}
          >
            Kembali ke event
          </Link>
        </StudyCard>
      </div>
    );
  }
  if (leaveForResult) {
    return (
      <p className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Membuka hasil…
      </p>
    );
  }

  if (!question) {
    return (
      <p className="text-muted-foreground py-16 text-center">
        Tugas ini belum memiliki soal.
      </p>
    );
  }
  const isLastInSection = positionInSection === sectionIndexes.length - 1;
  // The bottom bar moves like the app's toolbar: back within a free section,
  // on to the next question, and from the last one to the next unanswered.
  const previousIndex =
    positionInSection > 0 && !forwardOnly && !paced
      ? sectionIndexes[positionInSection - 1]
      : undefined;
  const nextIndex = paced
    ? undefined
    : isLastInSection
      ? nextUnansweredInSection !== current
        ? nextUnansweredInSection
        : undefined
      : sectionIndexes[positionInSection + 1];
  // The main action: finish the section, or the whole tugas from the last
  // section (or one without sections). Always in the same place, at the top
  // right, and always behind a confirmation.
  const finish =
    activeSection && !canFinishSection(activeSection)
      ? null
      : activeSection && !isLastSection
        ? { label: "Selesai bagian", open: () => setFinishSectionOpen(true) }
        : {
            label: `Selesaikan ${kindLabel}`,
            open: () => setConfirmOpen(true),
          };
  const ranges = groupRanges(assessment.questions);

  function renderPage(position: number) {
    const pageIndex = sectionIndexes[position];
    const page =
      pageIndex === undefined ? undefined : assessment.questions[pageIndex];
    if (!page || pageIndex === undefined) return null;
    const inView = pageIndex === current;
    const pageGroup = page.groupId
      ? assessment.groups.find(({ id }) => id === page.groupId)
      : undefined;
    const range = page.groupId ? ranges.get(page.groupId) : undefined;
    return (
      <QuizQuestion
        question={page}
        index={pageIndex}
        total={total}
        group={
          pageGroup && range
            ? {
                instructions: pageGroup.instructions,
                stimulus: pageGroup.stimulus,
                first: range.first,
                last: range.last,
              }
            : null
        }
        selectedOptionIds={answers[page.id]?.optionIds}
        writtenAnswer={answers[page.id]?.content}
        onChooseOption={(optionId) => chooseOption(page, optionId)}
        onChangeWritten={(content) => writeAnswer(page.id, content)}
        disabled={busy}
        answersDisabled={expired || isAnswerLocked(page)}
        hideInlineAudio={Boolean(audioPolicy)}
        media={
          // Only the question in view plays: audio counts plays.
          inView && audioPolicy && audioSources.length ? (
            <AssessmentAudioPlayer
              key={page.id}
              audio={attemptAudio}
              disabled={busy || expired}
              onFinished={() => audioFinished(page.id)}
              onPlayStarted={() => recordPlay(page.id)}
              playsUsed={playsOf(page.id)}
              policy={audioPolicy}
              sources={audioSources}
            />
          ) : null
        }
      />
    );
  }

  return (
    <div
      ref={top}
      className="mx-auto flex w-full max-w-2xl scroll-mt-20 flex-col gap-4"
    >
      <header className="flex items-center gap-2">
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
        {/* Finishing sits at the top right and moving in the bottom bar, so
            both stay put whatever the question's length. */}
        {finish && view?.mode !== "intro" && view?.mode !== "done" ? (
          <Button size="sm" disabled={busy} onClick={finish.open}>
            {busy ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : null}
            {busy ? "Mengirim…" : finish.label}
          </Button>
        ) : null}
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
        <StudyCard className="rounded-2xl">
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
          rules={sectionRules(activeSection)}
          secondsToAutoStart={introSecondsLeft}
          sectionCount={assessment.sections.length}
          timeLimitSeconds={activeSection.timeLimitSeconds}
          title={activeSection.title}
        />
      ) : (
        <>
          {activeSection ? (
            <p
              aria-live={sectionSecondsLeft === 0 ? "polite" : "off"}
              className={cn(
                "text-sm font-bold tabular-nums",
                sectionSecondsLeft !== null && sectionSecondsLeft < 60
                  ? "text-destructive"
                  : "text-primary",
              )}
            >
              {activeSection.title}
              {sectionSecondsLeft !== null
                ? ` · ${formatRemaining(sectionSecondsLeft)} tersisa`
                : ""}
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

          <QuizStatusDots
            // A new section starts a new row, like its pages. (Sibling keys
            // must differ from the pager's.)
            key={`dots-${activeSection?.id ?? "questions"}`}
            statuses={sectionStatuses}
            seen={sectionIndexes.map((index) =>
              seenQuestionIds.has(assessment.questions[index]?.id ?? ""),
            )}
            current={Math.max(0, positionInSection)}
            onOpenList={() => setNavigatorOpen(true)}
            disabled={busy}
          />
          <QuizPager
            // A new section is a new set of pages.
            key={`pages-${activeSection?.id ?? "questions"}`}
            count={sectionIndexes.length}
            index={Math.max(0, positionInSection)}
            // Forward-only and paced sections move only with their own rules.
            swipeEnabled={!forwardOnly && !paced && !busy}
            onIndexChange={(position) => {
              const next = sectionIndexes[position];
              if (next !== undefined) goTo(next);
            }}
            renderPage={renderPage}
          />
          {pacedEndsAt ? (
            <p
              aria-live="off"
              className="text-muted-foreground text-sm font-semibold tabular-nums"
            >
              {isLastInSection ? "Bagian selesai" : "Soal berikutnya"} dalam{" "}
              {formatRemaining(
                Math.max(
                  0,
                  Math.ceil((pacedEndsAt.getTime() - now.getTime()) / 1000),
                ),
              )}
            </p>
          ) : null}

          {/* Moving, in the app's toolbar order, within thumb reach. */}
          <div className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col gap-2 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-t-2xl sm:px-3">
            <QuizNav
              answered={sectionAnswered}
              total={sectionIndexes.length}
              onPrevious={
                previousIndex !== undefined
                  ? () => goTo(previousIndex)
                  : undefined
              }
              onNext={
                nextIndex !== undefined ? () => goTo(nextIndex) : undefined
              }
              nextLabel={
                isLastInSection
                  ? "Soal belum dijawab berikutnya"
                  : "Soal berikutnya"
              }
              onOpenList={() => setNavigatorOpen(true)}
              disabled={busy}
            />
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
          </div>

          <QuestionNavigator
            open={navigatorOpen}
            onOpenChange={setNavigatorOpen}
            title={activeSection?.title ?? assessment.title}
            current={Math.max(0, positionInSection)}
            statuses={sectionStatuses}
            seen={sectionIndexes.map((index) =>
              seenQuestionIds.has(assessment.questions[index]?.id ?? ""),
            )}
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
              {[
                unseenNotice(unseen.length, true),
                `${sectionAnswered} dari ${sectionIndexes.length} soal di bagian ini dijawab. Bagian yang sudah selesai tidak bisa dibuka lagi.`,
              ]
                .filter(Boolean)
                .join(" ")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FinishDialogFooter
            finishLabel="Selesai bagian"
            onFinish={finishSection}
            onOpenUnseen={
              firstUnseen === undefined
                ? undefined
                : () => {
                    setFinishSectionOpen(false);
                    goTo(firstUnseen);
                  }
            }
          />
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selesaikan {kindLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              {expired
                ? "Waktu habis. Jawaban yang kamu isi sebelum waktu habis akan dikirim dan dinilai."
                : [
                    `Apakah kamu yakin ingin menyelesaikan ${kindLabel} ini dan mengirim jawaban?`,
                    unseenNotice(unseen.length, Boolean(activeSection)),
                    `${answeredCount} dari ${total} soal dijawab. Jawaban yang dikirim tidak dapat diubah.`,
                  ]
                    .filter(Boolean)
                    .join(" ")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FinishDialogFooter
            finishLabel="Selesaikan"
            onFinish={() => void submitAssessment()}
            onOpenUnseen={
              expired || firstUnseen === undefined
                ? undefined
                : () => {
                    setConfirmOpen(false);
                    goTo(firstUnseen);
                  }
            }
          />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * A finish confirmation's buttons. With questions still unopened, going to
 * the first of them is the main action and finishing the second choice.
 */
function FinishDialogFooter({
  finishLabel,
  onFinish,
  onOpenUnseen,
}: {
  finishLabel: string;
  onFinish: () => void;
  onOpenUnseen?: () => void;
}) {
  if (!onOpenUnseen) {
    return (
      <AlertDialogFooter>
        <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
        <AlertDialogAction onClick={onFinish}>{finishLabel}</AlertDialogAction>
      </AlertDialogFooter>
    );
  }
  return (
    <AlertDialogFooter>
      <AlertDialogCancel>Batal</AlertDialogCancel>
      <AlertDialogAction variant="outline" onClick={onFinish}>
        Tetap {finishLabel.toLowerCase()}
      </AlertDialogAction>
      <AlertDialogAction onClick={onOpenUnseen}>
        Buka soal yang belum dilihat
      </AlertDialogAction>
    </AlertDialogFooter>
  );
}
