"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/features/auth/session";
import { setSetting } from "./settings";

async function requireAdminId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Admin only");
  return user.id;
}

const statusSchema = z.enum(["ACTIVE", "SUSPENDED", "BANNED"]);

/** Change a user's status (suspend / ban / reactivate). Logs to AuditLog. */
export async function setUserStatus(formData: FormData): Promise<void> {
  const adminId = await requireAdminId();
  const targetId = String(formData.get("targetId") ?? "");
  const status = statusSchema.parse(String(formData.get("status") ?? ""));
  if (targetId === adminId) throw new Error("You cannot change your own status");

  await prisma.user.update({ where: { id: targetId }, data: { status } });
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "ADMIN_USER_STATUS",
      meta: { targetId, status },
    },
  });
  revalidatePath("/admin/users");
}

const settingsSchema = z.object({
  feePercent: z.coerce.number().int().min(0).max(50),
  matchmakingEnabled: z.boolean(),
  registrationOpen: z.boolean(),
});

/** Persist admin settings (fee %, matchmaking switch, registration switch). */
export async function saveSettings(formData: FormData): Promise<void> {
  const adminId = await requireAdminId();
  const parsed = settingsSchema.parse({
    feePercent: formData.get("feePercent"),
    matchmakingEnabled: formData.get("matchmakingEnabled") === "on",
    registrationOpen: formData.get("registrationOpen") === "on",
  });

  await setSetting("feePercent", parsed.feePercent);
  await setSetting("matchmakingEnabled", parsed.matchmakingEnabled);
  await setSetting("registrationOpen", parsed.registrationOpen);

  await prisma.auditLog.create({
    data: { userId: adminId, action: "ADMIN_SETTINGS", meta: { ...parsed } },
  });
  revalidatePath("/admin/settings");
}
