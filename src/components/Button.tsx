import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-ink-950 font-semibold shadow-glow hover:bg-accent-soft active:scale-[0.97]",
  gold:
    "bg-gold text-ink-950 font-semibold shadow-glow-gold hover:bg-gold-soft active:scale-[0.97]",
  secondary:
    "border border-arena-600 bg-arena-800 text-white font-medium hover:border-accent/50 hover:bg-arena-700 active:scale-[0.97]",
  ghost:
    "text-slate-400 hover:bg-arena-800 hover:text-white",
  danger:
    "bg-loss/90 text-white font-medium hover:bg-loss active:scale-[0.97]",
};

const sizes: Record<Size, string> = {
  sm: "min-h-[36px] px-3 py-1.5 text-xs rounded-lg",
  md: "min-h-[44px] px-4 py-2 text-sm rounded-xl",
  lg: "min-h-[52px] px-6 py-3 text-base rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-display tracking-wide transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
