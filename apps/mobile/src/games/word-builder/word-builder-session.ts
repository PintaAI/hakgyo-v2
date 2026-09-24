import { WORD_CHALLENGES } from "./word-builder-data";

export type WordBuilderSession = {
  phase: "intro" | "playing" | "correct" | "complete";
  index: number;
  selected: number[];
  feedback: "idle" | "incorrect";
  showHint: boolean;
  mistakes: number;
  errors: number;
  independent: number;
};

export const initialWordBuilderSession: WordBuilderSession = {
  phase: "intro",
  index: 0,
  selected: [],
  feedback: "idle",
  showHint: false,
  mistakes: 0,
  errors: 0,
  independent: 0,
};

export type WordBuilderAction =
  | { type: "start" | "clear" | "hint" | "next" }
  | { type: "add" | "remove"; tileIndex: number };

export function wordBuilderReducer(
  state: WordBuilderSession,
  action: WordBuilderAction,
): WordBuilderSession {
  if (action.type === "start")
    return { ...initialWordBuilderSession, phase: "playing" };

  if (action.type === "next") {
    if (state.phase !== "correct") return state;
    if (state.index === WORD_CHALLENGES.length - 1)
      return { ...state, phase: "complete" };
    return {
      ...state,
      phase: "playing",
      index: state.index + 1,
      selected: [],
      feedback: "idle",
      showHint: false,
      mistakes: 0,
    };
  }

  if (state.phase !== "playing") return state;
  const challenge = WORD_CHALLENGES[state.index]!;

  switch (action.type) {
    case "add": {
      if (
        action.tileIndex < 0 ||
        action.tileIndex >= challenge.tiles.length ||
        state.selected.includes(action.tileIndex) ||
        state.selected.length >= challenge.syllables.length
      )
        return state;
      const selected = [...state.selected, action.tileIndex];
      if (selected.length === challenge.syllables.length) {
        const correct = selected.every(
          (tileIndex, index) =>
            challenge.tiles[tileIndex] === challenge.syllables[index],
        );
        if (correct)
          return {
            ...state,
            selected,
            phase: "correct",
            feedback: "idle",
            independent:
              state.independent +
              (state.mistakes === 0 && !state.showHint ? 1 : 0),
          };
        return {
          ...state,
          selected,
          feedback: "incorrect",
          mistakes: state.mistakes + 1,
          errors: state.errors + 1,
        };
      }
      return {
        ...state,
        selected,
        feedback: "idle",
      };
    }
    case "remove":
      return {
        ...state,
        selected: state.selected.filter((tile) => tile !== action.tileIndex),
        feedback: "idle",
      };
    case "clear":
      return { ...state, selected: [], feedback: "idle" };
    case "hint":
      return { ...state, showHint: true };
  }
}
