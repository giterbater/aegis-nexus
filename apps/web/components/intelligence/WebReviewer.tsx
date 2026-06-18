"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Search, CheckCircle2, XCircle, AlertTriangle,
  Star, Zap, BookOpen, Eye, Shield, RefreshCw,
  ChevronRight, ExternalLink, Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewResult {
  overallScore: number;
  verdict: string;
  category: string;
  strongPoints: string[];
  weakPoints: string[];
  scores: {
    contentQuality: number;
    educationalValue: number;
    designUX: number;
    credibility: number;
    accessibility: number;
  };
  educationalNotes: string;
  targetAudience: string;
  recommendation: "HIGHLY RECOMMENDED" | "RECOMMENDED" | "USE WITH CAUTION" | "NOT RECOMMENDED";
}

interface ReviewRecord {
  url: string;
  title: string;
  result: ReviewResult;
  timestamp: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(n: number): string {
  if (n >= 75) return "#10b981";
  if (n >= 50) return "#ffb700";
  if (n >= 30) return "#f97316";
  return "#ef4444";
}

function recColor(rec: string): string {
  if (rec === "HIGHLY RECOMMENDED") return "#10b981";
  if (rec === "RECOMMENDED") return "#00d9ff";
  if (rec === "USE WITH CAUTION") return "#ffb700";
  return "#ef4444";
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        animate={{ strokeDashoffset: circ - fill }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.22} fontWeight="bold" fontFamily="JetBrains Mono, monospace">
        {score}
      </text>
      <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle"
        fill="rgba(160,180,200,0.6)" fontSize={size * 0.09} fontFamily="JetBrains Mono, monospace">
        /100
      </text>
    </svg>
  );
}

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ElementType }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 shrink-0" style={{ color }} />
      <span className="text-[9px] font-mono text-aegis-text-dim w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-aegis-border/40 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
      <span className="text-[9px] font-mono w-8 text-right shrink-0" style={{ color }}>{score}</span>
    </div>
  );
}

