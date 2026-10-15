import type { MockBackend } from "~/components/user-doc-previews/mock-trpc";
import type { RouterInputs, RouterOutputs } from "~/trpc/react";

type AssessmentOutputs = RouterOutputs["assessment"];
type AttemptList = AssessmentOutputs["listAttempts"];
type Attempt = AttemptList["items"][number];
type ReviewAttempt = AssessmentOutputs["getReviewAttempt"];

export const previewOrganizationId = "contoh-organisasi";

const minute = 60_000;

function at(offset: number) {
  return new Date(Date.now() + offset);
}

const course = { id: "contoh-kurikulum", title: "Bahasa Korea Dasar 1" };
const kelasPagi = { id: "kelas-pagi", name: "Kelas Pagi Oktober" };
const kelasMalam = { id: "kelas-malam", name: "Kelas Malam Oktober" };

const assessment = {
  id: "tugas-perkenalan",
  title: "Menulis Perkenalan Diri",
  passingScore: 70,
};

const questions: ReviewAttempt["questions"] = [
  {
    id: "soal-1",
    prompt: { text: "Pilih salam yang tepat untuk bertemu orang baru." },
    explanation: { text: "처음 뵙겠습니다 dipakai saat pertama kali bertemu." },
    type: "SINGLE_CHOICE",
    points: 20,
    options: [
      { id: "soal-1-a", content: { text: "처음 뵙겠습니다" }, isCorrect: true },
      { id: "soal-1-b", content: { text: "잘 자요" }, isCorrect: false },
      { id: "soal-1-c", content: { text: "맛있게 드세요" }, isCorrect: false },
    ],
  },
  {
    id: "soal-2",
    prompt: {
      text: "Tulis 2–3 kalimat perkenalan diri dalam bahasa Korea: nama, asal, dan pekerjaan.",
    },
    explanation: null,
    type: "WRITTEN",
    points: 40,
    options: [],
  },
  {
    id: "soal-3",
    prompt: {
      text: 'Terjemahkan ke bahasa Korea: "Senang bertemu dengan Anda."',
    },
    explanation: null,
    type: "WRITTEN",
    points: 40,
    options: [],
  },
];

type Student = {
  attemptId: string;
  userId: string;
  name: string;
  cohort: { id: string; name: string };
  submittedMinutesAgo: number;
  answers: [string, string];
};

const students: Student[] = [
  {
    attemptId: "pengerjaan-dimas",
    userId: "murid-dimas",
    name: "Dimas Pratama",
    cohort: kelasPagi,
    submittedMinutesAgo: 95,
    answers: [
      "안녕하세요. 저는 디마스입니다. 인도네시아 사람이에요. 저는 학생입니다.",
      "만나서 반갑습니다.",
    ],
  },
  {
    attemptId: "pengerjaan-sari",
    userId: "murid-sari",
    name: "Sari Wulandari",
    cohort: kelasMalam,
    submittedMinutesAgo: 40,
    answers: [
      "안녕하세요. 제 이름은 사리예요. 자카르타에서 왔어요. 회사원이에요.",
      "만나서 반가워요.",
    ],
  },
];

function context(cohort: { id: string; name: string }) {
  return {
    kind: "CHAPTER" as const,
    label: "Tugas bab",
    title: assessment.title,
    course,
    moduleTitle: "Bab 2 · Perkenalan",
    cohort,
    scope: "CHAPTER" as const,
    eventId: null,
  };
}

type State = {
  /** Scores and feedback per written answer, by attempt id. */
  graded: Record<string, { scores: number[]; feedback: string[] }>;
};

