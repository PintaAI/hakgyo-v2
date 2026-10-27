import type { MockBackend } from "~/components/user-doc-previews/mock-trpc";
import type { RouterInputs, RouterOutputs } from "~/trpc/react";

type EventOutputs = RouterOutputs["assessmentEvent"];
type EventSummary = EventOutputs["listManageable"]["items"][number];
type TargetCohorts = EventOutputs["listTargetCohorts"];
type AssessmentItems = EventOutputs["listAssessmentItems"];
type Manageable = EventOutputs["getManageable"];
type ItemAnalysis = EventOutputs["itemAnalysis"];

export const previewCourseId = "contoh-kurikulum";

const hour = 60 * 60_000;
const day = 24 * hour;

function at(offset: number) {
  return new Date(Date.now() + offset);
}

const course = { id: previewCourseId, title: "Bahasa Korea Dasar 1" };

const assessmentItems: AssessmentItems = [
  {
    id: "item-kuis-bab-1",
    module: { id: "bab-1", title: "Bab 1 · Hangeul", position: 0 },
    assessment: {
      id: "tugas-hangeul",
      title: "Kuis Hangeul",
      description: "Membaca huruf vokal dan konsonan dasar.",
      timeLimitMinutes: 20,
      shuffleQuestions: false,
      updatedAt: at(-10 * day),
      _count: { questions: 15 },
    },
  },
  {
    id: "item-kuis-bab-2",
    module: { id: "bab-2", title: "Bab 2 · Perkenalan", position: 1 },
    assessment: {
      id: "tugas-perkenalan",
      title: "Kuis Perkenalan Diri",
      description: "Memperkenalkan diri dan bertanya nama.",
      timeLimitMinutes: 30,
      shuffleQuestions: false,
      updatedAt: at(-6 * day),
      _count: { questions: 20 },
    },
  },
  {
    id: "item-ujian-tengah",
    module: { id: "bab-3", title: "Bab 3 · Ujian tengah", position: 2 },
    assessment: {
      id: "tugas-ujian-tengah",
      title: "Ujian Tengah Semester",
      description: "Mencakup Bab 1 dan Bab 2.",
      timeLimitMinutes: 60,
      shuffleQuestions: true,
      updatedAt: at(-3 * day),
      _count: { questions: 40 },
    },
  },
];

const targetCohorts: TargetCohorts = {
  canTargetAll: true,
  cohorts: [
    {
      id: "kelas-pagi",
      name: "Kelas Pagi Oktober",
      status: "IN_PROGRESS",
      selfPaced: false,
      learnerCount: 18,
      averageProgress: 64,
      canTarget: true,
    },
    {
      id: "kelas-malam",
      name: "Kelas Malam Oktober",
      status: "IN_PROGRESS",
      selfPaced: false,
      learnerCount: 12,
      averageProgress: 51,
      canTarget: true,
    },
    {
      id: "belajar-mandiri",
      name: "Belajar mandiri",
      status: "OPEN",
      selfPaced: true,
      learnerCount: 7,
      averageProgress: 33,
      canTarget: true,
    },
  ],
};

function assessmentFor(itemId: string) {
  const item = assessmentItems.find((entry) => entry.id === itemId);
  const assessment = item?.assessment;
  return {
    id: itemId,
    assessment: assessment
      ? {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          passingScore: 70,
          maxAttempts: 1,
          _count: { questions: assessment._count.questions },
        }
      : null,
  };
}

function targetsFor(cohortIds: string[]) {
  return targetCohorts.cohorts
    .filter((cohort) => cohortIds.includes(cohort.id))
    .map((cohort) => ({
      id: cohort.id,
      name: cohort.name,
      selfPaced: cohort.selfPaced,
    }));
}

function makeEvent(
  event: Pick<
    EventSummary,
    "id" | "title" | "type" | "status" | "durationMinutes"
  > & {
    itemId: string;
    cohortIds: string[];
    opensAt?: Date | null;
    closesAt?: Date | null;
    participants?: number;
    attempts?: number;
  },
): EventSummary {
  const openedAt =
    event.status === "OPEN" || event.status === "CLOSED"
      ? (event.opensAt ?? at(-day))
      : null;
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    status: event.status,
    allCohorts: false,
    durationMinutes: event.durationMinutes,
    opensAt: event.opensAt ?? null,
    openedAt,
    closesAt: event.closesAt ?? null,
    closedAt: event.status === "CLOSED" ? (event.closesAt ?? at(-day)) : null,
    cancelledAt: event.status === "CANCELLED" ? at(-hour) : null,
    createdAt: at(-14 * day),
    course,
    courseItem: assessmentFor(event.itemId),
    _count: {
      participants: event.participants ?? 0,
      attempts: event.attempts ?? 0,
    },
    targets: targetsFor(event.cohortIds),
    canManage: true,
    canReview: true,
  };
}

type State = { events: EventSummary[]; nextId: number };

