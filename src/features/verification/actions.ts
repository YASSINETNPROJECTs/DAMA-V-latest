"use server";

import { getCurrentUser } from "@/features/auth/session";
import { startVerification, completeVerification, getVerification } from "./service";

export async function getVerificationAction(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "NOT_STARTED";
  const v = await getVerification(user.id);
  return v.status;
}

export async function startVerificationAction(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "NOT_STARTED";
  const v = await startVerification(user.id);
  return v.status;
}

export async function completeVerificationAction(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) return "NOT_STARTED";
  const v = await completeVerification(user.id);
  return v.status;
}
