import type { Metadata } from "next";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "Responsible Play" };

export default function ResponsiblePlayPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Responsible play</h1>
        <p className="mt-1 text-sm text-slate-400">
          DAMA is a skill-based esports platform — not a casino, not a gambling site.
        </p>
      </header>

      <Card title="Demo build — no real money">
        <p className="text-sm text-slate-400">
          Every stake, wallet balance, deposit and withdrawal in this build is a{" "}
          <strong className="text-slate-200">simulated demo unit</strong>. There is no
          purchase, no cash-out and no cryptocurrency. If a future licensed version ever
          enables real stakes, it will be clearly labelled, age-gated and regulated.
        </p>
      </Card>

      <Card title="Healthy habits">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-400">
          <li>Play for skill and fun — treat every stake as practice chips.</li>
          <li>Take breaks; the 5-minute clock already paces each game.</li>
          <li>Never chase losses, in the demo or anywhere else.</li>
          <li>If gaming stops being fun, step away — that always wins.</li>
        </ul>
      </Card>

      <Card title="Fair play">
        <p className="text-sm text-slate-400">
          All moves are validated server-side, results are declared by the server, and every
          admin action is written to an audit log. Collusion, engine abuse in rated play and
          account sharing undermine the ladder — and the ladder is the point.
        </p>
      </Card>
    </div>
  );
}
