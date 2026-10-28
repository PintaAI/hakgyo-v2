/**
 * Question groups and picture options (docs/eps-topik-simulation.md sections 4.5 and 5.7), shared
 * by web, mobile and the server.
 */

export type QuestionGroupContent = {
  id: string;
  instructions: unknown;
  stimulus: unknown;
};

const imageBlockTypes = new Set(["image", "assetImage"]);

function isEmptyParagraph(block: { type?: unknown; content?: unknown }) {
  if (block.type !== "paragraph") return false;
  const content = block.content;
  if (content === undefined || content === null || content === "") return true;
  if (typeof content === "string") return !content.trim();
  return (
    Array.isArray(content) &&
    content.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "text" in item &&
        typeof item.text === "string" &&
        !item.text.trim(),
    )
  );
}

/** Whether rich content is only pictures (empty paragraphs aside), like EPS picture options. */
export function isImageOnlyContent(content: unknown) {
  if (!Array.isArray(content)) return false;
  let images = 0;
  for (const block of content) {
    if (!block || typeof block !== "object") return false;
    const typed = block as {
      type?: unknown;
      content?: unknown;
      children?: unknown;
    };
    if (Array.isArray(typed.children) && typed.children.length) return false;
    if (typeof typed.type === "string" && imageBlockTypes.has(typed.type)) {
      images += 1;
    } else if (!isEmptyParagraph(typed)) {
      return false;
    }
  }
  return images > 0;
}

/** Whether a question's options show as a 2×2 picture grid: two to four, all pictures. */
export function usesPictureGrid(options: ReadonlyArray<{ content: unknown }>) {
  return (
    options.length >= 2 &&
    options.length <= 4 &&
    options.every((option) => isImageOnlyContent(option.content))
  );
}

/**
 * The group whose stimulus plays with the question at `index` (as shown): only the group's first
 * question plays it, so a group's shared audio is heard and counted once, and each question keeps
 * its own audio and play count (docs/eps-topik-simulation.md section 4.5).
 */
export function stimulusPlaysWith<G extends { id: string }>(
  questions: ReadonlyArray<{ groupId?: string | null }>,
  index: number,
  groups: readonly G[],
): G | undefined {
  const groupId = questions[index]?.groupId;
  if (!groupId || questions[index - 1]?.groupId === groupId) return undefined;
  return groups.find(({ id }) => id === groupId);
}

/**
 * Where each group sits among the questions as shown: the indexes of its first and last
 * question, for labels like "Soal 1–4".
 */
export function groupRanges(
  questions: ReadonlyArray<{ groupId?: string | null }>,
) {
  const ranges = new Map<string, { first: number; last: number }>();
  questions.forEach((question, index) => {
    if (!question.groupId) return;
    const range = ranges.get(question.groupId);
    if (range) range.last = index;
    else ranges.set(question.groupId, { first: index, last: index });
  });
  return ranges;
}

/**
 * Splits questions (in their stored order) into units that move together: a group's questions,
 * or one ungrouped question. Shuffling and copying work on units.
 */
export function questionUnits<Q extends { groupId?: string | null }>(
  questions: readonly Q[],
) {
  const units: Q[][] = [];
  for (const question of questions) {
    const last = units.at(-1);
    if (question.groupId && last?.[0]?.groupId === question.groupId) {
      last.push(question);
    } else {
      units.push([question]);
    }
  }
  return units;
}
