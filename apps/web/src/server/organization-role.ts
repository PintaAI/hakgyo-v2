export function canDemoteOwner(ownerCount: number, nextRole: string) {
  return nextRole === "OWNER" || ownerCount > 1;
}