function createState(): State {
  return {
    nextId: 1,
    events: [
      makeEvent({
        id: "latihan-perkenalan",
        title: "Latihan Kuis Perkenalan Diri",
        type: "QUICK_ASSESSMENT",
        status: "OPEN",
        durationMinutes: 30,
        itemId: "item-kuis-bab-2",
        cohortIds: ["kelas-pagi", "kelas-malam"],
        opensAt: at(-2 * hour),
        closesAt: at(2 * day),
        participants: 30,
        attempts: 21,
      }),
      makeEvent({
        id: "tryout-tengah",
        title: "Tryout Ujian Tengah Semester",
        type: "TRYOUT",
        status: "SCHEDULED",
        durationMinutes: 60,
        itemId: "item-ujian-tengah",
        cohortIds: ["kelas-pagi", "kelas-malam"],
        opensAt: at(3 * day),
        closesAt: at(3 * day + 3 * hour),
        participants: 0,
      }),
      makeEvent({
        id: "latihan-hangeul",
        title: "Latihan Kuis Hangeul",
        type: "QUICK_ASSESSMENT",
        status: "CLOSED",
        durationMinutes: 20,
        itemId: "item-kuis-bab-1",
        cohortIds: ["kelas-pagi"],
        opensAt: at(-9 * day),
        closesAt: at(-8 * day),
        participants: 18,
        attempts: 17,
      }),
    ],
  };
}

const participants = [
  ["Ayu Lestari", 92, "GRADED"],
  ["Budi Santoso", 85, "GRADED"],
  ["Citra Dewi", 78, "GRADED"],
  ["Dimas Pratama", 64, "IN_REVIEW"],
  ["Eka Putri", null, "IN_PROGRESS"],
  ["Fajar Nugraha", null, "NOT_STARTED"],
] as const;

function manageable(
  state: State,
  input: RouterInputs["assessmentEvent"]["getManageable"],
): Manageable {
  const event = findEvent(state, input.eventId);
  const maxScore = 100;
  const participantResults = participants.map(
    ([name, score, status], index) => {
      const userId = `murid-${index + 1}`;
      const cohort = event.targets[index % event.targets.length] ?? {
        id: "kelas-pagi",
        name: "Kelas Pagi Oktober",
      };
      return {
        userId,
        invalidatedAt: null,
        invalidationReason: null,
        cohort: { id: cohort.id, name: cohort.name },
        user: { name, email: `${userId}@contoh.id` },
        attempt:
          status === "NOT_STARTED"
            ? null
            : {
                id: `pengerjaan-${index + 1}`,
                userId,
                attemptNumber: 1,
                status,
                score: score ?? null,
                maxScore,
                startedAt: at(-90 * 60_000),
                submittedAt: status === "IN_PROGRESS" ? null : at(-60 * 60_000),
                submittedVia:
                  status === "IN_PROGRESS" ? null : ("LEARNER" as const),
                // The fourth learner worked offline, to show the badge.
                offlineSyncedAt: index === 3 ? at(-50 * 60_000) : null,
              },
      };
    },
  );
  const { targets, canManage, ...summary } = event;

  return {
    ...summary,
    audits: [],
    targets,
    canManage,
    reviewCohortIds: null,
    participants: participantResults.map(
      ({ attempt: _attempt, ...participant }) => participant,
    ),
    leaderboard: participantResults.flatMap((participant, index) =>
      participant.attempt?.status === "GRADED" &&
      participant.attempt.score !== null
        ? [
            {
              rank: index + 1,
              attemptId: participant.attempt.id,
              userId: participant.userId,
              name: participant.user.name,
              score: participant.attempt.score,
              maxScore,
              percentage: participant.attempt.score,
              completionTimeMs: (24 + index * 3) * 60_000,
              submittedAt: at(-60 * 60_000),
            },
          ]
        : [],
    ),
    participantTotal: participantResults.length,
    pageCount: 1,
    counts: { notStarted: 1, inProgress: 1, inReview: 1, graded: 3 },
    participantResults,
  };
}

function findEvent(state: State, eventId: string) {
  const event = state.events.find((entry) => entry.id === eventId);
  if (!event) throw new Error("Latihan atau tryout tidak ditemukan");
  return event;
}

