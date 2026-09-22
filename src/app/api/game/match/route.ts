import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { createTestMatch, GameError } from "@/features/game/service";

export const dynamic = "force-dynamic";

// POST /api/game/match — create a TEST match (human WHITE vs engine BLACK).
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  try {
    const view = await createTestMatch(user.id);
    return NextResponse.json(view);
  } catch (e) {
    if (e instanceof GameError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}
