import { auth } from "@/backend/auth";

// Returns the authenticated user's id, or null if there's no session.
// Callers should respond with 401 when this is null.
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