function summary(state: State, student: Student): Attempt {
  const review = state.graded[student.attemptId];
  const score = review
    ? 20 + review.scores.reduce((total, value) => total + value, 0)
    : null;
  return {
    id: student.attemptId,
    userId: student.userId,
    courseItemId: "item-tugas-perkenalan",
    attemptNumber: 1,
    status: review ? "GRADED" : "IN_REVIEW",
    score,
    maxScore: review ? 100 : null,
    startedAt: at(-(student.submittedMinutesAgo + 25) * minute),
    submittedAt: at(-student.submittedMinutesAgo * minute),
    gradedAt: review ? at(0) : null,
    user: {
      id: student.userId,
      name: student.name,
      email: `${student.userId}@contoh.id`,
    },
    assessment,
    courseItem: {
      module: {
        id: "bab-2",
        title: "Bab 2 · Perkenalan",
        courseId: course.id,
        course,
      },
    },
    cohort: student.cohort,
    assessmentEvent: null,
    _count: { answers: 2 },
    context: context(student.cohort),
    invalidated: false,
    grading: "TEACHER",
    passed: score === null ? null : score >= assessment.passingScore,
  };
}

function findStudent(attemptId: string) {
  const student = students.find((entry) => entry.attemptId === attemptId);
  if (!student) throw new Error("Pengerjaan tidak ditemukan");
  return student;
}

function reviewAttempt(state: State, attemptId: string): ReviewAttempt {
  const student = findStudent(attemptId);
  const review = state.graded[attemptId];
  return {
    ...summary(state, student),
    answers: questions.map((question, index) => {
      const written = question.type === "WRITTEN";
      const writtenIndex = index - 1;
      return {
        id: `${attemptId}-jawaban-${index + 1}`,
        questionId: question.id,
        content: written ? { text: student.answers[writtenIndex] ?? "" } : null,
        autoScore: written ? null : question.points,
        manualScore:
          written && review ? (review.scores[writtenIndex] ?? 0) : null,
        feedback:
          written && review?.feedback[writtenIndex]
            ? { text: review.feedback[writtenIndex] }
            : null,
        reviewedAt: written && review ? at(0) : null,
        reviewedBy: written && review ? { user: { name: "Anda" } } : null,
        selectedOptions: written ? [] : [{ optionId: "soal-1-a" }],
        question: {
          id: question.id,
          points: question.points,
          type: question.type,
        },
      };
    }),
    questions,
  };
}

export const reviewPenilaianBackend: MockBackend<State> = {
  createState: () => ({ graded: {} }),
  queries: {
    "assessment.getRegisterFilters": () => ({
      courses: [course],
      cohorts: [
        { ...kelasPagi, courseId: course.id },
        { ...kelasMalam, courseId: course.id },
      ],
    }),
    "assessment.listAttempts": (
      state,
      input: RouterInputs["assessment"]["listAttempts"],
    ): AttemptList => {
      const all = students.map((student) => summary(state, student));
      const items = all.filter(
        (attempt) =>
          (!input.status || attempt.status === input.status) &&
          (!input.cohortId || attempt.cohort?.id === input.cohortId) &&
          (!input.search ||
            attempt.user.name
              .toLowerCase()
              .includes(input.search.toLowerCase())),
      );
      return {
        items,
        total: items.length,
        page: 1,
        pageCount: 1,
        counts: {
          IN_REVIEW: all.filter((attempt) => attempt.status === "IN_REVIEW")
            .length,
          GRADED: all.filter((attempt) => attempt.status === "GRADED").length,
          IN_PROGRESS: 0,
        },
      };
    },
    "assessment.getReviewAttempt": (state, input: { attemptId: string }) =>
      reviewAttempt(state, input.attemptId),
  },
  mutations: {
    "assessment.reviewAttempt": (
      state,
      input: RouterInputs["assessment"]["reviewAttempt"],
    ) => {
      state.graded[input.attemptId] = {
        scores: input.answers.map((answer) => answer.score),
        feedback: input.answers.map((answer) =>
          typeof answer.feedback === "string" ? answer.feedback : "",
        ),
      };
      return summary(state, findStudent(input.attemptId));
    },
  },
};
