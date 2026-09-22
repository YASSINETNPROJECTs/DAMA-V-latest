"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/features/auth/session";
import {
  approveDeposit,
  completeWithdrawal,
  processWithdrawal,
  rejectDeposit,
  releaseWithdrawal,
  setNetworkEnabled,
  upsertNetwork,
} from "./service";

/** Server-side RBAC — normal users can NEVER reach financial admin actions. */
async function requireFinanceAdminId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden: admin only");
  return user.id;
}

function parseAmount(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

export async function approveDepositAction(formData: FormData): Promise<void> {
  const adminId = await requireFinanceAdminId();
  await approveDeposit(adminId, String(formData.get("id")));
  revalidatePath("/admin/deposits");
}

export async function rejectDepositAction(formData: FormData): Promise<void> {
  const adminId = await requireFinanceAdminId();
  await rejectDeposit(adminId, String(formData.get("id")), String(formData.get("reason") ?? ""));
  revalidatePath("/admin/deposits");
}

export async function processWithdrawalAction(formData: FormData): Promise<void> {
  const adminId = await requireFinanceAdminId();
  await processWithdrawal(adminId, String(formData.get("id")));
  revalidatePath("/admin/withdrawals");
}

export async function completeWithdrawalAction(formData: FormData): Promise<void> {
  const adminId = await requireFinanceAdminId();
  await completeWithdrawal(adminId, String(formData.get("id")), String(formData.get("txId") ?? ""));
  revalidatePath("/admin/withdrawals");
}

export async function rejectWithdrawalAction(formData: FormData): Promise<void> {
  const adminId = await requireFinanceAdminId();
  await releaseWithdrawal(
    { userId: adminId, isAdmin: true },
    String(formData.get("id")),
    String(formData.get("reason") ?? ""),
    "REJECTED"
  );
  revalidatePath("/admin/withdrawals");
}

export async function saveNetworkAction(formData: FormData): Promise<void> {
  const adminId = await requireFinanceAdminId();
  const id = String(formData.get("id") ?? "");
  await upsertNetwork(adminId, {
    id: id || undefined,
    currency: String(formData.get("currency") ?? ""),
    network: String(formData.get("network") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    depositAddress: String(formData.get("depositAddress") ?? ""),
    minDeposit: parseAmount(formData.get("minDeposit")),
    minWithdrawal: parseAmount(formData.get("minWithdrawal")),
    enabled: formData.get("enabled") === "on",
  });
  revalidatePath("/admin/wallet");
}

export async function toggleNetworkAction(formData: FormData): Promise<void> {
  const adminId = await requireFinanceAdminId();
  await setNetworkEnabled(adminId, String(formData.get("id")), formData.get("enabled") === "on");
  revalidatePath("/admin/wallet");
}


export async function togglePaymentMethodAction(formData: FormData): Promise<void> {
  const adminId = await requireFinanceAdminId();
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "on";
  await prisma.paymentMethod.update({ where: { id }, data: { enabled } });
  await prisma.auditLog.create({ data: { userId: adminId, action: "PAYMENT_METHOD_TOGGLED", meta: { id, enabled } } });
  revalidatePath("/admin/wallet");
}
