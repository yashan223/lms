const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");
const { loadEnvConfig } = require("@next/env");

// Load .env and .env.local configuration
loadEnvConfig(process.cwd());

// Default to production mode on VPS unless explicitly specified as development
const dev = process.env.NODE_ENV === "development" || process.env.npm_lifecycle_event === "dev";
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = dev ? "development" : "production";
}
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("[server] Request handling error:", req.url, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }
  });

  // ─── Real-Time WebSocket Server Setup ─────────────────────────────────────
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();

  global.lmsWsServer = wss;
  global.lmsWsClients = clients;

  // Broadcast function attached globally so lib/events.ts can dispatch instantly
  const broadcastWs = (payload) => {
    if (!clients || clients.size === 0) return;
    const data = JSON.stringify(payload);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        if (!ws.subscribedEvents || ws.subscribedEvents.size === 0 || ws.subscribedEvents.has(payload.type)) {
          try {
            ws.send(data);
          } catch (err) {
            console.warn("[ws] Error broadcasting message to client:", err);
          }
        }
      }
    }
  };

  global.lmsWsBroadcast = broadcastWs;

  // Keep alive heartbeat: pings connected clients every 25 seconds
  const heartbeatInterval = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) {
        clients.delete(ws);
        try {
          ws.terminate();
        } catch {}
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        clients.delete(ws);
      }
    }
  }, 25000);

  if (heartbeatInterval.unref) {
    heartbeatInterval.unref();
  }

  wss.on("connection", (ws, req) => {
    ws.isAlive = true;
    clients.add(ws);

    // Extract user session cookie if present
    try {
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const cookies = {};
        cookieHeader.split(";").forEach((c) => {
          const [k, ...v] = c.trim().split("=");
          if (k) cookies[k.trim()] = decodeURIComponent(v.join("=").trim());
        });
        const sessionCookie = cookies["edupulse_session"];
        if (sessionCookie && sessionCookie.includes(".")) {
          const payloadBase64 = sessionCookie.split(".")[0];
          const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
          const session = JSON.parse(payloadJson);
          if (session && session.exp > Math.floor(Date.now() / 1000)) {
            ws.userId = session.userId;
            ws.role = session.role;
            ws.email = session.email;
          }
        }
      }
    } catch {
      // Ignore invalid session cookies during WS handshake
    }

    // Send connection greeting
    try {
      ws.send(
        JSON.stringify({
          type: "CONNECTED",
          timestamp: Date.now(),
          authenticated: Boolean(ws.userId),
          userId: ws.userId || null,
        })
      );
    } catch {}

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "PING") {
          ws.isAlive = true;
          ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
          return;
        }
        if (msg.type === "SUBSCRIBE" && Array.isArray(msg.events)) {
          ws.subscribedEvents = new Set(msg.events);
          ws.send(
            JSON.stringify({
              type: "SUBSCRIBED",
              events: Array.from(ws.subscribedEvents),
              timestamp: Date.now(),
            })
          );
          return;
        }
      } catch {
        // Ignore unparseable frames
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", (err) => {
      console.warn("[ws] Connection error:", err.message);
      clients.delete(ws);
    });
  });

  // Handle WebSocket HTTP upgrades on /ws and /api/ws
  server.on("upgrade", (req, socket, head) => {
    try {
      const { pathname } = parse(req.url || "", true);
      if (pathname === "/ws" || pathname === "/api/ws") {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      }
      // Leave all other upgrade paths (e.g. Next.js HMR) to Next.js
    } catch (err) {
      console.error("[server] Upgrade exception:", err);
      socket.destroy();
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> EduPulse LMS ready on http://${hostname}:${port} [${dev ? "development" : "production"}]`);
    console.log(`> Native WebSocket server attached at ws://${hostname}:${port}/ws`);
  });

  // Graceful shutdown handling
  const handleShutdown = (signal) => {
    console.log(`\n> Received ${signal}. Closing server gracefully...`);
    clearInterval(heartbeatInterval);
    for (const ws of clients) {
      try {
        ws.close(1001, "Server shutdown");
      } catch {}
    }
    server.close(() => {
      console.log("> Server closed cleanly.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
});
