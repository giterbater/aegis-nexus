"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Send, Loader2, Cpu, Wifi, X, ChevronRight } from "lucide-react";
import { useAegisStore } from "@/lib/store";

interface Message {
  id:        string;
  role:      "user" | "ai" | "system";
  content:   string;
  streaming?: boolean;
  provider?: string;
  tokens?:  number;
  ts:       Date;
}

const BOOT_LINES = [
  "AEGIS NEXUS INTELLIGENCE TERMINAL v4.2.1",
  "Copyright © AEGIS Defense Systems — CLASSIFIED",
  "──────────────────────────────────────────────────────",
  "Initializing secure channel...",
  "Loading intelligence feeds...",
  "Claude multi-agent pipeline: ONLINE",
  "GDELT live feed: CONNECTED",
  "──────────────────────────────────────────────────────",
  'Type a query or use a command. Type "/help" for options.',
];

const SUGGESTIONS = [
  "/briefing",
  "/threat eastern europe",
  "/analyze china south sea",
  "/threat scan",
  "/status",
  "/cyber threats",
  "What is the current threat level in the Middle East?",
  "Summarize recent military activity in Ukraine",
  "Who are the top state-sponsored APT groups right now?",
];

const HELP_TEXT = `
AEGIS TERMINAL — COMMAND REFERENCE
──────────────────────────────────────────────────────
/briefing          — Executive intelligence briefing (last 24h)
/threat [region]   — Threat assessment for a region
/analyze [topic]   — Deep analysis on any intelligence topic
/cyber threats     — Current cyber threat landscape
/status            — System and pipeline status
/clear             — Clear terminal
/help              — Show this help

Or ask any natural language question. Claude will respond
with a live-streamed intelligence briefing using real-world
context from GDELT and global event feeds.
──────────────────────────────────────────────────────
`.trim();

