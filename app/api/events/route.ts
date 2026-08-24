import { eventEmitter, LMSEventPayload } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connect handshake
      const initialPayload: LMSEventPayload = {
        type: "PING",
        timestamp: Date.now(),
        data: { message: "Connected to real-time LMS event stream" },
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`)
      );

      // Event listener for live LMS mutations
      const onEvent = (payload: LMSEventPayload) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // Stream already closed or detached
        }
      };

      eventEmitter.on("lms_event", onEvent);

      // Keep-alive heartbeat every 15 seconds to prevent browser/proxy connection drop
      const interval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "PING", timestamp: Date.now() })}\n\n`
            )
          );
        } catch {
          clearInterval(interval);
          eventEmitter.off("lms_event", onEvent);
        }
      }, 15000);

      // Clean up listeners when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        eventEmitter.off("lms_event", onEvent);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
