import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { loadRoom } from "@/features/game/room";

export const dynamic = "force-dynamic";

// GET /api/game/match/[id]/state — full room view (players, clocks, board, moves).
// Used for initial load AND reconnect restore (poll fallback).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // باقي الكود كما هو...

  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const view = await loadRoom(params.id, user.id); // null youSeat = spectator
  if (!view) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json(view);
}
