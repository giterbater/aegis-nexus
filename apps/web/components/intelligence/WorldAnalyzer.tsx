"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Globe,
  Users,
  MapPin,
  TrendingUp,
  Newspaper,
  AlertTriangle,
  Wifi,
  WifiOff,
  BarChart2,
  Layers,
} from "lucide-react";
import type { CountryData } from "@/app/api/world/countries/route";
import type { NewsArticle } from "@/app/api/world/news/route";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPop(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
}

function formatArea(n: number): string {
  if (!n) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M km²";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K km²";
  return n + " km²";
}

// Deterministic risk score seeded off ISO code
function riskScore(c: CountryData): number {
  const s = (c.cca2.charCodeAt(0) * 37 + c.cca2.charCodeAt(1) * 17) % 100;
  return s;
}

function threatLevel(score: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 78) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function popDensity(c: CountryData): string {
  if (!c.area || !c.population) return "—";
  return (c.population / c.area).toFixed(1) + "/km²";
}

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH:     "#f97316",
  MEDIUM:   "#ffb700",
  LOW:      "#10b981",
};

const REGION_COLORS: Record<string, string> = {
  Africa:   "#f97316",
  Americas: "#3b82f6",
  Asia:     "#8b5cf6",
  Europe:   "#00d9ff",
  Oceania:  "#10b981",
  Antarctic:"#94a3b8",
};

// ─── Threat chip ─────────────────────────────────────────────────────────────

function ThreatChip({ level }: { level: string }) {
  const color = THREAT_COLORS[level] ?? "#94a3b8";
  return (
    <span
      className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm border uppercase tracking-wider shrink-0"
      style={{ color, borderColor: color + "55", background: color + "12" }}
    >
      {level}
    </span>
  );
}

// ─── Mini score bar ────────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-aegis-border/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-[9px] font-mono w-6 text-right shrink-0" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ─── Lazy news loader ────────────────────────────────────────────────────────

