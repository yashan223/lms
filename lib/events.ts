import { EventEmitter } from "events";

export type LMSEventType =
  | "COURSES_CHANGED"
  | "USERS_CHANGED"
  | "MATERIALS_CHANGED"
  | "EVENTS_CHANGED"
  | "ENROLLMENTS_CHANGED"
  | "TRIALS_CHANGED"
  | "CHAT_MESSAGE"
  | "NOTIFICATIONS_CHANGED"
  | "PING";

export interface LMSEventPayload {
  type: LMSEventType;
  timestamp: number;
  data?: any;
}

const globalForEvents = globalThis as unknown as {
  lmsEventEmitter?: EventEmitter;
};

export const eventEmitter =
  globalForEvents.lmsEventEmitter ?? new EventEmitter();

eventEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== "production") {
  globalForEvents.lmsEventEmitter = eventEmitter;
}

export function broadcastLMSEvent(type: LMSEventType, data?: any) {
  const payload: LMSEventPayload = {
    type,
    timestamp: Date.now(),
    data,
  };
  eventEmitter.emit("lms_event", payload);
}
