import { prisma } from "@/lib/prisma";
import { LMSEventPayload, eventEmitter } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PING_INTERVAL_MS = 20000; // SSE keepalive ping every 20 seconds

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(parseInt(sinceParam, 10)) : new Date(Date.now() - 10000);

  const encoder = new TextEncoder();

  function encode(payload: LMSEventPayload | { type: string; timestamp: number }) {
    return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const cleanup = () => {
        closed = true;
        eventEmitter.removeListener("lms_event", onEvent);
        if (pingTimer) clearInterval(pingTimer);
      };

      request.signal.addEventListener("abort", cleanup);

      // ── Event listener for instant in-process SSE dispatch ───────────────────
      const onEvent = (payload: LMSEventPayload) => {
        if (closed) return;
        try {
          controller.enqueue(encode(payload));
        } catch {
          cleanup();
        }
      };

      eventEmitter.on("lms_event", onEvent);

      // ── Initial PING ─────────────────────────────────────────────────────────
      try {
        controller.enqueue(encode({ type: "PING", timestamp: Date.now() }));
      } catch {
        cleanup();
        return;
      }

      // ── Catch up on any events since `since` timestamp ───────────────────────
      try {
        const missedEvents = await prisma.systemEvent.findMany({
          where: { createdAt: { gt: since } },
          orderBy: { createdAt: "asc" },
          take: 50,
        });

        for (const ev of missedEvents) {
          if (closed) break;
          const payload: LMSEventPayload = {
            type: ev.type as LMSEventPayload["type"],
            timestamp: ev.createdAt.getTime(),
            data: ev.data ?? undefined,
          };
          controller.enqueue(encode(payload));
        }
      } catch (err) {
        console.warn("[events/sse] Error fetching missed events:", err);
      }

      // ── Keepalive Ping Timer ─────────────────────────────────────────────────
      const pingTimer = setInterval(() => {
        if (closed) {
          clearInterval(pingTimer);
          return;
        }
        try {
          controller.enqueue(encode({ type: "PING", timestamp: Date.now() }));
        } catch {
          cleanup();
        }
      }, PING_INTERVAL_MS);
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
