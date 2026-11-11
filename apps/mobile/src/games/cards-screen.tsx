import { useState } from "react";
import { Gesture } from "react-native-gesture-handler";

import { StudyScreen } from "../components/learning-ui";
import { VocabularySession } from "../components/vocabulary-session";
import type { GameLesson } from "./lesson";

type CardsWord = {
  id: string;
  term: string;
  meanings: string[];
  imageAsset?: { id: string } | null;
};

/**
 * Kartu as a game screen, for Latihan and as a lesson round. It keeps its own
 * reporter and saved progress, so it takes the set rather than `onAttempt`.
 */
export function CardsScreen({
  courseId,
  sourceCourseItemId,
  vocabularySetId,
  words,
  lesson,
  onExit,
}: {
  courseId: string;
  sourceCourseItemId: string;
  vocabularySetId: string;
  words: readonly CardsWord[];
  lesson?: GameLesson;
  onExit: () => void;
}) {
  const [scrollGesture] = useState(() => Gesture.Native());
  const [roundActive, setRoundActive] = useState(false);
  return (
    <StudyScreen
      fillViewport
      gameHeader
      keyboardAvoiding
      scrollable={!roundActive}
      scrollGesture={scrollGesture}
      title={lesson?.title ?? "Kartu"}
    >
      <VocabularySession
        key={`${sourceCourseItemId}:${vocabularySetId}`}
        courseId={courseId}
        lesson={lesson}
        onComplete={async () => onExit()}
        onRoundActiveChange={setRoundActive}
        scrollGesture={scrollGesture}
        sourceCourseItemId={sourceCourseItemId}
        vocabularySetId={vocabularySetId}
        words={words.map((word) => ({
          id: word.id,
          term: word.term,
          meanings: word.meanings,
          imageAssetId: word.imageAsset?.id,
        }))}
      />
    </StudyScreen>
  );
}
