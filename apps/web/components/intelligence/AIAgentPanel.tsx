"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Cpu, CheckCircle, Loader2, AlertCircle, Pause,
  Play, StopCircle, Zap, Database, Brain,
} from "lucide-react";
import { useAegisStore } from "@/lib/store";
import { useAgentAnalysis, type AnalysisStage } from "@/lib/hooks/useAgentAnalysis";
import { useProviders } from "@/lib/hooks/useProviders";
import { cn, threatColor } from "@/lib/utils";
import type { AIAgent } from "@/lib/types";

const STATUS_CONFIG = {
  ACTIVE:    { icon: Cpu,         color: "text-aegis-cyan",   bg: "bg-aegis-cyan/10",   dot: "bg-aegis-cyan",   label: "ACTIVE" },
  ANALYZING: { icon: Loader2,     color: "text-aegis-purple", bg: "bg-aegis-purple/10", dot: "bg-aegis-purple", label: "ANALYZING" },
  IDLE:      { icon: Pause,       color: "text-aegis-text-secondary", bg: "bg-aegis-panel", dot: "bg-aegis-text-dim", label: "IDLE" },
  COMPLETE:  { icon: CheckCircle, color: "text-aegis-green",  bg: "bg-aegis-green/10",  dot: "bg-aegis-green",  label: "COMPLETE" },
  ERROR:     { icon: AlertCircle, color: "text-aegis-red",    bg: "bg-aegis-red/10",    dot: "bg-aegis-red",    label: "ERROR" },
};

const STAGE_LABELS: Record<AnalysisStage, string> = {
  research: "DEEP RESEARCH",
  risk:     "RISK MODEL",
  summary:  "EXEC BRIEF",
};

const STAGE_ICONS: Record<AnalysisStage, React.ElementType> = {
  research: Brain,
  risk:     Zap,
  summary:  Database,
};

