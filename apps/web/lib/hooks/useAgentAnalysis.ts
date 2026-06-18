"use client";

import { useState, useCallback, useRef } from "react";
import type { GeoEvent } from "@/lib/types";

export type AnalysisStage = "research" | "risk" | "summary";

export interface StageResult {
  stage: AnalysisStage;
  text: string;
  model: string;
  provider: "anthropic" | "ollama";
  inputTokens: number;
  outputTokens: number;
  cached: boolean;
  durationMs: number;
}

export interface AgentAnalysisState {
  running: boolean;
  currentStage: AnalysisStage | null;
  streamingText: string;
  results: StageResult[];
  error: string | null;
  totalTokens: number;
  provider: "anthropic" | "ollama" | null;
}

const STAGES: AnalysisStage[] = ["research", "risk", "summary"];

/**
 * Hook that drives the multi-stage AI agent pipeline for a given event.
 * Streams each stage sequentially, collecting results.
 */
export function useAgentAnalysis() {
  const [state, setState] = useState<AgentAnalysisState>({
    running: false,
    currentStage: null,
    streamingText: "",
    results: [],
    error: null,
    totalTokens: 0,
    provider: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (event: GeoEvent) => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setState({
      running: true,
      currentStage: "research",
      streamingText: "",
      results: [],
      error: null,
      totalTokens: 0,
      provider: null,
    });

    const allResults: StageResult[] = [];

    for (const stage of STAGES) {
      if (abort.signal.aborted) break;

      setState((prev) => ({
        ...prev,
        currentStage: stage,
        streamingText: "",
      }));

      const startMs = Date.now();
      let accumulated = "";
      let finalMeta: Omit<StageResult, "stage" | "text" | "durationMs"> | null = null;

      try {
        const res = await fetch("/api/agents/analyze", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ event, stage }),
          signal:  abort.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) throw new Error("No response body");

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text  = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const msg = JSON.parse(raw) as {
                type: string;
                text?: string;
                model?: string;
                provider?: "anthropic" | "ollama";
                inputTokens?: number;
                outputTokens?: number;
                cached?: boolean;
                message?: string;
              };

              if (msg.type === "chunk" && msg.text) {
                accumulated += msg.text;
                setState((prev) => ({ ...prev, streamingText: accumulated }));
              } else if (msg.type === "done") {
                finalMeta = {
                  model:        msg.model        ?? "unknown",
                  provider:     msg.provider     ?? "ollama",
                  inputTokens:  msg.inputTokens  ?? 0,
                  outputTokens: msg.outputTokens ?? 0,
                  cached:       msg.cached       ?? false,
                };
                setState((prev) => ({
                  ...prev,
                  provider: finalMeta!.provider,
                }));
              } else if (msg.type === "error") {
                throw new Error(msg.message ?? "Stage failed");
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.name !== "SyntaxError") throw parseErr;
            }
          }
        }

        const result: StageResult = {
          stage,
          text:        accumulated,
          model:       finalMeta?.model        ?? "unknown",
          provider:    finalMeta?.provider     ?? "ollama",
          inputTokens: finalMeta?.inputTokens  ?? 0,
          outputTokens: finalMeta?.outputTokens ?? 0,
          cached:      finalMeta?.cached       ?? false,
          durationMs:  Date.now() - startMs,
        };

        allResults.push(result);
        setState((prev) => ({
          ...prev,
          results: [...allResults],
          totalTokens: prev.totalTokens + result.inputTokens + result.outputTokens,
        }));

      } catch (err) {
        if (abort.signal.aborted) break;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setState((prev) => ({ ...prev, error: msg, running: false }));
        return;
      }
    }

    setState((prev) => ({
      ...prev,
      running: false,
      currentStage: null,
      streamingText: "",
    }));
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, running: false, currentStage: null }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({
      running: false,
      currentStage: null,
      streamingText: "",
      results: [],
      error: null,
      totalTokens: 0,
      provider: null,
    });
  }, []);

  return { state, analyze, cancel, reset };
}
