import { auth } from "@clerk/nextjs/server";
import { AuthBoundaryError, requireUserId } from "@/lib/auth/boundary";

export async function actorId(): Promise<string> {
  const session = await auth();
  return requireUserId(session.userId);
}

export function actionError(error: unknown): { ok: false; message: string } {
  if (error instanceof AuthBoundaryError) return { ok: false, message: "Sign in to continue." };
  return { ok: false, message: "Couldn't complete that. Try again." };
}