export function CommandTerminal() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const [booted, setBooted]       = useState(false);
  const [bootLine, setBootLine]   = useState(0);
  const [history, setHistory]     = useState<string[]>([]);
  const [histIdx, setHistIdx]     = useState(-1);
  const [provider, setProvider]   = useState<string>("—");
  const inputRef    = useRef<HTMLInputElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const { geoEvents, streamEvents } = useAegisStore();

  // ── Boot sequence ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (booted) return;
    let i = 0;
    const tick = setInterval(() => {
      setBootLine(i + 1);
      i++;
      if (i >= BOOT_LINES.length) {
        clearInterval(tick);
        setTimeout(() => setBooted(true), 300);
      }
    }, 60);
    return () => clearInterval(tick);
  }, [booted]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bootLine]);

  // ── Build context from live data ───────────────────────────────────────────
  const buildContext = useCallback(() => {
    const top5Events = geoEvents.slice(0, 5).map(e =>
      `[${e.threat}] ${e.category} — ${e.title} (${e.country}): ${e.summary}`
    ).join("\n");

    const top3Stream = streamEvents.slice(0, 3).map(e =>
      `[${e.type}] ${e.title}: ${e.body}`
    ).join("\n");

    return `ACTIVE GLOBAL EVENTS:\n${top5Events}\n\nRECENT ALERTS:\n${top3Stream}`;
  }, [geoEvents, streamEvents]);

  // ── Send message ───────────────────────────────────────────────────────────
  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || streaming) return;

    // Local commands
    if (text === "/clear") {
      setMessages([]);
      setInput("");
      return;
    }
    if (text === "/help") {
      const id = `msg-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        { id: `u-${id}`, role: "user", content: text, ts: new Date() },
        { id: `a-${id}`, role: "ai",   content: HELP_TEXT, ts: new Date() },
      ]);
      setInput("");
      return;
    }
    if (text === "/status") {
      setMessages(prev => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: text, ts: new Date() },
        { id: `a-${Date.now()}`, role: "system", content:
          `SYSTEM STATUS\n──────────────────\nPIPELINE:    NOMINAL\nAI PROVIDER: ${provider}\nGDELT FEED:  CONNECTED\nEVENTS:      ${geoEvents.length} ACTIVE\nSTREAM:      LIVE\nAGENTS:      4/12 ACTIVE`,
          ts: new Date() },
      ]);
      setInput("");
      return;
    }

    // Remap shortcuts to full queries
    let query = text;
    if (text === "/briefing") query = "Provide a concise executive intelligence briefing covering the most critical global threats and events in the last 24 hours, prioritized by severity.";
    else if (text.startsWith("/threat ")) query = `Provide a detailed threat assessment for: ${text.slice(8)}. Include escalation risk, key actors, and recommended monitoring priorities.`;
    else if (text.startsWith("/analyze ")) query = `Conduct a deep intelligence analysis on: ${text.slice(9)}. Include geopolitical context, key actors, threat indicators, and confidence assessment.`;
    else if (text === "/cyber threats") query = "Summarize the current cyber threat landscape: active APT groups, major campaigns, critical vulnerabilities being exploited, and state-sponsored actors.";
    else if (text === "/threat scan") query = "Based on the current active events, identify the top 5 most critical threat indicators and rate escalation probability for each.";

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text, ts: new Date() };
    const aiId = `a-${Date.now()}`;
    const aiMsg: Message   = { id: aiId, role: "ai", content: "", streaming: true, ts: new Date() };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setHistory(prev => [text, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setInput("");
    setStreaming(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/terminal/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, context: buildContext() }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "chunk") {
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, content: m.content + evt.text } : m
              ));
            } else if (evt.type === "done") {
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, streaming: false, provider: evt.provider, tokens: evt.outputTokens } : m
              ));
              setProvider(evt.provider ?? "—");
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: m.content || "⚠ Connection lost. Check AI provider.", streaming: false } : m
        ));
      }
    } finally {
      setStreaming(false);
      setMessages(prev => prev.map(m =>
        m.id === aiId && m.streaming ? { ...m, streaming: false } : m
      ));
    }
  }, [streaming, buildContext, geoEvents.length, provider]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { send(input); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      setInput(history[next] ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? "" : history[next]);
    }
  };

  const stop = () => { abortRef.current?.abort(); };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-aegis-bg/80" onClick={() => inputRef.current?.focus()}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-aegis-border shrink-0 bg-aegis-panel/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-aegis-cyan" />
          <span className="text-[11px] font-mono font-bold text-aegis-cyan uppercase tracking-widest">
            AEGIS TERMINAL
          </span>
          <span className="text-[8px] font-mono text-aegis-text-dim border border-aegis-border px-1.5 py-0.5 rounded-sm">
            CLASSIFIED
          </span>
        </div>
        <div className="flex items-center gap-3">
          {provider !== "—" && (
            <span className="flex items-center gap-1 text-[8px] font-mono text-aegis-text-secondary">
              <Cpu className="w-3 h-3 text-aegis-purple" />
              {provider.toUpperCase()}
            </span>
          )}
          <span className="flex items-center gap-1 text-[8px] font-mono text-aegis-green">
            <Wifi className="w-3 h-3" />
            SECURE CHANNEL
          </span>
        </div>
      </div>

      {/* ── Output ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 font-mono text-[11px]">

        {/* Boot sequence */}
        {BOOT_LINES.slice(0, bootLine).map((line, i) => (
          <div key={i} className={`leading-relaxed ${
            i === 0 ? "text-aegis-cyan font-bold text-sm" :
            i === 2 || i === 7 ? "text-aegis-border" :
            "text-aegis-text-secondary"
          }`}>
            {line}
          </div>
        ))}

        {/* Messages */}
        {booted && messages.map((msg) => (
          <div key={msg.id} className="space-y-1">
            {msg.role === "user" && (
              <div className="flex items-start gap-2">
                <span className="text-aegis-amber shrink-0">▶</span>
                <span className="text-aegis-amber">{msg.content}</span>
              </div>
            )}
            {(msg.role === "ai" || msg.role === "system") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pl-4 border-l border-aegis-cyan/30"
              >
                <pre className="whitespace-pre-wrap text-aegis-text-primary leading-relaxed font-mono text-[11px]">
                  {msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-2 h-3 bg-aegis-cyan animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </pre>
                {!msg.streaming && msg.provider && (
                  <div className="flex items-center gap-3 mt-1 pt-1 border-t border-aegis-border/40">
                    <span className="text-[8px] text-aegis-text-dim">{msg.provider.toUpperCase()}</span>
                    {msg.tokens && <span className="text-[8px] text-aegis-text-dim">{msg.tokens} tokens</span>}
                    <span className="text-[8px] text-aegis-text-dim">{msg.ts.toLocaleTimeString()}</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions ────────────────────────────────────────────────────── */}
      {booted && messages.length === 0 && (
        <div className="px-4 pb-2 shrink-0">
          <div className="text-[8px] font-mono text-aegis-text-dim mb-1.5 uppercase tracking-wider">SUGGESTED QUERIES</div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); send(s); }}
                className="text-[9px] font-mono text-aegis-cyan/80 border border-aegis-cyan/20 bg-aegis-cyan/5 hover:bg-aegis-cyan/10 hover:border-aegis-cyan/40 px-2 py-0.5 rounded-sm transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-aegis-border shrink-0 bg-aegis-panel/40">
        <span className="text-aegis-amber font-mono text-[11px] shrink-0">AEGIS ▶</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={booted ? "Enter query or /command…" : "Initializing…"}
          disabled={!booted || streaming}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-aegis-text-primary font-mono text-[11px] placeholder-aegis-text-dim focus:outline-none disabled:opacity-40"
        />
        {streaming ? (
          <button onClick={stop} className="flex items-center gap-1 text-[9px] font-mono text-aegis-red border border-aegis-red/40 px-2 py-1 rounded-sm hover:bg-aegis-red/10 shrink-0">
            <X className="w-3 h-3" />STOP
          </button>
        ) : (
          <button onClick={() => send(input)} disabled={!input.trim() || !booted}
            className="text-aegis-cyan disabled:opacity-30 hover:text-aegis-cyan/80 shrink-0 transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
