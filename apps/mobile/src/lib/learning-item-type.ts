export type LearningItemType = "MATERIAL" | "VOCABULARY_SET" | "ASSESSMENT";

const learningItemTypeMeta = {
  MATERIAL: {
    label: "Material",
    textClass: "text-primary",
    dotClass: "bg-primary",
    borderClass: "border-primary/30",
    softClass: "bg-primary/10",
  },
  VOCABULARY_SET: {
    label: "Vocabulary",
    textClass: "text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
    borderClass: "border-emerald-500/40",
    softClass: "bg-emerald-500/10",
  },
  ASSESSMENT: {
    label: "Assessment",
    textClass: "text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
    borderClass: "border-amber-500/40",
    softClass: "bg-amber-500/10",
  },
} as const;

export function getLearningItemTypeMeta(type?: LearningItemType) {
  return learningItemTypeMeta[type ?? "MATERIAL"];
}
