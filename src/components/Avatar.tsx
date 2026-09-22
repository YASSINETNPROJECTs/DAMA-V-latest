import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

/** Initial-based avatar with optional presence dot. */
export function Avatar({ name, image, size = "md", online, className }: AvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          className={cn(
            "rounded-full border border-arena-600 object-cover",
            sizes[size]
          )}
        />
      ) : (
        <span
          className={cn(
            "flex items-center justify-center rounded-full border border-accent/30 bg-gradient-to-br from-arena-700 to-arena-900 font-display font-bold text-accent",
            sizes[size]
          )}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      {online !== undefined ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950",
            online ? "bg-win" : "bg-loss"
          )}
          title={online ? "online" : "offline"}
        />
      ) : null}
    </span>
  );
}
