"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/deposits", label: "Deposits" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/wallet", label: "Wallet settings" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/settings", label: "Platform" },
];

/** Operations console navigation — clearly admin, still DAMA. */
export function AdminTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-arena-800 bg-ink-900/70 p-1.5">
      {tabs.map((t) => {
        const active = t.href === "/admin" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-sm transition",
              active
                ? "bg-arena-700 font-semibold text-white shadow-glow"
                : "text-slate-400 hover:bg-arena-800 hover:text-white"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
