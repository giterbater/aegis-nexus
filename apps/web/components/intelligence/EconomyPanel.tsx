"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, RefreshCw, DollarSign,
  Bitcoin, BarChart2, Globe, AlertTriangle, Minus,
} from "lucide-react";
import type { MarketData, CryptoAsset, ForexRate, IndexQuote, Commodity } from "@/app/api/economy/markets/route";

// ─── Sparkline ──────────────────────────────────────────────────────────────

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function Sparkline({ symbol, change24h, width = 64, height = 24 }: { symbol: string; change24h: number; width?: number; height?: number }) {
  // Deterministic history from symbol seed
  const seed = symbol.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const rng  = seededRand(seed);
  const points = 20;
  const raw: number[] = [];
  let v = 50 + (rng() - 0.5) * 20;
  for (let i = 0; i < points; i++) {
    v += (rng() - 0.48) * 6;
    v = Math.max(10, Math.min(90, v));
    raw.push(v);
  }
  // Tilt end toward actual 24h change
  const tilt = change24h * 0.25;
  const finalPoints = raw.map((p, i) => p + (i / (points - 1)) * tilt);

  const min = Math.min(...finalPoints);
  const max = Math.max(...finalPoints);
  const range = max - min || 1;

  const coords = finalPoints.map((p, i) => {
    const x = (i / (points - 1)) * width;
    const y = height - ((p - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });
  const pathD = "M " + coords.join(" L ");

  const isUp = change24h >= 0;
  const color = isUp ? "#10b981" : "#ef4444";
  const gradId = `sg-${symbol.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path
        d={`${pathD} L ${width},${height} L 0,${height} Z`}
        fill={`url(#${gradId})`}
      />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 2px ${color})` }}
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((finalPoints[points - 1] - min) / range) * (height - 2) - 1}
        r={2}
        fill={color}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
    </svg>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1000) return "$" + n.toFixed(decimals);
  if (n < 0.01)  return "$" + n.toFixed(6);
  return "$" + n.toFixed(decimals);
}

function ChangePill({ pct, abs }: { pct: number; abs?: number }) {
  const up   = pct >= 0;
  const Icon = pct > 0.05 ? TrendingUp : pct < -0.05 ? TrendingDown : Minus;
  const color = up ? "#10b981" : "#ef4444";
  return (
    <span className="flex items-center gap-0.5 text-[9px] font-mono" style={{ color }}>
      <Icon className="w-2.5 h-2.5 shrink-0" />
      {abs !== undefined && abs !== 0 ? `${abs > 0 ? "+" : ""}${abs.toFixed(2)} ` : ""}
      {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

// Threat index from market volatility
function computeThreatIndex(data: MarketData): number {
  if (!data.indices.length && !data.crypto.length) return 50;
  const negativeIndices = data.indices.filter(i => i.changePct < -1).length;
  const cryptoVol = data.crypto.reduce((sum, c) => sum + Math.abs(c.change24h), 0) / (data.crypto.length || 1);
  const score = Math.min(100, 30 + negativeIndices * 8 + cryptoVol * 1.5);
  return Math.round(score);
}

function threatLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "CRITICAL",  color: "#ef4444" };
  if (score >= 55) return { label: "ELEVATED",  color: "#f97316" };
  if (score >= 35) return { label: "MODERATE",  color: "#ffb700" };
  return               { label: "NOMINAL",   color: "#10b981" };
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-aegis-border/60 bg-aegis-panel/40 shrink-0">
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Crypto row ────────────────────────────────────────────────────────────

function CryptoRow({ c }: { c: CryptoAsset }) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-b border-aegis-border/30 last:border-0 hover:bg-white/[0.015] transition-colors">
      <span className="text-[9px] font-mono text-aegis-text-dim w-10 shrink-0">{c.symbol}</span>
      <span className="text-[10px] font-mono text-aegis-text-primary flex-1">{c.name}</span>
      <Sparkline symbol={c.symbol} change24h={c.change24h} width={60} height={22} />
      <span className="text-[10px] font-mono text-aegis-text-primary">{fmt(c.price)}</span>
      <ChangePill pct={c.change24h} />
      <span className="text-[8px] font-mono text-aegis-text-dim w-16 text-right hidden lg:block">{fmt(c.marketCap)}</span>
    </div>
  );
}

// ─── Forex row ─────────────────────────────────────────────────────────────

function ForexRow({ r }: { r: ForexRate }) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-b border-aegis-border/30 last:border-0 hover:bg-white/[0.015] transition-colors">
      <span className="text-[10px] font-mono text-aegis-cyan w-16 shrink-0">{r.pair}</span>
      <span className="text-[10px] font-mono text-aegis-text-primary flex-1">{r.rate.toFixed(4)}</span>
      <ChangePill pct={r.change24h} />
    </div>
  );
}

// ─── Index card ───────────────────────────────────────────────────────────

function IndexCard({ q }: { q: IndexQuote }) {
  const up = q.changePct >= 0;
  return (
    <div className={`p-3 rounded-sm border transition-colors ${
      up ? "border-aegis-green/20 bg-aegis-green/5" : "border-aegis-red/20 bg-aegis-red/5"
    }`}>
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="text-[8px] font-mono text-aegis-text-dim">{q.symbol}</div>
        <Sparkline symbol={q.symbol} change24h={q.changePct} width={48} height={18} />
      </div>
      <div className="text-[11px] font-display font-bold text-aegis-text-primary leading-tight">{q.name}</div>
      <div className="text-[13px] font-mono text-aegis-text-primary mt-1">{q.price.toLocaleString()}</div>
      <ChangePill pct={q.changePct} abs={q.change} />
    </div>
  );
}

// ─── Commodity row ─────────────────────────────────────────────────────────

function CommodityRow({ c }: { c: Commodity }) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-b border-aegis-border/30 last:border-0 hover:bg-white/[0.015] transition-colors">
      <span className="text-[9px] font-mono text-aegis-amber w-10 shrink-0">{c.symbol}</span>
      <span className="text-[10px] font-mono text-aegis-text-primary flex-1">{c.name}</span>
      <span className="text-[8px] font-mono text-aegis-text-dim">{c.unit}</span>
      <span className="text-[10px] font-mono text-aegis-text-primary">{c.price > 0 ? fmt(c.price) : "—"}</span>
      {c.price > 0 ? <ChangePill pct={c.change24h} /> : <span className="text-[9px] font-mono text-aegis-text-dim">—</span>}
    </div>
  );
}

// ─── Economic Threat Index ────────────────────────────────────────────────

function ThreatIndexBar({ score }: { score: number }) {
  const { label, color } = threatLabel(score);
  return (
    <div className="px-4 py-3 border-b border-aegis-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-aegis-amber" />
          <span className="text-[11px] font-mono font-bold text-aegis-text-primary">ECONOMIC THREAT INDEX</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-display font-bold" style={{ color }}>{score}</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm border" style={{ color, borderColor: color + "44", background: color + "15" }}>
            {label}
          </span>
        </div>
      </div>
      <div className="h-2 bg-aegis-border/40 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <div className="flex justify-between text-[7px] font-mono text-aegis-text-dim mt-1">
        <span>NOMINAL</span><span>MODERATE</span><span>ELEVATED</span><span>CRITICAL</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EconomyPanel() {
  const [data, setData]       = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [tick, setTick]       = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch("/api/economy/markets")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [tick]);

  // Auto-refresh every 2 min
  useEffect(() => {
    const id = setInterval(() => setTick(k => k + 1), 120_000);
    return () => clearInterval(id);
  }, []);

  const threatScore = useMemo(() => data ? computeThreatIndex(data) : 50, [data]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="w-8 h-8 border-2 border-aegis-cyan/30 border-t-aegis-cyan rounded-full animate-spin" />
      <span className="text-[10px] font-mono text-aegis-text-secondary">FETCHING MARKET DATA…</span>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <AlertTriangle className="w-8 h-8 text-aegis-amber" />
      <span className="text-[10px] font-mono text-aegis-text-secondary">MARKET DATA UNAVAILABLE</span>
      <button onClick={() => setTick(k => k + 1)}
        className="text-[9px] font-mono text-aegis-cyan border border-aegis-cyan/40 px-3 py-1 rounded-sm hover:bg-aegis-cyan/10">
        RETRY
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-aegis-border shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-aegis-green" />
          <span className="text-sm font-display font-semibold text-aegis-text-primary">ECONOMIC INTELLIGENCE</span>
          <span className="text-[9px] font-mono text-aegis-text-dim border border-aegis-border px-1.5 py-0.5 rounded-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-aegis-green animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.fetchedAt && (
            <span className="text-[8px] font-mono text-aegis-text-dim">
              {new Date(data.fetchedAt).toLocaleTimeString()}
            </span>
          )}
          <button onClick={() => setTick(k => k + 1)}
            className="flex items-center gap-1 text-[9px] font-mono text-aegis-text-secondary hover:text-aegis-cyan border border-aegis-border px-2 py-1 rounded-sm transition-all">
            <RefreshCw className="w-3 h-3" />REFRESH
          </button>
        </div>
      </div>

      {/* Economic Threat Index */}
      <ThreatIndexBar score={threatScore} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Stock Indices */}
        {data.indices.length > 0 && (
          <section>
            <SectionHeader icon={BarChart2} label={`Market Indices (${data.indices.length})`} color="#00d9ff" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-3">
              {data.indices.map(q => <IndexCard key={q.symbol} q={q} />)}
            </div>
          </section>
        )}

        {/* Crypto */}
        {data.crypto.length > 0 && (
          <section>
            <SectionHeader icon={Bitcoin} label={`Crypto Markets (${data.crypto.length})`} color="#f97316" />
            <div className="divide-y divide-aegis-border/20">
              {data.crypto.map(c => <CryptoRow key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {/* Forex */}
        {data.forex.length > 0 && (
          <section>
            <SectionHeader icon={Globe} label={`Forex — USD Base (${data.forex.length} pairs)`} color="#8b5cf6" />
            <div className="grid grid-cols-2 divide-y divide-aegis-border/20">
              {data.forex.map(r => <ForexRow key={r.pair} r={r} />)}
            </div>
          </section>
        )}

        {/* Commodities */}
        {data.commodities.length > 0 && (
          <section>
            <SectionHeader icon={DollarSign} label={`Commodities (${data.commodities.length})`} color="#ffb700" />
            <div className="divide-y divide-aegis-border/20">
              {data.commodities.map(c => <CommodityRow key={c.symbol} c={c} />)}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="px-4 py-2 text-[8px] font-mono text-aegis-text-dim border-t border-aegis-border/40 mt-2">
          DATA: COINGECKO · YAHOO FINANCE · EXCHANGERATE-API · AUTO-REFRESH 2MIN
        </div>
      </div>
    </div>
  );
}
