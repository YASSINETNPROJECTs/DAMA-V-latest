import type { Metadata } from "next";
import { requireAdmin } from "@/server/guards";
import { listUsers } from "@/features/admin/service";
import { setUserStatus } from "@/features/admin/actions";
import { Card } from "@/components/Card";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Users" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/20 text-emerald-400",
  SUSPENDED: "bg-gold/20 text-gold",
  BANNED: "bg-red-500/20 text-red-400",
};

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-white">Users</h1>
      {users.map((u) => (
        <Card key={u.id} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {u.username}{" "}
                <span className="text-xs font-normal text-slate-500">
                  {u.email} · {formatNumber(u.rating)} · {u.role}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {u.stats?.matchesPlayed ?? 0} matches · joined{" "}
                {u.createdAt.toLocaleDateString("en-US")}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[u.status]}`}
            >
              {u.status}
            </span>
          </div>
          {u.id !== admin.id ? (
            <form action={setUserStatus} className="mt-3 flex gap-2">
              <input type="hidden" name="targetId" value={u.id} />
              <button
                type="submit"
                name="status"
                value="ACTIVE"
                className="rounded-lg bg-arena-700 px-3 py-1.5 text-xs text-white hover:bg-arena-600"
              >
                Activate
              </button>
              <button
                type="submit"
                name="status"
                value="SUSPENDED"
                className="rounded-lg bg-gold/20 px-3 py-1.5 text-xs text-gold hover:bg-gold/30"
              >
                Suspend
              </button>
              <button
                type="submit"
                name="status"
                value="BANNED"
                className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/30"
              >
                Ban
              </button>
            </form>
          ) : (
            <p className="mt-3 text-xs text-slate-600">This is you.</p>
          )}
        </Card>
      ))}
    </div>
  );
}
