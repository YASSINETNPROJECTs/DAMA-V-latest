import { requireAdmin } from "@/server/guards";
import { AdminTabs } from "./AdminTabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // RBAC gate for every /admin/* page

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
        DAMA · Operations console
      </p>
      <AdminTabs />
      {children}
    </div>
  );
}
