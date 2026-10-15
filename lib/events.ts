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
  | "AUDIT_LOG_CHANGED"
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

if (process.env.NODE_ENV !== "production") {
  globalForEvents.lmsEventEmitter = eventEmitter;
}

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

  if (typeof globalForEvents.lmsWsBroadcast === "function") {
    try {
      globalForEvents.lmsWsBroadcast(payload);
    } catch (wsErr) {
      console.warn("[events] WebSocket broadcast dispatch error:", wsErr);
    }
  }

  eventEmitter.emit("lms_event", payload);

  writeEventToDb(type, data).catch(() => {});
}
