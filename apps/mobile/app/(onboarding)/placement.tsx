import {
  answerPlacement,
  createPlacementQuestion,
  PLACEMENT_HANGEUL_STAGE,
  PLACEMENT_STAGES,
  placementXp,
  startPlacement,
  type PlacementGoal,
  type PlacementQuestion,
  type PlacementReading,
  type PlacementStage,
  type PlacementState,
} from "@hakgyo/shared/placement";
import { levelForXp } from "@hakgyo/shared/xp-level";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfettiBurst } from "../../src/components/learn/confetti";
import { Action, HeroHeader } from "../../src/components/learning-ui";
import { SymbolIcon } from "../../src/components/ui/symbol-icon";
import type { SymbolName } from "../../src/components/ui/symbol-names";
import {
  hapticError,
  hapticSelection,
  hapticSuccess,
} from "../../src/lib/haptics";
import {
  savePlacementGoal,
  savePlacementStage,
} from "../../src/lib/placement-result";
import { useAppTheme } from "../../src/providers/AppThemeProvider";

/** How long the right and wrong colours stay before the next question. */
const FEEDBACK_MS = 700;

const GOALS: {
  value: PlacementGoal;
  title: string;
  detail: string;
  symbol: SymbolName;
}[] = [
  {
    value: "beginner",
    title: "Baru mulai belajar",
    detail: "Iseng atau penasaran sama bahasa Korea",
    symbol: "sparkles",
  },
  {
    value: "eps",
    title: "Persiapan ujian EPS-TOPIK",
    detail: "Mau kerja di Korea lewat program G to G",
    symbol: "doc.text.fill",
  },
  {
    value: "work",
    title: "Sudah kerja di Korea",
    detail: "Biar lancar ngobrol di tempat kerja",
    symbol: "person.3.fill",
  },
  {
    value: "other",
    title: "Lainnya",
    detail: "Kuliah, TOPIK, K-pop, atau drama",
    symbol: "ellipsis",
  },
];

const READINGS: {
  value: PlacementReading;
  title: string;
  detail: string;
}[] = [
  {
    value: "none",
    title: "Belum bisa",
    detail: "Mulai dari huruf pertama, tanpa tes",
  },
  {
    value: "slow",
    title: "Bisa, tapi masih pelan",
    detail: "Tes mulai dari Hangeul dasar",
  },
  {
    value: "fluent",
    title: "Lancar",
    detail: "Tes mulai dari kosakata, yang gampang dilewati",
  },
];

const RESULT_ICON_SIZE = 56;
/** The confetti box around the result icon. */
const RESULT_BURST_HEIGHT = 320;

/** The test's longest run: four stages of at most three questions. */
const MAX_QUESTIONS = 12;

type Step =
  | { kind: "goal" }
  | { kind: "reading"; goal: PlacementGoal }
  | {
      kind: "test";
      goal: PlacementGoal;
      state: PlacementState;
      question: PlacementQuestion;
      asked: ReadonlySet<string>;
    }
  | { kind: "result"; goal: PlacementGoal; stage: PlacementStage | null };

function close() {
  if (router.canGoBack()) router.back();
  else router.replace("/(onboarding)/start");
}

function nextQuestion(
  state: PlacementState,
  goal: PlacementGoal,
  asked: ReadonlySet<string>,
) {
  const question = createPlacementQuestion(state.stage!, { goal, asked });
  return { question, asked: new Set([...asked, question.id]) };
}

function OptionRow({
  title,
  detail,
  symbol,
  onPress,
}: {
  title: string;
  detail: string;
  symbol?: SymbolName;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityHint={detail}
      accessibilityRole="button"
      className="min-h-16 flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 active:opacity-70"
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={{ borderCurve: "continuous" }}
    >
      {symbol ? (
        <SymbolIcon name={symbol} size={20} tintColor={colors.primary} />
      ) : null}
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground">{detail}</Text>
      </View>
      <SymbolIcon
        name="chevron.right"
        size={13}
        tintColor={colors.mutedForeground}
        weight="semibold"
      />
    </Pressable>
  );
}

function Choice({
  choice,
  question,
  picked,
  onPress,
}: {
  choice: string;
  question: PlacementQuestion;
  picked: string | null;
  onPress: () => void;
}) {
  const isAnswer = choice === question.answer;
  const state =
    picked === null
      ? "idle"
      : isAnswer
        ? "right"
        : choice === picked
          ? "wrong"
          : "dimmed";
  const large = question.stage <= 2 && question.promptStyle === "word";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: picked !== null }}
      className={`min-h-16 items-center justify-center rounded-2xl border px-4 py-3 active:opacity-70 ${
        state === "right"
          ? "border-primary bg-primary"
          : state === "wrong"
            ? "border-destructive bg-destructive"
            : "border-border bg-background"
      } ${state === "dimmed" ? "opacity-40" : ""}`}
      disabled={picked !== null}
      onPress={onPress}
      style={{ borderCurve: "continuous" }}
    >
      <Text
        className={`text-center font-bold ${large ? "text-3xl" : "text-lg"} ${
          state === "right"
            ? "text-primary-foreground"
            : state === "wrong"
              ? "text-destructive-foreground"
              : "text-foreground"
        }`}
      >
        {choice}
      </Text>
    </Pressable>
  );
}

