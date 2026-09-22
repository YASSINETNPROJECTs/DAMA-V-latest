import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/session";
import { submitMove, GameError } from "@/features/game/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  matchId: z.string().min(1),
  from: z.number().int().min(0).max(63),
  path: z.array(z.number().int().min(0).max(63)).min(1).max(12),
});

// POST /api/game/move — submit one (complete) move. Server validates and
// replies with the position after the human ply AND the engine's reply.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

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
    const view = await submitMove(
      parsed.data.matchId,
      user.id,
      parsed.data.from,
      parsed.data.path
    );
    return NextResponse.json(view);
  } catch (e) {
    if (e instanceof GameError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}
