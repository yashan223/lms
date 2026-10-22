"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { LMSEventType, LMSEventPayload } from "@/lib/events";

interface UseRealtimeSyncOptions {
  events?: LMSEventType[];
  onSync: (payload?: LMSEventPayload) => void | Promise<void>;
  enabled?: boolean;
}

/**
 * Returns the WebSocket endpoint dynamically matching the active host and protocol
 */
function getWebSocketUrl(): string {
  if (typeof window === "undefined") return "";
  const loc = window.location;
  const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${loc.host}/ws`;
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
  const sinceRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPayloadRef = useRef<LMSEventPayload | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Debounced triggerSync collapses rapid burst events (e.g. 5 simultaneous events from an action)
  // into a single clean callback, eliminating race conditions and duplicate fetch cascades.
  const triggerSync = useCallback((payload?: LMSEventPayload) => {
    setLastSyncTime(new Date());
    latestPayloadRef.current = payload;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (callbackRef.current) {
        callbackRef.current(latestPayloadRef.current);
      }
    }, 150);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    if (sinceRef.current === 0) {
      sinceRef.current = Date.now();
    }

    let ws: WebSocket | null = null;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let isCleanedUp = false;
    let reconnectAttempts = 0;

    function connectWs() {
      if (isCleanedUp) return;

      try {
        const wsUrl = getWebSocketUrl();
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isCleanedUp) {
            ws?.close();
            return;
          }
          setIsConnected(true);
          reconnectAttempts = 0;

          // If SSE fallback was active while WS was down, close it now that WS is healthy
          if (eventSource) {
            try {
              eventSource.close();
            } catch {}
            eventSource = null;
          }

          const targetEvents = eventsRef.current;
          if (targetEvents && targetEvents.length > 0) {
            try {
              ws?.send(
                JSON.stringify({
                  type: "SUBSCRIBE",
                  events: targetEvents,
                })
              );
            } catch {}
          }

          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "PING" }));
              } catch {}
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const payload: LMSEventPayload & { authenticated?: boolean } = JSON.parse(
              event.data
            );

            if (payload.timestamp && payload.timestamp > sinceRef.current) {
              sinceRef.current = payload.timestamp;
            }

            if (
              payload.type === "PING" ||
              (payload.type as string) === "PONG" ||
              (payload.type as string) === "CONNECTED" ||
              (payload.type as string) === "SUBSCRIBED"
            ) {
              return;
            }

            const targetEvents = eventsRef.current;
            if (
              !targetEvents ||
              targetEvents.length === 0 ||
              targetEvents.includes(payload.type)
            ) {
              triggerSync(payload);
            }
          } catch (parseErr) {
            console.warn("[ws] Real-time message parse error:", parseErr);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (pingInterval) clearInterval(pingInterval);

          if (!isCleanedUp) {
            reconnectAttempts++;
            // If WebSocket has struggled for multiple attempts, activate SSE as secondary bridge
            if (reconnectAttempts >= 3 && !eventSource) {
              connectSse();
            }

            // Always continue attempting to re-establish primary WebSocket with exponential backoff
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
            reconnectTimeout = setTimeout(connectWs, delay);
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
          try {
            ws?.close();
          } catch {}
        };
      } catch {
        setIsConnected(false);
        if (!isCleanedUp) {
          reconnectAttempts++;
          if (reconnectAttempts >= 3 && !eventSource) {
            connectSse();
          }
          const delay = Math.min(1500 * Math.pow(1.5, reconnectAttempts), 10000);
          reconnectTimeout = setTimeout(connectWs, delay);
        }
      }
    }

    function connectSse() {
      if (isCleanedUp || eventSource) return;

      try {
        const url = `/api/events?since=${sinceRef.current}`;
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const payload: LMSEventPayload = JSON.parse(e.data);
            if (payload.timestamp && payload.timestamp > sinceRef.current) {
              sinceRef.current = payload.timestamp;
            }
            if (payload.type === "PING") return;

            const targetEvents = eventsRef.current;
            if (
              !targetEvents ||
              targetEvents.length === 0 ||
              targetEvents.includes(payload.type)
            ) {
              triggerSync(payload);
            }
          } catch (err) {
            console.warn("[sse] Message parse error:", err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            try {
              eventSource.close();
            } catch {}
            eventSource = null;
          }
        };
      } catch {
        // SSE failure is non-fatal
      }
    }

    connectWs();

    // Instant data fresh-check whenever user returns to or focuses this window/tab
    const handleWindowRecheck = () => {
      if (document.visibilityState === "visible") {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          connectWs();
        }
        triggerSync();
      }
    };

    document.addEventListener("visibilitychange", handleWindowRecheck);
    window.addEventListener("focus", handleWindowRecheck);

    return () => {
      isCleanedUp = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingInterval) clearInterval(pingInterval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close();
        } catch {}
      }
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
      }
      document.removeEventListener("visibilitychange", handleWindowRecheck);
      window.removeEventListener("focus", handleWindowRecheck);
      setIsConnected(false);
    };
  }, [enabled, triggerSync]);

  return { isConnected, lastSyncTime, triggerSync };
}
