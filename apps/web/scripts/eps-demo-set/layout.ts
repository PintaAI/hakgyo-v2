// Where each key ends up, and the plain text of a question (for checks and the blind test).
import type { Inline, OptionSpec, Paragraph, QuestionSpec } from "./content";
import { groups } from "./content";

/**
 * Target key position per question, by number. Five keys on each position per section, with no
 * run longer than two, chosen by hand so the set reads like a real package.
 */
const readingTargets = [
  2, 0, 3, 1, 1, 3, 0, 2, 3, 1, 0, 2, 1, 3, 2, 0, 3, 1, 2, 0,
];
const listeningTargets = [
  1, 3, 0, 2, 2, 0, 3, 1, 0, 3, 1, 2, 0, 2, 3, 1, 0, 3, 1, 2,
];

export function keyTarget(number: number) {
  const target =
    number <= 20 ? readingTargets[number - 1] : listeningTargets[number - 21];
  if (target === undefined) throw new Error(`No key target for ${number}`);
  return target;
}

/** The options in shown order, each with its authored index (0 = key). */
export function orderedOptions(question: QuestionSpec) {
  const target = keyTarget(question.number);
  const [key, ...rest] = question.options.map((option, authored) => ({
    option,
    authored,
  }));
  return [...rest.slice(0, target), key!, ...rest.slice(target)];
}

export const inlineText = (part: Inline) =>
  typeof part === "string" ? part : part.text;

export const paragraphText = (paragraph: Paragraph) =>
  paragraph.map(inlineText).join("");

/** An option as text, underlines marked with [brackets]. */
export function optionText(option: OptionSpec) {
  if ("image" in option) return `[gambar: ${option.label}]`;
  return option.text
    .map((part) =>
      typeof part !== "string" && part.underline
        ? `[${part.text}]`
        : inlineText(part),
    )
    .join("");
}

export function scriptText(question: QuestionSpec) {
  const lines =
    question.script ??
    groups.find((group) => group.key === question.group)?.script ??
    [];
  return lines
    .map((line) => `${line.speaker === "M" ? "남" : "여"}: ${line.text}`)
    .join("\n");
}

export function groupInstruction(question: QuestionSpec) {
  return groups.find((group) => group.key === question.group)?.instruction;
}
