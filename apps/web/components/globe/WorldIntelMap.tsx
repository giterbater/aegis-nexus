"use client";

/**
 * WorldIntelMap — smart router
 * • NEXT_PUBLIC_MAPBOX_TOKEN present → Mapbox 3D globe (MapboxGlobe)
 * • Token absent → react-simple-maps flat tactical map (FlatIntelMap)
 */

import { useState, useCallback, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, StopCircle } from "lucide-react";
import { MapboxGlobe } from "./MapboxGlobe";
import { useAegisStore } from "@/lib/store";
import { threatColor, formatRelativeTime } from "@/lib/utils";
import type { GeoEvent } from "@/lib/types";
import { ThreatBadge } from "@/components/ui/ThreatBadge";

const GEO_URL  = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const HAS_MAPBOX = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

// Deterministic threat score per country name → fill color for heatmap
function countryHeatColor(name: string): string {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i);
  const score = Math.abs(h) % 100;
  if (score >= 72) return "rgba(239,68,68,0.22)";   // red — high threat
  if (score >= 52) return "rgba(249,115,22,0.18)";  // orange — elevated
  if (score >= 32) return "rgba(255,183,0,0.14)";   // amber — moderate
  return "rgba(13,32,64,0.88)";                       // default — nominal
}

export function WorldIntelMap() {
  return HAS_MAPBOX ? <MapboxGlobe /> : <FlatIntelMap />;
}

// ── Flat fallback (react-simple-maps) ────────────────────────────────────────

