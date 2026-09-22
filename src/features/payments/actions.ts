"use server";

import { getCurrentUser } from "@/features/auth/session";
import { createBinanceDepositOrder } from "./service";

export interface PaymentActionState {
  error?: string;
  checkoutUrl?: string;
  qrContent?: string;
  qrCodeLink?: string;
  deeplink?: string;
  universalUrl?: string;
}

export async function createBinanceDepositAction(_prev: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Please sign in first." };
    const amount = Number(formData.get("amount"));
    const payment = await createBinanceDepositOrder(user.id, amount);
    return { checkoutUrl: payment.checkoutUrl ?? undefined, qrContent: payment.qrContent ?? undefined, qrCodeLink: payment.qrCodeLink ?? undefined, deeplink: payment.deeplink ?? undefined, universalUrl: payment.universalUrl ?? undefined };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create Binance Pay order." };
  }
}


export async function reconcilePaymentAction(formData: FormData): Promise<void> {
  const { getCurrentUser } = await import("@/features/auth/session");
  const { revalidatePath } = await import("next/cache");
  const { reconcileBinancePayment } = await import("./service");
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  await reconcileBinancePayment(String(formData.get("id") || ""));
  revalidatePath("/admin/payments");
}
