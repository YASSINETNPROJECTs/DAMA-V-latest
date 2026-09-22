import type { Metadata } from "next";
import { requireAdmin } from "@/server/guards";
import { getAdminSettings } from "@/features/admin/settings";
import { saveSettings } from "@/features/admin/actions";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export const metadata: Metadata = { title: "Admin · Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getAdminSettings();
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <Card title="Platform">
        <form action={saveSettings} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="feePercent" className="text-sm font-medium text-slate-300">
              Platform fee (%)
            </label>
            <input
              id="feePercent"
              name="feePercent"
              type="number"
              min={0}
              max={50}
              step={1}
              defaultValue={settings.feePercent}
              className="min-h-[44px] w-full rounded-xl border border-arena-600 bg-arena-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-accent"
            />
            <p className="text-xs text-slate-500">
              Applied at settlement to the pot (both stakes). Integer, 0-50.
            </p>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              name="matchmakingEnabled"
              defaultChecked={settings.matchmakingEnabled}
              className="h-5 w-5 accent-cyan-400"
            />
            Matchmaking enabled
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              name="registrationOpen"
              defaultChecked={settings.registrationOpen}
              className="h-5 w-5 accent-cyan-400"
            />
            Registration open
          </label>

          <Button type="submit" variant="secondary" className="w-full">
            Save settings
          </Button>
        </form>
      </Card>

      <Card title="Feature flags (read-only)">
        <ul className="flex flex-col gap-2 text-sm">
          {flags.map((f) => (
            <li key={f.id} className="flex items-center justify-between">
              <span className="text-slate-300">{f.key}</span>
              <span className={f.enabled ? "text-emerald-400" : "text-slate-500"}>
                {f.enabled ? "on" : "off"}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between border-t border-arena-800 pt-2">
            <span className="text-slate-300">real_money</span>
            <span className="text-red-400">locked off — DEMO only</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
