import { cn } from "@/lib/utils";

/**
 * DAMA Board — the visual heart of the product.
 * One premium board renderer shared by the landing hero and the match room.
 * Purely presentational: all rules/validation remain server-side.
 */

export interface LastMove {
  from: number;
  to: number;
}

interface BoardProps {
  board: number[]; // 64 squares, engine encoding (0 empty, 1/2 white, 3/4 black)
  /** Tap handler — omit for decorative (hero) boards. */
  onSquareClick?: (sq: number) => void;
  selected?: number | null;
  forced?: number | null; // mid multi-jump: piece locked here
  legalTargets?: readonly number[]; // first-hop landing squares for the active piece
  captureTargets?: readonly number[]; // subset of legalTargets that are captures
  capturers?: readonly number[]; // squares whose piece has a mandatory capture
  lastMove?: LastMove | null;
  className?: string;
}

const DARK_SQ =
  "linear-gradient(145deg, #1d2d52 0%, #17233f 55%, #131d36 100%)";
const LIGHT_SQ =
  "linear-gradient(145deg, #0e1728 0%, #0a101f 100%)";

const PIECE_BASE_SHADOW =
  "0 6px 14px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.5), inset 0 -5px 9px rgba(0,0,0,0.4), inset 0 3px 5px rgba(255,255,255,0.22)";
const PIECE_SELECTED_SHADOW =
  "0 0 0 3px rgba(34,211,238,0.85), 0 8px 18px rgba(0,0,0,0.6), inset 0 -5px 9px rgba(0,0,0,0.4), inset 0 3px 5px rgba(255,255,255,0.25)";

function pieceBackground(value: number): string {
  const white = value === 1 || value === 2;
  return white
    ? "radial-gradient(circle at 33% 27%, #c9f6ff 0%, #5ee7f7 28%, #22d3ee 55%, #0b7b96 100%)"
    : "radial-gradient(circle at 33% 27%, #fff3c4 0%, #ffd968 28%, #f5c542 55%, #9a6a0a 100%)";
}

function Crown({ white }: { white: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-[55%] w-[55%]", white ? "text-[#083a47]" : "text-[#5b3d05]")}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4 17l1.2-8.2L9 12l3-6.5L15 12l3.8-3.2L20 17H4zm0 1.4h16v1.8H4v-1.8z" />
    </svg>
  );
}

function Piece({ value, selected }: { value: number; selected: boolean }) {
  const white = value === 1 || value === 2;
  const king = value === 2 || value === 4;
  return (
    <span
      className={cn(
        "relative z-10 flex h-[76%] w-[76%] items-center justify-center rounded-full transition-transform duration-150",
        selected && "scale-110"
      )}
      style={{
        background: pieceBackground(value),
        boxShadow: selected ? PIECE_SELECTED_SHADOW : PIECE_BASE_SHADOW,
      }}
    >
      {/* edge definition + face highlight */}
      <span className="pointer-events-none absolute inset-[9%] rounded-full border border-white/25" />
      <span
        className="pointer-events-none absolute inset-[24%] rounded-full opacity-60"
        style={{
          background: "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.5), transparent 65%)",
        }}
      />
      {king ? <Crown white={white} /> : null}
    </span>
  );
}

export function Board({
  board,
  onSquareClick,
  selected = null,
  forced = null,
  legalTargets = [],
  captureTargets = [],
  capturers = [],
  lastMove = null,
  className,
}: BoardProps) {
  const targets = new Set(legalTargets);
  const captures = new Set(captureTargets);
  const mustCapture = new Set(capturers);

  return (
    <div className={cn("relative", className)}>
      {/* ambient glow behind the board */}
      <div
        className="absolute -inset-4 rounded-[2rem] bg-accent/[0.07] blur-2xl"
        aria-hidden="true"
      />
      {/* metallic frame */}
      <div className="relative rounded-[1.4rem] bg-gradient-to-b from-white/15 via-white/5 to-transparent p-[5px] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
        <div className="rounded-[1.15rem] bg-[#070c17] p-2">
          <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-[0.75rem] border border-black/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.6)]">
            {Array.from({ length: 64 }, (_, sq) => {
              const r = Math.floor(sq / 8);
              const c = sq % 8;
              const dark = (r + c) % 2 === 1;
              const value = board[sq] ?? 0;
              const isSel = selected === sq || forced === sq;
              const isLast = lastMove !== null && (lastMove.from === sq || lastMove.to === sq);

              return (
                <button
                  key={sq}
                  type="button"
                  tabIndex={onSquareClick ? 0 : -1}
                  aria-label={onSquareClick ? `square ${sq}` : undefined}
                  onClick={onSquareClick ? () => onSquareClick(sq) : undefined}
                  className={cn(
                    "relative flex items-center justify-center transition-colors duration-100",
                    onSquareClick && "active:brightness-125"
                  )}
                  style={{
                    background: dark ? DARK_SQ : LIGHT_SQ,
                    boxShadow: dark
                      ? "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.35)"
                      : "inset 0 1px 0 rgba(255,255,255,0.03)",
                    minWidth: 40,
                    minHeight: 40,
                  }}
                >
                  {/* surface sheen on playable squares */}
                  {dark ? (
                    <span
                      className="pointer-events-none absolute inset-0 opacity-40"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 20%, rgba(120,160,255,0.10), transparent 60%)",
                      }}
                    />
                  ) : null}

                  {/* last move highlight */}
                  {isLast ? (
                    <span className="pointer-events-none absolute inset-0 bg-accent/15" />
                  ) : null}

                  {/* selected / forced square */}
                  {isSel ? (
                    <span className="pointer-events-none absolute inset-0 bg-accent/20 shadow-[inset_0_0_0_2px_rgba(34,211,238,0.85)]" />
                  ) : null}

                  {/* legal move indicator */}
                  {targets.has(sq) ? (
                    captures.has(sq) ? (
                      <span className="pointer-events-none absolute inset-[12%] z-10 rounded-full border-2 border-dashed border-gold/90" />
                    ) : (
                      <span className="pointer-events-none absolute z-10 h-3 w-3 rounded-full bg-accent/70 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    )
                  ) : null}

                  {/* mandatory-capture hint on the piece itself */}
                  {value !== 0 && mustCapture.has(sq) && !isSel ? (
                    <span className="pointer-events-none absolute right-[8%] top-[8%] z-20 h-2 w-2 rounded-full bg-gold shadow-[0_0_6px_rgba(245,197,66,0.9)]" />
                  ) : null}

                  {value !== 0 ? <Piece value={value} selected={isSel} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
