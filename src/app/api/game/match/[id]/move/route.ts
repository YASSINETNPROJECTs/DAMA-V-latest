import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/session";
import { submitRoomMove, RoomError } from "@/features/game/room";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  from: z.number().int().min(0).max(63),
  to: z.number().int().min(0).max(63),
});

// POST /api/game/match/[id]/move — submit ONE hop { from, to }.
// Server validates, stores, broadcasts. Multi-jump: keep sending hops from
// the forced square until the server frees the turn.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // باقي الكود كما هو...

  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  try {
    const view = await submitRoomMove(params.id, user.id, parsed.data.from, parsed.data.to);
    return NextResponse.json(view);
  } catch (e) {
    if (e instanceof RoomError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}
