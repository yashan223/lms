/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from "events";
import { prisma } from "@/lib/prisma";

export type LMSEventType =
  | "COURSES_CHANGED"
  | "USERS_CHANGED"
  | "MATERIALS_CHANGED"
  | "EVENTS_CHANGED"
  | "ENROLLMENTS_CHANGED"
  | "ENROLLMENT_REQUESTS_CHANGED"
  | "TRIALS_CHANGED"
  | "CHAT_MESSAGE"
  | "NOTIFICATIONS_CHANGED"
  | "TUTOR_AVAILABILITY_CHANGED"
  | "STUDENT_AVAILABILITY_CHANGED"
  | "AUDIT_LOG_CHANGED"
  | "ATTENDANCE_CHANGED"
  | "PING";

export interface LMSEventPayload {
  type: LMSEventType;
  timestamp: number;
  data?: any;
}

const globalForEvents = globalThis as unknown as {
  lmsEventEmitter?: EventEmitter;
  lmsWsBroadcast?: (payload: LMSEventPayload) => void;
};

export const eventEmitter =
  globalForEvents.lmsEventEmitter ?? new EventEmitter();

eventEmitter.setMaxListeners(500);

// Always bind singleton eventEmitter on globalThis across all environments
globalForEvents.lmsEventEmitter = eventEmitter;

async function writeEventToDb(type: LMSEventType, data?: any): Promise<void> {
  try {
    await prisma.systemEvent.create({
      data: {
        type,
        data: data ?? null,
      },
    });
  } catch (err) {
    console.warn("[events] Failed to record SystemEvent to DB:", err);
  }
}

export function broadcastLMSEvent(type: LMSEventType, data?: any) {
  const payload: LMSEventPayload = {
    type,
    timestamp: Date.now(),
    data,
  };

  // Robustly retrieve WebSocket broadcaster from globalThis / global
  const broadcaster =
    globalForEvents.lmsWsBroadcast ||
    (globalThis as any).lmsWsBroadcast ||
    (typeof global !== "undefined" ? (global as any).lmsWsBroadcast : undefined);

  if (typeof broadcaster === "function") {
    try {
      broadcaster(payload);
    } catch (wsErr) {
      console.warn("[events] WebSocket broadcast dispatch error:", wsErr);
    }
  }

  eventEmitter.emit("lms_event", payload);

  writeEventToDb(type, data).catch(() => {});
}