export function AIAgentPanel() {
  const { agents, selectedEventId, geoEvents } = useAegisStore();
  const { state, analyze, cancel, reset }       = useAgentAnalysis();
  const { status: providerStatus }              = useProviders();

  const selectedEvent = geoEvents.find((e) => e.id === selectedEventId) ?? null;

  const canAnalyze = Boolean(selectedEvent) && !state.running;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-aegis-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-3 h-3 text-aegis-purple" />
          <span className="text-[10px] font-mono text-aegis-purple uppercase tracking-widest">
            AUTONOMOUS AGENTS
          </span>
        </div>

        {/* Provider badge */}
        <div className="flex items-center gap-1.5">
          {providerStatus && (
            <span className={cn(
              "text-[8px] font-mono px-1.5 py-0.5 rounded-sm border",
              providerStatus.active === "anthropic"
                ? "text-aegis-purple border-aegis-purple/30 bg-aegis-purple/10"
                : providerStatus.active === "ollama"
                ? "text-aegis-amber border-aegis-amber/30 bg-aegis-amber/10"
                : "text-aegis-text-dim border-aegis-border",
            )}>
              {providerStatus.active === "anthropic"
                ? `✦ ${providerStatus.anthropic.model}`
                : providerStatus.active === "ollama"
                ? `⬡ OLLAMA`
                : "NO MODEL"}
            </span>
          )}
          <span className="text-[9px] font-mono text-aegis-text-secondary">
            {agents.filter((a) => a.status === "ACTIVE" || a.status === "ANALYZING").length} RUNNING
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Live Analysis Section ─────────────────────────────────────────── */}
        <div className="border-b border-aegis-border p-2 space-y-2 shrink-0">

          {/* Event target selector */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              {selectedEvent ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: threatColor(selectedEvent.threat), boxShadow: `0 0 4px ${threatColor(selectedEvent.threat)}` }}
                  />
                  <span className="text-[10px] font-mono text-aegis-text-primary truncate">
                    {selectedEvent.title}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-mono text-aegis-text-dim italic">
                  Select an event on the map to analyze
                </span>
              )}
            </div>

            {/* Action button */}
            {state.running ? (
              <button
                onClick={cancel}
                className="flex items-center gap-1 text-[9px] font-mono text-aegis-red border border-aegis-red/30 px-2 py-1 rounded-sm hover:bg-aegis-red/10 transition-colors shrink-0"
              >
                <StopCircle className="w-3 h-3" /> STOP
              </button>
            ) : state.results.length > 0 ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={reset}
                  className="text-[9px] font-mono text-aegis-text-secondary border border-aegis-border px-2 py-1 rounded-sm hover:bg-aegis-panel transition-colors shrink-0"
                >
                  CLEAR
                </button>
                {selectedEvent && (
                  <button
                    onClick={() => analyze(selectedEvent)}
                    className="flex items-center gap-1 text-[9px] font-mono text-aegis-cyan border border-aegis-cyan/30 px-2 py-1 rounded-sm hover:bg-aegis-cyan/10 transition-colors shrink-0"
                  >
                    <Play className="w-3 h-3" /> RE-RUN
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => selectedEvent && analyze(selectedEvent)}
                disabled={!canAnalyze}
                className={cn(
                  "flex items-center gap-1 text-[9px] font-mono border px-2 py-1 rounded-sm transition-colors shrink-0",
                  canAnalyze
                    ? "text-aegis-cyan border-aegis-cyan/40 hover:bg-aegis-cyan/10 cursor-pointer"
                    : "text-aegis-text-dim border-aegis-border cursor-not-allowed opacity-50",
                )}
              >
                <Play className="w-3 h-3" /> ANALYZE
              </button>
            )}
          </div>

          {/* Stage progress */}
          {(state.running || state.results.length > 0) && (
            <div className="flex items-center gap-1">
              {(["research", "risk", "summary"] as AnalysisStage[]).map((stage) => {
                const Icon      = STAGE_ICONS[stage];
                const done      = state.results.some((r) => r.stage === stage);
                const active    = state.currentStage === stage;
                const pending   = !done && !active;
                return (
                  <div
                    key={stage}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-1 rounded-sm border text-[8px] font-mono transition-all",
                      done    && "border-aegis-green/30 bg-aegis-green/10 text-aegis-green",
                      active  && "border-aegis-cyan/40 bg-aegis-cyan/10 text-aegis-cyan",
                      pending && "border-aegis-border text-aegis-text-dim",
                    )}
                  >
                    <Icon className={cn("w-2.5 h-2.5", active && "animate-spin")} />
                    {STAGE_LABELS[stage].split(" ")[0]}
                    {done && <span className="text-aegis-green">✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Streaming text */}
          <AnimatePresence>
            {(state.running && state.streamingText) || state.results.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <AnalysisResults state={state} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Error */}
          {state.error && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-aegis-red border border-aegis-red/20 bg-aegis-red/5 rounded-sm px-2 py-1.5">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {state.error}
            </div>
          )}

          {/* Token summary */}
          {state.totalTokens > 0 && !state.running && (
            <div className="flex items-center justify-between text-[9px] font-mono text-aegis-text-dim border-t border-aegis-border/50 pt-1.5">
              <span>
                {state.provider === "anthropic" ? "✦ Anthropic" : "⬡ Ollama"}
                {state.results[0]?.cached && " · cache hit"}
              </span>
              <span className="text-aegis-text-secondary">{state.totalTokens.toLocaleString()} tokens</span>
            </div>
          )}
        </div>

        {/* ── Static Agent Cards ────────────────────────────────────────────── */}
        <div className="p-2 space-y-2">
          {agents.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} />
          ))}
        </div>
      </div>

      {/* Footer stats */}
      <div className="border-t border-aegis-border px-3 py-2 grid grid-cols-3 gap-2 shrink-0">
        <Stat label="TOKENS" value={`${(agents.reduce((s, a) => s + a.tokensUsed, 0) / 1000).toFixed(0)}K`} color="text-aegis-purple" />
        <Stat label="FINDINGS" value={String(agents.reduce((s, a) => s + a.findings.length, 0))} color="text-aegis-cyan" />
        <Stat label="AVG PROG" value={`${Math.round(agents.reduce((s, a) => s + a.progress, 0) / agents.length)}%`} color="text-aegis-green" />
      </div>
    </div>
  );
}

// ── Analysis results accordion ───────────────────────────────────────────────

