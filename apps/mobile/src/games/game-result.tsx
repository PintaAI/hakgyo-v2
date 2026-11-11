import type { ReactNode } from "react";
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
import { Action } from "../components/learning-ui";
import { getLearningItemTypeMeta } from "../lib/learning-item-type";
import { useAppTheme } from "../providers/AppThemeProvider";

type MainAction = {
  eyebrow: string;
  title: string;
  meta: string;
  pill: string;
  onPress: () => void;
  disabled?: boolean;
};

export type GameResultProps = {
  eyebrow: string;
  title: string;
  description?: string;
  /** On the front card: "8/10" over "benar", a score over "poin". */
  mark: { value: string; label?: string };
  done?: boolean;
  celebrate?: boolean;
  facts?: readonly Fact[];
  /** Playing again, or the words to repeat. */
  primary?: MainAction;
  /** Leaving. */
  secondary?: { label: string; onPress: () => void; disabled?: boolean };
  /** The game's review list. */
  children?: ReactNode;
  courseId?: string;
  courseItemId?: string;
  /** Off inside a screen that scrolls already (`StudyScreen`). */
  scroll?: boolean;
  /** As a sheet: closing it without choosing. Leaves (`secondary`) if unset. */
  onDismiss?: () => void;
  /** Runs before any of the page's actions (the sheet closes itself). */
  onAct?: () => void;
};

/**
 * The end of a game, in the layout its opening has (and a tugas result has):
 * the hero with the round's number on the fanned cards, a title and fact
 * chips, then one `HeroTile`, a plain second action and the game's own
 * review list. It shows as soon as the round ends on the phone; what the
 * server says later only fills in facts.
 *
 * In a course the tile is the next activity once this one is done (playing
 * again becomes the plain action); until then a vocabulary set shows the
 * locked "Berikutnya" row.
 */
export function GameResult({
  eyebrow,
  title,
  description,
  mark,
  done = false,
  celebrate = false,
  facts,
  primary,
  secondary,
  children,
  courseId,
  courseItemId,
  scroll = true,
  onAct,
}: GameResultProps) {
  const { colors } = useAppTheme();
  const inCourse = Boolean(courseId && courseItemId);
  const learning = useLearningContinuation({
    courseId: courseId ?? "",
    courseItemId: courseItemId ?? "",
  });
  const path = inCourse ? learning.path : undefined;
  const next = path?.nextItem;
  const nextMeta = next ? getLearningItemTypeMeta(next.type) : null;
  const goesOn = Boolean(path?.item.isCompleted);
  const holds = path && !goesOn && path.item.type === "VOCABULARY_SET";

  const body = (
    <>
      <HakgyoHero inSheet className={scroll ? "" : "-mt-4"}>
        <HeroMark
          done={done}
          celebrate={celebrate}
          face={<HeroMarkValue value={mark.value} label={mark.label} />}
        />
        <HeroTitle eyebrow={eyebrow} title={title} description={description} />
        {facts?.length ? <FactChips facts={facts} /> : null}
      </HakgyoHero>
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
          onPress={() => {
            onAct?.();
            void learning.continueLearning();
          }}
        />
      ) : primary ? (
        <HeroTile
          {...primary}
          onPress={() => {
            onAct?.();
            primary.onPress();
          }}
        />
      ) : null}
      {goesOn && primary ? (
        <Action
          variant="secondary"
          leadingIcon="arrow.clockwise"
          disabled={primary.disabled}
          onPress={() => {
            onAct?.();
            primary.onPress();
          }}
        >
          {`${primary.eyebrow} · ${primary.title}`}
        </Action>
      ) : null}
      {secondary ? (
        <Action
          variant="ghost"
          disabled={secondary.disabled}
          onPress={() => {
            onAct?.();
            secondary.onPress();
          }}
        >
          {secondary.label}
        </Action>
      ) : null}
      {learning.issue?.kind === "error" && inCourse ? (
        <Text
          accessibilityRole="alert"
          className="text-sm leading-5 text-destructive"
        >
          {learning.issue.message}
        </Text>
      ) : null}
      {children}
      {holds && courseId && courseItemId ? (
        <View className="gap-2">
          <LearningFooterView
            courseId={courseId}
            courseItemId={courseItemId}
            learning={learning}
            compact
            continueButton="screenReader"
            nextLocked
          />
          <Text
            className="text-[13px] leading-[18px]"
            style={{ color: colors.mutedForeground }}
          >
            Lanjut setelah semua kata di set ini dijawab benar tanpa melihat
            jawabannya.
          </Text>
        </View>
      ) : null}
    </>
  );
  if (!scroll) return <View className="gap-4">{body}</View>;
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-5 pb-10"
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  );
}
