import { prisma } from "@/lib/prisma";
import { LMSEventPayload } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Vercel function timeout limits:
//   Hobby plan → 30s  →  we use 25s max lifetime
//   Pro plan   → 60s  →  we use 55s max lifetime
// We default to the safe Hobby value. Set VERCEL_MAX_DURATION=55 env var for Pro.
const MAX_LIFETIME_MS = parseInt(process.env.VERCEL_MAX_DURATION ?? "25") * 1000;
const POLL_INTERVAL_MS = 3000;   // DB poll every 3 seconds
const PING_INTERVAL_MS = 20000;  // SSE keepalive every 20 seconds

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Client sends ?since=<epoch_ms> so we only return events it hasn't seen yet
  const sinceParam = url.searchParams.get("since");
  let since = sinceParam ? new Date(parseInt(sinceParam, 10)) : new Date(Date.now() - 5000);

  const encoder = new TextEncoder();

  function encode(payload: LMSEventPayload | { type: string; timestamp: number }) {
    return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const cleanup = () => { closed = true; };
      request.signal.addEventListener("abort", cleanup);

      // ── Initial PING ─────────────────────────────────────────────────────
      controller.enqueue(encode({ type: "PING", timestamp: Date.now() }));

      const deadline = Date.now() + MAX_LIFETIME_MS;

      // ── Polling loop ──────────────────────────────────────────────────────
      while (!closed && Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        if (closed) break;

        try {
          const newEvents = await prisma.systemEvent.findMany({
            where: { createdAt: { gt: since } },
            orderBy: { createdAt: "asc" },
            take: 50,
          });

          for (const ev of newEvents) {
            if (closed) break;
            const payload: LMSEventPayload = {
              type: ev.type as LMSEventPayload["type"],
              timestamp: ev.createdAt.getTime(),
              data: ev.data ?? undefined,
            };
            try {
              controller.enqueue(encode(payload));
            } catch {
              closed = true;
              break;
            }
          }

          if (newEvents.length > 0) {
            since = newEvents[newEvents.length - 1].createdAt;
          }

          // Keepalive PING if no events (prevent proxy timeout)
          if (newEvents.length === 0) {
            const now = Date.now();
            if (now % PING_INTERVAL_MS < POLL_INTERVAL_MS * 2) {
              try {
                controller.enqueue(encode({ type: "PING", timestamp: now }));
              } catch {
                closed = true;
              }
            }
          }
        } catch (dbErr) {
          // DB error — send a ping and keep trying
          console.warn("[events/sse] DB poll error:", dbErr);
          try {
            controller.enqueue(encode({ type: "PING", timestamp: Date.now() }));
          } catch {
            closed = true;
          }
        }
      }

      // ── Graceful close: client will reconnect immediately ─────────────────
      try { controller.close(); } catch {}
      request.signal.removeEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