function AnalysisResults({ state }: { state: ReturnType<typeof useAgentAnalysis>["state"] }) {
  const completed = state.results;
  const streaming = state.running && state.streamingText;

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      {completed.map((result) => (
        <div key={result.stage} className="glass-panel border border-aegis-border rounded-sm overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-aegis-border/50">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-2.5 h-2.5 text-aegis-green" />
              <span className="text-[9px] font-mono text-aegis-green uppercase">{STAGE_LABELS[result.stage]}</span>
            </div>
            <div className="flex items-center gap-2 text-[8px] font-mono text-aegis-text-dim">
              <span>{(result.durationMs / 1000).toFixed(1)}s</span>
              <span>{(result.inputTokens + result.outputTokens).toLocaleString()} tok</span>
              {result.cached && <span className="text-aegis-purple">CACHED</span>}
            </div>
          </div>
          <div className="px-2 py-2 text-[10px] text-aegis-text-secondary leading-relaxed whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
            {result.text}
          </div>
        </div>
      ))}

      {/* Live streaming stage */}
      {streaming && (
        <div className="glass-panel border border-aegis-cyan/20 rounded-sm overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-aegis-border/50">
            <Loader2 className="w-2.5 h-2.5 text-aegis-cyan animate-spin" />
            <span className="text-[9px] font-mono text-aegis-cyan uppercase">
              {state.currentStage ? STAGE_LABELS[state.currentStage] : "THINKING"}
            </span>
            <span className="ml-auto text-[8px] font-mono text-aegis-text-dim animate-pulse">STREAMING</span>
          </div>
          <div className="px-2 py-2 text-[10px] text-aegis-text-secondary leading-relaxed whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
            {state.streamingText}
            <span className="inline-block w-1.5 h-3 bg-aegis-cyan ml-0.5 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Static agent card ────────────────────────────────────────────────────────

function AgentCard({ agent, index }: { agent: AIAgent; index: number }) {
  const config   = STATUS_CONFIG[agent.status];
  const Icon     = config.icon;
  const spinning = agent.status === "ANALYZING";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass-panel border border-aegis-border rounded-sm p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-6 h-6 rounded-sm flex items-center justify-center", config.bg)}>
            <Icon className={cn("w-3.5 h-3.5", config.color, spinning && "animate-spin")} />
          </div>
          <div>
            <span className="text-[11px] font-mono font-medium text-aegis-text-primary block leading-none">{agent.name}</span>
            <span className="text-[9px] font-mono text-aegis-text-secondary leading-none">{agent.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", config.dot)} />
          <span className={cn("text-[9px] font-mono", config.color)}>{config.label}</span>
        </div>
      </div>

      <div className="text-[10px] text-aegis-text-secondary leading-relaxed border-l-2 border-aegis-border pl-2">
        {agent.currentTask}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[9px] font-mono">
          <span className="text-aegis-text-dim">PROGRESS</span>
          <span className={config.color}>{agent.progress}%</span>
        </div>
        <div className="h-1 bg-aegis-border rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                agent.status === "COMPLETE" ? "#10b981"
                : agent.status === "ERROR"   ? "#ef4444"
                : "linear-gradient(90deg, #8b5cf6, #00d9ff)",
              boxShadow: "0 0 6px rgba(0,217,255,0.4)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${agent.progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-aegis-text-dim">
        <span>MODEL: <span className="text-aegis-text-secondary">{agent.model}</span></span>
        <span>{(agent.tokensUsed / 1000).toFixed(1)}K TOKENS</span>
      </div>

      {agent.findings.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-aegis-border/50">
          <span className="text-[8px] font-mono text-aegis-text-dim uppercase tracking-widest">FINDINGS</span>
          {agent.findings.slice(0, 2).map((f, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-aegis-cyan text-[10px] mt-0.5 shrink-0">›</span>
              <span className="text-[10px] text-aegis-text-secondary leading-snug">{f}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <span className={cn("text-sm font-mono font-bold block", color)}>{value}</span>
      <span className="text-[8px] font-mono text-aegis-text-dim uppercase tracking-wider">{label}</span>
    </div>
  );
}
