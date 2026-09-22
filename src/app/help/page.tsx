import type { Metadata } from "next";
import { Card } from "@/components/Card";
import Link from "next/link";

export const metadata: Metadata = { title: "Help" };

const faqs = [
  {
    q: "What is DAMA?",
    a: "DAMA is a competitive esports platform for English draughts (checkers). You play rated matches, climb the Elo ladder and earn XP levels.",
  },
  {
    q: "Is real money involved?",
    a: "No. This is a demo build. Stakes, wallets, deposits and withdrawals are SIMULATED demo units. REAL_MONEY_ENABLED is false and there is no way to pay in or cash out.",
  },
  {
    q: "How do matchmaking and ratings work?",
    a: "Pick a stake tier and search. You are paired with an opponent at the same stake within an expanding rating window (hard-capped for fairness). Wins and losses move your Elo rating; everyone starts at 1000.",
  },
  {
    q: "What are the game rules?",
    a: "English draughts on an 8x8 board: men move forward diagonally, kings move both ways, captures are mandatory, multi-jumps must be completed, and a man is crowned on the last row. You win when your opponent has no pieces or no legal move. Full rules are in src/features/game/RULES.md.",
  },
  {
    q: "How do I play on two phones/browsers?",
    a: "Use Play → Demo match, then open the match link in a second browser signed in as another demo account and take the Black seat.",
  },
  {
    q: "Something is broken — where do I report it?",
    a: "This is a demo project. Check the README in the repository for the phase roadmap and current feature set.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-6">
      <h1 className="text-2xl font-bold text-white">Help</h1>
      {faqs.map((f) => (
        <Card key={f.q} title={f.q}>
          <p className="text-sm text-slate-400">{f.a}</p>
        </Card>
      ))}
      <p className="text-center text-xs text-slate-600">
        <Link href="/responsible-play" className="text-accent hover:underline">
          Responsible play
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="text-accent hover:underline">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy
        </Link>
      </p>
    </div>
  );
}
