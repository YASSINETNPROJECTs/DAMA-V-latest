import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/guards";
import { startDemoMatch } from "@/features/game/actions";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { IconPlay, IconSwords, IconBoard } from "@/components/icons";

export const metadata: Metadata = { title: "Play" };

export default async function PlayPage() {
  await requireUser();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-2">
      <PageHeader
        eyebrow="Choose your arena"
        title="Play Dama"
        subtitle="Rated ladders with escrowed stakes, friendly demo rooms and engine practice."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card glow className="flex flex-col gap-3">
          <IconPlay className="h-7 w-7 text-accent" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">Competitive</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Staked matchmaking. Elo and XP on the line — stakes are escrowed before the game.
            </p>
          </div>
          <Link href="/matchmaking" className="mt-auto">
            <Button className="w-full">Find a rated match</Button>
          </Link>
        </Card>

        <Card className="flex flex-col gap-3">
          <IconSwords className="h-7 w-7 text-slate-300" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">Demo match</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              One link, two browsers. Take White and Black with a friend.
            </p>
          </div>
          <form action={startDemoMatch} className="mt-auto">
            <Button type="submit" variant="secondary" className="w-full">
              Create demo match
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-3">
          <IconBoard className="h-7 w-7 text-slate-300" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">Practice</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Unrated training against the server engine seat.
            </p>
          </div>
          <Link href="/play/test-board" className="mt-auto">
            <Button variant="ghost" className="w-full border border-arena-700">
              Practice vs engine
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
