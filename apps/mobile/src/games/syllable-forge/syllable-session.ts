import {
  composedText,
  INITIALS,
  syllableKeys,
  VOWELS,
} from "./hangul-composer";
import { SYLLABLE_CHALLENGES } from "./syllable-forge-data";

export type SyllableSession = {
  phase: "intro" | "playing" | "correct" | "complete";
  index: number;
  keys: string[];
  showHint: boolean;
  assisted: boolean;
  mistakes: number;
  errors: number;
  independent: number;
  feedback: "idle" | "incorrect";
};
export const initialSession: SyllableSession = {
  phase: "intro",
  index: 0,
  keys: [],
  showHint: false,
  assisted: false,
  mistakes: 0,
  errors: 0,
  independent: 0,
  feedback: "idle",
};
export type SessionAction =
  | {
      type: "start" | "delete" | "hint" | "next" | "reject-typo";
    }
  | { type: "key"; key: string };

export function syllableSessionReducer(
  state: SyllableSession,
  action: SessionAction,
): SyllableSession {
  if (action.type === "start") return { ...initialSession, phase: "playing" };
  if (action.type === "next") {
    if (state.phase !== "correct") return state;
    if (state.index === SYLLABLE_CHALLENGES.length - 1)
      return { ...state, phase: "complete" };
    return {
      ...state,
      phase: "playing",
      index: state.index + 1,
      keys: [],
      showHint: false,
      assisted: false,
      mistakes: 0,
      feedback: "idle",
    };
  }
  if (action.type === "reject-typo") {
    if (state.phase !== "playing" || state.feedback !== "incorrect")
      return state;
    return {
      ...state,
      keys: state.keys.slice(0, -1),
      feedback: "idle",
    };
  }
  if (state.phase !== "playing") return state;
  switch (action.type) {
    case "key": {
      if (state.feedback === "incorrect") return state;
      if (
        state.keys.length >= 8 ||
        !(INITIALS.includes(action.key) || VOWELS.includes(action.key))
      )
        return state;
      const challenge = SYLLABLE_CHALLENGES[state.index]!;
      const expectedKey = syllableKeys(challenge.target)[state.keys.length];
      const keys = [...state.keys, action.key];
      if (action.key !== expectedKey) {
        return {
          ...state,
          keys,
          feedback: "incorrect",
          mistakes: state.mistakes + 1,
          errors: state.errors + 1,
        };
      }
      if (composedText(keys) === challenge.target) {
        return {
          ...state,
          keys,
          phase: "correct",
          feedback: "idle",
          independent:
            state.independent +
            (state.mistakes === 0 && !state.assisted ? 1 : 0),
        };
      }
      return { ...state, keys, feedback: "idle" };
    }
    case "delete":
      return { ...state, keys: state.keys.slice(0, -1), feedback: "idle" };
    case "hint":
      return { ...state, showHint: !state.showHint, assisted: true };
  }
}
