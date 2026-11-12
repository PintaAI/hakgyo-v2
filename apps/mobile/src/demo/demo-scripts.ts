import type { Href } from "expo-router";

import type { NativeAnchor, TourTargetId } from "../tour/tours";

/** Where a step's touch shows: a registered tour target or a native item. */
export type DemoTap = TourTargetId | NativeAnchor;

/**
 * One step of a scripted demo. A `tap` shows a touch on that spot before the
 * step acts, so the recording reads as someone using the app.
 */
export type DemoStep =
  | { kind: "wait"; ms: number }
  /** Switches tab, or goes to a screen already in the history. */
  | { kind: "navigate"; href: Href; tap?: DemoTap }
  | { kind: "push"; href: Href; tap?: DemoTap }
  | { kind: "back"; tap?: DemoTap }
  /** Taps a target and runs its `onDemoPress`. */
  | { kind: "press"; target: TourTargetId }
  /** Scrolls the screen until the target sits below the header. */
  | { kind: "reveal"; target: TourTargetId }
  | { kind: "scroll"; by: number }
  | { kind: "scrollTop" };

export type DemoScript = {
  title: string;
  /** Where the script starts; it closes the Profil sheet first. */
  steps: DemoStep[];
};

const HOME = "/(home)/(tabs)/home" as Href;
const LEARN = "/(home)/(tabs)/learn" as Href;
const PRACTICE = "/(home)/(tabs)/assessments" as Href;
const SEARCH = "/(home)/(tabs)/search" as Href;

/** A pause long enough to read a screen in the recording. */
const LOOK = 1800;
const GLANCE = 1100;

export const demoScripts = {
  tour: {
    title: "Tur singkat aplikasi",
    steps: [
      // Started from Pengaturan: close the sheet, then begin on Hari Ini.
      { kind: "back" },
      { kind: "navigate", href: HOME },
      { kind: "wait", ms: LOOK },
      { kind: "reveal", target: "home.vocabulary" },
      { kind: "wait", ms: LOOK },
      { kind: "reveal", target: "home.challenge" },
      { kind: "wait", ms: LOOK },
      { kind: "scrollTop" },
      { kind: "wait", ms: GLANCE },

      { kind: "navigate", href: LEARN, tap: "native:tab:learn" },
      { kind: "wait", ms: LOOK },
      { kind: "press", target: "learn.next" },
      { kind: "wait", ms: LOOK },
      { kind: "scroll", by: 420 },
      { kind: "wait", ms: GLANCE },
      { kind: "scroll", by: 420 },
      { kind: "wait", ms: LOOK },
      { kind: "back", tap: "native:back" },
      { kind: "wait", ms: GLANCE },

      { kind: "navigate", href: PRACTICE, tap: "native:tab:assessments" },
      { kind: "wait", ms: LOOK },
      { kind: "reveal", target: "practice.hangeul" },
      { kind: "wait", ms: LOOK },
      { kind: "reveal", target: "practice.games" },
      { kind: "wait", ms: LOOK },
      { kind: "scrollTop" },
      { kind: "wait", ms: GLANCE },

      { kind: "navigate", href: SEARCH, tap: "native:tab:search" },
      { kind: "wait", ms: LOOK },

      { kind: "navigate", href: HOME, tap: "native:tab:home" },
      { kind: "wait", ms: GLANCE },
      { kind: "push", href: "/profile" as Href, tap: "native:settings" },
      { kind: "wait", ms: LOOK },
      { kind: "scroll", by: 520 },
      { kind: "wait", ms: LOOK },
      { kind: "scrollTop" },
      { kind: "wait", ms: GLANCE },
      { kind: "back", tap: "native:settings" },
      { kind: "wait", ms: GLANCE },
    ],
  },
} satisfies Record<string, DemoScript>;

export type DemoScriptId = keyof typeof demoScripts;
