import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/guards";
import { loadRoom } from "@/features/game/room";
import { MatchRoomClient } from "./MatchRoomClient";

export const metadata: Metadata = { title: "Match" };

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const view = await loadRoom(id, user.id);
  if (!view) notFound();

  return (
    <div className="mx-auto max-w-lg py-2">
      <MatchRoomClient matchId={id} initial={view} />
    </div>
  );
}

