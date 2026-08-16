export function hasAuthenticatedActor(input: {
  actorKind: "mcp" | "session";
  actorUserId: string | null;
  sessionUserId?: string;
}) {
  if (!input.actorUserId) return false;
  return (
    input.actorKind === "mcp" || input.sessionUserId === input.actorUserId
  );
}
