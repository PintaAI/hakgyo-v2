export function canDemoteOwner(ownerCount: number, nextRole: string) {
  return nextRole === "OWNER" || ownerCount > 1;
}

export function isSerializableConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}
