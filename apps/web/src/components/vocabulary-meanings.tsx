import { cn } from "~/lib/utils";

/**
 * The meanings of a vocabulary entry: plain text for one meaning, a
 * numbered list for several.
 */
export function VocabularyMeanings({
  className,
  meanings,
}: {
  className?: string;
  meanings: readonly string[];
}) {
  if (meanings.length <= 1) {
    return <p className={className}>{meanings[0] ?? ""}</p>;
  }
  return (
    <ol className={cn("grid gap-0.5", className)}>
      {meanings.map((meaning, index) => (
        <li className="flex gap-1.5" key={`${index}:${meaning}`}>
          <span className="text-muted-foreground shrink-0 tabular-nums">
            {index + 1}.
          </span>
          <span className="min-w-0">{meaning}</span>
        </li>
      ))}
    </ol>
  );
}
