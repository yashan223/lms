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
  // Track the latest event timestamp so reconnects don't re-deliver old events
  const sinceRef = useRef<number>(Date.now());

  useEffect(() => { callbackRef.current = onSync; }, [onSync]);
  useEffect(() => { eventsRef.current = events; }, [events]);

  const triggerSync = useCallback((payload?: LMSEventPayload) => {
    setLastSyncTime(new Date());
    if (callbackRef.current) {
      callbackRef.current(payload);
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isCleanedUp = false;

    function connect() {
      if (isCleanedUp) return;

      try {
        // Pass current `since` so the server only sends events we haven't seen
        const url = `/api/events?since=${sinceRef.current}`;
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const payload: LMSEventPayload = JSON.parse(e.data);

            // Keep sinceRef up-to-date so reconnects don't miss or duplicate events
            if (payload.timestamp && payload.timestamp > sinceRef.current) {
              sinceRef.current = payload.timestamp;
            }

            if (payload.type === "PING") return;

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
          // Reconnect immediately (server closes after ~25s intentionally)
          if (!isCleanedUp) {
            reconnectTimeout = setTimeout(connect, 500);
          }
        };
      } catch (err) {
        setIsConnected(false);
        if (!isCleanedUp) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    // Re-sync when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!eventSource || eventSource.readyState !== EventSource.OPEN) {
          connect();
        }
        triggerSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCleanedUp = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setIsConnected(false);
    };
  }, [enabled, triggerSync]);

  return { isConnected, lastSyncTime, triggerSync };
}
