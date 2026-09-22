import type { Metadata } from "next";
import { requireAdmin } from "@/server/guards";
import { listAudit } from "@/features/admin/service";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "Admin · Audit" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdmin();
  const entries = await listAudit(150);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-white">Audit log</h1>
      <Card className="p-4">
        <ul className="flex flex-col gap-2">
          {entries.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-0.5 border-b border-arena-800 pb-2 text-xs last:border-0"
            >
              <span className="text-sm font-semibold text-slate-200">{a.action}</span>
              <span className="text-slate-500">
                {a.user?.username ?? "system"} · {a.createdAt.toLocaleString("en-US")}
              </span>
              {a.meta ? (
                <code className="mt-0.5 break-all rounded bg-arena-800 px-2 py-1 text-[10px] text-slate-400">
                  {JSON.stringify(a.meta)}
                </code>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
