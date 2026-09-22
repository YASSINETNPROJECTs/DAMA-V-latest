import type { Metadata } from "next";
import { Card } from "@/components/Card";
import { requireUser } from "@/server/guards";
import { getProfile } from "@/features/users/profile";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div className="flex flex-col gap-6 py-4">
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-arena-700 font-display text-2xl font-bold text-accent">
            {(profile?.displayName ?? user.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {profile?.displayName ?? user.username}
            </h1>
            <p className="text-sm text-slate-400">
              @{user.username} · Level {user.level} · {formatNumber(user.rating)} rating
            </p>
          </div>
        </div>
        {user.bio ? (
          <p className="mt-4 text-sm text-slate-300">{user.bio}</p>
        ) : (
          <p className="mt-4 text-sm italic text-slate-500">
            No bio yet — add one in Settings.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {(
          [
            ["Wins", profile?.stats?.wins ?? 0],
            ["Losses", profile?.stats?.losses ?? 0],
            ["Draws", profile?.stats?.draws ?? 0],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-arena-700 bg-arena-900/80 p-4 text-center"
          >
            <p className="font-display text-2xl font-bold text-white">{value}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <Card title="Rating history">
        <p className="text-sm text-slate-400">
          Current: <span className="text-gold">{formatNumber(profile?.ratingState?.currentRating ?? user.rating)}</span>
          {" · "}Peak: {formatNumber(profile?.ratingState?.peakRating ?? user.rating)}
          {" · "}Rated games: {profile?.ratingState?.gamesRated ?? 0}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Detailed rating charts arrive with the matchmaking phase.
        </p>
      </Card>
    </div>
  );
}
