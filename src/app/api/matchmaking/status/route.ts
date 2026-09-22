import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { queueStatus } from "@/features/competitive/queue";

export const dynamic = "force-dynamic";

// GET /api/matchmaking/status — poll while searching; returns matchId when paired.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const result = await queueStatus(user.id);
  return NextResponse.json(result);
}
