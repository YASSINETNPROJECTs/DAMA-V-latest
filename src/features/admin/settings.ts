// Admin-editable settings stored in the AppSetting table.
// Defaults come from src/config/competitive.ts.

import { prisma } from "@/lib/prisma";
import { competitiveConfig } from "@/config/competitive";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return (row?.value as T | undefined) ?? fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: value as object },
    create: { key, value: value as object },
  });
}

/** Platform fee percent (0-50, integer) — admin configurable. */
export async function getFeePercent(): Promise<number> {
  const fee = await getSetting<number>("feePercent", competitiveConfig.feePercent);
  return Math.min(50, Math.max(0, Math.round(fee)));
}

export async function isMatchmakingEnabled(): Promise<boolean> {
  return getSetting<boolean>("matchmakingEnabled", true);
}

export async function isRegistrationOpen(): Promise<boolean> {
  return getSetting<boolean>("registrationOpen", true);
}

export interface AdminSettings {
  feePercent: number;
  matchmakingEnabled: boolean;
  registrationOpen: boolean;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const [feePercent, matchmakingEnabled, registrationOpen] = await Promise.all([
    getFeePercent(),
    isMatchmakingEnabled(),
    isRegistrationOpen(),
  ]);
  return { feePercent, matchmakingEnabled, registrationOpen };
}
