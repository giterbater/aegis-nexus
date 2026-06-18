"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAegisStore } from "@/lib/store";
import type { StreamEvent } from "@/lib/types";

interface UseIntelStreamOptions {
  autoConnect?: boolean;
}

/**
 * Connects to /api/intel/stream (SSE) and pushes events into the Zustand store.
 * Auto-reconnects on disconnect with exponential backoff.
 */
export function useIntelStream({ autoConnect = true }: UseIntelStreamOptions = {}) {
  const addStreamEvent = useAegisStore((s) => s.addStreamEvent);
  const esRef          = useRef<EventSource | null>(null);
  const retryRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount     = useRef(0);
  const MAX_RETRIES    = 10;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource("/api/intel/stream");
    esRef.current = es;

    es.onopen = () => {
      retryCount.current = 0;
    };

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(e.data) as {
          type: string;
          data?: Partial<StreamEvent>;
          message?: string;
        };

        if (msg.type === "event" && msg.data) {
          const raw = msg.data;
          addStreamEvent({
            id:        raw.id        ?? `sse-${Date.now()}`,
            type:      raw.type      ?? "UPDATE",
            title:     raw.title     ?? "",
            body:      raw.body      ?? "",
            threat:    raw.threat,
            timestamp: raw.timestamp ? new Date(raw.timestamp as unknown as string) : new Date(),
            source:    raw.source    ?? "AEGIS",
            isNew:     true,
          });
        }
      } catch { /* malformed frame */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;

      if (retryCount.current < MAX_RETRIES) {
        const delay = Math.min(1000 * 2 ** retryCount.current, 30_000);
        retryCount.current += 1;
        retryRef.current = setTimeout(connect, delay);
      }
    };
  }, [addStreamEvent]);

  const disconnect = useCallback(() => {
    if (retryRef.current) clearTimeout(retryRef.current);
    if (esRef.current)    esRef.current.close();
    esRef.current = null;
  }, []);

  useEffect(() => {
    if (!autoConnect) return;
    connect();
    return disconnect;
  }, [autoConnect, connect, disconnect]);

  return { connect, disconnect };
}
