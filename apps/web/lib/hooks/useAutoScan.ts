"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAegisStore } from "@/lib/store";
import type { StreamEvent } from "@/lib/types";
import type { ScannedThreat } from "@/app/api/threat/scan/route";

const SCAN_INTERVAL_MS = 75_000; // ~75 seconds (avoids GDELT 429s)

function scoreToThreat(score: number): StreamEvent["threat"] {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function useAutoScan() {
  const { addStreamEvent, setCriticalAlert } = useAegisStore();
  const [scanning, setScanning]   = useState(false);
  const [lastScan, setLastScan]   = useState<Date | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/threat/scan");
      if (!res.ok) return;
      const data = await res.json();
      const threats: ScannedThreat[] = data.threats ?? [];

      // Take top 2 threats and push to stream
      threats.slice(0, 2).forEach((t) => {
        if (t.threatScore < 50) return;
        const event: StreamEvent = {
          id:        t.id,
          type:      t.threatScore >= 75 ? "ALERT" : "UPDATE",
          title:     `[AUTO-SCAN] ${t.category}: ${t.headline.slice(0, 80)}${t.headline.length > 80 ? "…" : ""}`,
          body:      `Source: ${t.source} · Country: ${t.country} · Score: ${t.threatScore}/100${t.keywords.length ? ` · Keywords: ${t.keywords.join(", ")}` : ""}`,
          threat:    scoreToThreat(t.threatScore),
          timestamp: new Date(),
          source:    "AUTONOMOUS SCANNER",
          isNew:     true,
        };
        addStreamEvent(event);

        // Fire the critical alert overlay for high-severity threats
        if (t.threatScore >= 75) {
          setCriticalAlert(event);
        }
      });

      setLastScan(new Date());
      setScanCount(c => c + 1);
    } catch (err) {
      console.warn("[autoScan] error:", err);
    } finally {
      setScanning(false);
    }
  }, [addStreamEvent]);

  useEffect(() => {
    // Initial scan after 10 seconds
    const initial = setTimeout(runScan, 10_000);
    // Recurring scan
    timerRef.current = setInterval(runScan, SCAN_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runScan]);

  return { scanning, lastScan, scanCount };
}