/** Original sample questions (not HRDK items) with EPS-TOPIK tags. */
const itemAnalysis: ItemAnalysis = {
  attemptCount: 24,
  questions: [
    {
      id: "soal-1",
      number: 1,
      type: "SINGLE_CHOICE",
      prompt: "다음 그림을 보고 맞는 단어를 고르십시오.",
      points: 2.5,
      tags: ["eps:R1", "topik:benda", "level:mudah"],
      correctRate: 0.958,
      discrimination: 0.125,
      unansweredRate: 0,
      averageTimeMs: 9000,
      flags: ["too-easy", "low-discrimination"],
      options: [
        { id: "s1-a", text: "가위", isCorrect: true, rate: 0.958, weak: false },
        { id: "s1-b", text: "안경", isCorrect: false, rate: 0.042, weak: true },
        { id: "s1-c", text: "가방", isCorrect: false, rate: 0, weak: true },
        { id: "s1-d", text: "의자", isCorrect: false, rate: 0, weak: true },
      ],
    },
    {
      id: "soal-2",
      number: 2,
      type: "SINGLE_CHOICE",
      prompt: "기계를 청소할 때는 먼저 전원을 ______ 장갑을 끼십시오.",
      points: 2.5,
      tags: ["eps:R8", "topik:k3", "level:sedang"],
      correctRate: 0.583,
      discrimination: 0.571,
      unansweredRate: 0.042,
      averageTimeMs: 41000,
      flags: [],
      options: [
        { id: "s2-a", text: "끄고", isCorrect: true, rate: 0.583, weak: false },
        {
          id: "s2-b",
          text: "끄면",
          isCorrect: false,
          rate: 0.208,
          weak: false,
        },
        {
          id: "s2-c",
          text: "끄려고",
          isCorrect: false,
          rate: 0.125,
          weak: false,
        },
        {
          id: "s2-d",
          text: "끄느라고",
          isCorrect: false,
          rate: 0.042,
          weak: true,
        },
      ],
    },
  ],
  tags: [
    {
      group: "eps",
      label: "Tipe soal",
      rows: [
        {
          tag: "eps:R1",
          label: "R1 · Gambar ke kata atau kalimat",
          correct: 23,
          total: 24,
          rate: 0.96,
        },
        {
          tag: "eps:R8",
          label: "R8 · Kalimat rumpang",
          correct: 14,
          total: 24,
          rate: 0.58,
        },
      ],
    },
    {
      group: "topik",
      label: "Topik",
      rows: [
        {
          tag: "topik:benda",
          label: "Benda sehari-hari",
          correct: 23,
          total: 24,
          rate: 0.96,
        },
        {
          tag: "topik:k3",
          label: "K3 (keselamatan kerja)",
          correct: 14,
          total: 24,
          rate: 0.58,
        },
      ],
    },
  ],
  learners: [],
};

export const latihanTryoutBackend: MockBackend<State> = {
  createState,
  queries: {
    "assessmentEvent.listManageable": (state) => ({
      items: state.events,
      total: state.events.length,
      pageCount: 1,
    }),
    "assessmentEvent.listTargetCohorts": () => targetCohorts,
    "assessmentEvent.listAssessmentItems": () => assessmentItems,
    "assessmentEvent.getManageable": manageable,
    "assessmentEvent.itemAnalysis": () => itemAnalysis,
  },
  mutations: {
    "assessmentEvent.create": (
      state,
      input: RouterInputs["assessmentEvent"]["create"],
    ) => {
      const id = `baru-${state.nextId++}`;
      const cohortIds = input.target.allCohorts
        ? targetCohorts.cohorts.map((cohort) => cohort.id)
        : input.target.cohortIds;
      const status =
        input.start.mode === "now"
          ? "OPEN"
          : input.start.mode === "schedule"
            ? "SCHEDULED"
            : "DRAFT";
      const event = makeEvent({
        id,
        title: input.title,
        type: input.type,
        status,
        durationMinutes: input.durationMinutes,
        itemId: input.courseItemId,
        cohortIds,
        opensAt:
          input.start.mode === "schedule"
            ? new Date(input.start.opensAt as Date | string)
            : at(0),
        closesAt: new Date(input.closesAt as Date | string),
        participants:
          status === "OPEN"
            ? targetCohorts.cohorts
                .filter((cohort) => cohortIds.includes(cohort.id))
                .reduce((total, cohort) => total + cohort.learnerCount, 0)
            : 0,
      });
      event.allCohorts = input.target.allCohorts;
      event.createdAt = at(0);
      state.events.unshift(event);
      return { ...event, participantCount: event._count.participants };
    },
    "assessmentEvent.open": (state, input: { eventId: string }) => {
      const event = findEvent(state, input.eventId);
      event.status = "OPEN";
      event.openedAt = at(0);
      event._count.participants = 30;
      return event;
    },
    "assessmentEvent.close": (state, input: { eventId: string }) => {
      const event = findEvent(state, input.eventId);
      event.status = "CLOSED";
      event.closedAt = at(0);
      return event;
    },
    "assessmentEvent.cancel": (state, input: { eventId: string }) => {
      const event = findEvent(state, input.eventId);
      event.status = "CANCELLED";
      event.cancelledAt = at(0);
      return event;
    },
    "assessmentEvent.delete": (state, input: { eventId: string }) => {
      state.events = state.events.filter((entry) => entry.id !== input.eventId);
      return { id: input.eventId };
    },
    "assessmentEvent.addCohorts": (
      state,
      input: { eventId: string; cohortIds: string[] },
    ) => {
      const event = findEvent(state, input.eventId);
      const ids = [
        ...new Set([
          ...event.targets.map((target) => target.id),
          ...input.cohortIds,
        ]),
      ];
      event.targets = targetsFor(ids);
      return event;
    },
  },
};
