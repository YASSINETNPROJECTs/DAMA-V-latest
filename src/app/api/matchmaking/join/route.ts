import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/session";
import { joinQueue, QueueError } from "@/features/competitive/queue";
import { isMatchmakingEnabled } from "@/features/admin/settings";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ stake: z.number().int().min(0) });

// POST /api/matchmaking/join — enter the queue at a stake (admins can disable).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  if (!(await isMatchmakingEnabled())) {
    return NextResponse.json(
      { error: "Matchmaking is temporarily disabled", code: "MATCHMAKING_DISABLED" },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", code: "BAD_REQUEST" }, { status: 400 });
  }

  try {
    const result = await joinQueue(user.id, parsed.data.stake);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof QueueError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}
