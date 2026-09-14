import type { IncomingMessage, Server as HttpServer } from "http";
import type { Socket } from "net";
import { parse } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { eventEmitter, LMSEventPayload, LMSEventType } from "./events";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./auth";

export interface LMSWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  role?: string;
  email?: string;
  subscribedEvents?: Set<LMSEventType>;
}

declare global {
  var lmsWsServer: WebSocketServer | undefined;
  var lmsWsClients: Set<LMSWebSocket> | undefined;
  var lmsWsBroadcast: ((payload: LMSEventPayload) => void) | undefined;
}

/**
 * Parses cookies from HTTP cookie header string
 */
function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  const parts = header.split(";");
  for (const part of parts) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key) {
      cookies[key.trim()] = decodeURIComponent(valueParts.join("=").trim());
    }
  }
  return cookies;
}

/**
 * Broadcast an LMS event to all connected WebSocket clients matching subscription
 */
export function broadcastToWsClients(payload: LMSEventPayload): void {
  const clients = globalThis.lmsWsClients;
  if (!clients || clients.size === 0) return;

  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      // If client has subscribed to specific events, respect filter
      if (
        !client.subscribedEvents ||
        client.subscribedEvents.size === 0 ||
        client.subscribedEvents.has(payload.type)
      ) {
        try {
          client.send(data);
        } catch (err) {
          console.warn("[ws] Error sending event to client:", err);
        }
      }
    }
  }
}

// Register global broadcast function for lib/events.ts
globalThis.lmsWsBroadcast = broadcastToWsClients;

// Also listen to the in-process EventEmitter
eventEmitter.on("lms_event", (payload: LMSEventPayload) => {
  broadcastToWsClients(payload);
});

/**
 * Returns number of currently active WebSocket connections
 */
export function getActiveWsClientCount(): number {
  return globalThis.lmsWsClients ? globalThis.lmsWsClients.size : 0;
}

/**
 * Initializes and attaches WebSocketServer to an existing Node.js HTTP server.
 * Handles upgrades for `/ws` and `/api/ws`.
 */
export function initWebSocketServer(server: HttpServer): WebSocketServer {
  if (globalThis.lmsWsServer) {
    return globalThis.lmsWsServer;
  }

  const clients = new Set<LMSWebSocket>();
  globalThis.lmsWsClients = clients;

  const wss = new WebSocketServer({ noServer: true });
  globalThis.lmsWsServer = wss;

  // Heartbeat interval to prune dead connections
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

  wss.on("connection", (ws: LMSWebSocket, req: IncomingMessage) => {
    ws.isAlive = true;
    clients.add(ws);

    // Extract authentication if session cookie exists
    try {
      const cookies = parseCookieHeader(req.headers.cookie);
      const sessionToken = cookies[SESSION_COOKIE_NAME];
      if (sessionToken) {
        const session = verifySessionToken(sessionToken);
        if (session) {
          ws.userId = session.userId;
          ws.role = session.role;
          ws.email = session.email;
        }
      }
    } catch {
      // Non-fatal, unauthenticated public real-time connection
    }

    // Send connection handshake acknowledgment
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

    ws.on("message", (rawMessage) => {
      try {
        const text = rawMessage.toString();
        const msg = JSON.parse(text);

        if (msg.type === "PING") {
          ws.isAlive = true;
          ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
          return;
        }

        if (msg.type === "SUBSCRIBE" && Array.isArray(msg.events)) {
          ws.subscribedEvents = new Set(msg.events as LMSEventType[]);
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
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", (err) => {
      console.warn("[ws] Client connection error:", err);
      clients.delete(ws);
    });
  });

  // Attach upgrade handler to the HTTP server
  server.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
    try {
      const { pathname } = parse(req.url || "", true);
      if (pathname === "/ws" || pathname === "/api/ws") {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit("connection", ws, req);
        });
      }
      // If not /ws, we let other upgrade handlers (e.g. Next.js HMR) handle it
    } catch (err) {
      console.error("[ws] HTTP upgrade error:", err);
      socket.destroy();
    }
  });

  return wss;
}
