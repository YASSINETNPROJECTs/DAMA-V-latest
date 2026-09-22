import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { leaveQueue } from "@/features/competitive/queue";

export const dynamic = "force-dynamic";

// POST /api/matchmaking/leave — cancel the search.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  leaveQueue(user.id);
  return NextResponse.json({ status: "idle" });
}
