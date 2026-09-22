import type { Metadata } from "next";
import { requireUser } from "@/server/guards";
import { competitiveConfig } from "@/config/competitive";
import { getAvailableBalance, getDefaultCurrency } from "@/features/finance/service";
import { MatchmakingClient } from "./MatchmakingClient";

export const metadata: Metadata = { title: "Find Match" };

export default async function MatchmakingPage() {
  const user = await requireUser();
  const currency = await getDefaultCurrency();
  const available = await getAvailableBalance(user.id, currency);

  return (
    <div className="mx-auto max-w-2xl py-2">
      <MatchmakingClient
        initialStakes={[...competitiveConfig.stakes]}
        availableBalance={available}
        currency={currency}
        initialRating={user.rating}
        initialLevel={user.level}
        feePercent={competitiveConfig.feePercent}
        fairnessCap={competitiveConfig.matchmaking.fairnessCap}
        stepSeconds={competitiveConfig.matchmaking.stepSeconds}
      />
    </div>
  );
}
