export type DraftAnswer = { content?: string; optionIds: string[] };

export function restoreAssessmentDraft(
  server: Record<string, DraftAnswer>,
  raw: string | null,
) {
  if (!raw) return server;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return server;
  const valid = Object.entries(parsed).flatMap(([id, value]) => {
    if (
      !value ||
      typeof value !== "object" ||
      !("optionIds" in value) ||
      !Array.isArray(value.optionIds) ||
      !value.optionIds.every((option: unknown) => typeof option === "string")
    )
      return [];
    return [
      [
        id,
        {
          optionIds: value.optionIds,
          content:
            "content" in value && typeof value.content === "string"
              ? value.content
              : undefined,
        },
      ],
    ];
  });
  return { ...server, ...Object.fromEntries(valid) } as Record<
    string,
    DraftAnswer
  >;
}
