"use client";

import { useEffect, useState, useRef } from "react";
import { Radio, AlertTriangle } from "lucide-react";

interface TickerItem {
  headline: string;
  source:   string;
  url:      string;
  tone:     number;
  country:  string;
}

function toneColor(tone: number): string {
  if (tone <= -4) return "#ef4444";
  if (tone <= -2) return "#f97316";
  if (tone <= 0)  return "#ffb700";
  return "#10b981";
}

function toneLabel(tone: number): string {
  if (tone <= -4) return "CRITICAL";
  if (tone <= -2) return "WARNING";
  if (tone <= 0)  return "MONITOR";
  return "ROUTINE";
}

export function NewsTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef  = useRef<number | null>(null);
  const posRef   = useRef(0);

  useEffect(() => {
    fetch("/api/world/ticker")
      .then(r => r.json())
      .then(d => {
        if (d.items?.length) {
          setItems(d.items);
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(false));

    // Refresh every 15 min
    const id = setInterval(() => {
      fetch("/api/world/ticker")
        .then(r => r.json())
        .then(d => { if (d.items?.length) setItems(d.items); })
        .catch(() => {});
    }, 900_000);
    return () => clearInterval(id);
  }, []);

  // Smooth JS marquee (CSS animation has stutter on long text)
  useEffect(() => {
    if (!loaded || !trackRef.current) return;
    const track = trackRef.current;
    const speed = 0.6; // px per frame

    const animate = () => {
      posRef.current -= speed;
      const halfWidth = track.scrollWidth / 2;
      if (Math.abs(posRef.current) >= halfWidth) {
        posRef.current = 0;
      }
      track.style.transform = `translateX(${posRef.current}px)`;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [loaded, items]);

  if (!loaded || items.length === 0) return null;

  // Duplicate items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div
      className="h-7 shrink-0 flex items-center overflow-hidden border-t"
      style={{
        background: "rgba(8,15,28,0.95)",
        borderColor: "rgba(0,217,255,0.12)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Label badge */}
      <div
        className="h-full flex items-center gap-1.5 px-3 shrink-0 border-r z-10"
        style={{
          background: "linear-gradient(90deg, rgba(0,217,255,0.15), rgba(0,217,255,0.08))",
          borderColor: "rgba(0,217,255,0.25)",
        }}
      >
        <Radio className="w-2.5 h-2.5 text-aegis-cyan animate-pulse" />
        <span className="text-[8px] font-mono font-bold text-aegis-cyan tracking-[0.2em] whitespace-nowrap">
          LIVE INTEL
        </span>
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden relative h-full">
        {/* Fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, rgba(8,15,28,0.9), transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
          style={{ background: "linear-gradient(270deg, rgba(8,15,28,0.9), transparent)" }} />

        <div
          ref={trackRef}
          className="absolute top-0 flex items-center h-full gap-0 whitespace-nowrap will-change-transform"
        >
          {doubled.map((item, i) => (
            <TickerEntry key={i} item={item} />
          ))}
        </div>
      </div>

      {/* Time stamp */}
      <div
        className="h-full flex items-center px-3 shrink-0 border-l"
        style={{ borderColor: "rgba(0,217,255,0.12)" }}
      >
        <LiveClock />
      </div>
    </div>
  );
}

function TickerEntry({ item }: { item: TickerItem }) {
  const color = toneColor(item.tone);
  const label = toneLabel(item.tone);
  const isBad = item.tone <= -4;

  return (
    <span className="flex items-center gap-2 px-4">
      {/* Severity indicator */}
      <span
        className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-sm shrink-0"
        style={{ color, background: color + "18", border: `1px solid ${color}35` }}
      >
        {label}
      </span>

      {/* Country */}
      {item.country && item.country !== "INTL" && (
        <span className="text-[8px] font-mono text-aegis-text-dim shrink-0">
          [{item.country}]
        </span>
      )}

      {/* Headline */}
      <span className="text-[10px] font-mono" style={{ color: isBad ? "#ef4444cc" : "#a0b4c8" }}>
        {isBad && <AlertTriangle className="w-2.5 h-2.5 inline mr-1 text-red-500" />}
        {item.headline}
      </span>

      {/* Source */}
      <span className="text-[8px] font-mono text-aegis-text-dim shrink-0">
        — {item.source.toUpperCase()}
      </span>

      {/* Separator */}
      <span className="text-aegis-cyan/30 text-[10px] px-2 shrink-0">◆</span>
    </span>
  );
}

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toISOString().replace("T", " ").slice(11, 19) + " UTC");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-[8px] font-mono text-aegis-text-dim tabular-nums whitespace-nowrap">
      {time}
    </span>
  );
}
