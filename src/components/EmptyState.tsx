import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
}

/** Deliberate, polished empty state — never a bare "nothing here". */
export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-arena-700 bg-arena-800 text-slate-500">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
          <path d="M8.5 3.5v17M15.5 3.5v17M3.5 8.5h17M3.5 15.5h17" opacity="0.4" />
        </svg>
      </div>
      <p className="font-display text-sm font-semibold text-white">{title}</p>
      {body ? <p className="max-w-xs text-xs text-slate-500">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
