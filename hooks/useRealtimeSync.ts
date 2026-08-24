"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { LMSEventType, LMSEventPayload } from "@/lib/events";

interface UseRealtimeSyncOptions {
  events?: LMSEventType[];
  onSync: (payload?: LMSEventPayload) => void | Promise<void>;
  enabled?: boolean;
}

export function useRealtimeSync({
  events,
  onSync,
  enabled = true,
}: UseRealtimeSyncOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const callbackRef = useRef(onSync);
  const eventsRef = useRef(events);

  // Keep latest callback reference without triggering reconnection effect
  useEffect(() => {
    callbackRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const triggerSync = useCallback((payload?: LMSEventPayload) => {
    setLastSyncTime(new Date());
    if (callbackRef.current) {
      callbackRef.current(payload);
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    function connect() {
      if (isCleanedUp) return;

      try {
        eventSource = new EventSource("/api/events");

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const payload: LMSEventPayload = JSON.parse(e.data);
            if (payload.type === "PING") {
              return; // Keep-alive ping
            }

            const targetEvents = eventsRef.current;
            if (!targetEvents || targetEvents.length === 0 || targetEvents.includes(payload.type)) {
              triggerSync(payload);
            }
          } catch (parseErr) {
            console.warn("Real-time stream message parse error:", parseErr);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect with a 3-second backoff
          if (!isCleanedUp) {
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        setIsConnected(false);
        if (!isCleanedUp) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    // Also sync whenever user switches back to this browser tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCleanedUp = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setIsConnected(false);
    };
  }, [enabled, triggerSync]);

  return {
    isConnected,
    lastSyncTime,
    triggerSync,
  };
}
