// Bridge between Next route handlers / services and the Socket.io server
// created in server.js. Everything lives on globalThis because there is
// exactly ONE Node process (see server.js).

export interface IOEmitter {
  to(room: string): { emit(event: string, payload: unknown): void };
}

interface PresenceInfo {
  disconnectedAt: number | null;
}

/** Each player gets 5 minutes for the whole game (DEMO). */
export const MATCH_CLOCK_MS = 5 * 60 * 1000;

/**
 * Disconnect timeout (documented DEMO rule): if it is your turn and your
 * socket has been disconnected for more than 60 seconds, your opponent is
 * declared the winner. Presence is in-memory, so a server restart clears it.
 */
export const DISCONNECT_TIMEOUT_MS = 60_000;

const g = globalThis as unknown as {
  __damaIO?: IOEmitter | null;
  __damaPresence?: Map<string, Map<number, PresenceInfo>>;
  __damaForced?: Map<string, number>;
};

export function getIO(): IOEmitter | null {
  return g.__damaIO ?? null;
}

/** Push the fresh room view to every socket in the match room. */
export function broadcastMatch(matchId: string, view: unknown): void {
  getIO()?.to(`match:${matchId}`).emit("match:state", view);
}

export function getPresence(matchId: string): Map<number, PresenceInfo> | undefined {
  return g.__damaPresence?.get(matchId);
}

/** Square the current mover must continue from during a multi-jump (null = free). */
export function getForced(matchId: string): number | null {
  return g.__damaForced?.get(matchId) ?? null;
}

export function setForced(matchId: string, square: number | null): void {
  if (!g.__damaForced) g.__damaForced = new Map();
  if (square === null) g.__damaForced.delete(matchId);
  else g.__damaForced.set(matchId, square);
}
