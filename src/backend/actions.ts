"use server";

import { signOut } from "@/backend/auth";

export async function signOutAction() {
  await signOut();
}