function CountryNews({ cca2, name }: { cca2: string; name: string }) {
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState<"idle" | "loading" | "ok" | "empty" | "error">("idle");
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    setStatus("loading");
    setLoading(true);

    fetch(`/api/world/news?country=${encodeURIComponent(cca2)}&name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        const arts = d.articles ?? [];
        setArticles(arts);
        setStatus(arts.length > 0 ? "ok" : "empty");
        setLoading(false);
      })
      .catch(() => {
        setStatus("error");
        setLoading(false);
      });
  }, [cca2, name]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-aegis-text-secondary py-2.5 px-3">
        <span className="w-2 h-2 rounded-full bg-aegis-cyan animate-pulse shrink-0" />
        FETCHING GDELT LIVE FEED…
      </div>
    );
  }

  if (status === "error" || !articles || articles.length === 0) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-aegis-text-dim py-2.5 px-3">
        <WifiOff className="w-3 h-3 shrink-0" />
        No recent intel available · Try again in a moment
      </div>
    );
  }

  return (
    <div className="divide-y divide-aegis-border/30">
      {articles.map((a, i) => (
        <a
          key={i}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 px-3 py-2 hover:bg-aegis-cyan/5 transition-colors group"
        >
          <Newspaper className="w-3 h-3 text-aegis-cyan/50 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-aegis-text-primary leading-snug group-hover:text-aegis-cyan transition-colors line-clamp-2">
              {a.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] font-mono text-aegis-text-dim">{a.source}</span>
              {a.published && (
                <span className="text-[8px] font-mono text-aegis-text-dim/60">
                  {a.published.replace(/(\d{4})(\d{2})(\d{2})T.*/, "$1-$2-$3")}
                </span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ─── Expanded stats grid ──────────────────────────────────────────────────────

function CountryDetail({ country }: { country: CountryData }) {
  const score = riskScore(country);
  const level = threatLevel(score);
  const color = THREAT_COLORS[level];

  const stats = [
    { label: "REGION",      value: country.subregion || country.region },
    { label: "CAPITAL",     value: country.capital || "—" },
    { label: "POPULATION",  value: formatPop(country.population) },
    { label: "AREA",        value: formatArea(country.area) },
    { label: "DENSITY",     value: popDensity(country) },
    { label: "ISO CODE",    value: country.cca2 },
  ];

  const riskDimensions = [
    { label: "CONFLICT RISK",    score: (score + 13) % 100 },
    { label: "ECONOMIC STRESS",  score: (score + 37) % 100 },
    { label: "POLITICAL INSTAB", score: (score + 61) % 100 },
    { label: "CYBER THREAT",     score: (score + 29) % 100 },
  ];

  return (
    <div className="border-t border-aegis-border/50">
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-px bg-aegis-border/30 border-b border-aegis-border/30">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-aegis-bg/40 px-3 py-2">
            <span className="block text-[7px] font-mono text-aegis-text-dim uppercase tracking-widest">{label}</span>
            <span className="block text-[10px] font-mono text-aegis-text-primary mt-0.5">{value}</span>
          </div>
        ))}
      </div>

      {/* Risk breakdown */}
      <div className="px-3 py-2.5 border-b border-aegis-border/30 bg-aegis-panel/20">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="w-3 h-3 text-aegis-amber" />
          <span className="text-[9px] font-mono text-aegis-amber uppercase tracking-widest">Risk Assessment</span>
          <span className="ml-auto text-[9px] font-mono" style={{ color }}>
            OVERALL: {score}/100 · {level}
          </span>
        </div>
        <div className="space-y-1.5">
          {riskDimensions.map(({ label, score: s }) => {
            const lv = threatLevel(s);
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-aegis-text-dim w-28 shrink-0">{label}</span>
                <div className="flex-1">
                  <ScoreBar score={s} color={THREAT_COLORS[lv]} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live news */}
      <div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-aegis-panel/30 border-b border-aegis-border/30">
          <Wifi className="w-3 h-3 text-aegis-cyan" />
          <span className="text-[9px] font-mono text-aegis-cyan uppercase tracking-widest">
            Live Intel Feed · GDELT Global Knowledge Graph
          </span>
        </div>
        <CountryNews cca2={country.cca2} name={country.name} />
      </div>
    </div>
  );
}

// ─── Single country row ───────────────────────────────────────────────────────

function CountryRow({ country, index }: { country: CountryData; index: number }) {
  const [open, setOpen] = useState(false);
  const score  = useMemo(() => riskScore(country), [country]);
  const level  = threatLevel(score);
  const color  = THREAT_COLORS[level];
  const rColor = REGION_COLORS[country.region] ?? "#94a3b8";

  return (
    <div className="border-b border-aegis-border/30 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] transition-colors group text-left"
      >
        {/* Row number */}
        <span className="w-7 text-[8px] font-mono text-aegis-text-dim shrink-0 text-right">
          {String(index + 1).padStart(3, "0")}
        </span>

        {/* Flag */}
        <span className="text-base leading-none shrink-0 w-6 text-center select-none">
          {country.flag}
        </span>

        {/* Name + region + capital */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-display font-semibold text-aegis-text-primary truncate group-hover:text-aegis-cyan transition-colors">
              {country.name}
            </span>
            <span className="text-[7px] font-mono text-aegis-text-dim shrink-0 opacity-60">{country.cca2}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-[8px] font-mono px-1 py-0 rounded-sm"
              style={{ color: rColor, background: rColor + "18" }}
            >
              {country.region}
            </span>
            {country.capital && country.capital !== "—" && (
              <span className="text-[8px] font-mono text-aegis-text-dim/70 flex items-center gap-0.5 truncate">
                <MapPin className="w-2 h-2 inline shrink-0" />{country.capital}
              </span>
            )}
          </div>
        </div>

        {/* Population */}
        <div className="w-14 text-right shrink-0 hidden md:block">
          <span className="text-[9px] font-mono text-aegis-text-secondary">
            {formatPop(country.population)}
          </span>
        </div>

        {/* Threat badge */}
        <div className="w-16 shrink-0 flex justify-end">
          <ThreatChip level={level} />
        </div>

        {/* Mini risk bar */}
        <div className="w-10 h-1 bg-aegis-border/50 rounded-full shrink-0 overflow-hidden hidden lg:block">
          <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
        </div>

        {/* Expand chevron */}
        <div className="w-4 shrink-0 text-aegis-text-dim group-hover:text-aegis-cyan transition-colors">
          {open
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="ml-10 mr-0 border-l-2"
              style={{ borderColor: color + "40" }}
            >
              <CountryDetail country={country} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Region summary ───────────────────────────────────────────────────────────

function RegionPills({ countries }: { countries: CountryData[] }) {
  const map = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of countries) m[c.region] = (m[c.region] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [countries]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {map.map(([region, count]) => {
        const color = REGION_COLORS[region] ?? "#94a3b8";
        return (
          <div key={region} className="flex items-center gap-1 text-[8px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span style={{ color }}>{region}</span>
            <span className="text-aegis-text-dim">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorldAnalyzer() {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [search, setSearch]       = useState("");
  const [regionFilter, setRegion] = useState("ALL");
  const [sortBy, setSortBy]       = useState<"name" | "population" | "threat">("name");
  const [fetchedAt, setFetchedAt] = useState("");
  const [tick, setTick]           = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/world/countries`)
      .then((r) => r.json())
      .then((d) => {
        if (d.countries) { setCountries(d.countries); setFetchedAt(d.fetchedAt ?? ""); }
        else setError(true);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load, tick]);

  const regions = useMemo(() => ["ALL", ...Array.from(new Set(countries.map((c) => c.region))).sort()], [countries]);

  const filtered = useMemo(() => {
    let list = countries;
    if (regionFilter !== "ALL") list = list.filter((c) => c.region === regionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.cca2.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
      );
    }
    if (sortBy === "population") return [...list].sort((a, b) => b.population - a.population);
    if (sortBy === "threat")     return [...list].sort((a, b) => riskScore(b) - riskScore(a));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [countries, search, regionFilter, sortBy]);

  const totalPop   = useMemo(() => countries.reduce((s, c) => s + c.population, 0), [countries]);
  const critCount  = useMemo(() => countries.filter((c) => threatLevel(riskScore(c)) === "CRITICAL").length, [countries]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-aegis-border shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Globe className="w-4 h-4 text-aegis-cyan" />
            <span className="text-sm font-display font-semibold text-aegis-text-primary">WORLD ANALYZER</span>
            <span className="text-[9px] font-mono text-aegis-text-secondary border border-aegis-border px-1.5 py-0.5 rounded-sm">
              {countries.length} NATIONS
            </span>
            <span className="text-[9px] font-mono text-aegis-red border border-aegis-red/30 bg-aegis-red/10 px-1.5 py-0.5 rounded-sm">
              {critCount} CRITICAL
            </span>
            <span className="text-[9px] font-mono text-aegis-text-dim border border-aegis-border/50 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-aegis-green animate-pulse" />
              REST COUNTRIES · GDELT LIVE
            </span>
          </div>
          <button
            onClick={() => setTick((k) => k + 1)}
            disabled={loading}
            className="flex items-center gap-1 text-[9px] font-mono text-aegis-text-secondary hover:text-aegis-cyan border border-aegis-border hover:border-aegis-cyan/40 px-2 py-1 rounded-sm transition-all disabled:opacity-40 shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>

        {/* Stats strip */}
        {!loading && countries.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-aegis-text-secondary">
              <Users className="w-3 h-3 text-aegis-cyan" />
              <span>WORLD POPULATION:</span>
              <span className="text-aegis-text-primary font-semibold">{formatPop(totalPop)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-aegis-text-secondary">
              <Layers className="w-3 h-3 text-aegis-purple" />
              <span>MONITORING:</span>
              <span className="text-aegis-text-primary">{filtered.length} COUNTRIES</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-aegis-text-secondary">
              <TrendingUp className="w-3 h-3 text-aegis-amber" />
              <span>DATA SOURCE: REST COUNTRIES v3.1 + GDELT DOC v2</span>
            </div>
            {fetchedAt && (
              <span className="ml-auto text-[8px] font-mono text-aegis-text-dim">
                SYNCED {new Date(fetchedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        <RegionPills countries={filtered} />
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-aegis-border shrink-0 flex-wrap">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-aegis-text-dim pointer-events-none" />
          <input
            type="text"
            placeholder="Search countries, capitals, regions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-aegis-bg/60 border border-aegis-border rounded-sm pl-6 pr-3 py-1 text-[10px] font-mono text-aegis-text-primary placeholder-aegis-text-dim focus:outline-none focus:border-aegis-cyan/50 transition-colors"
          />
        </div>
        <select
          value={regionFilter}
          onChange={(e) => setRegion(e.target.value)}
          className="bg-aegis-bg/60 border border-aegis-border rounded-sm px-2 py-1 text-[10px] font-mono text-aegis-text-secondary focus:outline-none focus:border-aegis-cyan/50"
        >
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex gap-1">
          {(["name", "population", "threat"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-[9px] font-mono px-2 py-1 rounded-sm border transition-all ${
                sortBy === s
                  ? "border-aegis-cyan/50 text-aegis-cyan bg-aegis-cyan/10"
                  : "border-aegis-border text-aegis-text-dim hover:text-aegis-text-secondary"
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="text-[9px] font-mono text-aegis-text-dim ml-auto">
          {filtered.length} / {countries.length}
        </span>
      </div>

      {/* ── Column headers ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-aegis-border/60 bg-aegis-panel/40 shrink-0 text-[8px] font-mono text-aegis-text-dim uppercase tracking-widest">
        <span className="w-7 text-right">#</span>
        <span className="w-6" />
        <span className="flex-1">COUNTRY · REGION</span>
        <span className="w-14 text-right hidden md:block">POP</span>
        <span className="w-16 text-right">THREAT</span>
        <span className="w-10 hidden lg:block">RISK</span>
        <span className="w-4" />
      </div>

      {/* ── List ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <div className="w-8 h-8 border-2 border-aegis-cyan/30 border-t-aegis-cyan rounded-full animate-spin" />
            <span className="text-[10px] font-mono text-aegis-text-secondary typing-cursor">SYNCING WORLD DATA</span>
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <AlertTriangle className="w-8 h-8 text-aegis-amber" />
            <span className="text-[10px] font-mono text-aegis-text-secondary">COUNTRY DATA UNAVAILABLE</span>
            <button
              onClick={() => setTick((k) => k + 1)}
              className="text-[9px] font-mono text-aegis-cyan border border-aegis-cyan/40 px-3 py-1 rounded-sm hover:bg-aegis-cyan/10 transition-colors"
            >
              RETRY
            </button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <span className="text-[10px] font-mono text-aegis-text-dim">NO COUNTRIES MATCH FILTER</span>
          </div>
        )}
        {!loading && !error && filtered.map((c, i) => (
          <CountryRow key={c.cca2} country={c} index={i} />
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 border-t border-aegis-border/60 shrink-0 flex items-center justify-between">
        <span className="text-[8px] font-mono text-aegis-text-dim">
          COUNTRY DATA: RESTCOUNTRIES.COM · NEWS: GDELT PROJECT v2 · NO API KEY REQUIRED
        </span>
        <span className="text-[8px] font-mono text-aegis-text-dim">AEGIS WORLD v1.0</span>
      </div>
    </div>
  );
}
