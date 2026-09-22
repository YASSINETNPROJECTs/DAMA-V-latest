import { Board } from "@/components/Board";

// A dramatic mid-game position for the landing hero (static, decorative).
const POSITION: number[] = (() => {
  const b = new Array<number>(64).fill(0);
  // gold (black) army pressing forward
  b[1] = 4; b[3] = 3; b[8] = 3; b[10] = 4; b[12] = 3; b[17] = 3; b[21] = 4;
  // cyan (white) army with a king ready to strike
  b[51] = 1; b[53] = 1; b[54] = 1; b[58] = 2; b[62] = 1;
  return b;
})();

export function HeroBoard() {
  return (
    <div className="animate-fade-up">
      <Board
        board={POSITION}
        lastMove={{ from: 53, to: 58 }}
        className="mx-auto w-full max-w-[440px]"
      />
      <div className="mx-auto mt-4 flex w-full max-w-[440px] items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.22em]">
        <span className="text-gold">Grandmaster tier</span>
        <span className="text-slate-500">DAMA Arena</span>
      </div>
    </div>
  );
}
