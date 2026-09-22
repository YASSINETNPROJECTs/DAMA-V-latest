import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-xl bg-arena-800",
        "bg-[linear-gradient(90deg,rgba(26,37,64,0.6)_25%,rgba(36,51,86,0.9)_50%,rgba(26,37,64,0.6)_75%)] bg-[length:420px_100%]",
        className
      )}
      aria-hidden="true"
    />
  );
}
