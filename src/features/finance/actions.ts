"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/session";
import {
  cancelDepositRequest,
  createDepositRequest,
  createWithdrawalRequest,
  releaseWithdrawal,
  FinanceError,
} from "./service";
import type { AuthFormState } from "@/types";

function parseAmount(raw: unknown): number {
  return Number.parseInt(String(raw ?? ""), 10);
}

export async function createDepositAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in required" };
  try {
    await createDepositRequest(user.id, {
      currency: String(formData.get("currency") ?? "").toUpperCase(),
      network: String(formData.get("network") ?? "").toUpperCase(),
      amount: parseAmount(formData.get("amount")),
      txId: String(formData.get("txId") ?? "").trim() || undefined,
    });
    revalidatePath("/wallet");
    return { success: true };
  } catch (e) {
    if (e instanceof FinanceError) return { error: e.message };
    throw e;
  }
}

export async function createWithdrawalAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in required" };
  try {
    await createWithdrawalRequest(user.id, {
      currency: String(formData.get("currency") ?? "").toUpperCase(),
      network: String(formData.get("network") ?? "").toUpperCase(),
      amount: parseAmount(formData.get("amount")),
      destinationType: String(formData.get("destinationType") ?? "BLOCKCHAIN_ADDRESS"),
      destinationValue: String(formData.get("destinationValue") ?? ""),
    });
    revalidatePath("/wallet");
    return { success: true };
  } catch (e) {
    if (e instanceof FinanceError) return { error: e.message };
    throw e;
  }
}

export async function cancelDepositAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await cancelDepositRequest(user.id, String(formData.get("id")));
  revalidatePath("/wallet");
}

export async function cancelWithdrawalAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await releaseWithdrawal(
    { userId: user.id, isAdmin: false },
    String(formData.get("id")),
    "Cancelled by user",
    "CANCELLED"
  );
  revalidatePath("/wallet");
}
