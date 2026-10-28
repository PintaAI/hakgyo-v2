import {
  answerHasContent,
  assessmentContentAssetIds,
  canFinishSection,
  formatScoreOutOf,
  isForwardOnly,
  pacedQuestionEndsAt,
  questionAudioSources,
  groupRanges,
  stimulusPlaysWith,
  usesPictureGrid,
  ruleSectionsFor,
  ruleStateFrom,
  sectionAudioPolicy,
  sectionTimeline,
  sectionView,
  type AttemptLogEntry,
  type TimelineEntry,
} from "@hakgyo/shared";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Storage from "expo-sqlite/kv-store";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import {
  AssessmentMediaStatus,
  useAssessmentMediaPrefetch,
} from "../../../../../../src/components/assessment-media";
import { AssessmentResultReview } from "../../../../../../src/components/assessment-result-review";
import { ScoreBandResults } from "../../../../../../src/components/score-band-results";
import { SectionIntro } from "../../../../../../src/components/section-intro";
import { QuestionGroupHeader } from "../../../../../../src/components/question-group-header";
import { AssessmentAudioPlayer } from "../../../../../../src/components/assessment-audio-player";
import { TagResults } from "../../../../../../src/components/tag-results";
import {
  AssessmentOption,
  AssessmentOptions,
  AssessmentQuestion,
} from "../../../../../../src/components/assessment-ui";
import {
  FullScreenState,
  IconCircle,
  StudyScreen,
} from "../../../../../../src/components/learning-ui";
import {
  StudyAction,
  StudyGlass,
} from "../../../../../../src/components/study-glass";
import {
  isQuestionAnswered,
  type QuestionStatus,
} from "../../../../../../src/lib/question-progress";
import { useQuestionNavigator } from "../../../../../../src/providers/QuestionNavigatorProvider";
import {
  NativeContentRenderer,
  useApiAssetResolver,
} from "../../../../../../src/components/content-renderer";
import { api } from "../../../../../../src/lib/trpc";
import { authClient } from "../../../../../../src/lib/auth-client";
import { restoreAssessmentDraft } from "../../../../../../src/lib/assessment-draft";
import { formatRemaining } from "../../../../../../src/lib/format-remaining";
import {
  appendAttemptLog,
  compactAttemptLog,
  correctedNow,
  readAttemptLog,
  removeAttemptLog,
  saveAttemptLog,
  type AttemptLog,
} from "../../../../../../src/lib/attempt-log";
import { assessmentTerminalResult } from "../../../../../../src/lib/assessment-state";
import { useAppTheme } from "../../../../../../src/providers/AppThemeProvider";
import { useMobileSyncActions } from "../../../../../../src/providers/MobileSyncProvider";
import { useLearnerAttempt } from "../../../../../../src/sync/hooks";
import { firstParam } from "../../../../../../src/lib/route-params";
import { SymbolIcon } from "../../../../../../src/components/ui/symbol-icon";

type Answer = { content?: string; optionIds: string[] };

// Audio of the content itself, hidden while a section plays it through the controlled player.
const hiddenAudioRenderers = { assetAudio: () => null, audio: () => null };

function buildAnswerPayload(
  questions: readonly { id: string; type: string }[] | undefined,
  answers: Record<string, Answer>,
) {
  return (
    questions?.flatMap((question) => {
      const answer = answers[question.id];
      if (!answer) return [];
      return [
        {
          questionId: question.id,
          optionIds: answer.optionIds,
          ...(question.type === "WRITTEN"
            ? { content: answer.content ?? "" }
            : {}),
        },
      ];
    }) ?? []
  );
}

function persistAssessmentDraft(
  storageKey: string,
  answers: Record<string, Answer>,
) {
  Storage.setItemSync(storageKey, JSON.stringify(answers));
}

