import { EventEmitter } from "events";
import { PrismaClient } from "@prisma/client";

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

// ─── In-process emitter (dev / local fast-path) ────────────────────────────
const globalForEvents = globalThis as unknown as {
  lmsEventEmitter?: EventEmitter;
};

export const eventEmitter =
  globalForEvents.lmsEventEmitter ?? new EventEmitter();

eventEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  globalForEvents.lmsEventEmitter = eventEmitter;
}

// ─── DB writer (Vercel-compatible cross-process broadcast) ──────────────────
// We use a lightweight Prisma client just for writing events.
// We import dynamically so this module stays tree-shakeable on the client.
let _prismaForEvents: PrismaClient | null = null;

function getEventsPrisma(): PrismaClient {
  if (!_prismaForEvents) {
    _prismaForEvents = new PrismaClient();
  }
  return _prismaForEvents;
}

async function writeEventToDb(type: LMSEventType, data?: any): Promise<void> {
  try {
    const db = getEventsPrisma();
    await db.systemEvent.create({
      data: {
        type,
        data: data ?? null,
      },
    });
  } catch (err) {
    // Non-fatal — local EventEmitter is still the fast path in dev
    console.warn("[events] Failed to write SystemEvent to DB:", err);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────
export function broadcastLMSEvent(type: LMSEventType, data?: any) {
  const payload: LMSEventPayload = {
    type,
    timestamp: Date.now(),
    data,
  };

  // Fast path: in-process emitter (works in dev, and for same-process SSE)
  eventEmitter.emit("lms_event", payload);

  // Vercel path: persist to DB so the polling SSE route sees it cross-process
  // Fire-and-forget — we don't want to block the API response
  writeEventToDb(type, data).catch(() => {});
}
