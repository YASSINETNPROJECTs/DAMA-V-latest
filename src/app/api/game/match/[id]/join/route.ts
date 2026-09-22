import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { joinMatch, RoomError } from "@/features/game/room";

export const dynamic = "force-dynamic";

// POST /api/game/match/[id]/join — claim the open seat as the second player.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // استخراج المعرف بانتظار الوعد
  
  // جلب المستخدم الحالي (هذه الخطوة كانت ناقصة لديك)
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    // استخدام المتغير id المستخرج مباشرة بدلاً من params.id
    const view = await joinMatch(id, user.id);
    return NextResponse.json(view);
  } catch (e) {
    if (e instanceof RoomError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}
