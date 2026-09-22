import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { loadRoom } from "@/features/game/room";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const view = await loadRoom(id, user.id);
  if (!view) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json(view);
}
