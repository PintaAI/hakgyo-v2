import type { ComponentProps } from "react";

import { Pager, type PagerHandle } from "../ui/pager";

export type QuizPagerHandle = PagerHandle;

/** The screen gutter question pages reach out over, to slide in from the screen edge. */
const PAGE_BLEED = 20;
/**
 * Space between two question pages: twice the gutter, so at rest the next
 * page starts past the screen edge instead of peeking in.
 */
const PAGE_GAP = PAGE_BLEED * 2;

/**
 * Questions one at a time (Home's daily questions, the attempt, the result
 * review): the shared `Pager` with the quiz spacing.
 * The owner decides whether a swipe stands and calls `scrollTo` to put the
 * pager back otherwise; `swipeEnabled` off leaves only the buttons (sections
 * that move forward only or by themselves).
 */
export function QuizPager(
  props: Omit<ComponentProps<typeof Pager>, "gap" | "bleed">,
) {
  return <Pager {...props} gap={PAGE_GAP} bleed={PAGE_BLEED} />;
}
