import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { createDemoMatch, RoomError } from "@/features/game/room";

export const dynamic = "force-dynamic";

// POST /api/game/match/demo — create a DEMO match (you = WHITE, BLACK open).
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const view = await createDemoMatch(user.id);
    return NextResponse.json(view);
  } catch (e) {
    if (e instanceof RoomError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}