function PointList({ items, type }: { items: string[]; type: "strong" | "weak" }) {
  const isStrong = type === "strong";
  const Icon = isStrong ? CheckCircle2 : XCircle;
  const color = isStrong ? "#10b981" : "#ef4444";
  return (
    <div className="space-y-2">
      {items.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: isStrong ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 + 0.4 }}
          className="flex items-start gap-2 text-[10px] font-mono leading-relaxed"
        >
          <Icon className="w-3 h-3 mt-0.5 shrink-0" style={{ color }} />
          <span className="text-aegis-text-secondary">{p}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── History Card ──────────────────────────────────────────────────────────────

function HistoryCard({ record, onReview }: { record: ReviewRecord; onReview: (url: string) => void }) {
  const color = scoreColor(record.result.overallScore);
  const domain = (() => { try { return new URL(record.url).hostname; } catch { return record.url; } })();
  return (
    <button
      onClick={() => onReview(record.url)}
      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/[0.03] border-b border-aegis-border/30 last:border-0 transition-colors text-left group"
    >
      <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
        style={{ background: color + "15", border: `1px solid ${color}30` }}>
        <span className="text-[10px] font-mono font-bold" style={{ color }}>{record.result.overallScore}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono text-aegis-text-primary truncate">{domain}</div>
        <div className="text-[8px] font-mono text-aegis-text-dim truncate">{record.result.category}</div>
      </div>
      <ChevronRight className="w-3 h-3 text-aegis-text-dim group-hover:text-aegis-cyan transition-colors shrink-0" />
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WebReviewer() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [meta, setMeta] = useState<{ title: string; description: string; finalUrl: string } | null>(null);
  const [history, setHistory] = useState<ReviewRecord[]>([]);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const runReview = useCallback(async (targetUrl: string) => {
    const u = targetUrl.trim();
    if (!u) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError("");
    setResult(null);
    setMeta(null);
    setStreamText("");
    setStatus("INITIALISING…");

    try {
      const res = await fetch("/api/review/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value).split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const obj = JSON.parse(line.slice(6));
            if (obj.type === "status") setStatus(obj.message);
            if (obj.type === "meta") setMeta(obj);
            if (obj.type === "chunk") setStreamText(p => p + obj.text);
            if (obj.type === "result") {
              setResult(obj.data);
              setHistory(prev => {
                const entry: ReviewRecord = { url: u, title: obj.data?.title ?? u, result: obj.data, timestamp: new Date() };
                return [entry, ...prev.filter(x => x.url !== u)].slice(0, 10);
              });
            }
            if (obj.type === "error") setError(obj.message);
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(String(e));
    } finally {
      setLoading(false);
      setStatus("");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) runReview(url.trim());
  };

  const domain = (() => { try { return new URL(url.startsWith("http") ? url : "https://" + url).hostname; } catch { return url; } })();

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar: History ── */}
      <div className="w-52 shrink-0 border-r border-aegis-border flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-aegis-border bg-aegis-panel/40 shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-aegis-text-dim" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-aegis-text-dim">Review History</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 px-4">
              <Globe className="w-5 h-5 text-aegis-text-dim" />
              <p className="text-[9px] font-mono text-aegis-text-dim text-center">No sites reviewed yet</p>
            </div>
          ) : (
            history.map((r, i) => <HistoryCard key={i} record={r} onReview={(u) => { setUrl(u); runReview(u); }} />)
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="shrink-0 px-5 py-3 border-b border-aegis-border bg-aegis-panel/20 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Globe className="w-4 h-4 text-aegis-cyan" />
            <span className="text-sm font-display font-semibold text-aegis-text-primary">WEB INTELLIGENCE ANALYZER</span>
            <span className="text-[8px] font-mono text-aegis-text-dim border border-aegis-border px-1.5 py-0.5 rounded-sm">EDUCATIONAL</span>
          </div>
          <div className="flex-1" />
          <span className="text-[8px] font-mono text-aegis-text-dim">POWERED BY OLLAMA / CLAUDE · FOR LEARNING PURPOSES ONLY</span>
        </div>

        {/* URL input */}
        <div className="shrink-0 px-5 py-4 border-b border-aegis-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aegis-text-dim" />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Enter any URL  —  e.g. wikipedia.org  or  https://bbc.com"
                className="w-full bg-aegis-panel border border-aegis-border rounded-sm pl-9 pr-4 py-2.5 text-[11px] font-mono text-aegis-text-primary placeholder-aegis-text-dim focus:outline-none focus:border-aegis-cyan/50 focus:bg-aegis-panel transition-all"
                style={{ caretColor: "#00d9ff" }}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-sm text-[10px] font-mono font-bold transition-all disabled:opacity-40"
              style={{
                background: loading ? "rgba(0,217,255,0.1)" : "rgba(0,217,255,0.15)",
                border: "1px solid rgba(0,217,255,0.4)",
                color: "#00d9ff",
                boxShadow: loading ? "none" : "0 0 12px rgba(0,217,255,0.2)",
              }}
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {loading ? "ANALYSING" : "ANALYSE"}
            </button>
          </form>

          {status && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-aegis-cyan animate-pulse" />
              <span className="text-[9px] font-mono text-aegis-cyan">{status}</span>
            </motion.div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5">

          {/* Error */}
          {error && !loading && (
            <div className="flex items-start gap-3 p-4 rounded-sm border border-aegis-red/30 bg-aegis-red/5">
              <AlertTriangle className="w-4 h-4 text-aegis-red shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-mono font-bold text-aegis-red mb-1">ANALYSIS FAILED</p>
                <p className="text-[10px] font-mono text-aegis-text-secondary">{error}</p>
              </div>
            </div>
          )}

          {/* Loading shimmer */}
          {loading && !result && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-sm border border-aegis-border animate-pulse bg-aegis-panel/30">
                <div className="w-20 h-20 rounded-full bg-aegis-border/30" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-aegis-border/30 rounded w-2/3" />
                  <div className="h-2 bg-aegis-border/20 rounded w-1/2" />
                  <div className="h-2 bg-aegis-border/20 rounded w-3/4" />
                </div>
              </div>
              {/* Streaming text preview */}
              {streamText && (
                <div className="p-3 rounded-sm border border-aegis-border bg-aegis-panel/20">
                  <p className="text-[9px] font-mono text-aegis-text-dim mb-2">AI ANALYSIS STREAM</p>
                  <p className="text-[10px] font-mono text-aegis-cyan/70 leading-relaxed whitespace-pre-wrap break-all">{streamText.slice(0, 500)}<span className="animate-pulse">▋</span></p>
                </div>
              )}
            </div>
          )}

          {/* ── Results ── */}
          <AnimatePresence>
            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >

                {/* Score + Verdict row */}
                <div className="flex items-start gap-5 p-4 rounded-sm border border-aegis-border bg-aegis-panel/30"
                  style={{ boxShadow: `0 0 20px ${scoreColor(result.overallScore)}10` }}>

                  <div className="shrink-0">
                    <ScoreRing score={result.overallScore} size={90} />
                    <div className="text-[8px] font-mono text-aegis-text-dim text-center mt-1">OVERALL</div>
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    {meta?.title && (
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-sm font-display font-bold text-aegis-text-primary truncate">{meta.title}</h2>
                        <a href={meta.finalUrl ?? url} target="_blank" rel="noopener noreferrer"
                          className="text-aegis-text-dim hover:text-aegis-cyan transition-colors shrink-0">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[8px] font-mono text-aegis-text-dim">{domain}</span>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm border border-aegis-border text-aegis-text-secondary">{result.category}</span>
                      <span
                        className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm font-bold"
                        style={{ color: recColor(result.recommendation), background: recColor(result.recommendation) + "18", border: `1px solid ${recColor(result.recommendation)}35` }}
                      >
                        {result.recommendation}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-aegis-text-secondary leading-relaxed mb-3">{result.verdict}</p>

                    {/* Sub-scores */}
                    <div className="space-y-1.5">
                      <ScoreBar label="Content Quality" score={result.scores.contentQuality} icon={Star} />
                      <ScoreBar label="Educational Value" score={result.scores.educationalValue} icon={BookOpen} />
                      <ScoreBar label="Design & UX" score={result.scores.designUX} icon={Eye} />
                      <ScoreBar label="Credibility" score={result.scores.credibility} icon={Shield} />
                      <ScoreBar label="Accessibility" score={result.scores.accessibility} icon={Zap} />
                    </div>
                  </div>
                </div>

                {/* Strong / Weak split */}
                <div className="grid grid-cols-2 gap-4">

                  {/* Strong points */}
                  <div className="p-4 rounded-sm border border-aegis-green/20 bg-aegis-green/5">
                    <div className="flex items-center gap-1.5 mb-3">
                      <CheckCircle2 className="w-3.5 h-3.5 text-aegis-green" />
                      <span className="text-[9px] font-mono font-bold text-aegis-green uppercase tracking-widest">Strong Points</span>
                    </div>
                    <PointList items={result.strongPoints} type="strong" />
                  </div>

                  {/* Weak points */}
                  <div className="p-4 rounded-sm border border-aegis-red/20 bg-aegis-red/5">
                    <div className="flex items-center gap-1.5 mb-3">
                      <XCircle className="w-3.5 h-3.5 text-aegis-red" />
                      <span className="text-[9px] font-mono font-bold text-aegis-red uppercase tracking-widest">Weak Points</span>
                    </div>
                    <PointList items={result.weakPoints} type="weak" />
                  </div>
                </div>

                {/* Educational notes */}
                <div className="p-4 rounded-sm border border-aegis-cyan/20 bg-aegis-cyan/5 space-y-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-3.5 h-3.5 text-aegis-cyan" />
                    <span className="text-[9px] font-mono font-bold text-aegis-cyan uppercase tracking-widest">Educational Intelligence</span>
                  </div>
                  <p className="text-[10px] font-mono text-aegis-text-secondary leading-relaxed">{result.educationalNotes}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[8px] font-mono text-aegis-text-dim uppercase tracking-widest">Target Audience:</span>
                    <span className="text-[9px] font-mono text-aegis-cyan">{result.targetAudience}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-[8px] font-mono text-aegis-text-dim text-center pt-2 border-t border-aegis-border/40">
                  AEGIS WEB INTELLIGENCE · FOR EDUCATIONAL PURPOSES ONLY · AI ANALYSIS MAY NOT BE 100% ACCURATE
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <div className="relative">
                <Globe className="w-12 h-12 text-aegis-text-dim" />
                <motion.div
                  className="absolute inset-[-6px] rounded-full border border-aegis-cyan/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  style={{ borderTopColor: "rgba(0,217,255,0.4)" }}
                />
              </div>
              <div>
                <p className="text-[11px] font-mono text-aegis-text-secondary mb-1">Enter any URL above to begin analysis</p>
                <p className="text-[9px] font-mono text-aegis-text-dim">Supports any public website · Wikipedia · News · Education · Research</p>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {["wikipedia.org", "bbc.com", "nasa.gov", "khanacademy.org", "nature.com", "ted.com"].map(s => (
                  <button key={s}
                    onClick={() => { setUrl(s); runReview(s); }}
                    className="text-[8px] font-mono text-aegis-cyan/70 border border-aegis-cyan/20 px-2 py-1 rounded-sm hover:border-aegis-cyan/50 hover:text-aegis-cyan transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
