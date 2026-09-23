/**
 * DAMA custom server — Next.js + Socket.io on ONE Node process.
 */

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT, 10) || 10000;

// إعداد Next.js بدون تمرير hostname و port مباشرة لمنع تعارض المسارات
const app = next({ dev });
const handle = app.getRequestHandler();

globalThis.__damaIO = null;
globalThis.__damaPresence = new Map();
globalThis.__damaForced = new Map();

function presenceRoom(matchId) {
  if (!globalThis.__damaPresence.has(matchId)) {
    globalThis.__damaPresence.set(matchId, new Map());
  }
  return globalThis.__damaPresence.get(matchId);
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(httpServer, { 
    path: "/socket.io",
    cors: { origin: "*" }
  });
  globalThis.__damaIO = io;

  io.on("connection", (socket) => {
    socket.on("match:join", (payload) => {
      const matchId = typeof payload?.matchId === "string" ? payload.matchId : null;
      if (!matchId) return;
      socket.join(`match:${matchId}`);
      socket.data.damaMatchId = matchId;
      if (typeof payload?.seat === "number") {
        socket.data.damaSeat = payload.seat;
        presenceRoom(matchId).set(payload.seat, { disconnectedAt: null });
        io.to(`match:${matchId}`).emit("match:presence", { seat: payload.seat, connected: true });
      }
      socket.emit("match:joined", { matchId });
    });

    socket.on("disconnecting", () => {
      const matchId = socket.data.damaMatchId;
      const seat = socket.data.damaSeat;
      if (matchId && typeof seat === "number") {
        presenceRoom(matchId).set(seat, { disconnectedAt: Date.now() });
        io.to(`match:${matchId}`).emit("match:presence", { seat, connected: false });
      }
    });
  });

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
