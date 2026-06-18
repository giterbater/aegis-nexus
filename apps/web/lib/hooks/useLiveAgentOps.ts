"use client";

import { useEffect, useRef } from "react";
import { useAegisStore } from "@/lib/store";
import type { StreamEvent } from "@/lib/types";

const TASKS = [
  "Cross-referencing satellite telemetry with OSINT feed…",
  "Scanning dark-web forums for threat indicators…",
  "Correlating financial flows with known threat actors…",
  "Running NLP sentiment analysis on intercepted comms…",
  "Mapping supply chain anomalies to geopolitical events…",
  "Analysing radio frequency signatures — SIGINT feed…",
  "Validating source reliability against historical accuracy…",
  "Generating predictive threat model for next 72h window…",
  "Cross-checking diplomatic cables with troop movement data…",
  "Scanning for zero-day exploit signatures in telemetry…",
];

const FINDINGS = [
  "Anomalous network traffic detected — 3 IPs flagged for review",
  "Financial transaction cluster linked to known sanctions list",
  "Satellite imagery confirms new construction — coordinates logged",
  "Communications pattern suggests coordinated activity — HIGH CONFIDENCE",
  "Dark-web chatter referencing target region elevated — monitoring",
  "Supply disruption probability increased to 67% within 30-day window",
  "Actor correlation: 2 new aliases linked to existing threat profile",
  "Predictive model updated — East Asia theater probability revised",
  "Zero-day signature match found in 2 recent intrusion attempts",
  "Diplomatic source confirms back-channel communication attempt",
];

export function useLiveAgentOps() {
  const { agents, updateAgentProgress, addStreamEvent } = useAegisStore();
  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      const tick = tickRef.current;

      // Pick a random active agent
      const active = agents.filter(a => a.status === "ACTIVE" || a.status === "ANALYZING");
      if (!active.length) return;

      const agent = active[tick % active.length];

      // Advance progress
      const current = agent.progress;
      const increment = Math.floor(Math.random() * 8) + 2;
      const next = current + increment;

      if (next >= 100) {
        // Agent completes task → log finding, reset progress
        updateAgentProgress(agent.id, 5);

        const finding = FINDINGS[tick % FINDINGS.length];
        const event: StreamEvent = {
          id:        `agent-${agent.id}-${tick}`,
          type:      "AGENT",
          title:     `${agent.name}: ${finding}`,
          body:      `Task completed after ${Math.floor(Math.random() * 8) + 2}m processing. Confidence: ${Math.floor(Math.random() * 25) + 70}%`,
          threat:    Math.random() > 0.6 ? "HIGH" : Math.random() > 0.4 ? "MEDIUM" : "LOW",
          timestamp: new Date(),
          source:    agent.name,
          isNew:     true,
        };
        addStreamEvent(event);
      } else {
        updateAgentProgress(agent.id, next);
      }
    }, 4_500);

    return () => clearInterval(interval);
  }, [agents, updateAgentProgress, addStreamEvent]);
}
