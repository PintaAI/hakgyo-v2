import { router } from "expo-router";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ScrollView, Text, View } from "react-native";

import { HeroTile } from "../components/hero-tile";
import {
  LearningFooterView,
  useLearningContinuation,
} from "../components/learn/course-learning-footer";
import { HakgyoHero } from "../components/learn/hakgyo-hero";
import {
  FactChips,
  HeroMark,
  HeroMarkValue,
  HeroTitle,
  type Fact,
} from "../components/learn/hero-parts";
import { Action, Card, Eyebrow } from "../components/learning-ui";
import { getLearningItemTypeMeta } from "../lib/learning-item-type";
import { formatScore, recordBest, type GameScore } from "./personal-best";

type GameResultProps = {
  eyebrow: string;
  title: string;
  description?: string;
  /** On the front card: "8/10" over "benar", a score over "poin". */
  mark: { value: string; label?: string };
  done?: boolean;
  celebrate?: boolean;
  facts?: readonly Fact[];
  /** What to go over again: words, sentences, each with an optional tail. */
  review?: {
    title: string;
    rows: readonly {
      key: string;
      title: string;
      detail?: string;
      trailing?: ReactNode;
    }[];
  };
  /** Playing again, or the words to repeat. */
  primary?: {
    eyebrow: string;
    title: string;
    meta: string;
    pill: string;
    onPress: () => void;
  };
  /** Leaving. */
  secondary: { label: string; onPress: () => void; disabled?: boolean };
  /** Closing the sheet without choosing. Leaves (`secondary`) if unset. */
  onDismiss?: () => void;
  courseId?: string;
  courseItemId?: string;
};

// The result the open game is showing. The sheet is a route of its own, so
// the game hands it the page (with its callbacks) through here.
let current: GameResultProps | undefined;
const listeners = new Set<() => void>();
function publish(next: GameResultProps | undefined) {
  current = next;
  for (const listener of listeners) listener();
}

/** The result the open game is showing, for the `/game-result` route. */
export function useGameResult() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}

/**
 * The end (or pause) of a game as a form sheet over it, like the sheet a
 * game starts from. A game renders this while its round is over; the sheet
 * follows the props as they change, and shows at once from what the phone
 * knows. Closing the sheet without choosing leaves the game.
 */
export function GameResultSheet({
  xp,
  best,
  ...props
}: GameResultProps & {
  /** XP this round earned, counted on the phone like the server does. */
  xp?: number;
  /** The round's score, kept as a personal best per `scope`. */
  best?: GameScore & { scope: string };
}) {
  // The sheet mounts once per finished round, so the score is recorded once.
  const [bestOutcome] = useState(() =>
    best ? recordBest(best.scope, best) : null,
  );
  const rewardFacts: Fact[] = [];
  if (xp) rewardFacts.push({ icon: "sparkles", text: `+${xp} XP` });
  if (bestOutcome?.isNew)
    rewardFacts.push({ icon: "trophy.fill", text: "Rekor baru!" });
  else if (bestOutcome?.previous)
    rewardFacts.push({
      icon: "trophy.fill",
      text: `Rekor ${formatScore(bestOutcome.previous)}`,
      accessibilityLabel: `Rekor pribadi ${formatScore(bestOutcome.previous)}`,
    });
  const page: GameResultProps = {
    ...props,
    celebrate: props.celebrate || bestOutcome?.isNew,
    facts: [...rewardFacts, ...(props.facts ?? [])],
  };
  useEffect(() => {
    publish(page);
  });
  useEffect(() => {
    router.push("/game-result");
    return () => publish(undefined);
  }, []);
  return null;
}

/**
 * The sheet's page, in the layout a tugas result has: the hero with the
 * round's number on the fanned cards, a title and fact chips, then the review
 * list, one `HeroTile` and the small actions under it.
 *
 * In a course the tile is the next activity once this one is done (playing
 * again becomes a small action); until then a vocabulary set shows the
 * locked "Berikutnya" row. `onAct` runs before every action (the sheet closes).
 */
export function GameResult({
  eyebrow,
  title,
  description,
  mark,
  done = false,
  celebrate = false,
  facts,
  review,
  primary,
  secondary,
  courseId,
  courseItemId,
  onAct,
}: GameResultProps & { onAct: () => void }) {
  const inCourse = Boolean(courseId && courseItemId);
  const learning = useLearningContinuation({
    courseId: courseId ?? "",
    courseItemId: courseItemId ?? "",
  });
  const path = inCourse ? learning.path : undefined;
  const next = path?.nextItem;
  const nextMeta = next ? getLearningItemTypeMeta(next.type) : null;
  const goesOn = Boolean(path?.item.isCompleted);
  const act = (action: () => void) => () => {
    onAct();
    action();
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-5 pb-10"
      showsVerticalScrollIndicator={false}
    >
      <HakgyoHero inSheet>
        <HeroMark
          done={done}
          celebrate={celebrate}
          face={<HeroMarkValue value={mark.value} label={mark.label} />}
        />
        <HeroTitle eyebrow={eyebrow} title={title} description={description} />
        {facts?.length ? <FactChips facts={facts} /> : null}
      </HakgyoHero>
      {review?.rows.length ? (
        <Card className="gap-3 p-4">
          <Eyebrow size="xs">{review.title}</Eyebrow>
          {review.rows.map((row) => (
            <View key={row.key} className="flex-row items-center gap-3">
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-base font-bold text-foreground">
                  {row.title}
                </Text>
                {row.detail ? (
                  <Text className="text-sm text-muted-foreground">
                    {row.detail}
                  </Text>
                ) : null}
              </View>
              {row.trailing}
            </View>
          ))}
        </Card>
      ) : null}
      {goesOn && path ? (
        <HeroTile
          eyebrow={
            next && nextMeta
              ? `Berikutnya · ${nextMeta.label}`
              : path.courseCompleted
                ? "Kurikulum selesai"
                : `Bab ${path.moduleIndex + 1}`
          }
          title={next ? next.title : "Kembali ke kurikulum"}
          meta={`Bab ${path.moduleIndex + 1} · ${path.completedCount}/${path.module.items.length} selesai`}
          pill={next ? "Lanjutkan" : "Buka"}
          loading={learning.busy}
          onPress={act(() => void learning.continueLearning())}
        />
      ) : primary ? (
        <HeroTile {...primary} onPress={act(primary.onPress)} />
      ) : null}
      {learning.issue?.kind === "error" && inCourse ? (
        <Text
          accessibilityRole="alert"
          className="text-sm leading-5 text-destructive"
        >
          {learning.issue.message}
        </Text>
      ) : null}
      {/* The small actions under the tile, side by side. */}
      <View className="flex-row justify-center gap-2">
        {goesOn && primary ? (
          <View className="flex-1">
            <Action
              variant="ghost"
              size="sm"
              leadingIcon="arrow.clockwise"
              onPress={act(primary.onPress)}
            >
              {primary.eyebrow}
            </Action>
          </View>
        ) : null}
        <View className="flex-1">
          <Action
            variant="ghost"
            size="sm"
            disabled={secondary.disabled}
            onPress={act(secondary.onPress)}
          >
            {secondary.label}
          </Action>
        </View>
      </View>
      {path &&
      !goesOn &&
      path.item.type === "VOCABULARY_SET" &&
      courseId &&
      courseItemId ? (
        <View className="gap-2">
          <LearningFooterView
            learning={learning}
            compact
            continueButton="screenReader"
            nextLocked
          />
          <Text className="text-[13px] leading-[18px] text-muted-foreground">
            Lanjut setelah semua kata di set ini dijawab benar tanpa melihat
            jawabannya.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
