import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { competitiveConfig } from "@/config/competitive";
import { getAvailableBalance, getDefaultCurrency } from "@/features/finance/service";

export const dynamic = "force-dynamic";

// GET /api/matchmaking/config — stake options + available balance in the
// platform currency. Available (total − reserved) is what matters for stakes.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const currency = await getDefaultCurrency();
  const available = await getAvailableBalance(user.id, currency);
  return NextResponse.json({
    stakes: competitiveConfig.stakes,
    feePercent: competitiveConfig.feePercent,
    fairnessCap: competitiveConfig.matchmaking.fairnessCap,
    stepSeconds: competitiveConfig.matchmaking.stepSeconds,
    currency,
    balance: available,
  });
}
