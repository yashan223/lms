"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { LMSEventType, LMSEventPayload } from "@/lib/events";

interface UseRealtimeSyncOptions {
  events?: LMSEventType[];
  onSync: (payload?: LMSEventPayload) => void | Promise<void>;
  enabled?: boolean;
}

function getWebSocketUrl(): string {
  if (typeof window === "undefined") return "";
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
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

    if (sinceRef.current === 0) {
      sinceRef.current = Date.now();
    }

    let ws: WebSocket | null = null;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let isCleanedUp = false;
    let reconnectAttempts = 0;
    let useSseFallback = false;

    // ─── WebSocket Connection Logic ───────────────────────────────────────────
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
          useSseFallback = false;

          // Subscribe to requested events
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

          // Heartbeat ping every 25 seconds to keep connection alive
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

            // Ignore heartbeat and system ack messages
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
            // If WebSocket fails 3 times in a row, temporarily switch to SSE fallback
            if (reconnectAttempts >= 3) {
              console.warn("[ws] Multiple connection failures, switching to SSE fallback");
              useSseFallback = true;
              connectSse();
              return;
            }

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
          if (reconnectAttempts >= 3) {
            useSseFallback = true;
            connectSse();
          } else {
            reconnectTimeout = setTimeout(connectWs, 2000);
          }
        }
      }
    }

    // ─── SSE Fallback (If WebSocket is blocked by proxy/firewall) ──────────────
    function connectSse() {
      if (isCleanedUp) return;

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
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Periodically retry WebSocket to recover primary transport
          if (!isCleanedUp) {
            reconnectTimeout = setTimeout(() => {
              useSseFallback = false;
              connectWs();
            }, 10000);
          }
        };
      } catch {
        setIsConnected(false);
      }
    }

    // Initiate primary WebSocket connection
    connectWs();

    // ─── Tab Visibility Listener ──────────────────────────────────────────────
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!useSseFallback) {
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            connectWs();
          }
        } else {
          if (!eventSource || eventSource.readyState !== EventSource.OPEN) {
            connectSse();
          }
        }
        triggerSync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCleanedUp = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingInterval) clearInterval(pingInterval);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
      if (eventSource) eventSource.close();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setIsConnected(false);
    };
  }, [enabled, triggerSync]);

  return { isConnected, lastSyncTime, triggerSync };
}