/** The four stages as a ladder, the current one marked. */
function StageLadder({ state }: { state: PlacementState }) {
  return (
    <View className="flex-row gap-1.5">
      {PLACEMENT_STAGES.map(({ stage }) => (
        <View
          className={`h-1.5 flex-1 rounded-full ${
            stage <= state.passed
              ? "bg-primary"
              : stage === state.stage
                ? "bg-primary/40"
                : "bg-muted"
          }`}
          key={stage}
        />
      ))}
    </View>
  );
}

function TestStep({
  step,
  onAnswer,
}: {
  step: Extract<Step, { kind: "test" }>;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const { question, state } = step;
  const stageTitle = PLACEMENT_STAGES[question.stage - 1].title;

  useEffect(() => {
    if (picked === null) return;
    const timer = setTimeout(
      () => onAnswer(picked === question.answer),
      FEEDBACK_MS,
    );
    return () => clearTimeout(timer);
  }, [picked, question.answer, onAnswer]);

  return (
    <ScrollView
      contentContainerClassName="flex-grow justify-center gap-8 px-5 py-6"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-2">
        <StageLadder state={state} />
        <Text className="text-xs font-bold uppercase tracking-[1.5px] text-muted-foreground">
          Tahap {question.stage} · {stageTitle}
        </Text>
      </View>
      <View className="items-center gap-3">
        <Text className="text-center text-base font-semibold text-muted-foreground">
          {question.instruction}
        </Text>
        <Text
          className={`text-center font-bold text-foreground ${
            question.promptStyle === "glyph"
              ? "text-6xl leading-[72px]"
              : question.promptStyle === "word"
                ? "text-4xl tracking-tight"
                : "text-xl leading-8"
          }`}
        >
          {question.prompt}
        </Text>
      </View>
      <View className="gap-2.5">
        {question.choices.map((choice) => (
          <Choice
            choice={choice}
            key={choice}
            onPress={() => {
              if (choice === question.answer) hapticSuccess();
              else hapticError();
              setPicked(choice);
            }}
            picked={picked}
            question={question}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function ResultStep({
  goal,
  stage,
  onRetry,
}: {
  goal: PlacementGoal;
  /** Null when the learner said they cannot read yet. */
  stage: PlacementStage | null;
  onRetry: () => void;
}) {
  const { colors } = useAppTheme();
  const xp = placementXp(stage ?? 0);
  const level = levelForXp(xp).level;
  const readsHangeul = (stage ?? 0) >= PLACEMENT_HANGEUL_STAGE;
  const title =
    stage === null
      ? "Kita mulai dari huruf pertama"
      : stage === 0
        ? "Belum lolos tahap pertama"
        : `Lolos sampai tahap ${stage}`;
  const notes = [
    stage === null || !readsHangeul
      ? "Hangeul Mastery mengajarimu membaca dari dasar, pelan-pelan."
      : "Hangeul Mastery dilewati: lencananya jadi milikmu, dan kamu langsung masuk kelas Korea → Indonesia dan Indonesia → Korea.",
    goal === "eps"
      ? "Belajar di LPK? Minta link undangan kelas ke gurumu, biar latihan dan pemantapan dari LPK masuk ke sini."
      : null,
    xp > 0
      ? "XP dan lencananya masuk ke akunmu setelah daftar atau masuk."
      : null,
  ].filter((note): note is string => note !== null);
  const passedAny = (stage ?? 0) > 0;
  const { width } = useWindowDimensions();

  // A passed stage is celebrated once, as the result comes in.
  useEffect(() => {
    if (passedAny) hapticSuccess();
  }, [passedAny]);

  return (
    <>
      <ScrollView
        contentContainerClassName="flex-grow justify-center gap-6 px-5 py-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-4">
          {/* The burst is centred on the icon and may spill past it. */}
          <View style={{ width: RESULT_ICON_SIZE, height: RESULT_ICON_SIZE }}>
            <SymbolIcon
              name={readsHangeul ? "checkmark.seal.fill" : "sparkles"}
              size={RESULT_ICON_SIZE}
              tintColor={colors.primary}
            />
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: (RESULT_ICON_SIZE - width) / 2,
                top: (RESULT_ICON_SIZE - RESULT_BURST_HEIGHT) / 2,
                width,
                height: RESULT_BURST_HEIGHT,
              }}
            >
              <ConfettiBurst
                colors={[
                  colors.primary,
                  "#F2C14E",
                  "#F472B6",
                  "#34D399",
                  "#60A5FA",
                ]}
                fire={passedAny}
                height={RESULT_BURST_HEIGHT}
                spread={1.8}
                width={width}
              />
            </View>
          </View>
          <Text
            accessibilityRole="header"
            className="text-center text-2xl font-black tracking-tight text-foreground"
          >
            {title}
          </Text>
          {stage ? (
            <View className="flex-row items-center gap-2">
              <View className="rounded-full bg-primary px-3 py-1">
                <Text className="text-sm font-black text-primary-foreground">
                  Lv {level}
                </Text>
              </View>
              <Text className="text-base font-bold text-foreground">
                +{xp.toLocaleString("id-ID")} XP
              </Text>
            </View>
          ) : null}
        </View>
        {stage !== null ? (
          <View className="border-t border-border">
            {PLACEMENT_STAGES.map((row) => {
              const passed = row.stage <= stage;
              return (
                <View
                  className="flex-row items-center gap-3 border-b border-border py-3"
                  key={row.stage}
                >
                  <SymbolIcon
                    name={passed ? "checkmark.circle.fill" : "circle"}
                    size={18}
                    tintColor={passed ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    className={`flex-1 text-sm font-semibold ${passed ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {row.stage}. {row.title}
                  </Text>
                  <Text className="text-sm font-bold text-muted-foreground">
                    +{row.xp.toLocaleString("id-ID")} XP
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        <View className="gap-2">
          {notes.map((note) => (
            <Text
              className="text-center text-sm leading-6 text-muted-foreground"
              key={note}
            >
              {note}
            </Text>
          ))}
        </View>
      </ScrollView>
      <View className="gap-2 px-5">
        <Action onPress={close}>Lanjut</Action>
        <Action variant="link" onPress={onRetry}>
          Ulangi dari awal
        </Action>
      </View>
    </>
  );
}

/**
 * The onboarding placement: why the learner studies Korean, how well they
 * read Hangeul, then an adaptive test up the four stages (see
 * `@hakgyo/shared/placement`). The result waits on the device until sign-in.
 */
export default function PlacementScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [step, setStep] = useState<Step>({ kind: "goal" });

  const chooseGoal = (goal: PlacementGoal) => {
    savePlacementGoal(goal);
    setStep({ kind: "reading", goal });
  };

  const chooseReading = (goal: PlacementGoal, reading: PlacementReading) => {
    const state = startPlacement(reading);
    if (!state) {
      savePlacementStage(0);
      setStep({ kind: "result", goal, stage: null });
      return;
    }
    setStep({
      kind: "test",
      goal,
      state,
      ...nextQuestion(state, goal, new Set()),
    });
  };

  const answer = useCallback((correct: boolean) => {
    setStep((current) => {
      if (current.kind !== "test") return current;
      const state = answerPlacement(current.state, correct);
      if (state.stage === null) {
        savePlacementStage(state.passed);
        return { kind: "result", goal: current.goal, stage: state.passed };
      }
      return {
        ...current,
        state,
        ...nextQuestion(state, current.goal, current.asked),
      };
    });
  }, []);

  const header = (
    <View className="h-10 flex-row items-center gap-4 px-5">
      <Pressable
        accessibilityLabel="Tutup tes"
        accessibilityRole="button"
        className="-m-2 p-2 active:opacity-60"
        onPress={close}
      >
        <SymbolIcon
          name="xmark"
          size={18}
          tintColor={colors.mutedForeground}
          weight="semibold"
        />
      </Pressable>
      <View className="flex-1" />
      {step.kind === "test" ? (
        <Text className="text-sm font-semibold text-muted-foreground">
          Soal {step.state.answered + 1} (maks. {MAX_QUESTIONS})
        </Text>
      ) : null}
    </View>
  );

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}
    >
      {header}
      {step.kind === "goal" ? (
        <ScrollView contentContainerClassName="gap-6 px-5 py-6">
          <HeroHeader
            description="Biar soal dan saran kelasnya pas buat kamu."
            eyebrow="1 DARI 2"
            size="md"
            title="Belajar bahasa Korea buat apa?"
          />
          <View className="gap-2.5">
            {GOALS.map((goal) => (
              <OptionRow
                detail={goal.detail}
                key={goal.value}
                onPress={() => chooseGoal(goal.value)}
                symbol={goal.symbol}
                title={goal.title}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}
      {step.kind === "reading" ? (
        <ScrollView contentContainerClassName="gap-6 px-5 py-6">
          <HeroHeader
            description="Jawab jujur aja. Tesnya menyesuaikan, yang gampang dilewati."
            eyebrow="2 DARI 2"
            size="md"
            title="Udah bisa baca Hangeul?"
          />
          <View className="gap-2.5">
            {READINGS.map((reading) => (
              <OptionRow
                detail={reading.detail}
                key={reading.value}
                onPress={() => chooseReading(step.goal, reading.value)}
                title={reading.title}
              />
            ))}
          </View>
          <Action variant="link" onPress={() => setStep({ kind: "goal" })}>
            Kembali
          </Action>
        </ScrollView>
      ) : null}
      {step.kind === "test" ? (
        <TestStep
          key={step.question.id + step.state.answered}
          onAnswer={answer}
          step={step}
        />
      ) : null}
      {step.kind === "result" ? (
        <ResultStep
          goal={step.goal}
          onRetry={() => setStep({ kind: "goal" })}
          stage={step.stage}
        />
      ) : null}
    </View>
  );
}