const AssessmentDeadline = memo(function AssessmentDeadline({
  deadline,
  onExpire,
}: {
  deadline: number;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  const reportedExpiration = useRef(false);

  useEffect(() => {
    reportedExpiration.current = false;
    if (Date.now() >= deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const expired = now >= deadline;
  useEffect(() => {
    if (!expired || reportedExpiration.current) return;
    reportedExpiration.current = true;
    onExpire();
  }, [expired, onExpire]);

  return (
    <Text
      accessibilityLiveRegion={expired ? "polite" : "none"}
      className={
        expired
          ? "text-sm font-bold text-destructive"
          : "text-sm font-bold text-primary"
      }
    >
      {expired
        ? "Waktu habis · kirim jawaban yang tersimpan"
        : `${Math.floor(Math.max(0, deadline - now) / 60_000)}:${String(Math.floor(Math.max(0, deadline - now) / 1000) % 60).padStart(2, "0")} tersisa`}
    </Text>
  );
});

export default function AssessmentAttemptScreen() {
  const params = useLocalSearchParams<{
    courseId: string | string[];
    courseItemId: string | string[];
    attemptId: string | string[];
  }>();
  const courseId = firstParam(params.courseId);
  const courseItemId = firstParam(params.courseItemId);
  const attemptId = firstParam(params.attemptId);
  return (
    <AssessmentAttemptContent
      key={attemptId}
      courseId={courseId}
      courseItemId={courseItemId}
      attemptId={attemptId}
    />
  );
}

function AssessmentAttemptContent({
  courseId,
  courseItemId,
  attemptId,
}: {
  courseId: string;
  courseItemId: string;
  attemptId: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const resultScrollRef = useRef<ScrollView>(null);
  const operationPending = useRef(false);
  const { data: session } = authClient.useSession();
  const utils = api.useUtils();
  const { activeOrganizationId, colors } = useAppTheme();
  const { completeAssessment, queueAssessmentProgress } =
    useMobileSyncActions();
  const resolveAssetUrl = useApiAssetResolver();
  // Resumable attempts come from the local index / persisted start result;
  // graded ones from the persisted checkpoint result. Online otherwise.
  const { assessment, attempt } = useLearnerAttempt(attemptId, courseItemId);
  // Questions show one at a time: fetch every question's media up front so later questions do
  // not depend on the connection.
  const mediaAssetIds = useMemo(
    () => (assessment.data ? assessmentContentAssetIds(assessment.data) : []),
    [assessment.data],
  );
  const media = useAssessmentMediaPrefetch(
    mediaAssetIds,
    attempt.data?.status === "IN_PROGRESS",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [selectedIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [hasUnsavedAnswers, setHasUnsavedAnswers] = useState(false);
  const initialized = useRef<string | null>(null);
  const latestDraft = useRef<Record<string, Answer>>({});
  const latestDraftKey = useRef<string | null>(null);
  const shouldPersistLatestDraft = useRef(false);
  const draftCompleted = useRef(false);
  const [expiredDeadline, setExpiredDeadline] = useState<number | null>(null);
  const [draftError, setDraftError] = useState<string>();
  // Progress log (answers and shown questions with corrected device times) and the last answer
  // logged per question, so only changes become entries.
  const attemptLog = useRef<AttemptLog | null>(null);
  const loggedAnswers = useRef<Record<string, Answer>>({});
  const autoSubmitted = useRef(false);
  const [logReady, setLogReady] = useState(false);
  // Sections: starts and ends made on this device (the server's come with the attempt) and a
  // ticking clock for the section timeline.
  const [localSectionEntries, setLocalSectionEntries] = useState<
    TimelineEntry[]
  >([]);
  const [now, setNow] = useState(() => new Date());
  // Section rules (docs/eps-topik-simulation.md section 5.6) from this device's log on top of what
  // the server counted: the furthest position reached per section and plays per question.
  const [reached, setReached] = useState<Record<string, number>>({});
  const [localPlays, setLocalPlays] = useState<Record<string, number>>({});
  // Paced sections: when the question on screen showed and when its audio finished.
  const [pacedClock, setPacedClock] = useState<{
    questionId: string;
    shownAt: Date;
    audioEndedAt: Date | null;
  } | null>(null);
  const pacedEndedSection = useRef<string | null>(null);
  const storageKey = session
    ? `hakgyo:attempt:v1:${session.user.id}:${attemptId}`
    : null;
  const deadline =
    assessment.data?.attemptDeadline?.getTime() ??
    (attempt.data && assessment.data?.timeLimitMinutes != null
      ? attempt.data.startedAt.getTime() +
        assessment.data.timeLimitMinutes * 60_000
      : null);
  const expired =
    deadline !== null &&
    (Date.now() >= deadline || expiredDeadline === deadline);
  const busy = submitting;
  const [submittedResult, setSubmittedResult] = useState<{
    status: "GRADED" | "IN_REVIEW";
    score: number;
    maxScore: number;
  }>();
  const result = assessmentTerminalResult(attempt.data) ?? submittedResult;
  const hasResult = result !== undefined;

  useEffect(() => {
    if (
      !attempt.data ||
      !assessment.data ||
      !storageKey ||
      initialized.current === attemptId
    )
      return;
    initialized.current = attemptId;
    draftCompleted.current = false;
    const serverSaved: Record<string, Answer> = Object.fromEntries(
      attempt.data.answers.map((answer) => [
        answer.questionId,
        {
          content:
            typeof answer.content === "string" ? answer.content : undefined,
          optionIds: answer.selectedOptions.map(
            (selection) => selection.optionId,
          ),
        },
      ]),
    );
    let saved = serverSaved;
    if (storageKey && attempt.data.status === "IN_PROGRESS") {
      try {
        saved = restoreAssessmentDraft(saved, Storage.getItemSync(storageKey));
      } catch {
        setDraftError(
          "Draf lokal tidak dapat dipulihkan. Jawaban terakhir yang tersimpan di server ditampilkan.",
        );
      }
    }
    if (session && attempt.data.status === "IN_PROGRESS") {
      const log = readAttemptLog(
        session.user.id,
        attemptId,
        assessment.data.progressSeq,
      );
      attemptLog.current = log;
      const logged = { ...serverSaved };
      for (const entry of log.entries) {
        if (entry.kind === "ANSWERED" && entry.questionId) {
          logged[entry.questionId] = {
            optionIds: entry.optionIds ?? [],
            content: entry.content,
          };
        }
      }
      loggedAnswers.current = logged;
      // Section starts and ends saved on this device before a restart still count.
      setLocalSectionEntries(
        log.entries.flatMap((entry) =>
          entry.kind === "SECTION_STARTED" || entry.kind === "SECTION_ENDED"
            ? [
                {
                  kind: entry.kind,
                  sectionId: entry.sectionId,
                  at: new Date(entry.clientAt),
                },
              ]
            : [],
        ),
      );
      // Plays and positions logged on this device before a restart still count. Questions are
      // in the order shown.
      const rules = ruleStateFrom(
        ruleSectionsFor(assessment.data.sections, assessment.data.questions),
        log.entries,
      );
      setReached(Object.fromEntries(rules.furthest));
      setLocalPlays(Object.fromEntries(rules.plays));
      setLogReady(true);
    }
    setAnswers(saved);
    setHasUnsavedAnswers(false);
  }, [assessment.data, attempt.data, attemptId, storageKey, session]);

  useEffect(() => {
    if (
      !storageKey ||
      initialized.current !== attemptId ||
      hasResult ||
      attempt.data?.status !== "IN_PROGRESS"
    )
      return;
    // The hydration render still contains the initial empty state.
    if (!Object.keys(answers).length) return;
    const timer = setTimeout(() => {
      try {
        persistAssessmentDraft(storageKey, answers);
        if (logAnswerChanges(answers)) {
          void queueAssessmentProgress({
            attemptId,
            entries: attemptLog.current?.entries ?? [],
            organizationId: activeOrganizationId ?? undefined,
          }).catch(() => undefined);
        }
        setDraftError(undefined);
        setHasUnsavedAnswers(false);
      } catch {
        setDraftError(
          "Draf di perangkat tidak tersedia. Akan dicoba lagi selama kamu mengerjakan.",
        );
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- logging reads refs only
  }, [answers, attemptId, storageKey, hasResult, attempt.data?.status]);

  /** Appends an ANSWERED entry per question changed since it was last logged; true if any. */
  function logAnswerChanges(current: Record<string, Answer>) {
    const log = attemptLog.current;
    if (!log || !session) return false;
    let next = log;
    for (const [questionId, answer] of Object.entries(current)) {
      const logged = loggedAnswers.current[questionId];
      if (
        logged &&
        logged.content === answer.content &&
        logged.optionIds.length === answer.optionIds.length &&
        logged.optionIds.every((id, index) => id === answer.optionIds[index])
      )
        continue;
      next = appendAttemptLog(next, "ANSWERED", {
        questionId,
        optionIds: answer.optionIds,
        ...(answer.content === undefined ? {} : { content: answer.content }),
      });
      loggedAnswers.current = {
        ...loggedAnswers.current,
        [questionId]: answer,
      };
    }
    if (next === log) return false;
    attemptLog.current = next;
    try {
      saveAttemptLog(session.user.id, attemptId, next);
    } catch {
      // The draft still holds the answers; the in-memory log is sent with the next operation.
    }
    return true;
  }

  latestDraft.current = answers;
  latestDraftKey.current = storageKey;
  shouldPersistLatestDraft.current =
    Boolean(Object.keys(answers).length) &&
    initialized.current === attemptId &&
    !hasResult &&
    attempt.data?.status === "IN_PROGRESS";

  useEffect(
    () => () => {
      if (
        draftCompleted.current ||
        !shouldPersistLatestDraft.current ||
        !latestDraftKey.current
      )
        return;
      try {
        persistAssessmentDraft(latestDraftKey.current, latestDraft.current);
      } catch {
        // The screen is unmounting; the next visit still has server answers.
      }
    },
    [],
  );

  // Sections run one after another (shared timeline, docs/eps-topik-simulation.md section 4.2).
  const sections = assessment.data?.sections ?? [];
  const sectioned = sections.length > 0;
  const timeline =
    sectioned && attempt.data && assessment.data
      ? sectionTimeline({
          sections,
          startedAt: attempt.data.startedAt,
          attemptDeadline: assessment.data.attemptDeadline,
          entries: [...assessment.data.sectionEntries, ...localSectionEntries],
          now,
        })
      : null;
  const view = timeline ? sectionView(timeline) : null;
  const activeSection =
    view && view.mode !== "done" ? sections[view.index] : undefined;
  const sectionIndexes = (assessment.data?.questions ?? []).flatMap(
    (entry, index) =>
      !activeSection || entry.sectionId === activeSection.id ? [index] : [],
  );
  const forwardOnly = isForwardOnly(activeSection?.navigation);
  const paced = activeSection?.navigation === "PACED";
  const furthestInSection = activeSection
    ? Math.max(
        assessment.data?.questionProgress.furthest[activeSection.id] ?? -1,
        reached[activeSection.id] ?? -1,
      )
    : -1;
  // The shown question stays inside the running section, and in a forward-only one never before
  // the furthest question reached.
  const selectedPosition = Math.max(0, sectionIndexes.indexOf(selectedIndex));
  const currentIndex = activeSection
    ? (sectionIndexes[
        forwardOnly
          ? Math.max(selectedPosition, furthestInSection)
          : selectedPosition
      ] ?? selectedIndex)
    : selectedIndex;
  const positionInSection = sectionIndexes.indexOf(currentIndex);
  const isLastInSection = positionInSection === sectionIndexes.length - 1;
  const isLastSection =
    !view || view.mode === "done" || view.index === sections.length - 1;
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
  const sectionExpired = sectionSecondsLeft === 0;

  const question = assessment.data?.questions[currentIndex];
  // Groups: a question's shared part. Its stimulus audio plays with the group's first question;
  // bundles cached before groups have none.
  const groups = assessment.data?.groups ?? [];
  const group = question?.groupId
    ? groups.find(({ id }) => id === question.groupId)
    : undefined;
  const groupRange = question?.groupId
    ? groupRanges(assessment.data?.questions ?? []).get(question.groupId)
    : undefined;
  const playsOf = (questionId: string) =>
    Math.max(
      assessment.data?.questionProgress.plays[questionId] ?? 0,
      localPlays[questionId] ?? 0,
    );
  const audioPolicy = sectionAudioPolicy(activeSection);
  const audioSources =
    question && audioPolicy
      ? questionAudioSources(
          question,
          stimulusPlaysWith(
            assessment.data?.questions ?? [],
            currentIndex,
            groups,
          ),
        )
      : [];
  const pictureGrid = question ? usesPictureGrid(question.options) : false;
  const pacedEndsAt =
    paced && activeSection && question && pacedClock?.questionId === question.id
      ? pacedQuestionEndsAt({
          section: activeSection,
          hasAudio: audioSources.length > 0,
          shownAt: pacedClock.shownAt,
          audioEndedAt: pacedClock.audioEndedAt,
        })
      : null;
  // A locked section keeps the first choice of a single-choice question.
  const answerLocked = Boolean(
    activeSection?.lockAnswers &&
    question?.type === "SINGLE_CHOICE" &&
    answerHasContent(answers[question.id] ?? {}),
  );
  const statuses: QuestionStatus[] = useMemo(
    () =>
      (assessment.data?.questions ?? []).map((item) =>
        isQuestionAnswered(answers[item.id]) ? "answered" : "unanswered",
      ),
    [answers, assessment.data?.questions],
  );
  const answeredCount = useMemo(
    () => statuses.filter((status) => status === "answered").length,
    [statuses],
  );
  const sectionStatuses = sectionIndexes.map((index) => statuses[index]!);
  const sectionAnswered = sectionStatuses.filter(
    (status) => status === "answered",
  ).length;
  // Forward-only sections cannot wrap around to earlier questions.
  const nextUnanswered =
    sectionIndexes.find(
      (index, position) =>
        position > positionInSection && statuses[index] === "unanswered",
    ) ??
    (forwardOnly
      ? undefined
      : sectionIndexes.find((index) => statuses[index] === "unanswered")) ??
    -1;
  const openQuestions = useQuestionNavigator({
    title: activeSection?.title ?? assessment.data?.title ?? "Tugas",
    current: Math.max(0, positionInSection),
    statuses: sectionStatuses,
    onSelect: async (position) => {
      const index = sectionIndexes[position];
      // Paced sections move by themselves; forward-only ones only ahead.
      if (
        index === undefined ||
        result ||
        operationPending.current ||
        paced ||
        (forwardOnly && position < positionInSection)
      ) {
        return false;
      }
      if (expired || sectionExpired) {
        setCurrentIndex(index);
        return true;
      }
      return save(index);
    },
  });

  // Section clock, and submitting once the last section has ended.
  useEffect(() => {
    if (!sectioned || result || attempt.data?.status !== "IN_PROGRESS") return;
    const offset = attemptLog.current?.clockOffsetMs ?? 0;
    const timer = setInterval(
      () => setNow(new Date(Date.now() + offset)),
      1000,
    );
    return () => clearInterval(timer);
  }, [sectioned, result, attempt.data?.status, logReady]);
  useEffect(() => {
    if (view?.mode !== "done" || autoSubmitted.current || result) return;
    if (attempt.data?.status !== "IN_PROGRESS") return;
    autoSubmitted.current = true;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when the sections end
  }, [view?.mode]);

  /** Logs a section start or end, saves the log and queues it for sync. */
  function logSectionEntry(
    kind: "SECTION_STARTED" | "SECTION_ENDED",
    sectionId: string,
  ) {
    const log = attemptLog.current;
    if (!log || !session) return;
    const next = appendAttemptLog(log, kind, { sectionId });
    attemptLog.current = next;
    try {
      saveAttemptLog(session.user.id, attemptId, next);
    } catch {
      // The in-memory log is sent with the next operation.
    }
    setLocalSectionEntries((entries) => [
      ...entries,
      { kind, sectionId, at: new Date(next.entries.at(-1)!.clientAt) },
    ]);
    void queueAssessmentProgress({
      attemptId,
      entries: next.entries,
      organizationId: activeOrganizationId ?? undefined,
    }).catch(() => undefined);
  }

  // Paced sections move on by themselves once the question's time is up.
  useEffect(() => {
    if (
      !paced ||
      !activeSection ||
      !question ||
      busy ||
      result ||
      view?.mode !== "answering"
    ) {
      return;
    }
    if (pacedClock?.questionId !== question.id) {
      setPacedClock({
        questionId: question.id,
        shownAt: now,
        audioEndedAt: null,
      });
      return;
    }
    if (!pacedEndsAt || now < pacedEndsAt) return;
    if (!isLastInSection) {
      void save(sectionIndexes[positionInSection + 1]!);
    } else if (pacedEndedSection.current !== activeSection.id) {
      // The last question's time is up: the section ends (the server allows it once the last
      // question was shown).
      pacedEndedSection.current = activeSection.id;
      logAnswerChanges(answers);
      logSectionEntry("SECTION_ENDED", activeSection.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs with the section clock
  }, [now]);

  function recordPlay(questionId: string) {
    setLocalPlays((value) => ({
      ...value,
      [questionId]: Math.max(value[questionId] ?? 0, playsOf(questionId)) + 1,
    }));
    const log = attemptLog.current;
    if (!log || !session) return;
    attemptLog.current = appendAttemptLog(log, "AUDIO_PLAYED", { questionId });
    try {
      saveAttemptLog(session.user.id, attemptId, attemptLog.current);
    } catch {
      // The in-memory log is sent with the next operation.
    }
  }

  function audioFinished(questionId: string) {
    const endedAt = attemptLog.current
      ? correctedNow(attemptLog.current)
      : new Date();
    setPacedClock((clock) =>
      clock?.questionId === questionId
        ? { ...clock, audioEndedAt: clock.audioEndedAt ?? endedAt }
        : { questionId, shownAt: endedAt, audioEndedAt: endedAt },
    );
  }

  function startSection() {
    if (view?.mode !== "intro" || busy) return;
    logSectionEntry("SECTION_STARTED", view.sectionId);
  }

  function confirmFinishSection() {
    if (view?.mode !== "answering" || !activeSection) return;
    const sectionId = view.sectionId;
    Alert.alert(
      `Selesaikan ${activeSection.title}?`,
      `${sectionAnswered} dari ${sectionIndexes.length} soal di bagian ini dijawab. Bagian yang sudah selesai tidak bisa dibuka lagi.`,
      [
        { text: "Periksa lagi", style: "cancel" },
        {
          text: "Selesai bagian",
          onPress: () => {
            logAnswerChanges(answers);
            logSectionEntry("SECTION_ENDED", sectionId);
          },
        },
      ],
    );
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentIndex]);

  // Which question is on screen, for time per question in the staff analysis. It is sent with the
  // next progress or completion operation.
  const shownQuestionId = question?.id;
  useEffect(() => {
    const log = attemptLog.current;
    if (!shownQuestionId || !log || !session || expired || result) return;
    attemptLog.current = appendAttemptLog(log, "QUESTION_SHOWN", {
      questionId: shownQuestionId,
    });
    try {
      saveAttemptLog(session.user.id, attemptId, attemptLog.current);
    } catch {
      // Losing a view entry only affects the time statistics.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per shown question
  }, [shownQuestionId, logReady]);

  function chooseOption(optionId: string) {
    if (!question || busy || expired || result || answerLocked) return;
    setAnswers((current) => {
      const existing = current[question.id] ?? { optionIds: [] };
      const optionIds =
        question.type === "SINGLE_CHOICE"
          ? [optionId]
          : existing.optionIds.includes(optionId)
            ? existing.optionIds.filter((id) => id !== optionId)
            : [...existing.optionIds, optionId];
      return { ...current, [question.id]: { optionIds } };
    });
    setHasUnsavedAnswers(true);
  }

  async function save(nextIndex?: number) {
    if (busy || expired || result || operationPending.current) return false;
    if (storageKey) {
      try {
        persistAssessmentDraft(storageKey, answers);
        setDraftError(undefined);
      } catch {
        setDraftError(
          "Draf di perangkat tidak tersedia. Akan dicoba lagi selama kamu mengerjakan.",
        );
        return false;
      }
    }
    setHasUnsavedAnswers(false);
    if (nextIndex !== undefined) {
      // Answers are logged before the next question shows, so forward-only rules accept them.
      if (logAnswerChanges(answers)) {
        void queueAssessmentProgress({
          attemptId,
          entries: attemptLog.current?.entries ?? [],
          organizationId: activeOrganizationId ?? undefined,
        }).catch(() => undefined);
      }
      setCurrentIndex(nextIndex);
      const sectionId = assessment.data?.questions[nextIndex]?.sectionId;
      const position = sectionIndexes.indexOf(nextIndex);
      if (sectionId && position >= 0) {
        setReached((value) => ({
          ...value,
          [sectionId]: Math.max(value[sectionId] ?? -1, position),
        }));
      }
    }
    return true;
  }

  async function submit() {
    if (!assessment.data || result || operationPending.current) return;
    operationPending.current = true;
    setSubmitting(true);
    setSubmitError(undefined);
    const payload = buildAnswerPayload(assessment.data.questions, answers);
    try {
      let entries: AttemptLogEntry[] | undefined;
      if (attemptLog.current && session) {
        logAnswerChanges(answers);
        const log = attemptLog.current;
        // Submitting at the deadline (the timer ran out) counts as just before it.
        const now = correctedNow(log).getTime();
        const submittedAt =
          deadline === null ? now : Math.min(now, deadline - 1);
        const submittedLog = {
          ...log,
          // Compacted like every append, so the log stays within one write.
          entries: compactAttemptLog([
            ...log.entries,
            {
              seq: log.nextSeq,
              kind: "SUBMITTED" as const,
              clientAt: new Date(submittedAt).toISOString(),
            },
          ]),
          nextSeq: log.nextSeq + 1,
        };
        attemptLog.current = submittedLog;
        entries = submittedLog.entries;
        try {
          saveAttemptLog(session.user.id, attemptId, submittedLog);
        } catch {
          // The completion operation below carries the log anyway.
        }
      }
      const sync = await completeAssessment({
        attemptId,
        answers: payload,
        entries,
        organizationId: activeOrganizationId ?? undefined,
      });
      if (sync.state === "synced") {
        const operationId = `assessment:${attemptId}`;
        const failure = sync.result.failures.find(
          (entry) => entry.id === operationId,
        );
        if (
          failure ||
          !sync.result.acknowledgedOperationIds.includes(operationId)
        ) {
          setSubmitError(
            failure?.message ??
              "Tugas tersimpan di perangkat ini, tetapi ditolak oleh server.",
          );
          return;
        }
        const submitted = sync.result.results.find(
          (entry) => entry.id === operationId,
        )?.assessment;
        if (
          submitted &&
          (submitted.status === "GRADED" || submitted.status === "IN_REVIEW")
        ) {
          setSubmittedResult({
            status: submitted.status,
            score: submitted.score ?? 0,
            maxScore: submitted.maxScore ?? 0,
          });
        }
      } else {
        Alert.alert(
          "Tersimpan di perangkat ini",
          "Tugas kamu sudah masuk antrean dan akan terkirim saat sinkronisasi online berikutnya.",
        );
      }
      draftCompleted.current = true;
      if (storageKey) {
        try {
          Storage.removeItemSync(storageKey);
        } catch {
          /* Terminal server status prevents draft reuse. */
        }
      }
      // The completion operation in the outbox carries the whole log now.
      if (session) removeAttemptLog(session.user.id, attemptId);
      if (sync.state === "synced") {
        await Promise.all([
          utils.learning.invalidate(undefined, { refetchType: "none" }),
          utils.gamification.invalidate(undefined, { refetchType: "none" }),
          utils.assessmentEvent.invalidate(undefined, { refetchType: "none" }),
          utils.assessment.invalidate(undefined, { refetchType: "none" }),
        ]);
      }
      if (assessment.data.event) {
        router.replace({
          pathname: "/events/[eventId]",
          params: { eventId: assessment.data.event.id },
        });
      } else {
        router.replace({
          pathname: "/courses/[courseId]/items/[courseItemId]",
          params: { courseId, courseItemId },
        });
      }
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "Tugas tidak dapat disimpan di perangkat ini.",
      );
    } finally {
      operationPending.current = false;
      setSubmitting(false);
    }
  }

  const screenTitle = assessment.data?.title ?? "Tugas";
  const loading = assessment.isPending || attempt.isPending;
  const error = assessment.error ?? attempt.error;
  function confirmSubmit() {
    Alert.alert(
      "Kirim tugas?",
      expired
        ? "Waktu habis. Jawaban yang kamu isi sebelum waktu habis akan dinilai."
        : `${answeredCount} dari ${assessment.data?.questions.length ?? 0} soal dijawab. Jawaban yang dikirim tidak dapat diubah.`,
      [
        { text: "Periksa lagi", style: "cancel" },
        { text: "Kirim", onPress: () => void submit() },
      ],
    );
  }

  function leaveResult() {
    if (assessment.data?.event) {
      router.replace({
        pathname: "/events/[eventId]",
        params: { eventId: assessment.data.event.id },
      });
      return;
    }
    router.replace({
      pathname: "/courses/[courseId]",
      params: { courseId },
    });
  }

  const expireAttempt = useCallback(() => {
    if (deadline !== null) setExpiredDeadline(deadline);
  }, [deadline]);

  // Like the web, the attempt is submitted when the time runs out; offline it waits in the outbox
  // and its answers still count, since they were given before the deadline.
  useEffect(() => {
    if (
      !expired ||
      autoSubmitted.current ||
      result ||
      initialized.current !== attemptId ||
      attempt.data?.status !== "IN_PROGRESS"
    )
      return;
    autoSubmitted.current = true;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when the time runs out
  }, [expired, attempt.data?.status]);

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      {loading ? (
        <FullScreenState kind="loading" message="Memuat tugas…" />
      ) : error || !assessment.data || !attempt.data ? (
        <FullScreenState
          kind="error"
          message={
            error?.message ??
            "Tugas ini tidak tersedia atau kamu tidak lagi memiliki akses."
          }
          onBack={() => router.back()}
          title="Tugas tidak tersedia"
        />
      ) : result ? (
        <StudyScreen scrollViewRef={resultScrollRef} title={screenTitle}>
          <StudyGlass>
            <View className="self-center">
              <IconCircle size="lg">
                <SymbolIcon
                  name="checkmark"
                  size={24}
                  weight="bold"
                  tintColor={colors.primary}
                />
              </IconCircle>
            </View>
            <Text className="text-center text-2xl font-black text-foreground">
              {result.status === "IN_REVIEW"
                ? "Menunggu review"
                : "Tugas sudah direview"}
            </Text>
            {result.status === "GRADED" ? (
              <>
                <Text className="text-lg text-muted-foreground">
                  Skor: {formatScoreOutOf(result.score, result.maxScore)}
                </Text>
                <ScoreBandResults
                  bands={assessment.data?.scoreBands ?? []}
                  maxScore={result.maxScore}
                  score={result.score}
                />
                {assessment.data?.sectionResults.length ? (
                  <View className="gap-1.5 self-stretch">
                    {assessment.data.sections.map((section) => {
                      const sectionResult =
                        assessment.data?.sectionResults.find(
                          (entry) => entry.sectionId === section.id,
                        );
                      return sectionResult ? (
                        <View
                          key={section.id}
                          className="flex-row items-center justify-between gap-3"
                        >
                          <Text className="text-sm text-foreground">
                            {section.title}
                          </Text>
                          <Text className="text-sm tabular-nums text-foreground">
                            {formatScoreOutOf(
                              sectionResult.score,
                              sectionResult.maxScore,
                            )}
                          </Text>
                        </View>
                      ) : null;
                    })}
                  </View>
                ) : null}
              </>
            ) : (
              <Text className="text-center text-sm leading-5 text-muted-foreground">
                Hasil lengkap kamu akan muncul di sini setelah pengajar selesai
                mereviewnya.
              </Text>
            )}
          </StudyGlass>

          {/* Scores are withheld (null) for invalidated or cancelled participations. */}
          {result.status === "GRADED" &&
          assessment.data &&
          attempt.data &&
          attempt.data.score !== null ? (
            <TagResults
              answers={attempt.data.answers}
              questions={assessment.data.questions}
            />
          ) : null}

          <AssessmentResultReview
            assessment={assessment.data}
            attempt={attempt.data}
            resolveAssetUrl={resolveAssetUrl}
            onQuestionChange={() =>
              resultScrollRef.current?.scrollTo({ y: 0, animated: false })
            }
          />

          {assessment.data.event ? (
            <StudyAction onPress={leaveResult}>
              Lihat skor & leaderboard
            </StudyAction>
          ) : null}
        </StudyScreen>
      ) : view?.mode === "done" ? (
        <StudyScreen
          contentClassName="gap-4"
          scrollViewRef={scrollRef}
          title={screenTitle}
        >
          <StudyGlass>
            <Text className="text-xl font-black text-foreground">
              Semua bagian selesai
            </Text>
            <Text className="text-sm text-muted-foreground">
              {busy
                ? "Jawaban kamu sedang disimpan…"
                : "Jawaban kamu belum terkirim. Kirim lagi; tanpa internet tugas menunggu di ponsel."}
            </Text>
            {submitError ? (
              <Text
                accessibilityRole="alert"
                className="text-sm text-destructive"
              >
                {submitError}
              </Text>
            ) : null}
            <StudyAction
              loading={submitting}
              disabled={busy}
              onPress={() => void submit()}
            >
              Kirim tugas
            </StudyAction>
          </StudyGlass>
        </StudyScreen>
      ) : view?.mode === "intro" && activeSection ? (
        <StudyScreen
          contentClassName="gap-4"
          scrollViewRef={scrollRef}
          title={screenTitle}
        >
          <SectionIntro
            busy={busy}
            instructions={activeSection.instructions}
            onStart={startSection}
            position={view.index + 1}
            questionCount={sectionIndexes.length}
            resolveAssetUrl={resolveAssetUrl}
            secondsToAutoStart={introSecondsLeft}
            sectionCount={sections.length}
            timeLimitSeconds={activeSection.timeLimitSeconds}
            title={activeSection.title}
          />
        </StudyScreen>
      ) : question ? (
        <StudyScreen
          automaticallyAdjustKeyboardInsets
          contentClassName="gap-4"
          scrollViewRef={scrollRef}
          title={screenTitle}
        >
          {activeSection ? (
            <Text
              className={`text-sm font-bold ${sectionSecondsLeft !== null && sectionSecondsLeft < 60 ? "text-destructive" : "text-primary"}`}
            >
              {activeSection.title}
              {sectionSecondsLeft !== null
                ? ` · ${formatRemaining(sectionSecondsLeft)} tersisa`
                : ""}
            </Text>
          ) : deadline !== null ? (
            <AssessmentDeadline deadline={deadline} onExpire={expireAttempt} />
          ) : null}
          {media.progress &&
          (media.progress.failed.length > 0 ||
            media.progress.ready < media.progress.total) ? (
            <AssessmentMediaStatus
              progress={media.progress}
              onRetry={media.retry}
            />
          ) : null}
          <AssessmentQuestion
            current={currentIndex}
            total={assessment.data.questions.length}
            answered={answeredCount}
            onOpen={openQuestions}
            disabled={busy}
          >
            {group && groupRange ? (
              <QuestionGroupHeader
                first={groupRange.first}
                instructions={group.instructions}
                last={groupRange.last}
                renderers={audioPolicy ? hiddenAudioRenderers : undefined}
                resolveAssetUrl={resolveAssetUrl}
                stimulus={group.stimulus}
              />
            ) : null}
            <NativeContentRenderer
              content={question.prompt}
              renderers={audioPolicy ? hiddenAudioRenderers : undefined}
              resolveAssetUrl={resolveAssetUrl}
            />
          </AssessmentQuestion>
          {audioPolicy && audioSources.length ? (
            <AssessmentAudioPlayer
              key={question.id}
              disabled={busy || expired || sectionExpired}
              onFinished={() => audioFinished(question.id)}
              onPlayStarted={() => recordPlay(question.id)}
              playsUsed={playsOf(question.id)}
              policy={audioPolicy}
              resolveAssetUrl={resolveAssetUrl}
              sources={audioSources}
            />
          ) : null}
          {pacedEndsAt ? (
            <Text className="text-sm font-semibold tabular-nums text-muted-foreground">
              {isLastInSection ? "Bagian selesai" : "Soal berikutnya"} dalam{" "}
              {formatRemaining(
                Math.max(
                  0,
                  Math.ceil((pacedEndsAt.getTime() - now.getTime()) / 1000),
                ),
              )}
            </Text>
          ) : null}
          <Text className="text-sm font-bold text-foreground">
            {question.type === "WRITTEN"
              ? "Tulis jawaban kamu"
              : question.type === "MULTIPLE_CHOICE"
                ? "Pilih semua jawaban yang benar"
                : "Pilih satu jawaban"}
          </Text>
          {question.type === "WRITTEN" ? (
            <StudyGlass>
              <TextInput
                accessibilityLabel={`Jawaban soal ${currentIndex + 1}`}
                className="min-h-32 text-base text-foreground"
                multiline
                editable={!busy && !expired && !sectionExpired}
                onChangeText={(content) => {
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: { content, optionIds: [] },
                  }));
                  setHasUnsavedAnswers(true);
                }}
                placeholder="Tulis jawaban kamu…"
                textAlignVertical="top"
                value={answers[question.id]?.content ?? ""}
              />
            </StudyGlass>
          ) : (
            <AssessmentOptions grid={pictureGrid}>
              {question.options.map((option, optionIndex) => (
                <AssessmentOption
                  key={option.id}
                  index={optionIndex}
                  selected={
                    answers[question.id]?.optionIds.includes(option.id) ?? false
                  }
                  multiple={question.type === "MULTIPLE_CHOICE"}
                  disabled={busy || expired || sectionExpired || answerLocked}
                  tile={pictureGrid}
                  onPress={() => chooseOption(option.id)}
                >
                  <NativeContentRenderer
                    content={option.content}
                    renderers={audioPolicy ? hiddenAudioRenderers : undefined}
                    resolveAssetUrl={resolveAssetUrl}
                  />
                </AssessmentOption>
              ))}
            </AssessmentOptions>
          )}
          <Text className="text-xs leading-5 text-muted-foreground">
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
            Draf tersimpan di perangkat ini selama kamu mengerjakan.
            {deadline !== null || sectionSecondsLeft !== null
              ? " Timer tetap berjalan meski kamu keluar."
              : ""}
          </Text>
          {draftError ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {draftError}
            </Text>
          ) : null}
          {submitError ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {submitError}
            </Text>
          ) : null}
          <View className="gap-3 border-t border-border pt-4">
            <View className="flex-row gap-3">
              {positionInSection > 0 && !forwardOnly ? (
                <View className="flex-1">
                  <StudyAction
                    secondary
                    disabled={busy}
                    onPress={() => {
                      const previous = sectionIndexes[positionInSection - 1]!;
                      if (expired) setCurrentIndex(previous);
                      else void save(previous);
                    }}
                  >
                    Sebelumnya
                  </StudyAction>
                </View>
              ) : null}
              {!paced &&
              (!isLastInSection ||
                (nextUnanswered >= 0 && nextUnanswered !== currentIndex)) ? (
                <View className="flex-1">
                  <StudyAction
                    disabled={busy}
                    onPress={() => {
                      const next = isLastInSection
                        ? nextUnanswered
                        : sectionIndexes[positionInSection + 1]!;
                      if (expired) setCurrentIndex(next);
                      else void save(next);
                    }}
                    trailingIcon="arrow.right"
                  >
                    {!isLastInSection
                      ? "Berikutnya"
                      : "Soal belum dijawab berikutnya"}
                  </StudyAction>
                </View>
              ) : null}
            </View>
            {!expired ? (
              <Text className="text-center text-xs text-muted-foreground">
                {hasUnsavedAnswers
                  ? "Menyimpan draf di perangkat ini…"
                  : "Draf tersimpan di perangkat ini"}
              </Text>
            ) : null}
            {!isLastSection && activeSection ? (
              canFinishSection(activeSection) &&
              (isLastInSection || sectionAnswered === sectionIndexes.length) ? (
                <StudyAction disabled={busy} onPress={confirmFinishSection}>
                  Selesai bagian ini
                </StudyAction>
              ) : null
            ) : activeSection &&
              !canFinishSection(activeSection) ? null : expired ||
              currentIndex === assessment.data.questions.length - 1 ||
              answeredCount === assessment.data.questions.length ? (
              <StudyAction
                loading={submitting}
                disabled={busy}
                onPress={confirmSubmit}
              >
                {busy
                  ? "Menyimpan…"
                  : answeredCount === assessment.data.questions.length
                    ? "Kirim tugas"
                    : `Kirim · ${answeredCount}/${assessment.data.questions.length} dijawab`}
              </StudyAction>
            ) : null}
          </View>
        </StudyScreen>
      ) : (
        <FullScreenState
          kind="empty"
          message="Tugas ini belum memiliki soal."
        />
      )}
    </>
  );
}