function FlatIntelMap() {
  const { geoEvents, selectedEventId, setSelectedEvent } = useAegisStore();
  const [position, setPosition] = useState<{
    coordinates: [number, number];
    zoom: number;
  }>({ coordinates: [15, 20], zoom: 1.2 });

  const [analysisText, setAnalysisText] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const analyzeEvent = useCallback(async (event: GeoEvent) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setAnalysisText("");
    setAnalysisLoading(true);
    try {
      const context = `EVENT: ${event.title}\nCATEGORY: ${event.category}\nTHREAT: ${event.threat}\nCOUNTRY: ${event.country} (${event.region})\nSUMMARY: ${event.summary}\nCONFIDENCE: ${event.confidence}%\nTAGS: ${event.tags.join(", ")}`;
      const res = await fetch("/api/terminal/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Provide a rapid 4-sentence tactical assessment of this event. Cover: (1) what is happening, (2) immediate regional implications, (3) escalation risk, (4) recommended watch items. Be specific and actionable.",
          context,
        }),
        signal: abortRef.current.signal,
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value).split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const obj = JSON.parse(line.slice(6));
            if (obj.type === "chunk") setAnalysisText(p => p + obj.text);
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setAnalysisText("Analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const selectedEvent = geoEvents.find((e) => e.id === selectedEventId) ?? null;

  const handleMoveEnd = useCallback(
    (pos: { coordinates: [number, number]; zoom: number }) => setPosition(pos),
    [],
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-aegis-bg">
      <div className="absolute inset-0 tactical-grid opacity-40 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,217,255,0.04) 0%, transparent 70%)",
        }}
      />

      <ComposableMap
        projection="geoNaturalEarth1"
        width={900}
        height={450}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          minZoom={0.9}
          maxZoom={6}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = geo.properties?.name ?? "";
                const fill = countryHeatColor(name);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="rgba(0,217,255,0.15)"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: "none" },
                      hover:   { fill: "rgba(0,217,255,0.14)", outline: "none", cursor: "default" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {geoEvents.map((event) => {
            const color      = threatColor(event.threat);
            const isSelected = event.id === selectedEventId;
            const size       = event.threat === "CRITICAL" ? 8 : event.threat === "HIGH" ? 6 : 4;
            return (
              <Marker
                key={event.id}
                coordinates={[event.lng, event.lat]}
                onClick={() => setSelectedEvent(isSelected ? null : event.id)}
              >
                {["CRITICAL", "HIGH"].includes(event.threat) && (
                  <>
                    <circle r={size * 2.5} fill="none" stroke={color} strokeWidth={0.8} opacity={0.3}
                      style={{ animation: `threat-pulse ${event.threat === "CRITICAL" ? "1.5s" : "2.5s"} ease-in-out infinite` }} />
                    <circle r={size * 4} fill="none" stroke={color} strokeWidth={0.4} opacity={0.15}
                      style={{ animation: `threat-pulse ${event.threat === "CRITICAL" ? "1.5s" : "2.5s"} ease-in-out infinite 0.5s` }} />
                  </>
                )}
                <circle
                  r={size}
                  fill={color}
                  opacity={0.9}
                  strokeWidth={isSelected ? 2 : 1}
                  stroke={isSelected ? "#ffffff" : color}
                  style={{ cursor: "pointer", filter: `drop-shadow(0 0 ${size * 2}px ${color})`, transition: "r 0.2s ease" }}
                />
                {position.zoom > 2.5 && (
                  <text textAnchor="middle" y={-size - 3}
                    style={{ fontSize: (6 / position.zoom) * 10, fontFamily: "JetBrains Mono,monospace", fill: color, userSelect: "none", pointerEvents: "none" }}>
                    {event.category.slice(0, 3)}
                  </text>
                )}
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Scan line */}
      <motion.div
        className="absolute inset-x-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg,transparent 0%,rgba(0,217,255,0.4) 40%,rgba(0,217,255,0.8) 50%,rgba(0,217,255,0.4) 60%,transparent 100%)" }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Selected event card */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            key={selectedEvent.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-4 left-4 w-80 glass-panel-intense border border-aegis-border rounded-sm p-4"
            style={{ boxShadow: `0 0 20px ${threatColor(selectedEvent.threat)}20`, maxHeight: "60%" }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <ThreatBadge level={selectedEvent.threat} />
              <span className="text-[10px] font-mono text-aegis-text-secondary">{formatRelativeTime(selectedEvent.timestamp)}</span>
            </div>
            <h3 className="text-xs font-display font-semibold text-aegis-text-primary leading-snug mb-2">{selectedEvent.title}</h3>
            <p className="text-[11px] text-aegis-text-secondary leading-relaxed mb-3">{selectedEvent.summary}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-aegis-border pt-2 text-[10px] font-mono mb-3">
              <div><span className="text-aegis-text-dim block text-[8px] uppercase tracking-widest">COUNTRY</span>{selectedEvent.country}</div>
              <div><span className="text-aegis-text-dim block text-[8px] uppercase tracking-widest">CONFIDENCE</span><span className={selectedEvent.confidence > 80 ? "text-aegis-green" : "text-aegis-amber"}>{selectedEvent.confidence}%</span></div>
            </div>

            {/* Click-to-Analyze button */}
            {!analysisText && !analysisLoading && (
              <button
                onClick={() => analyzeEvent(selectedEvent)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-mono font-bold rounded-sm transition-all"
                style={{ background: "rgba(0,217,255,0.1)", border: "1px solid rgba(0,217,255,0.3)", color: "#00d9ff" }}
              >
                <Zap className="w-3 h-3" /> AI TACTICAL ANALYSIS
              </button>
            )}

            {/* Streaming analysis */}
            {(analysisText || analysisLoading) && (
              <div className="mt-2 border-t border-aegis-border pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-mono text-aegis-cyan uppercase tracking-widest">AEGIS-TERMINAL ANALYSIS</span>
                  {analysisLoading && (
                    <button onClick={() => abortRef.current?.abort()} className="text-aegis-text-dim hover:text-aegis-red">
                      <StopCircle className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="max-h-32 overflow-y-auto">
                  <p className="text-[9px] font-mono text-aegis-text-secondary leading-relaxed whitespace-pre-wrap">
                    {analysisText}
                    {analysisLoading && <span className="text-aegis-cyan animate-pulse">▋</span>}
                  </p>
                </div>
                {!analysisLoading && (
                  <button onClick={() => setAnalysisText("")}
                    className="mt-1 text-[8px] font-mono text-aegis-text-dim hover:text-aegis-cyan transition-colors">
                    ↺ Re-analyze
                  </button>
                )}
              </div>
            )}

            <button className="absolute top-2 right-2 text-aegis-text-dim hover:text-aegis-text-secondary text-xs"
              onClick={() => { setSelectedEvent(null); setAnalysisText(""); abortRef.current?.abort(); }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 glass-panel border border-aegis-border rounded-sm p-2 space-y-1 pointer-events-none">
        {(["CRITICAL","HIGH","MEDIUM","LOW"] as const).map((level) => (
          <div key={level} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: threatColor(level), boxShadow: `0 0 4px ${threatColor(level)}` }} />
            <span className="text-[9px] font-mono text-aegis-text-secondary">{level}</span>
          </div>
        ))}
      </div>

      <div className="absolute top-3 right-3 text-[9px] font-mono text-aegis-text-secondary pointer-events-none">
        {geoEvents.length} ACTIVE EVENTS · FLAT VIEW
      </div>
    </div>
  );
}
