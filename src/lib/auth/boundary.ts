export class AuthBoundaryError extends Error {
  constructor(message = "You don't have access to that.") {
    super(message);
    this.name = "AuthBoundaryError";
  }
}

/** The signed-in user, or a failure when the session is missing. */
export function requireUserId(userId: string | null | undefined): string {
  if (!userId) throw new AuthBoundaryError("Sign in to continue.");
  return userId;
}

/** Rejects a row that belongs to someone else. */
export function assertOwner(actorId: string, ownerId: string): void {
  const actor = requireUserId(actorId);
  if (actor !== ownerId) throw new AuthBoundaryError();
}

/** Drops every row the actor does not own. An empty actor fails closed. */
export function onlyOwned<T extends { userId: string }>(rows: readonly T[], actorId: string): T[] {
  const actor = requireUserId(actorId);
  return rows.filter((row) => row.userId === actor);
}
