/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from "events";
import { prisma } from "@/lib/prisma";

export type LMSEventType =
  | "COURSES_CHANGED"
  | "USERS_CHANGED"
  | "MATERIALS_CHANGED"
  | "EVENTS_CHANGED"
  | "ENROLLMENTS_CHANGED"
  | "TRIALS_CHANGED"
  | "CHAT_MESSAGE"
  | "NOTIFICATIONS_CHANGED"
  | "TUTOR_AVAILABILITY_CHANGED"
  | "STUDENT_AVAILABILITY_CHANGED"
  | "PING";

export interface LMSEventPayload {
  type: LMSEventType;
  timestamp: number;
  data?: any;
}

// ─── In-process emitter ───────────────────────────────────────────────────
const globalForEvents = globalThis as unknown as {
  lmsEventEmitter?: EventEmitter;
  lmsWsBroadcast?: (payload: LMSEventPayload) => void;
};

export const eventEmitter =
  globalForEvents.lmsEventEmitter ?? new EventEmitter();

eventEmitter.setMaxListeners(500);

if (process.env.NODE_ENV !== "production") {
  globalForEvents.lmsEventEmitter = eventEmitter;
}

// ─── DB writer (Audit & cross-process persistence) ────────────────────────
async function writeEventToDb(type: LMSEventType, data?: any): Promise<void> {
  try {
    await prisma.systemEvent.create({
      data: {
        type,
        data: data ?? null,
      },
    });
  } catch (err) {
    // Non-fatal — in-memory and WebSocket broadcasts are already dispatched
    console.warn("[events] Failed to record SystemEvent to DB:", err);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────
export function broadcastLMSEvent(type: LMSEventType, data?: any) {
  const payload: LMSEventPayload = {
    type,
    timestamp: Date.now(),
    data,
  };

  // 1. Direct WebSocket broadcast to all connected clients (instant 0ms dispatch)
  if (typeof globalForEvents.lmsWsBroadcast === "function") {
    try {
      globalForEvents.lmsWsBroadcast(payload);
    } catch (wsErr) {
      console.warn("[events] WebSocket broadcast dispatch error:", wsErr);
    }
  }

  // 2. In-process EventEmitter (for local listeners / SSE routes)
  eventEmitter.emit("lms_event", payload);

  // 3. Persist to DB asynchronously for history & offline clients
  writeEventToDb(type, data).catch(() => {});
}
