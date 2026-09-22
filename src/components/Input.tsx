import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "min-h-[44px] w-full rounded-xl border bg-arena-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500",
          "outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30",
          error ? "border-red-500" : "border-arena-600",
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
